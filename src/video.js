const { execSync } = require("child_process");
const path = require("path");

function createVideo(audioFile, title, outputDir) {
  console.log("🎬 جاري إنشاء الفيديو...");

  const outputFile = path.join(outputDir, `video-${Date.now()}.mp4`);
  const bgColor = randomColor();

  execSync(
    `ffmpeg -y -f lavfi -i "color=c=${bgColor}:s=1920x1080:d=60" -i "${audioFile}" -shortest -vf "drawtext=text='${escapeFFmpegText(title)}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" -c:v libx264 -preset ultrafast -c:a aac "${outputFile}"`,
    { stdio: "pipe", timeout: 120000 }
  );

  console.log(`✅ تم إنشاء الفيديو: ${outputFile}`);
  return outputFile;
}

function randomColor() {
  const colors = ["#1a237e", "#283593", "#0d47a1", "#00695c", "#4a148c", "#b71c1c", "#e65100", "#33691e"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function escapeFFmpegText(text) {
  return text.replace(/'/g, "'\\\\''").replace(/:/g, "\\:").replace(/%/g, "\\\\%");
}

module.exports = { createVideo };
