'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/utils/api'

/**
 * Reusable hook for admin CRUD pages.
 * Handles server-side pagination, sorting, debounced search, and CRUD ops.
 *
 * @param {object}  config
 * @param {string}  config.endpoint       – base API path, e.g. '/products'
 * @param {string}  [config.fetchEndpoint] – override GET list path (e.g. '/customers/admin')
 * @param {object}  [config.defaultSort]  – { key, direction }
 * @param {number}  [config.debounceMs]   – debounce delay for search (default 400)
 */
export default function useAdminCrud({
    endpoint,
    fetchEndpoint,
    defaultSort = { key: null, direction: null },
    debounceMs = 400,
}) {
    const listEndpoint = fetchEndpoint || endpoint

    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [sortConfig, setSortConfig] = useState(defaultSort)
    const [filters, setFilters] = useState({})
    const [searchTerm, setSearchTerm] = useState('')

    const debounceTimer = useRef(null)
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // ── Fetch data ──────────────────────────────────────────────────────
    const fetchData = useCallback(async (overrides = {}) => {
        console.log('[useAdminCrud] fetchData called. overrides:', overrides, 'silent:', overrides.silent);
        if (!overrides.silent) {
            console.log('[useAdminCrud] setLoading(true) is being executed.');
            setLoading(true)
        }
        try {
            const page = overrides.page ?? currentPage
            const limit = overrides.limit ?? itemsPerPage
            const sort = overrides.sortConfig ?? sortConfig
            const search = overrides.searchTerm ?? searchTerm

            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', String(limit))

            if (sort.key) {
                params.set('sort_by', sort.key)
                params.set('sort_order', sort.direction || 'asc')
            }

            if (search) {
                params.set('search', search)
            }

            const url = listEndpoint.includes('?')
                ? `${listEndpoint}&${params.toString()}`
                : `${listEndpoint}?${params.toString()}`
            const res = await apiClient.get(url)

            if (!isMounted.current) return

            if (res.success) {
                setData(res.data || [])
                const p = res.meta?.pagination
                if (p) {
                    setTotalItems(p.totalItems || 0)
                    setTotalPages(p.totalPages || 0)
                }
            } else {
                console.error(`[useAdminCrud] GET ${url} failed:`, res.message || res)
                setData([])
                setTotalItems(0)
                setTotalPages(0)
            }
        } catch (err) {
            console.error(`[useAdminCrud] fetch error:`, err)
            if (isMounted.current) {
                setData([])
                setTotalItems(0)
                setTotalPages(0)
            }
        } finally {
            if (isMounted.current) {
                console.log('[useAdminCrud] setLoading(false) is being executed.');
                setLoading(false);
            }
        }
    }, [listEndpoint, currentPage, itemsPerPage, sortConfig, searchTerm])

    const prevDeps = useRef([]);
    useEffect(() => {
        const deps = [listEndpoint, currentPage, itemsPerPage, sortConfig, searchTerm];
        const names = ['listEndpoint', 'currentPage', 'itemsPerPage', 'sortConfig', 'searchTerm'];
        const changed = deps.map((dep, idx) => dep !== prevDeps.current[idx]);
        if (changed.some(Boolean) && prevDeps.current.length > 0) {
            console.log('[useAdminCrud] fetchData dependencies changed:', 
                names.filter((_, i) => changed[i]).join(', ')
            );
        }
        prevDeps.current = deps;
    });

    useEffect(() => {
        console.log('[useAdminCrud] useEffect triggered because fetchData dependency reference changed');
        fetchData()
    }, [fetchData])

    // Subscribe to real-time Socket.io db-change events
    useEffect(() => {
        const mapEndpointToTable = (ep) => {
            const clean = ep.toLowerCase().replace(/^\/admin\//, '').replace(/^\//, '')
            if (clean.includes('admins')) return 'admins'
            if (clean.includes('settings')) return 'settings'
            if (clean.includes('portfolio-categories')) return 'portfolio_categories'
            if (clean.includes('portfolio')) return 'portfolio_cards'
            if (clean.includes('master-form')) return 'master_form_inputs'
            return clean
        }

        const handleDbChange = (e) => {
            const { table } = e.detail || {}
            if (!table) return

            const targetTable = mapEndpointToTable(endpoint)
            if (table.toLowerCase() === targetTable) {
                console.log(`[useAdminCrud] Real-time socket sync: table "${table}" changed. Refetching endpoint "${endpoint}"...`)
                fetchData({ silent: true })
            }
        }

        window.addEventListener('db-change', handleDbChange)
        return () => window.removeEventListener('db-change', handleDbChange)
    }, [endpoint, fetchData])

    // ── Filter → debounced search ───────────────────────────────────────
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters)
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            const search = Object.values(newFilters).filter(Boolean).join(' ').trim()
            setSearchTerm(search)
            setCurrentPage(1)
        }, debounceMs)
    }, [debounceMs])

    // ── Sort ────────────────────────────────────────────────────────────
    const handleSortChange = useCallback((newSort) => {
        setSortConfig(newSort)
        setCurrentPage(1)
    }, [])

    // ── Pagination ──────────────────────────────────────────────────────
    const handlePageChange = useCallback((page) => setCurrentPage(page), [])

    const handleItemsPerPageChange = useCallback((perPage) => {
        setItemsPerPage(perPage)
        setCurrentPage(1)
    }, [])

    // ── CRUD operations ─────────────────────────────────────────────────
    const create = async (body, useUpload = false) => {
        const res = useUpload
            ? await apiClient.upload(endpoint, body)
            : await apiClient.post(endpoint, body)
        if (res.success) await fetchData()
        return res
    }

    const update = async (id, body, useUpload = false) => {
        const res = useUpload
            ? await apiClient.upload(`${endpoint}/${id}`, body, 'PUT')
            : await apiClient.put(`${endpoint}/${id}`, body)
        console.log('[useAdminCrud] update successful. Calling fetchData({ silent: true })');
        if (res.success) await fetchData({ silent: true })
        return res
    }

    const remove = async (id) => {
        const res = await apiClient.delete(`${endpoint}/${id}`)
        if (res.success) await fetchData()
        return res
    }

    const removeBulk = async (ids) => {
        const res = await apiClient.post(`${endpoint}/bulk-delete`, { ids })
        if (res.success) await fetchData()
        return res
    }

    const toggleStatus = async (id, customEndpoint) => {
        const ep = customEndpoint || `${endpoint}/${id}/status`
        const res = await apiClient.patch(ep)
        if (res.success) await fetchData({ silent: true })
        return res
    }

    const getById = async (id) => {
        const res = await apiClient.get(`${endpoint}/${id}`)
        return res.success ? res.data : null
    }

    const patchItem = async (id, body) => {
        const res = await apiClient.patch(`${endpoint}/${id}`, body)
        if (res.success) await fetchData({ silent: true })
        return res
    }

    // ── Computed ─────────────────────────────────────────────────────────
    const startIndex = (currentPage - 1) * itemsPerPage

    return {
        data,
        loading,
        totalItems,
        totalPages,
        currentPage,
        itemsPerPage,
        sortConfig,
        filters,
        startIndex,
        setCurrentPage: handlePageChange,
        setItemsPerPage: handleItemsPerPageChange,
        setSortConfig: handleSortChange,
        setFilters: handleFilterChange,
        create,
        update,
        remove,
        removeBulk,
        toggleStatus,
        patchItem,
        getById,
        refetch: fetchData,
    }
}
