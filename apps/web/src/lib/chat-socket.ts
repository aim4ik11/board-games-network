import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api";

export function createChatSocket(accessToken: string): Socket {
  return io(`${getApiBaseUrl()}/chat`, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    autoConnect: false,
  });
}

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;

export function getSharedChatSocket(accessToken: string): Socket {
  if (sharedSocket && sharedToken === accessToken) {
    if (!sharedSocket.connected) {
      sharedSocket.connect();
    }
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
  }

  sharedSocket = createChatSocket(accessToken);
  sharedToken = accessToken;
  sharedSocket.connect();
  return sharedSocket;
}

export function disconnectSharedChatSocket(): void {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedToken = null;
  }
}
