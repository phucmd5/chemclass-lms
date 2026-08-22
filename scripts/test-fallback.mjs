import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testWithFallback() {
  const models = ["gemini-flash-latest", "gemini-pro-latest", "gemini-pro"];

  for (const m of models) {
    try {
      console.log(`Trying ${m}...`);
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `Bạn là chuyên gia giáo dục Hóa học & KHTN THCS. Tạo 2 câu trắc nghiệm Hoá 8 về phản ứng cháy, trả về JSON mảng object: [{ content_latex, options: [{ key, text }], correct_answer, explanation }]`;
      const res = await model.generateContent(prompt);
      console.log(`✅ Success with ${m}:`);
      console.log(res.response.text());
      return;
    } catch (err) {
      console.log(`Failed with ${m}:`, err.message);
    }
  }
}

testWithFallback();
