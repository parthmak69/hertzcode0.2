'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'

export default function SettingModal({
    isOpen,
    onClose,
    onSave,
    record = null
}) {
    const [settingKey, setSettingKey] = useState('')
    const [settingValue, setSettingValue] = useState('')
    const [description, setDescription] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Load record details if editing
    useEffect(() => {
        if (record) {
            setSettingKey(record.setting_key || '')
            setSettingValue(record.setting_value || '')
            setDescription(record.description || '')
        } else {
            setSettingKey('')
            setSettingValue('')
            setDescription('')
        }
        setError('')
    }, [record, isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!settingKey.trim()) {
            setError('Key is required')
            return
        }
        if (settingValue.trim() === '') {
            setError('Value is required')
            return
        }

        setLoading(true)
        setError('')

        try {
            const success = await onSave({
                setting_key: settingKey.trim(),
                setting_value: settingValue.trim(),
                description: description.trim()
            })
            if (success) {
                onClose()
            }
        } catch (err) {
            console.error('[SettingModal Submit Error]', err)
            setError(err.message || 'Failed to save setting.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'Edit Setting' : 'Create Setting'}>
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-medium">
                        {error}
                    </div>
                )}

                {/* Key */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Setting Key <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={settingKey}
                        onChange={(e) => setSettingKey(e.target.value)}
                        placeholder="e.g. site_name"
                        disabled={record !== null} // Disable key editing for existing settings
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        required
                    />
                </div>

                {/* Value */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Setting Value <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={settingValue}
                        onChange={(e) => setSettingValue(e.target.value)}
                        placeholder="e.g. My Premium Portfolio"
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none resize-y"
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                        Description / Info
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain what this configuration option does..."
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
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
                        {record ? 'Save Changes' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
