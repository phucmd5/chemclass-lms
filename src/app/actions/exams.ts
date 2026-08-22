"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateChemistryExamQuestions } from "@/lib/gemini";
import { revalidatePath } from "next/cache";

/**
 * Server Action gọi Google Gemini AI sinh câu hỏi Hóa học THCS
 */
export async function generateAIExamQuestionsAction(payload: {
  grade: string;
  topic: string;
  questionCount: number;
  difficulty?: string;
  questionType?: "multiple_choice" | "short_answer" | "mixed";
  customInstructions?: string;
}) {
  try {
    const questions = await generateChemistryExamQuestions(payload);
    return { success: true, questions };
  } catch (err: any) {
    console.error("Lỗi sinh đề AI:", err);
    return { error: err.message || "Không thể sinh câu hỏi bằng AI" };
  }
}

/**
 * Lưu đề thi kèm danh sách câu hỏi vào cơ sở dữ liệu
 */
export async function saveExamWithQuestions(payload: {
  examId?: string;
  classId: string;
  title: string;
  durationMinutes: number;
  totalPoints?: number;
  isPublished?: boolean;
  questions: Array<{
    type: string;
    content_latex: string;
    options_json?: any;
    correct_answer: string;
    explanation?: string;
    points?: number;
  }>;
}) {
  const {
    examId,
    classId,
    title,
    durationMinutes = 45,
    totalPoints = 10,
    isPublished = true,
    questions,
  } = payload;

  if (!classId || !title || !questions || questions.length === 0) {
    return { error: "Vui lòng nhập đầy đủ tên đề thi, lớp học và ít nhất 1 câu hỏi!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Bạn chưa đăng nhập!" };

  const adminClient = createAdminClient();

  let targetExamId = examId;

  // 1. Tạo hoặc cập nhật đề thi trong bảng exams
  if (targetExamId) {
    const { error: updateErr } = await adminClient
      .from("exams")
      .update({
        class_id: classId,
        title,
        duration_minutes: durationMinutes,
        total_points: totalPoints,
        is_published: isPublished,
      })
      .eq("id", targetExamId)
      .eq("teacher_id", user.id);

    if (updateErr) {
      return { error: `Lỗi cập nhật đề thi: ${updateErr.message}` };
    }

    // Xóa câu hỏi cũ để nạp câu hỏi mới
    await adminClient.from("questions").delete().eq("exam_id", targetExamId);
  } else {
    const { data: newExam, error: insExamErr } = await adminClient
      .from("exams")
      .insert({
        class_id: classId,
        teacher_id: user.id,
        title,
        duration_minutes: durationMinutes,
        total_points: totalPoints,
        is_published: isPublished,
      })
      .select()
      .single();

    if (insExamErr || !newExam) {
      return { error: `Lỗi tạo đề thi: ${insExamErr?.message || "Không thể tạo đề thi"}` };
    }

    targetExamId = newExam.id;
  }

  // 2. Chèn danh sách câu hỏi vào bảng questions
  const pointsPerQuestion = totalPoints / questions.length;
  const questionRecords = questions.map((q, idx) => ({
    exam_id: targetExamId,
    type: q.type || "multiple_choice",
    content_latex: q.content_latex,
    options_json: q.options_json || null,
    correct_answer: (q.correct_answer || "A").trim().toUpperCase(),
    explanation: q.explanation || null,
    points: q.points || pointsPerQuestion,
    order_index: idx + 1,
  }));

  const { error: insQErr } = await adminClient.from("questions").insert(questionRecords);

  if (insQErr) {
    return { error: `Lỗi lưu câu hỏi: ${insQErr.message}` };
  }

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  return { success: true, examId: targetExamId };
}

/**
 * Lấy danh sách toàn bộ đề thi của Giáo viên
 */
export async function getTeacherExams() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const adminClient = createAdminClient();

  const { data: exams, error } = await adminClient
    .from("exams")
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade
      ),
      questions (
        id,
        points
      ),
      exam_submissions (
        id,
        score,
        tab_switch_count
      )
    `)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy danh sách đề thi:", error);
    return [];
  }

  return (exams || []).map((ex: any) => ({
    ...ex,
    classes: Array.isArray(ex.classes) ? ex.classes[0] : ex.classes,
    questionCount: ex.questions?.length || 0,
    submissionCount: ex.exam_submissions?.length || 0,
  }));
}

/**
 * Lấy chi tiết đề thi kèm danh sách câu hỏi & kết quả bài làm của học sinh (nếu đã nộp)
 */
export async function getExamWithQuestions(examId: string) {
  if (!examId) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminClient = createAdminClient();

  const { data: exam, error: examErr } = await adminClient
    .from("exams")
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade
      )
    `)
    .eq("id", examId)
    .single();

  if (examErr || !exam) return null;

  const { data: questions } = await adminClient
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  let mySubmission: any = null;
  if (user) {
    const { data: sub } = await adminClient
      .from("exam_submissions")
      .select("*")
      .eq("exam_id", examId)
      .eq("student_id", user.id)
      .single();

    if (sub) {
      mySubmission = sub;
    }
  }

  return {
    ...exam,
    classes: Array.isArray(exam.classes) ? exam.classes[0] : exam.classes,
    questions: questions || [],
    mySubmission,
  };
}

/**
 * Xuất bản / Thu hồi đề thi
 */
export async function toggleExamPublish(examId: string, isPublished: boolean) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("exams")
    .update({ is_published: isPublished })
    .eq("id", examId);

  if (error) {
    return { error: `Lỗi cập nhật trạng thái đề thi: ${error.message}` };
  }

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  return { success: true };
}

/**
 * Xóa một đề thi
 */
export async function deleteExam(examId: string) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("exams").delete().eq("id", examId);

  if (error) {
    return { error: `Lỗi xóa đề thi: ${error.message}` };
  }

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  return { success: true };
}

/**
 * Lấy danh sách đề thi của Học sinh theo các lớp đang tham gia
 */
export async function getStudentExams() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null, exams: [] };

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Lấy các lớp học sinh tham gia
  const { data: memberships } = await adminClient
    .from("class_members")
    .select("class_id")
    .eq("student_id", user.id);

  const classIds = (memberships || []).map((m) => m.class_id);

  if (classIds.length === 0) {
    return { profile, exams: [] };
  }

  // Lấy các đề thi đã xuất bản của các lớp này
  const { data: exams, error } = await adminClient
    .from("exams")
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade
      ),
      questions (
        id,
        points
      ),
      exam_submissions (
        id,
        student_id,
        score,
        submitted_at,
        tab_switch_count
      )
    `)
    .in("class_id", classIds)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy đề thi học sinh:", error);
    return { profile, exams: [] };
  }

  return {
    profile,
    exams: (exams || []).map((ex: any) => {
      const userSubmissions = (ex.exam_submissions || []).filter(
        (sub: any) => sub.student_id === user.id
      );
      const latestSub = userSubmissions[0] || null;

      return {
        ...ex,
        classes: Array.isArray(ex.classes) ? ex.classes[0] : ex.classes,
        questionCount: ex.questions?.length || 0,
        mySubmission: latestSub,
      };
    }),
  };
}

/**
 * Học sinh nộp bài thi + Tự động chấm điểm và ghi log giám sát gian lận (Soft Proctoring)
 */
export async function submitStudentExam(payload: {
  examId: string;
  answers: Record<string, string>;
  tabSwitchCount: number;
  blurEventsLog: Array<{ time: string; event: string }>;
}) {
  const { examId, answers, tabSwitchCount, blurEventsLog } = payload;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn chưa đăng nhập!" };

  const adminClient = createAdminClient();

  // 1. Lấy đề thi và danh sách câu hỏi kèm đáp án đúng
  const { data: exam } = await adminClient
    .from("exams")
    .select("id, title, total_points")
    .eq("id", examId)
    .single();

  if (!exam) return { error: "Không tìm thấy đề thi!" };

  const { data: questions } = await adminClient
    .from("questions")
    .select("id, correct_answer, points")
    .eq("exam_id", examId);

  if (!questions || questions.length === 0) {
    return { error: "Đề thi không có câu hỏi!" };
  }

  // 2. Chấm điểm tự động
  let earnedPoints = 0;
  const totalExamPoints = Number(exam.total_points) || 10;
  const pointsPerQuestion = totalExamPoints / questions.length;

  for (const q of questions) {
    const studentAns = (answers[q.id] || "").trim().toUpperCase();
    const correctAns = (q.correct_answer || "").trim().toUpperCase();
    const qPoints = Number(q.points) || pointsPerQuestion;

    if (studentAns && studentAns === correctAns) {
      earnedPoints += qPoints;
    }
  }

  const finalScore = Math.round(earnedPoints * 100) / 100;
  const safeTabSwitchCount = Number(tabSwitchCount) || 0;
  const safeBlurEventsLog = Array.isArray(blurEventsLog) ? blurEventsLog : [];

  // 3. Ghi nhận kết quả vào bảng exam_submissions (vượt qua RLS bằng adminClient)
  const { data: submission, error: subErr } = await adminClient
    .from("exam_submissions")
    .upsert(
      {
        exam_id: examId,
        student_id: user.id,
        score: finalScore,
        answers_json: answers,
        tab_switch_count: safeTabSwitchCount,
        blur_events_log: safeBlurEventsLog,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "exam_id,student_id" }
    )
    .select()
    .single();

  if (subErr) {
    console.error("Lỗi upsert bài nộp:", subErr);
    return { error: `Lỗi lưu bài thi: ${subErr.message}` };
  }

  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath("/dashboard/submissions");
  return {
    success: true,
    score: finalScore,
    totalPoints: totalExamPoints,
    tabSwitchCount: safeTabSwitchCount,
    blurEventsLog: safeBlurEventsLog,
    answers,
  };
}

/**
 * Xóa kết quả bài thi cũ để học sinh làm lại (Dành cho kiểm thử hoặc cho phép thi lại)
 */
export async function resetStudentSubmission(examId: string) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập!" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("exam_submissions")
    .delete()
    .eq("exam_id", examId)
    .eq("student_id", user.id);

  if (error) {
    return { error: `Lỗi đặt lại bài thi: ${error.message}` };
  }

  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath("/dashboard/submissions");
  return { success: true };
}
