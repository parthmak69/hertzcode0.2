'use client'

import { useState, useEffect, useMemo } from 'react'
import useAdminCrud from '@/hooks/useAdminCrud'
import SettingModal from '@/components/modals/SettingModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Pagination from '@/components/ui/Pagination'
import { 
    Search, 
    Pencil, 
    Settings
} from 'lucide-react'

export default function SettingsPage() {
    const {
        data,
        loading,
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        startIndex,
        setCurrentPage,
        setItemsPerPage,
        update
    } = useAdminCrud({
        endpoint: '/admin/settings',
        defaultSort: { key: 'id', direction: 'desc' }
    })

    // Search query state
    const [searchQuery, setSearchQuery] = useState('')

    // Modal and Confirmation Dialog states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState(null)

    // Filter items locally based on search query
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            return searchQuery
                ? item.setting_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.setting_value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                : true
        })
    }, [data, searchQuery])

    // Handle search query updates
    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearchQuery(value)
        setCurrentPage(1)
    }



    // Save modal records
    const handleSaveRecord = async (formData) => {
        try {
            if (editingRecord) {
                const res = await update(editingRecord.id, formData)
                return res?.success
            }
            return false
        } catch (err) {
            console.error('[Settings Page Save Error]', err)
            return false
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Heading Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">System Settings</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage and configure site-wide settings parameters.</p>
                </div>
            </div>

            {/* Search and Selection Filters header */}
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/20 p-4 rounded-xl border border-border/60">
                    {/* Search Field */}
                    <div className="relative flex-1 max-w-md w-full">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search settings key, value or description..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground text-xs font-semibold"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                        {searchQuery.trim() && (
                            <span className="text-xs text-muted-foreground font-medium bg-background px-3 py-1 rounded-full border border-border hidden sm:inline-block">
                                Found {filteredData.length} matches
                            </span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-20 border border-dashed rounded-2xl border-border/80">
                        <Settings className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="text-base font-bold text-foreground">No Settings Found</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            No configuration settings matched your search query.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Settings Table (Desktop) */}
                        <div className="hidden lg:block overflow-x-auto rounded-xl border border-border/60">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-secondary/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        <th className="py-3 px-4 w-64">Setting Key</th>
                                        <th className="py-3 px-4">Value</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4 w-28 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {filteredData.map((item) => {
                                        return (
                                            <tr 
                                                key={item.id}
                                                className="hover:bg-secondary/20 transition"
                                            >
                                                <td className="py-3.5 px-4 font-semibold text-foreground">
                                                    <code className="px-2 py-1 rounded bg-secondary text-xs text-primary font-mono select-all">
                                                        {item.setting_key}
                                                    </code>
                                                </td>
                                                <td className="py-3.5 px-4 text-foreground break-all max-w-xs font-medium">
                                                    {item.setting_value}
                                                </td>
                                                <td className="py-3.5 px-4 text-muted-foreground text-xs leading-relaxed">
                                                    {item.description || <span className="italic text-muted-foreground/30">No description</span>}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setEditingRecord(item)
                                                                setIsModalOpen(true)
                                                            }}
                                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition active:scale-95 cursor-pointer"
                                                            title="Edit setting"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Card List (Mobile) */}
                        <div className="block lg:hidden space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredData.map((item) => (
                                    <div key={item.id} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col gap-3">
                                        {/* Header: Key */}
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block mb-1.5">Setting Key</span>
                                            <code className="px-2 py-1 rounded bg-secondary text-xs text-primary font-mono select-all block w-fit">
                                                {item.setting_key}
                                            </code>
                                        </div>

                                        {/* Value */}
                                        <div className="border-t border-border/40 pt-3">
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Value</span>
                                            <p className="font-bold text-foreground text-xs sm:text-sm mt-0.5 break-all leading-normal">{item.setting_value}</p>
                                        </div>

                                        {/* Description */}
                                        <div className="border-t border-border/40 pt-3">
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Description</span>
                                            <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                                                {item.description || <span className="italic text-muted-foreground/30">No description</span>}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingRecord(item)
                                                    setIsModalOpen(true)
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95"
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Edit Setting
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center pt-6 border-t border-border/40">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                )}
            </div>

            {/* Create/Edit Setting Modal */}
            <SettingModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingRecord(null)
                }}
                onSave={handleSaveRecord}
                record={editingRecord}
            />


        </div>
    )
}
