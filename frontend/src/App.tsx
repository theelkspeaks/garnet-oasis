import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@garnet-oasis/shared'

function App() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    newSocket.on('connected', (data) => {
      setSessionId(data.sessionId)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      newSocket.close()
    }
  }, [])

  const handleJoinRoom = () => {
    if (socket) {
      socket.emit('join-room', 'test-room')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Garnet Oasis</h1>
      <div>
        <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        {sessionId && <p>Session ID: {sessionId}</p>}
      </div>
      <button onClick={handleJoinRoom} disabled={!connected}>
        Join Test Room
      </button>
    </div>
  )
}

export default App

