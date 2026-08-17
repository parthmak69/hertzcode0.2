import * as XLSX from 'xlsx'

/**
 * Export data to Excel (.xlsx) file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions with key and label
 * @param {string} filename - Name of the file (without extension)
 * @param {Function} getCellValue - Optional function to get cell value (item, key) => value
 */
export function exportToExcel(data, columns, filename = 'export', getCellValue = null) {
    if (!data || data.length === 0) {
        alert('No data to export')
        return
    }

    // Map rows to Excel-friendly headers
    const wsData = data.map(item => {
        const row = {}
        columns.forEach(col => {
            let value = getCellValue ? getCellValue(item, col.key) : item[col.key]

            // Handle special formatting
            if (value === null || value === undefined) {
                value = ''
            } else if (typeof value === 'object') {
                value = JSON.stringify(value)
            }

            row[col.label] = value
        })
        return row
    })

    const worksheet = XLSX.utils.json_to_sheet(wsData, {
        header: columns.map(col => col.label)
    })

    // Set column widths dynamically to prevent clipping
    const maxLens = columns.map(col => {
        const headerLen = col.label.length
        let maxValLen = 0
        wsData.forEach(row => {
            const val = String(row[col.label] || '')
            if (val.length > maxValLen) maxValLen = val.length
        })
        return { wch: Math.max(headerLen, maxValLen) + 3 }
    })
    worksheet['!cols'] = maxLens

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exported Data')

    // Generate date prefix
    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`)
}

/**
 * Generate and download a sample Excel template for bulk import
 * @param {string} type - Either 'admins' or 'master-form'
 */
export function downloadTemplate(type) {
    let wsData = []
    let filename = ''
    let headers = []

    if (type === 'admins') {
        headers = ['Full Name', 'Email', 'Phone', 'Password']
        wsData = [
            {
                'Full Name': 'John Doe',
                'Email': 'john.doe@example.com',
                'Phone': '9876543210',
                'Password': 'SecurePassword123'
            },
            {
                'Full Name': 'Jane Smith',
                'Email': 'jane.smith@example.com',
                'Phone': '9988776655',
                'Password': 'AnotherPassword456'
            }
        ]
        filename = 'admins_import_template'
    } else if (type === 'master-form') {
        headers = [
            'Record Name',
            'URL Slug',
            'Email',
            'Password',
            'Website URL',
            'Phone',
            'Qty / Stock',
            'Price (₹)',
            'Tax Percentage',
            'Range Slider Value',
            'Short Notes',
            'Rich Text Content',
            'Radio Selection',
            'Checkbox Toggle',
            'Active Toggle',
            'Date',
            'Time',
            'Tags'
        ]
        wsData = [
            {
                'Record Name': 'Sample Premium Product',
                'URL Slug': 'sample-premium-product',
                'Email': 'product@example.com',
                'Password': 'productpassword',
                'Website URL': 'https://example.com',
                'Phone': '9876543210',
                'Qty / Stock': 150,
                'Price (₹)': 499.99,
                'Tax Percentage': 18.0,
                'Range Slider Value': 75,
                'Short Notes': 'Quick notes about the product.',
                'Rich Text Content': '<p>Detailed description in HTML format.</p>',
                'Radio Selection': 'credit_card', // credit_card, cod_allowed, online_only, secured_portals
                'Checkbox Toggle': 'Yes', // Yes / No
                'Active Toggle': 'Yes', // Yes / No
                'Date': '2026-06-25', // YYYY-MM-DD
                'Time': '14:30:00', // HH:MM:SS
                'Tags': 'organic, staples' // comma-separated values
            }
        ]
        filename = 'master_form_import_template'
    } else {
        alert('Invalid template type')
        return
    }

    const worksheet = XLSX.utils.json_to_sheet(wsData, { header: headers })

    // Auto-fit columns
    const maxLens = headers.map(header => {
        const headerLen = header.length
        let maxValLen = 0
        wsData.forEach(row => {
            const val = String(row[header] || '')
            if (val.length > maxValLen) maxValLen = val.length
        })
        return { wch: Math.max(headerLen, maxValLen) + 4 }
    })
    worksheet['!cols'] = maxLens

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
}
