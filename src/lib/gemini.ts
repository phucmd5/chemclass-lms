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
      ? "Tự luận trả lời ngắn (yêu cầu viết phương trình, tính toán hoặc giải thích)"
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
    "type": "multiple_choice", // hoặc "short_answer"
    "content_latex": "Câu hỏi chứa LaTeX $...$",
    "options": [ // chỉ cần thiết nếu type là multiple_choice
      { "key": "A", "text": "Đáp án A" },
      { "key": "B", "text": "Đáp án B" },
      { "key": "C", "text": "Đáp án C" },
      { "key": "D", "text": "Đáp án D" }
    ],
    "correct_answer": "A", // hoặc đáp án ngắn gọn / biểu thức nếu là tự luận
    "explanation": "Giải thích chi tiết từng bước",
    "difficulty": "Thông hiểu"
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
          type: q.type || (q.options && q.options.length > 0 ? "multiple_choice" : "short_answer"),
          content_latex: q.content_latex || `Câu hỏi ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: (q.correct_answer || "A").trim(),
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

/**
 * Trợ Lý AI Chấm Điểm Tự Luận Hóa Học & KHTN (Hỗ trợ Văn bản & Hình ảnh chụp bài làm)
 */
export async function gradeEssayQuestionWithAI(params: {
  questionContent: string;
  standardAnswer: string;
  maxPoints: number;
  studentTextAnswer?: string;
  studentImageBase64?: string;
}): Promise<{
  score: number;
  feedback: string;
  criteria?: Array<{ criterion: string; awarded: number; max: number }>;
}> {
  const { questionContent, standardAnswer, maxPoints = 2.0, studentTextAnswer = "", studentImageBase64 } = params;

  if (!apiKey) {
    return {
      score: 0,
      feedback: "Chưa cấu hình GEMINI_API_KEY để tự động chấm điểm bài tự luận.",
    };
  }

  const prompt = `Bạn là giáo viên Hóa học & Khoa học Tự nhiên cấp THCS tận tình, công tâm và thấu hiểu học sinh.
Hãy chấm điểm bài làm tự luận của học sinh dựa trên đề bài và hướng dẫn chấm của giáo viên.

THÔNG TIN ĐỀ BÀI & HƯỚNG DẪN CHẤM:
- Đề bài: "${questionContent}"
- Hướng dẫn chấm & Lời giải chuẩn của giáo viên: "${standardAnswer}"
- Thang điểm tối đa cho câu này: ${maxPoints} điểm.

BÀI LÀM CỦA HỌC SINH (Học sinh có thể trả lời bằng văn bản và/hoặc hình ảnh đính kèm):
${studentTextAnswer ? `- Văn bản học sinh nhập: "${studentTextAnswer}"` : "- Học sinh không nhập văn bản."}
${studentImageBase64 ? "- Học sinh có đính kèm hình ảnh chụp bài làm viết tay." : ""}

YÊU CẦU ĐÁNH GIÁ:
1. Đọc và phân tích kỹ bài làm của học sinh (chấp nhận các cách diễn đạt, lập luận khác nhau nếu đúng bản chất khoa học).
2. Kiểm tra tính chính xác của: Phương trình hóa học, các bước tính toán số mol / khối lượng / thể tích / nồng độ, đơn vị đo, và lập luận.
3. Cho điểm công bằng từ 0.0 đến tối đa ${maxPoints} điểm (chia điểm thành phần hợp lý theo từng bước).
4. Viết lời nhận xét chi tiết, mang tính sư phạm, khen ngợi bước làm đúng và chỉ ra lỗi sai/cách cải thiện (nếu có).

ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON theo schema sau (không thêm markdown ngoài JSON):
{
  "score": 1.75, // Số điểm chấm (tối đa ${maxPoints})
  "feedback": "Nhận xét chi tiết cho học sinh...",
  "criteria": [
    { "criterion": "Tên tiêu chí 1", "awarded": 0.5, "max": 0.5 },
    { "criterion": "Tên tiêu chí 2", "awarded": 0.75, "max": 1.0 }
  ]
}`;

  const parts: any[] = [{ text: prompt }];

  if (studentImageBase64) {
    try {
      const match = studentImageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const base64Data = match ? match[2] : studentImageBase64;

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    } catch (e) {
      console.warn("Lỗi phân tích base64 ảnh:", e);
    }
  }

  for (const m of ACTIVE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2, // Nhiệt độ thấp để chấm điểm chuẩn xác
        },
      });

      const response = await model.generateContent(parts);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      const safeScore = Math.min(maxPoints, Math.max(0, Number(parsed.score) || 0));

      return {
        score: Math.round(safeScore * 100) / 100,
        feedback: parsed.feedback || "Đã chấm điểm câu tự luận.",
        criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
      };
    } catch (err: any) {
      console.warn(`Lỗi chấm điểm tự luận model ${m}:`, err.message);
    }
  }

  // Fallback nếu AI không phản hồi
  return {
    score: studentTextAnswer.trim() || studentImageBase64 ? Math.round((maxPoints / 2) * 100) / 100 : 0,
    feedback: "Hệ thống đã ghi nhận bài làm tự luận của bạn. Giáo viên sẽ xem lại chi tiết.",
  };
}
