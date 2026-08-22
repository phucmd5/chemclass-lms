"use server";

import { generateSlideDeckWithAI, refineSlideDeckWithAI, ChatMessage } from "@/lib/gemini-slides";
import { SlideDeck } from "@/lib/pptx-export";

export type SlideActionResponse =
  | { success: true; slideDeck: SlideDeck; aiResponse: string; error?: never }
  | { success: false; error: string; slideDeck?: never; aiResponse?: never };

/**
 * Server Action gọi AI sinh bộ Slide bài giảng mới
 */
export async function generateSlideDeckAction(payload: {
  topic: string;
  grade: string;
  slideCount?: number;
  teachingGoal?: string;
  documentText?: string;
  documentImagesBase64?: string[];
  theme?: string;
}): Promise<SlideActionResponse> {
  try {
    const result = await generateSlideDeckWithAI(payload);
    return { success: true, ...result };
  } catch (err: any) {
    console.error("Lỗi sinh slide AI:", err);
    return { success: false, error: err.message || "Không thể tạo slide bài giảng bằng AI" };
  }
}

/**
 * Server Action tinh chỉnh bộ Slide hiện tại dựa trên feedback từ khung chat
 */
export async function refineSlideDeckAction(payload: {
  currentDeck: SlideDeck;
  userFeedback: string;
  chatHistory: ChatMessage[];
  documentText?: string;
  documentImagesBase64?: string[];
}): Promise<SlideActionResponse> {
  try {
    const result = await refineSlideDeckWithAI(payload);
    return { success: true, ...result };
  } catch (err: any) {
    console.error("Lỗi tinh chỉnh slide AI:", err);
    return { success: false, error: err.message || "Không thể tinh chỉnh slide theo yêu cầu" };
  }
}
