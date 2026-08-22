import { GoogleGenerativeAI } from "@google/generative-ai";
import { SlideDeck } from "./pptx-export";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const ACTIVE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
];

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  documentName?: string;
}

/**
 * Sinh bộ Slide bài giảng mới từ yêu cầu và tài liệu tham khảo đính kèm
 */
export async function generateSlideDeckWithAI(params: {
  topic: string;
  grade: string;
  slideCount?: number;
  teachingGoal?: string;
  documentText?: string;
  documentImagesBase64?: string[];
  theme?: string;
}): Promise<{ slideDeck: SlideDeck; aiResponse: string }> {
  const {
    topic,
    grade,
    slideCount = 6,
    teachingGoal = "",
    documentText = "",
    documentImagesBase64 = [],
    theme = "modern_chemistry",
  } = params;

  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống!");
  }

  const prompt = `Bạn là chuyên gia thiết kế bài giảng sư phạm Hóa học & KHTN THCS (Chương trình GDPT mới 2018 Việt Nam).
Nhiệm vụ của bạn là soạn một bộ Slide thuyết trình PowerPoint hoàn chỉnh, hấp dẫn, dễ hiểu và truyền cảm hứng cho học sinh.

THÔNG TIN BÀI DẠY:
- Môn học: Khoa học Tự nhiên / Hóa học THCS (Khối ${grade})
- Chủ đề / Tên bài học: "${topic}"
- Số lượng slide dự kiến: ${slideCount} slide
${teachingGoal ? `- Mục tiêu bài học: ${teachingGoal}` : ""}
${documentText ? `- TÀI LIỆU / GIÁO ÁN THAM KHẢO CỦA GIÁO VIÊN:\n"""\n${documentText}\n"""` : ""}
${documentImagesBase64.length > 0 ? "- (Giáo viên có đính kèm hình ảnh tài liệu/sách giáo khoa/giáo án để bạn phân tích)." : ""}

QUY TẮC THIẾT KẾ SLIDE SƯ PHẠM:
1. Slide 1 luôn là Slide TIÊU ĐỀ (layout: "title") có tên bài và giới thiệu.
2. Các slide nội dung tiếp theo phân chia mạch kiến thức rõ ràng:
   - Slide khái niệm / bản chất (layout: "content_bullet" hoặc "two_column").
   - Slide phương trình hóa học, thí nghiệm hoặc ví dụ thực tế đời sống.
   - Slide câu hỏi trắc nghiệm hoặc bài tập củng cố (layout: "quiz").
   - Slide tổng kết / ghi nhớ / bài tập về nhà (layout: "summary").
3. Tất cả công thức hóa học và phương trình phản ứng PHẢI dùng định dạng LaTeX kẹp giữa $, ví dụ:
   - $H_2SO_4$, $Fe_2O_3$, $Ba(OH)_2$, $CO_2$.
   - $2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$, $Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow$.
4. Phần "speakerNotes" (Lời giảng cho giáo viên): Cung cấp gợi ý lời giảng, câu hỏi gợi mở để giáo viên tương tác với học sinh khi chiếu slide đó.

ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON theo schema sau (không kèm markdown ngoài JSON):
{
  "topic": "${topic}",
  "grade": "${grade}",
  "theme": "${theme}",
  "slides": [
    {
      "id": "slide-1",
      "slideNumber": 1,
      "title": "TÊN BÀI HỌC",
      "subtitle": "Phụ đề gợi mở hoặc câu hỏi dẫn dắt",
      "layout": "title",
      "content": {},
      "speakerNotes": "Chào mừng các em học sinh đến với bài học hôm nay..."
    },
    {
      "id": "slide-2",
      "slideNumber": 2,
      "title": "I. Khái Niệm Quan Trọng",
      "layout": "content_bullet",
      "content": {
        "bullets": [
          "Ý chính số 1 ngắn gọn, súc tích",
          "Ý chính số 2 có kèm thuật ngữ trọng tâm"
        ],
        "highlightBox": {
          "title": "Quy tắc cần nhớ",
          "text": "Nội dung quy tắc then chốt"
        },
        "chemicalEquations": [
          "$2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$"
        ]
      },
      "speakerNotes": "Ở phần này, thầy/cô yêu cầu học sinh quan sát..."
    }
  ],
  "aiSummary": "Tóm tắt ngắn gọn ý tưởng thiết kế bộ slide này để phản hồi trong khung chat cho giáo viên."
}`;

  const parts: any[] = [{ text: prompt }];

  for (const imgBase64 of documentImagesBase64) {
    try {
      const match = imgBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const base64Data = match ? match[2] : imgBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    } catch (e) {
      console.warn("Lỗi đính kèm ảnh tài liệu:", e);
    }
  }

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

      const response = await model.generateContent(parts);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      if (parsed.slides && Array.isArray(parsed.slides)) {
        return {
          slideDeck: {
            topic: parsed.topic || topic,
            grade: parsed.grade || grade,
            theme: (parsed.theme || theme) as any,
            slides: parsed.slides.map((s: any, idx: number) => ({
              id: s.id || `slide-${idx + 1}`,
              slideNumber: idx + 1,
              title: s.title || `Slide ${idx + 1}`,
              subtitle: s.subtitle || "",
              layout: s.layout || "content_bullet",
              content: s.content || {},
              speakerNotes: s.speakerNotes || "",
            })),
          },
          aiResponse:
            parsed.aiSummary ||
            `Tôi đã thiết kế xong bộ slide bài giảng gồm ${parsed.slides.length} slide chuẩn sư phạm cho chủ đề "${topic}". Thầy/Cô hãy xem trước và phản hồi nếu cần chỉnh sửa thêm nhé!`,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Lỗi gọi model ${m} tạo slide:`, err.message);
    }
  }

  throw new Error(`Không thể sinh slide bằng AI: ${lastError?.message || "Lỗi không xác định"}`);
}

/**
 * Chỉnh sửa và tinh chỉnh bộ Slide hiện tại dựa trên phản hồi tiếp theo của giáo viên
 */
export async function refineSlideDeckWithAI(params: {
  currentDeck: SlideDeck;
  userFeedback: string;
  chatHistory: ChatMessage[];
  documentText?: string;
  documentImagesBase64?: string[];
}): Promise<{ slideDeck: SlideDeck; aiResponse: string }> {
  const { currentDeck, userFeedback, chatHistory = [], documentText = "", documentImagesBase64 = [] } = params;

  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống!");
  }

  const prompt = `Bạn là trợ lý AI thiết kế bài giảng Hóa học THCS.
Giáo viên đang xem trước bộ slide bài giảng và đưa ra PHẢN HỒI YÊU CẦU ĐIỀU CHỈNH.

BỘ SLIDE HIỆN TẠI (JSON):
${JSON.stringify(currentDeck, null, 2)}

LỊCH SỬ TRAO ĐỔI VỪA QUA:
${chatHistory.map((c) => `${c.role === "user" ? "Giáo viên" : "AI"}: ${c.content}`).join("\n")}

PHẢN HỒI MỚI CỦA GIÁO VIÊN:
"${userFeedback}"

${documentText ? `TÀI LIỆU BỔ SUNG:\n${documentText}` : ""}

YÊU CẦU:
1. Phân tích yêu cầu chỉnh sửa của giáo viên (ví dụ: sửa câu chữ, thêm/xóa slide, chèn phương trình hóa học, đổi tông màu theme, thêm câu hỏi trắc nghiệm...).
2. Cập nhật lại bộ slide JSON một cách chính xác, giữ nguyên các slide không bị yêu cầu sửa và nâng cấp slide được yêu cầu.
3. Đảm bảo toàn bộ công thức hóa học vẫn ở chuẩn LaTeX $...$.

ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON theo schema sau (không kèm markdown ngoài JSON):
{
  "updatedDeck": {
    "topic": "${currentDeck.topic}",
    "grade": "${currentDeck.grade}",
    "theme": "${currentDeck.theme}",
    "slides": [ ...mảng các slide sau khi đã cập nhật... ]
  },
  "aiResponse": "Lời giải thích ngắn gọn, thân thiện cho giáo viên về những điểm đã được chỉnh sửa."
}`;

  const parts: any[] = [{ text: prompt }];

  for (const imgBase64 of documentImagesBase64) {
    try {
      const match = imgBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const base64Data = match ? match[2] : imgBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    } catch (e) {}
  }

  for (const m of ACTIVE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
        },
      });

      const response = await model.generateContent(parts);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      if (parsed.updatedDeck && Array.isArray(parsed.updatedDeck.slides)) {
        return {
          slideDeck: {
            ...parsed.updatedDeck,
            slides: parsed.updatedDeck.slides.map((s: any, idx: number) => ({
              ...s,
              id: s.id || `slide-${idx + 1}`,
              slideNumber: idx + 1,
            })),
          },
          aiResponse: parsed.aiResponse || "Tôi đã cập nhật bộ slide theo đúng yêu cầu của Thầy/Cô!",
        };
      }
    } catch (err: any) {
      console.warn(`Lỗi gọi model ${m} tinh chỉnh slide:`, err.message);
    }
  }

  throw new Error("Không thể tinh chỉnh slide theo yêu cầu của bạn.");
}
