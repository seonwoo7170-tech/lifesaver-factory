const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
[VUE POST v2.5 The Origin Master - Premium Content Strategy]
당신은 Studio VUE의 블로그 마케팅 전문가로서, 구글의 E-E-A-T 원칙과 애드센스 수익 극대화 전략을 결합한 '인간보다 더 인간다운' 프리미엄 콘텐츠를 생성합니다.

[중요] 단계별 "멈춤"이나 "질문" 지침은 무시하고, 한 번의 호출에 해당 섹션을 즉시 끝까지 집발하십시오.

`;
const NARRATIVE_HINTS = `[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
================================================================
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
async function genImg(desc, model) {
    if(!desc) return '';
    console.log('   ㄴ [고속 엔진] Pollinations(Flux) 전용 비주얼 생성 모드 가동 중...');

    let engPrompt = desc;
    if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(desc)) {
        try {
            const trans = await callAI(model, 'Translate this visual description to a concise but detailed English for AI image generation. (STRICT: Return ONLY the English text, and stay under 400 characters): ' + desc, 0);
            engPrompt = trans.replace(/[^a-zA-Z0-9, ]/g, '').trim();
        } catch(e) { engPrompt = desc.replace(/[^a-zA-Z, ]/g, ''); }
    }
    engPrompt = engPrompt.slice(0, 800);

    const pParams = `model=flux&width=1024&height=768&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true`;
    const pUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(engPrompt + ', high quality, realistic, cinematic') + '?' + pParams;
    
    const imgbbKey = process.env.IMGBB_API_KEY;
    if(imgbbKey && imgbbKey.length > 5) {
        // [안정화 로직] 최대 3회 재시도를 통해 HTML 반환 에러를 방어합니다.
        for(let attempt=1; attempt<=3; attempt++) {
            try {
                if(attempt > 1) console.log(`   ㄴ [안정화] 이미지 렌더링 대기 후 재시도 중... (${attempt}/3)`);
                await new Promise(res => setTimeout(res, 2000 * attempt)); 
                
                const proxyList = [
                    pUrl, 
                    `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(pUrl)}`, 
                    `https://api.allorigins.win/raw?url=${encodeURIComponent(pUrl)}` 
                ];
                
                let pRes = null;
                for(let i=0; i<proxyList.length; i++) {
                    try {
                        const tempRes = await axios.get(proxyList[i], { 
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                            timeout: 30000, 
                            responseType: 'arraybuffer',
                            validateStatus: s => s === 200
                        });
                        const cType = String(tempRes.headers['content-type']).toLowerCase();
                        if(tempRes.data && cType.includes('image') && tempRes.data.length > 15000) {
                            pRes = tempRes;
                            break;
                        }
                    } catch(e) { }
                }

                if(pRes && pRes.data) {
                    const form = new FormData();
                    form.append('image', pRes.data, { filename: 'image.jpg', contentType: 'image/jpeg' });
                    const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { 
                        headers: form.getHeaders(), 
                        timeout: 60000 
                    });
                    if(ir.data && ir.data.data && ir.data.data.url) {
                        console.log('   ㄴ [ImgBB] 영구 보관용 변환 성공! ✅');
                        return ir.data.data.url;
                    }
                }
            } catch(e) { 
                if(attempt === 3) console.log(`   ㄴ [주의] 서버 지연으로 인해 다이렉트 링크로 긴급 전환합니다.`);
            }
        }
    }
    
    console.log('   ㄴ [Pollinations] 고속 다이렉트 이미지 링크 획득 성공! ⚡');
    return pUrl;
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\n[진행 ${idx}/${total}] 연재 대상: '${target}'`);
    console.log('   ㄴ [1단계] 실시간 트렌드 분석 및 E-E-A-T 블루프린트 설계 중...');
    const searchData = await searchSerper(target);
    const bpPrompt = `MISSION: Create a high-end, 7-part content strategy for: "${target}".\n\n1. Return ONLY a valid JSON object.\n2. Format: {"title":"SEO_LONGTAIL_TITLE", "chapters":["Topic 1", ..., "Topic 7"]}\n3. TITLE RULE: The title MUST be a "Google SEO Long-tail Keyword" phrase. Think of high-intent search queries (e.g., "How to solve [Problem] with ${target}", "${target} vs Alternatives for [Audience]" or "Hidden side effects of ${target}"). DO NOT use generic clickbait like "완벽 가이드" or "비밀 노하우". Make it highly searchable, specific, and informative.\n4. CHAPTER STRATEGY (Vary the angles!):\n   - DO NOT use the same generic predictable structure for every post. \n   - Analyze the deep search intent of "${target}". Is it a problem/solution? A product review? A tutorial? A comparison? Create 7 highly specific, dynamic chapters that perfectly match the intent.\n   - Ensure absolutely NO generic titles like "Introduction to..." or "Conclusion on...". Use captivating and informational headlines.\n   - Only Chapter 7 MUST be strictly reserved as an Ultimate FAQ/Checklist.\n5. RULE: NEVER repeat the main keyword in every chapter title. Use diverse phrasing.\n6. NO MARKDOWN, NO CHATTER. ONLY JSON.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const c = clean(bpRes, 'obj');
        const parsed = JSON.parse(c);
        title = (parsed.title && parsed.title.length > 20 && parsed.title !== target) ? parsed.title : `현직 전문가가 알려주는 ${target} 실패 피하는 3가지 현실적인 방법`;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : [];
        if(chapters.length < 7) throw new Error('Missing chapters');
    } catch(e) { 
        console.log('   ⚠️ [SYSTEM] 블루프린트 설계 보정 중...');
        const titleTemplates = [
            `${target} 장단점 및 비용 완벽 분석 (2026년 기준 현실적인 선택법)`,
            `현직 전문가가 알려주는 ${target} 실패 피하는 3가지 현실적인 방법`,
            `${target}과 다른 대안 비교: 나에게 맞는 최적의 솔루션 찾기`,
            `${target} 도입 전 반드시 알아야 할 현실적인 부작용과 해결책`,
            `비용 대비 효과 극대화: ${target} 제대로 활용하는 실전 루틴`
        ];
        title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
        const fallbackChapters = [
            [
                `왜 똑같은 방법을 써도 결과가 다를까? 핵심 원인 분석`,
                `실패를 피하는 최적화 세팅 첫걸음`,
                `비용과 시간을 반으로 줄여주는 실전 루틴`,
                `효율을 극대화하는 보조 도구 활용법`,
                `현직자들이 절대 말해주지 않는 치명적 단점`,
                `단기 성과가 아닌 장기적 관점에서의 유지보수 전략`,
                `자주 묻는 핵심 질문과 마스터 실천 리스트`
            ],
            [
                `초보자가 가장 많이 오해하는 기본 상식의 오류`,
                `상황별로 딱 맞춰 고르는 맞춤형 솔루션 가이드`,
                `직접 부딪혀보면서 찾아낸 가장 안전한 접근법`,
                `생각보다 흔히 겪는 최악의 부작용 사례들`,
                `예산을 낭비하지 않기 위해 버려야 할 우선순위`,
                `경쟁 모델들과의 비교 분석을 통한 팩트 체크`,
                `도입 전 반드시 점검해야 할 최종 에러 체크리스트`
            ],
            [
                `본격적으로 시작하기 전에 짚고 넘어가야 할 3가지 팩트`,
                `남들보다 2배 더 빠르게 숙련도를 올리는 방법`,
                `투자 대비 만족도를 높이는 숨겨진 옵션들`,
                `이미 문제가 생겼을 때 바로 적용 가능한 응급 처치`,
                `업계 트렌드가 변화하면서 생겨난 새로운 대안들`,
                `앞으로 5년 뒤에도 통할 불변의 최적화 규칙`,
                `성공적인 마무리를 위한 FAQ 및 필수 점검 사항`
            ]
        ];
        chapters = fallbackChapters[Math.floor(Math.random() * fallbackChapters.length)];
    }

    console.log('   ㄴ [확정 제목] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title), model);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li style="margin-bottom: 8px;"><a href="#s${i+1}" style="text-decoration: none; color: #333; font-weight: 500;">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 2026 E-E-A-T 기반 고품격 서론 집필 중...');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nNARRATIVE TEMPLATES: ${NARRATIVE_HINTS}\n\nMISSION: Write a massive, engaging intro for: ${title}.\n\nRULES:\n1. START with one of the NARRATIVE TEMPLATES style.\n2. START the response with <p style="margin-bottom: 20px;"> tag.\n3. NO MARKDOWN (**), NO HEADERS (#), NO TOC.\n4. ONLY BODY HTML/TEXT. No salutations.\n5. Context: ${searchData}`), 'text');

    body += intro; let summary = intro.slice(-500);
    
    console.log('   ㄴ [4단계] [STEALTH MODE] 7개 챕터 순차적 집필 및 이미지 생성 중...');
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    const vLogicPatterns = [
        `V-LOGIC PATTERN A (문제/해결형): Start by deeply analyzing the reader's pain point, empathize with it violently, and then introduce the perfect step-by-step solution as a beacon of hope.`,
        `V-LOGIC PATTERN B (경험/스토리형): Begin with a personal anecdote 'I used to fail miserably at this until I realized...' Then breakdown the exact transition and the secret that changed everything.`,
        `V-LOGIC PATTERN C (솔루션/해결형): Start by validating a deep pain point, explain why traditional ways fail, and propose a new elegant solution using step-by-step rigorous reasoning.`,
        `V-LOGIC PATTERN D (대조/비교분석형): Frame the narrative as a battle between Old Way vs New Way, or Assumption vs Reality. Highlight the sheer difference in outcomes using stark contrast.`,
        `V-LOGIC PATTERN E (미래 예측/트렌드형): Zoom out and talk about the shifting paradigm. Warn the reader about what's coming in the industry and why they must adapt their mindset immediately.`,
        `V-LOGIC PATTERN F (전문가 인터뷰형): Write as if you are answering tough questions from an interviewer, using a highly authoritative tone, dropping industry jargon naturally and explaining it.`
    ].sort(() => Math.random() - 0.5);
    const results = [];
    for(let i=0; i<chapters.length; i++) {
        const chapter = chapters[i];
        try {
            console.log(`      ㄴ [순차 집필] ${i+1}/7 '${chapter}' 작성 중...`);
            let mission = (i === 6) 
                ? `MISSION: Write an ULTIMATE FAQ & RESOLUTION for: "${title}".\n\nRULES:\n1. Create 10-15 specialized Q&A pairs (FAQ style) with deep answers ABOUT "${target}".\n2. FAQ HEADERS: Wrap EVERY Question in a beautiful HTML <h2> tag (e.g., <h2 style="font-size:20px; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:8px; margin-top:35px; margin-bottom:15px;">Q. [Question]</h2>). DO NOT use markdown (#).\n3. MULTIPLE PARAGRAPHS: Each Answer must be separated properly using <p style="margin-bottom: 20px;"> tags.\n4. CHECKLIST SECTION: After the FAQ, create the 'Master Action Checklist' (10+ items). It MUST start with this EXACT HTML header: <h2 style="background-color:#e8f5f9; border-radius:8px; color:#2e7d32; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #4CAF50;">✅ 실전 마스터 액션 체크리스트</h2>. Put the checklist items inside an HTML <ul> tag, and wrap EVERY single item in a <li style="margin-bottom:15px; font-size:16px; line-height:1.6;"> tag for proper line breaks. NEVER use raw text lists or markdown.\n5. MASSIVE CONTENT (2,000+ chars).`
                : `MISSION: Write a massive, engaging BODY for: "${chapter}" (Main Article: "${title}", Core Topic: "${target}").\n\nCRITICAL NARRATIVE STYLE:\nYou MUST write this chapter using a highly relatable, conversational, and personal tone (Korean '~해요', '~어요', '~답니다' style). Write as if you are a friendly expert sharing your own real-life experience and secret tips with a close friend on a personal blog.\n★ VERY IMPORTANT STRUCTURE: Even though the tone is casual, the underlying flow MUST structurally explain [1. 내 예전의 착각/문제 경험 -> 2. 직접 부딪히며 깨달은 진짜 원인/분석 -> 3. 이렇게 해결했더니 너무 좋았다는 결과/방법론] to make it highly easy to understand.\n\nRULES:\n1. QUANTITY: Write HUGE amounts of text (2,000+ characters minimum). \n2. TONE & EMPATHY: Very friendly and empathetic. Use phrases like '솔직히 처음엔 저도 몰랐는데...', '제가 직접 해본 결과...', '실제로 저는...'. Make the reader perfectly understand the 'before and after' through your personal story.\n3. TABLE: MUST include a 4-column x 4-row HTML Table with unique numerical data/evidence.\n4. FORMATTING: Wrap paragraphs properly in <p style="margin-bottom: 25px; font-size: 16px;"> tags. Ensure left alignment. DO NOT use text-align justify.\n5. STRICTLY FORBIDDEN: NEVER use ** or * or # or \` or HTML <h1>, <h2>, <h3> tags. Use HTML <strong style="color:#e53935;"> if needed.\n6. START IMMEDIATELY with dense but conversational information. NO HEADERS (#).\n7. MEGA RULE: Make the text flow naturally like a well-written personal essay or a high-quality lifestyle blog post.`;
            let sect = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\n${mission}\n\nRULES:\n1. NO TOC, NO JSON.\n2. NO GREETINGS. DO NOT rewrite or reference the intro. Go straight to the professional sub-topic content.\n3. MUST include exactly one [IMAGE_PROMPT: description] tag.`), 'text');
            
            if (i !== 6) sect = sect.replace(/^#{1,6}\s+.*$/gm, '').replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '');
            else sect = sect.replace(/^#{1,6}\s+.*$/gm, '');

            sect = sect.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            const promptMatch = sect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(promptMatch) {
                const chapterImg = await genImg(promptMatch[1].trim(), model);
                if(chapterImg) sect = sect.replace(promptMatch[0], `<img src="${chapterImg}" alt="${chapter}" style="width:100%; border-radius:12px; margin: 25px 0;">`);
                else sect = sect.replace(promptMatch[0], '');
            }
            sect = sect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
            results.push({ i, chapter, sect });
        } catch(e) {
            results.push({ i, chapter, sect: `<p>본 챕터의 내용을 준비 중입니다. 잠시만 기다려 주세요.</p>` });
        }
    }

    results.forEach(r => {
        body += `<h2 id="s${r.i+1}" style="background-color:${colors[r.i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">🎯 ${r.chapter}</h2>${r.sect}`;
        if (extraLinks && extraLinks[r.i]) {
            body += `<div class="link-box">` +
                    `<h3 style="color:#00e5ff; margin-top:0; margin-bottom:15px; font-size:18px;">💡 관련 심층 가이드</h3>` +
                    `<p style="margin-bottom: 20px; font-size:15px; color:#ddd;"><strong>${extraLinks[r.i].title}</strong>에 대한 구체적인 솔루션과 팁을 별도로 정리해 두었습니다. 자세한 내용이 궁금하시다면 아래 링크를 참고해 주세요.</p>` +
                    `<a href="${extraLinks[r.i].url}" target="_blank" style="display:inline-block; padding:12px 30px; background-color:#00e5ff; color:#000; text-decoration:none; font-weight:bold; border-radius:8px; font-size:16px;">👉 심층 가이드 보러가기</a>` + 
                    `</div>`;
        }
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
    const pool = config.clusters || [];
    if(!pool.length) {
        console.log('   ❌ [종료] 처리할 키워드가 없습니다.');
        return;
    }
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('   💎 [오늘의 메인 씨드] "' + mainSeed + '" (남은 키워드: ' + pool.length + '개)');
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
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.6.2', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();