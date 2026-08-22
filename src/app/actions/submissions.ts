"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lấy danh sách kết quả bài làm và log giám sát gian lận của học sinh dành cho Giáo viên
 */
export async function getTeacherSubmissionsData(filterExamId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { submissions: [], exams: [], stats: { totalSubmissions: 0, avgScore: 0, flaggedCount: 0 } };
  }

  const adminClient = createAdminClient();

  // 1. Lấy danh sách các đề thi của giáo viên
  const { data: exams } = await adminClient
    .from("exams")
    .select("id, title, total_points, class_id, classes:class_id(name, grade)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const teacherExams = (exams || []).map((e: any) => ({
    ...e,
    classes: Array.isArray(e.classes) ? e.classes[0] : e.classes,
  }));

  const examIds = teacherExams.map((e) => e.id);

  if (examIds.length === 0) {
    return { submissions: [], exams: [], stats: { totalSubmissions: 0, avgScore: 0, flaggedCount: 0 } };
  }

  // 2. Lấy danh sách bài nộp
  let query = adminClient
    .from("exam_submissions")
    .select(`
      id,
      exam_id,
      student_id,
      score,
      answers_json,
      tab_switch_count,
      blur_events_log,
      submitted_at,
      exams:exam_id (
        id,
        title,
        total_points,
        classes:class_id (
          id,
          name,
          grade
        )
      ),
      profiles:student_id (
        id,
        full_name,
        student_code,
        phone
      )
    `)
    .in("exam_id", examIds)
    .order("submitted_at", { ascending: false });

  if (filterExamId && filterExamId !== "all") {
    query = query.eq("exam_id", filterExamId);
  }

  const { data: submissionsRaw, error } = await query;

  if (error) {
    console.error("Lỗi lấy danh sách bài nộp:", error);
    return { submissions: [], exams: teacherExams, stats: { totalSubmissions: 0, avgScore: 0, flaggedCount: 0 } };
  }

  const submissions = (submissionsRaw || []).map((sub: any) => ({
    ...sub,
    exams: Array.isArray(sub.exams) ? sub.exams[0] : sub.exams,
    profiles: Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles,
  }));

  // 3. Tính toán thống kê
  let totalScore = 0;
  let flaggedCount = 0;

  for (const s of submissions) {
    totalScore += Number(s.score) || 0;
    if ((s.tab_switch_count || 0) > 0) {
      flaggedCount++;
    }
  }

  const avgScore = submissions.length > 0 ? Math.round((totalScore / submissions.length) * 10) / 10 : 0;

  return {
    submissions,
    exams: teacherExams,
    stats: {
      totalSubmissions: submissions.length,
      avgScore,
      flaggedCount,
    },
  };
}
