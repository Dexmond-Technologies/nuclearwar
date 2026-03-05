"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
exports.getCircuitBreakerStatus = getCircuitBreakerStatus;
exports.isCircuitBreakerOnCooldown = isCircuitBreakerOnCooldown;
exports.getCircuitBreakerCooldownInfo = getCircuitBreakerCooldownInfo;
exports.removeCircuitBreaker = removeCircuitBreaker;
exports.clearAllCircuitBreakers = clearAllCircuitBreakers;
const DEFAULT_MAX_FAILURES = 2;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PERSISTENT_STALE_CEILING_MS = 24 * 60 * 60 * 1000; // 24h — discard persistent entries older than this
function isDesktopOfflineMode() {
    if (typeof window === 'undefined')
        return false;
    const hasTauri = Boolean(window.__TAURI__);
    return hasTauri && typeof navigator !== 'undefined' && navigator.onLine === false;
}
class CircuitBreaker {
    constructor(options) {
        this.state = { failures: 0, cooldownUntil: 0 };
        this.cache = null;
        this.persistentLoaded = false;
        this.persistentLoadPromise = null;
        this.lastDataState = { mode: 'unavailable', timestamp: null, offline: false };
        this.name = options.name;
        this.maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
        this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
        this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
        this.persistEnabled = this.cacheTtlMs === 0
            ? false
            : (options.persistCache ?? false);
    }
    get persistKey() {
        return `breaker:${this.name}`;
    }
    /** Hydrate in-memory cache from persistent storage on first call. */
    hydratePersistentCache() {
        if (this.persistentLoaded)
            return Promise.resolve();
        if (this.persistentLoadPromise)
            return this.persistentLoadPromise;
        this.persistentLoadPromise = (async () => {
            try {
                const { getPersistentCache } = await Promise.resolve().then(() => __importStar(require('../services/persistent-cache')));
                const entry = await getPersistentCache(this.persistKey);
                if (entry == null || entry.data === undefined || entry.data === null)
                    return;
                const age = Date.now() - entry.updatedAt;
                if (age > PERSISTENT_STALE_CEILING_MS)
                    return;
                // Only hydrate if in-memory cache is empty (don't overwrite live data)
                if (this.cache === null) {
                    this.cache = { data: entry.data, timestamp: entry.updatedAt };
                    const withinTtl = (Date.now() - entry.updatedAt) < this.cacheTtlMs;
                    this.lastDataState = {
                        mode: withinTtl ? 'cached' : 'unavailable',
                        timestamp: entry.updatedAt,
                        offline: false,
                    };
                }
            }
            catch (err) {
                console.warn(`[${this.name}] Persistent cache hydration failed:`, err);
            }
            finally {
                this.persistentLoaded = true;
                this.persistentLoadPromise = null;
            }
        })();
        return this.persistentLoadPromise;
    }
    /** Fire-and-forget write to persistent storage. */
    writePersistentCache(data) {
        Promise.resolve().then(() => __importStar(require('../services/persistent-cache'))).then(({ setPersistentCache }) => {
            setPersistentCache(this.persistKey, data).catch(() => { });
        }).catch(() => { });
    }
    /** Fire-and-forget delete from persistent storage. */
    deletePersistentCache() {
        Promise.resolve().then(() => __importStar(require('../services/persistent-cache'))).then(({ deletePersistentCache }) => {
            deletePersistentCache(this.persistKey).catch(() => { });
        }).catch(() => { });
    }
    isOnCooldown() {
        if (Date.now() < this.state.cooldownUntil) {
            return true;
        }
        if (this.state.cooldownUntil > 0) {
            this.state = { failures: 0, cooldownUntil: 0 };
        }
        return false;
    }
    getCooldownRemaining() {
        return Math.max(0, Math.ceil((this.state.cooldownUntil - Date.now()) / 1000));
    }
    getStatus() {
        if (this.lastDataState.offline) {
            return this.lastDataState.mode === 'cached'
                ? 'offline mode (serving cached data)'
                : 'offline mode (live API unavailable)';
        }
        if (this.isOnCooldown()) {
            return `temporarily unavailable (retry in ${this.getCooldownRemaining()}s)`;
        }
        return 'ok';
    }
    getDataState() {
        return { ...this.lastDataState };
    }
    getCached() {
        if (this.cache && Date.now() - this.cache.timestamp < this.cacheTtlMs) {
            return this.cache.data;
        }
        return null;
    }
    getCachedOrDefault(defaultValue) {
        return this.cache?.data ?? defaultValue;
    }
    recordSuccess(data) {
        this.state = { failures: 0, cooldownUntil: 0 };
        this.cache = { data, timestamp: Date.now() };
        this.lastDataState = { mode: 'live', timestamp: Date.now(), offline: false };
        if (this.persistEnabled) {
            this.writePersistentCache(data);
        }
    }
    clearCache() {
        this.cache = null;
        this.persistentLoadPromise = null; // orphan any in-flight hydration
        if (this.persistEnabled) {
            this.deletePersistentCache();
        }
    }
    recordFailure(error) {
        this.state.failures++;
        this.state.lastError = error;
        if (this.state.failures >= this.maxFailures) {
            this.state.cooldownUntil = Date.now() + this.cooldownMs;
            console.warn(`[${this.name}] On cooldown for ${this.cooldownMs / 1000}s after ${this.state.failures} failures`);
        }
    }
    async execute(fn, defaultValue) {
        const offline = isDesktopOfflineMode();
        // Hydrate from persistent storage on first call (~1-5ms IndexedDB read)
        if (this.persistEnabled && !this.persistentLoaded) {
            await this.hydratePersistentCache();
        }
        if (this.isOnCooldown()) {
            console.log(`[${this.name}] Currently unavailable, ${this.getCooldownRemaining()}s remaining`);
            const cachedFallback = this.getCached();
            if (cachedFallback !== null) {
                this.lastDataState = { mode: 'cached', timestamp: this.cache?.timestamp ?? null, offline };
                return cachedFallback;
            }
            this.lastDataState = { mode: 'unavailable', timestamp: null, offline };
            return this.getCachedOrDefault(defaultValue);
        }
        const cached = this.getCached();
        if (cached !== null) {
            this.lastDataState = { mode: 'cached', timestamp: this.cache?.timestamp ?? null, offline };
            return cached;
        }
        // Stale-while-revalidate: if we have stale cached data (outside TTL but
        // within the 24h persistent ceiling), return it instantly and refresh in
        // the background. This prevents "Loading..." on every page reload when
        // the persistent cache is older than the TTL.
        // Skip SWR when cacheTtlMs === 0 (caching disabled) — the breaker may be
        // shared across calls with different request params (e.g. stocks vs commodities),
        // so returning stale data from a different call is wrong.
        if (this.cache !== null && this.cacheTtlMs > 0) {
            this.lastDataState = { mode: 'cached', timestamp: this.cache.timestamp, offline };
            // Fire-and-forget background refresh
            fn().then(result => this.recordSuccess(result)).catch(e => {
                console.warn(`[${this.name}] Background refresh failed:`, e);
                this.recordFailure(String(e));
            });
            return this.cache.data;
        }
        try {
            const result = await fn();
            this.recordSuccess(result);
            return result;
        }
        catch (e) {
            const msg = String(e);
            console.error(`[${this.name}] Failed:`, msg);
            this.recordFailure(msg);
            this.lastDataState = { mode: 'unavailable', timestamp: null, offline };
            return defaultValue;
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
// Registry of circuit breakers for global status
const breakers = new Map();
function createCircuitBreaker(options) {
    const breaker = new CircuitBreaker(options);
    breakers.set(options.name, breaker);
    return breaker;
}
function getCircuitBreakerStatus() {
    const status = {};
    breakers.forEach((breaker, name) => {
        status[name] = breaker.getStatus();
    });
    return status;
}
function isCircuitBreakerOnCooldown(name) {
    const breaker = breakers.get(name);
    return breaker ? breaker.isOnCooldown() : false;
}
function getCircuitBreakerCooldownInfo(name) {
    const breaker = breakers.get(name);
    if (!breaker)
        return { onCooldown: false, remainingSeconds: 0 };
    return {
        onCooldown: breaker.isOnCooldown(),
        remainingSeconds: breaker.getCooldownRemaining()
    };
}
function removeCircuitBreaker(name) {
    breakers.delete(name);
}
function clearAllCircuitBreakers() {
    breakers.clear();
}
