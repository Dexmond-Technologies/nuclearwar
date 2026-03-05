"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWeatherAlerts = fetchWeatherAlerts;
exports.getWeatherStatus = getWeatherStatus;
exports.getSeverityColor = getSeverityColor;
const utils_1 = require("@/utils");
const NWS_API = 'https://api.weather.gov/alerts/active';
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'NWS Weather', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
async function fetchWeatherAlerts() {
    return breaker.execute(async () => {
        const response = await fetch(NWS_API, {
            headers: { 'User-Agent': 'WorldMonitor/1.0' }
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.features
            .filter(alert => alert.properties.severity !== 'Unknown')
            .slice(0, 50)
            .map(alert => {
            const coords = extractCoordinates(alert.geometry);
            return {
                id: alert.id,
                event: alert.properties.event,
                severity: alert.properties.severity,
                headline: alert.properties.headline,
                description: alert.properties.description?.slice(0, 500) || '',
                areaDesc: alert.properties.areaDesc,
                onset: new Date(alert.properties.onset),
                expires: new Date(alert.properties.expires),
                coordinates: coords,
                centroid: calculateCentroid(coords),
            };
        });
    }, []);
}
function getWeatherStatus() {
    return breaker.getStatus();
}
function extractCoordinates(geometry) {
    if (!geometry)
        return [];
    try {
        if (geometry.type === 'Polygon') {
            const coords = geometry.coordinates;
            return coords[0]?.map(c => [c[0], c[1]]) || [];
        }
        if (geometry.type === 'MultiPolygon') {
            const coords = geometry.coordinates;
            return coords[0]?.[0]?.map(c => [c[0], c[1]]) || [];
        }
    }
    catch {
        return [];
    }
    return [];
}
function calculateCentroid(coords) {
    if (coords.length === 0)
        return undefined;
    const sum = coords.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
    return [sum[0] / coords.length, sum[1] / coords.length];
}
function getSeverityColor(severity) {
    switch (severity) {
        case 'Extreme': return (0, utils_1.getCSSColor)('--semantic-critical');
        case 'Severe': return (0, utils_1.getCSSColor)('--semantic-high');
        case 'Moderate': return (0, utils_1.getCSSColor)('--semantic-elevated');
        case 'Minor': return (0, utils_1.getCSSColor)('--semantic-elevated');
        default: return (0, utils_1.getCSSColor)('--text-dim');
    }
}
