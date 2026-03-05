"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlertSettings = getAlertSettings;
exports.updateAlertSettings = updateAlertSettings;
exports.checkBatchForBreakingAlerts = checkBatchForBreakingAlerts;
exports.initBreakingNewsAlerts = initBreakingNewsAlerts;
exports.destroyBreakingNewsAlerts = destroyBreakingNewsAlerts;
const feeds_1 = require("@/config/feeds");
const SETTINGS_KEY = 'wm-breaking-alerts-v1';
const RECENCY_GATE_MS = 15 * 60 * 1000;
const PER_EVENT_COOLDOWN_MS = 30 * 60 * 1000;
const GLOBAL_COOLDOWN_MS = 60 * 1000;
const DEFAULT_SETTINGS = {
    enabled: true,
    soundEnabled: true,
    desktopNotificationsEnabled: true,
    sensitivity: 'critical-and-high',
};
const dedupeMap = new Map();
let lastGlobalAlertMs = 0;
let lastGlobalAlertLevel = null;
let storageListener = null;
let cachedSettings = null;
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash + ch) | 0;
    }
    return Math.abs(hash).toString(36);
}
function normalizeTitle(title) {
    return title.toLowerCase().replace(/[^\w\s]/g, '').trim().slice(0, 80);
}
function extractHostname(url) {
    try {
        return new URL(url).hostname;
    }
    catch {
        return '';
    }
}
function makeAlertKey(headline, source, link) {
    const parts = normalizeTitle(headline) + '|' + source + '|' + extractHostname(link ?? '');
    return simpleHash(parts);
}
function getAlertSettings() {
    if (cachedSettings)
        return cachedSettings;
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
            return cachedSettings;
        }
    }
    catch { }
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
}
function updateAlertSettings(partial) {
    const current = getAlertSettings();
    const updated = { ...current, ...partial };
    cachedSettings = updated;
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    }
    catch { }
}
function isRecent(pubDate) {
    return pubDate.getTime() >= (Date.now() - RECENCY_GATE_MS);
}
function pruneDedupeMap() {
    const now = Date.now();
    for (const [key, ts] of dedupeMap) {
        if (now - ts >= PER_EVENT_COOLDOWN_MS)
            dedupeMap.delete(key);
    }
}
function isDuplicate(key) {
    const lastFired = dedupeMap.get(key);
    if (lastFired === undefined)
        return false;
    return (Date.now() - lastFired) < PER_EVENT_COOLDOWN_MS;
}
function isGlobalCooldown(candidateLevel) {
    if ((Date.now() - lastGlobalAlertMs) >= GLOBAL_COOLDOWN_MS)
        return false;
    if (candidateLevel === 'critical' && lastGlobalAlertLevel !== 'critical')
        return false;
    return true;
}
function dispatchAlert(alert) {
    pruneDedupeMap();
    dedupeMap.set(alert.id, Date.now());
    lastGlobalAlertMs = Date.now();
    lastGlobalAlertLevel = alert.threatLevel;
    document.dispatchEvent(new CustomEvent('wm:breaking-news', { detail: alert }));
}
function checkBatchForBreakingAlerts(items) {
    const settings = getAlertSettings();
    if (!settings.enabled)
        return;
    let best = null;
    for (const item of items) {
        if (!item.isAlert)
            continue;
        if (!item.threat)
            continue;
        if (!isRecent(item.pubDate))
            continue;
        const level = item.threat.level;
        if (level !== 'critical' && level !== 'high')
            continue;
        if (settings.sensitivity === 'critical-only' && level !== 'critical')
            continue;
        // Tier 3+ sources (think tanks, specialty) need LLM confirmation to fire alerts.
        // Keyword-only "war" matches on analysis articles are too noisy.
        const tier = (0, feeds_1.getSourceTier)(item.source);
        if (tier >= 3 && item.threat.source === 'keyword')
            continue;
        const key = makeAlertKey(item.title, item.source, item.link);
        if (isDuplicate(key))
            continue;
        const isBetter = !best
            || (level === 'critical' && best.threatLevel !== 'critical')
            || (level === best.threatLevel && item.pubDate.getTime() > best.timestamp.getTime());
        if (isBetter) {
            best = {
                id: key,
                headline: item.title,
                source: item.source,
                link: item.link,
                threatLevel: level,
                timestamp: item.pubDate,
                origin: 'rss_alert',
            };
        }
    }
    if (best && !isGlobalCooldown(best.threatLevel))
        dispatchAlert(best);
}
function initBreakingNewsAlerts() {
    storageListener = (e) => {
        if (e.key === SETTINGS_KEY) {
            cachedSettings = null;
        }
    };
    window.addEventListener('storage', storageListener);
}
function destroyBreakingNewsAlerts() {
    if (storageListener) {
        window.removeEventListener('storage', storageListener);
        storageListener = null;
    }
    dedupeMap.clear();
    cachedSettings = null;
    lastGlobalAlertMs = 0;
    lastGlobalAlertLevel = null;
}
