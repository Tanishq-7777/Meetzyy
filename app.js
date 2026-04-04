const express = require("express");
const dotenv = require("dotenv");
const connectDb = require("./database/connectDB");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRouter = require("./Routers/authRouter");
const meetRouter = require("./Routers/meetRouter");
const http = require("http");

const PORT = process.env.PORT || 7777;

dotenv.config();
app.use(
  cors({
    origin: [
      "https://meetzyy.tanishqsaxena.xyz/",
      "https://meetzyy-frontend.vercel.app/",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRouter);
app.use("/meeting", meetRouter);

const server = http.createServer(app);
const initializeSocket = require("./utils/socket");

initializeSocket(server);

const startServer = async () => {
  try {
    await connectDb();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server start error:", err);
  }
};

startServer();
