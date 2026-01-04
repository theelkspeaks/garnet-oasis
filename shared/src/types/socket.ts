/**
 * Socket event type definitions for client-server communication
 * These types ensure type safety across frontend and backend
 */

// Generic event payload types
export interface BaseEvent {
  timestamp: number;
}

export interface ErrorEvent extends BaseEvent {
  error: string;
  code?: string;
}

// Client to Server Events
export interface ClientToServerEvents {
  // Connection events
  'join-room': (roomId: string) => void;
  'leave-room': (roomId: string) => void;
  
  // Generic action event (customize based on your game)
  'action': (data: unknown) => void;
  
  // Ping for connection health
  'ping': () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Connection events
  'connected': (data: { sessionId: string }) => void;
  'room-joined': (data: { roomId: string; participants: string[] }) => void;
  'room-left': (data: { roomId: string }) => void;
  'participant-joined': (data: { participantId: string }) => void;
  'participant-left': (data: { participantId: string }) => void;
  
  // State updates
  'state-update': (data: unknown) => void;
  
  // Action responses
  'action-accepted': (data: unknown) => void;
  'action-rejected': (error: ErrorEvent) => void;
  
  // Pong for connection health
  'pong': () => void;
  
  // Error handling
  'error': (error: ErrorEvent) => void;
}

// Socket data types
export interface SocketData {
  userId?: string;
  roomId?: string;
}

