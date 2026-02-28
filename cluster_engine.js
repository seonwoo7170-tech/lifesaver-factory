const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠를 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요."];
const MASTER_GUIDELINE = "# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n# VUE STUDIO 최종 통합본 (Platinum Oracle V2) - 오리지널 규격\\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n[디자인 시스템: 통합본 규격 준수]\\n너는 반드시 모든 h2와 강조 박스에 아래의 오리지널 인라인 스타일을 적용해야 한다.\\n\\n1. h2 제목 스타일 (7종 색상 순차 적용 필수):\\n   - s1: background:moccasin; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s2: background:lightpink; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s3: background:palegreen; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s4: background:skyblue; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s5: background:plum; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s6: background:lightsalmon; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n   - s7: background:#98d8c8; border-left:5px solid #111; padding:12px; border-radius:8px; font-size:22px; bold;\\n\\n2. 강조 박스 4종 (overflow:hidden; clear:both; 강제 적용):\\n   - (A) 경험담: background:#ECFDF5; border-left:5px solid #22C55E; border-radius:12px; padding:20px; color:#166534;\\n   - (B) 꿀팁: background:#FEFCE8; border-left:5px solid #EAB308; border-radius:12px; padding:20px; color:#854D0E;\\n   - (C) 주의: background:#FEF2F2; border-left:5px solid #EF4444; border-radius:12px; padding:20px; color:#991B1B;\\n   - (D) 데이터: background:#EEF2FF; border-left:5px solid #6366F1; border-radius:12px; padding:20px; color:#3730A3;\\n\\n3. 목차 및 공통 규격:\\n   - 목차: background:#E8F4FD; border-left:5px solid #3B82F6; border-radius:12px; padding:20px;\\n   - 이미지: 본문 내 [[IMG_1]], [[IMG_2]], [[IMG_3]], [[IMG_4]] 위치 절대 고수\\n\\n[서사 및 품질: Platinum Oracle V2]\\n- 말투: 전문가 10년차 베테랑 구어체 (~거든요, ~잖아요, ~더라고요)\\n- 분량: 순수 한글 4,000자 이상 (YMYL 5,500자 이상)\\n- 서사: 실패담(호텔공용PC 등), 비교분석, 비밀폭로 필수 포함\\n- FAQ: 8~10개 고퀄리티 질의응답 및 스키마 포함\\n\\n[출력 제약]\\n- JSON 한 줄 출력(content 내 줄바꿈 금지), 모든 HTML 속성은 작은따옴표(') 사용.";

const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function searchWeb(query, lang) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return "검색 결과 없음";
  try {
    const res = await axios.post('https://google.serper.dev/search', {
      q: query, gl: lang === 'en' ? 'us' : 'kr', hl: lang === 'en' ? 'en' : 'ko'
    }, { headers: { 'X-API-KEY': key } });
    console.log("   ➤ [RESEARCH] 실시간 웹 데이터 수집 완료! 🔎");
    return res.organic.slice(0, 5).map(o => "[출처: " + o.title + "]\n" + o.snippet + "\nURL: " + o.link).join("\n\n");
  } catch (e) { return "검색 실패"; }
}

function clean(raw) {
  if (!raw) return '{}';
  let json = raw.trim();
  const start = Math.min(json.indexOf('{') === -1 ? Infinity : json.indexOf('{'), json.indexOf('[') === -1 ? Infinity : json.indexOf('['));
  if (start === Infinity) return '{}';
  json = json.substring(start);
  const lb = Math.max(json.lastIndexOf('}'), json.lastIndexOf(']'));
  return lb !== -1 ? json.substring(0, lb + 1) : json;
}

function repairHTML(html) {
  let r = (html || "").trim();
  const stack = [];
  const tags = r.match(/<\/?([a-z1-6]+)/gi) || [];
  for (let t of tags) {
    const n = t.replace(/[<\/>]/g, '').split(' ')[0].toLowerCase();
    if (['img', 'br', 'hr', 'input'].includes(n)) continue;
    if (t.includes('/')) { if (stack.length > 0 && stack[stack.length-1] === n) stack.pop(); }
    else stack.push(n);
  }
  while (stack.length > 0) r += '</' + stack.pop() + '>';
  return r;
}

async function genImg(label, detail, title, model, kw) {
  const p = (typeof detail === 'string' ? detail : detail?.prompt) || title;
  const a = (typeof detail === 'string' ? title : detail?.alt) || title;
  const t = (typeof detail === 'string' ? title : detail?.title) || title;
  const kie = process.env.KIE_API_KEY;
  const ibb = process.env.IMGBB_API_KEY;
  let url = '';
  if (kie) {
    try {
      const res = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', {
        model: 'z-image', input: { prompt: p + ", premium photography, 8k", aspect_ratio: "16:9" }
      }, { headers: { Authorization: 'Bearer ' + kie } });
      const tid = res.data.taskId || res.data.data?.taskId;
      if (tid) {
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const ck = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kie } });
          const state = ck.data.state || ck.data.data?.state;
          if (state === 'success') {
            const rj = ck.data.resultJson || ck.data.data?.resultJson;
            const urs = (typeof rj === 'string' ? JSON.parse(rj).resultUrls : rj?.resultUrls) || [];
            if (urs.length > 0) { url = urs[0]; break; }
          }
        }
      }
    } catch (e) {}
  }
  if (url && ibb) {
    try {
      const fd = new FormData(); fd.append('image', url);
      const up = await axios.post('https://api.imgbb.com/1/upload?key=' + ibb, fd, { headers: fd.getHeaders() });
      if (up.data?.data?.url) { 
        console.log('   ➤ [ImgBB] 이미지 영구 저장 성공! ✅'); 
        return { url: up.data.data.url, alt: a, title: t }; 
      }
    } catch (e) {
      console.log('   ➤ [ImgBB] 업로드 실패, 임시 주소 유지합니다 ⚠️');
    }
  }
  if (!url) {
    url = "https://loremflickr.com/1280/720/" + encodeURIComponent((kw || "tech").split(' ')[0]) + "?random=" + Math.random();
    console.log('   ➤ [KIE] 이미지 생성 실패로 지능형 대체 이미지 적용 📸');
  }
  return { url, alt: a, title: t };
}

async function writeAndPost(model, target, blogger, bId, time, lang, extra = '') {
  const isPillar = extra.includes('PILLAR');
  console.log(isPillar ? "👑 [PILLAR] 최상위 메인 포스트 작성 시작!" : "🚀 [SUB] 클러스터 서브 포스트 작성을 시작합니다: " + target);
  
  const research = await searchWeb(target, lang);
  const narrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: MASTER_GUIDELINE + "\n[RESEARCH]:\n" + research + "\n[PERSONA]: " + narrative + "\n[TOPIC]: " + target + "\n[LANG]: " + lang + extra }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
  });
  let resText = result.response.text();
  let data;
  try { data = JSON.parse(clean(resText)); } catch (e) { data = { content: resText, labels: [], title: target }; }
  
  data.image_prompts = data.image_prompts || {};
  let content = repairHTML(data.content || "");
  let title = data.title || target;
  const h1 = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) title = h1[1].replace(/<[^>]+>/g, '').trim();
  
  const [i1, i2, i3, i4] = await Promise.all([
    genImg("IMG_1", data.image_prompts.IMG_1, title, model, target),
    genImg("IMG_2", data.image_prompts.IMG_2, title, model, target),
    genImg("IMG_3", data.image_prompts.IMG_3, title, model, target),
    genImg("IMG_4", data.image_prompts.IMG_4, title, model, target)
  ]);
  
  const w = (i) => '<div style="text-align:center; margin:35px 0;"><img src="'+i.url+'" alt="'+i.alt+'" title="'+i.title+'" style="width:100%; border-radius:15px;"><p style="font-size:12px; color:#888;">'+i.alt+'</p></div>';
  content = content.replace(/<h1[^>]*>.*?<\/h1>/gi, '').replaceAll('[[IMG_1]]', w(i1)).replaceAll('[[IMG_2]]', w(i2)).replaceAll('[[IMG_3]]', w(i3)).replaceAll('[[IMG_4]]', w(i4));
  if (!content.includes(i1.url)) content = w(i1) + content;
  
  await blogger.posts.insert({
    blogId: bId, requestBody: { title, labels: data.labels || [], content: content.replace(/>/g, '>\n'), published: time.toISOString() }
  });
  console.log("🎉 [성공] 포스팅 발행 완료: " + title);
  return { title, url: "" };
}

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const blogger = google.blogger({ version: 'v3', auth });
  const cfg = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
  const targetTopic = cfg.pillar_topic || cfg.clusters?.[0] || "Blog Post";
  const postTime = new Date();
  
  console.log("🛠️ VUE STUDIO 전용 엔진 가동 중... (모드: " + cfg.post_mode + ")");

  if (cfg.post_mode === 'cluster') {
    const plan = await model.generateContent("Plan 4 catchy sub-topic titles for: " + targetTopic + ". Return ONLY JSON array of 4 strings.");
    const kws = JSON.parse(clean(plan.response.text()));
    console.log("🎯 클러스터 시나리오 구성 완료: 총 5개의 포스팅을 준비합니다.");
    for (let i = 0; i < kws.length; i++) {
       await writeAndPost(model, kws[i], blogger, cfg.blog_id, new Date(postTime.getTime() + (i*120*60*1000)), cfg.blog_lang);
    }
    await writeAndPost(model, targetTopic, blogger, cfg.blog_id, new Date(postTime.getTime() + (5*120*60*1000)), cfg.blog_lang, "\n[PILLAR_POST]");
  } else {
    await writeAndPost(model, targetTopic, blogger, cfg.blog_id, postTime, cfg.blog_lang);
  }
}
run().catch(e => { console.error(e); process.exit(1); });