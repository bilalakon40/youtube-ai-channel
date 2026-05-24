const fs = require("fs");
const path = require("path");

async function uploadVideo(auth, videoPath, title, description) {
  const { google } = require("googleapis");
  const youtube = google.youtube({ version: "v3", auth });

  console.log("📤 جاري رفع الفيديو إلى يوتيوب...");

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description || "فيديو تلقائي بالذكاء الاصطناعي\n\n✅ اشترك للمزيد",
        tags: ["ai", "ذكاء اصطناعي", "تطوير ذاتي", "معلومات"],
        categoryId: "22",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  console.log(`✅ تم الرفع بنجاح!`);
  console.log(`🔗 https://youtube.com/watch?v=${videoId}`);

  return videoId;
}

module.exports = { uploadVideo };
