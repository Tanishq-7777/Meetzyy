const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const socket = require("socket.io");
const OpenAI = require("openai");
const Groq = require("groq-sdk");
const Transcript = require("../models/transcripts");
const Meeting = require("../models/meeting");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

      const transcript = await client.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-1",
      });

      // --- ROOM EMIT: Send to everyone in this meeting room ---
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
      // Safety check for keyPoints existence
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
              content: `You are a professional meeting analyst... (Your Prompt) ...`,
            },
            {
              role: "user",
              content: `Conversation: ${content}\n\nPreviously generated key points: ${lastKeyPoint}\n\nNow extract NEW key points only (max 2).`,
            },
          ],
        });

        const newPoints = completion.choices[0]?.message?.content;

        // --- ROOM EMIT: Send key points to the specific room ---
        io.to(meetingId).emit("key-points", {
          keyPoints: newPoints,
        });

        doc.keyPoints.push(newPoints);
      }

      await doc.save();
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error(err);
    }
  }
  isProcessing = false;
}

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: { origin: "http://localhost:5173" },
  });

  io.on("connection", (socket) => {
    // START MEETING
    socket.on("startMeeting", async (data) => {
      const meeting = await Meeting.create({ userId: data._id });
      const meetingId = meeting._id.toString();

      // --- JOIN ROOM ---
      socket.join(meetingId);
      console.log(`Socket ${socket.id} joined meeting room: ${meetingId}`);

      socket.emit("meetingStarted", { meetingId });
    });

    // RESUME MEETING
    socket.on("resumeMeeting", async ({ meetingId }) => {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting || !meeting.isActive) {
        return socket.emit("meetingInvalid");
      }

      // --- JOIN ROOM (Important for refreshes/navigates) ---
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
