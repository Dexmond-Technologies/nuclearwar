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
exports.resolveLocalApiPort = resolveLocalApiPort;
exports.getLocalApiPort = getLocalApiPort;
exports.detectDesktopRuntime = detectDesktopRuntime;
exports.isDesktopRuntime = isDesktopRuntime;
exports.getApiBaseUrl = getApiBaseUrl;
exports.getRemoteApiBaseUrl = getRemoteApiBaseUrl;
exports.toRuntimeUrl = toRuntimeUrl;
exports.installRuntimeFetchPatch = installRuntimeFetchPatch;
exports.installWebApiRedirect = installWebApiRedirect;
const WS_API_URL = import.meta.env.VITE_WS_API_URL || '';
const DEFAULT_REMOTE_HOSTS = {
    tech: WS_API_URL,
    full: WS_API_URL,
    world: WS_API_URL,
    happy: WS_API_URL,
};
const DEFAULT_LOCAL_API_PORT = 46123;
const FORCE_DESKTOP_RUNTIME = import.meta.env.VITE_DESKTOP_RUNTIME === '1';
let _resolvedPort = null;
let _portPromise = null;
async function resolveLocalApiPort() {
    if (_resolvedPort !== null)
        return _resolvedPort;
    if (_portPromise)
        return _portPromise;
    _portPromise = (async () => {
        try {
            const { tryInvokeTauri } = await Promise.resolve().then(() => __importStar(require('@/services/tauri-bridge')));
            const port = await tryInvokeTauri('get_local_api_port');
            if (port && port > 0) {
                _resolvedPort = port;
                return port;
            }
        }
        catch {
            // IPC failed — allow retry on next call
        }
        finally {
            _portPromise = null;
        }
        return DEFAULT_LOCAL_API_PORT;
    })();
    return _portPromise;
}
function getLocalApiPort() {
    return _resolvedPort ?? DEFAULT_LOCAL_API_PORT;
}
function normalizeBaseUrl(baseUrl) {
    return baseUrl.replace(/\/$/, '');
}
function detectDesktopRuntime(probe) {
    const tauriInUserAgent = probe.userAgent.includes('Tauri');
    const secureLocalhostOrigin = (probe.locationProtocol === 'https:' && (probe.locationHost === 'localhost' ||
        probe.locationHost.startsWith('localhost:') ||
        probe.locationHost === '127.0.0.1' ||
        probe.locationHost.startsWith('127.0.0.1:')));
    // Tauri production windows can expose tauri-like hosts/schemes without
    // always exposing bridge globals at first paint.
    const tauriLikeLocation = (probe.locationProtocol === 'tauri:' ||
        probe.locationProtocol === 'asset:' ||
        probe.locationHost === 'tauri.localhost' ||
        probe.locationHost.endsWith('.tauri.localhost') ||
        probe.locationOrigin.startsWith('tauri://') ||
        secureLocalhostOrigin);
    return probe.hasTauriGlobals || tauriInUserAgent || tauriLikeLocation;
}
function isDesktopRuntime() {
    if (FORCE_DESKTOP_RUNTIME) {
        return true;
    }
    if (typeof window === 'undefined') {
        return false;
    }
    return detectDesktopRuntime({
        hasTauriGlobals: '__TAURI_INTERNALS__' in window || '__TAURI__' in window,
        userAgent: window.navigator?.userAgent ?? '',
        locationProtocol: window.location?.protocol ?? '',
        locationHost: window.location?.host ?? '',
        locationOrigin: window.location?.origin ?? '',
    });
}
function getApiBaseUrl() {
    if (!isDesktopRuntime()) {
        return '';
    }
    const configuredBaseUrl = import.meta.env.VITE_TAURI_API_BASE_URL;
    if (configuredBaseUrl) {
        return normalizeBaseUrl(configuredBaseUrl);
    }
    return `http://127.0.0.1:${getLocalApiPort()}`;
}
function getRemoteApiBaseUrl() {
    const configuredRemoteBase = import.meta.env.VITE_TAURI_REMOTE_API_BASE_URL;
    if (configuredRemoteBase) {
        return normalizeBaseUrl(configuredRemoteBase);
    }
    const variant = import.meta.env.VITE_VARIANT || 'full';
    return DEFAULT_REMOTE_HOSTS[variant] ?? DEFAULT_REMOTE_HOSTS.full ?? '';
}
function toRuntimeUrl(path) {
    if (!path.startsWith('/')) {
        return path;
    }
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
        return path;
    }
    return `${baseUrl}${path}`;
}
function extractHostnames(...urls) {
    const hosts = [];
    for (const u of urls) {
        if (!u)
            continue;
        try {
            hosts.push(new URL(u).hostname);
        }
        catch { }
    }
    return hosts;
}
const APP_HOSTS = new Set([
    'worldmonitor.app',
    'www.worldmonitor.app',
    'tech.worldmonitor.app',
    'api.worldmonitor.app',
    'localhost',
    '127.0.0.1',
    ...extractHostnames(WS_API_URL, import.meta.env.VITE_WS_RELAY_URL),
]);
function isAppOriginUrl(urlStr) {
    try {
        const u = new URL(urlStr);
        const host = u.hostname;
        return APP_HOSTS.has(host) || host.endsWith('.worldmonitor.app');
    }
    catch {
        return false;
    }
}
function getApiTargetFromRequestInput(input) {
    if (typeof input === 'string') {
        if (input.startsWith('/'))
            return input;
        if (isAppOriginUrl(input)) {
            const u = new URL(input);
            return `${u.pathname}${u.search}`;
        }
        return null;
    }
    if (input instanceof URL) {
        if (isAppOriginUrl(input.href)) {
            return `${input.pathname}${input.search}`;
        }
        return null;
    }
    if (isAppOriginUrl(input.url)) {
        const u = new URL(input.url);
        return `${u.pathname}${u.search}`;
    }
    return null;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isLocalOnlyApiTarget(target) {
    // Security boundary: endpoints that can carry local secrets must use the
    // `/api/local-*` prefix so cloud fallback is automatically blocked.
    return target.startsWith('/api/local-');
}
function isKeyFreeApiTarget(target) {
    return target.startsWith('/api/register-interest');
}
async function fetchLocalWithStartupRetry(nativeFetch, localUrl, init) {
    const maxAttempts = 4;
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await nativeFetch(localUrl, init);
        }
        catch (error) {
            lastError = error;
            // Preserve caller intent for aborted requests.
            if (init?.signal?.aborted) {
                throw error;
            }
            if (attempt === maxAttempts) {
                break;
            }
            await sleep(125 * attempt);
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error('Local API unavailable');
}
// ── Security threat model for the fetch patch ──────────────────────────
// The LOCAL_API_TOKEN exists to prevent OTHER local processes from
// accessing the sidecar on port 46123. The renderer IS the intended
// client — injecting the token automatically is correct by design.
//
// If the renderer is compromised (XSS, supply chain), the attacker
// already has access to strictly more powerful Tauri IPC commands
// (get_all_secrets, set_secret, etc.) via window.__TAURI_INTERNALS__.
// The fetch patch does not expand the attack surface beyond what IPC
// already provides.
//
// Defense layers that protect the renderer trust boundary:
//   1. CSP: script-src 'self' (no unsafe-inline/eval)
//   2. IPC origin validation: sensitive commands gated to trusted windows
//   3. Sidecar allowlists: env-update restricted to ALLOWED_ENV_KEYS
//   4. DevTools disabled in production builds
//
// The token has a 5-minute TTL in the closure to limit exposure window
// if IPC access is revoked mid-session.
const TOKEN_TTL_MS = 5 * 60 * 1000;
function installRuntimeFetchPatch() {
    if (!isDesktopRuntime() || typeof window === 'undefined' || window.__wmFetchPatched) {
        return;
    }
    const nativeFetch = window.fetch.bind(window);
    let localApiToken = null;
    let tokenFetchedAt = 0;
    window.fetch = async (input, init) => {
        const target = getApiTargetFromRequestInput(input);
        const debug = localStorage.getItem('wm-debug-log') === '1';
        if (!target?.startsWith('/api/')) {
            if (debug) {
                const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                console.log(`[fetch] passthrough → ${raw.slice(0, 120)}`);
            }
            return nativeFetch(input, init);
        }
        // Resolve dynamic sidecar port on first API call
        if (_resolvedPort === null) {
            try {
                await resolveLocalApiPort();
            }
            catch { /* use default */ }
        }
        const tokenExpired = localApiToken && (Date.now() - tokenFetchedAt > TOKEN_TTL_MS);
        if (!localApiToken || tokenExpired) {
            try {
                const { tryInvokeTauri } = await Promise.resolve().then(() => __importStar(require('@/services/tauri-bridge')));
                localApiToken = await tryInvokeTauri('get_local_api_token');
                tokenFetchedAt = Date.now();
            }
            catch {
                localApiToken = null;
                tokenFetchedAt = 0;
            }
        }
        const headers = new Headers(init?.headers);
        if (localApiToken) {
            headers.set('Authorization', `Bearer ${localApiToken}`);
        }
        const localInit = { ...init, headers };
        const localUrl = `${getApiBaseUrl()}${target}`;
        if (debug)
            console.log(`[fetch] intercept → ${target}`);
        let allowCloudFallback = !isLocalOnlyApiTarget(target);
        if (allowCloudFallback && !isKeyFreeApiTarget(target)) {
            try {
                const { getSecretState, secretsReady } = await Promise.resolve().then(() => __importStar(require('@/services/runtime-config')));
                await Promise.race([secretsReady, new Promise(r => setTimeout(r, 2000))]);
                const wmKeyState = getSecretState('WORLDMONITOR_API_KEY');
                if (!wmKeyState.present || !wmKeyState.valid) {
                    allowCloudFallback = false;
                }
            }
            catch {
                allowCloudFallback = false;
            }
        }
        const cloudFallback = async () => {
            if (!allowCloudFallback) {
                throw new Error(`Cloud fallback blocked for ${target}`);
            }
            const cloudUrl = `${getRemoteApiBaseUrl()}${target}`;
            if (debug)
                console.log(`[fetch] cloud fallback → ${cloudUrl}`);
            const cloudHeaders = new Headers(init?.headers);
            if (/^\/api\/[^/]+\/v1\//.test(target)) {
                const { getRuntimeConfigSnapshot } = await Promise.resolve().then(() => __importStar(require('@/services/runtime-config')));
                const wmKeyValue = getRuntimeConfigSnapshot().secrets['WORLDMONITOR_API_KEY']?.value;
                if (wmKeyValue) {
                    cloudHeaders.set('X-WorldMonitor-Key', wmKeyValue);
                }
            }
            return nativeFetch(cloudUrl, { ...init, headers: cloudHeaders });
        };
        try {
            const t0 = performance.now();
            let response = await fetchLocalWithStartupRetry(nativeFetch, localUrl, localInit);
            if (debug)
                console.log(`[fetch] ${target} → ${response.status} (${Math.round(performance.now() - t0)}ms)`);
            // Token may be stale after a sidecar restart — refresh and retry once.
            if (response.status === 401 && localApiToken) {
                if (debug)
                    console.log(`[fetch] 401 from sidecar, refreshing token and retrying`);
                try {
                    const { tryInvokeTauri } = await Promise.resolve().then(() => __importStar(require('@/services/tauri-bridge')));
                    localApiToken = await tryInvokeTauri('get_local_api_token');
                    tokenFetchedAt = Date.now();
                }
                catch {
                    localApiToken = null;
                    tokenFetchedAt = 0;
                }
                if (localApiToken) {
                    const retryHeaders = new Headers(init?.headers);
                    retryHeaders.set('Authorization', `Bearer ${localApiToken}`);
                    response = await fetchLocalWithStartupRetry(nativeFetch, localUrl, { ...init, headers: retryHeaders });
                    if (debug)
                        console.log(`[fetch] retry ${target} → ${response.status}`);
                }
            }
            if (!response.ok) {
                if (!allowCloudFallback) {
                    if (debug)
                        console.log(`[fetch] local-only endpoint ${target} returned ${response.status}; skipping cloud fallback`);
                    return response;
                }
                if (debug)
                    console.log(`[fetch] local ${response.status}, falling back to cloud`);
                return cloudFallback();
            }
            return response;
        }
        catch (error) {
            if (debug)
                console.warn(`[runtime] Local API unavailable for ${target}`, error);
            if (!allowCloudFallback) {
                throw error;
            }
            return cloudFallback();
        }
    };
    window.__wmFetchPatched = true;
}
const WEB_RPC_PATTERN = /^\/api\/[^/]+\/v1\//;
const ALLOWED_REDIRECT_HOSTS = /^https:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*worldmonitor\.app(:\d+)?$/;
function isAllowedRedirectTarget(url) {
    try {
        const parsed = new URL(url);
        return ALLOWED_REDIRECT_HOSTS.test(parsed.origin) || parsed.hostname === 'localhost';
    }
    catch {
        return false;
    }
}
function installWebApiRedirect() {
    if (isDesktopRuntime() || typeof window === 'undefined')
        return;
    if (!WS_API_URL)
        return;
    if (!isAllowedRedirectTarget(WS_API_URL)) {
        console.warn('[runtime] VITE_WS_API_URL blocked — not in hostname allowlist:', WS_API_URL);
        return;
    }
    if (window.__wmWebRedirectPatched)
        return;
    const nativeFetch = window.fetch.bind(window);
    const API_BASE = WS_API_URL;
    window.fetch = async (input, init) => {
        if (typeof input === 'string' && WEB_RPC_PATTERN.test(input)) {
            return nativeFetch(`${API_BASE}${input}`, init);
        }
        if (input instanceof URL && input.origin === window.location.origin && WEB_RPC_PATTERN.test(input.pathname)) {
            return nativeFetch(new URL(`${API_BASE}${input.pathname}${input.search}`), init);
        }
        if (input instanceof Request) {
            const u = new URL(input.url);
            if (u.origin === window.location.origin && WEB_RPC_PATTERN.test(u.pathname)) {
                return nativeFetch(new Request(`${API_BASE}${u.pathname}${u.search}`, input), init);
            }
        }
        return nativeFetch(input, init);
    };
    window.__wmWebRedirectPatched = true;
}
