'use client'

import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, getUser } from '@/utils/api'

// Keep the socket instance in a module-level variable to act as a singleton across strict-mode mounts
let globalSocket = null

export default function SocketListener() {
    useEffect(() => {
        if (typeof window === 'undefined') return

        const connectSocket = () => {
            const user = getUser()
            const token = getAccessToken()

            // If no user or token is available, disconnect any active socket
            if (!user || !token) {
                if (globalSocket) {
                    console.log('[SocketListener] Disconnecting socket due to missing credentials.')
                    globalSocket.disconnect()
                    globalSocket = null
                }
                return
            }

            // If socket is already initialized, do not re-establish
            if (globalSocket) {
                if (!globalSocket.connected) {
                    console.log('[SocketListener] Socket exists but is disconnected. Reconnecting...')
                    globalSocket.connect()
                }
                return
            }

            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'
            console.log(`[SocketListener] Connecting to Socket.io server at ${socketUrl}...`)

            globalSocket = io(socketUrl, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 10,
                reconnectionDelay: 3000
            })

            // Refresh token dynamically on socket reconnection attempts
            globalSocket.on('reconnect_attempt', () => {
                const freshToken = getAccessToken()
                if (freshToken) {
                    console.log('[SocketListener] Updating auth credentials for reconnect handshake...')
                    globalSocket.auth.token = freshToken
                }
            })

            globalSocket.on('connect', () => {
                console.log('[SocketListener] Connected to Socket.io server. Socket ID:', globalSocket.id)
            })

            globalSocket.on('connect_error', (err) => {
                console.error('[SocketListener] Connection error:', err.message)
            })

            globalSocket.on('disconnect', (reason) => {
                console.log('[SocketListener] Disconnected from Socket.io server. Reason:', reason)
            })

            globalSocket.on('db-change', (data) => {
                console.log('[SocketListener] Database change broadcast received:', data)
                if (data?.table) {
                    // Dispatch custom window event so hooks and pages refetch in real-time
                    window.dispatchEvent(new CustomEvent('db-change', { detail: data }))
                    
                    // Trigger global storage update event to keep layout bars in sync
                    window.dispatchEvent(new Event('storage-updated'))
                }
            })
        }

        // Initialize connection on mount
        connectSocket()

        // Handle auth change triggers dynamically
        const handleAuthChange = () => {
            console.log('[SocketListener] Auth state changed. Resetting connection...')
            if (globalSocket) {
                globalSocket.disconnect()
                globalSocket = null
            }
            connectSocket()
        }

        window.addEventListener('auth:login', handleAuthChange)
        window.addEventListener('auth:logout', handleAuthChange)

        // Periodic safety check to auto-recover connections
        const interval = setInterval(() => {
            if (getUser() && getAccessToken()) {
                if (!globalSocket) {
                    connectSocket()
                } else if (!globalSocket.connected) {
                    console.log('[SocketListener] Socket offline. Retrying connect...')
                    globalSocket.connect()
                }
            }
        }, 15000)

        return () => {
            window.removeEventListener('auth:login', handleAuthChange)
            window.removeEventListener('auth:logout', handleAuthChange)
            clearInterval(interval)
            // Note: We do NOT disconnect the globalSocket here to allow it to persist
            // through React Strict Mode's quick unmount/mount cycle without throwing warnings.
        }
    }, [])

    return null
}
