'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/utils/api'
import {
    Database,
    Shield,
    Settings,
    Folder
} from 'lucide-react'

export default function DashboardPage() {
    // Using static dummy numbers for the default dashboard
    const counts = { admins: 3, settings: 12, dynamicTables: 24, categories: 8 }
    const loading = false

    return (
        <div className="space-y-8">
            {/* Greeting Banner */}
            <div className="bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Control panel system overview and system settings.</p>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Categories */}
                <div className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
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

                {/* Admins */}
                <div className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
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

                {/* Dynamic Tables */}
                <div className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-info/10 text-info rounded-xl flex items-center justify-center">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Dynamic Tables</span>
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-info border-t-transparent rounded-full animate-spin mt-1" />
                        ) : (
                            <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.dynamicTables}</h2>
                        )}
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-success/10 text-success rounded-xl flex items-center justify-center">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Settings Configs</span>
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-success border-t-transparent rounded-full animate-spin mt-1" />
                        ) : (
                            <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{counts.settings}</h2>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
