const crypto = require('crypto')

const JWT_SECRET = process.env.JWT_SECRET || 'squadera-admin-master-jwt-token-secret-key-1234!xyz'

/**
 * Base64URL encoder helper.
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
 */
function verifyPassword(inputPassword, storedHash) {
    if (!storedHash) return false
    if (storedHash.length === 32) {
        const md5Hash = crypto.createHash('md5').update(inputPassword).digest('hex')
        return md5Hash === storedHash
    }
    return inputPassword === storedHash
}

/**
 * Hashes a plaintext password to MD5.
 */
function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex')
}

/**
 * Generates a signed JWT Access Token.
 */
function generateToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' }
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
 * Verifies the JWT token from the Request headers.
 */
function verifyToken(req) {
    try {
        const authHeader = req.headers.authorization || req.headers['authorization']
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
        
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(signatureInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')

        if (signature !== expectedSignature) {
            return null
        }

        const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload))
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            return null
        }

        return decodedPayload
    } catch {
        return null
    }
}

module.exports = {
    verifyPassword,
    hashPassword,
    generateToken,
    verifyToken
}
