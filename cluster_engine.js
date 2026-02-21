const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 35px auto; padding: 30px; background:#fff; border-radius:30px; box-shadow:0 15px 50px rgba(0,0,0,0.06); word-break:keep-all; }
  .h2-premium { background-color: moccasin; border-radius: 12px; color: #000; font-size: 24px; font-weight: bold; margin-top: 60px; padding: 20px; border-left: 12px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2.5px solid #333; border-radius: 20px; padding: 35px; margin: 45px 0; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 40px 0; text-align: center; border: 3px solid #333; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 20px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') return t.replace(/<(!DOCTYPE|html|head|body|title).*?>/gi, '').replace(/<\/(html|head|body|title)>/gi, '').trim();
    try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { console.log('⚠️ 대기...'); await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(buffer) {
    return new Promise((resolve) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
            if (error) { console.log('   ㄴ ❌ [공식 SDK 업로드 실패]:', error.message); resolve(null); }
            else { resolve(result.secure_url); }
        });
        upload_stream.end(buffer);
    });
}

async function genDesignThumbnail(longTailKeyword, model) {
    console.log('   ㄴ [영자의 마케팅 디자인 가동]');
    try {
        const yPrompt = `당신은 마케팅 디렉터 '영자'입니다. 롱테일 키워드 "${longTailKeyword}"가 썸네일에 '박혀' 있어야 합니다. 1줄에는 키워드 핵심 요약, 2줄에는 자극적인 카피(8자이내)를 넣으세요. Return ONLY JSON: {"line1":"Hook1","line2":"Hook2","bg1":"#HEX","bg2":"#HEX"}`;
        const dRes = await callAI(model, yPrompt);
        const d = JSON.parse(clean(dRes, 'obj'));
        const line1 = d.line1 || longTailKeyword.substring(0,8); const line2 = d.line2 || '지금 확인';
        const bg1 = d.bg1 || '#FFFF00', bg2 = d.bg2 || '#FF4E50';
        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><g transform="translate(100, 240)"><rect x="0" y="-100" width="${line1.length*90+50}" height="135" fill="${bg1}" rx="15"/><text x="25" y="5" font-family="sans-serif" font-size="100" font-weight="900" fill="black">${line1}</text></g><g transform="translate(100, 430)"><rect x="0" y="-90" width="${line2.length*80+50}" height="125" fill="${bg2}" rx="15"/><text x="25" y="5" font-family="sans-serif" font-size="85" font-weight="900" fill="white">${line2}</text></g><text x="1100" y="580" font-family="sans-serif" font-size="20" fill="white" text-anchor="end" fill-opacity="0.3">OFFICIAL SDK DESIGNED BY YOUNGJA</text></svg>`;
        return await uploadToCloudinary(Buffer.from(svg)) || '';
    } catch(e) { return ''; }
}

async function genImg(desc, model) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    let ep = desc; try { const t = await callAI(model, 'Translate English (concise): ' + desc); ep = t.replace(/[^a-zA-Z0-9, ]/g, ''); } catch(e){}
    let imageUrl = '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: ep + ', extreme quality photography', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId;
        for(let i=0; i<15; i++) { await new Promise(r => setTimeout(r, 7000)); const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); if((pr.data.state || pr.data.data?.state) === 'success') { const resJson = typeof pr.data.resultJson === 'string' ? JSON.parse(pr.data.resultJson) : (pr.data.resultJson || pr.data.data?.resultJson); imageUrl = resJson.resultUrls[0]; break; } }
    } catch(e) { }
    if(imageUrl) { try { console.log('   ㄴ [이미지 확보] 공식 SDK 통해 안전하게 박제 중...'); const res = await axios.get(imageUrl, { responseType: 'arraybuffer' }); return await uploadToCloudinary(Buffer.from(res.data)) || imageUrl; } catch(e) { return imageUrl; } }
    return '';
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('\n🚀 [마케팅 본부] 롱테일 확장 및 공식 저장 시스템 가동...');
    const mktPrompt = `당신은 스타 카피라이터입니다. 키워드 "${target}"를 사람이 검색할 법한 롱테일 키워드로 확장하고, 키워드가 포함된 역대급 후킹 제목을 만드세요. Return ONLY JSON: {"long_tail_keyword":"...","title":"...","chapters":["ch1","ch2","ch3","ch4","ch5","ch6","ch7"]}`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const coreKeyword = bp.long_tail_keyword || target; const chapters = bp.chapters || [];
    console.log('   ㄴ [SEO 확정 제목]: ' + title);
    
    const thumbnail = await genDesignThumbnail(coreKeyword, model);
    let body = STYLE + '<div class="vue-premium">' + (thumbnail ? `<img src="${thumbnail}" alt="${title}">` : '');
    body += '<div class="toc-box"><h2>Contents Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    for(let i=0; i<chapters.length; i++) {
        console.log(`      ㄴ [본문 집필] ${i+1}/${chapters.length}: ${chapters[i]}`);
        const sect = clean(await callAI(model, `[MASTER GUIDE] 12,000자 지침. 섹션: ${chapters[i]}. 4x4 표 & [IMAGE_PROMPT] 포함.`), 'text');
        let htmlSect = sect.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if(i === 0 || i === 2 || i === 4) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { console.log('         ㄴ [KIE 이미지 공식 보존]'); const img = await genImg(pMatch[1].trim(), model); if(img) htmlSect = htmlSect.replace(pMatch[0], `<img src="${img}">`); }
        }
        body += `<div class="h2-premium" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    }
    body += '</div>';
    const r = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('\n✨ [발행 성공] 공식 SDK 박제 대작 완료: ' + r.data.url);
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(config['gemini-key'] || process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const pool = config.clusters || []; if(!pool.length) return;
        const seed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
        await writeAndPost(model, seed, blogger, config.blog_id, new Date());
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Official SDK Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('🔴 치명적 오류: ' + e.message); process.exit(1); }
}
run();