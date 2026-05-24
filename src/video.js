const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function createVideo(audioFile, title, outputDir) {
  console.log("🎬 جاري إنشاء فيديو احترافي...");

  const outputFile = path.join(outputDir, "video.mp4");
  const bgImage = path.join(outputDir, "bg.jpg");
  const subtitleFile = path.join(outputDir, "subtitles.ass");

  const duration = getAudioDuration(audioFile);

  downloadBackground(bgImage);
  createSubtitleFile(subtitleFile, title, duration);

  const result = spawnSync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-i", bgImage,
    "-i", audioFile,
    "-shortest",
    "-vf", `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,ass=${subtitleFile}`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    outputFile,
  ], { stdio: "pipe", timeout: 180000 });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with code ${result.status}: ${result.stderr.toString().slice(-200)}`);
  }

  console.log(`✅ تم إنشاء الفيديو: ${outputFile}`);
  return outputFile;
}

function downloadBackground(outputPath) {
  try {
    spawnSync("curl", ["-s", "-L", "https://picsum.photos/1920/1080", "-o", outputPath],
      { stdio: "pipe", timeout: 15000 });
  } catch {}
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100) {
    spawnSync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=#1a237e:s=1920x1080:d=1",
      "-frames:v", "1", outputPath,
    ], { stdio: "pipe", timeout: 10000 });
  }
}

function createSubtitleFile(outputPath, title, duration) {
  const endTime = `0:00:${String(Math.floor(duration)).padStart(2, "0")}.00`;
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1920",
    "PlayResY: 1080",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Underline, Alignment, MarginL, MarginR, MarginV",
    "Style: Title, Arial, 72, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 1, 0, 8, 30, 30, 60",
    "Style: Sub, Arial, 36, &H00FFFFFF, &H000000FF, &H00000000, &H40000000, 0, 0, 2, 30, 30, 40",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Text",
    `Dialogue: 0,0:00:00.00,0:00:05.00,Title,${title}`,
    `Dialogue: 0,0:00:05.00,${endTime},Sub,اشترك وفعل الجرس 🔔`,
  ];

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
}

function getAudioDuration(file) {
  const r = spawnSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", file,
  ], { stdio: "pipe", timeout: 10000 });
  const out = r.stdout.toString().trim();
  return Math.ceil(parseFloat(out)) || 30;
}

module.exports = { createVideo };
