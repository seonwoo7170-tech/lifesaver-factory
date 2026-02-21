const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
[VUE POST v2.5 The Origin Master - Premium Content Strategy]
당신은 Studio VUE의 블로그 마케팅 전문가로서, 구글의 E-E-A-T 원칙과 애드센스 수익 극대화 전략을 결합한 '인간보다 더 인간다운' 프리미엄 콘텐츠를 생성합니다.

[최우선 통합 규칙: "One Soul, One Article"]
1. 당신이 작성하는 각 섹션은 '독립된 글'이 아니라, 거대한 하나의 포스팅을 구성하는 '연결된 챕터'입니다.
2. [중요] 섹션마다 '안녕하세요', '그럼 시작해볼까요', '다시 돌아왔습니다' 같은 인사말이나 자기소개를 절대 반복하지 마십시오.
3. [중요] 모든 섹션에서 '솔직히 처음엔 저도 몰랐는데' 같은 유사한 패턴의 서두를 반복하지 마십시오. 챕터의 주제로 곧장 진입하되, 앞 챕터의 내용을 자연스럽게 이어받으십시오.
4. 단계별 "멈춤"이나 "질문" 지침은 무시하고, 한 번의 호출에 해당 섹션을 즉시 끝까지 집필하십시오.

`;
const NARRATIVE_HINTS = `[VUE SIGNATURE: 인드로 서사 라이브러리 (20개 전문)]
================================================================
(이 하위 내용은 도입부 집필 시에만 1회 참고하며, 이후 챕터에서는 절대 반복하지 않습니다.)
① "제가 직접 해본 결과, 역시 이론보다는 실전이 제일 중요하더라고요. 책에서 배울 때와는 전혀 다른 현장의 느낌이 있었거든요. 그래서 오늘은 제가 겪은 진짜 이야기를 들려드리려 합니다."
② "솔직히 처음엔 저도 이 방법을 전혀 몰라서 한참 동안이나 고생하고 시간만 낭비했습니다. 누가 옆에서 한마디만 해줬어도 좋았을 텐데 말이죠. 여러분은 저 같은 실수를 안 하셨으면 좋겠습니다."
③ "이 글을 읽는 분들도 아마 저처럼 시행착오를 겪고 계실 텐데, 그 막막한 마음 제가 누구보다 잘 압니다. 저도 처음에 컴퓨터 앞에 앉아 한숨만 푹푹 내쉬던 기억이 선하거든요."
④ "직접 몸으로 부딪쳐보니까 이제야 뭐가 정답이고 오답인지 확실히 알겠더라고요. 역시 정답은 멀리 있는 게 아니라 우리가 놓치기 쉬운 아주 가까운 기본기에 숨어 있었습니다."
⑤ "수많은 전문가들이 놓치는 부분인데요, 사실 이게 진짜 핵심 중의 핵심입니다. 겉모양만 적당히 따라 하다가 결국 본질을 놓치고 시간만 날리는 분들을 너무 많이 봐서 안타까워요."
⑥ "저도 예전엔 이것 때문에 밤잠 설쳐가며 고민했던 기억이 아직도 선하네요. 그때 제가 썼던 노트를 다시 들춰보니 참 엉터리로 하고 있었다는 걸 이제야 깨닫게 되었답니다."
⑦ "수십 번의 테스트와 뼈아픈 실패 끝에 알게 된 사실을 오늘 가감 없이 모두 공개할게요. 이건 제가 수백만 원짜리 유료 강의에서도 듣지 못했던 진짜 실전 팁입니다."
⑧ "몇 년 전 제 초보 시절 모습이 생각나서 더 꼼꼼하고 자세하게 정리해봤습니다. 그때 저에게 누군가 이 가이드를 줬다면 제 인생이 아마 1년은 더 빨라지고 편해졌을 거예요."
⑨ "주변 동료들이나 블로그 이웃분들에게 최근 가장 자주 받는 질문들을 하나로 모아봤어요. 다들 공통적으로 궁금해하시는 부분이 정확히 여기라는 걸 깨달았거든요."
⑩ "처음 이걸 접했을 때의 그 막막하고 답답한 당혹감이 아직도 생생합니다. 내가 과연 해낼 수 있을까 하는 의구심이 들었지만, 포기하지 않고 결국 정답을 찾아냈죠."
⑪ "블로그 이웃분들이 메일이랑 댓글로 끊임없이 물어보셔서 오늘 날 잡고 제대로 정리했습니다. 하나하나 답변드리기 어려워 아예 이 글로 종결지으려고 합니다."
⑫ "저도 처음엔 인터넷 검색만 주구장창 했었는데, 알고 보니 다 광고거나 뻔한 소리더라고요. 그래서 제가 직접 해외 자료까지 뒤져가며 검증된 것만 추려냈습니다."
⑬ "실제로 제가 한 달 동안 이 데이터를 밤낮으로 추적하고 분석해본 결과입니다. 주관적인 느낌이 아니라 철저하게 수치로 검증된 사실이니 믿고 따라오셔도 좋아요."
⑭ "이거 모르면 나중에 분명 돈 낭비, 시간 낭비로 땅을 치고 후회하게 될 핵심 포인트예요. 지금 당장 이해되지 않더라도 이 부분만큼은 꼭 메모해 두셔야 합니다."
⑮ "가까운 친한 친구나 동생에게 설명해주듯이 하나하나 아주 자세히 알려드릴게요. 복잡하고 어려운 용어 다 빼고, 초등학생도 이해할 수 있을 만큼 쉽게 풀어내겠습니다."
⑯ "처음엔 엄청 어렵게 느껴지지만, 원리만 딱 깨우치면 생각보다 별거 아니거든요. 자전거 배우는 거랑 똑같아요. 처음 한 번만 균형을 잡으면 평생 안 잊어버리죠."
⑰ "의외로 기본적인 걸 놓쳐서 매달 큰 경제적 손해를 보고 계시는 분들이 정말 많더라고요. 제가 그분들의 계정을 직접 진단해보고 찾아낸 공통적인 오류를 짚어드릴게요."
⑱ "어디에도 제대로 된 설명이 없어서 제가 직접 논문이랑 전문 서적까지 파헤치며 정리했어요. 아마 구글 전체를 뒤져봐도 이만큼 디테일한 정보는 찾기 힘드실 겁니다."
⑲ "이건 저만 알고 싶었던 특급 비법인데, 특별히 우리 Studio VUE 구독자분들께만 공유합니다. 너무 많이 알려지면 경쟁력이 떨어질까 봐 사실 공개가 조심스럽긴 하네요."
⑳ "실패를 여러 번 경험하고 눈물 젖은 빵을 먹어보고 나서야 깨달은 진짜 꿀팁입니다. 누군가에게는 오늘 이 글이 인생의 터닝포인트가 될 수도 있다고 확신합니다."

================================================================
[VUE SIGNATURE: 비유 및 수치 라이브러리 (35종 전문)]
================================================================
`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; letter-spacing: -0.5px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 15px; margin: 25px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: block; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; overflow: hidden; position: relative; }
  .toc-box ins { display: none !important; }
  .link-box { background-color: #212529; color: white; padding: 30px; text-align: center; border-radius: 15px; margin: 40px 0; border: 1px solid #444; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 15px; text-align: center; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; }
  .vue-premium table ins { display: none !important; }
  .vue-premium th { background-color: #fce4ec; color: #333; font-weight: bold; padding: 15px; border-bottom: 2px solid #f8bbd0; }
  .vue-premium td { padding: 12px 15px; border-bottom: 1px solid #fce4ec; background-color: #fffafb; color: #555; }
  .vue-premium tr:nth-child(even) td { background-color: #fdf5f7; }
  .vue-premium tr:hover td { background-color: #f8bbd0; color: #000; transition: all 0.2s ease; }
</style>`;

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/```(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') return t;
    try {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        const startArr = t.indexOf('[');
        const endArr = t.lastIndexOf(']');
        
        let jsonStr = '';
        if (defType === 'obj' && start !== -1 && end !== -1) jsonStr = t.substring(start, end + 1);
        else if (defType === 'arr' && startArr !== -1 && endArr !== -1) jsonStr = t.substring(startArr, endArr + 1);
        else {
            const s = start !== -1 ? start : startArr;
            const e = Math.max(end, endArr);
            if(s !== -1 && e !== -1) jsonStr = t.substring(s, e + 1);
        }
        
        if (jsonStr) {
            jsonStr = jsonStr.replace(/[\x00-\x1F]/g, char => char === '\n' ? '\\n' : char === '\r' ? '\\r' : char === '\t' ? '\\t' : '');
            jsonStr = jsonStr.replace(/```json|```/gi, '').trim();
            return jsonStr;
        }
    } catch(e) { }
    return defType === 'obj' ? '{"title":"' + t.replace(/["\\\n]/g, '') + '", "chapters":[]}' : '[]';
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST. STRICTLY FOLLOW GOOGLE E-E-A-T. NO CHAT.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if ((e.message.includes('429') || e.message.includes('Resource exhausted')) && retry < 5) {
            const waitTime = Math.pow(2, retry) * 20000; 
            console.log(`   ⚠️ [Rate Limit] 429 감지. ${waitTime/1000}초 후 재시도 합니다... (${retry+1}/5)`);
            await new Promise(res => setTimeout(res, waitTime));
            return callAI(model, prompt, retry + 1);
        }
        throw e;
    }
}
async function searchSerper(query) {
    if(!process.env.SERPER_API_KEY) return '';
    try {
        const r = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } });
        return r.data.organic.slice(0, 5).map(o => `${o.title}: ${o.snippet}`).join('\n');
    } catch(e) { return ''; }
}
async function genImg(desc, model) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;

    let engPrompt = desc;
    if(/[\uAC00-\uD7A3]/.test(desc)) {
        try {
            const t = await callAI(model, 'Translate to English for AI image gen. Return ONLY English: ' + desc);
            engPrompt = t.replace(/[^a-zA-Z0-9, .]/g, ' ').trim().substring(0, 400);
        } catch(e) { engPrompt = 'a modern lifestyle and technology scene, vibrant, professional'; }
    }
    engPrompt += ', cinematic, highly detailed, photorealistic, 8k';
    console.log('   ㄴ [AI 비주얼] 이미지 생성 시퀀스 가동... (' + desc.substring(0,40) + '...)');

    // Cloudinary 업로드 함수 (URL 또는 base64 모두 지원)
    async function uploadToCloudinary(fileBuffer, mimeType) {
        if(!cloudName || !cloudKey || !cloudSecret || !fileBuffer) return null;
        try {
            const crypto = require('crypto');
            const ts = Math.round(Date.now() / 1000);
            const sig = crypto.createHash('sha1').update('timestamp=' + ts + cloudSecret).digest('hex');
            const form = new FormData();
            form.append('file', fileBuffer, { filename: 'upload.jpg', contentType: mimeType || 'image/jpeg' });
            form.append('timestamp', String(ts));
            form.append('api_key', cloudKey);
            form.append('signature', sig);
            const cr = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, { headers: form.getHeaders(), timeout: 120000 });
            if(cr.data && cr.data.secure_url) { console.log('   ㄴ [Cloudinary] 영구 CDN 보관 성공! ✅'); return cr.data.secure_url; }
        } catch(e) {
            const detail = e.response ? JSON.stringify(e.response.data) : e.message;
            console.log('   ⚠️ [Cloudinary] 업로드 실패: ' + detail);
        }
        return null;
    }

    // Pollinations + wsrv.nl 프록시 다운로드 → Cloudinary 바이너리 업로드
    const models = ['flux', 'turbo', 'flux-realism'];
    const seed = Math.floor(Math.random() * 1000000);
    let polUrl = null;
    for(const pm of models) {
        try {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?model=${pm}&width=1024&height=768&seed=${seed}&nologo=true&enhance=true`;
            console.log('   ㄴ [Pollinations] ⚡ ' + pm + ' 모델 시도 중...');
            const waitMs = pm === 'flux' ? 22000 : 12000;
            await new Promise(r => setTimeout(r, waitMs));
            // wsrv.nl 프록시로 바이너리 다운로드 (Cloudflare 우회)
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=85`;
            console.log('   ㄴ [wsrv.nl] 프록시 통해 이미지 다운로드 중...');
            const imgRes = await axios.get(proxyUrl, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
            const byteLen = imgRes.data ? imgRes.data.byteLength : 0;
            if(imgRes.status === 200 && byteLen > 5000) {
                console.log('   ㄴ [wsrv.nl] 다운로드 성공! (' + byteLen + ' bytes) Cloudinary 업로드 시도...');
                const cdnUrl = await uploadToCloudinary(Buffer.from(imgRes.data), 'image/jpeg');
                if(cdnUrl) return cdnUrl;
            } else { console.log('   ⚠️ [wsrv.nl] 다운로드 불완전: ' + byteLen + ' bytes'); }
            polUrl = url; break;
        } catch(e) { console.log('   ⚠️ [Pollinations/wsrv] ' + pm + ' 실패: ' + e.message); }
    }
    if(polUrl) {
        console.log('   ㄴ [Pollinations] URL 직접 삽입 (브라우삨에서 정상 표시됩니다)');
        return polUrl;
    }

    // 최후 보루: Unsplash 무료 스톡사진
    const kw = encodeURIComponent(desc.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().substring(0, 50));
    const unsplashUrl = `https://source.unsplash.com/1024x768/?${kw}`;
    console.log('   ㄴ [Unsplash] 무료 스톡 사진 폴백 ✅');
    return unsplashUrl;
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\n[진행 ${idx}/${total}] 연재 대상: '${target}'`);
    const searchData = await searchSerper(target);
    const bpPrompt = `Write a 7-chapter Korean SEO blog strategy for: "${target}". Return ONLY raw JSON, no markdown: {\"title\":\"...\",\"chapters\":[\"ch1\",\"ch2\",\"ch3\",\"ch4\",\"ch5\",\"ch6\",\"ch7\"]}. TITLE must be a long-tail SEO keyword in Korean.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const parsed = JSON.parse(clean(bpRes, 'obj'));
        title = (parsed.title && parsed.title.length > 10) ? parsed.title : target;
        if(!parsed.chapters || parsed.chapters.length < 7) throw new Error('챕터 부족');
        chapters = parsed.chapters;
    } catch(e) { 
        console.log('   ⚠️ [블루프린트 보정] AI 제목/챕터 재생성 시도...');
        try {
            const retry = await callAI(model, `"${target}"를 주제로 구글 SEO에 최적화된 블로그 제목 1개와 7개 소제목을 만들어 주세요. 반드시 JSON 형식으로만 답하세요: {\"title\":\"...\",\"chapters\":[\"...\"]}`);
            const rp = JSON.parse(clean(retry, 'obj'));
            title = (rp.title && rp.title.length > 5) ? rp.title : target + ' 완벽 가이드 - 전문가가 알려주는 핵심 정리';
            if(rp.chapters && rp.chapters.length >= 7) { chapters = rp.chapters; }
        } catch(e2) {
            console.log('   ⚠️ [재생성 실패] 키워드를 제목으로 사용합니다.');
            title = target + ' 완벽 정리 | 초보자도 바로 따라하는 실전 가이드';
        }
        if(!chapters || chapters.length < 7) {
            chapters = [
                `${target}란 무엇인가? 핵심 개념 완전 정복`,
                `${target} 시작 전 반드시 알아야 할 3가지`,
                `실전에서 바로 쓰는 ${target} 핵심 기술`,
                `${target}에서 가장 많이 하는 실수와 해결법`,
                `비용 대비 효과를 극대화하는 ${target} 활용법`,
                `${target} 심층 분석: 놓치면 아쉬운 노하우`,
                `${target} 자주 묻는 질문 (FAQ) 총정리`
            ];
        }
    }

    const hero = await genImg(title, model);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += `<img src="${hero}" style="width:100%; border-radius:15px; margin-bottom: 30px;">`;
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li style="margin-bottom: 8px;"><a href="#s${i+1}" style="text-decoration: none; color: #333; font-weight: 500;">${c}</a></li>`).join('') + '</ul></div>';
    
    let intro = clean(await callAI(model, `STRICT: ${MASTER_GUIDELINE}\n\nNARRATIVE: ${NARRATIVE_HINTS}\n\nMISSION: Write a massive, engaging intro for: ${title}. NO markdown.`), 'text');
    body += intro;
    
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    for(let i=0; i<chapters.length; i++) {
        const chapter = chapters[i];
        console.log(`      ㄴ [순차 집필] ${i+1}/7 '${chapter}' 작성 중...`);
        let mission = (i === 6) ? `FINAL FAQ for: ${title}. 15+ Q&A.` : `Detailed BODY for Chapter ${i+1}: ${chapter}. Include 4x4 HTML Table. No markdown.`;
        let sect = clean(await callAI(model, `STRICT: ${MASTER_GUIDELINE}\n\n${mission}. MUST include one [IMAGE_PROMPT: desc] tag.`), 'text');
        
        sect = sect.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const promptMatch = sect.match(/\[\s*IMAGE_PROMPT\s*[:：]\s*(.*?)\s*\]/i);
        if(promptMatch) {
            const img = await genImg(promptMatch[1].trim(), model);
            if(img) sect = sect.replace(promptMatch[0], `<img src="${img}" alt="${chapter}" style="width:100%; border-radius:12px; margin: 25px 0;">`);
            else sect = sect.replace(promptMatch[0], '');
        }
        
        body += `<h2 id="s${i+1}" style="background-color:${colors[i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🎯 ${chapter}</h2>${sect}`;
        if (extraLinks && extraLinks[i]) {
            body += `<div class="link-box"><h3 style="color:#00e5ff;">💡 관련 심층 가이드</h3><p><strong>${extraLinks[i].title}</strong> 바로가기</p><a href="${extraLinks[i].url}" target="_blank">👉 자세히 보기</a></div>`;
        }
    }
    
    let footer = clean(await callAI(model, `Closing, 15 Tags, and JSON-LD FAQ for: ${title}. NO markdown. No chatter.`), 'text');
    body += footer + '<div style="background-color:#fff3cd; padding:20px; border-radius:10px; margin-top:40px;"><p><b>⚠️ [면책 조항]</b> 본 내용은 참고용입니다.</p></div></div>';
    
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title: title, content: body, published: pTime.toISOString() } });
    console.log('   ㄴ ✅ 발행 완료! 주소: ' + res.data.url);
    return { title: title, url: res.data.url };
}
async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || [];
    if(!pool.length) return console.log('   ❌ 키워드 없음');
    
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('   💎 메인 씨드: ' + mainSeed);
    let subTopics = [];
    try {
        subTopics = JSON.parse(clean(await callAI(model, `Generate 4 sub-topics for "${mainSeed}" as JSON string array.`), 'arr'));
    } catch(e) { subTopics = [mainSeed + ' 가이드', mainSeed + ' 팁']; }

    let subLinks = []; let cTime = new Date();
    for(let i=0; i < subTopics.length; i++) {
        cTime.setMinutes(cTime.getMinutes()+180);
        subLinks.push(await writeAndPost(model, subTopics[i], config.blog_lang, blogger, config.blog_id, new Date(cTime), [], i+1, subTopics.length + 1));
    }
    cTime.setMinutes(cTime.getMinutes()+180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime), subLinks, subTopics.length + 1, subTopics.length + 1);
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.7.1', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();