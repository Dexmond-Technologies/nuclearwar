"use strict";
/**
 * Renewable energy data service -- fetches World Bank renewable electricity
 * indicator (EG.ELC.RNEW.ZS) for global + regional breakdown.
 *
 * Uses the existing getIndicatorData() RPC from the economic service
 * (World Bank API via sebuf proxy).
 *
 * World Bank indicator EG.ELC.RNEW.ZS ("Renewable electricity output as %
 * of total electricity output") is sourced FROM IEA Energy Statistics
 * (SE4ALL Global Tracking Framework). This fulfills the ENERGY-03
 * requirement for IEA-sourced data without needing IEA's paid API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRenewableEnergyData = fetchRenewableEnergyData;
exports.fetchEnergyCapacity = fetchEnergyCapacity;
const economic_1 = require("@/services/economic");
const utils_1 = require("@/utils");
// ---- Constants ----
// World Bank indicator for renewable electricity output as % of total
const INDICATOR_CODE = 'EG.ELC.RNEW.ZS';
// World Bank region codes for breakdown
const REGIONS = [
    { code: '1W', name: 'World' },
    { code: 'EAS', name: 'East Asia & Pacific' },
    { code: 'ECS', name: 'Europe & Central Asia' },
    { code: 'LCN', name: 'Latin America & Caribbean' },
    { code: 'MEA', name: 'Middle East & N. Africa' },
    { code: 'NAC', name: 'North America' },
    { code: 'SAS', name: 'South Asia' },
    { code: 'SSF', name: 'Sub-Saharan Africa' },
];
// ---- Default / Empty ----
// Static fallback when World Bank API is unavailable and no cache exists.
// Source: https://data.worldbank.org/indicator/EG.ELC.RNEW.ZS — last verified Feb 2026
const FALLBACK_DATA = {
    globalPercentage: 29.6,
    globalYear: 2022,
    historicalData: [
        { year: 1990, value: 19.8 }, { year: 1995, value: 19.2 }, { year: 2000, value: 18.6 },
        { year: 2005, value: 18.0 }, { year: 2010, value: 20.3 }, { year: 2012, value: 21.6 },
        { year: 2014, value: 22.6 }, { year: 2016, value: 24.0 }, { year: 2018, value: 25.7 },
        { year: 2020, value: 28.2 }, { year: 2021, value: 28.7 }, { year: 2022, value: 29.6 },
    ],
    regions: [
        { code: 'LCN', name: 'Latin America & Caribbean', percentage: 58.1, year: 2022 },
        { code: 'SSF', name: 'Sub-Saharan Africa', percentage: 47.2, year: 2022 },
        { code: 'ECS', name: 'Europe & Central Asia', percentage: 35.8, year: 2022 },
        { code: 'SAS', name: 'South Asia', percentage: 22.1, year: 2022 },
        { code: 'EAS', name: 'East Asia & Pacific', percentage: 21.9, year: 2022 },
        { code: 'NAC', name: 'North America', percentage: 21.5, year: 2022 },
        { code: 'MEA', name: 'Middle East & N. Africa', percentage: 5.3, year: 2022 },
    ],
};
// ---- Circuit Breaker (persistent cache for instant reload) ----
const renewableBreaker = (0, utils_1.createCircuitBreaker)({
    name: 'Renewable Energy',
    cacheTtlMs: 60 * 60 * 1000, // 1h — World Bank data changes yearly
    persistCache: true,
});
const capacityBreaker = (0, utils_1.createCircuitBreaker)({
    name: 'Energy Capacity',
    cacheTtlMs: 60 * 60 * 1000,
    persistCache: true,
});
// ---- Data Fetching ----
async function fetchRenewableEnergyDataFresh() {
    try {
        const response = await (0, economic_1.getIndicatorData)(INDICATOR_CODE, {
            countries: REGIONS.map(r => r.code),
            years: 35,
        });
        // --- Extract global (World = "WLD") data ---
        // World Bank API returns countryiso3code "WLD" for world aggregate (request code "1W").
        const worldData = response.byCountry['WLD'];
        if (!worldData || worldData.values.length === 0) {
            return FALLBACK_DATA;
        }
        // Build historical time-series, filtering out null/NaN values
        const historicalData = worldData.values
            .filter(v => v.value != null && Number.isFinite(v.value))
            .map(v => ({
            year: parseInt(v.year, 10),
            value: v.value,
        }))
            .filter(d => !isNaN(d.year))
            .sort((a, b) => a.year - b.year);
        if (historicalData.length === 0) {
            return FALLBACK_DATA;
        }
        const latest = historicalData[historicalData.length - 1];
        const globalPercentage = latest.value;
        const globalYear = latest.year;
        // --- Extract regional breakdown ---
        const regions = [];
        for (const region of REGIONS) {
            // Skip "World" -- it's already in globalPercentage
            if (region.code === '1W' || region.code === 'WLD')
                continue;
            try {
                const countryData = response.byCountry[region.code];
                if (!countryData || countryData.values.length === 0)
                    continue;
                // Find the most recent non-null value
                const validValues = countryData.values
                    .filter(v => v.value != null && Number.isFinite(v.value))
                    .map(v => ({
                    year: parseInt(v.year, 10),
                    value: v.value,
                }))
                    .filter(d => !isNaN(d.year))
                    .sort((a, b) => a.year - b.year);
                if (validValues.length === 0)
                    continue;
                const latestRegion = validValues[validValues.length - 1];
                regions.push({
                    code: region.code,
                    name: region.name,
                    percentage: latestRegion.value,
                    year: latestRegion.year,
                });
            }
            catch {
                // Individual region failure: skip that region (don't crash the whole fetch)
                continue;
            }
        }
        // Sort regions by percentage descending (highest renewable % first)
        regions.sort((a, b) => b.percentage - a.percentage);
        return {
            globalPercentage,
            globalYear,
            historicalData,
            regions,
        };
    }
    catch {
        return FALLBACK_DATA;
    }
}
/**
 * Fetch renewable energy data with persistent caching.
 * Returns instantly from IndexedDB cache on subsequent loads.
 */
async function fetchRenewableEnergyData() {
    return renewableBreaker.execute(() => fetchRenewableEnergyDataFresh(), FALLBACK_DATA);
}
/**
 * Fetch installed generation capacity for solar, wind, and coal from EIA.
 * Returns typed CapacitySeries[] ready for panel rendering.
 * Gracefully degrades: on failure returns empty array.
 */
async function fetchEnergyCapacity() {
    return capacityBreaker.execute(async () => {
        const resp = await (0, economic_1.fetchEnergyCapacityRpc)(['SUN', 'WND', 'COL'], 25);
        return resp.series.map(s => ({
            source: s.energySource,
            name: s.name,
            data: s.data.map(d => ({ year: d.year, capacityMw: d.capacityMw })),
        }));
    }, []);
}
