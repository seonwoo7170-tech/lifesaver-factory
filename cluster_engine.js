const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
Vue blog — 통합 멀티플랫폼 블로그 에이전트 지침서 (PART 0~O 오리지널)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
■ 분량: 4,000~5,500자 (YMYL 주제인 경우 5,000~6,500자로 가산)

PART D — 문체 & 금지 표현
- 1인칭 경험자 시점, 풍부한 구어체 리듬.
- 금지 표현 (1순위): "요청하신", "작성해 드렸습니다", "안내드립니다", "도움이 되셨으면", "살펴보겠습니다", "알아보겠습니다", "마무리하겠습니다", "정리해 보겠습니다" 등 절대 사용 금지.

PART F — 글 구조 (프레임워크)
<h1> 제목 -> 목차 -> 도입부 -> 본문 6~7개 섹션 -> FAQ 5개 -> 면책조항 -> Schema JSON-LD.

PART H — HTML 디자인 시스템 (절대 규칙)
- <style> 태그 사용 절대 금지. 오직 인라인 style 속성만 사용.
- h2 배경색 7종 순차 적용: moccasin, lightpink, palegreen, skyblue, plum, lightsalmon, #98d8c8. (padding 12px, border-radius 8px)
- 이미지 플레이스홀더: [이미지 삽입] 텍스트를 도입부 하단, 2-3섹션 뒤, 5섹션 근처, FAQ 전 총 4곳에 배치.

PART J — E-E-A-T 품질 엔진
Experience, Expertise, Authoritativeness, Trustworthiness를 문장에 자연스럽게 녹일 것.

[특수 명령: 이미지 매칭]
본문 내 4개의 [이미지 삽입] 위치는 출력되는 🖼 이미지 프롬프트 ①~④번 번호와 1:1로 대응되어야 합니다.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ELITE CONTENT PRODUCER. NO SUMMARIZATION.]\n\n' + prompt);
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
            const trans = await callAI(model, 'Translate to English (ONLY ENGLISH PROMPT): ' + desc);
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
    console.log(`💎 [VUE v4.1] ${idx}/5 집필 프로세스 가동: ${target}`);
    console.log(`==================================================`);
    
    console.log('🔍 [1/4] 리서치 데이터 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ [2/4] 무삭제 지침 기반 고출력 집필 중...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nCONTEXT: ' + searchData);
    
    let html = (responseText.match(/```html?([\\s\\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    // 구조 확인 로그
    const h2s = (html.match(/<h2.*?>([\\s\\S]*?)<\\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('✅ 집필 완료! 소제목 구성:');
    h2s.forEach((h, i) => console.log(`   └ [${i+1}] ${h}`));
    
    // 이미지 프롬프트 추출
    const ipList = [];
    const pRegex = /([①-④1-4])번[:\\s-]*\\s*(.*?)(?=\\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    console.log('\n🖼 [3/4] 이미지 번호별 1:1 매칭 배치 시작...');
    const phRegex = /\\[이미지 삽입\\](?:\\s*alt=".*?")?(?:\\s*title=".*?")?/gi;
    const phMatches = html.match(phRegex) || [];
    
    for(let i=0; i<phMatches.length; i++) {
        const block = phMatches[i];
        const prompt = ipList[i] || `${target} realistic high resolution photography`;
        const url = await genImg(prompt, model, i+1);
        
        const at = (block.match(/alt="(.*?)"/i)?.[1] || target);
        const tt = (block.match(/title="(.*?)"/i)?.[1] || target);
        
        const imgHtml = `<div style="text-align:center; margin:45px 0;">
            <img src="${url}" alt="${at}" title="${tt}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.15); border:1px solid #eee;">
            <p style="font-size:14px; color:#888; margin-top:12px; font-style:italic;">${tt}</p>
        </div>`;
        html = html.replace(block, imgHtml);
    }
    
    console.log('🚀 [4/4] 구글 블로거 업로드 중...');
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: html, published: pTime.toISOString() } });
        console.log(`✨ 성공: [${target}] 발행 성공!\n`);
    } catch(e) { console.error(`🚨 구글 권한 오류: ${e.message}`); throw e; }
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
    } catch(e) { console.error('\n🚨 비상 중단:', e.message); process.exit(1); }
}
run();