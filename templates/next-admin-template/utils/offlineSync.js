import { db } from './offlineDB';
import { API_BASE_URL, getAccessToken } from './api';

let isSyncing = false;

/**
 * Processes the offline sync queue by sending pending requests to the backend.
 */
export async function processSyncQueue() {
    if (isSyncing || typeof window === 'undefined' || !navigator.onLine) {
        return;
    }

    isSyncing = true;
    console.log('[OfflineSync] Starting sync process...');

    try {
        const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();

        if (pendingItems.length === 0) {
            console.log('[OfflineSync] Queue is empty.');
            isSyncing = false;
            return;
        }

        console.log(`[OfflineSync] Found ${pendingItems.length} items to sync.`);

        for (const item of pendingItems) {
            try {
                // Ensure auth token is fresh
                const token = getAccessToken();
                const headers = { ...item.headers };
                
                if (token && !headers['Authorization']) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // If body was stored as a string (FormData cannot be stored directly in IDB easily, 
                // but since we are sending JSON for mutations, this works).
                const options = {
                    method: item.method,
                    headers,
                };
                
                if (item.body) {
                    options.body = item.body;
                }

                const response = await fetch(`${API_BASE_URL}${item.endpoint}`, options);

                if (response.ok) {
                    // Success! Remove from queue
                    await db.syncQueue.delete(item.id);
                    console.log(`[OfflineSync] Successfully synced item ${item.id}`);
                } else {
                    // Backend rejected it (e.g. 400 Bad Request)
                    console.error(`[OfflineSync] Failed to sync item ${item.id}. Status: ${response.status}`);
                    await db.syncQueue.update(item.id, { status: 'failed' });
                }
            } catch (err) {
                // Network error during sync, stop processing and retry later
                console.error(`[OfflineSync] Network error while syncing item ${item.id}:`, err);
                break;
            }
        }
        
        // Dispatch event so UI can refresh data now that sync is done
        window.dispatchEvent(new Event('offline-sync-complete'));

    } catch (err) {
        console.error('[OfflineSync] Error reading from sync queue:', err);
    } finally {
        isSyncing = false;
    }
}
