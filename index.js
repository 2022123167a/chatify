require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const http = require("http");

// ROUTES
const auth = require("./routes/auth");
const users = require("./routes/users");
const messages = require("./routes/messages");
const groups = require("./routes/groups");

const app = express();
const server = http.createServer(app);

// ============= SOCKET.IO =============
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // يسمح لأي دومين بالاتصال بالسوكت
  }
});

// Connected users
const connectedUsers = {};

const Message = require("./models/Message");

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("user-connected", (userId) => {
    connectedUsers[userId] = socket.id;
  });

  socket.on("send-message", (data) => {
    const receiverSocket = connectedUsers[data.to];
    if (receiverSocket) io.to(receiverSocket).emit("receive-message", data);
  });

  // message delivered ack from receiver
  socket.on("message-delivered", async (data) => {
    try {
      // data: { messageId, to } where to is original sender
      if (data && data.messageId) {
        await Message.findByIdAndUpdate(data.messageId, { delivered: true, deliveredAt: Date.now() });
        const senderSocket = connectedUsers[data.to];
        if (senderSocket) io.to(senderSocket).emit("message-delivered", { messageId: data.messageId });
      }
    } catch (e) {
      console.error("message-delivered handler error", e);
    }
  });

  // message read ack
  socket.on("message-read", async (data) => {
    try {
      if (data && data.messageId) {
        await Message.findByIdAndUpdate(data.messageId, { okunma: true, readAt: Date.now() });
        const senderSocket = connectedUsers[data.to];
        if (senderSocket) io.to(senderSocket).emit("message-read", { messageId: data.messageId });
      }
    } catch (e) {
      console.error("message-read handler error", e);
    }
  });

  // reaction event: broadcast to original sender or group
  socket.on("reaction", async (data) => {
    try {
      // data: { messageId, emoji, to }
      if (!data || !data.messageId) return;
      const msg = await Message.findById(data.messageId);
      if (!msg) return;
      msg.reactions = msg.reactions || [];
      msg.reactions.push({ emoji: data.emoji, user: data.user });
      await msg.save();

      // notify the relevant sockets
      if (data.to) {
        const s = connectedUsers[data.to];
        if (s) io.to(s).emit("reaction", { messageId: data.messageId, emoji: data.emoji, user: data.user });
      }
      // always notify the sender if different
      const senderSocket = connectedUsers[msg.gonderen?.toString()];
      if (senderSocket) io.to(senderSocket).emit("reaction", { messageId: data.messageId, emoji: data.emoji, user: data.user });
    } catch (e) {
      console.error("reaction handler error", e);
    }
  });

  // typing indicator
  socket.on("typing", (data) => {
    try {
      // data: { to, groupId, fromName }
      if (data.groupId) {
        // broadcast to group room
        socket.to(`group:${data.groupId}`).emit("typing", data);
      } else if (data.to) {
        const s = connectedUsers[data.to];
        if (s) io.to(s).emit("typing", data);
      }
    } catch (e) {
      console.error("typing handler error", e);
    }
  });

  // Join a group room
  socket.on("join-group", (groupId) => {
    const room = `group:${groupId}`;
    socket.join(room);
  });

  socket.on("leave-group", (groupId) => {
    const room = `group:${groupId}`;
    socket.leave(room);
  });

  // Receive a group message and broadcast to group room
  socket.on("send-group-message", (data) => {
    // data should contain { groupId, icerik, from, fromName, createdAt }
    const room = `group:${data.groupId}`;
    // broadcast to all in room except sender
    socket.to(room).emit("receive-group-message", data);
  });

  socket.on("disconnect", () => {
    for (let uid in connectedUsers) {
      if (connectedUsers[uid] === socket.id) delete connectedUsers[uid];
    }
  });
});

// ======================================

// 🔥 CORS مضبوط لشغل Render
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API ROUTES
app.use("/api/auth", auth);
app.use("/api/users", users);
app.use("/api/messages", messages);
app.use("/api/groups", groups);

// FRONTEND ROUTE
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB bağlantısı başarılı");

    const PORT = process.env.PORT || 1000;
    server.listen(PORT, () =>
      console.log(`Sunucu ${PORT} portunda çalışıyor`)
    );
  })
  .catch((e) => console.log(e));
