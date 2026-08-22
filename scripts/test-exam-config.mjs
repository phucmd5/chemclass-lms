function encodeExamTitle(title, config = {}) {
  const clean = (title || "")
    .replace(/<!--exam_config:.*?-->/g, "")
    .replace(/<!--allow_retake:.*?-->/g, "")
    .trim();

  const payload = {
    allowRetake: !!config.allowRetake,
    shuffleQuestions: !!config.shuffleQuestions,
    allowViewAnswers: config.allowViewAnswers !== false,
  };

  return `${clean} <!--exam_config:${JSON.stringify(payload)}-->`;
}

function parseExamTitle(rawTitle) {
  const clean = (rawTitle || "")
    .replace(/<!--exam_config:.*?-->/g, "")
    .replace(/<!--allow_retake:.*?-->/g, "")
    .trim();

  const match = (rawTitle || "").match(/<!--exam_config:(.*?)-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return {
        title: clean,
        allowRetake: !!parsed.allowRetake,
        shuffleQuestions: !!parsed.shuffleQuestions,
        allowViewAnswers: parsed.allowViewAnswers !== false,
      };
    } catch {}
  }

  const legacyMatch = (rawTitle || "").match(/<!--allow_retake:(true|false)-->/);
  const allowRetake = legacyMatch ? legacyMatch[1] === "true" : false;

  return {
    title: clean,
    allowRetake,
    shuffleQuestions: false,
    allowViewAnswers: true,
  };
}

const encoded = encodeExamTitle("Kiểm tra 15p Hoá 8", {
  allowRetake: false,
  shuffleQuestions: true,
  allowViewAnswers: false,
});
console.log("Encoded:", encoded);
console.log("Parsed:", parseExamTitle(encoded));

const legacy = "Kiểm tra 45p <!--allow_retake:true-->";
console.log("Legacy Parsed:", parseExamTitle(legacy));
