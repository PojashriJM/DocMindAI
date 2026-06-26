"use client";

import { useEffect, useState } from "react";
import FlipCard from "./components/FlipCard";
import { motion } from "framer-motion";
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
  const [currentChatId, setCurrentChatId] =
    useState<number | null>(null);

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
  localStorage.setItem(
    "docmindTheme",
    darkMode ? "dark" : "light"
  );
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
    localStorage.setItem(
      "docmindChats",
      JSON.stringify(chats)
    );
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

  const currentChat = chats.find(
    (chat) => chat.id === currentChatId
  );

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

  // detect selected option index
  const selectedIndex = current.options.indexOf(selectedOption);

  const selectedLetter =
    ["A", "B", "C", "D"][selectedIndex] || "";

  // extract correct letter from answer
  const correctLetter =
    current.answer.trim().charAt(0).toUpperCase();

  const isCorrect = selectedLetter === correctLetter;

  const correctIndex =
    ["A", "B", "C", "D"].indexOf(correctLetter);

  const correctText =
    current.options[correctIndex] || current.answer;

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
    alert(
      `Quiz Finished! Score: ${updatedScore} / ${quizQuestions.length}`
    );

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
    <main
className={`h-screen flex transition-all duration-300 ${
darkMode
? "bg-gradient-to-br from-zinc-950 via-black to-purple-950"
: "bg-gradient-to-br from-purple-100 via-white to-pink-100"
}`}
>
      <div
className={`w-72 p-4 flex flex-col border-r transition-all duration-300
${
darkMode
? "bg-zinc-950 border-zinc-800"
: "bg-white border-purple-100"
}`}
>
        <h1 className="text-2xl font-bold text-purple-700 mb-4">
          DocMind AI
        </h1>
       <div className="flex items-center gap-4 mb-5">
  <button
    onClick={() => setDarkMode(!darkMode)}
    className="w-12 h-12 rounded-full bg-purple-600 text-white text-xl hover:scale-110 transition"
  >
    {darkMode ? "☀️" : "🌙"}
  </button>

  <button
    onClick={createNewChat}
    className="flex-1 bg-purple-600 text-white py-3 rounded-2xl font-bold hover:scale-[1.02] transition"
  >
    + New Chat
  </button>
</div>

        <div className="space-y-2 overflow-y-auto">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() =>
                setCurrentChatId(chat.id)
              }
              className={`w-full text-left px-3 py-2 rounded-xl ${
                currentChatId === chat.id
                  ? "bg-purple-200 text-purple-800"
                  : "bg-purple-50 text-gray-700"
              }`}
            >
              {chat.title}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- MAIN ---------------- */}
      <div className="absolute top-20 left-40 w-72 h-72 bg-purple-500/20 blur-3xl rounded-full"></div>
<div className="absolute bottom-20 right-20 w-72 h-72 bg-pink-500/20 blur-3xl rounded-full"></div>
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Upload */}
       <motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
className={`rounded-3xl p-6 mb-5 shadow-xl transition-all duration-300 ${
darkMode
? "bg-zinc-950 border border-zinc-800"
: "bg-white border border-purple-100"
}`}
>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setFile(
                e.target.files?.[0] || null
              );
              setPdfReady(false);
            }}
            className="flex-1 border border-purple-300 rounded-xl p-3 text-purple-700"
          />

          <button
            onClick={() => setPdfReady(true)}
            className="bg-purple-600 text-white px-5 py-3 rounded-xl font-semibold"
          >
            Upload PDF
          </button>
        </motion.div>

        {/* Badge */}
        {pdfReady && file && (
          <div className="mb-4 text-purple-700 font-medium">
            📄 {file.name} loaded
          </div>
        )}

        {/* Chat Box */}
        <div
  className={`h-[500px] rounded-3xl shadow-xl p-6 overflow-y-auto transition-all ${
    darkMode
      ? "bg-gray-900 text-white"
      : "bg-white"
  }`}
>
          {currentChat?.messages.length === 0 ? (
            <p className="text-gray-400">
              Hi, Welcome to DocMind AI. Upload a PDF or start chatting... <br />Steps to get Started: <br />
              1. Choose a file  <br />
2. Click Upload  <br />
3. Ask a question  <br />
4. Click Send  <br />
5. Enjoy your learning journey with DocMind AI. <br />
            </p>
          ) : (
            currentChat?.messages.map(
              (msg, index) => (
                <div
                  key={index}
                  className={`mb-4 p-4 rounded-2xl max-w-xl ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white ml-auto"
                      : "bg-purple-100 text-purple-900"
                  }`}
                >
                  {msg.text}
                </div>
              )
            )
          )}
        </div>

        {/* Flashcard Button */}
        <div className="mt- space-y-4">
  <button
    onClick={generateFlashcards}
    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition"
  >
    Generate Flashcards
  </button>

  <button
    onClick={generateQuiz}
    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] transition"
  >
    Start Quiz
  </button>
</div>
        {/* Flashcards */}
        {showFlashcards && flashcards.length > 0  && (
          <div className="
rounded-3xl
shadow-lg
hover:shadow-2xl
hover:-translate-y-2
transition-all
duration-300
bg-white dark:bg-zinc-800
">
           <div className="flex justify-between items-center mb-5">
  <h2 className="text-2xl font-bold text-purple-700">
    Flashcards
  </h2>

  <button
    onClick={() => setShowFlashcards(false)}
    className="bg-red-500 text-white px-4 py-2 rounded-xl"
  >
    Close ✖
  </button>
</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {flashcards.map(
                (card, index) => (
                  <FlipCard
                    key={index}
                    question={
                      card.question
                    }
                    answer={
                      card.answer
                    }
                  />
                )
              )}
            </div>
          </div>
        )}
        {quizMode && quizQuestions.length > 0 && (
  <div className="
rounded-3xl
shadow-lg
hover:shadow-2xl
hover:-translate-y-2
transition-all
duration-300
bg-white dark:bg-zinc-800
">

   
    <div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-bold text-purple-700">
    Quiz Mode
  </h2>

  <div className="flex gap-4 items-center">
    <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-bold">
      ⏱ {timeLeft}s
    </div>

    <button
      onClick={() => {
        setQuizMode(false);
        setTimeLeft(60);
      }}
      className="text-red-500 font-bold"
    >
      Close ✖
    </button>
  </div>
</div>

    <p className="text-lg font-semibold text-purple-700 mb-4">
      {quizQuestions[currentQuestion].question}
    </p>

    <div className="grid gap-4">
      {quizQuestions[currentQuestion].options.map((option, index) => (
        <button
  key={index}
  onClick={() => setSelectedOption(option)}
  className={`p-3 rounded-xl border font-medium transition ${
    selectedOption === option
      ? "bg-purple-600 text-white border-purple-600"
      : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
  }`}
>
  {option}
</button>
        
      ))}
    </div>
<button
  onClick={handleNextQuestion}
  className="mt-5 w-full bg-purple-600 text-white py-3 rounded-2xl font-bold"
>
  Next Question
</button>
  </div>
)}
{showReview && (
  <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
    <div className="flex justify-between items-center mb-5">
      <h2 className="text-2xl font-bold text-purple-700">
        Quiz Review
      </h2>

      <button
        onClick={() => setShowReview(false)}
        className="bg-red-500 text-white px-4 py-2 rounded-xl"
      >
        Close ✖
      </button>
    </div>

    <p className="mb-4 text-lg font-semibold text-purple-700">
      Final Score: {score} / {quizQuestions.length}
    </p>

    <div className="space-y-4">
      {reviewAnswers.map((item, index) => (
        <div
          key={index}
          className="border border-purple-200 rounded-2xl p-4"
        >
          <p className="font-bold text-purple-700">
            Q{index + 1}. {item.question}
          </p>

         <div className="mt-2 text-gray-700">
  <p>
    Your Answer:
    <span className="ml-2 font-semibold text-purple-700">
      {item.selected}
    </span>
  </p>
</div>

          <div className="text-gray-700 mt-2">
  <p>
    Correct Answer:
    <span className="ml-2 font-semibold text-green-600">
      {item.correct}
    </span>
  </p>
</div>

          <p
            className={`mt-2 font-bold ${
              item.isCorrect
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {item.isCorrect ? "✔ Correct" : "✖ Wrong"}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
        {/* Input */}
       <div
className={`mt-5 rounded-3xl p-4 flex gap-4 shadow-xl transition-all duration-300 ${
darkMode
? "bg-zinc-950 border border-zinc-800"
: "bg-white border border-purple-100"
}`}
>
  <input
    value={question}
    onChange={(e) => setQuestion(e.target.value)}
    placeholder="Ask anything from PDF..."
    className={`flex-1 px-5 py-4 rounded-2xl outline-none border transition ${
      darkMode
        ? "bg-zinc-900 text-white border-zinc-700"
        : "bg-purple-50 text-purple-700 border-purple-200"
    }`}
  />

  <button
    onClick={sendMessage}
    className="
    px-8
    rounded-2xl
    font-bold
    text-white
    bg-gradient-to-r from-purple-600 to-pink-500
    shadow-lg
    hover:scale-105
    transition-all
    "
  >
    Send
  </button>
</div>
      </div>
    </main>
  );
}
