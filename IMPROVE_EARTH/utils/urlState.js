"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMapUrlState = parseMapUrlState;
exports.buildMapUrl = buildMapUrl;
const LAYER_KEYS = [
    'conflicts',
    'bases',
    'cables',
    'pipelines',
    'hotspots',
    'ais',
    'nuclear',
    'irradiators',
    'sanctions',
    'weather',
    'economic',
    'waterways',
    'outages',
    'cyberThreats',
    'datacenters',
    'protests',
    'flights',
    'military',
    'natural',
    'spaceports',
    'minerals',
    'fires',
    'ucdpEvents',
    'displacement',
    'climate',
    'startupHubs',
    'cloudRegions',
    'accelerators',
    'techHQs',
    'techEvents',
    'tradeRoutes',
    'iranAttacks',
];
const TIME_RANGES = ['1h', '6h', '24h', '48h', '7d', 'all'];
const VIEW_VALUES = ['global', 'america', 'mena', 'eu', 'asia', 'latam', 'africa', 'oceania'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function parseMapUrlState(search, fallbackLayers) {
    const params = new URLSearchParams(search);
    const viewParam = params.get('view');
    const view = VIEW_VALUES.includes(viewParam) ? viewParam : undefined;
    const zoomParam = params.get('zoom');
    const zoomValue = zoomParam ? Number.parseFloat(zoomParam) : NaN;
    const zoom = Number.isFinite(zoomValue) ? clamp(zoomValue, 1, 10) : undefined;
    const latParam = params.get('lat');
    const lonParam = params.get('lon');
    const latValue = latParam ? Number.parseFloat(latParam) : NaN;
    const lonValue = lonParam ? Number.parseFloat(lonParam) : NaN;
    const lat = Number.isFinite(latValue) ? clamp(latValue, -90, 90) : undefined;
    const lon = Number.isFinite(lonValue) ? clamp(lonValue, -180, 180) : undefined;
    const timeRangeParam = params.get('timeRange');
    const timeRange = TIME_RANGES.includes(timeRangeParam)
        ? timeRangeParam
        : undefined;
    const countryParam = params.get('country');
    const country = countryParam && /^[A-Z]{2}$/i.test(countryParam.trim()) ? countryParam.trim().toUpperCase() : undefined;
    const layersParam = params.get('layers');
    let layers;
    if (layersParam !== null) {
        layers = { ...fallbackLayers };
        const normalizedLayers = layersParam.trim();
        if (normalizedLayers !== '' && normalizedLayers !== 'none') {
            const requested = new Set(normalizedLayers
                .split(',')
                .map((layer) => layer.trim())
                .filter(Boolean));
            LAYER_KEYS.forEach((key) => {
                layers[key] = requested.has(key);
            });
        }
        else {
            LAYER_KEYS.forEach((key) => {
                layers[key] = false;
            });
        }
    }
    return {
        view,
        zoom,
        lat,
        lon,
        timeRange,
        layers,
        country,
    };
}
function buildMapUrl(baseUrl, state) {
    const url = new URL(baseUrl);
    const params = new URLSearchParams();
    if (state.center) {
        params.set('lat', state.center.lat.toFixed(4));
        params.set('lon', state.center.lon.toFixed(4));
    }
    params.set('zoom', state.zoom.toFixed(2));
    params.set('view', state.view);
    params.set('timeRange', state.timeRange);
    const activeLayers = LAYER_KEYS.filter((layer) => state.layers[layer]);
    params.set('layers', activeLayers.length > 0 ? activeLayers.join(',') : 'none');
    if (state.country) {
        params.set('country', state.country);
    }
    url.search = params.toString();
    return url.toString();
}
