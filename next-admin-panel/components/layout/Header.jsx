'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import { clearAuth } from '@/utils/api'

export default function Header({ onMenuClick }) {
    const router = useRouter()
    const { darkMode, toggleDarkMode } = useTheme()

    const handleLogout = () => {
        clearAuth()
        router.replace('/login')
    }

    return (
        <header className="sticky top-0 z-20 bg-card/90 dark:bg-card/60 backdrop-blur-lg border-b border-border/60 transition-all duration-300">
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

                    {/* Change password */}
                    <Link
                        href="/change-password"
                        className="cursor-pointer flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-md transition-all text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95"
                        title="Change password"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="text-sm font-medium hidden md:inline">
                            Password
                        </span>
                    </Link>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="cursor-pointer flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-md transition-all text-destructive/90 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        title="Logout"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm font-medium hidden md:inline">
                            Logout
                        </span>
                    </button>

                </div>
            </div>
        </header>
    )
}
