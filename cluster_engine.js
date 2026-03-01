const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nVue blog — 통합 멀티플랫폼 블로그 에이전트\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n사용자가 키워드를 입력하면, 아래 지침을 준수하여\n네이버 블로그 / 블로그스팟 / 워드프레스에 바로 발행 가능한\nHTML 소스코드를 생성한다.\n\n════════════════════════════════════════\n  PART 0 — 번역 및 우선순위 (절대 규칙)\n════════════════════════════════════════\n[GLOBAL LANGUAGE ROUTING & TRANSLATION]\n★ 사용자가 제시한 키워드나 타겟 주제가 '영문'이거나, 사용자 의도가 '영문 블로그'라고 판단될 경우:\n  1. 출력되는 모든 본문 내용은 반드시 100% 생생하고 자연스러운 원어민 영어(English)로만 작성하세요.\n  2. 지침에 하드코딩된 한국어 UI 컴포넌트 이름(\"📋 목차\", \"💡 꿀팁\", \"⚠️ 주의\", \"📊 실제 데이터\" 등)은 절대로 한국어 그대로 출력하지 말고, 맥락에 맞게 완벽한 영어로 자동 번역하여 출력하세요.\n  3. 영문 블로그 모드일 경우, 최종 JSON 내에 단 한 글자의 한국어도 포함되어서는 안 됩니다.\n\n════════════════════════════════════════\n  PART A — 핵심 철학 (4대 원칙)\n════════════════════════════════════════\n① 적게 (Less is More): 강조 박스 글 전체 3~4개 제한. 연속 2개 박스 배치 금지.\n② 정확하게 (Precision): 모든 수치는 검색으로 확인된 데이터 기반. 출처 문장 안에 자연스럽게 병기.\n③ 진짜처럼 (Authenticity): AI 패턴(균등 문단, 반복 구조) 회피. 전문가의 주관적 서사 극대화.\n④ 돈 되게 (Revenue First): h2 섹션 사이에 자동광고가 붙을 텍스트 여백 확보.\n\n════════════════════════════════════════\n  PART B — 입출력 & 분량\n════════════════════════════════════════\n■ 출력: 마크다운 코드블록 안에 순수 HTML 소스코드 (JSON 한 줄 출력 원칙 준수)\n■ 분량: 8,000자 ~ 10,000자 (순수 한글 텍스트 기준)\n■ HTML 속성: 반드시 작은따옴표(')만 사용 (JSON 파싱 에러 방지)\n\n════════════════════════════════════════\n  PART D — 문체 & 금지 표현\n════════════════════════════════════════\n말투: '오리지널 전문가'의 단호하고 확신에 찬 어투 (\"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\").\n강력 금지 표현: \"어렵게 느껴지시나요?\", \"살펴보겠습니다\", \"알아보겠습니다\", \"도움이 되셨으면\", \"마무리하겠습니다\", \"정리해보겠습니다\" 등 ChatGPT 특유의 표현 절대 금지.\n연속성 금지: 같은 종결어미 3회 연속 사용 금지. 같은 단어로 시작하는 문단 3회 연속 금지.\n날짜 표시 금지: \"최종 업데이트/수정일/작성일: 날짜\" 형식 강제 금지.\n\n════════════════════════════════════════\n  PART F — 글 구조 (프레임워크)\n════════════════════════════════════════\n1. h1 제목 (25~35자)\n2. 목차 (앵커 링크 포함)\n3. 스니펫 도입부 (150자 이내)\n4. 후킹 확장 (2~3단락)\n5. 본문 섹션 4개 (h2 + p 5개씩, 극도로 상세히 작성)\n6. FAQ 10~15개 (Schema 포함)\n7. 면책조항\n8. 관련 포스팅 슬롯 (내부 링크)\n9. 마무리 박스 (결론 요약 + CTA)\n10. Schema 구조화 데이터 (JSON-LD)\n\n★ 서사 패턴 (A~O 중 1~2개 융합):\n패턴 A: 문제 해결형, 패턴 B: 스토리텔링형, 패턴 C: 역피라미드형, 패턴 D: Q&A 대화형, 패턴 E: 가이드형, 패턴 F: 전후 비교형, 패턴 G: 체크리스트형, 패턴 H: 오해 타파형, 패턴 I: 심층 리뷰형, 패턴 J: 입문형, 패턴 K: 비용 분석형, 패턴 L: 타임라인형, 패턴 M: 상황별 솔루션형, 패턴 N: 장단점 양방향형, 패턴 O: 트러블슈팅형.\n\n════════════════════════════════════════\n  PART H — HTML 디자인 시스템\n════════════════════════════════════════\n- h2 스타일: font-size:21px, bold, color:#1f2937, left-border 5px.\n- 강조 박스 4종 (반드시 아래 클래스/스타일 사용):\n  * 목차: .toc-box (블루 그라데이션)\n  * 꿀팁: .tip-box (그린 그라데이션)\n  * 주의: .warn-box (옐로우 그라데이션)\n  * FAQ: .faq-section (퍼플 그라데이션, Q/A 클래스 구분)\n- 가독성 핵심: 모든 p태그는 margin: 18px 0 속성을 포함하여 가독성을 극대화할 것.\n- 본문 이미지 [[IMG_1]] ~ [[IMG_4]] 위치 지정 필수.\n\n[VUE STUDIO ULTIMATE ADD-ON: ADDITIONAL RULES]\n1. 페르소나 최적화: \"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\" 구어체 활용.\n2. 분량 하한선 강제: 공백 제외 순수 한글 8,000자 미만 금지.\n3. 마크다운 완전 금지: 본문 내 별표(**)나 샵(#) 절대 쓰지 말고 오직 HTML 태그만 사용.\n4. FAQ 확장: 반드시 10-15개의 고학년 수준 심층 FAQ 생성.\n5. 이미지 메타데이터 규격: 반드시 본문 하단이나 중간에 [IMG_1: {prompt: 'High-quality English prompt for SDXL', alt: 'korean description', title: 'korean title'}] 형식을 포함할 것.\n";
const NARRATIVE_HINTS = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 개인적인 경험에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠를 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보고 싶습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비셋한 부분에서 고민하고 계시다는 걸 알게 됐거든요."];

const STYLE = `<style>\n  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');\n  .vue-premium { font-family: 'Noto Sans KR', sans-serif; color: #374151; line-height: 1.8; font-size: 16px; max-width: 800px; margin: 0 auto; padding: 20px; word-break: keep-all; }\n  .vue-premium p { margin: 18px 0; }\n  .vue-premium h2 { font-size: 21px; font-weight: bold; color: #1f2937; border-left: 5px solid #1f2937; padding-left: 14px; margin: 44px 0 20px; }\n  .vue-premium h3 { font-size: 18px; font-weight: bold; margin-top: 35px; margin-bottom: 15px; color: #111827; }\n  .toc-box { background: linear-gradient(135deg,#E8F4FD,#DBEAFE); border-left: 5px solid #3B82F6; border-radius: 12px; padding: 20px; margin: 24px 0; }\n  .tip-box { background: linear-gradient(135deg,#ECFDF5,#D1FAE5); border-left: 5px solid #22C55E; border-radius: 12px; padding: 16px; margin: 24px 0; }\n  .warn-box { background: linear-gradient(135deg,#FFFBEB,#FEF3C7); border-left: 5px solid #F59E0B; border-radius: 12px; padding: 16px; margin: 24px 0; }\n  .faq-section { background: linear-gradient(135deg,#F5F3FF,#EDE9FE); border-left: 5px solid #8B5CF6; border-radius: 12px; padding: 16px; margin: 12px 0; }\n  .faq-q { margin: 0 0 6px; font-weight: bold; font-size: 15px; color: #5B21B6; }\n  .faq-a { margin: 0; color: #374151; line-height: 1.7; font-size: 14px; }\n  .vue-premium table { width: 100%; border-collapse: collapse; margin: 30px 0; border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }\n  .vue-premium th { background-color: #f9fafb; color: #111827; padding: 15px; font-weight: bold; border-bottom: 2px solid #e5e7eb; }\n  .vue-premium td { padding: 12px; border-bottom: 1px solid #f1f5f9; background-color: #fff; }\n  .related-box { border-radius: 14px; background: #fff; border: 1px solid #e5e7eb; padding: 25px; margin-top: 50px; }\n  .related-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }\n  .related-list { list-style: none; padding: 0; margin: 0; }\n  .related-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #f1f5f9; }\n  .related-link { color: #2563eb; text-decoration: none; font-weight: 500; font-size: 15px; transition: 0.2s; }\n  .related-link:hover { text-decoration: underline; color: #1d4ed8; }\n</style>`;

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/\`\`\`(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') {
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title|meta)>/gi, '');
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '');
        t = t.replace(/\*\*+(.*?)\*\*+/g, '<b>$1</b>');
        t = t.replace(/\[(EDITORIAL|시행지침|가이드라인|RULE|V-LOGIC|연계.*?)\]/gi, '');
        t = t.replace(/패턴\s*[A-O](\s*(.*?))?(:)?/gi, '');
        t = t.replace(/^(서론|본론|결론|부록|주의|참고|Introduction|Summary|Conclusion|주의|날짜|장|절|챕터\s*\d+|섹션\s*타이틀|핵심\s*요약|해결책|FAQ)[:\s]*/gmi, '');
        t = t.replace(/^#{1,6}\s+.*$/gm, '');
        t = t.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
        t = t.replace(/IMG_\d+:\s*\{?[\s\S]*?\}?/gi, '');
        t = t.replace(/^[🔗📎🏷📝🖼\#\>].*$/gm, '');
        t = t.replace(/^(Part|Mission|Trinity Mission|트리니티 미션).*/gmi, '');
        return t.trim();
    }
    try {
        const start = t.indexOf('{'), end = t.lastIndexOf('}');
        const startArr = t.indexOf('['), endArr = t.lastIndexOf(']');
        let jsonStr = '';
        if (defType === 'obj' && start !== -1 && end !== -1) jsonStr = t.substring(start, end + 1);
        else if (defType === 'arr' && startArr !== -1 && endArr !== -1) jsonStr = t.substring(startArr, endArr + 1);
        if (jsonStr) {
            jsonStr = jsonStr.replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
            try { JSON.parse(jsonStr); return jsonStr; } catch(pe) { return defType === 'obj' ? '{}' : '[]'; }
        }
    } catch(e) { }
    return defType === 'obj' ? '{}' : '[]';
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (String(e.message).includes('429') && retry < 7) {
            await new Promise(res => setTimeout(res, Math.pow(2, retry) * 20000));
            return callAI(model, prompt, retry + 1);
        }
        return '오류 발생.';
    }
}

async function searchSerper(query) {
    if(!process.env.SERPER_API_KEY) return '';
    try {
        const r = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } });
        return r.data.organic.slice(0, 5).map(o => o.title + ': ' + o.snippet).join('\n');
    } catch(e) { return ''; }
}

async function genImg(prompt, model, i) {
    if(!prompt) return '';
    const engPrompt = prompt.replace(/[^a-zA-Z0-9, ]/gi, '').trim() + ', hyper-realistic, 8k, professional photography';

    // 1. Runware (KIE_API_KEY) 시도
    if(process.env.KIE_API_KEY) {
        try {
            const runwareRes = await axios.post('https://api.runware.ai/v1', [
                {
                    action: 'R_IMAGE_INFERENCE',
                    model: 'runware:100@1',
                    prompt: engPrompt,
                    width: 1280,
                    height: 720,
                    numberResults: 1,
                    outputType: 'URL',
                    checkNSFW: true
                }
            ], { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.KIE_API_KEY } });
            
            let runwareUrl = '';
            if(runwareRes.data && runwareRes.data.data && runwareRes.data.data[0]) {
                runwareUrl = runwareRes.data.data[0].imageURL;
            }
            
            if(runwareUrl) {
                // ImgBB 업로드
                if(process.env.IMGBB_API_KEY) {
                    const imgRes = await axios.get(runwareUrl, { responseType: 'arraybuffer' });
                    const form = new FormData(); form.append('image', Buffer.from(imgRes.data).toString('base64'));
                    const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, { headers: form.getHeaders() });
                    return ir.data.data.url;
                }
                return runwareUrl;
            }
        } catch(e) { console.log('   ⚠️ [Runware Error]: ' + e.message); }
    }

    // 2. Pollinations (Fallback)
    let imageUrl = `https://image.pollinations.ai/prompt/` + encodeURIComponent(engPrompt) + `?width=1280&height=720&nologo=true&seed=` + Math.floor(Math.random()*1000000) + `&model=flux`;
    if(process.env.IMGBB_API_KEY) {
        try {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, { headers: form.getHeaders() });
            return ir.data.data.url;
        } catch(e) { }
    }
    return imageUrl;
}

async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log('   📝 [Drafting]: ' + target);
    const searchData = await searchSerper(target);

    const mission1 = '[Mission 1/2] 대상: ' + target + '\\n최소 8,000자 ~ 최대 10,000자 규격의 대서사시 블로그 작성 시작. H1 제목, 목차, 본문 상위 2개 섹션을 아주 상세하게 작성하세요. ★ 섹션당 최소 p태그 5개, 한 문단당 최소 400자 이상의 밀도 높은 텍스트 필수.';
    let part1 = await callAI(model, MASTER_GUIDELINE + '\\n[TARGET_LANG: '+lang+']\\n' + mission1 + '\\n[Search]: ' + searchData);

    const mission2 = '[Mission 2/2] 반드시 앞의 [이전 본문]을 계승하여 본문 나머지 2개 섹션, FAQ(15개), 결론을 작성하여 최종 분량을 [최소 8,000자 ~ 최대 10,000자] 범위로 완벽히 맞추세요. ★ 주의: 중복 없이 새로운 통찰만 쏟아낼 것.';
    let part2 = await callAI(model, MASTER_GUIDELINE + '\\n[TARGET_LANG: '+lang+']\\n' + mission2 + '\\n[이전 본문]: ' + part1.substring(Math.max(0, part1.length - 5000)));
    let clean2 = part2.replace(/<h1.*?>.*?<\/h1>/gi, '').replace(/<div class="toc-box">.*?<\/div>/gi, '');
    const h2Idx = clean2.search(/<h2[\s>]/i); if(h2Idx >= 0) clean2 = clean2.substring(h2Idx);
    const fullRaw = part1 + '\n' + clean2;

    function getMeta(text, key) { const r = new RegExp(key + '[\\:\\s]+[\\{]?\\s*(.*)', 'i'); const m = text.match(r); return m ? m[1].replace(/[\\}]+\\s*$/, '').trim() : ''; }
    const imgRegex = /IMG_(\d+):\s*\{?\s*prompt:\s*["\'](.*?)["\'],\s*alt:\s*["\'](.*?)["\'],\s*title:\s*["\'](.*?)["\']\s*\}?/gi;
    const imgPrompts = {}; let im; while ((im = imgRegex.exec(fullRaw)) !== null) imgPrompts[im[1]] = { prompt: im[2], alt: im[3], title: im[4] };
    
    let finalHtml = clean(fullRaw, 'text');
    for (let i = 1; i <= 4; i++) {
        const tag = "[[IMG_" + i + "]]";
        if(finalHtml.includes(tag)) {
            let p = imgPrompts[i] || { prompt: target + ' professional photography', alt: target, title: target };
            const url = await genImg(p.prompt, model, i);
            finalHtml = finalHtml.split(tag).join("<img src='" + url + "' alt='" + p.alt + "' title='" + p.title + "' style='width:100%; border-radius:15px; margin: 30px 0;'>");
        }
    }

    let relatedHtml = ''; try {
        const list = await blogger.posts.list({ blogId: bId, maxResults: 50 });
        if(list.data.items) {
            const archives = list.data.items.map(p => ({ title: p.title, url: p.url }));
            const relRes = await callAI(model, 'Pick 5 relevant from: ' + JSON.stringify(archives) + ' for ' + target + '. JSON [{title, url}] ONLY.');
            const relData = JSON.parse(clean(relRes, 'arr') || '[]');
            if(relData.length > 0) relatedHtml = '<div class="related-box"><div class="related-title">💡 함께 읽으면 더 유익한 추천 글</div><ul class="related-list">' + relData.map(r => '<li class="related-item"><a href="' + r.url + '" class="related-link">➔ ' + r.title + '</a></li>').join('') + '</ul></div>';
        }
    } catch(e) { }

    const h1Match = finalHtml.match(/<h1.*?>(.*?)<\/h1>/i);
    const finalTitle = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : target;
    let body = finalHtml.replace(/<h1.*?>.*?<\/h1>/gi, '');
    let finalBody = STYLE + '<div class="vue-premium">' + body + relatedHtml + "<br><br><div style='font-size:13px; color:#999; border-top:1px solid #eee; padding-top:20px; margin-top:50px;'>* 본 포스팅은 개인 경험과 공개 자료를 바탕으로 작성되었으며, 전문적인 조언을 대체하지 않습니다.</div></div>";

    try {
        const post = await blogger.posts.insert({ blogId: bId, requestBody: { title: finalTitle, content: finalBody, labels: getMeta(fullRaw, '🏷 라벨').split(',').map(s=>s.trim()), published: pTime.toISOString() } });
        return { title: finalTitle, url: post.data.url };
    } catch(e) { throw e; }
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || [];
    for (let s = 1; s <= (config.daily_count || 1); s++) {
        const seed = pool.length ? pool.splice(Math.floor(Math.random()*pool.length), 1)[0] : null;
        if(!seed) break;
        console.log('   🚀 [Set ' + s + '] Seed: ' + seed);
        const subsRes = await callAI(model, 'Target: ' + seed + '. 4 sub-topic keywords. JSON array ONLY.');
        let subs = JSON.parse(clean(subsRes, 'arr') || '[]');
        const results = [];
        for (let i = 0; i < 4; i++) {
            let topic = subs[i];
            if (typeof topic === 'object' && topic !== null) {
                topic = topic.keyword || topic.topic || topic.title || Object.values(topic)[0];
            }
            if (!topic) topic = seed + ' Tip ' + (i + 1);
            
            const r = await writeAndPost(model, topic, config.blog_lang, blogger, config.blog_id, new Date(), [], i + 1, 5);
            if (r && r.url) results.push(r);
        }
        await writeAndPost(model, seed, config.blog_lang, blogger, config.blog_id, new Date(Date.now() + 10000), results, 5, 5);
        if(s < config.daily_count) await new Promise(r => setTimeout(r, 600000));
    }
}
run();