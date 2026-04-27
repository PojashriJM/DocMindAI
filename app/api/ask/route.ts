import Groq from "groq-sdk";
const pdf = require("pdf-parse/lib/pdf-parse.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let prompt = "";

    /* ---------------- NORMAL CHAT ---------------- */
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (!body.question || body.question.trim() === "") {
        return Response.json({
          answer: "Question is required.",
        });
      }

      prompt = `
You are DocMind AI.

Reply clearly, professionally, and helpfully.

User Question:
${body.question}
`;
    }

    /* ---------------- PDF CHAT ---------------- */
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const file = formData.get("file") as File | null;
      const question = formData.get("question") as string | null;

      if (!file) {
        return Response.json({
          answer: "Please upload a PDF file.",
        });
      }

      if (!question || question.trim() === "") {
        return Response.json({
          answer: "Question is required.",
        });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const pdfData = await pdf(buffer);

      prompt = `
You are DocMind AI.

Use ONLY the PDF content below to answer.
if question contains thank you , say:
"You're Welcome."
if question says remeber me as "some name given by the user" then throughout the chat all the user with that given name.
if the question contains "Hi" or "Hello" or any greeting then say:
"Hello,I am Docmind AI. How can i help you?"
If answer is missing, say:
"I couldn't find that in the uploaded PDF."

PDF Content:
${pdfData.text.slice(0,6000)}

Question:
${question}
`;
    }

    /* ---------------- INVALID ---------------- */
    else {
      return Response.json({
        answer: "Unsupported request type.",
      });
    }

    /* ---------------- GROQ ---------------- */
    const completion =
      await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "No answer found.";

    return Response.json({
      answer,
    });
  } catch (error:any) {
 console.error(error);
 return Response.json({
   answer: error.message
 });

    
  }
}