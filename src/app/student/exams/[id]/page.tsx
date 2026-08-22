"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExamWithQuestions, submitStudentExam } from "@/app/actions/exams";
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
} from "lucide-react";

export default function ExamTakingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Exam taking state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Soft Proctoring State (Giám sát rời tab)
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [blurEventsLog, setBlurEventsLog] = useState<Array<{ time: string; event: string }>>([]);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  // Tải thông tin đề thi
  async function loadExam() {
    setLoading(true);
    const data = await getExamWithQuestions(examId);
    setExam(data);

    if (data) {
      // Khôi phục câu trả lời đã lưu từ localStorage (nếu có)
      const savedAnswers = localStorage.getItem(`chemclass_exam_${examId}_answers`);
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch {}
      }

      // Khởi tạo thời gian làm bài
      const durationSec = (data.duration_minutes || 45) * 60;
      setTimeLeft(durationSec);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadExam();
  }, [examId]);

  // Bộ đếm ngược thời gian
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

  // Giám sát chuyển Tab (Soft Proctoring)
  useEffect(() => {
    if (!exam || submissionResult) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          setProctorWarning(`⚠️ Cảnh báo: Bạn vừa rời khỏi màn hình làm bài (Lần ${next})! Hệ thống đã ghi nhận log.`);
          setTimeout(() => setProctorWarning(null), 5000);
          return next;
        });

        setBlurEventsLog((prev) => [
          ...prev,
          { time: new Date().toISOString(), event: "document_hidden" },
        ]);
      }
    }

    function handleWindowBlur() {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setProctorWarning(`⚠️ Cảnh báo: Bạn vừa chuyển cửa sổ khác (Lần ${next})!`);
        setTimeout(() => setProctorWarning(null), 5000);
        return next;
      });

      setBlurEventsLog((prev) => [
        ...prev,
        { time: new Date().toISOString(), event: "window_blur" },
      ]);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [exam, submissionResult]);

  // Chọn đáp án
  function handleSelectOption(questionId: string, optionKey: string) {
    if (submissionResult) return; // Đã nộp bài thì không sửa

    const updated = { ...answers, [questionId]: optionKey };
    setAnswers(updated);
    localStorage.setItem(`chemclass_exam_${examId}_answers`, JSON.stringify(updated));
  }

  // Tự động nộp bài khi hết giờ
  async function handleAutoSubmit() {
    alert("⏰ Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài của bạn.");
    await submitAnswers();
  }

  // Thực hiện nộp bài
  async function submitAnswers() {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    const res = await submitStudentExam({
      examId,
      answers,
      tabSwitchCount,
      blurEventsLog,
    });

    setIsSubmitting(false);

    if (res.error) {
      alert(res.error);
    } else {
      setSubmissionResult(res);
      localStorage.removeItem(`chemclass_exam_${examId}_answers`);
    }
  }

  // Định dạng thời gian MM:SS
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

  const questions = exam.questions || [];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Soft Proctoring Warning Toast */}
        {proctorWarning && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-bounce">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{proctorWarning}</span>
          </div>
        )}

        {/* Top Sticky Header: Timer, Questions Nav, Submit */}
        <div className="sticky top-4 z-40 p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href="/student/exams"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <h1 className="text-sm font-bold text-white truncate max-w-[250px] sm:max-w-md">
                {exam.title}
              </h1>
              <p className="text-[11px] text-slate-400">
                Đã làm: <strong className="text-cyan-300">{answeredCount}/{questions.length}</strong> câu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Điểm: {submissionResult.score}/{submissionResult.totalPoints} đ</span>
              </div>
            )}
          </div>
        </div>

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
                Hệ thống đã tự động chấm điểm. Hãy xem lại đáp án và lời giải chi tiết từng câu ở bên dưới!
              </p>
            </div>

            {submissionResult.tabSwitchCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Hệ thống ghi nhận {submissionResult.tabSwitchCount} lần rời tab thi</span>
              </div>
            )}
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

                  {submissionResult && (
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
                        if (isOptionCorrect) {
                          btnStyle = "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold";
                        } else if (isSelected && !isOptionCorrect) {
                          btnStyle = "bg-rose-500/20 border-rose-500/60 text-rose-300";
                        } else {
                          btnStyle = "bg-slate-950/40 border-white/5 text-slate-500";
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

                {/* Explanation (Render after submission) */}
                {submissionResult && q.explanation && (
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
                Bạn đã hoàn thành <strong>{answeredCount}/{questions.length}</strong> câu hỏi. Sau khi nộp bài, hệ thống sẽ tự động chấm điểm và bạn không thể sửa đổi câu trả lời.
              </p>

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
