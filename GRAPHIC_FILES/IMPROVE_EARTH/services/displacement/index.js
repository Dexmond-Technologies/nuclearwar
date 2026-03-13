"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUnhcrPopulation = fetchUnhcrPopulation;
exports.getDisplacementColor = getDisplacementColor;
exports.getDisplacementBadge = getDisplacementBadge;
exports.formatPopulation = formatPopulation;
exports.getOriginCountries = getOriginCountries;
exports.getHostCountries = getHostCountries;
const service_client_1 = require("@/generated/client/worldmonitor/displacement/v1/service_client");
const utils_1 = require("@/utils");
// ─── Internal: proto -> legacy mapping ───
function toDisplaySummary(proto) {
    const s = proto.summary;
    const gt = s.globalTotals;
    return {
        year: s.year,
        globalTotals: {
            refugees: Number(gt.refugees),
            asylumSeekers: Number(gt.asylumSeekers),
            idps: Number(gt.idps),
            stateless: Number(gt.stateless),
            total: Number(gt.total),
        },
        countries: s.countries.map(toDisplayCountry),
        topFlows: s.topFlows.map(toDisplayFlow),
    };
}
function toDisplayCountry(proto) {
    return {
        code: proto.code,
        name: proto.name,
        refugees: Number(proto.refugees),
        asylumSeekers: Number(proto.asylumSeekers),
        idps: Number(proto.idps),
        stateless: Number(proto.stateless),
        totalDisplaced: Number(proto.totalDisplaced),
        hostRefugees: Number(proto.hostRefugees),
        hostAsylumSeekers: Number(proto.hostAsylumSeekers),
        hostTotal: Number(proto.hostTotal),
        lat: proto.location?.latitude,
        lon: proto.location?.longitude,
    };
}
function toDisplayFlow(proto) {
    return {
        originCode: proto.originCode,
        originName: proto.originName,
        asylumCode: proto.asylumCode,
        asylumName: proto.asylumName,
        refugees: Number(proto.refugees),
        originLat: proto.originLocation?.latitude,
        originLon: proto.originLocation?.longitude,
        asylumLat: proto.asylumLocation?.latitude,
        asylumLon: proto.asylumLocation?.longitude,
    };
}
// ─── Client + circuit breaker ───
const client = new service_client_1.DisplacementServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const emptyResult = {
    year: new Date().getFullYear(),
    globalTotals: { refugees: 0, asylumSeekers: 0, idps: 0, stateless: 0, total: 0 },
    countries: [],
    topFlows: [],
};
const breaker = (0, utils_1.createCircuitBreaker)({
    name: 'UNHCR Displacement',
    cacheTtlMs: 10 * 60 * 1000,
    persistCache: true,
});
// ─── Main fetch (public API) ───
async function fetchUnhcrPopulation() {
    const data = await breaker.execute(async () => {
        const response = await client.getDisplacementSummary({
            year: 0, // 0 = handler uses year fallback
            countryLimit: 0, // 0 = all countries
            flowLimit: 50, // top 50 flows (matching legacy)
        });
        return toDisplaySummary(response);
    }, emptyResult);
    return {
        ok: data !== emptyResult && data.countries.length > 0,
        data,
    };
}
// ─── Presentation helpers (copied verbatim from legacy src/services/unhcr.ts) ───
function getDisplacementColor(totalDisplaced) {
    if (totalDisplaced >= 1000000)
        return [255, 50, 50, 200];
    if (totalDisplaced >= 500000)
        return [255, 150, 0, 200];
    if (totalDisplaced >= 100000)
        return [255, 220, 0, 180];
    return [100, 200, 100, 150];
}
function getDisplacementBadge(totalDisplaced) {
    if (totalDisplaced >= 1000000)
        return { label: 'CRISIS', color: (0, utils_1.getCSSColor)('--semantic-critical') };
    if (totalDisplaced >= 500000)
        return { label: 'HIGH', color: (0, utils_1.getCSSColor)('--semantic-high') };
    if (totalDisplaced >= 100000)
        return { label: 'ELEVATED', color: (0, utils_1.getCSSColor)('--semantic-elevated') };
    return { label: '', color: '' };
}
function formatPopulation(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(0)}K`;
    return String(n);
}
function getOriginCountries(data) {
    return [...data.countries]
        .filter(c => c.refugees + c.asylumSeekers > 0)
        .sort((a, b) => (b.refugees + b.asylumSeekers) - (a.refugees + a.asylumSeekers));
}
function getHostCountries(data) {
    return [...data.countries]
        .filter(c => (c.hostTotal || 0) > 0)
        .sort((a, b) => (b.hostTotal || 0) - (a.hostTotal || 0));
}
