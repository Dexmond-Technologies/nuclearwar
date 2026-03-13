"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchShippingRates = fetchShippingRates;
exports.fetchChokepointStatus = fetchChokepointStatus;
exports.fetchCriticalMinerals = fetchCriticalMinerals;
const service_client_1 = require("@/generated/client/worldmonitor/supply_chain/v1/service_client");
const utils_1 = require("@/utils");
const bootstrap_1 = require("@/services/bootstrap");
const client = new service_client_1.SupplyChainServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const shippingBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Shipping Rates', cacheTtlMs: 15 * 60 * 1000, persistCache: true });
const chokepointBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Chokepoint Status', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const mineralsBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Critical Minerals', cacheTtlMs: 60 * 60 * 1000, persistCache: true });
const emptyShipping = { indices: [], fetchedAt: '', upstreamUnavailable: false };
const emptyChokepoints = { chokepoints: [], fetchedAt: '', upstreamUnavailable: false };
const emptyMinerals = { minerals: [], fetchedAt: '', upstreamUnavailable: false };
async function fetchShippingRates() {
    const hydrated = (0, bootstrap_1.getHydratedData)('shippingRates');
    if (hydrated)
        return hydrated;
    try {
        return await shippingBreaker.execute(async () => {
            return client.getShippingRates({});
        }, emptyShipping);
    }
    catch {
        return emptyShipping;
    }
}
async function fetchChokepointStatus() {
    const hydrated = (0, bootstrap_1.getHydratedData)('chokepoints');
    if (hydrated)
        return hydrated;
    try {
        return await chokepointBreaker.execute(async () => {
            return client.getChokepointStatus({});
        }, emptyChokepoints);
    }
    catch {
        return emptyChokepoints;
    }
}
async function fetchCriticalMinerals() {
    const hydrated = (0, bootstrap_1.getHydratedData)('minerals');
    if (hydrated)
        return hydrated;
    try {
        return await mineralsBreaker.execute(async () => {
            return client.getCriticalMinerals({});
        }, emptyMinerals);
    }
    catch {
        return emptyMinerals;
    }
}
