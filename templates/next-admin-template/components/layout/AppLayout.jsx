'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { processSyncQueue } from '@/utils/offlineSync'

export default function AppLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar_collapsed')
            return saved !== null ? JSON.parse(saved) : false
        }
        return false
    })
    const [isOffline, setIsOffline] = useState(false)

    const handleSetCollapsed = (value) => {
        setCollapsed(value)
        localStorage.setItem('sidebar_collapsed', JSON.stringify(value))
    }

    useEffect(() => {
        // Initial check
        setIsOffline(!navigator.onLine);

        const handleOnline = () => {
            setIsOffline(false);
            // COMMENTED OUT FOR NOW: Sync offline changes on reconnection
            // processSyncQueue();
        };

        const handleOffline = () => {
            setIsOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // COMMENTED OUT FOR NOW: Sync offline changes on mount
        // if (navigator.onLine) {
        //     processSyncQueue();
        // }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-secondary/20 dark:bg-background">

            {/* Sidebar */}
            <Sidebar
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                collapsed={collapsed}
                setCollapsed={handleSetCollapsed}
            />

            {/* Main Content */}
            <div
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
                ${collapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'}`}
            >
                {/* Offline Banner */}
                {isOffline && (
                    <div className="bg-destructive/10 text-destructive border-b border-destructive/20 px-4 py-2 text-sm text-center font-medium animate-in slide-in-from-top-2">
                        You are currently offline. Changes will be saved locally and synced when connection is restored.
                    </div>
                )}
                
                {/* Header */}
                <Header onMenuClick={() => setMobileOpen(true)} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 lg:p-6 lg:pt-4">
                    <div className="min-w-0 w-full mx-auto max-w-[1600px] animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
