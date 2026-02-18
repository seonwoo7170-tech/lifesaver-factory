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

async function callAI(model, prompt) {
    const r = await model.generateContent('[VUE MASTER: NARRATIVE ONLY.]\n' + prompt);
    return r.response.text().trim();
}

async function run() {
    console.log('--- [VUE 진단 모드 v1.3.64] ---');
    const secrets = [
        { name: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY },
        { name: 'KIE_API_KEY', val: process.env.KIE_API_KEY },
        { name: 'IMGBB_API_KEY', val: process.env.IMGBB_API_KEY },
        { name: 'BLOG_ID', val: process.env.BLOG_ID },
        { name: 'GOOGLE_REFRESH_TOKEN', val: process.env.GOOGLE_REFRESH_TOKEN }
    ];
    let missing = false;
    secrets.forEach(s => {
        if(!s.val || s.val.length < 5) { console.log('❌ 경고: ' + s.name + '이 깃허브 설정에 등록되지 않았거나 짧습니다!'); missing = true; }
        else { console.log('✅ 확인: ' + s.name + ' 장착 완료'); }
    });
    if(missing) { console.log('\n🛡️ 대표님! 깃허브 Settings -> Secrets -> Actions 메뉴에서 위의 값을 등록해 주세요!'); return; }

    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const blogger = google.blogger({ version: 'v3', auth });

    const pool = config.clusters || [];
    const mainSeed = pool.splice(Math.floor(Math.random()*pool.length), 1)[0];
    console.log('🚀 메인 테마 결정: ' + mainSeed);
    const subTopics = JSON.parse((await callAI(model, '4 sub-topics for ' + mainSeed + ' as JSON array.')).replace(/```json|```/g,'').trim());
    console.log('✅ 서브 주제 생성 완료: ' + subTopics.join(', '));

    // [블로거 포스팅 로직 생략(안정성 위해)]
    console.log('🎉 테스트 모드가 성공적으로 완료되었습니다! (비밀값 장착 확인됨)');
    // 실제 포스팅 로직은 다음 릴리즈에서 풀-가동됩니다.
}
run();