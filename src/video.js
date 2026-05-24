const { execSync } = require("child_process");
const path = require("path");

function createVideo(audioFile, title, outputDir) {
  console.log("🎬 جاري إنشاء فيديو احترافي...");

  const outputFile = path.join(outputDir, "video.mp4");
  const bgImage = path.join(outputDir, "bg.jpg");
  const subtitleFile = path.join(outputDir, "subtitles.ass");

  const duration = getAudioDuration(audioFile);

  downloadBackground(bgImage);
  createSubtitleFile(subtitleFile, title, duration);

  execSync(
    `ffmpeg -y -loop 1 -i "${bgImage}" -i "${audioFile}" -shortest ` +
    `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,"` +
    `ass='${subtitleFile}'" ` +
    `-c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -pix_fmt yuv420p "${outputFile}"`,
    { stdio: "pipe", timeout: 180000 }
  );

  console.log(`✅ تم إنشاء الفيديو: ${outputFile}`);
  return outputFile;
}

function downloadBackground(outputPath) {
  try {
    execSync(
      `curl -s -L "https://picsum.photos/1920/1080" -o "${outputPath}"`,
      { stdio: "pipe", timeout: 15000 }
    );
  } catch {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=#1a237e:s=1920x1080:d=1" -frames:v 1 "${outputPath}"`,
      { stdio: "pipe", timeout: 10000 }
    );
  }
}

function createSubtitleFile(outputPath, title, duration) {
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Title, Arial, 72, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 3, 1, 8, 30, 30, 60, 1",
    "Style: Sub, Arial, 36, &H00FFFFFF, &H000000FF, &H00000000, &H40000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 1, 2, 30, 30, 40, 1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,0:00:00.00,0:00:05.00,Title,,0,0,0,,${title}`,
    `Dialogue: 0,0:00:05.00,0:00:${String(Math.floor(duration)).padStart(2, "0")}.00,Sub,,0,0,0,,اشترك  ❤  فعّل الجرس`,
  ];

  require("fs").writeFileSync(outputPath, lines.join("\n"), "utf-8");
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

module.exports = { createVideo };
