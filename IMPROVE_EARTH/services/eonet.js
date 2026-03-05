"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNaturalEventIcon = getNaturalEventIcon;
exports.fetchNaturalEvents = fetchNaturalEvents;
const gdacs_1 = require("./gdacs");
const EONET_API_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const CATEGORY_ICONS = {
    severeStorms: '🌀',
    wildfires: '🔥',
    volcanoes: '🌋',
    earthquakes: '🔴',
    floods: '🌊',
    landslides: '⛰️',
    drought: '☀️',
    dustHaze: '🌫️',
    snow: '❄️',
    tempExtremes: '🌡️',
    seaLakeIce: '🧊',
    waterColor: '🦠',
    manmade: '⚠️',
};
function getNaturalEventIcon(category) {
    return CATEGORY_ICONS[category] || '⚠️';
}
// Wildfires older than 48 hours are filtered out (stale data)
const WILDFIRE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const GDACS_TO_CATEGORY = {
    EQ: 'earthquakes',
    FL: 'floods',
    TC: 'severeStorms',
    VO: 'volcanoes',
    WF: 'wildfires',
    DR: 'drought',
};
function convertGDACSToNaturalEvent(gdacs) {
    const category = GDACS_TO_CATEGORY[gdacs.eventType] || 'manmade';
    return {
        id: gdacs.id,
        title: `${gdacs.alertLevel === 'Red' ? '🔴 ' : gdacs.alertLevel === 'Orange' ? '🟠 ' : ''}${gdacs.name}`,
        description: `${gdacs.description}${gdacs.severity ? ` - ${gdacs.severity}` : ''}`,
        category,
        categoryTitle: gdacs.description,
        lat: gdacs.coordinates[1],
        lon: gdacs.coordinates[0],
        date: gdacs.fromDate,
        sourceUrl: gdacs.url,
        sourceName: 'GDACS',
        closed: false,
    };
}
async function fetchNaturalEvents(days = 30) {
    const [eonetEvents, gdacsEvents] = await Promise.all([
        fetchEonetEvents(days),
        (0, gdacs_1.fetchGDACSEvents)(),
    ]);
    const gdacsConverted = gdacsEvents.map(convertGDACSToNaturalEvent);
    const seenLocations = new Set();
    const merged = [];
    for (const event of gdacsConverted) {
        const key = `${event.lat.toFixed(1)}-${event.lon.toFixed(1)}-${event.category}`;
        if (!seenLocations.has(key)) {
            seenLocations.add(key);
            merged.push(event);
        }
    }
    for (const event of eonetEvents) {
        const key = `${event.lat.toFixed(1)}-${event.lon.toFixed(1)}-${event.category}`;
        if (!seenLocations.has(key)) {
            seenLocations.add(key);
            merged.push(event);
        }
    }
    return merged;
}
async function fetchEonetEvents(days) {
    try {
        const url = `${EONET_API_URL}?status=open&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`EONET API error: ${response.status}`);
        }
        const data = await response.json();
        const events = [];
        const now = Date.now();
        for (const event of data.events) {
            const category = event.categories[0];
            if (!category)
                continue;
            // Skip earthquakes - USGS provides better data for seismic events
            if (category.id === 'earthquakes')
                continue;
            // Get most recent geometry point
            const latestGeo = event.geometry[event.geometry.length - 1];
            if (!latestGeo || latestGeo.type !== 'Point')
                continue;
            const eventDate = new Date(latestGeo.date);
            const [lon, lat] = latestGeo.coordinates;
            const source = event.sources[0];
            // Filter out wildfires older than 48 hours
            if (category.id === 'wildfires' && now - eventDate.getTime() > WILDFIRE_MAX_AGE_MS) {
                continue;
            }
            events.push({
                id: event.id,
                title: event.title,
                description: event.description || undefined,
                category: category.id,
                categoryTitle: category.title,
                lat,
                lon,
                date: eventDate,
                magnitude: latestGeo.magnitudeValue,
                magnitudeUnit: latestGeo.magnitudeUnit,
                sourceUrl: source?.url,
                sourceName: source?.id,
                closed: event.closed !== null,
            });
        }
        return events;
    }
    catch (error) {
        console.error('[EONET] Failed to fetch natural events:', error);
        return [];
    }
}
