const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "output");
const API = "https://api.groq.com/openai/v1/chat/completions";

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

async function generateScript() {
  const topics = [
    "حقيقة علمية مذهلة", "نصيحة ذهبية لتطوير الذات", "قصة نجاح ملهمة",
    "معلومة غريبة وعجيبة", "سر من أسرار النجاح", "عادة يومية تغير حياتك",
    "خطأ شائع في العمل الحر", "تقنية حديثة في AI", "طريقة لزيادة الإنتاجية",
    "درس من حياة العظماء",
  ];
  const topic = pick(topics);
  console.log(`📝 كتابة: ${topic}`);

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "أنت كاتب محتوى يوتيوب شورت محترف. تكتب بالعربية." },
        { role: "user", content: `اكتب سكريبت شورت لمدة 55 ثانية عن: ${topic}

المطلوب:
- افتتاحية قوية (أول 5 ثواني)
- 5-7 جمل (80-100 كلمة)
- خاتمة: "إذا أعجبك الفيديو لا تنسى الإعجاب والاشتراك 🔔"
- استخدم أسلوب مشوق وسهل

السكريبت فقط: ` }
      ],
    }),
  });

  const data = await res.json();
  let script = data.choices[0].message.content
    .replace(/\*+/g, "").replace(/#+/g, "")
    .replace(/^["'\s]+/, "").replace(/["'\s]+$/, "")
    .trim();

  const hook = script.split(/[.\n!؟]/)[0] || script.substring(0, 60);
  console.log(`📄 السكريبت: ${script.substring(0, 80)}...`);
  return { script, hook };
}

function textToSpeech(text) {
  console.log("🔊 صوت...");
  const audioFile = path.join(OUTPUT_DIR, "audio.mp3");
  const textFile = path.join(OUTPUT_DIR, "speech.txt");
  fs.writeFileSync(textFile, text, "utf-8");

  try {
    execSync(`gtts-cli -l ar -f "${textFile}" -o "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
  } catch {
    execSync(`espeak -v arabic -f "${textFile}" -w "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
  }
  return audioFile;
}

function downloadBackground(p) {
  console.log("🖼️ تحميل صورة خلفية...");
  try {
    execSync(`curl -s -L "https://picsum.photos/1080/1920" -o "${p}"`, { stdio: "pipe", timeout: 10000 });
  } catch {}
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
    const colors = ["1a237e", "4a148c", "004d40", "b71c1c", "0d47a1", "4e342e", "1b5e20", "e65100"];
    execSync(`ffmpeg -y -f lavfi -i "color=c=#${pick(colors)}:s=1080x1920:d=1" -frames:v 1 "${p}"`, { stdio: "pipe", timeout: 5000 });
  }
}

function getDuration(file) {
  try {
    return Math.ceil(parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { stdio: "pipe", timeout: 5000 }).toString().trim())) || 30;
  } catch { return 30; }
}

function splitScript(script) {
  const sentences = script.split(/[.!؟\n]/).map(s => s.trim()).filter(s => s.length > 5);
  if (sentences.length === 0) sentences.push(script);
  return sentences;
}

function getSentenceTimings(totalDur, sentences) {
  const timings = [];
  let perSentence = totalDur / sentences.length;
  for (let i = 0; i < sentences.length; i++) {
    timings.push({
      start: Math.round(i * perSentence * 10) / 10,
      end: Math.round((i + 1) * perSentence * 10) / 10,
      text: sentences[i],
    });
  }
  return timings;
}

function createMusic(duration) {
  console.log("🎵 موسيقى خلفية...");
  const musicFile = path.join(OUTPUT_DIR, "music.mp3");

  const notes = [262, 330, 392, 523, 392, 330, 262, 440, 494, 523, 587, 523, 494, 440, 392, 330];
  let filter = "";
  for (let i = 0; i < Math.min(notes.length, Math.ceil(duration / 2)); i++) {
    if (i > 0) filter += ",";
    filter += `aevalsrc=sin(2*PI*${notes[i]}*t)*sin(2*PI*${notes[(i + 1) % notes.length]}*t):s=44100:d=2,volume=0.04`;
  }
  filter += `,concat=n=${Math.min(notes.length, Math.ceil(duration / 2))}:v=0:a=1,atrim=0:${duration}`;

  execSync(`ffmpeg -y -f lavfi -i "${filter}" "${musicFile}"`, { stdio: "pipe", timeout: 30000 });
  return musicFile;
}

function mixAudio(voiceFile, musicFile) {
  console.log("🔊 خلط صوت + موسيقى...");
  const mixedFile = path.join(OUTPUT_DIR, "mixed.mp3");
  execSync(`ffmpeg -y -i "${voiceFile}" -i "${musicFile}" -filter_complex "[0:a]volume=1.2[voice];[1:a]volume=0.1[music];[voice][music]amix=inputs=2:duration=first" -ac 1 -ar 44100 "${mixedFile}"`, { stdio: "pipe", timeout: 15000 });
  return mixedFile;
}

function createVideo(audioFile, hook, sentences, timings) {
  console.log("🎬 بناء الفيديو...");
  const outputFile = path.join(OUTPUT_DIR, "shorts.mp4");
  const bg = path.join(OUTPUT_DIR, "bg.jpg");
  const dur = getDuration(audioFile);

  downloadBackground(bg);
  console.log(`⏱️ ${dur}ث, ${timings.length} جملة`);

  let filters = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black@0.3`;

  const hookText = escapeFf(hook.substring(0, 45));
  filters += `,drawtext=text='${hookText}':fontcolor=white:fontsize=48:font=Arial:x=(w-text_w)/2:y=350:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,0,${Math.min(4, dur)})':alpha='if(lt(t,0.5),t/0.5,if(gt(t,3.5),(4.5-t)/1.5,1))'`;

  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    const line = escapeFf(t.text.substring(0, 40));
    filters += `,drawtext=text='${line}':fontcolor=white:fontsize=34:font=Arial:x=(w-text_w)/2:y=1350:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${t.start.toFixed(1)},${t.end.toFixed(1)})':alpha='if(lt(t-${t.start.toFixed(1)},0.3),(t-${t.start.toFixed(1)})/0.3,if(gt(t,${(t.end - 0.3).toFixed(1)}),(${t.end.toFixed(1)}-t)/0.3,1))'`;
  }

  filters += `,drawtext=text='اشترك ₰ ':fontcolor=#FFD700:fontsize=36:font=Arial:x=(w-text_w)/2:y=1550:enable='gte(t,${Math.max(0, dur - 5)})':alpha='if(lt(t,${Math.max(0, dur - 5)}+0.5),0,(t-${Math.max(0, dur - 5)}-0.5)/1.5)'`;

  filters += `,drawbox=x=0:y=1900:w=(${1080}/${dur})*t:h=6:color=#FF0000:enable='between(t,0,${dur})'`;

  execSync(`ffmpeg -y -loop 1 -i "${bg}" -i "${audioFile}" -filter_complex "${filters}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -pix_fmt yuv420p -shortest "${outputFile}"`, { stdio: "pipe", timeout: 180000 });

  console.log(`✅ الفيديو: ${outputFile}`);
  return outputFile;
}

function escapeFf(t) {
  return t.replace(/'/g, "’").replace(/:/g, "\\:").replace(/[{}\\]/g, "").replace(/%/g, "\\%");
}

async function run() {
  console.log("🎥 وكيل Shorts احترافي يعمل...");
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { script, hook } = await generateScript();
  const voice = textToSpeech(script);
  const dur = getDuration(voice);
  console.log(`⏱️ المدة: ${dur} ثانية`);

  const sentences = splitScript(script);
  const timings = getSentenceTimings(dur, sentences);
  console.log(`📝 ${sentences.length} جملة`);

  const music = createMusic(dur);
  const mixed = mixAudio(voice, music);
  const video = createVideo(mixed, hook, sentences, timings);

  const { google } = require("googleapis");
  const c = JSON.parse(process.env.GOOGLE_CLIENT_SECRET).installed;
  const o = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris[0]);
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const tags = ["shorts", "معلومة", "تطوير الذات", "نصائح", "تعلم", "arabic shorts", "shorts عربي"];
  const r = await google.youtube({ version: "v3", auth: o }).videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: hook.substring(0, 90),
        description: `${hook}\n\n📌 مقتطفات:\n${sentences.map(s => "• " + s).join("\n")}\n\n🔔 اشترك ليصلك كل جديد\n\n#Shorts #معلومة #تطوير_الذات #arabic #shorts #نصائح`,
        tags,
        categoryId: "22",
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, publishAt: null },
    },
    media: { body: fs.createReadStream(video) },
  });

  console.log(`✅ رفع: https://youtube.com/shorts/${r.data.id}`);
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
