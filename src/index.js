const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const { generateScript } = require("./script");
const { textToSpeech } = require("./tts");
const { createVideo } = require("./video");
const { uploadVideo } = require("./upload");

const OUTPUT_DIR = path.join(__dirname, "..", "output");

async function getAuth() {
  const { client_id, client_secret, redirect_uris } = JSON.parse(
    process.env.GOOGLE_CLIENT_SECRET
  ).installed;
  const oauth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  await oauth.refreshAccessToken();
  return oauth;
}

async function run() {
  console.log("🤖 وكيل قناة يوتيوب يعمل...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const script = await generateScript();

  const audioFile = textToSpeech(script.cleanText, OUTPUT_DIR);

  const videoFile = createVideo(audioFile, script.title, OUTPUT_DIR);

  const auth = await getAuth();
  await uploadVideo(auth, videoFile, script.title, script.script);

  console.log("\n🎉 تم كل شيء بنجاح!");
}

run().catch((err) => {
  console.error("❌ فشل:", err.message);
  process.exit(1);
});
