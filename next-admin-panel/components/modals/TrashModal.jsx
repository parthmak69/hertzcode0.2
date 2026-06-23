'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import ColumnSelector from '@/components/ui/ColumnSelector'
import useAdminCrud from '@/hooks/useAdminCrud'
import useColumnVisibility from '@/hooks/useColumnVisibility'
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { RotateCw } from 'lucide-react'

const allColumns = [
    { key: 'full_name', label: 'Full Name', filterable: true, sortable: true },
    { key: 'email', label: 'Email', filterable: true, sortable: true },
    { key: 'phone', label: 'Phone', filterable: true },
]

export default function TrashModal({ isOpen, onClose, onRestoreSuccess }) {
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
        remove,
        patchItem,
    } = useAdminCrud({ 
        endpoint: '/admin/admins', 
        fetchEndpoint: '/admin/admins?deleted=true' 
    })

    const [visibleColumns, setVisibleColumns] = useColumnVisibility('admins_trash_modal', allColumns)
    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [restoreId, setRestoreId] = useState(null)
    const [restoreLoading, setRestoreLoading] = useState(false)

    const handleDelete = (id) => {
        setDeleteId(id)
    }

    const confirmDelete = async () => {
        setDeleteLoading(true)
        try {
            await remove(`${deleteId}?permanent=true`)
            setDeleteId(null)
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleRestore = (id) => {
        setRestoreId(id)
    }

    const confirmRestore = async () => {
        setRestoreLoading(true)
        try {
            await patchItem(restoreId, { action: 'restore' })
            setRestoreId(null)
            onRestoreSuccess?.()
        } finally {
            setRestoreLoading(false)
        }
    }

    const renderCell = (item, colKey) => {
        return item[colKey] ?? '-'
    }

    const renderExtraActions = (item) => {
        return (
            <button
                onClick={() => handleRestore(item.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                title="Restore Admin"
            >
                <RotateCw className="w-4 h-4" />
            </button>
        )
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Recycle Bin (Deleted Admins)"
                size="lg"
            >
                <div className="flex flex-col gap-4">
                    {/* Toolbar */}
                    <div className="p-3 rounded-lg border bg-card border-border flex justify-between items-center">
                        <ColumnSelector
                            columns={allColumns}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />
                        <span className="text-xs text-muted-foreground">
                            Restore or permanently delete admin records.
                        </span>
                    </div>

                    {/* Table */}
                    <DataTable
                        columns={allColumns}
                        data={data}
                        visibleColumns={visibleColumns}
                        renderCell={renderCell}
                        onDelete={handleDelete}
                        renderExtraActions={renderExtraActions}
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
                        showHeaderFilters={false}
                    />
                </div>
            </Modal>

            {/* Permanent Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                type="danger"
                title="Delete Permanently?"
                description="Are you absolutely sure? This will remove this admin completely from the database and cannot be undone."
                confirmText="Yes, Delete Permanently"
                loading={deleteLoading}
            />

            {/* Restore Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!restoreId}
                onClose={() => setRestoreId(null)}
                onConfirm={confirmRestore}
                type="warning"
                title="Restore Admin?"
                description="Are you sure you want to restore this admin to the active list?"
                confirmText="Yes, Restore"
                loading={restoreLoading}
            />
        </>
    )
}
