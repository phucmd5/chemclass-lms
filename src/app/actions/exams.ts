"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateChemistryExamQuestions, gradeEssayQuestionWithAI } from "@/lib/gemini";
import { encodeExamTitle, parseExamTitle, ExamConfig } from "@/lib/exam-utils";
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
 * Lưu đề thi kèm danh sách câu hỏi vào cơ sở dữ liệu (hỗ trợ allowRetake, shuffleQuestions, allowViewAnswers)
 */
export async function saveExamWithQuestions(payload: {
  examId?: string;
  classId: string;
  title: string;
  durationMinutes: number;
  totalPoints?: number;
  isPublished?: boolean;
  allowRetake?: boolean;
  shuffleQuestions?: boolean;
  allowViewAnswers?: boolean;
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
    allowRetake = false,
    shuffleQuestions = true,
    allowViewAnswers = true,
    questions,
  } = payload;

  if (!classId || !title || !questions || questions.length === 0) {
    return { error: "Vui lòng nhập đầy đủ tên đề thi, lớp học và ít nhất 1 câu hỏi!" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Bạn chưa đăng nhập!" };

  const adminClient = createAdminClient();
  const encodedTitle = encodeExamTitle(title, {
    allowRetake,
    shuffleQuestions,
    allowViewAnswers,
  });

  let targetExamId = examId;

  // 1. Tạo hoặc cập nhật đề thi trong bảng exams
  if (targetExamId) {
    const updateData: any = {
      class_id: classId,
      title: encodedTitle,
      duration_minutes: durationMinutes,
      total_points: totalPoints,
      is_published: isPublished,
    };

    const { error: updateErr } = await adminClient
      .from("exams")
      .update(updateData)
      .eq("id", targetExamId)
      .eq("teacher_id", user.id);

    if (updateErr) {
      return { error: `Lỗi cập nhật đề thi: ${updateErr.message}` };
    }

    // Xóa câu hỏi cũ để nạp câu hỏi mới
    await adminClient.from("questions").delete().eq("exam_id", targetExamId);
  } else {
    const insertData: any = {
      class_id: classId,
      teacher_id: user.id,
      title: encodedTitle,
      duration_minutes: durationMinutes,
      total_points: totalPoints,
      is_published: isPublished,
    };

    const { data: newExam, error: insExamErr } = await adminClient
      .from("exams")
      .insert(insertData)
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
    type: q.type || (q.options_json && q.options_json.length > 0 ? "multiple_choice" : "short_answer"),
    content_latex: q.content_latex,
    options_json: q.options_json || null,
    correct_answer: (q.correct_answer || "A").trim(),
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
 * Lấy danh sách toàn bộ đề thi của Giáo viên kèm cấu hình
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

  return (exams || []).map((ex: any) => {
    const config = parseExamTitle(ex.title, ex.allow_retake);
    return {
      ...ex,
      title: config.title,
      allow_retake: config.allowRetake,
      shuffle_questions: config.shuffleQuestions,
      allow_view_answers: config.allowViewAnswers,
      classes: Array.isArray(ex.classes) ? ex.classes[0] : ex.classes,
      questionCount: ex.questions?.length || 0,
      submissionCount: ex.exam_submissions?.length || 0,
    };
  });
}

/**
 * Lấy chi tiết đề thi kèm danh sách câu hỏi & kết quả bài làm của học sinh
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

  const config = parseExamTitle(exam.title, exam.allow_retake);

  return {
    ...exam,
    title: config.title,
    allow_retake: config.allowRetake,
    shuffle_questions: config.shuffleQuestions,
    allow_view_answers: config.allowViewAnswers,
    classes: Array.isArray(exam.classes) ? exam.classes[0] : exam.classes,
    questions: questions || [],
    mySubmission,
  };
}

/**
 * Bật / Tắt cho phép học sinh làm lại đề thi (1 Chạm)
 */
export async function toggleExamAllowRetake(examId: string, currentAllowRetake: boolean) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const adminClient = createAdminClient();
  const { data: exam } = await adminClient.from("exams").select("title").eq("id", examId).single();
  if (!exam) return { error: "Không tìm thấy đề thi!" };

  const config = parseExamTitle(exam.title);
  config.allowRetake = !currentAllowRetake;
  const newTitle = encodeExamTitle(config.title, config);

  const { error } = await adminClient.from("exams").update({ title: newTitle }).eq("id", examId);
  if (error) return { error: `Lỗi cập nhật quyền làm lại: ${error.message}` };

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  return { success: true, allowRetake: config.allowRetake };
}

/**
 * Bật / Tắt chức năng đảo đề thi (1 Chạm)
 */
export async function toggleExamShuffle(examId: string, currentShuffle: boolean) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const adminClient = createAdminClient();
  const { data: exam } = await adminClient.from("exams").select("title").eq("id", examId).single();
  if (!exam) return { error: "Không tìm thấy đề thi!" };

  const config = parseExamTitle(exam.title);
  config.shuffleQuestions = !currentShuffle;
  const newTitle = encodeExamTitle(config.title, config);

  const { error } = await adminClient.from("exams").update({ title: newTitle }).eq("id", examId);
  if (error) return { error: `Lỗi cập nhật đảo đề: ${error.message}` };

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  return { success: true, shuffleQuestions: config.shuffleQuestions };
}

/**
 * Bật / Tắt quyền cho phép học sinh xem đáp án & lời giải sau khi nộp bài (1 Chạm)
 */
export async function toggleExamViewAnswers(examId: string, currentViewAnswers: boolean) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const adminClient = createAdminClient();
  const { data: exam } = await adminClient.from("exams").select("title").eq("id", examId).single();
  if (!exam) return { error: "Không tìm thấy đề thi!" };

  const config = parseExamTitle(exam.title);
  config.allowViewAnswers = !currentViewAnswers;
  const newTitle = encodeExamTitle(config.title, config);

  const { error } = await adminClient.from("exams").update({ title: newTitle }).eq("id", examId);
  if (error) return { error: `Lỗi cập nhật hiển thị đáp án: ${error.message}` };

  revalidatePath("/dashboard/exams");
  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  return { success: true, allowViewAnswers: config.allowViewAnswers };
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
      const config = parseExamTitle(ex.title, ex.allow_retake);

      return {
        ...ex,
        title: config.title,
        allow_retake: config.allowRetake,
        shuffle_questions: config.shuffleQuestions,
        allow_view_answers: config.allowViewAnswers,
        classes: Array.isArray(ex.classes) ? ex.classes[0] : ex.classes,
        questionCount: ex.questions?.length || 0,
        mySubmission: latestSub,
      };
    }),
  };
}

/**
 * Học sinh nộp bài thi + Tự động chấm điểm (Trắc nghiệm + AI Chấm Tự Luận Multimodal) và ghi log giám sát
 */
export async function submitStudentExam(payload: {
  examId: string;
  answers: Record<string, any>;
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
    .select("id, type, content_latex, options_json, correct_answer, explanation, points")
    .eq("exam_id", examId);

  if (!questions || questions.length === 0) {
    return { error: "Đề thi không có câu hỏi!" };
  }

  // 2. Chấm điểm tự động: Trắc nghiệm theo Key, Tự luận bằng Gemini AI
  let earnedPoints = 0;
  const totalExamPoints = Number(exam.total_points) || 10;
  const pointsPerQuestion = totalExamPoints / questions.length;
  const detailedAnswers: Record<string, any> = {};

  for (const q of questions) {
    const rawAnswer = answers[q.id];
    const qPoints = Number(q.points) || pointsPerQuestion;
    const isEssay = q.type === "short_answer" || !q.options_json || q.options_json.length === 0;

    if (isEssay) {
      // Câu hỏi tự luận: Lấy text và image (nếu có)
      let studentText = "";
      let studentImage = "";

      if (typeof rawAnswer === "string") {
        studentText = rawAnswer;
      } else if (rawAnswer && typeof rawAnswer === "object") {
        studentText = rawAnswer.text || "";
        studentImage = rawAnswer.imageUrl || rawAnswer.image || "";
      }

      if (studentText.trim() || studentImage) {
        try {
          const aiGrade = await gradeEssayQuestionWithAI({
            questionContent: q.content_latex,
            standardAnswer: q.explanation || q.correct_answer || "Lời giải chuẩn",
            maxPoints: qPoints,
            studentTextAnswer: studentText,
            studentImageBase64: studentImage,
          });

          earnedPoints += aiGrade.score;
          detailedAnswers[q.id] = {
            text: studentText,
            imageUrl: studentImage,
            earnedPoints: aiGrade.score,
            maxPoints: qPoints,
            aiFeedback: aiGrade.feedback,
            criteria: aiGrade.criteria || [],
          };
        } catch (err: any) {
          console.error(`Lỗi chấm AI câu tự luận ${q.id}:`, err);
          detailedAnswers[q.id] = {
            text: studentText,
            imageUrl: studentImage,
            earnedPoints: 0,
            maxPoints: qPoints,
            aiFeedback: "Đã ghi nhận câu trả lời. Giáo viên sẽ xem lại.",
          };
        }
      } else {
        // Chưa trả lời
        detailedAnswers[q.id] = {
          text: "",
          earnedPoints: 0,
          maxPoints: qPoints,
          aiFeedback: "Học sinh bỏ trống câu này.",
        };
      }
    } else {
      // Câu trắc nghiệm
      const studentChoice = (typeof rawAnswer === "string" ? rawAnswer : rawAnswer?.key || rawAnswer?.text || "").trim().toUpperCase();
      const correctChoice = (q.correct_answer || "A").trim().toUpperCase();
      const isCorrect = studentChoice && studentChoice === correctChoice;

      if (isCorrect) {
        earnedPoints += qPoints;
      }

      detailedAnswers[q.id] = studentChoice;
    }
  }

  const finalScore = Math.round(earnedPoints * 100) / 100;
  const safeTabSwitchCount = Number(tabSwitchCount) || 0;
  const safeBlurEventsLog = Array.isArray(blurEventsLog) ? blurEventsLog : [];

  // 3. Ghi nhận kết quả vào bảng exam_submissions
  const { data: submission, error: subErr } = await adminClient
    .from("exam_submissions")
    .upsert(
      {
        exam_id: examId,
        student_id: user.id,
        score: finalScore,
        answers_json: detailedAnswers,
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
    answers: detailedAnswers,
  };
}

/**
 * Đặt lại bài thi cho học sinh (kiểm tra quyền allow_retake của giáo viên)
 */
export async function resetStudentSubmission(examId: string, studentIdOverride?: string) {
  if (!examId) return { error: "Thiếu ID đề thi!" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập!" };

  const adminClient = createAdminClient();

  const { data: exam } = await adminClient
    .from("exams")
    .select("title, teacher_id")
    .eq("id", examId)
    .single();

  if (!exam) return { error: "Không tìm thấy đề thi!" };

  const isTeacher = exam.teacher_id === user.id;
  const config = parseExamTitle(exam.title);

  // Nếu là học sinh và giáo viên không cho phép làm lại -> chặn
  if (!isTeacher && !config.allowRetake) {
    return { error: "Giáo viên không cho phép làm lại đề thi này!" };
  }

  const targetStudentId = (isTeacher && studentIdOverride) ? studentIdOverride : user.id;

  const { error } = await adminClient
    .from("exam_submissions")
    .delete()
    .eq("exam_id", examId)
    .eq("student_id", targetStudentId);

  if (error) {
    return { error: `Lỗi đặt lại bài thi: ${error.message}` };
  }

  revalidatePath("/student/exams");
  revalidatePath(`/student/exams/${examId}`);
  revalidatePath("/dashboard/submissions");
  return { success: true };
}
