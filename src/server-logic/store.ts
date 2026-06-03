import type { Room } from "../shared/types";

// In-memory room store. Lost on restart (acceptable for local dev / MVP).
const rooms = new Map<string, Room>();

// socketId -> where that socket is seated, so disconnects can be resolved.
const sockets = new Map<string, { code: string; playerId: string }>();

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toLowerCase());
}

export function saveRoom(room: Room): void {
  rooms.set(room.code, room);
}

export function deleteRoom(code: string): void {
  rooms.delete(code.toLowerCase());
}

export function bindSocket(socketId: string, code: string, playerId: string): void {
  sockets.set(socketId, { code, playerId });
}

export function lookupSocket(socketId: string) {
  return sockets.get(socketId);
}

export function unbindSocket(socketId: string): void {
  sockets.delete(socketId);
}
