import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface GeneratedQuestion {
  type: "multiple_choice" | "short_answer";
  content_latex: string;
  options?: Array<{ key: string; text: string }>;
  correct_answer: string;
  explanation: string;
  points?: number;
  difficulty?: string;
}

/**
 * Danh sách model Gemini AI hoạt động chính xác và ổn định nhất
 */
const ACTIVE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
];

/**
 * Gọi Google Gemini AI để sinh đề kiểm tra Hóa học / KHTN THCS kèm công thức LaTeX KaTeX
 */
export async function generateChemistryExamQuestions(params: {
  grade: string; // "6", "7", "8", "9"
  topic: string;
  questionCount: number;
  difficulty?: string; // "Nhận biết", "Thông hiểu", "Vận dụng", "Tổng hợp"
  questionType?: "multiple_choice" | "short_answer" | "mixed";
  customInstructions?: string;
}): Promise<GeneratedQuestion[]> {
  const {
    grade,
    topic,
    questionCount = 5,
    difficulty = "Tổng hợp (Ma trận chuẩn)",
    questionType = "multiple_choice",
    customInstructions = "",
  } = params;

  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong file môi trường (.env.local)!");
  }

  const prompt = `Bạn là chuyên gia giáo dục Hóa học và Khoa học Tự nhiên cấp THCS (Việt Nam) theo chương trình GDPT mới.
Hãy biên soạn bộ câu hỏi kiểm tra cho học sinh:
- Khối lớp: Khối ${grade} (Cấp THCS)
- Chủ đề / Chuyên đề: "${topic}"
- Số lượng câu hỏi: ${questionCount} câu
- Mức độ nhận thức: ${difficulty}
- Dạng câu hỏi: ${
    questionType === "multiple_choice"
      ? "Trắc nghiệm 4 lựa chọn (A, B, C, D)"
      : questionType === "short_answer"
      ? "Tự luận trả lời ngắn"
      : "Kết hợp trắc nghiệm và tự luận ngắn"
  }
${customInstructions ? `- Yêu cầu bổ sung: ${customInstructions}` : ""}

QUY TẮC BẮT BUỘC:
1. Tất cả các công thức hóa học, phương trình phản ứng, số mũ, chỉ số dưới PHẢI được định dạng chuẩn LaTeX kẹp giữa cặp dấu $, ví dụ:
   - Công thức: $H_2SO_4$, $Fe_2O_3$, $Ba(OH)_2$, $CO_2$, $KMnO_4$, $P_2O_5$.
   - Phương trình phản ứng: $2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$, $Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow$.
   - Phân số, nồng độ: $C_M = \\frac{n}{V}$, $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$.
2. Nội dung câu hỏi và đáp án phải rõ ràng, chính xác tuyệt đối về mặt khoa học và sư phạm.
3. Phần giải thích (explanation) phải trình bày từng bước giải chi tiết, rõ ràng để học sinh hiểu bài.

ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một mảng JSON theo schema sau (không thêm markdown ngoài JSON):
[
  {
    "type": "multiple_choice",
    "content_latex": "Câu hỏi chứa LaTeX $...$",
    "options": [
      { "key": "A", "text": "Đáp án A" },
      { "key": "B", "text": "Đáp án B" },
      { "key": "C", "text": "Đáp án C" },
      { "key": "D", "text": "Đáp án D" }
    ],
    "correct_answer": "A",
    "explanation": "Giải thích chi tiết từng bước",
    "difficulty": "Nhận biết"
  }
]`;

  let lastError: any = null;

  for (const m of ACTIVE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q: any, idx: number) => ({
          type: q.type || "multiple_choice",
          content_latex: q.content_latex || `Câu hỏi ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || "A").trim().toUpperCase(),
          explanation: q.explanation || "",
          difficulty: q.difficulty || "Thông hiểu",
          points: Math.round((10 / parsed.length) * 100) / 100,
        }));
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Lỗi gọi model ${m}:`, err.message);
    }
  }

  throw new Error(`Không thể sinh đề thi bằng AI: ${lastError?.message || "Lỗi không xác định"}`);
}
