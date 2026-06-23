import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'squadera-admin-master-jwt-token-secret-key-12345!'

/**
 * Base64URL encoder helper (standard for JWT headers/payloads).
 */
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
}

/**
 * Base64URL decoder helper.
 */
function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
        base64 += '='
    }
    return Buffer.from(base64, 'base64').toString('utf8')
}

/**
 * Verifies if the input password matches the stored password hash.
 * Supports both MD5 hashes (32 characters long) and plain strings.
 * 
 * @param {string} inputPassword - The plaintext password inputted by the user
 * @param {string} storedHash - The password hash retrieved from the database
 * @returns {boolean} True if password matches, false otherwise
 */
export function verifyPassword(inputPassword, storedHash) {
    if (!storedHash) return false
    
    // If stored password is an MD5 hash (exactly 32 characters)
    if (storedHash.length === 32) {
        const md5Hash = crypto.createHash('md5').update(inputPassword).digest('hex')
        return md5Hash === storedHash
    }
    
    // Direct match fallback
    return inputPassword === storedHash
}

/**
 * Hashes a plaintext password to MD5.
 * 
 * @param {string} password - Plaintext password
 * @returns {string} The MD5 hash
 */
export function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex')
}

/**
 * Generates a signed JWT Access Token for an admin user natively.
 * Signs payload with HMAC-SHA256 and appends expiration time.
 * 
 * @param {object} user - User details { id, name, email }
 * @returns {string} Signed JWT token
 */
export function generateToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' }
    
    // Expiration timestamp (7 days standard duration)
    const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    const payload = { ...user, exp }

    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedPayload = base64UrlEncode(JSON.stringify(payload))

    const signatureInput = `${encodedHeader}.${encodedPayload}`
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(signatureInput)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')

    return `${signatureInput}.${signature}`
}

/**
 * Verifies the JWT token from the Request headers natively.
 * Checks signature authenticity and expiration validity.
 * 
 * @param {Request} req - The incoming Next.js Request object
 * @returns {object|null} The decoded token payload if valid, null otherwise
 */
export function verifyToken(req) {
    try {
        const authHeader = req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null
        }
        
        const token = authHeader.split(' ')[1]
        const parts = token.split('.')
        if (parts.length !== 3) {
            return null
        }

        const [encodedHeader, encodedPayload, signature] = parts
        const signatureInput = `${encodedHeader}.${encodedPayload}`
        
        // Re-generate HMAC signature for comparison
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(signatureInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')

        if (signature !== expectedSignature) {
            return null // Invalid signature
        }

        const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload))
        
        // Verify expiration
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            return null // Expired session
        }

        return decodedPayload
    } catch {
        return null
    }
}
