'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { Upload, ImageIcon, X } from 'lucide-react'

export default function PortfolioCategoryModal({
    isOpen,
    onClose,
    onSave
}) {
    const [name, setName] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    // Reset when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setName('')
            setImageFile(null)
            setImagePreview(null)
            setError('')
        }
    }, [isOpen])

    // Clean up preview memory leak
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview)
            }
        }
    }, [imagePreview])

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        setImageFile(file)
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)
        setError('')
    }

    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) {
            setError('Category name is required')
            return
        }

        setLoading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('name', name.trim())
            if (imageFile) {
                formData.append('primary_image_file', imageFile)
            }

            const success = await onSave(formData)
            if (success) {
                onClose()
            }
        } catch (err) {
            console.error('[PortfolioCategoryModal Error]', err)
            setError(err.message || 'Failed to create category folder.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Category Folder">
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Category Name / Folder Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Healthcare, Corporate, E-Commerce"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        required
                    />
                </div>

                {/* Folder Cover Image Upload */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Folder Cover Image
                    </label>
                    
                    {imagePreview ? (
                        <div className="relative aspect-video w-full rounded-xl border border-border overflow-hidden group select-none">
                            <img
                                src={imagePreview}
                                alt="Folder cover preview"
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground hover:text-destructive border border-border/40 backdrop-blur-sm transition active:scale-95 cursor-pointer shadow"
                                title="Remove cover image"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-primary/[0.01] transition duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 p-4 select-none"
                        >
                            <div className="p-3 rounded-full bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-foreground">Upload cover image</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPEG or WEBP up to 5MB</p>
                            </div>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition active:scale-95 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {loading && (
                            <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        )}
                        Create Folder
                    </button>
                </div>
            </form>
        </Modal>
    )
}
