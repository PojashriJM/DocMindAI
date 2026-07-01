"use client";

import { useEffect, useState } from "react";
import FlipCard from "./components/FlipCard";
import { motion, AnimatePresence } from "framer-motion";

type Chat = {
  id: number;
  title: string;
  messages: { role: string; text: string }[];
};

type Flashcard = {
  question: string;
  answer: string;
};

export default function Home() {
  const [reviewAnswers, setReviewAnswers] = useState<any[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);

  const [question, setQuestion] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState([
    {
      question: "What is AI?",
      options: ["Animal", "Artificial Intelligence", "App", "Internet"],
      answer: "Artificial Intelligence",
    },
  ]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [score, setScore] = useState(0);

  /* ---------------- THEME TOKENS ---------------- */
  // Centralizing these avoids repeating the same ternary in every className.
  const t = {
    bg: darkMode
      ? "bg-[#120E1A]"
      : "bg-[#FAF6EF]",
    surface: darkMode
      ? "bg-[#1C1626] border-[#33283F]"
      : "bg-white border-[#E8DFC9]",
    surfaceAlt: darkMode
      ? "bg-[#1C1626]/70 border-[#33283F]"
      : "bg-[#FFFDF8] border-[#E8DFC9]",
    text: darkMode ? "text-[#F3EEFB]" : "text-[#241B2E]",
    textDim: darkMode ? "text-[#B7A9CC]" : "text-[#6B5F78]",
    border: darkMode ? "border-[#33283F]" : "border-[#E8DFC9]",
    chip: darkMode
      ? "bg-[#241B33] text-[#D8CCF0] border border-[#3A2C4D]"
      : "bg-[#F3ECDD] text-[#5B4E68] border border-[#E8DFC9]",
  };

  const amber = "#F2B84B";
  const violet = "#7C5CFC";

  /* ---------------- LOAD STORAGE ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem("docmindChats");

    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);

      if (parsed.length > 0) {
        setCurrentChatId(parsed[0].id);
      }
    } else {
      createNewChat();
    }
    const savedTheme = localStorage.getItem("docmindTheme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("docmindTheme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!quizMode) return;

    if (timeLeft === 0) {
      handleNextQuestion();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, quizMode]);

  /* ---------------- SAVE STORAGE ---------------- */
  useEffect(() => {
    localStorage.setItem("docmindChats", JSON.stringify(chats));
  }, [chats]);

  /* ---------------- NEW CHAT ---------------- */
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setFlashcards([]);
  };

  const currentChat = chats.find((chat) => chat.id === currentChatId);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!question.trim() || !currentChatId) return;

    const userText = question;
    setQuestion("");

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                { role: "user", text: userText },
                { role: "ai", text: "Thinking..." },
              ],
            }
          : chat
      )
    );

    try {
      let res;

      if (pdfReady && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("question", userText);

        res = await fetch("/api/ask", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/ask", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: userText }),
        });
      }

      const data = await res.json();

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages.slice(0, -1),
                  { role: "ai", text: data.answer },
                ],
              }
            : chat
        )
      );
    } catch {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages.slice(0, -1),
                  { role: "ai", text: "Something went wrong." },
                ],
              }
            : chat
        )
      );
    }
  };

  /* ---------------- FLASHCARDS ---------------- */
  const generateFlashcards = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "question",
      `
Create exactly 5 flashcards.

Return ONLY valid JSON.

Format:
[
 { "question":"...", "answer":"..." },
 { "question":"...", "answer":"..." }
]

No markdown.
No explanation.
No extra text.
`
    );

    const res = await fetch("/api/ask", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    try {
      let clean = data.answer
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const cards = JSON.parse(clean);

      setFlashcards(cards);
      setShowFlashcards(true);
    } catch (error) {
      console.log(data.answer);
      alert("Could not generate flashcards.");
    }
  };

  const handleNextQuestion = () => {
    const current = quizQuestions[currentQuestion];

    // Some generated quizzes prefix options with "A) ", others don't, and the
    // "answer" field sometimes comes back as a letter and sometimes as the
    // plain value. Stripping any leading "X) " and comparing text directly
    // avoids relying on a specific format from the model.
    const normalize = (s: string) => s.replace(/^[A-D]\)\s*/i, "").trim().toLowerCase();

    const normalizedAnswer = normalize(current.answer);
    const correctText =
      current.options.find((opt) => normalize(opt) === normalizedAnswer) ||
      current.answer;

    const isCorrect =
      !!selectedOption && normalize(selectedOption) === normalizedAnswer;

    const newReview = [
      ...reviewAnswers,
      {
        question: current.question,
        selected: selectedOption || "No Answer",
        correct: correctText,
        isCorrect,
      },
    ];

    setReviewAnswers(newReview);

    let updatedScore = score;

    if (isCorrect) {
      updatedScore = score + 1;
      setScore(updatedScore);
    }

    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption("");
      setTimeLeft(60);
    } else {
      setQuizMode(false);
      setShowReview(true);
      setCurrentQuestion(0);
      setSelectedOption("");
      setTimeLeft(60);
    }
  };

  const generateQuiz = async () => {
    if (!file) {
      alert("Upload PDF first");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "question",
        `Create 5 MCQ quiz questions from this PDF.
Return ONLY JSON:

[
{
"question":"...",
"options":["A","B","C","D"],
"answer":"..."
}
]`
      );

      const res = await fetch("/api/ask", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      const cleaned = data.answer
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const quiz = JSON.parse(cleaned);

      setQuizQuestions(quiz);
      setQuizMode(true);
      setReviewAnswers([]);
      setShowReview(false);
      setCurrentQuestion(0);
      setScore(0);
      setSelectedOption("");
      setTimeLeft(60);
    } catch {
      alert("Could not generate quiz.");
    }
  };

  return (
    <main className={`h-screen flex ${t.bg} ${t.text} transition-colors duration-300 font-sans`}>
      {/* ---------------- SIDEBAR / SPINE ---------------- */}
      <div
        className={`w-64 flex flex-col border-r ${t.border} ${
          darkMode ? "bg-[#150F1E]" : "bg-white"
        } transition-colors duration-300`}
      >
        <div className="px-5 pt-6 pb-4">
          <h1 className="font-serif text-2xl italic tracking-tight">
            DocMind <span style={{ color: amber }}>AI</span>
          </h1>
          <p className={`text-xs mt-1 ${t.textDim}`}>your study session, indexed</p>
        </div>

        <div className="flex items-center gap-2 px-5 mb-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
            className={`w-10 h-10 flex items-center justify-center rounded-full border ${t.border} ${t.textDim} hover:scale-105 transition`}
          >
            {darkMode ? "☾" : "☀"}
          </button>

          <button
            onClick={createNewChat}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition hover:opacity-90 ${
              darkMode
                ? "bg-[#241B33] border-[#3A2C4D] text-[#F3EEFB]"
                : "bg-[#241B2E] border-[#241B2E] text-white"
            }`}
          >
            + New chat
          </button>
        </div>

        <div className={`px-5 text-[11px] uppercase tracking-wider ${t.textDim} mb-2`}>
          Contents
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {chats.map((chat) => {
            const active = currentChatId === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => setCurrentChatId(chat.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm relative transition ${
                  active
                    ? `${t.text} font-medium`
                    : `${t.textDim} hover:${t.text}`
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full"
                    style={{ backgroundColor: amber }}
                  />
                )}
                <span className="pl-2">{chat.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
        <div
          className="absolute top-10 right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: `${violet}1a` }}
        />

        {/* Upload */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-2xl p-5 mb-4 border-2 border-dashed ${t.border} ${
            darkMode ? "bg-[#1C1626]/50" : "bg-[#FFFDF8]"
          } flex items-center gap-4 relative z-10`}
        >
          <span className="text-2xl">📄</span>
          <div className="flex-1">
            <p className={`text-sm font-medium ${t.text}`}>
              {file ? file.name : "Drop a PDF, or choose a file"}
            </p>
            <p className={`text-xs ${t.textDim}`}>
              {pdfReady ? "Loaded and ready" : "PDF only"}
            </p>
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPdfReady(false);
            }}
            className={`text-xs max-w-[160px] ${t.textDim}`}
          />
          <button
            onClick={() => setPdfReady(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-[#241B2E] transition hover:opacity-90"
            style={{ backgroundColor: amber }}
          >
            Upload
          </button>
        </motion.div>

        {/* Chat Box */}
        <div
          className={`h-[460px] rounded-2xl border ${t.surface} p-6 overflow-y-auto relative z-10`}
        >
          {currentChat?.messages.length === 0 ? (
            <div className={t.textDim}>
              <p className={`font-serif text-lg italic mb-3 ${t.text}`}>
                Upload a PDF or start chatting.
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Choose a file</li>
                <li>Click Upload</li>
                <li>Ask a question</li>
                <li>Click Send</li>
              </ol>
            </div>
          ) : (
            currentChat?.messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 p-3.5 rounded-2xl max-w-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "ml-auto text-white"
                    : `border-l-2 ${t.surfaceAlt} ${t.text}`
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: violet }
                    : { borderLeftColor: amber }
                }
              >
                {msg.text}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
          <button
            onClick={generateFlashcards}
            className={`py-3.5 rounded-xl text-sm font-semibold border ${t.border} ${t.text} transition hover:border-current`}
          >
            ✎ Generate flashcards
          </button>

          <button
            onClick={generateQuiz}
            className="py-3.5 rounded-xl text-sm font-semibold text-[#241B2E] transition hover:opacity-90"
            style={{ backgroundColor: amber }}
          >
            ⏱ Start quiz
          </button>
        </div>

        {/* Flashcards */}
        <AnimatePresence>
          {showFlashcards && flashcards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 rounded-2xl border ${t.surface} p-6 relative z-10`}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-serif text-xl italic">Flashcards</h2>
                <button
                  onClick={() => setShowFlashcards(false)}
                  className={`text-sm ${t.textDim} hover:${t.text}`}
                >
                  Close ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {flashcards.map((card, index) => (
                  <FlipCard key={index} question={card.question} answer={card.answer} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz */}
        <AnimatePresence>
          {quizMode && quizQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 rounded-2xl border ${t.surface} p-6 relative z-10`}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-serif text-xl italic">Quiz mode</h2>

                <div className="flex gap-3 items-center">
                  <span className={`text-xs ${t.textDim}`}>
                    Q{currentQuestion + 1} / {quizQuestions.length}
                  </span>
                  <div
                    className={`font-mono text-sm px-3 py-1.5 rounded-lg ${t.chip}`}
                  >
                    {timeLeft}s
                  </div>
                  <button
                    onClick={() => {
                      setQuizMode(false);
                      setTimeLeft(60);
                    }}
                    className={`text-sm ${t.textDim} hover:${t.text}`}
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              <p className={`text-base font-medium mb-4 ${t.text}`}>
                {quizQuestions[currentQuestion].question}
              </p>

              <div className="grid gap-2.5">
                {quizQuestions[currentQuestion].options.map((option, index) => {
                  const selected = selectedOption === option;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedOption(option)}
                      className={`text-left p-3.5 rounded-xl border text-sm font-medium transition flex items-center gap-3 ${
                        selected
                          ? `${t.text}`
                          : `${t.border} ${t.textDim} hover:${t.text}`
                      }`}
                      style={
                        selected
                          ? { borderColor: amber, backgroundColor: `${amber}14` }
                          : undefined
                      }
                    >
                      <span
                        className="w-4 h-4 rounded-full border flex-shrink-0"
                        style={{
                          borderColor: selected ? amber : undefined,
                          backgroundColor: selected ? amber : "transparent",
                        }}
                      />
                      {option}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNextQuestion}
                className="mt-5 w-full py-3 rounded-xl font-semibold text-[#241B2E] transition hover:opacity-90"
                style={{ backgroundColor: amber }}
              >
                Next question →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review */}
        <AnimatePresence>
          {showReview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 rounded-2xl border ${t.surface} p-6 relative z-10`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl italic">Quiz review</h2>
                <button
                  onClick={() => setShowReview(false)}
                  className={`text-sm ${t.textDim} hover:${t.text}`}
                >
                  Close ✕
                </button>
              </div>

              <p className={`mb-4 text-sm font-mono ${t.textDim}`}>
                Score: <span className={t.text}>{score} / {quizQuestions.length}</span>
              </p>

              <div className="space-y-3">
                {reviewAnswers.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border ${t.border} p-4 border-l-2`}
                    style={{ borderLeftColor: item.isCorrect ? "#34D399" : "#F87171" }}
                  >
                    <p className={`text-sm font-medium ${t.text}`}>
                      Q{index + 1}. {item.question}
                    </p>
                    <p className={`text-xs mt-2 ${t.textDim}`}>
                      Your answer: <span className={t.text}>{item.selected}</span>
                    </p>
                    <p className={`text-xs mt-1 ${t.textDim}`}>
                      Correct answer:{" "}
                      <span style={{ color: "#34D399" }}>{item.correct}</span>
                    </p>
                    <p
                      className="text-xs mt-2 font-semibold"
                      style={{ color: item.isCorrect ? "#34D399" : "#F87171" }}
                    >
                      {item.isCorrect ? "Correct" : "Wrong"}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div
          className={`mt-4 rounded-2xl p-3 flex gap-3 border ${t.surface} relative z-10`}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything from the PDF..."
            className={`flex-1 px-4 py-3 rounded-xl outline-none text-sm border ${t.border} ${
              darkMode ? "bg-[#150F1E]" : "bg-[#FFFDF8]"
            } ${t.text}`}
          />

          <button
            onClick={sendMessage}
            className="px-6 rounded-xl font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: violet }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
