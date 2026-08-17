'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { apiClient, getUser, clearAuth } from '@/utils/api'

export default function Header({ onMenuClick }) {
    const { darkMode, toggleDarkMode } = useTheme()
    const router = useRouter()
    const [storageExceeded, setStorageExceeded] = useState(false)
    const [storageLimit, setStorageLimit] = useState(50)

    //Edit Profile Name & Avatar State
    const [isEditNameOption, SetIsEditNameOption] = useState(false);
    const [editName, setEditName] = useState('');
    const [profileImageFile, setProfileImageFile] = useState(null)
    const [profileImagePreview, setProfileImagePreview] = useState('')
    const [imageAction, setImageAction] = useState('none') // 'none' | 'upload' | 'remove'
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    // Profile Dropdown States
    const [user, setUser] = useState(null)
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Fetch user details reactively on mount to prevent Next.js hydration issues
    const fetchLatestUserInfo = () => {
        const cachedUser = getUser()
        if (cachedUser) {
            setUser(cachedUser)
            // Fetch latest user details from database to keep name, email and avatar updated
            apiClient.get(`/admin/admins/${cachedUser.id}`)
                .then(res => {
                    if (res.success && res.data) {
                        const updatedUser = {
                            id: res.data.id,
                            name: res.data.name || res.data.full_name || 'Admin',
                            email: res.data.email,
                            phone: res.data.phone || "",
                            profile_image: res.data.profile_image || ""
                        }
                        setUser(updatedUser)
                        // Update localStorage cache
                        localStorage.setItem('admin_user', JSON.stringify(updatedUser))
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch latest user info:', err)
                })
        }
    }

    useEffect(() => {
        fetchLatestUserInfo()
        window.addEventListener('profile-updated', fetchLatestUserInfo)
        return () => window.removeEventListener('profile-updated', fetchLatestUserInfo)
    }, [])

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setUserDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        clearAuth()
        router.replace('/login')
    }

    const handleProfileImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setProfileImageFile(file)
        setImageAction('upload')
        
        const reader = new FileReader()
        reader.onloadend = () => {
            setProfileImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveProfileImage = () => {
        setProfileImageFile(null)
        setProfileImagePreview('')
        setImageAction('remove')
    }

    const getEmailFromToken = () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null
            if (!token) return ''
            const payloadBase64 = token.split('.')[1]
            if (!payloadBase64) return ''
            const payloadJson = atob(payloadBase64)
            const payload = JSON.parse(payloadJson)
            return payload.email || ''
        } catch (err) {
            console.error('Failed to parse token email:', err)
            return ''
        }
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()
        if (!editName.trim()) {
            setEditError("Name cannot be empty")
            return
        }

        setEditLoading(true)
        setEditError("")

        try {
            const userId = user?.id || 1
            const emailVal = user?.email || getEmailFromToken() || 'john@gmail.com'

            let res;
            if (imageAction === 'upload' && profileImageFile) {
                const formData = new FormData()
                formData.append('full_name', editName.trim())
                formData.append('email', emailVal)
                formData.append('phone', user?.phone || "")
                formData.append('primaryImageAction', imageAction)
                formData.append('primary_image_file', profileImageFile)

                res = await apiClient.upload(`/admin/admins/${userId}`, formData, 'PUT')
            } else {
                res = await apiClient.put(`/admin/admins/${userId}`, {
                    full_name: editName.trim(),
                    email: emailVal,
                    phone: user?.phone || "",
                    primaryImageAction: imageAction
                })
            }
            if (res.success) {
                // Re-fetch latest details to get the exact saved filename from backend
                const detailRes = await apiClient.get(`/admin/admins/${user.id}`)
                if (detailRes.success && detailRes.data) {
                    const updatedUser = {
                        id: detailRes.data.id,
                        name: detailRes.data.name || detailRes.data.full_name || 'Admin',
                        email: detailRes.data.email,
                        phone: detailRes.data.phone || "",
                        profile_image: detailRes.data.profile_image || ""
                    }
                    setUser(updatedUser)
                    localStorage.setItem('admin_user', JSON.stringify(updatedUser))
                    
                    // Dispatch a custom event to sync with other components/pages if needed
                    window.dispatchEvent(new Event('profile-updated'))
                }
                SetIsEditNameOption(false)
            } else {
                setEditError(res.message || "Failed to update profile.")
            }
        } catch (error) {
            console.error('Update profile error:', error)
            setEditError("Connection error. Please try again.")
        } finally {
            setEditLoading(false)
        }
    }

    useEffect(() => {
        const checkStorage = async () => {
            try {
                const res = await apiClient.get('/admin/storage/status')
                if (res.success && res.data) {
                    setStorageExceeded(res.data.isExceeded)
                    setStorageLimit(res.data.limitMb)
                }
            } catch (err) {
                // Ignore silent
            }
        }
        checkStorage()
        window.addEventListener('storage-updated', checkStorage)
        const interval = setInterval(checkStorage, 30000)
        return () => {
            clearInterval(interval)
            window.removeEventListener('storage-updated', checkStorage)
        }
    }, [])

    return (
        <>
            <header className="sticky top-0 z-20 bg-card/90 dark:bg-card/60 backdrop-blur-lg border-b border-border/60 transition-all duration-300">
                {storageExceeded && (
                    <div className="bg-destructive text-destructive-foreground text-center py-2 px-4 text-xs font-bold animate-pulse flex items-center justify-center gap-2">
                        <span>⚠️ Storage limit of {storageLimit}MB exceeded! Please upgrade your storage quota.</span>
                        <Link href="/dashboard" className="underline hover:text-white ml-2">Upgrade Now &rarr;</Link>
                    </div>
                )}
                <div className="px-4 lg:px-6 py-3 flex items-center justify-between">

                    {/* Left Section */}
                    <div className="flex items-center gap-3 lg:gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 rounded-md transition-all text-muted-foreground cursor-pointer hover:bg-secondary hover:text-foreground active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                            </svg>
                        </button>

                        <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight drop-shadow-sm">
                            Next Admin Panel
                        </h1>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-2">

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="cursor-pointer p-2 rounded-full transition-all text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95"
                            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {/* User Profile Dropdown */}
                        <div className="relative ml-1" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card hover:bg-secondary/80 border border-border/80 shadow-sm hover:shadow transition-all duration-200 text-left active:scale-[0.98] cursor-pointer"
                            >
                                <div className="w-7 h-7 rounded-full flex shrink-0 items-center justify-center font-bold text-xs border border-primary/20 bg-primary/10 overflow-hidden text-primary">
                                    {user?.profile_image ? (
                                        <img
                                            src={`http://localhost:5001/${user.profile_image}`}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span>
                                            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                                        </span>
                                    )}
                                </div>
                                <span className="hidden sm:inline text-xs font-semibold text-foreground tracking-tight max-w-[100px] truncate">
                                    {user?.name || 'Admin User'}
                                </span>
                                <svg className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full border border-border bg-secondary flex shrink-0 items-center justify-center overflow-hidden">
                                            {user?.profile_image ? (
                                                <img
                                                    src={`http://localhost:5001/${user.profile_image}`}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-foreground font-bold text-xs">
                                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{user?.name || 'Admin User'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@example.com'}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserDropdownOpen(false)
                                            setEditName(user?.name || '')
                                            setProfileImagePreview(user?.profile_image ? `http://localhost:5001/${user.profile_image}` : '')
                                            setProfileImageFile(null)
                                            setImageAction('none')
                                            setEditError('')
                                            SetIsEditNameOption(true)
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer w-full text-left"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Edit Profile Info
                                    </button>
                                    <Link
                                        href="/change-password"
                                        onClick={() => setUserDropdownOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer w-full text-left"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        Change Password
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserDropdownOpen(false)
                                            handleLogout()
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer w-full text-left font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </header>

            {isEditNameOption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-base font-bold text-foreground">Edit Profile Info</h3>
                        <p className="text-xs text-muted-foreground mt-1">Update your profile credentials.</p>
                        
                        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                            {/* Profile Picture Upload preview block */}
                            <div className="flex flex-col items-center gap-3 pb-2 border-b border-border/40">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground self-start">
                                    Profile Picture
                                </span>
                                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center shadow-inner group">
                                    {profileImagePreview ? (
                                        <img
                                            src={profileImagePreview}
                                            alt="Profile Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl font-black text-muted-foreground/40">
                                            {editName ? editName.charAt(0).toUpperCase() : 'A'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-xl text-xs transition cursor-pointer border border-border/80 shadow-sm active:scale-95">
                                        Upload Picture
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleProfileImageChange}
                                            className="hidden"
                                            disabled={editLoading}
                                        />
                                    </label>
                                    {profileImagePreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveProfileImage}
                                            className="px-3 py-1.5 border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold rounded-xl text-xs transition cursor-pointer active:scale-95"
                                            disabled={editLoading}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter full name"
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-secondary/50 border border-border/80 focus:border-primary/50 focus:outline-none transition-all text-foreground"
                                    disabled={editLoading}
                                />
                            </div>

                            {editError && (
                                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-xl text-center">
                                    ⚠️ {editError}
                                </p>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                <button
                                    type="button"
                                    onClick={() => SetIsEditNameOption(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer"
                                    disabled={editLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white shadow transition-all cursor-pointer flex items-center gap-1.5"
                                    disabled={editLoading}
                                >
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
