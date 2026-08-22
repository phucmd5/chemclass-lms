import pptxgen from "pptxgenjs";

export interface SlideItem {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  layout: "title" | "content_bullet" | "two_column" | "quote_definition" | "quiz" | "summary";
  content: {
    bullets?: string[];
    leftColumn?: { heading?: string; bullets: string[] };
    rightColumn?: { heading?: string; bullets: string[] };
    highlightBox?: { title: string; text: string };
    chemicalEquations?: string[];
    quiz?: {
      question: string;
      options: string[];
      answer: string;
      explanation: string;
    };
    summary?: {
      keyPoints: string[];
      formulas?: string[];
      homework?: string;
    };
  };
  speakerNotes?: string;
}

export interface SlideDeck {
  topic: string;
  grade: string;
  subject?: string;
  author?: string;
  theme: "modern_chemistry" | "ocean_blue" | "emerald_nature" | "sunset_orange" | "academic_light";
  slides: SlideItem[];
}

function extractBalancedBraces(str: string, startIndex: number) {
  let depth = 0;
  let start = -1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (str[i] === "}") {
      depth--;
      if (depth === 0) {
        return { start, end: i, content: str.slice(start + 1, i) };
      }
    }
  }
  return null;
}

function parseFractionsRecursively(text: string): string {
  let result = text;
  let fracIdx = result.indexOf("\\frac");

  while (fracIdx !== -1) {
    const firstBrace = extractBalancedBraces(result, fracIdx + 5);
    if (!firstBrace) break;

    const secondBrace = extractBalancedBraces(result, firstBrace.end + 1);
    if (!secondBrace) break;

    const num = parseFractionsRecursively(firstBrace.content);
    const denom = parseFractionsRecursively(secondBrace.content);

    const fullFrac = result.slice(fracIdx, secondBrace.end + 1);
    result = result.replace(fullFrac, `(${num} / ${denom})`);

    fracIdx = result.indexOf("\\frac");
  }

  return result;
}

/**
 * Chuyển đổi công thức LaTeX sang chuỗi ký tự Unicode Hóa học & Toán học chính xác
 */
export function cleanLatexForPptx(text: string): string {
  if (!text) return "";

  let res = text;

  // 1. Gỡ bỏ dấu bọc LaTeX $$ và $
  res = res.replace(/\$\$/g, "").replace(/\$/g, "");

  // 2. Thay thế các ký hiệu cơ bản trước
  res = res
    .replace(/\\rightarrow/g, " ──> ")
    .replace(/\\xrightarrow\{t\^o\}/g, " ──(t°)──> ")
    .replace(/\\xrightarrow\{([^}]+)\}/g, " ──($1)──> ")
    .replace(/\\uparrow/g, " ↑")
    .replace(/\\downarrow/g, " ↓")
    .replace(/\\times/g, " × ")
    .replace(/\\cdot/g, " · ")
    .replace(/\\%/g, "%")
    .replace(/\\approx/g, " ≈ ")
    .replace(/\\le/g, " ≤ ")
    .replace(/\\ge/g, " ≥ ")
    .replace(/\\neq/g, " ≠ ")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\textbf\{([^}]+)\}/g, "$1");

  // 3. Xử lý phân số chuẩn xác (hỗ trợ ngoặc nhọn lồng nhau)
  res = parseFractionsRecursively(res);

  // 4. Chỉ số dưới dạng {ct}, {dd}, {H2O}, {pt}, {pu}, {kt}, {chat tan}, v.v.
  res = res
    .replace(/_\{ct\}/gi, "_ct")
    .replace(/_\{dd\}/gi, "_dd")
    .replace(/_\{dm\}/gi, "_dm")
    .replace(/_\{pu\}/gi, "_pư")
    .replace(/_\{kt\}/gi, "_kt")
    .replace(/_\{chất tan\}/gi, "_chất tan")
    .replace(/_\{dung dịch\}/gi, "_dung dịch")
    .replace(/_\{dung môi\}/gi, "_dung môi")
    .replace(/_\{([a-zA-Z\s]+)\}/g, "_$1");

  // 5. Chỉ số dưới hóa học & số mũ
  const subscriptMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  };
  const superscriptMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "o": "°",
  };

  res = res.replace(/_\{([0-9\+\-\(\)]+)\}/g, (_, digits) =>
    digits.split("").map((d: string) => subscriptMap[d] || d).join("")
  );
  res = res.replace(/_([0-9])/g, (_, d: string) => subscriptMap[d] || d);

  res = res.replace(/\^\{([0-9\+\-\(\)o]+)\}/g, (_, digits) =>
    digits.split("").map((d: string) => superscriptMap[d] || d).join("")
  );
  res = res.replace(/\^([0-9o])/g, (_, d: string) => superscriptMap[d] || d);

  // Xử lý n_{H2O} -> n_H₂O
  res = res.replace(/_\{([^}]+)\}/g, "_$1");

  // Dọn dẹp khoảng trắng thừa
  res = res.replace(/\\/g, "").replace(/\s+/g, " ").trim();

  return res;
}

const THEME_STYLES: Record<string, {
  bg: string;
  titleBg: string;
  textDark: boolean;
  primary: string;
  titleColor: string;
  textColor: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}> = {
  modern_chemistry: {
    bg: "0F172A",
    titleBg: "020617",
    textDark: false,
    primary: "38BDF8",
    titleColor: "F8FAFC",
    textColor: "E2E8F0",
    accentBg: "1E293B",
    accentBorder: "38BDF8",
    accentText: "7DD3FC",
  },
  ocean_blue: {
    bg: "F0F9FF",
    titleBg: "0369A1",
    textDark: true,
    primary: "0284C7",
    titleColor: "0C4A6E",
    textColor: "334155",
    accentBg: "E0F2FE",
    accentBorder: "0284C7",
    accentText: "0369A1",
  },
  emerald_nature: {
    bg: "F0FDF4",
    titleBg: "065F46",
    textDark: true,
    primary: "059669",
    titleColor: "064E3B",
    textColor: "1E293B",
    accentBg: "DCFCE7",
    accentBorder: "10B981",
    accentText: "047857",
  },
  sunset_orange: {
    bg: "FFFBEB",
    titleBg: "9A3412",
    textDark: true,
    primary: "EA580C",
    titleColor: "7C2D12",
    textColor: "292524",
    accentBg: "FFEDD5",
    accentBorder: "F97316",
    accentText: "C2410C",
  },
  academic_light: {
    bg: "FFFFFF",
    titleBg: "1E1B4B",
    textDark: true,
    primary: "4F46E5",
    titleColor: "1E293B",
    textColor: "334155",
    accentBg: "EEF2FF",
    accentBorder: "6366F1",
    accentText: "4338CA",
  },
};

/**
 * Sinh file PowerPoint (.pptx) hoàn chỉnh từ SlideDeck
 */
export async function generatePptxBlob(deck: SlideDeck): Promise<Blob> {
  const pres = new pptxgen();

  pres.layout = "LAYOUT_16x9";
  pres.title = deck.topic || "Bài giảng Hóa học THCS";
  pres.author = deck.author || "ChemClass LMS";

  const themeKey = deck.theme || "modern_chemistry";
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.modern_chemistry;

  for (const s of deck.slides) {
    const slide = pres.addSlide();

    // Speaker notes
    if (s.speakerNotes) {
      slide.addNotes(cleanLatexForPptx(s.speakerNotes));
    }

    if (s.layout === "title") {
      // SLIDE TIÊU ĐỀ
      slide.background = { color: theme.titleBg };

      // Khối viền trang trí
      slide.addShape(pres.ShapeType.rect, {
        x: 0.8,
        y: 1.2,
        w: 0.15,
        h: 2.8,
        fill: { color: theme.primary },
        line: { color: theme.primary },
      });

      slide.addText(cleanLatexForPptx(s.title), {
        x: 1.2,
        y: 1.2,
        w: 8.0,
        h: 1.8,
        fontSize: 32,
        bold: true,
        color: "FFFFFF",
        fontFace: "Arial",
        valign: "top",
      });

      if (s.subtitle) {
        slide.addText(cleanLatexForPptx(s.subtitle), {
          x: 1.2,
          y: 3.1,
          w: 8.0,
          h: 0.9,
          fontSize: 18,
          color: theme.primary,
          fontFace: "Arial",
        });
      }

      slide.addText(`Môn: ${deck.subject || "Hóa học & KHTN THCS"} (Khối ${deck.grade}) • ChemClass LMS`, {
        x: 1.2,
        y: 4.6,
        w: 8.0,
        h: 0.5,
        fontSize: 12,
        color: "94A3B8",
        fontFace: "Arial",
      });
    } else {
      // CÁC SLIDE NỘI DUNG
      slide.background = { color: theme.bg };

      // Header Banner
      slide.addShape(pres.ShapeType.rect, {
        x: 0.6,
        y: 0.4,
        w: 0.1,
        h: 0.6,
        fill: { color: theme.primary },
        line: { color: theme.primary },
      });

      slide.addText(cleanLatexForPptx(s.title), {
        x: 0.85,
        y: 0.35,
        w: 8.5,
        h: 0.7,
        fontSize: 22,
        bold: true,
        color: theme.titleColor,
        fontFace: "Arial",
        valign: "middle",
      });

      // Số trang slide ở góc dưới
      slide.addText(`${s.slideNumber || ""}`, {
        x: 9.0,
        y: 5.0,
        w: 0.6,
        h: 0.3,
        fontSize: 10,
        color: "94A3B8",
        align: "right",
      });

      if (s.layout === "two_column") {
        // BỐ CỤC 2 CỘT
        const leftH = s.content.leftColumn?.heading;
        const leftB = (s.content.leftColumn?.bullets || []).map((b) => ({
          text: cleanLatexForPptx(b),
          options: { bullet: true, fontSize: 13, color: theme.textColor },
        }));

        if (leftH) {
          slide.addText(cleanLatexForPptx(leftH), {
            x: 0.8,
            y: 1.3,
            w: 4.1,
            h: 0.5,
            fontSize: 15,
            bold: true,
            color: theme.primary,
          });
        }
        if (leftB.length > 0) {
          slide.addText(leftB, { x: 0.8, y: leftH ? 1.9 : 1.3, w: 4.1, h: 3.2 });
        }

        const rightH = s.content.rightColumn?.heading;
        const rightB = (s.content.rightColumn?.bullets || []).map((b) => ({
          text: cleanLatexForPptx(b),
          options: { bullet: true, fontSize: 13, color: theme.textColor },
        }));

        if (rightH) {
          slide.addText(cleanLatexForPptx(rightH), {
            x: 5.1,
            y: 1.3,
            w: 4.1,
            h: 0.5,
            fontSize: 15,
            bold: true,
            color: theme.primary,
          });
        }
        if (rightB.length > 0) {
          slide.addText(rightB, { x: 5.1, y: rightH ? 1.9 : 1.3, w: 4.1, h: 3.2 });
        }
      } else if (s.layout === "quiz" && s.content.quiz) {
        // BỐ CỤC CÂU HỎI TRẮC NGHIỆM CỦNG CỐ
        const q = s.content.quiz;

        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8,
          y: 1.2,
          w: 8.4,
          h: 1.1,
          fill: { color: theme.accentBg },
          line: { color: theme.accentBorder, width: 1 },
        });

        slide.addText(`❓ Câu hỏi: ${cleanLatexForPptx(q.question)}`, {
          x: 1.0,
          y: 1.3,
          w: 8.0,
          h: 0.9,
          fontSize: 14,
          bold: true,
          color: theme.accentText,
        });

        const optTexts = (q.options || []).map((opt) => ({
          text: cleanLatexForPptx(opt),
          options: { bullet: false, fontSize: 13, color: theme.textColor },
        }));

        slide.addText(optTexts, {
          x: 1.0,
          y: 2.5,
          w: 8.0,
          h: 1.8,
          lineSpacing: 24,
        });

        if (q.answer) {
          slide.addShape(pres.ShapeType.rect, {
            x: 0.8,
            y: 4.4,
            w: 8.4,
            h: 0.6,
            fill: { color: "10B981" },
          });
          slide.addText(`✅ Đáp án: ${q.answer} - ${cleanLatexForPptx(q.explanation || "")}`, {
            x: 1.0,
            y: 4.45,
            w: 8.0,
            h: 0.5,
            fontSize: 11,
            bold: true,
            color: "FFFFFF",
          });
        }
      } else if (s.layout === "summary") {
        // BỐ CỤC TỔNG KẾT & GHI NHỚ CUỐI BÀI
        const sum = s.content.summary;
        const keyPoints = sum?.keyPoints || s.content.bullets || [];

        const bulletTexts = keyPoints.map((k) => ({
          text: cleanLatexForPptx(k),
          options: { bullet: true, fontSize: 13, color: theme.textColor },
        }));

        if (bulletTexts.length > 0) {
          slide.addText(bulletTexts, {
            x: 0.8,
            y: 1.3,
            w: sum?.formulas || sum?.homework ? 4.3 : 8.4,
            h: 3.2,
            lineSpacing: 20,
          });
        }

        // Cột phải hoặc khối dưới: Công thức cần nhớ & Dặn dò
        if (sum?.formulas && sum.formulas.length > 0) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: 5.3,
            y: 1.3,
            w: 3.9,
            h: 1.7,
            fill: { color: theme.accentBg },
            line: { color: theme.accentBorder, width: 1 },
          });

          const fText = sum.formulas.map((f) => cleanLatexForPptx(f)).join("\n");
          slide.addText(`📌 Công thức trọng tâm:\n${fText}`, {
            x: 5.5,
            y: 1.4,
            w: 3.5,
            h: 1.5,
            fontSize: 12,
            bold: true,
            color: theme.accentText,
          });
        }

        if (sum?.homework) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: 5.3,
            y: 3.2,
            w: 3.9,
            h: 1.4,
            fill: { color: "FEF3C7" },
            line: { color: "F59E0B", width: 1 },
          });

          slide.addText(`📝 Nhiệm vụ về nhà:\n${cleanLatexForPptx(sum.homework)}`, {
            x: 5.5,
            y: 3.3,
            w: 3.5,
            h: 1.2,
            fontSize: 11,
            color: "92400E",
          });
        }
      } else {
        // BỐ CỤC CHUẨN: BULLET POINTS + HIGHLIGHT BOX
        const bullets = (s.content.bullets || []).map((b) => ({
          text: cleanLatexForPptx(b),
          options: { bullet: true, fontSize: 13, color: theme.textColor },
        }));

        if (bullets.length > 0) {
          slide.addText(bullets, {
            x: 0.8,
            y: 1.3,
            w: 8.4,
            h: s.content.highlightBox || s.content.chemicalEquations ? 2.1 : 3.4,
            lineSpacing: 22,
          });
        }

        // Khối phương trình hoặc highlight
        if (s.content.chemicalEquations && s.content.chemicalEquations.length > 0) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: 0.8,
            y: 3.5,
            w: 8.4,
            h: 1.3,
            fill: { color: theme.accentBg },
            line: { color: theme.accentBorder, width: 1 },
          });

          const eqText = s.content.chemicalEquations.map((eq) => cleanLatexForPptx(eq)).join("\n");
          slide.addText(`⚗️ Phương trình phản ứng:\n${eqText}`, {
            x: 1.0,
            y: 3.6,
            w: 8.0,
            h: 1.1,
            fontSize: 12,
            bold: true,
            color: theme.accentText,
          });
        } else if (s.content.highlightBox) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: 0.8,
            y: 3.5,
            w: 8.4,
            h: 1.3,
            fill: { color: theme.accentBg },
            line: { color: theme.accentBorder, width: 1 },
          });

          slide.addText(
            `💡 ${cleanLatexForPptx(s.content.highlightBox.title)}:\n${cleanLatexForPptx(s.content.highlightBox.text)}`,
            {
              x: 1.0,
              y: 3.6,
              w: 8.0,
              h: 1.1,
              fontSize: 12,
              color: theme.accentText,
            }
          );
        }
      }
    }
  }

  const buffer = (await pres.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
