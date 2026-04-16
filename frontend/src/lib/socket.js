import { io } from "socket.io-client";

const isProduction = process.env.NODE_ENV === "production";
const defaultSocketUrl = "https://project-relay-backends-for-main.onrender.com";
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  (isProduction ? defaultSocketUrl : "http://localhost:5000");

export function connectSocket(token) {
  return io(SOCKET_URL, {
    auth: token ? { token } : {},
    withCredentials: true,
    transports: ["websocket"],
  });
}
