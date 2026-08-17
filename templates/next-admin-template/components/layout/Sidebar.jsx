'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { apiClient } from '@/utils/api'
import {
    LayoutDashboard,
    Shield,
    ClipboardList,
    ChevronLeft,
    ChevronRight,
    Search,
    LayoutGrid,
    Folder,
    Settings,
    Package,
    Receipt,
    HardDrive,
    Users,
    Image as ImageIcon,
    FileText,
    Database,
    List,
} from 'lucide-react'

/* ================= MENU ================= */

const menuItems = [
    { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    // __DYNAMIC_ROUTES_START__
    // __DYNAMIC_ROUTES_END__
]

/* ================= HELPERS ================= */

const isActiveRoute = (pathname, href) => {
    if (!href) return false
    if (pathname === href) return true
    if (!pathname.startsWith(`${href}/`)) return false
    return true
}

/* ================= COMPONENT ================= */

export default function Sidebar({
    mobileOpen,
    setMobileOpen,
    collapsed,
    setCollapsed,
}) {
    const pathname = usePathname()
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef(null)

    const [storage, setStorage] = useState(null)


    const fetchStorageStatus = async () => {
        try {
            const res = await apiClient.get('/admin/storage/status')
            if (res.success && res.data) {
                setStorage(res.data)
            }
        } catch (err) {
            console.error('Fetch storage status in sidebar error:', err)
        }
    }

    useEffect(() => {
        // fetchStorageStatus()
        // window.addEventListener('storage-updated', fetchStorageStatus)
        // const interval = setInterval(fetchStorageStatus, 15000)
        return () => {
            // clearInterval(interval)
            // window.removeEventListener('storage-updated', fetchStorageStatus)
        }
    }, [])



    const closeMobile = () => setMobileOpen?.(false)

    // Filter menu items based on search query
    const filteredMenuItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItems

        const query = searchQuery.toLowerCase().trim()
        return menuItems.filter((item) =>
            item.name.toLowerCase().includes(query)
        )
    }, [searchQuery])

    // Keyboard shortcut to focus search input: Ctrl/Cmd+K or / (if not in input fields)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (
                (e.key === 'k' && (e.ctrlKey || e.metaKey)) ||
                (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
            ) {
                e.preventDefault()
                setCollapsed(false)
                setTimeout(() => {
                    searchInputRef.current?.focus()
                }, 100)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setCollapsed])

    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={closeMobile}
                />
            )}

            <aside
                className={`
        ${collapsed ? 'w-[4.5rem]' : 'w-64'}
        fixed left-0 top-0 z-50 h-screen
        bg-sidebar text-sidebar-foreground
        flex flex-col
        transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r border-border shadow-sm
      `}
            >
                {/* ================= HEADER ================= */}
                <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-4' : 'justify-between'} p-4 h-20 border-b border-border`}>

                    <Link href="/" className={`flex items-center justify-center ${collapsed ? '' : 'w-full'}`}>
                        {/* Expanded Logo */}
                        {!collapsed ? (
                            <div className="flex items-center gap-2">
                                <Shield className="w-6 h-6 text-sidebar-primary" />
                                <span className="font-bold text-lg tracking-tight">AdminPanel</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                <Shield className="w-6 h-6 text-sidebar-primary" />
                            </div>
                        )}
                    </Link>

                    <div className={`flex items-center ${collapsed ? 'mt-1' : 'gap-1 shrink-0'}`}>
                        <button
                            onClick={closeMobile}
                            className="lg:hidden p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                        >
                            ✕
                        </button>

                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={`hidden lg:flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-95 ${collapsed ? 'absolute -right-3 top-6 bg-card border border-border shadow-sm rounded-full' : ''}`}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
                        </button>
                    </div>
                </div>

                {/* ================= SEARCH ================= */}
                <div className={`px-4 py-3 border-b border-border/50 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
                    {collapsed ? (
                        <button
                            onClick={() => setCollapsed(false)}
                            title="Search pages ( / )"
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-95 bg-sidebar-accent/30 border border-border/40"
                        >
                            <Search className="w-5 h-5 shrink-0" />
                        </button>
                    ) : (
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                                <Search className="w-4 h-4 shrink-0" />
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search pages..."
                                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-sidebar-accent/40 border border-border/60 hover:border-border focus:border-sidebar-primary/50 focus:outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
                            />
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 p-1 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-secondary/70 transition-colors"
                                >
                                    <span className="text-[10px] leading-none">✕</span>
                                </button>
                            ) : (
                                <span className="absolute right-3 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60 border border-border/60 rounded bg-sidebar-accent pointer-events-none select-none">
                                    /
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ================= MENU ================= */}
                <nav className="flex-1 p-3 overflow-y-auto space-y-1">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon
                        const active = isActiveRoute(pathname, item.href)

                        return (
                            <div key={item.id}>
                                <Link
                                    href={item.href}
                                    onClick={closeMobile}
                                    className={`
                                        flex items-center transition-all duration-200 group active:scale-[0.98]
                                        ${collapsed
                                            ? 'justify-center w-11 h-11 mx-auto rounded-xl mt-1'
                                            : 'gap-3 px-3 py-2.5 rounded-lg mx-2 my-0.5 text-sm'}
                                        ${active
                                            ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                                            : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                                        }
                                        ${(!collapsed && !active) ? 'hover:translate-x-1' : ''}
                                    `}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            </div>
                        )
                    })}
                </nav>

                {/* ================= STORAGE ================= */}
                {storage && (
                    <div className={`p-4 border-t border-border/60 mt-auto shrink-0 ${collapsed ? 'flex justify-center' : 'space-y-3'}`}>
                        {collapsed ? (
                            <div
                                className={`p-2 rounded-xl border relative group transition-all duration-300
                                    ${storage.isExceeded
                                        ? 'bg-destructive/10 border-destructive text-destructive'
                                        : storage.usagePercentage > 80
                                        ? 'bg-warning/10 border-warning text-warning'
                                        : 'bg-sidebar-primary/10 border-sidebar-primary/20 text-sidebar-primary'
                                    }
                                `}
                                title={`Storage: ${storage.usagePercentage}% used.`}
                            >
                                <HardDrive className="w-4 h-4" />
                                <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-popover border border-border text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap z-50">
                                    Storage: {storage.usagePercentage}% ({storage.usedMb}/{storage.limitMb} MB)
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Storage</span>
                                    <span>{storage.usagePercentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-sidebar-accent/50 rounded-full border border-border/50 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            storage.isExceeded
                                                ? 'bg-destructive animate-pulse'
                                                : storage.usagePercentage > 80
                                                ? 'bg-warning'
                                                : 'bg-sidebar-primary'
                                        }`}
                                        style={{ width: `${Math.min(storage.usagePercentage, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                    <span>{storage.usedMb} / {storage.limitMb} MB</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}




            </aside>
        </>
    )
}