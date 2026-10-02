'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { API_BASE_URL, getAccessToken, saveAuth } from '@/utils/api'

export default function LoginPage() {
    const router = useRouter()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [usernameVerification, setUsernameVerification] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && getAccessToken()) {
            router.replace('/dashboard')
        }
    }, [router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            let res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, pass_hash: password, password, rememberMe, username_verification: usernameVerification }),
            })

            let json = await res.json().catch(() => ({}))

            // Fallback try if endpoint didn't respond with ok
            if (!res.ok && res.status === 404) {
                res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, pass_hash: password, password, rememberMe }),
                })
                json = await res.json().catch(() => ({}))
            }

            if (!res.ok) {
                setError(json.message || json.error || 'Login failed. Please try again.')
                setLoading(false)
                return
            }

            if (json.success) {
                const authData = json.data || {
                    accessToken: 'admin_token_' + Date.now(),
                    refreshToken: 'admin_refresh_' + Date.now(),
                    user: { username: json.username || username, role: json.role || 'admin', name: json.name || username }
                }
                saveAuth(authData, rememberMe)
                router.replace('/dashboard')
                return
            }

            setError(json.message || json.error || 'Invalid credentials or server response.')
        } catch {
            setError('Network error. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">

            <div className="w-full max-w-md">

                <div className="rounded-2xl border border-border bg-card shadow-lg">

                    {/* Top Accent Bar */}
                    <div className="h-1.5 w-full bg-primary rounded-t-2xl" />

                    <div className="p-8">

                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl font-extrabold text-primary">
                                    N
                                </span>
                            </div>

                            <h1 className="text-2xl font-bold text-foreground">
                                Next Admin Panel
                            </h1>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Sign in to access the dashboard
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Error */}
                            {error && (
                                <div className="px-4 py-3 rounded-lg text-sm bg-destructive/10 border border-destructive text-destructive">
                                    {error}
                                </div>
                            )}

                            {/* Email / Username */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Email / Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="
                                        w-full px-4 py-3 rounded-xl
                                        bg-input border border-border
                                        text-foreground
                                        placeholder:text-muted-foreground
                                        focus:outline-none
                                        focus:ring-2 focus:ring-ring
                                        focus:border-ring
                                        transition
                                    "
                                    placeholder="admin@gmail.com or admin"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Password
                                </label>

                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="
                                            w-full px-4 py-3 pr-12 rounded-xl
                                            bg-input border border-border
                                            text-foreground
                                            placeholder:text-muted-foreground
                                            focus:outline-none
                                            focus:ring-2 focus:ring-ring
                                            focus:border-ring
                                            transition
                                        "
                                        placeholder="Enter your password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="
                                            absolute inset-y-0 right-3
                                            flex items-center
                                            text-muted-foreground
                                            hover:text-foreground
                                            transition
                                            cursor-pointer
                                        "
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Honeypot field for bot prevention (hidden from humans) */}
                            <div style={{ display: 'none' }} aria-hidden="true">
                                <label htmlFor="username_verification">Leave this field blank</label>
                                <input
                                    id="username_verification"
                                    type="text"
                                    name="username_verification"
                                    value={usernameVerification}
                                    onChange={(e) => setUsernameVerification(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>

                            {/* Remember Me */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="
                                        w-4 h-4 rounded border-border bg-input
                                        text-primary focus:ring-2 focus:ring-ring
                                    "
                                />
                                <span className="text-sm text-foreground">
                                    Remember me
                                </span>
                            </label>

                            <p className="text-center text-sm text-muted-foreground">
                                <Link href="/login/forgot-password" className="text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </p>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="
                                    w-full py-3 rounded-xl font-semibold
                                    bg-primary text-primary-foreground
                                    cursor-pointer
                                    hover:bg-primary/90
                                    transition
                                    disabled:opacity-60
                                    disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2
                                "
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                )}
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Next Admin Panel · Universal Dashboard Template
                </p>

            </div>
        </div>
    )
}
