/**
 * Common types used across frontend and backend
 */

export interface User {
  id: string;
  username?: string;
  connectedAt: number;
}

export interface Room {
  id: string;
  participants: string[];
  createdAt: number;
  status: 'waiting' | 'active' | 'finished';
}

export interface Session {
  id: string;
  userId: string;
  connectedAt: number;
}

