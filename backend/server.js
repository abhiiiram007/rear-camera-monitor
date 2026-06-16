const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.get("/", (req, res) => {
  res.send("Backend running");
});
app.use(cors());

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
   origin: "https://rear-camera-monitor.vercel.app",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`${socket.id} joined ${roomId}`);

    socket.to(roomId).emit("peer-joined");
  });
  

  socket.on("pair-request", (roomId) => {
    console.log("Pair request:", roomId);

    socket.to(roomId).emit("pair-request");
  });

  socket.on("pair-accepted", (roomId) => {
    console.log("Pair accepted:", roomId);

    socket.to(roomId).emit("pair-accepted");
  });

 socket.on("offer", ({ roomId, offer }) => {
  console.log("Offer arrived in backend:", roomId);

  socket.to(roomId).emit("offer", offer);
});

// NEW
socket.on("answer", ({ roomId, answer }) => {
  console.log("ANSWER ARRIVED");
  console.log(roomId);

  socket.to(roomId).emit("answer", answer);

  console.log("ANSWER FORWARDED");
});

// NEW
socket.on("ice-candidate", ({ roomId, candidate }) => {
  socket.to(roomId).emit("ice-candidate", candidate);
});

 socket.on(
  "receiver-disconnected",
  (roomId) => {
    socket
      .to(roomId)
      .emit("receiver-disconnected");
  }
);
socket.on(
  "sender-disconnected",
  (roomId) => {
    socket
      .to(roomId)
      .emit("sender-disconnected");
  }
);


socket.on(
  "pair-rejected",
  (roomId) => {
    console.log(
      "PAIR REJECTED:",
      roomId
    );

    socket
      .to(roomId)
      .emit("pair-rejected");
  }
);
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});