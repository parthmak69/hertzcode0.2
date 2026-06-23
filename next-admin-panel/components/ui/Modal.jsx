'use client'

import { useEffect, useState } from 'react'

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'lg',
    closeOnOverlayClick = true,
    closeOnEsc = true,
    showHeader = true,
}) {
    const [shouldRender, setShouldRender] = useState(isOpen)
    const [animate, setAnimate] = useState(false)

    // Handle mount/unmount animation
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true)
            setTimeout(() => setAnimate(true), 10)
        } else {
            setAnimate(false)
            setTimeout(() => setShouldRender(false), 200)
        }
    }, [isOpen])

    // Reset modal content scroll position when opened
    useEffect(() => {
        if (isOpen) {
            const modalContent = document.querySelector('[data-modal-content]')
            if (modalContent) {
                modalContent.scrollTop = 0
            }
        }
    }, [isOpen])

    // Lock scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = 'unset'

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // ESC key support
    useEffect(() => {
        if (!closeOnEsc) return

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose, closeOnEsc])

    if (!shouldRender) return null

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-5xl',
        xl: 'max-w-5xl',
        full: 'max-w-[95vw] w-full',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

            {/* Overlay */}
            <div
                className={`
                    absolute inset-0 
                    bg-background/60 
                    backdrop-blur-md
                    transition-all duration-300
                    ${animate ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={closeOnOverlayClick ? onClose : undefined}
            />

            {/* Modal Container */}
            <div
                data-modal-content
                className={`
                    relative w-full ${sizeClasses[size]}
                    max-h-[90vh] overflow-y-auto
                    rounded-xl
                    bg-card text-card-foreground
                    border border-border/60
                    shadow-xl
                    transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                    ${animate
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-2'
                    }
                `}
            >

                {/* Header */}
                {showHeader && (
                    <div className="
                        sticky top-0 z-10
                        flex items-center justify-between
                        px-6 py-4
                        border-b border-border
                        bg-card
                        rounded-t-2xl
                    ">
                        <h2 className="text-lg font-semibold text-foreground">
                            {title}
                        </h2>

                        <button
                            onClick={onClose}
                            className="
                                p-2 rounded-lg
                                text-muted-foreground
                                cursor-pointer
                                hover:text-foreground
                                hover:bg-secondary
                                transition
                            "
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-6">
                    {children}
                </div>

            </div>
        </div>
    )
}