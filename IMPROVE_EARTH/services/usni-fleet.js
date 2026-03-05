"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUSNIFleetReport = fetchUSNIFleetReport;
exports.mergeUSNIWithAIS = mergeUSNIWithAIS;
exports.getUSNIFleetStatus = getUSNIFleetStatus;
const utils_1 = require("@/utils");
const military_1 = require("@/config/military");
const service_client_1 = require("@/generated/client/worldmonitor/military/v1/service_client");
const client = new service_client_1.MilitaryServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = (0, utils_1.createCircuitBreaker)({
    name: 'USNI Fleet Tracker',
    maxFailures: 3,
    cooldownMs: 10 * 60 * 1000,
    cacheTtlMs: 60 * 60 * 1000, // 1hr local cache
});
let lastReport = null;
let lastFetchTime = 0;
const LOCAL_CACHE_TTL = 60 * 60 * 1000; // 1 hour
function mapProtoToReport(resp) {
    const r = resp.report;
    if (!r)
        return null;
    const vessels = r.vessels.map((v) => ({
        name: v.name,
        hullNumber: v.hullNumber,
        vesselType: v.vesselType,
        region: v.region,
        regionLat: v.regionLat,
        regionLon: v.regionLon,
        deploymentStatus: v.deploymentStatus,
        homePort: v.homePort || undefined,
        strikeGroup: v.strikeGroup || undefined,
        activityDescription: v.activityDescription || undefined,
        usniArticleUrl: v.articleUrl,
        usniArticleDate: v.articleDate,
    }));
    return {
        articleUrl: r.articleUrl,
        articleDate: r.articleDate,
        articleTitle: r.articleTitle,
        battleForceSummary: r.battleForceSummary,
        vessels,
        strikeGroups: r.strikeGroups,
        regions: r.regions,
        parsingWarnings: r.parsingWarnings,
        timestamp: new Date(r.timestamp).toISOString(),
    };
}
async function fetchUSNIFleetReport() {
    if (lastReport && Date.now() - lastFetchTime < LOCAL_CACHE_TTL) {
        return lastReport;
    }
    const report = await breaker.execute(async () => {
        const resp = await client.getUSNIFleetReport({ forceRefresh: false });
        if (resp.error && !resp.report)
            return null;
        return mapProtoToReport(resp);
    }, null);
    if (report) {
        lastReport = report;
        lastFetchTime = Date.now();
    }
    return report;
}
function normalizeHull(hull) {
    if (!hull)
        return '';
    return hull.toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
}
function scatterOffset(hullNumber, index) {
    let hash = 0;
    const str = hullNumber || String(index);
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const angle = (hash % 360) * (Math.PI / 180);
    const dist = 0.2 + (Math.abs(hash) % 30) * 0.01;
    return { lat: Math.sin(angle) * dist, lon: Math.cos(angle) * dist };
}
function mergeUSNIWithAIS(aisVessels, usniReport, aisClusters = []) {
    // Keep merge pure so USNI enrichment does not mutate tracked AIS vessel objects.
    const merged = aisVessels.map((vessel) => ({ ...vessel }));
    const matchedHulls = new Set();
    // Pass 1: Enrich AIS vessels with USNI data
    for (const vessel of merged) {
        if (!vessel.hullNumber)
            continue;
        const aisHull = normalizeHull(vessel.hullNumber);
        for (const usniVessel of usniReport.vessels) {
            if (normalizeHull(usniVessel.hullNumber) === aisHull) {
                vessel.usniRegion = usniVessel.region;
                vessel.usniDeploymentStatus = usniVessel.deploymentStatus;
                vessel.usniStrikeGroup = usniVessel.strikeGroup;
                vessel.usniActivityDescription = usniVessel.activityDescription;
                vessel.usniArticleUrl = usniVessel.usniArticleUrl;
                vessel.usniArticleDate = usniVessel.usniArticleDate;
                matchedHulls.add(normalizeHull(usniVessel.hullNumber));
                break;
            }
        }
    }
    // Also try name matching for vessels without hull numbers
    for (const vessel of merged) {
        if (vessel.usniRegion)
            continue; // Already matched
        const aisName = vessel.name.replace(/^USS\s+/i, '').toUpperCase().trim();
        if (!aisName)
            continue;
        for (const usniVessel of usniReport.vessels) {
            if (matchedHulls.has(normalizeHull(usniVessel.hullNumber)))
                continue;
            const usniName = usniVessel.name.replace(/^USS\s+/i, '').replace(/^USNS\s+/i, '').toUpperCase().trim();
            if (aisName === usniName || aisName.includes(usniName) || usniName.includes(aisName)) {
                vessel.usniRegion = usniVessel.region;
                vessel.usniDeploymentStatus = usniVessel.deploymentStatus;
                vessel.usniStrikeGroup = usniVessel.strikeGroup;
                vessel.usniActivityDescription = usniVessel.activityDescription;
                vessel.usniArticleUrl = usniVessel.usniArticleUrl;
                vessel.usniArticleDate = usniVessel.usniArticleDate;
                matchedHulls.add(normalizeHull(usniVessel.hullNumber));
                break;
            }
        }
    }
    // Pass 2: Create synthetic vessels for unmatched USNI entries
    let syntheticIndex = 0;
    for (const usniVessel of usniReport.vessels) {
        if (matchedHulls.has(normalizeHull(usniVessel.hullNumber)))
            continue;
        const coords = (0, military_1.getUSNIRegionCoords)(usniVessel.region);
        const hasParsedCoords = Number.isFinite(usniVessel.regionLat)
            && Number.isFinite(usniVessel.regionLon)
            && !(usniVessel.regionLat === 0 && usniVessel.regionLon === 0);
        const fallbackCoords = (0, military_1.getUSNIRegionApproxCoords)(usniVessel.region);
        const baseLat = coords?.lat ?? (hasParsedCoords ? usniVessel.regionLat : fallbackCoords.lat);
        const baseLon = coords?.lon ?? (hasParsedCoords ? usniVessel.regionLon : fallbackCoords.lon);
        const offset = scatterOffset(usniVessel.hullNumber, syntheticIndex++);
        merged.push({
            id: `usni-${usniVessel.hullNumber || usniVessel.name}`,
            mmsi: '',
            name: usniVessel.name,
            vesselType: usniVessel.vesselType,
            hullNumber: usniVessel.hullNumber,
            operator: 'usn',
            operatorCountry: 'USA',
            lat: baseLat + offset.lat,
            lon: baseLon + offset.lon,
            heading: 0,
            speed: 0,
            lastAisUpdate: new Date(usniVessel.usniArticleDate),
            confidence: 'low',
            isInteresting: usniVessel.vesselType === 'carrier' || usniVessel.vesselType === 'amphibious',
            note: `USNI position — ${usniVessel.region} (approximate)`,
            usniRegion: usniVessel.region,
            usniDeploymentStatus: usniVessel.deploymentStatus,
            usniStrikeGroup: usniVessel.strikeGroup,
            usniActivityDescription: usniVessel.activityDescription,
            usniArticleUrl: usniVessel.usniArticleUrl,
            usniArticleDate: usniVessel.usniArticleDate,
            usniSource: true,
        });
    }
    // Pass 3: Keep existing AIS clusters and append USNI-specific operational clusters.
    const usniClusters = buildUSNIClusters(merged);
    const clusters = [...aisClusters, ...usniClusters];
    return { vessels: merged, clusters };
}
function buildUSNIClusters(vessels) {
    const regionGroups = new Map();
    for (const v of vessels) {
        const key = v.usniStrikeGroup || v.usniRegion;
        if (!key)
            continue;
        if (!regionGroups.has(key))
            regionGroups.set(key, []);
        regionGroups.get(key).push(v);
    }
    const clusters = [];
    for (const [name, groupVessels] of regionGroups) {
        if (groupVessels.length < 2)
            continue;
        const avgLat = groupVessels.reduce((s, v) => s + v.lat, 0) / groupVessels.length;
        const avgLon = groupVessels.reduce((s, v) => s + v.lon, 0) / groupVessels.length;
        const hasCarrier = groupVessels.some((v) => v.vesselType === 'carrier');
        clusters.push({
            id: `usni-cluster-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name: hasCarrier ? `${name} CSG` : `${name} Naval Group`,
            lat: avgLat,
            lon: avgLon,
            vesselCount: groupVessels.length,
            vessels: groupVessels,
            region: groupVessels[0]?.usniRegion || name,
            activityType: hasCarrier ? 'deployment' : 'transit',
        });
    }
    return clusters;
}
function getUSNIFleetStatus() {
    return breaker.getStatus();
}
