const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const THEMES = [
  { name: 'Sky', color: '#6366f1', text: '#1e293b', bg: '#f8faff' },
  { name: 'Emerald', color: '#10b981', text: '#064e3b', bg: '#f0fdf4' },
  { name: 'Rose', color: '#f43f5e', text: '#4c0519', bg: '#fff1f2' },
  { name: 'Amber', color: '#f59e0b', text: '#451a03', bg: '#fffbeb' },
  { name: 'Indigo', color: '#4f46e5', text: '#1e1b4b', bg: '#eef2ff' }
];
const theme = THEMES[Math.floor(Math.random()*THEMES.length)];

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #1e293b; line-height: 2.0; max-width: 900px; margin: 40px auto; padding: 0 40px; word-break: keep-all; font-size: 16px; letter-spacing: -0.5px; text-align: left; }
  .vue-premium * { font-family: 'Pretendard', sans-serif !important; letter-spacing: -0.5px !important; }
  .h2-container { margin-top: 120px; margin-bottom: 60px; text-align: left; }
  .h2-container h2 { font-size: 48px !important; font-weight: 800; color: #0f172a !important; border-bottom: 12px solid ${theme.color}40; padding-bottom: 10px; display: inline-block; line-height: 1.1 !important; margin: 0; }
  .vue-premium h3 { font-size: 32px !important; color: #0f172a !important; margin-top: 80px; margin-bottom: 35px; font-weight: 700; border-left: 12px solid ${theme.color}; padding: 15px 25px; background: linear-gradient(to right, ${theme.bg}, transparent); border-radius: 8px 30px 30px 8px; line-height: 1.3 !important; }
  .vue-premium p { font-size: 16px !important; line-height: 2.0 !important; margin-bottom: 40px; text-align: left; color: #334155 !important; }
  .vue-premium b, .vue-premium strong { font-weight: 800; color: #0f172a !important; background: linear-gradient(120deg, ${theme.color}20 0%, ${theme.color}40 100%); padding: 0 2px; }
  .spacer-div { height: 100px; margin: 80px 0; border-top: 1px solid #e2e8f0; position: relative; }
  .spacer-div::after { content: 'Strategic Authority Content'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 20px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
  .info-box { background: ${theme.bg}; border: 1px solid ${theme.color}20; border-radius: 24px; padding: 40px; margin: 60px 0; }
  .info-box ul { list-style: none; padding: 0; margin: 20px 0 0 0; }
  .info-box li { margin-bottom: 12px; font-weight: 600; }
  .info-box a { color: #475569 !important; text-decoration: none; border-bottom: 1px solid transparent; transition: all 0.2s; }
  .info-box a:hover { color: ${theme.color} !important; border-bottom-color: ${theme.color}; }
  .table-box { width: 100%; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; margin: 60px 0; }
  .vue-premium table { width: 100%; border-collapse: collapse; text-align: center; }
  .vue-premium th { background: #f8fafc; color: #0f172a !important; padding: 20px; font-weight: 800; border-bottom: 4px solid ${theme.color}; }
  .vue-premium td { padding: 18px; border-bottom: 1px solid #f1f5f9; color: #475569 !important; }
  .smart-link-card { background: #1e293b; color: #fff !important; padding: 40px; text-align: center; border-radius: 20px; margin: 80px 0; border: 1px solid ${theme.color}50; }
  .smart-link-card a { color: ${theme.color} !important; font-size: 24px !important; font-weight: 900; text-decoration: none; display: block; margin-top: 15px; }
  .premium-footer { border-top: 3px solid #f1f5f9; padding-top: 60px; margin-top: 120px; text-align: center; color: #94a3b8 !important; font-size: 14px !important; font-weight: 600; }
</style>`;

function chiefAuditor(raw, titleHead = '') {
    if(!raw) return '';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title|meta)>/gi, '');
    t = t.replace(/<title[\s\S]*?<\/title>/gi, '').replace(/style="[^"]*"/gi, '');
    t = t.replace(/\\n/g, String.fromCharCode(10));
    t = t.replace(/\*\*+(.*?)\*\*+/g, '<b>$1</b>'); 
    t = t.replace(/^\s*#+.*$/gm, ''); t = t.replace(/^[-*]{3,}$/gm, '');
    
    t = t.replace(/<(h[1-6])>\s*(\d+\.)*\d*\.?\s*(.*?)\s*<\/\1>/gi, '<$1>$3</$1>');
    t = t.replace(/<li>\s*(\d+\.)*\d*\.?\s*(.*?)\s*<\/li>/gi, '<li>$2</li>');
    t = t.replace(/<(h[1-6])>\s*<b>(.*?)<\/b>\s*<\/\1>/gi, '<$1>$2</$1>');
    t = t.replace(/<b>\s*<h[1-6]>(.*?)<\/h[1-6]>\s*<\/b>/gi, '<h3>$1</h3>');
    t = t.replace(/<h[4-6]>(.*?)<\/h[4-6]>/gi, '<h3>$1</h3>');
    
    t = t.replace(/^(결론|요약|서론|설명|참고|정보|Data|Introduction|Summary|Conclusion|사실|진짜|와|앗)[:\s]*/gmi, '');
    t = t.replace(/^[^<가-힣a-zA-Z0-9]+(?=[가-힣a-zA-Z])/gm, '');

    const trash = [ /물론이죠/gi, /도움이 되길/gi, /요약하자면/gi, /결론적으로/gi, /준비했습니다/gi, /작성하겠습니다/gi, /살펴보겠습니다/gi, /참고해주세요/gi, /본 섹션에서는/gi, /위즈덤픽/gi, /마스터/gi, /설계자/gi, /Paragon/gi, /^그럼 지금부터.*$/gm, /^이상으로.*$/gm, /^아래는.*$/gm, /^먼저.*$/gm, /^다음으로.*$/gm, /^첫째로.*$/gm, /^마지막으로.*$/gm ];
    trash.forEach(p => t = t.replace(p, ''));
    t = t.replace(/^[\s,\.\n\r\*\#\-\>\•]+/g, '');
    t = t.replace(/<p>\s*<\/p>|<p>&nbsp;<\/p>/gi, '');

    let pArr = t.split(/<\/p>/gi);
    let audited = "";
    pArr.forEach((p, idx) => {
        if (p.trim()) { audited += p + '</p>'; if ((idx + 1) % 4 === 0 && idx < pArr.length - 2) audited += '<div class="spacer-div"></div>'; }
    });
    t = audited.replace(/<table/gi, '<div class="table-box no-adsense"><table');
    t = t.replace(/<\/table>/gi, '</table></div>');
    return t.trim();
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER COLUMNIST. STRICTLY FOLLOW GOOGLE E-E-A-T. NO CHAT.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (retry < 3 && (e.message.includes('429') || e.message.includes('Resource exhausted'))) {
            await new Promise(res => setTimeout(res, 30000));
            return callAI(model, prompt, retry + 1);
        }
        throw e;
    }
}

async function searchSerper(query) {
    if(!process.env.SERPER_API_KEY) return '';
    try {
        const r = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } });
        return r.data.organic.slice(0, 5).map(o => `${o.title}: ${o.snippet}`).join(String.fromCharCode(10));
    } catch(e) { return ''; }
}

async function genImg(desc, model) {
    if(!desc) return '';
    try {
        const trans = await callAI(model, 'Translate this visual description to a concise but detailed English for AI image generation. Return ONLY the English text: ' + desc);
        const eng = trans.replace(/[^a-zA-Z0-9, ]/g, '').trim().slice(0, 800);
        console.log('   ㄴ [이미지] Pollinations 가동: ' + eng.slice(0, 30));
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(eng)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*100000)}`;
    } catch(e) { 
        return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280&auto=format&fit=crop';
    }
}

async function writeAndPost(model, target, blogger, bId) {
    console.log(`\n🔱 [Purist Sovereign] v2.2.5 가동 | 20선 서사/15선 패턴 완벽 동기화 시작`);
    const SIGNATURES = [
      '제가 직접 해본 결과, 역시 이론보다는 실전이 제일 중요하더라고요. 책에서 배울 때와는 전혀 다른 현장의 느낌이 있었거든요. 그래서 오늘은 제가 겪은 진짜 이야기를 들려드리려 합니다.',
      '솔직히 처음엔 저도 이 방법을 전혀 몰라서 한참 동안이나 고생하고 시간만 낭비했습니다. 누가 옆에서 한마디만 해줬어도 좋았을 텐데 말이죠. 여러분은 저 같은 실수를 안 하셨으면 좋겠습니다.',
      '이 글을 읽는 분들도 아마 저처럼 시행착오를 겪고 계실 텐데, 그 막막한 마음 제가 누구보다 잘 압니다. 저도 처음에 컴퓨터 앞에 앉아 한숨만 푹푹 내쉬던 기억이 선하거든요.',
      '직접 몸으로 부딪쳐보니까 이제야 뭐가 정답이고 오답인지 확실히 알겠더라고요. 역시 정답은 멀리 있는 게 아니라 우리가 놓치기 쉬운 아주 가까운 기본기에 숨어 있었습니다.',
      '수많은 전문가들이 놓치는 부분인데요, 사실 이게 진짜 핵심 중의 핵심입니다. 겉모양만 적당히 따라 하다가 결국 본질을 놓치고 시간만 날리시는 분들을 너무 많이 봐서 안타까워요.',
      '저도 예전엔 이것 때문에 밤잠 설쳐가며 고민했던 기억이 아직도 선하네요. 그때 제 노트를 다시 들춰보니 참 엉터리로 하고 있었다는 걸 깨닫게 되었답니다.',
      '수십 번의 테스트와 뼈아픈 실패 끝에 알게 된 사실을 오늘 가감 없이 모두 공개할게요. 이건 제가 수백만 원짜리 유료 강의에서도 듣지 못했던 진짜 팁입니다.',
      '몇 년 전 제 초보 시절 모습이 생각나서 더 꼼꼼하고 자세하게 정리해봤습니다. 그때 저에게 이 가이드북이 있었다면 제 인생이 1년은 더 빨라졌을 거예요.',
      '주변 동료들이나 블로그 이웃분들에게 최근 가장 자주 받는 질문들을 하나로 모아봤어요. 다들 공통적으로 궁금해하시는 부분이 정확히 여기더라고요.',
      '처음 이걸 접했을 때의 그 막막하고 답답한 당혹감이 아직도 생생합니다. 내가 과연 해낼 수 있을까 하는 의구심이 들었지만, 결국 정답을 찾아냈죠.',
      '블로그 이웃분들이 메일이랑 댓글로 끊임없이 물어보셔서 오늘 날 잡고 제대로 정리했습니다. 하나하나 답변드리기 어려워 아예 이 글로 종결지으려고 해요.',
      '저도 처음엔 인터넷 검색만 주구장창 했었는데, 알고 보니 다 광고거나 뻔한 소리더라고요. 그래서 제가 직접 해외 자료까지 뒤져가며 검증된 것만 추렸습니다.',
      '실제로 제가 한 달 동안 이 데이터를 밤낮으로 추적하고 분석해본 결과입니다. 주관적인 느낌이 아니라 철저하게 수치로 검증된 사실이니 믿으셔도 좋아요.',
      '이거 모르면 나중에 분명 돈 낭비, 시간 낭비로 땅을 치고 후회하게 될 핵심 포인트예요. 지금 당장 이해되지 않더라도 이 부분은 꼭 메모해 두셔야 합니다.',
      '가까운 친한 친구나 동생에게 설명해주듯이 하나하나 아주 자세히 알려드릴게요. 복잡한 용어 다 빼고, 초등학생도 이해할 수 있을 만큼 쉽게 풀어내겠습니다.',
      '처음엔 엄청 어렵게 느껴지지만, 원리만 딱 깨우치면 생각보다 별거 아니거든요. 자전거 배우는 거랑 똑같아요. 한 번 균형만 잡으면 평생 안 잊어버리죠.',
      '의외로 기본적인 걸 놓쳐서 매달 큰 손해를 보고 계시는 분들이 정말 많더라고요. 제가 그분들의 계정을 직접 진단해보고 찾아낸 공통적인 오류를 짚어드릴게요.',
      '어디에도 제대로 된 설명이 없어서 제가 직접 논문이랑 전공 서적까지 파헤쳐서 정리했어요. 아마 구글에도 이만큼 디테일한 정보는 찾기 힘드실 겁니다.',
      '이건 저만 알고 싶었던 특급 비법인데, 특별히 우리 스튜디오 VUE 구독자분들께만 공유합니다. 너무 많이 알려지면 경쟁력이 떨어질까 봐 조심스럽긴 하네요.',
      '실패를 여러 번 경험하고 눈물 젖은 빵을 먹어보고 나서야 깨달은 진짜 꿀팁입니다. 누군가에게는 인생의 터닝포인트가 될 수도 있는 정보라고 확신해요.'
    ];
    const METAPHORS = [
      '다이어트: 내일로 미루면 결과는 절대로 나오지 않습니다. 오늘 당장 시작하는 10분이 중요해요.',
      '마법봉: 마치 마법봉처럼 우리 앞에 놓인 복잡한 문제들을 한 번에 해결해 주는 도구입니다.',
      '좀비: 사라지지 않고 계속해서 우리를 괴롭히는 좀비 같은 문제들을 뿌리부터 잘라야 합니다.',
      '레고 블록: 레고 블록을 하나씩 맞추듯 기초부터 차근차근 쌓아나가는 게 가장 빠른 지름길이에요.',
      '요리 레시피: 명품 요리 레시피를 따르듯이 정해진 순서와 계량만 지키면 실패할 확률은 0%입니다.',
      '퍼즐 조각: 퍼즐 조각이 단 하나라도 빠지면 결국 전체 그림이 완성되지 않듯이 디테일이 중요합니다.',
      '마라톤: 이건 100m 단거리 질주가 아니라 호흡이 길고 페이스 조절이 필요한 마라톤과 같습니다.',
      '돼지 저금통: 저금통에 동전을 한 푼 두 푼 모으듯 작은 습관들이 모여 나중에 큰 보상을 줍니다.',
      '체스판: 체스판 위에서 말 하나하나를 신중하게 움직이듯 전략적으로 앞수를 내다봐야 합니다.',
      '텃밭 가꾸기: 작은 텃밭을 정성껏 가꾸는 마음으로 매일 물을 주고 돌봐줘야 가을에 결실을 봅니다.',
      '운전면허: 주행 시험처럼 긴장을 늦추는 순간 큰 실수가 나오죠. 항상 하던 대로 침착함이 필수입니다.',
      '첫 월급: 첫 월급을 받았을 때의 그 기분 좋은 성취감을 이 성과를 통해 다시 느껴보세요.',
      '이사: 낯선 곳으로 이사할 때처럼 설레면서도 짐 목록을 하나하나 다 체크하는 꼼꼼함이 필요해요.',
      '여행 계획: 여행을 떠나기 전 엑셀로 일정표를 짜는 것만큼이나 미리 준비하는 과정이 즐겁습니다.',
      '냉장고 정리: 유통기한 지난 재료를 버리듯 오래된 지식은 버리고 신선한 정보를 채워야 성공합니다.',
      '옷장 정리: 한 번 싹 비워내야 내게 진짜 필요한 옷이 뭔지 보이는 법이죠. 비우는 연습이 필요해요.',
      '은행 적금: 지금의 고통은 미래의 만기 적금과 같습니다. 나중에는 반드시 이자까지 붙어 돌아와요.',
      '게임 레벨업: 능력치를 하나씩 올리고 새로운 스킬을 배우는 재미를 이 과정에서 꼭 느껴보십시오.',
      '대청소: 묵은 먼지를 털어내고 나면 느껴지는 상쾌함처럼, 글을 다 썼을 때의 쾌감은 최고입니다.',
      '장보기 리스트: 마트에 가기 전 리스트를 적듯, 글을 쓰기 전 개요를 적는 게 성공의 80%입니다.'
    ];
    const LOGICS = [
      '패턴 A (문제 해결형): 후킹 인트로 -> 고통받는 문제 제기 -> 근본적 원인 분석 -> 단계별 해결 가이드 -> 적용 후 변화 수치 -> 팁 박스 -> FAQ',
      '패턴 B (스토리텔링형): 개인적인 실패담 -> 절망적인 상황 묘사 -> 우연히 마주친 깨달음 -> 새로운 전략 수립 -> 현재의 성공 스토리 -> 마무리 조언',
      '패턴 C (역피라미드형): 충격적인 결론부터 요약 -> 왜 이게 정답인지 설명 -> 증거 자료 및 대안 분석 -> 실전 적용 방법 -> 기대효과 -> FAQ',
      '패턴 D (Q&A 대화형): 독자들이 실제로 보낸 질문 5가지 -> 전문가의 1:1 심층 답변 -> 보충 설명 박스 -> 독자 후기 공유 -> 최종 요약 정리',
      '패턴 E (단계별 가이드형): 시작 전 필수 체크리스트 -> Step 1부터 Step 7까지의 세부 공략 -> 단계별 핵심 주의사항 -> 완료 후 검토법 -> FAQ',
      '패턴 F (비교 분석형): 비교 대상 A vs B 소개 -> 항목별 촘촘한 비교 표 삽입 -> 가성비와 가심비 분석 -> 상황별 최종 추천 모델 -> 선택 가이드',
      '패턴 G (체크리스트형): 왜 우리가 잊어버리는지 분석 -> 10가지 필수 점크 항목 -> 항목별 심층 이유 설명 -> 흔한 실수 방지책 -> FAQ',
      '패턴 H (오해 타파형): 세상의 잘못된 상식 3가지 제시 -> 사실은 이렇습니다(Fact Check) -> 오해가 생긴 배경 -> 진실된 정보 -> 전문가 팁',
      '패턴 I (경험 리뷰형): 구매/사용 계기 -> 첫인상의 솔직한 느낌 -> 장점 3가지 상세 -> 단점 2가지 가감 없이 공개 -> 최종 롱텀 사용평 -> FAQ',
      '패턴 J (초보자 입문형): 이것의 정확한 개념 정의 -> 왜 지금 당장 해야 하는지 -> 0원으로 시작하는 구체적 로드맵 -> 단계별 성장 꿀팁 -> 마무리',
      '패턴 K (비용 분석형): 초기 투자 비용 세부 내역 -> 유지비 및 감가상각 계산 -> 가성비 최고의 효율 지점 찾기 -> 최종 결론 -> FAQ',
      '패턴 L (타임라인 히스토리형): 과거의 낡은 방식 -> 우리를 바꾼 전환점 -> 현재의 대세 트렌드 -> 3년 뒤 미래 전망 -> 지금 바로 준비할 것',
      '패턴 M (상황별 솔루션형): 혼자일 때 해결책 -> 여럿일 때 해결책 -> 위급할 때 해결책 -> 공통적으로 지켜야 할 철칙 -> FAQ',
      '패턴 N (장단점 양방향 분석): 치명적인 단점 3가지 미리 보기 -> 그것마저 압도하는 강력한 장점 5가지 -> 솔직한 끝맺음 -> 누구에게 추천하는가',
      '패턴 O (트러블슈팅 응급처치): 증상별 자가 진단 -> 당장 실행할 응급 조치 -> 원인 규명 및 영구적 해결법 -> 재발 방지용 생활 수칙 -> FAQ'
    ];
    
    console.log('💎 [전략 분석] 실시간 Serper 트렌드 획득 및 외부 참조 Smart Link 탐색...');
    const searchData = await searchSerper(target);
    const bpRes = await callAI(model, `[MASTER] 키워드 "${target}" 리포트 제목과 7개 장 목차 JSON. **절대 마크다운 금지.** 제목은 h2 48px에 걸맞은 웅장하고 검색 의도가 명확한 롱테일 키워드로. JSON: { "title":"", "chapters":[] }`);
    const bp = JSON.parse(chiefAuditor(bpRes));
    const title = (bp.title || target).replace(/^[\d\.\*\-\s>]+/, '');
    const chapters = (bp.chapters || []).map(c => (typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c)).replace(/^[\d\.\*\-\s>]+/, ''));
    
    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="info-box"><b>CORE INSIGHT INDEX</b><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`💎 [다부서 동시 사역] ${i+1}/7: "${chapters[i]}"`);
        
        let sig = i === 0 ? `[VUE_SIGNATURE] "${SIGNATURES[Math.floor(Math.random()*SIGNATURES.length)]}"\n` : '';
        let sectPrompt = isFAQ ? 
            `[SEO/STRATEGY] 전체 내용 추론(${ctx}) 기반 전문가 FAQ 30개 작성.\n\n[RULE]\n1. 난이도 배분: 상-10개 (심층 원리), 중-10개 (실전 응용), 하-10개 (기능/기초).\n2. **절대 번호/마크다운 금지**. HTML <ul><li>로만 작성.\n3. 마지막에 script 태그를 포함한 JSON-LD FAQ/Article 스키마를 반드시 삽입하라.` :
            `[EDITORIAL] ${sig}챕터명: ${chapters[i]}. 1,500자 이상 심층 분석.\n\n[시스템 지침]\n1. **V-LOGIC 패턴**: 이번 섹션은 반드시 "${LOGICS[i % LOGICS.length]}" 패턴을 충실히 따를 것.\n2. **비유 표현**: "${METAPHORS[i % METAPHORS.length]}"를 문맥에 녹여내어 독자의 이해를 돕고 문학적 가치를 높일 것.\n3. **문체**: 전문가의 단호한 확신(~합니다, ~하십시오). 중간에 '앗!', '와,', '사실,', '이게 진짜예요' 등 추임새를 적절히 배치.\n4. **시각 요소**: <b> 및 <strong>으로 핵심 강조. 4x4 HTML Table을 통해 데이터/증거 제시. [IMAGE_PROMPT] 필수 포함.`;
        
        const sectRaw = await callAI(model, sectPrompt);
        let sect = chiefAuditor(sectRaw, chapters[i]);
        const sumRes = await callAI(model, `핵심 요약(수치/데이터 포함): ${sect.substring(0, 1000)}`);
        ctx += ` [S${i+1}: ${sumRes}]`;
        
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = sectRaw.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const u = await genImg(pMatch[1].trim(), model); if(u) sect = sect + `<img src="${u}" alt="${target} Premium Narrative">`; }
        }
        body += `<div class="h2-container" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + sect;
    }
    
    // Smart Link: External Authority Reference
    const extLinkRes = await callAI(model, `[SEARCH_RANK] Search results for "${target}":\n${searchData}\n\nFind the most authoritative, officially relevant EXTERNAL URL (News, Wiki, or Official Doc) from this list. Return ONLY JSON: {"title":"", "url":""}. No Chatter.`);
    try {
        const ext = JSON.parse(chiefAuditor(extLinkRes));
        if(ext.url && ext.url.startsWith('http')) {
            body += `<div class="smart-link-card">` +
                    `<p style="margin:0 0 15px 0; color:${theme.color}; font-weight:900; letter-spacing:2px;">💎 VUE MASTER RECOMMENDATION</p>` +
                    `<p style="margin-bottom:20px; color:#cbd5e1;">${ext.title}에 대한 더 깊고 공신력 있는 정보를 원하신다면 아래 공식 자료를 참고해 보십시오.</p>` +
                    `<a href="${ext.url}" target="_blank">👉 공식 심층 자료 보러가기</a>` +
                    `</div>`;
        }
    } catch(e) { }

    body += `<div class="premium-footer">© 2026 Sovereign Intelligence Collective Archive. All rights reserved.</div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, labels: ["Elite Strategy", target] } });
    console.log(`\n✨ [올인원 사역 성공] v2.2.5 Purist Sovereign 출고 완료.`);
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const gai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = gai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const seeds = config.clusters || []; if(!seeds.length) return;
        const target = seeds.shift();
        await writeAndPost(model, target, blogger, config.blog_id);
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Deep Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();