function extractBalancedBraces(str, startIndex) {
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

function parseFractionsRecursively(text) {
  let result = text;
  let fracIdx = result.indexOf("\\frac");

  while (fracIdx !== -1) {
    // Tìm phần tử thứ nhất {A}
    const firstBrace = extractBalancedBraces(result, fracIdx + 5);
    if (!firstBrace) break;

    // Tìm phần tử thứ hai {B}
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

function cleanLatexForPptx(text) {
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
  const subscriptMap = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  };
  const superscriptMap = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "o": "°",
  };

  // Thay thế _{123} hoặc _2
  res = res.replace(/_\{([0-9\+\-\(\)]+)\}/g, (_, digits) =>
    digits.split("").map((d) => subscriptMap[d] || d).join("")
  );
  res = res.replace(/_([0-9])/g, (_, d) => subscriptMap[d] || d);

  // Thay thế ^{123} hoặc ^2 hoặc ^o
  res = res.replace(/\^\{([0-9\+\-\(\)o]+)\}/g, (_, digits) =>
    digits.split("").map((d) => superscriptMap[d] || d).join("")
  );
  res = res.replace(/\^([0-9o])/g, (_, d) => superscriptMap[d] || d);

  // Xử lý n_{H2O} -> n_{H₂O} -> n_H₂O
  res = res.replace(/_\{([^}]+)\}/g, "_$1");

  // Dọn dẹp khoảng trắng thừa
  res = res.replace(/\\/g, "").replace(/\s+/g, " ").trim();

  return res;
}

const tests = [
  "$n = \\frac{m}{M}$",
  "$m = n \\times M$",
  "$V = n \\times 22,4$",
  "$C_M = \\frac{n}{V}$",
  "$C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$",
  "$m_{dd} = m_{ct} + m_{H_2O}$",
  "$d_{A/B} = \\frac{M_A}{M_B}$",
  "$2Al + 6HCl \\rightarrow 2AlCl_3 + 3H_2 \\uparrow$",
  "$2KMnO_4 \\xrightarrow{t^o} K_2MnO_4 + MnO_2 + O_2 \\uparrow$",
  "Khối lượng chất tan: $m_{ct} = \\frac{C\\% \\times m_{dd}}{100\\%}$",
  "Nồng độ phần trăm: $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$",
];

console.log("=== KIỂM TRA CHUYỂN ĐỔI CÔNG THỨC PPTX (MỚI) ===");
tests.forEach((t) => {
  console.log(`${t} \n  -->  ${cleanLatexForPptx(t)}\n`);
});
