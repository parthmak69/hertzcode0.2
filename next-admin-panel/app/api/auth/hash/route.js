import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

/**
 * Temporary Protected Utility Endpoint to generate password hashes.
 * Path: GET /api/auth/hash?password=yourplaintextpassword&secret=squadera-generate-hash-secret-xyz
 * 
 * Security Guard: Only runs in Development environment or when valid secret parameter is supplied.
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url)
        const password = searchParams.get('password')
        const secret = searchParams.get('secret')
        
        const isDev = process.env.NODE_ENV === 'development'
        const expectedSecret = 'squadera-generate-hash-secret-xyz'
        
        // Protection check
        if (!isDev && secret !== expectedSecret) {
            return new Response('Access Denied. Unauthorized utility route.', { 
                status: 403,
                headers: { 'Content-Type': 'text/plain' }
            })
        }
        
        if (!password) {
            return new Response('Error: "password" query parameter is required.', { 
                status: 400,
                headers: { 'Content-Type': 'text/plain' }
            })
        }
        
        // Hash password using project default (MD5)
        const hashedPassword = hashPassword(password)
        
        // Return ONLY the plain text hash string as requested
        return new Response(hashedPassword, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        })
        
    } catch (err) {
        console.error('[Hash Utility Error]', err)
        return new Response('Internal Server Error.', { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        })
    }
}
