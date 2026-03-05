"use strict";
/**
 * Cached Risk Scores Service
 * Fetches pre-computed CII and Strategic Risk scores from backend via sebuf RPC.
 * Eliminates 15-minute learning mode for users.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCachedRiskScores = fetchCachedRiskScores;
exports.getCachedScores = getCachedScores;
exports.hasCachedScores = hasCachedScores;
exports.toCountryScore = toCountryScore;
const country_instability_1 = require("./country-instability");
const persistent_cache_1 = require("./persistent-cache");
const service_client_1 = require("@/generated/client/worldmonitor/intelligence/v1/service_client");
// ---- Sebuf client ----
const client = new service_client_1.IntelligenceServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
// ---- Proto → legacy adapters ----
const TIER1_NAMES = {
    US: 'United States', RU: 'Russia', CN: 'China', UA: 'Ukraine', IR: 'Iran',
    IL: 'Israel', TW: 'Taiwan', KP: 'North Korea', SA: 'Saudi Arabia', TR: 'Turkey',
    PL: 'Poland', DE: 'Germany', FR: 'France', GB: 'United Kingdom', IN: 'India',
    PK: 'Pakistan', SY: 'Syria', YE: 'Yemen', MM: 'Myanmar', VE: 'Venezuela',
};
const TREND_REVERSE = {
    TREND_DIRECTION_RISING: 'rising',
    TREND_DIRECTION_STABLE: 'stable',
    TREND_DIRECTION_FALLING: 'falling',
};
const SEVERITY_REVERSE = {
    SEVERITY_LEVEL_HIGH: 'high',
    SEVERITY_LEVEL_MEDIUM: 'medium',
    SEVERITY_LEVEL_LOW: 'low',
};
function getScoreLevel(score) {
    if (score >= 70)
        return 'critical';
    if (score >= 55)
        return 'high';
    if (score >= 40)
        return 'elevated';
    if (score >= 25)
        return 'normal';
    return 'low';
}
function toCachedCII(proto) {
    return {
        code: proto.region,
        name: TIER1_NAMES[proto.region] || proto.region,
        score: proto.combinedScore,
        level: getScoreLevel(proto.combinedScore),
        trend: TREND_REVERSE[proto.trend] || 'stable',
        change24h: proto.dynamicScore,
        components: {
            unrest: proto.components?.ciiContribution ?? 0,
            conflict: proto.components?.geoConvergence ?? 0,
            security: proto.components?.militaryActivity ?? 0,
            information: proto.components?.newsActivity ?? 0,
        },
        lastUpdated: proto.computedAt ? new Date(proto.computedAt).toISOString() : new Date().toISOString(),
    };
}
function toCachedStrategicRisk(risks, ciiScores) {
    const global = risks[0];
    const ciiMap = new Map(ciiScores.map((s) => [s.region, s]));
    return {
        score: global?.score ?? 0,
        level: SEVERITY_REVERSE[global?.level ?? ''] || 'low',
        trend: TREND_REVERSE[global?.trend ?? ''] || 'stable',
        lastUpdated: new Date().toISOString(),
        contributors: (global?.factors ?? []).map((code) => {
            const cii = ciiMap.get(code);
            return {
                country: TIER1_NAMES[code] || code,
                code,
                score: cii?.combinedScore ?? 0,
                level: cii ? getScoreLevel(cii.combinedScore) : 'low',
            };
        }),
    };
}
function toRiskScores(resp) {
    return {
        cii: resp.ciiScores.map(toCachedCII),
        strategicRisk: toCachedStrategicRisk(resp.strategicRisks, resp.ciiScores),
        protestCount: 0,
        computedAt: new Date().toISOString(),
        cached: true,
    };
}
// ---- Caching / dedup logic (unchanged) ----
const RISK_CACHE_KEY = 'risk-scores:latest';
let cachedScores = null;
let fetchPromise = null;
let lastFetchTime = 0;
const REFETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
function createAbortError() {
    return new DOMException('The operation was aborted.', 'AbortError');
}
function withCallerAbort(promise, signal) {
    if (!signal)
        return promise;
    if (signal.aborted)
        return Promise.reject(createAbortError());
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            signal.removeEventListener('abort', onAbort);
            reject(createAbortError());
        };
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then((value) => {
            signal.removeEventListener('abort', onAbort);
            resolve(value);
        }, (error) => {
            signal.removeEventListener('abort', onAbort);
            reject(error);
        });
    });
}
async function loadPersistentRiskScores() {
    const entry = await (0, persistent_cache_1.getPersistentCache)(RISK_CACHE_KEY);
    return entry?.data ?? null;
}
async function fetchCachedRiskScores(signal) {
    if (signal?.aborted)
        throw createAbortError();
    const now = Date.now();
    if (cachedScores && now - lastFetchTime < REFETCH_INTERVAL_MS) {
        return cachedScores;
    }
    if (fetchPromise) {
        return withCallerAbort(fetchPromise, signal);
    }
    fetchPromise = (async () => {
        try {
            const resp = await client.getRiskScores({ region: '' });
            const data = toRiskScores(resp);
            cachedScores = data;
            lastFetchTime = now;
            (0, country_instability_1.setHasCachedScores)(true);
            void (0, persistent_cache_1.setPersistentCache)(RISK_CACHE_KEY, data);
            return cachedScores;
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                throw error;
            console.error('[CachedRiskScores] Fetch error:', error);
            return cachedScores ?? await loadPersistentRiskScores();
        }
        finally {
            fetchPromise = null;
        }
    })();
    return withCallerAbort(fetchPromise, signal);
}
function getCachedScores() {
    return cachedScores;
}
function hasCachedScores() {
    return cachedScores !== null;
}
function toCountryScore(cached) {
    return {
        code: cached.code,
        name: cached.name,
        score: cached.score,
        level: cached.level,
        trend: cached.trend,
        change24h: cached.change24h,
        components: cached.components,
        lastUpdated: new Date(cached.lastUpdated),
    };
}
