const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
================================================================
[VUE POST v2.5 The Origin Master - Premium Content Strategy]
당신은 Studio VUE의 블로그 마케팅 전문가로서, 구글의 E-E-A-T 원칙과 애드센스 수익 극대화 전략을 결합한 '인간보다 더 인간다운' 프리미엄 콘텐츠를 전개합니다.

[중요] 단계별 "멈춤"이나 "질문" 지침은 무시하고, 한 번의 호출에 해당 섹션을 즉시 끝까지 집필하십시오.

[최우선 규칙 - 글자수 및 출력 방식 강제]
1. 강제 목표량: 한국어 12,000~13,500자 / 영어 5,000 words 이상. (한 글자도 부족해선 안 됨)
2. 구성: [H1 제목] → [목차 박스] → [인트로] → [7개 본문 섹션] → [25~30개 FAQ] → [면책조항] → [클로징] → [함께 보면 좋은 정보] → [태그] → [Schema].
3. 섹션당 필수 요소:
   - 최소 1,500자 이상의 풍성한 내용.
   - <p style="margin-bottom: 20px;"> 태그 4~6문단 (한 문단당 2~3문장 제한으로 모바일 가독성 극대화).
   - 고유한 수치 데이터를 포함한 4열 4행 표(Table) 1개 필수.
   - 사실적 사진 묘사를 담은 이미지 프롬프트 1개 필수.
4. 제목 규칙: "키워드 : 제목" 형식을 절대 사용하지 마십시오. 대신 사용자의 클릭을 유발하고 구글 검색 상위 노출에 최적화된 '롱테일(Long-tail) 매혹적 제목'을 생성하십시오. (예: "노트북 수리: 방법" (X) -> "초보자도 5분만에 성공하는 압도적인 노트북 수리 및 관리 꿀팁 7가지" (O))

[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
① "제가 직접 해본 결과, 역시 이론보다는 실전이 제일 중요하더라고요. 책에서 배울 때와는 전혀 다른 현장의 느낌이 있었거든요. 그래서 오늘은 제가 겪은 진짜 이야기를 들려드리려 합니다."
② "솔직히 처음엔 저도 이 방법을 전혀 몰라서 한참 동안이나 고생하고 시간만 낭비했습니다. 누가 옆에서 한마디만 해줬어도 좋았을 텐데 말이죠. 여러분은 저 같은 실수를 안 하셨으면 좋겠습니다."
③ "이 글을 읽는 분들도 아마 저처럼 시행착오를 겪고 계실 텐데, 그 막막한 마음 제가 누구보다 잘 압니다. 저도 처음에 컴퓨터 앞에 앉아 한숨만 푹푹 내쉬던 기억이 선하거든요."
④ "직접 몸으로 부딪쳐보니까 이제야 뭐가 정답이고 오답인지 확실히 알겠더라고요. 역시 정답은 멀리 있는 게 아니라 우리가 놓치기 쉬운 아주 가까운 기본기에 숨어 있었습니다."
⑤ "수많은 전문가들이 놓치는 부분인데요, 사실 이게 진짜 핵심 중의 핵심입니다. 겉모양만 적당히 따라 하다가 결국 본질을 놓치고 시간만 날리시는 분들을 너무 많이 봐서 안타까워요."

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

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'obj' ? '{}' : '[]';
    let t = raw.replace(/```json|```/gi, '').trim();
    try {
        const start = t.search(/[\{\[]/);
        const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
        if (start !== -1 && end !== -1 && end >= start) {
            let jsonStr = t.substring(start, end + 1);
            jsonStr = jsonStr.replace(/[\x00-\x1F]/g, char => char === '\n' ? '\\\n' : char === '\r' ? '\\\r' : char === '\t' ? '\\\t' : '');
            return jsonStr;
        }
    } catch(e) { }
    return defType === 'obj' ? '{"title":"' + t.replace(/["\\\n]/g, '') + '", "chapters":[]}' : '[]';
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
    const bpPrompt = `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\nTopic: "${target}"\\n\\nMISSION: Create JSON blueprint for: "${target}".\\nContext: ${searchData}\\n1. Return ONLY raw JSON object.\\n2. Format: {"title":"LONG_TAIL_SEO_TITLE", "chapters":["Part 1", ..., "Part 7"]}\\n3. Chapter count: EXACTLY 7.\\n4. Title rule: NO colon (A:B), use catchy sentence like "Expert Guide to..."\\n5. NO Markdown headers, NO [TOC], NO chatter.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const parsed = JSON.parse(clean(bpRes, 'obj'));
        title = parsed.title || target;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : Array.from({length:7}, (_,i) => `${target} Section ${i+1}`);
    } catch(e) { title = target; chapters = Array.from({length:7}, (_,i) => `${target} Deep Dive ${i+1}`); }
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
    let subRes = clean(await callAI(model, 'Topic: "' + mainSeed + '".\\nGenerate 4 sub-topics as a simple JSON array of strings: ["A", "B", "C", "D"]. ONLY JSON. NO Chat.'), 'arr');
    let subTopics = [];
    try {
        const parsed = JSON.parse(subRes);
        subTopics = Array.isArray(parsed) ? parsed : (parsed.topics || []);
        if(subTopics.length < 2) throw new Error();
    } catch(e) { subTopics = [mainSeed + ' 필수 기초', mainSeed + ' 실전 활용', mainSeed + ' 심화 가이드', mainSeed + ' 문제 해결']; }
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