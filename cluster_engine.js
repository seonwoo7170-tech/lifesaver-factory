const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.1; max-width: 850px; margin: 35px auto; padding: 30px; background:#fff; word-break:keep-all; }
  .vue-premium p { margin-bottom: 30px; font-size: 19px; }
  .vue-premium h3 { font-size: 26px; color: #111; margin-top: 60px; margin-bottom: 25px; font-weight: 900; background: #f1f3f5; padding: 20px; border-radius: 12px; border-left: 10px solid #ff4e50; }
  .h2-premium { background-color: #000; color: #fff; font-size: 30px; font-weight: 900; margin-top: 100px; padding: 45px; border-radius: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); text-align: center; }
  .toc-box { background-color: #fff; border: 4px solid #000; border-radius: 25px; padding: 45px; margin: 60px 0; box-shadow: 10px 10px 0px #eee; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 55px 0; border: 4px solid #111; }
  .vue-premium th { background: #111; color: #fff; padding: 25px; font-size: 18px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 40px; margin: 60px 0; box-shadow: 0 30px 70px rgba(0,0,0,0.3); border: 1px solid #ddd; }
  .premium-chip { background: #ff4e50; color: #fff; padding: 10px 25px; border-radius: 15px; font-size: 15px; font-weight: 900; display: inline-block; margin-bottom: 25px; text-transform: uppercase; }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<(!DOCTYPE|html|head|body|title).*?>/gi, '').replace(/<\/(html|head|body|title)>/gi, '');
        t = t.replace(/\[MASTER GUIDE\].*?(\-\s*\d*자 가이드)?/gi, '').replace(/\[마스터 가이드\].*?:?/gi, '');
        t = t.replace(/^(#+)\s*(.*)$/gm, (m, c, content) => `<h${c.length+2}>${content}</h${c.length+2}>`);
        return t.trim();
    }
    try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { console.log('⚠️ 대기...'); await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(buffer, name="asset") {
    return new Promise((resolve) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => { if (error) resolve(null); else resolve(result.secure_url); });
        upload_stream.end(buffer);
    });
}

async function genImg(desc, model) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    try {
        // KIE.AI 실사 튜닝: z-image 모델은 실사에 강함. 쾌속 생성을 위해 16:9 유지.
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', high-end professional photography, 8k resolution, raw photo quality, sharp focus, cinematic lighting', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId;
        for(let i=0; i<15; i++) { await new Promise(r => setTimeout(r, 7500)); const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); if((pr.data.state || pr.data.data?.state) === 'success') { const resJson = typeof pr.data.resultJson === 'string' ? JSON.parse(pr.data.resultJson) : (pr.data.resultJson || pr.data.data?.resultJson); const url = resJson.resultUrls[0]; if(url) { const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 }); return await uploadToCloudinary(Buffer.from(res.data), "REAL_IMAGE"); } break; } }
    } catch(e) { console.log('   ㄴ [이미지 생성 지연]:', e.message); }
    return '';
}

async function genHyperRealThumbnail(keyword, model) {
    console.log('   ㄴ [영자 실사 기획] 고화질 상업 사진 기반 썸네일 제작...');
    try {
        const yPrompt = `마케팅 디렉터입니다. "${keyword}"와 연관된 전 세계 최고 수준의 광고 사진 프롬프트를 영어로 짜세요. 실사(Realistic) 필수. JSON: { "line1":"", "line2":"", "bg_photo_prompt":"" }`;
        const dRes = await callAI(model, yPrompt);
        const d = JSON.parse(clean(dRes, 'obj'));
        const line1 = (d.line1 || keyword).replace(/[^가-힣a-zA-Z0-9? ]/g, '').substring(0,10);
        const line2 = (d.line2 || '필독 전략').replace(/[^가-힣a-zA-Z0-9! ]/g, '').substring(0,10);
        const bgUrl = await genImg(d.bg_photo_prompt || keyword + ' professional magazine photography', model);
        
        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <defs>
                <filter id="glassBlur"><feGaussianBlur in="SourceGraphic" stdDeviation="16" /></filter>
                <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#000;stop-opacity:0.85" /><stop offset="100%" style="stop-color:#111;stop-opacity:0.5" /></linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="#000"/>
            ${bgUrl ? `<image href="${bgUrl}" width="1200" height="630" preserveAspectRatio="xMidYMid slice" filter="url(#glassBlur)" opacity="0.75"/>` : ''}
            <rect x="0" y="0" width="1200" height="630" fill="url(#darkGradient)"/>
            <g transform="translate(100, 260)">
                <rect x="-25" y="-115" width="${line1.length*105+90}" height="165" fill="white" fill-opacity="0.12" rx="25" style="stroke:white; stroke-opacity:0.25; stroke-width:2;"/>
                <text x="20" y="5" font-family="sans-serif" font-size="115" font-weight="900" fill="white" style="text-shadow: 0 12px 45px rgba(0,0,0,0.65);">${line1}</text>
            </g>
            <g transform="translate(100, 480)">
                <rect x="-25" y="-105" width="${line2.length*95+90}" height="155" fill="#ff4e50" rx="25" style="filter:drop-shadow(0 15px 35px rgba(255,78,80,0.55));"/>
                <text x="25" y="10" font-family="sans-serif" font-size="105" font-weight="900" fill="white">${line2}</text>
            </g>
            <text x="1120" y="590" font-family="sans-serif" font-size="24" fill="white" text-anchor="end" fill-opacity="0.7" font-weight="bold">HYPER-REALISM SERIES BY GM</text>
        </svg>`;
        return await uploadToCloudinary(Buffer.from(svg), "PREMIUM_THUMB") || bgUrl;
    } catch(e) { return ''; }
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('\n🚀 [총괄과장] "이미지 드림팀" 가동: 제미나이(기획) + KIE(실행)');
    const mktPrompt = `억대 연봉 총괄 마케터입니다. 키워드 "${target}"를 위한 제목과 유기적 7섹션을 짜세요. JSON: { "long_tail_keyword":"", "title":"", "chapters":[] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const coreKeyword = bp.long_tail_keyword || target; const chapters = bp.chapters || [];
    
    const thumbnail = await genHyperRealThumbnail(coreKeyword, model);
    let body = STYLE + '<div class="vue-premium">' + (thumbnail ? `<img src="${thumbnail}" alt="${title}">` : '');
    body += '<div class="toc-box"><h2>Strategic Insight Overview</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let cumulativeCtx = "";
    for(let i=0; i<chapters.length; i++) {
        console.log(`      ㄴ [집필] ${i+1}/7: ${chapters[i]}`);
        const sectPrompt = `[메인: ${title}] [섹션: ${chapters[i]}] [이미 진행된 문맥: ${cumulativeCtx}]\nHTML로만 2,500자 이상 전문 작성. 중복 엄금. 극실사 사진용 [IMAGE_PROMPT: 영어] 포함. 금기어: 마스터 가이드, 지침.`;
        const sect = clean(await callAI(model, sectPrompt), 'text');
        cumulativeCtx += ` ${chapters[i]} 완료.`;
        let htmlSect = sect;
        if(i === 0 || i === 2 || i === 4) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { console.log('         ㄴ [KIE 실물 렌더링] 생성 중...'); const img = await genImg(pMatch[1].trim(), model); if(img) htmlSect = htmlSect.replace(pMatch[0], `<img src="${img}">`); }
        }
        body += `<div class="h2-premium" id="s${i+1}"><span class="premium-chip">INSIGHT 0${i+1}</span><h2>${chapters[i]}</h2></div>` + htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    }
    body += '</div>';
    const r = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('\n✨ [성공] 실사 화보급 대작 완료: ' + r.data.url);
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        // ⚠️ 대표님! 보안을 위해 모든 비밀키는 액션의 환경변수(Secrets)에서 직접 가져옵니다!
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        
        const pool = config.clusters || []; if(!pool.length) return;
        const seed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
        await writeAndPost(model, seed, blogger, config.blog_id, new Date());
        
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Security Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('🔴 치명적 오류: ' + e.message); process.exit(1); }
}
run();