/**
 * Helper sinh mã VietQR Động và thông tin tài khoản ngân hàng nhận học phí
 */

export interface BankConfig {
  bankId: string;
  accountNo: string;
  accountName: string;
}

export function getBankConfig(): BankConfig {
  return {
    bankId: process.env.NEXT_PUBLIC_BANK_ID || "AGRIBANK",
    accountNo: process.env.NEXT_PUBLIC_ACCOUNT_NO || "5227205069151",
    accountName: process.env.NEXT_PUBLIC_ACCOUNT_NAME || "TRINH THI DIEU THU",
  };
}

/**
 * Sinh cú pháp chuyển khoản chuẩn ngân hàng: HP [Mã_HS] T[Tháng]
 * Ví dụ: "HP 8A101 T9" hoặc "HP 9A102 T10"
 */
export function generateTransferContent(studentCode: string, billingMonth: string): string {
  const cleanCode = (studentCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  // billingMonth dạng "09/2026" -> lấy "9"
  const monthNum = parseInt(billingMonth.split("/")[0], 10) || billingMonth;
  return `HP ${cleanCode} T${monthNum}`;
}

/**
 * Sinh link ảnh VietQR động chuẩn 247 NAPAS
 * Template: "compact2" hoặc "qr_only"
 */
export function generateVietQRUrl(params: {
  amount: number;
  transferContent: string;
  template?: "compact2" | "compact" | "qr_only";
}): string {
  const { amount, transferContent, template = "compact2" } = params;
  const config = getBankConfig();

  const encodedContent = encodeURIComponent(transferContent);
  const encodedName = encodeURIComponent(config.accountName);

  return `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-${template}.png?amount=${Math.round(
    amount
  )}&addInfo=${encodedContent}&accountName=${encodedName}`;
}
