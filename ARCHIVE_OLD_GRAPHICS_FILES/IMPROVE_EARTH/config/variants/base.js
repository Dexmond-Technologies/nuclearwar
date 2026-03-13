"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_KEYS = exports.MONITOR_COLORS = exports.REFRESH_INTERVALS = exports.AI_DATA_CENTERS = exports.UNDERSEA_CABLES = exports.MARKET_SYMBOLS = exports.COMMODITIES = exports.SECTORS = void 0;
// Shared exports (re-exported by all variants)
var markets_1 = require("../markets");
Object.defineProperty(exports, "SECTORS", { enumerable: true, get: function () { return markets_1.SECTORS; } });
Object.defineProperty(exports, "COMMODITIES", { enumerable: true, get: function () { return markets_1.COMMODITIES; } });
Object.defineProperty(exports, "MARKET_SYMBOLS", { enumerable: true, get: function () { return markets_1.MARKET_SYMBOLS; } });
var geo_1 = require("../geo");
Object.defineProperty(exports, "UNDERSEA_CABLES", { enumerable: true, get: function () { return geo_1.UNDERSEA_CABLES; } });
var ai_datacenters_1 = require("../ai-datacenters");
Object.defineProperty(exports, "AI_DATA_CENTERS", { enumerable: true, get: function () { return ai_datacenters_1.AI_DATA_CENTERS; } });
// Refresh intervals - shared across all variants
exports.REFRESH_INTERVALS = {
    feeds: 5 * 60 * 1000,
    markets: 4 * 60 * 1000,
    crypto: 4 * 60 * 1000,
    predictions: 5 * 60 * 1000,
    ais: 10 * 60 * 1000,
};
// Monitor colors - shared
exports.MONITOR_COLORS = [
    '#44ff88',
    '#ff8844',
    '#4488ff',
    '#ff44ff',
    '#ffff44',
    '#ff4444',
    '#44ffff',
    '#88ff44',
    '#ff88ff',
    '#88ffff',
];
// Storage keys - shared
exports.STORAGE_KEYS = {
    panels: 'worldmonitor-panels',
    monitors: 'worldmonitor-monitors',
    mapLayers: 'worldmonitor-layers',
    disabledFeeds: 'worldmonitor-disabled-feeds',
    liveChannels: 'worldmonitor-live-channels',
};
