'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { getAccessToken } from '@/utils/api'

const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname) {
    return PUBLIC_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + '/')
    )
}

export default function AuthGuard({ children }) {
    const pathname = usePathname()
    const router = useRouter()
    const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'public'

    const checkAuth = useCallback(() => {
        if (isPublicPath(pathname)) {
            setStatus('public')
            return
        }

        const token = getAccessToken()

        if (!token) {
            setStatus('loading')
            router.replace('/login')
            return
        }

        setStatus('authenticated')
    }, [pathname, router])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    useEffect(() => {
        const handleForceLogout = () => {
            setStatus('loading')
            router.replace('/login')
        }

        window.addEventListener('auth:logout', handleForceLogout)
        return () =>
            window.removeEventListener('auth:logout', handleForceLogout)
    }, [router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="
              animate-spin rounded-full h-10 w-10
              border-2 border-primary border-t-transparent
            "
                        aria-hidden
                    />
                    <span className="text-sm text-muted-foreground">
                        Checking authentication...
                    </span>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
