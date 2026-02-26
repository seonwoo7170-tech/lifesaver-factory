const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
Vue blog — 통합 멀티플랫폼 블로그 에이전트 지침서 (PART 0~O 풀버전)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[여기에 대표님의 7,000자 지침 전문이 무삭제로 삽입되어 AI에게 전달됩니다.]
핵심: 인라인 스타일 전용, 금지 표현 제로, 4,000자 이상, 4개의 [이미지 삽입] 전략 배치!
작성 후 코드블록 밖에 영문 이미지 프롬프트 ①~④번을 반드시 번호와 함께 출력하십시오.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ELITE STRATEGIST. NO CHAT. FOLLOW ALL RULES.]\n\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (e.message.includes('429') && retry < 3) {
            await new Promise(res => setTimeout(res, 30000));
            return callAI(model, prompt, retry + 1);
        }
        throw e;
    }
}

async function genImg(desc, model, num) {
    const imgbbKey = process.env.IMGBB_API_KEY;
    if(!desc) return '';
    let engPrompt = desc;
    if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(desc)) {
        try {
            const trans = await callAI(model, 'Translate image prompt to English (STRICT: ONLY ENGLISH): ' + desc);
            engPrompt = trans.replace(/```.*?```/gs, '').trim();
        } catch(e) { }
    }
    console.log(`   📸 [${num}번 시각자료 제작] 프롬프트: ${engPrompt}`);
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
    console.log(`\n==================================================`);
    console.log(`💎 [VUE v3.9] ${idx}/5 포스팅 가동: ${target}`);
    console.log(`==================================================`);
    
    console.log('🔍 [1/4] 타겟 데이터 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ [2/4] 지침 기반 고출력 집필 중...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nCONTEXT: ' + searchData);
    
    let html = (responseText.match(/```html?([\s\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    const h2s = (html.match(/<h2.*?>([\s\S]*?)<\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('✅ 집필 완료! 구성 소제목 (Structure):');
    h2s.forEach((h, i) => console.log(`   └ [${i+1}] ${h}`));
    
    const ipList = [];
    const pRegex = /([①-④1-4])번:\s*(.*?)(?=\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    console.log('\n🖼 [3/4] 이미지 전략 배치 가동...');
    const phRegex = /\[이미지 삽입\](?:\s*alt=".*?")?(?:\s*title=".*?")?/gi;
    const placeholders = html.match(phRegex) || [];
    
    for(let i=0; i<placeholders.length; i++) {
        const block = placeholders[i];
        const prompt = ipList[i] || `${target} professional photographic style`;
        const url = await genImg(prompt, model, i+1);
        
        const altTxt = (block.match(/alt="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        const titTxt = (block.match(/title="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        
        const imgTag = `<div style="text-align:center; margin:45px 0;">
            <img src="${url}" alt="${altTxt}" title="${titTxt}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.1);">
            <p style="font-size:14px; color:#888; margin-top:12px;">${titTxt}</p>
        </div>`;
        html = html.replace(block, imgTag);
    }
    
    console.log('🚀 [4/4] 구글 블로거 업로드 중...');
    await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: html, published: pTime.toISOString() } });
    console.log(`✨ 성공: [${target}] 발행 완료!\n`);
}
async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const list = config.clusters || [];
        for(let i=0; i<Math.min(list.length, 5); i++) {
            let pTime = new Date(); pTime.setMinutes(pTime.getMinutes() + (i * 180));
            await writeAndPost(model, list[i], blogger, config.blog_id, pTime, i+1);
        }
    } catch(e) { console.error('\n🚨 엔진 가동 실패:', e.message); process.exit(1); }
}
run();