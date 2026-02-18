const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', -apple-system, sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium p { margin-bottom: 24px; font-size: 17px; text-align: justify; }
  .img-center { text-align: center; margin-bottom: 40px; }
  .img-premium { max-width: 100%; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); }
  .img-sub { max-width: 100%; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin: 30px 0; }
  .toc-premium { background-color: whitesmoke; border-radius: 12px; border: 2px solid #333; margin: 20px auto; padding: 25px; }
  .toc-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; }
  .toc-list { list-style-type: none; padding: 0; }
  .toc-item { margin-bottom: 8px; }
  .toc-link { color: #0056b3; text-decoration: none; font-weight: 500; }
  .reading-box { background-color: #fff9db; border: 2px solid #fab005; border-radius: 15px; padding: 20px; margin: 30px 0; }
  .reading-title { font-weight: bold; margin-bottom: 12px; display: block; }
  .reading-list { margin: 0; padding-left: 20px; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: black; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .faq-premium { background-color: #ffd8a8; border-radius: 12px; color: black; font-size: 20px; font-weight: bold; margin-top: 50px; padding: 15px; border-left: 8px solid #e67e22; }
  .disclaimer-box { background-color: #f8f9fa; border: 1px dashed #dee2e8; border-radius: 12px; padding: 25px; margin-top: 60px; color: #6c757d; font-size: 14px; }
</style>`;

const LIBS = {
    ko: { labels: { toc: '📋 안내 가이드 목차', btn: '계속 읽기 🚀', faq: '❓ 질문', read: '📚 추천', dis: '⚠ 안내' }, disclaimer: '본 콘텐츠는 전문가 상담을 대체하지 않습니다.' },
    en: { labels: { toc: '📋 TOC', btn: 'Read More 🚀', faq: '❓ FAQ', read: '📚 Reading', dis: '⚠ Disclaimer' }, disclaimer: 'For info only.' }
};

function clean(raw) {
    if(!raw) return '';
    let c = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/`/g, '').trim();
    c = c.replace(/<!DOCTYPE[\s\S]*?>|<html[\s\S]*?>|<head>[\s\S]*?<\/head>|<body[\s\S]*?>|<\/html>|<\/body>/gi, '');
    c = c.replace(/<p>/gi, "<p data-ke-size='size16' style='margin-bottom: 24px;'>");
    return c.trim();
}

async function callAI(model, prompt) {
    const r = await model.generateContent('[VUE MASTER: NARRATIVE ONLY.]\n' + prompt);
    return r.response.text().trim();
}

async function genImg(desc, kieKey, imgbbKey) {
    if(!kieKey || !desc) return '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc.replace(/[\"\n*#-]/g, '') + ', high-end photography, 8k', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + kieKey.trim() } });
        const tid = cr.data.data.taskId;
        let finalUrl = '';
        for(let a=1; a<=10; a++) {
            await new Promise(r => setTimeout(r, 8000));
            const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey.trim() } });
            if(pr.data.data.state === 'success') { finalUrl = JSON.parse(pr.data.data.resultJson).resultUrls?.[0] || ''; break; }
        }
        if(finalUrl && imgbbKey) {
            const form = new FormData(); form.append('image', finalUrl);
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey.trim(), form, { headers: form.getHeaders() });
            return ir.data.data.url;
        }
        return finalUrl;
    } catch(e) { console.error('Img Error', e.message); } return '';
}

async function writeAndPost(model, target, lang, blogger, bId, isPillar, publishTime) {
    const Lib = LIBS[lang] || LIBS.en;
    const bpData = await callAI(model, `JSON article blueprint for '` + target + `': {"title":"", "chapters":["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"]}`);
    const { title: tTitle, chapters } = JSON.parse(bpData.replace(/```json|```/g, '').trim());
    console.log('연재 중: ' + tTitle);
    const hero = await genImg(await callAI(model, 'Visual prompt for ' + tTitle), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    let content = STYLE + "<div class='vue-premium'>";
    if(hero) content += "<div class='img-center'><img src='" + hero + "' class='img-premium'></div>";
    content += "<div class='toc-premium'><div class='toc-title'>" + Lib.labels.toc + "</div><ul>" + chapters.map((c,i)=>"<li><a href='#s" + (i+1) + "'>· " + c + "</a></li>").join('') + "</ul></div>";
    let intro = await callAI(model, 'Write 1.5k chars introduction for ' + tTitle);
    content += clean(intro); let summary = intro.slice(-500);
    for(let i=0; i<7; i++) {
        let sect = await callAI(model, '[DUPLICATION SHIELD] Context: ' + summary + '\n\nWrite chapter ' + chapters[i] + ' for ' + tTitle + ' (2k+ chars)');
        content += "<h2 id='s" + (i+1) + "' class='h2-premium'>🎯 " + (i+1) + ". " + chapters[i] + "</h2>" + clean(sect);
        summary = sect.slice(-500);
    }
    content += "</div>";
    await blogger.posts.insert({ blogId: bId, requestBody: { title: tTitle, content, published: publishTime.toISOString() } });
    return { title: tTitle };
}

async function run() {
    console.log('Engine v1.3.63 Start');
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    const rIdx = Math.floor(Math.random()*(config.clusters||[]).length);
    const mainSeed = config.clusters.splice(rIdx, 1)[0];
    const subTopics = JSON.parse((await callAI(model, '4 sub-topics for ' + mainSeed + ' as JSON array.')).replace(/```json|```/g,'').trim());
    let cTime = new Date();
    for(let t of subTopics) { cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, t, config.blog_lang, blogger, config.blog_id, false, new Date(cTime)); }
    cTime.setMinutes(cTime.getMinutes()+180); await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, true, new Date(cTime));
    const url = "https://api.github.com/repos/" + process.env.GITHUB_REPOSITORY + "/contents/cluster_config.json";
    const g = await axios.get(url, { headers: { Authorization: "token " + process.env.GITHUB_TOKEN } });
    await axios.put(url, { message: 'Sync', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: "token " + process.env.GITHUB_TOKEN } });
}
run();