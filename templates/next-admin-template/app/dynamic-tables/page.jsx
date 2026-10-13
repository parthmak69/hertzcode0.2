'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { apiClient } from '@/utils/api'
import {
    Database,
    Search,
    RefreshCw,
    ExternalLink,
    Folder,
    Shield,
    Settings,
    Package,
    ClipboardList,
    LayoutGrid,
    Table,
    Layers,
    CheckCircle2
} from 'lucide-react'

// System module definitions with metadata
const CORE_MODULES = [
    {
        id: 'categories',
        name: 'Categories Catalog',
        table: 'categories',
        href: '/categories',
        apiEndpoint: '/admin/categories',
        description: 'Hierarchical product catalog tree with nested subcategories.',
        type: 'Catalog',
        icon: Folder,
        color: 'text-primary bg-primary/10 border-primary/20'
    },
    {
        id: 'products',
        name: 'Products Inventory',
        table: 'products',
        href: '/products',
        apiEndpoint: '/admin/products',
        description: 'Physical and digital goods catalog with pricing, stock and media.',
        type: 'Inventory',
        icon: Package,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    {
        id: 'admins',
        name: 'Admin Users & Security',
        table: 'admins',
        href: '/admins',
        apiEndpoint: '/admin/admins',
        description: 'Platform administrators, role access levels, and security tokens.',
        type: 'System Core',
        icon: Shield,
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    },
    {
        id: 'settings',
        name: 'System Settings',
        table: 'settings',
        href: '/settings',
        apiEndpoint: '/admin/settings',
        description: 'Global site configuration keys, currencies, and system flags.',
        type: 'Configuration',
        icon: Settings,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
        id: 'portfolio_cards',
        name: 'Portfolio Cards',
        table: 'portfolio_cards',
        href: '/portfolio_cards',
        fallbackHref: '/portfolio',
        apiEndpoint: '/admin/portfolio',
        description: 'Visual showcase cards, external link redirects, and category folders.',
        type: 'Media Showcase',
        icon: LayoutGrid,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
        id: 'master_form_inputs',
        name: 'Master Form Sandbox',
        table: 'master_form_inputs',
        href: '/master-form',
        fallbackHref: '/master_form_input',
        apiEndpoint: '/admin/master-form',
        description: 'Universal input field engine supporting WYSIWYG, JSON, and file pickers.',
        type: 'Form Engine',
        icon: ClipboardList,
        color: 'text-violet-500 bg-violet-500/10 border-violet-500/20'
    }
]

export default function DynamicTablesPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [counts, setCounts] = useState({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [customTables, setCustomTables] = useState([])

    const fetchAllCounts = async () => {
        setRefreshing(true)
        const updatedCounts = {}

        try {
            // 1. Fetch counts for core modules in parallel
            await Promise.all(
                CORE_MODULES.map(async (mod) => {
                    try {
                        const res = await apiClient.get(`${mod.apiEndpoint}?limit=1&page=1`)
                        if (res && res.success) {
                            const count = res.pagination?.total ?? (Array.isArray(res.data) ? res.data.length : 0)
                            updatedCounts[mod.id] = count
                        } else {
                            updatedCounts[mod.id] = 0
                        }
                    } catch (e) {
                        updatedCounts[mod.id] = 0
                    }
                })
            )

            // 2. Fetch any dynamic schemas from generator API if available
            try {
                const schemaRes = await apiClient.get('/crud/schemas').catch(() => null)
                if (schemaRes && schemaRes.success && Array.isArray(schemaRes.schemas)) {
                    const extra = schemaRes.schemas
                        .filter(s => !CORE_MODULES.some(m => m.id === s.name || m.table === s.tableName))
                        .map(s => ({
                            id: s.name,
                            name: s.name.replace(/_/g, ' '),
                            table: s.tableName || s.name,
                            href: `/${s.name.toLowerCase()}`,
                            apiEndpoint: `/admin/${s.name}`,
                            description: `Dynamic table generated with ${s.columns?.length || 0} configured columns.`,
                            type: 'Custom CRUD',
                            icon: Table,
                            color: 'text-sky-500 bg-sky-500/10 border-sky-500/20'
                        }))
                    setCustomTables(extra)
                }
            } catch (e) {}

            setCounts(updatedCounts)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAllCounts()
    }, [])

    const allTablesList = useMemo(() => {
        return [...CORE_MODULES, ...customTables]
    }, [customTables])

    const filteredTables = useMemo(() => {
        if (!searchQuery.trim()) return allTablesList
        const q = searchQuery.toLowerCase().trim()
        return allTablesList.filter(t => 
            t.name.toLowerCase().includes(q) ||
            t.table.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        )
    }, [allTablesList, searchQuery])

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Database className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Dynamic Tables & Modules</h1>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Live catalog of active database tables, CRUD modules, and entity counts across your application.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchAllCounts}
                        disabled={refreshing}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border/60 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Refresh counts from database"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <Link
                        href="/dashboard"
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition active:scale-95 cursor-pointer shadow-sm"
                    >
                        Dashboard
                    </Link>
                </div>
            </div>

            {/* Search and Overview Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filter tables by name, schema, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-card border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto font-medium">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Total Modules: <strong className="text-foreground">{allTablesList.length}</strong></span>
                </div>
            </div>

            {/* Tables Grid */}
            {filteredTables.length === 0 ? (
                <div className="py-20 text-center border border-dashed rounded-2xl border-border/80 bg-card p-6">
                    <Database className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <h3 className="text-sm font-bold text-foreground">No Tables Match Search</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                        No database modules found matching "{searchQuery}". Try clearing the filter.
                    </p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition"
                    >
                        Clear Filter
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTables.map((mod) => {
                        const IconComponent = mod.icon || Table
                        const count = counts[mod.id]

                        return (
                            <div
                                key={mod.id}
                                className="bg-card/70 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${mod.color}`}>
                                            <IconComponent className="w-5 h-5" />
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border/50">
                                            {mod.type}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        {mod.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                        {mod.description}
                                    </p>
                                </div>

                                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                                    <div className="text-xs">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/80 block">Records</span>
                                        <span className="font-extrabold text-foreground text-sm">
                                            {loading ? '...' : (count !== undefined ? count.toLocaleString() : 'Active')}
                                        </span>
                                    </div>

                                    <Link
                                        href={mod.href}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition active:scale-95 shadow-sm"
                                    >
                                        <span>Manage</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
