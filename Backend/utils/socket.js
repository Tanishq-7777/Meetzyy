const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const socket = require("socket.io");
const OpenAI = require("openai");
const Groq = require("groq-sdk");
const Transcript = require("../models/transcripts");
const Meeting = require("../models/meeting");
const tiktoken = require("tiktoken");
const User = require("../models/user");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const encoder = tiktoken.encoding_for_model("gpt-4");

const ffmpegCommand =
  process.platform === "win32" && process.env.FFMPEG_PATH
    ? process.env.FFMPEG_PATH
    : "ffmpeg";

const processingQueue = [];
let isProcessing = false;

const junkRegex =
  /^(thank you\.?|thanks for watching[.!]?|you|bye\.?|\.+|um+\.?|uh+\.?)$/i;

const systemPrompt = `You are an expert meeting note-taker producing LIVE key points from an auto-transcribed conversation.

INPUT
- "Context" is earlier conversation, for understanding only. Never extract points from it.
- "New transcript" is the part to analyze.
- "Already captured" lists key points already shown to the user.

WHAT COUNTS AS A KEY POINT
Extract only items with lasting value:
- Decisions made ("We'll launch on the 15th")
- Action items, with owner and deadline if stated
- Deadlines, dates, numbers, budgets, metrics
- Problems, blockers or risks raised
- Important questions left unanswered
- Clear conclusions or agreements

WHAT TO IGNORE
Greetings, small talk, filler, repetition, audio or tech issues ("can you hear me?"), and vague chatter with no information.

RULES
1. Each point is ONE self-contained sentence, max 25 words, written so it makes sense without the transcript.
2. Start with the substance. Use names or numbers if they were said. Never write "the speaker discussed...".
3. Do NOT repeat or rephrase anything in "Already captured". If a point only adds a small detail to an old one, skip it.
4. Never invent facts, names, or dates. The transcript has speech-recognition errors, so if a word looks garbled and you are unsure, leave that detail out.
5. Return at most 3 points. If nothing important was said, return an empty list. Never pad.
6. Write in the same language as the transcript.
7. Label each point with a type: "decision", "action", "risk", "question", or "info".

OUTPUT
Return ONLY valid JSON, no markdown, no commentary:
{"key_points":[{"type":"decision|action|risk|question|info","text":"..."}]}`;

async function processQueue(io) {
  if (isProcessing) return;
  isProcessing = true;

  while (processingQueue.length > 0) {
    const item = processingQueue.shift();
    if (!item) break;

    const { data, userId, meetingId } = item;

    const id = Date.now();
    const inputPath = path.join(__dirname, `input-${id}.webm`);
    const outputPath = path.join(__dirname, `output-${id}.wav`);

    try {
      const user = await User.findById(userId);

      if (!user) {
        console.log(`Skipping AI processing: User ${userId} not found.`);
        continue;
      }

      if (user.remainingToken <= 0) {
        user.remainingToken = 0;
        user.membershipType = "Free";
        await user.save();

        await Meeting.findByIdAndUpdate(meetingId, { isActive: false });

        io.to(meetingId).emit("insufficient-tokens", {
          message:
            "Meeting stopped: You have 0 tokens remaining. Please upgrade to continue.",
        });

        console.log(`Skipping AI processing: User ${userId} has no tokens.`);
        continue;
      }

      fs.writeFileSync(inputPath, data);

      await new Promise((resolve) => {
        execFile(
          ffmpegCommand,
          ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", outputPath],
          (err, stdout, stderr) => {
            if (err) {
              console.log("⚠️ Invalid chunk skipped");
              console.log("FFmpeg message:", err.message);
              console.log("FFmpeg stderr:", stderr);
            }
            resolve();
          },
        );
      });

      if (!fs.existsSync(outputPath)) continue;

      const transcript = await groq.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-large-v3-turbo",
      });

      const transcriptText = transcript.text.trim();

      if (transcriptText.length < 8 || junkRegex.test(transcriptText)) {
        continue;
      }

      const voiceOutputEncodings = encoder.encode(transcriptText);

      io.to(meetingId).emit("live-transcript", {
        text: transcriptText,
        meetingId,
      });

      let doc = await Transcript.findOne({ meetingId });
      if (!doc) {
        doc = new Transcript({ meetingId, text: [transcriptText] });
      } else {
        doc.text.push(transcriptText);
      }

      const analyzedUpTo = doc.analyzedUpTo || 0;
      const pendingChunks = doc.text.length - analyzedUpTo;

      if (pendingChunks >= 3) {
        const content = doc.text.slice(analyzedUpTo).join(" ");
        const previousContent = doc.text
          .slice(Math.max(0, analyzedUpTo - 3), analyzedUpTo)
          .join(" ");
        const lastKeyPoints = (doc.keyPoints || []).slice(-10);

        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Context (do not extract from this):\n${previousContent || "None"}\n\nNew transcript (extract from this):\n${content}\n\nAlready captured key points (do not repeat):\n${
                lastKeyPoints.length > 0
                  ? lastKeyPoints
                      .map((point, i) => `${i + 1}. ${point}`)
                      .join("\n")
                  : "None"
              }`,
            },
          ],
        });

        const rawOutput = completion.choices[0]?.message?.content || "{}";

        let newPoints = [];
        try {
          newPoints = (JSON.parse(rawOutput).key_points || []).filter(
            (point) => point && point.text,
          );
        } catch (err) {
          console.error("Key points JSON parse failed:", rawOutput);
        }

        doc.analyzedUpTo = doc.text.length;

        const outputTextTokens = encoder.encode(rawOutput);

        const transcriptTokens = voiceOutputEncodings.length;
        const summaryTokens = outputTextTokens.length;
        const totalTokens = summaryTokens + Math.floor(transcriptTokens / 5);

        user.token_buffer += totalTokens;
        const tokensToDeduct = Math.floor(user.token_buffer / 120);

        if (tokensToDeduct > 0) {
          user.remainingToken -= tokensToDeduct;
          user.token_buffer -= tokensToDeduct * 120;
        }

        if (user.remainingToken <= 0) {
          user.remainingToken = 0;
          user.membershipType = "Free";
          io.to(meetingId).emit("insufficient-tokens", {
            message: "Tokens exhausted.",
          });
        }

        io.to(meetingId).emit("remainingToken", {
          remainingToken: user.remainingToken,
        });
        await user.save();

        if (newPoints.length > 0) {
          const newPointsText = newPoints
            .map((point) => `- ${point.text}`)
            .join("\n");

          io.to(meetingId).emit("key-points", { keyPoints: newPointsText });
          doc.keyPoints.push(newPointsText);
        }
      }

      await doc.save();
    } catch (err) {
      console.error("Queue Processing Error:", err);
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }
  isProcessing = false;
}

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: [
        "https://meetzyy.tanishqsaxena.xyz",
        "https://meetzyy-frontend.vercel.app",
        "http://localhost:5173",
      ],
    },
  });

  io.on("connection", (socket) => {
    socket.on("startMeeting", async (data) => {
      const meeting = await Meeting.create({ userId: data._id });
      const meetingId = meeting._id.toString();

      socket.join(meetingId);
      console.log(`Socket ${socket.id} joined meeting room: ${meetingId}`);

      socket.emit("meetingStarted", { meetingId });
    });

    socket.on("resumeMeeting", async ({ meetingId }) => {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting || !meeting.isActive) {
        return socket.emit("meetingInvalid");
      }

      socket.join(meetingId);
      console.log(`Socket ${socket.id} re-joined room: ${meetingId}`);

      socket.emit("meetingResumed", { meetingId });
    });

    socket.on("audio-chunk", async (data, userId, meetingId) => {
      try {
        socket.join(meetingId);

        processingQueue.push({ data, userId, meetingId });
        processQueue(io);
      } catch (err) {
        console.error(err);
      }
    });
  });
};

module.exports = initializeSocket;
