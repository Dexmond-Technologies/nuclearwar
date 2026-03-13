"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeckGLMap = exports.LAYER_ZOOM_THRESHOLDS = void 0;
/**
 * DeckGLMap - WebGL-accelerated map visualization for desktop
 * Uses deck.gl for high-performance rendering of large datasets
 * Mobile devices gracefully degrade to the D3/SVG-based Map component
 */
const mapbox_1 = require("@deck.gl/mapbox");
const layers_1 = require("@deck.gl/layers");
const maplibre_gl_1 = __importDefault(require("maplibre-gl"));
const supercluster_1 = __importDefault(require("supercluster"));
const military_bases_1 = require("@/services/military-bases");
const layers_2 = require("@deck.gl/layers");
const aggregation_layers_1 = require("@deck.gl/aggregation-layers");
const sanitize_1 = require("@/utils/sanitize");
const keyword_match_1 = require("@/utils/keyword-match");
const i18n_1 = require("@/services/i18n");
const index_1 = require("@/utils/index");
const config_1 = require("@/config");
const trade_routes_1 = require("@/config/trade-routes");
const MapPopup_1 = require("./MapPopup");
const hotspot_escalation_1 = require("@/services/hotspot-escalation");
const country_instability_1 = require("@/services/country-instability");
const geo_convergence_1 = require("@/services/geo-convergence");
const country_geometry_1 = require("@/services/country-geometry");
// View presets with longitude, latitude, zoom
const VIEW_PRESETS = {
    global: { longitude: 0, latitude: 20, zoom: 1.5 },
    america: { longitude: -95, latitude: 38, zoom: 3 },
    mena: { longitude: 45, latitude: 28, zoom: 3.5 },
    eu: { longitude: 15, latitude: 50, zoom: 3.5 },
    asia: { longitude: 105, latitude: 35, zoom: 3 },
    latam: { longitude: -60, latitude: -15, zoom: 3 },
    africa: { longitude: 20, latitude: 5, zoom: 3 },
    oceania: { longitude: 135, latitude: -25, zoom: 3.5 },
};
const MAP_INTERACTION_MODE = import.meta.env.VITE_MAP_INTERACTION_MODE === 'flat' ? 'flat' : '3d';
// Theme-aware basemap vector style URLs (English labels, no local scripts)
// Happy variant uses self-hosted warm styles; default uses CARTO CDN
const DARK_STYLE = config_1.SITE_VARIANT === 'happy'
    ? '/map-styles/happy-dark.json'
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE = config_1.SITE_VARIANT === 'happy'
    ? '/map-styles/happy-light.json'
    : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
// Zoom thresholds for layer visibility and labels (matches old Map.ts)
// Zoom-dependent layer visibility and labels
const LAYER_ZOOM_THRESHOLDS = {
    bases: { minZoom: 3, showLabels: 5 },
    nuclear: { minZoom: 3 },
    conflicts: { minZoom: 1, showLabels: 3 },
    economic: { minZoom: 3 },
    natural: { minZoom: 1, showLabels: 2 },
    datacenters: { minZoom: 5 },
    irradiators: { minZoom: 4 },
    spaceports: { minZoom: 3 },
    gulfInvestments: { minZoom: 2, showLabels: 5 },
};
exports.LAYER_ZOOM_THRESHOLDS = LAYER_ZOOM_THRESHOLDS;
// Theme-aware overlay color function — refreshed each buildLayers() call
function getOverlayColors() {
    const isLight = (0, index_1.getCurrentTheme)() === 'light';
    return {
        // Threat dots: IDENTICAL in both modes (user locked decision)
        hotspotHigh: [255, 68, 68, 200],
        hotspotElevated: [255, 165, 0, 200],
        hotspotLow: [255, 255, 0, 180],
        // Conflict zone fills: more transparent in light mode
        conflict: isLight
            ? [255, 0, 0, 60]
            : [255, 0, 0, 100],
        // Infrastructure/category markers: darker variants in light mode for map readability
        base: [0, 150, 255, 200],
        nuclear: isLight
            ? [180, 120, 0, 220]
            : [255, 215, 0, 200],
        datacenter: isLight
            ? [13, 148, 136, 200]
            : [0, 255, 200, 180],
        cable: [0, 200, 255, 150],
        cableHighlight: [255, 100, 100, 200],
        cableFault: [255, 50, 50, 220],
        cableDegraded: [255, 165, 0, 200],
        earthquake: [255, 100, 50, 200],
        vesselMilitary: [255, 100, 100, 220],
        flightMilitary: [255, 50, 50, 220],
        protest: [255, 150, 0, 200],
        outage: [255, 50, 50, 180],
        weather: [100, 150, 255, 180],
        startupHub: isLight
            ? [22, 163, 74, 220]
            : [0, 255, 150, 200],
        techHQ: [100, 200, 255, 200],
        accelerator: isLight
            ? [180, 120, 0, 220]
            : [255, 200, 0, 200],
        cloudRegion: [150, 100, 255, 180],
        stockExchange: isLight
            ? [20, 120, 200, 220]
            : [80, 200, 255, 210],
        financialCenter: isLight
            ? [0, 150, 110, 215]
            : [0, 220, 150, 200],
        centralBank: isLight
            ? [180, 120, 0, 220]
            : [255, 210, 80, 210],
        commodityHub: isLight
            ? [190, 95, 40, 220]
            : [255, 150, 80, 200],
        gulfInvestmentSA: [0, 168, 107, 220],
        gulfInvestmentUAE: [255, 0, 100, 220],
        ucdpStateBased: [255, 50, 50, 200],
        ucdpNonState: [255, 165, 0, 200],
        ucdpOneSided: [255, 255, 0, 200],
    };
}
// Initialize and refresh on every buildLayers() call
let COLORS = getOverlayColors();
// SVG icons as data URLs for different marker shapes
const MARKER_ICONS = {
    // Square - for datacenters
    square: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="3" fill="white"/></svg>`),
    // Diamond - for hotspots
    diamond: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,16 16,30 2,16" fill="white"/></svg>`),
    // Triangle up - for military bases
    triangleUp: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,28 2,28" fill="white"/></svg>`),
    // Hexagon - for nuclear
    hexagon: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="white"/></svg>`),
    // Circle - fallback
    circle: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="white"/></svg>`),
    // Star - for special markers
    star: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 30,12 22,19 25,30 16,23 7,30 10,19 2,12 12,12" fill="white"/></svg>`),
};
class DeckGLMap {
    constructor(container, initialState) {
        this.deckOverlay = null;
        this.maplibreMap = null;
        this.earthquakes = [];
        this.weatherAlerts = [];
        this.outages = [];
        this.cyberThreats = [];
        this.iranEvents = [];
        this.aisDisruptions = [];
        this.aisDensity = [];
        this.cableAdvisories = [];
        this.repairShips = [];
        this.healthByCableId = {};
        this.protests = [];
        this.militaryFlights = [];
        this.militaryFlightClusters = [];
        this.militaryVessels = [];
        this.militaryVesselClusters = [];
        this.serverBases = [];
        this.serverBaseClusters = [];
        this.serverBasesLoaded = false;
        this.naturalEvents = [];
        this.firmsFireData = [];
        this.techEvents = [];
        this.flightDelays = [];
        this.civilianFlights = [];
        this.news = [];
        this.newsLocations = [];
        this.newsLocationFirstSeen = new Map();
        this.ucdpEvents = [];
        this.displacementFlows = [];
        this.climateAnomalies = [];
        this.tradeRouteSegments = (0, trade_routes_1.resolveTradeRouteSegments)();
        this.positiveEvents = [];
        this.kindnessPoints = [];
        // Phase 8 overlay data
        this.happinessScores = new Map();
        this.happinessYear = 0;
        this.happinessSource = '';
        this.speciesRecoveryZones = [];
        this.renewableInstallations = [];
        this.countriesGeoJsonData = null;
        // Country highlight state
        this.countryGeoJsonLoaded = false;
        this.countryHoverSetup = false;
        this.highlightedCountryCode = null;
        // Highlighted assets
        this.highlightedAssets = {
            pipeline: new Set(),
            cable: new Set(),
            datacenter: new Set(),
            base: new Set(),
            nuclear: new Set(),
        };
        this.renderScheduled = false;
        this.renderPaused = false;
        this.renderPending = false;
        this.webglLost = false;
        this.resizeObserver = null;
        this.layerCache = new Map();
        this.lastZoomThreshold = 0;
        this.protestSC = null;
        this.techHQSC = null;
        this.techEventSC = null;
        this.datacenterSC = null;
        this.protestClusters = [];
        this.techHQClusters = [];
        this.techEventClusters = [];
        this.datacenterClusters = [];
        this.lastSCZoom = -1;
        this.lastSCBoundsKey = '';
        this.lastSCMask = '';
        this.protestSuperclusterSource = [];
        this.newsPulseIntervalId = null;
        this.dayNightIntervalId = null;
        this.cachedNightPolygon = null;
        this.startupTime = Date.now();
        this.lastCableHighlightSignature = '';
        this.lastCableHealthSignature = '';
        this.lastPipelineHighlightSignature = '';
        this.moveTimeoutId = null;
        this.pulseTime = 0;
        this.container = container;
        this.state = initialState;
        this.hotspots = [...config_1.INTEL_HOTSPOTS];
        this.debouncedRebuildLayers = (0, index_1.debounce)(() => {
            if (this.renderPaused || this.webglLost || !this.maplibreMap)
                return;
            this.maplibreMap.resize();
            try {
                this.deckOverlay?.setProps({ layers: this.buildLayers() });
            }
            catch { /* map mid-teardown */ }
        }, 150);
        this.debouncedFetchBases = (0, index_1.debounce)(() => this.fetchServerBases(), 300);
        this.rafUpdateLayers = (0, index_1.rafSchedule)(() => {
            if (this.renderPaused || this.webglLost || !this.maplibreMap)
                return;
            try {
                this.deckOverlay?.setProps({ layers: this.buildLayers() });
            }
            catch { /* map mid-teardown */ }
        });
        this.setupDOM();
        this.popup = new MapPopup_1.MapPopup(container);
        window.addEventListener('theme-changed', (e) => {
            const theme = e.detail?.theme;
            if (theme) {
                this.switchBasemap(theme);
                this.render(); // Rebuilds Deck.GL layers with new theme-aware colors
            }
        });
        this.initMapLibre();
        this.maplibreMap?.on('load', () => {
            this.rebuildTechHQSupercluster();
            this.rebuildDatacenterSupercluster();
            this.initDeck();
            this.loadCountryBoundaries();
            this.fetchServerBases();
            this.render();
        });
        this.setupResizeObserver();
        this.createControls();
        this.createTimeSlider();
        this.createLayerToggles();
        this.createLegend();
        // Start day/night timer only if layer is initially enabled
        if (this.state.layers.dayNight) {
            this.startDayNightTimer();
        }
    }
    startDayNightTimer() {
        if (this.dayNightIntervalId)
            return;
        this.cachedNightPolygon = this.computeNightPolygon();
        this.dayNightIntervalId = setInterval(() => {
            this.cachedNightPolygon = this.computeNightPolygon();
            this.render();
        }, 5 * 60 * 1000);
    }
    stopDayNightTimer() {
        if (this.dayNightIntervalId) {
            clearInterval(this.dayNightIntervalId);
            this.dayNightIntervalId = null;
        }
        this.cachedNightPolygon = null;
    }
    setupDOM() {
        const wrapper = document.createElement('div');
        wrapper.className = 'deckgl-map-wrapper';
        wrapper.id = 'deckglMapWrapper';
        wrapper.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden;';
        // MapLibre container - deck.gl renders directly into MapLibre via MapboxOverlay
        const mapContainer = document.createElement('div');
        mapContainer.id = 'deckgl-basemap';
        mapContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';
        wrapper.appendChild(mapContainer);
        // Map attribution (CARTO basemap + OpenStreetMap data)
        const attribution = document.createElement('div');
        attribution.className = 'map-attribution';
        attribution.innerHTML = '© <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
        wrapper.appendChild(attribution);
        this.container.appendChild(wrapper);
    }
    initMapLibre() {
        const preset = VIEW_PRESETS[this.state.view];
        const initialTheme = (0, index_1.getCurrentTheme)();
        this.maplibreMap = new maplibre_gl_1.default.Map({
            container: 'deckgl-basemap',
            style: initialTheme === 'light' ? LIGHT_STYLE : DARK_STYLE,
            center: [preset.longitude, preset.latitude],
            zoom: preset.zoom,
            renderWorldCopies: false,
            attributionControl: false,
            interactive: true,
            ...(MAP_INTERACTION_MODE === 'flat'
                ? {
                    maxPitch: 0,
                    pitchWithRotate: false,
                    dragRotate: false,
                    touchPitch: false,
                }
                : {}),
        });
        const canvas = this.maplibreMap.getCanvas();
        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            this.webglLost = true;
            console.warn('[DeckGLMap] WebGL context lost — will restore when browser recovers');
        });
        canvas.addEventListener('webglcontextrestored', () => {
            this.webglLost = false;
            console.info('[DeckGLMap] WebGL context restored');
            this.maplibreMap?.triggerRepaint();
        });
    }
    initDeck() {
        if (!this.maplibreMap)
            return;
        this.deckOverlay = new mapbox_1.MapboxOverlay({
            interleaved: true,
            layers: this.buildLayers(),
            getTooltip: (info) => this.getTooltip(info),
            onClick: (info) => this.handleClick(info),
            pickingRadius: 10,
            useDevicePixels: window.devicePixelRatio > 2 ? 2 : true,
            onError: (error) => console.warn('[DeckGLMap] Render error (non-fatal):', error.message),
        });
        this.maplibreMap.addControl(this.deckOverlay);
        this.maplibreMap.on('movestart', () => {
            if (this.moveTimeoutId) {
                clearTimeout(this.moveTimeoutId);
                this.moveTimeoutId = null;
            }
        });
        this.maplibreMap.on('moveend', () => {
            this.lastSCZoom = -1;
            this.rafUpdateLayers();
            this.debouncedFetchBases();
        });
        this.maplibreMap.on('move', () => {
            if (this.moveTimeoutId)
                clearTimeout(this.moveTimeoutId);
            this.moveTimeoutId = setTimeout(() => {
                this.lastSCZoom = -1;
                this.rafUpdateLayers();
            }, 100);
        });
        this.maplibreMap.on('zoom', () => {
            if (this.moveTimeoutId)
                clearTimeout(this.moveTimeoutId);
            this.moveTimeoutId = setTimeout(() => {
                this.lastSCZoom = -1;
                this.rafUpdateLayers();
            }, 100);
        });
        this.maplibreMap.on('zoomend', () => {
            const currentZoom = Math.floor(this.maplibreMap?.getZoom() || 2);
            const thresholdCrossed = Math.abs(currentZoom - this.lastZoomThreshold) >= 1;
            if (thresholdCrossed) {
                this.lastZoomThreshold = currentZoom;
                this.debouncedRebuildLayers();
            }
        });
    }
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            if (this.maplibreMap) {
                this.maplibreMap.resize();
            }
        });
        this.resizeObserver.observe(this.container);
    }
    getSetSignature(set) {
        return [...set].sort().join('|');
    }
    hasRecentNews(now = Date.now()) {
        for (const ts of this.newsLocationFirstSeen.values()) {
            if (now - ts < 30000)
                return true;
        }
        return false;
    }
    getTimeRangeMs(range = this.state.timeRange) {
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '48h': 48 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            'all': Infinity,
        };
        return ranges[range];
    }
    parseTime(value) {
        if (value == null)
            return null;
        const ts = value instanceof Date ? value.getTime() : new Date(value).getTime();
        return Number.isFinite(ts) ? ts : null;
    }
    filterByTime(items, getTime) {
        if (this.state.timeRange === 'all')
            return items;
        const cutoff = Date.now() - this.getTimeRangeMs();
        return items.filter((item) => {
            const ts = this.parseTime(getTime(item));
            return ts == null ? true : ts >= cutoff;
        });
    }
    getFilteredProtests() {
        return this.filterByTime(this.protests, (event) => event.time);
    }
    filterMilitaryFlightClustersByTime(clusters) {
        return clusters
            .map((cluster) => {
            const flights = this.filterByTime(cluster.flights ?? [], (flight) => flight.lastSeen);
            if (flights.length === 0)
                return null;
            return {
                ...cluster,
                flights,
                flightCount: flights.length,
            };
        })
            .filter((cluster) => cluster !== null);
    }
    filterMilitaryVesselClustersByTime(clusters) {
        return clusters
            .map((cluster) => {
            const vessels = this.filterByTime(cluster.vessels ?? [], (vessel) => vessel.lastAisUpdate);
            if (vessels.length === 0)
                return null;
            return {
                ...cluster,
                vessels,
                vesselCount: vessels.length,
            };
        })
            .filter((cluster) => cluster !== null);
    }
    rebuildProtestSupercluster(source = this.getFilteredProtests()) {
        this.protestSuperclusterSource = source;
        const points = source.map((p, i) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
            properties: {
                index: i,
                country: p.country,
                severity: p.severity,
                eventType: p.eventType,
                validated: Boolean(p.validated),
                fatalities: Number.isFinite(p.fatalities) ? Number(p.fatalities) : 0,
            },
        }));
        this.protestSC = new supercluster_1.default({
            radius: 60,
            maxZoom: 14,
            map: (props) => ({
                index: Number(props.index ?? 0),
                country: String(props.country ?? ''),
                maxSeverityRank: props.severity === 'high' ? 2 : props.severity === 'medium' ? 1 : 0,
                riotCount: props.eventType === 'riot' ? 1 : 0,
                highSeverityCount: props.severity === 'high' ? 1 : 0,
                verifiedCount: props.validated ? 1 : 0,
                totalFatalities: Number(props.fatalities ?? 0) || 0,
            }),
            reduce: (acc, props) => {
                acc.maxSeverityRank = Math.max(Number(acc.maxSeverityRank ?? 0), Number(props.maxSeverityRank ?? 0));
                acc.riotCount = Number(acc.riotCount ?? 0) + Number(props.riotCount ?? 0);
                acc.highSeverityCount = Number(acc.highSeverityCount ?? 0) + Number(props.highSeverityCount ?? 0);
                acc.verifiedCount = Number(acc.verifiedCount ?? 0) + Number(props.verifiedCount ?? 0);
                acc.totalFatalities = Number(acc.totalFatalities ?? 0) + Number(props.totalFatalities ?? 0);
                if (!acc.country && props.country)
                    acc.country = props.country;
            },
        });
        this.protestSC.load(points);
        this.lastSCZoom = -1;
    }
    rebuildTechHQSupercluster() {
        const points = config_1.TECH_HQS.map((h, i) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
            properties: {
                index: i,
                city: h.city,
                country: h.country,
                type: h.type,
            },
        }));
        this.techHQSC = new supercluster_1.default({
            radius: 50,
            maxZoom: 14,
            map: (props) => ({
                index: Number(props.index ?? 0),
                city: String(props.city ?? ''),
                country: String(props.country ?? ''),
                faangCount: props.type === 'faang' ? 1 : 0,
                unicornCount: props.type === 'unicorn' ? 1 : 0,
                publicCount: props.type === 'public' ? 1 : 0,
            }),
            reduce: (acc, props) => {
                acc.faangCount = Number(acc.faangCount ?? 0) + Number(props.faangCount ?? 0);
                acc.unicornCount = Number(acc.unicornCount ?? 0) + Number(props.unicornCount ?? 0);
                acc.publicCount = Number(acc.publicCount ?? 0) + Number(props.publicCount ?? 0);
                if (!acc.city && props.city)
                    acc.city = props.city;
                if (!acc.country && props.country)
                    acc.country = props.country;
            },
        });
        this.techHQSC.load(points);
        this.lastSCZoom = -1;
    }
    rebuildTechEventSupercluster() {
        const points = this.techEvents.map((e, i) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
            properties: {
                index: i,
                location: e.location,
                country: e.country,
                daysUntil: e.daysUntil,
            },
        }));
        this.techEventSC = new supercluster_1.default({
            radius: 50,
            maxZoom: 14,
            map: (props) => {
                const daysUntil = Number(props.daysUntil ?? Number.MAX_SAFE_INTEGER);
                return {
                    index: Number(props.index ?? 0),
                    location: String(props.location ?? ''),
                    country: String(props.country ?? ''),
                    soonestDaysUntil: Number.isFinite(daysUntil) ? daysUntil : Number.MAX_SAFE_INTEGER,
                    soonCount: Number.isFinite(daysUntil) && daysUntil <= 14 ? 1 : 0,
                };
            },
            reduce: (acc, props) => {
                acc.soonestDaysUntil = Math.min(Number(acc.soonestDaysUntil ?? Number.MAX_SAFE_INTEGER), Number(props.soonestDaysUntil ?? Number.MAX_SAFE_INTEGER));
                acc.soonCount = Number(acc.soonCount ?? 0) + Number(props.soonCount ?? 0);
                if (!acc.location && props.location)
                    acc.location = props.location;
                if (!acc.country && props.country)
                    acc.country = props.country;
            },
        });
        this.techEventSC.load(points);
        this.lastSCZoom = -1;
    }
    rebuildDatacenterSupercluster() {
        const activeDCs = config_1.AI_DATA_CENTERS.filter(dc => dc.status !== 'decommissioned');
        const points = activeDCs.map((dc, i) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [dc.lon, dc.lat] },
            properties: {
                index: i,
                country: dc.country,
                chipCount: dc.chipCount,
                powerMW: dc.powerMW ?? 0,
                status: dc.status,
            },
        }));
        this.datacenterSC = new supercluster_1.default({
            radius: 70,
            maxZoom: 14,
            map: (props) => ({
                index: Number(props.index ?? 0),
                country: String(props.country ?? ''),
                totalChips: Number(props.chipCount ?? 0) || 0,
                totalPowerMW: Number(props.powerMW ?? 0) || 0,
                existingCount: props.status === 'existing' ? 1 : 0,
                plannedCount: props.status === 'planned' ? 1 : 0,
            }),
            reduce: (acc, props) => {
                acc.totalChips = Number(acc.totalChips ?? 0) + Number(props.totalChips ?? 0);
                acc.totalPowerMW = Number(acc.totalPowerMW ?? 0) + Number(props.totalPowerMW ?? 0);
                acc.existingCount = Number(acc.existingCount ?? 0) + Number(props.existingCount ?? 0);
                acc.plannedCount = Number(acc.plannedCount ?? 0) + Number(props.plannedCount ?? 0);
                if (!acc.country && props.country)
                    acc.country = props.country;
            },
        });
        this.datacenterSC.load(points);
        this.lastSCZoom = -1;
    }
    updateClusterData() {
        const zoom = Math.floor(this.maplibreMap?.getZoom() ?? 2);
        const bounds = this.maplibreMap?.getBounds();
        if (!bounds)
            return;
        const bbox = [
            bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
        ];
        const boundsKey = `${bbox[0].toFixed(4)}:${bbox[1].toFixed(4)}:${bbox[2].toFixed(4)}:${bbox[3].toFixed(4)}`;
        const layers = this.state.layers;
        const useProtests = layers.protests && this.protestSuperclusterSource.length > 0;
        const useTechHQ = config_1.SITE_VARIANT === 'tech' && layers.techHQs;
        const useTechEvents = config_1.SITE_VARIANT === 'tech' && layers.techEvents && this.techEvents.length > 0;
        const useDatacenterClusters = layers.datacenters && zoom < 5;
        const layerMask = `${Number(useProtests)}${Number(useTechHQ)}${Number(useTechEvents)}${Number(useDatacenterClusters)}`;
        if (zoom === this.lastSCZoom && boundsKey === this.lastSCBoundsKey && layerMask === this.lastSCMask)
            return;
        this.lastSCZoom = zoom;
        this.lastSCBoundsKey = boundsKey;
        this.lastSCMask = layerMask;
        if (useProtests && this.protestSC) {
            this.protestClusters = this.protestSC.getClusters(bbox, zoom).map(f => {
                const coords = f.geometry.coordinates;
                if (f.properties.cluster) {
                    const props = f.properties;
                    const leaves = this.protestSC.getLeaves(f.properties.cluster_id, DeckGLMap.MAX_CLUSTER_LEAVES);
                    const items = leaves.map(l => this.protestSuperclusterSource[l.properties.index]).filter((x) => !!x);
                    const maxSeverityRank = Number(props.maxSeverityRank ?? 0);
                    const maxSev = maxSeverityRank >= 2 ? 'high' : maxSeverityRank === 1 ? 'medium' : 'low';
                    const riotCount = Number(props.riotCount ?? 0);
                    const highSeverityCount = Number(props.highSeverityCount ?? 0);
                    const verifiedCount = Number(props.verifiedCount ?? 0);
                    const totalFatalities = Number(props.totalFatalities ?? 0);
                    const clusterCount = Number(f.properties.point_count ?? items.length);
                    const latestRiotEventTimeMs = items.reduce((max, it) => {
                        if (it.eventType !== 'riot' || it.sourceType === 'gdelt')
                            return max;
                        const ts = it.time.getTime();
                        return Number.isFinite(ts) ? Math.max(max, ts) : max;
                    }, 0);
                    return {
                        id: `pc-${f.properties.cluster_id}`,
                        lat: coords[1], lon: coords[0],
                        count: clusterCount,
                        items,
                        country: String(props.country ?? items[0]?.country ?? ''),
                        maxSeverity: maxSev,
                        hasRiot: riotCount > 0,
                        latestRiotEventTimeMs: latestRiotEventTimeMs || undefined,
                        totalFatalities,
                        riotCount,
                        highSeverityCount,
                        verifiedCount,
                        sampled: items.length < clusterCount,
                    };
                }
                const item = this.protestSuperclusterSource[f.properties.index];
                return {
                    id: `pp-${f.properties.index}`, lat: item.lat, lon: item.lon,
                    count: 1, items: [item], country: item.country,
                    maxSeverity: item.severity, hasRiot: item.eventType === 'riot',
                    latestRiotEventTimeMs: item.eventType === 'riot' && item.sourceType !== 'gdelt' && Number.isFinite(item.time.getTime())
                        ? item.time.getTime()
                        : undefined,
                    totalFatalities: item.fatalities ?? 0,
                    riotCount: item.eventType === 'riot' ? 1 : 0,
                    highSeverityCount: item.severity === 'high' ? 1 : 0,
                    verifiedCount: item.validated ? 1 : 0,
                    sampled: false,
                };
            });
        }
        else {
            this.protestClusters = [];
        }
        if (useTechHQ && this.techHQSC) {
            this.techHQClusters = this.techHQSC.getClusters(bbox, zoom).map(f => {
                const coords = f.geometry.coordinates;
                if (f.properties.cluster) {
                    const props = f.properties;
                    const leaves = this.techHQSC.getLeaves(f.properties.cluster_id, DeckGLMap.MAX_CLUSTER_LEAVES);
                    const items = leaves.map(l => config_1.TECH_HQS[l.properties.index]).filter(Boolean);
                    const faangCount = Number(props.faangCount ?? 0);
                    const unicornCount = Number(props.unicornCount ?? 0);
                    const publicCount = Number(props.publicCount ?? 0);
                    const clusterCount = Number(f.properties.point_count ?? items.length);
                    const primaryType = faangCount >= unicornCount && faangCount >= publicCount
                        ? 'faang'
                        : unicornCount >= publicCount
                            ? 'unicorn'
                            : 'public';
                    return {
                        id: `hc-${f.properties.cluster_id}`,
                        lat: coords[1], lon: coords[0],
                        count: clusterCount,
                        items,
                        city: String(props.city ?? items[0]?.city ?? ''),
                        country: String(props.country ?? items[0]?.country ?? ''),
                        primaryType,
                        faangCount,
                        unicornCount,
                        publicCount,
                        sampled: items.length < clusterCount,
                    };
                }
                const item = config_1.TECH_HQS[f.properties.index];
                return {
                    id: `hp-${f.properties.index}`, lat: item.lat, lon: item.lon,
                    count: 1, items: [item], city: item.city, country: item.country,
                    primaryType: item.type,
                    faangCount: item.type === 'faang' ? 1 : 0,
                    unicornCount: item.type === 'unicorn' ? 1 : 0,
                    publicCount: item.type === 'public' ? 1 : 0,
                    sampled: false,
                };
            });
        }
        else {
            this.techHQClusters = [];
        }
        if (useTechEvents && this.techEventSC) {
            this.techEventClusters = this.techEventSC.getClusters(bbox, zoom).map(f => {
                const coords = f.geometry.coordinates;
                if (f.properties.cluster) {
                    const props = f.properties;
                    const leaves = this.techEventSC.getLeaves(f.properties.cluster_id, DeckGLMap.MAX_CLUSTER_LEAVES);
                    const items = leaves.map(l => this.techEvents[l.properties.index]).filter((x) => !!x);
                    const clusterCount = Number(f.properties.point_count ?? items.length);
                    const soonestDaysUntil = Number(props.soonestDaysUntil ?? Number.MAX_SAFE_INTEGER);
                    const soonCount = Number(props.soonCount ?? 0);
                    return {
                        id: `ec-${f.properties.cluster_id}`,
                        lat: coords[1], lon: coords[0],
                        count: clusterCount,
                        items,
                        location: String(props.location ?? items[0]?.location ?? ''),
                        country: String(props.country ?? items[0]?.country ?? ''),
                        soonestDaysUntil: Number.isFinite(soonestDaysUntil) ? soonestDaysUntil : Number.MAX_SAFE_INTEGER,
                        soonCount,
                        sampled: items.length < clusterCount,
                    };
                }
                const item = this.techEvents[f.properties.index];
                return {
                    id: `ep-${f.properties.index}`, lat: item.lat, lon: item.lng,
                    count: 1, items: [item], location: item.location, country: item.country,
                    soonestDaysUntil: item.daysUntil,
                    soonCount: item.daysUntil <= 14 ? 1 : 0,
                    sampled: false,
                };
            });
        }
        else {
            this.techEventClusters = [];
        }
        if (useDatacenterClusters && this.datacenterSC) {
            const activeDCs = config_1.AI_DATA_CENTERS.filter(dc => dc.status !== 'decommissioned');
            this.datacenterClusters = this.datacenterSC.getClusters(bbox, zoom).map(f => {
                const coords = f.geometry.coordinates;
                if (f.properties.cluster) {
                    const props = f.properties;
                    const leaves = this.datacenterSC.getLeaves(f.properties.cluster_id, DeckGLMap.MAX_CLUSTER_LEAVES);
                    const items = leaves.map(l => activeDCs[l.properties.index]).filter((x) => !!x);
                    const clusterCount = Number(f.properties.point_count ?? items.length);
                    const existingCount = Number(props.existingCount ?? 0);
                    const plannedCount = Number(props.plannedCount ?? 0);
                    const totalChips = Number(props.totalChips ?? 0);
                    const totalPowerMW = Number(props.totalPowerMW ?? 0);
                    return {
                        id: `dc-${f.properties.cluster_id}`,
                        lat: coords[1], lon: coords[0],
                        count: clusterCount,
                        items,
                        region: String(props.country ?? items[0]?.country ?? ''),
                        country: String(props.country ?? items[0]?.country ?? ''),
                        totalChips,
                        totalPowerMW,
                        majorityExisting: existingCount >= Math.max(1, clusterCount / 2),
                        existingCount,
                        plannedCount,
                        sampled: items.length < clusterCount,
                    };
                }
                const item = activeDCs[f.properties.index];
                return {
                    id: `dp-${f.properties.index}`, lat: item.lat, lon: item.lon,
                    count: 1, items: [item], region: item.country, country: item.country,
                    totalChips: item.chipCount, totalPowerMW: item.powerMW ?? 0,
                    majorityExisting: item.status === 'existing',
                    existingCount: item.status === 'existing' ? 1 : 0,
                    plannedCount: item.status === 'planned' ? 1 : 0,
                    sampled: false,
                };
            });
        }
        else {
            this.datacenterClusters = [];
        }
    }
    isLayerVisible(layerKey) {
        const threshold = LAYER_ZOOM_THRESHOLDS[layerKey];
        if (!threshold)
            return true;
        const zoom = this.maplibreMap?.getZoom() || 2;
        return zoom >= threshold.minZoom;
    }
    buildLayers() {
        const startTime = performance.now();
        // Refresh theme-aware overlay colors on each rebuild
        COLORS = getOverlayColors();
        const layers = [];
        const { layers: mapLayers } = this.state;
        const filteredEarthquakes = this.filterByTime(this.earthquakes, (eq) => eq.occurredAt);
        const filteredNaturalEvents = this.filterByTime(this.naturalEvents, (event) => event.date);
        const filteredWeatherAlerts = this.filterByTime(this.weatherAlerts, (alert) => alert.onset);
        const filteredOutages = this.filterByTime(this.outages, (outage) => outage.pubDate);
        const filteredCableAdvisories = this.filterByTime(this.cableAdvisories, (advisory) => advisory.reported);
        const filteredFlightDelays = this.filterByTime(this.flightDelays, (delay) => delay.updatedAt);
        const filteredMilitaryFlights = this.filterByTime(this.militaryFlights, (flight) => flight.lastSeen);
        const filteredMilitaryVessels = this.filterByTime(this.militaryVessels, (vessel) => vessel.lastAisUpdate);
        const filteredMilitaryFlightClusters = this.filterMilitaryFlightClustersByTime(this.militaryFlightClusters);
        const filteredMilitaryVesselClusters = this.filterMilitaryVesselClustersByTime(this.militaryVesselClusters);
        const filteredUcdpEvents = this.filterByTime(this.ucdpEvents, (event) => event.date_start);
        // Day/night overlay (rendered first as background)
        if (mapLayers.dayNight) {
            if (!this.dayNightIntervalId)
                this.startDayNightTimer();
            layers.push(this.createDayNightLayer());
        }
        else {
            if (this.dayNightIntervalId)
                this.stopDayNightTimer();
            this.layerCache.delete('day-night-layer');
        }
        // Undersea cables layer
        if (mapLayers.cables) {
            layers.push(this.createCablesLayer());
        }
        else {
            this.layerCache.delete('cables-layer');
        }
        // Pipelines layer
        if (mapLayers.pipelines) {
            layers.push(this.createPipelinesLayer());
        }
        else {
            this.layerCache.delete('pipelines-layer');
        }
        // Conflict zones layer
        if (mapLayers.conflicts) {
            layers.push(this.createConflictZonesLayer());
        }
        // Military bases layer — hidden at low zoom (E: progressive disclosure) + ghost + clusters
        if (mapLayers.bases && this.isLayerVisible('bases')) {
            layers.push(this.createBasesLayer());
            layers.push(...this.createBasesClusterLayer());
            const basesData = this.getBasesData();
            layers.push(this.createGhostLayer('bases-layer', basesData, d => [d.lon, d.lat], { radiusMinPixels: 12 }));
        }
        // Nuclear facilities layer — hidden at low zoom + ghost
        if (mapLayers.nuclear && this.isLayerVisible('nuclear')) {
            layers.push(this.createNuclearLayer());
            layers.push(this.createGhostLayer('nuclear-layer', config_1.NUCLEAR_FACILITIES.filter(f => f.status !== 'decommissioned'), d => [d.lon, d.lat], { radiusMinPixels: 12 }));
        }
        // Gamma irradiators layer — hidden at low zoom
        if (mapLayers.irradiators && this.isLayerVisible('irradiators')) {
            layers.push(this.createIrradiatorsLayer());
        }
        // Spaceports layer — hidden at low zoom
        if (mapLayers.spaceports && this.isLayerVisible('spaceports')) {
            layers.push(this.createSpaceportsLayer());
        }
        // Hotspots layer (all hotspots including high/breaking, with pulse + ghost)
        if (mapLayers.hotspots) {
            layers.push(...this.createHotspotsLayers());
        }
        // Datacenters layer - SQUARE icons at zoom >= 5, cluster dots at zoom < 5
        const currentZoom = this.maplibreMap?.getZoom() || 2;
        if (mapLayers.datacenters) {
            if (currentZoom >= 5) {
                layers.push(this.createDatacentersLayer());
            }
            else {
                layers.push(...this.createDatacenterClusterLayers());
            }
        }
        // Earthquakes layer + ghost for easier picking
        if (mapLayers.natural && filteredEarthquakes.length > 0) {
            layers.push(this.createEarthquakesLayer(filteredEarthquakes));
            layers.push(this.createGhostLayer('earthquakes-layer', filteredEarthquakes, d => [d.location?.longitude ?? 0, d.location?.latitude ?? 0], { radiusMinPixels: 12 }));
        }
        // Natural events layer
        if (mapLayers.natural && filteredNaturalEvents.length > 0) {
            layers.push(this.createNaturalEventsLayer(filteredNaturalEvents));
        }
        // Satellite fires layer (NASA FIRMS)
        if (mapLayers.fires && this.firmsFireData.length > 0) {
            layers.push(this.createFiresLayer());
        }
        // Iran events layer
        if (mapLayers.iranAttacks && this.iranEvents.length > 0) {
            layers.push(this.createIranEventsLayer());
            layers.push(this.createGhostLayer('iran-events-layer', this.iranEvents, d => [d.longitude, d.latitude], { radiusMinPixels: 12 }));
        }
        // Weather alerts layer
        if (mapLayers.weather && filteredWeatherAlerts.length > 0) {
            layers.push(this.createWeatherLayer(filteredWeatherAlerts));
        }
        // Internet outages layer + ghost for easier picking
        if (mapLayers.outages && filteredOutages.length > 0) {
            layers.push(this.createOutagesLayer(filteredOutages));
            layers.push(this.createGhostLayer('outages-layer', filteredOutages, d => [d.lon, d.lat], { radiusMinPixels: 12 }));
        }
        // Cyber threat IOC layer
        if (mapLayers.cyberThreats && this.cyberThreats.length > 0) {
            layers.push(this.createCyberThreatsLayer());
            layers.push(this.createGhostLayer('cyber-threats-layer', this.cyberThreats, d => [d.lon, d.lat], { radiusMinPixels: 12 }));
        }
        // AIS density layer
        if (mapLayers.ais && this.aisDensity.length > 0) {
            layers.push(this.createAisDensityLayer());
        }
        // AIS disruptions layer (spoofing/jamming)
        if (mapLayers.ais && this.aisDisruptions.length > 0) {
            layers.push(this.createAisDisruptionsLayer());
        }
        // Strategic ports layer (shown with AIS)
        if (mapLayers.ais) {
            layers.push(this.createPortsLayer());
        }
        // Cable advisories layer (shown with cables)
        if (mapLayers.cables && filteredCableAdvisories.length > 0) {
            layers.push(this.createCableAdvisoriesLayer(filteredCableAdvisories));
        }
        // Repair ships layer (shown with cables)
        if (mapLayers.cables && this.repairShips.length > 0) {
            layers.push(this.createRepairShipsLayer());
        }
        // Flight delays layer
        if (mapLayers.flights && filteredFlightDelays.length > 0) {
            layers.push(this.createFlightDelaysLayer(filteredFlightDelays));
        }
        // Live global civilian flights layer
        if (mapLayers.liveFlights && this.civilianFlights.length > 0) {
            layers.push(this.createCivilianFlightsLayer());
        }
        // Protests layer (Supercluster-based deck.gl layers)
        if (mapLayers.protests && this.protests.length > 0) {
            layers.push(...this.createProtestClusterLayers());
        }
        // Military vessels layer
        if (mapLayers.military && filteredMilitaryVessels.length > 0) {
            layers.push(this.createMilitaryVesselsLayer(filteredMilitaryVessels));
        }
        // Military vessel clusters layer
        if (mapLayers.military && filteredMilitaryVesselClusters.length > 0) {
            layers.push(this.createMilitaryVesselClustersLayer(filteredMilitaryVesselClusters));
        }
        // Military flights layer
        if (mapLayers.military && filteredMilitaryFlights.length > 0) {
            layers.push(this.createMilitaryFlightsLayer(filteredMilitaryFlights));
        }
        // Military flight clusters layer
        if (mapLayers.military && filteredMilitaryFlightClusters.length > 0) {
            layers.push(this.createMilitaryFlightClustersLayer(filteredMilitaryFlightClusters));
        }
        // Strategic waterways layer
        if (mapLayers.waterways) {
            layers.push(this.createWaterwaysLayer());
        }
        // Economic centers layer — hidden at low zoom
        if (mapLayers.economic && this.isLayerVisible('economic')) {
            layers.push(this.createEconomicCentersLayer());
        }
        // Finance variant layers
        if (mapLayers.stockExchanges) {
            layers.push(this.createStockExchangesLayer());
        }
        if (mapLayers.financialCenters) {
            layers.push(this.createFinancialCentersLayer());
        }
        if (mapLayers.centralBanks) {
            layers.push(this.createCentralBanksLayer());
        }
        if (mapLayers.commodityHubs) {
            layers.push(this.createCommodityHubsLayer());
        }
        // Critical minerals layer
        if (mapLayers.minerals) {
            layers.push(this.createMineralsLayer());
        }
        // APT Groups layer (geopolitical variant only - always shown, no toggle)
        if (config_1.SITE_VARIANT !== 'tech' && config_1.SITE_VARIANT !== 'happy') {
            layers.push(this.createAPTGroupsLayer());
        }
        // UCDP georeferenced events layer
        if (mapLayers.ucdpEvents && filteredUcdpEvents.length > 0) {
            layers.push(this.createUcdpEventsLayer(filteredUcdpEvents));
        }
        // Displacement flows arc layer
        if (mapLayers.displacement && this.displacementFlows.length > 0) {
            layers.push(this.createDisplacementArcsLayer());
        }
        // Climate anomalies heatmap layer
        if (mapLayers.climate && this.climateAnomalies.length > 0) {
            layers.push(this.createClimateHeatmapLayer());
        }
        // Trade routes layer
        if (mapLayers.tradeRoutes) {
            layers.push(this.createTradeRoutesLayer());
            layers.push(this.createTradeChokepointsLayer());
        }
        else {
            this.layerCache.delete('trade-routes-layer');
            this.layerCache.delete('trade-chokepoints-layer');
        }
        // Tech variant layers (Supercluster-based deck.gl layers for HQs and events)
        if (config_1.SITE_VARIANT === 'tech') {
            if (mapLayers.startupHubs) {
                layers.push(this.createStartupHubsLayer());
            }
            if (mapLayers.techHQs) {
                layers.push(...this.createTechHQClusterLayers());
            }
            if (mapLayers.accelerators) {
                layers.push(this.createAcceleratorsLayer());
            }
            if (mapLayers.cloudRegions) {
                layers.push(this.createCloudRegionsLayer());
            }
            if (mapLayers.techEvents && this.techEvents.length > 0) {
                layers.push(...this.createTechEventClusterLayers());
            }
        }
        // Gulf FDI investments layer
        if (mapLayers.gulfInvestments) {
            layers.push(this.createGulfInvestmentsLayer());
        }
        // Positive events layer (happy variant)
        if (mapLayers.positiveEvents && this.positiveEvents.length > 0) {
            layers.push(...this.createPositiveEventsLayers());
        }
        // Kindness layer (happy variant -- green baseline pulses + real kindness events)
        if (mapLayers.kindness && this.kindnessPoints.length > 0) {
            layers.push(...this.createKindnessLayers());
        }
        // Phase 8: Happiness choropleth (rendered below point markers)
        if (mapLayers.happiness) {
            const choropleth = this.createHappinessChoroplethLayer();
            if (choropleth)
                layers.push(choropleth);
        }
        // Phase 8: Species recovery zones
        if (mapLayers.speciesRecovery && this.speciesRecoveryZones.length > 0) {
            layers.push(this.createSpeciesRecoveryLayer());
        }
        // Phase 8: Renewable energy installations
        if (mapLayers.renewableInstallations && this.renewableInstallations.length > 0) {
            layers.push(this.createRenewableInstallationsLayer());
        }
        // News geo-locations (always shown if data exists)
        if (this.newsLocations.length > 0) {
            layers.push(...this.createNewsLocationsLayer());
        }
        const result = layers.filter(Boolean);
        const elapsed = performance.now() - startTime;
        if (import.meta.env.DEV && elapsed > 16) {
            console.warn(`[DeckGLMap] buildLayers took ${elapsed.toFixed(2)}ms (>16ms budget), ${result.length} layers`);
        }
        return result;
    }
    // Layer creation methods
    createCablesLayer() {
        const highlightedCables = this.highlightedAssets.cable;
        const cacheKey = 'cables-layer';
        const cached = this.layerCache.get(cacheKey);
        const highlightSignature = this.getSetSignature(highlightedCables);
        const healthSignature = Object.keys(this.healthByCableId).sort().join(',');
        if (cached && highlightSignature === this.lastCableHighlightSignature && healthSignature === this.lastCableHealthSignature)
            return cached;
        const health = this.healthByCableId;
        const layer = new layers_1.PathLayer({
            id: cacheKey,
            data: config_1.UNDERSEA_CABLES,
            getPath: (d) => d.points,
            getColor: (d) => {
                if (highlightedCables.has(d.id))
                    return COLORS.cableHighlight;
                const h = health[d.id];
                if (h?.status === 'fault')
                    return COLORS.cableFault;
                if (h?.status === 'degraded')
                    return COLORS.cableDegraded;
                return COLORS.cable;
            },
            getWidth: (d) => {
                if (highlightedCables.has(d.id))
                    return 3;
                const h = health[d.id];
                if (h?.status === 'fault')
                    return 2.5;
                if (h?.status === 'degraded')
                    return 2;
                return 1;
            },
            widthMinPixels: 1,
            widthMaxPixels: 5,
            pickable: true,
            updateTriggers: { highlighted: highlightSignature, health: healthSignature },
        });
        this.lastCableHighlightSignature = highlightSignature;
        this.lastCableHealthSignature = healthSignature;
        this.layerCache.set(cacheKey, layer);
        return layer;
    }
    createPipelinesLayer() {
        const highlightedPipelines = this.highlightedAssets.pipeline;
        const cacheKey = 'pipelines-layer';
        const cached = this.layerCache.get(cacheKey);
        const highlightSignature = this.getSetSignature(highlightedPipelines);
        if (cached && highlightSignature === this.lastPipelineHighlightSignature)
            return cached;
        const layer = new layers_1.PathLayer({
            id: cacheKey,
            data: config_1.PIPELINES,
            getPath: (d) => d.points,
            getColor: (d) => {
                if (highlightedPipelines.has(d.id)) {
                    return [255, 100, 100, 200];
                }
                const colorKey = d.type;
                const hex = config_1.PIPELINE_COLORS[colorKey] || '#666666';
                return this.hexToRgba(hex, 150);
            },
            getWidth: (d) => highlightedPipelines.has(d.id) ? 3 : 1.5,
            widthMinPixels: 1,
            widthMaxPixels: 4,
            pickable: true,
            updateTriggers: { highlighted: highlightSignature },
        });
        this.lastPipelineHighlightSignature = highlightSignature;
        this.layerCache.set(cacheKey, layer);
        return layer;
    }
    createConflictZonesLayer() {
        const cacheKey = 'conflict-zones-layer';
        const geojsonData = {
            type: 'FeatureCollection',
            features: config_1.CONFLICT_ZONES.map(zone => ({
                type: 'Feature',
                properties: { id: zone.id, name: zone.name, intensity: zone.intensity },
                geometry: {
                    type: 'Polygon',
                    coordinates: [zone.coords],
                },
            })),
        };
        const layer = new layers_1.GeoJsonLayer({
            id: cacheKey,
            data: geojsonData,
            filled: true,
            stroked: true,
            getFillColor: () => COLORS.conflict,
            getLineColor: () => (0, index_1.getCurrentTheme)() === 'light'
                ? [255, 0, 0, 120]
                : [255, 0, 0, 180],
            getLineWidth: 2,
            lineWidthMinPixels: 1,
            pickable: true,
        });
        return layer;
    }
    getBasesData() {
        return this.serverBasesLoaded ? this.serverBases : config_1.MILITARY_BASES;
    }
    getBaseColor(type, a) {
        switch (type) {
            case 'us-nato': return [68, 136, 255, a];
            case 'russia': return [255, 68, 68, a];
            case 'china': return [255, 136, 68, a];
            case 'uk': return [68, 170, 255, a];
            case 'france': return [0, 85, 164, a];
            case 'india': return [255, 153, 51, a];
            case 'japan': return [188, 0, 45, a];
            default: return [136, 136, 136, a];
        }
    }
    createBasesLayer() {
        const highlightedBases = this.highlightedAssets.base;
        const zoom = this.maplibreMap?.getZoom() || 3;
        const alphaScale = Math.min(1, (zoom - 2.5) / 2.5);
        const a = Math.round(160 * Math.max(0.3, alphaScale));
        const data = this.getBasesData();
        return new layers_1.IconLayer({
            id: 'bases-layer',
            data,
            getPosition: (d) => [d.lon, d.lat],
            getIcon: () => 'triangleUp',
            iconAtlas: MARKER_ICONS.triangleUp,
            iconMapping: { triangleUp: { x: 0, y: 0, width: 32, height: 32, mask: true } },
            getSize: (d) => highlightedBases.has(d.id) ? 16 : 11,
            getColor: (d) => {
                if (highlightedBases.has(d.id)) {
                    return [255, 100, 100, 220];
                }
                return this.getBaseColor(d.type, a);
            },
            sizeScale: 1,
            sizeMinPixels: 6,
            sizeMaxPixels: 16,
            pickable: true,
        });
    }
    createBasesClusterLayer() {
        if (this.serverBaseClusters.length === 0)
            return [];
        const zoom = this.maplibreMap?.getZoom() || 3;
        const alphaScale = Math.min(1, (zoom - 2.5) / 2.5);
        const a = Math.round(180 * Math.max(0.3, alphaScale));
        const scatterLayer = new layers_1.ScatterplotLayer({
            id: 'bases-cluster-layer',
            data: this.serverBaseClusters,
            getPosition: (d) => [d.longitude, d.latitude],
            getRadius: (d) => Math.max(8000, Math.log2(d.count) * 6000),
            getFillColor: (d) => this.getBaseColor(d.dominantType, a),
            radiusMinPixels: 10,
            radiusMaxPixels: 40,
            pickable: true,
        });
        const textLayer = new layers_1.TextLayer({
            id: 'bases-cluster-text',
            data: this.serverBaseClusters,
            getPosition: (d) => [d.longitude, d.latitude],
            getText: (d) => String(d.count),
            getSize: 12,
            getColor: [255, 255, 255, 220],
            fontWeight: 'bold',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'center',
        });
        return [scatterLayer, textLayer];
    }
    createNuclearLayer() {
        const highlightedNuclear = this.highlightedAssets.nuclear;
        const data = config_1.NUCLEAR_FACILITIES.filter(f => f.status !== 'decommissioned');
        // Nuclear: HEXAGON icons - yellow/orange color, semi-transparent
        return new layers_1.IconLayer({
            id: 'nuclear-layer',
            data,
            getPosition: (d) => [d.lon, d.lat],
            getIcon: () => 'hexagon',
            iconAtlas: MARKER_ICONS.hexagon,
            iconMapping: { hexagon: { x: 0, y: 0, width: 32, height: 32, mask: true } },
            getSize: (d) => highlightedNuclear.has(d.id) ? 15 : 11,
            getColor: (d) => {
                if (highlightedNuclear.has(d.id)) {
                    return [255, 100, 100, 220];
                }
                if (d.status === 'contested') {
                    return [255, 50, 50, 200];
                }
                return [255, 220, 0, 200]; // Semi-transparent yellow
            },
            sizeScale: 1,
            sizeMinPixels: 6,
            sizeMaxPixels: 15,
            pickable: true,
        });
    }
    createIrradiatorsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'irradiators-layer',
            data: config_1.GAMMA_IRRADIATORS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 6000,
            getFillColor: [255, 100, 255, 180], // Magenta
            radiusMinPixels: 4,
            radiusMaxPixels: 10,
            pickable: true,
        });
    }
    createSpaceportsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'spaceports-layer',
            data: config_1.SPACEPORTS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 10000,
            getFillColor: [200, 100, 255, 200], // Purple
            radiusMinPixels: 5,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createPortsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'ports-layer',
            data: config_1.PORTS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 6000,
            getFillColor: (d) => {
                // Color by port type (matching old Map.ts icons)
                switch (d.type) {
                    case 'naval': return [100, 150, 255, 200]; // Blue - ⚓
                    case 'oil': return [255, 140, 0, 200]; // Orange - 🛢️
                    case 'lng': return [255, 200, 50, 200]; // Yellow - 🛢️
                    case 'container': return [0, 200, 255, 180]; // Cyan - 🏭
                    case 'mixed': return [150, 200, 150, 180]; // Green
                    case 'bulk': return [180, 150, 120, 180]; // Brown
                    default: return [0, 200, 255, 160];
                }
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 10,
            pickable: true,
        });
    }
    createFlightDelaysLayer(delays) {
        return new layers_1.ScatterplotLayer({
            id: 'flight-delays-layer',
            data: delays,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => {
                if (d.severity === 'severe')
                    return 15000;
                if (d.severity === 'major')
                    return 12000;
                if (d.severity === 'moderate')
                    return 10000;
                return 8000;
            },
            getFillColor: (d) => {
                if (d.severity === 'severe')
                    return [255, 50, 50, 200];
                if (d.severity === 'major')
                    return [255, 150, 0, 200];
                if (d.severity === 'moderate')
                    return [255, 200, 100, 180];
                return [180, 180, 180, 150];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 15,
            pickable: true,
        });
    }
    createCivilianFlightsLayer() {
        // OpenSky array format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, ...]
        // Sometimes longitude (d[5]) or latitude (d[6]) are null, crashing DeckGL's buffer.
        const validFlights = this.civilianFlights.filter(d => Array.isArray(d) && d.length >= 7 && typeof d[5] === 'number' && typeof d[6] === 'number');
        return new layers_1.ScatterplotLayer({
            id: 'civilian-flights-layer',
            data: validFlights,
            getPosition: (d) => [d[5], d[6]], // longitude, latitude
            getRadius: 6000,
            getFillColor: [255, 255, 220, 230], // Off-white/yellowish to stand out from military red
            radiusMinPixels: 2,
            radiusMaxPixels: 8,
            pickable: true,
        });
    }
    createGhostLayer(id, data, getPosition, opts = {}) {
        return new layers_1.ScatterplotLayer({
            id: `${id}-ghost`,
            data,
            getPosition,
            getRadius: 1,
            radiusMinPixels: opts.radiusMinPixels ?? 12,
            getFillColor: [0, 0, 0, 0],
            pickable: true,
        });
    }
    createDatacentersLayer() {
        const highlightedDC = this.highlightedAssets.datacenter;
        const data = config_1.AI_DATA_CENTERS.filter(dc => dc.status !== 'decommissioned');
        // Datacenters: SQUARE icons - purple color, semi-transparent for layering
        return new layers_1.IconLayer({
            id: 'datacenters-layer',
            data,
            getPosition: (d) => [d.lon, d.lat],
            getIcon: () => 'square',
            iconAtlas: MARKER_ICONS.square,
            iconMapping: { square: { x: 0, y: 0, width: 32, height: 32, mask: true } },
            getSize: (d) => highlightedDC.has(d.id) ? 14 : 10,
            getColor: (d) => {
                if (highlightedDC.has(d.id)) {
                    return [255, 100, 100, 200];
                }
                if (d.status === 'planned') {
                    return [136, 68, 255, 100]; // Transparent for planned
                }
                return [136, 68, 255, 140]; // ~55% opacity
            },
            sizeScale: 1,
            sizeMinPixels: 6,
            sizeMaxPixels: 14,
            pickable: true,
        });
    }
    createEarthquakesLayer(earthquakes) {
        return new layers_1.ScatterplotLayer({
            id: 'earthquakes-layer',
            data: earthquakes,
            getPosition: (d) => [d.location?.longitude ?? 0, d.location?.latitude ?? 0],
            getRadius: (d) => Math.pow(2, d.magnitude) * 1000,
            getFillColor: (d) => {
                const mag = d.magnitude;
                if (mag >= 6)
                    return [255, 0, 0, 200];
                if (mag >= 5)
                    return [255, 100, 0, 200];
                return COLORS.earthquake;
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 30,
            pickable: true,
        });
    }
    createNaturalEventsLayer(events) {
        return new layers_1.ScatterplotLayer({
            id: 'natural-events-layer',
            data: events,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => d.title.startsWith('🔴') ? 20000 : d.title.startsWith('🟠') ? 15000 : 8000,
            getFillColor: (d) => {
                if (d.title.startsWith('🔴'))
                    return [255, 0, 0, 220];
                if (d.title.startsWith('🟠'))
                    return [255, 140, 0, 200];
                return [255, 150, 50, 180];
            },
            radiusMinPixels: 5,
            radiusMaxPixels: 18,
            pickable: true,
        });
    }
    createFiresLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'fires-layer',
            data: this.firmsFireData,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => Math.min(d.frp * 200, 30000) || 5000,
            getFillColor: (d) => {
                if (d.brightness > 400)
                    return [255, 30, 0, 220];
                if (d.brightness > 350)
                    return [255, 140, 0, 200];
                return [255, 220, 50, 180];
            },
            radiusMinPixels: 3,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createIranEventsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'iran-events-layer',
            data: this.iranEvents,
            getPosition: (d) => [d.longitude, d.latitude],
            getRadius: (d) => d.severity === 'high' ? 20000 : d.severity === 'medium' ? 15000 : 10000,
            getFillColor: (d) => {
                if (d.category === 'military')
                    return [255, 50, 50, 220];
                if (d.category === 'politics' || d.category === 'diplomacy')
                    return [255, 165, 0, 200];
                return [255, 255, 0, 180];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 16,
            pickable: true,
        });
    }
    createWeatherLayer(alerts) {
        // Filter weather alerts that have centroid coordinates
        const alertsWithCoords = alerts.filter(a => a.centroid && a.centroid.length === 2);
        return new layers_1.ScatterplotLayer({
            id: 'weather-layer',
            data: alertsWithCoords,
            getPosition: (d) => d.centroid, // centroid is [lon, lat]
            getRadius: 25000,
            getFillColor: (d) => {
                if (d.severity === 'Extreme')
                    return [255, 0, 0, 200];
                if (d.severity === 'Severe')
                    return [255, 100, 0, 180];
                if (d.severity === 'Moderate')
                    return [255, 170, 0, 160];
                return COLORS.weather;
            },
            radiusMinPixels: 8,
            radiusMaxPixels: 20,
            pickable: true,
        });
    }
    createOutagesLayer(outages) {
        return new layers_1.ScatterplotLayer({
            id: 'outages-layer',
            data: outages,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 20000,
            getFillColor: COLORS.outage,
            radiusMinPixels: 6,
            radiusMaxPixels: 18,
            pickable: true,
        });
    }
    createCyberThreatsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'cyber-threats-layer',
            data: this.cyberThreats,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => {
                switch (d.severity) {
                    case 'critical': return 22000;
                    case 'high': return 17000;
                    case 'medium': return 13000;
                    default: return 9000;
                }
            },
            getFillColor: (d) => {
                switch (d.severity) {
                    case 'critical': return [255, 61, 0, 225];
                    case 'high': return [255, 102, 0, 205];
                    case 'medium': return [255, 176, 0, 185];
                    default: return [255, 235, 59, 170];
                }
            },
            radiusMinPixels: 6,
            radiusMaxPixels: 18,
            pickable: true,
            stroked: true,
            getLineColor: [255, 255, 255, 160],
            lineWidthMinPixels: 1,
        });
    }
    createAisDensityLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'ais-density-layer',
            data: this.aisDensity,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => 4000 + d.intensity * 8000,
            getFillColor: (d) => {
                const intensity = Math.min(Math.max(d.intensity, 0.15), 1);
                const isCongested = (d.deltaPct || 0) >= 15;
                const alpha = Math.round(40 + intensity * 160);
                // Orange for congested areas, cyan for normal traffic
                if (isCongested) {
                    return [255, 183, 3, alpha]; // #ffb703
                }
                return [0, 209, 255, alpha]; // #00d1ff
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createAisDisruptionsLayer() {
        // AIS spoofing/jamming events
        return new layers_1.ScatterplotLayer({
            id: 'ais-disruptions-layer',
            data: this.aisDisruptions,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 12000,
            getFillColor: (d) => {
                // Color by severity/type
                if (d.severity === 'high' || d.type === 'spoofing') {
                    return [255, 50, 50, 220]; // Red
                }
                if (d.severity === 'medium') {
                    return [255, 150, 0, 200]; // Orange
                }
                return [255, 200, 100, 180]; // Yellow
            },
            radiusMinPixels: 6,
            radiusMaxPixels: 14,
            pickable: true,
            stroked: true,
            getLineColor: [255, 255, 255, 150],
            lineWidthMinPixels: 1,
        });
    }
    createCableAdvisoriesLayer(advisories) {
        // Cable fault/maintenance advisories
        return new layers_1.ScatterplotLayer({
            id: 'cable-advisories-layer',
            data: advisories,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 10000,
            getFillColor: (d) => {
                if (d.severity === 'fault') {
                    return [255, 50, 50, 220]; // Red for faults
                }
                return [255, 200, 0, 200]; // Yellow for maintenance
            },
            radiusMinPixels: 5,
            radiusMaxPixels: 12,
            pickable: true,
            stroked: true,
            getLineColor: [0, 200, 255, 200], // Cyan outline (cable color)
            lineWidthMinPixels: 2,
        });
    }
    createRepairShipsLayer() {
        // Cable repair ships
        return new layers_1.ScatterplotLayer({
            id: 'repair-ships-layer',
            data: this.repairShips,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 8000,
            getFillColor: [0, 255, 200, 200], // Teal
            radiusMinPixels: 4,
            radiusMaxPixels: 10,
            pickable: true,
        });
    }
    createMilitaryVesselsLayer(vessels) {
        return new layers_1.ScatterplotLayer({
            id: 'military-vessels-layer',
            data: vessels,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 6000,
            getFillColor: (d) => {
                if (d.usniSource)
                    return [255, 160, 60, 160]; // Orange, lower alpha for USNI-only
                return COLORS.vesselMilitary;
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 10,
            pickable: true,
            stroked: true,
            getLineColor: (d) => {
                if (d.usniSource)
                    return [255, 180, 80, 200]; // Orange outline
                return [0, 0, 0, 0]; // No outline for AIS
            },
            lineWidthMinPixels: 2,
        });
    }
    createMilitaryVesselClustersLayer(clusters) {
        return new layers_1.ScatterplotLayer({
            id: 'military-vessel-clusters-layer',
            data: clusters,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => 15000 + (d.vesselCount || 1) * 3000,
            getFillColor: (d) => {
                // Vessel types: 'exercise' | 'deployment' | 'transit' | 'unknown'
                const activity = d.activityType || 'unknown';
                if (activity === 'exercise' || activity === 'deployment')
                    return [255, 100, 100, 200];
                if (activity === 'transit')
                    return [255, 180, 100, 180];
                return [200, 150, 150, 160];
            },
            radiusMinPixels: 8,
            radiusMaxPixels: 25,
            pickable: true,
        });
    }
    createMilitaryFlightsLayer(flights) {
        return new layers_1.ScatterplotLayer({
            id: 'military-flights-layer',
            data: flights,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 8000,
            getFillColor: COLORS.flightMilitary,
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createMilitaryFlightClustersLayer(clusters) {
        return new layers_1.ScatterplotLayer({
            id: 'military-flight-clusters-layer',
            data: clusters,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => 15000 + (d.flightCount || 1) * 3000,
            getFillColor: (d) => {
                const activity = d.activityType || 'unknown';
                if (activity === 'exercise' || activity === 'patrol')
                    return [100, 150, 255, 200];
                if (activity === 'transport')
                    return [255, 200, 100, 180];
                return [150, 150, 200, 160];
            },
            radiusMinPixels: 8,
            radiusMaxPixels: 25,
            pickable: true,
        });
    }
    createWaterwaysLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'waterways-layer',
            data: config_1.STRATEGIC_WATERWAYS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 10000,
            getFillColor: [100, 150, 255, 180],
            radiusMinPixels: 5,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createEconomicCentersLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'economic-centers-layer',
            data: config_1.ECONOMIC_CENTERS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 8000,
            getFillColor: [255, 215, 0, 180],
            radiusMinPixels: 4,
            radiusMaxPixels: 10,
            pickable: true,
        });
    }
    createStockExchangesLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'stock-exchanges-layer',
            data: config_1.STOCK_EXCHANGES,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => d.tier === 'mega' ? 18000 : d.tier === 'major' ? 14000 : 11000,
            getFillColor: (d) => {
                if (d.tier === 'mega')
                    return [255, 215, 80, 220];
                if (d.tier === 'major')
                    return COLORS.stockExchange;
                return [140, 210, 255, 190];
            },
            radiusMinPixels: 5,
            radiusMaxPixels: 14,
            pickable: true,
        });
    }
    createFinancialCentersLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'financial-centers-layer',
            data: config_1.FINANCIAL_CENTERS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => d.type === 'global' ? 17000 : d.type === 'regional' ? 13000 : 10000,
            getFillColor: (d) => {
                if (d.type === 'global')
                    return COLORS.financialCenter;
                if (d.type === 'regional')
                    return [0, 190, 130, 185];
                return [0, 150, 110, 165];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createCentralBanksLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'central-banks-layer',
            data: config_1.CENTRAL_BANKS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => d.type === 'major' ? 15000 : d.type === 'supranational' ? 17000 : 12000,
            getFillColor: (d) => {
                if (d.type === 'major')
                    return COLORS.centralBank;
                if (d.type === 'supranational')
                    return [255, 235, 140, 220];
                return [235, 180, 80, 185];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createCommodityHubsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'commodity-hubs-layer',
            data: config_1.COMMODITY_HUBS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => d.type === 'exchange' ? 14000 : d.type === 'port' ? 12000 : 10000,
            getFillColor: (d) => {
                if (d.type === 'exchange')
                    return COLORS.commodityHub;
                if (d.type === 'port')
                    return [80, 170, 255, 190];
                return [255, 110, 80, 185];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: 11,
            pickable: true,
        });
    }
    createAPTGroupsLayer() {
        // APT Groups - cyber threat actor markers (geopolitical variant only)
        // Made subtle to avoid visual clutter - small orange dots
        return new layers_1.ScatterplotLayer({
            id: 'apt-groups-layer',
            data: config_1.APT_GROUPS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 6000,
            getFillColor: [255, 140, 0, 140], // Subtle orange
            radiusMinPixels: 4,
            radiusMaxPixels: 8,
            pickable: true,
            stroked: false, // No outline - cleaner look
        });
    }
    createMineralsLayer() {
        // Critical minerals projects
        return new layers_1.ScatterplotLayer({
            id: 'minerals-layer',
            data: config_1.CRITICAL_MINERALS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 8000,
            getFillColor: (d) => {
                // Color by mineral type
                switch (d.mineral) {
                    case 'Lithium': return [0, 200, 255, 200]; // Cyan
                    case 'Cobalt': return [100, 100, 255, 200]; // Blue
                    case 'Rare Earths': return [255, 100, 200, 200]; // Pink
                    case 'Nickel': return [100, 255, 100, 200]; // Green
                    default: return [200, 200, 200, 200]; // Gray
                }
            },
            radiusMinPixels: 5,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    // Tech variant layers
    createStartupHubsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'startup-hubs-layer',
            data: config_1.STARTUP_HUBS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 10000,
            getFillColor: COLORS.startupHub,
            radiusMinPixels: 5,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createAcceleratorsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'accelerators-layer',
            data: config_1.ACCELERATORS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 6000,
            getFillColor: COLORS.accelerator,
            radiusMinPixels: 3,
            radiusMaxPixels: 8,
            pickable: true,
        });
    }
    createCloudRegionsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'cloud-regions-layer',
            data: config_1.CLOUD_REGIONS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 12000,
            getFillColor: COLORS.cloudRegion,
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: true,
        });
    }
    createProtestClusterLayers() {
        this.updateClusterData();
        const layers = [];
        layers.push(new layers_1.ScatterplotLayer({
            id: 'protest-clusters-layer',
            data: this.protestClusters,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 15000 + d.count * 2000,
            radiusMinPixels: 6,
            radiusMaxPixels: 22,
            getFillColor: d => {
                if (d.hasRiot)
                    return [220, 40, 40, 200];
                if (d.maxSeverity === 'high')
                    return [255, 80, 60, 180];
                if (d.maxSeverity === 'medium')
                    return [255, 160, 40, 160];
                return [255, 220, 80, 140];
            },
            pickable: true,
            updateTriggers: { getRadius: this.lastSCZoom, getFillColor: this.lastSCZoom },
        }));
        layers.push(this.createGhostLayer('protest-clusters-layer', this.protestClusters, d => [d.lon, d.lat], { radiusMinPixels: 14 }));
        const multiClusters = this.protestClusters.filter(c => c.count > 1);
        if (multiClusters.length > 0) {
            layers.push(new layers_1.TextLayer({
                id: 'protest-clusters-badge',
                data: multiClusters,
                getText: d => String(d.count),
                getPosition: d => [d.lon, d.lat],
                background: true,
                getBackgroundColor: [0, 0, 0, 180],
                backgroundPadding: [4, 2, 4, 2],
                getColor: [255, 255, 255, 255],
                getSize: 12,
                getPixelOffset: [0, -14],
                pickable: false,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 700,
            }));
        }
        const pulseClusters = this.protestClusters.filter(c => c.maxSeverity === 'high' || c.hasRiot);
        if (pulseClusters.length > 0) {
            const pulse = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin((this.pulseTime || Date.now()) / 400));
            layers.push(new layers_1.ScatterplotLayer({
                id: 'protest-clusters-pulse',
                data: pulseClusters,
                getPosition: d => [d.lon, d.lat],
                getRadius: d => 15000 + d.count * 2000,
                radiusScale: pulse,
                radiusMinPixels: 8,
                radiusMaxPixels: 30,
                stroked: true,
                filled: false,
                getLineColor: d => d.hasRiot ? [220, 40, 40, 120] : [255, 80, 60, 100],
                lineWidthMinPixels: 1.5,
                pickable: false,
                updateTriggers: { radiusScale: this.pulseTime },
            }));
        }
        return layers;
    }
    createTechHQClusterLayers() {
        this.updateClusterData();
        const layers = [];
        const zoom = this.maplibreMap?.getZoom() || 2;
        layers.push(new layers_1.ScatterplotLayer({
            id: 'tech-hq-clusters-layer',
            data: this.techHQClusters,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 10000 + d.count * 1500,
            radiusMinPixels: 5,
            radiusMaxPixels: 18,
            getFillColor: d => {
                if (d.primaryType === 'faang')
                    return [0, 220, 120, 200];
                if (d.primaryType === 'unicorn')
                    return [255, 100, 200, 180];
                return [80, 160, 255, 180];
            },
            pickable: true,
            updateTriggers: { getRadius: this.lastSCZoom },
        }));
        layers.push(this.createGhostLayer('tech-hq-clusters-layer', this.techHQClusters, d => [d.lon, d.lat], { radiusMinPixels: 14 }));
        const multiClusters = this.techHQClusters.filter(c => c.count > 1);
        if (multiClusters.length > 0) {
            layers.push(new layers_1.TextLayer({
                id: 'tech-hq-clusters-badge',
                data: multiClusters,
                getText: d => String(d.count),
                getPosition: d => [d.lon, d.lat],
                background: true,
                getBackgroundColor: [0, 0, 0, 180],
                backgroundPadding: [4, 2, 4, 2],
                getColor: [255, 255, 255, 255],
                getSize: 12,
                getPixelOffset: [0, -14],
                pickable: false,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 700,
            }));
        }
        if (zoom >= 3) {
            const singles = this.techHQClusters.filter(c => c.count === 1);
            if (singles.length > 0) {
                layers.push(new layers_1.TextLayer({
                    id: 'tech-hq-clusters-label',
                    data: singles,
                    getText: d => d.items[0]?.company ?? '',
                    getPosition: d => [d.lon, d.lat],
                    getSize: 11,
                    getColor: [220, 220, 220, 200],
                    getPixelOffset: [0, 12],
                    pickable: false,
                    fontFamily: 'system-ui, sans-serif',
                }));
            }
        }
        return layers;
    }
    createTechEventClusterLayers() {
        this.updateClusterData();
        const layers = [];
        layers.push(new layers_1.ScatterplotLayer({
            id: 'tech-event-clusters-layer',
            data: this.techEventClusters,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 10000 + d.count * 1500,
            radiusMinPixels: 5,
            radiusMaxPixels: 18,
            getFillColor: d => {
                if (d.soonestDaysUntil <= 14)
                    return [255, 220, 50, 200];
                return [80, 140, 255, 180];
            },
            pickable: true,
            updateTriggers: { getRadius: this.lastSCZoom },
        }));
        layers.push(this.createGhostLayer('tech-event-clusters-layer', this.techEventClusters, d => [d.lon, d.lat], { radiusMinPixels: 14 }));
        const multiClusters = this.techEventClusters.filter(c => c.count > 1);
        if (multiClusters.length > 0) {
            layers.push(new layers_1.TextLayer({
                id: 'tech-event-clusters-badge',
                data: multiClusters,
                getText: d => String(d.count),
                getPosition: d => [d.lon, d.lat],
                background: true,
                getBackgroundColor: [0, 0, 0, 180],
                backgroundPadding: [4, 2, 4, 2],
                getColor: [255, 255, 255, 255],
                getSize: 12,
                getPixelOffset: [0, -14],
                pickable: false,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 700,
            }));
        }
        return layers;
    }
    createDatacenterClusterLayers() {
        this.updateClusterData();
        const layers = [];
        layers.push(new layers_1.ScatterplotLayer({
            id: 'datacenter-clusters-layer',
            data: this.datacenterClusters,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 15000 + d.count * 2000,
            radiusMinPixels: 6,
            radiusMaxPixels: 20,
            getFillColor: d => {
                if (d.majorityExisting)
                    return [160, 80, 255, 180];
                return [80, 160, 255, 180];
            },
            pickable: true,
            updateTriggers: { getRadius: this.lastSCZoom },
        }));
        layers.push(this.createGhostLayer('datacenter-clusters-layer', this.datacenterClusters, d => [d.lon, d.lat], { radiusMinPixels: 14 }));
        const multiClusters = this.datacenterClusters.filter(c => c.count > 1);
        if (multiClusters.length > 0) {
            layers.push(new layers_1.TextLayer({
                id: 'datacenter-clusters-badge',
                data: multiClusters,
                getText: d => String(d.count),
                getPosition: d => [d.lon, d.lat],
                background: true,
                getBackgroundColor: [0, 0, 0, 180],
                backgroundPadding: [4, 2, 4, 2],
                getColor: [255, 255, 255, 255],
                getSize: 12,
                getPixelOffset: [0, -14],
                pickable: false,
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 700,
            }));
        }
        return layers;
    }
    createHotspotsLayers() {
        const zoom = this.maplibreMap?.getZoom() || 2;
        const zoomScale = Math.min(1, (zoom - 1) / 3);
        const maxPx = 6 + Math.round(14 * zoomScale);
        const baseOpacity = zoom < 2.5 ? 0.5 : zoom < 4 ? 0.7 : 1.0;
        const layers = [];
        layers.push(new layers_1.ScatterplotLayer({
            id: 'hotspots-layer',
            data: this.hotspots,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => {
                const score = d.escalationScore || 1;
                return 10000 + score * 5000;
            },
            getFillColor: (d) => {
                const score = d.escalationScore || 1;
                const a = Math.round((score >= 4 ? 200 : score >= 2 ? 200 : 180) * baseOpacity);
                if (score >= 4)
                    return [255, 68, 68, a];
                if (score >= 2)
                    return [255, 165, 0, a];
                return [255, 255, 0, a];
            },
            radiusMinPixels: 4,
            radiusMaxPixels: maxPx,
            pickable: true,
            stroked: true,
            getLineColor: (d) => d.hasBreaking ? [255, 255, 255, 255] : [0, 0, 0, 0],
            lineWidthMinPixels: 2,
        }));
        layers.push(this.createGhostLayer('hotspots-layer', this.hotspots, d => [d.lon, d.lat], { radiusMinPixels: 14 }));
        const highHotspots = this.hotspots.filter(h => h.level === 'high' || h.hasBreaking);
        if (highHotspots.length > 0) {
            const pulse = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin((this.pulseTime || Date.now()) / 400));
            layers.push(new layers_1.ScatterplotLayer({
                id: 'hotspots-pulse',
                data: highHotspots,
                getPosition: (d) => [d.lon, d.lat],
                getRadius: (d) => {
                    const score = d.escalationScore || 1;
                    return 10000 + score * 5000;
                },
                radiusScale: pulse,
                radiusMinPixels: 6,
                radiusMaxPixels: 30,
                stroked: true,
                filled: false,
                getLineColor: (d) => {
                    const a = Math.round(120 * baseOpacity);
                    return d.hasBreaking ? [255, 50, 50, a] : [255, 165, 0, a];
                },
                lineWidthMinPixels: 1.5,
                pickable: false,
                updateTriggers: { radiusScale: this.pulseTime },
            }));
        }
        return layers;
    }
    createGulfInvestmentsLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'gulf-investments-layer',
            data: config_1.GULF_INVESTMENTS,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => {
                if (!d.investmentUSD)
                    return 20000;
                if (d.investmentUSD >= 50000)
                    return 70000;
                if (d.investmentUSD >= 10000)
                    return 55000;
                if (d.investmentUSD >= 1000)
                    return 40000;
                return 25000;
            },
            getFillColor: (d) => d.investingCountry === 'SA' ? COLORS.gulfInvestmentSA : COLORS.gulfInvestmentUAE,
            getLineColor: [255, 255, 255, 80],
            lineWidthMinPixels: 1,
            radiusMinPixels: 5,
            radiusMaxPixels: 28,
            pickable: true,
        });
    }
    canPulse(now = Date.now()) {
        return now - this.startupTime > 60000;
    }
    hasRecentRiot(now = Date.now(), windowMs = 2 * 60 * 60 * 1000) {
        const hasRecentClusterRiot = this.protestClusters.some(c => c.hasRiot && c.latestRiotEventTimeMs != null && (now - c.latestRiotEventTimeMs) < windowMs);
        if (hasRecentClusterRiot)
            return true;
        // Fallback to raw protests because syncPulseAnimation can run before cluster data refreshes.
        return this.protests.some((p) => {
            if (p.eventType !== 'riot' || p.sourceType === 'gdelt')
                return false;
            const ts = p.time.getTime();
            return Number.isFinite(ts) && (now - ts) < windowMs;
        });
    }
    needsPulseAnimation(now = Date.now()) {
        return this.hasRecentNews(now)
            || this.hasRecentRiot(now)
            || this.hotspots.some(h => h.hasBreaking)
            || this.positiveEvents.some(e => e.count > 10)
            || this.kindnessPoints.some(p => p.type === 'real');
    }
    syncPulseAnimation(now = Date.now()) {
        if (this.renderPaused) {
            if (this.newsPulseIntervalId !== null)
                this.stopPulseAnimation();
            return;
        }
        const shouldPulse = this.canPulse(now) && this.needsPulseAnimation(now);
        if (shouldPulse && this.newsPulseIntervalId === null) {
            this.startPulseAnimation();
        }
        else if (!shouldPulse && this.newsPulseIntervalId !== null) {
            this.stopPulseAnimation();
        }
    }
    startPulseAnimation() {
        if (this.newsPulseIntervalId !== null)
            return;
        const PULSE_UPDATE_INTERVAL_MS = 500;
        this.newsPulseIntervalId = setInterval(() => {
            const now = Date.now();
            if (!this.needsPulseAnimation(now)) {
                this.pulseTime = now;
                this.stopPulseAnimation();
                this.rafUpdateLayers();
                return;
            }
            this.pulseTime = now;
            this.rafUpdateLayers();
        }, PULSE_UPDATE_INTERVAL_MS);
    }
    stopPulseAnimation() {
        if (this.newsPulseIntervalId !== null) {
            clearInterval(this.newsPulseIntervalId);
            this.newsPulseIntervalId = null;
        }
    }
    createNewsLocationsLayer() {
        const zoom = this.maplibreMap?.getZoom() || 2;
        const alphaScale = zoom < 2.5 ? 0.4 : zoom < 4 ? 0.7 : 1.0;
        const filteredNewsLocations = this.filterByTime(this.newsLocations, (location) => location.timestamp);
        const THREAT_RGB = {
            critical: [239, 68, 68],
            high: [249, 115, 22],
            medium: [234, 179, 8],
            low: [34, 197, 94],
            info: [59, 130, 246],
        };
        const THREAT_ALPHA = {
            critical: 220,
            high: 190,
            medium: 160,
            low: 120,
            info: 80,
        };
        const now = this.pulseTime || Date.now();
        const PULSE_DURATION = 30000;
        const layers = [
            new layers_1.ScatterplotLayer({
                id: 'news-locations-layer',
                data: filteredNewsLocations,
                getPosition: (d) => [d.lon, d.lat],
                getRadius: 18000,
                getFillColor: (d) => {
                    const rgb = THREAT_RGB[d.threatLevel] || [59, 130, 246];
                    const a = Math.round((THREAT_ALPHA[d.threatLevel] || 120) * alphaScale);
                    return [...rgb, a];
                },
                radiusMinPixels: 3,
                radiusMaxPixels: 12,
                pickable: true,
            }),
        ];
        const recentNews = filteredNewsLocations.filter(d => {
            const firstSeen = this.newsLocationFirstSeen.get(d.title);
            return firstSeen && (now - firstSeen) < PULSE_DURATION;
        });
        if (recentNews.length > 0) {
            const pulse = 1.0 + 1.5 * (0.5 + 0.5 * Math.sin(now / 318));
            layers.push(new layers_1.ScatterplotLayer({
                id: 'news-pulse-layer',
                data: recentNews,
                getPosition: (d) => [d.lon, d.lat],
                getRadius: 18000,
                radiusScale: pulse,
                radiusMinPixels: 6,
                radiusMaxPixels: 30,
                pickable: false,
                stroked: true,
                filled: false,
                getLineColor: (d) => {
                    const rgb = THREAT_RGB[d.threatLevel] || [59, 130, 246];
                    const firstSeen = this.newsLocationFirstSeen.get(d.title) || now;
                    const age = now - firstSeen;
                    const fadeOut = Math.max(0, 1 - age / PULSE_DURATION);
                    const a = Math.round(150 * fadeOut * alphaScale);
                    return [...rgb, a];
                },
                lineWidthMinPixels: 1.5,
                updateTriggers: { pulseTime: now },
            }));
        }
        return layers;
    }
    createPositiveEventsLayers() {
        const layers = [];
        const getCategoryColor = (category) => {
            switch (category) {
                case 'nature-wildlife':
                case 'humanity-kindness':
                    return [34, 197, 94, 200]; // green
                case 'science-health':
                case 'innovation-tech':
                case 'climate-wins':
                    return [234, 179, 8, 200]; // gold
                case 'culture-community':
                    return [139, 92, 246, 200]; // purple
                default:
                    return [34, 197, 94, 200]; // green default
            }
        };
        // Dot layer (tooltip on hover via getTooltip)
        layers.push(new layers_1.ScatterplotLayer({
            id: 'positive-events-layer',
            data: this.positiveEvents,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 12000,
            getFillColor: (d) => getCategoryColor(d.category),
            radiusMinPixels: 5,
            radiusMaxPixels: 10,
            pickable: true,
        }));
        // Gentle pulse ring for significant events (count > 8)
        const significantEvents = this.positiveEvents.filter(e => e.count > 8);
        if (significantEvents.length > 0) {
            const pulse = 1.0 + 0.4 * (0.5 + 0.5 * Math.sin((this.pulseTime || Date.now()) / 800));
            layers.push(new layers_1.ScatterplotLayer({
                id: 'positive-events-pulse',
                data: significantEvents,
                getPosition: (d) => [d.lon, d.lat],
                getRadius: 15000,
                radiusScale: pulse,
                radiusMinPixels: 8,
                radiusMaxPixels: 24,
                stroked: true,
                filled: false,
                getLineColor: (d) => getCategoryColor(d.category),
                lineWidthMinPixels: 1.5,
                pickable: false,
                updateTriggers: { radiusScale: this.pulseTime },
            }));
        }
        return layers;
    }
    createKindnessLayers() {
        const layers = [];
        if (this.kindnessPoints.length === 0)
            return layers;
        // Dot layer (tooltip on hover via getTooltip)
        layers.push(new layers_1.ScatterplotLayer({
            id: 'kindness-layer',
            data: this.kindnessPoints,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 12000,
            getFillColor: [74, 222, 128, 200],
            radiusMinPixels: 5,
            radiusMaxPixels: 10,
            pickable: true,
        }));
        // Pulse for real events
        const pulse = 1.0 + 0.4 * (0.5 + 0.5 * Math.sin((this.pulseTime || Date.now()) / 800));
        layers.push(new layers_1.ScatterplotLayer({
            id: 'kindness-pulse',
            data: this.kindnessPoints,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 14000,
            radiusScale: pulse,
            radiusMinPixels: 6,
            radiusMaxPixels: 18,
            stroked: true,
            filled: false,
            getLineColor: [74, 222, 128, 80],
            lineWidthMinPixels: 1,
            pickable: false,
            updateTriggers: { radiusScale: this.pulseTime },
        }));
        return layers;
    }
    createHappinessChoroplethLayer() {
        if (!this.countriesGeoJsonData || this.happinessScores.size === 0)
            return null;
        const scores = this.happinessScores;
        return new layers_1.GeoJsonLayer({
            id: 'happiness-choropleth-layer',
            data: this.countriesGeoJsonData,
            filled: true,
            stroked: true,
            getFillColor: (feature) => {
                const code = feature.properties?.['ISO3166-1-Alpha-2'];
                const score = code ? scores.get(code) : undefined;
                if (score == null)
                    return [0, 0, 0, 0];
                const t = score / 10;
                return [
                    Math.round(40 + (1 - t) * 180),
                    Math.round(180 + t * 60),
                    Math.round(40 + (1 - t) * 100),
                    140,
                ];
            },
            getLineColor: [100, 100, 100, 60],
            getLineWidth: 1,
            lineWidthMinPixels: 0.5,
            pickable: true,
            updateTriggers: { getFillColor: [scores.size] },
        });
    }
    createSpeciesRecoveryLayer() {
        return new layers_1.ScatterplotLayer({
            id: 'species-recovery-layer',
            data: this.speciesRecoveryZones,
            getPosition: (d) => [d.recoveryZone.lon, d.recoveryZone.lat],
            getRadius: 50000,
            radiusMinPixels: 8,
            radiusMaxPixels: 25,
            getFillColor: [74, 222, 128, 120],
            stroked: true,
            getLineColor: [74, 222, 128, 200],
            lineWidthMinPixels: 1.5,
            pickable: true,
        });
    }
    createRenewableInstallationsLayer() {
        const typeColors = {
            solar: [255, 200, 50, 200],
            wind: [100, 200, 255, 200],
            hydro: [0, 180, 180, 200],
            geothermal: [255, 150, 80, 200],
        };
        const typeLineColors = {
            solar: [255, 200, 50, 255],
            wind: [100, 200, 255, 255],
            hydro: [0, 180, 180, 255],
            geothermal: [255, 150, 80, 255],
        };
        return new layers_1.ScatterplotLayer({
            id: 'renewable-installations-layer',
            data: this.renewableInstallations,
            getPosition: (d) => [d.lon, d.lat],
            getRadius: 30000,
            radiusMinPixels: 5,
            radiusMaxPixels: 18,
            getFillColor: (d) => typeColors[d.type] ?? [200, 200, 200, 200],
            stroked: true,
            getLineColor: (d) => typeLineColors[d.type] ?? [200, 200, 200, 255],
            lineWidthMinPixels: 1,
            pickable: true,
        });
    }
    getTooltip(info) {
        if (!info.object)
            return null;
        const rawLayerId = info.layer?.id || '';
        const layerId = rawLayerId.endsWith('-ghost') ? rawLayerId.slice(0, -6) : rawLayerId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = info.object;
        const text = (value) => (0, sanitize_1.escapeHtml)(String(value ?? ''));
        switch (layerId) {
            case 'hotspots-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.subtext)}</div>` };
            case 'earthquakes-layer':
                return { html: `<div class="deckgl-tooltip"><strong>M${(obj.magnitude || 0).toFixed(1)} ${(0, i18n_1.t)('components.deckgl.tooltip.earthquake')}</strong><br/>${text(obj.place)}</div>` };
            case 'military-vessels-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.operatorCountry)}</div>` };
            case 'military-flights-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.callsign || obj.registration || (0, i18n_1.t)('components.deckgl.tooltip.militaryAircraft'))}</strong><br/>${text(obj.type)}</div>` };
            case 'civilian-flights-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj[1] || 'Unknown')}</strong><br/>${text(obj[2] || 'Global')} | ${Math.round(obj[7] * 3.28084 || 0)} ft | ${Math.round(obj[9] * 1.94384 || 0)} kts</div>` };
            case 'military-vessel-clusters-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name || (0, i18n_1.t)('components.deckgl.tooltip.vesselCluster'))}</strong><br/>${obj.vesselCount || 0} ${(0, i18n_1.t)('components.deckgl.tooltip.vessels')}<br/>${text(obj.activityType)}</div>` };
            case 'military-flight-clusters-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name || (0, i18n_1.t)('components.deckgl.tooltip.flightCluster'))}</strong><br/>${obj.flightCount || 0} ${(0, i18n_1.t)('components.deckgl.tooltip.aircraft')}<br/>${text(obj.activityType)}</div>` };
            case 'protests-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.country)}</div>` };
            case 'protest-clusters-layer':
                if (obj.count === 1) {
                    const item = obj.items?.[0];
                    return { html: `<div class="deckgl-tooltip"><strong>${text(item?.title || (0, i18n_1.t)('components.deckgl.tooltip.protest'))}</strong><br/>${text(item?.city || item?.country || '')}</div>` };
                }
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.tooltip.protestsCount', { count: String(obj.count) })}</strong><br/>${text(obj.country)}</div>` };
            case 'tech-hq-clusters-layer':
                if (obj.count === 1) {
                    const hq = obj.items?.[0];
                    return { html: `<div class="deckgl-tooltip"><strong>${text(hq?.company || '')}</strong><br/>${text(hq?.city || '')}</div>` };
                }
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.tooltip.techHQsCount', { count: String(obj.count) })}</strong><br/>${text(obj.city)}</div>` };
            case 'tech-event-clusters-layer':
                if (obj.count === 1) {
                    const ev = obj.items?.[0];
                    return { html: `<div class="deckgl-tooltip"><strong>${text(ev?.title || '')}</strong><br/>${text(ev?.location || '')}</div>` };
                }
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.tooltip.techEventsCount', { count: String(obj.count) })}</strong><br/>${text(obj.location)}</div>` };
            case 'datacenter-clusters-layer':
                if (obj.count === 1) {
                    const dc = obj.items?.[0];
                    return { html: `<div class="deckgl-tooltip"><strong>${text(dc?.name || '')}</strong><br/>${text(dc?.owner || '')}</div>` };
                }
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.tooltip.dataCentersCount', { count: String(obj.count) })}</strong><br/>${text(obj.country)}</div>` };
            case 'bases-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country)}${obj.kind ? ` · ${text(obj.kind)}` : ''}</div>` };
            case 'bases-cluster-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${obj.count} bases</strong></div>` };
            case 'nuclear-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type)}</div>` };
            case 'datacenters-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.owner)}</div>` };
            case 'cables-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${(0, i18n_1.t)('components.deckgl.tooltip.underseaCable')}</div>` };
            case 'pipelines-layer': {
                const pipelineType = String(obj.type || '').toLowerCase();
                const pipelineTypeLabel = pipelineType === 'oil'
                    ? (0, i18n_1.t)('popups.pipeline.types.oil')
                    : pipelineType === 'gas'
                        ? (0, i18n_1.t)('popups.pipeline.types.gas')
                        : pipelineType === 'products'
                            ? (0, i18n_1.t)('popups.pipeline.types.products')
                            : `${text(obj.type)} ${(0, i18n_1.t)('components.deckgl.tooltip.pipeline')}`;
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${pipelineTypeLabel}</div>` };
            }
            case 'conflict-zones-layer': {
                const props = obj.properties || obj;
                return { html: `<div class="deckgl-tooltip"><strong>${text(props.name)}</strong><br/>${(0, i18n_1.t)('components.deckgl.tooltip.conflictZone')}</div>` };
            }
            case 'natural-events-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.category || (0, i18n_1.t)('components.deckgl.tooltip.naturalEvent'))}</div>` };
            case 'ais-density-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.layers.shipTraffic')}</strong><br/>${(0, i18n_1.t)('popups.intensity')}: ${text(obj.intensity)}</div>` };
            case 'waterways-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${(0, i18n_1.t)('components.deckgl.layers.strategicWaterways')}</div>` };
            case 'economic-centers-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country)}</div>` };
            case 'stock-exchanges-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.shortName)}</strong><br/>${text(obj.city)}, ${text(obj.country)}</div>` };
            case 'financial-centers-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type)} ${(0, i18n_1.t)('components.deckgl.tooltip.financialCenter')}</div>` };
            case 'central-banks-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.shortName)}</strong><br/>${text(obj.city)}, ${text(obj.country)}</div>` };
            case 'commodity-hubs-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type)} · ${text(obj.city)}</div>` };
            case 'startup-hubs-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.city)}</strong><br/>${text(obj.country)}</div>` };
            case 'tech-hqs-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.company)}</strong><br/>${text(obj.city)}</div>` };
            case 'accelerators-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.city)}</div>` };
            case 'cloud-regions-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.provider)}</strong><br/>${text(obj.region)}</div>` };
            case 'tech-events-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.title)}</strong><br/>${text(obj.location)}</div>` };
            case 'irradiators-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.type || (0, i18n_1.t)('components.deckgl.layers.gammaIrradiators'))}</div>` };
            case 'spaceports-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.country || (0, i18n_1.t)('components.deckgl.layers.spaceports'))}</div>` };
            case 'ports-layer': {
                const typeIcon = obj.type === 'naval' ? '⚓' : obj.type === 'oil' || obj.type === 'lng' ? '🛢️' : '🏭';
                return { html: `<div class="deckgl-tooltip"><strong>${typeIcon} ${text(obj.name)}</strong><br/>${text(obj.type || (0, i18n_1.t)('components.deckgl.tooltip.port'))} - ${text(obj.country)}</div>` };
            }
            case 'flight-delays-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)} (${text(obj.iata)})</strong><br/>${text(obj.severity)}: ${text(obj.reason)}</div>` };
            case 'apt-groups-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.aka)}<br/>${(0, i18n_1.t)('popups.sponsor')}: ${text(obj.sponsor)}</div>` };
            case 'minerals-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${text(obj.mineral)} - ${text(obj.country)}<br/>${text(obj.operator)}</div>` };
            case 'ais-disruptions-layer':
                return { html: `<div class="deckgl-tooltip"><strong>AIS ${text(obj.type || (0, i18n_1.t)('components.deckgl.tooltip.disruption'))}</strong><br/>${text(obj.severity)} ${(0, i18n_1.t)('popups.severity')}<br/>${text(obj.description)}</div>` };
            case 'cable-advisories-layer': {
                const cableName = config_1.UNDERSEA_CABLES.find(c => c.id === obj.cableId)?.name || obj.cableId;
                return { html: `<div class="deckgl-tooltip"><strong>${text(cableName)}</strong><br/>${text(obj.severity || (0, i18n_1.t)('components.deckgl.tooltip.advisory'))}<br/>${text(obj.description)}</div>` };
            }
            case 'repair-ships-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name || (0, i18n_1.t)('components.deckgl.tooltip.repairShip'))}</strong><br/>${text(obj.status)}</div>` };
            case 'weather-layer': {
                const areaDesc = typeof obj.areaDesc === 'string' ? obj.areaDesc : '';
                const area = areaDesc ? `<br/><small>${text(areaDesc.slice(0, 50))}${areaDesc.length > 50 ? '...' : ''}</small>` : '';
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.event || (0, i18n_1.t)('components.deckgl.layers.weatherAlerts'))}</strong><br/>${text(obj.severity)}${area}</div>` };
            }
            case 'outages-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.asn || (0, i18n_1.t)('components.deckgl.tooltip.internetOutage'))}</strong><br/>${text(obj.country)}</div>` };
            case 'cyber-threats-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('popups.cyberThreat.title')}</strong><br/>${text(obj.severity || (0, i18n_1.t)('components.deckgl.tooltip.medium'))} · ${text(obj.country || (0, i18n_1.t)('popups.unknown'))}</div>` };
            case 'iran-events-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${(0, i18n_1.t)('components.deckgl.layers.iranAttacks')}: ${text(obj.category || '')}</strong><br/>${text((obj.title || '').slice(0, 80))}</div>` };
            case 'news-locations-layer':
                return { html: `<div class="deckgl-tooltip"><strong>📰 ${(0, i18n_1.t)('components.deckgl.tooltip.news')}</strong><br/>${text(obj.title?.slice(0, 80) || '')}</div>` };
            case 'positive-events-layer': {
                const catLabel = obj.category ? obj.category.replace(/-/g, ' & ') : 'Positive Event';
                const countInfo = obj.count > 1 ? `<br/><span style="opacity:.7">${obj.count} sources reporting</span>` : '';
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/><span style="text-transform:capitalize">${text(catLabel)}</span>${countInfo}</div>` };
            }
            case 'kindness-layer':
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong></div>` };
            case 'happiness-choropleth-layer': {
                const hcName = obj.properties?.name ?? 'Unknown';
                const hcCode = obj.properties?.['ISO3166-1-Alpha-2'];
                const hcScore = hcCode ? this.happinessScores.get(hcCode) : undefined;
                const hcScoreStr = hcScore != null ? hcScore.toFixed(1) : 'No data';
                return { html: `<div class="deckgl-tooltip"><strong>${text(hcName)}</strong><br/>Happiness: ${hcScoreStr}/10${hcScore != null ? `<br/><span style="opacity:.7">${text(this.happinessSource)} (${this.happinessYear})</span>` : ''}</div>` };
            }
            case 'species-recovery-layer': {
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.commonName)}</strong><br/>${text(obj.recoveryZone?.name ?? obj.region)}<br/><span style="opacity:.7">Status: ${text(obj.recoveryStatus)}</span></div>` };
            }
            case 'renewable-installations-layer': {
                const riTypeLabel = obj.type ? String(obj.type).charAt(0).toUpperCase() + String(obj.type).slice(1) : 'Renewable';
                return { html: `<div class="deckgl-tooltip"><strong>${text(obj.name)}</strong><br/>${riTypeLabel} &middot; ${obj.capacityMW?.toLocaleString() ?? '?'} MW<br/><span style="opacity:.7">${text(obj.country)} &middot; ${obj.year}</span></div>` };
            }
            case 'gulf-investments-layer': {
                const inv = obj;
                const flag = inv.investingCountry === 'SA' ? '🇸🇦' : '🇦🇪';
                const usd = inv.investmentUSD != null
                    ? (inv.investmentUSD >= 1000 ? `$${(inv.investmentUSD / 1000).toFixed(1)}B` : `$${inv.investmentUSD}M`)
                    : (0, i18n_1.t)('components.deckgl.tooltip.undisclosed');
                const stake = inv.stakePercent != null ? `<br/>${text(String(inv.stakePercent))}% ${(0, i18n_1.t)('components.deckgl.tooltip.stake')}` : '';
                return {
                    html: `<div class="deckgl-tooltip">
            <strong>${flag} ${text(inv.assetName)}</strong><br/>
            <em>${text(inv.investingEntity)}</em><br/>
            ${text(inv.targetCountry)} · ${text(inv.sector)}<br/>
            <strong>${usd}</strong>${stake}<br/>
            <span style="text-transform:capitalize">${text(inv.status)}</span>
          </div>`,
                };
            }
            default:
                return null;
        }
    }
    handleClick(info) {
        if (!info.object) {
            // Empty map click → country detection
            if (info.coordinate && this.onCountryClick) {
                const [lon, lat] = info.coordinate;
                const country = this.resolveCountryFromCoordinate(lon, lat);
                this.onCountryClick({
                    lat,
                    lon,
                    ...(country ? { code: country.code, name: country.name } : {}),
                });
            }
            return;
        }
        const rawClickLayerId = info.layer?.id || '';
        const layerId = rawClickLayerId.endsWith('-ghost') ? rawClickLayerId.slice(0, -6) : rawClickLayerId;
        // Hotspots show popup with related news
        if (layerId === 'hotspots-layer') {
            const hotspot = info.object;
            const relatedNews = this.getRelatedNews(hotspot);
            this.popup.show({
                type: 'hotspot',
                data: hotspot,
                relatedNews,
                x: info.x,
                y: info.y,
            });
            this.popup.loadHotspotGdeltContext(hotspot);
            this.onHotspotClick?.(hotspot);
            return;
        }
        // Handle cluster layers with single/multi logic
        if (layerId === 'protest-clusters-layer') {
            const cluster = info.object;
            if (cluster.count === 1 && cluster.items[0]) {
                this.popup.show({ type: 'protest', data: cluster.items[0], x: info.x, y: info.y });
            }
            else {
                this.popup.show({
                    type: 'protestCluster',
                    data: {
                        items: cluster.items,
                        country: cluster.country,
                        count: cluster.count,
                        riotCount: cluster.riotCount,
                        highSeverityCount: cluster.highSeverityCount,
                        verifiedCount: cluster.verifiedCount,
                        totalFatalities: cluster.totalFatalities,
                        sampled: cluster.sampled,
                    },
                    x: info.x,
                    y: info.y,
                });
            }
            return;
        }
        if (layerId === 'tech-hq-clusters-layer') {
            const cluster = info.object;
            if (cluster.count === 1 && cluster.items[0]) {
                this.popup.show({ type: 'techHQ', data: cluster.items[0], x: info.x, y: info.y });
            }
            else {
                this.popup.show({
                    type: 'techHQCluster',
                    data: {
                        items: cluster.items,
                        city: cluster.city,
                        country: cluster.country,
                        count: cluster.count,
                        faangCount: cluster.faangCount,
                        unicornCount: cluster.unicornCount,
                        publicCount: cluster.publicCount,
                        sampled: cluster.sampled,
                    },
                    x: info.x,
                    y: info.y,
                });
            }
            return;
        }
        if (layerId === 'tech-event-clusters-layer') {
            const cluster = info.object;
            if (cluster.count === 1 && cluster.items[0]) {
                this.popup.show({ type: 'techEvent', data: cluster.items[0], x: info.x, y: info.y });
            }
            else {
                this.popup.show({
                    type: 'techEventCluster',
                    data: {
                        items: cluster.items,
                        location: cluster.location,
                        country: cluster.country,
                        count: cluster.count,
                        soonCount: cluster.soonCount,
                        sampled: cluster.sampled,
                    },
                    x: info.x,
                    y: info.y,
                });
            }
            return;
        }
        if (layerId === 'datacenter-clusters-layer') {
            const cluster = info.object;
            if (cluster.count === 1 && cluster.items[0]) {
                this.popup.show({ type: 'datacenter', data: cluster.items[0], x: info.x, y: info.y });
            }
            else {
                this.popup.show({
                    type: 'datacenterCluster',
                    data: {
                        items: cluster.items,
                        region: cluster.region || cluster.country,
                        country: cluster.country,
                        count: cluster.count,
                        totalChips: cluster.totalChips,
                        totalPowerMW: cluster.totalPowerMW,
                        existingCount: cluster.existingCount,
                        plannedCount: cluster.plannedCount,
                        sampled: cluster.sampled,
                    },
                    x: info.x,
                    y: info.y,
                });
            }
            return;
        }
        // Map layer IDs to popup types
        const layerToPopupType = {
            'conflict-zones-layer': 'conflict',
            'bases-layer': 'base',
            'nuclear-layer': 'nuclear',
            'irradiators-layer': 'irradiator',
            'datacenters-layer': 'datacenter',
            'cables-layer': 'cable',
            'pipelines-layer': 'pipeline',
            'earthquakes-layer': 'earthquake',
            'weather-layer': 'weather',
            'outages-layer': 'outage',
            'cyber-threats-layer': 'cyberThreat',
            'iran-events-layer': 'iranEvent',
            'protests-layer': 'protest',
            'military-flights-layer': 'militaryFlight',
            'military-vessels-layer': 'militaryVessel',
            'military-vessel-clusters-layer': 'militaryVesselCluster',
            'military-flight-clusters-layer': 'militaryFlightCluster',
            'natural-events-layer': 'natEvent',
            'waterways-layer': 'waterway',
            'economic-centers-layer': 'economic',
            'stock-exchanges-layer': 'stockExchange',
            'financial-centers-layer': 'financialCenter',
            'central-banks-layer': 'centralBank',
            'commodity-hubs-layer': 'commodityHub',
            'spaceports-layer': 'spaceport',
            'ports-layer': 'port',
            'flight-delays-layer': 'flight',
            'civilian-flights-layer': 'flight',
            'startup-hubs-layer': 'startupHub',
            'tech-hqs-layer': 'techHQ',
            'accelerators-layer': 'accelerator',
            'cloud-regions-layer': 'cloudRegion',
            'tech-events-layer': 'techEvent',
            'apt-groups-layer': 'apt',
            'minerals-layer': 'mineral',
            'ais-disruptions-layer': 'ais',
            'cable-advisories-layer': 'cable-advisory',
            'repair-ships-layer': 'repair-ship',
        };
        const popupType = layerToPopupType[layerId];
        if (!popupType)
            return;
        // For GeoJSON layers, the data is in properties
        let data = info.object;
        if (layerId === 'conflict-zones-layer' && info.object.properties) {
            // Find the full conflict zone data from config
            const conflictId = info.object.properties.id;
            const fullConflict = config_1.CONFLICT_ZONES.find(c => c.id === conflictId);
            if (fullConflict)
                data = fullConflict;
        }
        // Enrich iran events with related events from same location
        if (popupType === 'iranEvent' && data.locationName) {
            const clickedId = data.id;
            const normalizedLoc = data.locationName.trim().toLowerCase();
            const related = this.iranEvents
                .filter(e => e.id !== clickedId && e.locationName && e.locationName.trim().toLowerCase() === normalizedLoc)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 5);
            data = { ...data, relatedEvents: related };
        }
        // Get click coordinates relative to container
        const x = info.x ?? 0;
        const y = info.y ?? 0;
        this.popup.show({
            type: popupType,
            data: data,
            x,
            y,
        });
    }
    // Utility methods
    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result && result[1] && result[2] && result[3]) {
            return [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                alpha,
            ];
        }
        return [100, 100, 100, alpha];
    }
    // UI Creation methods
    createControls() {
        const controls = document.createElement('div');
        controls.className = 'map-controls deckgl-controls';
        controls.innerHTML = `
      <div class="zoom-controls">
        <button class="map-btn zoom-in" title="${(0, i18n_1.t)('components.deckgl.zoomIn')}">+</button>
        <button class="map-btn zoom-out" title="${(0, i18n_1.t)('components.deckgl.zoomOut')}">-</button>
        <button class="map-btn zoom-reset" title="${(0, i18n_1.t)('components.deckgl.resetView')}">&#8962;</button>
      </div>
      <div class="view-selector">
        <select class="view-select">
          <option value="global">${(0, i18n_1.t)('components.deckgl.views.global')}</option>
          <option value="america">${(0, i18n_1.t)('components.deckgl.views.americas')}</option>
          <option value="mena">${(0, i18n_1.t)('components.deckgl.views.mena')}</option>
          <option value="eu">${(0, i18n_1.t)('components.deckgl.views.europe')}</option>
          <option value="asia">${(0, i18n_1.t)('components.deckgl.views.asia')}</option>
          <option value="latam">${(0, i18n_1.t)('components.deckgl.views.latam')}</option>
          <option value="africa">${(0, i18n_1.t)('components.deckgl.views.africa')}</option>
          <option value="oceania">${(0, i18n_1.t)('components.deckgl.views.oceania')}</option>
        </select>
      </div>
    `;
        this.container.appendChild(controls);
        // Bind events - use event delegation for reliability
        controls.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('zoom-in'))
                this.zoomIn();
            else if (target.classList.contains('zoom-out'))
                this.zoomOut();
            else if (target.classList.contains('zoom-reset'))
                this.resetView();
        });
        const viewSelect = controls.querySelector('.view-select');
        viewSelect.value = this.state.view;
        viewSelect.addEventListener('change', () => {
            this.setView(viewSelect.value);
        });
    }
    createTimeSlider() {
        const slider = document.createElement('div');
        slider.className = 'time-slider deckgl-time-slider';
        slider.innerHTML = `
      <div class="time-options">
        <button class="time-btn ${this.state.timeRange === '1h' ? 'active' : ''}" data-range="1h">1h</button>
        <button class="time-btn ${this.state.timeRange === '6h' ? 'active' : ''}" data-range="6h">6h</button>
        <button class="time-btn ${this.state.timeRange === '24h' ? 'active' : ''}" data-range="24h">24h</button>
        <button class="time-btn ${this.state.timeRange === '48h' ? 'active' : ''}" data-range="48h">48h</button>
        <button class="time-btn ${this.state.timeRange === '7d' ? 'active' : ''}" data-range="7d">7d</button>
        <button class="time-btn ${this.state.timeRange === 'all' ? 'active' : ''}" data-range="all">${(0, i18n_1.t)('components.deckgl.timeAll')}</button>
      </div>
    `;
        this.container.appendChild(slider);
        slider.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const range = btn.dataset.range;
                this.setTimeRange(range);
            });
        });
    }
    updateTimeSliderButtons() {
        const slider = this.container.querySelector('.deckgl-time-slider');
        if (!slider)
            return;
        slider.querySelectorAll('.time-btn').forEach((btn) => {
            const range = btn.dataset.range;
            btn.classList.toggle('active', range === this.state.timeRange);
        });
    }
    createLayerToggles() {
        const toggles = document.createElement('div');
        toggles.className = 'layer-toggles deckgl-layer-toggles';
        const layerConfig = config_1.SITE_VARIANT === 'tech'
            ? [
                { key: 'startupHubs', label: (0, i18n_1.t)('components.deckgl.layers.startupHubs'), icon: '&#128640;' },
                { key: 'techHQs', label: (0, i18n_1.t)('components.deckgl.layers.techHQs'), icon: '&#127970;' },
                { key: 'accelerators', label: (0, i18n_1.t)('components.deckgl.layers.accelerators'), icon: '&#9889;' },
                { key: 'cloudRegions', label: (0, i18n_1.t)('components.deckgl.layers.cloudRegions'), icon: '&#9729;' },
                { key: 'datacenters', label: (0, i18n_1.t)('components.deckgl.layers.aiDataCenters'), icon: '&#128421;' },
                { key: 'cables', label: (0, i18n_1.t)('components.deckgl.layers.underseaCables'), icon: '&#128268;' },
                { key: 'outages', label: (0, i18n_1.t)('components.deckgl.layers.internetOutages'), icon: '&#128225;' },
                { key: 'cyberThreats', label: (0, i18n_1.t)('components.deckgl.layers.cyberThreats'), icon: '&#128737;' },
                { key: 'techEvents', label: (0, i18n_1.t)('components.deckgl.layers.techEvents'), icon: '&#128197;' },
                { key: 'natural', label: (0, i18n_1.t)('components.deckgl.layers.naturalEvents'), icon: '&#127755;' },
                { key: 'fires', label: (0, i18n_1.t)('components.deckgl.layers.fires'), icon: '&#128293;' },
                { key: 'dayNight', label: (0, i18n_1.t)('components.deckgl.layers.dayNight'), icon: '&#127763;' },
            ]
            : config_1.SITE_VARIANT === 'finance'
                ? [
                    { key: 'stockExchanges', label: (0, i18n_1.t)('components.deckgl.layers.stockExchanges'), icon: '&#127963;' },
                    { key: 'financialCenters', label: (0, i18n_1.t)('components.deckgl.layers.financialCenters'), icon: '&#128176;' },
                    { key: 'centralBanks', label: (0, i18n_1.t)('components.deckgl.layers.centralBanks'), icon: '&#127974;' },
                    { key: 'commodityHubs', label: (0, i18n_1.t)('components.deckgl.layers.commodityHubs'), icon: '&#128230;' },
                    { key: 'gulfInvestments', label: (0, i18n_1.t)('components.deckgl.layers.gulfInvestments'), icon: '&#127760;' },
                    { key: 'tradeRoutes', label: (0, i18n_1.t)('components.deckgl.layers.tradeRoutes'), icon: '&#128674;' },
                    { key: 'cables', label: (0, i18n_1.t)('components.deckgl.layers.underseaCables'), icon: '&#128268;' },
                    { key: 'pipelines', label: (0, i18n_1.t)('components.deckgl.layers.pipelines'), icon: '&#128738;' },
                    { key: 'outages', label: (0, i18n_1.t)('components.deckgl.layers.internetOutages'), icon: '&#128225;' },
                    { key: 'weather', label: (0, i18n_1.t)('components.deckgl.layers.weatherAlerts'), icon: '&#9928;' },
                    { key: 'economic', label: (0, i18n_1.t)('components.deckgl.layers.economicCenters'), icon: '&#128176;' },
                    { key: 'waterways', label: (0, i18n_1.t)('components.deckgl.layers.strategicWaterways'), icon: '&#9875;' },
                    { key: 'natural', label: (0, i18n_1.t)('components.deckgl.layers.naturalEvents'), icon: '&#127755;' },
                    { key: 'cyberThreats', label: (0, i18n_1.t)('components.deckgl.layers.cyberThreats'), icon: '&#128737;' },
                    { key: 'dayNight', label: (0, i18n_1.t)('components.deckgl.layers.dayNight'), icon: '&#127763;' },
                ]
                : config_1.SITE_VARIANT === 'happy'
                    ? [
                        { key: 'positiveEvents', label: 'Positive Events', icon: '&#127775;' },
                        { key: 'kindness', label: 'Acts of Kindness', icon: '&#128154;' },
                        { key: 'happiness', label: 'World Happiness', icon: '&#128522;' },
                        { key: 'speciesRecovery', label: 'Species Recovery', icon: '&#128062;' },
                        { key: 'renewableInstallations', label: 'Clean Energy', icon: '&#9889;' },
                    ]
                    : [
                        { key: 'iranAttacks', label: (0, i18n_1.t)('components.deckgl.layers.iranAttacks'), icon: '&#127919;' },
                        { key: 'hotspots', label: (0, i18n_1.t)('components.deckgl.layers.intelHotspots'), icon: '&#127919;' },
                        { key: 'conflicts', label: (0, i18n_1.t)('components.deckgl.layers.conflictZones'), icon: '&#9876;' },
                        { key: 'bases', label: (0, i18n_1.t)('components.deckgl.layers.militaryBases'), icon: '&#127963;' },
                        { key: 'nuclear', label: (0, i18n_1.t)('components.deckgl.layers.nuclearSites'), icon: '&#9762;' },
                        { key: 'irradiators', label: (0, i18n_1.t)('components.deckgl.layers.gammaIrradiators'), icon: '&#9888;' },
                        { key: 'spaceports', label: (0, i18n_1.t)('components.deckgl.layers.spaceports'), icon: '&#128640;' },
                        { key: 'cables', label: (0, i18n_1.t)('components.deckgl.layers.underseaCables'), icon: '&#128268;' },
                        { key: 'pipelines', label: (0, i18n_1.t)('components.deckgl.layers.pipelines'), icon: '&#128738;' },
                        { key: 'datacenters', label: (0, i18n_1.t)('components.deckgl.layers.aiDataCenters'), icon: '&#128421;' },
                        { key: 'military', label: (0, i18n_1.t)('components.deckgl.layers.militaryActivity'), icon: '&#9992;' },
                        { key: 'ais', label: (0, i18n_1.t)('components.deckgl.layers.shipTraffic'), icon: '&#128674;' },
                        { key: 'tradeRoutes', label: (0, i18n_1.t)('components.deckgl.layers.tradeRoutes'), icon: '&#9875;' },
                        { key: 'flights', label: (0, i18n_1.t)('components.deckgl.layers.flightDelays'), icon: '&#9992;' },
                        { key: 'protests', label: (0, i18n_1.t)('components.deckgl.layers.protests'), icon: '&#128226;' },
                        { key: 'ucdpEvents', label: (0, i18n_1.t)('components.deckgl.layers.ucdpEvents'), icon: '&#9876;' },
                        { key: 'displacement', label: (0, i18n_1.t)('components.deckgl.layers.displacementFlows'), icon: '&#128101;' },
                        { key: 'climate', label: (0, i18n_1.t)('components.deckgl.layers.climateAnomalies'), icon: '&#127787;' },
                        { key: 'weather', label: (0, i18n_1.t)('components.deckgl.layers.weatherAlerts'), icon: '&#9928;' },
                        { key: 'outages', label: (0, i18n_1.t)('components.deckgl.layers.internetOutages'), icon: '&#128225;' },
                        { key: 'cyberThreats', label: (0, i18n_1.t)('components.deckgl.layers.cyberThreats'), icon: '&#128737;' },
                        { key: 'natural', label: (0, i18n_1.t)('components.deckgl.layers.naturalEvents'), icon: '&#127755;' },
                        { key: 'fires', label: (0, i18n_1.t)('components.deckgl.layers.fires'), icon: '&#128293;' },
                        { key: 'waterways', label: (0, i18n_1.t)('components.deckgl.layers.strategicWaterways'), icon: '&#9875;' },
                        { key: 'economic', label: (0, i18n_1.t)('components.deckgl.layers.economicCenters'), icon: '&#128176;' },
                        { key: 'minerals', label: (0, i18n_1.t)('components.deckgl.layers.criticalMinerals'), icon: '&#128142;' },
                        { key: 'dayNight', label: (0, i18n_1.t)('components.deckgl.layers.dayNight'), icon: '&#127763;' },
                    ];
        toggles.innerHTML = `
      <div class="toggle-header">
        <span>${(0, i18n_1.t)('components.deckgl.layersTitle')}</span>
        <button class="layer-help-btn" title="${(0, i18n_1.t)('components.deckgl.layerGuide')}">?</button>
        <button class="toggle-collapse">&#9660;</button>
      </div>
      <div class="toggle-list" style="max-height: 32vh; overflow-y: auto; scrollbar-width: thin;">
        ${layerConfig.map(({ key, label, icon }) => `
          <label class="layer-toggle" data-layer="${key}">
            <input type="checkbox" ${this.state.layers[key] ? 'checked' : ''}>
            <span class="toggle-icon">${icon}</span>
            <span class="toggle-label">${label}</span>
          </label>
        `).join('')}
      </div>
    `;
        this.container.appendChild(toggles);
        // Bind toggle events
        toggles.querySelectorAll('.layer-toggle input').forEach(input => {
            input.addEventListener('change', () => {
                const layer = input.closest('.layer-toggle')?.getAttribute('data-layer');
                if (layer) {
                    this.state.layers[layer] = input.checked;
                    this.render();
                    this.onLayerChange?.(layer, input.checked, 'user');
                }
            });
        });
        // Help button
        const helpBtn = toggles.querySelector('.layer-help-btn');
        helpBtn?.addEventListener('click', () => this.showLayerHelp());
        // Collapse toggle
        const collapseBtn = toggles.querySelector('.toggle-collapse');
        const toggleList = toggles.querySelector('.toggle-list');
        // Manual scroll: intercept wheel, prevent map zoom, scroll the list ourselves
        if (toggleList) {
            toggles.addEventListener('wheel', (e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleList.scrollTop += e.deltaY;
            }, { passive: false });
            toggles.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
        }
        collapseBtn?.addEventListener('click', () => {
            toggleList?.classList.toggle('collapsed');
            if (collapseBtn)
                collapseBtn.innerHTML = toggleList?.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
        });
    }
    /** Show layer help popup explaining each layer */
    showLayerHelp() {
        const existing = this.container.querySelector('.layer-help-popup');
        if (existing) {
            existing.remove();
            return;
        }
        const popup = document.createElement('div');
        popup.className = 'layer-help-popup';
        const label = (layerKey) => (0, i18n_1.t)(`components.deckgl.layers.${layerKey}`).toUpperCase();
        const staticLabel = (labelKey) => (0, i18n_1.t)(`components.deckgl.layerHelp.labels.${labelKey}`).toUpperCase();
        const helpItem = (layerLabel, descriptionKey) => `<div class="layer-help-item"><span>${layerLabel}</span> ${(0, i18n_1.t)(`components.deckgl.layerHelp.descriptions.${descriptionKey}`)}</div>`;
        const helpSection = (titleKey, items, noteKey) => `
      <div class="layer-help-section">
        <div class="layer-help-title">${(0, i18n_1.t)(`components.deckgl.layerHelp.sections.${titleKey}`)}</div>
        ${items.join('')}
        ${noteKey ? `<div class="layer-help-note">${(0, i18n_1.t)(`components.deckgl.layerHelp.notes.${noteKey}`)}</div>` : ''}
      </div>
    `;
        const helpHeader = `
      <div class="layer-help-header">
        <span>${(0, i18n_1.t)('components.deckgl.layerHelp.title')}</span>
        <button class="layer-help-close">×</button>
      </div>
    `;
        const techHelpContent = `
      ${helpHeader}
      <div class="layer-help-content">
        ${helpSection('techEcosystem', [
            helpItem(label('startupHubs'), 'techStartupHubs'),
            helpItem(label('cloudRegions'), 'techCloudRegions'),
            helpItem(label('techHQs'), 'techHQs'),
            helpItem(label('accelerators'), 'techAccelerators'),
            helpItem(label('techEvents'), 'techEvents'),
        ])}
        ${helpSection('infrastructure', [
            helpItem(label('underseaCables'), 'infraCables'),
            helpItem(label('aiDataCenters'), 'infraDatacenters'),
            helpItem(label('internetOutages'), 'infraOutages'),
            helpItem(label('cyberThreats'), 'techCyberThreats'),
        ])}
        ${helpSection('naturalEconomic', [
            helpItem(label('naturalEvents'), 'naturalEventsTech'),
            helpItem(label('fires'), 'techFires'),
            helpItem(staticLabel('countries'), 'countriesOverlay'),
            helpItem(label('dayNight'), 'dayNight'),
        ])}
      </div>
    `;
        const financeHelpContent = `
      ${helpHeader}
      <div class="layer-help-content">
        ${helpSection('financeCore', [
            helpItem(label('stockExchanges'), 'financeExchanges'),
            helpItem(label('financialCenters'), 'financeCenters'),
            helpItem(label('centralBanks'), 'financeCentralBanks'),
            helpItem(label('commodityHubs'), 'financeCommodityHubs'),
            helpItem(label('gulfInvestments'), 'financeGulfInvestments'),
        ])}
        ${helpSection('infrastructureRisk', [
            helpItem(label('underseaCables'), 'financeCables'),
            helpItem(label('pipelines'), 'financePipelines'),
            helpItem(label('internetOutages'), 'financeOutages'),
            helpItem(label('cyberThreats'), 'financeCyberThreats'),
            helpItem(label('tradeRoutes'), 'tradeRoutes'),
        ])}
        ${helpSection('macroContext', [
            helpItem(label('economicCenters'), 'economicCenters'),
            helpItem(label('strategicWaterways'), 'macroWaterways'),
            helpItem(label('weatherAlerts'), 'weatherAlertsMarket'),
            helpItem(label('naturalEvents'), 'naturalEventsMacro'),
            helpItem(label('dayNight'), 'dayNight'),
        ])}
      </div>
    `;
        const fullHelpContent = `
      ${helpHeader}
      <div class="layer-help-content">
        ${helpSection('timeFilter', [
            helpItem(staticLabel('timeRecent'), 'timeRecent'),
            helpItem(staticLabel('timeExtended'), 'timeExtended'),
        ], 'timeAffects')}
        ${helpSection('geopolitical', [
            helpItem(label('conflictZones'), 'geoConflicts'),
            helpItem(label('intelHotspots'), 'geoHotspots'),
            helpItem(staticLabel('sanctions'), 'geoSanctions'),
            helpItem(label('protests'), 'geoProtests'),
            helpItem(label('ucdpEvents'), 'geoUcdpEvents'),
            helpItem(label('displacementFlows'), 'geoDisplacement'),
        ])}
        ${helpSection('militaryStrategic', [
            helpItem(label('militaryBases'), 'militaryBases'),
            helpItem(label('nuclearSites'), 'militaryNuclear'),
            helpItem(label('gammaIrradiators'), 'militaryIrradiators'),
            helpItem(label('militaryActivity'), 'militaryActivity'),
            helpItem(label('spaceports'), 'militarySpaceports'),
        ])}
        ${helpSection('infrastructure', [
            helpItem(label('underseaCables'), 'infraCablesFull'),
            helpItem(label('pipelines'), 'infraPipelinesFull'),
            helpItem(label('internetOutages'), 'infraOutages'),
            helpItem(label('aiDataCenters'), 'infraDatacentersFull'),
            helpItem(label('cyberThreats'), 'infraCyberThreats'),
        ])}
        ${helpSection('transport', [
            helpItem(label('shipTraffic'), 'transportShipping'),
            helpItem(label('tradeRoutes'), 'tradeRoutes'),
            helpItem(label('flightDelays'), 'transportDelays'),
        ])}
        ${helpSection('naturalEconomic', [
            helpItem(label('naturalEvents'), 'naturalEventsFull'),
            helpItem(label('fires'), 'firesFull'),
            helpItem(label('weatherAlerts'), 'weatherAlerts'),
            helpItem(label('climateAnomalies'), 'climateAnomalies'),
            helpItem(label('economicCenters'), 'economicCenters'),
            helpItem(label('criticalMinerals'), 'mineralsFull'),
        ])}
        ${helpSection('overlays', [
            helpItem(label('dayNight'), 'dayNight'),
            helpItem(staticLabel('countries'), 'countriesOverlay'),
            helpItem(label('strategicWaterways'), 'waterwaysLabels'),
        ])}
      </div>
    `;
        popup.innerHTML = config_1.SITE_VARIANT === 'tech'
            ? techHelpContent
            : config_1.SITE_VARIANT === 'finance'
                ? financeHelpContent
                : fullHelpContent;
        popup.querySelector('.layer-help-close')?.addEventListener('click', () => popup.remove());
        // Prevent scroll events from propagating to map
        const content = popup.querySelector('.layer-help-content');
        if (content) {
            content.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
            content.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
        }
        // Close on click outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popup.contains(e.target)) {
                    popup.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
        this.container.appendChild(popup);
    }
    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'map-legend deckgl-legend';
        // SVG shapes for different marker types
        const shapes = {
            circle: (color) => `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="${color}"/></svg>`,
            triangle: (color) => `<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,10 1,10" fill="${color}"/></svg>`,
            square: (color) => `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1" fill="${color}"/></svg>`,
            hexagon: (color) => `<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 10.5,3.5 10.5,8.5 6,11 1.5,8.5 1.5,3.5" fill="${color}"/></svg>`,
        };
        const isLight = (0, index_1.getCurrentTheme)() === 'light';
        const legendItems = config_1.SITE_VARIANT === 'tech'
            ? [
                { shape: shapes.circle(isLight ? 'rgb(22, 163, 74)' : 'rgb(0, 255, 150)'), label: (0, i18n_1.t)('components.deckgl.legend.startupHub') },
                { shape: shapes.circle('rgb(100, 200, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.techHQ') },
                { shape: shapes.circle(isLight ? 'rgb(180, 120, 0)' : 'rgb(255, 200, 0)'), label: (0, i18n_1.t)('components.deckgl.legend.accelerator') },
                { shape: shapes.circle('rgb(150, 100, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.cloudRegion') },
                { shape: shapes.square('rgb(136, 68, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.datacenter') },
            ]
            : config_1.SITE_VARIANT === 'finance'
                ? [
                    { shape: shapes.circle('rgb(255, 215, 80)'), label: (0, i18n_1.t)('components.deckgl.legend.stockExchange') },
                    { shape: shapes.circle('rgb(0, 220, 150)'), label: (0, i18n_1.t)('components.deckgl.legend.financialCenter') },
                    { shape: shapes.hexagon('rgb(255, 210, 80)'), label: (0, i18n_1.t)('components.deckgl.legend.centralBank') },
                    { shape: shapes.square('rgb(255, 150, 80)'), label: (0, i18n_1.t)('components.deckgl.legend.commodityHub') },
                    { shape: shapes.triangle('rgb(80, 170, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.waterway') },
                ]
                : config_1.SITE_VARIANT === 'happy'
                    ? [
                        { shape: shapes.circle('rgb(34, 197, 94)'), label: 'Positive Event' },
                        { shape: shapes.circle('rgb(234, 179, 8)'), label: 'Breakthrough' },
                        { shape: shapes.circle('rgb(74, 222, 128)'), label: 'Act of Kindness' },
                        { shape: shapes.circle('rgb(255, 100, 50)'), label: 'Natural Event' },
                        { shape: shapes.square('rgb(34, 180, 100)'), label: 'Happy Country' },
                        { shape: shapes.circle('rgb(74, 222, 128)'), label: 'Species Recovery Zone' },
                        { shape: shapes.circle('rgb(255, 200, 50)'), label: 'Renewable Installation' },
                    ]
                    : [
                        { shape: shapes.circle('rgb(255, 68, 68)'), label: (0, i18n_1.t)('components.deckgl.legend.highAlert') },
                        { shape: shapes.circle('rgb(255, 165, 0)'), label: (0, i18n_1.t)('components.deckgl.legend.elevated') },
                        { shape: shapes.circle(isLight ? 'rgb(180, 120, 0)' : 'rgb(255, 255, 0)'), label: (0, i18n_1.t)('components.deckgl.legend.monitoring') },
                        { shape: shapes.triangle('rgb(68, 136, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.base') },
                        { shape: shapes.hexagon(isLight ? 'rgb(180, 120, 0)' : 'rgb(255, 220, 0)'), label: (0, i18n_1.t)('components.deckgl.legend.nuclear') },
                        { shape: shapes.square('rgb(136, 68, 255)'), label: (0, i18n_1.t)('components.deckgl.legend.datacenter') },
                    ];
        legend.innerHTML = `
      <span class="legend-label-title">${(0, i18n_1.t)('components.deckgl.legend.title')}</span>
      ${legendItems.map(({ shape, label }) => `<span class="legend-item">${shape}<span class="legend-label">${label}</span></span>`).join('')}
    `;
        this.container.appendChild(legend);
    }
    // Public API methods (matching MapComponent interface)
    render() {
        if (this.renderPaused) {
            this.renderPending = true;
            return;
        }
        if (this.renderScheduled)
            return;
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.updateLayers();
        });
    }
    setRenderPaused(paused) {
        if (this.renderPaused === paused)
            return;
        this.renderPaused = paused;
        if (paused) {
            this.stopPulseAnimation();
            this.stopDayNightTimer();
            return;
        }
        this.syncPulseAnimation();
        if (this.state.layers.dayNight)
            this.startDayNightTimer();
        if (!paused && this.renderPending) {
            this.renderPending = false;
            this.render();
        }
    }
    updateLayers() {
        if (this.renderPaused || this.webglLost || !this.maplibreMap)
            return;
        const startTime = performance.now();
        try {
            this.deckOverlay?.setProps({ layers: this.buildLayers() });
        }
        catch { /* map may be mid-teardown (null.getProjection) */ }
        const elapsed = performance.now() - startTime;
        if (import.meta.env.DEV && elapsed > 16) {
            console.warn(`[DeckGLMap] updateLayers took ${elapsed.toFixed(2)}ms (>16ms budget)`);
        }
    }
    setView(view) {
        this.state.view = view;
        const preset = VIEW_PRESETS[view];
        if (this.maplibreMap) {
            this.maplibreMap.flyTo({
                center: [preset.longitude, preset.latitude],
                zoom: preset.zoom,
                duration: 1000,
            });
        }
        const viewSelect = this.container.querySelector('.view-select');
        if (viewSelect)
            viewSelect.value = view;
        this.onStateChange?.(this.state);
    }
    setZoom(zoom) {
        this.state.zoom = zoom;
        if (this.maplibreMap) {
            this.maplibreMap.setZoom(zoom);
        }
    }
    setCenter(lat, lon, zoom) {
        if (this.maplibreMap) {
            this.maplibreMap.flyTo({
                center: [lon, lat],
                ...(zoom != null && { zoom }),
                duration: 500,
            });
        }
    }
    getCenter() {
        if (this.maplibreMap) {
            const center = this.maplibreMap.getCenter();
            return { lat: center.lat, lon: center.lng };
        }
        return null;
    }
    setTimeRange(range) {
        this.state.timeRange = range;
        this.rebuildProtestSupercluster();
        this.onTimeRangeChange?.(range);
        this.updateTimeSliderButtons();
        this.render(); // Debounced
    }
    getTimeRange() {
        return this.state.timeRange;
    }
    setLayers(layers) {
        this.state.layers = layers;
        this.render(); // Debounced
        // Update toggle checkboxes
        Object.entries(layers).forEach(([key, value]) => {
            const toggle = this.container.querySelector(`.layer-toggle[data-layer="${key}"] input`);
            if (toggle)
                toggle.checked = value;
        });
    }
    getState() {
        return { ...this.state };
    }
    // Zoom controls - public for external access
    zoomIn() {
        if (this.maplibreMap) {
            this.maplibreMap.zoomIn();
        }
    }
    zoomOut() {
        if (this.maplibreMap) {
            this.maplibreMap.zoomOut();
        }
    }
    resetView() {
        this.setView('global');
    }
    createUcdpEventsLayer(events) {
        return new layers_1.ScatterplotLayer({
            id: 'ucdp-events-layer',
            data: events,
            getPosition: (d) => [d.longitude, d.latitude],
            getRadius: (d) => Math.max(4000, Math.sqrt(d.deaths_best || 1) * 3000),
            getFillColor: (d) => {
                switch (d.type_of_violence) {
                    case 'state-based': return COLORS.ucdpStateBased;
                    case 'non-state': return COLORS.ucdpNonState;
                    case 'one-sided': return COLORS.ucdpOneSided;
                    default: return COLORS.ucdpStateBased;
                }
            },
            radiusMinPixels: 3,
            radiusMaxPixels: 20,
            pickable: false,
        });
    }
    createDisplacementArcsLayer() {
        const withCoords = this.displacementFlows.filter(f => f.originLat != null && f.asylumLat != null);
        const top50 = withCoords.slice(0, 50);
        const maxCount = Math.max(1, ...top50.map(f => f.refugees));
        return new layers_2.ArcLayer({
            id: 'displacement-arcs-layer',
            data: top50,
            getSourcePosition: (d) => [d.originLon, d.originLat],
            getTargetPosition: (d) => [d.asylumLon, d.asylumLat],
            getSourceColor: (0, index_1.getCurrentTheme)() === 'light' ? [50, 80, 180, 220] : [100, 150, 255, 180],
            getTargetColor: (0, index_1.getCurrentTheme)() === 'light' ? [20, 150, 100, 220] : [100, 255, 200, 180],
            getWidth: (d) => Math.max(1, (d.refugees / maxCount) * 8),
            widthMinPixels: 1,
            widthMaxPixels: 8,
            pickable: false,
        });
    }
    createClimateHeatmapLayer() {
        return new aggregation_layers_1.HeatmapLayer({
            id: 'climate-heatmap-layer',
            data: this.climateAnomalies,
            getPosition: (d) => [d.lon, d.lat],
            getWeight: (d) => Math.abs(d.tempDelta) + Math.abs(d.precipDelta) * 0.1,
            radiusPixels: 40,
            intensity: 0.6,
            threshold: 0.15,
            opacity: 0.45,
            colorRange: [
                [68, 136, 255],
                [100, 200, 255],
                [255, 255, 100],
                [255, 200, 50],
                [255, 100, 50],
                [255, 50, 50],
            ],
            pickable: false,
        });
    }
    createTradeRoutesLayer() {
        const active = (0, index_1.getCurrentTheme)() === 'light' ? [30, 100, 180, 200] : [100, 200, 255, 160];
        const disrupted = (0, index_1.getCurrentTheme)() === 'light' ? [200, 40, 40, 220] : [255, 80, 80, 200];
        const highRisk = (0, index_1.getCurrentTheme)() === 'light' ? [200, 140, 20, 200] : [255, 180, 50, 180];
        const colorFor = (status) => status === 'disrupted' ? disrupted : status === 'high_risk' ? highRisk : active;
        return new layers_2.ArcLayer({
            id: 'trade-routes-layer',
            data: this.tradeRouteSegments,
            getSourcePosition: (d) => d.sourcePosition,
            getTargetPosition: (d) => d.targetPosition,
            getSourceColor: (d) => colorFor(d.status),
            getTargetColor: (d) => colorFor(d.status),
            getWidth: (d) => d.category === 'energy' ? 3 : 2,
            widthMinPixels: 1,
            widthMaxPixels: 6,
            greatCircle: true,
            pickable: false,
        });
    }
    createTradeChokepointsLayer() {
        const routeWaypointIds = new Set();
        for (const seg of this.tradeRouteSegments) {
            const route = trade_routes_1.TRADE_ROUTES.find(r => r.id === seg.routeId);
            if (route)
                for (const wp of route.waypoints)
                    routeWaypointIds.add(wp);
        }
        const chokepoints = config_1.STRATEGIC_WATERWAYS.filter(w => routeWaypointIds.has(w.id));
        const isLight = (0, index_1.getCurrentTheme)() === 'light';
        return new layers_1.ScatterplotLayer({
            id: 'trade-chokepoints-layer',
            data: chokepoints,
            getPosition: (d) => [d.lon, d.lat],
            getFillColor: isLight ? [200, 140, 20, 200] : [255, 180, 50, 180],
            getLineColor: isLight ? [100, 70, 10, 255] : [255, 220, 120, 255],
            getRadius: 30000,
            stroked: true,
            lineWidthMinPixels: 1,
            radiusMinPixels: 4,
            radiusMaxPixels: 12,
            pickable: false,
        });
    }
    /**
     * Compute the solar terminator polygon (night side of the Earth).
     * Uses standard astronomical formulas to find the subsolar point,
     * then traces the terminator line and closes around the dark pole.
     */
    computeNightPolygon() {
        const now = new Date();
        const JD = now.getTime() / 86400000 + 2440587.5;
        const D = JD - 2451545.0; // Days since J2000.0
        // Solar mean anomaly (radians)
        const g = ((357.529 + 0.98560028 * D) % 360) * Math.PI / 180;
        // Solar ecliptic longitude (degrees)
        const q = (280.459 + 0.98564736 * D) % 360;
        const L = q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
        const LRad = L * Math.PI / 180;
        // Obliquity of ecliptic (radians)
        const eRad = (23.439 - 0.00000036 * D) * Math.PI / 180;
        // Solar declination (radians)
        const decl = Math.asin(Math.sin(eRad) * Math.sin(LRad));
        // Solar right ascension (radians)
        const RA = Math.atan2(Math.cos(eRad) * Math.sin(LRad), Math.cos(LRad));
        // Greenwich Mean Sidereal Time (degrees)
        const GMST = ((18.697374558 + 24.06570982441908 * D) % 24) * 15;
        // Sub-solar longitude (degrees, normalized to [-180, 180])
        let sunLng = RA * 180 / Math.PI - GMST;
        sunLng = ((sunLng % 360) + 540) % 360 - 180;
        // Trace terminator line (1° steps for smooth curve at high zoom)
        const tanDecl = Math.tan(decl);
        const points = [];
        // Near equinox (|tanDecl| ≈ 0), the terminator is nearly a great circle
        // through the poles — use a vertical line at the subsolar meridian ±90°
        if (Math.abs(tanDecl) < 1e-6) {
            for (let lat = -90; lat <= 90; lat += 1) {
                points.push([sunLng + 90, lat]);
            }
            for (let lat = 90; lat >= -90; lat -= 1) {
                points.push([sunLng - 90, lat]);
            }
            return points;
        }
        for (let lng = -180; lng <= 180; lng += 1) {
            const ha = (lng - sunLng) * Math.PI / 180;
            const lat = Math.atan(-Math.cos(ha) / tanDecl) * 180 / Math.PI;
            points.push([lng, lat]);
        }
        // Close polygon around the dark pole
        const darkPoleLat = decl > 0 ? -90 : 90;
        points.push([180, darkPoleLat]);
        points.push([-180, darkPoleLat]);
        return points;
    }
    createDayNightLayer() {
        const nightPolygon = this.cachedNightPolygon ?? (this.cachedNightPolygon = this.computeNightPolygon());
        const isLight = (0, index_1.getCurrentTheme)() === 'light';
        return new layers_1.PolygonLayer({
            id: 'day-night-layer',
            data: [{ polygon: nightPolygon }],
            getPolygon: (d) => d.polygon,
            getFillColor: isLight ? [0, 0, 40, 35] : [0, 0, 20, 55],
            filled: true,
            stroked: true,
            getLineColor: isLight ? [100, 100, 100, 40] : [200, 200, 255, 25],
            getLineWidth: 1,
            lineWidthUnits: 'pixels',
            pickable: false,
        });
    }
    // Data setters - all use render() for debouncing
    setEarthquakes(earthquakes) {
        this.earthquakes = earthquakes;
        this.render();
    }
    setWeatherAlerts(alerts) {
        this.weatherAlerts = alerts;
        this.render();
    }
    setOutages(outages) {
        this.outages = outages;
        this.render();
    }
    setCyberThreats(threats) {
        this.cyberThreats = threats;
        this.render();
    }
    setIranEvents(events) {
        this.iranEvents = events;
        this.render();
    }
    setAisData(disruptions, density) {
        this.aisDisruptions = disruptions;
        this.aisDensity = density;
        this.render();
    }
    setCableActivity(advisories, repairShips) {
        this.cableAdvisories = advisories;
        this.repairShips = repairShips;
        this.render();
    }
    setCableHealth(healthMap) {
        this.healthByCableId = healthMap;
        this.layerCache.delete('cables-layer');
        this.render();
    }
    setProtests(events) {
        this.protests = events;
        this.rebuildProtestSupercluster();
        this.render();
        this.syncPulseAnimation();
    }
    setFlightDelays(delays) {
        this.flightDelays = delays;
        this.render();
    }
    setMilitaryFlights(flights, clusters = []) {
        this.militaryFlights = flights;
        this.militaryFlightClusters = clusters;
        this.render();
    }
    setCivilianFlights(states) {
        this.civilianFlights = states;
        this.render();
    }
    setMilitaryVessels(vessels, clusters = []) {
        this.militaryVessels = vessels;
        this.militaryVesselClusters = clusters;
        this.render();
    }
    fetchServerBases() {
        if (!this.maplibreMap)
            return;
        const mapLayers = this.state.layers;
        if (!mapLayers.bases)
            return;
        const zoom = this.maplibreMap.getZoom();
        if (zoom < 3)
            return;
        const bounds = this.maplibreMap.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        (0, military_bases_1.fetchMilitaryBases)(sw.lat, sw.lng, ne.lat, ne.lng, zoom).then((result) => {
            if (!result)
                return;
            this.serverBases = result.bases;
            this.serverBaseClusters = result.clusters;
            this.serverBasesLoaded = true;
            this.render();
        }).catch((err) => {
            console.error('[bases] fetch error', err);
        });
    }
    setNaturalEvents(events) {
        this.naturalEvents = events;
        this.render();
    }
    setFires(fires) {
        this.firmsFireData = fires;
        this.render();
    }
    setTechEvents(events) {
        this.techEvents = events;
        this.rebuildTechEventSupercluster();
        this.render();
    }
    setUcdpEvents(events) {
        this.ucdpEvents = events;
        this.render();
    }
    setDisplacementFlows(flows) {
        this.displacementFlows = flows;
        this.render();
    }
    setClimateAnomalies(anomalies) {
        this.climateAnomalies = anomalies;
        this.render();
    }
    setNewsLocations(data) {
        const now = Date.now();
        for (const d of data) {
            if (!this.newsLocationFirstSeen.has(d.title)) {
                this.newsLocationFirstSeen.set(d.title, now);
            }
        }
        for (const [key, ts] of this.newsLocationFirstSeen) {
            if (now - ts > 60000)
                this.newsLocationFirstSeen.delete(key);
        }
        this.newsLocations = data;
        this.render();
        this.syncPulseAnimation(now);
    }
    setPositiveEvents(events) {
        this.positiveEvents = events;
        this.syncPulseAnimation();
        this.render();
    }
    setKindnessData(points) {
        this.kindnessPoints = points;
        this.syncPulseAnimation();
        this.render();
    }
    setHappinessScores(data) {
        this.happinessScores = data.scores;
        this.happinessYear = data.year;
        this.happinessSource = data.source;
        this.render();
    }
    setSpeciesRecoveryZones(species) {
        this.speciesRecoveryZones = species.filter((s) => s.recoveryZone != null);
        this.render();
    }
    setRenewableInstallations(installations) {
        this.renewableInstallations = installations;
        this.render();
    }
    updateHotspotActivity(news) {
        this.news = news; // Store for related news lookup
        // Update hotspot "breaking" indicators based on recent news
        const breakingKeywords = new Set();
        const recentNews = news.filter(n => Date.now() - n.pubDate.getTime() < 2 * 60 * 60 * 1000 // Last 2 hours
        );
        // Count matches per hotspot for escalation tracking
        const matchCounts = new Map();
        recentNews.forEach(item => {
            const tokens = (0, keyword_match_1.tokenizeForMatch)(item.title);
            this.hotspots.forEach(hotspot => {
                if ((0, keyword_match_1.matchesAnyKeyword)(tokens, hotspot.keywords)) {
                    breakingKeywords.add(hotspot.id);
                    matchCounts.set(hotspot.id, (matchCounts.get(hotspot.id) || 0) + 1);
                }
            });
        });
        this.hotspots.forEach(h => {
            h.hasBreaking = breakingKeywords.has(h.id);
            const matchCount = matchCounts.get(h.id) || 0;
            // Calculate a simple velocity metric (matches per hour normalized)
            const velocity = matchCount > 0 ? matchCount / 2 : 0; // 2 hour window
            (0, hotspot_escalation_1.updateHotspotEscalation)(h.id, matchCount, h.hasBreaking || false, velocity);
        });
        this.render();
        this.syncPulseAnimation();
    }
    /** Get news items related to a hotspot by keyword matching */
    getRelatedNews(hotspot) {
        const conflictTopics = ['gaza', 'ukraine', 'ukrainian', 'russia', 'russian', 'israel', 'israeli', 'iran', 'iranian', 'china', 'chinese', 'taiwan', 'taiwanese', 'korea', 'korean', 'syria', 'syrian'];
        return this.news
            .map((item) => {
            const tokens = (0, keyword_match_1.tokenizeForMatch)(item.title);
            const matchedKeywords = (0, keyword_match_1.findMatchingKeywords)(tokens, hotspot.keywords);
            if (matchedKeywords.length === 0)
                return null;
            const conflictMatches = conflictTopics.filter(t => (0, keyword_match_1.matchKeyword)(tokens, t) && !hotspot.keywords.some(k => k.toLowerCase().includes(t)));
            if (conflictMatches.length > 0) {
                const strongLocalMatch = matchedKeywords.some(kw => kw.toLowerCase() === hotspot.name.toLowerCase() ||
                    hotspot.agencies?.some(a => (0, keyword_match_1.matchKeyword)(tokens, a)));
                if (!strongLocalMatch)
                    return null;
            }
            const score = matchedKeywords.length;
            return { item, score };
        })
            .filter((x) => x !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(x => x.item);
    }
    updateMilitaryForEscalation(flights, vessels) {
        (0, hotspot_escalation_1.setMilitaryData)(flights, vessels);
    }
    getHotspotDynamicScore(hotspotId) {
        return (0, hotspot_escalation_1.getHotspotEscalation)(hotspotId);
    }
    /** Get military flight clusters for rendering/analysis */
    getMilitaryFlightClusters() {
        return this.militaryFlightClusters;
    }
    /** Get military vessel clusters for rendering/analysis */
    getMilitaryVesselClusters() {
        return this.militaryVesselClusters;
    }
    highlightAssets(assets) {
        // Clear previous highlights
        Object.values(this.highlightedAssets).forEach(set => set.clear());
        if (assets) {
            assets.forEach(asset => {
                this.highlightedAssets[asset.type].add(asset.id);
            });
        }
        this.render(); // Debounced
    }
    setOnHotspotClick(callback) {
        this.onHotspotClick = callback;
    }
    setOnTimeRangeChange(callback) {
        this.onTimeRangeChange = callback;
    }
    setOnLayerChange(callback) {
        this.onLayerChange = callback;
    }
    setOnStateChange(callback) {
        this.onStateChange = callback;
    }
    getHotspotLevels() {
        const levels = {};
        this.hotspots.forEach(h => {
            levels[h.name] = h.level || 'low';
        });
        return levels;
    }
    setHotspotLevels(levels) {
        this.hotspots.forEach(h => {
            if (levels[h.name]) {
                h.level = levels[h.name];
            }
        });
        this.render(); // Debounced
    }
    initEscalationGetters() {
        (0, hotspot_escalation_1.setCIIGetter)(country_instability_1.getCountryScore);
        (0, hotspot_escalation_1.setGeoAlertGetter)(geo_convergence_1.getAlertsNearLocation);
    }
    // UI visibility methods
    hideLayerToggle(layer) {
        const toggle = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
        if (toggle)
            toggle.style.display = 'none';
    }
    setLayerLoading(layer, loading) {
        const toggle = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
        if (toggle)
            toggle.classList.toggle('loading', loading);
    }
    setLayerReady(layer, hasData) {
        const toggle = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
        if (!toggle)
            return;
        toggle.classList.remove('loading');
        // Match old Map.ts behavior: set 'active' only when layer enabled AND has data
        if (this.state.layers[layer] && hasData) {
            toggle.classList.add('active');
        }
        else {
            toggle.classList.remove('active');
        }
    }
    flashAssets(assetType, ids) {
        // Temporarily highlight assets
        ids.forEach(id => this.highlightedAssets[assetType].add(id));
        this.render();
        setTimeout(() => {
            ids.forEach(id => this.highlightedAssets[assetType].delete(id));
            this.render();
        }, 3000);
    }
    // Enable layer programmatically
    enableLayer(layer) {
        if (!this.state.layers[layer]) {
            this.state.layers[layer] = true;
            const toggle = this.container.querySelector(`.layer-toggle[data-layer="${layer}"] input`);
            if (toggle)
                toggle.checked = true;
            this.render();
            this.onLayerChange?.(layer, true, 'programmatic');
        }
    }
    // Toggle layer on/off programmatically
    toggleLayer(layer) {
        this.state.layers[layer] = !this.state.layers[layer];
        const toggle = this.container.querySelector(`.layer-toggle[data-layer="${layer}"] input`);
        if (toggle)
            toggle.checked = this.state.layers[layer];
        this.render();
        this.onLayerChange?.(layer, this.state.layers[layer], 'programmatic');
    }
    // Get center coordinates for programmatic popup positioning
    getContainerCenter() {
        const rect = this.container.getBoundingClientRect();
        return { x: rect.width / 2, y: rect.height / 2 };
    }
    // Project lat/lon to screen coordinates without moving the map
    projectToScreen(lat, lon) {
        if (!this.maplibreMap)
            return null;
        const point = this.maplibreMap.project([lon, lat]);
        return { x: point.x, y: point.y };
    }
    // Trigger click methods - show popup at item location without moving the map
    triggerHotspotClick(id) {
        const hotspot = this.hotspots.find(h => h.id === id);
        if (!hotspot)
            return;
        // Get screen position for popup
        const screenPos = this.projectToScreen(hotspot.lat, hotspot.lon);
        const { x, y } = screenPos || this.getContainerCenter();
        // Get related news and show popup
        const relatedNews = this.getRelatedNews(hotspot);
        this.popup.show({
            type: 'hotspot',
            data: hotspot,
            relatedNews,
            x,
            y,
        });
        this.popup.loadHotspotGdeltContext(hotspot);
        this.onHotspotClick?.(hotspot);
    }
    triggerConflictClick(id) {
        const conflict = config_1.CONFLICT_ZONES.find(c => c.id === id);
        if (conflict) {
            // Don't pan - show popup at projected screen position or center
            const screenPos = this.projectToScreen(conflict.center[1], conflict.center[0]);
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'conflict', data: conflict, x, y });
        }
    }
    triggerBaseClick(id) {
        const base = this.serverBases.find(b => b.id === id) || config_1.MILITARY_BASES.find(b => b.id === id);
        if (base) {
            const screenPos = this.projectToScreen(base.lat, base.lon);
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'base', data: base, x, y });
        }
    }
    triggerPipelineClick(id) {
        const pipeline = config_1.PIPELINES.find(p => p.id === id);
        if (pipeline && pipeline.points.length > 0) {
            const midIdx = Math.floor(pipeline.points.length / 2);
            const midPoint = pipeline.points[midIdx];
            // Don't pan - show popup at projected screen position or center
            const screenPos = midPoint ? this.projectToScreen(midPoint[1], midPoint[0]) : null;
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'pipeline', data: pipeline, x, y });
        }
    }
    triggerCableClick(id) {
        const cable = config_1.UNDERSEA_CABLES.find(c => c.id === id);
        if (cable && cable.points.length > 0) {
            const midIdx = Math.floor(cable.points.length / 2);
            const midPoint = cable.points[midIdx];
            // Don't pan - show popup at projected screen position or center
            const screenPos = midPoint ? this.projectToScreen(midPoint[1], midPoint[0]) : null;
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'cable', data: cable, x, y });
        }
    }
    triggerDatacenterClick(id) {
        const dc = config_1.AI_DATA_CENTERS.find(d => d.id === id);
        if (dc) {
            // Don't pan - show popup at projected screen position or center
            const screenPos = this.projectToScreen(dc.lat, dc.lon);
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'datacenter', data: dc, x, y });
        }
    }
    triggerNuclearClick(id) {
        const facility = config_1.NUCLEAR_FACILITIES.find(n => n.id === id);
        if (facility) {
            // Don't pan - show popup at projected screen position or center
            const screenPos = this.projectToScreen(facility.lat, facility.lon);
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'nuclear', data: facility, x, y });
        }
    }
    triggerIrradiatorClick(id) {
        const irradiator = config_1.GAMMA_IRRADIATORS.find(i => i.id === id);
        if (irradiator) {
            // Don't pan - show popup at projected screen position or center
            const screenPos = this.projectToScreen(irradiator.lat, irradiator.lon);
            const { x, y } = screenPos || this.getContainerCenter();
            this.popup.show({ type: 'irradiator', data: irradiator, x, y });
        }
    }
    flashLocation(lat, lon, durationMs = 2000) {
        // Don't pan - project coordinates to screen position
        const screenPos = this.projectToScreen(lat, lon);
        if (!screenPos)
            return;
        // Flash effect by temporarily adding a highlight at the location
        const flashMarker = document.createElement('div');
        flashMarker.className = 'flash-location-marker';
        flashMarker.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      border: 2px solid #fff;
      animation: flash-pulse 0.5s ease-out infinite;
      pointer-events: none;
      z-index: 1000;
      left: ${screenPos.x}px;
      top: ${screenPos.y}px;
      transform: translate(-50%, -50%);
    `;
        // Add animation keyframes if not present
        if (!document.getElementById('flash-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'flash-animation-styles';
            style.textContent = `
        @keyframes flash-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `;
            document.head.appendChild(style);
        }
        const wrapper = this.container.querySelector('.deckgl-map-wrapper');
        if (wrapper) {
            wrapper.appendChild(flashMarker);
            setTimeout(() => flashMarker.remove(), durationMs);
        }
    }
    // --- Country click + highlight ---
    setOnCountryClick(cb) {
        this.onCountryClick = cb;
    }
    resolveCountryFromCoordinate(lon, lat) {
        const fromGeometry = (0, country_geometry_1.getCountryAtCoordinates)(lat, lon);
        if (fromGeometry)
            return fromGeometry;
        if (!this.maplibreMap || !this.countryGeoJsonLoaded)
            return null;
        try {
            const point = this.maplibreMap.project([lon, lat]);
            const features = this.maplibreMap.queryRenderedFeatures(point, { layers: ['country-interactive'] });
            const properties = (features?.[0]?.properties ?? {});
            const code = typeof properties['ISO3166-1-Alpha-2'] === 'string'
                ? properties['ISO3166-1-Alpha-2'].trim().toUpperCase()
                : '';
            const name = typeof properties.name === 'string'
                ? properties.name.trim()
                : '';
            if (!code || !name)
                return null;
            return { code, name };
        }
        catch {
            return null;
        }
    }
    loadCountryBoundaries() {
        if (!this.maplibreMap || this.countryGeoJsonLoaded)
            return;
        this.countryGeoJsonLoaded = true;
        (0, country_geometry_1.getCountriesGeoJson)()
            .then((geojson) => {
            if (!this.maplibreMap || !geojson)
                return;
            this.countriesGeoJsonData = geojson;
            this.maplibreMap.addSource('country-boundaries', {
                type: 'geojson',
                data: geojson,
            });
            this.maplibreMap.addLayer({
                id: 'country-interactive',
                type: 'fill',
                source: 'country-boundaries',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0,
                },
            });
            this.maplibreMap.addLayer({
                id: 'country-hover-fill',
                type: 'fill',
                source: 'country-boundaries',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.06,
                },
                filter: ['==', ['get', 'name'], ''],
            });
            this.maplibreMap.addLayer({
                id: 'country-highlight-fill',
                type: 'fill',
                source: 'country-boundaries',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.12,
                },
                filter: ['==', ['get', 'ISO3166-1-Alpha-2'], ''],
            });
            this.maplibreMap.addLayer({
                id: 'country-highlight-border',
                type: 'line',
                source: 'country-boundaries',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 1.5,
                    'line-opacity': 0.5,
                },
                filter: ['==', ['get', 'ISO3166-1-Alpha-2'], ''],
            });
            if (!this.countryHoverSetup)
                this.setupCountryHover();
            this.updateCountryLayerPaint((0, index_1.getCurrentTheme)());
            if (this.highlightedCountryCode)
                this.highlightCountry(this.highlightedCountryCode);
        })
            .catch((err) => console.warn('[DeckGLMap] Failed to load country boundaries:', err));
    }
    setupCountryHover() {
        if (!this.maplibreMap || this.countryHoverSetup)
            return;
        this.countryHoverSetup = true;
        const map = this.maplibreMap;
        let hoveredName = null;
        map.on('mousemove', (e) => {
            if (!this.onCountryClick)
                return;
            const features = map.queryRenderedFeatures(e.point, { layers: ['country-interactive'] });
            const name = features?.[0]?.properties?.name;
            try {
                if (name && name !== hoveredName) {
                    hoveredName = name;
                    map.setFilter('country-hover-fill', ['==', ['get', 'name'], name]);
                    map.getCanvas().style.cursor = 'pointer';
                }
                else if (!name && hoveredName) {
                    hoveredName = null;
                    map.setFilter('country-hover-fill', ['==', ['get', 'name'], '']);
                    map.getCanvas().style.cursor = '';
                }
            }
            catch { /* style not done loading during theme switch */ }
        });
        map.on('mouseout', () => {
            if (hoveredName) {
                hoveredName = null;
                try {
                    map.setFilter('country-hover-fill', ['==', ['get', 'name'], '']);
                }
                catch { /* style not done loading */ }
                map.getCanvas().style.cursor = '';
            }
        });
    }
    highlightCountry(code) {
        this.highlightedCountryCode = code;
        if (!this.maplibreMap || !this.countryGeoJsonLoaded)
            return;
        const filter = ['==', ['get', 'ISO3166-1-Alpha-2'], code];
        try {
            this.maplibreMap.setFilter('country-highlight-fill', filter);
            this.maplibreMap.setFilter('country-highlight-border', filter);
        }
        catch { /* layer not ready yet */ }
    }
    clearCountryHighlight() {
        this.highlightedCountryCode = null;
        if (!this.maplibreMap)
            return;
        const noMatch = ['==', ['get', 'ISO3166-1-Alpha-2'], ''];
        try {
            this.maplibreMap.setFilter('country-highlight-fill', noMatch);
            this.maplibreMap.setFilter('country-highlight-border', noMatch);
        }
        catch { /* layer not ready */ }
    }
    switchBasemap(theme) {
        if (!this.maplibreMap)
            return;
        this.maplibreMap.setStyle(theme === 'light' ? LIGHT_STYLE : DARK_STYLE);
        // setStyle() replaces all sources/layers — reset guard so country layers are re-added
        this.countryGeoJsonLoaded = false;
        this.maplibreMap.once('style.load', () => {
            this.loadCountryBoundaries();
            this.updateCountryLayerPaint(theme);
            // Re-render deck.gl overlay after style swap — interleaved layers need
            // the new MapLibre style to be loaded before they can re-insert.
            this.render();
        });
    }
    updateCountryLayerPaint(theme) {
        if (!this.maplibreMap || !this.countryGeoJsonLoaded)
            return;
        const hoverOpacity = theme === 'light' ? 0.10 : 0.06;
        const highlightOpacity = theme === 'light' ? 0.18 : 0.12;
        try {
            this.maplibreMap.setPaintProperty('country-hover-fill', 'fill-opacity', hoverOpacity);
            this.maplibreMap.setPaintProperty('country-highlight-fill', 'fill-opacity', highlightOpacity);
        }
        catch { /* layers may not be ready */ }
    }
    destroy() {
        if (this.moveTimeoutId) {
            clearTimeout(this.moveTimeoutId);
            this.moveTimeoutId = null;
        }
        this.stopPulseAnimation();
        this.stopDayNightTimer();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.layerCache.clear();
        this.deckOverlay?.finalize();
        this.deckOverlay = null;
        this.maplibreMap?.remove();
        this.maplibreMap = null;
        this.container.innerHTML = '';
    }
}
exports.DeckGLMap = DeckGLMap;
DeckGLMap.MAX_CLUSTER_LEAVES = 200;
