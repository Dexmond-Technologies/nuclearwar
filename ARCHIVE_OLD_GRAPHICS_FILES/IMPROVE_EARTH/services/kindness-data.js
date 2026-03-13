"use strict";
// Kindness data pipeline: real kindness events from curated news
// Green labeled dots on the happy map from actual humanity-kindness articles
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchKindnessData = fetchKindnessData;
const geo_hub_index_1 = require("./geo-hub-index");
/**
 * Extract real kindness events from curated news items.
 * Filters for humanity-kindness category and geocodes via title.
 */
function extractKindnessEvents(newsItems) {
    const kindnessItems = newsItems.filter(item => item.happyCategory === 'humanity-kindness');
    const events = [];
    for (const item of kindnessItems) {
        const matches = (0, geo_hub_index_1.inferGeoHubsFromTitle)(item.title);
        const firstMatch = matches[0];
        if (firstMatch) {
            events.push({
                lat: firstMatch.hub.lat,
                lon: firstMatch.hub.lon,
                name: item.title,
                description: item.title,
                intensity: 0.8,
                type: 'real',
                timestamp: Date.now(),
            });
        }
    }
    return events;
}
/**
 * Fetch kindness data: real kindness events extracted from curated news.
 * Only returns events that can be geocoded from article titles.
 */
function fetchKindnessData(newsItems) {
    return newsItems ? extractKindnessEvents(newsItems) : [];
}
