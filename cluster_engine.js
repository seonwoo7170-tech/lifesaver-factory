const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', -apple-system, sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .vue-premium p { margin-bottom: 24px; font-size: 17px; text-align: justify; }
  .img-premium { max-width: 100%; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); margin-bottom: 40px; }
  .toc-premium { background-color: #f8f9fa; border-radius: 12px; border: 2px solid #333; padding: 25px; margin: 30px 0; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: black; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
</style>`;

const LIBS = {
    ko: { labels: { toc: '📋 안내 가이드 목차', faq: '❓ 질문과 답변' } },
    en: { labels: { toc: '📋 Table of Contents', faq: '❓ FAQ' } }
};

function clean(raw) {
    if(!raw) return '';
    return raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/`/g, '').trim();
}

async function callAI(model, prompt) {
    const r = await model.generateContent('[VUE MASTER: NARRATIVE ONLY.]\n' + prompt);
    return r.response.text().trim();
}

async function genImg(desc, kieKey, imgbbKey) {
    if(!kieKey || !desc) return '';
    try {
        const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { model: 'z-image', input: { prompt: desc.replace(/[\"\n*#-]/g, '') + ', high-end photography, cinematic lighting', aspect_ratio: '16:9' } }, { headers: { Authorization: 'Bearer ' + kieKey.trim() } });
        const tid = cr.data.data.taskId;
        let finalUrl = '';
        for(let a=1; a<=15; a++) {
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
    } catch(e) { console.error('Img Error', e.message); return ''; }
}

async function writeAndPost(model, target, lang, blogger, bId, publishTime) {
    const Lib = LIBS[lang] || LIBS.en;
    const bpData = await callAI(model, `Generate JSON blueprint for article '` + target + `': {"title":"", "chapters":["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5", "Chapter 6", "Chapter 7"]}`);
    const { title, chapters } = JSON.parse(bpData.replace(/```json|```/g, '').trim());
    console.log('집필 시작: ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" class="img-premium">';
    body += '<div class="toc-premium"><h3>' + Lib.labels.toc + '</h3><ul>' + chapters.map((c,i)=>'<li><a href="#s' + (i+1) + '">' + c + '</a></li>').join('') + '</ul></div>';

    let intro = await callAI(model, 'Write 1.5k chars introduction for: ' + title);
    body += clean(intro); let summary = intro.slice(-500);

    for(let i=0; i<7; i++) {
        let sect = await callAI(model, 'Context: ' + summary + '\n\nInstruction: Write chapter "' + chapters[i] + '" for "' + title + '" (2.5k+ chars)');
        body += '<h2 id="s' + (i+1) + '" class="h2-premium">🎯 ' + (i+1) + '. ' + chapters[i] + '</h2>' + clean(sect);
        summary = sect.slice(-500);
    }
    body += '</div>';

    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: publishTime.toISOString() } });
    console.log('✅ 발행 완료: ' + title);
}

async function run() {
    console.log('--- [인피니트 엔진 v1.3.65] 기동 ---');
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });

    const pool = config.clusters || [];
    if(!pool.length) { console.log('❌ 집필할 키워드가 없습니다.'); return; }
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('🚀 선택된 주제: ' + mainSeed);

    const subTopics = JSON.parse((await callAI(model, 'Generate 4 specific sub-topics for "' + mainSeed + '" as JSON array.')).replace(/```json|```/g,'').trim());
    let cTime = new Date();

    for(let t of subTopics) {
        cTime.setMinutes(cTime.getMinutes() + 180);
        await writeAndPost(model, t, config.blog_lang, blogger, config.blog_id, new Date(cTime));
    }

    cTime.setMinutes(cTime.getMinutes() + 180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime));

    config.clusters = pool;
    const url = 'https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/contents/cluster_config.json';
    const g = await axios.get(url, { headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN } });
    await axios.put(url, { message: 'Keyword Sync', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN } });
    console.log('🏁 모든 배치가 성공적으로 연재되었습니다!');
}
run();