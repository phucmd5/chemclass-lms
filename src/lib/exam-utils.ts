/**
 * Helpers mã hóa và giải mã cờ allow_retake vào tiêu đề đề thi
 */
export function encodeExamTitle(title: string, allowRetake: boolean): string {
  const clean = (title || "").replace(/<!--allow_retake:(true|false)-->/g, "").trim();
  return `${clean} <!--allow_retake:${allowRetake ? "true" : "false"}-->`;
}

export function parseExamTitle(rawTitle: string, dbAllowRetake?: any): { title: string; allowRetake: boolean } {
  if (typeof dbAllowRetake === "boolean") {
    const clean = (rawTitle || "").replace(/<!--allow_retake:(true|false)-->/g, "").trim();
    return { title: clean, allowRetake: dbAllowRetake };
  }
  const match = (rawTitle || "").match(/<!--allow_retake:(true|false)-->/);
  const allowRetake = match ? match[1] === "true" : false;
  const clean = (rawTitle || "").replace(/<!--allow_retake:(true|false)-->/g, "").trim();
  return { title: clean, allowRetake };
}
