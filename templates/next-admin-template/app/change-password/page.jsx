'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/utils/api'
import { Input, Checkbox } from '@/components/ui/FormFields'
import { KeyRound, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirm password do not match')
            return
        }
        setLoading(true)
        try {
            const res = await apiClient.put('/admin/change-password', {
                currentPassword,
                newPassword,
            })
            if (res?.success) {
                setSuccess(true)
                return
            }
            setError(res?.message || 'Failed to change password')
        } catch (err) {
            setError(err?.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-12 p-6">
                <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Password Updated</h2>
                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                        Your account password has been successfully changed. Please use your new password next time you log in.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto mt-10 p-6">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Change Password</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Ensure your account is using a long, random password to stay secure.
                        </p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="px-4 py-3 rounded-xl text-sm bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-5 bg-secondary/30 p-6 rounded-2xl border border-border">
                        <Input
                            label="Current Password"
                            name="currentPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            required
                        />

                        <div className="h-px bg-border/50 my-2" />
                        
                        <Input
                            label="New Password"
                            name="newPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                        />

                        <Input
                            label="Confirm New Password"
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            required
                        />
                        
                        <div className="pt-2">
                            <Checkbox
                                label="Show passwords"
                                name="showPassword"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6">
                        <Link
                            href="/dashboard"
                            className="px-5 py-2.5 rounded-xl font-medium border border-border bg-background text-foreground hover:bg-secondary transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

