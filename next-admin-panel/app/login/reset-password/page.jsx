'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { API_BASE_URL } from '@/utils/api'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const emailParam = searchParams.get('email') || ''
    const [email, setEmail] = useState(emailParam)
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const inputRefs = useRef([])

    useEffect(() => {
        setEmail(emailParam)
    }, [emailParam])

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return
        if (!/^[0-9]?$/.test(value)) return
        const next = [...otp]
        next[index] = value
        setOtp(next)
        setError('')
        if (value && index < 5) inputRefs.current[index + 1]?.focus()
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (!pasted) return
        const next = ['', '', '', '', '', '']
        for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
        setOtp(next)
        setError('')
        inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const otpCode = otp.join('')
        if (otpCode.length !== 6) {
            setError('Enter the 6-digit OTP')
            return
        }
        if (!email) {
            setError('Email is required')
            return
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/admin/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), otp: otpCode, newPassword }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(json.message || 'Reset failed. Please try again.')
                setLoading(false)
                return
            }
            if (json.success) {
                setSuccess(true)
                return
            }
            setError('Something went wrong.')
        } catch {
            setError('Network error. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-lg p-8 text-center">
                    <div className="h-1.5 w-full bg-primary rounded-t-2xl -mt-8 -mx-8 mb-6 rounded-b-none" />
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Password reset successfully</h2>
                    <p className="text-muted-foreground text-sm mb-6">You can now log in with your new password.</p>
                    <Link
                        href="/login"
                        className="block w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    >
                        Go to login
                    </Link>
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
                            <h1 className="text-xl font-bold text-foreground">Set new password</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter the OTP sent to your email and choose a new password
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
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">OTP (6 digits)</label>
                                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (inputRefs.current[i] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">New password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">Confirm password</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Repeat new password"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-ring"
                                />
                                <span className="text-foreground">Show passwords</span>
                            </label>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                                {loading ? 'Resetting…' : 'Reset password'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            <Link href="/login" className="text-primary hover:underline">Back to login</Link>
                            {' · '}
                            <Link href="/login/forgot-password" className="text-primary hover:underline">Resend OTP</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function AdminResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <span className="text-muted-foreground">Loading…</span>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
