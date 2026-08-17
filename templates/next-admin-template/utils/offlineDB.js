import Dexie from 'dexie';

export const db = new Dexie('AdminPanelOfflineDB');

db.version(1).stores({
    apiCache: 'endpoint, data, timestamp',
    syncQueue: '++id, method, endpoint, body, headers, timestamp, status' // status: 'pending', 'failed'
});

/**
 * Saves a GET request response to the cache.
 */
export async function cacheResponse(endpoint, data) {
    try {
        await db.apiCache.put({
            endpoint,
            data,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('Failed to cache response:', err);
    }
}

/**
 * Retrieves a GET request response from the cache.
 */
export async function getCachedResponse(endpoint) {
    try {
        return await db.apiCache.get(endpoint);
    } catch (err) {
        console.error('Failed to get cached response:', err);
        return null;
    }
}

/**
 * Adds a failed/offline mutation to the sync queue.
 */
export async function addToSyncQueue(method, endpoint, body, headers) {
    try {
        const id = await db.syncQueue.add({
            method,
            endpoint,
            body,
            headers,
            timestamp: Date.now(),
            status: 'pending'
        });
        return id;
    } catch (err) {
        console.error('Failed to add to sync queue:', err);
        return null;
    }
}
