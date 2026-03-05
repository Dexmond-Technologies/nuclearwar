"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyUrl = proxyUrl;
exports.fetchWithProxy = fetchWithProxy;
const runtime_1 = require("../services/runtime");
const persistent_cache_1 = require("../services/persistent-cache");
const isDev = import.meta.env.DEV;
const RESPONSE_CACHE_PREFIX = 'api-response:';
// In production browser deployments, routes are handled by Vercel serverless functions.
// In local dev, Vite proxy handles these routes.
// In Tauri desktop mode, route requests need an absolute remote host.
function proxyUrl(localPath) {
    if ((0, runtime_1.isDesktopRuntime)()) {
        return (0, runtime_1.toRuntimeUrl)(localPath);
    }
    if (isDev) {
        return localPath;
    }
    return localPath;
}
function shouldPersistResponse(url) {
    return typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'));
}
function buildResponseCacheKey(url) {
    return `${RESPONSE_CACHE_PREFIX}${url}`;
}
function toCachedPayload(url, response, body) {
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return {
        url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
    };
}
function toResponse(payload) {
    return new Response(payload.body, {
        status: payload.status,
        statusText: payload.statusText,
        headers: payload.headers,
    });
}
async function fetchAndPersist(url) {
    const response = await fetch(proxyUrl(url));
    if (response.ok && shouldPersistResponse(url)) {
        try {
            const body = await response.clone().text();
            void (0, persistent_cache_1.setPersistentCache)(buildResponseCacheKey(url), toCachedPayload(url, response, body));
        }
        catch (error) {
            console.warn('[proxy] Failed to persist API response cache', error);
        }
    }
    return response;
}
async function fetchWithProxy(url) {
    if (!shouldPersistResponse(url)) {
        return fetch(proxyUrl(url));
    }
    const cacheKey = buildResponseCacheKey(url);
    const cached = await (0, persistent_cache_1.getPersistentCache)(cacheKey);
    if (cached?.data) {
        void fetchAndPersist(url).catch((error) => {
            console.warn('[proxy] Background refresh failed for cached API response', error);
        });
        return toResponse(cached.data);
    }
    return fetchAndPersist(url);
}
