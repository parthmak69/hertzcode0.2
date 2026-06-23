import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'

/**
 * Next.js App Router Route Handler for Admin Login
 * Path: POST /api/auth/admin/login
 */
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const { email, password } = body
        
        if (!email || !password) {
            return NextResponse.json({
                success: false,
                message: 'Email and password are required.'
            }, { status: 400 })
        }
        
        // Query active admins from DB matching email
        const admins = await dbQuery(
            'SELECT * FROM `admins` WHERE `email` = ? AND `isDeleted` = 0 LIMIT 1',
            [email],
            0,
            'Admin Login Query'
        )
        
        if (!admins || admins.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'Invalid email or password.'
            }, { status: 401 })
        }
        
        const admin = admins[0]
        
        // Match inputted password with the stored hash (supports MD5 hash: "john" hashes to "bf186163b0195e2afd4e5ab2b15ad0a3")
        const isMatch = verifyPassword(password, admin.password)
        if (!isMatch) {
            return NextResponse.json({
                success: false,
                message: 'Invalid email or password.'
            }, { status: 401 })
        }
        
        // Generate Token JWT
        const tokenUser = { id: admin.id, name: admin.name, email: admin.email }
        const accessToken = generateToken(tokenUser)
        
        // Log the successful login audit trail
        await dbQuery(
            'SELECT 1',
            [],
            admin.id,
            `Admin session initialized for: ${admin.name} (${admin.email})`
        )
        
        return NextResponse.json({
            success: true,
            data: {
                accessToken,
                refreshToken: accessToken, // Self-contained fallback refresh token
                user: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email
                }
            }
        })
        
    } catch (err) {
        console.error('[Login API Error]', err)
        return NextResponse.json({
            success: false,
            message: 'Internal server error during login operation.'
        }, { status: 500 })
    }
}
