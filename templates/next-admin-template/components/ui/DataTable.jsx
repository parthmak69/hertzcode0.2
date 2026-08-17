'use client'

import { useState, useEffect } from 'react'
import { useRouter } from "next/navigation"
import { Eye, Pencil, Trash2, Check, X, MoreVertical } from 'lucide-react'
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
    onExportExcel,
    exportLoading = false,
    filters: filtersProp,
    showHeaderFilters = true,
    selectedIds = [],
    onSelectedIdsChange,
    enableInlineEdit = false,
    onInlineSave,
}) {
    const router = useRouter()
    const [localFilters, setLocalFilters] = useState(filtersProp || {})

    const [editingRowId, setEditingRowId] = useState(null)
    const [editValues, setEditValues] = useState(null)
    const [activeDropdownRowId, setActiveDropdownRowId] = useState(null)

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (activeDropdownRowId && !e.target.closest('[data-dropdown-container]')) {
                setActiveDropdownRowId(null)
            }
        }
        window.addEventListener('click', handleOutsideClick)
        return () => window.removeEventListener('click', handleOutsideClick)
    }, [activeDropdownRowId])

    const readOnlyKeys = ['id', 'created_at', 'createdOn', 'created_on', 'createdAt', 'updated_at', 'updatedOn', 'updated_on', 'updatedAt']

    const startInlineEdit = (item) => {
        setEditingRowId(item.id)
        // Only copy visible column values + id to avoid sending virtual aliases back to backend
        const cleanValues = { id: item.id }
        columns.forEach((col) => {
            if (visibleColumns.includes(col.key)) {
                cleanValues[col.key] = item[col.key]
            }
        })
        setEditValues(cleanValues)
    }

    const handleInlineChange = (colKey, val) => {
        setEditValues((prev) => ({
            ...prev,
            [colKey]: val,
        }))
    }

    const saveInlineEdit = async () => {
        if (onInlineSave) {
            const success = await onInlineSave(editingRowId, editValues)
            if (success) {
                setEditingRowId(null)
                setEditValues(null)
            }
        } else {
            setEditingRowId(null)
            setEditValues(null)
        }
    }

    const cancelInlineEdit = () => {
        setEditingRowId(null)
        setEditValues(null)
    }

    const renderInlineInput = (col, item) => {
        const colKey = col.key
        const val = editValues ? editValues[colKey] : null
        // Use the current edit value for type detection, falling back to the original item value
        const refVal = val !== undefined && val !== null ? val : item[colKey]

        if (readOnlyKeys.includes(colKey)) {
            return renderCell ? renderCell(item, colKey) : item[colKey]
        }

        // Skip inline edit for arrays and objects — render them read-only
        if (Array.isArray(refVal) || (typeof refVal === 'object' && refVal !== null)) {
            return renderCell ? renderCell(item, colKey) : item[colKey]
        }

        if (colKey === 'switch_active' || colKey === 'checkbox_toggle' || typeof refVal === 'boolean') {
            const isChecked = val === 1 || val === true
            return (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isChecked ? 'bg-primary' : 'bg-secondary'}`}>
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleInlineChange(colKey, e.target.checked ? 1 : 0)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isChecked ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {isChecked ? 'On' : 'Off'}
                    </span>
                </label>
            )
        }

        if (colKey === 'integer_qty' || colKey === 'decimal_price' || colKey === 'tax_percentage' || colKey === 'range_slider_value' || typeof refVal === 'number') {
            return (
                <input
                    type="number"
                    step={colKey === 'decimal_price' || colKey === 'tax_percentage' ? '0.01' : '1'}
                    value={val ?? ''}
                    onChange={(e) => handleInlineChange(colKey, e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
            )
        }

        if (colKey === 'date_picker' || colKey === 'datetime_picker' || (typeof refVal === 'string' && refVal.match && refVal.match(/^\d{4}-\d{2}-\d{2}/))) {
            let dateStr = ''
            if (val) {
                try {
                    dateStr = new Date(val).toISOString().split('T')[0]
                } catch {
                    dateStr = typeof val === 'string' ? val : ''
                }
            }
            return (
                <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => handleInlineChange(colKey, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
            )
        }

        return (
            <input
                type="text"
                value={val ?? ''}
                onChange={(e) => handleInlineChange(colKey, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
        )
    }

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

            <div className="hidden md:block overflow-auto min-h-[300px] max-h-[65vh]">
                <table className="w-full text-sm text-left relative">
                    <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-md">
                        <tr className="border-b border-border">
                            {showActions && (
                                <th className="px-4 py-3 w-16 select-none" />
                            )}
                            {onSelectedIdsChange && (
                                <th className="px-4 py-3 text-left w-12 select-none">
                                    <input
                                        type="checkbox"
                                        checked={data && data.length > 0 && selectedIds.length === data.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                onSelectedIdsChange(data.map(item => item.id))
                                            } else {
                                                onSelectedIdsChange([])
                                            }
                                        }}
                                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4 animate-fade-in"
                                    />
                                </th>
                            )}
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">#</th>

                            {columns
                                .filter((c) => visibleColumns.includes(c.key))
                                .map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable !== false && handleSort(col.key)}
                                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer group select-none hover:text-foreground transition-colors"
                                        style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.label}
                                            {getSortIcon(col.key)}
                                        </div>
                                    </th>
                                ))}
                        </tr>

                        {/* Filter Row */}
                        {showHeaderFilters && (
                            <tr className="border-b border-border shadow-sm bg-card z-10 sticky top-[41px]">
                                {showActions && <th className="px-4 py-2"></th>}
                                {onSelectedIdsChange && <th className="px-4 py-2"></th>}
                                <th className="px-4 py-2"></th>

                                {columns
                                    .filter((c) => visibleColumns.includes(c.key))
                                    .map((col) => (
                                        <th 
                                            key={col.key} 
                                            className="px-4 py-2 font-normal"
                                            style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                                        >
                                            {col.filterable !== false
                                                ? getFilterInput(col)
                                                : null}
                                        </th>
                                    ))}
                            </tr>
                        )}
                    </thead>

                    <tbody className="divide-y divide-border/50">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (showActions ? 2 : 1) + (onSelectedIdsChange ? 1 : 0)}
                                    className="px-4 py-20 text-center"
                                >
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading records...</p>
                                </td>
                            </tr>
                        ) : !data?.length ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (showActions ? 2 : 1) + (onSelectedIdsChange ? 1 : 0)}
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
                                    {showActions && (
                                        <td className="px-4 py-3.5 text-left w-16">
                                            {editingRowId === item.id ? (
                                                <div className="flex items-center justify-start gap-2">
                                                    <button
                                                        onClick={saveInlineEdit}
                                                        className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                                        title="Save inline edit"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={cancelInlineEdit}
                                                        className="p-1.5 rounded-md text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        title="Cancel inline edit"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative inline-block text-left" data-dropdown-container>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setActiveDropdownRowId(activeDropdownRowId === item.id ? null : item.id)
                                                        }}
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer focus:outline-none"
                                                        title="Actions"
                                                    >
                                                        <MoreVertical className="w-4.5 h-4.5" />
                                                    </button>

                                                    {activeDropdownRowId === item.id && (
                                                        <div 
                                                            className={`absolute left-0 w-36 rounded-xl border border-border bg-card shadow-lg z-30 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150 ${
                                                                index >= data.length - 2 && data.length > 2 ? 'bottom-full mb-1' : 'mt-1'
                                                            }`}
                                                        >
                                                            {(onView || viewPath) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setActiveDropdownRowId(null)
                                                                        handleView(item)
                                                                    }}
                                                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" /> View
                                                                </button>
                                                            )}

                                                            {onEdit && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setActiveDropdownRowId(null)
                                                                        if (enableInlineEdit) startInlineEdit(item)
                                                                        else onEdit(item)
                                                                    }}
                                                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                                </button>
                                                            )}

                                                            {onDelete && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setActiveDropdownRowId(null)
                                                                        onDelete(item.id)
                                                                    }}
                                                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            )}

                                                            {renderExtraActions && (
                                                                <div className="border-t border-border/60 mt-1.5 pt-1.5">
                                                                    {renderExtraActions(item, () => setActiveDropdownRowId(null))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    {onSelectedIdsChange && (
                                        <td className="px-4 py-3.5 text-left select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        onSelectedIdsChange([...selectedIds, item.id])
                                                    } else {
                                                        onSelectedIdsChange(selectedIds.filter(id => id !== item.id))
                                                    }
                                                }}
                                                className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 py-3.5 text-muted-foreground font-medium">
                                        {startIndex + index + 1}
                                    </td>

                                    {columns
                                        .filter((c) => visibleColumns.includes(c.key))
                                        .map((col) => (
                                            <td 
                                                key={col.key} 
                                                className="px-4 py-3.5 text-foreground"
                                                style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                                            >
                                                {editingRowId === item.id
                                                    ? renderInlineInput(col, item)
                                                    : (renderCell ? renderCell(item, col.key) : item[col.key])
                                                }
                                            </td>
                                        ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View (Visible under 'md' screen size) */}
            <div className="block md:hidden p-4 space-y-4 bg-secondary/15 dark:bg-background/25 overflow-y-auto max-h-[65vh]">
                {!data?.length ? (
                    <div className="px-4 py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border/80 shadow-sm">
                        <svg className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-foreground font-semibold text-sm">No records found</p>
                        <p className="mt-1 text-xs text-muted-foreground">Adjust filters or create a new entry.</p>
                    </div>
                ) : (
                    data.map((item, index) => (
                        <div key={item.id} className="p-4 space-y-3.5 bg-card rounded-2xl border border-border/80 shadow-sm hover:shadow hover:border-primary/20 transition-all duration-200">
                            {/* Card Header: Checkbox, Index, Actions Dropdown */}
                            <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                                <div className="flex items-center gap-3">
                                    {onSelectedIdsChange && (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    onSelectedIdsChange([...selectedIds, item.id])
                                                } else {
                                                    onSelectedIdsChange(selectedIds.filter(id => id !== item.id))
                                                }
                                            }}
                                            className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                        />
                                    )}
                                    <span className="text-xs font-bold text-muted-foreground font-mono">
                                        #{startIndex + index + 1}
                                    </span>
                                </div>

                                {/* Actions Dropdown on Mobile */}
                                {showActions && (
                                    <div className="relative" data-dropdown-container>
                                        {editingRowId === item.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={saveInlineEdit}
                                                    className="p-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer active:scale-95 transition"
                                                    title="Save inline edit"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={cancelInlineEdit}
                                                    className="p-1 rounded bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 cursor-pointer active:scale-95 transition"
                                                    title="Cancel inline edit"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveDropdownRowId(activeDropdownRowId === item.id ? null : item.id)
                                                    }}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer focus:outline-none"
                                                    title="Actions"
                                                >
                                                    <MoreVertical className="w-4.5 h-4.5" />
                                                </button>

                                                {activeDropdownRowId === item.id && (
                                                    <div 
                                                        className={`absolute right-0 w-36 rounded-xl border border-border bg-card shadow-lg z-30 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150 ${
                                                            index >= data.length - 2 && data.length > 2 ? 'bottom-full mb-1' : 'mt-1'
                                                        }`}
                                                    >
                                                        {(onView || viewPath) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdownRowId(null)
                                                                    handleView(item)
                                                                }}
                                                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> View
                                                            </button>
                                                        )}

                                                        {onEdit && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdownRowId(null)
                                                                    if (enableInlineEdit) startInlineEdit(item)
                                                                    else onEdit(item)
                                                                }}
                                                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                        )}

                                                        {onDelete && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setActiveDropdownRowId(null)
                                                                    onDelete(item.id)
                                                                }}
                                                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                                            </button>
                                                        )}

                                                        {renderExtraActions && (
                                                            <div className="border-t border-border/60 mt-1.5 pt-1.5">
                                                                {renderExtraActions(item, () => setActiveDropdownRowId(null))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Card Body: Dynamic Column list */}
                            <div className="space-y-2 pt-1.5">
                                {columns
                                    .filter((c) => visibleColumns.includes(c.key))
                                    .map((col) => (
                                        <div key={col.key} className="grid grid-cols-3 gap-2 py-1.5 text-xs border-b border-border/20 last:border-0 pb-2 last:pb-0 font-medium">
                                            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider self-center">
                                                {col.label}
                                            </span>
                                            <div className="col-span-2 text-foreground text-right self-center min-w-0 break-all">
                                                {editingRowId === item.id
                                                    ? renderInlineInput(col, item)
                                                    : (renderCell ? renderCell(item, col.key) : item[col.key])
                                                }
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-4 border-t border-border bg-card gap-4">

                <div className="flex items-center gap-2">

                    {onExportExcel && (
                        <button
                            onClick={onExportExcel}
                            disabled={exportLoading}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 opacity-70 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Export Excel
                        </button>
                    )}
                    {!onExportExcel && <div />}
                </div>

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
