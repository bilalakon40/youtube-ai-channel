const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const { generateScript } = require("./script");
const { textToSpeech } = require("./tts");
const { createVideo } = require("./video");
const { uploadVideo } = require("./upload");

const OUTPUT_DIR = path.join(__dirname, "..", "output");
const REFRESH_TOKEN_PATH = path.join(__dirname, "..", "refresh_token.json");
const CLIENT_SECRET_PATH = path.join(__dirname, "..", "client_secret.json");

async function getAuth() {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const { client_id, client_secret, redirect_uris } = JSON.parse(
      process.env.GOOGLE_CLIENT_SECRET
    );
    const oauth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return oauth;
  }

  if (fs.existsSync(REFRESH_TOKEN_PATH) && fs.existsSync(CLIENT_SECRET_PATH)) {
    const creds = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
    const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
    const tokens = JSON.parse(fs.readFileSync(REFRESH_TOKEN_PATH));
    const oauth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oauth.setCredentials(tokens);
    return oauth;
  }

  throw new Error("No YouTube auth found. Run: npm run setup");
}

async function run() {
  console.log("🤖 وكيل قناة يوتيوب يعمل...\n");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const script = await generateScript();
  const audioFile = await textToSpeech(script.cleanText, OUTPUT_DIR);
  const videoFile = createVideo(audioFile, script.title, OUTPUT_DIR);

  const auth = await getAuth();
  await uploadVideo(auth, videoFile, script.title, script.script);

  console.log("\n🎉 تم كل شيء بنجاح!");
}

run().catch((err) => {
  console.error("❌ فشل:", err.message);
  process.exit(1);
});
