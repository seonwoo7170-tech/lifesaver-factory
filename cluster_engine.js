const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const STYLE = \`<style>
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
</style>\`;

const LIBS = {
    ko: {
        labels: { toc: '📋 안내 가이드 목차', btn: '전체 가이드 계속 읽기 🚀', faq: '❓ 자주 묻는 질문', read: '📚 추천 더 읽어보기', dis: '⚠ 안내사항' },
        disclaimer: "본 콘텐츠는 정보 제공의 목적으로 작성되었으며, 전문적인 조언을 대체하지 않습니다. 실제 적용 시 각별한 주의가 필요하며, 결과에 대해서는 책임지지 않습니다."
    },
    en: {
        labels: { toc: '📋 Table of Contents', btn: 'Read Full Guide 🚀', faq: '❓ Frequently Asked Questions', read: '📚 Further Reading', dis: '⚠ Disclaimer' },
        disclaimer: "The information provided in this article is for general informational purposes only. The author and publisher shall not be held responsible for any actions taken based on this information."
    }
};

function clean(raw) {
    if(!raw) return "";
    let c = raw.replace(/\`\`\`[a-z]*\\n?/gi, '').replace(/\`\`\`/g, '').replace(/\`/g, '').trim();
    c = c.replace(/<!DOCTYPE[\\s\\S]*?>|<html[\\s\\S]*?>|<head>[\\s\\S]*?<\\/head>|<body[\\s\\S]*?>|<\\/html>|<\\/body>/gi, '');
    c = c.replace(/<h1[^>]*>[\\s\\S]*?<\\/h1>/gi, '');
    c = c.replace(/<p>/gi, \"<p data-ke-size='size16' style='margin-bottom: 24px;'>\");
    return c.trim();
}

async function callAI(model, prompt) {
    const r = await model.generateContent(\"[VUE MASTER: NARRATIVE ONLY.]\\n\" + prompt);
    return r.response.text().trim();
}

async function genImg(desc, kieKey, imgbbKey) {
    if(!kieKey || !desc) return \"\";
    try {
        const cr = await axios.post(\"https://api.kie.ai/api/v1/jobs/createTask\", { model: \"z-image\", input: { prompt: desc.replace(/[\\\"\\n*#-]/g, '') + \", high-end editorial photography, 8k, majestic lighting\", aspect_ratio: \"16:9\" } }, { headers: { Authorization: \"Bearer \" + kieKey.trim() } });
        const tid = cr.data.data.taskId;
        let finalKieUrl = \"\";
        for(let a=1; a<=25; a++) {
            await new Promise(res => setTimeout(res, 8000));
            const pr = await axios.get(\"https://api.kie.ai/api/v1/jobs/recordInfo?taskId=\" + tid, { headers: { Authorization: \"Bearer \" + kieKey.trim() } });
            if(pr.data.data.state === 'success') { finalKieUrl = JSON.parse(pr.data.data.resultJson).resultUrls?.[0] || \"\"; break; }
            if(pr.data.data.state === 'fail') break;
        }
        if(finalKieUrl && imgbbKey) {
            const form = new FormData();
            form.append('image', finalKieUrl);
            const ir = await axios.post(\"https://api.imgbb.com/1/upload?key=\" + imgbbKey.trim(), form, { headers: form.getHeaders() });
            return ir.data.data.url;
        }
        return finalKieUrl;
    } catch(e) { console.error(\"❌ 이미지 오류:\", e.message); } return \"\";
}

async function writeAndPost(model, target, lang, blogger, bId, isPillar, prevLinks, publishTime) {
    const Lib = LIBS[lang] || LIBS.en;
    console.log(\"\\n----------------------------------------------\");
    console.log(\`🚀 [${isPillar ? '마스터 메인' : '서브 클러스터'}] 집필 시작: ${target}\`);
    
    const blueprintData = await callAI(model, \`JSON Object for article about '${target}': {\\\"title\\\":\\\"\\\", \\\"chapters\\\":[\\\"Part 1\\\", ..., \\\"Part 7\\\"]}\`);
    const { title, chapters } = JSON.parse(blueprintData.replace(/\`\`\`json|\`\`\`/g, '').trim());
    console.log(\"✅ 확정 제목: \" + title);
    
    const heroImg = await genImg(await callAI(model, \"Visual prompt for: \" + title), process.env.KIE_API_KEY, process.env.IMGBB_API_KEY);
    
    let body = STYLE + \`<div class='vue-premium'>\`;
    if(heroImg) body += \`<div class='img-center'><img src='${heroImg}' class='img-premium'></div>\`;
    body += \`<div class='toc-premium'><div class='toc-title'>\${Lib.labels.toc}</div><ul class='toc-list'>\${chapters.map((c, i) => \`<li class='toc-item'><a href='#s\${i+1}' class='toc-link'>· ${c}</a></li>\`).join('')}</ul></div>\`;
    
    let currentContext = await callAI(model, \`Write a top-tier narrative introduction (1500+ chars) for article: ${title}.\`);
    body += clean(currentContext);
    let writtenSummary = currentContext.substring(currentContext.length - 1500);

    for(let i=0; i < 7; i++) {
        process.stdout.write(\`   -> 챕터 ${i+1}/7 연재 중... \\\\\r\`);
        const sectionContent = await callAI(model, \`[DUPLICATION SHIELD]\\\\nPrevious context: \${writtenSummary}\\\\n\\\\nInstruction: Write chapter '${chapters[i]}' for '${title}'. Expert deep-dive (MIN 2500 chars). NO MARKDOWN.\`);
        body += \`<h2 id='s\${i+1}' class='h2-premium'>🎯 ${i+1}. ${chapters[i]}</h2>\`;
        body += clean(sectionContent);
        writtenSummary = sectionContent.substring(sectionContent.length - 1500);
    }
    
    body += \"</div>\";
    const res = await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, published: publishTime.toISOString() } });
    console.log(\"✅ 발행 완료: \" + res.data.url);
    return { title, url: res.data.url };
}

async function run() {
    console.log(\"\\n[VUE] 최종 무결성 엔진 v1.3.58 기동 중...\");
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: \"gemini-2.0-flash\" });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });

    const pool = config.clusters || [];
    if(pool.length === 0) return console.log(\"❌ 키워드 소진\");
    const rIdx = Math.floor(Math.random() * pool.length);
    const mainSeed = pool.splice(rIdx, 1)[0];
    
    const subTopicsJson = await callAI(model, \`Generate 4 expert sub-topics related to '${mainSeed}'. Output ONLY a JSON array: [\\\"Topic 1\\\", \\\"Topic 2\\\", \\\"Topic 3\\\", \\\"Topic 4\\\"].\`);
    const subTopics = JSON.parse(subTopicsJson.replace(/\`\`\`json|\`\`\`/g, '').trim());
    
    const subLinks = []; let currentTime = new Date();
    for(const t of subTopics) {
        currentTime.setMinutes(currentTime.getMinutes() + 180);
        const r = await writeAndPost(model, t, config.blog_lang || 'ko', blogger, config.blog_id, false, [], new Date(currentTime));
        subLinks.push(r);
    }
    
    currentTime.setMinutes(currentTime.getMinutes() + 180);
    await writeAndPost(model, mainSeed, config.blog_lang || 'ko', blogger, config.blog_id, true, subLinks, new Date(currentTime));

    config.clusters = pool;
    const url = \`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json\`;
    const gRes = await axios.get(url, { headers: { Authorization: \`token ${process.env.GITHUB_TOKEN}\` } });
    await axios.put(url, { message: '[VUE] Config Update v1.3.58', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha: gRes.data.sha }, { headers: { Authorization: \`token ${process.env.GITHUB_TOKEN}\` } });
}
run();