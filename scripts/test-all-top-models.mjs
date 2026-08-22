import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testTopModels() {
  const topModels = [
    "gemini-2.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
  ];

  for (const m of topModels) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: "application/json" },
      });
      const res = await model.generateContent("Tạo 1 câu trắc nghiệm Hoá 8 dạng JSON: [{ content_latex, correct_answer }]");
      console.log(`✅ SUCCESS with ${m}! Length: ${res.response.text().length}`);
    } catch (err) {
      console.log(`❌ Failed ${m}:`, err.message);
    }
  }
}

testTopModels();
