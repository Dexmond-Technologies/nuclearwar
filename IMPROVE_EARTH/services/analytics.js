"use strict";
/**
 * PostHog Analytics Service
 *
 * Always active when VITE_POSTHOG_KEY is set. No consent gate.
 * All exports are no-ops when the key is absent (dev/local).
 *
 * Data safety:
 * - Typed allowlists per event — unlisted properties silently dropped
 * - sanitize_properties callback strips strings matching API key prefixes
 * - No session recordings, no autocapture
 * - distinct_id is a random UUID — pseudonymous, not identifiable
 */
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
exports.initAnalytics = initAnalytics;
exports.trackEvent = trackEvent;
exports.trackEventBeforeUnload = trackEventBeforeUnload;
exports.trackPanelView = trackPanelView;
exports.trackApiKeysSnapshot = trackApiKeysSnapshot;
exports.trackLLMUsage = trackLLMUsage;
exports.trackLLMFailure = trackLLMFailure;
exports.trackPanelResized = trackPanelResized;
exports.trackVariantSwitch = trackVariantSwitch;
exports.trackMapLayerToggle = trackMapLayerToggle;
exports.trackCountryBriefOpened = trackCountryBriefOpened;
exports.trackThemeChanged = trackThemeChanged;
exports.trackLanguageChange = trackLanguageChange;
exports.trackFeatureToggle = trackFeatureToggle;
exports.trackSearchUsed = trackSearchUsed;
exports.trackMapViewChange = trackMapViewChange;
exports.trackCountrySelected = trackCountrySelected;
exports.trackSearchResultSelected = trackSearchResultSelected;
exports.trackPanelToggled = trackPanelToggled;
exports.trackFindingClicked = trackFindingClicked;
exports.trackUpdateShown = trackUpdateShown;
exports.trackUpdateClicked = trackUpdateClicked;
exports.trackUpdateDismissed = trackUpdateDismissed;
exports.trackCriticalBannerAction = trackCriticalBannerAction;
exports.trackDownloadClicked = trackDownloadClicked;
exports.trackDownloadBannerDismissed = trackDownloadBannerDismissed;
exports.trackWebcamSelected = trackWebcamSelected;
exports.trackWebcamRegionFiltered = trackWebcamRegionFiltered;
exports.trackDeeplinkOpened = trackDeeplinkOpened;
const runtime_1 = require("./runtime");
const runtime_config_1 = require("./runtime-config");
const config_1 = require("@/config");
const utils_1 = require("@/utils");
const tauri_bridge_1 = require("./tauri-bridge");
// ── Installation identity ──
function getOrCreateInstallationId() {
    const STORAGE_KEY = 'wm-installation-id';
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
}
// ── Stable property name map for secret keys ──
const SECRET_ANALYTICS_NAMES = {
    GROQ_API_KEY: 'groq',
    OPENROUTER_API_KEY: 'openrouter',
    FRED_API_KEY: 'fred',
    EIA_API_KEY: 'eia',
    CLOUDFLARE_API_TOKEN: 'cloudflare',
    ACLED_ACCESS_TOKEN: 'acled',
    URLHAUS_AUTH_KEY: 'urlhaus',
    OTX_API_KEY: 'otx',
    ABUSEIPDB_API_KEY: 'abuseipdb',
    WINGBITS_API_KEY: 'wingbits',
    WS_RELAY_URL: 'ws_relay',
    VITE_OPENSKY_RELAY_URL: 'opensky_relay',
    OPENSKY_CLIENT_ID: 'opensky',
    OPENSKY_CLIENT_SECRET: 'opensky_secret',
    AISSTREAM_API_KEY: 'aisstream',
    FINNHUB_API_KEY: 'finnhub',
    NASA_FIRMS_API_KEY: 'nasa_firms',
    UC_DP_KEY: 'uc_dp',
    OLLAMA_API_URL: 'ollama_url',
    OLLAMA_MODEL: 'ollama_model',
    WORLDMONITOR_API_KEY: 'worldmonitor',
    WTO_API_KEY: 'wto',
    AVIATIONSTACK_API: 'aviationstack',
};
// ── Typed event schemas (allowlisted properties per event) ──
const HAS_KEYS = Object.values(SECRET_ANALYTICS_NAMES).map(n => `has_${n}`);
const EVENT_SCHEMAS = {
    // Phase 1 — core events
    wm_app_loaded: new Set(['load_time_ms', 'panel_count']),
    wm_panel_viewed: new Set(['panel_id']),
    wm_summary_generated: new Set(['provider', 'model', 'cached']),
    wm_summary_failed: new Set(['last_provider']),
    wm_api_keys_configured: new Set([
        'total_keys_configured', 'total_features_enabled', 'enabled_features',
        'ollama_model', 'platform',
        ...HAS_KEYS,
    ]),
    // Phase 2 — plan-specified events
    wm_panel_resized: new Set(['panel_id', 'new_span']),
    wm_variant_switched: new Set(['from', 'to']),
    wm_map_layer_toggled: new Set(['layer_id', 'enabled', 'source']),
    wm_country_brief_opened: new Set(['country_code']),
    wm_theme_changed: new Set(['theme']),
    wm_language_changed: new Set(['language']),
    wm_feature_toggled: new Set(['feature_id', 'enabled']),
    wm_search_used: new Set(['query_length', 'result_count']),
    // Phase 2 — additional interaction events
    wm_map_view_changed: new Set(['view']),
    wm_country_selected: new Set(['country_code', 'country_name', 'source']),
    wm_search_result_selected: new Set(['result_type']),
    wm_panel_toggled: new Set(['panel_id', 'enabled']),
    wm_finding_clicked: new Set(['finding_id', 'finding_source', 'finding_type', 'priority']),
    wm_update_shown: new Set(['current_version', 'remote_version']),
    wm_update_clicked: new Set(['target_version']),
    wm_update_dismissed: new Set(['target_version']),
    wm_critical_banner_action: new Set(['action', 'theater_id']),
    wm_download_clicked: new Set(['platform']),
    wm_download_banner_dismissed: new Set([]),
    wm_webcam_selected: new Set(['webcam_id', 'city', 'view_mode']),
    wm_webcam_region_filtered: new Set(['region']),
    wm_deeplink_opened: new Set(['deeplink_type', 'target']),
};
function sanitizeProps(event, raw) {
    const allowed = EVENT_SCHEMAS[event];
    if (!allowed)
        return {};
    const safe = {};
    for (const [k, v] of Object.entries(raw)) {
        if (allowed.has(k))
            safe[k] = v;
    }
    return safe;
}
// ── Defense-in-depth: strip values that look like API keys ──
const API_KEY_PREFIXES = /^(sk-|gsk_|or-|Bearer )/;
function deepStripSecrets(props) {
    const cleaned = {};
    for (const [k, v] of Object.entries(props)) {
        if (typeof v === 'string' && API_KEY_PREFIXES.test(v)) {
            cleaned[k] = '[REDACTED]';
        }
        else {
            cleaned[k] = v;
        }
    }
    return cleaned;
}
let posthogInstance = null;
let initPromise = null;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = (0, runtime_1.isDesktopRuntime)()
    ? (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com')
    : '/ingest'; // Reverse proxy through own domain to bypass ad blockers
// ── Public API ──
async function initAnalytics() {
    if (!POSTHOG_KEY)
        return;
    if (initPromise)
        return initPromise;
    initPromise = (async () => {
        try {
            const mod = await Promise.resolve().then(() => __importStar(require('posthog-js')));
            const posthog = mod.default;
            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                ui_host: 'https://us.posthog.com',
                persistence: 'localStorage',
                autocapture: false,
                capture_pageview: false, // Manual capture below — auto-capture silently fails with bootstrap + SPA
                capture_pageleave: true,
                disable_session_recording: true,
                bootstrap: { distinctID: getOrCreateInstallationId() },
                sanitize_properties: (props) => deepStripSecrets(props),
            });
            // Register super properties (attached to every event)
            const superProps = {
                platform: (0, runtime_1.isDesktopRuntime)() ? 'desktop' : 'web',
                variant: config_1.SITE_VARIANT,
                app_version: __APP_VERSION__,
                is_mobile: (0, utils_1.isMobileDevice)(),
                screen_width: screen.width,
                screen_height: screen.height,
                viewport_width: innerWidth,
                viewport_height: innerHeight,
                is_big_screen: screen.width >= 2560 || screen.height >= 1440,
                is_tv_mode: screen.width >= 3840,
                device_pixel_ratio: devicePixelRatio,
                browser_language: navigator.language,
                local_hour: new Date().getHours(),
                local_day: new Date().getDay(),
            };
            // Desktop additionally registers OS and arch
            if ((0, runtime_1.isDesktopRuntime)()) {
                try {
                    const info = await (0, tauri_bridge_1.invokeTauri)('get_desktop_runtime_info');
                    superProps.desktop_os = info.os;
                    superProps.desktop_arch = info.arch;
                }
                catch {
                    // Tauri bridge may not be available yet
                }
            }
            posthog.register(superProps);
            posthogInstance = posthog;
            // Fire $pageview manually after full init — auto capture_pageview: true
            // fires during init() before super props are registered, and silently
            // fails with bootstrap + SPA setups (posthog-js #386).
            posthog.capture('$pageview');
            // Flush any events queued while offline (desktop)
            flushOfflineQueue();
            // Re-flush when coming back online
            if ((0, runtime_1.isDesktopRuntime)()) {
                window.addEventListener('online', () => flushOfflineQueue());
            }
        }
        catch (error) {
            console.warn('[Analytics] Failed to initialize PostHog:', error);
        }
    })();
    return initPromise;
}
// ── Offline event queue (desktop) ──
const OFFLINE_QUEUE_KEY = 'wm-analytics-offline-queue';
const OFFLINE_QUEUE_CAP = 200;
function enqueueOffline(name, props) {
    try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push({ name, props, ts: Date.now() });
        if (queue.length > OFFLINE_QUEUE_CAP)
            queue.splice(0, queue.length - OFFLINE_QUEUE_CAP);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
    catch { /* localStorage full or unavailable */ }
}
function flushOfflineQueue() {
    if (!posthogInstance)
        return;
    try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw)
            return;
        const queue = JSON.parse(raw);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        for (const { name, props } of queue) {
            posthogInstance.capture(name, props);
        }
    }
    catch { /* corrupt queue, discard */ }
}
function trackEvent(name, props) {
    const safeProps = props ? sanitizeProps(name, props) : {};
    if (!posthogInstance) {
        if ((0, runtime_1.isDesktopRuntime)() && POSTHOG_KEY)
            enqueueOffline(name, safeProps);
        return;
    }
    posthogInstance.capture(name, safeProps);
}
/** Use sendBeacon transport for events fired just before page reload. */
function trackEventBeforeUnload(name, props) {
    if (!posthogInstance)
        return;
    const safeProps = props ? sanitizeProps(name, props) : {};
    posthogInstance.capture(name, safeProps, { transport: 'sendBeacon' });
}
function trackPanelView(panelId) {
    trackEvent('wm_panel_viewed', { panel_id: panelId });
}
function trackApiKeysSnapshot() {
    const config = (0, runtime_config_1.getRuntimeConfigSnapshot)();
    const presence = {};
    for (const [internalKey, analyticsName] of Object.entries(SECRET_ANALYTICS_NAMES)) {
        const state = config.secrets[internalKey];
        presence[`has_${analyticsName}`] = Boolean(state?.value);
    }
    const enabledFeatures = Object.entries(config.featureToggles)
        .filter(([, v]) => v).map(([k]) => k);
    trackEvent('wm_api_keys_configured', {
        platform: (0, runtime_1.isDesktopRuntime)() ? 'desktop' : 'web',
        total_keys_configured: Object.values(presence).filter(Boolean).length,
        ...presence,
        enabled_features: enabledFeatures,
        total_features_enabled: enabledFeatures.length,
        ollama_model: config.secrets.OLLAMA_MODEL?.value || 'none',
    });
}
function trackLLMUsage(provider, model, cached) {
    trackEvent('wm_summary_generated', { provider, model, cached });
}
function trackLLMFailure(lastProvider) {
    trackEvent('wm_summary_failed', { last_provider: lastProvider });
}
// ── Phase 2 helpers (plan-specified events) ──
function trackPanelResized(panelId, newSpan) {
    trackEvent('wm_panel_resized', { panel_id: panelId, new_span: newSpan });
}
function trackVariantSwitch(from, to) {
    trackEventBeforeUnload('wm_variant_switched', { from, to });
}
function trackMapLayerToggle(layerId, enabled, source) {
    trackEvent('wm_map_layer_toggled', { layer_id: layerId, enabled, source });
}
function trackCountryBriefOpened(countryCode) {
    trackEvent('wm_country_brief_opened', { country_code: countryCode });
}
function trackThemeChanged(theme) {
    trackEventBeforeUnload('wm_theme_changed', { theme });
}
function trackLanguageChange(language) {
    trackEventBeforeUnload('wm_language_changed', { language });
}
function trackFeatureToggle(featureId, enabled) {
    trackEvent('wm_feature_toggled', { feature_id: featureId, enabled });
}
function trackSearchUsed(queryLength, resultCount) {
    trackEvent('wm_search_used', { query_length: queryLength, result_count: resultCount });
}
// ── Phase 2 helpers (additional interaction events) ──
function trackMapViewChange(view) {
    trackEvent('wm_map_view_changed', { view });
}
function trackCountrySelected(code, name, source) {
    trackEvent('wm_country_selected', { country_code: code, country_name: name, source });
}
function trackSearchResultSelected(resultType) {
    trackEvent('wm_search_result_selected', { result_type: resultType });
}
function trackPanelToggled(panelId, enabled) {
    trackEvent('wm_panel_toggled', { panel_id: panelId, enabled });
}
function trackFindingClicked(id, source, type, priority) {
    trackEvent('wm_finding_clicked', { finding_id: id, finding_source: source, finding_type: type, priority });
}
function trackUpdateShown(current, remote) {
    trackEvent('wm_update_shown', { current_version: current, remote_version: remote });
}
function trackUpdateClicked(version) {
    trackEvent('wm_update_clicked', { target_version: version });
}
function trackUpdateDismissed(version) {
    trackEvent('wm_update_dismissed', { target_version: version });
}
function trackCriticalBannerAction(action, theaterId) {
    trackEvent('wm_critical_banner_action', { action, theater_id: theaterId });
}
function trackDownloadClicked(platform) {
    trackEvent('wm_download_clicked', { platform });
}
function trackDownloadBannerDismissed() {
    trackEvent('wm_download_banner_dismissed');
}
function trackWebcamSelected(webcamId, city, viewMode) {
    trackEvent('wm_webcam_selected', { webcam_id: webcamId, city, view_mode: viewMode });
}
function trackWebcamRegionFiltered(region) {
    trackEvent('wm_webcam_region_filtered', { region });
}
function trackDeeplinkOpened(type, target) {
    trackEvent('wm_deeplink_opened', { deeplink_type: type, target });
}
