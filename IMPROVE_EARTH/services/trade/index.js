"use strict";
/**
 * Trade policy intelligence service -- WTO data sources.
 * Trade restrictions, tariff trends, trade flows, and SPS/TBT barriers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTradeRestrictions = fetchTradeRestrictions;
exports.fetchTariffTrends = fetchTariffTrends;
exports.fetchTradeFlows = fetchTradeFlows;
exports.fetchTradeBarriers = fetchTradeBarriers;
const service_client_1 = require("@/generated/client/worldmonitor/trade/v1/service_client");
const utils_1 = require("@/utils");
const runtime_config_1 = require("../runtime-config");
const client = new service_client_1.TradeServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const restrictionsBreaker = (0, utils_1.createCircuitBreaker)({ name: 'WTO Restrictions', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const tariffsBreaker = (0, utils_1.createCircuitBreaker)({ name: 'WTO Tariffs', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const flowsBreaker = (0, utils_1.createCircuitBreaker)({ name: 'WTO Flows', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const barriersBreaker = (0, utils_1.createCircuitBreaker)({ name: 'WTO Barriers', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const emptyRestrictions = { restrictions: [], fetchedAt: '', upstreamUnavailable: false };
const emptyTariffs = { datapoints: [], fetchedAt: '', upstreamUnavailable: false };
const emptyFlows = { flows: [], fetchedAt: '', upstreamUnavailable: false };
const emptyBarriers = { barriers: [], fetchedAt: '', upstreamUnavailable: false };
async function fetchTradeRestrictions(countries = [], limit = 50) {
    if (!(0, runtime_config_1.isFeatureAvailable)('wtoTrade'))
        return emptyRestrictions;
    try {
        return await restrictionsBreaker.execute(async () => {
            return client.getTradeRestrictions({ countries, limit });
        }, emptyRestrictions);
    }
    catch {
        return emptyRestrictions;
    }
}
async function fetchTariffTrends(reportingCountry, partnerCountry, productSector = '', years = 10) {
    if (!(0, runtime_config_1.isFeatureAvailable)('wtoTrade'))
        return emptyTariffs;
    try {
        return await tariffsBreaker.execute(async () => {
            return client.getTariffTrends({ reportingCountry, partnerCountry, productSector, years });
        }, emptyTariffs);
    }
    catch {
        return emptyTariffs;
    }
}
async function fetchTradeFlows(reportingCountry, partnerCountry, years = 10) {
    if (!(0, runtime_config_1.isFeatureAvailable)('wtoTrade'))
        return emptyFlows;
    try {
        return await flowsBreaker.execute(async () => {
            return client.getTradeFlows({ reportingCountry, partnerCountry, years });
        }, emptyFlows);
    }
    catch {
        return emptyFlows;
    }
}
async function fetchTradeBarriers(countries = [], measureType = '', limit = 50) {
    if (!(0, runtime_config_1.isFeatureAvailable)('wtoTrade'))
        return emptyBarriers;
    try {
        return await barriersBreaker.execute(async () => {
            return client.getTradeBarriers({ countries, measureType, limit });
        }, emptyBarriers);
    }
    catch {
        return emptyBarriers;
    }
}
