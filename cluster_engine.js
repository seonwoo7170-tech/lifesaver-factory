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
1. 강제 목표량: 각 호출당 최소 1,500~2,000자 이상(한국어 기준)의 방대한 분량.
2. 역할 분리(매우 중요): 당신은 전체 블로그 글을 한 번에 다 쓰는 것이 아닙니다. 오직 주어지는 'MISSION'에 해당하는 단 하나의 구역(본문 챕터 1개 또는 인트로 1개)만 텍스트로 작성해야 합니다. 무단으로 인트로, 목차 전체, 결론, FAQ를 한 번에 쏟아내지 마십시오.
3. 섹션당 필수 요소:
   - 본문은 오직 <p style="margin-bottom: 20px;"> 태그 4~6문단 이상으로 구성(한 문단당 2~3문장 제한).
   - [본문 챕터 작성 시] 고유한 데이터를 포함한 4열 4행 표 HTML 1개.
   - [본문 챕터 작성 시] 사실적 사진 묘사를 담은 [IMAGE_PROMPT: 묘사] 문구 1개.
4. 제목 생성 금지: 마크다운(##, **) 및 HTML 제목 태그(<h1>, <h2>, <h3> 등)를 절대 자체적으로 생성하지 마십시오. 엔진이 제목을 알아서 붙입니다. 내용 텍스트만 꽉 채우십시오.


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
- 절대로 <h1>, <h2>, <h3> 등의 제목 태그를 만들지 마십시오.
- 단락 구분은 반드시 <p style="margin-bottom: 20px;"> 태그를 사용해야 합니다.
- JSON-LD Article/FAQ Schema는 제일 마지막 'FAQ 생성 미션'에서만 추가하십시오.
================================================================`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 15px; margin: 25px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: block; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; }
  .link-box { background-color: #212529; color: white; padding: 30px; text-align: center; border-radius: 15px; margin: 40px 0; border: 1px solid #444; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 15px; text-align: center; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
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
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST. STRICTLY FOLLOW GOOGLE E-E-A-T: EXPERIENCE, EXPERTISE, AUTHORITATIVENESS, TRUSTWORTHINESS. NO CHAT.]\n' + prompt);
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
    console.log(`\n[진행 ${idx}/${total}] 연재 대상: '${target}'`);
    console.log('   ㄴ [1단계] 실시간 트렌드 분석 및 E-E-A-T 블루프린트 설계 중...');
    const searchData = await searchSerper(target);
    const bpPrompt = `MISSION: Create a high-end, 7-part content strategy for: "${target}".

1. Return ONLY a valid JSON object.
2. Format: {"title":"SEO_LONGTAIL_TITLE", "chapters":["Topic 1", ..., "Topic 7"]}
3. TITLE RULE: The title MUST be a "Google SEO Long-tail Keyword" phrase. Think of high-intent search queries (e.g., "How to solve [Problem] with ${target}", "${target} vs Alternatives for [Audience]" or "Hidden side effects of ${target}"). DO NOT use generic clickbait like "완벽 가이드" or "비밀 노하우". Make it highly searchable, specific, and informative.
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
        title = (parsed.title && parsed.title.length > 20 && parsed.title !== target) ? parsed.title : `현직 전문가가 알려주는 ${target} 실패 피하는 3가지 현실적인 방법`;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : [];
        if(chapters.length < 7) throw new Error('Missing chapters');
    } catch(e) { 
        console.log('   ⚠️ [시스템] 블루프린트 설계 보정 중...');
        const titleTemplates = [
            `${target} 장단점 및 비용 완벽 분석 (2026년 기준 현실적인 선택법)`,
            `현직 전문가가 알려주는 ${target} 실패 피하는 3가지 현실적인 방법`,
            `${target}과 다른 대안 비교: 나에게 맞는 최적의 솔루션 찾기`,
            `${target} 도입 전 반드시 알아야 할 현실적인 부작용과 해결책`,
            `비용 대비 효과 극대화: ${target} 제대로 활용하는 실전 루틴`
        ];
        title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
        chapters = [
            `${target}의 필수 개념과 숨겨진 원리 완벽 정리`,
            `현실적인 ${target} 성능 세팅과 제품 선택 기준`,
            `초보자도 따라하는 ${target} 전문가급 실전 노하우`,
            `절대 실패하지 않는 ${target} 치명적 주의사항 3가지`,
            `시간과 돈을 아껴주는 ${target} 비용 최적화 전략`,
            `${target}의 미래 전망 및 경쟁 모델 철저 비교`,
            `완벽한 ${target} 마무리를 위한 마스터 체크리스트` 
        ];
    }

    console.log('   ㄴ [확정 제목] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title));
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 2026 E-E-A-T 기반 고품격 서론 집필 중...');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nNARRATIVE TEMPLATES: ${NARRATIVE_HINTS}\n\nMISSION: Write a massive, engaging intro for: ${title}.\n\nRULES:\n1. START with one of the NARRATIVE TEMPLATES style.\n2. START the response with <p style="margin-bottom: 20px;"> tag.\n3. NO MARKDOWN (**), NO HEADERS (#), NO TOC.\n4. ONLY BODY HTML/TEXT. No salutations.\n5. Context: ${searchData}`), 'text');

    body += intro; let summary = intro.slice(-500);
    
    console.log('   ㄴ [4단계] [TURBO MODE] 7개 챕터 동시 집필 및 이미지 생성 중...');
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    const chapterTasks = chapters.map(async (chapter, i) => {
        try {
            console.log(`      ㄴ [병렬 가동] ${i+1}/7 '${chapter}' 집필 시작...`);
            let mission = (i === 6) 
                ? `MISSION: Write an ULTIMATE FAQ & RESOLUTION for: "${title}".\n\nRULES:\n1. Create 10-15 specialized Q&A pairs (FAQ style) with deep answers ABOUT "${target}".\n2. FAQ HEADERS: Wrap EVERY Question in a beautiful HTML <h2> tag (e.g., <h2 style="font-size:20px; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:8px; margin-top:35px; margin-bottom:15px;">Q. [Question]</h2>). DO NOT use markdown (#).\n3. MULTIPLE PARAGRAPHS: Each Answer must be separated properly using <p style="margin-bottom: 20px;"> tags.\n4. CHECKLIST SECTION: After the FAQ, create the 'Master Action Checklist' (10+ items). It MUST start with this EXACT HTML header: <h2 style="background-color:#e8f5e9; border-radius:8px; color:#2e7d32; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #4CAF50;">✅ 실전 마스터 액션 체크리스트</h2>\n5. MASSIVE CONTENT (2,000+ chars).`
                : `MISSION: Write a massive, data-driven BODY for: "${chapter}" (Main Article: "${title}", Core Topic: "${target}").\n\nRULES:\n1. QUANTITY: Write HUGE amounts of text (2,000+ characters minimum). \n2. TABLE: MUST include a 4-column x 4-row HTML Table with unique numerical data/evidence.\n3. ANALOGY: Use at least 2 metaphors from the Analogies library.\n4. NO STORY: No "I/Me" stories. No "In conclusion" or "To sum up".\n5. FOCUS: The content MUST be strictly about "${chapter}" in the context of "${target}". Do not drift to general topics.\n6. STRICTLY FORBIDDEN: NEVER use ** or * or # or \` or HTML <h1>, <h2>, <h3> tags. Use HTML <strong> if needed.\n7. START IMMEDIATELY with dense information. NO HEADERS (#).`;
            
            let sect = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\n${mission}\n\nRULES:\n1. NO TOC, NO JSON.\n2. NO GREETINGS. Context: ${intro.slice(0, 500)}.\n3. MUST include exactly one [IMAGE_PROMPT: description] tag.`), 'text');
            if (i !== 6) sect = sect.replace(/^#{1,6}\s+.*$/gm, '').replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '');
            else sect = sect.replace(/^#{1,6}\s+.*$/gm, '');

            const promptMatch = sect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(promptMatch) {
                const chapterImg = await genImg(promptMatch[1].trim());
                if(chapterImg) sect = sect.replace(promptMatch[0], `<img src="${chapterImg}" alt="${chapter}" style="width:100%; border-radius:12px; margin: 25px 0;">`);
                else sect = sect.replace(promptMatch[0], '');
            }
            sect = sect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
            return { i, chapter, sect };
        } catch(e) {
            return { i, chapter, sect: `<p>본 챕터의 내용을 준비 중입니다. 잠시만 기다려 주세요.</p>` };
        }
    });

    const results = await Promise.all(chapterTasks);
    results.sort((a, b) => a.i - b.i).forEach(r => {
        body += `<h2 id="s${r.i+1}" style="background-color:${colors[r.i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🎯 ${r.chapter}</h2>${r.sect}`;
    });
    
    console.log('   ㄴ [5단계] Closing, Tags, Schema 데이터 생성 중...');
    let footer = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nMISSION: Create a powerful Closing, 10+ comma-separated Tags, and a JSON-LD FAQ Schema (with 15+ generated Q&A pairs for SEO) for "${title}".\n\nRULES:\n1. DO NOT write an HTML FAQ section (it is already written).\n2. NO MARKDOWN (**, #). Use HTML tags for Closing.\n3. NO JSON outside the <script type="application/ld+json"> block.\n4. START IMMEDIATELY with the Closing <p> tag. NO CHATTER (e.g., 'OK. 시작합니다').\n5. NO IMAGE_PROMPT. Do NOT generate any images here.\n6. OUTPUT EXACTLY: Closing HTML, Tags HTML, and the JSON-LD script limit.`), 'text');
    footer = footer.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    
    // 마무리 섹션에도 통일성 있는 명품 h2 배지를 강제로 주입합니다.
    const closingH2 = `<h2 style="background-color:#ffe0b2; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🚀 핵심 요약 및 최종 마무리</h2>`;
    const disclaimerHtml = `<div style="background-color:#fff3cd; padding:20px; border-radius:10px; font-size:14px; color:#856404; margin-top:40px; border:1px solid #ffeeba; line-height:1.6;"><p style="margin:0;"><b>⚠️ [면책 조항]</b> 본 포스팅은 단순 정보 제공을 목적으로 작성되었으며, 개인의 상황에 따라 결과가 다를 수 있습니다. 본 블로그는 포스팅 내용의 정확성이나 신뢰성에 대해 보증하지 않으며, 이로 인해 발생하는 어떠한 직간접적인 손해에 대해서도 법적 책임을 지지 않습니다. 중요한 의사 결정 시에는 반드시 전문가의 상담을 받으시거나 신중하게 판단하시기 바랍니다.</p></div>`;
    body += closingH2 + footer + disclaimerHtml + '</div>';
    
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
    } catch(e) { 
        const fallbacks = [
            [mainSeed + ' 완벽 입문 가이드', mainSeed + ' 성능 최적화 세팅', mainSeed + ' 치명적인 주의사항', mainSeed + ' 최신 시장 동향 분석'],
            [mainSeed + ' 기초 지식과 원리', mainSeed + ' 고급 테크닉 및 꿀팁', mainSeed + ' 주요 부작용과 예방법', mainSeed + ' 대체 가능한 솔루션 비교'],
            [mainSeed + ' 제대로 알고 시작하기', mainSeed + ' 상위 1%의 실전 활용법', mainSeed + ' 비용 절감을 위한 핵심 팁', mainSeed + ' 2026년 이후의 미래 전망']
        ];
        subTopics = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    let subLinks = []; let cTime = new Date();
    for(let i=0; i < subTopics.length; i++) {
        cTime.setMinutes(cTime.getMinutes()+180);
        subLinks.push(await writeAndPost(model, subTopics[i], config.blog_lang, blogger, config.blog_id, new Date(cTime), [], i+1, 5));
    }
    cTime.setMinutes(cTime.getMinutes()+180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime), subLinks, 5, 5);
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.4.04', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();