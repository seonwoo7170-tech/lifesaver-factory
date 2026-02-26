const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
# [VUE POST v3.0 통합 멀티플랫폼 블로그 에이전트]

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
🔗 클러스터 키워드: A, B, C
📎 퍼머링크: 영어슬러그
🏷 라벨: 연관키워드10개
📝 검색 설명: 150자
🖼 이미지 프롬프트: 1~4번
분량: 4,000~5,500자 유동 (YMYL: 5,000~6,500자). 억지 패딩 금지.

[PART C & D — 의도 및 문체, 절대 금지 표현]
구어체 ('~거든요', '~잖아요'). 리듬 불규칙적(3~18어절). 
금지: 요청하신, 작성해 드렸습니다, 알아볼까요, 총정리, 완벽가이드, id=section1넘버링, 첫째/둘째 3연속, 똑같은 종결어미 3연속.

[PART F — 프레임워크 (정보형/비교형/후기형/거래형)]
h1 (경험+결과) -> 목차 -> 스니펫 -> 후킹 -> 본문(h2 6~7개, 테이블1, 이미지4, 박스3~4) -> FAQ 5개 -> 면책조항 -> 슬롯 -> 결론/CTA -> Schema

[PART G — 박스 4종과 단락]
(A)경험담(그린), (B)꿀팁(옐로우), (C)주의(레드), (D)데이터(인디고). 박스 없는 순수 텍스트단락 2개 이상 필수.

[PART H — HTML 및 디자인]
<style>, <script>(Schema제외) 금지. 인라인 style 적용. 
비교테이블 1개 (border-collapse:collapse). 테이블 내 border-radius, box-shadow 통일 금지.
이미지 플레이스홀더 4개 (alt와 title 무조건 다르게 묘사, 똑같은 복붙 금지).
h2 배경 7종 순차 (moccasin -> lightpink -> palegreen -> skyblue -> plum -> lightsalmon -> #98d8c8).

[PART I — Schema JSON-LD]
맨 마지막 script 태그 내 Article + FAQ 혼합 (@graph).

[PART J — E-E-A-T 검증]
경험(왜, 과정, 결과) 서사 필수. 단점/실패 서사 속에 2번 노출.

`;
const NARRATIVE_HINTS = ``;

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
            console.log(`   ?좑툘 [Rate Limit] 429 媛먯?. ${waitTime/1000}珥????ъ떆???⑸땲??.. (${retry+1}/5)`);
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
    const kieKey = process.env.KIE_API_KEY;
    const runwareKey = process.env.RUNWARE_API_KEY;
    const imgbbKey = process.env.IMGBB_API_KEY;
    
    let engPrompt = desc;
    if(/[????????媛-??/.test(desc)) {
        try {
            console.log('   ??[?대?吏] ?쒓? ?꾨＼?꾪듃 媛먯? -> ?곸뼱 踰덉뿭 以?..');
            const trans = await callAI(model, 'Translate this visual description to a concise but detailed English for AI image generation. (STRICT: Return ONLY the English text, and stay under 400 characters): ' + desc, 0);
            engPrompt = trans.replace(/[^a-zA-Z0-9, ]/g, '').trim();
        } catch(e) { engPrompt = desc.replace(/[^a-zA-Z, ]/g, ''); }
    }
    
    engPrompt = engPrompt.slice(0, 800); // Failsafe for API limits
    
    console.log('   ??[?대?吏] ?꾨왂??鍮꾩＜???앹꽦 以?(' + engPrompt.slice(0, 30) + '...)');
    let imageUrl = '';

    // 1. Runware (Ultra Fast & Quality)
    if(!imageUrl && runwareKey && runwareKey.length > 5) {
        try {
            const rr = await axios.post('https://api.runware.ai/v1', [
                { action: 'generateImage', model: 'runware:100@1', positivePrompt: engPrompt + ', detailed, 8k, professional photography', width: 1280, height: 720, number: 1 }
            ], { headers: { Authorization: 'Bearer ' + runwareKey } });
            if(rr.data.data?.[0]?.imageURL) imageUrl = rr.data.data[0].imageURL;
        } catch(e) { console.log('   ??[Runware] 吏??.. ?ㅼ쓬 ?붿쭊 ?쒕룄'); }
    }

    // 2. Kie.ai (Premium Fallback)
    if(!imageUrl && kieKey && kieKey.length > 5) {
        try {
            console.log('   ??[Kie.ai] z-image ?몄텧 (鍮꾩쑉: 16:9)...');
            const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { 
                model: 'z-image', 
                input: { prompt: engPrompt + ', high-end, editorial photography, 8k', aspect_ratio: '16:9' } 
            }, { headers: { Authorization: 'Bearer ' + kieKey } });
            
            // 寃쎈줈 ?좎뿰?섍쾶 泥섎━ (data.taskId ?먮뒗 data.data.taskId)
            const tid = cr.data.taskId || cr.data.data?.taskId;
            if(tid) {
                for(let a=0; a<15; a++) { 
                    await new Promise(r => setTimeout(r, 6000));
                    const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
                    const state = pr.data.state || pr.data.data?.state;
                    if(state === 'success') { 
                        const resData = pr.data.resultJson || pr.data.data?.resultJson;
                        const resJson = typeof resData === 'string' ? JSON.parse(resData) : resData;
                        imageUrl = resJson.resultUrls[0]; break; 
                    }
                    if(state === 'fail' || state === 'failed') break;
                }
            } else { console.log('   ??[Kie.ai] ?쒖뒪??ID ?꾨씫. ?묐떟: ' + JSON.stringify(cr.data).slice(0, 100)); }
        } catch(e) { 
            console.log('   ??[Kie.ai] ?ㅽ뙣: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); 
        }
    }

    // 3. Pollinations.ai (Infinite Stability AI)
    if(!imageUrl) {
        try {
            console.log('   ??[AI] Pollinations ?붿쭊 媛??(FLUX)...');
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
        } catch(e) { }
    }

    // 4. Stock Image Fallback (Absolute Safety Net)
    if(!imageUrl) {
        try {
            console.log('   ??[?ㅽ넚] 怨좏뭹吏??꾨━誘몄뾼 ?ㅽ넚 ?대?吏 留ㅼ묶...');
            const keywords = engPrompt.split(' ').slice(0, 3).join(',');
            imageUrl = `https://loremflickr.com/1280/720/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random()*1000)}`;
        } catch(e) { 
            imageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280&auto=format&fit=crop'; // ?곗＜ 諛곌꼍 湲곕낯媛?
        }
    }

    // 5. ImgBB Upload (Crucial: Use Base64 for reliability)
    try {
        if(imgbbKey && imgbbKey.length > 5 && imageUrl) {
            let res;
            // ?덇린 紐⑤뱶: 理쒕? 3???ъ떆??(Slow AI ???
            for(let retry=1; retry<=3; retry++) {
                try {
                    res = await axios.get(imageUrl, { 
                        responseType: 'arraybuffer', 
                        timeout: 60000, 
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                    });
                    if(res.data) break;
                } catch(e) {
                    if(retry === 3) throw e;
                    console.log(`   ??[ImgBB] 由ъ냼???띾뱷 以?.. (${retry}/3)`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            const b64 = Buffer.from(res.data).toString('base64');
            const form = new FormData(); form.append('image', b64);
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            console.log('   ??[ImgBB] ?쒕쾭 ?꾩슜/?곴뎄 蹂닿? 泥섎━ ?꾨즺! ??);
            return ir.data.data.url;
        }
        return imageUrl;
    } catch(e) { 
        console.log('   ??[ImgBB] ?곴뎄 ????ㅽ뙣 (?꾩떆 URL ?ъ슜): ' + e.message);
        return imageUrl; 
    }
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\n[吏꾪뻾 ${idx}/${total}] ?곗옱 ??? '${target}'`);
    console.log('   ??[1?④퀎] ?ㅼ떆媛??몃젋??遺꾩꽍 諛?E-E-A-T 釉붾（?꾨┛???ㅺ퀎 以?..');
    const searchData = await searchSerper(target);
    const bpPrompt = `MISSION: Create a high-end, 7-part content strategy for: "${target}".\n\n1. Return ONLY a valid JSON object.\n2. Format: {"title":"SEO_LONGTAIL_TITLE", "chapters":["Topic 1", ..., "Topic 7"]}\n3. TITLE RULE: The title MUST be a "Google SEO Long-tail Keyword" phrase. Think of high-intent search queries (e.g., "How to solve [Problem] with ${target}", "${target} vs Alternatives for [Audience]" or "Hidden side effects of ${target}"). DO NOT use generic clickbait like "?꾨꼍 媛€?대뱶" or "鍮꾨? ?명븯??". Make it highly searchable, specific, and informative.\n4. CHAPTER STRATEGY (Vary the angles!):\n   - DO NOT use the same generic predictable structure for every post. \n   - Analyze the deep search intent of "${target}". Is it a problem/solution? A product review? A tutorial? A comparison? Create 7 highly specific, dynamic chapters that perfectly match the intent.\n   - Ensure absolutely NO generic titles like "Introduction to..." or "Conclusion on...". Use captivating and informational headlines.\n   - Only Chapter 7 MUST be strictly reserved as an Ultimate FAQ/Checklist.\n5. RULE: NEVER repeat the main keyword in every chapter title. Use diverse phrasing.\n6. NO MARKDOWN, NO CHATTER. ONLY JSON.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const c = clean(bpRes, 'obj');
        const parsed = JSON.parse(c);
        title = (parsed.title && parsed.title.length > 20 && parsed.title !== target) ? parsed.title : `?꾩쭅 ?꾨Ц媛媛 ?뚮젮二쇰뒗 ${target} ?ㅽ뙣 ?쇳븯??3媛吏 ?꾩떎?곸씤 諛⑸쾿`;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : [];
        if(chapters.length < 7) throw new Error('Missing chapters');
    } catch(e) { 
        console.log('   ?좑툘 [?쒖뒪?? 釉붾（?꾨┛???ㅺ퀎 蹂댁젙 以?..');
        const titleTemplates = [
            `${target} ?λ떒??諛?鍮꾩슜 ?꾨꼍 遺꾩꽍 (2026??湲곗? ?꾩떎?곸씤 ?좏깮踰?`,
            `?꾩쭅 ?꾨Ц媛媛 ?뚮젮二쇰뒗 ${target} ?ㅽ뙣 ?쇳븯??3媛吏 ?꾩떎?곸씤 諛⑸쾿`,
            `${target}怨??ㅻⅨ ???鍮꾧탳: ?섏뿉寃?留욌뒗 理쒖쟻???붾（??李얘린`,
            `${target} ?꾩엯 ??諛섎뱶???뚯븘?????꾩떎?곸씤 遺?묒슜怨??닿껐梨?,
            `鍮꾩슜 ?鍮??④낵 洹밸??? ${target} ?쒕?濡??쒖슜?섎뒗 ?ㅼ쟾 猷⑦떞`
        ];
        title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
        const fallbackChapters = [
            [
                `???묎컳? 諛⑸쾿???⑤룄 寃곌낵媛 ?ㅻ?源? ?듭떖 ?먯씤 遺꾩꽍`,
                `?ㅽ뙣瑜??쇳븯??理쒖쟻???명똿 泥リ구??,
                `鍮꾩슜怨??쒓컙??諛섏쑝濡?以꾩뿬二쇰뒗 ?ㅼ쟾 猷⑦떞`,
                `?⑥쑉??洹밸??뷀븯??蹂댁“ ?꾧뎄 ?쒖슜踰?,
                `?꾩쭅?먮뱾???덈? 留먰빐二쇱? ?딅뒗 移섎챸???⑥젏`,
                `?④린 ?깃낵媛 ?꾨땶 ?κ린??愿?먯뿉?쒖쓽 ?좎?蹂댁닔 ?꾨왂`,
                `?먯＜ 臾삳뒗 ?듭떖 吏덈Ц怨?留덉뒪???ㅼ쿇 由ъ뒪??
            ],
            [
                `珥덈낫?먭? 媛??留롮씠 ?ㅽ빐?섎뒗 湲곕낯 ?곸떇???ㅻ쪟`,
                `?곹솴蹂꾨줈 ??留욎떠 怨좊Ⅴ??留욎땄???붾（??媛?대뱶`,
                `吏곸젒 遺?ろ?蹂대㈃??李얠븘??媛???덉쟾???묎렐踰?,
                `?앷컖蹂대떎 ?뷀엳 寃る뒗 理쒖븙??遺?묒슜 ?щ???,
                `?덉궛????퉬?섏? ?딄린 ?꾪빐 踰꾨젮?????곗꽑?쒖쐞`,
                `寃쎌웳 紐⑤뜽?ㅺ낵??鍮꾧탳 遺꾩꽍???듯븳 ?⑺듃 泥댄겕`,
                `?꾩엯 ??諛섎뱶???먭??댁빞 ??理쒖쥌 ?먮윭 泥댄겕由ъ뒪??
            ],
            [
                `蹂멸꺽?곸쑝濡??쒖옉?섍린 ?꾩뿉 吏싰퀬 ?섏뼱媛????3媛吏 ?⑺듃`,
                `?⑤뱾蹂대떎 2諛???鍮좊Ⅴ寃??숇젴?꾨? ?щ━??諛⑸쾿`,
                `?ъ옄 ?鍮?留뚯”?꾨? ?믪씠???④꺼吏??듭뀡??,
                `?대? 臾몄젣媛 ?앷꼈????諛붾줈 ?곸슜 媛?ν븳 ?묎툒 泥섏튂`,
                `?낃퀎 ?몃젋?쒓? 蹂?뷀븯硫댁꽌 ?앷꺼???덈줈????덈뱾`,
                `?욎쑝濡?5???ㅼ뿉???듯븷 遺덈???理쒖쟻??洹쒖튃`,
                `?깃났?곸씤 留덈Т由щ? ?꾪븳 FAQ 諛??꾩닔 ?먭? ?ы빆`
            ]
        ];
        chapters = fallbackChapters[Math.floor(Math.random() * fallbackChapters.length)];
    }

    console.log('   ??[?뺤젙 ?쒕ぉ] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title), model);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>?뱥 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ??[3?④퀎] 2026 E-E-A-T 湲곕컲 怨좏뭹寃??쒕줎 吏묓븘 以?..');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nNARRATIVE TEMPLATES: ${NARRATIVE_HINTS}\n\nMISSION: Write a massive, engaging intro for: ${title}.\n\nRULES:\n1. START with one of the NARRATIVE TEMPLATES style.\n2. START the response with <p style="margin-bottom: 20px;"> tag.\n3. NO MARKDOWN (**), NO HEADERS (#), NO TOC.\n4. ONLY BODY HTML/TEXT. No salutations.\n5. Context: ${searchData}`), 'text');

    body += intro; let summary = intro.slice(-500);
    
    console.log('   ??[4?④퀎] [TURBO MODE] 7媛?梨뺥꽣 ?숈떆 吏묓븘 諛??대?吏 ?앹꽦 以?..');
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    const vLogicPatterns = [
        `V-LOGIC PATTERN A (?먯씤遺꾩꽍??: Act like a forensic investigator. Dissect the core problem into 3 invisible root causes. Expose what people misunderstand and reveal the hidden truth.`,
        `V-LOGIC PATTERN B (?꾨Ц媛 ??寃쏀뿕??: Talk like a seasoned expert sharing a critical behind-the-scenes "war story" or case study. Build tension about the issue and reveal the answer like a plot twist.`,
        `V-LOGIC PATTERN C (?붾（???닿껐??: Start by validating a deep pain point, explain why traditional ways fail, and propose a new elegant solution using step-by-step rigorous reasoning.`,
        `V-LOGIC PATTERN D (?議?鍮꾧탳遺꾩꽍??: Frame the narrative as a battle between Old Way vs New Way, or Assumption vs Reality. Highlight the sheer difference in outcomes using stark contrast.`,
        `V-LOGIC PATTERN E (誘몃옒 ?덉륫/?몃젋?쒗삎): Zoom out and talk about the shifting paradigm. Warn the reader about what's coming in the industry and why they must adapt their mindset immediately.`,
        `V-LOGIC PATTERN F (?꾨Ц媛 ?명꽣酉고삎): Write as if you are answering tough questions from an interviewer, using a highly authoritative tone, dropping industry jargon naturally and explaining it.`
    ].sort(() => Math.random() - 0.5);
    const chapterTasks = chapters.map(async (chapter, i) => {
        try {
            console.log(`      ??[蹂묐젹 媛?? ${i+1}/7 '${chapter}' 吏묓븘 ?쒖옉...`);
            let mission = (i === 6) 
                ? `MISSION: Write an ULTIMATE FAQ & RESOLUTION for: "${title}".\n\nRULES:\n1. Create 10-15 specialized Q&A pairs (FAQ style) with deep answers ABOUT "${target}".\n2. FAQ HEADERS: Wrap EVERY Question in a beautiful HTML <h2> tag (e.g., <h2 style="font-size:20px; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:8px; margin-top:35px; margin-bottom:15px;">Q. [Question]</h2>). DO NOT use markdown (#).\n3. MULTIPLE PARAGRAPHS: Each Answer must be separated properly using <p style="margin-bottom: 20px;"> tags.\n4. CHECKLIST SECTION: After the FAQ, create the 'Master Action Checklist' (10+ items). It MUST start with this EXACT HTML header: <h2 style="background-color:#e8f5e9; border-radius:8px; color:#2e7d32; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #4CAF50;">???ㅼ쟾 留덉뒪???≪뀡 泥댄겕由ъ뒪??/h2>. Put the checklist items inside an HTML <ul> tag, and wrap EVERY single item in a <li style="margin-bottom:15px; font-size:16px; line-height:1.6;"> tag for proper line breaks. NEVER use raw text lists or markdown.\n5. MASSIVE CONTENT (2,000+ chars).`
                : `MISSION: Write a massive, data-driven BODY for: "${chapter}" (Main Article: "${title}", Core Topic: "${target}").\n\nCRITICAL NARRATIVE STYLE:\nYou MUST strictly write this chapter using the following structural logic and tone: ${vLogicPatterns[i % vLogicPatterns.length]}\n\nRULES:\n1. QUANTITY: Write HUGE amounts of text (2,000+ characters minimum). \n2. TABLE: MUST include a 4-column x 4-row HTML Table with unique numerical data/evidence.\n3. ANALOGY: Use at least 2 metaphors from the Analogies library.\n4. OUTCOME: Stop using predictable boring structures. Follow the assigned V-LOGIC PATTERN above!\n5. FOCUS: The content MUST be strictly about "${chapter}" in the context of "${target}". Do not drift to general topics.\n6. STRICTLY FORBIDDEN: NEVER use ** or * or # or \` or HTML <h1>, <h2>, <h3> tags. Use HTML <strong> if needed.\n7. START IMMEDIATELY with dense information. NO HEADERS (#).\n8. MEGA RULE: NEVER start this chapter with the same opening words or filler phrases (like '??', '媛??癒쇱?', '?ъ떎') used in other chapters. Make the first sentence 100% unique and unpredictable.`;
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
            return { i, chapter, sect };
        } catch(e) {
            return { i, chapter, sect: `<p>蹂?梨뺥꽣???댁슜??以鍮?以묒엯?덈떎. ?좎떆留?湲곕떎??二쇱꽭??</p>` };
        }
    });

    const results = await Promise.all(chapterTasks);
    results.sort((a, b) => a.i - b.i).forEach(r => {
        body += `<h2 id="s${r.i+1}" style="background-color:${colors[r.i]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">?렞 ${r.chapter}</h2>${r.sect}`;
        if (extraLinks && extraLinks[r.i]) {
            body += `<div class="link-box">` +
                    `<h3 style="color:#00e5ff; margin-top:0; margin-bottom:15px; font-size:18px;">?뮕 愿???ъ링 媛?대뱶</h3>` +
                    `<p style="margin-bottom: 20px; font-size:15px; color:#ddd;"><strong>${extraLinks[r.i].title}</strong>?????援ъ껜?곸씤 ?붾（?섍낵 ?곸쓣 蹂꾨룄濡??뺣━???먯뿀?듬땲?? ?먯꽭???댁슜??沅곴툑?섏떆?ㅻ㈃ ?꾨옒 留곹겕瑜?李멸퀬??二쇱꽭??</p>` +
                    `<a href="${extraLinks[r.i].url}" target="_blank" style="display:inline-block; padding:12px 30px; background-color:#00e5ff; color:#000; text-decoration:none; font-weight:bold; border-radius:8px; font-size:16px;">?몛 ?ъ링 媛?대뱶 蹂대윭媛湲?/a>` +
                    `</div>`;
        }
    });
    
    console.log('   ??[5?④퀎] Closing, Tags, Schema ?곗씠???앹꽦 以?..');
    let footer = clean(await callAI(model, `STRICT INSTRUCTIONS: ${MASTER_GUIDELINE}\n\nMISSION: Create a powerful Closing, 10+ comma-separated Tags, and a JSON-LD FAQ Schema (with 15+ generated Q&A pairs for SEO) for "${title}".\n\nRULES:\n1. DO NOT write an HTML FAQ section (it is already written).\n2. NO MARKDOWN (**, #). Use HTML tags for Closing.\n3. NO JSON outside the <script type="application/ld+json"> block.\n4. START IMMEDIATELY with the Closing <p> tag. NO CHATTER (e.g., 'OK. ?쒖옉?⑸땲??).\n5. NO IMAGE_PROMPT. Do NOT generate any images here.\n6. OUTPUT EXACTLY: Closing HTML, Tags HTML, and the JSON-LD script limit.`), 'text');
    footer = footer.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    
    // 留덈Т由??뱀뀡?먮룄 ?듭씪???덈뒗 紐낇뭹 h2 諛곗?瑜?媛뺤젣濡?二쇱엯?⑸땲??
    const closingH2 = `<h2 style="background-color:#ffe0b2; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;">?? ?듭떖 ?붿빟 諛?理쒖쥌 留덈Т由?/h2>`;
    const disclaimerHtml = `<div style="background-color:#fff3cd; padding:20px; border-radius:10px; font-size:14px; color:#856404; margin-top:40px; border:1px solid #ffeeba; line-height:1.6;"><p style="margin:0;"><b>?좑툘 [硫댁콉 議고빆]</b> 蹂??ъ뒪?낆? ?⑥닚 ?뺣낫 ?쒓났??紐⑹쟻?쇰줈 ?묒꽦?섏뿀?쇰ŉ, 媛쒖씤???곹솴???곕씪 寃곌낵媛 ?ㅻ? ???덉뒿?덈떎. 蹂?釉붾줈洹몃뒗 ?ъ뒪???댁슜???뺥솗?깆씠???좊ː?깆뿉 ???蹂댁쬆?섏? ?딆쑝硫? ?대줈 ?명빐 諛쒖깮?섎뒗 ?대뼚??吏곴컙?묒쟻???먰빐????댁꽌??踰뺤쟻 梨낆엫??吏吏 ?딆뒿?덈떎. 以묒슂???섏궗 寃곗젙 ?쒖뿉??諛섎뱶???꾨Ц媛???곷떞??諛쏆쑝?쒓굅???좎쨷?섍쾶 ?먮떒?섏떆湲?諛붾엻?덈떎.</p></div>`;
    body += closingH2 + footer + disclaimerHtml + '</div>';
    
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('   ????諛쒗뻾 ?꾨즺! 二쇱냼: ' + res.data.url);
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
            [mainSeed + ' ?꾨꼍 ?낅Ц 媛?대뱶', mainSeed + ' ?깅뒫 理쒖쟻???명똿', mainSeed + ' 移섎챸?곸씤 二쇱쓽?ы빆', mainSeed + ' 理쒖떊 ?쒖옣 ?숉뼢 遺꾩꽍'],
            [mainSeed + ' 湲곗큹 吏?앷낵 ?먮━', mainSeed + ' 怨좉툒 ?뚰겕??諛?轅??, mainSeed + ' 二쇱슂 遺?묒슜怨??덈갑踰?, mainSeed + ' ?泥?媛?ν븳 ?붾（??鍮꾧탳'],
            [mainSeed + ' ?쒕?濡??뚭퀬 ?쒖옉?섍린', mainSeed + ' ?곸쐞 1%???ㅼ쟾 ?쒖슜踰?, mainSeed + ' 鍮꾩슜 ?덇컧???꾪븳 ?듭떖 ??, mainSeed + ' 2026???댄썑??誘몃옒 ?꾨쭩']
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
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.4.20', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();