import crypto from 'crypto';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        console.error('[CRITICAL SECURITY WARNING] JWT_SECRET environment variable is missing!');
    }
    return secret || 'hertzcode-secure-admin-token-secret-fallback-key-2026';
};

/**
 * Base64URL encoder helper
 */
function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Base64URL decoder helper
 */
function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Hashes a plaintext password using modern cryptographic scrypt with a unique random salt.
 * Output format: `${salt}:${derivedKey}` (hex-encoded)
 * @param {string} password - Plaintext password
 * @returns {string} Salted scrypt hash
 */
export function hashPassword(password) {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
}

/**
 * Checks if a stored password hash needs to be upgraded to modern salted scrypt.
 * Returns true if the stored hash is plaintext or legacy unsalted MD5.
 */
export function needsRehash(storedHash) {
    if (!storedHash) return false;
    return !storedHash.includes(':');
}

/**
 * Verifies if the input password matches the stored password hash.
 * Supports:
 *  1. Modern salted scrypt format (salt:hash)
 *  2. Legacy MD5 hashes (32 characters hex)
 *  3. Plaintext fallback (for legacy dev setups)
 * Uses crypto.timingSafeEqual for constant-time comparisons.
 */
export function verifyPassword(inputPassword, storedHash) {
    if (!storedHash || !inputPassword) return false;

    // 1. Modern Salted scrypt format
    if (storedHash.includes(':')) {
        try {
            const [salt, key] = storedHash.split(':');
            if (salt && key) {
                const derivedKey = crypto.scryptSync(inputPassword, salt, 64).toString('hex');
                const keyBuf = Buffer.from(key, 'hex');
                const derivedBuf = Buffer.from(derivedKey, 'hex');
                if (keyBuf.length === derivedBuf.length && crypto.timingSafeEqual(keyBuf, derivedBuf)) {
                    return true;
                }
            }
        } catch {
            return false;
        }
        return false;
    }

    // 2. Legacy MD5 (32 characters hex)
    if (storedHash.length === 32) {
        try {
            const md5Hash = crypto.createHash('md5').update(inputPassword).digest('hex');
            const hashBuf = Buffer.from(md5Hash);
            const storedBuf = Buffer.from(storedHash);
            if (hashBuf.length === storedBuf.length && crypto.timingSafeEqual(hashBuf, storedBuf)) {
                return true;
            }
        } catch {
            return false;
        }
    }

    // 3. Fallback plaintext comparison (using constant-time equal where possible)
    if (typeof inputPassword === 'string' && typeof storedHash === 'string') {
        const inputBuf = Buffer.from(inputPassword);
        const storedBuf = Buffer.from(storedHash);
        if (inputBuf.length === storedBuf.length) {
            return crypto.timingSafeEqual(inputBuf, storedBuf);
        }
    }

    return false;
}

/**
 * Generates a signed JWT Access Token
 * @param {object} user - User payload { id, username, role, email }
 * @param {number} expiresInSeconds - Expiration time in seconds (default: 7 days)
 * @returns {string} Signed JWT token
 */
export function generateToken(user, expiresInSeconds = 7 * 24 * 60 * 60) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = { ...user, exp };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
        .createHmac('sha256', getJwtSecret())
        .update(signatureInput)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${signatureInput}.${signature}`;
}

/**
 * Verifies JWT token from incoming request headers
 * Timing-Safe signature check to prevent side-channel attacks
 * @param {Request} req
 * @returns {object|null} Decoded user payload if valid, null if invalid/expired
 */
export function verifyToken(req) {
    try {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split(' ')[1];
        if (!token) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;
        const signatureInput = `${encodedHeader}.${encodedPayload}`;

        const expectedSignature = crypto
            .createHmac('sha256', getJwtSecret())
            .update(signatureInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        // Timing-Safe comparison (prevents timing attacks)
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }

        const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload));
        if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired session
        }

        return decodedPayload;
    } catch {
        return null;
    }
}

export default {
    verifyPassword,
    hashPassword,
    generateToken,
    verifyToken
};
