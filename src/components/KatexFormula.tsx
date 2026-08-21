"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface KatexFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

export function KatexFormula({ formula, displayMode = false, className = "" }: KatexFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return formula;
    }
  }, [formula, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Helper component: Render text có chứa công thức toán/hóa học kẹp giữa $...$ hoặc $$...$$
 */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    if (!text) return [];
    // Tách chuỗi theo định dạng $$...$$ hoặc $...$
    const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    return text.split(regex);
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2);
          return <KatexFormula key={index} formula={formula} displayMode={true} />;
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          const formula = part.slice(1, -1);
          return <KatexFormula key={index} formula={formula} displayMode={false} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
