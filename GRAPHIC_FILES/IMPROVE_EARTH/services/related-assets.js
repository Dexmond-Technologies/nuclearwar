"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DISTANCE_KM = void 0;
exports.getClusterAssetContext = getClusterAssetContext;
exports.getAssetLabel = getAssetLabel;
exports.getNearbyInfrastructure = getNearbyInfrastructure;
exports.haversineDistanceKm = haversineDistanceKm;
const keyword_match_1 = require("@/utils/keyword-match");
const i18n_1 = require("@/services/i18n");
const config_1 = require("@/config");
const MAX_DISTANCE_KM = 600;
exports.MAX_DISTANCE_KM = MAX_DISTANCE_KM;
const MAX_ASSETS_PER_TYPE = 3;
const ASSET_KEYWORDS = {
    pipeline: ['pipeline', 'oil pipeline', 'gas pipeline', 'fuel pipeline', 'pipeline leak', 'pipeline spill'],
    cable: ['cable', 'undersea cable', 'subsea cable', 'fiber cable', 'fiber optic', 'internet cable'],
    datacenter: ['datacenter', 'data center', 'server farm', 'colocation', 'hyperscale'],
    base: ['military base', 'airbase', 'naval base', 'base', 'garrison'],
    nuclear: ['nuclear', 'reactor', 'uranium', 'enrichment', 'nuclear plant'],
};
function detectAssetTypes(titles) {
    const tokenized = titles.map(t => (0, keyword_match_1.tokenizeForMatch)(t));
    const types = Object.entries(ASSET_KEYWORDS)
        .filter(([, keywords]) => tokenized.some(tokens => keywords.some(keyword => (0, keyword_match_1.matchKeyword)(tokens, keyword))))
        .map(([type]) => type);
    return types;
}
function countKeywordMatches(titles, keywords) {
    const tokenized = titles.map(t => (0, keyword_match_1.tokenizeForMatch)(t));
    return keywords.reduce((count, keyword) => {
        return count + tokenized.filter(tokens => (0, keyword_match_1.matchKeyword)(tokens, keyword)).length;
    }, 0);
}
function inferOrigin(titles) {
    const hotspotCandidates = config_1.INTEL_HOTSPOTS.map((hotspot) => ({
        label: hotspot.name,
        lat: hotspot.lat,
        lon: hotspot.lon,
        score: countKeywordMatches(titles, hotspot.keywords),
    })).filter(candidate => candidate.score > 0);
    const conflictCandidates = config_1.CONFLICT_ZONES.map((conflict) => ({
        label: conflict.name,
        lat: conflict.center[1],
        lon: conflict.center[0],
        score: countKeywordMatches(titles, conflict.keywords ?? []),
    })).filter(candidate => candidate.score > 0);
    const allCandidates = [...hotspotCandidates, ...conflictCandidates];
    if (allCandidates.length === 0)
        return null;
    return allCandidates.sort((a, b) => b.score - a.score)[0] ?? null;
}
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const originLat = toRad(lat1);
    const destLat = toRad(lat2);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(originLat) * Math.cos(destLat) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
}
function midpoint(points) {
    if (points.length === 0)
        return null;
    const mid = points[Math.floor(points.length / 2)];
    return { lon: mid[0], lat: mid[1] };
}
function buildAssetIndex(type) {
    switch (type) {
        case 'pipeline':
            return config_1.PIPELINES.map(pipeline => {
                const mid = midpoint(pipeline.points);
                if (!mid)
                    return null;
                return { id: pipeline.id, name: pipeline.name, lat: mid.lat, lon: mid.lon };
            });
        case 'cable':
            return config_1.UNDERSEA_CABLES.map(cable => {
                const mid = midpoint(cable.points);
                if (!mid)
                    return null;
                return { id: cable.id, name: cable.name, lat: mid.lat, lon: mid.lon };
            });
        case 'datacenter':
            return config_1.AI_DATA_CENTERS.map(dc => ({ id: dc.id, name: dc.name, lat: dc.lat, lon: dc.lon }));
        case 'base':
            return config_1.MILITARY_BASES.map(base => ({ id: base.id, name: base.name, lat: base.lat, lon: base.lon }));
        case 'nuclear':
            return config_1.NUCLEAR_FACILITIES.map(site => ({ id: site.id, name: site.name, lat: site.lat, lon: site.lon }));
        default:
            return [];
    }
}
function findNearbyAssets(origin, types) {
    const results = [];
    types.forEach((type) => {
        const candidates = buildAssetIndex(type)
            .filter((asset) => !!asset)
            .map((asset) => ({
            ...asset,
            distanceKm: haversineDistanceKm(origin.lat, origin.lon, asset.lat, asset.lon),
        }))
            .filter(asset => asset.distanceKm <= MAX_DISTANCE_KM)
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, MAX_ASSETS_PER_TYPE);
        candidates.forEach(candidate => {
            results.push({
                id: candidate.id,
                name: candidate.name,
                type,
                distanceKm: candidate.distanceKm,
            });
        });
    });
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
function getClusterAssetContext(cluster) {
    const titles = cluster.allItems.map(item => item.title);
    const types = detectAssetTypes(titles);
    if (types.length === 0)
        return null;
    const origin = inferOrigin(titles);
    if (!origin)
        return null;
    const assets = findNearbyAssets(origin, types);
    return { origin, assets, types };
}
function getAssetLabel(type) {
    return (0, i18n_1.t)(`components.relatedAssets.${type}`);
}
function getNearbyInfrastructure(lat, lon, types) {
    return findNearbyAssets({ lat, lon, label: 'country-centroid' }, types);
}
