const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', -apple-system, sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: black; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
</style>`;

function clean(raw) { return raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/`/g, '').trim(); }
async function callAI(model, prompt) {
    const r = await model.generateContent('[OUTPUT ONLY JSON ARRAY OR RAW NARRATIVE. NO CHAT.]\n' + prompt);
    return r.response.text().trim();
}
async function genImg(desc, kieKey, imgbbKey) {
    if(!kieKey || !desc) return '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc.replace(/[\"\n*#-]/g, '') + ', photography, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + kieKey } });
        const tid = cr.data.data.taskId;
        for(let a=1; a<=10; a++) { await new Promise(r => setTimeout(r, 10000));
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
            if(pr.data.data.state === 'success') {
               const url = JSON.parse(pr.data.data.resultJson).resultUrls?.[0];
               if(imgbbKey) { const form = new FormData(); form.append('image', url); const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() }); return ir.data.data.url; }
               return url; } }
    } catch(e) { } return '';
}
async function writeAndPost(model, target, lang, blogger, bId, pTime) {
    const prompt = `Generate JSON blueprint for article topic '${target}': {"title":"", "chapters":["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"]}. ONLY JSON.`;
    const bpData = clean(await callAI(model, prompt));
    const { title, chapters } = JSON.parse(bpData);
    console.log('Writing: ' + title);
    const hero = await genImg(await callAI(model, 'Visual for ' + title), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" class="h2-premium" style="max-width:100%;">';
    body += '<ul>' + chapters.map((c,i)=>`<li>${c}</li>`).join('') + '</ul>';
    let summary = '';
    for(let c of chapters) {
        let sect = await callAI(model, `Prev: ${summary}\n\nWrite chapter "${c}" for "${title}" (Expert, 2k chars).`);
        body += '<h2 class="h2-premium">' + c + '</h2>' + clean(sect);
        summary = sect.slice(-500);
    }
    body += '</div>';
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
}
async function run() {
    console.log('Engine v1.3.66 Iron');
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const pool = config.clusters || []; if(!pool.length) return;
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('Seed: ' + mainSeed);
    let subRes = clean(await callAI(model, 'Generate 4 sub-topics for "' + mainSeed + '" as flat JSON array of 4 strings. e.g. ["A","B","C","D"]. ONLY JSON.'));
    let subTopics = JSON.parse(subRes).map(t => typeof t === 'string' ? t : (t.topic || t.title || JSON.stringify(t)));
    console.log('Subs: ' + subTopics.join('|'));
    let cTime = new Date();
    for(let t of subTopics) { cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, t, config.blog_lang, blogger, config.blog_id, new Date(cTime)); }
    cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime));
    config.clusters = pool;
    const url = 'https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/contents/cluster_config.json';
    const g = await axios.get(url, { headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN } });
    await axios.put(url, { message: 'Sync', content: Buffer.from(JSON.stringify(config,null,2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN } });
}
run();