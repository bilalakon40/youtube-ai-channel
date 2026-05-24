const { execSync } = require("child_process");
const path = require("path");

function createVideo(audioFile, title, outputDir) {
  console.log("🎬 جاري إنشاء الفيديو...");

  const outputFile = path.join(outputDir, "video.mp4");
  const bgColor = randomColor();

  const duration = getAudioDuration(audioFile);

  execSync(
    `ffmpeg -y -f lavfi -i "color=c=${bgColor}:s=1920x1080:d=${duration}" -i "${audioFile}" -shortest -c:v libx264 -preset ultrafast -c:a aac -pix_fmt yuv420p "${outputFile}"`,
    { stdio: "pipe", timeout: 120000 }
  );

  console.log(`✅ تم إنشاء الفيديو: ${outputFile}`);
  return outputFile;
}

function getAudioDuration(file) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
      { stdio: "pipe", timeout: 10000 }
    );
    return Math.ceil(parseFloat(out.toString().trim())) || 30;
  } catch {
    return 30;
  }
}

function randomColor() {
  const colors = ["#1a237e", "#283593", "#0d47a1", "#00695c", "#4a148c", "#b71c1c", "#e65100", "#33691e"];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = { createVideo };
