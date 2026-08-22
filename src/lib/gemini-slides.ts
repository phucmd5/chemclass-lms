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
 * Sinh bộ Slide bài giảng mới từ yêu cầu và tài liệu tham khảo đính kèm (hỗ trợ tối đa 25 slide, bắt buộc có Quiz & Summary)
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
    slideCount = 8,
    teachingGoal = "",
    documentText = "",
    documentImagesBase64 = [],
    theme = "modern_chemistry",
  } = params;

  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống!");
  }

  const safeSlideCount = Math.min(25, Math.max(3, Number(slideCount) || 8));

  const prompt = `Bạn là chuyên gia thiết kế bài giảng sư phạm Hóa học & KHTN THCS (Chương trình GDPT mới 2018 Việt Nam).
Nhiệm vụ của bạn là thiết kế đúng CHÍNH XÁC ${safeSlideCount} SLIDE thuyết trình PowerPoint bài giảng hoàn chỉnh, chi tiết và hấp dẫn.

THÔNG TIN BÀI DẠY:
- Môn học: Khoa học Tự nhiên / Hóa học THCS (Khối ${grade})
- Chủ đề / Tên bài học: "${topic}"
- SỐ LƯỢNG SLIDE BẮT BUỘC: Đúng ${safeSlideCount} Slide (từ slide 1 đến slide ${safeSlideCount})
${teachingGoal ? `- Mục tiêu bài học: ${teachingGoal}` : ""}
${documentText ? `- TÀI LIỆU / GIÁO ÁN THAM KHẢO CỦA GIÁO VIÊN:\n"""\n${documentText}\n"""` : ""}
${documentImagesBase64.length > 0 ? "- (Giáo viên có đính kèm hình ảnh tài liệu/sách giáo khoa/giáo án để bạn phân tích)." : ""}

QUY TẮC CẤU TRÚC BẮT BUỘC CHO BỘ SLIDE (${safeSlideCount} SLIDE):
1. **Slide 1 (Slide Mở Đầu):** BẮT BUỘC là Slide TIÊU ĐỀ (layout: "title") có tên bài học rõ ràng, phụ đề hấp dẫn.
2. **Các Slide Nội Dung Ở Giữa (Slide 2 đến ${safeSlideCount - 2}):**
   - Trình bày tuần tự các mục bài học: Khái niệm, Phân loại, Hiện tượng, Thí nghiệm, Phương trình phản ứng, Bài toán tính số mol / khối lượng / thể tích / nồng độ.
   - Bố cục linh hoạt: "content_bullet", "two_column", hoặc "quote_definition".
3. **Slide Gần Cuối (Slide ${safeSlideCount - 1}): BẮT BUỘC là Slide CÂU HỎI CỦNG CỐ & LUYỆN TẬP (layout: "quiz"):**
   - Đưa ra 1 hoặc nhiều câu hỏi trắc nghiệm / câu hỏi kiểm tra nhanh để học sinh trả lời củng cố bài học ngay tại lớp.
   - Kèm 4 phương án A, B, C, D, đáp án đúng và lời giải thích.
4. **Slide Cuối Cùng (Slide ${safeSlideCount}): BẮT BUỘC là Slide TỔNG KẾT & DẶN DÒ VỀ NHÀ (layout: "summary"):**
   - Tóm tắt các điểm ghi nhớ cốt lõi của bài học (keyPoints).
   - Tóm tắt tất cả các công thức toán học/hóa học quan trọng cần nhớ (ví dụ: $n = \\frac{m}{M}$, $C_M = \\frac{n}{V}$, $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$, $V = n \\times 22,4$).
   - Dặn dò bài tập về nhà và chuẩn bị cho bài sau (homework).

QUY TẮC ĐỊNH DẠNG CÔNG THỨC:
- Mọi công thức hóa học, phương trình phản ứng và công thức tính toán số mol/khối lượng/nồng độ PHẢI viết chuẩn LaTeX kẹp giữa cặp dấu $, ví dụ:
  - Công thức: $H_2SO_4$, $Fe_2O_3$, $Ba(OH)_2$, $Al_2(SO_4)_3$.
  - Phương trình: $2Al + 6HCl \\rightarrow 2AlCl_3 + 3H_2 \\uparrow$, $2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$.
  - Công thức tính: $n = \\frac{m}{M}$, $m = n \\times M$, $C_M = \\frac{n}{V}$, $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$, $m_{dd} = m_{ct} + m_{H_2O}$, $V = n \\times 22,4$.

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
      "subtitle": "Phụ đề dẫn dắt bài học",
      "layout": "title",
      "content": {},
      "speakerNotes": "Gợi ý lời mở đầu tiết học cho giáo viên..."
    },
    {
      "id": "slide-2",
      "slideNumber": 2,
      "title": "I. Tên Phần 1",
      "layout": "content_bullet",
      "content": {
        "bullets": [
          "Khái niệm và định nghĩa trọng tâm",
          "Công thức tính: $n = \\frac{m}{M}$ (trong đó m là khối lượng gam, M là khối lượng mol)"
        ],
        "chemicalEquations": [
          "$2Al + 6HCl \\rightarrow 2AlCl_3 + 3H_2 \\uparrow$"
        ]
      },
      "speakerNotes": "Hướng dẫn học sinh chú ý..."
    },
    {
      "id": "slide-${safeSlideCount - 1}",
      "slideNumber": ${safeSlideCount - 1},
      "title": "Câu Hỏi Củng Cố & Luyện Tập",
      "layout": "quiz",
      "content": {
        "quiz": {
          "question": "Tính số mol của 5,4 gam kim loại Nhôm ($Al$, $M = 27$ g/mol):",
          "options": [
            "A. $0,1$ mol",
            "B. $0,2$ mol",
            "C. $0,3$ mol",
            "D. $0,4$ mol"
          ],
          "answer": "B. 0,2 mol",
          "explanation": "Áp dụng công thức $n = \\frac{m}{M} = \\frac{5,4}{27} = 0,2$ mol."
        }
      },
      "speakerNotes": "Cho học sinh 1 phút suy nghĩ và gọi ngẫu nhiên trả lời..."
    },
    {
      "id": "slide-${safeSlideCount}",
      "slideNumber": ${safeSlideCount},
      "title": "Tổng Kết Bài Học & Dặn Dò",
      "layout": "summary",
      "content": {
        "summary": {
          "keyPoints": [
            "Nắm vững định nghĩa và hiện tượng hóa học",
            "Biết cách lập và cân bằng phương trình phản ứng"
          ],
          "formulas": [
            "$n = \\frac{m}{M}$ (mol)",
            "$C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$",
            "$C_M = \\frac{n}{V}$ (mol/L)"
          ],
          "homework": "Làm bài tập 1, 2, 3 trong SGK và chuẩn bị bài mới."
        }
      },
      "speakerNotes": "Tổng kết nhanh các ý chính trước khi kết thúc tiết học..."
    }
  ],
  "aiSummary": "Tóm tắt ngắn gọn ý tưởng thiết kế bộ slide để gửi cho giáo viên."
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
              layout: s.layout || (idx === parsed.slides.length - 1 ? "summary" : idx === parsed.slides.length - 2 ? "quiz" : "content_bullet"),
              content: s.content || {},
              speakerNotes: s.speakerNotes || "",
            })),
          },
          aiResponse:
            parsed.aiSummary ||
            `Tôi đã thiết kế xong trọn bộ ${parsed.slides.length} slide bài giảng (đã bao gồm đầy đủ slide câu hỏi củng cố ôn tập và tổng kết/dặn dò về nhà) cho chủ đề "${topic}". Thầy/Cô hãy xem trước và phản hồi nếu cần tinh chỉnh nhé!`,
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
1. Phân tích yêu cầu chỉnh sửa của giáo viên.
2. Đảm bảo toàn bộ công thức hóa học và công thức tính toán ($n = \\frac{m}{M}$, $C_M = \\frac{n}{V}$, $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$) được định dạng LaTeX chuẩn kẹp giữa $.
3. Đảm bảo luôn có slide Câu hỏi củng cố (layout: "quiz") và slide Tổng kết/Dặn dò (layout: "summary").
4. Cập nhật lại bộ slide JSON một cách chính xác.

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
