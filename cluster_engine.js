const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium p { margin-bottom: 24px; font-size: 17px; text-align: justify; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; }
  .toc-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .img-premium { max-width: 100%; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); margin-bottom: 40px; }
</style>`;

function ultraClean(raw) {
    if(!raw) return '';
    let text = raw.replace(/```json|```/gi, '').trim();
    if(text.startsWith('[') || text.startsWith('{')) {
        try {
            const obj = JSON.parse(text);
            if(Array.isArray(obj)) return obj[0].content || obj[0].chapter_content || JSON.stringify(obj);
            return obj.content || obj.chapter_content || JSON.stringify(obj);
        } catch(e) { }
    }
    return text.replace(/`/g, '').trim();
}

async function callAI(model, prompt) {
    const r = await model.generateContent('[SYSTEM: ACT AS EXPERT. OUTPUT TEXT ONLY.]\n' + prompt);
    return r.response.text().trim();
}
async function genImg(desc, kieKey, imgbbKey) {
    if(!kieKey || !desc) return '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc.replace(/[^a-zA-Z, ]/g, '') + ', high-quality photography, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + kieKey } });
        const tid = cr.data.data.taskId;
        for(let a=0; a<12; a++) { await new Promise(r => setTimeout(r, 10000));
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
            if(pr.data.data.state === 'success') {
                const url = JSON.parse(pr.data.data.resultJson).resultUrls[0];
                if(imgbbKey) { const form = new FormData(); form.append('image', url); const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() }); return ir.data.data.url; }
                return url; } }
    } catch(e) { } return '';
}
async function writeAndPost(model, target, lang, blogger, bId, pTime) {
    const bpRes = ultraClean(await callAI(model, `JSON blueprint for '${target}': {"title":"", "chapters":["Part 1", ..., "Part 7"]}. ONLY JSON.`));
    const { title, chapters } = JSON.parse(bpRes);
    console.log('Writing: ' + title);
    const hero = await genImg(await callAI(model, 'Visual for ' + title), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" class="img-premium">';
    body += '<div class="toc-box"><div class="toc-title">📋 Guide Contents</div><ul>' + chapters.map((c,i)=>`<li><a href="#sect${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    let intro = ultraClean(await callAI(model, `Write 1.5k chars introduction for: ${title}. NO JSON.`));
    body += '<p data-ke-size="size16">' + intro + '</p>'; let summary = intro.slice(-500);
    for(let i=0; i<7; i++) {
        let sect = ultraClean(await callAI(model, `[CHAPTER] Write "${chapters[i]}" for "${title}". Expert deep-dive (2.5k chars). Prev context: ${summary}. NO JSON.`));
        body += `<h2 id="sect${i+1}" class="h2-premium">🎯 ${i+1}. ${chapters[i]}</h2>`;
        body += '<p data-ke-size="size16">' + sect.replace(/\n\n/g, "</p><p data-ke-size='size16'>") + '</p>';
        summary = sect.slice(-500);
    }
    body += '</div>';
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
}
async function run() {
    console.log('Engine v1.3.67 Purifier');
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const rIdx = Math.floor(Math.random()*(config.clusters||[]).length);
    if(rIdx < 0) return;
    const mainSeed = config.clusters.splice(rIdx, 1)[0];
    let subRes = ultraClean(await callAI(model, '4 sub-topics for "' + mainSeed + '" as simple JSON array of 4 strings. e.g. ["A","B","C","D"]. ONLY JSON.'));
    let subTopics = JSON.parse(subRes).map(t => typeof t === 'string' ? t : (t.topic || t.title));
    let cTime = new Date();
    for(let t of subTopics) { cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, t, config.blog_lang, blogger, config.blog_id, new Date(cTime)); }
    cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime));
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Sync', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();