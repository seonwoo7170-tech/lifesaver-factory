const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Pretendard:wght@400;700&display=swap');
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.8; max-width: 850px; margin: 0 auto; padding: 20px; word-break: keep-all; }
  .h2-premium { background-color: palegreen; border-radius: 8px; color: #000; font-size: 22px; font-weight: bold; margin-top: 50px; padding: 14px; border-left: 8px solid #333; }
  .toc-box { background-color: #f8f9fa; border: 2px solid #333; border-radius: 12px; padding: 25px; margin: 30px 0; }
  .link-box { background-color: #e3fafc; border: 2px dashed #0c8599; border-radius: 12px; padding: 20px; margin-top: 50px; }
</style>`;

function clean(raw) {
    if(!raw) return '';
    let t = raw.replace(/```json|```/gi, '').trim();
    if(t.startsWith('[') || t.startsWith('{')) {
        try {
            const o = JSON.parse(t);
            const c = Array.isArray(o) ? (o[0].content || o[0].chapter_content || o[0].text) : (o.content || o.chapter_content || o.text);
            if(c) return c;
        } catch(e) { }
    }
    return t.replace(/`/g, '').trim();
}

async function callAI(model, prompt, retry = 0) {
    try {
        const r = await model.generateContent('[SYSTEM: ACT AS A PREMIUM TECH COLUMNIST. NO CHAT.]\n' + prompt);
        return r.response.text().trim();
    } catch (e) {
        // [429 ERROR] Rate Limit handling with Exponential Backoff
        if ((e.message.includes('429') || e.message.includes('Resource exhausted')) && retry < 5) {
            const waitTime = Math.pow(2, retry) * 20000; // 20s, 40s, 80s, 160s, 320s
            console.log(`   ⚠️ [Rate Limit] 429 감지. ${waitTime/1000}초 후 재시도 합니다... (${retry+1}/5)`);
            await new Promise(res => setTimeout(res, waitTime));
            return callAI(model, prompt, retry + 1);
        }
        throw e;
    }
}
async function genImg(desc, kieKey, imgbbKey) {
    if(!desc) return '';
    console.log('   ㄴ [2단계] AI 프리미엄 이미지 생성 중...');
    let imageUrl = '';

    // 1. Kie.ai (Premium Engine)
    if(kieKey && kieKey.length > 5) {
        try {
            const cr = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', { 
                model: 'z-image', 
                input: { prompt: desc.replace(/[^a-zA-Z, ]/g, '') + ', high-end, editorial photography, 8k', aspect_ratio: '16:9' } 
            }, { headers: { Authorization: 'Bearer ' + kieKey } });
            
            const tid = cr.data.data.taskId;
            for(let a=0; a<12; a++) { 
                await new Promise(r => setTimeout(r, 10000));
                const pr = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, { headers: { Authorization: 'Bearer ' + kieKey } });
                if(pr.data.data.state === 'success') {
                    imageUrl = JSON.parse(pr.data.data.resultJson).resultUrls[0];
                    break;
                }
                if(pr.data.data.state === 'fail' || pr.data.data.state === 'failed') break;
            }
        } catch(e) { console.log('   ㄴ [Kie.ai] 엔진 지연 또는 오류... 폴백 가동'); }
    }

    // 2. Pollinations.ai (Stable Fallback)
    if(!imageUrl) {
        try {
            console.log('   ㄴ [폴백] Pollinations 엔진으로 전환합니다.');
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(desc)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}&model=flux`;
        } catch(e) { }
    }

    if(!imageUrl) return '';

    // 3. ImgBB Upload
    try {
        if(imgbbKey && imgbbKey.length > 5) {
            console.log('   ㄴ [이미지] ImgBB 영구 저장소 업로드 중...');
            const form = new FormData(); form.append('image', imageUrl);
            const ir = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, { headers: form.getHeaders() });
            return ir.data.data.url;
        }
        return imageUrl;
    } catch(e) { 
        console.log('   ㄴ [이미지] ImgBB 업로드 실패 (원본 URL 사용)'); 
        return imageUrl; 
    }
}
async function writeAndPost(model, target, lang, blogger, bId, pTime, extraLinks = [], idx, total) {
    console.log(`\n[진행 ${idx}/${total}] 연재 대상: '${target}'`);
    console.log('   ㄴ [1단계] SEO 최적화 블루프린트 설계 중...');
    const bpPrompt = `Create professional SEO article blueprint for: "${target}". ONLY JSON: {"title":"", "chapters":["Part 1", ..., "Part 7"]}.`;
    const bpRes = await callAI(model, bpPrompt);
    const { title, chapters } = JSON.parse(clean(bpRes));
    console.log('   ㄴ [확정 제목] ' + title);

    const hero = await genImg(await callAI(model, 'Visual description for: ' + title), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    
    let body = STYLE + '<div class="vue-premium">';
    if(hero) body += '<img src="' + hero + '" class="h2-premium" style="max-width:100%; border-radius:15px;">';
    body += '<div class="toc-box"><h2>📋 Expert Guide Contents</h2><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    console.log('   ㄴ [3단계] 고품격 서론 집필 중 (2,000자 목표)...');
    let intro = clean(await callAI(model, `Write captivating introduction (2k chars) for: ${title}. NO JSON.`));
    body += '<p>' + intro + '</p>'; let summary = intro.slice(-500);
    
    for(let i=0; i<7; i++) {
        const isLast = (i === 6);
        const endPrompt = isLast ? ' THIS IS THE FINAL CHAPTER. Provide a comprehensive summary and a powerful, professional conclusion that leaves a lasting impression. ACT AS A TOP-TIER COLUMNIST.' : '';
        console.log(`   ㄴ [4단계] [챕터 ${i+1}/7] '${chapters[i]}' 연재 중${isLast ? ' (결론 포함)' : ''}...`);
        let sect = clean(await callAI(model, `Topic: "${chapters[i]}" in "${title}". Expert deep-dive MIN 3000 CHARACTERS. Context: ${summary}.${endPrompt} NO JSON.`));
        body += `<h2 id="s${i+1}" class="h2-premium">🎯 ${i+1}. ${chapters[i]}</h2><p>${sect.replace(/\n\n/g, "</p><p>")}</p>`;
        summary = sect.slice(-500);
    }
    
    if(extraLinks.length > 0) {
        body += '<div class="link-box"><h3>🔗 연관 프리미엄 가이드 둘러보기</h3><ul>' + extraLinks.map(l => `<li><a href="${l.url}">${l.title}</a></li>`).join('') + '</ul></div>';
    }
    body += '</div>';
    
    console.log('   ㄴ [5단계] 구글 블로거 발행 데이터 전송 중...');
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: pTime.toISOString() } });
    console.log('   ㄴ ✅ 발행 완료! 주소: ' + res.data.url);
    return { title, url: res.data.url };
}
async function run() {
    console.log('\n--- [VUE 인피니트 관제 시스템 v1.3.69] 가동 ---');
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });
    
    const pool = config.clusters || []; if(!pool.length) return console.log('❌ 집필할 키워드가 없습니다.');
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('\n🚀 메인 테마: ' + mainSeed);
    
    let subRes = clean(await callAI(model, 'Generate 4 professional sub-topics for "' + mainSeed + '" as flat JSON array of strings. ONLY JSON.'));
    let subTopics = JSON.parse(subRes).map(t => typeof t === 'string' ? t : (t.topic || t.title));
    console.log('🎯 생성된 서브 주제: ' + subTopics.join(' | '));
    
    let subLinks = []; let cTime = new Date();
    for(let i=0; i < subTopics.length; i++) {
        cTime.setMinutes(cTime.getMinutes()+180);
        subLinks.push(await writeAndPost(model, subTopics[i], config.blog_lang, blogger, config.blog_id, new Date(cTime), [], i+1, 5));
    }
    
    cTime.setMinutes(cTime.getMinutes()+180);
    await writeAndPost(model, mainSeed, config.blog_lang, blogger, config.blog_id, new Date(cTime), subLinks, 5, 5);
    
    console.log('\n🏁 [데이터 동기화] 남은 키워드 저장 중...');
    const g = await axios.get('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    await axios.put('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/cluster_config.json', { message: 'Cloud Sync v1.3.69', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    console.log('🏆 모든 배치가 완벽하게 전역 연재되었습니다!');
}
run();