"use strict";
/**
 * Client-side service for positive geo events.
 * Fetches geocoded positive news from server-side GDELT GEO RPC
 * and geocodes curated RSS items via inferGeoHubsFromTitle.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPositiveGeoEvents = fetchPositiveGeoEvents;
exports.geocodePositiveNewsItems = geocodePositiveNewsItems;
const service_client_1 = require("@/generated/client/worldmonitor/positive_events/v1/service_client");
const geo_hub_index_1 = require("./geo-hub-index");
const utils_1 = require("@/utils");
const client = new service_client_1.PositiveEventsServiceClient('', {
    fetch: (...args) => globalThis.fetch(...args),
});
const breaker = (0, utils_1.createCircuitBreaker)({
    name: 'Positive Geo Events',
    cacheTtlMs: 10 * 60 * 1000, // 10min — GDELT data refreshes frequently
    persistCache: true,
});
/**
 * Fetch geocoded positive events from server-side GDELT GEO RPC.
 * Returns instantly from IndexedDB cache on subsequent loads.
 */
async function fetchPositiveGeoEvents() {
    return breaker.execute(async () => {
        const response = await client.listPositiveGeoEvents({});
        return response.events.map(event => ({
            lat: event.latitude,
            lon: event.longitude,
            name: event.name,
            category: (event.category || 'humanity-kindness'),
            count: event.count,
            timestamp: event.timestamp,
        }));
    }, []);
}
/**
 * Geocode curated RSS items using the geo-hub keyword index.
 * Items without location mentions in their titles are filtered out.
 */
function geocodePositiveNewsItems(items) {
    const events = [];
    for (const item of items) {
        const matches = (0, geo_hub_index_1.inferGeoHubsFromTitle)(item.title);
        const firstMatch = matches[0];
        if (firstMatch) {
            events.push({
                lat: firstMatch.hub.lat,
                lon: firstMatch.hub.lon,
                name: item.title,
                category: item.category || 'humanity-kindness',
                count: 1,
                timestamp: Date.now(),
            });
        }
    }
    return events;
}
