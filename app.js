const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const connectDb = require("./database/connectDB");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRouter = require("./Routers/authRouter");
const meetRouter = require("./Routers/meetRouter");
const paymentRouter = require("./Routers/payment");
const http = require("http");

const PORT = process.env.PORT || 7777;

app.use(
  cors({
    origin: [
      "https://meetzyy.tanishqsaxena.xyz",
      "https://meetzyy-frontend.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);
// app.use("/api/payment/webhook", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(cookieParser());
app.get("/corn", (req, res) => {
  res.status(200).send("okkkkkkk");
});
app.use("/auth", authRouter);
app.use("/meeting", meetRouter);
app.use("/api", paymentRouter);

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
    console.error("Server start error:", err.message);
  }
};

startServer();
