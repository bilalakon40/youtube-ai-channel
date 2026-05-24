const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "output");

const categories = [
  { name: "حقيقة مذهلة", hook: "هل تعلم أن..." },
  { name: "نصيحة ذهبية", hook: "٣ أشياء تتمنى لو عرفتها من قبل..." },
  { name: "قصة قصيرة", hook: "قصة دقيقة واحدة هتغير نظرتك..." },
  { name: "معلومة غريبة", hook: "شيء لن تصدق أنه موجود!" },
  { name: "نجاح", hook: "سر النجاح الذي لا يخبرك به أحد..." },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function generateScript() {
  const cat = pick(categories);
  console.log(`📝 جاري كتابة سكريبت عن: ${cat.name}`);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "أنت كاتب محتوى YouTube Shorts محترف" },
        { role: "user", content: `اكتب سكريبت Shorts لمدة 40 ثانية عن: ${cat.name}

المطلوب:
- افتتاحية قوية: ${cat.hook}
- 4-5 جمل قصيرة جداً (كحد أقصى 50 كلمة)
- خاتمة: "لايك واشتراك 🔔"

أكتب السكريبت فقط.` }
      ],
    }),
  });

  const data = await res.json();
  let script = data.choices[0].message.content
    .replace(/\*+/g, "").replace(/#+/g, "")
    .replace(/^["'\s]+/, "").replace(/["'\s]+$/, "").trim();

  const hook = script.split("\n")[0] || script.substring(0, 60);
  return { script, hook, category: cat.name };
}

function textToSpeech(text) {
  console.log("🔊 جاري إنشاء الصوت...");
  const audioFile = path.join(OUTPUT_DIR, "audio.mp3");
  const textFile = path.join(OUTPUT_DIR, "speech.txt");
  fs.writeFileSync(textFile, text, "utf-8");

  try {
    execSync(`gtts-cli -l ar -f "${textFile}" -o "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
    console.log("✅ gTTS");
  } catch {
    execSync(`espeak -v arabic -f "${textFile}" -w "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
    console.log("✅ espeak");
  }
  return audioFile;
}

function createBackgroundMusic(duration) {
  console.log("🎵 جاري إنشاء موسيقى خلفية...");
  const musicFile = path.join(OUTPUT_DIR, "music.mp3");

  spawnSync("ffmpeg", [
    "-y", "-f", "lavfi",
    "-i", "aevalsrc=sin(2*PI*440*t)*sin(2*PI*2*t):s=44100:d=" + duration,
    "-af", "volume=0.03",
    musicFile,
  ], { stdio: "pipe", timeout: 15000 });

  return musicFile;
}

function mixAudio(voiceFile, musicFile) {
  console.log("🔊 جاري خلط الصوت مع الموسيقى...");
  const mixedFile = path.join(OUTPUT_DIR, "mixed.mp3");

  spawnSync("ffmpeg", [
    "-y", "-i", voiceFile, "-i", musicFile,
    "-filter_complex", "[0:a]volume=1.0[voice];[1:a]volume=0.15[music];[voice][music]amix=inputs=2:duration=first",
    "-ac", "1", "-ar", "44100", mixedFile,
  ], { stdio: "pipe", timeout: 15000 });

  return mixedFile;
}

function createShorts(audioFile, hook) {
  console.log("🎬 جاري إنشاء فيديو Shorts احترافي...");
  const outputFile = path.join(OUTPUT_DIR, "shorts.mp4");
  const bg = path.join(OUTPUT_DIR, "bg.jpg");
  const dur = getDuration(audioFile);
  const centerY = 400;
  const barHeight = 6;

  downloadBackground(bg);

  const drawtextFilter = [
    `drawtext=text='${escapeFf(hook)}':fontcolor=white:fontsize=52:font=Arial:x=(w-text_w)/2:y=${centerY}:enable='between(t,0,${Math.min(dur, 5)})':shadowcolor=black:shadowx=2:shadowy=2:alpha='if(lt(t,0.5),t/0.5,if(gt(t,3.5),(4.5-t)/1.5,1))'`,
    `drawtext=text='اشترك  🔔':fontcolor=#FFD700:fontsize=38:font=Arial:x=(w-text_w)/2:y=${centerY + 120}:enable='gte(t,${Math.max(0, dur - 5)})':shadowcolor=black:shadowx=2:shadowy=2:alpha='if(lt(t,${Math.max(0, dur - 5)} + 0.5),0,(t - ${Math.max(0, dur - 5)} - 0.5)/1.5)'`,
  ].join(",");

  const progressBar = `drawbox=x=0:y=${1920 - barHeight - 20}:w=${Math.floor(1080 / dur)}*t:h=${barHeight}:color=#FF0000:enable='between(t,0,${dur})'`;

  spawnSync("ffmpeg", [
    "-y", "-loop", "1", "-i", bg,
    "-i", audioFile,
    "-t", String(dur),
    "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.2:enable='between(t,0,${dur})',${drawtextFilter},${progressBar}`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-shortest", outputFile,
  ], { stdio: "pipe", timeout: 180000 });

  console.log(`✅ Shorts: ${outputFile}`);
  return outputFile;
}

function escapeFf(t) { return t.replace(/'/g, "’").replace(/:/g, "\\:").replace(/[{}\\]/g, ""); }

function downloadBackground(p) {
  try {
    execSync(`curl -s -L "https://picsum.photos/1080/1920" -o "${p}"`, { stdio: "pipe", timeout: 10000 });
  } catch {}
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
    execSync(`ffmpeg -y -f lavfi -i "color=c=#1a237e:s=1080x1920:d=1" -frames:v 1 "${p}"`, { stdio: "pipe", timeout: 5000 });
  }
}

function getDuration(file) {
  try {
    return Math.ceil(parseFloat(execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { stdio: "pipe", timeout: 5000 }
    ).toString().trim())) || 30;
  } catch { return 30; }
}

async function run() {
  console.log("🎥 وكيل Shorts احترافي يعمل...");
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { script, hook } = await generateScript();
  const voice = textToSpeech(script);
  const dur = getDuration(voice);
  const music = createBackgroundMusic(dur);
  const mixed = mixAudio(voice, music);
  const video = createShorts(mixed, hook);

  const { google } = require("googleapis");
  const c = JSON.parse(process.env.GOOGLE_CLIENT_SECRET).installed;
  const o = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris[0]);
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const r = await google.youtube({ version: "v3", auth: o }).videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: `${hook.substring(0, 80)}`,
        description: `${hook}\n\n#Shorts #معلومة #تطوير_الذات\n\nاشترك 🔔`,
        tags: ["shorts", "معلومة", "تطوير الذات"],
        categoryId: "22",
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(video) },
  });

  console.log(`✅ رفع Shorts: https://youtube.com/shorts/${r.data.id}`);
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
