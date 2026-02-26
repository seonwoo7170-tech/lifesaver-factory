const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
Vue blog — 통합 멀티플랫폼 블로그 에이전트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
사용자가 키워드를 입력하면, 아래 지침을 준수하여 네이버 블로그 / 블로그스팟 / 워드프레스에 바로 발행 가능한 HTML 소스코드를 생성한다.

PART 0 — 충돌 시 우선순위 (절대 규칙)
규칙 간 충돌 발생 시 아래 순서대로 우선 적용:
1순위: 금지 표현 제로 (PART D [2])
2순위: 플랫폼 호환 HTML 규칙 (PART H [4])
3순위: E-E-A-T 서사 품질 (PART J)
4순위: 검색 의도별 구조 (PART F)
5순위: 분량 범위 (PART B)
6순위: 디자인 컴포넌트 세부 수치 (PART H [5])

PART A — 핵심 철학 (4대 원칙)
① 적게 (Less is More) / ② 정확하게 (Precision) / ③ 진짜처럼 (Authenticity) / ④ 돈 되게 (Revenue First)

PART B — 입출력 & 분량
■ 입력: 키워드 또는 제목 (한국어)
■ 출력: 마크다운 코드블록 안에 순수 HTML 소스코드 (<h1>으로 시작)
코드블록 바깥 필수 출력: 🔗 클러스터 키워드, 📎 퍼머링크, 🏷 라벨, 📝 검색 설명, 🖼 이미지 프롬프트 (①~④번 영문 상세 묘사)
■ 분량: 4,000~5,500자 (YMYL: 5,000~6,500자)

PART D — 문체 & 금지 표현
[2] 금지 표현: "요청하신", "작성해 드렸습니다", "안내드립니다", "도움이 되셨으면", "살펴보겠습니다", "알아보겠습니다", "마무리하겠습니다", "정리해 보겠습니다" 등 절대 금지.

PART H — HTML 디자인 시스템
- 인라인 style 전용 (<style> 태그 금지)
- h1~h3 제목 태그 본문 내 사용 금지 (엔진이 <h1> 생성)
- 강조 박스 4종 & 테이블 1개 포함
- 이미지 플레이스홀더: [이미지 삽입] 텍스트를 파트 H [5-8]의 전략적 위치 4곳에 반드시 배치.

PART I — Schema 구조화 데이터
맨 마지막에 Article + FAQ JSON-LD 삽입.

[중요 추가 명령]
글 작성이 완료된 후, 코드블록 아래에 반드시 🖼 이미지 프롬프트를 ①번부터 ④번까지 번호를 매겨 각각 영문 묘사로 출력하시오. 이 번호는 본문 내 [이미지 삽입] 위치 순서와 1:1로 매치됩니다.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS AN ELITE CONTENT STRATEGIST. NO SUMMARIZATION. FOLLOW ALL RULES.]\n\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (e.message.includes('429') && retry < 3) {
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
    console.log('   🎨 시각 자료 제작 중 (' + engPrompt.slice(0, 30) + '...)');
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
    console.log(`\n🚀 [VUE v3.7] ${idx}/5 포스팅 시작: ${target}`);
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nCONTEXT: ' + searchData);
    
    let html = (responseText.match(/```html?([\s\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    // 지침대로 번호 매겨진 ①~④번 프롬프트 추출
    const ipList = [];
    const pRegex = /([①-④1-4])번:\s*(.*?)(?=\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    // 본문의 [이미지 삽입] 위치를 순서대로 찾아 1:1 매칭
    const placeholderRegex = /\[이미지 삽입\](?:\s*alt=".*?")?(?:\s*title=".*?")?/gi;
    const matches = html.match(placeholderRegex) || [];
    
    for(let i=0; i<matches.length; i++) {
        const targetBlock = matches[i];
        const prompt = ipList[i] || `${target} photorealistic photo`;
        const altText = (targetBlock.match(/alt="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        const titleText = (targetBlock.match(/title="(.*?)"/i)?.[1] || target).replace(/"/g, "&quot;");
        
        const url = await genImg(prompt, model);
        const imgHtml = `<div style="text-align:center; margin:45px 0;">
            <img src="${url}" alt="${altText}" title="${titleText}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.15); border:1px solid #f0f0f0;">
            <p style="font-size:14px; color:#888; margin-top:12px;">${titleText}</p>
        </div>`;
        html = html.replace(targetBlock, imgHtml);
    }
    
    await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: html, published: pTime.toISOString() } });
    console.log(`   ✅ 발행 완료: ${target}`);
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
    } catch(e) { console.error('\n🚨 중단:', e.message); process.exit(1); }
}
run();