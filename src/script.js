const fs = require("fs");
const path = require("path");
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const categories = [
  "قصة واقعية ملهمة",
  "معلومة غريبة ومدهشة",
  "نصائح ذهبية لتطوير الذات",
  "حقائق علمية مبسطة",
  "قصة نجاح ملهمة",
  "أخطاء قاتلة في ريادة الأعمال",
  "وصفات طبيعية للصحة",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateScript() {
  const category = pick(categories);
  console.log(`📝 جاري كتابة سكريبت عن: ${category}`);

  const prompt = `اكتب سكريبت فيديو يوتيوب قصير (دقيقة إلى دقيقتين) بالعربية عن: "${category}".

المطلوب:
- عنوان جذاب
- مقدمة مشوقة (10-15 ثانية)
- محتوى قيم ومفيد (40-60 ثانية)
- خاتمة تدعو للإعجاب والاشتراك (10-15 ثانية)
- أسلوب سلس ومناسب للقراءة الصوتية

اكتب السكريبت كاملاً مع تعليمات الصوت بين قوسين مثل (بصوت حماسي)، (بصوت هادئ).`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "أنت كاتب سكريبتات يوتيوب محترف بالعربية.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const script = data.choices[0].message.content;

  const titleMatch = script.match(/^.*?(العنوان|عنوان)[:\s]*(.+)/m);
  const title = titleMatch ? titleMatch[2].trim() : category;

  const cleanText = script
    .replace(/\(.*?\)/g, "")
    .replace(/\*+/g, "")
    .replace(/#+/g, "")
    .replace(/العنوان.*?\n/g, "")
    .trim();

  const filename = `script-${Date.now()}.json`;
  const output = {
    title,
    category,
    script,
    cleanText,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(__dirname, "..", "scripts", filename), JSON.stringify(output, null, 2));
  console.log(`💾 تم حفظ السكريبت: ${filename}`);
  console.log(`📺 العنوان: ${title}`);

  return output;
}

if (require.main === module) {
  generateScript().catch((err) => {
    console.error("❌ فشل:", err.message);
    process.exit(1);
  });
}

module.exports = { generateScript };
