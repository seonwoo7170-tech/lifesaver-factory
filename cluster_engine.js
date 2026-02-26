const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vue blog — 통합 멀티플랫폼 블로그 에이전트 지침
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(사용자가 제공한 PART 0 ~ PART O 전체 지침이 여기에 적용됩니다.)

핵심 요약:
1. 1순위: 금지 표현 제로 ("요청하신", "작성해 드렸습니다" 등 절대 금지)
2. 분량: 최소 4,000자 이상의 압도적 서사.
3. 디자인: h2 배경색 7종 순차 적용 및 파스텔톤 강조 박스 활용.
4. 출력물: <h1>으로 시작하는 HTML 코드블록 + 코드블록 외부에 이미지 프롬프트 및 메타 정보 포함.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS AN ELITE CONTENT STRATEGIST. FOLLOW ALL RULES STRICTLY.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if ((e.message.includes('429') || e.message.includes('Resource exhausted')) && retry < 3) {
            await new Promise(res => setTimeout(res, 30000));
            return callAI(model, prompt, retry + 1);
        }
        throw e;
    }
}

async function genImg(desc, model) {
    const imgbbKey = process.env.IMGBB_API_KEY;
    if(!desc) return '';
    let engPrompt = desc;
    if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(desc)) {
        try {
            const trans = await callAI(model, 'Translate image prompt to English (STRICT: ONLY ENGLISH): ' + desc);
            engPrompt = trans.replace(/```.*?```/gs, '').trim();
        } catch(e) { }
    }
    let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1280&height=720&nologo=true`;
    try {
        if(imgbbKey) {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            return ir.data.data.url;
        }
    } catch(e) { }
    return imageUrl;
}

async function writeAndPost(model, target, blogger, bId, pTime, idx) {
    console.log(`[VUE v3.1] ${idx}/5 고출력 집필 가동: ${target}`);
    const response = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET KEYWORD: ' + target);
    let raw = response.trim();
    let html = (raw.match(/```html?([\s\S]*?)```/i)?.[1] || raw).trim();
    
    // 이미지 프롬프트 추출 및 이미지 생성/치환
    const prompts = [];
    const pMatch = raw.match(/🖼 이미지 프롬프트:[\s\S]*?$/i);
    if(pMatch) {
        const promptLines = pMatch[0].split('\n');
        for(let line of promptLines) { if(line.includes('번:')) prompts.push(line.split('번:')[1].trim()); }
    }
    
    // 플레이스홀더 치환
    for(let i=0; i<prompts.length; i++) {
        const url = await genImg(prompts[i], model);
        html = html.replace(`[이미지 삽입]`, `<img src="${url}" alt="${target}" style="width:100%; border-radius:12px; margin:25px 0;">`);
    }
    
    await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: html, published: pTime.toISOString() } });
    console.log(`   ✅ 발행 성공: ${target}`);
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || [];
    for(let i=0; i<Math.min(pool.length, 5); i++) {
        let pTime = new Date(); pTime.setMinutes(pTime.getMinutes() + (i * 180));
        await writeAndPost(model, pool[i], blogger, config.blog_id, pTime, i+1);
    }
}
run();