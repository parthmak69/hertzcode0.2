'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, Trash2, Calendar, FileText, IndianRupee, Layers, Tag, ToggleLeft, Globe, Phone, Mail, Award, Clock, Upload } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import MasterForm from '@/components/forms/MasterForm'
import { apiClient } from '@/utils/api'

export default function MasterFormDetailsPage() {
    const { id } = useParams()
    const router = useRouter()

    const [record, setRecord] = useState(null)
    const [loading, setLoading] = useState(true)
    const [formError, setFormError] = useState('')
    const [uploadLoading, setUploadLoading] = useState(false)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedImages, setSelectedImages] = useState([])

    const [imageDeleteConfig, setImageDeleteConfig] = useState({
        isOpen: false,
        type: '', // 'primary' | 'gallery' | 'bulk'
        url: null,
        urls: [],
    })

    const loadRecord = async () => {
        try {
            const res = await apiClient.get(`/admin/master-form/${id}`)
            if (res.success && res.data) {
                setRecord(res.data)
            } else {
                console.error("Failed to load record details.")
            }
        } catch (err) {
            console.error("Error loading record data:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) {
            loadRecord()
        }
    }, [id])

    const handleDelete = async () => {
        setDeleteLoading(true)
        try {
            const res = await apiClient.delete(`/admin/master-form/${id}`)
            if (res.success) {
                router.push('/master-form')
            } else {
                alert(res.message || 'Failed to delete record')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setDeleteLoading(false)
            setDeleteOpen(false)
        }
    }

    const handlePrimaryImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadLoading(true)
        try {
            const body = new FormData()
            body.append('primary_image_file', file)
            body.append('primaryImageAction', 'upload')

            const res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            if (res.success) {
                await loadRecord()
                window.dispatchEvent(new Event('storage-updated'))
            } else {
                alert(res.message || 'Failed to upload primary image')
            }
        } catch (err) {
            console.error('Primary image upload error:', err)
        } finally {
            setUploadLoading(false)
        }
    }

    const handlePrimaryImageRemove = () => {
        setImageDeleteConfig({
            isOpen: true,
            type: 'primary',
            url: null,
            urls: [],
        })
    }

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setUploadLoading(true)
        try {
            const body = new FormData()
            files.forEach(file => {
                body.append('gallery_files', file)
            })

            const existing = record.gallery_images || []
            body.append('existing_gallery_urls', JSON.stringify(existing))

            const res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            if (res.success) {
                await loadRecord()
                window.dispatchEvent(new Event('storage-updated'))
            } else {
                alert(res.message || 'Failed to upload gallery images')
            }
        } catch (err) {
            console.error('Gallery upload error:', err)
        } finally {
            setUploadLoading(false)
        }
    }

    const handleGalleryRemove = (urlToRemove) => {
        setImageDeleteConfig({
            isOpen: true,
            type: 'gallery',
            url: urlToRemove,
            urls: [],
        })
    }

    const handleBulkGalleryRemove = (urlsToRemove) => {
        setImageDeleteConfig({
            isOpen: true,
            type: 'bulk',
            url: null,
            urls: urlsToRemove,
        })
    }

    const handleImageDeleteConfirm = async () => {
        setUploadLoading(true)
        try {
            const { type, url, urls } = imageDeleteConfig
            let res
            if (type === 'primary') {
                const body = new FormData()
                body.append('primaryImageAction', 'remove')
                body.append('primary_image_url', '')
                res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            } else if (type === 'gallery') {
                const body = new FormData()
                const existing = (record.gallery_images || []).filter(item => item !== url)
                body.append('existing_gallery_urls', JSON.stringify(existing))
                res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            } else if (type === 'bulk') {
                const body = new FormData()
                const existing = (record.gallery_images || []).filter(item => !urls.includes(item))
                body.append('existing_gallery_urls', JSON.stringify(existing))
                res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            }

            if (res && res.success) {
                if (type === 'bulk') {
                    setSelectedImages([])
                    setIsSelectMode(false)
                }
                await loadRecord()
                window.dispatchEvent(new Event('storage-updated'))
                setImageDeleteConfig(prev => ({ ...prev, isOpen: false }))
            } else {
                alert(res?.message || 'Failed to complete image operation')
            }
        } catch (err) {
            console.error('Image delete error:', err)
        } finally {
            setUploadLoading(false)
        }
    }

    const handleImageSelect = (img) => {
        setSelectedImages(prev => 
            prev.includes(img) ? prev.filter(item => item !== img) : [...prev, img]
        )
    }

    const handleSubmit = async (formData) => {
        setFormError('')
        try {
            const hasFiles =
                formData.primaryImage instanceof File ||
                formData.documentFile instanceof File ||
                (formData.secondaryImages || []).some(item => item.file instanceof File) ||
                formData.primaryImageAction === 'remove' ||
                formData.documentFileAction === 'remove'

            let res
            if (hasFiles) {
                const body = new FormData()
                Object.entries(formData).forEach(([k, v]) => {
                    if (['primaryImage', 'documentFile', 'secondaryImages', 'primary_image_url', 'document_file_url', 'gallery_images', 'primaryImageAction', 'documentFileAction'].includes(k)) return
                    if (v === undefined || v === null) return
                    body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
                })

                if (formData.primaryImage instanceof File) {
                    body.append('primary_image_file', formData.primaryImage)
                    body.append('primaryImageAction', 'upload')
                } else if (formData.primaryImageAction === 'remove') {
                    body.append('primaryImageAction', 'remove')
                } else {
                    body.append('primaryImageAction', 'none')
                    body.append('primary_image_url', formData.primary_image_url || '')
                }

                if (formData.documentFile instanceof File) {
                    body.append('document_file', formData.documentFile)
                    body.append('documentFileAction', 'upload')
                } else if (formData.documentFileAction === 'remove') {
                    body.append('documentFileAction', 'remove')
                } else {
                    body.append('documentFileAction', 'none')
                    body.append('document_file_url', formData.document_file_url || '')
                }

                const existingGalleryUrls = []
                ;(formData.secondaryImages || []).forEach(item => {
                    if (item.file instanceof File) {
                        body.append('gallery_files', item.file)
                    } else if (item.preview) {
                        const pathOnly = item.preview.replace(/^(http|https):\/\/[^\/]+\//, '')
                        existingGalleryUrls.push(pathOnly)
                    } else if (typeof item === 'string') {
                        existingGalleryUrls.push(item)
                    }
                })
                body.append('existing_gallery_urls', JSON.stringify(existingGalleryUrls))

                res = await apiClient.upload(`/admin/master-form/${id}`, body, 'PUT')
            } else {
                const payload = {
                    ...formData,
                    primary_image_url: formData.primary_image_url || '',
                    document_file_url: formData.document_file_url || '',
                    gallery_images: (formData.secondaryImages || []).map(item => item.preview || item)
                }
                res = await apiClient.put(`/admin/master-form/${id}`, payload)
            }

            if (res.success) {
                setIsModalOpen(false)
                await loadRecord()
            } else {
                setFormError(res.message || 'Something went wrong')
            }
        } catch (err) {
            setFormError(err?.message || 'Something went wrong')
        }
    }

    if (loading) {
        return (
            <div className="p-16 text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading record details...</p>
            </div>
        )
    }

    if (!record) {
        return (
            <div className="p-16 text-center text-muted-foreground border border-dashed rounded-xl m-6">
                Record not found or database fetch failure.
            </div>
        )
    }

    let deleteDialogTitle = 'Delete Image?'
    let deleteDialogDescription = 'Are you sure you want to delete this image? This action cannot be undone.'

    if (imageDeleteConfig.type === 'primary') {
        deleteDialogTitle = 'Remove Primary Image?'
        deleteDialogDescription = 'Are you sure you want to remove the primary image? This action cannot be undone.'
    } else if (imageDeleteConfig.type === 'gallery') {
        deleteDialogTitle = 'Delete Gallery Image?'
        deleteDialogDescription = 'Are you sure you want to delete this image from the gallery? This action cannot be undone.'
    } else if (imageDeleteConfig.type === 'bulk') {
        deleteDialogTitle = 'Delete Selected Images?'
        deleteDialogDescription = `Are you sure you want to delete the ${imageDeleteConfig.urls.length} selected images from the gallery? This action cannot be undone.`
    }

    return (
        <div className="min-h-full bg-background p-4 lg:p-6 space-y-6">

            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition active:scale-95 shadow-sm cursor-pointer"
                        title="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                {record.text_title || 'Untitled Record'}
                            </h1>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${record.switch_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                {record.switch_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                            ID: {record.id} &bull; Slug: {record.slug || 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            setFormError('')
                            setIsModalOpen(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer active:scale-95"
                    >
                        <Pencil className="w-4 h-4" /> Edit
                    </button>

                    <button
                        onClick={() => setDeleteOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition shadow-sm cursor-pointer active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            {/* Layout Flex Column */}
            <div className="flex flex-col gap-6">

                    {/* Standard Fields Grid */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" /> General & Numeric Telemetry
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <DetailItem label="Quantity / Stock" value={`${record.integer_qty} units`} icon={Layers} />
                            <DetailItem label="Decimal Price" value={`₹${parseFloat(record.decimal_price || 0).toFixed(2)}`} icon={IndianRupee} />
                            <DetailItem label="Tax Percentage" value={`${parseFloat(record.tax_percentage || 0).toFixed(2)}%`} icon={Award} />
                            <DetailItem label="Category (Dropdown Selection)" value={record.dropdown_selection} highlight="capitalize" icon={Tag} />
                            <DetailItem label="Payment (Radio Selection)" value={record.radio_selection} highlight="capitalize font-mono" icon={Tag} />
                            <DetailItem label="Checkbox Toggle" value={record.checkbox_toggle ? 'True / Enabled' : 'False / Disabled'} icon={ToggleLeft} />
                        </div>
                    </div>

                    {/* Rich WYSIWYG Content Section */}
                    {record.rich_wysiwyg_content && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Rich WYSIWYG Description
                            </h2>
                            <div 
                                className="prose prose-sm dark:prose-invert max-w-none text-foreground p-4 bg-secondary/10 rounded-xl border border-border content-rendered mt-2"
                                dangerouslySetInnerHTML={{ __html: record.rich_wysiwyg_content }} 
                            />
                        </div>
                    )}

                    {/* Short Notes */}
                    {record.short_notes && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Summary / Short Notes
                            </h2>
                            <p className="text-sm text-foreground leading-relaxed bg-secondary/10 p-4 rounded-xl border border-border">
                                {record.short_notes}
                            </p>
                        </div>
                    )}

                    {/* Repeater Array Data */}
                    {Array.isArray(record.repeater_data) && record.repeater_data.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" /> Repeater Grid Rows
                            </h2>

                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            {Object.keys(record.repeater_data[0] || {}).map((header) => (
                                                <th key={header} className="px-4 py-3 capitalize">{header.replace(/_/g, ' ')}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 bg-card">
                                        {record.repeater_data.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-muted-foreground">{idx + 1}</td>
                                                {Object.entries(row).map(([k, val]) => (
                                                    <td key={k} className="px-4 py-3 text-foreground font-medium">
                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* Image Assets Section */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b border-border/60 pb-2">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                🖼 Media & Graphic Attachments
                            </h2>
                            {uploadLoading && (
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                        </div>

                        {/* Primary Image */}
                        <div className="space-y-3">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary Graphic</span>
                            {record.primary_image_url ? (
                                <div className="relative group rounded-xl border border-border overflow-hidden bg-secondary/15 flex items-center justify-center p-2 shadow-inner">
                                    <img 
                                        src={record.primary_image_url.startsWith('http') ? record.primary_image_url : `/${record.primary_image_url.replace(/^\/+/, '')}`} 
                                        alt="Primary" 
                                        className="max-h-48 w-auto object-contain rounded-lg transition-transform duration-300" 
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <label className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition border border-white/25 active:scale-95 text-xs font-semibold flex items-center gap-1.5">
                                            <Upload className="w-3.5 h-3.5" />
                                            Change
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handlePrimaryImageUpload} 
                                                disabled={uploadLoading}
                                                className="sr-only" 
                                            />
                                        </label>
                                        <button 
                                            onClick={handlePrimaryImageRemove}
                                            disabled={uploadLoading}
                                            className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg cursor-pointer transition border border-red-500/25 active:scale-95 text-xs font-semibold flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-secondary/10 hover:bg-secondary/20 transition cursor-pointer text-center ${uploadLoading ? 'pointer-events-none opacity-60' : ''}`}>
                                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                    <span className="text-xs font-bold text-foreground">Upload Primary Image</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG up to 10MB</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handlePrimaryImageUpload} 
                                        className="sr-only" 
                                    />
                                </label>
                            )}
                        </div>

                        {/* Secondary Gallery */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Gallery List {isSelectMode && `(${selectedImages.length} selected)`}
                                </span>
                                {Array.isArray(record.gallery_images) && record.gallery_images.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSelectMode(!isSelectMode)
                                            setSelectedImages([])
                                        }}
                                        className="text-xs font-bold text-primary hover:underline cursor-pointer active:scale-95 transition"
                                    >
                                        {isSelectMode ? 'Cancel Selection' : 'Select Multiple'}
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {isSelectMode ? (
                                    <button
                                        type="button"
                                        disabled={selectedImages.length === 0 || uploadLoading}
                                        onClick={() => handleBulkGalleryRemove(selectedImages)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-destructive text-destructive-foreground border border-destructive/20 hover:bg-destructive/90 transition text-xs font-bold rounded-lg cursor-pointer active:scale-95 w-full text-center ${
                                            selectedImages.length === 0 || uploadLoading ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Selected ({selectedImages.length})
                                    </button>
                                ) : (
                                    <label className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition text-xs font-bold rounded-lg cursor-pointer active:scale-95 w-full text-center ${uploadLoading ? 'pointer-events-none opacity-60' : ''}`}>
                                        <Upload className="w-3.5 h-3.5" />
                                        Upload Gallery Images
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple 
                                            onChange={handleGalleryUpload} 
                                            className="sr-only" 
                                        />
                                    </label>
                                )}
                            </div>
                            
                            {Array.isArray(record.gallery_images) && record.gallery_images.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2.5">
                                    {record.gallery_images.map((img, idx) => {
                                        const isSelected = selectedImages.includes(img)
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => isSelectMode && handleImageSelect(img)}
                                                className={`relative group aspect-square rounded-lg border overflow-hidden bg-secondary/15 flex items-center justify-center p-1.5 shadow-sm transition-all duration-200 ${
                                                    isSelectMode ? 'cursor-pointer hover:border-primary' : 'border-border'
                                                } ${
                                                    isSelected ? 'ring-2 ring-primary border-primary shadow-md' : ''
                                                }`}
                                            >
                                                <img 
                                                    src={img.startsWith('http') ? img : `/${img.replace(/^\/+/, '')}`} 
                                                    alt={`Gallery ${idx + 1}`} 
                                                    className={`w-full h-full object-cover rounded-md transition-transform duration-350 ${
                                                        isSelected ? 'scale-[0.92]' : 'group-hover:scale-[1.03]'
                                                    }`} 
                                                />
                                                
                                                {isSelectMode ? (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                                                            isSelected 
                                                                ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-110' 
                                                                : 'bg-black/40 border-white/60 text-transparent'
                                                        }`}>
                                                            <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleGalleryRemove(img)
                                                            }}
                                                            disabled={uploadLoading}
                                                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition shadow cursor-pointer active:scale-95"
                                                            title="Delete image"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground bg-secondary/5">
                                    No secondary gallery images uploaded yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contacts & URLs */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                            🔗 Contacts & URLs
                        </h2>

                        <div className="space-y-4">
                            {record.email && <DetailItem label="Email Account" value={record.email} icon={Mail} />}
                            {record.phone && <DetailItem label="Phone Line" value={record.phone} icon={Phone} />}
                            {record.website_url && (
                                <div>
                                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Website URL
                                    </span>
                                    <a 
                                        href={record.website_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sm font-semibold text-primary hover:underline break-all"
                                    >
                                        {record.website_url}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attached Documents */}
                    {record.document_file_url && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                                📂 Document Attachments
                            </h2>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/10">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <FileText className="w-6 h-6 text-blue-500 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">File URL</span>
                                        <p className="text-xs font-mono truncate text-foreground">{record.document_file_url.split('/').pop()}</p>
                                    </div>
                                </div>

                                <a 
                                    href={record.document_file_url.startsWith('http') ? record.document_file_url : `/${record.document_file_url.replace(/^\/+/, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition text-xs font-semibold rounded-lg cursor-pointer"
                                >
                                    View
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Metadata JSON block */}
                    {record.json_metadata && typeof record.json_metadata === 'object' && Object.keys(record.json_metadata).length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
                                🏷 Attributes & Metadata (JSON)
                            </h2>

                            <div className="space-y-2 bg-secondary/15 p-4 rounded-xl border border-border shadow-inner">
                                {Object.entries(record.json_metadata).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                                        <span className="font-semibold text-muted-foreground">{k}:</span>
                                        <span className="text-foreground font-semibold break-all text-right ml-2">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tag Array Badges */}
                    {Array.isArray(record.multi_select_tags) && record.multi_select_tags.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-muted-foreground" /> Multi-select Tags
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {record.multi_select_tags.map((t) => (
                                    <span 
                                        key={t} 
                                        className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary border border-primary/25 capitalize"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamp Attributes */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Timestamp Properties
                        </span>
                        
                        <div className="space-y-2.5 text-xs text-muted-foreground">
                            {record.date_picker && (
                                <div className="flex justify-between items-center py-1 border-b border-border/30">
                                    <span>Date Picker:</span>
                                    <span className="font-medium text-foreground">{new Date(record.date_picker).toLocaleDateString()}</span>
                                </div>
                            )}
                            {record.datetime_picker && (
                                <div className="flex justify-between items-center py-1 border-b border-border/30">
                                    <span>Datetime Picker:</span>
                                    <span className="font-medium text-foreground">{new Date(record.datetime_picker).toLocaleString()}</span>
                                </div>
                            )}
                            {record.time_picker && (
                                <div className="flex justify-between items-center py-1">
                                    <span>Time Picker:</span>
                                    <span className="font-medium text-foreground">{record.time_picker}</span>
                                </div>
                            )}
                        </div>
                    </div>
            </div>

            {/* Edit Slide-Over Overlay Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Editing record: "${record.text_title}"`}
                maxWidth="max-w-5xl"
            >
                {formError && (
                    <div className="p-3 mb-4 text-xs font-semibold rounded bg-destructive/15 text-destructive border border-destructive/20">
                        {formError}
                    </div>
                )}
                <div className="py-2">
                    <MasterForm
                        record={record}
                        onSubmit={handleSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </div>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Delete Record?"
                message="Are you absolutely sure you want to delete this record? This action will permanently remove it from the SQL database and cannot be undone."
                confirmText="Permanently Delete"
                confirmVariant="danger"
                loading={deleteLoading}
            />

            {/* Confirm Image Delete Dialog */}
            <ConfirmDialog
                isOpen={imageDeleteConfig.isOpen}
                onClose={() => setImageDeleteConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleImageDeleteConfirm}
                title={deleteDialogTitle}
                description={deleteDialogDescription}
                confirmText="Yes, Delete"
                confirmVariant="danger"
                loading={uploadLoading}
            />

        </div>
    )
}

function DetailItem({ label, value, highlight, icon: Icon }) {
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />} {label}
            </span>
            <p className={`text-sm font-semibold text-foreground ${highlight || ''}`}>
                {value ?? '-'}
            </p>
        </div>
    )
}
