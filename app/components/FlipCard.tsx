"use client";

import { useState } from "react";

type Props = {
  question: string;
  answer: string;
};

export default function FlipCard({
  question,
  answer,
}: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className="w-64 h-56 cursor-pointer perspective"
    >
      <div
        className={`relative w-full h-full duration-500 transform-style-preserve-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-purple-600 text-white rounded-3xl shadow-xl flex items-center justify-center p-4 text-center font-bold text-xl">
          {question}
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white text-purple-700 border border-purple-300 rounded-3xl shadow-xl flex items-center justify-center p-4 text-center font-semibold">
          {answer}
        </div>
      </div>
    </div>
  );
}