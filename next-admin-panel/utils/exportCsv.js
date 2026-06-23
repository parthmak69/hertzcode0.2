/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions with key and label
 * @param {string} filename - Name of the file (without extension)
 * @param {Function} getCellValue - Optional function to get cell value (item, key) => value
 */
export function exportToCsv(data, columns, filename = 'export', getCellValue = null) {
    if (!data || data.length === 0) {
        alert('No data to export')
        return
    }

    // Build header row
    const headers = columns.map(col => `"${col.label}"`)

    // Build data rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = getCellValue ? getCellValue(item, col.key) : item[col.key]

            // Handle special cases
            if (value === null || value === undefined) value = ''
            if (typeof value === 'object') value = JSON.stringify(value)

            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""')
            return `"${value}"`
        }).join(',')
    })

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n')

    // Create blob and download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
