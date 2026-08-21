/**
 * Định nghĩa các khối học cấp Trung học cơ sở (THCS: Khối 6 -> Khối 9)
 */
export const GRADE_OPTIONS = [
  { value: "6", label: "Khối 6 (KHTN 6)" },
  { value: "7", label: "Khối 7 (KHTN 7)" },
  { value: "8", label: "Khối 8 (KHTN 8 / Hoá 8)" },
  { value: "9", label: "Khối 9 (KHTN 9 / Hoá 9)" },
  { value: "Khác", label: "Bồi dưỡng HSG THCS / Khác" },
];

/**
 * Định nghĩa khung giờ các tiết học chuẩn ChemClass LMS
 * - Buổi sáng: Tiết 1 -> Tiết 5
 * - Buổi chiều: 13h30 -> 16h30 (không chia tiết)
 */
export const TIME_SLOT_DEFS = [
  { id: "1", period: 1, name: "Tiết 1", session: "morning", startTime: "07:00", endTime: "07:45" },
  { id: "2", period: 2, name: "Tiết 2", session: "morning", startTime: "07:50", endTime: "08:35" },
  { id: "3", period: 3, name: "Tiết 3", session: "morning", startTime: "08:50", endTime: "09:35" },
  { id: "4", period: 4, name: "Tiết 4", session: "morning", startTime: "09:40", endTime: "10:15" },
  { id: "5", period: 5, name: "Tiết 5", session: "morning", startTime: "10:20", endTime: "11:05" },
  { id: "afternoon", period: 6, name: "Buổi Chiều", session: "afternoon", startTime: "13:30", endTime: "16:30" },
];
