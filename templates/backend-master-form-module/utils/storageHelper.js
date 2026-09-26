const fs = require('fs/promises')
const path = require('path')
const { dbQuery } = require('../config/db')

async function getDirectorySize(dirPath) {
    let totalSize = 0
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isDirectory()) {
                totalSize += await getDirectorySize(fullPath)
            } else if (entry.isFile()) {
                const stats = await fs.stat(fullPath)
                totalSize += stats.size
            }
        }
    } catch (err) {
        // If directory doesn't exist or is inaccessible, assume 0 bytes
        if (err.code !== 'ENOENT') {
            console.error('[Storage Helper Error] Readdir failed:', err)
        }
    }
    return totalSize
}

async function getDatabaseSize() {
    try {
        const sql = `
            SELECT COALESCE(SUM(data_length + index_length), 0) AS size_bytes 
            FROM information_schema.TABLES 
            WHERE table_schema = DATABASE()
        `
        const rows = await dbQuery(sql)
        return parseInt(rows[0]?.size_bytes || 0)
    } catch (err) {
        console.error('[Storage Helper Error] Database size query failed:', err)
        return 0
    }
}

async function getStorageLimit() {
    try {
        const sql = 'SELECT `setting_value` FROM `settings` WHERE `setting_key` = ? LIMIT 1'
        const rows = await dbQuery(sql, ['storage_limit_mb'])
        if (rows[0]?.setting_value) {
            return parseFloat(rows[0].setting_value)
        }
    } catch (err) {
        console.error('[Storage Helper Error] Failed to retrieve limit from settings table:', err)
    }
    return 50.0 // Fallback to 50 MB default
}

async function getStorageStatus() {
    const uploadsDir = process.env.MEDIA || path.join(__dirname, '..', 'uploads')
    const filesBytes = await getDirectorySize(uploadsDir)
    const dbBytes = await getDatabaseSize()
    const limitMb = await getStorageLimit()

    const totalUsedBytes = filesBytes + dbBytes
    const limitBytes = limitMb * 1024 * 1024

    const usedMb = totalUsedBytes / (1024 * 1024)
    const filesMb = filesBytes / (1024 * 1024)
    const dbMb = dbBytes / (1024 * 1024)

    const usagePercentage = limitBytes > 0 ? (totalUsedBytes / limitBytes) * 100 : 0
    const isExceeded = totalUsedBytes > limitBytes

    return {
        usedBytes: totalUsedBytes,
        limitBytes,
        usedMb: parseFloat(usedMb.toFixed(3)),
        filesMb: parseFloat(filesMb.toFixed(3)),
        dbMb: parseFloat(dbMb.toFixed(3)),
        limitMb,
        usagePercentage: parseFloat(usagePercentage.toFixed(2)),
        isExceeded
    }
}

async function deletePhysicalFile(relativeUrl) {
    if (!relativeUrl || typeof relativeUrl !== 'string') return
    try {
        const uploadsDir = process.env.MEDIA || path.join(__dirname, '..', 'uploads')
        // Normalize the path by removing leading slashes and resolving it inside uploads directory
        const filename = relativeUrl.replace(/^(\/)?uploads\//, '')
        const filePath = path.join(uploadsDir, filename)
        
        // Safety constraint to prevent directory traversal attacks
        const resolvedPath = path.resolve(filePath)
        const resolvedUploadsDir = path.resolve(uploadsDir)
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            console.warn('[Storage Security Warning] Blocked attempt to delete file outside uploads directory:', resolvedPath)
            return
        }
        
        await fs.unlink(resolvedPath)
        console.log(`[Storage Helper] Successfully deleted physical file: ${resolvedPath}`)
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('[Storage Helper Error] Failed to delete file:', err)
        }
    }
}

module.exports = {
    getStorageStatus,
    deletePhysicalFile
}
