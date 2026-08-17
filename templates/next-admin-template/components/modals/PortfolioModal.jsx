'use client'

import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { X, Upload, ImageIcon, Plus, Check } from 'lucide-react'
import { apiClient } from '@/utils/api'

export default function PortfolioModal({
    isOpen,
    onClose,
    onSave,
    record = null,
    defaultCategory = 'Development',
    categoriesList = [],
    onCategoryAdded
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState(defaultCategory || 'Development')
    const [buttonLink, setButtonLink] = useState('')
    
    // Dynamic category addition states
    const [isAddingNewCat, setIsAddingNewCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatError, setNewCatError] = useState('')
    
    // Image handling states
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [existingImageUrl, setExistingImageUrl] = useState('')
    const [imageAction, setImageAction] = useState('') // 'remove' or ''
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    
    const fileInputRef = useRef(null)
 
    // Load record details if editing
    useEffect(() => {
        setIsAddingNewCat(false)
        setNewCatName('')
        setNewCatError('')
        if (record) {
            setTitle(record.title || '')
            setDescription(record.description || '')
            setCategory(record.category || 'Development')
            setButtonLink(record.button_link || '')
            setExistingImageUrl(record.image_url || '')
            setImageFile(null)
            setImagePreview(null)
            setImageAction('')
        } else {
            setTitle('')
            setDescription('')
            setCategory(defaultCategory || (categoriesList[0] || 'Development'))
            setButtonLink('')
            setExistingImageUrl('')
            setImageFile(null)
            setImagePreview(null)
            setImageAction('')
            if (categoriesList.length === 0) {
                setIsAddingNewCat(true)
            }
        }
        setError('')
    }, [record, isOpen, defaultCategory, categoriesList])

    // Clean up preview URL memory leak
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
            setError('Please select an image file (png, jpeg, webp)')
            return
        }

        setImageFile(file)
        setImageAction('')
        
        // Create local preview URL
        const previewUrl = URL.createObjectURL(file)
        setImagePreview(previewUrl)
        setError('')
    }

    const removeImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (existingImageUrl) {
            setImageAction('remove')
        }
        setExistingImageUrl('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('Title is required')
            return
        }

        setLoading(true)
        setError('')

        try {
            let activeCategory = category

            // Auto-create category if typed but not confirmed
            if (isAddingNewCat && newCatName.trim()) {
                try {
                    const res = await apiClient.post('/admin/portfolio-categories', {
                        name: newCatName.trim()
                    })
                    if (res.success) {
                        activeCategory = newCatName.trim()
                        if (onCategoryAdded) {
                            await onCategoryAdded(newCatName.trim())
                        }
                    } else if (res.message !== 'Category name must be unique.') {
                        setError(res.message || 'Failed to create category')
                        setLoading(false)
                        return
                    } else {
                        // If it already exists, just fallback to it
                        activeCategory = newCatName.trim()
                    }
                } catch (catErr) {
                    console.error('Failed to auto-create category:', catErr)
                }
            } else if (isAddingNewCat && !newCatName.trim() && !category) {
                setError('Category is required. Please type a category name.')
                setLoading(false)
                return
            }

            // Build multipart form data to support file uploads
            const formData = new FormData()
            formData.append('title', title.trim())
            formData.append('description', description.trim())
            formData.append('category', activeCategory)
            formData.append('button_link', buttonLink.trim())
            
            if (imageFile) {
                formData.append('primary_image_file', imageFile)
            }
            if (imageAction === 'remove') {
                formData.append('primaryImageAction', 'remove')
            }

            const success = await onSave(formData)
            if (success) {
                onClose()
            }
        } catch (err) {
            console.error('[PortfolioModal Submit Error]', err)
            setError(err.message || 'Failed to save portfolio card.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'Edit Portfolio Card' : 'Create Portfolio Card'}>
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                        {error}
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Title / Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Next.js Dashboard"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        required
                    />
                </div>

                {/* Row: Category & Button Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 flex justify-between items-center">
                            <span>Category</span>
                            {!isAddingNewCat && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingNewCat(true)
                                        setNewCatName('')
                                        setNewCatError('')
                                    }}
                                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                    <Plus className="w-3 h-3" /> Add Category
                                </button>
                            )}
                        </label>
                        
                        {isAddingNewCat ? (
                            <div className="space-y-2 border border-primary/25 bg-primary/[0.01] p-3 rounded-xl animate-in fade-in duration-200">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="New category name..."
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!newCatName.trim()) {
                                                setNewCatError('Name is required')
                                                return
                                            }
                                            setNewCatError('')
                                            try {
                                                const res = await apiClient.post('/admin/portfolio-categories', {
                                                    name: newCatName.trim()
                                                })
                                                if (res.success) {
                                                    if (onCategoryAdded) {
                                                        await onCategoryAdded(newCatName.trim())
                                                    }
                                                    setCategory(newCatName.trim())
                                                    setIsAddingNewCat(false)
                                                } else {
                                                    setNewCatError(res.message || 'Failed')
                                                }
                                            } catch (err) {
                                                setNewCatError('Error')
                                            }
                                        }}
                                        className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition rounded-lg flex items-center justify-center cursor-pointer"
                                        title="Use Category"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNewCat(false)}
                                        className="p-1.5 bg-secondary text-foreground hover:bg-secondary/80 transition rounded-lg flex items-center justify-center cursor-pointer text-xs font-semibold"
                                        title="Cancel"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {newCatError && (
                                    <p className="text-[10px] font-bold text-red-500">{newCatError}</p>
                                )}
                            </div>
                        ) : (
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none cursor-pointer"
                            >
                                {categoriesList.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                            Button Link / URL
                        </label>
                        <input
                            type="url"
                            value={buttonLink}
                            onChange={(e) => setButtonLink(e.target.value)}
                            placeholder="e.g. https://github.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Description / Detail
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details about this portfolio card..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none resize-y"
                    />
                </div>

                {/* Image Upload Area */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Card Cover Image
                    </label>
                    
                    {/* Visual Preview / Upload Box */}
                    {imagePreview || (existingImageUrl && imageAction !== 'remove') ? (
                        <div className="relative rounded-2xl overflow-hidden border border-border/80 aspect-video max-w-sm bg-muted/40 shadow-sm group">
                            <img
                                src={imagePreview || `http://localhost:5001/${existingImageUrl}`}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg"
                                    title="Remove image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition bg-muted/20 hover:bg-muted/30 group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition mb-2" />
                            <p className="text-sm font-semibold text-foreground">Click to upload file</p>
                            <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, or WebP formats</p>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-foreground hover:bg-secondary transition active:scale-98 cursor-pointer"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition active:scale-98 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                        disabled={loading}
                    >
                        {loading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                        {record ? 'Save Changes' : 'Create Card'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
