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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyStoredTheme = exports.setTheme = exports.getCurrentTheme = exports.getStoredTheme = exports.invalidateColorCache = exports.getCSSColor = exports.getCircuitBreakerCooldownInfo = exports.getCircuitBreakerStatus = exports.createCircuitBreaker = exports.CircuitBreaker = exports.parseMapUrlState = exports.buildMapUrl = exports.ExportPanel = exports.exportToCSV = exports.exportToJSON = exports.fetchWithProxy = exports.proxyUrl = exports.MOBILE_BREAKPOINT_PX = void 0;
exports.formatTime = formatTime;
exports.formatPrice = formatPrice;
exports.formatChange = formatChange;
exports.getChangeClass = getChangeClass;
exports.getHeatmapClass = getHeatmapClass;
exports.debounce = debounce;
exports.throttle = throttle;
exports.rafSchedule = rafSchedule;
exports.loadFromStorage = loadFromStorage;
exports.isStorageQuotaExceeded = isStorageQuotaExceeded;
exports.isQuotaError = isQuotaError;
exports.markStorageQuotaExceeded = markStorageQuotaExceeded;
exports.saveToStorage = saveToStorage;
exports.generateId = generateId;
exports.isMobileDevice = isMobileDevice;
exports.chunkArray = chunkArray;
function formatTime(date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const lang = (0, i18n_1.getCurrentLanguage)();
    // Safe fallback if Intl is not available (though it is in all modern browsers)
    try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        if (diff < 60)
            return rtf.format(-Math.round(diff), 'second');
        if (diff < 3600)
            return rtf.format(-Math.round(diff / 60), 'minute');
        if (diff < 86400)
            return rtf.format(-Math.round(diff / 3600), 'hour');
        return rtf.format(-Math.round(diff / 86400), 'day');
    }
    catch (e) {
        if (diff < 60)
            return 'Just now';
        if (diff < 3600)
            return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)
            return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }
}
function formatPrice(price) {
    if (price >= 1000) {
        return `$${price.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;
    }
    return `$${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
function formatChange(change) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}
function getChangeClass(change) {
    return change >= 0 ? 'up' : 'down';
}
function getHeatmapClass(change) {
    const abs = Math.abs(change);
    const direction = change >= 0 ? 'up' : 'down';
    if (abs >= 2)
        return `${direction}-3`;
    if (abs >= 1)
        return `${direction}-2`;
    return `${direction}-1`;
}
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
function throttle(fn, limit) {
    // Time-based throttling for non-visual work where a fixed minimum interval is desired.
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}
function rafSchedule(fn) {
    // Frame-synchronized scheduling for visual updates; batches repeated calls into one render frame.
    let scheduled = false;
    let lastArgs = null;
    return (...args) => {
        lastArgs = args;
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                if (lastArgs) {
                    fn(...lastArgs);
                    lastArgs = null;
                }
            });
        }
    };
}
function loadFromStorage(key, defaultValue) {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults for object types to handle new properties
            if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
                return { ...defaultValue, ...parsed };
            }
            return parsed;
        }
    }
    catch (e) {
        console.warn(`Failed to load ${key} from storage:`, e);
    }
    return defaultValue;
}
let _storageQuotaExceeded = false;
function isStorageQuotaExceeded() {
    return _storageQuotaExceeded;
}
function isQuotaError(e) {
    return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
}
function markStorageQuotaExceeded() {
    if (!_storageQuotaExceeded) {
        _storageQuotaExceeded = true;
        console.warn('[Storage] Quota exceeded — disabling further writes');
    }
}
function saveToStorage(key, value) {
    if (_storageQuotaExceeded)
        return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch (e) {
        if (isQuotaError(e)) {
            markStorageQuotaExceeded();
        }
        else {
            console.warn(`Failed to save ${key} to storage:`, e);
        }
    }
}
function generateId() {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/** Breakpoint (px): below this width the app uses the simplified mobile layout. Must match CSS @media (max-width: …). */
exports.MOBILE_BREAKPOINT_PX = 768;
/** True when viewport is below mobile breakpoint. Touch-capable notebooks keep desktop layout. */
function isMobileDevice() {
    return window.innerWidth < exports.MOBILE_BREAKPOINT_PX;
}
function chunkArray(items, size) {
    const chunkSize = Math.max(1, size);
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
var proxy_1 = require("./proxy");
Object.defineProperty(exports, "proxyUrl", { enumerable: true, get: function () { return proxy_1.proxyUrl; } });
Object.defineProperty(exports, "fetchWithProxy", { enumerable: true, get: function () { return proxy_1.fetchWithProxy; } });
var export_1 = require("./export");
Object.defineProperty(exports, "exportToJSON", { enumerable: true, get: function () { return export_1.exportToJSON; } });
Object.defineProperty(exports, "exportToCSV", { enumerable: true, get: function () { return export_1.exportToCSV; } });
Object.defineProperty(exports, "ExportPanel", { enumerable: true, get: function () { return export_1.ExportPanel; } });
var urlState_1 = require("./urlState");
Object.defineProperty(exports, "buildMapUrl", { enumerable: true, get: function () { return urlState_1.buildMapUrl; } });
Object.defineProperty(exports, "parseMapUrlState", { enumerable: true, get: function () { return urlState_1.parseMapUrlState; } });
var circuit_breaker_1 = require("./circuit-breaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "createCircuitBreaker", { enumerable: true, get: function () { return circuit_breaker_1.createCircuitBreaker; } });
Object.defineProperty(exports, "getCircuitBreakerStatus", { enumerable: true, get: function () { return circuit_breaker_1.getCircuitBreakerStatus; } });
Object.defineProperty(exports, "getCircuitBreakerCooldownInfo", { enumerable: true, get: function () { return circuit_breaker_1.getCircuitBreakerCooldownInfo; } });
__exportStar(require("./analysis-constants"), exports);
var theme_colors_1 = require("./theme-colors");
Object.defineProperty(exports, "getCSSColor", { enumerable: true, get: function () { return theme_colors_1.getCSSColor; } });
Object.defineProperty(exports, "invalidateColorCache", { enumerable: true, get: function () { return theme_colors_1.invalidateColorCache; } });
var theme_manager_1 = require("./theme-manager");
Object.defineProperty(exports, "getStoredTheme", { enumerable: true, get: function () { return theme_manager_1.getStoredTheme; } });
Object.defineProperty(exports, "getCurrentTheme", { enumerable: true, get: function () { return theme_manager_1.getCurrentTheme; } });
Object.defineProperty(exports, "setTheme", { enumerable: true, get: function () { return theme_manager_1.setTheme; } });
Object.defineProperty(exports, "applyStoredTheme", { enumerable: true, get: function () { return theme_manager_1.applyStoredTheme; } });
const i18n_1 = require("../services/i18n");
