'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import AdminForm from '@/components/forms/AdminsForm'

export default function AdminDetailsPage() {
    const { id } = useParams()
    const router = useRouter()

    const [admin, setAdmin] = useState(null)
    const [loading, setLoading] = useState(true)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Helper to format API date safely
    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return dateStr.split('T')[0] // Returns YYYY-MM-DD
    }

    // Helper to get auth headers from local or session storage
    const getAuthHeaders = (extraHeaders = {}) => {
        const headers = { ...extraHeaders }
        if (typeof window !== 'undefined') {
            const token = 
                localStorage.getItem('admin_access_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('auth_token') || 
                sessionStorage.getItem('token') || 
                localStorage.getItem('accessToken')
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }
        }
        return headers
    }

    const loadAdminData = async () => {
        try {
            const res = await fetch(`/api/admin/admins/${id}?t=${Date.now()}`, {
                headers: getAuthHeaders(),
                credentials: 'include',
                cache: 'no-store'
            })
            const json = await res.json()
            
            if (json.success && json.data) {
                const data = json.data
                setAdmin({
                    id: data.id,
                    full_name: data.full_name ?? data.name ?? data.fullName ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '-',
                    isActive: data.isActive ?? (data.isDeleted === 0),
                    created_at: formatDate(data.created_at ?? data.createdAt),
                })
            } else {
                console.error("Failed to load admin record from database.")
            }
        } catch (err) {
            console.error("Error loading admin data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) {
            loadAdminData()
        }
    }, [id])

    const handleDelete = async () => {
        setDeleteLoading(true)
        try {
            await fetch(`/api/admin/admins/${id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders(),
                credentials: 'include'
            })
            router.push('/admins')
        } catch (err) {
            console.error(err)
        } finally {
            setDeleteLoading(false)
            setDeleteOpen(false)
        }
    }

    const handleSubmit = async (formData) => {
        try {
            const payload = {
                full_name: formData.fullName || formData.full_name,
                email: formData.email,
                phone: formData.phone,
            }
            if (formData.password) {
                payload.password = formData.password
            }

            await fetch(`/api/admin/admins/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify(payload),
                credentials: 'include'
            })

            // Refresh details page state
            await loadAdminData()
        } catch (err) {
            console.error(err)
        } finally {
            setIsModalOpen(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">Loading admin...</p>
            </div>
        )
    }

    if (!admin) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Admin not found.
            </div>
        )
    }

    return (
        <div className="min-h-full bg-background p-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-secondary cursor-pointer transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>

                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {admin.full_name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Admin ID: {admin.id}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit
                    </button>

                    <button
                        onClick={() => setDeleteOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/20 transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Details Card */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="grid md:grid-cols-2 gap-6">

                    <DetailItem label="Full Name" value={admin.full_name} />
                    <DetailItem label="Email" value={admin.email} />
                    <DetailItem label="Phone" value={admin.phone} />
                    <DetailItem
                        label="Status"
                        value={admin.isActive ? 'Active' : 'Inactive'}
                        highlight={
                            admin.isActive
                                ? 'text-success'
                                : 'text-destructive'
                        }
                    />
                    <DetailItem
                        label="Created At"
                        value={admin.created_at}
                    />

                </div>
            </div>

            {/* Edit Modal (Same Pattern As Product) */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Edit Admin"
                size="lg"
            >
                <AdminForm
                    admin={admin}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                type="danger"
                title="Delete Admin?"
                description="This admin will be permanently removed."
                confirmText="Yes, Delete"
                loading={deleteLoading}
            />
        </div>
    )
}

function DetailItem({ label, value, highlight }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`font-medium text-foreground ${highlight || ''}`}>
                {value}
            </p>
        </div>
    )
}