import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatDate(dateStr: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

/**
 * Sinh mã học sinh tự động theo quy tắc: [Tên Lớp viết liền không dấu] + [Số thứ tự 2 chữ số]
 * Ví dụ: Lớp "12A1" -> "12A101", "12A102"
 *        Lớp "12 Hóa" -> "12HOA01"
 *        Lớp "Hoá 12 VIP" -> "HOA12VIP01"
 */
export function generateStudentCode(className: string, index: number): string {
  const cleanPrefix = (className || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt (ví dụ: Hoá -> Hoa)
    .replace(/[^a-zA-Z0-9]/g, "") // Chỉ giữ chữ và số, bỏ khoảng trắng và ký tự đặc biệt
    .toUpperCase();

  const prefix = cleanPrefix.length > 0 ? cleanPrefix : "HS";
  const formattedIndex = String(index).padStart(2, "0");
  return `${prefix}${formattedIndex}`;
}
