
      const { google } = require('googleapis');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const fs = require('fs');
      const axios = require('axios');
      const FormData = require('form-data');

      const NARRATIVES = ["실전 경험이 왜 중요한지 제가 직접 몸소 느꼈던 이야기를 해보려 합니다. 이론만 알 때는 몰랐던 진짜 현장의 목소리가 있더라고요.","솔직히 고백하자면 저도 처음엔 시간 낭비를 엄청나게 했습니다. 이 방법을 몰라서 며칠 밤을 꼬박 새우며 헛수고를 했던 기억이 나네요.","지금 이 글을 읽는 분들이 느끼실 그 막막함, 저도 누구보다 잘 압니다. 처음에 저도 컴퓨터 앞에서 어디서부터 손을 대야 할지 몰라 한참을 멍하니 있었거든요.","결국 정답은 아주 가까운 기본기에 있더라고요. 수많은 기교를 부리다가 결국 다시 처음으로 돌아와서야 비로소 깨달은 핵심을 공유합니다.","많은 전문가들이 말하지 않는 맹점이 하나 있습니다. 겉으로 보기엔 완벽해 보이지만, 실제로는 치명적인 허점이 숨겨져 있는 그런 부분들이죠.","이 고민 때문에 며칠 동안 밤잠을 설쳤던 것 같아요. 어떻게 하면 더 효율적이고 정확하게 처리할 수 있을까 고민하다 찾아낸 비책입니다.","제가 겪은 뼈아픈 실패의 기록이 여러분께는 소중한 교훈이 되었으면 합니다. 제 돈과 시간을 버려가며 얻어낸 '진짜' 데이터들입니다.","제 초보 시절을 떠올려보면 참 무모했던 것 같습니다. 그때 제가 지금의 저를 만났다면 제 고생이 훨씬 줄어들었을 텐데 말이죠.","요즘 들어 제게 가장 자주 물어보시는 질문들을 하나로 모았습니다. 사실 다들 비슷비슷한 부분에서 고민하고 계시다는 걸 알게 됐거든요.","처음의 그 당혹감을 이겨내고 나니 비로소 보이는 것들이 있었습니다. 막다른 길이라고 생각했던 곳이 사실은 새로운 시작점이었더라고요.","댓글로 많은 분들이 응원해주시는 덕분에 오늘 날 잡고 제대로 정리해봅니다. 제가 아는 모든 것을 가감 없이 쏟아부으려고 해요.","국내 자료만으로는 부족해서 제가 직접 해외 포럼과 논문까지 샅샅이 뒤져가며 검증했습니다. 교차 검증을 마친 데이터만 담았습니다.","단순한 추측이 아니라 지난 6개월간 제가 직접 수치를 추적하고 분석한 결과입니다. 숫자는 절대로 거짓말을 하지 않으니까요.","글을 다 읽고 나서 '아, 이거 미리 알았더라면' 하고 후회하지 않으시도록, 핵심 포인트를 아주 꼼꼼하게 짚어드릴게요.","가까운 친동생이나 친구에게 비밀 꿀팁을 전해주듯, 아주 편하고 솔직하게 풀어보겠습니다. 복잡한 용어는 최대한 쉽게 설명해드릴게요.","자전거를 처음 배울 때와 비슷합니다. 한 번 원리만 깨우치면 그 이후로는 몸이 알아서 반응하게 되는, 그런 본질적인 감각을 전해드릴게요.","많은 분들이 의외의 부분에서 큰 경제적 손해를 보고 계시더라고요. 제가 그 오류들을 하나씩 진단해보고 해결책을 제시하겠습니다.","일반적인 블로그 글이 아니라 전문 서적과 최신 논문까지 파헤치며 정리한 깊이 있는 콘텐츠입니다. 정보의 밀도가 다를 거예요.","작업을 진행하다 발견한 의외의 반전 때문에 저도 깜짝 놀랐습니다. 아마 여러분도 이 글을 읽시면 무릎을 탁 치게 될 거예요.","오늘 이 글이 여러분의 인생이나 사업에 작은 터닝포인트가 되기를 확신합니다. 제가 느꼈던 그 전율을 여러분도 함께 느끼셨으면 좋겠어요."];
      const MASTER_GUIDELINE = ${safeJson(MASTER_PROMPT.trim())};

  // [PART E - 리서치 프로토콜] 실시간 검색 엔진
  async function searchWeb(query) {
    const key = process.env.SERPER_API_KEY;
    if (!key) return "검색 결과 없음 (API 키 미설정)";
    try {
      console.log("🔍 [리서치] 2026년 최신 데이터 스캔 중: " + query);
      const res = await axios.post('https://google.serper.dev/search', { q: query, gl: 'kr', hl: 'ko' }, { headers: { 'X-API-KEY': key } });
      const results = res.data.organic.slice(0, 5);
      results.forEach((o, i) => {
        console.log("   ㄴ [참고 " + (i + 1) + "] " + o.title + " (" + o.link + ")");
      });
      return results.map(o => "[출처: " + o.title + "]\n" + o.snippet + "\nURL: " + o.link).join("\n\n");
    } catch (e) { return "검색 실패: " + e.message; }
  }

  function clean(raw) {
    if (!raw) return '';
    let t = raw.replace(/\`\`\`(json|html)?/gi, '').trim();
    if (t.startsWith('{') && t.endsWith('}')) return t;
    const match = t.match(/\\{.*?\\}/s);
    return match ? match[0] : t;
  }

  function cleanHTML(h) {
    var c = h;
    c = c.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
    var parts = c.split('**');
    if (parts.length > 1) {
      c = parts.map((p, i) => (i % 2 === 1) ? '<strong>' + p + '</strong>' : p).join('');
    }
    c = c.split('*').join('');
    return c.trim();
  }

  function insertSchema(c, title) {
    const faqs = [];
    const rx = /<strong>Q\\.\\s*(.+?)<\\/strong>\\s*<p>A\\.\\s*(.+?)<\\/p>/gi;
      let m;
      while ((m = rx.exec(c)) !== null && faqs.length < 10) {
        faqs.push({ q: m[1].replace(/<[^>]*>/g, '').trim(), a: m[2].replace(/<[^>]*>/g, '').trim() });
    }
      const s = {"@context": "https://schema.org", "@graph": [{"@type": "Article", "headline": title, "datePublished": new Date().toISOString() }, {"@type": "FAQPage", "mainEntity": faqs.map(f => ({"@type": "Question", "name": f.q, "acceptedAnswer": {"@type": "Answer", "text": f.a } })) }] };
      return c + `\n<script type="application/ld+json">\${JSON.stringify(s)}<\\/script>`;
}

        async function genImg(label, prompt, title, model) {
    const kieKey = process.env.KIE_API_KEY;
        const imgbbKey = process.env.IMGBB_API_KEY;
        let imageUrl = '';

        console.log("🎨 [비주얼:" + label + "] 프롬프트 설계: " + prompt);

        if (kieKey) {
        try {
          console.log("   ㄴ [" + label + "] Kie.ai 렌더링 엔진 가동...");
        const res = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', {model: 'z-image', input: {prompt: prompt + ", premium photography, 8k, professional lightning", aspect_ratio: "16:9" } }, {headers: {Authorization: 'Bearer ' + kieKey } });
        const tid = res.data.taskId || res.data.data?.taskId;
        if (tid) {
                for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 4000));
        const check = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid, {headers: {Authorization: 'Bearer ' + kieKey } });
        const st = check.data.state || check.data.data?.state;
        if (st === 'success') {
                        const rj = check.data.resultJson || check.data.data?.resultJson;
        imageUrl = (typeof rj === 'string' ? JSON.parse(rj).resultUrls : rj.resultUrls)[0];
        console.log("   ㄴ [" + label + "] 이미지 생성 완료! URL: " + imageUrl);
        break;
                    }
                }
            }
        } catch(e) {console.log("   ⚠️ [" + label + "] 생성 지연"); }
    }
        if (imageUrl && imgbbKey) {
        try {
            const altRes = await model.generateContent("Create a descriptive Korean alt text for: " + prompt + ". Only text.");
        const altText = altRes.response.text().trim().replace(/[\"']/g, '');
        const form = new FormData();
        form.append('image', imageUrl);
        const upload = await axios.post('https://api.imgbb.com/1/upload?key=' + imgbbKey, form, {headers: form.getHeaders() });
        return {url: upload.data.data.url, alt: altText };
        } catch(e) { return {url: imageUrl, alt: title }; }
    }
        return {url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280", alt: title };
}

        async function writeAndPost(model, target, blogger, bId, pTime) {
    const currentDate = new Date().toISOString().split('T')[0];
        console.log("🚀 [1/5] 지능형 리서치: 2026년 실시간 데이터 스캔...");
        console.log("   ㄴ [키워드] " + target);
        const latestNews = await searchWeb(target + " 최신 정보 요금 혜택 후기");

        console.log("🚀 [2/5] 컨텍스트 분석: 블로그 아카이브 및 페르소나 매칭...");
        const archiveRes = await blogger.posts.list({blogId: bId, maxResults: 50, fields: 'items(title,url)' });
    const archiveContext = (archiveRes.data.items || []).map(p => p.title + " (" + p.url + ")").join("\\n");
        const selectedNarrative = NARRATIVES[Math.floor(Math.random() * NARRATIVES.length)];
        console.log("   ㄴ [페르소나] " + selectedNarrative);
        console.log("   ㄴ [아카이브] " + (archiveRes.data.items || []).length + "개의 기존 글 맥락 분석 완료");

        console.log("🚀 [3/5] 서사 생성: [v3.0.0 Ultimate] 옴니 오라클 엔진 가동...");
        const finalPrompt = MASTER_GUIDELINE +
        "\\n\\n[CURRENT_DATE: " + currentDate + "]" +
        "\\n[LATEST_RESEARCH_DATA]:\\n" + latestNews +
        "\\n[SELECTED_PERSONA]: " + selectedNarrative +
        "\\n[BLOG_ARCHIVES]:\\n" + archiveContext +
        "\\n[TARGET_TOPIC]: " + target;

        const result = await model.generateContent(finalPrompt);
        const rawData = result.response.text();
        const data = JSON.parse(clean(rawData));

        console.log("   ㄴ [생성 완료] 제목: " + data.title);
        console.log("   ㄴ [URL 슬러그] " + data.permalink);
        console.log("   ㄴ [검색 설명] " + (data.description || "자동 생성됨").slice(0, 50) + "...");
        console.log("   ㄴ [라벨] " + (Array.isArray(data.labels) ? data.labels.join(", ") : data.labels));

        console.log("🚀 [4/5] 비주얼 자산: 4-Quad 이미지 전략 배치 (병렬 생성)...");
        const [imgTop, imgMid1, imgMid2, imgBtm] = await Promise.all([
        genImg("TOP", data.image_prompts["1"] || data.image_prompts.top, data.title, model),
        genImg("MID1", data.image_prompts["2"] || data.image_prompts.mid1, data.title, model),
        genImg("MID2", data.image_prompts["3"] || data.image_prompts.mid2, data.title, model),
        genImg("BTM", data.image_prompts["4"] || data.image_prompts.btm, data.title, model)
        ]);

    const wrapImg = (i, t, h) => `<div style="text-align:center; margin:35px 0;"><img src="\${i.url}" alt="\${i.alt}" title="\${h}" style="width:100%; border-radius:15px;"><p style="font-size:12px; color:#888; margin-top:8px;">\${i.alt}</p></div>`;

        console.log("🚀 [5/5] 최종 프로세싱: 인라인 스타일 검증 및 쿼드 치환...");
        let content = cleanHTML(data.content);

        // 치환 로그 추가
        const replaceCount = (content.match(/\\[\\[IMG_/g) || []).length;
        console.log("   ㄴ [치환] " + replaceCount + "개의 본문 이미지 플레이스홀더 치환 중...");

        content = content.replace('[[IMG_MID1]]', wrapImg(imgMid1, imgMid1.alt, data.title));
        content = content.replace('[[IMG_MID2]]', wrapImg(imgMid2, imgMid2.alt, data.title));
        content = content.replace('[[IMG_BTM]]', wrapImg(imgBtm, imgBtm.alt, data.title));

        const fullHtml = wrapImg(imgTop, imgTop.alt, data.title) + insertSchema(content, data.title);
        console.log("   ㄴ [검증] HTML 인라인 스타일 및 스키마 삽입 완료 (용량: " + fullHtml.length + " bytes)");

        console.log("📤 [발행] 구글 블로거 서버로 전송 중...");
    const labels = Array.isArray(data.labels) ? data.labels : (data.labels || "").split(',').map(s=>s.trim()).filter(s=>s);

        await blogger.posts.insert({
          blogId: bId,
        requestBody: {
          title: data.title || target,
        labels: labels,
        content: fullHtml,
        customMetaData: data.description || '',
        published: pTime.toISOString()
        } 
    });
        console.log("✨ [천기누설] 미션 완료: '" + (data.title || target) + "' 발행 성공!");
}

        async function run() {
    const config = JSON.parse(fs.readFileSync('cluster_config.json', 'utf8'));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({model: 'gemini-2.0-flash' });
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const blogger = google.blogger({version: 'v3', auth });

        const target = config.clusters[Math.floor(Math.random()*config.clusters.length)];
        await writeAndPost(model, target, blogger, config.blog_id, new Date());
      }
      run().catch(err => {
          console.error("❌ Critical Engine Failure:", err);
          process.exit(1);
      });
      