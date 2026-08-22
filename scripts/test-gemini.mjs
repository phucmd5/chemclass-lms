import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing Gemini API Key:", apiKey ? "Present (length " + apiKey.length + ")" : "Missing");

const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  for (const m of models) {
    try {
      console.log(`Trying model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Tạo 1 câu trắc nghiệm Hoá học lớp 8 về phản ứng cháy của Magie, có đáp án A B C D và giải thích ngắn gọn.");
      console.log(`✅ Success with ${m}! Response preview:`);
      console.log(result.response.text().slice(0, 200) + "...\n");
      return;
    } catch (err) {
      console.warn(`❌ Error with ${m}:`, err.message);
    }
  }
}

testGemini();
