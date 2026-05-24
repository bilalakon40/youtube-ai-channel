const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const CREDENTIALS_PATH = path.join(__dirname, "..", "client_secret.json");
const TOKEN_PATH = path.join(__dirname, "..", "refresh_token.json");

async function setup() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log(`
╔══════════════════════════════════════╗
║   إعداد YouTube API - خطوة واحدة     ║
╚══════════════════════════════════════╝

المطلوب منك:
1️⃣ اذهب إلى: https://console.cloud.google.com/
2️⃣ أنشئ مشروع جديد → اسمه "youtube-ai"
3️⃣ اذهب إلى APIs & Services → Library
4️⃣ ابحث عن "YouTube Data API v3" → Enable
5️⃣ اذهب إلى Credentials → Create Credentials
6️⃣ اختر "OAuth client ID" → "Desktop app"
7️⃣ اسمه "youtube-ai-bot"
8️⃣ حمّل ملف JSON وحطه في مجلد المشروع باسم: client_secret.json

بعد ما تسوي هذا، شغّل الأمر مرة أخرى: npm run setup
    `.trim());
    return;
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log(`🔑 افتح هذا الرابط في المتصفح وسجل الدخول:
  ${authUrl}`);
  console.log("\nبعد الموافقة، سيظهر لك كود في الرابط. انسخه وألصقه هنا:");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => rl.question("> ", resolve));
  rl.close();

  const { tokens } = await oauth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log(`\n✅ تم حفظ التوكن! أصبح جاهزاً للاستخدام.`);
  console.log(`🔐 Refresh Token: ${tokens.refresh_token}`);
}

setup().catch(console.error);
