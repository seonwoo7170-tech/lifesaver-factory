const {google} = require('googleapis');
const {GoogleGenerativeAI} = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

const MASTER_GUIDELINE = "# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# VUE STUDIO 최종 통합본 (Platinum Oracle V2)\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n사용자가 키워드를 입력하면, 아래 지침을 준수하여\n네이버 블로그 / 블로그스팟 / 워드프레스에 바로 발행 가능한\nHTML 소스코드를 생성한다.\n\n\n════════════════════════════════════════\n  PART 0 — 번역 및 우선순위 (절대 규칙)\n════════════════════════════════════════\n\n[GLOBAL LANGUAGE ROUTING & TRANSLATION]\n★ 만약 사용자가 제시한 키워드나 타겟 주제가 '영문'이거나, 사용자 의도가 '영문 블로그'라고 판단될 경우:\n  1. 출력되는 모든 본문 내용은 반드시 100% 생생하고 자연스러운 원어민 영어(English)로만 작성하세요.\n  2. 지침에 하드코딩된 한국어 UI 컴포넌트 이름(\"📋 목차\", \"💬 직접 써본 경험\", \"💡 꿀팁\", \"⚠️ 주의\", \"📊 실제 데이터\", \"👉 함께 읽으면 좋은 글\", 면책조항 한국어 텍스트 등)은 절대로 한국어 그대로 출력하지 말고, 맥락에 맞게 완벽한 영어로 자동 번역하여 출력하세요. (예: \"📋 Table of Contents\", \"💡 Pro Tip\" 등)\n  3. 영문 블로그 모드일 경우, 최종 JSON 내에 단 한 글자의 한국어도 포함되어서는 안 됩니다.\n\n[규칙 간 충돌 발생 시 우선순위]\n  1순위: 영문일 경우 100% 영문 번역 원칙 (위 규칙)\n  2순위: 금지 표현 제로 (PART D [2])\n  3순위: 플랫폼 호환 HTML 규칙 (PART H [4])\n  4순위: E-E-A-T 서사 품질 (PART J)\n  5순위: 검색 의도별 구조 (PART F)\n  6순위: 분량 범위 (PART B)\n\n\n════════════════════════════════════════\n  PART A — 핵심 철학 (4대 원칙)\n════════════════════════════════════════\n\n① 적게 (Less is More)\n  강조 박스 글 전체 3~4개. 같은 타입 최대 1개.\n  연속 2개 박스 배치 금지.\n  장치가 적을수록 각 장치의 임팩트가 강해진다.\n\n② 정확하게 (Precision)\n  모든 수치는 검색으로 확인된 데이터 기반.\n  수치 사용 시 반드시 출처를 문장 안에 자연스럽게 병기.\n    예: \"환경부 기준에 따르면 적정 습도는 40~60%예요\"\n  확인 불가 수치는 절대 확정 톤 금지. 생략 또는 불확실 톤 처리.\n  가격 정보에는 반드시 시점 명시.\n\n③ 진짜처럼 (Authenticity)\n  경험 신호를 서사 흐름 안에서 자연 발생.\n  AI 패턴(균등 문단, 반복 구조, 과잉 장식) 의식적 회피.\n  실제 블로거의 글처럼 불규칙하고 주관적으로.\n\n④ 돈 되게 (Revenue First)\n  체류시간 극대화 = 애드센스 수익 극대화.\n  h2 섹션 사이에 자동광고가 자연스럽게 붙을 텍스트 여백 확보.\n  이미지 플레이스홀더는 광고 간격 조절 장치 역할.\n  콘텐츠 > 광고 비율 항상 유지 (애드센스 정책 준수).\n\n\n════════════════════════════════════════\n  PART B — 입출력 & 분량\n════════════════════════════════════════\n\n★ [최상위 작성 언어 규칙]: 너는 글 전체(제목, 본문, 목차 리스트, FAQ 등 모든 요소)를 반드시 프롬프트 마지막에 지정된 [TARGET_LANGUAGE] 언어로만 작성해야 한다! 영어(English)로 작성하라는 명시적 설정이 없다면 무조건 한국어로 써라.\n\n■ 입력: 키워드 또는 제목 (한국어)\n\n■ 출력: 마크다운 코드블록 안에 순수 HTML 소스코드\n  → 코드블록 바깥 출력 (아래만 허용, 그 외 부연·인사말·요약 없음):\n  ★ [초특급 치명적 에러 방지 규칙]: JSON 데이터 구조 내에서 \"content\" 속성의 값은 절대 물리적인 줄바꿈(Enter)이 포함되어서는 안 됩니다. HTML 코드를 작성하더라도 무조건 긴 한 줄(Single Line)로 연결해서 써야 하며, 문단 바꿈이 필요할 때는 반드시 HTML 태그(<br> 또는 <p>)로만 처리하세요! JSON 파싱 에러(Expected ',' or '}')의 99%는 네가 content 안에 실수로 줄바꿈을 넣었기 때문입니다. 절대로 줄바꿈 기호를 쓰지 마세요!!\n\n    🔗 클러스터 키워드: A, B, C, D, E\n    📎 퍼머링크: 영문-소문자-하이픈-슬러그\n    🏷 라벨: 연관 키워드 10개 쉼표 구분 (블로그스팟 라벨 칸에 복붙용)\n    📝 검색 설명: 스니펫 도입부 기반 150자 이내 메타 디스크립션\n    🖼 이미지 프롬프트:\n      IMG_0: { mainTitle: \"메인 제목(핵심 가치)\", subTitle: \"보조 제목(공감/베네핏)\", tag: \"우측 상단 태그(신뢰도)\", bgPrompt: \"배경 이미지 영문 프롬프트\" }\n      IMG_1: { prompt: \"영문 프롬프트 16:9\", alt: \"1번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_2: { prompt: \"영문 프롬프트 16:9\", alt: \"2번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_3: { prompt: \"영문 프롬프트 16:9\", alt: \"3번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_4: { prompt: \"영문 프롬프트 16:9\", alt: \"4번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n  → HTML 주석(<!-- -->) 삽입 금지\n\n■ 분량: 1단계 미션 + 2단계 미션 합산 총 10,000자 목표 (순수 한글 텍스트 기준)\n  ★ [초강력 경고]: 요약된 개조식 리스트(<ul>, <ol>) 남발을 금지하며, 압도적인 서사(전문가의 썰, 구체적 예시, 풍부한 설명)를 텍스트 단락(<p>)으로 길게 풀어내어 분량을 극대화하세요.\n  ★ [치명적 경고]: 생성하는 모든 HTML 속성(class, style, href 등)에는 반드시 작은따옴표(')만 사용하세요. 큰따옴표(\") 사용 시 JSON 파싱 에러가 발생합니다.\n\n■ 검색 의도별 구조 가이드:\n  정보형(Know)       h2 5~7개 × p 5개 × 각 5문장\n  비교형(Compare)    h2 5~7개 × p 5개 × 각 5문장\n  후기형(Experience) h2 5~7개 × p 5개 × 각 5문장\n  거래형(Do)         h2 5~7개 × p 5개 × 각 5문장\n\n\n════════════════════════════════════════\n  PART C — 검색 의도 자동 판별\n════════════════════════════════════════\n\n1순위 — 키워드에 명시적 신호:\n  비교형: \"vs\", \"비교\", \"차이\", \"뭐가 다른\", \"추천\", \"순위\", \"TOP\"\n  후기형: \"후기\", \"사용기\", \"써보니\", \"리뷰\", \"솔직\", \"경험\"\n  거래형: \"방법\", \"신청\", \"하는법\", \"설정\", \"가격\", \"요금\", \"비용\", \"얼마\"\n  정보형: \"뜻\", \"원리\", \"이유\", \"왜\", \"종류\", \"특징\"\n\n2순위 — 명시적 신호 없을 경우: 상위 콘텐츠 유형으로 판별.\n3순위 — 판별 불가 시: 정보형(Know) 기본값 적용.\n\n\n════════════════════════════════════════\n  PART D — 문체 & 금지 표현\n════════════════════════════════════════\n\n[1] 문체 원칙 (압도적 권위와 내부자 톤)\n말투: '오리지널 전문가'의 단호하면서도 친근한 구어체 (\"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\").\n예측 불가능한 표현: 구어체 감탄사, 주어 생략, 자문자답을 자연스럽게 섞기.\n\n[2] 강력 금지 표현 — 챗GPT 특유의 가식적 어투 생략.\n❌ \"살펴보겠습니다\", \"알아보겠습니다\", \"마무리하겠습니다\", \"총정리\", \"완벽 가이드\" 등.\n\n════════════════════════════════════════\n  PART F — 글 구조 (프레임워크)\n════════════════════════════════════════\n① [[IMG_0]] (최상단 썸네일 박스)\n② <h1> 제목 (25~35자)\n③ 목차 (파스텔 블루 박스)\n④ 스니펫 도입부 (150자 이내)\n⑤ 본문 섹션 6~7개 (각 섹션 h2 + p 단락 다수)\n⑥ FAQ 10개 (Schema 포함)\n⑦ 마무리 요약 및 CTA\n\n[디자인 컴포넌트 필수 속성]\n- 모든 강조 박스 div에는 'overflow:hidden; clear:both;'를 추가하여 애드센스 자동광고 삽입 공간을 확보하라.\n\n════════════════════════════════════════\n  PART K — SEO & 애드센스 수익 최적화 (핵심)\n════════════════════════════════════════\n★ [중요] 모든 내부 링크(클러스터 버튼, 관련 글 리스트)는 전면 광고(Interstitial) 노출을 유도하기 위해 반드시 현재 창에서 열려야 한다. (target='_blank' 제거)\n★ h2 섹션 사이 여백(margin)을 충분히 확보하여 광고 클릭률을 높여라.";
const NARRATIVE_HINTS = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 개인적인 경험에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠를 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보고 싶습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비셋한 부분에서 고민하고 계시다는 걸 알게 됐거든요."];

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
  .vue-premium { font-family: 'Noto Sans KR', sans-serif; color: #374151; line-height: 1.8; font-size: 16px; max-width: 800px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium p { margin: 25px 0; }
  .vue-premium h2 { font-size: 22px; font-weight: bold; color: #111; border-left: 5px solid #111; padding-left: 14px; margin: 60px 0 30px; border-radius: 8px; padding: 12px; }
  .toc-box { background: #E8F4FD; border-left: 5px solid #3B82F6; border-radius: 12px; padding: 25px; margin: 35px 0; overflow: hidden; clear: both; }
  .tip-box { background: #FEFCE8; border-left: 5px solid #EAB308; border-radius: 12px; padding: 20px; margin: 30px 0; overflow: hidden; clear: both; }
  .warn-box { background: #FEF2F2; border-left: 5px solid #EF4444; border-radius: 12px; padding: 20px; margin: 30px 0; overflow: hidden; clear: both; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 40px 0; border: 1px solid #e5e7eb; }
  .vue-premium th { background: #f9fafb; padding: 15px; border-bottom: 2px solid #e5e7eb; }
  .vue-premium td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
  .cluster-btn-box { text-align: center; margin: 45px 0; overflow: hidden; clear: both; }
  .cluster-btn { display: inline-block; padding: 16px 48px; background: #2563EB; color: #fff !important; text-decoration: none !important; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
</style>`;

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/\`\`\`(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') return t.trim();
    try {
        const start = t.indexOf('{'), end = t.lastIndexOf('}');
        const startArr = t.indexOf('['), endArr = t.lastIndexOf(']');
        let jsonStr = '';
        if (defType === 'obj' && start !== -1 && end !== -1) jsonStr = t.substring(start, end + 1);
        else if (defType === 'arr' && startArr !== -1 && endArr !== -1) jsonStr = t.substring(startArr, endArr + 1);
        if (jsonStr) {
            jsonStr = jsonStr.replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
            return jsonStr;
        }
    } catch(e) { }
    return defType === 'obj' ? '{ }' : '[]';
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER BLOGGER.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (String(e.message).includes('429') && retry < 5) {
            await new Promise(res => setTimeout(res, Math.pow(2, retry) * 15000));
            return callAI(model, prompt, retry + 1);
        }
        return '';
    }
}

async function searchSerper(query) {
    if(!process.env.SERPER_API_KEY) return '';
    try {
        const r = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } });
        return r.data.organic.slice(0, 5).map(o => o.title + ': ' + o.snippet).join('\n');
    } catch(e) { return ''; }
}

async function genThumbnail(meta, model) {
    try {
        console.log('      🎨 [IMG_0]: 썸네일 캔버스 제작 시작...');
        const bgUrl = await genImg(meta.bgPrompt, model, 0, true);
        const canvas = createCanvas(1200, 630);
        const ctx = canvas.getContext('2d');
        const bg = await loadImage(bgUrl);
        ctx.drawImage(bg, 0, 0, 1200, 630);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; ctx.fillRect(0, 0, 1200, 630);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 15; ctx.strokeRect(40, 40, 1120, 550);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px sans-serif'; ctx.fillText(meta.tag || 'EXCLUSIVE', 100, 120);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 80px sans-serif';
        const lines = meta.mainTitle.match(/.{1,15}/g) || [meta.mainTitle];
        lines.forEach((l, i) => ctx.fillText(l, 100, 240 + (i * 100)));
        ctx.fillStyle = '#f3f4f6'; ctx.font = '40px sans-serif'; ctx.fillText(meta.subTitle || '', 100, 520);
        const buffer = canvas.toBuffer('image/jpeg');
        const form = new FormData(); form.append('image', buffer.toString('base64'));
        const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, {headers: form.getHeaders() });
        return ir.data.data.url;
    } catch(e) { console.log('      ⚠️ [썸네일 오류]: ' + e.message); return ''; }
}

async function genImg(prompt, model, i, skipUpload = false) {
    if(!prompt) return '';
    const engPrompt = prompt.replace(/[^a-zA-Z0-9, ]/gi, '').trim() + ', hyper-realistic, 8k';
    let url = '';
    if(process.env.KIE_API_KEY) {
        try {
            const r = await axios.post('https://api.runware.ai/v1', [{ action: 'R_IMAGE_INFERENCE', model: 'runware:100@1', prompt: engPrompt, width: 1280, height: 720 }], { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
            url = r.data.data?.[0]?.imageURL;
        } catch(e) {}
    }
    if(!url) url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
    if(skipUpload || !process.env.IMGBB_API_KEY) return url;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
        const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, {headers: form.getHeaders() });
        return ir.data.data.url;
    } catch(e) { return url; }
}

async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    const searchData = await searchSerper(target);
    let clusterContext = '';
    if(extraLinks.length > 0) {
        clusterContext = '\\n[CLUSTER_HUB] 메인 글 작성 중. 서브 글들을 섹션마다 요약하고 버튼(현재창)을 넣으시오: ' + JSON.stringify(extraLinks);
    }
    console.log(`      🔥 [작업 ${idx}/${total}]: '${target}' 집필 중...`);
    const m1 = await callAI(model, MASTER_GUIDELINE + '\\n[MISSION: PART 1] ' + target + '의 제목, 전체 목차, 인트로, 전반부 섹션 3개를 5,000자 이상 작성하라.' + clusterContext + '\\n' + searchData);
    const m2 = await callAI(model, MASTER_GUIDELINE + '\\n[MISSION: PART 2] 이전 내용을 이어받아 나머지 목차 섹션들을 5,000자 이상 채우고 FAQ 10개를 작성하라. 절대 중복 금지.\\n[이전 내용]: ' + m1);
    const fullRaw = m1 + '\\n' + m2;
    const img0Regex = /IMG_0:\s*\\{?\\s*mainTitle:\s*["\'](.*?)["\'],\s*subTitle:\s*["\'](.*?)["\'],\s*tag:\s*["\'](.*?)["\'],\s*bgPrompt:\s*["\'](.*?)["\']\\s*\\}?/i;
    const m0 = fullRaw.match(img0Regex);
    let finalHtml = clean(fullRaw, 'text');
    if(m0 && finalHtml.includes('[[IMG_0]]')) {
        const url = await genThumbnail({ mainTitle: m0[1], subTitle: m0[2], tag: m0[3], bgPrompt: m0[4] }, model);
        finalHtml = finalHtml.split('[[IMG_0]]').join(`<img src='${url}' alt='Thumbnail' style='width:100%; border-radius:15px; margin-bottom:40px;'>`);
    }
    for(let i=1; i<=4; i++) {
        if(finalHtml.includes('[[IMG_'+i+']]')) {
            const url = await genImg(target + ' professional photo ' + i, model, i);
            finalHtml = finalHtml.split('[[IMG_'+i+']]').join(`<img src='${url}' alt='Image ${i}' style='width:100%; border-radius:12px; margin:30px 0;'>`);
        }
    }
    const post = await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: STYLE + finalHtml, published: pTime.toISOString() } });
    return { title: target, url: post.data.url };
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const seed = config.pillar_topic || config.clusters[0];
    const subLinks = [];
    for(let i=0; i<4; i++) {
        const r = await writeAndPost(model, seed, 'ko', blogger, config.blog_id, new Date(Date.now() + i*21600000), [], i+1, 5);
        subLinks.push(r);
    }
    await writeAndPost(model, seed, 'ko', blogger, config.blog_id, new Date(Date.now() + 86400000), subLinks, 5, 5);
}
run();