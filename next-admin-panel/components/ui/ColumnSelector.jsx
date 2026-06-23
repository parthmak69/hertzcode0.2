'use client'

import { useState, useRef, useEffect } from 'react'

export default function ColumnSelector({
    columns,
    visibleColumns,
    onChange,
}) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)
    const buttonRef = useRef(null)

    const toggleColumn = (key) => {
        onChange(
            visibleColumns.includes(key)
                ? visibleColumns.filter((c) => c !== key)
                : [...visibleColumns, key]
        )
    }

    useEffect(() => {
        if (isOpen && dropdownRef.current && buttonRef.current) {
            const dropdown = dropdownRef.current
            const button = buttonRef.current
            const rect = button.getBoundingClientRect()
            const dropdownRect = dropdown.getBoundingClientRect()

            if (rect.right + dropdownRect.width > window.innerWidth) {
                dropdown.style.right = '0'
                dropdown.style.left = 'auto'
            } else {
                dropdown.style.left = '0'
                dropdown.style.right = 'auto'
            }

            if (rect.bottom + dropdownRect.height > window.innerHeight) {
                dropdown.style.bottom = '100%'
                dropdown.style.top = 'auto'
                dropdown.style.marginBottom = '8px'
            } else {
                dropdown.style.top = '100%'
                dropdown.style.bottom = 'auto'
                dropdown.style.marginTop = '8px'
            }
        }
    }, [isOpen])

    return (
        <div className="relative z-50">

            {/* Toggle Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="
          cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border
          bg-card border-border text-foreground text-sm shadow-sm
          hover:bg-secondary/80 transition-colors
        "
            >
                <svg
                    className="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                </svg>

                <span className="text-sm hidden sm:inline">
                    Columns
                </span>

                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {visibleColumns.length}
                </span>
            </button>

            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div
                        ref={dropdownRef}
                        className="
              absolute z-50 w-52 rounded-xl border border-border
              bg-card shadow-lg 
            "
                        style={{ position: 'absolute' }}
                    >

                        {/* Header */}
                        <div className="p-2 border-b border-border bg-muted/20 rounded-t-xl">
                            <div className="flex justify-between px-2">
                                <button
                                    onClick={() => onChange(columns.map((c) => c.key))}
                                    className="text-xs font-medium text-primary cursor-pointer hover:underline"
                                >
                                    Select All
                                </button>

                                <button
                                    onClick={() =>
                                        onChange(columns.slice(0, 2).map((c) => c.key))
                                    }
                                    className="text-xs font-medium text-muted-foreground cursor-pointer hover:underline"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Column List */}
                        <div className="p-1 max-h-60 overflow-y-auto">
                            {columns.map((col) => {
                                const active = visibleColumns.includes(col.key)

                                return (
                                    <label
                                        key={col.key}
                                        className="
                      flex items-center gap-2 p-2 rounded cursor-pointer
                      hover:bg-secondary transition-colors
                    "
                                    >
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleColumn(col.key)}
                                            className="
                        w-4 h-4 rounded border-border
                        text-primary focus:ring-ring
                      "
                                        />

                                        <span className="text-sm text-foreground">
                                            {col.label}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
