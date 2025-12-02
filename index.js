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

const app = express();
const server = http.createServer(app);

// ============= SOCKET.IO =============
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Map to store connected users (userId → socketId)
const connectedUsers = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("user-connected", (userId) => {
    connectedUsers[userId] = socket.id;
    console.log("Kullanıcı bağlandı:", userId);
  });

  socket.on("send-message", (data) => {
    const receiverSocket = connectedUsers[data.to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive-message", data);
    }
  });

  socket.on("disconnect", () => {
    for (let uid in connectedUsers) {
      if (connectedUsers[uid] === socket.id) {
        delete connectedUsers[uid];
        break;
      }
    }
  });
});

// ======================================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", auth);
app.use("/api/users", users);
app.use("/api/messages", messages);

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
