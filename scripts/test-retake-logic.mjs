function encodeExamTitle(title, allowRetake) {
  const clean = title.replace(/<!--allow_retake:(true|false)-->/g, "").trim();
  return `${clean} <!--allow_retake:${allowRetake ? "true" : "false"}-->`;
}

function parseExamTitle(rawTitle, dbAllowRetake) {
  if (typeof dbAllowRetake === "boolean") {
    const clean = (rawTitle || "").replace(/<!--allow_retake:(true|false)-->/g, "").trim();
    return { title: clean, allowRetake: dbAllowRetake };
  }
  const match = (rawTitle || "").match(/<!--allow_retake:(true|false)-->/);
  const allowRetake = match ? match[1] === "true" : false;
  const clean = (rawTitle || "").replace(/<!--allow_retake:(true|false)-->/g, "").trim();
  return { title: clean, allowRetake };
}

const raw = encodeExamTitle("Kiểm tra 15 phút - Bài 1", true);
console.log("Encoded:", raw);
console.log("Parsed:", parseExamTitle(raw));

const rawFalse = encodeExamTitle("Đề thi cuối kỳ 1", false);
console.log("Encoded False:", rawFalse);
console.log("Parsed False:", parseExamTitle(rawFalse));
