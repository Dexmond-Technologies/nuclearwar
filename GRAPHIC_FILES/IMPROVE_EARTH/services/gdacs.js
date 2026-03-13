"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGDACSEvents = fetchGDACSEvents;
exports.getGDACSStatus = getGDACSStatus;
exports.getEventTypeIcon = getEventTypeIcon;
exports.getAlertColor = getAlertColor;
const utils_1 = require("@/utils");
const GDACS_API = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP';
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'GDACS', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const EVENT_TYPE_NAMES = {
    EQ: 'Earthquake',
    FL: 'Flood',
    TC: 'Tropical Cyclone',
    VO: 'Volcano',
    WF: 'Wildfire',
    DR: 'Drought',
};
async function fetchGDACSEvents() {
    return breaker.execute(async () => {
        const response = await fetch(GDACS_API, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const seen = new Set();
        return data.features
            .filter(f => {
            if (!f.geometry || f.geometry.type !== 'Point')
                return false;
            const key = `${f.properties.eventtype}-${f.properties.eventid}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .filter(f => f.properties.alertlevel !== 'Green')
            .slice(0, 100)
            .map(f => ({
            id: `gdacs-${f.properties.eventtype}-${f.properties.eventid}`,
            eventType: f.properties.eventtype,
            name: f.properties.name,
            description: f.properties.description || EVENT_TYPE_NAMES[f.properties.eventtype] || f.properties.eventtype,
            alertLevel: f.properties.alertlevel,
            country: f.properties.country,
            coordinates: f.geometry.coordinates,
            fromDate: new Date(f.properties.fromdate),
            severity: f.properties.severitydata?.severitytext || '',
            url: f.properties.url?.report || '',
        }));
    }, []);
}
function getGDACSStatus() {
    return breaker.getStatus();
}
function getEventTypeIcon(type) {
    switch (type) {
        case 'EQ': return '🌍';
        case 'FL': return '🌊';
        case 'TC': return '🌀';
        case 'VO': return '🌋';
        case 'WF': return '🔥';
        case 'DR': return '☀️';
        default: return '⚠️';
    }
}
function getAlertColor(level) {
    switch (level) {
        case 'Red': return [255, 0, 0, 200];
        case 'Orange': return [255, 140, 0, 180];
        default: return [255, 200, 0, 160];
    }
}
