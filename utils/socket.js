const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const socket = require("socket.io");
const OpenAI = require("openai");
const Groq = require("groq-sdk");
const Transcript = require("../models/transcripts");
const Meeting = require("../models/meeting");
const tiktoken = require("tiktoken");
const User = require("../models/user");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `You are Meetzy, an AI meeting assistant.

Your job is to continuously analyze conversation chunks from an ongoing meeting and generate concise, useful key points.

Rules:

1. Return ONLY markdown.
2. Never return JSON, objects, arrays, code blocks, or explanations.
3. Avoid repeating information that already exists in the previous key points.
4. Focus only on NEW information introduced in the current conversation chunk.
5. Merge similar ideas into one point.
6. Ignore greetings, filler words, interruptions, and casual chatter.
7. Prefer decisions, action items, deadlines, requirements, bugs, problems, feature requests, and important discussions.
8. If nothing important was discussed, return exactly:

*No new important points.*

Output format:

### Key Points

* First important point.
* Second important point.

Keep the points short and professional.
Maximum 2 bullet points.
`;
const encoder = tiktoken.encoding_for_model("gpt-4");

const processingQueue = [];
let isProcessing = false;

async function processQueue(io) {
  if (isProcessing) return;
  isProcessing = true;

  while (processingQueue.length > 0) {
    const item = processingQueue.shift();
    if (!item) break;

    const { data, userId, meetingId } = item;

    try {
      const user = await User.findById(userId);

      if (!user || user.remainingToken <= 0) {
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

      const id = Date.now();
      const inputPath = path.join(__dirname, `input-${id}.webm`);
      const outputPath = path.join(__dirname, `output-${id}.wav`);
      fs.writeFileSync(inputPath, data);

      await new Promise((resolve) => {
        exec(
          `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 "${outputPath}"`,
          (err) => {
            if (err) console.log("⚠️ Invalid chunk skipped");
            resolve();
          },
        );
      });

      if (!fs.existsSync(outputPath)) continue;

      const transcript = await groq.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-large-v3-turbo",
      });

      const voiceOutputEncodings = encoder.encode(transcript.text);

      io.to(meetingId).emit("live-transcript", {
        text: transcript.text,
        meetingId,
      });

      let doc = await Transcript.findOne({ meetingId });
      if (!doc) {
        doc = new Transcript({ meetingId, text: [transcript.text] });
      } else {
        doc.text.push(transcript.text);
      }

      const lastChunks = doc.text.slice(-3);
      const lastKeyPoint =
        doc.keyPoints?.length > 0
          ? doc.keyPoints[doc.keyPoints.length - 1]
          : "None";

      if (lastChunks.length >= 3) {
        const content = lastChunks.join(" ");
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Conversation chunk:

${content}

Previous key points:

${lastKeyPoint}

Generate only NEW key points using the required markdown format.
`,
            },
          ],
        });

        const newPoints = completion.choices[0]?.message?.content;
        const outputTextTokens = encoder.encode(newPoints);

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

        io.to(meetingId).emit("key-points", { keyPoints: newPoints });
        doc.keyPoints.push(newPoints);
      }

      await doc.save();
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Queue Processing Error:", err);
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

      // --- JOIN ROOM ---
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

    // AUDIO CHUNKS
    socket.on("audio-chunk", async (data, userId, meetingId) => {
      try {
        // We join the room here too just to be 100% safe
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
