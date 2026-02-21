const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #444; line-height: 1.9; max-width: 880px; margin: 40px auto; padding: 0 20px; background:#fff; word-break:keep-all; font-size: 18px; }
  .vue-premium * { font-family: 'Pretendard', sans-serif !important; }
  .vue-premium p, .vue-premium li, .vue-premium td, .vue-premium div, .vue-premium span { font-size: 18px !important; color: #4a5568 !important; line-height: 1.9 !important; }
  .h2-container { margin-top: 100px; margin-bottom: 50px; }
  .h2-container h2 { font-size: 38px !important; font-weight: 800; color: #1a202c !important; border-bottom: 5px solid #e2e8f0; padding-bottom: 15px; display: inline-block; line-height: 1.2 !important; }
  .vue-premium h3 { font-size: 26px !important; color: #2d3748 !important; margin-top: 60px; margin-bottom: 25px; font-weight: 700; border-left: 6px solid #a3bffa; padding-left: 20px; background: #f8faff; padding-top: 10px; padding-bottom: 10px; border-radius: 0 8px 8px 0; line-height: 1.4 !important; }
  .toc-box { background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 16px; padding: 40px; margin: 60px 0; }
  .toc-box h2 { font-size: 24px !important; color: #2d3748 !important; margin-top: 0; margin-bottom: 20px; }
  .table-box { width: 100%; overflow-x: auto; margin: 50px 0; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .vue-premium table { width: 100%; border-collapse: collapse; min-width: 600px; }
  .vue-premium th { background: #f1f5f9; color: #475569 !important; padding: 18px; text-align: left; font-size: 17px !important; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
  .vue-premium td { border-bottom: 1px solid #f1f5f9; padding: 18px; font-size: 18px !important; color: #64748b !important; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 20px; margin: 60px 0; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); }
  .premium-disclaimer { border-top: 1px solid #edf2f7; padding-top: 40px; margin-top: 100px; color: #a0aec0 !important; font-size: 15px !important; line-height: 1.6 !important; text-align: center; }
</style>`;

function clean(raw, type = 'obj', titleHead = '') {
    if(!raw) return type === 'text' ? '' : '{}';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '');
        t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
        t = t.replace(/style="[^"]*"/gi, '');
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '');
        t = t.replace(/<\/(html|body|head|title|meta)>/gi, '');
        if(titleHead) {
            const cleanTitle = titleHead.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
            const rH2 = new RegExp(`<h[1-3][^>]*>\\s*(${cleanTitle}|\\d+\\.\\s*${cleanTitle})\\s*</h[1-3]>`, 'i');
            t = t.replace(rH2, '');
        }
        const garbage = [/물론이죠/gi, /도움이 되길 바랍니다/gi, /요약하자면/gi, /결론적으로/gi, /알아보겠습니다/gi, /살펴보겠습니다/gi, /참고해주세요/gi, /본 섹션에서는/gi, /설계자 지침/gi, /마스터 프로토콜/gi, /Paragon/gi];
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
        console.log(`   🎨 [이미지 생성] "${desc.substring(0, 35)}..."`);
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', soft pastel lighting, clean minimalist aesthetics, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
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
    console.log(`\n🔱 [WisdomPick] Unified Scale v1.4.77 가동...`);
    const mktPrompt = `키워드 "${target}"를 위한 제목과 7개 섹션 목차를 짜세요. JSON: { "title":"", "chapters":[] }`;
    const bpRes = await callAI(model, mktPrompt);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; 
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c));
    
    console.log(`\n📄 [보고] 위즈덤픽 제목: "${title}"`);

    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="toc-box" google-auto-ads-ignore="true"><h2>목차</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`\n💎 [집필 중] ${i+1}/7: "${chapters[i]}"`);
        
        let sectPrompt = isFAQ ? `주제 [${chapters[i]}]로 정확히 '30개'의 대규모 FAQ를 HTML로 작성하세요. [중복 금지: ${ctx}]` : `[장 제목: ${chapters[i]}]를 HTML로 4,500자 이상 백과사전급으로 상세히 집필하십시오.\n\n규정:\n1. 형식: 분석, 리포트 중 가장 적합한 형식을 선택.\n2. 표: 섹션 내에 데이터 요약 표(Table) 반드시 1개 이상 포함.\n3. 위계: 소제목은 <H3> 사용. 제목 반복 절대 금지.\n4. 말투: 위즈덤픽 특유의 친절하고 명쾌한 전문가 톤.\n5. 디자인: 화사하고 밝은 톤앤매너 유지. 모든 텍스트는 일반 본문 규격을 따를 것.`;
        
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
        body += `<div class="h2-container" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + htmlSect;
    }
    body += `<div class="premium-disclaimer" google-auto-ads-ignore="true">ⓒ WisdomPick. 본 가이드는 발행 시점의 하드웨어 사양을 기준으로 작성되었습니다. 사용자의 시스템 환경에 따라 결과에 차이가 있을 수 있으므로, 중요한 작업 전 반드시 전문가의 도움을 받으시길 권장합니다.</div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body } });
    console.log(`\n✨ [성공] 위즈덤픽 스타일 발행 완료.`);
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
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Unified Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();