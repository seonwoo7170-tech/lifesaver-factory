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
const NARRATIVE_HINTS = ``;

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
    console.log('   ㄴ [AI 비주얼] 이미지 생성 시퀀스 가동... (' + desc.slice(0,30) + '...)');

    let engPrompt = desc;
    if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(desc)) {
        try {
            const trans = await callAI(model, 'Translate this visual description to a concise but detailed English for AI image generation. (STRICT: Return ONLY the English text): ' + desc, 0);
            engPrompt = trans.replace(/[^a-zA-Z0-9, ]/g, '').trim();
        } catch(e) { engPrompt = desc.replace(/[^a-zA-Z, ]/g, ''); }
    }
    engPrompt = engPrompt.slice(0, 800);

    const runwareKey = process.env.RUNWARE_API_KEY || process.env.KIE_API_KEY;
    if(runwareKey && runwareKey.length > 5) {
        try {
            console.log('   ㄴ [Kie.ai] 고품질 전용 엔진 호출 중...');
            const r = await axios.post('https://api.runware.ai/v1', [
                { action: 'get_status' },
                { action: 'image_inference', model: 'runware:100@1', prompt: engPrompt, positivePrompt: 'photorealistic, high dynamic range, 8k, cinematic', width: 1024, height: 768, numberResults: 1, outputType: 'URL', checkNSFW: true }
            ], { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + runwareKey } });
            if(r.data && r.data.data && r.data.data[1] && r.data.data[1].imageURL) {
                console.log('   ㄴ [Kie.ai] 프리미엄 비주얼 생성 성공! ✅');
                return r.data.data[1].imageURL;
            }
        } catch(e) { console.log('   ㄴ [Kie.ai] 일시적 오류, 폴백 엔진으로 전환...'); }
    }

    const pParams = `model=flux&width=1024&height=768&seed=\${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true`;
    const pUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(engPrompt + ', high quality, realistic, cinematic') + '?' + pParams;
    
    const imgbbKey = process.env.IMGBB_API_KEY;
    if(imgbbKey && imgbbKey.length > 5) {
        for(let attempt=1; attempt<=3; attempt++) {
            try {
                await new Promise(res => setTimeout(res, 2000 * attempt)); 
                const pRes = await axios.get(pUrl, { responseType: 'arraybuffer', timeout: 30000 });
                if(pRes && pRes.data) {
                    const form = new FormData();
                    form.append('image', pRes.data, { filename: 'image.jpg', contentType: 'image/jpeg' });
                    const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders(), timeout: 60000 });
                    if(ir.data && ir.data.data && ir.data.data.url) {
                        console.log('   ㄴ [ImgBB] 영구 보관용 변환 성공! ✅');
                        return ir.data.data.url;
                    }
                }
            } catch(e) { }
        }
    }
    
    const googleProxy = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=\${encodeURIComponent(pUrl)}`;
    console.log('   ㄴ [Pollinations] 긴급 이미지 링크 생성 완료! ⚡');
    return googleProxy;
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\n[진행 \${idx}/\${total}] 연재 대상: '\${target}'`);
    console.log('   ㄴ [1단계] 실시간 트렌드 분석 및 E-E-A-T 블루프린트 설계 중...');
    const searchData = await searchSerper(target);
    const bpPrompt = `MISSION: Create a high-end, 7-part content strategy for: \"\${target}\".\\n\\n1. Return ONLY a valid JSON object.\\n2. Format: {\"title\":\"SEO_LONGTAIL_TITLE\", \"chapters\":[\"Topic 1\", ..., \"Topic 7\"]}\\n3. TITLE RULE: The title MUST be a \"Google SEO Long-tail Keyword\" phrase.\\n4. CHAPTER STRATEGY: Create 7 highly specific, dynamic chapters.\\n5. RULE: NEVER repeat the main keyword in every chapter title.\\n6. NO MARKDOWN, NO CHATTER. ONLY JSON.`;
    const bpRes = await callAI(model, bpPrompt);
    let title, chapters;
    try {
        const c = clean(bpRes, 'obj');
        const parsed = JSON.parse(c);
        title = (parsed.title && parsed.title.length > 20 && parsed.title !== target) ? parsed.title : `현직 전문가가 알려주는 \${target} 실패 피하는 3가지 현실적인 방법`;
        chapters = (parsed.chapters && parsed.chapters.length >= 7) ? parsed.chapters : [];
        if(chapters.length < 7) throw new Error('Missing chapters');
    } catch(e) { 
        console.log('   ⚠️ [SYSTEM] 블루프린트 설계 보정 중...');
        const titleTemplates = [
            `\${target} 장단점 및 비용 완벽 분석 (2026년 기준 현실적인 선택법)`,
            `현직 전문가가 알려주는 \${target} 실패 피하는 3가지 현실적인 방법`,
            `\${target}과 다른 대안 비교: 나에게 맞는 최적의 솔루션 찾기`,
            `\${target} 도입 전 반드시 알아야 할 현실적인 부작용과 해결책`,
            `비용 대비 효과 극대화: \${target} 제대로 활용하는 실전 루틴` 
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
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li style=\"margin-bottom: 8px;\"><a href=\"#s\${i+1}\" style=\"text-decoration: none; color: #333; font-weight: 500;\">\${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 2026 E-E-A-T 기반 고품격 서론 집필 중...');
    let intro = clean(await callAI(model, `STRICT INSTRUCTIONS: \${MASTER_GUIDELINE}\\n\\nNARRATIVE TEMPLATES: \${NARRATIVE_HINTS}\\n\\nMISSION: Write a massive, engaging intro for: \${title}.\\n\\nRULES:\\n1. START with one of the NARRATIVE TEMPLATES style.\\n2. START the response with <p style=\"margin-bottom: 20px;\"> tag.\\n3. NO MARKDOWN (**), NO HEADERS (#), NO TOC.\\n4. ONLY BODY HTML/TEXT. No salutations.\\n5. Context: \${searchData}`), 'text');

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
            console.log(`      ㄴ [순차 집필] \${i+1}/7 '\${chapter}' 작성 중...`);
            let mission = (i === 6) 
                ? `MISSION: Write an ULTIMATE FAQ & RESOLUTION for: \"\${title}\".\\n\\nCONTEXT: This is the FINAL chapter of the article. Summarize and provide closure.\\n\\nRULES:\\n1. Create 10-15 specialized Q&A pairs (FAQ style) with deep answers ABOUT \"\${target}\".\\n2. FAQ HEADERS: Wrap EVERY Question in a beautiful HTML <h2> tag.\\n3. CHECKLIST SECTION: Use the EXACT <h2> provided in master rules.\\n4. NO GREETINGS. Just start with the content.`
                : `MISSION: Write a massive, engaging BODY for Chapter \${i+1}: \"\${chapter}\".\\n\\nARTICLE OUTLINE: [\${chapters.join(' -> ')}]\\nCORE TOPIC: \"\${target}\"\\n\\nCRITICAL NARRATIVE (Connect the dots):\\n- This is NOT a new article. This is part \${i+1} of a 7-part deep guide.\\n- [STRICT] NO GREETINGS. NO 'Hello', NO 'Let's start'.\\n- [STRICT] DO NOT repeat the \"I used to be a beginner\" story if you already used it in previous chapters.\\n- Connect the flow: Use bridging phrases like '앞서 살펴본 맥락을 바탕으로...', '이 지점에서 우리가 주목해야 할 기술적 포인트는...', '단순한 이론을 넘어 실제 적용 단계에서는...' 등 자연스러운 연결 문구를 사용하십시오.\\n\\nRULES:\\n1. QUANTITY: Write HUGE amounts (2,000+ characters).\\n2. TONE: Friendly expert, but focus 100% on the SPECIFIC chapter topic.\\n3. TABLE: MUST include a 4x4 HTML Table with unique evidence at this stage.\\n4. FORMAT: <p style=\"margin-bottom: 25px; font-size: 16px;\">. NO markdown headers.\\n5. START IMMEDIATELY: Go straight into the first sentence of the topic without any preamble.`;
            
            let sect = clean(await callAI(model, `STRICT INSTRUCTIONS: \${MASTER_GUIDELINE}\\n\\n\${mission}\\n\\nRULES:\\n1. NO TOC, NO JSON.\\n2. STICK TO THE TOPIC: Do not stray back to things already covered in previous parts.\\n3. MUST include exactly one [IMAGE_PROMPT: description] tag.`), 'text');
            
            if (i !== 6) sect = sect.replace(/^#{1,6}\s+.*$/gm, '').replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '');
            else sect = sect.replace(/^#{1,6}\s+.*$/gm, '');

            sect = sect.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            const promptMatch = sect.match(/\[\s*IMAGE_PROMPT\s*[:：]\s*(.*?)\s*\]/i);
            if(promptMatch) {
                const chapterImg = await genImg(promptMatch[1].trim(), model);
                if(chapterImg) {
                    console.log('      ㄴ [비주얼 삽입] 본문에 이미지 배치를 시도합니다.');
                    sect = sect.replace(promptMatch[0], `<img src=\"\${chapterImg}\" alt=\"\${chapter}\" style=\"width:100%; border-radius:12px; margin: 25px 0;\">`);
                } else {
                    sect = sect.replace(promptMatch[0], '');
                }
            }
            sect = sect.replace(/\[\s*IMAGE_PROMPT\s*[:：].*?\]/gi, '');

            results.push({ rIdx: i, chapter, sect });
        } catch(e) {
            results.push({ rIdx: i, chapter, sect: `<p>본 챕터의 내용을 준비 중입니다. 잠시만 기다려 주세요.</p>` });
        }
    }

    results.forEach(r => {
        body += `<h2 id=\"s\${r.rIdx+1}\" style=\"background-color:\${colors[r.rIdx]}; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;\">🎯 \${r.chapter}</h2>\${r.sect}`;
        if (extraLinks && extraLinks[r.rIdx]) {
            body += `<div class=\"link-box\">` +
                    `<h3 style=\"color:#00e5ff; margin-top:0; margin-bottom:15px; font-size:18px;\">💡 관련 심층 가이드</h3>` +
                    `<p style=\"margin-bottom: 20px; font-size:15px; color:#ddd;\"><strong>\${extraLinks[r.rIdx].title}</strong>에 대한 구체적인 솔루션과 팁을 별도로 정리해 두었습니다. 자세한 내용이 궁금하시다면 아래 링크를 참고해 주세요.</p>` +
                    `<a href=\"\${extraLinks[r.rIdx].url}\" target=\"_blank\" style=\"display:inline-block; padding:12px 30px; background-color:#00e5ff; color:#000; text-decoration:none; font-weight:bold; border-radius:8px; font-size:16px;\">👉 심층 가이드 보러가기</a>` + 
                    `</div>`;
        }
    });
    
    console.log('   ㄴ [5단계] Closing, Tags, Schema 데이터 생성 중...');
    let footer = clean(await callAI(model, `STRICT INSTRUCTIONS: \${MASTER_GUIDELINE}\\n\\nMISSION: Create a powerful Closing, 10+ comma-separated Tags, and a JSON-LD FAQ Schema (with 15+ generated Q&A pairs for SEO) for \"\${title}\".\\n\\nRULES:\\n1. DO NOT write an HTML FAQ section (it is already written).\\n2. NO MARKDOWN (**, #). Use HTML tags for Closing.\\n3. NO JSON outside the <script type=\"application/ld+json\"> block.\\n4. START IMMEDIATELY with the Closing <p> tag. NO CHATTER.\\n5. NO IMAGE_PROMPT.\\n6. OUTPUT EXACTLY: Closing HTML, Tags HTML, and the JSON-LD script limit.`), 'text');
    footer = footer.replace(/\[\s*IMAGE_PROMPT\s*[:：].*?\]/gi, '');
    
    const closingH2 = `<h2 style=\"background-color:#ffe0b2; border-radius:8px; color:black; font-size:20px; font-weight:bold; padding:12px; margin-top:48px; border-left:10px solid #333;\">🚀 핵심 요약 및 최종 마무리</h2>`;
    const disclaimerHtml = `<div style=\"background-color:#fff3cd; padding:20px; border-radius:10px; font-size:14px; color:#856404; margin-top:40px; border:1px solid #ffeeba; line-height:1.6;\"><p style=\"margin:0;\"><b>⚠️ [면책 조항]</b> 본 포스팅은 단순 정보 제공을 목적으로 작성되었으며, 개인의 상황에 따라 결과가 다를 수 있습니다. 본 블로그는 포스팅 내용의 정확성이나 신뢰성에 대해 보증하지 않으며, 이로 인해 발생하는 어떠한 직간접적인 손해에 대해서도 법적 책임을 지지 않습니다. 중요한 의사 결정 시에는 반드시 전문가의 상담을 받으시거나 신중하게 판단하시기 바랍니다.</p></div>`;
    body += closingH2 + footer + disclaimerHtml + '</div>';
    
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
    if(!pool.length) {
        console.log('   ❌ [종료] 처리할 키워드가 없습니다.');
        return;
    }
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('   💎 [오늘의 메인 씨드] \"' + mainSeed + '\" (남은 키워드: ' + pool.length + '개)');
    let subRes = clean(await callAI(model, 'Topic: \"' + mainSeed + '\".\\nGenerate 4 sub-topics as a simple JSON array of strings: [\"A\", \"B\", \"C\", \"D\"]. ONLY JSON. NO Chat.'), 'arr');
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