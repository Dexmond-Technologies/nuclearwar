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
// Geopolitical-specific exports
__exportStar(require("../feeds"), exports);
__exportStar(require("../geo"), exports);
__exportStar(require("../irradiators"), exports);
__exportStar(require("../pipelines"), exports);
__exportStar(require("../ports"), exports);
__exportStar(require("../military"), exports);
__exportStar(require("../airports"), exports);
__exportStar(require("../entities"), exports);
// Panel configuration for geopolitical analysis
exports.DEFAULT_PANELS = {
    map: { name: 'Global Map', enabled: true, priority: 1 },
    'live-news': { name: 'Live News', enabled: true, priority: 1 },
    intel: { name: 'Intel Feed', enabled: true, priority: 1 },
    'gdelt-intel': { name: 'Live Intelligence', enabled: true, priority: 1 },
    cii: { name: 'Country Instability', enabled: true, priority: 1 },
    cascade: { name: 'Infrastructure Cascade', enabled: true, priority: 1 },
    'strategic-risk': { name: 'Strategic Risk Overview', enabled: true, priority: 1 },
    politics: { name: 'World News', enabled: true, priority: 1 },
    us: { name: 'United States', enabled: true, priority: 1 },
    europe: { name: 'Europe', enabled: true, priority: 1 },
    middleeast: { name: 'Middle East', enabled: true, priority: 1 },
    africa: { name: 'Africa', enabled: true, priority: 1 },
    latam: { name: 'Latin America', enabled: true, priority: 1 },
    asia: { name: 'Asia-Pacific', enabled: true, priority: 1 },
    energy: { name: 'Energy & Resources', enabled: true, priority: 1 },
    gov: { name: 'Government', enabled: true, priority: 1 },
    thinktanks: { name: 'Think Tanks', enabled: true, priority: 1 },
    polymarket: { name: 'Predictions', enabled: true, priority: 1 },
    commodities: { name: 'Commodities', enabled: true, priority: 1 },
    markets: { name: 'Markets', enabled: true, priority: 1 },
    economic: { name: 'Economic Indicators', enabled: true, priority: 1 },
    finance: { name: 'Financial', enabled: true, priority: 1 },
    tech: { name: 'Technology', enabled: true, priority: 2 },
    crypto: { name: 'Crypto', enabled: true, priority: 2 },
    heatmap: { name: 'Sector Heatmap', enabled: true, priority: 2 },
    ai: { name: 'AI/ML', enabled: true, priority: 2 },
    layoffs: { name: 'Layoffs Tracker', enabled: false, priority: 2 },
    'macro-signals': { name: 'Market Radar', enabled: true, priority: 2 },
    'etf-flows': { name: 'BTC ETF Tracker', enabled: true, priority: 2 },
    stablecoins: { name: 'Stablecoins', enabled: true, priority: 2 },
    monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};
// Map layers for geopolitical view
exports.DEFAULT_MAP_LAYERS = {
    conflicts: true,
    bases: true,
    cables: false,
    pipelines: false,
    hotspots: true,
    ais: false,
    nuclear: true,
    irradiators: false,
    sanctions: true,
    weather: true,
    economic: true,
    waterways: true,
    outages: true,
    cyberThreats: false,
    datacenters: false,
    protests: false,
    flights: false,
    military: false,
    natural: true,
    spaceports: false,
    minerals: false,
    fires: false,
    ucdpEvents: false,
    displacement: false,
    climate: false,
    // Tech layers (disabled in full variant)
    startupHubs: false,
    cloudRegions: false,
    accelerators: false,
    techHQs: false,
    techEvents: false,
    // Finance layers (disabled in full variant)
    stockExchanges: false,
    financialCenters: false,
    centralBanks: false,
    commodityHubs: false,
    gulfInvestments: false,
    // Happy variant layers
    positiveEvents: false,
    kindness: false,
    happiness: false,
    speciesRecovery: false,
    renewableInstallations: false,
    tradeRoutes: false,
    iranAttacks: false,
    dayNight: false,
};
// Mobile-specific defaults for geopolitical
exports.MOBILE_DEFAULT_MAP_LAYERS = {
    conflicts: true,
    bases: false,
    cables: false,
    pipelines: false,
    hotspots: true,
    ais: false,
    nuclear: false,
    irradiators: false,
    sanctions: true,
    weather: true,
    economic: false,
    waterways: false,
    outages: true,
    cyberThreats: false,
    datacenters: false,
    protests: false,
    flights: false,
    military: false,
    natural: true,
    spaceports: false,
    minerals: false,
    fires: false,
    ucdpEvents: false,
    displacement: false,
    climate: false,
    // Tech layers (disabled in full variant)
    startupHubs: false,
    cloudRegions: false,
    accelerators: false,
    techHQs: false,
    techEvents: false,
    // Finance layers (disabled in full variant)
    stockExchanges: false,
    financialCenters: false,
    centralBanks: false,
    commodityHubs: false,
    gulfInvestments: false,
    // Happy variant layers
    positiveEvents: false,
    kindness: false,
    happiness: false,
    speciesRecovery: false,
    renewableInstallations: false,
    tradeRoutes: false,
    iranAttacks: false,
    dayNight: false,
};
exports.VARIANT_CONFIG = {
    name: 'full',
    description: 'Full geopolitical intelligence dashboard',
    panels: exports.DEFAULT_PANELS,
    mapLayers: exports.DEFAULT_MAP_LAYERS,
    mobileMapLayers: exports.MOBILE_DEFAULT_MAP_LAYERS,
};
