"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  generateAIExamQuestionsAction,
  saveExamWithQuestions,
  getTeacherExams,
  getExamWithQuestions,
  toggleExamPublish,
  toggleExamAllowRetake,
  deleteExam,
} from "@/app/actions/exams";
import { getTeacherClasses } from "@/app/actions/classes";
import { GRADE_OPTIONS } from "@/lib/constants";
import { MathText } from "@/components/KatexFormula";
import { generateExamDocx } from "@/lib/word-export";
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Loader2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Layers,
  HelpCircle,
  Save,
  Check,
  Send,
  RefreshCw,
  Copy,
  FileText,
  Download,
  Table as TableIcon,
  PlusCircle,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";

// Gợi ý chuyên đề Hóa học & KHTN THCS theo từng khối lớp
const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  "6": [
    "Các thể của chất và sự chuyển thể",
    "Tách chất ra khỏi hỗn hợp (Lọc, cô cạn, chiết)",
    "Oxygen và Không khí - Bảo vệ môi trường",
    "Năng lượng và sự truyền nhiệt",
  ],
  "7": [
    "Nguyên tử và Cấu tạo nguyên tử",
    "Bảng tuần hoàn các nguyên tố hóa học",
    "Phân tử, Đơn chất và Hợp chất",
    "Liên kết hóa học (Liên kết ion, cộng hóa trị)",
    "Tốc độ phản ứng và các yếu tố ảnh hưởng",
  ],
  "8": [
    "Phản ứng hóa học và Định luật bảo toàn khối lượng",
    "Mol, Khối lượng mol và Thể tích mol chất khí",
    "Tính theo phương trình hóa học",
    "Dung dịch, Độ tan và Nồng độ phần trăm, Nồng độ mol",
    "Axit, Bazơ, Muối và Thang pH",
    "Oxit và Phản ứng oxi hóa - khử",
  ],
  "9": [
    "Tính chất hóa học của Axit, Bazơ và Muối",
    "Kim loại và Dãy hoạt động hóa học của kim loại",
    "Nhôm, Sắt và Hợp kim gang thép",
    "Phi kim, Cacbon và Oxit của cacbon",
    "Hiđrocacbon: Metan, Etilen, Axetilen và Dầu mỏ",
    "Rượu etylic và Axit axetic",
  ],
  "Khác": [
    "Bồi dưỡng học sinh giỏi Hóa học THCS",
    "Phương pháp giải toán hóa học vô cơ nâng cao",
  ],
};

export default function AIExamStudioPage() {
  const [activeTab, setActiveTab] = useState<"list" | "create_ai">("list");
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Chế độ chỉnh sửa đề thi đang có
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form Generator AI
  const [selectedGrade, setSelectedGrade] = useState<string>("8");
  const [topic, setTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("Tổng hợp (Ma trận chuẩn)");
  const [questionType, setQuestionType] = useState<"multiple_choice" | "short_answer" | "mixed">("multiple_choice");
  const [isFinalExam, setIsFinalExam] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Generated Questions in Workspace
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  // Save Exam Form
  const [examTitle, setExamTitle] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [allowRetake, setAllowRetake] = useState<boolean>(false); // Quyền làm lại bài thi
  const [savingExam, setSavingExam] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState(false);

  // Modal Sửa / Thêm câu hỏi thủ công
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<any | null>(null);
  const [showAddManualModal, setShowAddManualModal] = useState(false);

  // Modal Preview / Print
  const [previewExam, setPreviewExam] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  async function loadData() {
    setLoading(true);
    const [examsList, clsList] = await Promise.all([getTeacherExams(), getTeacherClasses()]);
    setExams(examsList);
    setClasses(clsList);
    if (clsList.length > 0 && !targetClassId) {
      setTargetClassId(clsList[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Gọi AI sinh đề
  async function handleGenerateAI(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setAiError("Vui lòng nhập hoặc chọn chủ đề kiến thức!");
      return;
    }

    setGenerating(true);
    setAiError(null);

    const res = await generateAIExamQuestionsAction({
      grade: selectedGrade,
      topic: topic.trim(),
      questionCount,
      difficulty,
      questionType,
      customInstructions: customInstructions.trim(),
    });

    setGenerating(false);

    if (res.error) {
      setAiError(res.error);
    } else if (res.questions) {
      setGeneratedQuestions(res.questions);
      if (!examTitle) {
        const examPrefix = isFinalExam ? "ĐỀ KIỂM TRA CUỐI HỌC KỲ" : `Kiểm tra ${durationMinutes} phút`;
        setExamTitle(`${examPrefix} - ${topic.trim()} (Khối ${selectedGrade})`);
      }
      showToast(`AI đã biên soạn thành công ${res.questions.length} câu hỏi chuẩn KaTeX!`);
    }
  }

  // Bắt đầu chỉnh sửa một đề thi đã tạo
  async function handleStartEditExam(examId: string) {
    setLoadingPreview(true);
    const detail = await getExamWithQuestions(examId);
    setLoadingPreview(false);

    if (!detail) {
      alert("Không tìm thấy thông tin đề thi!");
      return;
    }

    setEditingExamId(detail.id);
    setExamTitle(detail.title);
    setTargetClassId(detail.class_id);
    setDurationMinutes(detail.duration_minutes || 45);
    setIsPublished(detail.is_published ?? true);
    setAllowRetake(detail.allow_retake ?? false);
    setSelectedGrade(detail.classes?.grade || "8");

    const mappedQuestions = (detail.questions || []).map((q: any) => ({
      type: q.type || "multiple_choice",
      content_latex: q.content_latex,
      options: q.options_json || [],
      correct_answer: q.correct_answer || "A",
      explanation: q.explanation || "",
      points: q.points || 1,
    }));

    setGeneratedQuestions(mappedQuestions);
    setActiveTab("create_ai");
    showToast(`Đang mở chế độ chỉnh sửa: "${detail.title}"`);
  }

  // Hủy chế độ chỉnh sửa để tạo đề mới
  function handleCancelEdit() {
    setEditingExamId(null);
    setExamTitle("");
    setAllowRetake(false);
    setGeneratedQuestions([]);
    showToast("Đã chuyển về chế độ tạo đề thi mới.");
  }

  // Bật / Tắt quyền làm lại bài thi 1 Chạm
  async function handleToggleAllowRetake(examId: string, currentStatus: boolean) {
    const res = await toggleExamAllowRetake(examId, currentStatus);
    if (res.error) {
      alert(res.error);
    } else {
      showToast(
        !currentStatus
          ? "🟢 Đã CHO PHÉP học sinh làm lại đề thi này!"
          : "🔒 Đã KHÓA, học sinh chỉ được làm 1 lần duy nhất!"
      );
      loadData();
    }
  }

  // Xuất file Word (.docx)
  async function handleExportDocx(examData?: any) {
    try {
      setIsExportingWord(true);

      const targetTitle = examData ? examData.title : examTitle || "De_Kiem_Tra_Hoa_Hoc";
      const targetGrade = examData ? examData.classes?.grade || "8" : selectedGrade;
      const targetDuration = examData ? examData.duration_minutes || 45 : durationMinutes;
      const targetTotalPoints = examData ? examData.total_points || 10 : 10;
      const targetQuestions = examData ? examData.questions : generatedQuestions;
      const targetIsFinal = examData ? examData.title.toLowerCase().includes("cuối") : isFinalExam;
      const targetTopic = examData ? examData.title : topic || "Hóa học THCS";

      if (!targetQuestions || targetQuestions.length === 0) {
        alert("Chưa có câu hỏi nào để xuất file Word!");
        setIsExportingWord(false);
        return;
      }

      const blob = await generateExamDocx({
        title: targetTitle,
        grade: targetGrade,
        durationMinutes: targetDuration,
        totalPoints: targetTotalPoints,
        isFinalExam: targetIsFinal,
        topic: targetTopic,
        questions: targetQuestions,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeFileName = targetTitle.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_");
      a.download = `${safeFileName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("Đã xuất file Word (.docx) chuẩn Bộ Giáo Dục thành công!");
    } catch (err: any) {
      console.error("Lỗi xuất Word:", err);
      alert("Lỗi xuất file Word: " + err.message);
    } finally {
      setIsExportingWord(false);
    }
  }

  // Lưu đề thi vào database (Cập nhật hoặc Tạo mới)
  async function handleSaveExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examTitle.trim() || !targetClassId || generatedQuestions.length === 0) {
      setSaveError("Vui lòng nhập tên đề, chọn lớp và có ít nhất 1 câu hỏi!");
      return;
    }

    setSavingExam(true);
    setSaveError(null);

    const res = await saveExamWithQuestions({
      examId: editingExamId || undefined,
      classId: targetClassId,
      title: examTitle.trim(),
      durationMinutes,
      totalPoints: 10.0,
      isPublished,
      allowRetake,
      questions: generatedQuestions.map((q) => ({
        type: q.type || "multiple_choice",
        content_latex: q.content_latex,
        options_json: q.options || [],
        correct_answer: (q.correct_answer || "A").trim().toUpperCase(),
        explanation: q.explanation || "",
        points: Math.round((10 / generatedQuestions.length) * 100) / 100,
      })),
    });

    setSavingExam(false);

    if (res.error) {
      setSaveError(res.error);
    } else {
      showToast(editingExamId ? "Đã cập nhật đề thi thành công!" : "Đã lưu và xuất bản đề thi thành công!");
      setEditingExamId(null);
      setGeneratedQuestions([]);
      setExamTitle("");
      setAllowRetake(false);
      setActiveTab("list");
      loadData();
    }
  }

  // Bật/Tắt xuất bản
  async function handleTogglePublish(examId: string, currentStatus: boolean) {
    const res = await toggleExamPublish(examId, !currentStatus);
    if (res.error) {
      alert(res.error);
    } else {
      showToast(!currentStatus ? "Đã xuất bản đề thi cho học sinh!" : "Đã chuyển đề thi về bản nháp.");
      loadData();
    }
  }

  // Xóa đề thi
  async function handleDeleteExam(examId: string, title: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa đề thi "${title}"?\nToàn bộ kết quả bài làm của học sinh cho đề này cũng sẽ bị xóa.`)) {
      return;
    }
    const res = await deleteExam(examId);
    if (res.error) {
      alert(res.error);
    } else {
      showToast("Đã xóa đề thi.");
      loadData();
    }
  }

  // Xem trước đề để in
  async function handleOpenPreview(examId: string) {
    setLoadingPreview(true);
    const detail = await getExamWithQuestions(examId);
    setPreviewExam(detail);
    setLoadingPreview(false);
  }

  // Xóa câu hỏi khỏi bộ đề
  function handleRemoveQuestion(index: number) {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  // Mở modal sửa câu hỏi
  function handleOpenEditQuestion(index: number) {
    const q = generatedQuestions[index];
    setEditingQuestionIdx(index);
    setEditQuestionForm({
      content_latex: q.content_latex,
      options: q.options && q.options.length > 0 ? q.options : [
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" },
      ],
      correct_answer: q.correct_answer || "A",
      explanation: q.explanation || "",
    });
  }

  // Lưu câu hỏi sau khi sửa
  function handleSaveEditedQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (editingQuestionIdx === null || !editQuestionForm) return;

    const updated = [...generatedQuestions];
    updated[editingQuestionIdx] = {
      ...updated[editingQuestionIdx],
      content_latex: editQuestionForm.content_latex,
      options: editQuestionForm.options,
      correct_answer: editQuestionForm.correct_answer,
      explanation: editQuestionForm.explanation,
    };

    setGeneratedQuestions(updated);
    setEditingQuestionIdx(null);
    setEditQuestionForm(null);
    showToast("Đã cập nhật nội dung câu hỏi!");
  }

  // Thêm câu hỏi thủ công
  function handleAddManualQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!editQuestionForm) return;

    setGeneratedQuestions((prev) => [
      ...prev,
      {
        type: "multiple_choice",
        content_latex: editQuestionForm.content_latex,
        options: editQuestionForm.options,
        correct_answer: editQuestionForm.correct_answer,
        explanation: editQuestionForm.explanation,
        difficulty: "Thông hiểu",
      },
    ]);

    setShowAddManualModal(false);
    setEditQuestionForm(null);
    showToast("Đã thêm 1 câu hỏi mới vào bộ đề!");
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-indigo-600 text-white font-medium text-sm shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            Quản Lý & Chỉnh Sửa Đề Thi AI (THCS)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Biên soạn đề thi, tùy chọn cho phép học sinh làm lại, xuất file Word (.docx) chuẩn Bộ GD&ĐT
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-900 border border-white/10 p-1.5 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "list"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Danh Sách Đề Thi ({exams.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("create_ai");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "create_ai"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{editingExamId ? "✏️ Đang Sửa Đề Thi" : "✨ Soạn Đề Mới"}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH ĐỀ THI ĐÃ TẠO */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm">Đang tải danh sách đề thi...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa có đề thi nào</h3>
              <p className="text-xs text-slate-400">
                Hãy trải nghiệm tính năng <strong>Soạn Đề Bằng AI</strong> để tự động tạo đề thi Hóa học và xuất file Word chuẩn Bộ Giáo Dục chỉ trong vài giây!
              </p>
              <button
                onClick={() => {
                  setEditingExamId(null);
                  setActiveTab("create_ai");
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-400/20 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Soạn Đề Bằng AI Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((ex) => (
                <div
                  key={ex.id}
                  className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 hover:border-indigo-500/50 backdrop-blur-xl transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {ex.classes?.name || "Lớp học"} (Khối {ex.classes?.grade || "THCS"})
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* BADGE QUYỀN LÀM LẠI BÀI THI */}
                        <button
                          type="button"
                          onClick={() => handleToggleAllowRetake(ex.id, ex.allow_retake)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                            ex.allow_retake
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                          }`}
                          title="Bấm để bật/tắt quyền cho phép học sinh làm lại"
                        >
                          {ex.allow_retake ? <RotateCcw className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{ex.allow_retake ? "Cho phép làm lại" : "Chỉ làm 1 lần"}</span>
                        </button>

                        {ex.is_published ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đang mở
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                            Bản nháp
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {ex.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{ex.duration_minutes} phút</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{ex.questionCount} câu hỏi</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{ex.submissionCount} bài nộp</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <span>{ex.total_points} điểm</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEditExam(ex.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                        title="Chỉnh sửa đề thi & câu hỏi"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>

                      <button
                        onClick={async () => {
                          const detail = await getExamWithQuestions(ex.id);
                          if (detail) handleExportDocx(detail);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Xuất file Word (.docx) chuẩn Bộ GD"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word</span>
                      </button>

                      <button
                        onClick={() => handleOpenPreview(ex.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Xem trước & In đề"
                      >
                        <Printer className="w-3.5 h-3.5 text-cyan-400" />
                        <span>In</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePublish(ex.id, ex.is_published)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          ex.is_published
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                        }`}
                      >
                        {ex.is_published ? "Thu hồi" : "Mở thi"}
                      </button>

                      <button
                        onClick={() => handleDeleteExam(ex.id, ex.title)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Xóa đề thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOẠN & CHỈNH SỬA ĐỀ THI */}
      {activeTab === "create_ai" && (
        <div className="space-y-6">
          {/* BANNER THÔNG BÁO KHI ĐANG SỬA ĐỀ THI ĐÃ CÓ */}
          {editingExamId && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-indigo-950 border border-amber-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Chế Độ Chỉnh Sửa Đề Thi
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Đang chỉnh sửa: <span className="text-cyan-300">{examTitle}</span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy sửa (Tạo đề mới)</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 5 Cols: AI Generator Settings */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl shadow-2xl space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    {editingExamId ? "Sinh Thêm Câu Hỏi AI" : "Cấu Hình Sinh Đề AI (Gemini)"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Chọn khối lớp và chuyên đề để AI tự động tạo câu hỏi chuẩn KaTeX và Ma trận đề thi
                  </p>
                </div>

                {aiError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                <form onSubmit={handleGenerateAI} className="space-y-4">
                  {/* Loại Đề Thi: Cuối kỳ (có ma trận) hoặc Thường */}
                  <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-bold">
                      <input
                        type="checkbox"
                        checked={isFinalExam}
                        onChange={(e) => {
                          setIsFinalExam(e.target.checked);
                          if (e.target.checked && questionCount < 10) {
                            setQuestionCount(10);
                            setDurationMinutes(45);
                          }
                        }}
                        className="rounded border-white/20 text-cyan-500 focus:ring-cyan-400 w-4 h-4"
                      />
                      <span className="flex items-center gap-1.5 text-cyan-300">
                        <TableIcon className="w-4 h-4 text-cyan-400" />
                        Đề Thi Cuối Học Kỳ (Chuẩn Bộ GD&ĐT)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 Khi chọn chế độ này, file Word xuất ra sẽ tự động bao gồm <strong>Khung Ma Trận Đề Thi & Bản Đặc Tả GDPT 2018</strong> theo đúng 4 mức độ nhận thức của Bộ Giáo Dục.
                    </p>
                  </div>

                  {/* Chọn Khối lớp */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Khối Lớp THCS *
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => {
                        setSelectedGrade(e.target.value);
                        setTopic("");
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chọn hoặc nhập chủ đề */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Chủ Đề / Chuyên Đề Kiến Thức *
                    </label>
                    <input
                      type="text"
                      required
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ví dụ: Phản ứng hóa học và Định luật bảo toàn khối lượng"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />

                    {/* Gợi ý chủ đề nhanh */}
                    <div className="mt-2 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Gợi ý chuyên đề Khối {selectedGrade}:</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(TOPIC_SUGGESTIONS[selectedGrade] || TOPIC_SUGGESTIONS["8"]).map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTopic(item)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-white/5 transition-all text-left truncate max-w-[280px]"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Số lượng câu hỏi & Mức độ */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Số lượng câu hỏi
                      </label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      >
                        <option value={3}>3 câu (Thử nghiệm)</option>
                        <option value={5}>5 câu (Kiểm tra 15p)</option>
                        <option value={10}>10 câu (Chuẩn 45p)</option>
                        <option value={15}>15 câu (Đề tổng hợp)</option>
                        <option value={20}>20 câu (Thi học kỳ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Mức độ nhận thức
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      >
                        <option value="Tổng hợp (Ma trận chuẩn)">Ma trận chuẩn (40-30-20-10)</option>
                        <option value="Nhận biết & Thông hiểu">Cơ bản (Nhận biết - Thông hiểu)</option>
                        <option value="Vận dụng & Vận dụng cao">Nâng cao (Vận dụng - HSG)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dạng câu hỏi */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Dạng Câu Hỏi
                    </label>
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (A, B, C, D)</option>
                      <option value="short_answer">Tự luận trả lời ngắn</option>
                      <option value="mixed">Kết hợp Trắc nghiệm & Tự luận</option>
                    </select>
                  </div>

                  {/* Yêu cầu thêm */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Yêu cầu bổ sung (Tùy chọn)
                    </label>
                    <textarea
                      rows={2}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Ví dụ: Tập trung vào bài toán tính nồng độ mol, phương trình nhiệt phân..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generating}
                    className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-xl shadow-cyan-400/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Gemini AI đang biên soạn câu hỏi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{editingExamId ? "Sinh Thêm Câu Hỏi AI" : "Bấm Để AI Biên Soạn Đề Thi"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right 7 Cols: Question Workspace, Editing & Word Export */}
            <div className="lg:col-span-7 space-y-6">
              {generatedQuestions.length === 0 ? (
                <div className="p-12 rounded-3xl bg-slate-900/40 border border-dashed border-white/10 text-center space-y-3 min-h-[400px] flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">Không gian soạn đề & chỉnh sửa</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Chọn chủ đề và bấm <strong>"Bấm Để AI Biên Soạn Đề Thi"</strong> ở khung bên trái hoặc bấm <strong>"Sửa"</strong> từ danh sách để tùy biến câu hỏi.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Save Form & Word Export Bar */}
                  <div className="p-6 rounded-3xl bg-indigo-950/70 border border-indigo-500/30 backdrop-blur-xl space-y-4 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          {editingExamId ? "CẬP NHẬT ĐỀ THI" : isFinalExam ? "ĐỀ THI CUỐI HỌC KỲ (CÓ MA TRẬN)" : "ĐỀ KIỂM TRA ĐỊNH KỲ"} ({generatedQuestions.length} câu hỏi)
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {editingExamId ? "Lưu Lại Thay Đổi Đề Thi" : "Tùy Chọn Lưu & Xuất Bản"}
                        </h3>
                      </div>

                      {/* NÚT XUẤT FILE WORD (.DOCX) CHUẨN BỘ GIÁO DỤC */}
                      <button
                        type="button"
                        onClick={() => handleExportDocx()}
                        disabled={isExportingWord}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
                      >
                        {isExportingWord ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 text-cyan-300" />
                        )}
                        <span>Xuất File Word (.docx)</span>
                      </button>
                    </div>

                    {saveError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        {saveError}
                      </div>
                    )}

                    <form onSubmit={handleSaveExam} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tên Đề Kiểm Tra *
                        </label>
                        <input
                          type="text"
                          required
                          value={examTitle}
                          onChange={(e) => setExamTitle(e.target.value)}
                          placeholder="Tên đề thi hiển thị cho học sinh"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Lớp Học Áp Dụng *
                          </label>
                          <select
                            value={targetClassId}
                            onChange={(e) => setTargetClassId(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} (Khối {c.grade})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Thời Gian Làm Bài
                          </label>
                          <select
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value={15}>15 phút</option>
                            <option value={30}>30 phút</option>
                            <option value={45}>45 phút (1 tiết)</option>
                            <option value={60}>60 phút</option>
                            <option value={90}>90 phút (Thi học kỳ)</option>
                          </select>
                        </div>
                      </div>

                      {/* TÙY CHỌN CHO PHÉP LÀM LẠI & XUẤT BẢN */}
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-semibold">
                          <input
                            type="checkbox"
                            checked={allowRetake}
                            onChange={(e) => setAllowRetake(e.target.checked)}
                            className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                          />
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                            Cho phép học sinh làm lại bài thi (Retake)
                          </span>
                        </label>
                        <p className="text-[11px] text-slate-400 pl-6">
                          {allowRetake
                            ? "✅ Học sinh sau khi nộp bài có thể bấm 'Làm lại' để rèn luyện nhiều lần."
                            : "🔒 Học sinh chỉ được làm bài 1 lần duy nhất (phù hợp với bài thi lấy điểm chính thức)."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                            className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Xuất bản ngay cho học sinh làm bài</span>
                        </label>

                        <button
                          type="submit"
                          disabled={savingExam}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          {savingExam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <Save className="w-4 h-4" />
                          <span>{editingExamId ? "Cập Nhật Đề Thi" : "Lưu & Xuất Bản Đề Thi"}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Questions List with KaTeX rendering & Edit buttons */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-cyan-400" />
                        Danh Sách Câu Hỏi ({generatedQuestions.length})
                      </h3>

                      {/* Nút thêm câu hỏi thủ công */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditQuestionForm({
                            content_latex: "",
                            options: [
                              { key: "A", text: "" },
                              { key: "B", text: "" },
                              { key: "C", text: "" },
                              { key: "D", text: "" },
                            ],
                            correct_answer: "A",
                            explanation: "",
                          });
                          setShowAddManualModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>+ Thêm Câu Hỏi Thủ Công</span>
                      </button>
                    </div>

                    {generatedQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 relative group hover:border-indigo-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                              {q.difficulty || "Thông hiểu"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition-all"
                              title="Sửa nội dung & đáp án câu hỏi này"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Content (Render KaTeX) */}
                        <div className="text-sm font-semibold text-white leading-relaxed">
                          <MathText text={q.content_latex} />
                        </div>

                        {/* Multiple choice options */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {q.options.map((opt: any) => {
                              const isCorrect = opt.key === q.correct_answer;
                              return (
                                <div
                                  key={opt.key}
                                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                    isCorrect
                                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold"
                                      : "bg-slate-950/60 border-white/5 text-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                      isCorrect
                                        ? "bg-emerald-500 text-slate-950"
                                        : "bg-slate-800 text-slate-400"
                                    }`}
                                  >
                                    {opt.key}
                                  </span>
                                  <div className="pt-0.5">
                                    <MathText text={opt.text} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 space-y-1">
                            <span className="font-bold text-cyan-400 text-[11px]">💡 Lời giải chi tiết:</span>
                            <div className="text-slate-300">
                              <MathText text={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA CÂU HỎI TRỰC TIẾP */}
      {editingQuestionIdx !== null && editQuestionForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingQuestionIdx(null);
                setEditQuestionForm(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                Chỉnh Sửa Câu Hỏi {editingQuestionIdx + 1}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chỉnh sửa nội dung đề bài, các phương án lựa chọn và lời giải chi tiết
              </p>
            </div>

            <form onSubmit={handleSaveEditedQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đề Bài Câu Hỏi (Hỗ trợ LaTeX kẹp giữa $...$) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editQuestionForm.content_latex}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, content_latex: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {editQuestionForm.content_latex && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 mt-1 text-xs text-slate-200">
                    <span className="text-[10px] text-cyan-400 font-bold block mb-1">Xem trước hiển thị:</span>
                    <MathText text={editQuestionForm.content_latex} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Các Phương Án Lựa Chọn (A, B, C, D)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editQuestionForm.options.map((opt: any, optIdx: number) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {opt.key}
                      </span>
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editQuestionForm.options];
                          newOpts[optIdx] = { ...opt, text: e.target.value };
                          setEditQuestionForm({ ...editQuestionForm, options: newOpts });
                        }}
                        placeholder={`Đáp án ${opt.key}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đáp Án Đúng *
                </label>
                <select
                  value={editQuestionForm.correct_answer}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, correct_answer: e.target.value })}
                  className="px-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-emerald-400 font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="A">Đáp án A</option>
                  <option value="B">Đáp án B</option>
                  <option value="C">Đáp án C</option>
                  <option value="D">Đáp án D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lời Giải Chi Tiết
                </label>
                <textarea
                  rows={2}
                  value={editQuestionForm.explanation}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, explanation: e.target.value })}
                  placeholder="Trình bày các bước giải và phương trình phản ứng..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestionIdx(null);
                    setEditQuestionForm(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Lưu Câu Hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM CÂU HỎI THỦ CÔNG */}
      {showAddManualModal && editQuestionForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowAddManualModal(false);
                setEditQuestionForm(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                Thêm Câu Hỏi Mới Thủ Công
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập câu hỏi tự soạn của bạn kèm 4 lựa chọn và đáp án đúng
              </p>
            </div>

            <form onSubmit={handleAddManualQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đề Bài Câu Hỏi (Hỗ trợ LaTeX $...$) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editQuestionForm.content_latex}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, content_latex: e.target.value })}
                  placeholder="Ví dụ: Đốt cháy hoàn toàn 2,4g Magie ($Mg$) trong không khí..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                {editQuestionForm.content_latex && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 mt-1 text-xs text-slate-200">
                    <span className="text-[10px] text-cyan-400 font-bold block mb-1">Xem trước hiển thị:</span>
                    <MathText text={editQuestionForm.content_latex} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Các Phương Án Lựa Chọn (A, B, C, D) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editQuestionForm.options.map((opt: any, optIdx: number) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {opt.key}
                      </span>
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editQuestionForm.options];
                          newOpts[optIdx] = { ...opt, text: e.target.value };
                          setEditQuestionForm({ ...editQuestionForm, options: newOpts });
                        }}
                        placeholder={`Đáp án ${opt.key}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đáp Án Đúng *
                </label>
                <select
                  value={editQuestionForm.correct_answer}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, correct_answer: e.target.value })}
                  className="px-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-emerald-400 font-bold text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="A">Đáp án A</option>
                  <option value="B">Đáp án B</option>
                  <option value="C">Đáp án C</option>
                  <option value="D">Đáp án D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lời Giải Chi Tiết
                </label>
                <textarea
                  rows={2}
                  value={editQuestionForm.explanation}
                  onChange={(e) => setEditQuestionForm({ ...editQuestionForm, explanation: e.target.value })}
                  placeholder="Các bước giải thích..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddManualModal(false);
                    setEditQuestionForm(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-400/25"
                >
                  Thêm Vào Đề Thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM TRƯỚC VÀ IN ĐỀ THI (PRINT PREVIEW) */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewExam(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Bản In Đề Kiểm Tra Hóa Học
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{previewExam.title}</h2>
                <p className="text-xs text-slate-400">
                  Lớp: {previewExam.classes?.name} (Khối {previewExam.classes?.grade}) • Thời gian: {previewExam.duration_minutes} phút • {previewExam.allow_retake ? "Cho phép làm lại" : "Chỉ làm 1 lần"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportDocx(previewExam)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-4 h-4 text-cyan-300" />
                  <span>Xuất Word (.docx)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-400/25 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Đề (Print)</span>
                </button>
              </div>
            </div>

            {/* Questions List for Printing */}
            <div className="space-y-6 pt-4 border-t border-white/10">
              {previewExam.questions.map((q: any, idx: number) => (
                <div key={q.id} className="space-y-2 text-xs">
                  <div className="font-bold text-white flex items-start gap-2">
                    <span>Câu {idx + 1} ({q.points}đ):</span>
                    <span className="font-normal text-slate-200">
                      <MathText text={q.content_latex} />
                    </span>
                  </div>

                  {q.options_json && (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {q.options_json.map((opt: any) => (
                        <div key={opt.key} className="flex items-start gap-1.5 text-slate-300">
                          <strong className="text-cyan-400">{opt.key}.</strong>
                          <MathText text={opt.text} />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="pl-4 pt-1 text-[11px] text-slate-400 italic">
                      <strong className="text-emerald-400">Đáp án đúng: {q.correct_answer}</strong> -{" "}
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
