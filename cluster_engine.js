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
  .vue-premium h3 { font-size: 26px; color: #111; margin-top: 60px; margin-bottom: 25px; font-weight: 900; background: #f1f3f5; padding: 22px; border-radius: 12px; border-left: 10px solid #ff4e50; }
  .h2-premium { background-color: #000; color: #fff; font-size: 30px; font-weight: 900; margin-top: 100px; padding: 45px; border-radius: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); text-align: center; }
  .toc-box { background-color: #fff; border: 4px solid #000; border-radius: 25px; padding: 45px; margin: 60px 0; box-shadow: 10px 10px 0px #eee; }
  .vue-premium table { width: 100%; border-collapse: collapse; margin: 55px 0; border: 4px solid #111; }
  .premium-chip { background: #ff4e50; color: #fff; padding: 10px 25px; border-radius: 15px; font-size: 15px; font-weight: 900; display: inline-block; margin-bottom: 25px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 40px; margin: 60px 0; box-shadow: 0 30px 70px rgba(0,0,0,0.3); border: 2px solid #eee; }
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
    catch (e) { if (e.message.includes('429') && retry < 5) { console.log('⚠️ 과부하 대기 중...'); await new Promise(r => setTimeout(r, 20000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function uploadToCloudinary(buffer, name="asset") {
    return new Promise((resolve) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => { 
            if (error) { console.log(`      ❌ [클라우디너리 업로드 실패 (${name})]:`, error.message); resolve(null); }
            else { console.log(`      ✅ [클라우디너리 업로드 성공]: ${result.secure_url.substring(0,50)}...`); resolve(result.secure_url); }
        });
        upload_stream.end(buffer);
    });
}

async function genImg(desc, model, sectionIdx) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    console.log(`      🎨 [KIE.AI 실사 생성 요청] ${sectionIdx}번 섹션용...`);
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', high-end photography, cinematic, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId; if(!tid) return '';
        for(let i=0; i<15; i++) { 
            await new Promise(r => setTimeout(r, 8000)); 
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); 
            const data = pr.data.data || pr.data;
            if(data.state === 'success') { 
                const resJson = typeof data.resultJson === 'string' ? JSON.parse(data.resultJson) : data.resultJson; 
                if(resJson && resJson.resultUrls && resJson.resultUrls[0]) {
                    const url = resJson.resultUrls[0];
                    console.log(`      📸 [KIE.AI 생성 완료] 원본 URL 확보: ${url.substring(0,30)}...`);
                    const res = await axios.get(url, { responseType: 'arraybuffer' });
                    return await uploadToCloudinary(Buffer.from(res.data), `Body_${sectionIdx}`);
                }
                break; 
            } 
        }
    } catch(e) { console.log('      ⚠️ [이미지 공정 지연]:', e.message); }
    return '';
}

async function writeAndPost(model, target, blogger, bId, pTime) {
    console.log('\n📋 [총괄과장] "투명한 대작 보고" 시스템 기동 완료.');
    const mktPrompt = `억대 연봉 총괄 마케터입니다. 키워드 "${target}"를 위한 제목과 7개 섹션 목차를 짜세요. JSON: { "long_tail_keyword":"", "title":"", "chapters":["제목1", "제목2", "제목3", "제목4", "제목5", "제목6", "제목7"] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; const coreKeyword = bp.long_tail_keyword || target;
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.header || String(c)) : String(c));
    
    console.log(`🏛️ [확정 제목]: ${title}`);
    console.log(`📑 [확정 목차]:\n      ${chapters.map((c,i)=>`${i+1}. ${c}`).join('\n      ')}`);
    
    console.log('\n🎨 [1단계: 썸네일 제작 시작]');
    const yPrompt = `마케팅 디렉터 영자입니다. 주제 "${coreKeyword}"에 어울리는 극실사 사진 프롬프트와 후킹 카피를 짜세요. JSON: {"line1":"", "line2":"", "bg_photo_prompt":""}`;
    const dRes = await callAI(model, yPrompt);
    const d = JSON.parse(clean(dRes, 'obj'));
    const bgUrl = await genImg(d.bg_photo_prompt || coreKeyword + ' professional photography', model, 'Thumbnail');
    
    let thumbnail = '';
    if(bgUrl) {
        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="15"/></filter></defs><rect width="100%" height="100%" fill="#000"/><image href="${bgUrl}" width="1200" height="630" preserveAspectRatio="xMidYMid slice" filter="url(#b)" opacity="0.7"/><rect width="1200" height="630" fill="black" opacity="0.4"/><g transform="translate(100,270)"><rect x="-25" y="-115" width="${String(d.line1).length*105+80}" height="165" fill="white" fill-opacity="0.1" rx="25"/><text x="20" y="5" font-family="sans-serif" font-size="115" font-weight="999" fill="white">${d.line1}</text></g><g transform="translate(100,480)"><rect x="-25" y="-105" width="${String(d.line2).length*95+80}" height="155" fill="#ff4e50" rx="25"/><text x="25" y="10" font-family="sans-serif" font-size="105" font-weight="999" fill="white">${d.line2}</text></g></svg>`;
        thumbnail = await uploadToCloudinary(Buffer.from(svg), "THUMB_FINAL");
    }
    
    let body = STYLE + '<div class="vue-premium">' + (thumbnail ? `<img src="${thumbnail}" alt="${title}">` : '');
    body += '<div class="toc-box"><h2>Contents Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctxLog = "";
    for(let i=0; i<chapters.length; i++) {
        console.log(`\n✍️ [2단계: 본문 집필] ${i+1}/7: ${chapters[i]}`);
        const sectPrompt = `[제목: ${title}] [섹션: ${chapters[i]}] [이전 내용 요약: ${ctxLog}]\nHTML 태그로만 2,500자 이상 전문 작성. 중복 엄금. 극실사 사진용 [IMAGE_PROMPT: 영어] 포함.`;
        const sect = clean(await callAI(model, sectPrompt), 'text');
        ctxLog += ` (${chapters[i]} 완료)`;
        
        let htmlSect = sect;
        if(i === 0 || i === 2 || i === 4) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { 
                const imgUrl = await genImg(pMatch[1].trim(), model, i+1); 
                if(imgUrl) {
                    htmlSect = htmlSect.replace(pMatch[0], `<img src="${imgUrl}" alt="${chapters[i]}">`);
                    console.log(`      ✅ [삽입 완료] ${i+1}번 섹션에 이미지가 성공적으로 배치되었습니다.`);
                }
            } 
        }
        body += `<div class="h2-premium" id="s${i+1}"><span class="premium-chip">STRATEGIC SECTION 0${i+1}</span><h2>${chapters[i]}</h2></div>` + htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/g, '');
    }
    
    body += '</div>';
    console.log('\n🚀 [3단계: 최종 발행 요청]');
    const r = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log(`\n✨ [성공] 프로젝트 완료: "${title}"`);
    console.log(`🔗 [블로그 주소]: ${r.data.url}`);
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
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Report Sync', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { console.error('🔴 치명적 보고: ' + e.message); process.exit(1); }
}
run();