"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEarthquakes = fetchEarthquakes;
const service_client_1 = require("@/generated/client/worldmonitor/seismology/v1/service_client");
const utils_1 = require("@/utils");
const bootstrap_1 = require("@/services/bootstrap");
const client = new service_client_1.SeismologyServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'Seismology', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const emptyFallback = { earthquakes: [] };
async function fetchEarthquakes() {
    const hydrated = (0, bootstrap_1.getHydratedData)('earthquakes');
    if (hydrated)
        return hydrated.earthquakes ?? [];
    const response = await breaker.execute(async () => {
        return client.listEarthquakes({ minMagnitude: 0, start: 0, end: 0, pageSize: 0, cursor: '' });
    }, emptyFallback);
    return response.earthquakes;
}
