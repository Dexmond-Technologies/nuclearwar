"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOrefAlerts = fetchOrefAlerts;
exports.fetchOrefHistory = fetchOrefHistory;
exports.onOrefAlertsUpdate = onOrefAlertsUpdate;
exports.startOrefPolling = startOrefPolling;
exports.stopOrefPolling = stopOrefPolling;
const runtime_1 = require("@/services/runtime");
const summarization_1 = require("@/services/summarization");
let cachedResponse = null;
let lastFetchAt = 0;
const CACHE_TTL = 8000;
let pollingInterval = null;
let updateCallbacks = [];
const MAX_TRANSLATION_CACHE = 200;
const translationCache = new Map();
let translationPromise = null;
const HEBREW_RE = /[\u0590-\u05FF]/;
function hasHebrew(text) {
    return HEBREW_RE.test(text);
}
function alertNeedsTranslation(alert) {
    return hasHebrew(alert.title) || alert.data.some(hasHebrew) || hasHebrew(alert.desc);
}
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function buildTranslationPrompt(alerts) {
    const lines = [];
    for (const a of alerts) {
        lines.push(`ALERT[${a.id}]: ${a.title || '(none)'}`);
        lines.push(`AREAS[${a.id}]: ${a.data.join(', ') || '(none)'}`);
        lines.push(`DESC[${a.id}]: ${a.desc || '(none)'}`);
    }
    return 'Translate each line from Hebrew to English. Keep the ALERT/AREAS/DESC labels and IDs exactly as-is. Only translate the text after the colon.\n' + lines.join('\n');
}
function parseTranslationResponse(raw, alerts) {
    const lines = raw.split('\n');
    for (const alert of alerts) {
        const eid = escapeRegExp(alert.id);
        const reAlert = new RegExp(`ALERT\\[${eid}\\]:\\s*(.+)`);
        const reAreas = new RegExp(`AREAS\\[${eid}\\]:\\s*(.+)`);
        const reDesc = new RegExp(`DESC\\[${eid}\\]:\\s*(.+)`);
        let title = alert.title;
        let areas = alert.data;
        let desc = alert.desc;
        for (const line of lines) {
            const alertMatch = line.match(reAlert);
            if (alertMatch?.[1])
                title = alertMatch[1].trim();
            const areasMatch = line.match(reAreas);
            if (areasMatch?.[1])
                areas = areasMatch[1].split(',').map(s => s.trim());
            const descMatch = line.match(reDesc);
            if (descMatch?.[1])
                desc = descMatch[1].trim();
        }
        translationCache.set(alert.id, { title, data: areas, desc });
    }
    if (translationCache.size > MAX_TRANSLATION_CACHE) {
        const excess = translationCache.size - MAX_TRANSLATION_CACHE;
        const iter = translationCache.keys();
        for (let i = 0; i < excess; i++) {
            const k = iter.next().value;
            if (k !== undefined)
                translationCache.delete(k);
        }
    }
}
function applyTranslations(alerts) {
    return alerts.map(a => {
        const cached = translationCache.get(a.id);
        if (cached)
            return { ...a, ...cached };
        return a;
    });
}
async function translateAlerts(alerts) {
    const untranslated = alerts.filter(a => !translationCache.has(a.id) && alertNeedsTranslation(a));
    if (!untranslated.length) {
        if (translationPromise)
            await translationPromise;
        return false;
    }
    if (translationPromise) {
        await translationPromise;
        return translateAlerts(alerts);
    }
    let translated = false;
    translationPromise = (async () => {
        try {
            const prompt = buildTranslationPrompt(untranslated);
            const result = await (0, summarization_1.translateText)(prompt, 'en');
            if (result) {
                parseTranslationResponse(result, untranslated);
                translated = true;
            }
        }
        catch (e) {
            console.warn('OREF alert translation failed', e);
        }
        finally {
            translationPromise = null;
        }
        return translated;
    })();
    await translationPromise;
    return translated;
}
function getOrefApiUrl(endpoint) {
    const base = (0, runtime_1.getApiBaseUrl)();
    const suffix = endpoint ? `?endpoint=${endpoint}` : '';
    return `${base}/api/oref-alerts${suffix}`;
}
async function fetchOrefAlerts() {
    const now = Date.now();
    if (cachedResponse && now - lastFetchAt < CACHE_TTL) {
        return { ...cachedResponse, alerts: applyTranslations(cachedResponse.alerts) };
    }
    try {
        const res = await fetch(getOrefApiUrl(), {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            return { configured: false, alerts: [], historyCount24h: 0, timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
        }
        const data = await res.json();
        cachedResponse = data;
        lastFetchAt = now;
        if (data.alerts.length) {
            translateAlerts(data.alerts).then((didTranslate) => {
                if (didTranslate) {
                    for (const cb of updateCallbacks)
                        cb({ ...data, alerts: applyTranslations(data.alerts) });
                }
            }).catch(() => { });
        }
        return { ...data, alerts: applyTranslations(data.alerts) };
    }
    catch (err) {
        return { configured: false, alerts: [], historyCount24h: 0, timestamp: new Date().toISOString(), error: String(err) };
    }
}
async function fetchOrefHistory() {
    try {
        const res = await fetch(getOrefApiUrl('history'), {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            return { configured: false, history: [], historyCount24h: 0, timestamp: new Date().toISOString(), error: `HTTP ${res.status}` };
        }
        return await res.json();
    }
    catch (err) {
        return { configured: false, history: [], historyCount24h: 0, timestamp: new Date().toISOString(), error: String(err) };
    }
}
function onOrefAlertsUpdate(cb) {
    updateCallbacks.push(cb);
}
function startOrefPolling() {
    if (pollingInterval)
        return;
    pollingInterval = setInterval(async () => {
        const data = await fetchOrefAlerts();
        for (const cb of updateCallbacks)
            cb(data);
    }, 10000);
}
function stopOrefPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    updateCallbacks = [];
}
