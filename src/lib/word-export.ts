import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
} from "docx";

export interface ExamExportData {
  title: string;
  grade: string;
  durationMinutes: number;
  totalPoints: number;
  isFinalExam?: boolean; // Nếu là đề thi cuối kỳ -> xuất thêm ma trận & bản đặc tả
  topic?: string;
  questions: Array<{
    type: string;
    content_latex: string;
    options?: Array<{ key: string; text: string }>;
    options_json?: Array<{ key: string; text: string }>;
    correct_answer: string;
    explanation?: string;
    points?: number;
    difficulty?: string;
  }>;
}

/**
 * Chuyển đổi công thức LaTeX Hóa học sang văn bản Unicode chuẩn đẹp hiển thị trong Word
 */
export function formatLatexToWordText(str: string): string {
  if (!str) return "";

  let result = str;

  // Xóa $...$ và $$...$$
  result = result.replace(/\$\$/g, "").replace(/\$/g, "");

  // Thay thế các lệnh LaTeX hóa học phổ biến
  result = result
    .replace(/\\ce\{([^}]+)\}/g, "$1")
    .replace(/\\xrightarrow\{t\^?o?\}/g, " ──(t°)──> ")
    .replace(/\\xrightarrow\{([^}]+)\}/g, " ──($1)──> ")
    .replace(/\\rightarrow/g, " → ")
    .replace(/\\to/g, " → ")
    .replace(/\\uparrow/g, " ↑")
    .replace(/\\downarrow/g, " ↓")
    .replace(/\\times/g, " × ")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\le/g, " ≤ ")
    .replace(/\\ge/g, " ≥ ")
    .replace(/\\approx/g, " ≈ ");

  // Bảng chuyển đổi chỉ số dưới Unicode
  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "⁼", "(": "₍", ")": "₎",
  };

  // Bảng chuyển đổi chỉ số trên Unicode
  const supMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "o": "°",
  };

  result = result.replace(/_\{([0-9+\-()]+)\}/g, (_, p1) =>
    p1.split("").map((c: string) => subMap[c] || c).join("")
  );
  result = result.replace(/_([0-9])/g, (_, p1) => subMap[p1] || p1);

  result = result.replace(/\^\{([0-9+\-()o]+)\}/g, (_, p1) =>
    p1.split("").map((c: string) => supMap[c] || c).join("")
  );
  result = result.replace(/\^([0-9+o])/g, (_, p1) => supMap[p1] || p1);

  return result.replace(/\\/g, "").trim();
}

/**
 * Tạo file Word (.docx) đề thi, đáp án và ma trận chuẩn thể thức Bộ GD&ĐT
 */
export async function generateExamDocx(data: ExamExportData): Promise<Blob> {
  const { title, grade, durationMinutes, totalPoints, isFinalExam = false, topic = "Hóa học THCS", questions } = data;

  const children: any[] = [];

  // ============================================================================
  // PHẦN A: MA TRẬN & BẢN ĐẶC TẢ ĐỀ THI (NẾU LÀ ĐỀ CUỐI KỲ - CHUẨN GDPT 2018)
  // ============================================================================
  if (isFinalExam) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "KHUNG MA TRẬN ĐỀ KIỂM TRA CUỐI HỌC KỲ (CHƯƠNG TRÌNH GDPT 2018)",
            bold: true,
            size: 26,
            font: "Times New Roman",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `MÔN: KHOA HỌC TỰ NHIÊN / HÓA HỌC - KHỐI ${grade} - THỜI GIAN: ${durationMinutes} PHÚT`,
            bold: true,
            italics: true,
            size: 22,
            font: "Times New Roman",
          }),
        ],
      })
    );

    // Tính toán số lượng câu theo mức độ
    const totalQ = questions.length;
    const nNhanBiet = Math.max(1, Math.round(totalQ * 0.4));
    const nThongHieu = Math.max(1, Math.round(totalQ * 0.3));
    const nVanDung = Math.max(1, Math.round(totalQ * 0.2));
    const nVDC = Math.max(0, totalQ - nNhanBiet - nThongHieu - nVanDung);

    const ptsNhanBiet = Math.round((nNhanBiet / totalQ) * totalPoints * 10) / 10;
    const ptsThongHieu = Math.round((nThongHieu / totalQ) * totalPoints * 10) / 10;
    const ptsVanDung = Math.round((nVanDung / totalQ) * totalPoints * 10) / 10;
    const ptsVDC = Math.round((totalPoints - ptsNhanBiet - ptsThongHieu - ptsVanDung) * 10) / 10;

    // Bảng Ma trận chuẩn Bộ GD&ĐT
    const matrixTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Hàng tiêu đề 1
        new TableRow({
          children: [
            new TableCell({
              rowSpan: 2,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TT", bold: true, font: "Times New Roman" })] })],
            }),
            new TableCell({
              rowSpan: 2,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Chủ đề / Đơn vị kiến thức", bold: true, font: "Times New Roman" })] })],
            }),
            new TableCell({
              columnSpan: 4,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mức độ đánh giá (Số câu TNKQ)", bold: true, font: "Times New Roman" })] })],
            }),
            new TableCell({
              rowSpan: 2,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số câu", bold: true, font: "Times New Roman" })] })],
            }),
            new TableCell({
              rowSpan: 2,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng điểm", bold: true, font: "Times New Roman" })] })],
            }),
            new TableCell({
              rowSpan: 2,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tỉ lệ %", bold: true, font: "Times New Roman" })] })],
            }),
          ],
        }),
        // Hàng tiêu đề 2
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nhận biết", bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Thông hiểu", bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vận dụng", bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vận dụng cao", bold: true, font: "Times New Roman" })] })] }),
          ],
        }),
        // Dòng nội dung
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: topic, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${nNhanBiet}`, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${nThongHieu}`, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${nVanDung}`, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${nVDC}`, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalQ}`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalPoints}.0`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "100%", bold: true, font: "Times New Roman" })] })] }),
          ],
        }),
        // Dòng tổng cộng
        new TableRow({
          children: [
            new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng cộng điểm số", bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${ptsNhanBiet} đ`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${ptsThongHieu} đ`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${ptsVanDung} đ`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${ptsVDC} đ`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalQ}`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalPoints}.0 đ`, bold: true, font: "Times New Roman" })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "100%", bold: true, font: "Times New Roman" })] })] }),
          ],
        }),
      ],
    });

    children.push(matrixTable);
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 240 },
        children: [
          new TextRun({
            text: "------------------------------------------------------------------------------------------------------------------------\n",
            color: "888888",
          }),
        ],
      })
    );
  }

  // ============================================================================
  // PHẦN B: TIÊU ĐỀ ĐỀ THI CHUẨN 2 CỘT THỂ THỨC BỘ GIÁO DỤC
  // ============================================================================
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "SỞ GD&ĐT TỈNH/THÀNH PHỐ\n", font: "Times New Roman", size: 22 }),
                  new TextRun({ text: "TRƯỜNG THCS CHEMCLASS\n", bold: true, font: "Times New Roman", size: 22 }),
                  new TextRun({ text: "TỔ: KHOA HỌC TỰ NHIÊN\n", font: "Times New Roman", size: 20 }),
                  new TextRun({ text: "-----------------------", color: "666666" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${title.toUpperCase()}\n`, bold: true, font: "Times New Roman", size: 24 }),
                  new TextRun({ text: `NĂM HỌC 2026 - 2027\n`, bold: true, font: "Times New Roman", size: 22 }),
                  new TextRun({ text: `MÔN: KHOA HỌC TỰ NHIÊN / HÓA HỌC - KHỐI ${grade}\n`, bold: true, font: "Times New Roman", size: 22 }),
                  new TextRun({ text: `Thời gian làm bài: ${durationMinutes} phút (Không kể phát đề)\n`, italics: true, font: "Times New Roman", size: 20 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);

  // Khung thông tin học sinh
  children.push(
    new Paragraph({
      spacing: { before: 180, after: 180 },
      children: [
        new TextRun({ text: "Họ và tên học sinh: ..................................................................................... ", font: "Times New Roman", size: 22 }),
        new TextRun({ text: "Lớp: ................... ", font: "Times New Roman", size: 22 }),
        new TextRun({ text: "SBD: ...................", font: "Times New Roman", size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: "PHẦN I. CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN\n",
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
        new TextRun({
          text: "(Thí sinh chọn duy nhất một phương án đúng trong mỗi câu hỏi)",
          italics: true,
          font: "Times New Roman",
          size: 20,
        }),
      ],
    })
  );

  // ============================================================================
  // PHẦN C: NỘI DUNG CÁC CÂU HỎI
  // ============================================================================
  questions.forEach((q, idx) => {
    const rawContent = formatLatexToWordText(q.content_latex);
    const qPoints = q.points ? `${q.points} điểm` : "";

    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: `Câu ${idx + 1}${qPoints ? ` (${qPoints})` : ""}: `,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
          new TextRun({
            text: rawContent,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );

    // 4 Phương án A, B, C, D
    const options = q.options_json || q.options || [];
    if (options.length > 0) {
      options.forEach((opt: any) => {
        const optText = formatLatexToWordText(opt.text);
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${opt.key}. `,
                bold: true,
                font: "Times New Roman",
                size: 22,
              }),
              new TextRun({
                text: optText,
                font: "Times New Roman",
                size: 22,
              }),
            ],
          })
        );
      });
    }
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 240 },
      children: [
        new TextRun({
          text: "---------- HẾT ----------\n",
          bold: true,
          font: "Times New Roman",
          size: 22,
        }),
        new TextRun({
          text: "(Cán bộ coi thi không giải thích gì thêm)",
          italics: true,
          font: "Times New Roman",
          size: 20,
        }),
      ],
    })
  );

  // ============================================================================
  // PHẦN D: BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT (TRANG TIẾP THEO)
  // ============================================================================
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 120 },
      children: [
        new TextRun({
          text: "HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT",
          bold: true,
          font: "Times New Roman",
          size: 26,
        }),
      ],
    })
  );

  // Bảng đáp án nhanh dạng lưới (Quick Answer Key Grid)
  const answerHeaderCells: TableCell[] = [];
  const answerValueCells: TableCell[] = [];

  questions.forEach((q, idx) => {
    answerHeaderCells.push(
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, bold: true, font: "Times New Roman" })] })],
      })
    );
    answerValueCells.push(
      new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.correct_answer}`, bold: true, color: "006600", font: "Times New Roman" })] })],
      })
    );
  });

  const answerGridTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Câu", bold: true, font: "Times New Roman" })] })] }), ...answerHeaderCells] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đáp án", bold: true, font: "Times New Roman" })] })] }), ...answerValueCells] }),
    ],
  });

  children.push(answerGridTable);

  // Lời giải chi tiết từng câu
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: "LỜI GIẢI CHI TIẾT TỪNG BƯỚC:",
          bold: true,
          font: "Times New Roman",
          size: 22,
        }),
      ],
    })
  );

  questions.forEach((q, idx) => {
    const rawExp = formatLatexToWordText(q.explanation || "Đang cập nhật");
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({
            text: `Câu ${idx + 1}: `,
            bold: true,
            font: "Times New Roman",
            size: 22,
          }),
          new TextRun({
            text: `Chọn đáp án ${q.correct_answer}. `,
            bold: true,
            color: "006600",
            font: "Times New Roman",
            size: 22,
          }),
          new TextRun({
            text: rawExp,
            font: "Times New Roman",
            size: 22,
          }),
        ],
      })
    );
  });

  // Khởi tạo Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.54 cm
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
