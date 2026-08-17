'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Modal from '@/components/ui/Modal'
import { apiClient } from '@/utils/api'
import { downloadTemplate } from '@/utils/exportExcel'
import { 
    Upload, 
    X, 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    ArrowRight, 
    ArrowLeft, 
    Search,
    ChevronLeft,
    ChevronRight,
    ListChecks,
    Columns
} from 'lucide-react'

export default function ImportModal({ isOpen, onClose, onImportSuccess, type, importUrl }) {
    // Stepper Navigation: 'UPLOAD' | 'CHOOSE_PATH' | 'CUSTOMIZE'
    const [step, setStep] = useState('UPLOAD')
    
    const [file, setFile] = useState(null)
    const [rawHeaders, setRawHeaders] = useState([])
    const [rawRows, setRawRows] = useState([])
    
    // Checked columns checklist state (headers from original Excel file)
    const [checkedColumns, setCheckedColumns] = useState([])
    
    // Checked rows selection checklist state
    const [selectedRows, setSelectedRows] = useState([])
    
    // Pagination & Search for row selection preview
    const [currentPage, setCurrentPage] = useState(1)
    const [previewSearch, setPreviewSearch] = useState('')
    const pageSize = 5
    
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef(null)

    const resetState = () => {
        setStep('UPLOAD')
        setFile(null)
        setRawHeaders([])
        setRawRows([])
        setCheckedColumns([])
        setSelectedRows([])
        setCurrentPage(1)
        setPreviewSearch('')
        setErrorMsg('')
        setSuccessMsg('')
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    // Normalization helper: maps standard or custom Excel headers to backend fields
    const getNormalizedKey = (excelHeader) => {
        const cleanHeader = String(excelHeader).toLowerCase().trim()
        
        if (type === 'admins') {
            if (['full name', 'fullname', 'name', 'first name', 'last name'].includes(cleanHeader)) return 'Full Name'
            if (['email', 'mail', 'email address', 'emailid'].includes(cleanHeader)) return 'Email'
            if (['password', 'pass'].includes(cleanHeader)) return 'Password'
            if (['phone', 'mobile', 'contact', 'telephone', 'phone number'].includes(cleanHeader)) return 'Phone'
        } else {
            if (['record name', 'recordname', 'title', 'text_title', 'name'].includes(cleanHeader)) return 'Record Name'
            if (['url slug', 'slug'].includes(cleanHeader)) return 'URL Slug'
            if (['email', 'mail', 'email address'].includes(cleanHeader)) return 'Email'
            if (['password', 'pass'].includes(cleanHeader)) return 'Password'
            if (['website url', 'website_url', 'url', 'website'].includes(cleanHeader)) return 'Website URL'
            if (['phone', 'mobile', 'contact', 'phone number'].includes(cleanHeader)) return 'Phone'
            if (['qty / stock', 'qty', 'quantity', 'stock', 'integer_qty'].includes(cleanHeader)) return 'Qty / Stock'
            if (['price (₹)', 'price', 'rate', 'amount', 'cost', 'decimal_price'].includes(cleanHeader)) return 'Price (₹)'
            if (['tax percentage', 'tax', 'discount', 'percentage'].includes(cleanHeader)) return 'Tax Percentage'
            if (['range slider value', 'slider', 'rating'].includes(cleanHeader)) return 'Range Slider Value'
            if (['short notes', 'notes', 'subtitle', 'short_notes'].includes(cleanHeader)) return 'Short Notes'
            if (['rich text content', 'content', 'description', 'rich_wysiwyg_content'].includes(cleanHeader)) return 'Rich Text Content'
            if (['radio selection', 'radio', 'radio_selection'].includes(cleanHeader)) return 'Radio Selection'
            if (['checkbox toggle', 'checkbox', 'checkbox_toggle'].includes(cleanHeader)) return 'Checkbox Toggle'
            if (['active toggle', 'active', 'switch_active'].includes(cleanHeader)) return 'Active Toggle'
            if (['date', 'date_picker'].includes(cleanHeader)) return 'Date'
            if (['time', 'time_picker'].includes(cleanHeader)) return 'Time'
            if (['tags', 'multi_select_tags'].includes(cleanHeader)) return 'Tags'
            if (['dropdown selection', 'dropdown', 'dropdown_selection', 'category'].includes(cleanHeader)) return 'Dropdown Selection'
        }
        
        return excelHeader
    }

    // Automatically check headers found in Excel file
    const processFile = (fileObj) => {
        if (!fileObj) return
        setErrorMsg('')
        setSuccessMsg('')

        const name = fileObj.name.toLowerCase()
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setErrorMsg('Only Excel files (.xlsx or .xls) are supported.')
            return
        }

        setFile(fileObj)
        setLoading(true)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                
                if (workbook.SheetNames.length === 0) {
                    throw new Error('Excel workbook contains no sheets.')
                }

                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]

                // Extract headers
                const headers = []
                if (worksheet && worksheet['!ref']) {
                    const range = XLSX.utils.decode_range(worksheet['!ref'])
                    const R = range.s.r
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellAddress = { c: C, r: R }
                        const cellRef = XLSX.utils.encode_cell(cellAddress)
                        const cell = worksheet[cellRef]
                        if (cell && cell.v !== undefined) {
                            headers.push(String(cell.v).trim())
                        }
                    }
                }

                if (headers.length === 0) {
                    throw new Error('Could not find column headers in the spreadsheet.')
                }

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
                if (jsonData.length === 0) {
                    throw new Error('The selected sheet is empty.')
                }

                setRawHeaders(headers)
                setRawRows(jsonData)
                
                // Check all columns by default
                setCheckedColumns(headers)

                // Select all rows by default
                setSelectedRows(jsonData.map((_, idx) => idx))

                // Transition step
                setStep('CHOOSE_PATH')
            } catch (err) {
                setErrorMsg(err.message || 'Failed to parse Excel file.')
                setFile(null)
            } finally {
                setLoading(false)
            }
        }

        reader.onerror = () => {
            setErrorMsg('File read error. Please try again.')
            setFile(null)
            setLoading(false)
        }

        reader.readAsArrayBuffer(fileObj)
    }

    // Drag-and-drop handlers
    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0])
        }
    }

    // Quick Import Handler (Direct submit of all rows and standard columns)
    const handleQuickImport = async () => {
        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')

        // Normalize checked headers to check required fields
        const normalizedHeaders = rawHeaders.map(getNormalizedKey)

        if (type === 'admins') {
            const hasName = normalizedHeaders.includes('Full Name')
            const hasEmail = normalizedHeaders.includes('Email')
            const hasPassword = normalizedHeaders.includes('Password')
            
            if (!hasName || !hasEmail || !hasPassword) {
                setErrorMsg("Quick Import failed: Your spreadsheet does not contain required headers (Name, Email, Password). Please use 'Customize Import' to import.")
                setLoading(false)
                return
            }
        } else {
            const hasTitle = normalizedHeaders.includes('Record Name')
            if (!hasTitle) {
                setErrorMsg("Quick Import failed: Your spreadsheet does not contain the required 'Record Name' header. Please use 'Customize Import' to import.")
                setLoading(false)
                return
            }
        }

        const recordsToImport = rawRows.map(row => {
            const mappedRow = {}
            rawHeaders.forEach(header => {
                const dbKey = getNormalizedKey(header)
                mappedRow[dbKey] = row[header]
            })
            return mappedRow
        })

        try {
            const res = await apiClient.post(importUrl, { records: recordsToImport })
            if (res.success) {
                setSuccessMsg(res.message || 'All records imported successfully.')
                setTimeout(() => {
                    onImportSuccess?.()
                    handleClose()
                }, 1500)
            } else {
                setErrorMsg(res.message || 'Failed to import records.')
            }
        } catch (err) {
            setErrorMsg('Network error occurred during import.')
        } finally {
            setLoading(false)
        }
    }

    // Custom Import Submit (User-selected columns and user-selected rows)
    const handleCustomImportSubmit = async () => {
        if (checkedColumns.length === 0) {
            setErrorMsg('Please select at least one column to import.')
            return
        }

        // Validate required database columns are checked
        const checkedNormalized = checkedColumns.map(getNormalizedKey)

        if (type === 'admins') {
            const hasName = checkedNormalized.includes('Full Name')
            const hasEmail = checkedNormalized.includes('Email')
            const hasPassword = checkedNormalized.includes('Password')
            
            if (!hasName || !hasEmail || !hasPassword) {
                const missing = []
                if (!hasName) missing.push('Full Name/Name')
                if (!hasEmail) missing.push('Email')
                if (!hasPassword) missing.push('Password')
                setErrorMsg(`Please select Excel columns that contain the required fields: ${missing.join(', ')}`)
                return
            }
        } else {
            const hasTitle = checkedNormalized.includes('Record Name')
            if (!hasTitle) {
                setErrorMsg("Please select the Excel column that contains the required field: Record Name")
                return
            }
        }

        if (selectedRows.length === 0) {
            setErrorMsg('Please select at least one row to import.')
            return
        }

        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')

        // Map checked columns for selected rows only
        const recordsToImport = rawRows
            .filter((_, idx) => selectedRows.includes(idx))
            .map(row => {
                const mappedRow = {}
                checkedColumns.forEach(header => {
                    const dbKey = getNormalizedKey(header)
                    mappedRow[dbKey] = row[header]
                })
                return mappedRow
            })

        try {
            const res = await apiClient.post(importUrl, { records: recordsToImport })
            if (res.success) {
                setSuccessMsg(res.message || `Successfully imported ${recordsToImport.length} selected records.`)
                setTimeout(() => {
                    onImportSuccess?.()
                    handleClose()
                }, 1500)
            } else {
                setErrorMsg(res.message || 'Failed to import records.')
            }
        } catch (err) {
            setErrorMsg('Network error occurred during import.')
        } finally {
            setLoading(false)
        }
    }

    // Toggle single preview row checkbox
    const toggleRowSelection = (globalIndex) => {
        if (selectedRows.includes(globalIndex)) {
            setSelectedRows(selectedRows.filter(i => i !== globalIndex))
        } else {
            setSelectedRows([...selectedRows, globalIndex])
        }
    }

    // Filters rows based on search query in preview step
    const filteredRowsList = useMemo(() => {
        return rawRows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
            if (!previewSearch.trim()) return true
            const term = previewSearch.toLowerCase()
            return Object.values(row).some(val => String(val).toLowerCase().includes(term))
        })
    }, [rawRows, previewSearch])

    // Toggle selection for all visible search filtered items
    const toggleAllVisibleRows = () => {
        const visibleIndices = filteredRowsList.map(item => item.idx)
        const allVisibleSelected = visibleIndices.every(idx => selectedRows.includes(idx))

        if (allVisibleSelected) {
            setSelectedRows(selectedRows.filter(idx => !visibleIndices.includes(idx)))
        } else {
            setSelectedRows([...new Set([...selectedRows, ...visibleIndices])])
        }
    }

    // Pagination bounds calculation
    const totalVisibleItems = filteredRowsList.length
    const totalPages = Math.ceil(totalVisibleItems / pageSize) || 1
    
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredRowsList.slice(start, start + pageSize)
    }, [filteredRowsList, currentPage, pageSize])

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                step === 'UPLOAD' ? `Import ${type === 'admins' ? 'Admins' : 'Sandbox Records'} via Excel` :
                step === 'CHOOSE_PATH' ? 'Choose Import Method' :
                'Customize Column and Row Import'
            }
            size={step === 'CUSTOMIZE' ? 'xl' : 'lg'}
        >
            <div className="space-y-6 py-2">
                
                {/* Stepper Navigation */}
                {step !== 'UPLOAD' && (
                    <div className="flex items-center justify-between max-w-xs mx-auto relative mb-2">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/60 -translate-y-1/2 -z-10" />

                        {/* Step 1: Selection Method */}
                        <div className="flex flex-col items-center gap-1 bg-background px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                                step === 'CHOOSE_PATH' 
                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 scale-110' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                                {step !== 'CHOOSE_PATH' ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">Path</span>
                        </div>

                        {/* Step 2: Customization options */}
                        <div className="flex flex-col items-center gap-1 bg-background px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                                step === 'CUSTOMIZE'
                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/30 scale-110'
                                    : 'bg-muted/50 border-border/80 text-muted-foreground'
                            }`}>
                                2
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">Customize</span>
                        </div>
                    </div>
                )}

                {/* 1. UPLOAD STEP */}
                {step === 'UPLOAD' && (
                    <>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-emerald-500">Need a starting template?</h4>
                                <p className="text-xs text-muted-foreground mt-1">Download the sample layout with required columns.</p>
                            </div>
                            <button
                                onClick={() => downloadTemplate(type)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Download Template
                            </button>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[180px] ${
                                isDragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/55 hover:bg-secondary/40'
                            }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx, .xls"
                                className="hidden"
                            />
                            {loading ? (
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            ) : (
                                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                            )}
                            <p className="text-sm font-semibold text-foreground">
                                {loading ? 'Reading Excel file...' : 'Drag and drop your spreadsheet here'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                or click to browse from device (.xlsx, .xls)
                            </p>
                        </div>
                    </>
                )}

                {/* 2. CHOOSE METHOD STEP */}
                {step === 'CHOOSE_PATH' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-muted/60 border border-border/80 rounded-xl flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-foreground truncate">{file?.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Found {rawRows.length} data rows and {rawHeaders.length} columns in sheet.</p>
                            </div>
                            <button
                                onClick={resetState}
                                className="px-3 py-1.5 bg-secondary text-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80 border border-border transition cursor-pointer"
                            >
                                Change File
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Option A: Quick Import */}
                            <div 
                                onClick={handleQuickImport}
                                className="group p-5 border border-border/80 bg-card/40 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] rounded-xl cursor-pointer transition flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition-all">
                                        ⚡
                                    </div>
                                    <h4 className="text-sm font-bold text-foreground">Quick Import</h4>
                                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                        Immediately import the entire spreadsheet. Automatically maps standard column names from your file.
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center text-xs font-bold text-emerald-500 gap-1 opacity-80 group-hover:opacity-100">
                                    Import All Data <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* Option B: Custom Import */}
                            <div 
                                onClick={() => setStep('CUSTOMIZE')}
                                className="group p-5 border border-border/80 bg-card/40 hover:border-primary/50 hover:bg-primary/[0.02] rounded-xl cursor-pointer transition flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition-all">
                                        ⚙️
                                    </div>
                                    <h4 className="text-sm font-bold text-foreground">Customize Import</h4>
                                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                        Select which columns you want to import, choose which rows to import from preview, and filter/search rows.
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center text-xs font-bold text-primary gap-1 opacity-80 group-hover:opacity-100">
                                    Select Columns & Rows <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SIMPLIFIED CUSTOMIZATION STEP */}
                {step === 'CUSTOMIZE' && (
                    <div className="space-y-6">
                        
                        {/* Column checklist box */}
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5">
                                <Columns className="w-4 h-4 text-primary" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Columns to Import</h4>
                            </div>
                            
                            <div className="flex flex-wrap gap-2.5 p-4 bg-muted/40 border border-border/60 rounded-xl">
                                {rawHeaders.map(col => (
                                    <label 
                                        key={col} 
                                        className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer select-none transition-all active:scale-[0.98] ${
                                            checkedColumns.includes(col)
                                                ? 'bg-primary/10 border-primary/30 text-primary'
                                                : 'bg-card border-border/80 text-muted-foreground hover:bg-secondary/40'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checkedColumns.includes(col)}
                                            onChange={() => {
                                                if (checkedColumns.includes(col)) {
                                                    setCheckedColumns(checkedColumns.filter(c => c !== col))
                                                } else {
                                                    setCheckedColumns([...checkedColumns, col])
                                                }
                                            }}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-border"
                                        />
                                        <span>{col}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Row preview and filter search */}
                        <div className="space-y-3.5">
                            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <ListChecks className="w-4 h-4 text-primary" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Rows & Preview</h4>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {/* Selected counter banner */}
                                    <span className="text-[11px] font-semibold text-muted-foreground/80 whitespace-nowrap bg-muted px-2.5 py-1 rounded-md border border-border/60">
                                        {selectedRows.length} of {rawRows.length} rows selected
                                    </span>
                                    
                                    {/* Row search field */}
                                    <div className="relative w-full md:w-56">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                                            <Search className="w-3.5 h-3.5" />
                                        </span>
                                        <input
                                            type="text"
                                            value={previewSearch}
                                            onChange={(e) => {
                                                setPreviewSearch(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                            placeholder="Search rows..."
                                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-card border border-border/80 rounded-lg focus:outline-none focus:border-primary transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Table grid preview */}
                            <div className="border border-border rounded-xl overflow-hidden bg-card">
                                <div className="overflow-x-auto max-w-full">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted border-b border-border font-bold">
                                                <th className="p-3 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        onChange={toggleAllVisibleRows}
                                                        checked={
                                                            filteredRowsList.length > 0 &&
                                                            filteredRowsList.every(item => selectedRows.includes(item.idx))
                                                        }
                                                        className="w-4 h-4 text-primary bg-background rounded border-border focus:ring-primary"
                                                    />
                                                </th>
                                                {checkedColumns.map(col => (
                                                    <th key={col} className="p-3 whitespace-nowrap text-muted-foreground">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {paginatedItems.length === 0 ? (
                                                <tr>
                                                    <td 
                                                        colSpan={checkedColumns.length + 1}
                                                        className="p-8 text-center text-muted-foreground font-medium"
                                                    >
                                                        {checkedColumns.length === 0 
                                                            ? 'Select at least one column above to preview data.' 
                                                            : 'No preview rows match search query.'
                                                        }
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedItems.map(({ row, idx }) => (
                                                    <tr 
                                                        key={idx} 
                                                        className={`hover:bg-secondary/20 transition-all ${
                                                            selectedRows.includes(idx) ? 'bg-primary/[0.01]' : 'opacity-60 bg-muted/10'
                                                        }`}
                                                    >
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRows.includes(idx)}
                                                                onChange={() => toggleRowSelection(idx)}
                                                                className="w-4 h-4 text-primary bg-background rounded border-border focus:ring-primary"
                                                            />
                                                        </td>
                                                        {checkedColumns.map(col => (
                                                            <td key={col} className="p-3 font-medium text-foreground truncate max-w-[200px]">
                                                                {row[col] === undefined || row[col] === null ? '' : String(row[col])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-[11px] text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 border border-border/80 rounded-lg hover:bg-secondary disabled:opacity-40 transition cursor-pointer"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 border border-border/80 rounded-lg hover:bg-secondary disabled:opacity-40 transition cursor-pointer"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-semibold flex items-start gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold flex items-start gap-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Stepper actions buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    {/* Left Actions */}
                    <div>
                        {step === 'CUSTOMIZE' && (
                            <button
                                onClick={() => {
                                    setErrorMsg('')
                                    setStep('CHOOSE_PATH')
                                }}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-secondary cursor-pointer transition disabled:opacity-50"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-secondary cursor-pointer transition disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        {/* Submit custom import */}
                        {step === 'CUSTOMIZE' && (
                            <button
                                onClick={handleCustomImportSubmit}
                                disabled={loading || selectedRows.length === 0 || checkedColumns.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition cursor-pointer disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Start Custom Import
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
