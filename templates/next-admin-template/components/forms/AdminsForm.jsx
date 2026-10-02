'use client'

import { useState, useEffect } from 'react'
import { Input, FormSection } from '@/components/ui/FormFields'
import { Upload, X, Shield } from 'lucide-react'

const emptyAdmin = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    profile_image: '',
}

export default function AdminsForm({ admin, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(emptyAdmin)
    const [imageFile, setImageFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState('')

    useEffect(() => {
        if (admin) {
            const fullName =
                admin.fullName ??
                admin.full_name ??
                [admin.firstName, admin.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim()

            const existingImage = admin.profile_image || admin.image_url || admin.avatar || admin.image || ''

            setFormData({
                fullName,
                email: admin.email ?? '',
                phone: admin.phone ?? '',
                password: '',
                profile_image: existingImage,
            })

            if (existingImage) {
                const src = existingImage.startsWith('http') || existingImage.startsWith('data:')
                    ? existingImage
                    : `http://localhost:5001${existingImage.startsWith('/') ? '' : '/'}${existingImage}`
                setPreviewUrl(src)
            } else {
                setPreviewUrl('')
            }
            setImageFile(null)
        } else {
            setFormData(emptyAdmin)
            setPreviewUrl('')
            setImageFile(null)
        }
    }, [admin])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        if (name === 'profile_image') {
            if (value && (value.startsWith('http') || value.startsWith('/uploads/'))) {
                setPreviewUrl(value.startsWith('http') ? value : `http://localhost:5001${value.startsWith('/') ? '' : '/'}${value}`)
            } else {
                setPreviewUrl(value)
            }
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviewUrl(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setPreviewUrl('')
        setFormData(prev => ({ ...prev, profile_image: '' }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const payload = { ...formData }

        if (admin && !payload.password) {
            delete payload.password
        }

        if (imageFile) {
            payload.imageFile = imageFile
        }

        onSubmit(payload)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <FormSection title="Admin Profile Picture">
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-border/80 bg-secondary/20">
                    <div className="relative w-20 h-20 rounded-full border-2 border-primary/20 bg-card overflow-hidden shadow-inner flex shrink-0 items-center justify-center">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Admin Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none'
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                                }}
                            />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center font-bold text-lg text-primary bg-primary/10 ${previewUrl ? 'hidden' : 'flex'}`}>
                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <Shield className="w-8 h-8 text-muted-foreground/40" />}
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs transition cursor-pointer hover:bg-primary/90 flex items-center gap-1.5 shadow-sm active:scale-95">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Image</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>

                            {previewUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="px-3 py-1.5 border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                </button>
                            )}
                        </div>

                        <div>
                            <input
                                type="text"
                                name="profile_image"
                                value={formData.profile_image}
                                onChange={handleChange}
                                placeholder="Or enter Image URL (https://... or /uploads/...)"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Admin Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <Input
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label={
                            admin
                                ? 'Password (leave blank to keep current)'
                                : 'Password'
                        }
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!admin}
                        placeholder={admin ? '••••••••' : ''}
                    />

                </div>
            </FormSection>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">

                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-md text-sm font-medium
                               border border-border
                               bg-secondary text-secondary-foreground
                               hover:bg-secondary/80
                               transition cursor-pointer"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-medium
                               bg-primary text-primary-foreground
                               hover:bg-primary/90
                               transition cursor-pointer"
                >
                    {admin ? 'Update Admin' : 'Create Admin'}
                </button>

            </div>
        </form>
    )
}
