const {google} = require('googleapis');
const {GoogleGenerativeAI} = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

const MASTER_GUIDELINE = "당신은 10년 경력 생활 블로거입니다.\n\n## 절대 금지\n1. ** 별표 금지. <strong>만 사용\n2. * 금지. <em>만\n3. 마크다운 전면 금지\n4. h1 금지\n5. 날짜 표시 금지\n6. \"살펴보겠습니다/알아보겠습니다/마무리하겠습니다/정리해보겠습니다\" 금지\n7. 같은 종결어미 3회 연속 금지\n8. 같은 단어로 시작하는 문단 3회 연속 금지\n\n## 핵심\n- 5000자 이상\n- 말투: ~거든요, ~더라고요, ~같아요\n- 실패담 1개 필수\n- 비교 경험 1개 필수\n- FAQ 8-10개\n\n## 여백 (가독성 핵심!)\n- p 태그: margin:18px 0\n- h2 태그: margin:44px 0 20px\n- 박스: margin:24px 0\n- 문단 사이 충분한 간격 확보\n\n## h2 id 규칙\n- id=\"section1\" 같은 넘버링 금지!\n- 내용 기반 영문 슬러그: id=\"price-comparison\", id=\"real-experience\"\n- 목차 href와 h2 id 일치\n\n## 비교표 필수\n섹션 2~3에 <table> HTML 비교표 포함\n\n## 구조\n1. 도입부 2-3문단\n<p style=\"font-size:15px;line-height:1.8;color:#374151;margin:18px 0;\">텍스트</p>\n\n2. 목차\n<div style=\"background:linear-gradient(135deg,#E8F4FD,#DBEAFE);border-left:5px solid #3B82F6;border-radius:12px;padding:18px;margin:24px 0;\">\n목차 내용</div>\n\n3. 본문 4섹션\n<h2 id=\"영문슬러그\" style=\"font-size:21px;font-weight:bold;color:#1f2937;border-left:5px solid #1f2937;padding-left:14px;margin:44px 0 20px;\">제목</h2>\n\n4. 꿀팁박스\n<div style=\"background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-left:5px solid #22C55E;border-radius:12px;padding:16px;margin:24px 0;\">내용</div>\n\n5. 주의박스\n<div style=\"background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-left:5px solid #F59E0B;border-radius:12px;padding:16px;margin:24px 0;\">내용</div>\n\n6. FAQ 8-10개\n<h2 id=\"faq\" style=\"font-size:21px;font-weight:bold;color:#1f2937;border-left:5px solid #1f2937;padding-left:14px;margin:44px 0 20px;\">자주 묻는 질문</h2>\n<div style=\"background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border-left:5px solid #8B5CF6;border-radius:12px;padding:16px;margin:12px 0;\">\n<p style=\"margin:0 0 6px;font-weight:bold;font-size:15px;color:#5B21B6;\">Q. 질문</p>\n<p style=\"margin:0;color:#374151;line-height:1.8;font-size:14px;\">A. 답변</p></div>\n\n7. 내부링크 버튼 (CLUSTER_HUB 전용)\n<div style=\"text-align:center;margin:20px 0;\"><a href=\"링크\" target=\"_self\" style=\"display:inline-block;background:#EF4444;color:#FFF;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;\">버튼텍스트</a></div>\n\n8. 마무리\n9. 작성자 소개\n10. 면책조항";
const STYLE = "<style>\n  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');\n  .v-body { font-family: 'Noto Sans KR', sans-serif; color: #374151; line-height: 1.8; font-size: 15px; max-width: 800px; margin: 0 auto; word-break: keep-all; }\n  .v-body p { margin: 18px 0; }\n  .v-body h2 { font-size: 21px; font-weight: bold; color: #1f2937; border-left: 5px solid #1f2937; padding-left: 14px; margin: 44px 0 20px; }\n  .v-body table { width: 100%; border-collapse: collapse; margin: 30px 0; border: 1px solid #e5e7eb; }\n  .v-body th, .v-body td { padding: 12px; border: 1px solid #e5e7eb; text-align: center; }\n  .v-body strong { color: #111; font-weight: 700; }\n</style>\n<div class=\"v-body\">";
const NARRATIVE_HINTS = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 개인적인 경험에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠을 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보고 싶습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요."];

let reportContent = '# 🚀 VUE Cluster Deployment Report\n\n'; 
reportContent += `📅 **Generated at:** ${new Date().toLocaleString('ko-KR')}\n\n`;

function report(msg, type = 'info') {
    const now = new Date().toLocaleTimeString('ko-KR');
    const prefix = type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');
    const line = `[${now}] ${prefix} ${msg}`;
    console.log(line);
    reportContent += line + '  \n';
}

async function uploadReport() {
    if(!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) return;
    try {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const path = 'DEPLOYMENT_REPORT.md';
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' };
        const existing = await axios.get(url, { headers }).catch(() => null);
        const sha = existing ? existing.data.sha : undefined;
        await axios.put(url, { message: 'Update Deployment Report', content: Buffer.from(reportContent).toString('base64'), sha }, { headers });
        console.log('📄 [REPORT]: DEPLOYMENT_REPORT.md 업로드 완료.');
    } catch(e) { console.log('⚠️ [REPORT ERROR]: ' + e.message); }
}

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/\`\`\`(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') return t.trim();
    try {
        const start = t.indexOf('{'), end = t.lastIndexOf('}');
        const startArr = t.indexOf('['), endArr = t.lastIndexOf(']');
        let jsonStr = '';
        if (defType === 'obj' && start !== -1 && end !== -1) jsonStr = t.substring(start, end + 1);
        else if (defType === 'arr' && startArr !== -1 && endArr !== -1) jsonStr = t.substring(startArr, endArr + 1);
        if (jsonStr) {
            jsonStr = jsonStr.replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
            return jsonStr;
        }
    } catch(e) { }
    return defType === 'obj' ? '{ }' : '[]';
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A TOP-TIER BLOGGER.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        if (String(e.message).includes('429') && retry < 5) {
            await new Promise(res => setTimeout(res, Math.pow(2, retry) * 15000));
            return callAI(model, prompt, retry + 1);
        }
        return '';
    }
}

async function searchSerper(query) {
    if(!process.env.SERPER_API_KEY) return '';
    try {
        const r = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': process.env.SERPER_API_KEY } });
        return r.data.organic.slice(0, 5).map(o => o.title + ': ' + o.snippet).join('\n');
    } catch(e) { return ''; }
}

async function genThumbnail(meta, model) {
    try {
        report('🎨 [IMG_0]: 썸네일 제작 시작 (주제: ' + meta.mainTitle + ')');
        const bgUrl = await genImg(meta.bgPrompt, model, 0, true);
        const canvas = createCanvas(1200, 630);
        const ctx = canvas.getContext('2d');
        const bg = await loadImage(bgUrl);
        ctx.drawImage(bg, 0, 0, 1200, 630);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; ctx.fillRect(0, 0, 1200, 630);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 15; ctx.strokeRect(40, 40, 1120, 550);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px sans-serif'; ctx.fillText(meta.tag || 'EXCLUSIVE', 100, 120);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 80px sans-serif';
        const lines = meta.mainTitle.match(/.{1,15}/g) || [meta.mainTitle];
        lines.forEach((l, i) => ctx.fillText(l, 100, 240 + (i * 100)));
        ctx.fillStyle = '#f3f4f6'; ctx.font = '40px sans-serif'; ctx.fillText(meta.subTitle || '', 100, 520);
        const buffer = canvas.toBuffer('image/jpeg');
        const form = new FormData(); form.append('image', buffer.toString('base64'));
        const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, {headers: form.getHeaders() });
        return ir.data.data.url;
    } catch(e) { console.log('      ⚠️ [썸네일 오류]: ' + e.message); return ''; }
}

async function genImg(prompt, model, i, skipUpload = false) {
    if(!prompt) return '';
    const engPrompt = prompt.replace(/[^a-zA-Z0-9, ]/gi, '').trim() + ', hyper-realistic, 8k';
    let url = '';
    if(process.env.KIE_API_KEY) {
        try {
            const r = await axios.post('https://api.runware.ai/v1', [{ action: 'R_IMAGE_INFERENCE', model: 'runware:100@1', prompt: engPrompt, width: 1280, height: 720 }], { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
            url = r.data.data?.[0]?.imageURL;
        } catch(e) {}
    }
    if(!url) url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
    if(skipUpload || !process.env.IMGBB_API_KEY) return url;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
        const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + process.env.IMGBB_API_KEY, form, {headers: form.getHeaders() });
        return ir.data.data.url;
    } catch(e) { return url; }
}

async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    const searchData = await searchSerper(target);
    let clusterContext = '';
    if(extraLinks.length > 0) {
        clusterContext = '\\n[CLUSTER_HUB] 메인 글 작성 중. 서브 글들을 섹션마다 요약하고 버튼(현재창)을 넣으시오: ' + JSON.stringify(extraLinks);
    }
    report(`🔥 [포스팅 ${idx}/${total}]: '${target}' 집필 및 발행 시작...`);
    const m1 = await callAI(model, MASTER_GUIDELINE + '\\n[주제]: ' + target + '\\n' + searchData + '\\n\\n블로그 글 작성.\\n- 5000자 이상 필수\\n- 비교표 <table> 필수\\n- FAQ 8-10개 필수\\n- ** 절대 금지, <strong>만 사용\\n- 실패담 1개, 비교 경험 1개 필수' + clusterContext);
    report(`   - 미션 1 완료 (${m1.length}자)`);
    const m2 = await callAI(model, MASTER_GUIDELINE + '\\n[이어서 작성] 이전 내용을 완벽하게 이어받아 나머지 목차 섹션들을 5,000자 이상 풍부하게 완성하라. 절대 중복 금지.\\n[이전 내용]: ' + m1);
    report(`   - 미션 2 완료 (${m2.length}자)`);
    const fullRaw = m1 + '\\n' + m2;
    const img0Regex = /IMG_0:\s*\\{?\\s*mainTitle:\s*["\'](.*?)["\'],\s*subTitle:\s*["\'](.*?)["\'],\s*tag:\s*["\'](.*?)["\'],\s*bgPrompt:\s*["\'](.*?)["\']\\s*\\}?/i;
    const m0 = fullRaw.match(img0Regex);
    let finalHtml = clean(fullRaw, 'text');
    if(m0 && finalHtml.includes('[[IMG_0]]')) {
        const url = await genThumbnail({ mainTitle: m0[1], subTitle: m0[2], tag: m0[3], bgPrompt: m0[4] }, model);
        finalHtml = finalHtml.split('[[IMG_0]]').join(`<img src='${url}' alt='Thumbnail' style='width:100%; border-radius:15px; margin-bottom:40px;'>`);
    }
    for(let i=1; i<=4; i++) {
        if(finalHtml.includes('[[IMG_'+i+']]')) {
            const url = await genImg(target + ' professional photo ' + i, model, i);
            finalHtml = finalHtml.split('[[IMG_'+i+']]').join(`<img src='${url}' alt='Image ${i}' style='width:100%; border-radius:12px; margin:30px 0;'>`);
        }
    }
    const post = await blogger.posts.insert({ blogId: bId, requestBody: { title: target, content: STYLE + finalHtml, published: pTime.toISOString() } });
    report(`✨ [완료]: '${target}' 블로그 게시 성공!`, 'success');
    return { title: target, url: post.data.url };
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const seed = config.pillar_topic || config.clusters[0];
    const subLinks = [];
    report(`🎬 클러스터 프로젝트 개시: ${seed}`);
    
    const clusterVibe = [
      ' 실전 해결 전략 및 자가 진단 가이드',
      ' 수리비 0원 도전 핵심 조치 비법',
      ' 전문가도 모르는 숨겨진 꿀팁과 주의사항',
      ' 실제 사례로 본 최적의 대응 프로세스'
    ];

    for(let i=0; i<4; i++) {
        const targetSub = config.clusters[i] || (seed + clusterVibe[i]);
        const r = await writeAndPost(model, targetSub, 'ko', blogger, config.blog_id, new Date(Date.now() + i*21600000), [], i+1, 5);
        subLinks.push(r);
    }
    report('🏆 메인 필러 포스트(허브) 집필 시작...');
    await writeAndPost(model, seed + ' 완벽 종결판: 당신의 고민을 비웃듯 해결하는 법', 'ko', blogger, config.blog_id, new Date(Date.now() + 86400000), subLinks, 5, 5);
    report('🌈 모든 클러스터 작업이 성공적으로 종료되었습니다.', 'success');
    await uploadReport();
}
run();