const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
# [VUE POST v4.4 리얼 무삭제 오리지널 지침서]

[PART 0 — 충돌 시 우선순위 (절대 규칙)]
1순위: 금지 표현 제로 (PART D [2])
2순위: 플랫폼 호환 HTML 규칙 (PART H [4])
3순위: E-E-A-T 서사 품질 (PART J)
4순위: 검색 의도별 구조 (PART F)
5순위: 분량 범위 (PART B)
6순위: 디자인 컴포넌트 세부 수치 (PART H [5])

[PART A — 핵심 철학 (4대 원칙)]
1. 적게: 강조 박스 글 전체 3~4개. 같은 타입 최대 1개. 연속 금지.
2. 정확하게: 수치는 검색 기반 출처 병기. 미확인 시 확정 톤 불가.
3. 진짜처럼: 경험 신호 서사 안에서 결합. AI 패턴(균등, 나열) 회피.
4. 돈 되게: 체류시간 극대화, h2 섹션 여백(margin) 확보, 자동광고 세팅.

[PART B — 입출력 & 분량]
입력: 키워드
출력: 마크다운 코드블록 내 순수 HTML (부연설명 절대 금지). 코드블록 바깥에는 다음과 같이만 출력:
🖼 이미지 프롬프트 (①~④번 번호와 함께 영문 상술)
분량: 4,000~5,500자 유동 (YMYL: 5,000~6,500자). 억지 패딩 금지.

[PART C & D — 의도 및 문체, 절대 금지 표현]
구어체 ('~거든요', '~잖아요'). 리듬 불규칙적(3~18어절). 
금지: 요청하신, 작성해 드렸습니다, 알아볼까요, 도움이 되셨으면, 마무리하겠습니다, 정리해 보겠습니다, 총정리, 완벽가이드, id=section1넘버링, 첫째/둘째 3연속, 똑같은 종결어미 3연속.

[PART F — 프레임워크]
h1 (경험+결과) -> 목차 -> 스니펫 -> 후킹 -> 본문(h2 6~7개, 테이블1, 이미지4, 박스3~4) -> FAQ 5개 -> 면책조항 -> 슬롯 -> 결론/CTA -> Schema

[PART G — 박스 4종과 단락]
(A)경험담(그린), (B)꿀팁(옐로우), (C)주의(레드), (D)데이터(인디고). 박스 없는 순수 텍스트단락 2개 이상 필수.

[PART H — HTML 및 디자인]
<style>, <script>(Schema제외) 금지. 인라인 style 적용. 
비교테이블 1개 (border-collapse:collapse). 
이미지 플레이스홀더 4개: [이미지 삽입] 텍스트를 고유 alt/title 속성과 함께 배치.
h2 배경 7종 순차 (moccasin -> lightpink -> palegreen -> skyblue -> plum -> lightsalmon -> #98d8c8).

[PART J — E-E-A-T 검증]
경험(왜, 과정, 결과) 서사 필수. 단점/실패 서사 속에 2번 노출.

[V-LOGIC 패턴 A~O 상세 (랜덤 활용)]
패턴 A: 문제 해결형 / 패턴 B: 스토리텔링형 / 패턴 C: 역피라미드형 / 패턴 D: Q&A 대화형 / 패턴 E: 단계별 가이드형 / 패턴 F: 전후 비교 분석형 / 패턴 G: 체크리스트형 / 패턴 H: 오해와 진실 타파형 / 패턴 I: 심층 리뷰형 / 패턴 J: 초보자 입문형 / 패턴 K: 경제성 비용 분석형 / 패턴 L: 타임라인 히스토리형 / 패턴 M: 상황별 맞춤 솔루션형 / 패턴 N: 장단점 양방향 분석 / 패턴 O: 트러블슈팅 응급처치

[이미지 매칭 절대 명령]
본문 내 4개의 [이미지 삽입] 위치와 출력되는 🖼 이미지 프롬프트 ①~④번은 1:1로 대응되어야 합니다.
`;

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS AN ELITE CONTENT MASTER. DO NOT SUMMARIZE. FOLLOW ALL PART 0-O RULES.]\n\n' + prompt);
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
    console.log(`   └ [🖼️ ${num}번 이미지 프롬프트]: ${ep}`);
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
    console.log(`💎 [VUE v4.4] ${idx}/5 집필 현황 브리핑`);
    console.log(`==================================================`);
    
    console.log('🔍 [1/4] 타겟 데이터 인텔리전스 수집 중...');
    const searchData = await axios.post('https://google.serper.dev/search', { q: target, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } }).then(r=>r.data.organic.slice(0,3).map(o=>o.snippet).join('\n')).catch(()=>'');
    
    console.log('✍️ [2/4] 무삭제 지침 기반 고출력 집필 (1:1 매칭 모드)...');
    const responseText = await callAI(model, MASTER_GUIDELINE + '\n\nTARGET KEYWORD: ' + target + '\nRESEARCH CONTEXT: ' + searchData);
    
    let html = (responseText.match(/```html?([\\s\\S]*?)```/i)?.[1] || responseText.split('```')[0]).trim();
    
    const postTitle = (html.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/i)?.[1] || target).replace(/<.*?>/g, '').trim();
    console.log(`📝 [확정 발행 제목]: ${postTitle}`);
    
    const h2s = (html.match(/<h2[^>]*>([\\s\\S]*?)<\\/h2>/gi) || []).map(h => h.replace(/<.*?>/g, '').trim());
    console.log('📂 [섹션 구성 목차]:');
    h2s.forEach((h, i) => console.log(`   ├ [${i+1}] ${h}`));
    
    const ipList = [];
    const pRegex = /([①-④1-4])번[:\\s-]*\\s*(.*?)(?=\\n|$)/g;
    let m; while((m = pRegex.exec(responseText)) !== null) { ipList.push(m[2].trim()); }
    
    console.log('\n🖼️ [3/4] 시각자료 생성 및 전략적 배치 시작...');
    const phRegex = /\\[이미지 삽입\\](?:\\s*alt=".*?")?(?:\\s*title=".*?")?/gi;
    const phMatches = html.match(phRegex) || [];
    
    for(let i=0; i<phMatches.length; i++) {
        const block = phMatches[i];
        const prompt = ipList[i] || `${target} professional cinematic photography`;
        const url = await genImg(prompt, model, i+1);
        const at = (block.match(/alt="(.*?)"/i)?.[1] || target);
        const tt = (block.match(/title="(.*?)"/i)?.[1] || target);
        const imgHtml = `<div style="text-align:center; margin:45px 0;"><img src="${url}" alt="${at}" title="${tt}" style="max-width:100%; border-radius:15px; box-shadow:0 12px 35px rgba(0,0,0,0.1);"><p style="font-size:14px; color:#888; margin-top:12px; font-style:italic;">${tt}</p></div>`;
        html = html.replace(block, imgHtml);
    }
    
    console.log('\n🚀 [4/4] 구글 블로거 클라우드 업로드 중...');
    try {
        await blogger.posts.insert({ blogId: bId, requestBody: { title: postTitle, content: html, published: pTime.toISOString() } });
        console.log(`✨ 성공: [${postTitle}] 블로그 발행 완료!\n`);
    } catch(e) { 
        if(e.message.includes('permission')) {
            console.error('\n🚨 [권한 차단] 구글 API 권한이 없습니다!');
            console.error(`👉 블로그 ID: ${bId}`);
            console.error('👉 조치 방법: OAuth Playground에서 스코프(https://www.googleapis.com/auth/blogger)를 반드시 체크하고 토큰을 새로 발급받아 깃허브 Secrets에 업데이트하세요!');
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
    } catch(e) { console.error('\n🚨 비상 가동 중단:', e.message); process.exit(1); }
}
run();