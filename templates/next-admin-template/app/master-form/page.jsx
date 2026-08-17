'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import ColumnSelector from '@/components/ui/ColumnSelector'
import MasterForm from '@/components/forms/MasterForm'
import { exportToExcel } from '@/utils/exportExcel'
import { apiClient } from '@/utils/api'
import useAdminCrud from '@/hooks/useAdminCrud'
import useColumnVisibility from '@/hooks/useColumnVisibility'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Play, Eye, Plus, FileSpreadsheet, Search, Sliders, Database, HelpCircle, Upload, Trash2, X, Globe, Calendar, Tag, Mail, Phone, Layers, Pencil, Image } from 'lucide-react'
import ImportModal from '@/components/modals/ImportModal'

const allColumns = [
    { key: 'id', label: 'ID', sortable: true, width: '50px' },
    { key: 'text_title', label: 'Record Name', sortable: true, width: '160px' },
    { key: 'slug', label: 'URL Slug', width: '100px' },
    { key: 'email', label: 'Email', width: '140px' },
    { key: 'integer_qty', label: 'Qty / Stock', sortable: true, width: '80px' },
    { key: 'decimal_price', label: 'Price (₹)', sortable: true, width: '85px' },
    { key: 'multi_select_tags', label: 'Tags', width: '100px' },
    { key: 'date_picker', label: 'Date', sortable: true, width: '95px' },
    { key: 'switch_active', label: 'Active Toggle', width: '110px' },
]

export default function MasterFormPage() {
    const {
        data: records,
        loading,
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        sortConfig,
        filters,
        startIndex,
        setCurrentPage,
        setItemsPerPage,
        setSortConfig,
        setFilters,
        create,
        update,
        remove,
        removeBulk,
        getById,
        refetch,
    } = useAdminCrud({ endpoint: '/admin/master-form' })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState(null)
    const [formError, setFormError] = useState('')
    const [visibleColumns, setVisibleColumns] = useColumnVisibility('master_form_inputs', allColumns)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editLoading, setEditLoading] = useState(false)
    const [toggleLoadingId, setToggleLoadingId] = useState(null)

    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

    // Bottom Sheet Detail States for Mobile
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
    const [activeSheetRecord, setActiveSheetRecord] = useState(null)

    const handleOpenBottomSheet = async (record) => {
        try {
            const fullRecord = await getById(record.id)
            if (fullRecord) {
                setActiveSheetRecord(fullRecord)
                setIsBottomSheetOpen(true)
            } else {
                alert('Failed to load record details')
            }
        } catch (err) {
            console.error('Failed to load record details:', err)
            alert('Failed to load record details')
        }
    }

    // Reset selection when page or search filters change
    useEffect(() => {
        setSelectedIds([])
    }, [currentPage, filters])


    // Dashboard metrics calculation
    const activeCount = records.filter(r => r.switch_active === 1 || r.switch_active === true).length
    const avgRating = records.length > 0
        ? Math.round(records.reduce((acc, r) => acc + (r.range_slider_value || 0), 0) / records.length)
        : 0
    const totalQty = records.reduce((acc, r) => acc + (r.integer_qty || 0), 0)

    const handleAdd = () => {
        setEditingRecord(null)
        setFormError('')
        setIsModalOpen(true)
    }

    const handleEdit = async (record) => {
        setEditLoading(true)
        try {
            const fullRecord = await getById(record.id)
            if (!fullRecord) {
                setFormError('Failed to load record details')
                return
            }
            setEditingRecord(fullRecord)
            setFormError('')
            setIsModalOpen(true)
        } catch {
            setFormError('Failed to load record details')
        } finally {
            setEditLoading(false)
        }
    }

    const handleDelete = (id) => setDeleteId(id)

    const confirmDelete = async () => {
        setDeleteLoading(true)
        try {
            await remove(deleteId)
            setDeleteId(null)
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleBulkDelete = () => {
        setIsBulkDeleteOpen(true)
    }

    const confirmBulkDelete = async () => {
        setBulkDeleteLoading(true)
        try {
            await removeBulk(selectedIds)
            setSelectedIds([])
            setIsBulkDeleteOpen(false)
        } finally {
            setBulkDeleteLoading(false)
        }
    }

    const handleBooleanToggle = async (id, fieldKey, currentValue) => {
        const nextValue = currentValue === 1 || currentValue === true ? 0 : 1
        setToggleLoadingId(id)
        try {
            const res = await update(id, { [fieldKey]: nextValue })
            if (!res.success) {
                alert(res.message || 'Failed to update toggle value')
            }
        } catch (err) {
            alert(err?.message || 'Failed to update toggle value')
        } finally {
            setToggleLoadingId(null)
        }
    }

    const handleInlineSave = async (id, updatedRow) => {
        try {
            if (!updatedRow.text_title?.trim()) {
                alert('Record name/title is required')
                return false
            }

            // Only send actual DB column fields — not virtual aliases from formatRow
            const payload = {}
            const allowedKeys = allColumns.map(c => c.key)
            for (const key of allowedKeys) {
                if (key === 'id') continue
                if (updatedRow[key] !== undefined) {
                    payload[key] = updatedRow[key]
                }
            }

            // Normalize types for backend
            if (payload.integer_qty !== undefined) payload.integer_qty = parseInt(payload.integer_qty ?? 0)
            if (payload.decimal_price !== undefined) payload.decimal_price = parseFloat(payload.decimal_price ?? 0.0)
            if (payload.switch_active !== undefined) payload.switch_active = payload.switch_active === true || payload.switch_active === 1 ? 1 : 0

            const res = await update(id, payload)
            if (res.success) {
                return true
            } else {
                alert(res.message || 'Failed to save inline edit')
                return false
            }
        } catch (err) {
            alert(err?.message || 'Failed to save inline edit')
            return false
        }
    }

    const handleSubmit = async (formData) => {
        setFormError('')
        try {
            if (!formData.text_title?.trim()) {
                setFormError('Record name / title is required')
                return
            }

            // Check if there are physical files to upload or deletion actions to trigger
            const hasFiles =
                formData.primaryImage instanceof File ||
                formData.documentFile instanceof File ||
                (formData.secondaryImages || []).some(item => item.file instanceof File) ||
                formData.primaryImageAction === 'remove' ||
                formData.documentFileAction === 'remove'

            let res
            if (hasFiles) {
                const body = new FormData()

                // Append standard fields, serializing arrays/objects safely
                Object.entries(formData).forEach(([k, v]) => {
                    if (['primaryImage', 'documentFile', 'secondaryImages', 'primary_image_url', 'document_file_url', 'gallery_images', 'primaryImageAction', 'documentFileAction'].includes(k)) return
                    if (v === undefined || v === null) return
                    body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
                })

                // 1. Primary Image parameters
                if (formData.primaryImage instanceof File) {
                    body.append('primary_image_file', formData.primaryImage)
                    body.append('primaryImageAction', 'upload')
                } else if (formData.primaryImageAction === 'remove') {
                    body.append('primaryImageAction', 'remove')
                } else {
                    body.append('primaryImageAction', 'none')
                    body.append('primary_image_url', formData.primary_image_url || '')
                }

                // 2. Document PDF/Image parameters
                if (formData.documentFile instanceof File) {
                    body.append('document_file', formData.documentFile)
                    body.append('documentFileAction', 'upload')
                } else if (formData.documentFileAction === 'remove') {
                    body.append('documentFileAction', 'remove')
                } else {
                    body.append('documentFileAction', 'none')
                    body.append('document_file_url', formData.document_file_url || '')
                }

                // 3. Secondary Gallery list parameters
                const existingGalleryUrls = []
                    ; (formData.secondaryImages || []).forEach(item => {
                        if (item.file instanceof File) {
                            body.append('gallery_files', item.file)
                        } else if (item.preview) {
                            // Strip base URL to save relative path if needed, or keep absolute
                            const pathOnly = item.preview.replace(/^(http|https):\/\/[^\/]+\//, '')
                            existingGalleryUrls.push(pathOnly)
                        } else if (typeof item === 'string') {
                            existingGalleryUrls.push(item)
                        }
                    })
                body.append('existing_gallery_urls', JSON.stringify(existingGalleryUrls))

                res = editingRecord
                    ? await update(editingRecord.id, body, true)
                    : await create(body, true)
            } else {
                // Regular JSON payload submit
                const payload = {
                    ...formData,
                    primary_image_url: formData.primary_image_url || '',
                    document_file_url: formData.document_file_url || '',
                    gallery_images: (formData.secondaryImages || []).map(item => item.preview || item)
                }

                res = editingRecord
                    ? await update(editingRecord.id, payload)
                    : await create(payload)
            }

            if (res.success) {
                setIsModalOpen(false)
                setEditingRecord(null)
            } else {
                setFormError(res.message || 'Something went wrong')
            }
        } catch (err) {
            setFormError(err?.message || 'Something went wrong')
        }
    }


    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)

    const handleExportExcel = () => {
        setIsExportModalOpen(true)
    }

    const handleExportCurrent = () => {
        exportToExcel(records, allColumns, 'master_form_inputs_sandbox')
        setIsExportModalOpen(false)
    }

    const handleExportAll = async () => {
        setExportLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', '1')
            params.set('limit', String(totalItems || 100000))
            if (sortConfig.key) {
                params.set('sort_by', sortConfig.key)
                params.set('sort_order', sortConfig.direction || 'asc')
            }
            const search = Object.values(filters).filter(Boolean).join(' ').trim()
            if (search) {
                params.set('search', search)
            }
            const url = `/admin/master-form?${params.toString()}`
            const res = await apiClient.get(url)
            if (res.success && res.data) {
                exportToExcel(res.data, allColumns, 'master_form_inputs_sandbox_all')
            } else {
                alert(res.message || 'Failed to fetch all records for export')
            }
        } catch (err) {
            console.error('Export all error:', err)
            alert('Failed to export all records')
        } finally {
            setExportLoading(false)
            setIsExportModalOpen(false)
        }
    }


    const renderCell = (item, colKey, rowIndex) => {
        switch (colKey) {
            case 'sr':
                return startIndex + rowIndex + 1

            case 'text_title':
                return (
                    <div className="font-semibold text-foreground"> 
                        {item.text_title || 'Untitled Sandbox Entry'}
                    </div>
                )

            case 'slug':
                return (
                    <code className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-mono">
                        {item.slug}
                    </code>
                )

            case 'email':
                return <span className="text-muted-foreground">{item.email || 'N/A'}</span>

            case 'integer_qty':
                return <span className="font-medium text-foreground">{item.integer_qty} units</span>

            case 'decimal_price':
                return <span className="font-semibold text-foreground">₹{parseFloat(item.decimal_price || 0).toFixed(2)}</span>

            case 'multi_select_tags':
                const tags = Array.isArray(item.multi_select_tags) ? item.multi_select_tags : []
                if (tags.length === 0) return <span className="text-xs text-muted-foreground/50">None</span>
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {tags.map((t) => (
                            <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20 capitalize"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )

            case 'date_picker':
                if (!item.date_picker) return <span className="text-muted-foreground">N/A</span>
                return (
                    <span className="text-xs text-muted-foreground">
                        {new Date(item.date_picker).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                )

            case 'switch_active':
            case 'checkbox_toggle': {
                const isActive = item[colKey] === 1 || item[colKey] === true
                return (
                    <button
                        type="button"
                        onClick={() => handleBooleanToggle(item.id, colKey, item[colKey])}
                        disabled={toggleLoadingId === item.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1.5 transition hover:bg-secondary disabled:opacity-70"
                        aria-pressed={isActive}
                    >
                        <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isActive ? 'bg-primary' : 'bg-secondary'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </span>
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {toggleLoadingId === item.id ? 'Saving...' : isActive ? 'On' : 'Off'}
                        </span>
                    </button>
                )
            }

            default:
                return item[colKey]
        }
    }

    return (
        <div className="space-y-6">

                {/* Dashboard / Welcome Header Banner */}
                <div className="relative p-6 rounded-2xl bg-card border border-border/80 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Database className="w-6 h-6 text-primary" /> Master Form Inputs Module
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                            A fully-integrated administrative template sandbox. This interface maps 25 input fields (rich text, sliders, repeaters, tags) directly into the unified <code>master_form_inputs</code> schema database table.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 z-10 w-full sm:w-auto">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold bg-background hover:bg-secondary transition cursor-pointer text-foreground shadow-sm w-full sm:w-auto"
                        >
                            <Upload className="w-4 h-4 text-blue-500" /> Import Excel
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold bg-background hover:bg-secondary transition cursor-pointer text-foreground shadow-sm w-full sm:w-auto"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export Excel
                        </button>


                        <button
                            onClick={handleAdd}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95 w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4" /> Add Record
                        </button>
                    </div>
                </div>

                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sandbox Records</span>
                            <div className="text-3xl font-extrabold mt-1 text-foreground">{totalItems}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">#</div>
                    </div>

                    <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Entries</span>
                            <div className="text-3xl font-extrabold mt-1 text-foreground">{activeCount}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">✔</div>
                    </div>

                    <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Rating Slider</span>
                            <div className="text-3xl font-extrabold mt-1 text-foreground">{avgRating}%</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">⚡</div>
                    </div>

                    <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accumulated Inventory Qty</span>
                            <div className="text-3xl font-extrabold mt-1 text-foreground">{totalQty} units</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">📦</div>
                    </div>
                </div>

                {/* Primary Data Grid Panel */}
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search sandboxed records..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 border border-border bg-secondary/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/95 text-white rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95 animate-fade-in"
                                    title={`Delete ${selectedIds.length} Selected Records`}
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
                                </button>
                            )}
                            <ColumnSelector
                                columns={allColumns}
                                visibleColumns={visibleColumns}
                                onChange={setVisibleColumns}
                            />
                        </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden lg:block">
                        <DataTable
                            columns={allColumns}
                            data={records}
                            visibleColumns={visibleColumns}
                            renderCell={renderCell}
                            viewPath="/master-form"
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                            loading={loading || editLoading}
                            filters={filters}
                            onFilterChange={setFilters}
                            sortConfig={sortConfig}
                            onSort={setSortConfig}
                            startIndex={startIndex}
                            onExportExcel={handleExportExcel}
                            selectedIds={selectedIds}
                            onSelectedIdsChange={setSelectedIds}
                            enableInlineEdit={true}
                            onInlineSave={handleInlineSave}
                        />
                    </div>

                    {/* Mobile View Card List */}
                    <div className="block lg:hidden space-y-4 p-4">
                        {loading || editLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-10 text-sm text-muted-foreground bg-card rounded-2xl border border-border">
                                No records found.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {records.map((item, idx) => (
                                        <div key={item.id} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-4">
                                            {/* Card Header: Title & Toggle */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-foreground text-sm truncate">
                                                        {item.text_title || 'Untitled Entry'}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.email || 'No email'}</p>
                                                </div>
                                                <div className="scale-90 origin-right shrink-0">
                                                    {renderCell(item, 'switch_active', idx)}
                                                </div>
                                            </div>

                                            {/* Summary Stats */}
                                            <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/40 py-2.5 my-1">
                                                <div>
                                                    <span className="text-muted-foreground">Price:</span>
                                                    <p className="font-bold text-foreground mt-0.5">₹{parseFloat(item.decimal_price || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Qty / Stock:</span>
                                                    <p className="font-bold text-foreground mt-0.5">{item.integer_qty} units</p>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenBottomSheet(item)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer active:scale-95 border border-primary/10"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View Details
                                                </button>

                                                <Link
                                                    href={`/master-form/${item.id}`}
                                                    className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95 flex items-center justify-center"
                                                    title="Manage Images & Files"
                                                >
                                                    <Image className="w-4 h-4 text-primary" />
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition cursor-pointer active:scale-95"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center bg-card border border-border/70 p-4 rounded-2xl shadow-sm mt-4">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-40 transition active:scale-95 cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-muted-foreground font-medium">Page {currentPage} of {totalPages}</span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-40 transition active:scale-95 cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 1. Add/Edit Form Slide-Over Modal Overlay */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingRecord ? `Editing record: "${editingRecord.text_title}"` : 'Create Sandbox Record'}
                    maxWidth="max-w-5xl"
                >
                    {formError && (
                        <div className="p-3 mb-4 text-xs font-semibold rounded bg-destructive/15 text-destructive border border-destructive/20">
                            {formError}
                        </div>
                    )}
                    <div className="py-2">
                        <MasterForm
                            record={editingRecord}
                            onSubmit={handleSubmit}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </div>
                </Modal>


                {/* 3. Confirm Delete Dialog Overlay */}
                <ConfirmDialog
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={confirmDelete}
                    title="Delete Sandbox Record"
                    message="Are you absolutely sure you want to delete this record? This action will permanently remove it from the master_form_inputs SQL database."
                    confirmText="Permanently Delete"
                    confirmVariant="danger"
                    loading={deleteLoading}
                />

                <ConfirmDialog
                    isOpen={isBulkDeleteOpen}
                    onClose={() => setIsBulkDeleteOpen(false)}
                    onConfirm={confirmBulkDelete}
                    title="Delete Selected Sandbox Records"
                    description={`Are you absolutely sure you want to delete the ${selectedIds.length} selected records? This action will permanently remove them from the master_form_inputs SQL database.`}
                    confirmText="Yes, Delete All"
                    type="danger"
                    loading={bulkDeleteLoading}
                />

                <Modal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    title="Export Sandbox Data"
                    size="sm"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Select the export range for the spreadsheet.
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleExportCurrent}
                                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 transition cursor-pointer group flex items-start gap-3.5"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/20">
                                    <FileSpreadsheet className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">Current View</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Exports only the currently visible records on this page (up to {itemsPerPage} items).
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportAll}
                                disabled={exportLoading}
                                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 transition cursor-pointer group flex items-start gap-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20">
                                    {exportLoading ? (
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Database className="w-4 h-4" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">All Records</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Exports all {totalItems} records matching the current filters across all pages.
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setIsExportModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-foreground hover:bg-secondary transition active:scale-98 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>

                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={refetch}
                    type="master-form"
                    importUrl="/admin/master-form/bulk-import"
                />

                {/* 4. Bottom Sheet Details View for Mobile */}
                {isBottomSheetOpen && activeSheetRecord && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        {/* Backdrop with blur and fade-in */}
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setIsBottomSheetOpen(false)}
                        />
                        
                        {/* Slide-up Bottom Sheet Panel */}
                        <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-y-0 animate-in slide-in-from-bottom duration-300">
                            {/* Draggable Handle Indicator */}
                            <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-3 shrink-0" />
                            
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pb-4 border-b border-border/60 shrink-0">
                                <div>
                                    <h2 className="text-base font-bold text-foreground truncate max-w-[240px]">
                                        {activeSheetRecord.text_title || 'Record Details'}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Unified input field sandbox</p>
                                </div>
                                <button
                                    onClick={() => setIsBottomSheetOpen(false)}
                                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Body Scroll area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Primary Image Section if available */}
                                {activeSheetRecord.primary_image_url && (
                                    <div className="w-full h-44 relative rounded-2xl overflow-hidden border border-border/80 bg-secondary/20 flex items-center justify-center shrink-0 shadow-sm">
                                        <img 
                                            src={apiClient.getImageUrl ? apiClient.getImageUrl(activeSheetRecord.primary_image_url) : `/${activeSheetRecord.primary_image_url}`} 
                                            alt={activeSheetRecord.text_title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Core fields grid */}
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    {/* ID */}
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Record ID</span>
                                        <span className="font-semibold text-foreground">#{activeSheetRecord.id}</span>
                                    </div>

                                    {/* URL Slug */}
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">URL Slug</span>
                                        <code className="font-mono text-foreground">{activeSheetRecord.slug || 'N/A'}</code>
                                    </div>

                                    {/* Email */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                                            <p className="font-semibold text-foreground truncate">{activeSheetRecord.email || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Phone Number</span>
                                            <p className="font-semibold text-foreground">{activeSheetRecord.phone || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Price</span>
                                        <span className="font-bold text-foreground">₹{parseFloat(activeSheetRecord.decimal_price || 0).toFixed(2)}</span>
                                    </div>

                                    {/* Quantity */}
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Quantity</span>
                                        <span className="font-semibold text-foreground">{activeSheetRecord.integer_qty} units</span>
                                    </div>

                                    {/* Date */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date</span>
                                            <p className="font-semibold text-foreground">
                                                {activeSheetRecord.date_picker 
                                                    ? new Date(activeSheetRecord.date_picker).toLocaleDateString(undefined, {
                                                        year: 'numeric', month: 'long', day: 'numeric'
                                                    }) 
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Website URL */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Website Link</span>
                                            <a 
                                                href={activeSheetRecord.website_url || '#'} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="font-semibold text-primary truncate hover:underline block"
                                            >
                                                {activeSheetRecord.website_url || 'N/A'}
                                            </a>
                                        </div>
                                    </div>
                                    
                                    {/* Dropdown & Radio selection */}
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Category (Dropdown)</span>
                                        <span className="font-semibold text-foreground capitalize">{activeSheetRecord.dropdown_selection?.replace('_', ' ') || 'N/A'}</span>
                                    </div>
                                    
                                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Status (Radio)</span>
                                        <span className="font-semibold text-foreground capitalize">{activeSheetRecord.radio_selection?.replace('_', ' ') || 'N/A'}</span>
                                    </div>

                                    {/* Slider Rating */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rating Score</span>
                                            <span className="text-xs font-bold text-primary">{activeSheetRecord.range_slider_value || 0}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-secondary rounded-full mt-2 overflow-hidden border border-border/40">
                                            <div className="h-full bg-primary" style={{ width: `${activeSheetRecord.range_slider_value || 0}%` }} />
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Tags</span>
                                        {Array.isArray(activeSheetRecord.multi_select_tags) && activeSheetRecord.multi_select_tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {activeSheetRecord.multi_select_tags.map(t => (
                                                    <span key={t} className="text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 capitalize">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">No tags</span>
                                        )}
                                    </div>
                                    
                                    {/* Document File attachment if available */}
                                    {activeSheetRecord.document_file_url && (
                                        <div className="col-span-2 p-3.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Attachment Document</span>
                                                <a 
                                                    href={`/${activeSheetRecord.document_file_url}`} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="font-semibold text-primary truncate hover:underline block"
                                                >
                                                    {activeSheetRecord.document_file_url.split('/').pop()}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Short Notes */}
                                {activeSheetRecord.short_notes && (
                                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Short Notes</span>
                                        <p className="text-xs text-foreground leading-relaxed font-medium">{activeSheetRecord.short_notes}</p>
                                    </div>
                                )}

                                {/* WYSIWYG Content (Rich Text) */}
                                {activeSheetRecord.rich_wysiwyg_content && (
                                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2 border-b border-border/40 pb-1">Rich WYSIWYG Content</span>
                                        <div 
                                            className="text-xs text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none rich-text-content"
                                            dangerouslySetInnerHTML={{ __html: activeSheetRecord.rich_wysiwyg_content }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
    )
}
