const { Server } = require('socket.io')
const { verifyToken } = require('./authHelper')

let io = null

/**
 * Initializes the Socket.io server.
 * Restricts connection origin to process.env.ALLOWED_ORIGIN or default 'http://localhost:3002'.
 * Restricts connections to authenticated users by validating the access token in socket auth object.
 * 
 * @param {object} server - The HTTP server instance
 * @returns {object} The initialized Socket.io server instance
 */
function init(server) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3002'
    
    io = new Server(server, {
        cors: {
            origin: allowedOrigin,
            methods: ["GET", "POST"]
        }
    })

    // Authentication middleware using the existing JWT verification helper
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token
        
        if (!token) {
            console.warn(`[Socket.io] Authentication failed: Token missing for socket ID ${socket.id}`)
            return next(new Error('Authentication error: Token is missing'))
        }

        // Mock a request object for verifyToken compatibility
        const mockReq = {
            headers: {
                authorization: `Bearer ${token}`
            }
        }

        const decodedUser = verifyToken(mockReq)
        if (!decodedUser) {
            console.warn(`[Socket.io] Authentication failed: Invalid token for socket ID ${socket.id}`)
            return next(new Error('Authentication error: Invalid or expired token'))
        }

        socket.user = decodedUser
        next()
    })

    io.on('connection', (socket) => {
        console.log(`[Socket.io] Authenticated user connected: ${socket.user?.name} (ID: ${socket.user?.id}) on socket ${socket.id}`)
        
        socket.on('disconnect', () => {
            console.log(`[Socket.io] User disconnected: socket ${socket.id}`)
        })
    })

    return io
}

/**
 * Gets the active Socket.io server instance.
 */
function getIo() {
    return io
}

/**
 * Emits a database change event to all connected authenticated clients.
 * Uses a lightweight payload structure (just the table name) to optimize bandwidth.
 * 
 * @param {string} table - The name of the table that changed
 */
function emitDbChange(table) {
    if (io) {
        console.log(`[Socket.io] Broadcasting DB change event for table: "${table}"`)
        io.emit('db-change', { table })
    }
}

module.exports = {
    init,
    getIo,
    emitDbChange
}
