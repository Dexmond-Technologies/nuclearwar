"use strict";
/**
 * Unified economic service module -- replaces three legacy services:
 *   - src/services/fred.ts (FRED economic data)
 *   - src/services/oil-analytics.ts (EIA energy data)
 *   - src/services/worldbank.ts (World Bank indicators)
 *
 * All data now flows through the EconomicServiceClient RPC.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDICATOR_PRESETS = void 0;
exports.fetchFredData = fetchFredData;
exports.getFredStatus = getFredStatus;
exports.getChangeClass = getChangeClass;
exports.formatChange = formatChange;
exports.checkEiaStatus = checkEiaStatus;
exports.fetchOilAnalytics = fetchOilAnalytics;
exports.formatOilValue = formatOilValue;
exports.getTrendIndicator = getTrendIndicator;
exports.getTrendColor = getTrendColor;
exports.fetchEnergyCapacityRpc = fetchEnergyCapacityRpc;
exports.getAvailableIndicators = getAvailableIndicators;
exports.getIndicatorData = getIndicatorData;
exports.getTechReadinessRankings = getTechReadinessRankings;
exports.getCountryComparison = getCountryComparison;
exports.fetchBisData = fetchBisData;
const service_client_1 = require("@/generated/client/worldmonitor/economic/v1/service_client");
const utils_1 = require("@/utils");
const utils_2 = require("@/utils");
const runtime_config_1 = require("../runtime-config");
const data_freshness_1 = require("../data-freshness");
const bootstrap_1 = require("@/services/bootstrap");
// ---- Client + Circuit Breakers ----
const client = new service_client_1.EconomicServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const fredBreakers = new Map();
function getFredBreaker(seriesId) {
    if (!fredBreakers.has(seriesId)) {
        fredBreakers.set(seriesId, (0, utils_1.createCircuitBreaker)({
            name: `FRED:${seriesId}`,
            cacheTtlMs: 15 * 60 * 1000,
            persistCache: true,
        }));
    }
    return fredBreakers.get(seriesId);
}
const wbBreaker = (0, utils_1.createCircuitBreaker)({ name: 'World Bank', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const eiaBreaker = (0, utils_1.createCircuitBreaker)({ name: 'EIA Energy', cacheTtlMs: 15 * 60 * 1000, persistCache: true });
const capacityBreaker = (0, utils_1.createCircuitBreaker)({ name: 'EIA Capacity', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const bisPolicyBreaker = (0, utils_1.createCircuitBreaker)({ name: 'BIS Policy', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const bisEerBreaker = (0, utils_1.createCircuitBreaker)({ name: 'BIS EER', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const bisCreditBreaker = (0, utils_1.createCircuitBreaker)({ name: 'BIS Credit', cacheTtlMs: 30 * 60 * 1000, persistCache: true });
const emptyFredFallback = { series: undefined };
const emptyWbFallback = { data: [], pagination: undefined };
const emptyEiaFallback = { prices: [] };
const emptyCapacityFallback = { series: [] };
const emptyBisPolicyFallback = { rates: [] };
const emptyBisEerFallback = { rates: [] };
const emptyBisCreditFallback = { entries: [] };
const FRED_SERIES = [
    { id: 'WALCL', name: 'Fed Total Assets', unit: '$B', precision: 0 },
    { id: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%', precision: 2 },
    { id: 'T10Y2Y', name: '10Y-2Y Spread', unit: '%', precision: 2 },
    { id: 'UNRATE', name: 'Unemployment', unit: '%', precision: 1 },
    { id: 'CPIAUCSL', name: 'CPI Index', unit: '', precision: 1 },
    { id: 'DGS10', name: '10Y Treasury', unit: '%', precision: 2 },
    { id: 'VIXCLS', name: 'VIX', unit: '', precision: 2 },
];
async function fetchSingleFredSeries(config) {
    const resp = await getFredBreaker(config.id).execute(async () => {
        return client.getFredSeries({ seriesId: config.id, limit: 120 });
    }, emptyFredFallback);
    const obs = resp.series?.observations;
    if (!obs || obs.length === 0)
        return null;
    if (obs.length >= 2) {
        const latest = obs[obs.length - 1];
        const previous = obs[obs.length - 2];
        const change = latest.value - previous.value;
        const changePercent = (change / previous.value) * 100;
        let displayValue = latest.value;
        if (config.id === 'WALCL')
            displayValue = latest.value / 1000;
        return {
            id: config.id,
            name: config.name,
            value: Number(displayValue.toFixed(config.precision)),
            previousValue: Number(previous.value.toFixed(config.precision)),
            change: Number(change.toFixed(config.precision)),
            changePercent: Number(changePercent.toFixed(2)),
            date: latest.date,
            unit: config.unit,
        };
    }
    const latest = obs[0];
    let displayValue = latest.value;
    if (config.id === 'WALCL')
        displayValue = latest.value / 1000;
    return {
        id: config.id,
        name: config.name,
        value: Number(displayValue.toFixed(config.precision)),
        previousValue: null,
        change: null,
        changePercent: null,
        date: latest.date,
        unit: config.unit,
    };
}
async function fetchFredData() {
    if (!(0, runtime_config_1.isFeatureAvailable)('economicFred'))
        return [];
    const results = await Promise.all(FRED_SERIES.map(fetchSingleFredSeries));
    return results.filter((r) => r !== null);
}
function getFredStatus() {
    for (const breaker of fredBreakers.values()) {
        const status = breaker.getStatus();
        if (status !== 'ok')
            return status;
    }
    return fredBreakers.size > 0 ? 'ok' : 'no data';
}
function getChangeClass(change) {
    if (change === null)
        return '';
    if (change > 0)
        return 'positive';
    if (change < 0)
        return 'negative';
    return '';
}
function formatChange(change, unit) {
    if (change === null)
        return 'N/A';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}${unit}`;
}
function protoEnergyToOilMetric(proto) {
    const change = proto.change;
    return {
        id: proto.commodity,
        name: proto.name,
        description: `${proto.name} price/volume`,
        current: proto.price,
        previous: change !== 0 ? proto.price / (1 + change / 100) : proto.price,
        changePct: Math.round(change * 10) / 10,
        unit: proto.unit,
        trend: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
        lastUpdated: proto.priceAt ? new Date(proto.priceAt).toISOString() : new Date().toISOString(),
    };
}
async function checkEiaStatus() {
    if (!(0, runtime_config_1.isFeatureAvailable)('energyEia'))
        return false;
    try {
        const resp = await eiaBreaker.execute(async () => {
            return client.getEnergyPrices({ commodities: ['wti'] });
        }, emptyEiaFallback);
        return resp.prices.length > 0;
    }
    catch {
        return false;
    }
}
async function fetchOilAnalytics() {
    const empty = {
        wtiPrice: null, brentPrice: null, usProduction: null, usInventory: null, fetchedAt: new Date(),
    };
    if (!(0, runtime_config_1.isFeatureAvailable)('energyEia'))
        return empty;
    try {
        const resp = await eiaBreaker.execute(async () => {
            return client.getEnergyPrices({ commodities: [] }); // all commodities
        }, emptyEiaFallback);
        const byId = new Map();
        for (const p of resp.prices)
            byId.set(p.commodity, p);
        const result = {
            wtiPrice: byId.has('wti') ? protoEnergyToOilMetric(byId.get('wti')) : null,
            brentPrice: byId.has('brent') ? protoEnergyToOilMetric(byId.get('brent')) : null,
            usProduction: byId.has('production') ? protoEnergyToOilMetric(byId.get('production')) : null,
            usInventory: byId.has('inventory') ? protoEnergyToOilMetric(byId.get('inventory')) : null,
            fetchedAt: new Date(),
        };
        const metricCount = [result.wtiPrice, result.brentPrice, result.usProduction, result.usInventory]
            .filter(Boolean).length;
        if (metricCount > 0) {
            data_freshness_1.dataFreshness.recordUpdate('oil', metricCount);
        }
        return result;
    }
    catch {
        data_freshness_1.dataFreshness.recordError('oil', 'Fetch failed');
        return empty;
    }
}
function formatOilValue(value, unit) {
    const v = Number(value);
    if (!Number.isFinite(v))
        return '—';
    if (unit.includes('$'))
        return `$${v.toFixed(2)}`;
    if (v >= 1000)
        return `${(v / 1000).toFixed(1)}K`;
    return v.toFixed(1);
}
function getTrendIndicator(trend) {
    switch (trend) {
        case 'up': return '\u25B2';
        case 'down': return '\u25BC';
        default: return '\u25CF';
    }
}
function getTrendColor(trend, inverse = false) {
    const upColor = inverse ? (0, utils_2.getCSSColor)('--semantic-normal') : (0, utils_2.getCSSColor)('--semantic-critical');
    const downColor = inverse ? (0, utils_2.getCSSColor)('--semantic-critical') : (0, utils_2.getCSSColor)('--semantic-normal');
    switch (trend) {
        case 'up': return upColor;
        case 'down': return downColor;
        default: return (0, utils_2.getCSSColor)('--text-dim');
    }
}
// ========================================================================
// EIA Capacity -- installed generation capacity (solar, wind, coal)
// ========================================================================
async function fetchEnergyCapacityRpc(energySources, years) {
    if (!(0, runtime_config_1.isFeatureAvailable)('energyEia'))
        return emptyCapacityFallback;
    try {
        return await capacityBreaker.execute(async () => {
            return client.getEnergyCapacity({
                energySources: energySources ?? [],
                years: years ?? 0,
            });
        }, emptyCapacityFallback);
    }
    catch {
        return emptyCapacityFallback;
    }
}
const TECH_INDICATORS = {
    'IT.NET.USER.ZS': 'Internet Users (% of population)',
    'IT.CEL.SETS.P2': 'Mobile Subscriptions (per 100 people)',
    'IT.NET.BBND.P2': 'Fixed Broadband Subscriptions (per 100 people)',
    'IT.NET.SECR.P6': 'Secure Internet Servers (per million people)',
    'GB.XPD.RSDV.GD.ZS': 'R&D Expenditure (% of GDP)',
    'IP.PAT.RESD': 'Patent Applications (residents)',
    'IP.PAT.NRES': 'Patent Applications (non-residents)',
    'IP.TMK.TOTL': 'Trademark Applications',
    'TX.VAL.TECH.MF.ZS': 'High-Tech Exports (% of manufactured exports)',
    'BX.GSR.CCIS.ZS': 'ICT Service Exports (% of service exports)',
    'TM.VAL.ICTG.ZS.UN': 'ICT Goods Imports (% of total goods imports)',
    'SE.TER.ENRR': 'Tertiary Education Enrollment (%)',
    'SE.XPD.TOTL.GD.ZS': 'Education Expenditure (% of GDP)',
    'NY.GDP.MKTP.KD.ZG': 'GDP Growth (annual %)',
    'NY.GDP.PCAP.CD': 'GDP per Capita (current US$)',
    'NE.EXP.GNFS.ZS': 'Exports of Goods & Services (% of GDP)',
};
const TECH_COUNTRIES = [
    'USA', 'CHN', 'JPN', 'DEU', 'KOR', 'GBR', 'IND', 'ISR', 'SGP', 'TWN',
    'FRA', 'CAN', 'SWE', 'NLD', 'CHE', 'FIN', 'IRL', 'AUS', 'BRA', 'IDN',
    'ARE', 'SAU', 'QAT', 'BHR', 'EGY', 'TUR',
    'MYS', 'THA', 'VNM', 'PHL',
    'ESP', 'ITA', 'POL', 'CZE', 'DNK', 'NOR', 'AUT', 'BEL', 'PRT', 'EST',
    'MEX', 'ARG', 'CHL', 'COL',
    'ZAF', 'NGA', 'KEN',
];
async function getAvailableIndicators() {
    return { indicators: TECH_INDICATORS, defaultCountries: TECH_COUNTRIES };
}
function buildWorldBankResponse(indicator, records) {
    const byCountry = {};
    const latestByCountry = {};
    const timeSeries = [];
    const indicatorName = records[0]?.indicatorName || TECH_INDICATORS[indicator] || indicator;
    for (const r of records) {
        const cc = r.countryCode;
        if (!cc)
            continue;
        const yearStr = String(r.year);
        if (!byCountry[cc]) {
            byCountry[cc] = { code: cc, name: r.countryName, values: [] };
        }
        byCountry[cc].values.push({ year: yearStr, value: r.value });
        if (!latestByCountry[cc] || yearStr > latestByCountry[cc].year) {
            latestByCountry[cc] = { code: cc, name: r.countryName, year: yearStr, value: r.value };
        }
        timeSeries.push({
            countryCode: cc,
            countryName: r.countryName,
            year: yearStr,
            value: r.value,
        });
    }
    // Sort values oldest first
    for (const c of Object.values(byCountry)) {
        c.values.sort((a, b) => a.year.localeCompare(b.year));
    }
    timeSeries.sort((a, b) => b.year.localeCompare(a.year) || a.countryCode.localeCompare(b.countryCode));
    return {
        indicator,
        indicatorName,
        metadata: { page: 1, pages: 1, total: records.length },
        byCountry,
        latestByCountry,
        timeSeries,
    };
}
async function getIndicatorData(indicator, options = {}) {
    const { countries, years = 5 } = options;
    const resp = await wbBreaker.execute(async () => {
        return client.listWorldBankIndicators({
            indicatorCode: indicator,
            countryCode: countries?.join(';') || '',
            year: years,
            pageSize: 0,
            cursor: '',
        });
    }, emptyWbFallback);
    return buildWorldBankResponse(indicator, resp.data);
}
exports.INDICATOR_PRESETS = {
    digitalInfrastructure: [
        'IT.NET.USER.ZS',
        'IT.CEL.SETS.P2',
        'IT.NET.BBND.P2',
        'IT.NET.SECR.P6',
    ],
    innovation: [
        'GB.XPD.RSDV.GD.ZS',
        'IP.PAT.RESD',
        'IP.PAT.NRES',
    ],
    techTrade: [
        'TX.VAL.TECH.MF.ZS',
        'BX.GSR.CCIS.ZS',
    ],
    education: [
        'SE.TER.ENRR',
        'SE.XPD.TOTL.GD.ZS',
    ],
};
async function getTechReadinessRankings(countries) {
    const [internet, mobile, broadband, rdSpend] = await Promise.all([
        getIndicatorData('IT.NET.USER.ZS', { countries, years: 5 }),
        getIndicatorData('IT.CEL.SETS.P2', { countries, years: 5 }),
        getIndicatorData('IT.NET.BBND.P2', { countries, years: 5 }),
        getIndicatorData('GB.XPD.RSDV.GD.ZS', { countries, years: 7 }),
    ]);
    const allCountries = new Set();
    [internet, mobile, broadband, rdSpend].forEach((data) => {
        Object.keys(data.latestByCountry).forEach((c) => allCountries.add(c));
    });
    const normalize = (val, max) => {
        if (val === undefined || val === null)
            return null;
        return Math.min(100, (val / max) * 100);
    };
    const scores = [];
    for (const countryCode of allCountries) {
        const components = {
            internet: normalize(internet.latestByCountry[countryCode]?.value, 100),
            mobile: normalize(mobile.latestByCountry[countryCode]?.value, 150),
            broadband: normalize(broadband.latestByCountry[countryCode]?.value, 50),
            rdSpend: normalize(rdSpend.latestByCountry[countryCode]?.value, 5),
        };
        const weights = { internet: 30, mobile: 15, broadband: 20, rdSpend: 35 };
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [key, weight] of Object.entries(weights)) {
            const val = components[key];
            if (val !== null) {
                weightedSum += val * weight;
                totalWeight += weight;
            }
        }
        const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const countryName = internet.latestByCountry[countryCode]?.name ||
            mobile.latestByCountry[countryCode]?.name ||
            countryCode;
        scores.push({
            country: countryCode,
            countryName,
            score: Math.round(score * 10) / 10,
            rank: 0,
            components,
        });
    }
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => { s.rank = i + 1; });
    return scores;
}
async function getCountryComparison(indicator, countryCodes) {
    return getIndicatorData(indicator, { countries: countryCodes, years: 10 });
}
async function fetchBisData() {
    const empty = { policyRates: [], exchangeRates: [], creditToGdp: [], fetchedAt: new Date() };
    const hPolicy = (0, bootstrap_1.getHydratedData)('bisPolicy');
    const hEer = (0, bootstrap_1.getHydratedData)('bisExchange');
    const hCredit = (0, bootstrap_1.getHydratedData)('bisCredit');
    try {
        const [policy, eer, credit] = await Promise.all([
            hPolicy ? Promise.resolve(hPolicy) : bisPolicyBreaker.execute(() => client.getBisPolicyRates({}), emptyBisPolicyFallback),
            hEer ? Promise.resolve(hEer) : bisEerBreaker.execute(() => client.getBisExchangeRates({}), emptyBisEerFallback),
            hCredit ? Promise.resolve(hCredit) : bisCreditBreaker.execute(() => client.getBisCredit({}), emptyBisCreditFallback),
        ]);
        return {
            policyRates: policy.rates,
            exchangeRates: eer.rates,
            creditToGdp: credit.entries,
            fetchedAt: new Date(),
        };
    }
    catch {
        return empty;
    }
}
