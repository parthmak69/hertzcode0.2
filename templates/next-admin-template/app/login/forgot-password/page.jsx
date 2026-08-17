'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_BASE_URL } from '@/utils/api'

export default function AdminForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/admin/forgot-password`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(json.message || 'Request failed. Please try again.')
                setLoading(false)
                return
            }
            if (json.success) {
                setSent(true)
                return
            }
            setError('Something went wrong.')
        } catch {
            setError('Network error. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-lg p-8 text-center">
                    <div className="h-1.5 w-full bg-primary rounded-t-2xl -mt-8 -mx-8 mb-6 rounded-b-none" />
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        If an admin account exists for <strong className="text-foreground">{email}</strong>, we sent a 6-digit OTP. Use it on the next page to reset your password.
                    </p>
                    <Link
                        href={`/login/reset-password?email=${encodeURIComponent(email)}`}
                        className="block w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    >
                        Enter OTP & set new password
                    </Link>
                    <p className="mt-4 text-sm text-muted-foreground">
                        <Link href="/login" className="text-primary hover:underline">Back to login</Link>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card shadow-lg">
                    <div className="h-1.5 w-full bg-primary rounded-t-2xl" />
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-bold text-foreground">Forgot password</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter your admin email to receive an OTP
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="px-4 py-3 rounded-lg text-sm bg-destructive/10 border border-destructive text-destructive">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                                {loading ? 'Sending…' : 'Send OTP'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            <Link href="/login" className="text-primary hover:underline">Back to login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
