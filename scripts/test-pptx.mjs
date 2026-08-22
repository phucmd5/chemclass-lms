import pptxgen from "pptxgenjs";
import fs from "fs";

async function testPptx() {
  console.log("Testing pptxgenjs generation...");
  const pres = new pptxgen();

  pres.layout = "LAYOUT_16x9";
  pres.title = "Bài giảng Hóa học 8 - Phản ứng hóa học";

  // Slide 1: Title Slide
  const slide1 = pres.addSlide();
  slide1.background = { color: "0F172A" }; // dark slate

  slide1.addText("CHỦ ĐỀ: PHẢN ỨNG HÓA HỌC", {
    x: 0.8,
    y: 1.8,
    w: 8.4,
    h: 1.0,
    fontSize: 28,
    bold: true,
    color: "38BDF8", // cyan
    fontFace: "Arial",
  });

  slide1.addText("Môn: Khoa học Tự nhiên & Hóa học THCS (Khối 8)", {
    x: 0.8,
    y: 2.8,
    w: 8.4,
    h: 0.6,
    fontSize: 16,
    color: "94A3B8",
    fontFace: "Arial",
  });

  // Slide 2: Content with 2 columns
  const slide2 = pres.addSlide();
  slide2.background = { color: "F8FAFC" }; // clean white

  slide2.addText("I. Khái niệm Phản ứng Hóa học", {
    x: 0.8,
    y: 0.5,
    w: 8.4,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: "1E293B",
  });

  slide2.addText(
    [
      { text: "• Phản ứng hóa học là quá trình biến đổi chất này thành chất khác.\n" },
      { text: "• Chất ban đầu bị biến đổi gọi là " },
      { text: "chất phản ứng (chất tham gia)", options: { bold: true, color: "0284C7" } },
      { text: ".\n" },
      { text: "• Chất mới sinh ra gọi là " },
      { text: "sản phẩm", options: { bold: true, color: "16A34A" } },
      { text: ".\n" },
    ],
    { x: 0.8, y: 1.4, w: 8.4, h: 2.5, fontSize: 14, color: "334155" }
  );

  // Chemistry callout box
  slide2.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 3.8,
    w: 8.4,
    h: 1.2,
    fill: { color: "E0F2FE" },
    line: { color: "38BDF8", width: 1 },
  });

  slide2.addText("Ví dụ minh họa: 2H₂ + O₂ ──(t°)──> 2H₂O (Khí Hidro cháy tạo thành Nước)", {
    x: 1.0,
    y: 4.0,
    w: 8.0,
    h: 0.8,
    fontSize: 13,
    bold: true,
    color: "0369A1",
  });

  const buffer = await pres.write({ outputType: "nodebuffer" });
  fs.writeFileSync("scripts/test-presentation.pptx", buffer);
  console.log("✅ Successfully created scripts/test-presentation.pptx (size:", buffer.length, "bytes)");
}

testPptx();
