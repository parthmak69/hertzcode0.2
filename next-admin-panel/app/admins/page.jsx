'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import ColumnSelector from '@/components/ui/ColumnSelector'
import AdminsForm from '@/components/forms/AdminsForm'
import { exportToCsv } from '@/utils/exportCsv'
import useAdminCrud from '@/hooks/useAdminCrud'
import useColumnVisibility from '@/hooks/useColumnVisibility'
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { Trash2 } from 'lucide-react'
import TrashModal from '@/components/modals/TrashModal'

/* -------------------------------------------------------------------------- */
/*                                   Columns                                  */
/* -------------------------------------------------------------------------- */

const allColumns = [
    { key: 'full_name', label: 'Full Name', filterable: true, sortable: true },
    { key: 'email', label: 'Email', filterable: true, sortable: true },
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
        refetch,
    } = useAdminCrud({ endpoint: '/admin/admins' })

    // const [viewingAdmin, setViewingAdmin] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState(null)
    const [formError, setFormError] = useState('')
    const [visibleColumns, setVisibleColumns] = useColumnVisibility('admins', allColumns)

    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

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

    const handleSubmit = async (formData) => {
        setFormError('')

        const payload = {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
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

    const handleExport = () => {
        const rows = (data || []).map((a) => ({
            id: a.id ?? '',
            full_name: a.full_name ?? '',
            email: a.email ?? '',
            phone: a.phone ?? '',
            is_active: toYesNo(a.is_active),
            created_at: formatDateTime(a.created_at),
        }))
        exportToCsv(rows, exportColumns, 'admins')
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
                    <div className="flex justify-between items-center">
                        <ColumnSelector
                            columns={allColumns}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsTrashModalOpen(true)}
                                className="p-2 border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer flex items-center justify-center"
                                title="Recycle Bin"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleAdd}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition cursor-pointer"
                            >
                                + Add Admin
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
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
                    onExport={handleExport}
                />
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

            <TrashModal
                isOpen={isTrashModalOpen}
                onClose={() => setIsTrashModalOpen(false)}
                onRestoreSuccess={refetch}
            />

        </div>
    )
}
