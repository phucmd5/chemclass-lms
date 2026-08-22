import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testChemistryGeneration() {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `Bạn là chuyên gia giáo dục Hóa học & KHTN cấp THCS (Việt Nam).
Hãy sinh 2 câu hỏi trắc nghiệm Hoá học Khối 8 theo chuyên đề: "Phản ứng hóa học và Định luật bảo toàn khối lượng".
Yêu cầu định dạng JSON theo schema sau:
[
  {
    "type": "multiple_choice",
    "content_latex": "Nội dung câu hỏi (chứa công thức LaTeX kẹp giữa $...$, ví dụ $\\\\ce{2H2 + O2 -> 2H2O}$)",
    "options": [
      { "key": "A", "text": "Nội dung đáp án A (kèm LaTeX nếu có)" },
      { "key": "B", "text": "Nội dung đáp án B" },
      { "key": "C", "text": "Nội dung đáp án C" },
      { "key": "D", "text": "Nội dung đáp án D" }
    ],
    "correct_answer": "A",
    "explanation": "Lời giải chi tiết từng bước",
    "difficulty": "Nhận biết"
  }
]`;

  const result = await model.generateContent(prompt);
  console.log("Generated Questions JSON:");
  console.log(result.response.text());
}

testChemistryGeneration();
