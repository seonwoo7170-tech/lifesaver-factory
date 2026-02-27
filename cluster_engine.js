
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠을 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요.","처음의 그 당혹감을 이겨내고 나니 비로소 보이는 것들이 있었습니다. 막다른 길이라고 생각했던 곳이 사실은 새로운 시작점이었더라고요.","댓글로 많은 분들이 응원해주시는 덕분에 오늘 날 잡고 제대로 정리해봅니다. 제가 아는 모든 것을 가감 없이 쏟아부으려고 해요.","국내 자료만으로는 부족해서 제가 직접 해외 포럼과 논문까지 샅샅이 뒤져가며 검증했습니다. 교차 검증을 마친 데이터만 담았습니다.","단순한 추측이 아니라 지난 6개월간 제가 직접 수치를 추적하고 분석한 결과입니다. 숫자는 절대로 거짓말을 하지 않으니까요.","글을 다 읽고 나서 '아, 이거 미리 알았더라면' 하고 후회하지 않으시도록, 핵심 포인트를 아주 꼼꼼하게 짚어드릴게요.","가까운 친동생이나 친구에게 비밀 꿀팁을 전해주듯, 아주 편하고 솔직하게 풀어보겠습니다. 복잡한 용어는 최대한 쉽게 설명해드릴게요.","자전거를 처음 배울 때와 비슷합니다. 한 번 원리만 깨우치면 그 이후로는 몸이 알아서 반응하게 되는, 그런 본질적인 감각을 전해드릴게요.","많은 분들이 의외의 부분에서 큰 경제적 손해를 보고 계시더라고요. 제가 그 오류들을 하나씩 진단해보고 해결책을 제시하겠습니다.","일반적인 블로그 글이 아니라 전문 서적과 최신 논문까지 파헤치며 정리한 깊이 있는 콘텐츠입니다. 정보의 밀도가 다를 거예요.","작업을 진행하다 발견한 의외의 반전 때문에 저도 깜짝 놀랐습니다. 아마 여러분도 이 글을 읽시면 무릎을 탁 치게 될 거예요.","오늘 이 글이 여러분의 인생이나 사업에 작은 터닝포인트가 되기를 확신합니다. 제가 느꼈던 그 전율을 여러분도 함께 느끼셨으면 좋겠어요."];
const MASTER_GUIDELINE = `# [SYSTEM ROLE: VUE-ORACLE-V1.7.5-VISUAL-MASTER]
- 당신은 전문 라이터이자 블로그 마케팅 전문가입니다.
- **반드시 JSON 형식으로만 응답**하세요.

## ════ PART 0 — AI 검열 회피 및 구조 지침 ════
1. **고스트 ID**: 모든 h2 id 및 TOC 링크는 주제 관련 영문 키워드 무작위 조합 (section1 절대 금지).
2. **라벨(labels)**: 주제와 밀접한 7~10개의 고점성 키워드 배열.
3. **타이틀 분리**: h1은 JSON 'title' 필드에만 넣고 본문에서는 제외.
4. **이미지 개념(image_prompt)**: 본문의 핵심 메시지를 담은 고품격 비주얼 묘사 (영어).
5. **서사 퀄리티**: 4,000자 이상 고밀도 대화체. '~거든요', '~잖아요'.

## ════ PART 1 — 출력 형식 ════
{
  "title": "SEO 후킹 제목",
  "labels": ["라벨1", "라벨2", ... 10개],
  "description": "150자 검색 설명",
  "image_prompt": "Detailed English visual description for image generation",
  "content": "HTML 본문 (TOC부터 시작, ghost-id 적용)"
}`;

function clean(raw) {
    if(!raw) return '';
    let t = raw.replace(/```(json|html)?/gi, '').trim();
    if (t.startsWith('{') && t.endsWith('}')) return t;
    const match = t.match(/\\{.*?\\}/s);
    return match ? match[0] : t;
}

// AI 특유의 마크다운 기호 제거 및 HTML 강제 변환
function cleanHTML(h){
    var c=h;
    c=c.replace(/<h1[^>]*>.*?<\/h1>/gi,'');
    var sc=0;while(c.indexOf('**')!==-1&&sc<50){c=c.replace(/\\*\\*([^*]*?)\\*\\*/g,'<strong>$1</strong>');sc++;}
    c=c.replace(/\\*\\*/g,'');
    c=c.replace(/\\*/g,'');
    return c.trim();
}

async function genImg(prompt, title, model) {
    const kieKey = process.env.KIE_API_KEY;
    const imgbbKey = process.env.IMGBB_API_KEY;
    let imageUrl = '';

    console.log("🎨 [비주얼] 컨셉 설계 중: " + prompt.slice(0, 50) + "...");

    if (kieKey) {
        try {
            console.log("   ㄴ [Kie.ai] 이미지 렌더링 시작 (z-image)...");
            const res = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', {
                model: 'z-image',
                input: { prompt: prompt + ", editorial photography, 8k, professional lighting", aspect_ratio: "16:9" }
            }, { headers: { Authorization: 'Bearer ' + kieKey } });
            const tid = res.data.taskId || res.data.data?.taskId;
            if (tid) {
                // 폴링 시간 확대 (최대 180초 대기)
                for (let i = 0; i < 60; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    const check = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
                    const st = check.data.state || check.data.data?.state;
                    if (st === 'success') {
                        const rj = check.data.resultJson || check.data.data?.resultJson;
                        const rurls = typeof rj === 'string' ? JSON.parse(rj).resultUrls : rj.resultUrls;
                        imageUrl = rurls[0]; break;
                    }
                    if (st === 'failed') break;
                }
            }
        } catch(e) { console.log("   ⚠️ Kie.ai 통신 지연"); }
    }

    if (imageUrl && imgbbKey) {
        try {
            console.log("   ㄴ [SEO] Alt 텍스트 생성 중...");
            const altRes = await model.generateContent("Create a descriptive Korean alt text (30-50 chars) for an image of: " + prompt + ". Only output the Korean text.");
            const altText = altRes.response.text().trim().replace(/["']/g, '');

            console.log("   ㄴ [ImgBB] 영구 클라우드 보관소 전송 중...");
            const form = new FormData();
            form.append('image', imageUrl); // URL 직접 전송 방식
            const upload = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            
            return { url: upload.data.data.url, alt: altText };
        } catch(e) { return { url: imageUrl, alt: title }; }
    }
    return { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280", alt: title };
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log("🚀 [1/4] 데이터 분석: 블로그 아카이브 분석 및 경쟁 키워드 추출...");
    const archiveRes = await blogger.posts.list({ blogId: bId, maxResults: 500, fields: 'items(title,url)' });
    const shuffled = (archiveRes.data.items || []).sort(() => 0.5 - Math.random()).slice(0, 30);
    const archiveContext = shuffled.map(p => p.title + " (" + p.url + ")").join("\n");

    console.log("✍️ [2/4] 서사 구성: 오라클 원샷 엔진 가동 (고밀도 스토리텔링)...");
    const selectedNarrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
    const prompt = MASTER_GUIDELINE + "\n\n[SELECTED PERSONA: " + selectedNarrative + "]\n[BLOG ARCHIVES]:\n" + archiveContext + "\n\n[TARGET TOPIC: " + target + "]";

    const result = await model.generateContent(prompt);
    const data = JSON.parse(clean(result.response.text()));

    console.log("🖼️ [3/4] 비주얼 자산: Kie.ai + ImgBB 하이브리드 파이프라인 가동...");
    const imgData = await genImg(data.image_prompt, data.title, model);
    const imgHtml = `<div style="text-align:center; margin-bottom: 30px;"><img src="${imgData.url}" alt="${imgData.alt}" title="${data.title}" style="width:100%; border-radius:15px;"><p style="font-size:12px; color:#888; margin-top:8px;">${imgData.alt}</p></div>`;
    
    // 본문 클리닝 및 이미지 통합
    const cleanedContent = cleanHTML(data.content);
    const fullContent = imgHtml + cleanedContent;

    console.log("✅ [4/4] 최종 발행: 메타 데이터 동기화 및 구글 서버 전송!");
    await blogger.posts.insert({ 
        blogId: bId, 
        requestBody: { 
            title: data.title || target, 
            labels: data.labels || [],
            content: fullContent, 
            customMetaData: data.description || '',
            published: pTime.toISOString() 
        } 
    });
    console.log("✨ 발행 성공: " + (data.title || target));
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
