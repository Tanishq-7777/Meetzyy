# Meetzy

**An AI meeting assistant that listens live, transcribes as the conversation happens, and surfaces the key points in real time.**

Meetzy captures your microphone and the audio of a browser tab (for example a Google Meet or Zoom web call), streams it to a backend in short chunks, transcribes it with Whisper, and uses an LLM to pull out decisions, action items, risks and open questions while the meeting is still going on. Every meeting is saved, so you can revisit the full transcript and key points later.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Using the app](#using-the-app)
- [API and socket reference](#api-and-socket-reference)
- [Plans and tokens](#plans-and-tokens)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Features

- **Live transcription**: audio is recorded in 10-second chunks, converted with ffmpeg and transcribed by Groq's `whisper-large-v3-turbo`.
- **Real-time key points**: every three transcribed chunks, the new text (plus a little earlier context) is sent to `openai/gpt-oss-120b` on Groq, which returns at most three structured points, each labelled `decision`, `action`, `risk`, `question` or `info`.
- **Duplicate-free notes**: the prompt includes the last ten captured points so the model does not repeat itself, and it is told to ignore greetings, filler and audio-check chatter.
- **Speech-recognition tolerance**: the prompt tells the model the transcript contains recognition errors and to leave out details it is unsure about instead of guessing.
- **Mic + tab audio**: your voice and the other participants' audio (shared tab) are mixed into one stream with the Web Audio API.
- **Non-blocking pipeline**: chunks go into an in-memory queue and are processed one at a time, so slow API calls never block incoming audio.
- **Meeting history**: every meeting, its transcript and its key points are stored in MongoDB and can be reopened.
- **Accounts**: email/password sign-up and login with a JWT stored in an HTTP-only cookie.
- **Token-based plans**: a free allowance, with paid plans purchased through Razorpay.
- **Resume a meeting**: a refresh does not lose an active meeting; the client re-joins it by ID.

---

## Tech stack

| Layer          | Technology                                                           |
| -------------- | -------------------------------------------------------------------- |
| Frontend       | React 19, Vite 8, React Router 7, Zustand, Axios, socket.io-client   |
| Backend        | Node.js, Express 5, Socket.IO 4                                      |
| Database       | MongoDB via Mongoose 9                                               |
| Auth           | bcrypt password hashing, JWT in an HTTP-only cookie                  |
| Transcription  | Groq `whisper-large-v3-turbo`                                        |
| Key-point LLM  | Groq `openai/gpt-oss-120b` (JSON output mode)                        |
| Audio handling | ffmpeg (webm/opus to 16 kHz mono WAV), tiktoken for usage metering   |
| Payments       | Razorpay (orders + signed webhook)                                   |
| Hosting (as configured) | Backend on Render (Docker), frontend on Vercel             |

---

## How it works

```
 Browser                                   Backend (Express + Socket.IO)
 ───────                                   ─────────────────────────────
 Mic ─┐
      ├─ Web Audio mixer ─ MediaRecorder ─► "audio-chunk" (10 s webm/opus)
 Tab ─┘                                              │
                                                     ▼
                                           In-memory processing queue
                                                     │
                                  token check ─► ffmpeg → 16 kHz mono WAV
                                                     │
                                                     ▼
                                       Groq Whisper (transcription)
                                                     │
                       "live-transcript" ◄───────────┤  saved to MongoDB
                                                     │
                                  every 3 chunks ────▼
                                       Groq gpt-oss-120b (key points, JSON)
                                                     │
                 "key-points", "remainingToken" ◄────┘  saved + tokens deducted
```

1. The user starts a meeting; the server creates a `Meeting` and the browser joins its Socket.IO room.
2. The browser asks for microphone access and for a screen/tab share **with audio**, mixes both, and records 10-second chunks.
3. Each chunk is queued. The worker checks the user's tokens, converts the chunk with ffmpeg, and transcribes it. Junk results (very short text, "thank you", "bye", and similar) are discarded.
4. Transcript text is pushed to the room immediately and appended to the meeting's transcript document.
5. Once three new chunks have accumulated, they are analysed for key points, which are streamed to the UI and stored.
6. Token usage is calculated from the transcript and model output, and the user's remaining balance is pushed to the client. If it reaches zero, the meeting is stopped.

---

## Project structure

```
Meetzyy/
├── Backend/
│   ├── app.js                 # Express app, CORS, routes, HTTP + Socket.IO server
│   ├── Dockerfile             # node:20 image with ffmpeg, runs `node app.js`
│   ├── database/connectDB.js  # Mongoose connection (exits the process on failure)
│   ├── middlewares/userAuth.js# JWT cookie check
│   ├── models/                # user, meeting, transcripts, payment
│   ├── Routers/               # authRouter, meetRouter, payment
│   ├── utils/socket.js        # Socket.IO events, queue, ffmpeg, Whisper, key points
│   └── validation/validation.js
├── Frontend/
│   ├── constants.js           # BASE_URL of the backend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx            # Routes
│       ├── firebase.js        # Firebase client config
│       ├── components/        # Landing, Login, Signup, Meeting, NewMeeting,
│       │                      # MeetingHistory, Payment, Navbar, ProtectedRoute …
│       └── store/             # Zustand stores: auth and socket/recording
├── start-meetzy.sh            # Optional helper: install, verify, start (see below)
└── README.md
```

---

## Getting started

### Prerequisites

| Requirement | Version / notes |
| ----------- | --------------- |
| Node.js     | `^20.19` or `>=22.12` (required by Vite 8 and Mongoose 9) |
| npm         | Bundled with Node |
| ffmpeg      | Must be on your `PATH` (`sudo apt install ffmpeg`, `brew install ffmpeg`) |
| MongoDB     | Local instance or MongoDB Atlas connection string |
| Groq API key | Used for transcription and key-point extraction |
| OpenRouter API key | Required for the backend to boot (see [Configuration](#configuration)) |
| Razorpay test keys | Required for the backend to boot; used for payments |
| Browser     | Chrome, Chromium, Edge or Brave (needed for tab-audio capture) |

### Option A: the helper script (recommended)

`start-meetzy.sh` installs dependencies, checks everything below, runs the available checks and starts both servers. It never edits project files and never creates a `.env`.

```bash
chmod +x start-meetzy.sh
./start-meetzy.sh --check-only   # install and verify only
./start-meetzy.sh                # install, verify, then start backend + frontend
```

| Option | Effect |
| ------ | ------ |
| `--backend-only` / `--frontend-only` | Run just one half |
| `--check-only` | Install and check, but do not start anything |
| `--skip-network` | Skip the MongoDB / Groq / OpenRouter connectivity checks |
| `--reinstall` | Run `npm ci` even if `node_modules` exists (this replaces `node_modules`) |
| `--project-dir DIR` | Folder containing `Backend/` and `Frontend/` |

### Option B: manual

```bash
# 1. Backend
cd Backend
npm ci
# create Backend/.env (see Configuration)
node app.js                      # listens on http://localhost:7777

# 2. Frontend (in a second terminal)
cd Frontend
npm ci
npm run dev                      # http://localhost:5173
```

> The backend has no `start` script. Its entry point is `app.js` (the `main` field in `package.json` points at a file that does not exist).

### Point the frontend at your local backend

`Frontend/constants.js` ships pointing at the hosted backend:

```js
export const BASE_URL = "https://meetzyy-backend.onrender.com";
// export const BASE_URL = "http://localhost:7777";
```

To develop against your own backend, comment the first line and uncomment the second. Run the frontend on port **5173**: that is the only local origin the backend's CORS configuration allows.

---

## Configuration

### Backend environment variables

Create `Backend/.env` (it is already git-ignored). The backend reads it from its own folder, so start it from `Backend/`.

```env
# Required: the server will not start without these
MONGO_URI=mongodb://localhost:27017/meetzy
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

# Needed for payments to work
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Optional
PORT=7777
FFMPEG_PATH=C:\path\to\ffmpeg.exe   # Windows only; otherwise `ffmpeg` is taken from PATH
```

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `GROQ_API_KEY` | Yes | Whisper transcription and key-point extraction |
| `OPENROUTER_API_KEY` | Yes (to boot) | An OpenRouter client is created at startup and the SDK throws if the key is missing. The current code does not send any request through it. |
| `RAZORPAY_KEY_ID` | Yes (to boot) | Razorpay client; also returned to the browser when opening checkout |
| `RAZORPAY_KEY_SECRET` | For payments | Creating Razorpay orders |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Verifying the payment webhook signature |
| `PORT` | No | Defaults to `7777` |
| `FFMPEG_PATH` | No | Only used on Windows |

Use Razorpay **test** keys (`rzp_test_…`) while developing so no real payment is made.

### Frontend configuration

The frontend has no environment variables. The backend URL is set in `Frontend/constants.js`, and the Firebase client config is in `Frontend/src/firebase.js`.

---

## Using the app

1. Open `http://localhost:5173`, sign up and log in.
2. Start a new meeting from the **Meeting** page.
3. When the browser asks, allow the **microphone**, then in the share dialog choose a **Chrome tab** and tick **"Also share tab audio"**.
4. Talk. The live transcript and key points appear as they are produced, and your token balance updates.
5. Stop the meeting to end recording. Past meetings, with transcripts and key points, are available from the meeting list.

**Frontend routes:** `/` (landing), `/signup`, `/login`, `/meeting`, `/meeting/newmeeting/:meetingId` (live view), `/meeting/:meetingId` (history), `/payment`. All except the first three require login.

---

## API and socket reference

### REST (Express)

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/signup` | – | Create an account and set the auth cookie |
| POST | `/auth/login` | – | Log in and set the auth cookie |
| POST | `/auth/logout` | – | Clear the cookie |
| GET | `/auth/profile` | Cookie | Current user (name, email, remaining tokens, plan) |
| GET | `/meeting/allmeetings` | Cookie | List the user's meetings |
| GET | `/meeting/:meetingId` | Cookie | One meeting with its transcript and key points |
| POST | `/api/payment/create` | Cookie | Create a Razorpay order for a plan |
| POST | `/api/payment/webhook` | Signature | Razorpay webhook; upgrades the plan on capture |

### Socket.IO events

| Direction | Event | Payload |
| --------- | ----- | ------- |
| client → server | `startMeeting` | `{ _id: userId }` |
| client → server | `resumeMeeting` | `{ meetingId }` |
| client → server | `audio-chunk` | `(arrayBuffer, userId, meetingId)` |
| server → client | `meetingStarted` / `meetingResumed` | `{ meetingId }` |
| server → client | `meetingInvalid` | – |
| server → client | `live-transcript` | `{ text, meetingId }` |
| server → client | `key-points` | `{ keyPoints }` (markdown bullets) |
| server → client | `remainingToken` | `{ remainingToken }` |
| server → client | `insufficient-tokens` | `{ message }` |

### Data models

`User` (name, email, password hash, `remainingToken` default 100, `membershipType` default `Free`, `token_buffer`), `Meeting` (user, title, `isActive`, start/end), `Transcript` (meeting, `text[]`, `keyPoints[]`) and `Payment` (user, Razorpay order details, status).

---

## Plans and tokens

New accounts start with **100 tokens** on the `Free` plan. Usage is metered from the amount of transcript processed and the size of the model's output; the balance is reduced in whole tokens as the internal counter fills. When the balance reaches zero the meeting is stopped, the user is dropped to `Free`, and the app sends them to the payment page.

| Plan | Price | Tokens granted |
| ---- | ----- | -------------- |
| Silver | ₹149 | 3,000 |
| Gold | ₹299 | 6,000 |
| Platinum | ₹499 | 10,000 |

Prices are set in `Backend/Routers/payment.js` (amounts in paise) and token grants in the webhook handler.

---

## Deployment

- **Backend**: `Backend/Dockerfile` builds a `node:20` image, installs ffmpeg, runs `npm install --production` and starts `node app.js` on port **7777**. Provide the environment variables above on your host (it is configured for Render).
- **Frontend**: a standard Vite app; `npm run build` produces `dist/` (configured for Vercel). Set `BASE_URL` in `constants.js` to your backend's public URL before building.
- **CORS**: allowed origins are hard-coded in `Backend/app.js` and `Backend/utils/socket.js`. Add your own domain to both lists when deploying elsewhere.
- **Cookies** are issued with `Secure` and `SameSite=None`, so production traffic must be HTTPS (browsers treat `localhost` as secure, so local development works).
- **Razorpay webhook**: point it at `https://<your-backend>/api/payment/webhook` and subscribe to payment events.

---

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `Recording failed: … No audio tracks in MediaStream` | The shared tab/screen had no audio. Use Chrome/Chromium/Edge, choose a **Chrome tab**, and tick **"Also share tab audio"**. Window or whole-screen sharing carries no audio on Linux, and Firefox cannot capture it at all. |
| Backend exits immediately with `GROQ_API_KEY … missing`, `Missing credentials` or ``key_id … is mandatory`` | A required environment variable is not set; see [Configuration](#configuration). |
| `❌ Error: connect ECONNREFUSED` / `uri must be a string` | MongoDB is not running or `MONGO_URI` is missing or wrong. |
| Transcript never appears, "Invalid chunk skipped" in the backend log | ffmpeg is missing or cannot decode the chunk. Check `ffmpeg -version`. |
| Login works but requests return 401, or CORS errors | The frontend is not on `http://localhost:5173`, or `BASE_URL` points at a different backend than the one you are logging in to. |
| Local frontend shows hosted data | `Frontend/constants.js` still points at the hosted backend; see [Point the frontend at your local backend](#point-the-frontend-at-your-local-backend). |
| Port in use | Stop the other process; the frontend must use 5173 for CORS to work. |

---

## Known limitations

These are visible in the current code and worth addressing before a production launch:

- The JWT signing secret is hard-coded in `authRouter.js` and `userAuth.js`; it should come from an environment variable.
- The payment webhook verifies the signature against `JSON.stringify(req.body)` instead of the raw request body (the raw-body middleware in `app.js` is commented out), which can cause valid webhooks to be rejected. It also logs the webhook secret and payment details to the console.
- The token grants in the webhook are set for any status of event; only `payment.captured` should upgrade a user.
- The Razorpay client and `openai` client are created at module load, so the server cannot boot without their keys even if those features are unused.
- `package.json` for the backend has no `start`/`dev` scripts, an invalid `main`, and no real tests; `groq`, `stream`, `multer` and `zustand` are listed as dependencies but never imported.
- The frontend currently has existing ESLint errors (mostly unused variables), and its backend URL is hard-coded rather than read from an environment variable.
- Audio is processed through temporary files written beside `utils/socket.js` and deleted after each chunk.

---

## License

MIT. Add a `LICENSE` file to the repository root if one is not already present.
