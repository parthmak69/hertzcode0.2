'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import ColumnSelector from '@/components/ui/ColumnSelector'
import MasterForm from '@/components/forms/MasterForm'
import { exportToCsv } from '@/utils/exportCsv'
import useAdminCrud from '@/hooks/useAdminCrud'
import useColumnVisibility from '@/hooks/useColumnVisibility'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Play, Eye, Plus, FileSpreadsheet, Search, Sliders, Database, HelpCircle } from 'lucide-react'

const allColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'text_title', label: 'Record Name', sortable: true },
    { key: 'slug', label: 'URL Slug' },
    { key: 'email', label: 'Email' },
    { key: 'integer_qty', label: 'Qty / Stock', sortable: true },
    { key: 'decimal_price', label: 'Price (₹)', sortable: true },
    { key: 'multi_select_tags', label: 'Tags' },
    { key: 'date_picker', label: 'Date', sortable: true },
    { key: 'switch_active', label: 'Active Toggle' },
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
        getById,
    } = useAdminCrud({ endpoint: '/admin/master-form' })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState(null)
    const [formError, setFormError] = useState('')
    const [visibleColumns, setVisibleColumns] = useColumnVisibility('master_form_inputs', allColumns)
    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [editLoading, setEditLoading] = useState(false)

    // Developer Raw JSON Inspector
    const [inspectorRecord, setInspectorRecord] = useState(null)

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

    const handleExport = () => {
        exportToCsv(records, allColumns, 'master_form_inputs_sandbox')
    }

    const handleInspect = async (record) => {
        try {
            const fullRecord = await getById(record.id)
            setInspectorRecord(fullRecord)
        } catch {
            setInspectorRecord(record)
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
                const isActive = item.switch_active === 1 || item.switch_active === true
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                                    ${isActive
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                    >
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                )

            default:
                return item[colKey]
        }
    }

    return (
        <AppLayout>
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

                    <div className="flex flex-wrap gap-2.5 shrink-0 z-10">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold bg-background hover:bg-secondary transition cursor-pointer text-foreground shadow-sm"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV
                        </button>

                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold transition cursor-pointer shadow-sm active:scale-95"
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

                        <ColumnSelector
                            columns={allColumns}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />
                    </div>

                    <DataTable
                        columns={allColumns}
                        data={records}
                        visibleColumns={visibleColumns}
                        renderCell={renderCell}
                        onView={handleInspect}
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
                        onExport={handleExport}
                    />
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

                {/* 2. Record Details Modal Overlay */}
                <Modal
                    isOpen={!!inspectorRecord}
                    onClose={() => setInspectorRecord(null)}
                    title={`Record Details: ${inspectorRecord?.text_title || 'Untitled'}`}
                    size="xl"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto pr-2 pb-4">
                            {inspectorRecord && Object.entries(inspectorRecord).map(([key, value]) => {
                                if (key === 'id' || key === 'password_hash' || key === 'password' || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
                                if (key === 'json_metadata' && (typeof value !== 'object' || value === null || Object.keys(value).length === 0)) return null;

                                let displayValue = value;
                                let isImage = false;
                                let isHtml = false;

                                if (Array.isArray(value)) {
                                    // Handle array of images or simple strings
                                    if (value.length > 0 && typeof value[0] === 'string' && (value[0].match(/\.(png|jpg|jpeg|webp|svg|gif)(\?.*)?$/i) || key.includes('image'))) {
                                        displayValue = (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {value.map((img, idx) => {
                                                    const imgUrl = (!img.startsWith('http') && !img.startsWith('/')) ? `/${img}` : img;
                                                    return <img key={idx} src={imgUrl} alt="" className="w-16 h-16 object-cover rounded-md border border-border shadow-sm" />;
                                                })}
                                            </div>
                                        );
                                    } else {
                                        displayValue = value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
                                    }
                                } else if (key === 'json_metadata' && typeof value === 'object' && value !== null) {
                                    displayValue = (
                                        <div className="space-y-1.5 mt-2 bg-background p-3 rounded-lg border border-border">
                                            {Object.entries(value).map(([k, v]) => (
                                                <div key={k} className="flex justify-between text-xs py-1 border-b border-border/40 last:border-0">
                                                    <span className="font-semibold text-muted-foreground">{k}:</span>
                                                    <span className="text-foreground font-medium">{String(v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                } else if (typeof value === 'object' && value !== null) {
                                    displayValue = <pre className="text-[10px] mt-2 p-2 bg-background rounded-lg border border-border overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
                                } else if (typeof value === 'boolean' || key === 'switch_active') {
                                    displayValue = (value === true || value === 1) ? 'Yes (Active)' : 'No (Inactive)';
                                } else if (typeof value === 'string' && (value.match(/\.(png|jpg|jpeg|webp|svg|gif)(\?.*)?$/i) || (key.includes('image') && value.length > 5))) {
                                    isImage = true;
                                } else if (typeof value === 'string' && value.match(/\.(pdf|doc|docx|xls|xlsx|csv)(\?.*)?$/i)) {
                                    const fileUrl = (!value.startsWith('http') && !value.startsWith('/')) ? `/${value}` : value;
                                    displayValue = (
                                        <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 text-sm font-medium text-primary bg-primary/10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
                                            📄 View Document
                                        </a>
                                    );
                                } else if (typeof value === 'string' && (value.includes('<p>') || value.includes('<h1>') || value.includes('<strong>') || value.includes('<ul>'))) {
                                    isHtml = true;
                                } else if (key.includes('date') && !isNaN(Date.parse(value))) {
                                    displayValue = new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                }

                                const finalUrl = typeof value === 'string' && isImage && (!value.startsWith('http') && !value.startsWith('/')) ? `/${value}` : value;

                                return (
                                    <div key={key} className={`bg-secondary/10 p-4 rounded-xl border border-border shadow-sm ${isHtml ? 'col-span-1 sm:col-span-2 lg:col-span-3' : ''}`}>
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        {isImage ? (
                                            <img src={finalUrl} alt={key} className="w-24 h-24 object-cover rounded-lg border border-border mt-2 shadow-sm" />
                                        ) : isHtml ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground content-rendered p-4 bg-background rounded-lg border border-border mt-2 shadow-inner" dangerouslySetInnerHTML={{ __html: value }} />
                                        ) : (
                                            <div className="text-sm font-medium text-foreground break-words">
                                                {displayValue}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border">
                            <button
                                onClick={() => setInspectorRecord(null)}
                                className="px-5 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-lg text-sm font-semibold cursor-pointer transition shadow-sm active:scale-95"
                            >
                                Close Details
                            </button>
                        </div>
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

            </div>
        </AppLayout>
    )
}
