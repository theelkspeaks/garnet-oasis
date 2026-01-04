# Garnet Oasis

Real-time multiplayer game platform with React frontend and TypeScript backend.

## Project Structure

This is a monorepo containing three main packages:

- **`frontend/`** - React application with Vite
- **`backend/`** - Node.js/Express server with Socket.IO
- **`shared/`** - Shared TypeScript types and utilities

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Setup

1. Install all dependencies:
```bash
npm install
```

2. Build the shared package (required before running frontend/backend):
```bash
npm run build --workspace=shared
```

## Development

### Run both frontend and backend:
```bash
npm run dev
```

### Run individually:

**Backend only:**
```bash
npm run dev --workspace=backend
```
Server runs on http://localhost:3001

**Frontend only:**
```bash
npm run dev --workspace=frontend
```
Frontend runs on http://localhost:3000

## Building for Production

Build all packages:
```bash
npm run build
```

## Project Features

- **Monorepo structure** with npm workspaces
- **Type-safe Socket.IO** communication between frontend and backend
- **Shared types** ensuring consistency across packages
- **Hot module replacement** for fast development
- **TypeScript** throughout for type safety

## Architecture

- Frontend connects to backend via Socket.IO WebSocket
- Shared types package ensures type safety across boundaries
- Backend handles real-time game state and player connections
- Frontend provides UI for player interactions
