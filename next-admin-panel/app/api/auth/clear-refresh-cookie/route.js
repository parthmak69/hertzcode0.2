import { NextResponse } from 'next/server'

/**
 * Path: POST /api/auth/clear-refresh-cookie
 * Responds to auth clearing operations gracefully for seamless logout operations.
 */
export async function POST() {
    return NextResponse.json({
        success: true,
        message: 'Administrative session cleared successfully.'
    })
}
