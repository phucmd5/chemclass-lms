"use client";

import React, { useState, useRef, useEffect } from "react";
import { generateSlideDeckAction, refineSlideDeckAction } from "@/app/actions/slides";
import { SlideDeck, SlideItem, generatePptxBlob } from "@/lib/pptx-export";
import { MathText } from "@/components/KatexFormula";
import {
  Sparkles,
  Presentation,
  Send,
  Download,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Palette,
  CheckCircle2,
  HelpCircle,
  X,
  Bot,
  User,
  Plus,
  Edit3,
  BookOpen,
  Volume2,
  RefreshCw,
  Layers,
  MessageSquare,
  Sparkle,
  Sliders,
  CheckSquare,
} from "lucide-react";

const QUICK_PROMPTS = [
  "Soạn slide bài giảng 8 trang về Phản ứng hóa học & Định luật bảo toàn khối lượng (Khối 8)",
  "Tạo bài giảng 10 trang về Mol, Khối lượng mol, Thể tích mol và Tính toán hóa học (Khối 8)",
  "Soạn slide KHTN 6: Oxygen và Không khí - Vai trò đối với sự sống",
  "Tạo bài giảng 8 trang về Dung dịch, Nồng độ phần trăm C% và Nồng độ mol CM (Khối 8)",
  "Soạn slide Khối 9: Axit, Bazơ, Muối và Dãy hoạt động hóa học của kim loại",
];

const THEMES = [
  { id: "modern_chemistry", name: "Công Nghệ Tối (Dark Cyan)", bg: "bg-slate-950", accent: "text-cyan-400" },
  { id: "ocean_blue", name: "Đại Dương Xanh (Ocean Blue)", bg: "bg-sky-950", accent: "text-sky-400" },
  { id: "emerald_nature", name: "Xanh Ngọc Lục Bảo (Emerald)", bg: "bg-emerald-950", accent: "text-emerald-400" },
  { id: "sunset_orange", name: "Hoàng Hôn Ấm Áp (Sunset)", bg: "bg-amber-950", accent: "text-amber-400" },
  { id: "academic_light", name: "Giảng Đường Sáng (Academic)", bg: "bg-slate-100", accent: "text-indigo-600" },
];

export default function AISlideStudioPage() {
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Xin chào Thầy/Cô! Tôi là Trợ Lý AI Soạn Bài Giảng & Slide PowerPoint của ChemClass LMS.\n\nThầy/Cô hãy nhập chủ đề bài học (tự do chọn số lượng từ 3 đến 25 slide), tải lên tài liệu/giáo án tham khảo hoặc chọn gợi ý bên dưới để tôi bắt đầu thiết kế bộ slide hoàn chỉnh (đầy đủ slide bài học, câu hỏi củng cố ôn tập và slide tổng kết/dặn dò) nhé!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [slideCount, setSlideCount] = useState<number>(8);
  const [isGenerating, setIsGenerating] = useState(false);

  // Document attachment state
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);
  const [attachedDocText, setAttachedDocText] = useState<string>("");
  const [attachedDocImages, setAttachedDocImages] = useState<string[]>([]);

  // Slide Deck state
  const [slideDeck, setSlideDeck] = useState<SlideDeck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [selectedTheme, setSelectedTheme] = useState<string>("modern_chemistry");
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Xử lý đính kèm tài liệu (Text / Ảnh giáo án)
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAttachedDocName(file.name);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachedDocImages([base64]);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachedDocText(text);
      };
      reader.readAsText(file);
    }
  }

  function handleRemoveAttachedDoc() {
    setAttachedDocName(null);
    setAttachedDocText("");
    setAttachedDocImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Gửi tin nhắn / Yêu cầu tạo hoặc sửa Slide
  async function handleSendMessage(customPrompt?: string) {
    const textToSend = customPrompt || inputText.trim();
    if (!textToSend || isGenerating) return;

    setInputText("");
    const newMessages = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newMessages);
    setIsGenerating(true);

    if (!slideDeck) {
      // 1. Tạo bộ slide mới từ đầu
      const res = await generateSlideDeckAction({
        topic: textToSend,
        grade: selectedGrade,
        slideCount: Math.min(25, Math.max(3, slideCount)),
        documentText: attachedDocText,
        documentImagesBase64: attachedDocImages,
        theme: selectedTheme,
      });

      setIsGenerating(false);

      if (!res.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ Rất tiếc, đã xảy ra lỗi: ${res.error}` },
        ]);
      } else {
        setSlideDeck(res.slideDeck);
        setCurrentSlideIndex(0);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.aiResponse },
        ]);
      }
    } else {
      // 2. Chỉnh sửa và tinh chỉnh bộ slide hiện tại theo feedback
      const res = await refineSlideDeckAction({
        currentDeck: { ...slideDeck, theme: selectedTheme as any },
        userFeedback: textToSend,
        chatHistory: newMessages.map((m) => ({ role: m.role, content: m.content })),
        documentText: attachedDocText,
        documentImagesBase64: attachedDocImages,
      });

      setIsGenerating(false);

      if (!res.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ Không thể cập nhật slide: ${res.error}` },
        ]);
      } else {
        setSlideDeck(res.slideDeck);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.aiResponse },
        ]);
      }
    }
  }

  // Xuất file PowerPoint (.pptx)
  async function handleExportPptx() {
    if (!slideDeck) return;

    try {
      setIsExportingPptx(true);
      const blob = await generatePptxBlob({
        ...slideDeck,
        theme: selectedTheme as any,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = slideDeck.topic.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_");
      a.download = `Bai_Giang_${safeTitle}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Lỗi xuất PowerPoint:", err);
      alert("Lỗi xuất PowerPoint: " + err.message);
    } finally {
      setIsExportingPptx(false);
    }
  }

  const currentSlide = slideDeck?.slides[currentSlideIndex];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Presentation className="w-6 h-6 text-cyan-400" />
            AI Soạn Bài Giảng & Slide PowerPoint (Tối Đa 25 Slide)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Trò chuyện với AI, đọc tài liệu tham khảo, có sẵn câu hỏi ôn tập & tổng kết, xuất PowerPoint (.pptx) chuẩn đẹp
          </p>
        </div>

        {/* Nút Điều Khiển & Xuất PPTX */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bộ chọn Theme */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-2xl text-xs">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {slideDeck && (
            <button
              onClick={handleExportPptx}
              disabled={isExportingPptx}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isExportingPptx ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Download className="w-4 h-4 text-slate-950" />
              )}
              <span>Xuất PowerPoint (.pptx)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Chat & Right Live Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* CỘT TRÁI (5 Cols): KHUNG CHAT & TÀI LIỆU THAM KHẢO */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden h-[680px]">
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Trợ Lý Thiết Kế Slide AI</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini 3.6 Flash
                </span>
              </div>
            </div>

            {/* Khối lớp & Ô TỰ GÕ SỐ LƯỢNG SLIDE (3 -> 25) */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Khối:</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-2 py-1 rounded-xl bg-slate-800 border border-white/10 text-white text-[11px] font-bold focus:outline-none"
                >
                  <option value="6">Khối 6</option>
                  <option value="7">Khối 7</option>
                  <option value="8">Khối 8</option>
                  <option value="9">Khối 9</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Số slide:</span>
                <input
                  type="number"
                  min={3}
                  max={25}
                  value={slideCount}
                  onChange={(e) => setSlideCount(Math.min(25, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-12 px-1.5 py-1 rounded-xl bg-slate-800 border border-white/10 text-cyan-300 font-bold text-center text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  title="Tự gõ số lượng slide mong muốn (tối đa 25 slide)"
                />
              </div>
            </div>
          </div>

          {/* Phím bấm nhanh số lượng slide */}
          <div className="px-3.5 py-1.5 bg-slate-950/40 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-[10px]">Chọn nhanh số slide:</span>
            <div className="flex items-center gap-1">
              {[5, 8, 10, 12, 15, 20, 25].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSlideCount(num)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    slideCount === num
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white font-medium rounded-tr-none shadow-lg shadow-indigo-600/20"
                      : "bg-slate-950/80 text-slate-200 border border-white/10 rounded-tl-none shadow-md"
                  }`}
                >
                  <MathText text={m.content} />
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI đang đọc tài liệu, tính toán công thức & thiết kế {slideCount} slide...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts (Khi chưa có nhiều tin nhắn) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-white/5 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-semibold block">Gợi ý chủ đề nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-white/5 text-left truncate max-w-full transition-all"
                  >
                    ✨ {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Attachment Pill */}
          {attachedDocName && (
            <div className="px-4 py-2 bg-indigo-950/60 border-t border-indigo-500/30 flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="truncate font-semibold">{attachedDocName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Đã nạp
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveAttachedDoc}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.pdf,.docx,image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all"
                title="Đính kèm tài liệu / Ảnh giáo án tham khảo"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  slideDeck
                    ? "Feedback: 'Thêm ví dụ vào slide 3', 'Đổi thứ tự câu hỏi ở slide quiz'..."
                    : "Nhập tên bài học hoặc yêu cầu tạo slide bài giảng..."
                }
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="p-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-lg shadow-cyan-400/25 transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI (7 Cols): MÀN HÌNH XEM TRƯỚC SLIDE 16:9 (LIVE CANVAS) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {!slideDeck ? (
            <div className="h-[680px] rounded-3xl bg-slate-900/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-xl">
                <Presentation className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Khung Xem Trước Slide Thuyết Trình 16:9</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Hãy gửi yêu cầu hoặc chọn chủ đề ở khung chat bên trái để AI tự động thiết kế bộ slide trình chiếu tuyệt đẹp (tối đa 25 slide)!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col h-[680px]">
              {/* TOP SLIDE TOOLBAR */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white truncate max-w-[240px]">
                    {slideDeck.topic} (Khối {slideDeck.grade})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    Slide {currentSlideIndex + 1} / {slideDeck.slides.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
                    className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                      showSpeakerNotes
                        ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                        : "bg-slate-800 text-slate-400 border-white/5"
                    }`}
                    title="Bật/tắt gợi ý lời giảng của giáo viên"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lời Giảng</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!document.fullscreenElement) {
                        canvasRef.current?.requestFullscreen();
                        setIsFullscreen(true);
                      } else {
                        document.exitFullscreen();
                        setIsFullscreen(false);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                    title="Trình chiếu toàn màn hình (Presenter)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SLIDE CANVAS 16:9 */}
              <div
                ref={canvasRef}
                className={`relative flex-1 rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden transition-all ${
                  selectedTheme === "ocean_blue"
                    ? "bg-gradient-to-br from-sky-950 via-slate-900 to-cyan-950 text-sky-100"
                    : selectedTheme === "emerald_nature"
                    ? "bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-emerald-100"
                    : selectedTheme === "sunset_orange"
                    ? "bg-gradient-to-br from-amber-950 via-slate-900 to-rose-950 text-amber-100"
                    : selectedTheme === "academic_light"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100"
                }`}
              >
                {currentSlide && (
                  <>
                    {/* SLIDE TYPE: TITLE */}
                    {currentSlide.layout === "title" ? (
                      <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="inline-block">
                          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                            BÀI GIẢNG ĐIỆN TỬ • KHỐI {slideDeck.grade}
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                          <MathText text={currentSlide.title} />
                        </h1>
                        {currentSlide.subtitle && (
                          <p className="text-base sm:text-lg font-medium text-cyan-300">
                            <MathText text={currentSlide.subtitle} />
                          </p>
                        )}
                        <div className="pt-4 border-t border-white/10 text-xs text-slate-400 font-medium">
                          Môn: Khoa học Tự nhiên & Hóa học THCS • ChemClass LMS
                        </div>
                      </div>
                    ) : (
                      /* SLIDE TYPE: CONTENT */
                      <div className="flex-1 flex flex-col space-y-4">
                        {/* Slide Title */}
                        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                            <span className="w-2 h-5 rounded-full bg-cyan-400"></span>
                            <MathText text={currentSlide.title} />
                          </h2>
                          <span className="text-xs font-mono text-slate-500">#{currentSlide.slideNumber}</span>
                        </div>

                        {/* Slide Content Body */}
                        <div className="flex-1 space-y-3.5 text-xs sm:text-sm">
                          {/* 2 Column Layout */}
                          {currentSlide.layout === "two_column" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {currentSlide.content.leftColumn && (
                                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                                  {currentSlide.content.leftColumn.heading && (
                                    <h4 className="font-bold text-cyan-300">
                                      <MathText text={currentSlide.content.leftColumn.heading} />
                                    </h4>
                                  )}
                                  <ul className="space-y-1.5 text-slate-300">
                                    {currentSlide.content.leftColumn.bullets.map((b, bIdx) => (
                                      <li key={bIdx} className="flex items-start gap-2">
                                        <span className="text-cyan-400 mt-0.5">•</span>
                                        <MathText text={b} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {currentSlide.content.rightColumn && (
                                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                                  {currentSlide.content.rightColumn.heading && (
                                    <h4 className="font-bold text-indigo-300">
                                      <MathText text={currentSlide.content.rightColumn.heading} />
                                    </h4>
                                  )}
                                  <ul className="space-y-1.5 text-slate-300">
                                    {currentSlide.content.rightColumn.bullets.map((b, bIdx) => (
                                      <li key={bIdx} className="flex items-start gap-2">
                                        <span className="text-indigo-400 mt-0.5">•</span>
                                        <MathText text={b} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quiz Layout (Câu hỏi củng cố ôn tập) */}
                          {currentSlide.layout === "quiz" && currentSlide.content.quiz && (
                            <div className="space-y-3">
                              <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-white font-bold text-sm">
                                ❓ <MathText text={currentSlide.content.quiz.question} />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {currentSlide.content.quiz.options.map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-slate-300 font-medium"
                                  >
                                    <MathText text={opt} />
                                  </div>
                                ))}
                              </div>
                              {currentSlide.content.quiz.answer && (
                                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
                                  <strong>✅ Đáp án: </strong>
                                  <MathText text={`${currentSlide.content.quiz.answer} - ${currentSlide.content.quiz.explanation || ""}`} />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Summary Layout (Tổng kết & Dặn dò về nhà) */}
                          {currentSlide.layout === "summary" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Cột trái: Điểm cốt lõi */}
                              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                                <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
                                  <CheckSquare className="w-4 h-4" />
                                  <span>Kiến Thức Cốt Lõi:</span>
                                </h4>
                                <ul className="space-y-1.5 text-slate-200">
                                  {(currentSlide.content.summary?.keyPoints || currentSlide.content.bullets || []).map((k, kIdx) => (
                                    <li key={kIdx} className="flex items-start gap-2">
                                      <span className="text-cyan-400 mt-0.5">✔</span>
                                      <MathText text={k} />
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Cột phải: Công thức trọng tâm & Dặn dò */}
                              <div className="space-y-3">
                                {currentSlide.content.summary?.formulas && currentSlide.content.summary.formulas.length > 0 && (
                                  <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1">
                                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                                      📌 Công Thức Trọng Tâm Cần Nhớ:
                                    </span>
                                    <div className="space-y-1 text-xs text-white font-semibold">
                                      {currentSlide.content.summary.formulas.map((f, fIdx) => (
                                        <div key={fIdx} className="pl-1">
                                          <MathText text={f} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {currentSlide.content.summary?.homework && (
                                  <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-0.5">
                                    <span className="font-bold text-amber-300 block">📝 Nhiệm Vụ Về Nhà:</span>
                                    <p className="text-slate-300">
                                      <MathText text={currentSlide.content.summary.homework} />
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Bullets List */}
                          {currentSlide.layout !== "summary" && currentSlide.content.bullets && currentSlide.content.bullets.length > 0 && (
                            <ul className="space-y-2 text-slate-200">
                              {currentSlide.content.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-2.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></span>
                                  <div className="leading-relaxed">
                                    <MathText text={b} />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Chemical Equations Box */}
                          {currentSlide.layout !== "summary" && currentSlide.content.chemicalEquations &&
                            currentSlide.content.chemicalEquations.length > 0 && (
                              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-1.5 shadow-inner">
                                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                                  ⚗️ Phương Trình Hóa Học:
                                </span>
                                <div className="space-y-1 text-sm font-semibold text-white">
                                  {currentSlide.content.chemicalEquations.map((eq, eqIdx) => (
                                    <div key={eqIdx} className="pl-2">
                                      <MathText text={eq} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Highlight Rule Box */}
                          {currentSlide.layout !== "summary" && currentSlide.content.highlightBox && (
                            <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1 shadow-inner">
                              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                                💡 {currentSlide.content.highlightBox.title}:
                              </span>
                              <p className="text-slate-200 leading-relaxed text-xs">
                                <MathText text={currentSlide.content.highlightBox.text} />
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SPEAKER NOTES DRAWER */}
                    {showSpeakerNotes && currentSlide.speakerNotes && (
                      <div className="mt-4 pt-3 border-t border-white/10 text-xs bg-slate-950/60 -mx-6 -mb-6 p-4 rounded-b-3xl">
                        <span className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                          <BookOpen className="w-3.5 h-3.5" /> Gợi ý lời giảng sư phạm (Speaker Notes):
                        </span>
                        <p className="text-slate-300 italic leading-relaxed text-[11px]">
                          "{currentSlide.speakerNotes}"
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* SLIDE NAVIGATION THUMBNAILS & CONTROLS */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-2.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Thumbnails list */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {slideDeck.slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all truncate max-w-[120px] ${
                        currentSlideIndex === idx
                          ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      {idx + 1}. {s.title.slice(0, 12)}...
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlideIndex(Math.min(slideDeck.slides.length - 1, currentSlideIndex + 1))
                  }
                  disabled={currentSlideIndex === slideDeck.slides.length - 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
