
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔식히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","가까운 친동생이나 친구에게 비밀 꿀팁을 전해주듯, 아주 편하고 솔직하게 풀어보겠습니다. 복잡한 용어는 최대한 쉽게 설명해드릴게요.","단순한 추측이 아니라 지난 6개월간 제가 직접 수치를 추적하고 분석한 결과입니다. 숫자는 절대로 거짓말을 하지 않으니까요.","오늘 이 글이 여러분의 인생이나 사업에 작은 터닝포인트가 되기를 확신합니다. 제가 느꼈던 그 전율을 여러분도 함께 느끼셨으면 좋겠어요."];
const MASTER_GUIDELINE = `# [SYSTEM ROLE: VUE-ORACLE-V1.6.5-GHOST]
- 당신은 전문 기술 블로거이자 검색 알고리즘 회피 전문가입니다.
- **JSON 형식으로만 응답**하고, HTML 구조를 의도적으로 변칙 배치하세요.

## ════ PART 0 — AI 검열 회피 지침 ════
1. **고스트 ID(Ghost ID)**: 모든 h2 및 TOC 링크 id/href는 주제 관련 영문 키워드의 무작위 조합으로 생성하세요. **'section', 'chapter', 'id1' 등 규칙적인 단어는 절대 금지됩니다.** (예: id="wifi-drop-fix-experience")
2. **라벨(labels)**: 7~10개의 고점성 키워드 배열 (예: ["갤럭시꿀팁", "와이파이포화", "자취방인테리어", ...]).
3. **HTML 패턴 파쇄**: 강조 박스의 디자인 수치(padding, margin, border-radius)를 1~3px씩 매번 미세하게 다르게 작성하여 '템플릿 지문'을 지우세요.
4. **타이틀/메타**: title 필드에 후킹 문구, description 필드에 150자 검색 요약. (h1은 본문 제외)

## ════ PART 1 — 서사 무결성 ════
- 고밀도 텍스트(4,000자 이상). 대화체 100%.
- [BLOG ARCHIVES] 리스트 중 3개를 골라 본문 하단에 자연스럽게 링크 삽입.`;

function clean(raw) {
    if(!raw) return '';
    let t = raw.replace(/```(json|html)?/gi, '').trim();
    if (t.startsWith('{') && t.endsWith('}')) return t;
    const match = t.match(/\\{.*?\\}/s);
    return match ? match[0] : t;
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log("�️ 고스트 모드 아카이브 분석 중...");
    const archiveRes = await blogger.posts.list({ blogId: bId, maxResults: 500, fields: 'items(title,url)' });
    const shuffledArchives = (archiveRes.data.items || []).sort(() => 0.5 - Math.random()).slice(0, 30);
    const archiveContext = shuffledArchives.map(p => p.title + " (" + p.url + ")").join("\n");

    const selectedNarrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
    const prompt = MASTER_GUIDELINE + "\n\n" +
      "[SELECTED PERSONA: " + selectedNarrative + "]\n" +
      "[BLOG ARCHIVES FOR INTERNAL LINKS]:\n" + archiveContext + "\n\n" +
      "[TARGET TOPIC: " + target + "]\n\n" +
      "위 정보를 기반으로 'Ghost ID' 규칙을 엄수하여 아래 JSON 형식으로만 최종 완성하세요.\n" +
      "{\n" +
      "  \"title\": \"글 제목 (후킹)\",\n" +
      "  \"labels\": [\"라벨1\", \"라벨2\", ... 10개까지],\n" +
      "  \"description\": \"검색 엔진용 메타 설명\",\n" +
      "  \"content\": \"HTML 본문 (TOC부터 배치, ghost-id 사용)\"\n" +
      "}";

    const result = await model.generateContent(prompt);
    const data = JSON.parse(clean(result.response.text()));

    await blogger.posts.insert({ 
        blogId: bId, 
        requestBody: { 
            title: data.title || target, 
            labels: data.labels || [],
            content: data.content, 
            customMetaData: data.description || '',
            published: pTime.toISOString() 
        } 
    });
    console.log("✅ [Ghost Mode Success] 포스팅 완료: " + (data.title || target));
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const target = config.clusters[Math.floor(Math.random()*config.clusters.length)];
    await writeAndPost(model, target, blogger, config.blog_id, new Date());
}
run();
