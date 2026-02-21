const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');.vue-premium{font-family:'Pretendard',sans-serif;color:#333;line-height:1.8;max-width:850px;margin:0 auto;padding:20px;word-break:keep-all;letter-spacing:-0.5px;}.h2-premium{background-color:#fce4ec;padding:15px;border-radius:8px;border-left:8px solid #333;margin-top:40px;}.toc-box{background-color:#f8f9fa;border:2px solid #333;border-radius:12px;padding:25px;margin:30px 0;}.vue-premium table{width:100%;border-collapse:collapse;margin:20px 0;text-align:center;}.vue-premium th{background-color:#fce4ec;padding:12px;}.vue-premium td{padding:10px;border-bottom:1px solid #eee;}</style>`;

function clean(raw, type = 'obj') {
  if(!raw) return type === 'text' ? '' : '{}';
  let t = raw.replace(/```(json|html|js)?/gi, '').trim();
  if(type === 'text') {
    return t.replace(/<html.*?>|<\/html>|<head.*?>[\s\S]*?<\/head>|<body.*?>|<\/body>|<title.*?>[\s\S]*?<\/title>|<!DOCTYPE.*?>/gi, '').trim();
  }
  try { const s = t.indexOf('{'); const e = t.lastIndexOf('}'); if(s!==-1 && e!==-1) return t.substring(s, e+1); } catch(e){}
  return '{}';
}

async function callAI(model, prompt) { try { const r = await model.generateContent(prompt); return r.response.text().trim(); } catch(e){ if(e.message.includes('429')) { console.log('Wait 30s...'); await new Promise(r=>setTimeout(r,30000)); return callAI(model, prompt); } throw e; } }
async function uploadToCloudinary(u) { try { const crypto = require('crypto'); const ts = Math.round(Date.now()/1000); const sig = crypto.createHash('sha1').update('timestamp='+ts+process.env.CLOUDINARY_API_SECRET).digest('hex'); const form = new FormData(); form.append('file', u); form.append('timestamp', String(ts)); form.append('api_key', process.env.CLOUDINARY_API_KEY); form.append('signature', sig); const r = await axios.post(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, form, { headers: form.getHeaders(), timeout: 30000 }); return r.data.secure_url; } catch(e){return null;} }
async function genImg(desc, model) { let ep = desc; try { const t = await callAI(model, 'Translate ONLY English: '+desc); ep = t.replace(/[^a-zA-Z0-9, ]/g,'').trim().substring(0,200); } catch(e){} try { const lRes = await axios.get(`https://lexica.art/api/v1/search?q=${encodeURIComponent(ep)}`, {timeout:10000}); if(lRes.data?.images?.length > 0) { const url = `https://image.lexica.art/full_jpg/${lRes.data.images[0].id}`; const cdn = await uploadToCloudinary(url); return cdn || url; } } catch(e){} return `https://image.pollinations.ai/prompt/${encodeURIComponent(ep)}?width=1024&height=768&nologo=true`; }

async function writeAndPost(model, target, blogger, bId, pTime) {
  console.log('🚀 Working on: ' + target);
  const bpRes = await callAI(model, `Topic: "${target}". Return ONLY JSON: {"title":"...","chapters":["ch1","ch2","ch3","ch4","ch5","ch6","ch7"]}`);
  const bp = JSON.parse(clean(bpRes, 'obj'));
  const title = bp.title || target; const chapters = bp.chapters || [];
  const hero = await genImg(title, model);
  let body = STYLE + '<div class="vue-premium">'; if(hero) body += `<img src="${hero}" style="width:100%;border-radius:15px;">`;
  for(const ch of chapters) {
    const sect = clean(await callAI(model, `Write body for ${ch} (Topic: ${target}). NO HTML Skeleton. P, UL, TABLE only.`), 'text');
    body += `<div class="h2-premium"><h2>${ch}</h2></div>` + sect;
  }
  body += '</div>';
  await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
}

async function run() {
  const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const blogger = google.blogger({ version: 'v3', auth });
  const pool = config.clusters || []; if(!pool.length) return;
  const seed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
  await writeAndPost(model, seed, blogger, config.blog_id, new Date());
  const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
  await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'update', content: Buffer.from(JSON.stringify({...config, clusters: pool}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
}
run();