const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function textToSpeech(text, outputPath) {
  console.log("🔊 جاري تحويل النص إلى صوت...");

  const audioFile = path.join(outputPath, "audio.mp3");
  const textFile = path.join(outputPath, "speech.txt");

  const cleanText = text.replace(/["""]/g, "").substring(0, 3000);
  fs.writeFileSync(textFile, cleanText, "utf-8");

  try {
    const ttsText = cleanText.replace(/'/g, "'\\''");
    execSync(
      `edge-tts --voice "ar-SA-HudaNeural" --text '${ttsText}' --write-media "${audioFile}"`,
      { stdio: "pipe", timeout: 120000 }
    );
    console.log(`✅ صوت طبيعي: ${audioFile}`);
    return audioFile;
  } catch (e) {
    console.log("⚠️ edge-tts غير متاح، استخدام espeak...");
    const fallbackFile = path.join(outputPath, "audio.wav");
    execSync(`espeak -v arabic -f "${textFile}" -w "${fallbackFile}"`, {
      stdio: "pipe",
      timeout: 60000,
    });
    return fallbackFile;
  }
}

module.exports = { textToSpeech };
