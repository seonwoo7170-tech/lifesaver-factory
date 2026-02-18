const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
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
5. 마크다운 금지: 마크다운 문법(예: **, ##, -, [], \` 등)을 절대 사용하지 마십시오. 모든 텍스트는 순수 텍스트 또는 지침에 명시된 HTML 태그(<p>, <table>, <strong> 등)로만 작성하십시오.


`;
const NARRATIVE_HINTS = `[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
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
================================================================`;

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
            // Final safety: strip any lingering markdown code block markers inside the extracted string
            jsonStr = jsonStr.replace(/```json|```/gi, '').trim();
            return jsonStr;
        }
    } catch(e) { }
    if(defType === 'text') return t;
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
    const bpPrompt = `MISSION: Create a high-end, 7-part content strategy for: \"${target}\".

1. Return ONLY a valid JSON object.
2. Format: {\"title\":\"SEO_LONGTAIL_TITLE\", \"chapters\":[\"Topic 1\", ..., \"Topic 7\"]}
3. TITLE RULE: Catchy, 35-45 chars, psychological triggers.
4. CHAPTER STRATEGY (Force 7 distinct angles):
   - Ch 1: Technical Foundations (The 'Why' and 'Science')
   - Ch 2: Selection & Quality (Materials or Tools guide)
   - Ch 3: Advanced Execution (Expert step-by-step)
   - Ch 4: Risk Mitigation (Hidden pitfalls and Prevention)
   - Ch 5: Economic Optimization (Cost vs Performance)
   - Ch 6: Future Trends/Comparison (Modern context)
   - Ch 7: Ultimate FAQ & Implementation Checklist
5. RULE: NEVER repeat the main keyword in every chapter title. Use diverse phrasing.
6. NO MARKDOWN, NO CHATTER. ONLY JSON.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const c = clean(bpRes, 'obj');
        const parsed = JSON.parse(c);
        title = (parsed.title && parsed.title.length > 20 && parsed.title !== target) ? parsed.title : \`\${target} 해결? 전문가가 알려주는 상위 1% 고성능 세팅 비결 (2026 최신)\`;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : [];
        if(chapters.length < 7) throw new Error('Missing chapters');
    } catch(e) { 
        console.log('   ⚠️ [시스템] 블루프린트 설계 보정 중...');
        title = \`\${target} 완벽 해결법: 전문가의 상위 1% 시크릿 실전 노하우 (2026 최신)\`;
        chapters = [
            \`\\\${target}의 핵심 개념과 필수 이해\`,
            \`전문가가 알려주는 \\\${target} 실전 노하우\`,
            \`모르면 손해 보는 \\\${target} 핵심 꿀팁\`,
            \`\\\${target} 시공 및 적용 시 주의사항\`,
            \`실제 사례로 보는 \\\${target} 성공 가이드\`,
            \`\\\${target} 관련 자주 묻는 질문 해결\`,
            \`완벽한 \\\${target} 마무리를 위한 체크리스트\` 
        ];
    }
    console.log('   ㄴ [확정 제목] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title));
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`< li > <a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 2026 E-E-A-T 기반 고품격 서론 집필 중...');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nNARRATIVE TEMPLATES: ${NARRATIVE_HINTS}\n\nMISSION: Write a massive, engaging intro for: ${title}.\n\nRULES:\n1. START with one of the NARRATIVE TEMPLATES style.\n2. START the response with <p style=\"margin-bottom: 20px;\"> tag.\n3. NO MARKDOWN (**), NO HEADERS (#), NO TOC.\n4. ONLY BODY HTML/TEXT. No salutations.\n5. Context: ${searchData}`), 'text');
    body += intro; let summary = intro.slice(-500);
    
    console.log('   ㄴ [4단계] [TURBO MODE] 7개 챕터 동시 집필 및 이미지 생성 중...');
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    const chapterTasks = chapters.map(async (chapter, i) => {
        try {
            console.log(`      ㄴ [병렬 가동] ${i+1}/7 '${chapter}' 집필 시작...`);
            let mission = (i === 6) 
                ? `MISSION: Write an ULTIMATE FAQ & RESOLUTION for: "${title}".\n\nRULES:\n1. Create 15-20 specialized Q&A pairs (FAQ style) with deep answers.\n2. Add a 'Master Action Checklist' (10+ items).\n3. MASSIVE CONTENT (2,000+ chars).\n4. NO HEADERS (#), NO TOC.`
                : `MISSION: Write a massive, data-driven BODY for: \"${chapter}\" (Article: \"${title}\").\n\nRULES:\n1. QUANTITY: Write HUGE amounts of text (2,000+ characters minimum). \n2. TABLE: MUST include a 4-column x 4-row HTML Table with unique numerical data/evidence.\n3. ANALOGY: Use at least 2 metaphors from the Analogies library.\n4. NO STORY: No \"I/Me\" stories. No \"In conclusion\" or \"To sum up\".\n5. NO MARKDOWN: Never use ** or # or `. Use HTML <strong> if needed.\n6. START IMMEDIATELY with dense information. NO HEADERS (#).`;
            
            let sect = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\\n\\n${mission}\\n\\nRULES:\\n1. NO HEADERS (#, ##), NO TOC, NO JSON.\\n2. NO GREETINGS. Context: ${summary}.\\n3. MUST include exactly one [IMAGE_PROMPT: description] tag.`), 'text');
            const promptMatch = sect.match(/\[IMAGE_PROMPT:\s*(.*?)\]/);
            if(promptMatch) {
                const chapterImg = await genImg(promptMatch[1]);
                if(chapterImg) sect = sect.replace(promptMatch[0], `<img src="${chapterImg}" alt="${chapter}">`);
                else sect = sect.replace(promptMatch[0], '');
            }
            return { i, chapter, sect };
        } catch(e) {
            return { i, chapter, sect: `<p>본 챕터의 내용을 준비 중입니다. 잠시만 기다려 주세요.</p>` };
        }
    });

    const results = await Promise.all(chapterTasks);
    results.sort((a, b) => a.i - b.i).forEach(r => {
        body += `<h2 id="s${r.i+1}" style="background-color:${colors[r.i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🎯 ${r.chapter}</h2>${r.sect}`;
    });
    
    console.log('   ㄴ [5단계] FAQ 및 Schema 데이터 생성 중...');
    let footer = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nMISSION: Create 25-30 massive FAQ, Closing, Tags, and JSON-LD Schema for "${title}".\n\nRULES:\n1. NO MARKDOWN (**, #). Use HTML tags.\n2. NO JSON outside the <script type="application/ld+json"> block.`), 'text');
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
    let subRes = clean(await callAI(model, 'Topic: "' + mainSeed + '".\nGenerate 4 sub-topics as a simple JSON array of strings: ["A", "B", "C", "D"]. ONLY JSON. NO Chat.'), 'arr');
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
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_REPOSITORY_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.3.85', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_REPOSITORY_TOKEN } });
}
run();