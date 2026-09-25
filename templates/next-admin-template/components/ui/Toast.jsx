'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

// Unified toast function compatible with react-toastify API
export const toast = {
    show: (message, type = 'success', options = {}) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { id: Date.now() + Math.random(), message, type, ...options }
            }))
        }
    },
    success: (msg, opts) => toast.show(msg, 'success', opts),
    error: (msg, opts) => toast.show(msg, 'error', opts),
    warning: (msg, opts) => toast.show(msg, 'warning', opts),
    info: (msg, opts) => toast.show(msg, 'info', opts),
}

// React Toast Container Component
export function ToastContainer() {
    const [toasts, setToasts] = useState([])

    useEffect(() => {
        const handleToast = (e) => {
            const newToast = e.detail
            if (!newToast) return
            setToasts((prev) => [...prev, newToast])

            // Auto dismiss after 3.5 seconds
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
            }, 3500)
        }

        window.addEventListener('app-toast', handleToast)
        return () => window.removeEventListener('app-toast', handleToast)
    }, [])

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    if (toasts.length === 0) return null

    return (
        <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
            {toasts.map((t) => {
                const isSuccess = t.type === 'success'
                const isError = t.type === 'error'
                const isWarning = t.type === 'warning'
                
                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
                            isSuccess
                                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 dark:bg-emerald-950/95 dark:text-emerald-100 shadow-emerald-900/20'
                                : isError
                                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 dark:bg-rose-950/95 dark:text-rose-100 shadow-rose-900/20'
                                : isWarning
                                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 dark:bg-amber-950/95 dark:text-amber-100 shadow-amber-900/20'
                                : 'bg-sky-950/90 border-sky-500/40 text-sky-100 dark:bg-sky-950/95 dark:text-sky-100 shadow-sky-900/20'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="shrink-0">
                                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
                            </div>
                            <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                                {t.message}
                            </span>
                        </div>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-2 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition shrink-0 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default ToastContainer
