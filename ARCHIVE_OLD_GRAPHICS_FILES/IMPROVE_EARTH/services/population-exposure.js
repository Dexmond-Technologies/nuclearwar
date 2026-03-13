"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCountryPopulations = fetchCountryPopulations;
exports.fetchExposure = fetchExposure;
exports.enrichEventsWithExposure = enrichEventsWithExposure;
exports.formatPopulation = formatPopulation;
const utils_1 = require("@/utils");
const service_client_1 = require("@/generated/client/worldmonitor/displacement/v1/service_client");
const client = new service_client_1.DisplacementServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const countriesBreaker = (0, utils_1.createCircuitBreaker)({ name: 'WorldPop Countries', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
async function fetchCountryPopulations() {
    const result = await countriesBreaker.execute(async () => {
        return client.getPopulationExposure({ mode: 'countries', lat: 0, lon: 0, radius: 0 });
    }, { success: false, countries: [] });
    return result.countries;
}
async function fetchExposure(lat, lon, radiusKm) {
    try {
        const result = await client.getPopulationExposure({ mode: 'exposure', lat, lon, radius: radiusKm });
        if (!result.exposure)
            return null;
        return result.exposure;
    }
    catch {
        return null;
    }
}
function getRadiusForEventType(type) {
    switch (type) {
        case 'conflict':
        case 'battle':
        case 'state-based':
        case 'non-state':
        case 'one-sided':
            return 50;
        case 'earthquake':
            return 100;
        case 'flood':
            return 100;
        case 'fire':
        case 'wildfire':
            return 30;
        default:
            return 50;
    }
}
async function enrichEventsWithExposure(events) {
    const MAX_CONCURRENT = 10;
    const results = [];
    for (let i = 0; i < events.length; i += MAX_CONCURRENT) {
        const batch = events.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.allSettled(batch.map(async (event) => {
            const radius = getRadiusForEventType(event.type);
            const exposure = await fetchExposure(event.lat, event.lon, radius);
            if (!exposure)
                return null;
            return {
                eventId: event.id,
                eventName: event.name,
                eventType: event.type,
                lat: event.lat,
                lon: event.lon,
                exposedPopulation: exposure.exposedPopulation,
                exposureRadiusKm: radius,
            };
        }));
        for (const r of batchResults) {
            if (r.status === 'fulfilled' && r.value)
                results.push(r.value);
        }
    }
    return results.sort((a, b) => b.exposedPopulation - a.exposedPopulation);
}
function formatPopulation(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(0)}K`;
    return String(n);
}
