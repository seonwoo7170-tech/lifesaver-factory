const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
# [VUE POST v4.5 통합 멀티플랫폼 블로그 에이전트 지침서]

[PART 0 — 충돌 시 우선순위]
1순위: 금지 표현 제로 / 2순위: 플랫폼 호환 HTML / 3순위: E-E-A-T 서사 품질 / 4순위: 검색 의도별 구조.

[PART A — 핵심 철학]
1. 적게: 강조 박스 글 전체 3~4개. / 2. 정확하게: 수치 기반 출처 병기. / 3. 진짜처럼: 1인칭 경험 신호 결합. / 4. 돈 되게: 체류시간 극대화 디자인.

[PART B — 분량]
4,000 ~ 5,500자 (YMYL: 6,000자 권장). 

[PART D — 금지 표현 (절대 금지)]
요청하신, 작성해 드렸습니다, 안내드립니다, 도움이 되셨으면, 살펴보겠습니다, 알아볼까요, 마무리하겠습니다, 정리해 보겠습니다.

[PART F — 구조]
<h1> -> 목차 -> 도입부 -> 본문(h2 6~7개, 테이블, 이미지4) -> FAQ 5개 -> 면책조항 -> Schema.

[PART G — 디자인]
본문 중간에 '경험담', '꿀팁', '주의', '데이터' 박스 적절히 배치. 

[PART H — HTML]
<style> 태그 금지. 인라인 style만 사용. h2 배경색 7종 순차 적용. [이미지 삽입] 텍스트 4곳 배치.

[V-LOGIC 패턴 A~O]
상황에 맞춰 문제 해결형, 스토리텔링형, 역피라미드형, Q&A형, 가이드형, 전후 비교형 등 랜덤하게 융합하여 상술할 것.

[특수 명령: 이미지 매칭]
본문 내 4개의 [이미지 삽입] 위치와 코드블록 밖의 🖼 이미지 프롬프트 ①~④번은 1:1로 정확히 대응되어야 함.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ELITE COLUMNIST. NO SUMMARIZATION. FOLLOW PART 0-O EXACTLY.]\n\n' + prompt);
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
            const trans = await callAI(model, 'Translate image prompt to English (STRICT: ONLY ENGLISH): ' + desc);
            ep = trans.replace(/```.*?```/gs, '').trim();
        } catch(e) { }
    }
    console.log(`   └ [🖼️ ${num}번 프롬프트]: ${ep}`);
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
    console.log(`💎 [VUE v4.5] ${idx}/5 집필 현황 상세 브리핑`);
    console.log(`==================================================`);
    console.log(`📝 [발행 타겟]: ${target}`);
    
    console.log('🔍 [1/4] 데이터 인텔리전스 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ [2/4] 무삭제 지침 기반 고출력 집필 (Turbo)...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET: ' + target + '\nRESEARCH: ' + searchData);
    
    let html = (responseText.match(/```html?([^]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    const postTitle = (html.match(/<h1[^>]*>([^]*?)<\/h1>/i)?.[1] || target).replace(/<.*?>/g, '').trim();
    console.log(`📝 [확정 발행 제목]: ${postTitle}`);
    
    const h2s = (html.match(/<h2[^>]*>([^]*?)<\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('📂 [섹션 구성 목차]:');
    h2s.forEach((h, ii) => console.log(`   ├ [${ii+1}] ${h}`));
    
    const ipList = [];
    const pRegex = /([①-④1-4])번[:\s-]*\s*(.*?)(?=\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    console.log('\n🖼️ [3/4] 시각자료 생성 및 전략적 배치...');
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
    
    console.log('\n🚀 [4/4] 구글 블로거 클라우드 업로드 중...');
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: postTitle, content: html, published: pTime.toISOString() } });
        console.log(`✨ 성공: [${postTitle}] 발행 완료!\n`);
    } catch(e) { 
        if(e.message.includes('permission')) {
            console.error('\n🚨 [권한 오류] 구글 블로그 쓰기 권한이 없습니다!');
            console.error('👉 조치: OAuth Playground에서 스코프(blogger) 체크를 확인하고 토큰을 새로 발급받으세요.');
        } else { console.error(`🚨 오류: ${e.message}`); }
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
    } catch(e) { console.error('\n🚨 중단:', e.message); process.exit(1); }
}
run();