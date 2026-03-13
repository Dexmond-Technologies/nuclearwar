"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secretsReady = exports.RUNTIME_FEATURES = void 0;
exports.validateSecret = validateSecret;
exports.subscribeRuntimeConfig = subscribeRuntimeConfig;
exports.getRuntimeConfigSnapshot = getRuntimeConfigSnapshot;
exports.isFeatureEnabled = isFeatureEnabled;
exports.getSecretState = getSecretState;
exports.isFeatureAvailable = isFeatureAvailable;
exports.getEffectiveSecrets = getEffectiveSecrets;
exports.setFeatureToggle = setFeatureToggle;
exports.setSecretValue = setSecretValue;
exports.verifySecretWithApi = verifySecretWithApi;
exports.loadDesktopSecrets = loadDesktopSecrets;
const runtime_1 = require("./runtime");
const tauri_bridge_1 = require("./tauri-bridge");
const TOGGLES_STORAGE_KEY = 'worldmonitor-runtime-feature-toggles';
function getSidecarEnvUpdateUrl() {
    return `${(0, runtime_1.getApiBaseUrl)()}/api/local-env-update`;
}
function getSidecarSecretValidateUrl() {
    return `${(0, runtime_1.getApiBaseUrl)()}/api/local-validate-secret`;
}
const defaultToggles = {
    aiGroq: true,
    aiOpenRouter: true,
    economicFred: true,
    energyEia: true,
    internetOutages: true,
    acledConflicts: true,
    abuseChThreatIntel: true,
    alienvaultOtxThreatIntel: true,
    abuseIpdbThreatIntel: true,
    wingbitsEnrichment: true,
    aisRelay: true,
    openskyRelay: true,
    finnhubMarkets: true,
    nasaFirms: true,
    aiOllama: true,
    wtoTrade: true,
    supplyChain: true,
    aviationStack: true,
};
exports.RUNTIME_FEATURES = [
    {
        id: 'aiOllama',
        name: 'Ollama local summarization',
        description: 'Local LLM provider via OpenAI-compatible endpoint (Ollama or LM Studio, desktop-first).',
        requiredSecrets: ['OLLAMA_API_URL', 'OLLAMA_MODEL'],
        fallback: 'Falls back to Groq, then OpenRouter, then local browser model.',
    },
    {
        id: 'aiGroq',
        name: 'Groq summarization',
        description: 'Primary fast LLM provider used for AI summary generation.',
        requiredSecrets: ['GROQ_API_KEY'],
        fallback: 'Falls back to OpenRouter, then local browser model.',
    },
    {
        id: 'aiOpenRouter',
        name: 'OpenRouter summarization',
        description: 'Secondary LLM provider for AI summary fallback.',
        requiredSecrets: ['OPENROUTER_API_KEY'],
        fallback: 'Falls back to local browser model only.',
    },
    {
        id: 'economicFred',
        name: 'FRED economic indicators',
        description: 'Macro indicators from Federal Reserve Economic Data.',
        requiredSecrets: ['FRED_API_KEY'],
        fallback: 'Economic panel remains available with non-FRED metrics.',
    },
    {
        id: 'energyEia',
        name: 'EIA oil analytics',
        description: 'US Energy Information Administration oil metrics.',
        requiredSecrets: ['EIA_API_KEY'],
        fallback: 'Oil analytics cards show disabled state.',
    },
    {
        id: 'internetOutages',
        name: 'Cloudflare outage radar',
        description: 'Internet outages from Cloudflare Radar annotations API.',
        requiredSecrets: ['CLOUDFLARE_API_TOKEN'],
        fallback: 'Outage layer is disabled and map continues with other feeds.',
    },
    {
        id: 'acledConflicts',
        name: 'ACLED conflicts & protests',
        description: 'Conflict and protest event feeds from ACLED.',
        requiredSecrets: ['ACLED_ACCESS_TOKEN'],
        fallback: 'Conflict/protest overlays are hidden.',
    },
    {
        id: 'abuseChThreatIntel',
        name: 'abuse.ch cyber IOC feeds',
        description: 'URLhaus and ThreatFox IOC ingestion for the cyber threat layer.',
        requiredSecrets: ['URLHAUS_AUTH_KEY'],
        fallback: 'URLhaus/ThreatFox IOC ingestion is disabled.',
    },
    {
        id: 'alienvaultOtxThreatIntel',
        name: 'AlienVault OTX threat intel',
        description: 'Optional OTX IOC ingestion for cyber threat enrichment.',
        requiredSecrets: ['OTX_API_KEY'],
        fallback: 'OTX IOC enrichment is disabled.',
    },
    {
        id: 'abuseIpdbThreatIntel',
        name: 'AbuseIPDB threat intel',
        description: 'Optional AbuseIPDB IOC/reputation enrichment for the cyber threat layer.',
        requiredSecrets: ['ABUSEIPDB_API_KEY'],
        fallback: 'AbuseIPDB enrichment is disabled.',
    },
    {
        id: 'wingbitsEnrichment',
        name: 'Wingbits aircraft enrichment',
        description: 'Military flight operator/aircraft enrichment metadata.',
        requiredSecrets: ['WINGBITS_API_KEY'],
        fallback: 'Flight map still renders with heuristic-only classification.',
    },
    {
        id: 'aisRelay',
        name: 'AIS vessel tracking',
        description: 'Live vessel ingestion via AISStream WebSocket.',
        requiredSecrets: ['WS_RELAY_URL', 'AISSTREAM_API_KEY'],
        desktopRequiredSecrets: ['AISSTREAM_API_KEY'],
        fallback: 'AIS layer is disabled.',
    },
    {
        id: 'openskyRelay',
        name: 'OpenSky military flights',
        description: 'OpenSky OAuth credentials for military flight data.',
        requiredSecrets: ['VITE_OPENSKY_RELAY_URL', 'OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'],
        desktopRequiredSecrets: ['OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'],
        fallback: 'Military flights fall back to limited/no data.',
    },
    {
        id: 'finnhubMarkets',
        name: 'Finnhub market data',
        description: 'Real-time stock quotes and market data from Finnhub.',
        requiredSecrets: ['FINNHUB_API_KEY'],
        fallback: 'Stock ticker uses limited free data.',
    },
    {
        id: 'nasaFirms',
        name: 'NASA FIRMS fire data',
        description: 'Fire Information for Resource Management System satellite data.',
        requiredSecrets: ['NASA_FIRMS_API_KEY'],
        fallback: 'FIRMS fire layer uses public VIIRS feed.',
    },
    {
        id: 'wtoTrade',
        name: 'WTO trade policy data',
        description: 'Trade restrictions, tariff trends, barriers, and flows from WTO.',
        requiredSecrets: ['WTO_API_KEY'],
        fallback: 'Trade policy panel shows disabled state.',
    },
    {
        id: 'supplyChain',
        name: 'Supply Chain Intelligence',
        description: 'Shipping rates via FRED Baltic Dry Index. Chokepoints and minerals use public data.',
        requiredSecrets: ['FRED_API_KEY'],
        fallback: 'Chokepoints and minerals always available; shipping requires FRED key.',
    },
    {
        id: 'aviationStack',
        name: 'AviationStack flight delays',
        description: 'Real-time international airport delay data from AviationStack API.',
        requiredSecrets: ['AVIATIONSTACK_API'],
        fallback: 'Non-US airports use simulated delay data.',
    },
];
function readEnvSecret(key) {
    const envValue = import.meta.env?.[key];
    return typeof envValue === 'string' ? envValue.trim() : '';
}
function readStoredToggles() {
    try {
        const stored = localStorage.getItem(TOGGLES_STORAGE_KEY);
        if (!stored)
            return { ...defaultToggles };
        const parsed = JSON.parse(stored);
        return { ...defaultToggles, ...parsed };
    }
    catch {
        return { ...defaultToggles };
    }
}
const URL_SECRET_KEYS = new Set([
    'WS_RELAY_URL',
    'VITE_OPENSKY_RELAY_URL',
    'OLLAMA_API_URL',
]);
function validateSecret(key, value) {
    const trimmed = value.trim();
    if (!trimmed)
        return { valid: false, hint: 'Value is required' };
    if (URL_SECRET_KEYS.has(key)) {
        try {
            const parsed = new URL(trimmed);
            if (key === 'OLLAMA_API_URL') {
                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    return { valid: false, hint: 'Must be an http(s) URL' };
                }
                return { valid: true };
            }
            if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
                return { valid: false, hint: 'Must be an http(s) or ws(s) URL' };
            }
            return { valid: true };
        }
        catch {
            return { valid: false, hint: 'Must be a valid URL' };
        }
    }
    if (key === 'WORLDMONITOR_API_KEY') {
        if (trimmed.length < 16)
            return { valid: false, hint: 'API key must be at least 16 characters' };
        return { valid: true };
    }
    return { valid: true };
}
let secretsReadyResolve;
exports.secretsReady = new Promise(r => { secretsReadyResolve = r; });
if (!(0, runtime_1.isDesktopRuntime)())
    secretsReadyResolve();
const listeners = new Set();
const runtimeConfig = {
    featureToggles: readStoredToggles(),
    secrets: {},
};
let localApiTokenPromise = null;
function notifyConfigChanged() {
    for (const listener of listeners)
        listener();
}
function seedSecretsFromEnvironment() {
    if ((0, runtime_1.isDesktopRuntime)())
        return;
    const keys = new Set(exports.RUNTIME_FEATURES.flatMap(feature => feature.requiredSecrets));
    for (const key of keys) {
        const value = readEnvSecret(key);
        if (value) {
            runtimeConfig.secrets[key] = { value, source: 'env' };
        }
    }
}
seedSecretsFromEnvironment();
// Listen for cross-window state updates (settings ↔ main).
// When one window saves secrets or toggles features, the `storage` event fires in other same-origin windows.
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'wm-secrets-updated') {
            void loadDesktopSecrets();
        }
        else if (e.key === TOGGLES_STORAGE_KEY && e.newValue) {
            try {
                const parsed = JSON.parse(e.newValue);
                Object.assign(runtimeConfig.featureToggles, parsed);
                notifyConfigChanged();
            }
            catch { /* ignore malformed JSON */ }
        }
    });
}
function subscribeRuntimeConfig(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
function getRuntimeConfigSnapshot() {
    return {
        featureToggles: { ...runtimeConfig.featureToggles },
        secrets: { ...runtimeConfig.secrets },
    };
}
function isFeatureEnabled(featureId) {
    return runtimeConfig.featureToggles[featureId] !== false;
}
function getSecretState(key) {
    const state = runtimeConfig.secrets[key];
    if (!state)
        return { present: false, valid: false, source: 'missing' };
    return { present: true, valid: validateSecret(key, state.value).valid, source: state.source };
}
function isFeatureAvailable(featureId) {
    if (!isFeatureEnabled(featureId))
        return false;
    // Cloud/web deployments validate credentials server-side.
    // Desktop runtime validates local secrets client-side for capability gating.
    if (!(0, runtime_1.isDesktopRuntime)()) {
        return true;
    }
    const feature = exports.RUNTIME_FEATURES.find(item => item.id === featureId);
    if (!feature)
        return false;
    const secrets = feature.desktopRequiredSecrets ?? feature.requiredSecrets;
    return secrets.every(secretKey => getSecretState(secretKey).valid);
}
function getEffectiveSecrets(feature) {
    return ((0, runtime_1.isDesktopRuntime)() && feature.desktopRequiredSecrets) ? feature.desktopRequiredSecrets : feature.requiredSecrets;
}
function setFeatureToggle(featureId, enabled) {
    runtimeConfig.featureToggles[featureId] = enabled;
    localStorage.setItem(TOGGLES_STORAGE_KEY, JSON.stringify(runtimeConfig.featureToggles));
    notifyConfigChanged();
}
async function setSecretValue(key, value) {
    if (!(0, runtime_1.isDesktopRuntime)()) {
        console.warn('[runtime-config] Ignoring secret write outside desktop runtime');
        return;
    }
    const sanitized = value.trim();
    if (sanitized) {
        await (0, tauri_bridge_1.invokeTauri)('set_secret', { key, value: sanitized });
        runtimeConfig.secrets[key] = { value: sanitized, source: 'vault' };
    }
    else {
        await (0, tauri_bridge_1.invokeTauri)('delete_secret', { key });
        delete runtimeConfig.secrets[key];
    }
    // Push to sidecar so handlers pick it up immediately.
    // This is best-effort: keyring persistence is the source of truth.
    try {
        await pushSecretToSidecar(key, sanitized || '');
    }
    catch (error) {
        console.warn(`[runtime-config] Failed to sync ${key} to sidecar`, error);
    }
    // Signal other windows (main ↔ settings) to reload secrets from keychain.
    // The `storage` event fires in all same-origin windows except the one that wrote.
    try {
        localStorage.setItem('wm-secrets-updated', String(Date.now()));
    }
    catch { /* localStorage may be unavailable */ }
    notifyConfigChanged();
}
async function getLocalApiToken() {
    if (!localApiTokenPromise) {
        localApiTokenPromise = (0, tauri_bridge_1.invokeTauri)('get_local_api_token')
            .then((token) => token.trim() || null)
            .catch((error) => {
            // Allow retries on subsequent calls if bridge/token is temporarily unavailable.
            localApiTokenPromise = null;
            throw error;
        });
    }
    return localApiTokenPromise;
}
async function pushSecretToSidecar(key, value) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = await getLocalApiToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(getSidecarEnvUpdateUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value: value || null }),
    });
    if (!response.ok) {
        let detail = '';
        try {
            detail = await response.text();
        }
        catch { /* ignore non-readable body */ }
        throw new Error(`Sidecar secret sync failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
}
async function callSidecarWithAuth(url, init) {
    const headers = new Headers(init.headers ?? {});
    const token = await getLocalApiToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
}
async function verifySecretWithApi(key, value, context = {}) {
    const localValidation = validateSecret(key, value);
    if (!localValidation.valid) {
        return { valid: false, message: localValidation.hint || 'Invalid value' };
    }
    if (!(0, runtime_1.isDesktopRuntime)()) {
        return { valid: true, message: 'Saved' };
    }
    try {
        const response = await callSidecarWithAuth(getSidecarSecretValidateUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: value.trim(), context }),
        });
        let payload = null;
        try {
            payload = await response.json();
        }
        catch { /* non-JSON response */ }
        if (!response.ok) {
            const message = payload && typeof payload === 'object'
                ? String(payload.message
                    || payload.error
                    || 'Secret validation failed')
                : `Secret validation failed (${response.status})`;
            return { valid: false, message };
        }
        if (!payload || typeof payload !== 'object') {
            return { valid: false, message: 'Secret validation returned an invalid response' };
        }
        const valid = Boolean(payload.valid);
        const message = String(payload.message || (valid ? 'Verified' : 'Verification failed'));
        return { valid, message };
    }
    catch (error) {
        // Network errors reaching the sidecar should NOT block saving.
        // Only explicit 401/403 from the provider means the key is invalid.
        const message = error instanceof Error ? error.message : 'Secret validation failed';
        return { valid: true, message: `Saved (could not verify – ${message})` };
    }
}
async function loadDesktopSecrets() {
    if (!(0, runtime_1.isDesktopRuntime)())
        return;
    try {
        // Single batch call to read all keychain secrets at once.
        // This triggers only ONE macOS Keychain prompt instead of 18 individual ones.
        const allSecrets = await (0, tauri_bridge_1.invokeTauri)('get_all_secrets');
        const syncResults = await Promise.allSettled(Object.entries(allSecrets).filter(([, value]) => value && value.trim().length > 0).map(async ([key, value]) => {
            runtimeConfig.secrets[key] = { value, source: 'vault' };
            try {
                await pushSecretToSidecar(key, value);
            }
            catch (error) {
                console.warn(`[runtime-config] Failed to sync ${key} to sidecar`, error);
            }
        }));
        const failures = syncResults.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`[runtime-config] ${failures.length} key(s) failed to sync to sidecar`);
        }
        notifyConfigChanged();
    }
    catch (error) {
        console.warn('[runtime-config] Failed to load desktop secrets from vault', error);
    }
    finally {
        secretsReadyResolve();
    }
}
