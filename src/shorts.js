const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "output");
const API = "https://api.groq.com/openai/v1/chat/completions";
const COLORS = {
  primary: "#667eea", accent: "#764ba2", gold: "#FFD700",
  bg1: "#0f0c29", bg2: "#302b63", bg3: "#24243e",
  text: "#FFFFFF", shadow: "#00000080", highlight: "#FF6B6B",
};
const FONT = "Noto-Sans-Arabic";

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

async function groqChat(prompt, system, maxTok = 1000) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: maxTok, temperature: 0.8 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.choices?.[0]?.message) throw new Error("No response from Groq");
  return data.choices[0].message.content.replace(/\*+|#+/g, "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
}

async function generateScript() {
  const topics = [
    { t: "حقيقة علمية مذهلة", h: "🌍" },
    { t: "نصيحة ذهبية لتطوير الذات", h: "🧠" },
    { t: "قصة نجاح ملهمة", h: "⭐" },
    { t: "معلومة غريبة وعجيبة", h: "🤯" },
    { t: "سر من أسرار النجاح", h: "🔑" },
    { t: "عادة يومية تغير حياتك", h: "🔄" },
    { t: "خطأ شائع في العمل الحر", h: "⚠️" },
    { t: "تقنية حديثة في AI", h: "🤖" },
    { t: "طريقة لزيادة الإنتاجية", h: "⚡" },
    { t: "درس من حياة العظماء", h: "🏆" },
    { t: "اختراع غيّر العالم", h: "💡" },
    { t: "نصيحة مالية ذكية", h: "💰" },
  ];
  const topic = pick(topics);
  console.log(`📝 الموضوع: ${topic.t}`);

  const script = await groqChat(
    `اكتب سكريبت شورت يوتيوب قوي وجذاب لمدة 50-55 ثانية عن: ${topic.t}

القواعد الصارمة:
- افتتاحية قوية جداً (أول 3-5 ثواني): سؤال صادم أو حقيقة مدهشة
- 5-7 جمل قصيرة ومشوقة (70-90 كلمة)
- كل جملة لا تزيد عن 12 كلمة — سهلة القراءة والفهم
- استخدم أسلوب قصصي مشوق
- الخاتمة: "شكراً للمتابعة. إذا أعجبك الفيديو لا تنسى الاشتراك 🔔"
- لا تستخدم علامات "*" أو "#" أو علامات تنصيص

السكريبت فقط (لا تعليقات):`,
    "أنت كاتب محتوى يوتيوب شورت محترف. تكتب بالعربية الفصحى السهلة.",
    600
  );

  const sentences = script.split(/[.!؟\n]+/).filter(s => s.trim().length > 8);
  let hook = sentences.find(s => /^(لماذا|كيف|هل|ما|متى|من|ألا|تخيل|هل تعلم|سر|حقيقة|خطأ)/.test(s.trim()))
    || sentences.find(s => /\d+/.test(s))
    || sentences[0];
  hook = (hook || script).substring(0, 70);

  console.log(`📄 الطول: ${script.length} حرف, ${sentences.length} جملة`);
  console.log(`🎣 الهوك: ${hook}`);
  return { script, hook, sentences, topic: topic.t, emoji: topic.h };
}

function textToSpeech(text) {
  console.log("🎙️ توليد الصوت...");
  const audioFile = path.join(OUT, "audio.mp3");
  const textFile = path.join(OUT, "speech.txt");
  fs.writeFileSync(textFile, text, "utf-8");
  try {
    execSync(`gtts-cli -l ar -f "${textFile}" -o "${audioFile}"`, { stdio: "pipe", timeout: 60000 });
  } catch {
    execSync(`espeak -v arabic -f "${textFile}" -w "${audioFile}"`, { stdio: "pipe", timeout: 60000 });
  }
  return audioFile;
}

function getDuration(file) {
  try {
    return Math.ceil(parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { stdio: "pipe", timeout: 5000 }).toString().trim())) || 30;
  } catch { return 30; }
}

function getSentenceTimings(dur, sentences) {
  const per = dur / sentences.length;
  return sentences.map((s, i) => ({
    start: Math.round(i * per * 10) / 10,
    end: Math.round((i + 1) * per * 10) / 10,
    text: s.trim(),
  }));
}

function escapeFf(t) {
  return t.replace(/'/g, "’").replace(/:/g, "\\:").replace(/[{}\\]/g, "").replace(/%/g, "\\%").replace(/\[/g, "(").replace(/\]/g, ")");
}

function createGradientBg(outputPath) {
  console.log("🎨 خلفية متدرجة...");
  const c1 = pick(["#0f0c29", "#1a0024", "#0d1b2a", "#1b0000", "#000814", "#001219"]);
  const c2 = pick(["#302b63", "#4a0072", "#1b3a4b", "#4a001a", "#001d3d", "#003049"]);
  const c3 = pick(["#24243e", "#7b2d8e", "#2d6a4f", "#6b0018", "#003566", "#004756"]);
  execSync(`ffmpeg -y -f lavfi -i "color=c=black:s=1080x1920:d=1,format=rgba,geq=r='${c1.slice(0,2)}X/W+${c2.slice(0,2)}*(1-X/W)':g='${c1.slice(2,4)}X/W+${c2.slice(2,4)}*(1-X/W)':b='${c1.slice(4,6)}X/W+${c2.slice(4,6)}*(1-X/W)'" -frames:v 1 "${outputPath}"`, { stdio: "pipe", timeout: 10000 });
}

function createMusic(duration) {
  console.log("🎵 موسيقى خلفية احترافية...");
  const musicFile = path.join(OUT, "music.mp3");

  const chordProgressions = [
    [262, 330, 392], [294, 370, 440], [330, 392, 494], [349, 440, 523],
    [392, 494, 587], [440, 554, 659], [494, 587, 698], [523, 659, 784],
  ];

  let filter = "";
  const notes = [];
  const numChords = Math.max(4, Math.floor(duration / 4));
  for (let i = 0; i < numChords; i++) {
    const chord = chordProgressions[i % chordProgressions.length];
    chord.forEach(freq => {
      const vol = 0.03 + (Math.sin(i * 0.5) * 0.01);
      if (notes.length > 0) filter += ",";
      filter += `aevalsrc=sin(2*PI*${freq}*t)*${vol.toFixed(3)}:s=44100:d=3.5`;
      notes.push(freq);
    });
  }
  filter += `,concat=n=${notes.length}:v=0:a=1,atrim=0:${duration}`;

  execSync(`ffmpeg -y -f lavfi -i "${filter}" "${musicFile}"`, { stdio: "pipe", timeout: 30000 });

  // Add bass layer
  const bassFile = path.join(OUT, "bass.mp3");
  const bassFreq = pick([65, 73, 82, 98, 110, 130]);
  execSync(`ffmpeg -y -f lavfi -i "aevalsrc=sin(2*PI*${bassFreq}*t)*0.06+sin(2*PI*${bassFreq * 2}*t)*0.02:s=44100:d=${duration}" "${bassFile}"`, { stdio: "pipe", timeout: 15000 });

  const mixedFile = path.join(OUT, "music_mixed.mp3");
  execSync(`ffmpeg -y -i "${musicFile}" -i "${bassFile}" -filter_complex "[0:a]volume=0.6[a];[1:a]volume=0.8[b];[a][b]amix=inputs=2:duration=first" -ac 1 -ar 44100 "${mixedFile}"`, { stdio: "pipe", timeout: 15000 });

  return mixedFile;
}

function mixAudio(voiceFile, musicFile) {
  console.log("🔊 خلط صوت + موسيقى...");
  const mixedFile = path.join(OUT, "mixed.mp3");
  execSync(`ffmpeg -y -i "${voiceFile}" -i "${musicFile}" -filter_complex "[0:a]afftdn=nf=-20,volume=2.0[voice];[1:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=first:weights=1.5 0.5" -ac 1 -ar 44100 "${mixedFile}"`, { stdio: "pipe", timeout: 15000 });
  return mixedFile;
}

function renderVideo(audioFile, data) {
  console.log("🎬 بناء الفيديو الاحترافي...");
  const outputFile = path.join(OUT, "shorts.mp4");
  const dur = getDuration(audioFile);
  const { hook, sentences, timings, topic, emoji } = data;

  const bg = path.join(OUT, "bg.png");
  createGradientBg(bg);

  // Zoom animation
  let f = `[0:v]scale=1280:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='1+0.005*t':d=${dur * 25}:s=1080x1920,fps=25`;

  // Semi-transparent overlay for text readability
  f += `,drawbox=x=0:y=0:w=1080:h=360:color=black@0.4:t=fill:enable='between(t,0,4)'`;
  f += `,drawbox=x=0:y=1200:w=1080:h=500:color=black@0.3:t=fill`;

  // TOPIC INTRO CARD (0-4s)
  const topicSafe = escapeFf(topic);
  f += `,drawtext=text='${emoji}':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=200:enable='between(t,0,4)':alpha='if(lt(t,0.5),t/0.5,if(gt(t,3.5),(4-t)/0.5,1))'`;
  f += `,drawtext=text='${topicSafe}':fontcolor=white:fontsize=52:font=Arial:x=(w-text_w)/2:y=300:enable='between(t,0,4)':shadowcolor=black@0.8:shadowx=3:shadowy=3:alpha='if(lt(t,0.5),t/0.5,if(gt(t,3.5),(4-t)/0.5,1))'`;
  f += `,drawtext=text='شاهد حتى النهاية 😱':fontcolor=${COLORS.gold}:fontsize=28:font=Arial:x=(w-text_w)/2:y=380:enable='between(t,0,4)':alpha='if(lt(t,1),0,if(lt(t,2),(t-1)/0.5,if(gt(t,3.5),(4-t)/0.5,1)))'`;

  // HOOK - Large bold text (4-8s)
  const hookSafe = escapeFf(hook);
  f += `,drawtext=text='${hookSafe}':fontcolor=white:fontsize=44:font=Arial:x=(w-text_w)/2:y=550:enable='between(t,4,${Math.min(8, dur)})':shadowcolor=black@0.9:shadowx=3:shadowy=3:alpha='if(lt(t,4.3),(t-4)/0.3,if(gt(t,${Math.min(7.5, dur)}),(${Math.min(8, dur)}-t)/0.5,1))'`;

  // CAPTIONS - Sentence by sentence
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    const s = escapeFf(t.text.substring(0, 50));
    const start = t.start;
    const end = t.end;
    const fadeTime = 0.25;

    // Main caption text
    f += `,drawtext=text='${s}':fontcolor=white:fontsize=36:font=Arial:x=(w-text_w)/2:y=1300:shadowcolor=black@0.9:shadowx=2:shadowy=2:enable='between(t,${start.toFixed(1)},${end.toFixed(1)})':alpha='if(lt(t,${(start + fadeTime).toFixed(1)}),(t-${start.toFixed(1)})/${fadeTime.toFixed(2)},if(gt(t,${(end - fadeTime).toFixed(1)}),(${end.toFixed(1)}-t)/${fadeTime.toFixed(2)},1))'`;

    // Sentence counter dots at bottom
    const dotX = 540 - (timings.length * 10) + (i * 20);
    f += `,drawtext=text='●':fontcolor=${i === 0 ? COLORS.primary : "#666666"}:fontsize=16:x=${dotX}:y=1850:enable='between(t,${start.toFixed(1)},${end.toFixed(1)})'`;
  }

  // KEYWORD HIGHLIGHTS - Overlay extra emphasis words
  const keywords = data.sentences.filter(s => s.length < 25).slice(0, 3);
  keywords.forEach((kw, i) => {
    const idx = data.sentences.indexOf(kw);
    if (idx >= 0 && idx < timings.length) {
      const t = timings[idx];
      f += `,drawtext=text='${escapeFf(kw)}':fontcolor=${COLORS.highlight}:fontsize=40:font=Arial:borderw=2:bordercolor=white@0.5:x=(w-text_w)/2:y=1000:enable='between(t,${t.start.toFixed(1)},${(t.start + 1.5).toFixed(1)})':alpha='if(lt(t,${(t.start + 0.2).toFixed(1)}),(t-${t.start.toFixed(1)})/0.2,if(gt(t,${(t.start + 1.2).toFixed(1)}),(${(t.start + 1.5).toFixed(1)}-t)/0.3,1))'`;
    }
  });

  // SUBSCRIBE BUTTON (last 5 seconds)
  const subStart = Math.max(0, dur - 5);
  f += `,drawtext=text='🔔':fontcolor=${COLORS.gold}:fontsize=64:x=(w-text_w)/2:y=800:enable='gte(t,${subStart.toFixed(1)})':alpha='if(lt(t,${(subStart + 0.5).toFixed(1)}),t-${subStart.toFixed(1)},1)'`;
  f += `,drawtext=text='اشترك ليصلك كل جديد':fontcolor=${COLORS.gold}:fontsize=38:font=Arial:x=(w-text_w)/2:y=880:enable='gte(t,${(subStart + 0.3).toFixed(1)})':shadowcolor=black@0.9:shadowx=3:shadowy=3:alpha='if(lt(t,${(subStart + 0.8).toFixed(1)}),(t-${(subStart + 0.3).toFixed(1)})/0.5,1)'`;
  f += `,drawtext=text='تفعيل الجرس 🔔':fontcolor=white:fontsize=26:font=Arial:x=(w-text_w)/2:y=940:enable='gte(t,${(subStart + 1).toFixed(1)})':alpha='if(lt(t,${(subStart + 1.5).toFixed(1)}),(t-${(subStart + 1).toFixed(1)})/0.5,if(lt(t,${(subStart + 3).toFixed(1)}),1,if(lt(t,${(subStart + 4).toFixed(1)}),(${(subStart + 4).toFixed(1)}-t)/1,0)))'`;

  // PROGRESS BAR
  const barW = 1080;
  f += `,drawbox=x=0:y=1900:w=${barW}:h=4:color=#333333:t=fill`;
  const progressW = Math.floor(barW / dur);
  f += `,drawbox=x=0:y=1900:w=${progressW}*t:h=4:color=${COLORS.primary}:enable='between(t,0,${dur})'`;

  // BRANDING - Small text at bottom
  f += `,drawtext=text='AI Shorts':fontcolor=white@0.15:fontsize=14:font=Arial:x=20:y=1880:enable='between(t,0,${dur})'`;

  console.log(`⏱️ ${dur}ث, ${timings.length} جملة`);
  execSync(`ffmpeg -y -loop 1 -i "${bg}" -i "${audioFile}" -filter_complex "${f}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k -pix_fmt yuv420p -shortest "${outputFile}"`, { stdio: "pipe", timeout: 180000 });
  console.log(`✅ الفيديو جاهز: ${outputFile}`);
  return outputFile;
}

async function uploadToYouTube(videoPath, data, dur) {
  console.log("📤 رفع إلى يوتيوب...");
  const { google } = require("googleapis");
  const c = JSON.parse(process.env.GOOGLE_CLIENT_SECRET).installed;
  const o = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris[0]);
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const { hook, sentences, topic } = data;
  const tags = ["shorts", "معلومة", "تطوير الذات", "نصائح", topic, "يوتيوب", "عربي", "shorts عربي", "ai shorts"];
  const desc = `${hook}\n\n📌 في هذا الفيديو:\n${sentences.slice(0, 5).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n")}\n\n💬 شاركنا رأيك في التعليقات! هل تطبق هذه النصيحة؟\n\n📥 منتجات رقمية مفيدة:\n👉 https://bybilal.gumroad.com\n\n🔔 اشترك وفعل الجرس ليصلك كل جديد يومياً\n\n#${tags.slice(0, 10).join(" #")}`;

  const r = await google.youtube({ version: "v3", auth: o }).videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: { title: hook.substring(0, 90), description: desc, tags, categoryId: "22" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(videoPath) },
  });
  console.log(`✅ رفع: https://youtube.com/shorts/${r.data.id}`);
  return r.data.id;
}

async function run() {
  console.log("🎥 يوتيوب شورت الاحترافي يعمل...");
  fs.mkdirSync(OUT, { recursive: true });

  // Clean old files (>24h)
  try {
    const now = Date.now();
    fs.readdirSync(OUT).forEach(f => {
      const p = path.join(OUT, f);
      if (fs.statSync(p).isFile() && (now - fs.statSync(p).mtimeMs) > 86400000) fs.unlinkSync(p);
    });
  } catch {}

  const data = await generateScript();
  const voice = textToSpeech(data.script);
  const dur = getDuration(voice);
  data.timings = getSentenceTimings(dur, data.sentences);

  const music = createMusic(dur);
  const mixed = mixAudio(voice, music);
  const video = renderVideo(mixed, data);
  await uploadToYouTube(video, data, dur);
  console.log("✅ تم بنجاح!");
}

run().catch(e => { console.error("❌", e.message, e.stack?.split("\n").slice(0, 3).join("\n")); process.exit(1); });
