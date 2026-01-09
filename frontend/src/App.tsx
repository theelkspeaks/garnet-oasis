import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@garnet-oasis/shared'

// Generate default guest name with random digits
const generateGuestName = (): string => {
  const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('')
  return `Guest${digits}`
}

// Validate name: alphanumeric, max 20 characters
const isValidName = (name: string): boolean => {
  return /^[a-zA-Z0-9]{1,20}$/.test(name)
}

function App() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>(generateGuestName())
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState<string>('')
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  const handleChangeNameClick = () => {
    setTempName(userName)
    setIsEditingName(true)
    // Focus the input after it's rendered
    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedName = tempName.trim()
      if (trimmedName && isValidName(trimmedName)) {
        setUserName(trimmedName)
        setIsEditingName(false)
      }
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
      setTempName('')
    }
  }

  const handleNameBlur = () => {
    const trimmedName = tempName.trim()
    if (trimmedName && isValidName(trimmedName)) {
      setUserName(trimmedName)
    }
    setIsEditingName(false)
    setTempName('')
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* User name display/edit section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {isEditingName ? (
          <>
            <input
              ref={nameInputRef}
              type="text"
              value={tempName}
              onChange={(e) => {
                const value = e.target.value
                // Only allow alphanumeric characters, max 20
                const filtered = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
                setTempName(filtered)
              }}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameBlur}
              style={{
                padding: '0.5em 1em',
                fontSize: '1em',
                fontFamily: 'inherit',
                borderRadius: '8px',
                border: '1px solid #646cff',
                backgroundColor: '#1a1a1a',
                color: 'rgba(255, 255, 255, 0.87)',
                outline: 'none',
                maxWidth: '200px',
              }}
              maxLength={20}
            />
            <span style={{ fontSize: '0.9em', color: 'rgba(255, 255, 255, 0.6)' }}>
              Press Enter to save, Escape to cancel
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '1.2em', fontWeight: 500 }}>{userName}</span>
            <button onClick={handleChangeNameClick}>
              Change name
            </button>
          </>
        )}
      </div>

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

