"use client";

import { useState } from "react";

type Props = {
  question: string;
  answer: string;
  darkMode?: boolean;
};

export default function FlipCard({ question, answer, darkMode = false }: Props) {
  const [flipped, setFlipped] = useState(false);

  const amber = "#F2B84B";
  const violet = "#7C5CFC";

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="w-64 h-56 cursor-pointer perspective group"
    >
      <div
        className={`relative w-full h-full duration-500 transform-style-preserve-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <div
          className="absolute w-full h-full backface-hidden text-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center gap-3"
          style={{ backgroundColor: violet }}
        >
          <span className="font-serif italic text-lg leading-snug">{question}</span>
          <span className="text-[11px] uppercase tracking-wider text-white/60 group-hover:text-white/90 transition">
            Tap to reveal
          </span>
        </div>

        {/* Back */}
        <div
          className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center gap-3 border-l-4 ${
            darkMode
              ? "bg-[#1C1626] text-[#F3EEFB] border-[#33283F]"
              : "bg-white text-[#241B2E] border-[#E8DFC9]"
          }`}
          style={{ borderLeftColor: amber }}
        >
          <span className="font-medium text-base leading-snug">{answer}</span>
          <span
            className={`text-[11px] uppercase tracking-wider ${
              darkMode ? "text-[#B7A9CC]" : "text-[#6B5F78]"
            }`}
          >
            Tap to flip back
          </span>
        </div>
      </div>
    </div>
  );
}