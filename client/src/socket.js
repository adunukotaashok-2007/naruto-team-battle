import { io } from "socket.io-client";

const socket = io({
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
});

socket.on("connect", () => {
  console.log("🔌 Connected to server:", socket.id);
});

export default socket;
