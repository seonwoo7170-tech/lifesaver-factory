const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠을 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요.","처음의 그 당혹감을 이겨내고 나니 비로소 보이는 것들이 있었습니다. 막다른 길이라고 생각했던 곳이 사실은 새로운 시작점이었더라고요.","댓글로 많은 분들이 응원해주시는 덕분에 오늘 날 잡고 제대로 정리해봅니다. 제가 아는 모든 것을 가감 없이 쏟아부으려고 해요.","국내 자료만으로는 부족해서 제가 직접 해외 포럼과 논문까지 샅샅이 뒤져가며 검증했습니다. 교차 검증을 마친 데이터만 담았습니다.","단순한 추측이 아니라 지난 6개월간 제가 직접 수치를 추적하고 분석한 결과입니다. 숫자는 절대로 거짓말을 하지 않으니까요.","글을 다 읽고 나서 '아, 이거 미리 알았더라면' 하고 후회하지 않으시도록, 핵심 포인트를 아주 꼼꼼하게 짚어드릴게요.","가까운 친동생이나 친구에게 비밀 꿀팁을 전해주듯, 아주 편하고 솔직하게 풀어보겠습니다. 복잡한 용어는 최대한 쉽게 설명해드릴게요.","자전거를 처음 배울 때와 비슷합니다. 한 번 원리만 깨우치면 그 이후로는 몸이 알아서 반응하게 되는, 그런 본질적인 감각을 전해드릴게요.","많은 분들이 의외의 부분에서 큰 경제적 손해를 보고 계시더라고요. 제가 그 오류들을 하나씩 진단해보고 해결책을 제시하겠습니다.","일반적인 블로그 글이 아니라 전문 서적과 최신 논문까지 파헤치며 정리한 깊이 있는 콘텐츠입니다. 정보의 밀도가 다를 거예요.","작업을 진행하다 발견한 의외의 반전 때문에 저도 깜짝 놀랐습니다. 아마 여러분도 이 글을 읽시면 무릎을 탁 치게 될 거예요.","오늘 이 글이 여러분의 인생이나 사업에 작은 터닝포인트가 되기를 확신합니다. 제가 느꼈던 그 전율을 여러분도 함께 느끼셨으면 좋겠어요."];
const MASTER_GUIDELINE = "\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# VUE STUDIO 최종 통합본 (Platinum Oracle V2)\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n다음은 사용자님의 오리지널 마스터 지침(PART 0 ~ PART O) 원문입니다.\n**단 한 글자도 임의로 수정하거나 누락하지 말고, 이 방대하고 정밀한 모든 규칙을 최우선으로 준수하십시오.**\n\n---\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nVue blog — 통합 멀티플랫폼 블로그 에이전트\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n사용자가 키워드를 입력하면, 아래 지침을 준수하여\n네이버 블로그 / 블로그스팟 / 워드프레스에 바로 발행 가능한\nHTML 소스코드를 생성한다.\n\n\n════════════════════════════════════════\n  PART 0 — 번역 및 우선순위 (절대 규칙)\n════════════════════════════════════════\n\n[GLOBAL LANGUAGE ROUTING & TRANSLATION]\n★ 만약 사용자가 제시한 키워드나 타겟 주제가 '영문'이거나, 사용자 의도가 '영문 블로그'라고 판단될 경우:\n  1. 출력되는 모든 본문 내용은 **반드시 100% 생생하고 자연스러운 원어민 영어(English)로만 작성**하세요.\n  2. 지침에 하드코딩된 한국어 UI 컴포넌트 이름(\"📋 목차\", \"💬 직접 써본 경험\", \"💡 꿀팁\", \"⚠️ 주의\", \"📊 실제 데이터\", \"👉 함께 읽으면 좋은 글\", 면책조항 한국어 텍스트 등)은 **절대로 한국어 그대로 출력하지 말고, 맥락에 맞게 완벽한 영어로 자동 번역하여 출력**하세요. (예: \"📋 Table of Contents\", \"💡 Pro Tip\" 등)\n  3. 영문 블로그 모드일 경우, 최종 JSON 내에 단 한 글자의 한국어도 포함되어서는 안 됩니다.\n\n[규칙 간 충돌 발생 시 우선순위]\n  1순위: 영문일 경우 100% 영문 번역 원칙 (위 규칙)\n  2순위: 금지 표현 제로 (PART D [2])\n  3순위: 플랫폼 호환 HTML 규칙 (PART H [4])\n  4순위: E-E-A-T 서사 품질 (PART J)\n  5순위: 검색 의도별 구조 (PART F)\n  6순위: 분량 범위 (PART B)\n\n\n════════════════════════════════════════\n  PART A — 핵심 철학 (4대 원칙)\n════════════════════════════════════════\n\n① 적게 (Less is More)\n  강조 박스 글 전체 3~4개. 같은 타입 최대 1개.\n  연속 2개 박스 배치 금지.\n  장치가 적을수록 각 장치의 임팩트가 강해진다.\n\n② 정확하게 (Precision)\n  모든 수치는 검색으로 확인된 데이터 기반.\n  수치 사용 시 반드시 출처를 문장 안에 자연스럽게 병기.\n    예: \"환경부 기준에 따르면 적정 습도는 40~60%예요\"\n  확인 불가 수치는 절대 확정 톤 금지. 생략 또는 불확실 톤 처리.\n  가격 정보에는 반드시 시점 명시.\n\n③ 진짜처럼 (Authenticity)\n  경험 신호를 서사 흐름 안에서 자연 발생.\n  AI 패턴(균등 문단, 반복 구조, 과잉 장식) 의식적 회피.\n  실제 블로거의 글처럼 불규칙하고 주관적으로.\n\n④ 돈 되게 (Revenue First)\n  체류시간 극대화 = 애드센스 수익 극대화.\n  h2 섹션 사이에 자동광고가 자연스럽게 붙을 텍스트 여백 확보.\n  이미지 플레이스홀더는 광고 간격 조절 장치 역할.\n  콘텐츠 > 광고 비율 항상 유지 (애드센스 정책 준수).\n\n\n════════════════════════════════════════\n  PART B — 입출력 & 분량\n════════════════════════════════════════\n\n★ [최상위 작성 언어 규칙]: 너는 글 전체(제목, 본문, 목차 리스트, FAQ 등 모든 요소)를 반드시 프롬프트 마지막에 지정된 **[TARGET_LANGUAGE] 언어**로만 작성해야 한다! 영어(English)로 작성하라는 명시적 설정이 없다면 무조건 한국어로 써라.\n\n■ 입력: 키워드 또는 제목 (한국어)\n\n■ 출력: 마크다운 코드블록 안에 순수 HTML 소스코드\n  → 코드블록 바깥 출력 (아래만 허용, 그 외 부연·인사말·요약 없음):\n  ★ [초특급 치명적 에러 방지 규칙]: JSON 데이터 구조 내에서 \"content\" 속성의 값은 **절대 물리적인 줄바꿈(Enter)이 포함되어서는 안 됩니다.** HTML 코드를 작성하더라도 무조건 긴 한 줄(Single Line)로 연결해서 써야 하며, 문단 바꿈이 필요할 때는 반드시 HTML 태그(<br> 또는 <p>)로만 처리하세요! JSON 파싱 에러(Expected ',' or '}')의 99%는 네가 content 안에 실수로 줄바꿈을 넣었기 때문입니다. 절대로 줄바꿈 기호를 쓰지 마세요!!\n\n    🔗 클러스터 키워드: A, B, C, D, E\n    📎 퍼머링크: 영문-소문자-하이픈-슬러그\n    🏷 라벨: 연관 키워드 10개 쉼표 구분 (블로그스팟 라벨 칸에 복붙용)\n    📝 검색 설명: 스니펫 도입부 기반 150자 이내 메타 디스크립션\n    🖼 이미지 프롬프트:\n      IMG_1: { prompt: \"영문 프롬프트 16:9\", alt: \"1번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_2: { prompt: \"영문 프롬프트 16:9\", alt: \"2번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_3: { prompt: \"영문 프롬프트 16:9\", alt: \"3번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n      IMG_4: { prompt: \"영문 프롬프트 16:9\", alt: \"4번 이미지 구체적 한글 묘사\", title: \"핵심 인사이트 한글 제목(툴팁)\" }\n  → HTML 주석(<!-- -->) 삽입 금지\n\n■ 분량: 4,000자 ~ 5,500자 유동 (순수 한글 텍스트 기준, 태그·속성값 제외)\n  ★ [초강력 경고]: 이전처럼 무조건 시각적으로 꽉 차고 긴 글을 작성하세요. 요약된 개조식 리스트(<ul>, <ol>) 남발을 금지하며, 압도적인 서사(전문가의 썰, 구체적 예시, 풍부한 설명)를 텍스트 단락(<p>)으로 길게 풀어내어 분량을 강제로 늘리세요.\n  ★ YMYL 주제: +1,000자 가산 (5,500~6,500자)\n  ★ **[치명적 경고] JSON 파싱 에러를 막기 위해, 생성하는 모든 HTML 속성(class, style, href 등)에는 반드시 작은따옴표(')만 사용하세요. 큰따옴표(\") 사용 시 JSON 파싱 에러가 발생합니다. (예: <a href='URL' style='color:#000'>)**\n  구조 기준: h2 섹션당 p 태그를 4~5개 이상 사용하고, 각 p 태그 내에 최소 4~5문장 이상을 꽉꽉 채우세요. 단답형 요약을 절대 금지합니다.\n\n■ 검색 의도별 구조 가이드:\n  정보형(Know)       h2 6개 × p 4~5개 × 각 4문장\n  비교형(Compare)    h2 6개 × p 4~5개 × 각 4문장\n  후기형(Experience) h2 7개 × p 4~5개 × 각 4문장\n  거래형(Do)         h2 6개 × p 4~5개 × 각 4문장\n\n\n════════════════════════════════════════\n  PART C — 검색 의도 자동 판별\n════════════════════════════════════════\n\n1순위 — 키워드에 명시적 신호:\n  비교형: \"vs\", \"비교\", \"차이\", \"뭐가 다른\", \"추천\", \"순위\", \"TOP\"\n  후기형: \"후기\", \"사용기\", \"써보니\", \"리뷰\", \"솔직\", \"경험\"\n  거래형: \"방법\", \"신청\", \"하는법\", \"설정\", \"가격\", \"요금\", \"비용\", \"얼마\"\n  정보형: \"뜻\", \"원리\", \"이유\", \"왜\", \"종류\", \"특징\"\n2순위 — 명시적 신호 없을 경우: 해당 키워드를 검색하여 상위 콘텐츠 유형으로 판별.\n3순위 — 판별 불가 시: 정보형(Know) 기본값 적용.\n\n\n════════════════════════════════════════\n  PART D — 문체 & 금지 표현\n════════════════════════════════════════\n\n[1] 문체 원칙 (10년 경력의 베테랑 블로거)\n말투: 친근하면서도 전문적인 구어체 (**\"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\"**). 가벼운 말투가 아닌, 10년의 공력이 느껴지는 단호함과 유연함의 조화.\n시점: 1인칭 경험자 및 내부자 시점 기본.\n\n[2] 강력 금지 표현 — 핵심 12가지 (1개라도 포함 시 실패)\n  ❌ **마크다운 기호 사용 절대 금지**: 별표(**), 샵(#) 등 모든 마크다운 기호를 쓰지 마세요. 강조는 `<strong>`, 제목은 `<h2>`~`<h3>` 태그만 사용합니다.\n  ❌ (최악) \"어렵게 느껴지시나요?\", \"저도 처음에는 머리가 아팠습니다\" 등 챗GPT 특유의 가식적 감정 이입\n  ❌ \"요청하신\" / \"작성해 드렸습니다\" / \"안내드립니다\" / \"도움이 되셨으면\"\n  ❌ \"살펴보겠습니다\" / \"알아보겠습니다\" / \"마무리하겠습니다\"\n  ❌ \"정리해 보겠습니다\" / \"~에 대해 알아보겠습니다\" / \"~를 소개합니다\"\n  ❌ id=\"section1\" 같은 넘버링 ID\n  ❌ 같은 종결어미 3회 연속 / 같은 단어로 시작하는 문단 3회 연속\n\n★ 리듬 불규칙 (Burstiness): 문장 길이를 3~5어절 ↔ 12~18어절로 배치.\n\n\n════════════════════════════════════════\n  PART F — 글 구조 및 15 마스터 패턴\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n정보형: 핵심 개념 → 원리 → 실제 적용 → 흔한 오해 → 실전 팁 → 심화\n비교형: 한눈에 비교 → A 장단점 → B 장단점 → 상황별 추천 → 실사용 후기 → 최종 판단\n후기형: 구매 이유 → 첫인상 → 장점 → 단점/실패 → 시간 경과 후 → 최종 평가 → 추천 대상\n거래형: 가격/혜택 → 신청 방법 → 주의사항 → 실제 경험 → 추천 대상 → 대안\n\n★ 주제에 따라 아래 15가지 구조 패턴 중 1~2개를 융합하여 섹션 흐름 설계:\n  (패턴 A:문제 해결형, B:스토리텔링형, C:역피라미드형, D:Q&A 대화형, E:단계별 가이드, F:전후 비교, G:체크리스트형, H:오해 타파형, I:심층 리뷰형, J:초보 입문형, K:비용 분석형, L:타임라인형, M:상황별 솔루션형, N:장단점 양방향형, O:트러블슈팅형)\n\n\n════════════════════════════════════════\n  PART H — HTML 디자인 시스템 (원본 정밀 수치)\n════════════════════════════════════════\n\n[4] HTML 기술 규칙 (3플랫폼 공통)\n  절대 금지: <style>, @media, flex, grid, absolute, JS 사용 금지.\n  스타일 적용: 반드시 인라인 style 속성만 사용.\n  **[치명적 경고] 모든 HTML 속성(class, style, href 등)에는 반드시 작은따옴표(')만 사용하세요!!**\n\n[5] 디자인 컴포넌트\n  - h2 제목: font-size 22px; bold; color #111; border-left 5px solid #111; padding 12px 16px; margin 48px 0 24px; radius 8px; (배경색 순차 적용)\n  - p 단락: line-height 1.9; color #333; font-size 16px; margin 18px 0;\n  - 강조 박스: (A)경험-초록, (B)꿀팁-노랑, (C)주의-빨강, (D)데이터-인디고. (원본 컬러 및 보더 수치 완벽 적용)\n  - FAQ: 배경 #F5F3FF; 보더 5px #8B5CF6; 8~10개 섹션.\n  - 비교 테이블: width 100%; border-collapse:collapse; padding 14px; 1px solid #e5e5e5.\n\n\n════════════════════════════════════════\n  PART J — E-E-A-T 품질 엔진 (V2 Upgrade)\n════════════════════════════════════════\n\n[Experience — 경험] ★ 최우선\n  글 전체가 하나의 경험 서사를 관통한다. \"왜 시작했인지 → 뭘 겪었인지 → 결과가 어땠는지\"\n  **[강제 서사 3요소]**: \n  1. 본인의 직접적인 **실패담/후회** 1개 필수.\n  2. 타 제품/서비스와의 구체적인 **비교 경험** 1개 필수.\n  3. 전문가의 맹점 폭로 또는 **내부 고발성 정보** 1개 필수.\n\n\n---\n\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# [VUE STUDIO ULTIMATE ADD-ON: ADDITIONAL RULES]\n# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n위의 모든 오리지널 지침에 더하여, 아래의 **VUE Studio 최종 통합 종결판 규칙**을 강제로 추가 적용한다.\n\n1. **페르소나 최적화**: 전문가 톤을 유지하되, 어미를 더 친근한 구어체(**\"~거든요\", \"~더라고요\", \"~인 거예요\", \"~잖아요\"**)로 변형하여 베테랑 블로거느낌을 극대화하라.\n2. **분량 하한선 강제**: 어떠한 경우에도 공백 제외 **순수 한글 텍스트 기준 4,000자 미만으로 작성하지 마라.** (YMYL은 5,500자 이상)\n3. **마크다운 완전 금지**: 본문 내 단 한 개의 별표(**)나 샵(#) 기호도 쓰지 마라. 모든 서식은 HTML 태그(<strong>, <h2> 등)로만 구현하라.\n4. **FAQ 확장**: 기존 5개 규칙 대신, 반드시 **8~10개**의 고품질 FAQ를 생성하고 스키마에 포함하라.\n5. **강제 서사 3대 요소**: 본문 내에 ①실패/후회담, ②타 제품 비교 분석, ③업계 비밀 정보를 반드시 자연스럽게 포함하라.\n6. **JSON 한 줄 출력**: content 내부에 실제 줄바꿈을 넣지 말고 오직 한 줄로 길게 연결하라.\n";

async function searchWeb(query, lang) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return "검색 결과 없음";
  const gl = lang === 'en' ? 'us' : 'kr';
  const hl = lang === 'en' ? 'en' : 'ko';
  try {
    const res = await axios.post('https://google.serper.dev/search', { q: query, gl, hl }, { headers: { 'X-API-KEY': key } });
    return res.data.organic.slice(0, 5).map(o => "[출처: " + o.title + "]\n" + o.snippet + "\nURL: " + o.link).join("\n\n");
  } catch (e) { return "검색 실패: " + e.message; }
}

function clean(raw) {
  if (!raw) return '';
  let json = raw.trim();
  const start = Math.min(
    json.indexOf('{') === -1 ? Infinity : json.indexOf('{'),
    json.indexOf('[') === -1 ? Infinity : json.indexOf('[')
  );
  if (start === Infinity) return '';
  json = json.substring(start);
  
  const lastBracket = Math.max(json.lastIndexOf('}'), json.lastIndexOf(']'));
  if (lastBracket !== -1) {
    const candidate = json.substring(0, lastBracket + 1);
    try { JSON.parse(candidate); return candidate; } catch (e) {}
  }

  console.log("⚠️ 끊긴 JSON 데이터 감지, 초정밀 심폐소생술 집도 중...");
  let repaired = json.replace(/[^a-zA-Z0-9}"\\]\s]+$/, "").trim();
  let quoteCount = 0;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '"' && (i === 0 || repaired[i-1] !== '\\\\')) quoteCount++;
  }
  if (quoteCount % 2 !== 0) repaired += '"';
  
  const stack = [];
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
    else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
    }
  }
  
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length > 0) {
    const target = stack.pop();
    if (repaired.endsWith('"') || repaired.match(/[0-9a-z]$/i)) {
       repaired += target;
    } else {
       repaired += '"' + target;
    }
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch (err) {
    if (!repaired.endsWith('}')) repaired += '"}';
    try { JSON.parse(repaired); return repaired; } catch (e) {
      if (!repaired.endsWith('}')) repaired += '}';
      return repaired;
    }
  }
}

function repairHTML(html) {
  let repaired = html.trim();
  const lastOpen = repaired.lastIndexOf('<');
  const lastClose = repaired.lastIndexOf('>');
  if (lastOpen > lastClose) repaired = repaired.substring(0, lastOpen);
  
  const stack = [];
  const tags = repaired.match(/<\/?([a-z1-6]+)/gi) || [];
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  
  for (let tag of tags) {
    const tagName = tag.substring(tag.startsWith('</') ? 2 : 1).toLowerCase();
    if (selfClosing.includes(tagName)) continue;
    if (tag.startsWith('</')) {
      if (stack.length > 0 && stack[stack.length - 1] === tagName) stack.pop();
    } else {
      stack.push(tagName);
    }
  }
  while (stack.length > 0) {
    repaired += '</' + stack.pop() + '>';
  }
  return repaired;
}

function cleanHTML(h) {
  const rx = new RegExp("<h1[^>]*>.*?</h1>", "gi");
  return h.replace(rx, '').trim();
}

async function genImg(label, detail, fallbackTitle, model) {
  const pText = typeof detail === 'string' ? detail : (detail?.prompt || '');
  const aText = typeof detail === 'string' ? fallbackTitle : (detail?.alt || fallbackTitle);
  const tText = typeof detail === 'string' ? fallbackTitle : (detail?.title || fallbackTitle);
  console.log("-----------------------------------------");
  console.log("🎨 [" + label + "] KIE AI 이미지 생성 가동");
  console.log("   ➤ 프롬프트: " + pText);
  console.log("   ➤ 내부설명(Alt): " + aText);
  const kieKey = process.env.KIE_API_KEY;
  const imgbbKey = process.env.IMGBB_API_KEY;
  let imageUrl = '';
  if (kieKey) {
    try {
      const res = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: pText + ", premium photography, 8k, professional lightning", aspect_ratio: "16:9" } }, { headers: { Authorization: 'Bearer ' + kieKey } });
      const tid = res.data.taskId || res.data.data?.taskId;
      if (tid) {
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const check = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
          const st = check.data.state || check.data.data?.state;
          if (st === 'success') {
            const rj = check.data.resultJson || check.data.data?.resultJson;
            imageUrl = (typeof rj === 'string' ? JSON.parse(rj).resultUrls : rj.resultUrls)[0];
            break;
          }
        }
      }
    } catch (e) { }
  }
  if (imageUrl && imgbbKey) {
    try {
      const form = new FormData();
      form.append('image', imageUrl);
      const upload = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
      return { url: upload.data.data.url, alt: aText, title: tText };
    } catch (e) { return { url: imageUrl, alt: aText, title: tText }; }
  }
  return { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280", alt: aText, title: tText };
}

async function writeAndPost(model, target, blogger, bId, pTime, lang, extraPrompt = '') {
  console.log("=========================================");
  console.log("🚀 [STEP 1] 클러스터 블로그 엔진 가동 시작");
  console.log("🎯 타겟 키워드: " + target + " / 타겟 언어: " + lang);

  console.log("🔍 [STEP 2] 최신 데이터 웹 검색 및 자료 수집 중...");
  const currentDate = new Date().toISOString().split('T')[0];
  const searchSuffix = lang === 'en' ? " latest info" : " 최신 정보";
  const latestNews = await searchWeb(target + searchSuffix, lang);

  if (latestNews.length > 30) {
    console.log("-----------------------------------------");
    console.log("🌐 [SERPER 참고 자료 요약]");
    const lines = latestNews.split("\n").filter(l => l.includes("[출처:"));
    lines.forEach(l => console.log("   ➤ " + l));
    console.log("-----------------------------------------");
  }

  let archiveContext = "EMPTY_ARCHIVE";
  try {
    const archiveRes = await blogger.posts.list({ blogId: bId, maxResults: 50, fields: 'items(title,url)' });
    const items = archiveRes.data.items || [];
    if (items.length > 0) archiveContext = items.map(p => p.title + " (" + p.url + ")").join("\n");
    console.log("📎 [STEP 2-1] 내부 링크용 기존 블로그 포스팅 " + items.length + "개 로드 완료");
  } catch (e) {
    console.log("⚠️ 내부 블로그 포스팅 로드 실패 (추측성 링크 생성 차단됨)");
  }
  const selectedNarrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
  const targetLangStr = lang === 'en' ? 'English (US)' : 'Korean';

  console.log("✍️ [STEP 3] AI 지문 파쇄 및 블로그 포스팅 원고 작성 중... (Angle 최적화)");
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: MASTER_GUIDELINE + "\n[CURRENT_DATE: " + currentDate + "]\n[LATEST_RESEARCH_DATA]:\n" + latestNews + "\n[SELECTED_PERSONA]: " + selectedNarrative + "\n[BLOG_ARCHIVES]:\n" + archiveContext + "\n[TARGET_TOPIC]: " + target + "\n[TARGET_LANGUAGE]: " + targetLangStr + extraPrompt }] }],
    generationConfig: { temperature: 0.8 }
  });
  const rawText = result.response.text();
  let data;
  try {
    data = JSON.parse(clean(rawText));
    if (data && data.content) {
      data.content = repairHTML(data.content);
    }
  } catch (err) {
    console.error("❌ [치명적 오류] AI가 생성한 JSON 데이터 파싱 실패!");
    console.error("[원음 데이터 시작]==============\n" + rawText.substring(0, 1000) + "\n==============[원음 데이터 끝]");
    throw err;
  }

  let finalTitle = data.title || target;
  const h1Match = data.content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    finalTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
    console.log("📌 H1 태그에서 제목 추출 완료: " + finalTitle);
  } else {
    console.log("💡 H1 태그 미발견, JSON title 필드 사용: " + finalTitle);
  }

  console.log("-----------------------------------------");
  console.log("📝 [💡 생성된 목차 및 뼈대 구조 확인]");
  const hRegex = new RegExp("<h[23][^>]*>(.*?)<\/h[23]>", "gi");
  const hTags = data.content.match(hRegex) || [];
  hTags.forEach(tag => {
    const isH3 = tag.startsWith("<h3");
    const text = tag.replace(/<[^>]+>/g, "").trim();
    console.log(isH3 ? "   ┗ 🔹 " + text : " 🔸 " + text);
  });
  console.log("-----------------------------------------");
  const [imgTop, imgMid1, imgMid2, imgBtm] = await Promise.all([
    genImg("TOP_IMG_1", data.image_prompts.IMG_1 || data.image_prompts["1"], finalTitle, model),
    genImg("MID_IMG_2", data.image_prompts.IMG_2 || data.image_prompts["2"], finalTitle, model),
    genImg("MID_IMG_3", data.image_prompts.IMG_3 || data.image_prompts["3"], finalTitle, model),
    genImg("BTM_IMG_4", data.image_prompts.IMG_4 || data.image_prompts["4"], finalTitle, model)
  ]);
  const wrapImg = (i) => '<div style="text-align:center; margin:35px 0;"><img src="' + i.url + '" alt="' + i.alt + '" title="' + i.title + '" style="width:100%; border-radius:15px;"><p style="font-size:12px; color:#888; margin-top:8px;">' + i.alt + '</p></div>';
  let content = cleanHTML(data.content);
  content = content
    .replaceAll('[[IMG_1]]', wrapImg(imgTop)).replaceAll('[[IMG_MID1]]', wrapImg(imgTop))
    .replaceAll('[[IMG_2]]', wrapImg(imgMid1)).replaceAll('[[IMG_MID2]]', wrapImg(imgMid1))
    .replaceAll('[[IMG_3]]', wrapImg(imgMid2)).replaceAll('[[IMG_MID3]]', wrapImg(imgMid2))
    .replaceAll('[[IMG_4]]', wrapImg(imgBtm)).replaceAll('[[IMG_BTM4]]', wrapImg(imgBtm)).replaceAll('[[IMG_BTM]]', wrapImg(imgBtm));
  if (!content.includes(imgTop.url)) content = wrapImg(imgTop) + content;
  console.log("✅ [STEP 4] 블로그 발행 준비 및 통합 완료");
  const fullHtml = content.replace(/>/g, '>\n').trim();

  const labels = Array.isArray(data.labels) ? data.labels : (data.labels || "").split(',').map(s => s.trim()).filter(s => s);
  const searchDesc = data.description || '';

  console.log("-----------------------------------------");
  console.log("📊 [발행 메타데이터 확인]");
  console.log("   ➤ 제목: " + finalTitle);
  console.log("   ➤ 라벨: " + labels.join(', '));
  console.log("   ➤ 검색 설명: " + (searchDesc ? searchDesc.substring(0, 50) + "..." : "없음"));
  console.log("-----------------------------------------");

  const res = await blogger.posts.insert({
    blogId: bId,
    requestBody: {
      title: finalTitle,
      labels: labels,
      content: fullHtml,
      customMetaData: searchDesc,
      published: pTime.toISOString()
    }
  });
  console.log("🎉 [STEP 5] 블로그 자동 포스팅 최종 발행 성공!!! (" + res.data.url + ")");
  return { url: res.data.url, title: data.title };
}

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const blogger = google.blogger({ version: 'v3', auth });
  const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));

  let clusters = config.clusters ? [...config.clusters] : [];
  for (let i = clusters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clusters[i], clusters[j]] = [clusters[j], clusters[i]];
  }

  let currentTimeOffset = Math.floor(Math.random() * 60);
  const baseTime = new Date();

  if (config.post_mode === 'cluster') {
    const subPosts = [];
    const seedTopic = config.pillar_topic || (clusters.length > 0 ? clusters[0] : "Life Efficiency");
    const planPrompt = "You are a professional blog content strategist. Based on the major topic \"" + seedTopic + "\", devise a 4-post content cluster strategy. " +
      "Each of the 4 sub-topics MUST be DRAMATICALLY distinct and cover a unique angle to avoid repetition. " +
      "Angle 1: Beginner's Comprehensive Guide & Concept (Example title style: 'What is X? A simple guide for starters'), " +
      "Angle 2: Advanced Technical Troubleshooting & Expert Secrets (Example title style: 'Hidden settings of X that experts use'), " +
      "Angle 3: Cost Analysis, Comparison & How to Choose services (Example title style: 'X vs Y: Honest cost comparison'), " +
      "Angle 4: Future Trends, Prevention & Pro-level Optimization (Example title style: 'How to maintain X for 10 years without issues'). " +
      "**CRITICAL**: DO NOT use the same words for all 4 titles. DO NOT just append words to the seed topic. Make each title look like a completely independent, high-click-through article. " +
      "Return ONLY a JSON array of 4 strings (unique, catchy titles) in " + (config.blog_lang === 'en' ? 'English' : 'Korean') + ". Example: [\"Title1\", \"Title2\", \"Title3\", \"Title4\"]";

    let subKeywords = [];
    try {
      const planRes = await model.generateContent(planPrompt);
      subKeywords = JSON.parse(clean(planRes.response.text()));
    } catch (e) {
      subKeywords = ["기본 가이드", "실전 팁", "문제 해결", "심화 분석"].map(a => seedTopic + " " + a);
    }

    const angles = [
      "Angle 1: Beginner's Comprehensive Guide (Focus on concepts, basic terms, and 'how to start')",
      "Angle 2: Advanced Expert Secrets (Focus on technical troubleshooting, deep optimization, and hidden pro-tips)",
      "Angle 3: Comparison & Cost Analysis (Focus on market prices, service comparisons, and 'how to choose' criteria)",
      "Angle 4: Future Trends & Prevention (Focus on new tech trends, long-term maintenance, and problem prevention)"
    ];

    const subPromises = subKeywords.slice(0, 4).map((subTarget, i) => {
      const postTime = new Date(baseTime.getTime() + ((currentTimeOffset + (i * 120)) * 60 * 1000));
      const angleDirective = "\n\n[CLUSTER_SUB_POST_ANGLE]: You are writing one of the 4 cluster posts. " +
        "Your specific perspective for THIS post is: **" + angles[i] + "**.\n" +
        "**CRITICAL**: DO NOT write a general guide. Stay strictly focused on this angle. " +
        "Your <h1> title MUST incorporate the essence of this angle and be DIFFERENT from a general title. " +
        "Ensure the [TARGET_TOPIC] provided is your core title foundation, but expand it to be catchy and unique.";

      return (async () => {
        try {
          return await writeAndPost(model, subTarget, blogger, config.blog_id, postTime, config.blog_lang, angleDirective);
        } catch (err) {
          return null;
        }
      })();
    });

    const subResults = await Promise.all(subPromises);
    subResults.forEach(r => { if (r && r.url) subPosts.push(r); });

    const pillarTime = new Date(baseTime.getTime() + ((currentTimeOffset + 500) * 60 * 1000));
    const subContext = subPosts.map((p, idx) => "[SUB_POST_" + (idx + 1) + "] Title: " + p.title + " / URL: " + p.url).join('\n');
    const btnText = config.blog_lang === 'en' ? '👉 Read the Full Guide' : '👉 자세한 세부 가이드 보러가기';
    const pillarAngleTitle = seedTopic + (config.blog_lang === 'en' ? " (The Ultimate Oracle Guide)" : " (종결판 마스터 가이드)");
    const extraPromptPillar = "\n\n[CLUSTER_MAIN_PILLAR_DIRECTIVE]: You are writing the MAIN PILLAR post (The Authority) that connects " + subPosts.length + " sub-posts.\n" +
      "Your title MUST be the most authoritative and comprehensive-sounding one.\n" +
      "Here are the published sub-posts:\n" + subContext + "\n" +
      "**CRITICAL RULE**: Do NOT put all links at the end or in the TOC. Instead, distribute them! For each H2 section, integrate the topic of one sub-post naturally, and AT THE VERY END of that H2 section, you MUST insert a highly visible HTML button linking to that SUB_POST URL.\n" +
      "Example button HTML: <div style='text-align:center; margin:20px 0;'><a href='[INSERT_URL_HERE]' style='display:inline-block; padding:12px 24px; background:#3b82f6; color:#fff; font-weight:bold; border-radius:8px; text-decoration:none;'>" + btnText + "</a></div>";

    await writeAndPost(model, pillarAngleTitle, blogger, config.blog_id, pillarTime, config.blog_lang, extraPromptPillar);
  } else {
    const target = clusters.length > 0 ? clusters[Math.floor(Math.random() * clusters.length)] : "Blog Post";
    await writeAndPost(model, target, blogger, config.blog_id, baseTime, config.blog_lang);
  }
}
run().catch(err => { process.exit(1); });