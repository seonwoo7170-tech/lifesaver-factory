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
  .h2-premium { border-bottom: 6px solid #111; padding-bottom: 25px; margin-top: 110px; margin-bottom: 60px; }
  .h2-premium h2 { font-size: 42px; font-weight: 900; color: #111; margin: 0; line-height: 1.2; letter-spacing: -1px; }
  .vue-premium h3 { font-size: 28px; color: #111; margin-top: 65px; margin-bottom: 30px; font-weight: 800; border-left: 7px solid #ff4e50; padding-left: 20px; line-height: 1.4; }
  .vue-premium p { margin-bottom: 35px; font-size: 20px; color: #444; }
  .toc-box { background-color: #fcfcfc; border: 1px solid #eee; border-radius: 15px; padding: 45px; margin: 70px 0; }
  .table-box { width: 100%; overflow-x: auto; margin: 60px 0; border: 2px solid #111; }
  .vue-premium table { width: 100%; border-collapse: collapse; min-width: 700px; }
  .vue-premium th { background: #111; color: #fff; padding: 20px; text-align: left; font-size: 18px; }
  .vue-premium td { border: 1px solid #eee; padding: 20px; font-size: 19px; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 12px; margin: 60px 0; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
  .premium-disclaimer { border: 1px solid #ddd; background: #f9f9f9; border-radius: 10px; padding: 35px; margin-top: 120px; color: #666; font-size: 16px; }
</style>`;

function clean(raw, type = 'obj', titleHead = '') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
        t = t.replace(/style="[^"]*"/gi, '');
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title)>/gi, '');
        t = t.replace(/<h1[\s\S]*?<\/h1>/gi, '');
        if(titleHead) {
            const rH2 = new RegExp(`<h2[^>]*>\\s*(${titleHead}|\\d+\\.\\s*${titleHead})\\s*</h2>`, 'i');
            t = t.replace(rH2, '');
        }
        const garbage = [/물론이죠/gi, /도움이 되길 바랍니다/gi, /요약하자면/gi, /결론적으로/gi, /알아보겠습니다/gi, /살펴보겠습니다/gi];
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
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', premium photography, high-end masterpiece, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId; if(!tid) return '';
        for(let i=0; i<15; i++) { 
            await new Promise(r => setTimeout(r, 8500)); 
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
    console.log(`\n🔱 [Superior Sovereign] 원조 지침(Master Protocol) 가동...`);
    const mktPrompt = `키워드 "${target}"를 위한 제목과 7개 섹션 목차를 짜세요. JSON: { "title":"", "chapters":[] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; 
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c));
    
    console.log(`\n� [보고] 원조의 제목: "${title}"`);
    chapters.forEach((c, idx) => console.log(`   ${idx+1}. ${c}`));

    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="toc-box" google-auto-ads-ignore="true"><h2>Contents Guide</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`\n💎 [집필] ${i+1}/7: "${chapters[i]}"`);
        
        let sectPrompt = isFAQ ? `[설계자 지침] 주제 [${chapters[i]}]로 오리지널 지침에 따라 '정확히 25-30개' 대규모 FAQ를 HTML로 작성하세요. [중복 배제: ${ctx}]` : `[설계자 지침: Paragon Protocol] [장 제목: ${chapters[i]}]를 HTML로 4,500자 이상 백과사전급으로 상세히 집필하십시오.\n\n마스터 헌법:\n1. 패턴: 주제별 최적 전문 패턴(분석, 가이드, 리포트 등)을 창의적으로 적용하십시오.\n2. 위계: 소주제 <H3>, 필요시 <H2> 활용.\n3. 요소: 전문가급 비교 표(Table)를 섹션 내에 반드시 1개 이상 필수 삽입하십시오.\n4. 말투: 친절하고 깊이 있는 전문가의 '~해요'.\n5. 흐름: 앞선 [누적 문맥: ${ctx}] 의 내용을 절대 반복하지 말고 더 깊은 통찰로 확장하십시오.\n6. 금지: 인사/서론/결론/H1 절대 금지. 본론만 상세히.`;
        
        const sectRaw = await callAI(model, sectPrompt);
        const sect = clean(sectRaw, 'text', chapters[i]);
        console.log(`   📊 [품질 보고] 분량: ${sect.length.toLocaleString()}자 | 중복 제거 완료 | 표(Original): ${sect.includes('<table') ? '✅' : '❌'}`);
        
        const sum = await callAI(model, `핵심 요약(3문장): ${sect.substring(0, 1000)}`);
        ctx += ` [섹션${i+1}: ${sum}]`;
        
        let htmlSect = sect;
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = htmlSect.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const u = await genImg(pMatch[1].trim(), model, i+1); if(u) htmlSect = htmlSect.replace(pMatch[0], `<img src="${u}">`); else htmlSect = htmlSect.replace(pMatch[0], ''); }
        }
        htmlSect = htmlSect.replace(/\[IMAGE_PROMPT:[\s\S]*?\]/gi, '');
        body += `<div class="h2-premium" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect;
    }
    body += `<div class="premium-disclaimer" google-auto-ads-ignore="true">⚖️ Disclaimer: 본 콘텐츠는 원조 설계자의 마스터 지침에 의해 생성되었습니다.</div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body } });
    console.log(`\n✨ [성공] 원조의 품격을 담은 마스터피스 발행 완료!`);
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
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Superior Sovereign Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();