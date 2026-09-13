import { io } from "socket.io-client";

const socket = io({
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("🔌 Connected to server successfully!", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

export default socket;
