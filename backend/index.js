require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const AppError = require("./utils/AppError");
const errorHandler = require("./middleware/errorHandler");

// Import modular routers
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const alertRoutes = require("./routes/alertRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const chatRoutes = require("./routes/chatRoutes");
const Chat = require("./models/Chat");

// Import report controller and middleware for legacy route mapping
const reportController = require("./controllers/reportController");
const { optionalAuth } = require("./middleware/auth");
const { reportLimiter } = require("./middleware/rateLimiter");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB Connection
connectDB();

// Create HTTP server and integrate Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Mount socket.io instance on Express app to reference in controllers
app.set("socketio", io);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected to WebSockets: ${socket.id}`);

  // Join a city specific discussion room
  socket.on("join-city-room", (city) => {
    const roomName = `room_${city.toLowerCase().trim()}`;
    socket.join(roomName);
    console.log(`👤 Client ${socket.id} joined room: ${roomName}`);
  });

  // Leave a city specific discussion room
  socket.on("leave-city-room", (city) => {
    const roomName = `room_${city.toLowerCase().trim()}`;
    socket.leave(roomName);
    console.log(`👤 Client ${socket.id} left room: ${roomName}`);
  });

  // Handle message sending in a room
  socket.on("send-chat-msg", async (data) => {
    try {
      const { city, sender, message } = data;
      if (!city || !message) return;

      const savedChat = await Chat.create({
        city: city.trim(),
        sender: sender || "Anonymous",
        message: message.trim(),
      });

      const broadcastPayload = {
        id: savedChat._id,
        city: savedChat.city,
        sender: savedChat.sender,
        message: savedChat.message,
        createdAt: savedChat.createdAt,
      };

      const roomName = `room_${city.toLowerCase().trim()}`;
      io.to(roomName).emit("incoming-chat-msg", broadcastPayload);
      console.log(`💬 Message broadcasted to ${roomName}: "${message}"`);
    } catch (err) {
      console.error("❌ Failed to broadcast chat message:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected from WebSockets: ${socket.id}`);
  });
});

// Health route
app.get("/", (req, res) => {
  res.status(200).send("✅ DisasterWatch AI backend running with MongoDB & Clean Architecture");
});

// Modular Routes (Fully compliant with frontend API client URLs)
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/alerts", alertRoutes);
app.use("/predict-risk", predictionRoutes);
app.use("/weather", weatherRoutes);
app.use("/chats", chatRoutes);

// Direct binding for legacy /report submissions
app.post("/report", reportLimiter, optionalAuth, reportController.createReport);

// Fallback catch-all middleware for unregistered endpoints
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Express server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  console.log("📂 Endpoints successfully mapped:");
  console.log("   - GET  /                     (Health check)");
  console.log("   - POST /auth/register        (Register user)");
  console.log("   - POST /auth/login           (Login user)");
  console.log("   - GET  /auth/me              (Verify token)");
  console.log("   - GET  /reports              (Fetch all reports)");
  console.log("   - GET  /reports/nearby       (Geospatial proximity search)");
  console.log("   - POST /report               (Submit incident report)");
  console.log("   - GET  /alerts               (Fetch active alerts)");
  console.log("   - POST /predict-risk         (Predict risk level via Python model)");
  console.log("   - GET  /weather/:city        (Get precipitation & geocoded coordinates)");
});
