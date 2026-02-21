const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>/* CSS Omitted for brevity */</style>`;

function clean(raw, defType = 'obj') {
    if(!raw) return defType === 'text' ? '' : (defType === 'obj' ? '{}' : '[]');
    let t = raw.replace(/```(json|html|javascript|js)?/gi, '').trim();
    if (defType === 'text') {
        t = t.replace(/<!DOCTYPE.*?>/gi, '');
        t = t.replace(/<html.*?>/gi, '');
        t = t.replace(/<\\/html>/gi, '');
        t = t.replace(/<head.*?>[\\s\\S]*?<\\/head>/gi, '');
        t = t.replace(/<body.*?>/gi, '');
        t = t.replace(/<\\/body>/gi, '');
        t = t.replace(/<title.*?>[\\s\\S]*?<\\/title>/gi, '');
        return t.trim();
    }
    try {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start !== -1 && end !== -1) return t.substring(start, end + 1);
    } catch(e) { }
    return '{}';
}

async function callAI(model, prompt) {
    const r = await model.generateContent(prompt);
    return r.response.text().trim();
}
async function searchSerper(q) { try { const r = await axios.post('https://google.serper.dev/search', {q}, {headers:{'X-API-KEY':process.env.SERPER_API_KEY}}); return r.data.organic.slice(0,3).map(o=>o.snippet).join(' '); } catch(e){return '';} }

async function uploadToCloudinary(fileData) {
    const cName = process.env.CLOUDINARY_CLOUD_NAME;
    const cKey = process.env.CLOUDINARY_API_KEY;
    const cSecret = process.env.CLOUDINARY_API_SECRET;
    if(!cName || !cKey || !cSecret) return null;
    try {
        const crypto = require('crypto');
        const ts = Math.round(Date.now()/1000);
        const sig = crypto.createHash('sha1').update('timestamp='+ts+cSecret).digest('hex');
        const form = new FormData();
        form.append('file', fileData);
        form.append('timestamp', String(ts));
        form.append('api_key', cKey);
        form.append('signature', sig);
        const r = await axios.post(`https://api.cloudinary.com/v1_1/${cName}/image/upload`, form, { headers: form.getHeaders(), timeout: 30000 });
        return r.data.secure_url;
    } catch(e) { return null; }
}

async function genImg(desc, model) {
    let ep = desc; 
    try { const t = await callAI(model, 'Translate ONLY English: '+desc); ep = t.replace(/[^a-zA-Z0-9, ]/g,''); } catch(e){}
    try {
        const lRes = await axios.get(`https://lexica.art/api/v1/search?q=${encodeURIComponent(ep.substring(0,80))}`, {timeout:10000});
        if(lRes.data?.images?.length > 0) {
            const url = `https://image.lexica.art/full_jpg/${lRes.data.images[0].id}`;
            const cdn = await uploadToCloudinary(url);
            return cdn || url;
        }
    } catch(e){}
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(ep)}?width=1024&height=768&nologo=true`;
}

async function writeAndPost(model, target, blogger, bId, pTime, extra=[]) {
    const chapters = ['Intro', 'Detail1', 'Detail2', 'Detail3', 'Detail4', 'Detail5', 'FAQ'];
    const title = target + ' - Premium Guide';
    let body = STYLE + '<div class="vue-premium">';
    for(let i=0; i<chapters.length; i++) {
        const sect = clean(await callAI(model, `Write ${chapters[i]} for ${target}. HTML tags only.`), 'text');
        body += `<h2>${chapters[i]}</h2>` + sect;
    }
    body += '</div>';
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('✅ Post Done: ' + title);
}

async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    await writeAndPost(model, config.pillar_topic, blogger, config.blog_id, new Date());
}
run();