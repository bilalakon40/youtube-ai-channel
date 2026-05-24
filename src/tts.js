const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function textToSpeech(text, outputPath) {
  console.log("🔊 جاري تحويل النص إلى صوت...");

  const audioFile = path.join(outputPath, "audio.wav");
  const textFile = path.join(outputPath, "speech.txt");

  fs.writeFileSync(textFile, text, "utf-8");
  execSync(`espeak -v arabic -f "${textFile}" -w "${audioFile}"`, {
    stdio: "pipe",
    timeout: 60000,
  });

  console.log(`✅ تم إنشاء الصوت: ${audioFile}`);
  return audioFile;
}

module.exports = { textToSpeech };
