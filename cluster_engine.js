
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠을 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요.","처음의 그 당혹감을 이겨내고 나니 비로소 보이는 것들이 있었습니다. 막다른 길이라고 생각했던 곳이 사실은 새로운 시작점이었더라고요.","댓글로 많은 분들이 응원해주시는 덕분에 오늘 날 잡고 제대로 정리해봅니다. 제가 아는 모든 것을 가감 없이 쏟아부으려고 해요.","국내 자료만으로는 부족해서 제가 직접 해외 포럼과 논문까지 샅샅이 뒤져가며 검증했습니다. 교차 검증을 마친 데이터만 담았습니다.","단순한 추측이 아니라 지난 6개월간 제가 직접 수치를 추적하고 분석한 결과입니다. 숫자는 절대로 거짓말을 하지 않으니까요.","글을 다 읽고 나서 '아, 이거 미리 알았더라면' 하고 후회하지 않으시도록, 핵심 포인트를 아주 꼼꼼하게 짚어드릴게요.","가까운 친동생이나 친구에게 비밀 꿀팁을 전해주듯, 아주 편하고 솔직하게 풀어보겠습니다. 복잡한 용어는 최대한 쉽게 설명해드릴게요.","자전거를 처음 배울 때와 비슷합니다. 한 번 원리만 깨우치면 그 이후로는 몸이 알아서 반응하게 되는, 그런 본질적인 감각을 전해드릴게요.","많은 분들이 의외의 부분에서 큰 경제적 손해를 보고 계시더라고요. 제가 그 오류들을 하나씩 진단해보고 해결책을 제시하겠습니다.","일반적인 블로그 글이 아니라 전문 서적과 최신 논문까지 파헤치며 정리한 깊이 있는 콘텐츠입니다. 정보의 밀도가 다를 거예요.","작업을 진행하다 발견한 의외의 반전 때문에 저도 깜짝 놀랐습니다. 아마 여러분도 이 글을 읽시면 무릎을 탁 치게 될 거예요.","오늘 이 글이 여러분의 인생이나 사업에 작은 터닝포인트가 되기를 확신합니다. 제가 느꼈던 그 전율을 여러분도 함께 느끼셨으면 좋겠어요."];
const COLORS = ["moccasin","lightpink","palegreen","skyblue","plum","lightsalmon","#98d8c8"];
const MASTER_GUIDELINE = `# [VUE POST v3.0 — 통합 멀티플랫폼 블로그 에이전트 지침]
당신은 15년 차 시니어 컨설턴트이자 'WisdomPick' 수준의 고퀄리티 블로거입니다.

## ════ PART 0 — 절대 규칙 ════
- 1순위: 금지 표현 제로 (요소/소개/살펴/정리/총정리/첫째/둘째 등 AI 패턴 박멸)
- 2순위: 플랫폼 호환 HTML (인라인 style 속성만 사용, <style> 사용 금지)
- 3순위: E-E-A-T 서사 품질 (1인칭 경험 서사가 글 전체를 관통)

## ════ PART A~D — 핵심 철학 및 문체 ════
- 적게(박스 절제), 정확하게(데이터 출처), 진짜처럼(불규칙한 리듬), 돈 되게(체류시간 극대화)
- 분량: 4,000~5,500자 (YMYL 주제인 경우 6,500자까지 확장)
- 말투: 구어체 (~거든요, ~더라고요, ~잖아요), 1인칭 시점
- 리듬: 문장/문단 길이를 의도적으로 들쭉날쭉하게 배치하여 AI 균등 패턴 회피

## ════ PART F~H — 구조 및 디자인 ════
- [H1] -> [목차(파스텔 블루)] -> [스니펫(150자)] -> [후킹] -> [본문 h2 6~7개] -> [FAQ 5개] -> [면책] -> [관련글] -> [마무리] -> [Schema]
- h2 배경색: moccasin, lightpink, palegreen, skyblue, plum, lightsalmon, #98d8c8 순차 적용
- 강조 박스 4종 (인라인 스타일 필수):
  (A) 경험담 (#ECFDF5 / 보더 #22C55E)
  (B) 꿀팁 (#FEFCE8 / 보더 #EAB308)
  (C) 주의 (#FEF2F2 / 보더 #EF4444)
  (D) 데이터 근거 (#EEF2FF / 보더 #6366F1)
- 테이블: 3열 이하, 인라인 테두리, 배경색 활용

## ════ PART J~M — 품질 및 최적화 ════
- 경험 신호: 구체적 수치, 실패/후회/반전 서사, 감각적 디테일 포함
- 검색 의도(정보/비교/후기/거래)에 따른 흐름 설계
- 금지: "요청하신", "작성해 드렸습니다", "안내드립니다", "도움이 되셨으면", id="section1" 같은 넘버링`;

function clean(raw, type = 'text') {
    if(!raw) return '';
    let t = raw.replace(/```(json|html)?/gi, '').trim();
    if(type === 'text') {
        const filters = [['<!DOCTYPE.*?>', 'gi', ''], ['<html.*?>', 'gi', ''], ['</html>', 'gi', ''], ['<head.*?>[\\s\\S]*?</head>', 'gi', ''], ['<body.*?>', 'gi', ''], ['</body>', 'gi', ''], ['^#.*$', 'gm', ''], ['\\*\\*(.*?)\\*\\*', 'g', '<b>$1</b>']];
        filters.forEach(([p, f, r]) => { t = t.replace(new RegExp(p, f), r); });
    }
    return t.trim();
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log("📝 주제: " + target + " 관련 원샷(One-Shot) 서사 구성 중...");
    
    const prompt = MASTER_GUIDELINE + "\n\n" +
      "[TARGET TOPIC: " + target + "]\n\n" +
      "위 지침에 따라 다음 구조로 '전체 HTML 소스코드'만 출력하세요.\n" +
      "1. <h1> 제목 (경험 신호 포함)\n" +
      "2. 📋 목차 (파스텔 블루 박스, 앵커 링크 포함)\n" +
      "3. 스니펫 도입부 (150자 이내)\n" +
      "4. 본문 h2 섹션 6~7개 (지침의 7종 배경색 순차 적용)\n" +
      "5. FAQ 5개 (Schema 포함)\n" +
      "6. 면책조항, 관련글, 마무리 박스 (CTA 포함)\n" +
      "7. 맨 뒤에 Article & FAQ JSON-LD Schema\n\n" +
      "※ 주의사항: \n" +
      "- 4,000~5,500자 분량을 단 한 번의 출력으로 완성할 것.\n" +
      "- 섹션마다 서사가 끊기지 않고 물 흐르듯 이어지게 작성할 것.\n" +
      "- 인라인 스타일만 사용하고 금지 표현을 절대 쓰지 말 것.";

    const result = await model.generateContent(prompt);
    const fullHtml = clean(result.response.text(), 'text');
    
    if (!fullHtml || fullHtml.length < 500) {
        throw new Error("컨텐츠 생성량이 너무 적거나 실패했습니다.");
    }

    await blogger.posts.insert({ 
        blogId: bId, 
        requestBody: { 
            title: target, 
            content: fullHtml, 
            published: pTime.toISOString() 
        } 
    });
    console.log("✅ 포스팅 완료: " + target);
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const main = config.clusters[Math.floor(Math.random()*config.clusters.length)];
    await writeAndPost(model, main, blogger, config.blog_id, new Date());
}
run();
