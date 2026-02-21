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
  .vue-premium { font-family: 'Pretendard', sans-serif; color: #333; line-height: 2.0; max-width: 900px; margin: 40px auto; padding: 0 40px; background:#fff; word-break:keep-all; font-size: 16px; letter-spacing: -0.5px; }
  .vue-premium * { font-family: 'Pretendard', sans-serif !important; font-size: 16px !important; line-height: 2.0 !important; color: #1e293b !important; }
  .h2-container { margin-top: 120px; margin-bottom: 60px; }
  .h2-container h2 { font-size: 48px !important; font-weight: 800; color: ${theme.text} !important; border-bottom: 15px solid ${theme.color}; padding-bottom: 15px; display: inline-block; line-height: 1.1 !important; margin: 0; letter-spacing: -0.5px; }
  .vue-premium h3 { font-size: 32px !important; color: #0f172a !important; margin-top: 80px; margin-bottom: 35px; font-weight: 700; border-left: 15px solid ${theme.color}; padding: 20px 30px; background: linear-gradient(to right, ${theme.bg}, #ffffff); border-radius: 8px 30px 30px 8px; line-height: 1.3 !important; }
  .vue-premium b { color: ${theme.text} !important; font-weight: 800; border-bottom: 2px solid ${theme.color}50; }
  .vue-premium p { margin-bottom: 40px; text-align: left; }
  .spacer-div { height: 90px; margin: 60px 0; border-top: 2px dashed #e2e8f0; position: relative; }
  .spacer-div::after { content: 'Strategic Domain Mastery'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #ffffff; padding: 0 30px; color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; }
  .info-box { background: ${theme.bg}; border: 1px solid ${theme.color}50; border-radius: 20px; padding: 40px; margin: 60px 0; position: relative; }
  .info-box b { border: 0 !important; color: ${theme.text} !important; font-size: 18px !important; }
  .table-box { width: 100%; overflow-x: auto; margin: 80px 0; border-radius: 20px; border: 1px solid #e2e8f0; overflow:hidden; }
  .vue-premium th { background: #f1f5f9; color: ${theme.text} !important; padding: 25px; text-align: left; font-size: 17px !important; font-weight: 900; border-bottom: 6px solid ${theme.color}; }
  .vue-premium tr:nth-child(even) { background-color: ${theme.bg}50; }
  .vue-premium td { border-bottom: 1px solid #f1f5f9; padding: 22px; font-size: 16px !important; }
  .premium-footer { border-top: 5px solid ${theme.color}; padding-top: 80px; margin-top: 180px; text-align: center; }
  .copyright { color: ${theme.text} !important; font-weight: 900; font-size: 17px !important; }
</style>`;

function chiefAuditor(raw, titleHead = '') {
    if(!raw) return '';
    let t = raw.replace(/```(json|html|js|md)?/gi, '').trim();
    t = t.replace(/<(!DOCTYPE|html|body|head|meta|link).*?>/gi, '').replace(/<\/(html|body|head|title|meta)>/gi, '');
    t = t.replace(/<title[\s\S]*?<\/title>/gi, '').replace(/style="[^"]*"/gi, '');
    t = t.replace(/\\n/g, '
');
    t = t.replace(/\*\*+(.*?)\*\*+/g, '<b>$1</b>'); 
    t = t.replace(/^\s*#+.*$/gm, ''); t = t.replace(/^[-*]{3,}$/gm, '');
    
    // [v2.1.1] Absolute Purist: Header & List Number Stripping
    t = t.replace(/<(h[1-6])>\s*(\d+\.)*\d*\.?\s*(.*?)\s*<\/\1>/gi, '<$1>$3</$1>'); // 헤더 번호 삭제
    t = t.replace(/<li>\s*(\d+\.)*\d*\.?\s*(.*?)\s*<\/li>/gi, '<li>$2</li>'); // 리스트(FAQ) 번호 삭제
    
    // [v2.1.1] Bold-in-Header Execution (헤더 내 볼드 중복 제거)
    t = t.replace(/<(h[1-6])>\s*<b>(.*?)<\/b>\s*<\/\1>/gi, '<$1>$2</$1>');
    t = t.replace(/<b>\s*<h[1-6]>(.*?)<\/h[1-6]>\s*<\/b>/gi, '<h3>$1</h3>');
    t = t.replace(/<h[4-6]>(.*?)<\/h[4-6]>/gi, '<h3>$1</h3>');
    
    // [v2.1.1] Meta-Label & Bridge Smashing
    t = t.replace(/^(결론|요약|서론|설명|참고|정보|Data|Introduction|Summary|Conclusion|사실|진짜|와|앗)[:\s]*/gmi, '');
    t = t.replace(/^[^<가-힣a-zA-Z0-9]+(?=[가-힣a-zA-Z])/gm, ''); // 문두 특수문자 파편 최종 소거

    const trash = [ /물론이죠/gi, /도움이 되길/gi, /요약하자면/gi, /결론적으로/gi, /준비했습니다/gi, /작성하겠습니다/gi, /살펴보겠습니다/gi, /참고해주세요/gi, /본 섹션에서는/gi, /위즈덤픽/gi, /마스터/gi, /설계자/gi, /Paragon/gi, /^그럼 지금부터.*$/gm, /^이상으로.*$/gm, /^아래는.*$/gm, /^먼저.*$/gm, /^다음으로.*$/gm, /^첫째로.*$/gm, /^마지막으로.*$/gm ];
    trash.forEach(p => t = t.replace(p, ''));
    t = t.replace(/^[\s,\.\n\r\*\#\-\>\•]+/g, '');
    t = t.replace(/<p>\s*<\/p>|<p>&nbsp;<\/p>/gi, ''); // 빈 태그 분쇄

    let pArr = t.split(/<\/p>/gi);
    let audited = "";
    pArr.forEach((p, idx) => {
        if (p.trim()) { audited += p + '</p>'; if ((idx + 1) % 4 === 0 && idx < pArr.length - 2) audited += '<div class="spacer-div"></div>'; }
    });
    t = audited.replace(/<table/gi, '<div class="table-box no-adsense"><table');
    t = t.replace(/<\/table>/gi, '</table></div>');
    return t.trim();
}

async function writeAndPost(model, target, blogger, bId) {
    console.log(`\n🔱 [Omni-Sync Sovereign] v2.1.5 가동 | 지침/스타일 예시 완벽 동기화 시작`);
    const bpRes = await callAI(model, `[MASTER] 키워드 "${target}" 리포트 제목과 7개 장 목차 JSON. **절대 숫자/마크다운 금지.** 장 제목은 통찰력 있게. JSON: { "title":"", "chapters":[] }`);
    const bp = JSON.parse(chiefAuditor(bpRes));
    const title = (bp.title || target).replace(/^[\d\.\*\-\s>]+/, '');
    const chapters = (bp.chapters || []).map(c => (typeof c === 'object' ? (c.title || c.chapter || c.name || String(c)) : String(c)).replace(/^[\d\.\*\-\s>]+/, ''));
    
    let body = STYLE + '<div class="vue-premium">';
    body += '<div class="info-box"><b>CORE INSIGHT INDEX</b><ul>' + chapters.map((c,i)=>`<li><a href="#s${i+1}">${c}</a></li>`).join('') + '</ul></div>';
    
    const METAPHORS = ['다이어트', '마법봉', '좀비', '레고 블록', '요리 레시피', '퍼즐 조각', '마라톤', '돼지 저금통', '체스판', '텃밭 가꾸기', '운전면허', '첫 월급', '이사', '여행 계획', '냉장고 정리', '옷장 정리', '은행 적금', '게임 레벨업', '대청소', '장보기 리스트'];
    
    let ctx = "";
    for(let i=0; i<chapters.length; i++) {
        const isFAQ = (i === chapters.length - 1);
        console.log(`💎 [다부서 동시 사역] ${i+1}/7: "${chapters[i]}"`);
        
        let sectPrompt = isFAQ ? 
            `[SEO/STRATEGY] 요약(${ctx}) 기반 전문가 FAQ 30개작성. **번호/마크다운 금지.** 질문 난이도를 '상-10개, 중-10개, 하-10개'로 철저히 배분하여 업계 전문가 수준으로 작성하라. HTML <ul><li> 사용. 마지막에 JSON-LD 스키마 포함.` :
            `[EDITORIAL/MASTER] 장 제목: ${chapters[i]}. 1,500자 이상 전문 분석.\n\n[스타일/지침 예시 강제]\n1. **스토리텔링**: [내 예전 착각/경험 -> 부딪히며 깨달은 원인 분석 -> 결과 및 해결책] 구조로 생동감 있게 집필하라.\n2. **비유 표현**: 섹션마다 반드시 '${METAPHORS[i % METAPHORS.length]}' 비유를 1개 이상 사용하여 깊은 인상을 남겨라.\n3. **문체**: '~합니다', '~하십시오' 확신 문체 필수. <b> 태그로 핵심 강조.\n4. **금지**: 양쪽 정렬(justify) 느낌의 문장 늘이기 금지, 문두 메타 라벨 금지, 마크다운/번호 금지.`;
        
        const sectRaw = await callAI(model, sectPrompt);
        let sect = chiefAuditor(sectRaw, chapters[i]);
        const sumRes = await callAI(model, `핵심 요약 3문장: ${sect.substring(0, 1000)}`);
        ctx += ` [S${i+1}: ${sumRes}]`;
        
        if(!isFAQ && (i === 0 || i === 2 || i === 4)) { 
            const pMatch = sectRaw.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/);
            if(pMatch) { const u = await genImg(pMatch[1].trim()); if(u) sect = sect + `<img src="${u}" alt="${target} Professional Resource">`; }
        }
        body += `<div class="h2-container" id="s${i+1}"><h2>${chapters[i]}</h2></div>` + sect;
    }
    body += `<div class="premium-footer"><div class="copyright">© 2026 Archive of Sovereign Intelligence Collective.</div></div></div>`;
    await blogger.posts.insert({ blogId: bId, requestBody: { title, content: body, labels: ["Elite Analysis", target] } });
    console.log(`\n✨ [연합 사역 성공] v2.1.0 High-Density Sovereign 출고.`);
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
        await axios.put(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/cluster_config.json`, { message: 'Density Sync', content: Buffer.from(JSON.stringify({...config, clusters: seeds}, null, 2)).toString('base64'), sha: g.data.sha }, { headers: { Authorization: 'token '+process.env.GITHUB_TOKEN } });
    } catch(e) { process.exit(1); }
}
run();