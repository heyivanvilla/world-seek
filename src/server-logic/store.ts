import type { ChatMessage, Room } from "../shared/types";

// In-memory room store. Lost on restart (acceptable for local dev / MVP).
const rooms = new Map<string, Room>();

// socketId -> where that socket is seated, so disconnects can be resolved.
const sockets = new Map<string, { code: string; playerId: string }>();

// Per-room chat history, capped at MAX_HISTORY messages.
const chatHistory = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 200;

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toLowerCase());
}

export function saveRoom(room: Room): void {
  rooms.set(room.code, room);
}

export function deleteRoom(code: string): void {
  const key = code.toLowerCase();
  rooms.delete(key);
  chatHistory.delete(key);
}

export function getChatHistory(code: string): ChatMessage[] {
  return chatHistory.get(code.toLowerCase()) ?? [];
}

export function addChatMessage(code: string, msg: ChatMessage): void {
  const key = code.toLowerCase();
  const hist = chatHistory.get(key) ?? [];
  hist.push(msg);
  if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
  chatHistory.set(key, hist);
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
