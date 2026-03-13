"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllFires = fetchAllFires;
exports.computeRegionStats = computeRegionStats;
exports.flattenFires = flattenFires;
exports.toMapFires = toMapFires;
const service_client_1 = require("@/generated/client/worldmonitor/wildfire/v1/service_client");
const utils_1 = require("@/utils");
const bootstrap_1 = require("@/services/bootstrap");
// -- Client --
const client = new service_client_1.WildfireServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'Wildfires', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const emptyFallback = { fireDetections: [] };
// -- Public API --
async function fetchAllFires(_days) {
    const hydrated = (0, bootstrap_1.getHydratedData)('wildfires');
    const response = hydrated ?? await breaker.execute(async () => {
        return client.listFireDetections({ start: 0, end: 0, pageSize: 0, cursor: '', neLat: 0, neLon: 0, swLat: 0, swLon: 0 });
    }, emptyFallback);
    const detections = response.fireDetections;
    if (detections.length === 0) {
        return { regions: {}, totalCount: 0, skipped: true, reason: 'NASA_FIRMS_API_KEY not configured' };
    }
    const regions = {};
    for (const d of detections) {
        const r = d.region || 'Unknown';
        (regions[r] ?? (regions[r] = [])).push(d);
    }
    return { regions, totalCount: detections.length };
}
function computeRegionStats(regions) {
    const stats = [];
    for (const [region, fires] of Object.entries(regions)) {
        const highIntensity = fires.filter(f => f.brightness > 360 && f.confidence === 'FIRE_CONFIDENCE_HIGH');
        stats.push({
            region,
            fires,
            fireCount: fires.length,
            totalFrp: fires.reduce((sum, f) => sum + (f.frp || 0), 0),
            highIntensityCount: highIntensity.length,
        });
    }
    return stats.sort((a, b) => b.fireCount - a.fireCount);
}
function flattenFires(regions) {
    const all = [];
    for (const fires of Object.values(regions)) {
        for (const f of fires) {
            all.push(f);
        }
    }
    return all;
}
function toMapFires(fires) {
    return fires.map(f => ({
        lat: f.location?.latitude ?? 0,
        lon: f.location?.longitude ?? 0,
        brightness: f.brightness,
        frp: f.frp,
        confidence: confidenceToNumber(f.confidence),
        region: f.region,
        acq_date: new Date(f.detectedAt).toISOString().slice(0, 10),
        daynight: f.dayNight,
    }));
}
function confidenceToNumber(c) {
    switch (c) {
        case 'FIRE_CONFIDENCE_HIGH': return 95;
        case 'FIRE_CONFIDENCE_NOMINAL': return 50;
        case 'FIRE_CONFIDENCE_LOW': return 20;
        default: return 0;
    }
}
