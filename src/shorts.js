const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "output");

const categories = [
  { name: "حقيقة مذهلة", hook: "هل تعلم أن..." },
  { name: "نصيحة ذهبية", hook: "٣ أشياء تتمنى لو عرفتها من قبل..." },
  { name: "قصة قصيرة", hook: "قصة دقيقة واحدة هتغير نظرتك..." },
  { name: "معلومة غريبة", hook: "شيء لن تصدق أنه موجود!" },
  { name: "تحدي", hook: "هل تستطيع فعل هذا؟" },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function generateScript() {
  const cat = pick(categories);
  console.log(`📝 جاري كتابة سكريبت Shorts عن: ${cat.name}`);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "أنت كاتب محتوى YouTube Shorts. اكتب سكريبت قصير جداً (30-40 ثانية)" },
        { role: "user", content: `اكتب سكريبت Shorts عن: ${cat.name}

المطلوب:
- جملة افتتاحية قوية (hook) مثل: "${cat.hook}"
- 3-4 جمل قصيرة ومفيدة
- خاتمة تطلب لايك واشتراك
- كل الجمل قصيرة جداً (أقل من 10 كلمات)

السكريبت كله لا يتجاوز 60 كلمة. اكتب فقط السكريبت بدون عنوان.` }
      ],
    }),
  });

  const data = await res.json();
  let script = data.choices[0].message.content
    .replace(/\*+/g, "")
    .replace(/#+/g, "")
    .replace(/^["'\s]+/, "")
    .replace(/["'\s]+$/, "")
    .trim();

  const hook = script.split("\n")[0] || script.substring(0, 50);
  console.log(`✅ السكريبت جاهز: "${hook.substring(0, 50)}..."`);
  return { script, hook, category: cat.name };
}

function textToSpeech(text) {
  console.log("🔊 جاري إنشاء الصوت...");
  const audioFile = path.join(OUTPUT_DIR, "audio.mp3");
  const textFile = path.join(OUTPUT_DIR, "speech.txt");

  fs.writeFileSync(textFile, text, "utf-8");

  try {
    execSync(`gtts-cli -l ar -f "${textFile}" -o "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
    console.log("✅ صوت gTTS");
  } catch {
    console.log("⚠️ استخدام espeak...");
    execSync(`espeak -v arabic -f "${textFile}" -w "${audioFile}"`, { stdio: "pipe", timeout: 30000 });
  }
  return audioFile;
}

function createShorts(audioFile, hook) {
  console.log("🎬 جاري إنشاء Shorts...");
  const outputFile = path.join(OUTPUT_DIR, "shorts.mp4");
  const bg = path.join(OUTPUT_DIR, "bg.jpg");
  const subs = path.join(OUTPUT_DIR, "captions.srt");

  downloadBackground(bg);
  createCaptions(subs, hook);

  const dur = getDuration(audioFile);

  const r = spawnSync("ffmpeg", [
    "-y", "-loop", "1", "-i", bg,
    "-i", audioFile,
    "-t", String(dur),
    "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,subtitles=${subs}`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-shortest", outputFile,
  ], { stdio: "pipe", timeout: 120000 });

  if (r.status !== 0) throw new Error(`ffmpeg failed`);
  console.log(`✅ Shorts: ${outputFile}`);
  return outputFile;
}

function downloadBackground(p) {
  try {
    execSync(`curl -s -L "https://picsum.photos/1080/1920" -o "${p}"`, { stdio: "pipe", timeout: 10000 });
  } catch {}
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
    execSync(`ffmpeg -y -f lavfi -i "color=c=#1a237e:s=1080x1920:d=1" -frames:v 1 "${p}"`, { stdio: "pipe", timeout: 5000 });
  }
}

function createCaptions(p, hook) {
  const lines = [
    "1",
    "00:00:00,000 --> 00:00:05,000",
    hook || "شاهد هذا",
    "",
    "2",
    "00:00:05,000 --> 00:00:40,000",
    "اشترك وفعل الجرس 🔔",
  ];
  fs.writeFileSync(p, lines.join("\n"), "utf-8");
}

function getDuration(file) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`, { stdio: "pipe", timeout: 5000 });
    return Math.ceil(parseFloat(out.toString().trim())) || 30;
  } catch { return 30; }
}

async function run() {
  console.log("🎥 وكيل YouTube Shorts يعمل...");
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { script, hook } = await generateScript();
  const audio = textToSpeech(script);
  const video = createShorts(audio, hook);

  const { google } = require("googleapis");
  const c = JSON.parse(process.env.GOOGLE_CLIENT_SECRET).installed;
  const oauth = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris[0]);
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const youtube = google.youtube({ version: "v3", auth: oauth });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: `${hook} 😱 | Shorts`,
        description: `${hook}\n\n#Shorts ${hook.substring(0, 30).replace(/\s/g, "_")}\n\nاشترك للمزيد 🔔`,
        tags: ["shorts", "معلومة", "تطوير الذات"],
        categoryId: "22",
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(video) },
  });

  console.log(`✅ رفع Shorts: https://youtube.com/shorts/${res.data.id}`);
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
