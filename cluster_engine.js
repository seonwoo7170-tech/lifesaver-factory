const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
Vue blog — 통합 멀티플랫폼 블로그 에이전트 지침서 (PART 0 ~ PART O 원본 전체)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART 0 — 충돌 시 우선순위 (절대 규칙)
1순위: 금지 표현 제로 (PART D [2]) / 2순위: 플랫폼 호환 HTML 규칙 (PART H [4]) / 3순위: E-E-A-T 서사 품질 (PART J) 

PART A — 핵심 철학 (4대 원칙)
① 적게 (Less is More) / ② 정확하게 (Precision) / ③ 진짜처럼 (Authenticity) / ④ 돈 되게 (Revenue First)

PART B — 입출력 & 분량
■ 출력: 마크다운 코드블록 안에 순수 HTML 소스코드 (<h1>으로 시작)
 코드블록 바깥 필수 출력: 🖼 이미지 프롬프트 (①~④번 영문 상세 묘사)

PART D — 문체 & 금지 표현
- 1인칭 경험자 시점, 풍부한 구어체 리듬.
- 금지 표현: "요청하신", "작성해 드렸습니다", "안내드립니다", "도움이 되셨으면", "살펴보겠습니다", "알아보겠습니다", "마무리하겠습니다", "정리해 보겠습니다" 절대 사용 금지.

PART F — 글 구조 (프레임워크)
<h1> 제목 -> 목차 -> 도입부 -> 본문 6~7개 섹션 -> FAQ 5개 -> 면책조항 -> Schema JSON-LD.

PART H — HTML 디자인 시스템 (절대 규칙)
- 오직 인라인 style만 허용. 배경색 moccasin, lightpink 등 h2 배경색 7종 순차 적용.
- [이미지 삽입] 텍스트 4곳 배치: 도입부 하단, 본문 중간 2곳, FAQ 전.

PART J — E-E-A-T 품질 엔진
- 실제 경험담(Experience)을 문체에 녹여 신뢰를 구축할 것.

[특수 명령]
작성 완료 후 반드시 코드블록 밖에 '①번: [영문 프롬프트]', '②번: [영문 프롬프트]' 형식으로 4개를 상세히 작성하시오.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS AN ELITE CONTENT MASTER. NO SUMMARIZATION.]\n\n' + prompt);
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
            const trans = await callAI(model, 'Translate image prompt to English (ONLY ENGLISH): ' + desc);
            ep = trans.replace(/```.*?```/gs, '').trim();
        } catch(e) { }
    }
    console.log(`   └ [📸 ${num}번 프롬프트]: ${ep}`);
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
    console.log(`� [VUE v4.3] 집필 프로세스 가동 [${idx}/5]: ${target}`);
    console.log(`==================================================`);
    
    console.log('🔍 [1/4] 리서치 데이터 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ [2/4] 무삭제 지침 기반 고출력 집필 중...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nCONTEXT: ' + searchData);
    
    let html = (responseText.match(/```html?([\\s\\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    const postTitle = (html.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/i)?.[1] || target).replace(/<.*?>/g, '').trim();
    console.log(`📝 [확정 발행 제목]: ${postTitle}`);
    
    const h2s = (html.match(/<h2[^>]*>([\\s\\S]*?)<\\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('📂 [섹션 구성 목차]:');
    h2s.forEach((h, i) => console.log(`   ├ [${i+1}] ${h}`));
    
    const ipList = [];
    const pRegex = /([①-④1-4])번[:\\s-]*\\s*(.*?)(?=\\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    console.log('\n🖼️ [3/4] 이미지 정밀 배치 및 생성 중...');
    const phRegex = /\\[이미지 삽입\\](?:\\s*alt=".*?")?(?:\\s*title=".*?")?/gi;
    const phMatches = html.match(phRegex) || [];
    
    for(let i=0; i<phMatches.length; i++) {
        const block = phMatches[i];
        const prompt = ipList[i] || `${target} professional photographic style`;
        const url = await genImg(prompt, model, i+1);
        const at = (block.match(/alt="(.*?)"/i)?.[1] || target);
        const tt = (block.match(/title="(.*?)"/i)?.[1] || target);
        const imgHtml = `<div style="text-align:center; margin:45px 0;"><img src="${url}" alt="${at}" title="${tt}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.1);"><p style="font-size:14px; color:#888; margin-top:12px;">${tt}</p></div>`;
        html = html.replace(block, imgHtml);
    }
    
    console.log('\n🚀 [4/4] 구글 블로거 업로드 시도 중...');
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: postTitle, content: html, published: pTime.toISOString() } });
        console.log(`✨ 성공: [${postTitle}] 발행 완료!\n`);
    } catch(e) { 
        if(e.message.includes('permission')) {
            console.error('\n🚨 [권한 차단] 구글 API 권한이 없습니다!');
            console.error('👉 조치 방법: OAuth Playground에서 리프레시 토큰을 다시 받으세요.');
            console.error('   (반드시 https://www.googleapis.com/auth/blogger 스코프 체크 필수)');
        } else { console.error(`🚨 오류 발생: ${e.message}`); }
        throw e; 
    }
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
    } catch(e) { console.error('\n🚨 가동 중단:', e.message); process.exit(1); }
}
run();