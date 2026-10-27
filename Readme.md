# Meetzy

**An AI meeting assistant that listens live, transcribes as the conversation happens, and surfaces the key points in real time.**

Meetzy turns a messy stream of speech into structured, scannable notes while the meeting is still going on, so nobody has to choose between paying attention and taking notes.

---

## Features

- **Live transcription**: audio is transcribed continuously during the meeting.
- **Real-time key-point extraction**: transcript chunks are sent to the Claude API, which returns decisions, action items and summaries as they emerge.
- **Chunked processing pipeline**: the transcript is split into manageable chunks and processed through a shared queue, so slow AI calls never block incoming audio.
- **ASR noise tolerance**: prompts are designed to handle filler words, mis-heard words and broken sentences from speech recognition.
- **Structured prompting**: XML-tagged sections for both input and output keep the model's responses consistent and easy to parse.
- **Authentication**: JWT-based login with a React + Zustand frontend.

---

## Architecture

```
 Audio input
     │
     ▼
 Live transcription (ASR)
     │
     ▼
 Chunker ──► Shared queue ──► Worker(s)
                                  │
                                  ▼
                     Claude API (XML-structured prompt)
                                  │
                                  ▼
                  Key points / action items / summary
                                  │
                                  ▼
                           Client UI (React)
```

**Why a shared queue?** Transcription produces data at the speed of speech, while LLM calls take variable time. A queue decouples the two: chunks are enqueued as fast as they arrive and processed at whatever pace the API allows, in order, without dropping audio.

---

## Tech Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Frontend      | React, Zustand            |
| Backend       | Node.js, Express          |
| Database      | MongoDB                   |
| Auth          | JWT                       |
| AI            | Claude API (Anthropic)    |
| Transcription | Live speech-to-text (ASR) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- An Anthropic API key

### Installation

```bash
git clone https://github.com/<your-username>/meetzy.git
cd meetzy

# backend
cd server
npm install

# frontend
cd ../client
npm install
```

### Environment variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/meetzy
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite prints).

---

## How the AI pipeline works

1. **Capture**: speech is transcribed into text segments.
2. **Chunk**: segments are grouped into chunks of a fixed size so each API call has enough context to be useful but stays fast.
3. **Queue**: chunks go onto a shared queue.
4. **Prompt**: each chunk is wrapped in XML-tagged sections (for example transcript, prior context, instructions) so the model can clearly tell input from instructions.
5. **Extract**: Claude returns structured key points, also in XML tags, which the backend parses.
6. **Display**: the parsed points are pushed to the UI as the meeting continues.

The prompt tells the model to expect ASR artifacts (stutters, homophones, missing punctuation) and to infer intent rather than quote errors.

---

## Project Structure

```
meetzy/
├── client/          # React frontend (Zustand state, auth, live UI)
├── server/          # Express API, auth, queue, Claude integration
└── README.md
```

> Adjust folder names to match your repo.

---

## Roadmap

- [ ] Speaker diarization (who said what)
- [ ] Post-meeting summary and exportable notes
- [ ] Meeting history and search
- [ ] Calendar integration

---

## Author

**Tanishq**: Computer Science student building full-stack and systems projects.

---

## License

MIT
