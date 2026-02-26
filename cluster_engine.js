const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
# [VUE POST v4.8 통합 블로그 에이전트 지침서]
[PART 0 — 충돌 시 우선순위] 1순위: 금지 표현 제로 / 2순위: 플랫폼 호환 HTML / 3순위: E-E-A-T 품질 / 4순위: 검색의도 구조.
[핵심 철학] ① 적게 ② 정확하게(수치 출처) ③ 진짜처럼(경험담) ④ 돈 되게.
[분량] 4,500~6,000자. [금지어] 작성해 드렸습니다, 알아볼까요, 도움이 되셨으면... 등 필터링.
[디자인] h2 배경색 7종 순차 적용. [이미지 삽입] 4곳 필히 배치.
[V-LOGIC] A~O 패턴 (문제해결, 스토리텔링, 역피라미드 등) 랜덤 융합 적용.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ELITE CONTENT STRATEGIST. DELIVER 6,000+ CHARS HTML.]\n\n' + prompt);
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
    let ep = desc;
    if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(desc)) {
        try {
            const trans = await callAI(model, 'Translate to English (ONLY ENGLISH PROMPT): ' + desc);
            ep = trans.replace(/```.*?```/gs, '').trim();
        } catch(e) { }
    }
    console.log(`   └ [🖼️ ${num}번 시각자료 제작] 프롬프트: ${ep}`);
    let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(ep)}?width=1280&height=720&nologo=true`;
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
    console.log(`💎 [VUE v4.8] ${idx}/5 집필 현황 상세 브리핑`);
    console.log(`==================================================`);
    console.log(`📝 [현재 타겟]: ${target}`);
    
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nCONTEXT: ' + searchData);
    let html = (responseText.match(/```html?([^]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    const postTitle = (html.match(/<h1[^>]*>([^]*?)<\/h1>/i)?.[1] || target).replace(/<.*?>/g, '').trim();
    console.log(`📝 [확정 발행 제목]: ${postTitle}`);
    
    const h2s = (html.match(/<h2[^>]*>([^]*?)<\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('📂 [섹션 구성 목차]:');
    h2s.forEach((h, ii) => console.log(`   ├ [${ii+1}] ${h}`));
    
    const ipList = [];
    const pRegex = /([①-④1-4])번[:\s-]*\s*(.*?)(?=\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    const phRegex = /\[이미지 삽입\](?:\s*alt=".*?")?(?:\s*title=".*?")?/gi;
    const phMatches = html.match(phRegex) || [];
    for(let i=0; i<phMatches.length; i++) {
        const prompt = ipList[i] || `${target} professional cinematic photography`;
        const url = await genImg(prompt, model, i+1);
        const at = (phMatches[i].match(/alt="(.*?)"/i)?.[1] || target);
        const tt = (phMatches[i].match(/title="(.*?)"/i)?.[1] || target);
        const imgHtml = `<div style="text-align:center; margin:45px 0;"><img src="${url}" alt="${at}" title="${tt}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.1);"><p style="font-size:14px; color:#888; margin-top:12px; font-style:italic;">${tt}</p></div>`;
        html = html.replace(phMatches[i], imgHtml);
    }
    
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: postTitle, content: html, published: pTime.toISOString() } });
        console.log(`✨ 성공: [${postTitle}] 발행 완료!\n`);
    } catch(e) { console.error(`🚨 에러: ${e.message}`); throw e; }
}
async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const list = (config.clusters || []).sort(() => Math.random() - 0.5);
        console.log(`🎲 총 ${config.clusters.length}개 키워드 랜덤 믹스 완료.`);
        for(let i=0; i<Math.min(list.length, 5); i++) {
            let pTime = new Date(); pTime.setMinutes(pTime.getMinutes() + (i * 180));
            await writeAndPost(model, list[i], blogger, config.blog_id, pTime, i+1);
        }
    } catch(e) { console.error('\n🚨 중단:', e.message); process.exit(1); }
}
run();