'use client'

import { useState, useEffect } from 'react'
import { useRouter } from "next/navigation"
import { Eye, Pencil, Trash2 } from 'lucide-react'
import Pagination from './Pagination'

export default function DataTable({
    columns,
    data,
    visibleColumns,
    renderCell,
    viewPath,
    onView,
    onEdit,
    onDelete,
    renderExtraActions,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    loading,
    onFilterChange,
    sortConfig,
    onSort,
    startIndex = 0,
    onExport,
    exportLoading = false,
    filters: filtersProp,
    showHeaderFilters = true,
}) {
    const router = useRouter()
    const [localFilters, setLocalFilters] = useState(filtersProp || {})

    useEffect(() => {
        if (filtersProp && Object.keys(filtersProp).length > 0) {
            setLocalFilters((prev) => ({ ...prev, ...filtersProp }))
        }
    }, [filtersProp])

    const showActions = onView || viewPath || onEdit || onDelete || renderExtraActions
    const handleFilterChange = (key, value) => {
        const newFilters = { ...localFilters, [key]: value }
        setLocalFilters(newFilters)
        onFilterChange?.(newFilters)
    }

    const handleSort = (key) => {
        if (!onSort) return

        if (sortConfig?.key === key) {
            if (sortConfig.direction === 'asc') {
                onSort({ key, direction: 'desc' })
            } else {
                onSort({ key: null, direction: null })
            }
        } else {
            onSort({ key, direction: 'asc' })
        }
    }

    const handleView = (item) => {
        if (onView) {
            onView(item)
            return
        }

        if (viewPath) {
            router.push(`${viewPath}/${item.id}`)
        }
    }

    const getSortIcon = (key) => {
        if (sortConfig?.key !== key) {
            return (
                <svg
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 text-muted-foreground transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            )
        }

        return (
            <svg className="w-3.5 h-3.5 text-primary transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortConfig.direction === 'asc' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
            </svg>
        )
    }

    const getFilterInput = (col) => {
        const baseClass = `
            w-full px-2.5 py-1.5 text-sm rounded-md border
            bg-secondary/30 border-border text-foreground transition-all duration-200
            placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-card
        `

        return (
            <input
                type="text"
                placeholder="Filter..."
                value={localFilters[col.key] || ''}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                className={baseClass}
            />
        )
    }

    const getRowBg = (index) =>
        index % 2 === 0 ? 'bg-card' : 'bg-muted/20'

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">

            <div className="overflow-auto min-h-[300px] max-h-[65vh]">
                <table className="w-full min-w-[700px] text-sm text-left relative">
                    <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-md">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">#</th>

                            {columns
                                .filter((c) => visibleColumns.includes(c.key))
                                .map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable !== false && handleSort(col.key)}
                                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer group select-none hover:text-foreground transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.label}
                                            {getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}

                            {showActions && (
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-32">
                                    Actions
                                </th>
                            )}
                        </tr>

                        {/* Filter Row */}
                        {showHeaderFilters && (
                            <tr className="border-b border-border shadow-sm bg-card z-10 sticky top-[41px]">
                                <th className="px-4 py-2"></th>

                                {columns
                                    .filter((c) => visibleColumns.includes(c.key))
                                    .map((col) => (
                                        <th key={col.key} className="px-4 py-2 font-normal">
                                            {col.filterable !== false
                                                ? getFilterInput(col)
                                                : null}
                                        </th>
                                    ))}

                                {showActions && <th className="px-4 py-2"></th>}
                            </tr>
                        )}
                    </thead>

                    <tbody className="divide-y divide-border/50">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (showActions ? 2 : 1)}
                                    className="px-4 py-20 text-center"
                                >
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading records...</p>
                                </td>
                            </tr>
                        ) : !data?.length ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (showActions ? 2 : 1)}
                                    className="px-4 py-24 text-center"
                                >
                                    <svg className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="text-foreground font-medium text-base">No records found</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or creating a new entry.</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={`${getRowBg(index)} hover:bg-secondary/40 transition-colors duration-150`}
                                >
                                    <td className="px-4 py-3.5 text-muted-foreground font-medium">
                                        {startIndex + index + 1}
                                    </td>

                                    {columns
                                        .filter((c) => visibleColumns.includes(c.key))
                                        .map((col) => (
                                            <td key={col.key} className="px-4 py-3.5 text-foreground">
                                                {renderCell(item, col.key)}
                                            </td>
                                        ))}

                                    {showActions && (
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">

                                                {(onView || viewPath) && (
                                                    <button
                                                        onClick={() => handleView(item)}
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(item)}
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(item.id)}
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {renderExtraActions?.(item)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-4 border-t border-border bg-card gap-4">

                {onExport ? (
                    <button
                        onClick={onExport}
                        disabled={exportLoading}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Export CSV
                    </button>
                ) : (
                    <div />
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={onPageChange}
                    onItemsPerPageChange={onItemsPerPageChange}
                />
            </div>
        </div>
    )
}
