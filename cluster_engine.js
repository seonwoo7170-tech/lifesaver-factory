const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.1; max-width: 850px; margin: 35px auto; padding: 20px; background:#fff; word-break:keep-all; }
  .vue-premium p { margin-bottom: 30px; font-size: 19px; }
  .vue-premium h3 { font-size: 24px; color: #111; margin-top: 50px; margin-bottom: 20px; font-weight: 800; border-bottom: 2px solid #eee; padding-bottom: 10px; }
  .h2-premium { border-bottom: 5px solid #000; padding-bottom: 20px; margin-top: 100px; margin-bottom: 50px; }
  .h2-premium h2 { font-size: 34px; font-weight: 900; color: #000; margin: 0; line-height: 1.3; }
  .toc-box { background-color: #f8f9fa; border-radius: 20px; padding: 40px; margin: 60px 0; border: 1px solid #eee; display: block; overflow: hidden; }
  .premium-chip { background: #ff4e50; color: #fff; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 900; display: inline-block; margin-bottom: 15px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 12px; margin: 50px 0; box-shadow: 0 15px 40px rgba(0,0,0,0.1); }
  .table-box { width: 100%; overflow-x: auto; margin: 40px 0; border: 2px solid #333; display: block; }
  .vue-premium table { width: 100%; border-collapse: collapse; min-width: 600px; }
  .vue-premium th { background: #333; color: #fff; padding: 15px; text-align: left; }
  .vue-premium td { border: 1px solid #eee; padding: 15px; }
  .premium-disclaimer { border: 2px solid #ddd; background: #fafafa; border-radius: 15px; padding: 30px; margin-top: 80px; font-size: 15px; color: #777; line-height: 1.8; display: block; overflow: hidden; }
</style>`;

function clean(raw, type = 'obj') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js)?/gi, '').trim();
    if (type === 'text') {
        // 🛡️ AI 아티팩트 소멸 (H1, H2, 타이틀, 서론, 가짜이미지 삭제)
        t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
        t = t.replace(/<h1[\s\S]*?<\/h1>/gi, '');
        t = t.replace(/<h2[\s\S]*?<\/h2>/gi, '');
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '');
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title)>/gi, '');
        t = t.replace(/^#+.*$/gm, ''); // 마크다운 # 기호 삭제
        t = t.replace(/\*\*/g, '').replace(/\*/g, ''); // 마크다운 볼드/이탤릭 삭제
        t = t.replace(/<img[\s\S]*?>/gi, ''); // AI가 임의로 넣은 <img> 태그 삭제 (엔진 전용 사용)
        t = t.replace(/\[이름\]|\[.*?\]/g, (m) => m.includes('IMAGE_PROMPT') ? m : ''); 
        t = t.replace(/안녕하세요|반갑습니다|마케터입니다|오늘 이 글에서는|[\s\S]*?알려드리겠습니다/gi, ''); // AI 특유의 서론 아티팩트 삭제
        t = t.replace(/<table/gi, '<div class="table-box no-adsense" google-auto-ads-ignore="true"><table');
        t = t.replace(/<\/table>/gi, '</table></div>');
        return t.trim();
    }
    const start = t.indexOf('{'); if (start === -1) return '{}';
    let count = 0; for (let i = start; i < t.length; i++) { if (t[i] === '{') count++; else if (t[i] === '}') { count--; if (count === 0) return t.substring(start, i + 1); } }
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(buffer, name="asset") {
    return new Promise((resolve) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => { resolve(error ? null : result.secure_url); });
        upload_stream.end(buffer);
    });
}

async function genImg(desc, model, sectionIdx) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    console.log(`      ㄴ 🎨 [KIE.AI] 프리미엄 이미지 생성 요청...`);
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', cinematic photography, high-end realism, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId; if(!tid) return '';
        for(let i=0; i<15; i++) { 
            await new Promise(r => setTimeout(r, 8000)); 
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); 
            const d = pr.data.data || pr.data; if(d.state === 'success') { 
                const resJson = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson; 
                const fUrl = resJson.resultUrls[0]; if(fUrl) { 
                    const imgRes = await axios.get(fUrl, { responseType: 'arraybuffer' }); 
                    return await uploadToCloudinary(Buffer.from(imgRes.data), `Body_${sectionIdx}`);
                }
            } 
        }
    } catch(e) { }
    return '';
}

async function genHyperRealThumbnail(keyword, model) {
    const yPrompt = `마케팅 카피라이터입니다. 주제 "${keyword}"에 대한 썸네일 카피를 짜세요. JSON: {"line1":"", "line2":"", "bg_photo_prompt":""}`;
    const dRes = await callAI(model, yPrompt);
    const d = JSON.parse(clean(dRes, 'obj'));
    const l1 = String(d.line1 || keyword).substring(0, 20);
    const l2 = String(d.line2 || 'Special Report').substring(0, 20);
    const bgUrl = await genImg(d.bg_photo_prompt || keyword + ' photography house', model, 'Thumb');
    const fs1 = l1.length > 12 ? 80 : 110; const fs2 = l2.length > 12 ? 75 : 100;
    const bw1 = Math.min(1100, l1.length * (fs1 * 0.8) + 120); const bw2 = Math.min(1100, l2.length * (fs2 * 0.8) + 120);
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="15"/></filter></defs><rect width="100%" height="100%" fill="#000"/><image href="${bgUrl}" width="1200" height="630" preserveAspectRatio="xMidYMid slice" filter="url(#b)" opacity="0.7"/><rect width="1200" height="630" fill="black" opacity="0.4"/><g transform="translate(100,270)"><rect x="-25" y="-${fs1+5}" width="${bw1}" height="${fs1+50}" fill="white" fill-opacity="0.12" rx="20" style="stroke:white; stroke-opacity:0.3; stroke-width:2"/><text x="20" y="5" font-family="sans-serif" font-size="${fs1}" font-weight="900" fill="white">${l1}</text></g><g transform="translate(100,480)"><rect x="-25" y="-${fs2+5}" width="${bw2}" height="${fs2+50}" fill="#ff4e50" rx="20"/><text x="25" y="10" font-family="sans-serif" font-size="${fs2}" font-weight="900" fill="white">${l2}</text></g></svg>`;
    return await uploadToCloudinary(Buffer.from(svg), "THUMB_PREMIUM");
}

async function writeAndPost(model, target, blogger, bId) {
    console.log(`\n🛡️ [VUE Master] Zero-Artifact 전략 작전 개시...`);
    const mktPrompt = `억대 연봉 마케터입니다. 키워드 "${target}"를 위한 제목과 7개 섹션 목차를 짜세요. JSON: { "long_tail_keyword":"", "title":"", "chapters":[] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const coreKeyword = bp.long_tail_keyword || target;
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c));
    
    console.log(`   ㄴ 📝 [확정 제목]: ${title}`);
    console.log(`   ㄴ 📋 [확정 목차]: ${chapters.length}개 섹션 배정 완료`);
    
    const thumbnail = await genHyperRealThumbnail(coreKeyword, model);
    let body = STYLE + '<div class="vue-premium">' + (thumbnail ? `<img src="${thumbnail}" alt="${title}">` : '');
    body += '<div class="toc-box" google-auto-ads-ignore="true"><h2>Contents Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let cumulativeCtx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`\n   💎 [집필 중] ${i+1}/7: "${chapters[i]}"`);
        let sectPrompt = isFAQ ? `[${chapters[i]}]를 5가지 핵심 Q&A 세트로 HTML 작성하세요.` : `너는 부품 관리자다. [장 제목: ${chapters[i]}]의 핵심 내용만 HTML로 2,700자 이상 작성하라. [지침: 인사 절대금지, 본 게시물의 제목(${title}) 반복 금지, <h1>/<h2> 사용금지, 서론/결론 생략하고 본론만 쏟아부을 것, 중복 엄금: ${cumulativeCtx}, <img>태그 사용금지, 오직 [IMAGE_PROMPT: 영어] 문구만 남길 것]`;
        const sect = clean(await callAI(model, sectPrompt), 'text');
        cumulativeCtx += ` [${chapters[i]} 완료]`;
        let htmlSect = sect;
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const imgUrl = await genImg(pMatch[1].trim(), model, i+1); if(imgUrl) htmlSect = htmlSect.replace(pMatch[0], `<img src="${imgUrl}">`); }
        }
        htmlSect = htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/gi, '');
        body += `<div class="h2-premium" id="s${i+1}"><span class="premium-chip">${isFAQ ? 'SPECIAL FAQ' : 'DEEP INSIGHT ' + (i+1).toString().padStart(2,'0')}</span><h2>${chapters[i]}</h2></div>` + htmlSect;
    }
    body += `<div class="premium-disclaimer" google-auto-ads-ignore="true"><span style="font-weight:900; color:#333; display:block; margin-bottom:10px;">⚖️ Legal Notice & Disclaimer</span><p>본 콘텐츠는 정보 제공만을 목적으로 하며, 그 정확성이나 안전성을 보장하지 않습니다. 전문적인 조언이 필요한 경우 해당 분야의 전문가와 상담하십시오. 본문에 포함된 정보의 사용으로 인해 발생하는 모든 결과에 대해 책임지지 않습니다.</p></div></div>`;
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body } });
    console.log(`\n✨ [성공] 무결점 명작 LIVE 완료: ${res.data.url}`);
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
        await writeAndPost(model, seed, blogger, config.blog_id);
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Zero-Artifact Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('🔴 치명적 에러 보고: ' + e.message); process.exit(1); }
}
run();