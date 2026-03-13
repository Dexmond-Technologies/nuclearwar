"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersistentCache = getPersistentCache;
exports.setPersistentCache = setPersistentCache;
exports.deletePersistentCache = deletePersistentCache;
exports.cacheAgeMs = cacheAgeMs;
exports.describeFreshness = describeFreshness;
const runtime_1 = require("./runtime");
const tauri_bridge_1 = require("./tauri-bridge");
const utils_1 = require("@/utils");
const CACHE_PREFIX = 'worldmonitor-persistent-cache:';
const CACHE_DB_NAME = 'worldmonitor_persistent_cache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE = 'entries';
let cacheDbPromise = null;
function isIndexedDbAvailable() {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}
function getCacheDb() {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB unavailable'));
    }
    if (cacheDbPromise)
        return cacheDbPromise;
    cacheDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
        request.onerror = () => reject(request.error ?? new Error('Failed to open cache IndexedDB'));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE)) {
                db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            db.onclose = () => { cacheDbPromise = null; };
            resolve(db);
        };
    });
    return cacheDbPromise;
}
async function getFromIndexedDb(key) {
    const db = await getCacheDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readonly');
        const store = tx.objectStore(CACHE_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
}
async function setInIndexedDb(payload) {
    const db = await getCacheDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(CACHE_STORE).put(payload);
    });
}
async function getPersistentCache(key) {
    if ((0, runtime_1.isDesktopRuntime)()) {
        try {
            const value = await (0, tauri_bridge_1.invokeTauri)('read_cache_entry', { key });
            return value ?? null;
        }
        catch (error) {
            console.warn('[persistent-cache] Desktop read failed; falling back to browser storage', error);
        }
    }
    if (isIndexedDbAvailable()) {
        try {
            return await getFromIndexedDb(key);
        }
        catch (error) {
            console.warn('[persistent-cache] IndexedDB read failed; falling back to localStorage', error);
            cacheDbPromise = null;
        }
    }
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
async function setPersistentCache(key, data) {
    const payload = { key, data, updatedAt: Date.now() };
    if ((0, runtime_1.isDesktopRuntime)()) {
        try {
            await (0, tauri_bridge_1.invokeTauri)('write_cache_entry', { key, value: JSON.stringify(payload) });
            return;
        }
        catch (error) {
            console.warn('[persistent-cache] Desktop write failed; falling back to browser storage', error);
        }
    }
    if (isIndexedDbAvailable() && !(0, utils_1.isStorageQuotaExceeded)()) {
        try {
            await setInIndexedDb(payload);
            return;
        }
        catch (error) {
            if ((0, utils_1.isQuotaError)(error))
                (0, utils_1.markStorageQuotaExceeded)();
            else
                console.warn('[persistent-cache] IndexedDB write failed; falling back to localStorage', error);
            cacheDbPromise = null;
        }
    }
    if ((0, utils_1.isStorageQuotaExceeded)())
        return;
    try {
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
    }
    catch (error) {
        if ((0, utils_1.isQuotaError)(error))
            (0, utils_1.markStorageQuotaExceeded)();
    }
}
async function deletePersistentCache(key) {
    if ((0, runtime_1.isDesktopRuntime)()) {
        try {
            await (0, tauri_bridge_1.invokeTauri)('delete_cache_entry', { key });
            return;
        }
        catch {
            // Fall through to browser storage
        }
    }
    if (isIndexedDbAvailable()) {
        try {
            const db = await getCacheDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(CACHE_STORE, 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.objectStore(CACHE_STORE).delete(key);
            });
            return;
        }
        catch (error) {
            console.warn('[persistent-cache] IndexedDB delete failed; falling back to localStorage', error);
            cacheDbPromise = null;
        }
    }
    if ((0, utils_1.isStorageQuotaExceeded)())
        return;
    try {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    }
    catch {
        // Ignore
    }
}
function cacheAgeMs(updatedAt) {
    return Math.max(0, Date.now() - updatedAt);
}
function describeFreshness(updatedAt) {
    const age = cacheAgeMs(updatedAt);
    const mins = Math.floor(age / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
