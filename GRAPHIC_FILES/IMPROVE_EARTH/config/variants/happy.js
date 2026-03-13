"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VARIANT_CONFIG = exports.MOBILE_DEFAULT_MAP_LAYERS = exports.DEFAULT_MAP_LAYERS = exports.DEFAULT_PANELS = void 0;
// Re-export base config
__exportStar(require("./base"), exports);
// Panel configuration for happy/positive news dashboard
exports.DEFAULT_PANELS = {
    map: { name: 'World Map', enabled: true, priority: 1 },
    'positive-feed': { name: 'Good News Feed', enabled: true, priority: 1 },
    progress: { name: 'Human Progress', enabled: true, priority: 1 },
    counters: { name: 'Live Counters', enabled: true, priority: 1 },
    spotlight: { name: "Today's Hero", enabled: true, priority: 1 },
    breakthroughs: { name: 'Breakthroughs', enabled: true, priority: 1 },
    digest: { name: '5 Good Things', enabled: true, priority: 1 },
    species: { name: 'Conservation Wins', enabled: true, priority: 1 },
    renewable: { name: 'Renewable Energy', enabled: true, priority: 1 },
};
// Map layers — all geopolitical overlays disabled; natural events only
exports.DEFAULT_MAP_LAYERS = {
    conflicts: false,
    bases: false,
    cables: false,
    pipelines: false,
    hotspots: false,
    ais: false,
    nuclear: false,
    irradiators: false,
    sanctions: false,
    weather: false,
    economic: false,
    waterways: false,
    outages: false,
    cyberThreats: false,
    datacenters: false,
    protests: false,
    flights: false,
    military: false,
    natural: false,
    spaceports: false,
    minerals: false,
    fires: false,
    // Data source layers
    ucdpEvents: false,
    displacement: false,
    climate: false,
    // Tech layers (disabled)
    startupHubs: false,
    cloudRegions: false,
    accelerators: false,
    techHQs: false,
    techEvents: false,
    // Finance layers (disabled)
    stockExchanges: false,
    financialCenters: false,
    centralBanks: false,
    commodityHubs: false,
    gulfInvestments: false,
    // Happy variant layers
    positiveEvents: true,
    kindness: true,
    happiness: true,
    speciesRecovery: true,
    renewableInstallations: true,
    tradeRoutes: false,
    iranAttacks: false,
    dayNight: false,
};
// Mobile defaults — same as desktop for happy variant
exports.MOBILE_DEFAULT_MAP_LAYERS = {
    conflicts: false,
    bases: false,
    cables: false,
    pipelines: false,
    hotspots: false,
    ais: false,
    nuclear: false,
    irradiators: false,
    sanctions: false,
    weather: false,
    economic: false,
    waterways: false,
    outages: false,
    cyberThreats: false,
    datacenters: false,
    protests: false,
    flights: false,
    military: false,
    natural: false,
    spaceports: false,
    minerals: false,
    fires: false,
    // Data source layers
    ucdpEvents: false,
    displacement: false,
    climate: false,
    // Tech layers (disabled)
    startupHubs: false,
    cloudRegions: false,
    accelerators: false,
    techHQs: false,
    techEvents: false,
    // Finance layers (disabled)
    stockExchanges: false,
    financialCenters: false,
    centralBanks: false,
    commodityHubs: false,
    gulfInvestments: false,
    // Happy variant layers
    positiveEvents: true,
    kindness: true,
    happiness: true,
    speciesRecovery: true,
    renewableInstallations: true,
    tradeRoutes: false,
    iranAttacks: false,
    dayNight: false,
};
exports.VARIANT_CONFIG = {
    name: 'happy',
    description: 'Good news and global progress dashboard',
    panels: exports.DEFAULT_PANELS,
    mapLayers: exports.DEFAULT_MAP_LAYERS,
    mobileMapLayers: exports.MOBILE_DEFAULT_MAP_LAYERS,
};
