'use client'

import { useState, useEffect } from 'react'
import { Input, FormSection } from '@/components/ui/FormFields'

const emptyAdmin = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
}

export default function AdminsForm({ admin, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(emptyAdmin)

    useEffect(() => {
        if (admin) {
            const fullName =
                admin.fullName ??
                [admin.firstName, admin.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim()

            setFormData({
                fullName,
                email: admin.email ?? '',
                phone: admin.phone ?? '',
                password: '',
            })
        } else {
            setFormData(emptyAdmin)
        }
    }, [admin])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const payload = { ...formData }

        if (admin && !payload.password) {
            delete payload.password
        }

        onSubmit(payload)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

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
