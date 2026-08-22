function formatLatexToWordText(str) {
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
    .replace(/\\mathbf\{([^}]+)\}/g, "$1");

  const subMap = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "⁼", "(": "₍", ")": "₎",
  };

  const supMap = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "o": "°",
  };

  result = result.replace(/_\{([0-9+\-()]+)\}/g, (_, p1) =>
    p1.split("").map((c) => subMap[c] || c).join("")
  );
  result = result.replace(/_([0-9])/g, (_, p1) => subMap[p1] || p1);

  result = result.replace(/\^\{([0-9+\-()o]+)\}/g, (_, p1) =>
    p1.split("").map((c) => supMap[c] || c).join("")
  );
  result = result.replace(/\^([0-9+o])/g, (_, p1) => supMap[p1] || p1);

  return result.replace(/\\/g, "").trim();
}

console.log("Original: $2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$");
console.log("Converted:", formatLatexToWordText("$2H_2 + O_2 \\xrightarrow{t^o} 2H_2O$"));

console.log("Original: $Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow$");
console.log("Converted:", formatLatexToWordText("$Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow$"));

console.log("Original: $Fe_2(SO_4)_3$");
console.log("Converted:", formatLatexToWordText("$Fe_2(SO_4)_3$"));
