import io from "socket.io-client";

const socket = io(
  "https://rear-camera-monitor.onrender.com",
  {
    transports: ["websocket", "polling"],
  }
);

export default socket;