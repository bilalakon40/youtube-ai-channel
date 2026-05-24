const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function textToSpeech(text, outputPath, lang = "ar") {
  console.log("🔊 جاري تحويل النص إلى صوت...");

  const audioFile = path.join(outputPath, `audio.mp3`);

  const safeText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");

  try {
    execSync(
      `edge-tts --voice "ar-SA-HudaNeural" --text "${safeText.substring(0, 1000)}" --write-media "${audioFile}"`,
      { stdio: "pipe", timeout: 60000 }
    );
    console.log(`✅ تم إنشاء الصوت: ${audioFile}`);
    return audioFile;
  } catch (e) {
    console.log("⚠️ edge-tts غير متاح، استخدام espeak...");
    const fallbackFile = path.join(outputPath, `audio.wav`);
    execSync(
      `espeak -v arabic "${safeText.substring(0, 200)}" -w "${fallbackFile}"`,
      { stdio: "pipe", timeout: 30000 }
    );
    return fallbackFile;
  }
}

module.exports = { textToSpeech };
