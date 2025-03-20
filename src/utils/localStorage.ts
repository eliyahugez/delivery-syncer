
// Local storage keys
export const STORAGE_KEYS = {
  AUTH_USER: 'delivery_auth_user',
  DELIVERIES_CACHE: 'delivery_cache',
  LAST_SYNC: 'last_sync_time',
  DELIVERY_HISTORY: 'delivery_history',
  DETECTED_COLUMNS: 'detected_columns',
  USER_PREFERENCES: 'user_preferences',
  OFFLINE_CHANGES: 'offline_changes',
  COURIER_STATS: 'courier_stats',
  STATUS_OPTIONS: 'status_options'
};

// For backward compatibility
export const storageKeys = STORAGE_KEYS;

/**
 * Save data to local storage
 * @param key Storage key
 * @param data Data to store
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(key, jsonData);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get data from local storage
 * @param key Storage key
 * @param defaultValue Default value if not found
 * @returns The stored data or defaultValue if not found
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      return defaultValue;
    }
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remove data from local storage
 * @param key Storage key
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}
