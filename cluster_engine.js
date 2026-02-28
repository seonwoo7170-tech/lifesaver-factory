const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠를 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요."];
const MASTER_GUIDELINE = "\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# VUE STUDIO 최종 통합본 (Platinum Oracle V2)\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n다음은 사용자님의 오리지널 마스터 지침(PART 0 ~ PART O) 원본 전체 내용입니다. \n**단 한 글자도 임의로 수정하거나 누락하지 말고, 이 방대하고 정밀한 모든 규칙을 최우선으로 준수하십시오.**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART 0 — 충돌 시 우선순위 (절대 규칙)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n규칙 간 충돌 발생 시 아래 순서대로 우선 적용:\n\n  1순위: 금지 표현 제로 (PART D [2])\n  2순위: 플랫폼 호환 HTML 규칙 (PART H [4])\n  3순위: E-E-A-T 서사 품질 (PART J)\n  4순위: 검색 의도별 구조 (PART F)\n  5순위: 스타일러프로 컴포넌트 디자인 (PART H [5])\n  6순위: 분량 범위 (PART B)\n\n[GLOBAL LANGUAGE ROUTING]\n★ 만약 [TARGET_LANGUAGE]가 'English'이거나 사용자가 영문 작성을 원할 경우:\n  1. 모든 본문 및 컴포넌트 텍스트(목차, 박스 제목, FAQ 등)를 원어민 수준의 영어로 자동 번역하여 출력하세요.\n  2. 최종 출력에 한국어가 단 한 글자도 섞이지 않도록 하세요.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART A — 핵심 철학 (4대 원칙)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n① 적게 (Less is More): 강조 박스 글 전체 3~4개. 같은 타입 최대 1개. 연속 배치 금지.\n② 정확하게 (Precision): 모든 수치는 검색 데이터 기반. 출처 병기 필수. 가격 시점 명시.\n③ 진짜처럼 (Authenticity): 경험 서사 관통. AI 패턴 회피. 베테랑의 주관적 톤.\n④ 돈 되게 (Revenue First): h2 사이 여백(48px) 및 이미지 배치로 자동광고 공간 확보.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART B — 입출력 & 분량\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ 분량: 순수 한글 텍스트 기준 4,000자 ~ 5,500자 (YMYL +1,000자)\n■ 출력: 마크다운 코드블록 내 순수 JSON. (content 내 줄바꿈 절대 금지, 한 줄 연결 필수)\n■ HTML 속성: 반드시 작은따옴표(') 사용. 큰따옴표(\") 사용 시 JSON 에러 발생.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART D — 문체 & 금지 표현\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[1] 문체: 친근하면서 전문적인 구어체 (\"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\"). 1인칭 베테랑 시점.\n[2] 금지: 마크다운 기호(**, #), 챗GPT식 감정이입, \"~에 대해 알아보겠습니다\", 넘버링 ID, 3연속 중복 어미/어휘.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART H — 스타일러프로 HTML 디자인 시스템\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[4] HTML 기술 규칙 (3플랫폼 공통)\n  - style 인라인 속성만 사용.\n  - table에 radius, overflow, shadow 금지.\n  - 광고 방어를 위해 모든 박스 div에 style=\"overflow:hidden; clear:both;\" 필수.\n\n[5] 디자인 컴포넌트\n\n[5-1] 목차 — 파스텔 블루\n  배경 #E8F4FD / 좌측 보더 5px #3B82F6 / radius 12px / padding 20px / overflow hidden / clear both\n  제목: 📋 Table of Contents / bold 18px #1E40AF\n\n[5-2] 본문 제목 h2\n  font-size 22px / bold / color #111 / border-left 5px solid #111 / padding-left 16px\n  배경색 섹션 순차 적용: s1:moccasin, s2:lightpink, s3:palegreen, s4:skyblue, s5:plum, s6:lightsalmon, s7:#98d8c8\n\n[5-4] 강조 박스 4종 (overflow:hidden; clear:both; 필수)\n  (A) 경험담: 배경 #ECFDF5 / 좌측 보더 5px #22C55E / radius 12px / padding 20px / bold #166534\n  (B) 꿀팁: 배경 #FEFCE8 / 좌측 보더 5px #EAB308 / radius 12px / padding 20px / bold #854D0E\n  (C) 주의: 배경 #FEF2F2 / 좌측 보더 5px #EF4444 / radius 12px / padding 20px / bold #991B1B\n  (D) 데이터 근거: 배경 #EEF2FF / 좌측 보더 5px #6366F1 / radius 12px / padding 20px / bold #3730A3\n\n[5-5] FAQ 섹션\n  배경 #F5F3FF / 좌측 보더 5px #8B5CF6 / radius 12px / padding 20px\n  8~10개 고품질 섹션 필수 구성.\n\n[5-6] 비교 테이블 (필수 1개)\n  width 100% / border-collapse:collapse / margin 30px 0 / header background #f8f9fa / border 1px solid #e5e5e5\n\n[5-8] 이미지 치환 태그\n  본문 내 [[IMG_1]], [[IMG_2]], [[IMG_3]], [[IMG_4]] 텍스트로만 삽입. 시각적 박스 생성 금지.\n\n[5-11] 마무리 박스\n  배경 #F9FAFB / border 1px solid #E5E7EB / radius 12px / padding 20px / 결론 요약 산문 형태.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART J — E-E-A-T 품질 엔진 (V2 Upgrade)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[Experience — 경험] \n  1. 본인의 직접적인 실패담/후회 1개 필수.\n  2. 타 제품/서비스와의 구체적인 비교 경험 1개 필수.\n  3. 전문가의 맹점 폭로/내부 고발성 정보 1개 필수.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  PART N — 최종 검증 (POST 1~15)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nPOST-1 구조: h1→목차→스니펫→본문→FAQ(8~10개)→면책→관련포스팅→마무리→Schema\nPOST-2 금지 표현 0개 / POST-3 박스 ≤4개 / POST-8 Schema 문법\nPOST-9 분량: 4,000자~5,500자 (YMYL +1,000)\nPOST-14 수치 출처 병기 / POST-15 h2 배경색 7종 순차 적용\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  [VUE STUDIO ULTIMATE ADD-ON: FINAL RULES]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n1. **페르소나 극대화**: 베테랑 블로거의 구어체 완벽 구사.\n2. **분량 사수**: 한글 기준 최소 4,000자 미만 생성 시 즉각 파기.\n3. ❌ **마크다운 기호 사용 절대 금지**: 마크다운 대신 HTML 태그만 사용할 것.\n4. **JSON 무결성**: content 내부 줄바꿈 제거 필수.\n";


const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function searchWeb(query, lang) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return "검색 결과 없음";
  const gl = lang === 'en' ? 'us' : 'kr';
  const hl = lang === 'en' ? 'en' : 'ko';
  try {
    const res = await axios.post('https://google.serper.dev/search', { q: query, gl, hl }, { headers: { 'X-API-KEY': key } });
    return res.data.organic.slice(0, 5).map(o => "[출처: " + o.title + "]\n" + o.snippet + "\nURL: " + o.link).join("\n\n");
  } catch (e) { return "검색 실패: " + e.message; }
}

function clean(raw) {
  if (!raw) return '{}';
  let json = raw.trim();
  const start = Math.min(
    json.indexOf('{') === -1 ? Infinity : json.indexOf('{'),
    json.indexOf('[') === -1 ? Infinity : json.indexOf('[')
  );
  if (start === Infinity) return '{}';
  json = json.substring(start);
  const lastBracket = Math.max(json.lastIndexOf('}'), json.lastIndexOf(']'));
  if (lastBracket !== -1) {
    const candidate = json.substring(0, lastBracket + 1);
    try { JSON.parse(candidate); return candidate; } catch (e) {}
  }
  return json;
}

function repairHTML(html) {
  if (!html) return '';
  let repaired = html.trim();
  const lastOpen = repaired.lastIndexOf('<');
  const lastClose = repaired.lastIndexOf('>');
  if (lastOpen > lastClose) repaired = repaired.substring(0, lastOpen);
  
  const stack = [];
  const tags = repaired.match(/<\/?([a-z1-6]+)/gi) || [];
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  
  for (let tag of tags) {
    const tagName = tag.replace('<', '').replace('/', '').replace('>', '').split(' ')[0].toLowerCase();
    if (selfClosing.includes(tagName)) continue;
    if (tag.includes('/')) {
      if (stack.length > 0 && stack[stack.length - 1] === tagName) stack.pop();
    } else {
      stack.push(tagName);
    }
  }
  while (stack.length > 0) { repaired += '</' + stack.pop() + '>'; }
  return repaired;
}

function cleanHTML(h) {
  if (!h) return '';
  const h1Regex = /<h1[^>]*>.*?<\/h1>/gi;
  return h.replace(h1Regex, '').trim();
}

async function genImg(label, detail, fallbackTitle, model) {
  const pText = (typeof detail === 'string' ? detail : detail?.prompt) || fallbackTitle;
  const aText = (typeof detail === 'string' ? fallbackTitle : detail?.alt) || fallbackTitle;
  const tText = (typeof detail === 'string' ? fallbackTitle : detail?.title) || fallbackTitle;
  console.log("🎨 [" + label + "] KIE AI 이미지 생성 가동: " + pText.substring(0, 30));
  const kieKey = process.env.KIE_API_KEY;
  const imgbbKey = process.env.IMGBB_API_KEY;
  let imageUrl = '';
  if (kieKey) {
    try {
      const res = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: pText + ", premium photography, 8k, professional lightning", aspect_ratio: "16:9" } }, { headers: { Authorization: 'Bearer ' + kieKey } });
      const tid = res.data.taskId || res.data.data?.taskId;
      if (tid) {
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const check = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
          const st = check.data.state || check.data.data?.state;
          if (st === 'success') {
            const rj = check.data.resultJson || check.data.data?.resultJson;
            const rUrls = (typeof rj === 'string' ? JSON.parse(rj).resultUrls : rj?.resultUrls) || [];
            if (rUrls.length > 0) { imageUrl = rUrls[0]; break; }
          }
        }
      }
    } catch (e) { }
  }
  if (imageUrl && imgbbKey) {
    try {
      const form = new FormData();
      form.append('image', imageUrl);
      const upload = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
      return { url: upload.data.data.url, alt: aText, title: tText };
    } catch (e) { return { url: imageUrl, alt: aText, title: tText }; }
  }
  return { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280", alt: aText, title: tText };
}

async function writeAndPost(model, target, blogger, bId, pTime, lang, extraPrompt = '') {
  console.log("🚀 [STEP 1] 클러스터 블로그 엔진 가동: " + target);
  const currentDate = new Date().toISOString().split('T')[0];
  const searchSuffix = lang === 'en' ? " latest info" : " 최신 정보";
  const latestNews = await searchWeb(target + searchSuffix, lang);
  let archiveContext = "EMPTY_ARCHIVE";
  try {
    const archiveRes = await blogger.posts.list({ blogId: bId, maxResults: 50 });
    const items = archiveRes.data.items || [];
    if (items.length > 0) archiveContext = items.map(p => p.title + " (" + p.url + ")").join("\n");
  } catch (e) { }
  const selectedNarrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: MASTER_GUIDELINE + "\n[CURRENT_DATE: " + currentDate + "]\n[LATEST_RESEARCH_DATA]:\n" + latestNews + "\n[SELECTED_PERSONA]: " + selectedNarrative + "\n[BLOG_ARCHIVES]:\n" + archiveContext + "\n[TARGET_TOPIC]: " + target + "\n[TARGET_LANGUAGE]: " + lang + extraPrompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
  });
  const rawText = result.response.text();
  let data;
  try {
    data = JSON.parse(clean(rawText));
  } catch (err) {
    console.error("❌ JSON 파싱 실패! 복구 시도 중...");
    data = { title: target, content: rawText, labels: ["General"], image_prompts: {} };
  }
  
  // 데이터 정규화 (필수 필드 누락 방지)
  data.image_prompts = data.image_prompts || {};
  let content = repairHTML(data.content || "");
  let finalTitle = data.title || target;
  
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    finalTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
    console.log("📌 H1 제목 추출: " + finalTitle);
  }

  const [img1, img2, img3, img4] = await Promise.all([
    genImg("IMG_1", data.image_prompts.IMG_1 || data.image_prompts["1"], finalTitle, model),
    genImg("IMG_2", data.image_prompts.IMG_2 || data.image_prompts["2"], finalTitle, model),
    genImg("IMG_3", data.image_prompts.IMG_3 || data.image_prompts["3"], finalTitle, model),
    genImg("IMG_4", data.image_prompts.IMG_4 || data.image_prompts["4"], finalTitle, model)
  ]);
  
  const wrapImg = (i) => '<div style="text-align:center; margin:35px 0;"><img src="' + i.url + '" alt="' + i.alt + '" title="' + i.title + '" style="width:100%; border-radius:15px;"><p style="font-size:12px; color:#888; margin-top:8px;">' + i.alt + '</p></div>';
  content = cleanHTML(content);
  content = content.replaceAll('[[IMG_1]]', wrapImg(img1)).replaceAll('[[IMG_2]]', wrapImg(img2)).replaceAll('[[IMG_3]]', wrapImg(img3)).replaceAll('[[IMG_4]]', wrapImg(img4));
  if (!content.includes(img1.url)) content = wrapImg(img1) + content;
  
  const lbls = Array.isArray(data.labels) ? data.labels : (typeof data.labels === 'string' ? data.labels.split(',').map(s => s.trim()) : ["Blog"]);

  const res = await blogger.posts.insert({
    blogId: bId,
    requestBody: { title: finalTitle, labels: lbls, content: content, customMetaData: data.description || '', published: pTime.toISOString() }
  });
  console.log("🎉 발행 성공: " + res?.data?.url);
}

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const blogger = google.blogger({ version: 'v3', auth });
  const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
  let clusters = config.clusters || [];
  for (let i = clusters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clusters[i], clusters[j]] = [clusters[j], clusters[i]];
  }
  const baseTime = new Date();
  if (config.post_mode === 'cluster') {
    const seed = clusters[0] || "Blog Topic";
    const planPrompt = "Plan 4 unique blog titles for: " + seed + ". Return ONLY a JSON array of 4 strings.";
    const planRes = await model.generateContent(planPrompt);
    const subKeywords = JSON.parse(clean(planRes.response.text()));
    for (let i = 0; i < subKeywords.length; i++) {
      const postTime = new Date(baseTime.getTime() + (i * 120 * 60 * 1000));
      await writeAndPost(model, subKeywords[i], blogger, config.blog_id, postTime, config.blog_lang);
    }
  } else {
    const target = clusters[0] || "Blog Post";
    await writeAndPost(model, target, blogger, config.blog_id, baseTime, config.blog_lang);
  }
}
run().catch(err => { console.error(err); process.exit(1); });