'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input, Select, Checkbox, Textarea, RadioGroup, RangeSlider, FormSection } from '@/components/ui/FormFields'
import DatePicker from '@/components/ui/DatePicker'
import RichTextEditor from '@/components/ui/RichTextEditor'
import MultiSelect from '@/components/ui/MultiSelect'
import { Plus, Trash2, Upload, X, FileText } from 'lucide-react'

// Premium button styles matching products forms
const BTN = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all active:scale-[0.98]'
const BTN_SECONDARY = `${BTN} border border-border bg-card shadow-sm text-foreground hover:bg-secondary`
const BTN_DANGER = `${BTN} border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50`

// Static option constants matching test.sql seeds
const CATEGORY_OPTIONS = [
    { value: 'grocery_staples', label: 'Grocery Staples / Products' },
    { value: 'coupons_promos', label: 'Coupons & Promos' },
    { value: 'crm_vendor', label: 'CRM Vendors & Salesmen' },
    { value: 'system_configs', label: 'System Configurations' },
]

const RADIO_OPTIONS = [
    { value: 'credit_card', label: 'Credit Card Approved' },
    { value: 'cod_allowed', label: 'Cash on Delivery (COD) Allowed' },
    { value: 'online_only', label: 'Online Transactions Only' },
    { value: 'secured_portals', label: 'Restricted Secured Portals' },
]

const TAG_OPTIONS = [
    { value: 'organic', label: 'Organic / Premium' },
    { value: 'staples', label: 'High Volume Staples' },
    { value: 'protein-rich', label: 'Protein-Rich' },
    { value: 'best-seller', label: 'Best Seller' },
    { value: 'discount', label: 'Seasonal Discount' },
    { value: 'wholesale', label: 'Wholesale B2B Only' },
    { value: 'verified-dealer', label: 'Verified Partner' },
    { value: 'restricted-access', label: 'Restricted Access' },
]

const emptyForm = {
    text_title: '',
    slug: '',
    email: '',
    password: '',
    website_url: '',
    phone: '',
    integer_qty: 1,
    decimal_price: 0.00,
    tax_percentage: 0.00,
    range_slider_value: 50,
    short_notes: '',
    rich_wysiwyg_content: '',
    dropdown_selection: 'grocery_staples',
    radio_selection: 'credit_card',
    checkbox_toggle: false,
    switch_active: true,
    date_picker: null,
    datetime_picker: null,
    time_picker: '12:00:00',
    primary_image_url: '',
    document_file_url: '',
    gallery_images: [],
    multi_select_tags: [],
}

export default function MasterForm({ record, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(emptyForm)
    const [metadataList, setMetadataList] = useState([])

    // Primary Image upload states
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [primaryImageAction, setPrimaryImageAction] = useState('none') // 'none', 'upload', 'remove'

    // Secondary gallery list states
    const [secondaryList, setSecondaryList] = useState([])
    const [secondaryDrag, setSecondaryDrag] = useState(false)

    // Document File attachment states
    const [documentFile, setDocumentFile] = useState(null)
    const [documentPreview, setDocumentPreview] = useState(null)
    const [documentDrag, setDocumentDrag] = useState(false)
    const [documentFileAction, setDocumentFileAction] = useState('none') // 'none', 'upload', 'remove'

    // Refs for input elements
    const fileInputRef = useRef(null)
    const secondaryInputRef = useRef(null)
    const docInputRef = useRef(null)

    // Synchronize editing record with form state
    useEffect(() => {
        if (record) {
            // Parse dates safely
            const parsedDate = record.date_picker ? new Date(record.date_picker) : null
            const parsedDatetime = record.datetime_picker ? new Date(record.datetime_picker) : null

            setFormData({
                text_title: record.text_title ?? '',
                slug: record.slug ?? '',
                email: record.email ?? '',
                password: '', // Kept empty for editing
                website_url: record.website_url ?? '',
                phone: record.phone ?? '',
                integer_qty: record.integer_qty ?? 1,
                decimal_price: record.decimal_price ?? 0.00,
                tax_percentage: record.tax_percentage ?? 0.00,
                range_slider_value: record.range_slider_value ?? 50,
                short_notes: record.short_notes ?? '',
                rich_wysiwyg_content: record.rich_wysiwyg_content ?? '',
                dropdown_selection: record.dropdown_selection ?? 'grocery_staples',
                radio_selection: record.radio_selection ?? 'credit_card',
                checkbox_toggle: record.checkbox_toggle === 1 || record.checkbox_toggle === true,
                switch_active: record.switch_active === 1 || record.switch_active === true,
                date_picker: parsedDate,
                datetime_picker: parsedDatetime,
                time_picker: record.time_picker ?? '12:00:00',
                primary_image_url: record.primary_image_url ?? '',
                document_file_url: record.document_file_url ?? '',
                gallery_images: Array.isArray(record.gallery_images) ? record.gallery_images : [],
                multi_select_tags: Array.isArray(record.multi_select_tags) ? record.multi_select_tags : [],
            })

            // Sync Primary File Preview
            setImageFile(null)
            setImagePreview(record.primary_image_url ? (record.primary_image_url.startsWith('http') ? record.primary_image_url : `/${record.primary_image_url}`) : null)
            setPrimaryImageAction('none')

            // Sync Document File Preview
            setDocumentFile(null)
            setDocumentPreview(record.document_file_url ? (record.document_file_url.startsWith('http') ? record.document_file_url : `/${record.document_file_url}`) : null)
            setDocumentFileAction('none')

            // Sync Secondary Gallery items
            let existing = record.gallery_images
            if (!Array.isArray(existing)) {
                if (typeof existing === 'string') {
                    try {
                        existing = JSON.parse(existing) || []
                    } catch {
                        existing = existing ? [existing] : []
                    }
                } else {
                    existing = []
                }
            }
            setSecondaryList(existing.map((url) => ({ preview: url.startsWith('http') ? url : `/${url}` })))

            // Extract metadata JSON object to structured key-value state array
            if (record.json_metadata && typeof record.json_metadata === 'object') {
                const metaArr = Object.entries(record.json_metadata).map(([k, v]) => ({
                    key: k,
                    value: String(v),
                }))
                setMetadataList(metaArr)
            } else {
                setMetadataList([])
            }
        } else {
            setFormData(emptyForm)
            setMetadataList([{ key: '', value: '' }])
            
            setImageFile(null)
            setImagePreview(null)
            setPrimaryImageAction('none')

            setDocumentFile(null)
            setDocumentPreview(null)
            setDocumentFileAction('none')

            setSecondaryList([])
        }
    }, [record])

    // Standard field handler
    const handleChange = (e) => {
        const { name, value, checked, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    // Auto slugify utility
    const handleTitleChange = (e) => {
        const title = e.target.value
        setFormData((prev) => ({
            ...prev,
            text_title: title,
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        }))
    }

    // Date/Datetime setter helpers
    const handleDateChange = (date) => setFormData((prev) => ({ ...prev, date_picker: date }))
    const handleDatetimeChange = (date) => setFormData((prev) => ({ ...prev, datetime_picker: date }))
    const handleTagsChange = (tags) => setFormData((prev) => ({ ...prev, multi_select_tags: tags }))
    const handleWysiwygChange = (html) => setFormData((prev) => ({ ...prev, rich_wysiwyg_content: html }))

    // JSON Key-Value Metadata controls
    const addMetadataRow = () => setMetadataList((prev) => [...prev, { key: '', value: '' }])
    const removeMetadataRow = (idx) => setMetadataList((prev) => prev.filter((_, i) => i !== idx))
    const handleMetadataChange = (idx, field, val) => {
        setMetadataList((prev) => {
            const copy = [...prev]
            copy[idx][field] = val
            return copy
        })
    }

    // Primary image handlers
    const handleFileSelect = useCallback((file) => {
        if (!file?.type?.startsWith('image/')) return
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
        setPrimaryImageAction('upload')
    }, [])

    const handlePrimaryRemove = useCallback(() => {
        setImageFile(null)
        setImagePreview(null)
        setPrimaryImageAction('remove')
    }, [])

    // Secondary gallery list handlers
    const addSecondaryImages = useCallback((files) => {
        if (!files?.length) return
        const newItems = []
        for (let i = 0; i < files.length; i++) {
            const f = files[i]
            if (f?.type?.startsWith('image/')) {
                const preview = URL.createObjectURL(f)
                newItems.push({ file: f, preview })
            }
        }
        setSecondaryList((prev) => [...prev, ...newItems])
    }, [])

    const removeSecondaryImage = useCallback((index) => {
        setSecondaryList((prev) => {
            const next = [...prev]
            const item = next[index]
            if (item?.preview?.startsWith?.('blob:')) URL.revokeObjectURL(item.preview)
            next.splice(index, 1)
            return next
        })
    }, [])

    // Document PDF file handlers
    const handleDocSelect = useCallback((file) => {
        const isPdf = file.type === 'application/pdf'
        const isImg = file.type?.startsWith('image/')
        if (!isPdf && !isImg) return
        setDocumentFile(file)
        setDocumentFileAction('upload')
        setDocumentPreview(isPdf ? file : URL.createObjectURL(file))
    }, [])

    const handleDocRemove = useCallback(() => {
        setDocumentFile(null)
        setDocumentPreview(null)
        setDocumentFileAction('remove')
    }, [])

    // Submit payload construction
    const handleSubmit = (e) => {
        e.preventDefault()

        // Format dates into SQL string formats safely
        let sqlDate = null
        if (formData.date_picker) {
            const d = formData.date_picker
            const offset = d.getTimezoneOffset()
            const adj = new Date(d.getTime() - (offset * 60 * 1000))
            sqlDate = adj.toISOString().split('T')[0]
        }

        let sqlDatetime = null
        if (formData.datetime_picker) {
            const d = formData.datetime_picker
            const offset = d.getTimezoneOffset()
            const adj = new Date(d.getTime() - (offset * 60 * 1000))
            sqlDatetime = adj.toISOString().replace('T', ' ').substring(0, 19)
        }

        // Pack key-value list back into unified metadata JSON object
        const packedMetadata = metadataList.reduce((acc, row) => {
            if (row.key.trim()) {
                const num = Number(row.value)
                acc[row.key.trim()] = !isNaN(num) && row.value.trim() !== '' ? num : row.value
            }
            return acc
        }, {})

        const payload = {
            ...formData,
            date_picker: sqlDate,
            datetime_picker: sqlDatetime,
            json_metadata: packedMetadata,

            // Attach multipart files and actions
            primaryImage: imageFile,
            primaryImageAction,
            documentFile,
            documentFileAction,
            secondaryImages: secondaryList,
        }

        // Clean password if blank on edit
        if (record && !payload.password) {
            delete payload.password
        }

        onSubmit(payload)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* 1. TEXT & STRINGS SECTION */}
            <FormSection title="Standard Strings & Text Inputs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Record Title"
                        name="text_title"
                        value={formData.text_title}
                        onChange={handleTitleChange}
                        placeholder="e.g. Master sandbox product title"
                        required
                    />

                    <Input
                        label="Friendly Slug"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        placeholder="auto-generated-slug-path"
                        required
                    />

                    <Input
                        label="Contact Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. client@domain.com"
                        required
                    />

                    <Input
                        label={record ? 'Update Password (optional)' : 'Security Password'}
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={record ? '••••••••' : 'Enter access password'}
                        required={!record}
                    />

                    <Input
                        label="Website URL Link"
                        name="website_url"
                        type="url"
                        value={formData.website_url}
                        onChange={handleChange}
                        placeholder="https://squadera.com/promotions"
                    />

                    <Input
                        label="Mobile / Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+919876543210"
                    />

                    <div className="col-span-1 md:col-span-2">
                        <Textarea
                            label="Short Notes / Summary"
                            name="short_notes"
                            value={formData.short_notes}
                            onChange={handleChange}
                            placeholder="Enter a brief summary or notes..."
                            rows={3}
                        />
                    </div>
                </div>
            </FormSection>

            {/* 2. NUMERICS & RATES SECTION */}
            <FormSection title="Numeric & Rating Inputs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input
                        label="Integer Stock Qty"
                        name="integer_qty"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.integer_qty}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Decimal Price (₹)"
                        name="decimal_price"
                        type="number"
                        min="0.00"
                        step="0.01"
                        value={formData.decimal_price}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Tax Percentage (%)"
                        name="tax_percentage"
                        type="number"
                        min="0.00"
                        max="100.00"
                        step="0.01"
                        value={formData.tax_percentage}
                        onChange={handleChange}
                        required
                    />
                </div>

                <RangeSlider
                    label="Volume Range Slider Rating"
                    name="range_slider_value"
                    min={0}
                    max={100}
                    value={formData.range_slider_value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, range_slider_value: parseInt(e.target.value) }))}
                    unit="points"
                />
            </FormSection>

            {/* 3. SELECTIONS & BOOLEANS SECTION */}
            <FormSection title="Dropdown, Choice and Boolean Inputs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Select
                        label="Standard Selection Dropdown"
                        name="dropdown_selection"
                        value={formData.dropdown_selection}
                        onChange={handleChange}
                        options={CATEGORY_OPTIONS}
                        required
                    />

                    <RadioGroup
                        label="Selection Radio Option Group"
                        name="radio_selection"
                        value={formData.radio_selection}
                        onChange={(e) => setFormData((prev) => ({ ...prev, radio_selection: e.target.value }))}
                        options={RADIO_OPTIONS}
                    />
                </div>

                <div className="flex flex-wrap gap-6 p-4 rounded-lg bg-secondary/10 border border-border">
                    <Checkbox
                        label="Standard Checkbox toggle"
                        description="Activate high-volume priority shipping rules."
                        name="checkbox_toggle"
                        checked={formData.checkbox_toggle}
                        onChange={handleChange}
                    />

                    <div className="flex flex-col">
                        <span className="text-sm font-medium mb-1">Active Status Switch</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="switch_active"
                                checked={formData.switch_active}
                                onChange={handleChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ml-3 text-sm text-foreground">
                                {formData.switch_active ? 'Active Status' : 'Inactive Status'}
                            </span>
                        </label>
                    </div>
                </div>
            </FormSection>

            {/* 4. DATE & TIME PICKERS */}
            <FormSection title="Date & Time Inputs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DatePicker
                        label="Standard Date Picker"
                        selected={formData.date_picker}
                        onChange={handleDateChange}
                        placeholder="Select calendar date"
                    />

                    <DatePicker
                        label="Precise Datetime Picker"
                        selected={formData.datetime_picker}
                        onChange={handleDatetimeChange}
                        showTimeSelect
                        placeholder="Select date and hour"
                    />

                    <Input
                        label="Operating Time Slot Picker"
                        name="time_picker"
                        type="time"
                        value={formData.time_picker}
                        onChange={handleChange}
                        required
                    />
                </div>
            </FormSection>

            {/* 5. RICH TEXT EDITOR SECTION */}
            <FormSection title="HTML WYSIWYG Rich Text Content">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-foreground">
                        Document HTML Content description
                    </label>
                    <RichTextEditor
                        value={formData.rich_wysiwyg_content}
                        onChange={handleWysiwygChange}
                        placeholder="Enter full formatted rich text with lists, headers and images..."
                    />
                </div>
            </FormSection>

            {/* 6. PREMIUM UPLOADS & FILE ATTACHMENTS */}
            <FormSection title="Media & Document File Paths">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    
                    {/* Primary Image Upload Column */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-foreground">
                            Primary Catalog Image
                        </label>
                        
                        {imagePreview ? (
                            <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-secondary/20 aspect-square flex items-center justify-center max-w-[280px]">
                                <img
                                    src={imagePreview}
                                    alt="Catalog product"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={handlePrimaryRemove}
                                        className={BTN_DANGER}
                                    >
                                        <Trash2 className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    setIsDragging(false)
                                    const file = e.dataTransfer?.files?.[0]
                                    if (file) handleFileSelect(file)
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer min-h-[200px] max-w-[280px] transition-all
                                    ${isDragging 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-border/80 bg-secondary/5 hover:bg-secondary/15 hover:border-primary/50'
                                    }`}
                            >
                                <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                                <span className="text-xs font-semibold text-foreground text-center">
                                    Drag & drop primary image here or <span className="text-primary hover:underline">browse</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-1 text-center">
                                    Supports PNG, JPG, JPEG
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleFileSelect(file)
                                        e.target.value = ''
                                    }}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>

                    {/* Document PDF Upload Column */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-foreground">
                            Document PDF Attachment / Compliance Certificate
                        </label>
                        
                        {documentPreview ? (
                            <div className="border border-border/80 bg-secondary/10 rounded-xl p-4 flex items-center justify-between max-w-[420px] shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="truncate max-w-[220px]">
                                        <span className="text-xs font-semibold text-foreground block truncate">
                                            {documentFile ? documentFile.name : 'Uploaded Document Attachment'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block uppercase">
                                            {documentFile ? `${(documentFile.size / 1024).toFixed(1)} KB` : 'Attached file link'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={typeof documentPreview === 'string' ? documentPreview : URL.createObjectURL(documentPreview)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary cursor-pointer shrink-0"
                                    >
                                        View
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleDocRemove}
                                        className="p-1.5 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg border border-destructive/10 cursor-pointer shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDocumentDrag(true) }}
                                onDragLeave={() => setDocumentDrag(false)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    setDocumentDrag(false)
                                    const file = e.dataTransfer?.files?.[0]
                                    if (file) handleDocSelect(file)
                                }}
                                onClick={() => docInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer min-h-[200px] max-w-[420px] transition-all
                                    ${documentDrag 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-border/80 bg-secondary/5 hover:bg-secondary/15 hover:border-primary/50'
                                    }`}
                            >
                                <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                                <span className="text-xs font-semibold text-foreground text-center">
                                    Drag & drop document attachment here or <span className="text-primary hover:underline">browse</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-1 text-center">
                                    Supports PDF documents and product reports
                                </span>
                                <input
                                    ref={docInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleDocSelect(file)
                                        e.target.value = ''
                                    }}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Gallery Carousel Images */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-foreground">
                            Secondary Gallery Showcase Media Carousel
                        </label>
                        <span className="text-xs text-muted-foreground">Add multiple images showing varying perspectives of this catalog entry.</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {secondaryList.map((item, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-secondary/10">
                                <img
                                    src={item.preview}
                                    alt={`Gallery photo ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeSecondaryImage(idx)}
                                        className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition cursor-pointer"
                                        title="Remove photo"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div
                            onDragOver={(e) => { e.preventDefault(); setSecondaryDrag(true) }}
                            onDragLeave={() => setSecondaryDrag(false)}
                            onDrop={(e) => {
                                e.preventDefault()
                                setSecondaryDrag(false)
                                const files = e.dataTransfer?.files
                                if (files?.length) addSecondaryImages(Array.from(files))
                            }}
                            onClick={() => secondaryInputRef.current?.click()}
                            className={`border-2 border-dashed aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                                ${secondaryDrag 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border/80 bg-secondary/5 hover:bg-secondary/15 hover:border-primary/50'
                                }`}
                        >
                            <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-[10px] font-semibold text-foreground text-center px-1">
                                Add Media
                            </span>
                            <input
                                ref={secondaryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    const files = e.target.files
                                    if (files?.length) addSecondaryImages(Array.from(files))
                                    e.target.value = ''
                                }}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

            </FormSection>

            {/* 7. HYBRID DOCUMENT STORES (JSON FIELDS) */}
            <FormSection title="Hybrid Document Stores (Multi-Tags & JSON Config Map)">
                <div className="space-y-4">
                    <div>
                        <MultiSelect
                            label="Multi-Select Tag Cloud Dropdown"
                            value={formData.multi_select_tags}
                            onChange={handleTagsChange}
                            options={TAG_OPTIONS}
                            placeholder="Add tags..."
                            allowCustomValues
                        />
                    </div>

                    <div className="border border-border rounded-lg p-4 bg-secondary/5">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold">Custom Key-Value Metadata Mapping</span>
                            <button
                                type="button"
                                onClick={addMetadataRow}
                                className="px-2.5 py-1 text-xs bg-secondary border border-border rounded hover:bg-secondary/80 flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Property
                            </button>
                        </div>

                        {metadataList.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No custom metadata parameters added.</p>
                        ) : (
                            <div className="space-y-2">
                                {metadataList.map((row, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={row.key}
                                            onChange={(e) => handleMetadataChange(idx, 'key', e.target.value)}
                                            placeholder="Parameter Key (e.g. shelf_life)"
                                            className="w-1/2 px-3 py-1.5 rounded border border-border bg-background text-sm focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={row.value}
                                            onChange={(e) => handleMetadataChange(idx, 'value', e.target.value)}
                                            placeholder="Parameter Value (e.g. 12 months)"
                                            className="w-1/2 px-3 py-1.5 rounded border border-border bg-background text-sm focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeMetadataRow(idx)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded cursor-pointer transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </FormSection>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition cursor-pointer"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                >
                    {record ? 'Update Record' : 'Save Record'}
                </button>
            </div>

        </form>
    )
}
