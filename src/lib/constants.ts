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
