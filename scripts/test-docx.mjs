import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel } from "docx";
import fs from "fs";

async function testDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "SỞ GD&ĐT TỈNH/THÀNH PHỐ\n", bold: true }),
              new TextRun({ text: "TRƯỜNG THCS CHEMCLASS\n", bold: true }),
              new TextRun({ text: "ĐỀ KIỂM TRA HỌC KỲ I - NĂM HỌC 2026 - 2027\n", bold: true, size: 28 }),
              new TextRun({ text: "MÔN: KHOA HỌC TỰ NHIÊN / HOÁ HỌC - KHỐI 8\n", bold: true }),
              new TextRun({ text: "Thời gian làm bài: 45 phút (Không kể thời gian phát đề)\n\n", italics: true }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("test_exam.docx", buffer);
  console.log("✅ Successfully created test_exam.docx! Size:", buffer.length);
}

testDocx();
