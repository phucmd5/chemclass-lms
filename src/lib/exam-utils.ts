export interface ExamConfig {
  title: string;
  allowRetake: boolean;
  shuffleQuestions: boolean;
  allowViewAnswers: boolean;
}

/**
 * Mã hóa các cờ cấu hình (Cho phép làm lại, Đảo đề, Xem đáp án) vào tiêu đề đề thi
 */
export function encodeExamTitle(
  title: string,
  config: { allowRetake?: boolean; shuffleQuestions?: boolean; allowViewAnswers?: boolean } = {}
): string {
  const clean = (title || "")
    .replace(/<!--exam_config:.*?-->/g, "")
    .replace(/<!--allow_retake:.*?-->/g, "")
    .trim();

  const payload = {
    allowRetake: !!config.allowRetake,
    shuffleQuestions: config.shuffleQuestions !== undefined ? !!config.shuffleQuestions : true,
    allowViewAnswers: config.allowViewAnswers !== false,
  };

  return `${clean} <!--exam_config:${JSON.stringify(payload)}-->`;
}

/**
 * Giải mã các cờ cấu hình từ tiêu đề đề thi
 */
export function parseExamTitle(rawTitle: string, dbFields?: any): ExamConfig {
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
        shuffleQuestions: parsed.shuffleQuestions !== undefined ? !!parsed.shuffleQuestions : true,
        allowViewAnswers: parsed.allowViewAnswers !== false,
      };
    } catch {}
  }

  const legacyMatch = (rawTitle || "").match(/<!--allow_retake:(true|false)-->/);
  const allowRetake = legacyMatch ? legacyMatch[1] === "true" : false;

  return {
    title: clean,
    allowRetake,
    shuffleQuestions: true,
    allowViewAnswers: true,
  };
}

/**
 * Hàm trộn mảng ngẫu nhiên (Fisher-Yates Shuffle)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
