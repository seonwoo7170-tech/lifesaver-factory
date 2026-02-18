const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
================================================================
[VUE POST v2.5 The Origin Master - Premium Content Strategy]
당신은 Studio VUE의 블로그 마케팅 전문가로서, 구글의 E-E-A-T 원칙과 애드센스 수익 극대화 전략을 결합한 '인간보다 더 인간다운' 프리미엄 콘텐츠를 생성합니다.

[최우선 규칙 - 글자수 및 출력 방식 강제]
1. 강제 목표량: 한국어 12,000~13,500자 / 영어 5,000 words 이상. (한 글자도 부족해선 안 됨)
2. 구성: [H1 제목] → [목차 박스] → [인트로] → [7개 본문 섹션] → [25~30개 FAQ] → [면책조항] → [클로징] → [함께 보면 좋은 정보] → [태그] → [Schema].
3. 섹션당 필수 요소:
   - 최소 1,500자 이상의 풍성한 내용.
   - <p style="margin-bottom: 20px;"> 태그 4~6문단 (한 문단당 2~3문장 제한으로 모바일 가독성 극대화).
   - 고유한 수치 데이터를 포함한 4열 4행 표(Table) 1개 필수.
   - 사실적 사진 묘사를 담은 이미지 프롬프트 1개 필수.

[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
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

[비유 표현 전문 - 각 섹션마다 1개 이상 필수 사용]
1. 다이어트 / 2. 마법봉 / 3. 좀비 / 4. 레고 블록 / 5. 요리 레시피 / 6. 퍼즐 조각 / 7. 마라톤 / 8. 돼지 저금통 / 9. 체스판 / 10. 텃밭 가꾸기 / 11. 운전면허 / 12. 첫 월급 / 13. 이사 / 14. 여행 계획 / 15. 냉장고 정리 / 16. 옷장 정리 / 17. 은행 적금 / 18. 게임 레벨업 / 19. 대청소 / 20. 장보기 리스트

[V-LOGIC 패턴] 패턴 A~O (해결형, 스토리텔링, 체크리스트 등 상황에 맞춰 융합 설계)

[HTML 가이드]
- h2 배경색 7종 순차 적용 (moccasin, lightpink, palegreen, skyblue, plum, lightsalmon, #98d8c8)
- <p style="margin-bottom: 20px;"> 태그 강제 사용.
- JSON-LD Article/FAQPage Schema 필수 포함.
================================================================
`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 15px; margin: 25px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: block; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; }
  .link-box { background-color: #212529; color: white; padding: 30px; text-align: center; border-radius: 15px; margin: 40px 0; border: 1px solid #444; }
</style>`;

function clean(raw) {
    if(!raw) return '';
    let t = raw.replace(/```json|```/gi, '').trim();
    if(t.startsWith('[') || t.startsWith('{')) {
        try {
            const o = JSON.parse(t);
            const c = Array.isArray(o) ? (o[0].content || o[0].chapter_content || o[0].text) : (o.content || o.chapter_content || o.text);
            if(c) return c;
        } catch(e) { }
    }
    return t.replace(/`/g, '').trim();
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST. STRICTLY FOLLOW GOOGLE E-E-A-T: EXPERIENCE, EXPERTISE, AUTHORITATIVENESS, TRUSTWORTHINESS. NO CHAT.]\\n' + prompt);
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
async function genImg(desc) {
    if(!desc) return '';
    const kieKey = process.env.KIE_API_KEY;
    const runwareKey = process.env.RUNWARE_API_KEY;
    const imgbbKey = process.env.IMGBB_API_KEY;
    console.log('   ㄴ [이미지] 전략적 비주얼 생성 중...');
    let imageUrl = '';

    // 1. Runware (Ultra Fast & Quality)
    if(!imageUrl && runwareKey && runwareKey.length > 5) {
        try {
            const rr = await axios.post('https://api.runware.ai/v1', [
                { action: 'generateImage', model: 'runware:100@1', positivePrompt: desc + ', detailed, 8k, professional photography', width: 1280, height: 720, number: 1 }
            ], { headers: { Authorization: 'Bearer ' + runwareKey } });
            if(rr.data.data?.[0]?.imageURL) imageUrl = rr.data.data[0].imageURL;
        } catch(e) { console.log('   ㄴ [Runware] 지연... 다음 엔진 시도'); }
    }

    // 2. Kie.ai (Premium Fallback)
    if(!imageUrl && kieKey && kieKey.length > 5) {
        try {
            const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { 
                model: 'z-image', 
                input: { prompt: desc.replace(/[^a-zA-Z, ]/g, '') + ', high-end, editorial photography, 8k', aspect_ratio: '16:9' } 
            }, { headers: { Authorization: 'Bearer ' + kieKey } });
            const tid = cr.data.data.taskId;
            for(let a=0; a<10; a++) { 
                await new Promise(r => setTimeout(r, 6000));
                const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
                if(pr.data.data.state === 'success') { imageUrl = JSON.parse(pr.data.data.resultJson).resultUrls[0]; break; }
                if(pr.data.data.state === 'fail' || pr.data.data.state === 'failed') break;
            }
        } catch(e) { }
    }

    // 3. Pollinations.ai (Infinite Stability AI)
    if(!imageUrl) {
        try {
            console.log('   ㄴ [AI] Pollinations 엔진 가동...');
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(desc)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
        } catch(e) { }
    }

    // 4. Stock Image Fallback (Absolute Safety Net)
    if(!imageUrl) {
        try {
            console.log('   ㄴ [스톡] 고품질 프리미엄 스톡 이미지 매칭...');
            const keywords = desc.split(' ').slice(0, 3).join(',');
            imageUrl = `https://loremflickr.com/1280/720/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random()*1000)}`;
        } catch(e) { 
            imageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280&auto=format&fit=crop'; // 우주 배경 기본값
        }
    }

    // 5. ImgBB Upload (Crucial: Use Base64 for reliability)
    try {
        if(imgbbKey && imgbbKey.length > 5) {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const b64 = Buffer.from(res.data).toString('base64');
            const form = new FormData(); form.append('image', b64);
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            return ir.data.data.url;
        }
        return imageUrl;
    } catch(e) { return imageUrl; }
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\\n[진행 ${idx}/${total}] 연재 대상: '${target}'`);
    console.log('   ㄴ [1단계] 실시간 트렌드 분석 및 E-E-A-T 블루프린트 설계 중...');
    const searchData = await searchSerper(target);
    const bpPrompt = `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\nTopic: "${target}"\\nContext: ${searchData}\\n1. ONLY JSON: {"title":"", "chapters":[]}\\n2. Generate EXACTLY 7 chapters. No prefixes.`;
    const bpRes = await callAI(model, bpPrompt);
    const { title, chapters } = JSON.parse(clean(bpRes));
    console.log('   ㄴ [확정 제목] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title));
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 2026 E-E-A-T 기반 고품격 서론 집필 중...');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\nMISSION: Write a massive intro for: ${title}. NO JSON. Search Data: ${searchData}`));
    body += intro; let summary = intro.slice(-500);
    
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    for(let i=0; i<7; i++) {
        console.log(`   ㄴ [4단계] [챕터 ${i+1}/7] '${chapters[i]}' 연재 중...`);
        let sect = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\nTopic: "${chapters[i]}" in "${title}". Context: ${summary}. Search Data: ${searchData}. NO JSON. IMPORTANT: MUST include exactly one [IMAGE_PROMPT: description] tag inside the text.`));
        
        // 이미지 태그 치환 프로세스
        const promptMatch = sect.match(/\\[IMAGE_PROMPT:\\s*(.*?)\\]/);
        if(promptMatch) {
            const chapterImg = await genImg(promptMatch[1]);
            if(chapterImg) sect = sect.replace(promptMatch[0], `<img src="${chapterImg}" alt="${chapters[i]}">`);
            else sect = sect.replace(promptMatch[0], '');
        }
        
        body += `<h2 id="s${i+1}" style="background-color:${colors[i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🎯 ${chapters[i]}</h2>${sect}`;
        summary = sect.slice(-500);
    }
    
    console.log('   ㄴ [5단계] FAQ 및 Schema 데이터 생성 중...');
    let footer = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\nCreate 25-30 massive FAQ, Closing, Tags, and JSON-LD Schema for "${title}". NO JSON outside schema.`));
    body += footer + '</div>';
    
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('   ㄴ ✅ 발행 완료! 주소: ' + res.data.url);
    return { title, url: res.data.url };
}
async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || []; if(!pool.length) return;
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    let subRes = clean(await callAI(model, 'Generate 4 professional sub-topics for "' + mainSeed + '" as flat JSON array. ONLY JSON.'));
    let subTopics = JSON.parse(subRes).map(t => typeof t === 'string' ? t : (t.topic || t.title));
    let subLinks = []; let cTime = new Date();
    for(let i=0; i < subTopics.length; i++) {
        cTime.setMinutes(cTime.getMinutes()+180);
        subLinks.push(await writeAndPost(model, subTopics[i], config.blog_lang, blogger, config.blog_id, new Date(cTime), [], i+1, 5));
    }
    cTime.setMinutes(cTime.getMinutes()+180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime), subLinks, 5, 5);
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.3.75', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();