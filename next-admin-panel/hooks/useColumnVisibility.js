'use client'

import { useState, useCallback } from 'react'

const STORAGE_PREFIX = 'datatable-columns-'

/**
 * Persists DataTable column visibility to localStorage per table.
 * @param {string} storageKey - Unique key per table (e.g. 'products', 'stocks', 'categories')
 * @param {Array<{key: string}>} columns - Column definitions with key property
 * @returns {[string[], (columns: string[]) => void]}
 */
export default function useColumnVisibility(storageKey, columns) {
    const allKeys = columns.map((c) => c.key)
    const defaultVisible = allKeys

    const [visibleColumns, setVisibleColumnsState] = useState(() => {
        const keys = columns.map((c) => c.key)
        if (typeof window === 'undefined') return keys
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
            if (!raw) return keys
            const saved = JSON.parse(raw)
            if (!Array.isArray(saved)) return keys
            const valid = saved.filter((k) => keys.includes(k))
            return valid.length > 0 ? valid : keys
        } catch {
            return keys
        }
    })

    const setVisibleColumns = useCallback(
        (next) => {
            setVisibleColumnsState((prev) => {
                const value = typeof next === 'function' ? next(prev) : next
                const valid = Array.isArray(value)
                    ? value.filter((k) => allKeys.includes(k))
                    : defaultVisible
                const toSave = valid.length > 0 ? valid : defaultVisible
                try {
                    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(toSave))
                } catch {}
                return toSave
            })
        },
        [storageKey, allKeys.join(',')]
    )

    return [visibleColumns, setVisibleColumns]
}
