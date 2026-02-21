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
`;

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 35px auto; padding: 30px; background:#fff; border-radius:30px; box-shadow:0 15px 50px rgba(0,0,0,0.06); word-break:keep-all; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 20px; margin: 35px 0; box-shadow: 0 12px 40px rgba(0,0,0,0.12); display: block; }
  .h2-premium { background-color: moccasin; border-radius: 12px; color: #000; font-size: 24px; font-weight: bold; margin-top: 60px; padding: 20px; border-left: 12px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2.5px solid #333; border-radius: 20px; padding: 35px; margin: 45px 0; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 40px 0; text-align: center; border: 3px solid #333; border-radius:15px; overflow:hidden; }
  .vue-premium th { background-color: #333; color: white; padding: 18px; font-weight: bold; }
  .vue-premium td { padding: 15px; border: 1px solid #eee; background:#fff; }
  .vue-premium tr:nth-child(even) td { background:#fafafa; }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<!DOCTYPE.*?>/gi, '').replace(/<html.*?>/gi, '').replace(/<\\/html>/gi, '').replace(/<head.*?>[\\s\\S]*?<\\/head>/gi, '').replace(/<body.*?>/gi, '').replace(/<\\/body>/gi, '').replace(/<title.*?>[\\s\\S]*?<\\/title>/gi, '');
        return t.trim();
    }
    try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { console.log('Wait 20s...'); await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(fileData) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME; if(!cloudName) return null;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;
    try {
        const crypto = require('crypto'); const ts = Math.round(Date.now()/1000);
        const sig = crypto.createHash('sha1').update('timestamp='+ts+cloudSecret).digest('hex');
        const form = new FormData(); form.append('file', fileData); form.append('timestamp', String(ts));
        form.append('api_key', cloudKey); form.append('signature', sig);
        const r = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, { headers: form.getHeaders(), timeout: 120000 });
        return r.data.secure_url;
    } catch(e) { console.log('   ⚠️ Cloudinary Upload Failed: ' + e.message); return null; }
}

async function genImg(desc, model) {
    if(!desc) return '';
    let ep = desc; try { const t = await callAI(model, 'Translate English: ' + desc); ep = t.replace(/[^a-zA-Z0-9, ]/g, ''); } catch(e){}
    console.log('   ㄴ [이미지 생성 전초전] ' + ep.slice(0, 35) + '...');
    let imageUrl = '';
    if(process.env.KIE_API_KEY) {
        try {
            const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: ep + ', professional photography, highly detailed, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
            const tid = cr.data.taskId || cr.data.data?.taskId;
            if(tid) {
                for(let i=0; i<15; i++) {
                    await new Promise(r => setTimeout(r, 7000));
                    const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
                    if((pr.data.state || pr.data.data?.state) === 'success') {
                        const resJson = typeof pr.data.resultJson === 'string' ? JSON.parse(pr.data.resultJson) : (pr.data.resultJson || pr.data.data?.resultJson);
                        imageUrl = resJson.resultUrls[0]; break;
                    }
                }
            }
        } catch(e) { console.log('   ㄴ [KIE] 실패, 폴백 엔진 가동'); }
    }
    if(!imageUrl) imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(ep)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
    
    // Cloudinary 영구 보관 (Solo Mode)
    console.log('   ㄴ [영구 저장] Cloudinary 전송 중...');
    const cdnUrl = await uploadToCloudinary(imageUrl);
    if(cdnUrl) { console.log('   ㄴ ✅ 영구 보관 성공!'); return cdnUrl; }
    return imageUrl;
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('\n🚀 Masterwork Start: ' + target);
    const bpRes = await callAI(model, `Return ONLY JSON for "${target}": {"title":"...","chapters":["ch1","ch2","ch3","ch4","ch5","ch6","ch7"]}`);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const chapters = bp.chapters || [];
    const hero = await genImg(title, model);
    let body = STYLE + '<div class="vue-premium">' + (hero ? `<img src="${hero}" alt="${title}">` : '');
    body += '<div class="toc-box"><h2>🔍Expert Content Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    for(let i=0; i<chapters.length; i++) {
        console.log(`      ㄴ [Writing Section ${i+1}/7] ${chapters[i]}`);
        const sect = clean(await callAI(model, MASTER_GUIDELINE + `\\n MISSION: Write MASSIVE Section ${i+1}: ${chapters[i]} (Target: ${target}). Min 1,500 chars. Use 4x4 Table & [IMAGE_PROMPT: description] tag.`), 'text');
        let htmlSect = sect.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
        const pMatch = htmlSect.match(/\\[IMAGE_PROMPT:\\s*([\\s\\S]*?)\\]/);
        if(pMatch) {
            const img = await genImg(pMatch[1].trim(), model);
            htmlSect = htmlSect.replace(pMatch[0], `<img src="${img}" alt="${chapters[i]}">`);
        }
        body += `<div class="h2-premium" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect.replace(/\\[IMAGE_PROMPT:[\\s\\S]*?\\]/g, '');
    }
    body += '</div>';
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('   ㄴ ✅ Result: ' + res.data.url);
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const pool = config.clusters || []; if(!pool.length) return;
        const seed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
        await writeAndPost(model, seed, blogger, config.blog_id, new Date());
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Cloud Solo Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('Run Failure: ' + e.message); process.exit(1); }
}
run();