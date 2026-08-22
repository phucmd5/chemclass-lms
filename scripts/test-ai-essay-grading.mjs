import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function testEssayGrading() {
  console.log("Testing AI Essay Grading with Gemini 3.6 Flash...");

  const prompt = `Bạn là giáo viên Hóa học THCS công tâm và tận tình. Hãy chấm điểm câu trả lời tự luận của học sinh.

THÔNG TIN CÂU HỎI & HƯỚNG DẪN CHẤM:
- Đề bài: "Cho 2,7 gam kim loại Nhôm (Al) tác dụng hoàn toàn với dung dịch Axit Clohiđric (HCl). Tính thể tích khí $H_2$ thu được ở đktc."
- Đáp án chuẩn & Thang điểm của giáo viên (Tối đa: 2.0 điểm):
  + Phương trình phản ứng: $2Al + 6HCl \\rightarrow 2AlCl_3 + 3H_2$ (0.5 điểm)
  + Số mol Al: $n_{Al} = 2,7 / 27 = 0,1$ mol (0.5 điểm)
  + Số mol $H_2$: $n_{H_2} = 0,1 \\times 3 / 2 = 0,15$ mol (0.5 điểm)
  + Thể tích khí $H_2$: $V = 0,15 \\times 22,4 = 3,36$ lít (0.5 điểm)

BÀI LÀM CỦA HỌC SINH:
"Ta có nAl = 2.7 / 27 = 0.1 mol.
Phương trình: 2Al + 6HCl -> 2AlCl3 + 3H2
Theo pt nH2 = 0.15 mol.
Vậy V khí H2 thu được = 0.15 * 22.4 = 3.36 lit"

YÊU CẦU:
1. Đọc kĩ bài làm (chấp nhận cách trình bày khác nhau, linh hoạt viết hoa/thường hoặc ký hiệu).
2. Chấm điểm công bằng theo thang điểm tối đa 2.0 điểm (chia nhỏ điểm thành phần 0.25 hoặc 0.5).
3. Đưa ra nhận xét chi tiết, khen ngợi điểm đúng và chỉ ra điểm cần khắc phục (nếu có).

ĐỊNH DẠNG ĐẦU RA: Trả về DUY NHẤT một JSON theo schema sau (không thêm markdown ngoài JSON):
{
  "score": 2.0,
  "feedback": "Nhận xét chi tiết cho học sinh...",
  "criteria": [
    { "criterion": "Tiêu chí 1", "awarded": 0.5, "max": 0.5 },
    { "criterion": "Tiêu chí 2", "awarded": 0.5, "max": 0.5 }
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());
    console.log("✅ AI Essay Grading Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("❌ Error in essay grading:", err.message);
  }
}

testEssayGrading();
