"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExamWithQuestions, submitStudentExam, resetStudentSubmission } from "@/app/actions/exams";
import { shuffleArray } from "@/lib/exam-utils";
import { MathText } from "@/components/KatexFormula";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Send,
  HelpCircle,
  Award,
  Eye,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  RotateCcw,
  Volume2,
  Lock,
  EyeOff,
  Shuffle,
} from "lucide-react";

export default function ExamTakingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<any | null>(null);
  const [displayedQuestions, setDisplayedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam taking state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);

  // Soft Proctoring State (Giám sát rời tab)
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [blurEventsLog, setBlurEventsLog] = useState<Array<{ time: string; event: string }>>([]);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  // Refs
  const tabSwitchCountRef = useRef<number>(0);
  const blurEventsLogRef = useRef<Array<{ time: string; event: string }>>([]);
  const lastSwitchTimeRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // Phát âm thanh cảnh báo khi rời tab
  function playWarningTone() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  // Tải thông tin đề thi & xử lý đảo đề nếu có
  async function loadExam() {
    setLoading(true);
    const data = await getExamWithQuestions(examId);
    setExam(data);

    if (data) {
      const rawQuestions = data.questions || [];

      // Nếu học sinh đã nộp bài trước đó
      if (data.mySubmission) {
        setSubmissionResult({
          score: data.mySubmission.score,
          totalPoints: data.total_points || 10,
          tabSwitchCount: data.mySubmission.tab_switch_count || 0,
          blurEventsLog: data.mySubmission.blur_events_log || [],
        });
        setAnswers(data.mySubmission.answers_json || {});
        setTabSwitchCount(data.mySubmission.tab_switch_count || 0);
        tabSwitchCountRef.current = data.mySubmission.tab_switch_count || 0;
        blurEventsLogRef.current = data.mySubmission.blur_events_log || [];
        isFinishedRef.current = true;
        setDisplayedQuestions(rawQuestions);
      } else {
        isFinishedRef.current = false;

        // Xử lý đảo đề: Nếu bật shuffle_questions -> đảo ngẫu nhiên thứ tự câu hỏi
        let qList = [...rawQuestions];
        if (data.shuffle_questions) {
          // Khôi phục thứ tự đã đảo nếu có trong localStorage, hoặc tạo thứ tự đảo mới
          const savedOrder = localStorage.getItem(`chemclass_exam_${examId}_order`);
          if (savedOrder) {
            try {
              const orderIds: string[] = JSON.parse(savedOrder);
              qList.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
            } catch {
              qList = shuffleArray(rawQuestions);
              localStorage.setItem(`chemclass_exam_${examId}_order`, JSON.stringify(qList.map((q) => q.id)));
            }
          } else {
            qList = shuffleArray(rawQuestions);
            localStorage.setItem(`chemclass_exam_${examId}_order`, JSON.stringify(qList.map((q) => q.id)));
          }
        }
        setDisplayedQuestions(qList);

        // Khôi phục câu trả lời đã lưu
        const savedAnswers = localStorage.getItem(`chemclass_exam_${examId}_answers`);
        if (savedAnswers) {
          try {
            setAnswers(JSON.parse(savedAnswers));
          } catch {}
        }

        // Khôi phục số lần rời tab
        const savedProctor = localStorage.getItem(`chemclass_exam_${examId}_proctor`);
        if (savedProctor) {
          try {
            const parsed = JSON.parse(savedProctor);
            tabSwitchCountRef.current = parsed.count || 0;
            blurEventsLogRef.current = parsed.log || [];
            setTabSwitchCount(parsed.count || 0);
            setBlurEventsLog(parsed.log || []);
          } catch {}
        }

        const durationSec = (data.duration_minutes || 45) * 60;
        setTimeLeft(durationSec);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadExam();
  }, [examId]);

  // Ghi nhận sự kiện rời khỏi màn hình thi
  const recordTabSwitch = useCallback((eventType: string) => {
    if (isFinishedRef.current) return;

    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 600) {
      return;
    }
    lastSwitchTimeRef.current = now;

    tabSwitchCountRef.current += 1;
    const newCount = tabSwitchCountRef.current;
    setTabSwitchCount(newCount);

    const eventDesc =
      eventType === "hidden"
        ? "Chuyển sang tab khác / Thu nhỏ trình duyệt (Document Hidden)"
        : eventType === "test"
        ? "Thử nghiệm giả lập rời tab"
        : "Chuyển sang ứng dụng khác (Window Blur)";

    const newLogItem = {
      time: new Date().toISOString(),
      event: eventDesc,
    };

    blurEventsLogRef.current = [...blurEventsLogRef.current, newLogItem];
    setBlurEventsLog(blurEventsLogRef.current);

    localStorage.setItem(
      `chemclass_exam_${examId}_proctor`,
      JSON.stringify({
        count: newCount,
        log: blurEventsLogRef.current,
      })
    );

    playWarningTone();
    setProctorWarning(
      `⚠️ CẢNH BÁO GIAN LẬN: Bạn vừa rời khỏi màn hình làm bài (Lần thứ ${newCount})! Sự việc đã được ghi nhận vào hệ thống.`
    );
  }, [examId]);

  // Lắng nghe sự kiện chuyển Tab / Rời cửa sổ
  useEffect(() => {
    if (!exam || submissionResult) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        recordTabSwitch("hidden");
      }
    }

    function handleWindowBlur() {
      recordTabSwitch("blur");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [exam, submissionResult, recordTabSwitch]);

  // Đếm ngược thời gian
  useEffect(() => {
    if (!exam || submissionResult || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, submissionResult, timeLeft]);

  function handleSelectOption(questionId: string, optionKey: string) {
    if (submissionResult) return;

    const updated = { ...answers, [questionId]: optionKey };
    setAnswers(updated);
    localStorage.setItem(`chemclass_exam_${examId}_answers`, JSON.stringify(updated));
  }

  async function handleAutoSubmit() {
    alert("⏰ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài của bạn.");
    await submitAnswers();
  }

  async function submitAnswers() {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    isFinishedRef.current = true;

    const res = await submitStudentExam({
      examId,
      answers,
      tabSwitchCount: tabSwitchCountRef.current,
      blurEventsLog: blurEventsLogRef.current,
    });

    setIsSubmitting(false);

    if (res.error) {
      alert(res.error);
    } else {
      setSubmissionResult(res);
      localStorage.removeItem(`chemclass_exam_${examId}_answers`);
      localStorage.removeItem(`chemclass_exam_${examId}_proctor`);
      localStorage.removeItem(`chemclass_exam_${examId}_order`);
    }
  }

  async function handleRetakeExam() {
    if (!exam?.allow_retake) {
      alert("Giáo viên không cho phép làm lại đề thi này!");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa kết quả cũ và làm lại bài kiểm tra này không?")) return;

    setIsRetaking(true);
    const res = await resetStudentSubmission(examId);

    if (res.error) {
      alert(res.error);
      setIsRetaking(false);
      return;
    }

    localStorage.removeItem(`chemclass_exam_${examId}_answers`);
    localStorage.removeItem(`chemclass_exam_${examId}_proctor`);
    localStorage.removeItem(`chemclass_exam_${examId}_order`);

    setSubmissionResult(null);
    setAnswers({});
    setTabSwitchCount(0);
    setBlurEventsLog([]);
    setProctorWarning(null);
    tabSwitchCountRef.current = 0;
    blurEventsLogRef.current = [];
    isFinishedRef.current = false;

    // Tải lại đề thi và đảo lại thứ tự mới
    await loadExam();
    setIsRetaking(false);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">Đang tải đề thi...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Không tìm thấy đề thi</h2>
        <Link href="/student/exams" className="text-xs text-cyan-400 hover:underline">
          ← Quay lại danh sách bài kiểm tra
        </Link>
      </div>
    );
  }

  const questions = displayedQuestions;
  const answeredCount = Object.keys(answers).length;
  const allowViewAnswers = exam.allow_view_answers !== false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* MODAL / BANNER CẢNH BÁO RỜI TAB NỔI BẬT */}
        {proctorWarning && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl p-4 rounded-2xl bg-rose-600 border-2 border-white/20 text-white font-bold text-xs shadow-2xl flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-6 h-6 flex-shrink-0 animate-spin text-amber-300" />
              <span>{proctorWarning}</span>
            </div>
            <button
              onClick={() => setProctorWarning(null)}
              className="px-3 py-1 rounded-xl bg-black/30 hover:bg-black/50 text-white text-[11px] font-bold uppercase transition-all flex-shrink-0"
            >
              Tôi Đã Hiểu
            </button>
          </div>
        )}

        {/* Top Sticky Header: Timer, Questions Nav, Proctoring Badge, Submit */}
        <div className="sticky top-4 z-40 p-4 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/student/exams"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-sm">
                  {exam.title}
                </h1>
                {exam.shuffle_questions && !submissionResult && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5" title="Đề thi đã được tự động đảo thứ tự câu hỏi">
                    <Shuffle className="w-3 h-3" /> Đảo đề
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Đã làm: <strong className="text-cyan-300">{answeredCount}/{questions.length}</strong> câu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* HUY HIỆU GIÁM SÁT RỜI TAB THỜI GIAN THỰC */}
            {tabSwitchCount === 0 ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Giám sát: 0 lần rời tab</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/30 text-rose-300 border border-rose-500/60 text-xs font-black flex items-center gap-1.5 animate-pulse shadow-lg shadow-rose-500/30">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>ĐÃ RỜI TAB: {tabSwitchCount} LẦN!</span>
              </span>
            )}

            {/* Live Countdown Timer */}
            {!submissionResult && (
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono font-black text-sm shadow-inner ${
                  timeLeft < 300
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                    : "bg-slate-950/80 text-cyan-300 border-white/10"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            {/* Submit Button */}
            {!submissionResult ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-400/25 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Nộp Bài</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>{submissionResult.score}/{submissionResult.totalPoints} đ</span>
                </div>

                {exam.allow_retake && (
                  <button
                    onClick={handleRetakeExam}
                    disabled={isRetaking}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all border border-white/10"
                    title="Xóa bài nộp cũ và làm lại bài thi"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Làm lại</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KHUNG GIÁM SÁT GIAN LẬN TRỰC TIẾP */}
        {!submissionResult && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className={`w-5 h-5 ${tabSwitchCount > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`} />
              <div>
                <span className="font-bold text-white block">
                  Hệ thống giám sát chống gian lận (Soft Proctoring)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Số lần phát hiện rời khỏi tab thi:{" "}
                  <strong className={tabSwitchCount > 0 ? "text-rose-400 font-black text-xs" : "text-emerald-400 font-bold"}>
                    {tabSwitchCount} lần
                  </strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => recordTabSwitch("test")}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>🧪 Test Giả Lập Rời Tab</span>
            </button>
          </div>
        )}

        {/* SUBMISSION RESULT BANNER (If submitted) */}
        {submissionResult && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 backdrop-blur-xl shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Chúc Mừng Bạn Đã Hoàn Thành Bài Kiểm Tra!
              </span>
              <h2 className="text-3xl font-black text-white mt-1">
                {submissionResult.score} / {submissionResult.totalPoints} Điểm
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {allowViewAnswers
                  ? "Hệ thống đã tự động chấm điểm. Hãy xem lại đáp án và lời giải chi tiết từng câu ở bên dưới!"
                  : "Hệ thống đã ghi nhận kết quả bài làm của bạn."}
              </p>
            </div>

            {/* Thống kê giám sát rời tab */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Kết quả giám sát:</span>
              </div>
              {submissionResult.tabSwitchCount > 0 ? (
                <span className="font-bold text-rose-400">
                  Hệ thống phát hiện {submissionResult.tabSwitchCount} lần rời khỏi màn hình làm bài
                </span>
              ) : (
                <span className="font-bold text-emerald-400">
                  0 lần rời tab (Làm bài nghiêm túc 100%)
                </span>
              )}
            </div>

            {/* Thông báo quyền xem đáp án nếu bị khóa */}
            {!allowViewAnswers && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2">
                <EyeOff className="w-4 h-4" />
                <span>Giáo viên đã khóa hiển thị đáp án và lời giải chi tiết cho đề thi này (Chống lộ đề).</span>
              </div>
            )}

            {/* Quyền làm lại bài thi */}
            <div className="pt-2">
              {exam.allow_retake ? (
                <button
                  onClick={handleRetakeExam}
                  disabled={isRetaking}
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-400/20 inline-flex items-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Làm Lại Bài Thi Này</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Đề thi này chỉ được làm 1 lần duy nhất theo cấu hình của giáo viên.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTIONS LIST */}
        <div className="space-y-6">
          {questions.map((q: any, idx: number) => {
            const studentChoice = answers[q.id];
            const isCorrect = studentChoice && studentChoice === q.correct_answer;

            return (
              <div
                key={q.id}
                id={`q-${idx + 1}`}
                className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-4 shadow-xl"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                    Câu {idx + 1} ({q.points || 1} điểm)
                  </span>

                  {/* Chỉ hiển thị đúng/sai nếu được phép xem đáp án */}
                  {submissionResult && allowViewAnswers && (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {isCorrect ? "Chính xác (+đầy đủ điểm)" : `Sai (Đáp án: ${q.correct_answer})`}
                    </span>
                  )}
                </div>

                {/* Question Content (Render KaTeX) */}
                <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                  <MathText text={q.content_latex} />
                </div>

                {/* Options List */}
                {q.options_json && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {q.options_json.map((opt: any) => {
                      const isSelected = studentChoice === opt.key;
                      const isOptionCorrect = q.correct_answer === opt.key;

                      let btnStyle = "bg-slate-950/60 border-white/10 text-slate-300 hover:border-cyan-500/40";

                      if (submissionResult) {
                        if (allowViewAnswers) {
                          if (isOptionCorrect) {
                            btnStyle = "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold";
                          } else if (isSelected && !isOptionCorrect) {
                            btnStyle = "bg-rose-500/20 border-rose-500/60 text-rose-300";
                          } else {
                            btnStyle = "bg-slate-950/40 border-white/5 text-slate-500";
                          }
                        } else {
                          // Nếu khóa xem đáp án, chỉ highlight phương án học sinh đã chọn
                          btnStyle = isSelected
                            ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-semibold"
                            : "bg-slate-950/40 border-white/5 text-slate-500";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-lg shadow-cyan-500/10";
                      }

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.key)}
                          disabled={!!submissionResult}
                          className={`p-3.5 rounded-2xl border text-left text-xs transition-all flex items-start gap-3 ${btnStyle}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isSelected
                                ? "bg-cyan-400 text-slate-950"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <div className="pt-0.5 flex-1">
                            <MathText text={opt.text} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Explanation (Chỉ hiển thị nếu được giáo viên cho phép) */}
                {submissionResult && allowViewAnswers && q.explanation && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-300 space-y-1.5 mt-3">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Lời giải chi tiết:
                    </span>
                    <div className="leading-relaxed text-slate-300">
                      <MathText text={q.explanation} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* BOTTOM SUBMIT BUTTON */}
        {!submissionResult && (
          <div className="text-center pt-4 pb-12">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-8 py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm shadow-xl shadow-cyan-400/25 inline-flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Nộp Bài Kiểm Tra Ngay ({answeredCount}/{questions.length} câu)</span>
            </button>
          </div>
        )}

        {/* CONFIRM SUBMISSION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white">Xác nhận nộp bài thi?</h3>
              <p className="text-xs text-slate-400">
                Bạn đã hoàn thành <strong>{answeredCount}/{questions.length}</strong> câu hỏi.
              </p>

              {tabSwitchCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Hệ thống ghi nhận bạn đã rời tab {tabSwitchCount} lần!</span>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  type="button"
                  onClick={submitAnswers}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-400/25"
                >
                  Xác Nhận Nộp Bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
