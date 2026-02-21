const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const MASTER_GUIDELINE = `
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
   - 사실적 사진 묘사를 담은 이미지 프롬프트 [IMAGE_PROMPT: 묘사] 1개 필수.

================================================================
[VUE SIGNATURE: 인트로 서사 라이브러리 (20개 전문)]
================================================================
※ 모든 섹션 도입부에 아래 리스트에서 랜덤 선택하여 3문장 이상의 1인칭 서사를 반드시 작성하십시오.
① "제가 직접 해본 결과, 역시 이론보다는 실전이 제일 중요하더라고요..." (중략: 20개 라이브러리 엔진 내장됨)

[VUE SIGNATURE: 비유 및 수치 라이브러리 (35종 전문)]
- 섹션당 비유 표현 1개 이상 필수 사용 (다이어트, 마법봉, 좀비, 레고 블록 등)
- 수치 데이터 표현 전문 수시 활용 (신뢰도 확보)

================================================================
[SEO & REVENUE RULES: 애드센스 규격 전문]
================================================================
1. 상단 광고 클릭 유도: 모든 h2 제목 위에 48px의 margin-top을 적용하십시오.
2. 모바일 가독성: 한 문단은 무조건 2~3문장만. <p style="margin-bottom: 20px;"> 태그 강제 적용.
3. 이미지 SEO: alt/title 속성 기입.
4. JSON-LD 스키마: Article, FAQPage 스키마 스크립트 필수 기입.

[CONSTRAINTS: 절대 금지 및 강제 사항]
- 금지: "먼저", "다음으로", "마지막으로" 식의 지루한 접속사 반복 사용 절대 금지.
- 금지: "살펴보겠습니다", "알아보시죠", "도움이 되길 바랍니다" 등 AI 상투어구 사용 금지.
- 강제: 한국어 12,000자 미만의 함량 미달글 생성 시 실패로 간주함.
`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 15px; margin: 25px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: block; }
  .h2-premium { background-color: moccasin; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 30px 0; text-align: center; border: 2px solid #333; }
  .vue-premium th { background-color: #333; color: white; padding: 15px; }
  .vue-premium td { padding: 12px; border: 1px solid #dee2e6; }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') return t.replace(/<!DOCTYPE.*?>|<html.*?>|<\\/html>|<head.*?>[\\s\\S]*?<\\/head>|<body.*?>|<\\/body>|<title.*?>[\\s\\S]*?<\\/title>/gi, '').trim();
    try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function genImg(desc, model) {
    if(!desc) return ''; const imgbbKey = process.env.IMGBB_API_KEY;
    let ep = desc; try { const t = await callAI(model, 'Translate ONLY English: ' + desc); ep = t.replace(/[^a-zA-Z0-9, ]/g, ''); } catch(e){}
    let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(ep)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        const form = new FormData(); form.append('image', Buffer.from(res.data).toString('base64'));
        const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
        return ir.data.data.url;
    } catch(e) { return url; }
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('🚀 12K Premium Post: ' + target);
    const bpRes = await callAI(model, `Return ONLY JSON for "${target}": {"title":"...","chapters":["ch1","ch2","ch3","ch4","ch5","ch6","ch7"]}`);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const chapters = bp.chapters || [];
    const hero = await genImg(title, model);
    let body = STYLE + '<div class="vue-premium">' + (hero ? `<img src="${hero}">` : '');
    body += '<div class="toc-box"><h2>목차</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    // 1~7개 섹션 집필 (섹션당 1,500자 이상 강제)
    const colors = ['moccasin', 'lightpink', 'palegreen', 'skyblue', 'plum', 'lightsalmon', '#98d8c8'];
    for(let i=0; i<chapters.length; i++) {
        console.log(`   ㄴ Section ${i+1} Writing...`);
        const sect = clean(await callAI(model, MASTER_GUIDELINE + `\n\nMISSION: Write Chapter ${i+1}: ${chapters[i]} (Target: ${target}). MUST be over 1,500 chars. Use 4x4 Table & [IMAGE_PROMPT].`), 'text');
        const pMatch = sect.match(/\\[IMAGE_PROMPT:\\s*([\\s\\S]*?)\\]/);
        let htmlSect = sect;
        if(pMatch) { const img = await genImg(pMatch[1], model); htmlSect = sect.replace(pMatch[0], `<img src="${img}">`); }
        body += `<div class="h2-premium" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect;
    }
    body += '</div>';
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || []; if(!pool.length) return;
    const seed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    await writeAndPost(model, seed, blogger, config.blog_id, new Date());
    fs.writeFileSync('cluster_config.json', JSON.stringify({...config, clusters: pool}, null, 2));
}
run();