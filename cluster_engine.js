const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.0; max-width: 850px; margin: 35px auto; padding: 30px; background:#fff; border-radius:30px; box-shadow:0 15px 50px rgba(0,0,0,0.06); word-break:keep-all; }
  .vue-premium p { margin-bottom: 28px; font-size: 18px; text-align: justify; }
  .vue-premium h3 { font-size: 24px; color: #000; margin-top: 55px; margin-bottom: 25px; border-bottom: 3px solid #333; padding-bottom: 15px; font-weight: 900; }
  .h2-premium { background-color: #fff; border-radius: 15px; color: #000; font-size: 28px; font-weight: 900; margin-top: 80px; padding: 30px; border: 4px solid #333; box-shadow: 10px 10px 0px #333; }
  .toc-box { background-color: #f8f9fa; border: 4px solid #333; border-radius: 20px; padding: 40px; margin: 60px 0; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 50px 0; border: 4px solid #333; font-size: 16px; }
  .vue-premium th { background: #333; color: #fff; padding: 18px; }
  .vue-premium td { border: 2px solid #333; padding: 15px; text-align: center; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 30px; margin: 45px 0; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
  .premium-chip { display: inline-block; background: #333; color: #fff; padding: 5px 15px; border-radius: 50px; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<(!DOCTYPE|html|head|body|title).*?>/gi, '').replace(/<\/(html|head|body|title)>/gi, '');
        t = t.replace(/\[MASTER GUIDE\].*?(\- 12,000자 가이드)?/gi, '');
        t = t.replace(/\[마스터 가이드\].*?:?/gi, '');
        t = t.replace(/^(#+)\s*(.*)$/gm, (m, c, content) => `<h${c.length+2}>${content}</h${c.length+2}>`);
        t = t.replace(/^\*\s+(.*)$/gm, '<li>$1</li>');
        return t.trim();
    }
    try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { console.log('⚠️ 과부하 대기...'); await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(buffer) {
    return new Promise((resolve) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => { if (error) resolve(null); else resolve(result.secure_url); });
        upload_stream.end(buffer);
    });
}

async function genImg(desc, model) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    let ep = desc; try { const t = await callAI(model, 'Translate English concise: ' + desc); ep = t.replace(/[^a-zA-Z0-9, ]/g, ''); } catch(e){}
    let imageUrl = '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: ep + ', extreme quality photography', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId;
        for(let i=0; i<15; i++) { await new Promise(r => setTimeout(r, 7000)); const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); if((pr.data.state || pr.data.data?.state) === 'success') { const resJson = typeof pr.data.resultJson === 'string' ? JSON.parse(pr.data.resultJson) : (pr.data.resultJson || pr.data.data?.resultJson); imageUrl = resJson.resultUrls[0]; break; } }
    } catch(e) { }
    if(imageUrl) { try { const res = await axios.get(imageUrl, { responseType: 'arraybuffer' }); return await uploadToCloudinary(Buffer.from(res.data)) || imageUrl; } catch(e) { return imageUrl; } }
    return '';
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('\n🚀 [총괄과장] "진짜" 12,000자 대작 집필 모드 가동...');
    const mktPrompt = `당신은 억대 연봉의 총괄 마케터입니다. 키워드 "${target}"를 사람이 검색하는 롱테일 키워드로 확장하고 제목과 7개 섹션을 짜세요. Return ONLY JSON: {"long_tail_keyword":"...","title":"...","chapters":["ch1","ch2","ch3","ch4","ch5","ch6","ch7"]}`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const coreKeyword = bp.long_tail_keyword || target; const chapters = bp.chapters || [];
    console.log('   ㄴ [확정 제목]: ' + title);
    
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><g transform="translate(100, 240)"><rect x="0" y="-100" width="800" height="135" fill="#FFFF00" rx="15"/><text x="25" y="5" font-family="sans-serif" font-size="100" font-weight="900" fill="black">${coreKeyword.substring(0,8)}</text></g><text x="1100" y="580" font-family="sans-serif" font-size="20" fill="white" text-anchor="end" fill-opacity="0.3">OFFICIAL POWERED BY GM</text></svg>`;
    const thumbnail = await uploadToCloudinary(Buffer.from(svg));
    
    let body = STYLE + '<div class="vue-premium">' + (thumbnail ? `<img src="${thumbnail}" alt="${title}">` : '');
    body += '<div class="toc-box"><h2>Contents Overview</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    for(let i=0; i<chapters.length; i++) {
        console.log(`      ㄴ [GM 초정밀 집필] ${i+1}/${chapters.length}: ${chapters[i]}`);
        const sectPrompt = `섹션 "${chapters[i]}"에 대해 2,000자 이상의 압도적 전문 지식을 작성하세요.\n[규정]\n1. 마크다운(#, *) 쓰지 말고 <p>, <h3>, <ul>, <li> 태그로만 응답.\n2. 절대 '지침', '12,000자', '마스터 가이드' 같은 단어를 본문에 포함하지 말 것.\n3. 심층 분석, 실무 사례, 전문가 조언을 포함하여 길이를 충분히 확보할 것.\n4. 4x4 <table> 정보 표 포함.\n5. [IMAGE_PROMPT: 상세설명] 포함.`;
        const sect = clean(await callAI(model, sectPrompt), 'text');
        let htmlSect = sect.replace(/[^<]>\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if(i === 0 || i === 2 || i === 4) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const img = await genImg(pMatch[1].trim(), model); if(img) htmlSect = htmlSect.replace(pMatch[0], `<img src="${img}">`); }
        }
        body += `<div class="h2-premium" id="s${i+1}"><span class="premium-chip">SECTION 0${i+1}</span><h2>${chapters[i]}</h2></div>` + htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    }
    body += '</div>';
    const r = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('\n✨ [발행 성공] 총괄과장의 무결점 대작: ' + r.data.url);
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
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Density Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('🔴 치명적 오류: ' + e.message); process.exit(1); }
}
run();