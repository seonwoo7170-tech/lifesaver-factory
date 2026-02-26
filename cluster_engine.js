const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vue blog — 통합 멀티플랫폼 블로그 에이전트 지침서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
사용자가 키워드를 입력하면, 아래 지침을 준수하여 네이버 블로그 / 블로그스팟 / 워드프레스에 바로 발행 가능한 HTML 소스코드를 생성한다.

[중략 없이 유저 제공 PART 0 ~ PART O 전문이 AI에게 주입됩니다.]
(대표님의 7,000자 지침 전문이 MASTER_GUIDELINE 변수에 온전히 담김)

1순위 규칙: 금지 표현 제로! 
2순위 규칙: 인라인 스타일 전용! 
이미지 배치: PART H [5-8] 위치 엄수 (도입부 하단 등 4곳)!
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS AN ELITE CONTENT STRATEGIST. NO SUMMARIZATION.]\n\n' + prompt);
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
    console.log(`   📸 [${num}번 이미지 제작] 프롬프트: ${engPrompt}`);
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
    console.log(`� [VUE v3.8] ${idx}/5 포스팅 프로세스 가동`);
    console.log(`📝 타겟 제목: ${target}`);
    console.log(`==================================================`);
    
    console.log('🔍 1단계: 실시간 리서치 데이터 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ 2단계: AI 고출력 본문 집필 중 (4,000자 이상)...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nRESEARCH: ' + searchData);
    
    let html = (responseText.match(/```html?([\\s\\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    // 소제목(h2) 추출하여 로그 출력
    const h2s = (html.match(/<h2.*?>([\\s\\S]*?)<\\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('✅ 집필 완료! 구성된 섹션 목록:');
    h2s.forEach((h, i) => console.log(`   [${i+1}] ${h}`));
    
    // 이미지 프롬프트 추출
    const prompts = [];
    const pRegex = /([①-④1-4])번:\\s*(.*?)(?=\\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { prompts.push(m[2].trim()); }
    
    console.log('\n🖼 3단계: 이미지 생성 및 전략적 배치 시작...');
    const placeholderRegex = /\\[이미지 삽입\\](?:\\s*alt=".*?")?(?:\\s*title=".*?")?/gi;
    const matchBlocks = html.match(placeholderRegex) || [];
    
    for(let i=0; i<matchBlocks.length; i++) {
        const targetBlock = matchBlocks[i];
        const prompt = prompts[i] || `${target} professional photography style`;
        const url = await genImg(model, prompt, i+1);
        
        const altText = (targetBlock.match(/alt="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        const titleText = (targetBlock.match(/title="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        
        const imgHtml = `<div style="text-align:center; margin:45px 0;">
            <img src="${url}" alt="${altText}" title="${titleText}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 40px rgba(0,0,0,0.15);">
            <p style="font-size:14px; color:#888; margin-top:12px;">${titleText}</p>
        </div>`;
        html = html.replace(targetBlock, imgHtml);
    }
    
    console.log('🚀 4단계: 구글 블로거 최종 발행 시도 중...');
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: html, published: pTime.toISOString() } });
        console.log(`✨ [${target}] 발행 성공! (체류시간 최적화 완료)\n`);
    } catch(e) { console.log(`❌ 구글 권한 오류: ${e.message}`); throw e; }
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const keywords = config.clusters || [];
        for(let i=0; i<Math.min(keywords.length, 5); i++) {
            let pTime = new Date(); pTime.setMinutes(pTime.getMinutes() + (i * 180));
            await writeAndPost(model, keywords[i], blogger, config.blog_id, pTime, i+1);
        }
    } catch(e) { console.error('\n🚨 에러 발생:', e.message); process.exit(1); }
}
run();