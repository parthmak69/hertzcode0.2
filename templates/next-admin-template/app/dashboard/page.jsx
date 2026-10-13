'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/utils/api'
import {
    Database,
    Shield,
    Settings,
    Folder,
    Package,
    ArrowUpRight,
    RefreshCw,
    Layers,
    LayoutGrid,
    ClipboardList
} from 'lucide-react'

export default function DashboardPage() {
    const [counts, setCounts] = useState({
        categories: 0,
        admins: 0,
        settings: 0,
        products: 0,
        dynamicTables: 6
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchLiveCounts = async () => {
        setRefreshing(true)
        try {
            const results = await Promise.allSettled([
                apiClient.get('/admin/categories?limit=1&page=1'),
                apiClient.get('/admin/admins?limit=1&page=1'),
                apiClient.get('/admin/settings?limit=1&page=1'),
                apiClient.get('/admin/products?limit=1&page=1'),
                apiClient.get('/crud/schemas').catch(() => null)
            ])

            const [catRes, adminRes, setRes, prodRes, schemaRes] = results

            const parseCount = (settled) => {
                if (settled.status === 'fulfilled' && settled.value && settled.value.success) {
                    return settled.value.pagination?.total ?? (Array.isArray(settled.value.data) ? settled.value.data.length : 0)
                }
                return 0
            }

            const dynamicTableCount = (schemaRes.status === 'fulfilled' && schemaRes.value?.schemas?.length) 
                ? Math.max(6, schemaRes.value.schemas.length) 
                : 6

            setCounts({
                categories: parseCount(catRes),
                admins: parseCount(adminRes),
                settings: parseCount(setRes),
                products: parseCount(prodRes),
                dynamicTables: dynamicTableCount
            })
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchLiveCounts()

        // Real-time synchronization listeners
        const handleSync = () => {
            fetchLiveCounts()
        }
        window.addEventListener('storage-updated', handleSync)
        window.addEventListener('db-change', handleSync)
        return () => {
            window.removeEventListener('storage-updated', handleSync)
            window.removeEventListener('db-change', handleSync)
        }
    }, [])

    return (
        <div className="space-y-8">
            {/* Greeting Banner */}
            <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Admin Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Control panel system overview, active databases, and quick actions.</p>
                </div>
                <button
                    onClick={fetchLiveCounts}
                    disabled={refreshing}
                    className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    title="Refresh KPI statistics"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                    <span>Sync Statistics</span>
                </button>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Categories */}
                <Link
                    href="/categories"
                    className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Folder className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Product Categories</span>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mt-1" />
                            ) : (
                                <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.categories}</h2>
                            )}
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Link>

                {/* Admins */}
                <Link
                    href="/admins"
                    className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4 hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Admin Users</span>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mt-1" />
                            ) : (
                                <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.admins}</h2>
                            )}
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-500 transition-colors" />
                </Link>

                {/* Dynamic Tables */}
                <Link
                    href="/dynamic-tables"
                    className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4 hover:border-sky-500/40 hover:shadow-md transition-all duration-200 group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Dynamic Tables</span>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mt-1" />
                            ) : (
                                <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.dynamicTables}</h2>
                            )}
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-sky-500 transition-colors" />
                </Link>

                {/* Settings */}
                <Link
                    href="/settings"
                    className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Settings Configs</span>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-1" />
                            ) : (
                                <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.settings}</h2>
                            )}
                        </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors" />
                </Link>
            </div>

            {/* Quick Access Grid */}
            <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Quick Module Management</h3>
                        <p className="text-xs text-muted-foreground">Directly access primary catalog modules and admin tools.</p>
                    </div>
                    <Link
                        href="/dynamic-tables"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                        <span>View All Tables</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    <Link
                        href="/categories"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <Folder className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Categories</span>
                    </Link>
                    <Link
                        href="/products"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <Package className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Products</span>
                    </Link>
                    <Link
                        href="/admins"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <Shield className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Admins</span>
                    </Link>
                    <Link
                        href="/settings"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <Settings className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Settings</span>
                    </Link>
                    <Link
                        href="/portfolio_cards"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <LayoutGrid className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Portfolio</span>
                    </Link>
                    <Link
                        href="/master-form"
                        className="p-3.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-secondary/40 transition text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                    >
                        <ClipboardList className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-foreground">Master Form</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
