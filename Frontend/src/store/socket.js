import io from "socket.io-client";

export const createSocketConnection = (serverUrl) => {
  return io(serverUrl);
};
