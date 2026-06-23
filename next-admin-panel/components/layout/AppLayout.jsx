'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-secondary/20 dark:bg-background">

            {/* Sidebar */}
            <Sidebar
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
            />

            {/* Main Content */}
            <div
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
                ${collapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'}`}
            >
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
