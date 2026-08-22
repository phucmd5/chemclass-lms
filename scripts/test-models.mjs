import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listAndTestModels() {
  const testList = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-flash-latest",
    "gemini-pro",
  ];

  for (const m of testList) {
    try {
      console.log(`Trying model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Test câu hỏi");
      console.log(`🎉 SUCCESS with ${m}! Output:`, result.response.text());
      return m;
    } catch (err) {
      console.log(`Failed ${m}:`, err.message);
    }
  }
}

listAndTestModels();
