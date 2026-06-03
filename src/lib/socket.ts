"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

/** Emit an event and resolve with its ack payload. */
export function emitAck<T>(event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => {
    getSocket().emit(event, payload, (res: T) => resolve(res));
  });
}
