import { NextResponse } from 'next/server'
import { verifyToken, generateToken } from '@/lib/auth'

/**
 * Path: POST /api/auth/refresh-token
 * Validates the current Bearer token and issues a fresh one.
 * Since this project uses stateless JWTs with a 7-day expiry, we simply
 * re-issue a new token for any request that carries a valid (not-yet-expired) token.
 */
export async function POST(req) {
    try {
        const adminUser = verifyToken(req)

        if (!adminUser) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired token.' },
                { status: 401 }
            )
        }

        // Issue a fresh token with a new 7-day expiry window
        const newToken = generateToken({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
        })

        return NextResponse.json({
            success: true,
            data: { accessToken: newToken },
        })
    } catch (err) {
        console.error('[Refresh Token API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
    }
}
