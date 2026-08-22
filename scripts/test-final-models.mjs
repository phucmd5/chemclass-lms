import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testFullChemPrompt() {
  const models = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
  ];

  for (const m of models) {
    try {
      console.log(`Trying ${m}...`);
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      });

      const prompt = `Bạn là chuyên gia giáo dục Hóa học THCS. Tạo 2 câu trắc nghiệm Hoá 8 về Định luật bảo toàn khối lượng, định dạng JSON mảng object: [{ type: "multiple_choice", content_latex: "...", options: [{ key: "A", text: "..." }], correct_answer: "A", explanation: "..." }]`;
      const res = await model.generateContent(prompt);
      console.log(`🎉 SUCCESS WITH ${m}:`);
      console.log(res.response.text().slice(0, 300) + "...\n");
      return;
    } catch (err) {
      console.log(`Failed ${m}:`, err.message);
    }
  }
}

testFullChemPrompt();
