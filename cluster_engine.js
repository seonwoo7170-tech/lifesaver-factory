const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
================================================================
[VUE POST v2.5 The Origin Master - Premium Content Strategy]
당신은 Studio VUE의 블로그 마케팅 전문가로서, 구글의 E-E-A-T 원칙과 애드센스 수익 극대화 전략을 결합한 '인간보다 더 인간다운' 프리미엄 콘텐츠를 생성합니다.

================================================================
[최우선 규칙 - 글자수 및 출력 방식 강제]
================================================================
※ 이 규칙은 모든 지침보다 우선하며, 미준수 시 실패로 간주함.

1. 강제 목표량: 한국어 12,000~13,500자 / 영어 5,000 words 이상. (한 글자도 부족해선 안 됨)
2. 구성: [H1 제목] → [목차 박스] → [인트로] → [7개 본문 섹션] → [25~30개 FAQ] → [면책조항] → [클로징] → [함께 보면 좋은 정보] → [태그] → [Schema].
3. 섹션당 필수 요소:
   - 최소 1,500자 이상의 풍성한 내용.
   - <p style="margin-bottom: 20px;"> 태그 4~6문단 (한 문단당 2~3문장 제한으로 모바일 가독성 극대화).
   - 고유한 수치 데이터를 포함한 4열 4행 표(Table) 1개 필수.
   - 사실적 사진 묘사를 담은 이미지 프롬프트 1개 필수.

================================================================
[GEMINI GEMS 전용: 3단계 분할 집필 지침]
================================================================
※ AI의 출력 제한으로 인해 13,000자를 한 번에 뽑으면 내용이 요약됩니다. 반드시 아래 단계를 지키십시오.
(참고: 본 엔진은 내부적으로 세션을 분리하여 호출하므로, 각 호출 시 해당 MISSION에 맞는 분량을 최대로 작성하십시오.)

1. [1단계]: 인트로 및 초반 섹션 작성 시, 독자의 시선을 사로잡는 강력한 서사와 데이터를 포함하십시오.
2. [2단계]: 본문 섹션 집필 시, V-LOGIC 패턴에 따라 깊이 있는 통찰과 실전 팁을 방대하게 서술하십시오.
3. [3단계]: FAQ 및 마무리 단계에서 검색 엔진이 열광할 만한 구조화된 데이터(Schema)와 상세 답변을 생성하십시오.

================================================================
[VUE SIGNATURE: 비유 및 수치 라이브러리 (35종 전문)]
================================================================
[비유 표현 전문 - 각 섹션마다 1개 이상 필수 사용]
1. 다이어트: 내일로 미루면 결과는 절대로 나오지 않습니다. 오늘 당장 시작하는 10분의 의지가 중요해요.
2. 마법봉: 마치 마법봉처럼 우리 앞에 놓인 복잡한 문제들을 선 하나로 한 번에 해결해 주는 도구입니다.
3. 좀비: 사라지지 않고 계속해서 우리를 괴롭히는 좀비 같은 악질 문제들을 뿌리부터 잘라내야 합니다.
4. 레고 블록: 레고 블록을 하나씩 맞추듯 기초부터 차근차근 설계도를 따라 쌓아나가는 게 가장 빠릅니다.
5. 요리 레시피: 명품 요리 레시피를 따르듯이 정해진 순서와 계량만 지키면 요리 초보도 실패하지 않아요.
6. 퍼즐 조각: 퍼즐 조각이 단 하나라도 빠지면 결국 전체 그림이 완성되지 않듯이 디테일이 생명입니다.
7. 마라톤: 이건 100m 단거리 질주가 아니라 긴 호흡과 페이스 조절이 절대적으로 필요한 마라톤입니다.
8. 돼지 저금통: 저금통에 동전을 한 푼 두 푼 모으듯 작은 실천들이 모여 나중에 정말 큰 보상을 줍니다.
9. 체스판: 체스판 위에서 말 하나하나를 신중하게 움직이듯 전략적으로 서너 수 앞을 내다봐야 합니다.
10. 텃밭 가꾸기: 작은 텃밭을 정성껏 가꾸는 마음으로 매일 물을 주고 잡초를 뽑아야 가을에 결실을 봅니다.
11. 운전면허: 주행 시험처럼 긴장을 늦추는 순간 큰 실수가 나오죠. 항상 하던 대로의 침착함이 필수입니다.
12. 첫 월급: 첫 월급을 받았을 때의 그 기분 좋은 성취감과 설렘을 이 성과를 통해 다시 느껴보세요.
13. 이사: 낯선 곳으로 이사할 때처럼 설레면서도 짐 목록을 하나하나 다 체크하는 꼼꼼함이 성공의 키입니다.
14. 여행 계획: 여행을 떠나기 전 엑셀로 일정표를 짜는 것만큼이나 미리 준비하는 이 과정이 즐거워야 해요.
15. 냉장고 정리: 유통기한 지난 재료를 버리듯 낡은 지식은 과감히 버리고 신선한 정보를 채워야 합니다.
16. 옷장 정리: 한 번 싹 비워내야 내게 진짜 필요한 옷이 뭔지 보이는 법이죠. 비우는 연습이 필요해요.
17. 은행 적금: 지금의 인내는 미래의 만기 적금과 같습니다. 나중에는 반드시 큰 이자까지 붙어 돌아옵니다.
18. game 레벨업: 능력치를 하나씩 올리고 새로운 희귀 스킬을 배우는 재미를 이 과정에서 꼭 느껴보십시오.
19. 대청소: 묵은 먼지를 시원하게 털어내고 나면 느껴지는 상쾌함처럼, 글을 마쳤을 때의 쾌감은 최고죠.
20. 장보기 리스트: 마트에 가기 전 리스트를 적듯, 글을 쓰기 전 개요를 적는 게 성공 확률의 80%입니다.

[수치 데이터 표현 전문 - 신뢰도 확보용]
- "작업 시간이 기존 1시간에서 단 15분으로 무려 75%나 수직 하강하는 기적 같은 효율을 경험했습니다."
- "데이터 분석 결과, 사용자 10명 중 무려 7명이 이 아주 사소한 지점에서 실수를 하고 이탈했습니다."
- "이 방법을 적용한 직후 방문자 유입 그래프가 평소보다 3.2배 이상 급격히 치솟기 시작하는 걸 확인했죠."
- "단돈 1만원의 초기 투자로 한 달 고정 생활비를 최소 30% 이상 확실히 절약할 수 있는 비결입니다."
- "성공 확률을 기존 40%에서 85%까지 끌어올린, 제가 직접 검증한 지난 6개월간의 기록들입니다."
- "클릭률(CTR)이 기존 1.2%에서 4.8%로 무려 400% 이상 폭발적으로 급증하는 놀라운 성과를 얻었습니다."
- "불필요한 리소스와 시간 낭비를 이전보다 정확히 절반 이상 줄여주는 실질적인 효과를 확인했습니다."
- "단 7일 만에 구글 검색 1페이지 최상단에 안정적으로 노출되기 시작한 실제 성공 사례의 데이터입니다."
- "하루 딱 15분, 이 과정을 21일만 꾸준히 반복하면 뇌의 구조가 바뀌어 습관으로 완벽히 정착됩니다."
- "기존 방식보다 업무 효율성이 무려 210%나 향상되어 삶의 여유가 생겼다는 피드백이 90%가 넘습니다."

================================================================
[V-LOGIC: 무제한 패턴 아키텍처 (15가지 전문)]
================================================================
※ 아래 15가지 패턴을 완벽히 숙지하고 주제에 맞춰 즉석에서 융합하여 독창적 구조를 설계하십시오.
(패턴 A~O: 문제 해결형, 스토리텔링형, 역피라미드형, Q&A 대화형, 단계별 가이드형, 전후 비교 분석형, 체크리스트형, 오해와 진실 타파형, 심층 리뷰형, 초보자 입문형, 경제성 비용 분석형, 타임라인 히스토리형, 상황별 맞춤 솔루션형, 장단점 양방향 분석, 트러블슈팅 응급처치)

================================================================
[SEO & REVENUE RULES: 애드센스 규격 전문]
================================================================
1. 모든 h2 제목 위에 48px의 margin-top을 적용하십시오.
2. 모바일 가독성: 한 문단은 무조건 2~3문장만. <p style="margin-bottom: 20px;"> 태그를 모든 문단에 강제 적용하십시오.
3. 이미지 SEO: alt="시각적 묘사"와 title="핵심 정보"를 다르게 기입하십시오.
4. JSON-LD 스키마: Article, FAQPage 스키마를 반드시 기입하십시오.

================================================================
[CONSTRAINTS: 절대 금지 및 강제 사항]
================================================================
- 금지: 지루한 접속사(먼저, 다음으로 등), AI 상투어구(살펴보겠습니다 등).
- 강제: 한국어 각 호출당 최소 1,500자 이상의 압도적 분량 사수.
- 강제: 전체 결과물은 단 하나의 HTML 코드 블록으로만 출력.
================================================================
`;
const NARRATIVE_HINTS = `[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
================================================================
※ 모든 섹 도입부에 아래 리스트에서 랜덤 선택하여 3문장 이상의 1인칭 서사를 반드시 작성하십시오.

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
`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.0; font-size: 16px; letter-spacing: -0.5px; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium p { margin-bottom: 25px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 15px; margin: 30px 0; box-shadow: 0 10px 40px rgba(0,0,0,0.12); display: block; }
  .h2-premium { background-color: #f8f9fa; border-radius: 10px; color: #000; font-size: 24px; font-weight: bold; margin-top: 60px; padding: 18px; border-left: 10px solid #333; }
  .toc-box { background-color: #fdfdfd; border: 1px solid #eee; border-radius: 15px; padding: 30px; margin: 40px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
  .link-box { background-color: #1a1a1a; color: white; padding: 35px; text-align: center; border-radius: 20px; margin: 50px 0; border: 1px solid #333; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 35px 0; font-size: 15px; text-align: center; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 25px rgba(0,0,0,0.06); }
  .vue-premium th { background-color: #f1f3f5; color: #495057; font-weight: bold; padding: 18px; border-bottom: 2px solid #dee2e6; }
  .vue-premium td { padding: 15px; border-bottom: 1px solid #f1f3f5; background-color: #fff; color: #495057; }
  .vue-premium tr:nth-child(even) td { background-color: #f8f9fa; }
  .vue-premium tr:hover td { background-color: #e9ecef; color: #000; transition: all 0.2s ease; }
  .spacer-div { height: 60px; }
</style>`;

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/```(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') {
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title|meta)>/gi, '');
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '');
        t = t.replace(/\*\*+(.*?)\*\*+/g, '<b>$1</b>');
        t = t.replace(/\[(EDITORIAL|시스템\s*지침|콘텐츠\s*가이드|RULE|V-LOGIC|패턴.*?)\]/gi, '');
        t = t.replace(/패턴\s*[A-Z](\s*(.*?))?(:)?/gi, '');
        t = t.replace(/^(결론|요약|서론|설명|참고|정보|Introduction|Summary|Conclusion|사실|진짜|와|앗|챕터\s*\d+|후킹\s*인트로|문제\s*제기|해결책|FAQ)[:\s]*/gmi, '');
        t = t.replace(/^#{1,6}\s+.*$/gm, '');
        t = t.replace(/<script type=\"application\/ld\+json\">[\s\S]*?<\/script>/gi, '');
        return t.trim();
    }
    try {
        const start = t.indexOf('{'), end = t.lastIndexOf('}');
        const startArr = t.indexOf('['), endArr = t.lastIndexOf(']');
        let jsonStr = '';
        if (defType === 'obj' && start !== -1 && end !== -1) jsonStr = t.substring(start, end + 1);
        else if (defType === 'arr' && startArr !== -1 && endArr !== -1) jsonStr = t.substring(startArr, endArr + 1);
        if (jsonStr) {
            return jsonStr.replace(/[\x00-\x1F]/g, char => char === '\n' ? '\\n' : char === '\r' ? '\\r' : char === '\t' ? '\\t' : '');
        }
    } catch(e) { }
    return defType === 'obj' ? '{}' : '[]';
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST. STRICTLY FOLLOW GOOGLE E-E-A-T. NO CHAT.]\n' + prompt);
        const cand = r.response.candidates?.[0];
        if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'RECITATION') {
            return '내용을 준비 중입니다.';
        }
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
        return r.data.organic.slice(0, 5).map(o => `${o.title}: ${o.snippet}`).join('\n');
    } catch(e) { return ''; }
}
async function genImg(desc, model) {
    if(!desc) return '';
    const engPromptRes = await callAI(model, 'Translate visual concept to English: ' + desc);
    let engPrompt = engPromptRes.replace(/[^a-zA-Z0-9, ]/g, '').trim();
    let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
    const imgbbKey = process.env.IMGBB_API_KEY;
    if(imgbbKey) {
        try {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            return ir.data.data.url;
        } catch(e) { }
    }
    return imageUrl;
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    const searchData = await searchSerper(target);
    const bpPrompt = `Generate JSON: {"title":"...", "chapters":["...", (7 items)]} for: "${target}"`;
    const bpRes = await callAI(model, bpPrompt);
    const data = JSON.parse(clean(bpRes, 'obj') || '{}');
    const title = data.title || target;
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    let body = STYLE + '<div class="vue-premium">';
    body += `<h1 id="top" style="font-size:32px; font-weight:bold; color:#000; line-height:1.3; margin-bottom:40px; padding-bottom:20px; border-bottom:3px solid #333;">${title}</h1>`;
    const hero = await genImg(await callAI(model, 'Visual for: ' + title), model);
    if(hero) body += '<img src="' + hero + '" style="width:100%; border-radius:15px; margin-bottom: 30px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    const colors = ['#f8f0fc', '#f0f4ff', '#e6fcf5', '#fff4e6', '#fff0f6', '#f1f3f5', '#f3f0ff', '#e7f5ff', '#e3faf3', '#fff9db'].sort(() => Math.random() - 0.5);
    const vLogicPatterns = [
        "패턴 A: 문제 해결형 (후킹 인트로 → 고통받는 문제 제기 → 근본적 원인 분석 → 단계별 해결 가이드 → 적용 후 변화 수치)",
        "패턴 B: 스토리텔링형 (개인적인 실패담 → 절망적인 상황 묘사 → 우연히 마주친 깨달음 → 새로운 전략 수립)",
        "패턴 C: 역피라미드형 (충격적인 결론부터 요약 → 왜 이게 정답인지 상세 근거 → 데이터 증거 및 대안 분석)",
        "패턴 D: Q&A 대화형 (독자들이 실제로 보낸 질문 5가지 → 전문가의 1:1 심청 답변 → 보충 설명 박스)",
        "패턴 E: 단계별 가이드형 (시작 전 필수 체크리스트 → Step 1부터 Step 7까지의 세부 공략 → 주의사항)",
        "패턴 F: 전후 비교 분석형 (과거 비포모습 → 당시의 치명적 문제점 → 핵심 조치 → 이후의 애프터모습)",
        "패턴 G: 체크리스트형 (잊어버리는 원인 분석 → 10가지 필수 점크 항목 → 심층 이유와 방법 설명)",
        "패턴 H: 오해와 진실 타파형 (세상의 잘못된 상식 3가지 → 팩트 체크 → 진실된 정보와 대안)",
        "패턴 I: 심층 리뷰형 (사용 계기 → 디자인과 기능 첫인상 → 장단점 상세 분석 → 최종 롱텀 사용평)",
        "패턴 J: 초보자 입문형 (정확한 개념 정의 → 왜 지금 당장 시작해야 하는가 → 0원으로 시작하는 로드맵)",
        "패턴 K: 경제성 비용 분석형 (초기 투자 비용 세부 내역 → 유지비 계산 → 가성비 효율 지점 찾기)",
        "패턴 L: 타임라인 히스토리형 (과거 방식 회상 → 결정적 전환점 → 현재 트렌드 → 3년 뒤 미래 전망)",
        "패턴 M: 상황별 맞춤 솔루션형 (혼자일 때 → 여럿일 때 → 위급 상황 응급처치 → 공통 철칙)",
        "패턴 N: 장단점 양방향 분석 (치명적 단점 3가지 → 그것마저 압도하는 강력한 장점 5가지 → 추천 대상)",
        "패턴 O: 트러블슈팅 응급처치 (증상별 자가 진단 → 응급 조치 → 근본 원인 규명 및 영구 해결법)"
    ].sort(() => Math.random() - 0.5);
    const vLogicRes = vLogicPatterns.slice(0, 7);
    let mission1 = `TRINITY MISSION 1: Intro + S1-3. NARRATIVE: \"${NARRATIVE_HINTS}\". S1: \"${chapters[0] || 'Section 1'}\" (${vLogicRes[0]}), S2: \"${chapters[1] || 'Section 2'}\" (${vLogicRes[1]}), S3: \"${chapters[2] || 'Section 3'}\" (${vLogicRes[2]}). RULES: 7,000+ chars, H2 IDs s1-s3 with colors ${colors[0]}-${colors[2]}, Tables, Images.`;
    let part1 = await callAI(model, `STRICT: ${MASTER_GUIDELINE}\n\n${mission1}\n\nSearch: ${searchData}`);
    let mission2 = `TRINITY MISSION 2: S4-7. S4: \"${chapters[3] || 'Section 4'}\" (${vLogicRes[3]}), S5: \"${chapters[4] || 'Section 5'}\" (${vLogicRes[4]}), S6: \"${chapters[5] || 'Section 6'}\" (${vLogicRes[5]}), S7: \"${chapters[6] || 'Section 7'}\" (${vLogicRes[6]}). RULES: 7,000+ chars, H2 IDs s4-s7 with colors ${colors[3]}-${colors[6]}.`;
    let part2 = await callAI(model, `STRICT: ${MASTER_GUIDELINE}\n\n${mission2}`);
    let mission3 = `TRINITY MISSION 3: FAQ (30), Closing, Schema.`;
    let part3 = await callAI(model, `STRICT: ${MASTER_GUIDELINE}\n\n${mission3}`);
    let fullContent = part1 + part2 + part3;
    let finalHtml = clean(fullContent, 'text');
    const imgRegex = /\[IMAGE_PROMPT:\s*([\s\S]*?)\]/gi; let match;
    while ((match = imgRegex.exec(fullContent)) !== null) {
        try { const url = await genImg(match[1].trim(), model); if(url) finalHtml = finalHtml.replace(match[0], `<img src=\"${url}\" alt=\"${title}\">`); } catch(e) {}
    }
    finalHtml = finalHtml.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/gi, '');
    body += finalHtml + '<div style=\"background-color:#fff3cd; padding:20px; border-radius:10px; font-size:14px; color:#856404; margin-top:40px; border:1px solid #ffeeba;\"><p><b>⚠️ [면책 조항]</b> 결과가 다를 수 있습니다.</p></div></div>';
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    return { title };
}
async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || []; const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    let subRes = await callAI(model, '7 sub-topics for "' + mainSeed + '" as JSON array: ["Topic 1", ...]');
    let subTopics = JSON.parse(clean(subRes, 'arr') || '[]');
    let cTime = new Date();
    for(let i=0; i < subTopics.length; i++) {
        cTime.setMinutes(cTime.getMinutes()+180);
        await writeAndPost(model, subTopics[i], config.blog_lang, blogger, config.blog_id, new Date(cTime), [], i+1, subTopics.length + 1);
    }
    cTime.setMinutes(cTime.getMinutes()+180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime), [], subTopics.length + 1, subTopics.length + 1);
}
run();