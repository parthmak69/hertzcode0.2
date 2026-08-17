/**
 * Admin API client for the admin panel.
 * All API requests go to the internal Next.js routes at /api/...
 * No external backend server is required.
 */
import { cacheResponse, getCachedResponse, addToSyncQueue } from './offlineDB';


/**
 * API base path — always relative so it works in dev and production.
 */
export const API_BASE_URL = '/api'

/**
 * Base URL for viewing uploaded files stored in /public/uploads.
 */
export const UPLOADS_BASE_URL = ''

/**
 * Full URL for a document/image path returned by API (e.g. uploads/products/image.jpg).
 * Handles both relative paths and absolute URLs.
 */
export function getImageUrl(path) {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `/${path.replace(/^\/+/, '')}`
}

export const AUTH_STORAGE_KEYS = {
    ACCESS_TOKEN: 'admin_access_token',
    REFRESH_TOKEN: 'admin_refresh_token',
    USER: 'admin_user',
}

// ─── Auth helpers ─────────────────────────────────────────────────────

function getStorage() {
    if (typeof window === 'undefined') return null
    if (localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)) return localStorage
    return null
}

/** Get stored access token */
export function getAccessToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) ||
        sessionStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
}

/** Get stored refresh token */
export function getRefreshToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN) ||
        sessionStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
}

/** Get stored user object */
export function getUser() {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER) ||
            sessionStorage.getItem(AUTH_STORAGE_KEYS.USER)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

/**
 * Save tokens + user after successful login.
 * @param {object} data - { accessToken, refreshToken, user }
 * @param {boolean} rememberMe - if true, persistent; if false, session-only
 */
export function saveAuth({ accessToken, refreshToken, user }, rememberMe = true) {
    if (typeof window === 'undefined') return
    // Clear any stale auth from either storage
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    // Store in localStorage so it's shared across all tabs
    if (accessToken) localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    if (user) localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user))
    localStorage.setItem('admin_remember_me', rememberMe ? '1' : '0')
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:login'))
    }
}

/** Clear all auth data and notify AuthGuard */
export function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    localStorage.removeItem('admin_remember_me')
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    // Clear session via internal Next.js route
    fetch(`${API_BASE_URL}/auth/clear-refresh-cookie`, {
        method: 'POST',
    }).catch(() => { })
    window.dispatchEvent(new Event('auth:logout'))
}

// ─── Token refresh ────────────────────────────────────────────────────

let refreshPromise = null // prevents multiple concurrent refresh calls

async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
        try {
            const token = getAccessToken()
            const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            })

            const json = await res.json().catch(() => ({}))

            if (res.ok && json.success && json.data?.accessToken) {
                const storage = getStorage()
                if (storage) storage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, json.data.accessToken)
                return json.data.accessToken
            }

            return null
        } catch {
            return null
        } finally {
            refreshPromise = null
        }
    })()

    return refreshPromise
}

// ─── Core request function ────────────────────────────────────────────

/**
 * Central fetch wrapper used by the apiClient methods.
 * - Automatically attaches Authorization: Bearer <token>
 * - On 401, tries to refresh the token once and retries
 * - On refresh failure, clears auth
 *
 * @param {string}  endpoint  – path after API_BASE_URL, e.g. '/admin/products'
 * @param {object}  options   – fetch options (method, body, headers, etc.)
 * @param {boolean} _retry    – internal flag to prevent infinite retry loops
 * @returns {Promise<object>} – parsed JSON response
 */
async function request(endpoint, options = {}, _retry = false) {
    const token = getAccessToken()

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    // If body is FormData (file uploads), let browser set Content-Type
    if (options.body instanceof FormData) {
        delete headers['Content-Type']
    }

    let res;
    let json = {};

    try {
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // ── Handle 401 Unauthorized ─────────────────────────────────────
        if (res.status === 401 && !_retry) {
            const newToken = await refreshAccessToken()
            if (newToken) {
                return request(endpoint, options, true)
            }
            clearAuth()
            return { success: false, message: 'Session expired. Please login again.' }
        }

        // Parse response
        json = await res.json().catch(() => ({}))
        
        /* 
        // COMMENTED OUT FOR NOW: Cache successful GET requests
        if (res.ok && (!options.method || options.method === 'GET')) {
            await cacheResponse(endpoint, json);
        }
        */
        
    } catch (err) {
        // Return standard failure response instead of falling back to offline IndexedDB
        console.error(`[API] Connection error fetching ${endpoint}:`, err);
        return { 
            success: false, 
            message: 'Network connection error. Please check your internet connection and try again.',
            data: [] 
        };

        /*
        // COMMENTED OUT FOR NOW: Network error (offline) fallback to IndexedDB and SyncQueue
        console.warn(`[API] Network error fetching ${endpoint}. Falling back to offline mode.`, err);
        
        const method = options.method || 'GET';
        
        if (method === 'GET') {
            // Serve from cache
            const cached = await getCachedResponse(endpoint);
            if (cached) {
                console.log(`[API] Returning cached data for ${endpoint}`);
                return cached.data;
            } else {
                return { success: false, message: 'You are offline and no cached data is available.', data: [] };
            }
        } else {
            // Queue mutation for later
            console.log(`[API] Queuing ${method} request for ${endpoint}`);
            // Note: FormData cannot be directly serialized to IDB without conversion.
            // Assuming JSON payload for this basic implementation.
            await addToSyncQueue(method, endpoint, options.body, headers);
            
            // Return optimistic success
            return { 
                success: true, 
                message: 'You are offline. Action saved locally and will sync when internet is restored.',
                data: {} // Return empty data or mock data to avoid breaking UI
            };
        }
        */
    }

    // Centralized Storage Bar Refresh Trigger:
    // When any data-modifying request (POST, PUT, PATCH, DELETE) succeeds,
    // dispatch the 'storage-updated' event to refresh the storage progress bar immediately in real-time.
    if (res.ok && json.success && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage-updated'))
        }
    }

    return json
}

// ─── Public apiClient ─────────────────────────────────────────────────

/**
 * Shared API client for the entire admin app.
 * All requests go to internal Next.js API routes.
 *
 * Usage:
 *   import { apiClient } from '@/utils/api'
 *
 *   const res = await apiClient.get('/admin/products')
 *   const res = await apiClient.post('/admin/products', { name: 'Shirt' })
 *   const res = await apiClient.put('/admin/products/5', { name: 'Updated' })
 *   const res = await apiClient.delete('/admin/products/5')
 *
 * Every method returns the parsed JSON: { success, message, data }
 */
export const apiClient = {
    get(endpoint) {
        return request(endpoint, { method: 'GET' })
    },

    post(endpoint, body) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    },

    put(endpoint, body) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    },

    patch(endpoint, body) {
        return request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        })
    },

    delete(endpoint) {
        return request(endpoint, { method: 'DELETE' })
    },

    /** For file uploads — pass a FormData instance as body */
    upload(endpoint, formData, method = 'POST') {
        return request(endpoint, {
            method,
            body: formData,
        })
    },
}
