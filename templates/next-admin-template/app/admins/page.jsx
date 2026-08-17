'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import ColumnSelector from '@/components/ui/ColumnSelector'
import AdminsForm from '@/components/forms/AdminsForm'
import { exportToExcel } from '@/utils/exportExcel'
import useAdminCrud from '@/hooks/useAdminCrud'
import useColumnVisibility from '@/hooks/useColumnVisibility'
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { Trash2, FileSpreadsheet, Upload, Pencil } from 'lucide-react'
import TrashModal from '@/components/modals/TrashModal'
import ImportModal from '@/components/modals/ImportModal'

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

const allColumns = [
    { key: 'full_name', label: 'Full Name', filterable: true, sortable: true, width: '180px' },
    { key: 'email', label: 'Email', filterable: true, sortable: true, width: '180px' },
]

const exportColumns = [
    { key: 'id', label: 'Admin ID' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'is_active', label: 'Active' },
    { key: 'created_at', label: 'Created At' },
]

function formatDateTime(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function toYesNo(value) {
    return value === true || value === 1 || value === '1' ? 'Yes' : 'No'
}

export default function AdminsPage() {
    const {
        data,
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
        refetch,
    } = useAdminCrud({ endpoint: '/admin/admins' })

    // const [viewingAdmin, setViewingAdmin] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState(null)
    const [formError, setFormError] = useState('')
    const [visibleColumns, setVisibleColumns] = useColumnVisibility('admins', allColumns)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

    // Reset selection when page or search filters change
    useEffect(() => {
        setSelectedIds([])
    }, [currentPage, filters])

    /* ---------------------------------------------------------------------- */
    /*                               Handlers                                  */
    /* ---------------------------------------------------------------------- */

    const handleAdd = () => {
        setEditingAdmin(null)
        setFormError('')
        setIsModalOpen(true)
    }

    const handleEdit = (admin) => {
        setEditingAdmin(admin)
        setFormError('')
        setIsModalOpen(true)
    }

    const handleDelete = (id) => {
        setDeleteId(id)
    }

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

    const handleInlineSave = async (id, updatedRow) => {
        try {
            if (!updatedRow.full_name?.trim()) {
                alert('Full name is required')
                return false
            }
            if (!updatedRow.email?.trim()) {
                alert('Email is required')
                return false
            }

            const payload = {
                full_name: updatedRow.full_name,
                email: updatedRow.email,
            }
            // Only send phone if it was part of the inline edit
            if (updatedRow.phone !== undefined) {
                payload.phone = updatedRow.phone
            }

            const res = await update(id, payload)
            if (res.success) {
                return true
            } else {
                alert(res.message || 'Failed to save admin info')
                return false
            }
        } catch (err) {
            alert(err?.message || 'Failed to save admin info')
            return false
        }
    }

    const handleSubmit = async (formData) => {
        setFormError('')

        const payload = {
            full_name: formData.fullName,
            email: formData.email,
        }

        // Include phone field if it exists in formData (even if empty to clear it)
        if (formData.phone !== undefined) {
            payload.phone = formData.phone
        }

        if (formData.password) {
            payload.password = formData.password
        }

        const res = editingAdmin
            ? await update(editingAdmin.id, payload)
            : await create(payload)

        if (res.success) {
            setIsModalOpen(false)
            setEditingAdmin(null)
        } else {
            setFormError(res.message || 'Something went wrong')
        }
    }


    const handleExportExcel = () => {
        const rows = (data || []).map((a) => ({
            id: a.id ?? '',
            full_name: a.full_name ?? '',
            email: a.email ?? '',
            phone: a.phone ?? '',
            is_active: toYesNo(a.is_active),
            created_at: formatDateTime(a.created_at),
        }))
        exportToExcel(rows, exportColumns, 'admins')
    }

    const renderCell = (item, colKey) => {
        return item[colKey] ?? '-'
    }

    /* ---------------------------------------------------------------------- */
    /*                                   JSX                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="min-h-full bg-background">
            <div className="p-4 lg:p-6">

                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">
                        Admins
                    </h1>
                    <p className="text-sm mt-1 text-muted-foreground">
                        Manage admin users
                    </p>
                </div>

                {/* Toolbar */}
                <div className="p-4 mb-4 rounded-xl border bg-card border-border">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <ColumnSelector
                            columns={allColumns}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-destructive text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-destructive/95 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm animate-fade-in active:scale-95"
                                    title={`Delete ${selectedIds.length} Selected Admins`}
                                >
                                    <Trash2 className="w-4 h-4" /> <span>Delete Selected ({selectedIds.length})</span>
                                </button>
                            )}

                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 border border-border text-foreground hover:bg-secondary rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                                title="Import Admins from Excel"
                            >
                                <Upload className="w-4 h-4 text-blue-500" /> <span>Import Excel</span>
                            </button>

                            <button
                                onClick={handleExportExcel}
                                className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 border border-border text-foreground hover:bg-secondary rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                                title="Export Admins to Excel"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> <span>Export Excel</span>
                            </button>

                            <button
                                onClick={() => setIsTrashModalOpen(true)}
                                className="w-full sm:w-auto p-2 border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer flex items-center justify-center gap-2 h-10"
                                title="Recycle Bin"
                            >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Recycle Bin</span>
                            </button>

                            <button
                                onClick={handleAdd}
                                className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                + Add Admin
                            </button>
                        </div>
                    </div>
                </div>

                {/* DataTable (Desktop) */}
                <div className="hidden lg:block">
                    <DataTable
                        columns={allColumns}
                        data={data}
                        visibleColumns={visibleColumns}
                        renderCell={renderCell}
                        // onView={(row) => setViewingAdmin(row)}
                        viewPath="/admins"
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                        loading={loading}
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

                {/* Card List (Mobile) */}
                <div className="block lg:hidden space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-20 bg-secondary/5 border border-border/60 rounded-xl">
                            <h3 className="text-base font-bold text-foreground">No Admins Found</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.map((admin) => {
                                const isSelected = selectedIds.includes(admin.id)
                                return (
                                    <div key={admin.id} className={`p-5 rounded-2xl bg-card border shadow-sm flex flex-col justify-between gap-4 transition duration-200 ${isSelected ? 'border-primary' : 'border-border/80'}`}>
                                        {/* Header */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setSelectedIds(selectedIds.filter(x => x !== admin.id))
                                                        } else {
                                                            setSelectedIds([...selectedIds, admin.id])
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20 cursor-pointer"
                                                />
                                                <div className="min-w-0">
                                                    <span className="font-mono text-xs text-muted-foreground">#ADM-{admin.id}</span>
                                                    <h3 className="font-bold text-foreground text-sm truncate mt-0.5">{admin.full_name}</h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Brief details */}
                                        <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/40 py-2.5 my-0.5">
                                            <div className="min-w-0">
                                                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Email</span>
                                                <p className="font-bold text-foreground mt-0.5 truncate">{admin.email}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Active Status</span>
                                                <div className="mt-0.5">
                                                    {admin.is_active === true || admin.is_active === 1 || admin.is_active === '1' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(admin)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95"
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Edit Admin
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(admin.id)}
                                                className="p-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition cursor-pointer active:scale-95"
                                                title="Delete Admin"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                            <span className="text-xs text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    &lt;
                                </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        &gt;
                                    </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingAdmin(null)
                    setFormError('')
                }}
                title={editingAdmin ? 'Edit Admin' : 'Add Admin'}
                size="md"
            >
                {formError && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                        {formError}
                    </div>
                )}

                <AdminsForm
                    admin={
                        editingAdmin
                            ? {
                                ...editingAdmin,
                                fullName: editingAdmin.full_name,
                            }
                            : null
                    }
                    onSubmit={handleSubmit}
                    onCancel={() => {
                        setIsModalOpen(false)
                        setEditingAdmin(null)
                    }}
                />
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                type="danger"
                title="Delete Admin?"
                description="Are you sure you want to remove this admin?"
                confirmText="Yes, Delete"
                loading={deleteLoading}
            />

            <ConfirmDialog
                isOpen={isBulkDeleteOpen}
                onClose={() => setIsBulkDeleteOpen(false)}
                onConfirm={confirmBulkDelete}
                type="danger"
                title="Delete Selected Admins?"
                description={`Are you sure you want to remove the ${selectedIds.length} selected admin accounts?`}
                confirmText="Yes, Delete All"
                loading={bulkDeleteLoading}
            />

            <TrashModal
                isOpen={isTrashModalOpen}
                onClose={() => setIsTrashModalOpen(false)}
                onRestoreSuccess={refetch}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={refetch}
                type="admins"
                importUrl="/admin/admins/bulk-import"
            />

        </div>
    )
}
