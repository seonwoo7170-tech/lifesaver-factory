const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const THEMES = [
  { name: 'Sky', color: '#a3bffa', text: '#2c5282', bg: '#f0f7ff' },
  { name: 'Emerald', color: '#a2d9ce', text: '#0e6251', bg: '#e9f7f5' },
  { name: 'Grape', color: '#d7bde2', text: '#512e5f', bg: '#f5eef8' },
  { name: 'Mango', color: '#f8c471', text: '#784212', bg: '#fef5e7' },
  { name: 'Rose', color: '#f5b7b1', text: '#78281f', bg: '#fdedec' }
];
const theme = THEMES[Math.floor(Math.random()*THEMES.length)];

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #444; line-height: 2; max-width: 920px; margin: 40px auto; padding: 0 30px; background:#fff; word-break:keep-all; font-size: 18px; }
  .vue-premium * { font-family: 'Pretendard', sans-serif !important; font-size: 18px; line-height: 2; color: #4a5568; }
  .h2-container { margin-top: 120px; margin-bottom: 60px; }
  .h2-container h2 { font-size: 42px !important; font-weight: 800; color: ${theme.text} !important; border-bottom: 8px solid ${theme.color}; padding-bottom: 15px; display: inline-block; line-height: 1.1 !important; }
  .vue-premium h3 { font-size: 28px !important; color: #1a202c !important; margin-top: 70px; margin-bottom: 30px; font-weight: 700; border-left: 12px solid ${theme.color}; padding-left: 20px; background: linear-gradient(to right, ${theme.bg}, #ffffff); padding-top: 15px; padding-bottom: 15px; border-radius: 4px 15px 15px 4px; line-height: 1.3 !important; }
  .toc-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 50px; margin: 60px 0; border-top: 12px solid ${theme.color}; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
  .toc-box h2 { font-size: 26px !important; font-weight: 800; color: #2d3748 !important; margin-top: 0; }
  .table-box { width: 100%; overflow-x: auto; margin: 60px 0; border-radius: 16px; border: 1px solid #e2e8f0; }
  .vue-premium table { width: 100%; border-collapse: collapse; }
  .vue-premium th { background: #f1f5f9; color: ${theme.text} !important; padding: 22px; text-align: left; font-size: 17px !important; font-weight: 800; border-bottom: 4px solid ${theme.color}; }
  .vue-premium tr:nth-child(even) { background-color: ${theme.bg}50; }
  .vue-premium td { border-bottom: 1px solid #f1f5f9; padding: 20px; }
  .vue-premium td:first-child { font-weight: 700; color: #2d3748 !important; }
  .vue-premium img { max-width: 100%; height: auto; border-radius: 30px; margin: 60px 0; border: 1px solid #edf2f7; box-shadow: 0 25px 30px -5px rgba(0,0,0,0.05); }
  .premium-footer { border-top: 2px solid ${theme.color}; padding-top: 60px; margin-top: 150px; text-align: center; }
  .copyright { color: ${theme.text} !important; font-weight: 800; font-size: 17px !important; margin-bottom: 10px; }
  .disclaimer { color: #a0aec0 !important; font-size: 14px !important; font-style: italic; }
</style>`;

function clean(raw, type = 'obj', titleHead = '') {
    if(!raw) return '';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    if (type === 'text') {
        t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title|meta)>/gi, '');
        t = t.replace(/<title[\s\S]*?<\/title>/gi, '').replace(/style="[^"]*"/gi, '');
        t = t.replace(/\\n/g, '\n');
        t = t.replace(/\*\*+(.*?)\*\*+/g, '<b>$1</b>'); 
        t = t.replace(/^\s*#+.*$/gm, ''); t = t.replace(/^[-*]{3,}$/gm, '');
        if(titleHead) {
            const ct = titleHead.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
            t = t.replace(new RegExp(`<h[1-3][^>]*>\\s*(\\d+\\.\\s*)?${ct}[^<]*</h[1-3]>`, 'i'), '');
            t = t.replace(new RegExp(`^\\d*\\.?\\s*${ct}.*$`, 'gm'), '');
        }
        const bList = [
            /물론이죠/gi, /도움이 되길/gi, /요약하자면/gi, /결론적으로/gi, /준비했습니다/gi, /작성하겠습니다/gi,
            /살펴보겠습니다/gi, /참고해주세요/gi, /본 섹션에서는/gi, /위즈덤픽/gi, /마스터/gi, /설계자/gi, /Paragon/gi,
            /^머리말[:\s]*/gm, /^목차[:\s]*/gm, /^서론[:\s]*/gm, /^결론[:\s]*/gm, /^설명[:\s]*/gm, /^참고[:\s]*/gm,
            /^#+\s+/gm, /^\*\s+/gm, /^-\s+/gm, /^\[IMAGE_PROMPT:.*?\]/gm
        ];
        bList.forEach(p => t = t.replace(p, ''));
        t = t.replace(/^[\s,\.\n\r\*\#\-]+/g, '');
        t = t.replace(/\n{3,}/g, '\n\n');
        t = t.replace(/<p>\s*<\/p>|<p>&nbsp;<\/p>/gi, ''); 
        t = t.replace(/<table/gi, '<div class="table-box no-adsense"><table');
        t = t.replace(/<\/table>/gi, '</table></div>');
        return t.trim();
    }
    const start = t.indexOf('{'); if (start === -1) return '{}';
    let count = 0; for (let i = start; i < t.length; i++) { if (t[i] === '{') count++; else if (t[i] === '}') { count--; if (count === 0) return t.substring(start, i + 1); } }
    return '{}';
}

async function callAI(model, prompt, retry = 0) {
    try { const r = await model.generateContent(prompt); return r.response.text().trim(); }
    catch (e) { if (e.message.includes('429') && retry < 5) { await new Promise(r => setTimeout(r, 25000)); return callAI(model, prompt, retry + 1); } throw e; }
}

async function genImg(desc) {
    if(!desc || !process.env.KIE_API_KEY) return '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc + ', professional corporate style, clean, high resolution, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } });
        const tid = cr.data.taskId || cr.data.data?.taskId; if(!tid) return '';
        for(let i=0; i<15; i++) { 
            await new Promise(r => setTimeout(r, 10000)); 
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + process.env.KIE_API_KEY } }); 
            const d = pr.data.data || pr.data; if(d.state === 'success') { 
                const rj = typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson; 
                const imgRes = await axios.get(rj.resultUrls[0], { responseType: 'arraybuffer' }); 
                return await new Promise(res => { const s = cloudinary.v2.uploader.upload_stream({ resource_type: 'image' }, (err, r) => res(r?.secure_url)); s.end(Buffer.from(imgRes.data)); });
            } 
        }
    } catch(e) { }
    return '';
}

async function writeAndPost(model, target, blogger, bId) {
    console.log(`\n🔱 [Grand Sovereign] v1.7.0 마스터 가이드 가동 | 테마: ${theme.name}`);
    const bpRes = await callAI(model, `[지침] 키워드 "${target}" 주제로 고도화된 전문 리포트 제목과 7개 섹션 목차를 JSON으로 기획하라. 절대 가짜 브랜드명을 쓰지 말 것. JSON: { "title":"", "chapters":[] }`);
    const bp = JSON.parse(clean(bpRes, 'obj'));
    const title = bp.title || target; 
    const chapters = (bp.chapters || []).map(c => typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c));
    
    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="toc-box"><h2>Professional Report Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`💎 [집필] ${i+1}/7: "${chapters[i]}"`);
        
        let sectPrompt = isFAQ ? 
            `다음 보고서 요약(${ctx})을 바탕으로 실사용자가 궁금해할 FAQ '30개'를 정확히 작성하라.\n1. 형식: <ul><li> HTML 사용.\n2. SEO: 마지막에 구글용 FAQ Schema JSON-LD를 반드시 포함.\n3. 금기: 가짜 브랜드명 언급 시 전체 파기.` :
            `[장 제목: ${chapters[i]}]를 4,500자 이상의 백과사전급 전문 리포트로 집필하라.\n\n[필수 지침]\n1. 분량: 섹션당 최소 1,500자 이상(상세 데이터 분석 포함).\n2. 표: 심층 비교 표 반드시 포함.\n3. 마크다운 금지: #, **, * 기호를 절대 쓰지 말고 <b>, <h3> HTML 태그만 사용할 것.\n4. 말투: AI 티가 나지 않는 고품격 전문가 문체.\n5. 브랜드: ZERO BRAND.`;
        
        const sectRaw = await callAI(model, sectPrompt);
        let sect = clean(sectRaw, 'text', chapters[i]);
        
        const sumRes = await callAI(model, `이 섹션 핵심 3문장 요약: ${sect.substring(0, 1000)}`);
        ctx += ` [S${i+1}: ${sumRes}]`;
        
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = sectRaw.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { 
                const u = await genImg(pMatch[1].trim()); 
                if(u) sect = sect + `<img src="${u}" alt="${target} - ${chapters[i]} Perspective">`; 
            }
        }
        body += `<div class="h2-container" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + sect;
    }
    body += `<div class="premium-footer"><div class="copyright">© 2026 Intelligence & Data Archives. All Rights Reserved. 무단 전재 및 재배포를 엄격히 금합니다.</div><div class="disclaimer">본 리포트는 공신력 있는 데이터를 기반으로 작성되었으며, 개별 시스템 환경에 따라 결과가 다를 수 있습니다.</div></div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, labels: ["Professional Insights", target] } });
    console.log(`\n✨ [성공] v1.7.0 Grand Sovereign 가이드 완수.`);
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
        const target = seeds.shift();
        await writeAndPost(model, target, blogger, config.blog_id);
        const g = await axios.get(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Grand Sovereign Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();