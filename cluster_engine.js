const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;900&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.1; max-width: 850px; margin: 35px auto; padding: 20px; background:#fff; word-break:keep-all; }
  .vue-premium * { font-family: 'Pretendard', sans-serif !important; }
  .h2-premium { border-bottom: 7px solid #111; padding-bottom: 25px; margin-top: 110px; margin-bottom: 60px; }
  .h2-premium h2 { font-size: 44px; font-weight: 900; color: #111; margin: 0; line-height: 1.2; letter-spacing: -1.5px; }
  .vue-premium h3 { font-size: 30px; color: #111; margin-top: 75px; margin-bottom: 35px; font-weight: 800; border-left: 9px solid #ff4e50; padding-left: 24px; line-height: 1.4; }
  .vue-premium p { margin-bottom: 40px; font-size: 21px; color: #3d3d3d; text-align: justify; }
  .toc-box { background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 20px; padding: 50px; margin: 70px 0; }
  .table-box { width: 100%; overflow-x: auto; margin: 70px 0; border: 3px solid #111; }
  .vue-premium table { width: 100%; border-collapse: collapse; min-width: 750px; }
  .vue-premium th { background: #111; color: #fff; padding: 24px; text-align: left; font-size: 20px; }
  .vue-premium td { border: 1px solid #ececec; padding: 24px; font-size: 20px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 18px; margin: 80px 0; box-shadow: 0 30px 60px rgba(0,0,0,0.15); }
  .premium-disclaimer { border: 1px solid #eee; background: #fafafa; border-radius: 15px; padding: 45px; margin-top: 140px; color: #666; font-size: 18px; line-height: 1.8; }
</style>`;

function clean(raw, type = 'obj', titleHead = '') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '');
        t = t.replace(/<title[\s\S]*?>/gi, '');
        t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
        t = t.replace(/style="[^"]*"/gi, '');
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '');
        t = t.replace(/<\/(html|body|head|title|meta)>/gi, '');
        t = t.replace(/<h1[\s\S]*?<\/h1>/gi, '');
        if(titleHead) {
            const cleanTitle = titleHead.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
            const rH2 = new RegExp(`<h[1-3][^>]*>\\s*(${cleanTitle}|\\d+\\.\\s*${cleanTitle})\\s*</h[1-3]>`, 'i');
            t = t.replace(rH2, '');
        }
        const garbage = [/물론이죠/gi, /도움이 되길 바랍니다/gi, /요약하자면/gi, /결론적으로/gi, /알아보겠습니다/gi, /살펴보겠습니다/gi, /참고해주세요/gi, /본 섹션에서는/gi, /설계자 지침/gi, /마스터 프로토콜/gi, /Paragon Protocol/gi];
        garbage.forEach(p => t = t.replace(p, ''));
        t = t.replace(/<p>\s*<\/p>|<p>&nbsp;<\/p>/gi, ''); 
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
    catch (e) { if (e.message.includes('429') && retry < 5) { await new Promise(r => setTimeout(r, 22000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function genImg(desc, model, sectionIdx) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    try {
        console.log(`   🎨 [전문 이미지 생성] "${desc.substring(0, 35)}..."`);
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', high-end editorial photography, masterpiece, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId; if(!tid) return '';
        for(let i=0; i<15; i++) { 
            await new Promise(r => setTimeout(r, 9500)); 
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); 
            const d = pr.data.data || pr.data; if(d.state === 'success') { 
                const resJson = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson; 
                const fUrl = resJson.resultUrls[0]; if(fUrl) { 
                    const imgRes = await axios.get(fUrl, { responseType: 'arraybuffer' }); 
                    return await new Promise(res => { const s = cloudinary.v2.uploader.upload_stream({ resource_type: 'image' }, (err, r) => res(r?.secure_url)); s.end(Buffer.from(imgRes.data)); });
                }
            } 
        }
    } catch(e) { }
    return '';
}

async function writeAndPost(model, target, blogger, bId) {
    console.log(`\n🔱 [Ghost Writer] Editorial Integrity v1.4.74 가동...`);
    const mktPrompt = `키워드 "${target}"를 위한 제목과 7개 섹션 목차를 짜세요. JSON: { "title":"", "chapters":[] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; 
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c));
    
    console.log(`\n� [보고] 편집팀 제목: "${title}"`);
    chapters.forEach((c, idx) => console.log(`   ${idx+1}. ${c}`));

    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="toc-box" google-auto-ads-ignore="true"><h2>Contents Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`\n💎 [편집 집필] ${i+1}/7: "${chapters[i]}"`);
        
        let sectPrompt = isFAQ ? `[편집 팀 지침] 주제 [${chapters[i]}]로 정확히 '25-30개'의 대규모 FAQ를 HTML로 작성하세요. [중복 금지: ${ctx}]` : `[전문가 가이드] [장 제목: ${chapters[i]}]를 HTML로 4,500자 이상 백과사전급으로 상세히 집필하십시오.\n\n규정:\n1. 형식: 분석, 가이드, 리포트 중 가장 적합한 형식을 선택할 것.\n2. 표: 섹션 내에 비교 또는 요약 표(Table) 반드시 1개 이상 포함.\n3. 위계: 소제목 <H3>. 제목 반복 절대 금지.\n4. 말투: 친절하고 깊이 있는 전문가 톤.\n5. 금지: <title>, <html> 등 코드 찌꺼기, 내부 용어(Paragon, 설계자 등) 절대 금지.\n6. 연결: 앞선 [기작성 요약: ${ctx}] 내용을 감안하여 정보의 깊이를 더할 것.`;
        
        const sectRaw = await callAI(model, sectPrompt);
        const sect = clean(sectRaw, 'text', chapters[i]);
        console.log(`   📊 [품질] 분량: ${sect.length.toLocaleString()}자 | 중복 제거 완료 | 데이터 표: ${sect.includes('<table') ? '✅' : '❌'}`);
        
        const sum = await callAI(model, `핵심 요약(3문장): ${sect.substring(0, 1000)}`);
        ctx += ` [S${i+1}: ${sum}]`;
        
        let htmlSect = sect;
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const u = await genImg(pMatch[1].trim(), model, i+1); if(u) htmlSect = htmlSect.replace(pMatch[0], `<img src="${u}">`); else htmlSect = htmlSect.replace(pMatch[0], ''); }
        }
        htmlSect = htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/gi, '');
        body += `<div class="h2-premium" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect;
    }
    body += `<div class="premium-disclaimer" google-auto-ads-ignore="true">⚖️ <b>Disclaimer:</b> 본 콘텐츠는 최신 기술 지침 및 하드웨어 가이드를 바탕으로 작성된 전문 정보성 리포트입니다. 개별 시스템 환경에 따라 결과에 차이가 있을 수 있으므로, 중요한 작업 전 반드시 전문가의 도움을 받으시길 권장합니다.</div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body } });
    console.log(`\n✨ [성공] 완벽한 편집본 발행 완료.`);
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const gai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = gai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({ version: 'v3', auth });
        const seeds = config.clusters || []; if(!seeds.length) return;
        const target = seeds.splice(Math.floor(Math.random()*seeds.length), 1)[0];
        await writeAndPost(model, target, blogger, config.blog_id);
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Ghost Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();