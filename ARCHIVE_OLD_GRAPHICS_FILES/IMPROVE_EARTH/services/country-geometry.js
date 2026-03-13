"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ME_STRIKE_BOUNDS = void 0;
exports.preloadCountryGeometry = preloadCountryGeometry;
exports.getCountriesGeoJson = getCountriesGeoJson;
exports.hasCountryGeometry = hasCountryGeometry;
exports.getCountryAtCoordinates = getCountryAtCoordinates;
exports.isCoordinateInCountry = isCoordinateInCountry;
exports.getCountryNameByCode = getCountryNameByCode;
exports.iso3ToIso2Code = iso3ToIso2Code;
exports.nameToCountryCode = nameToCountryCode;
exports.matchCountryNamesInText = matchCountryNamesInText;
exports.getAllCountryCodes = getAllCountryCodes;
exports.getCountryBbox = getCountryBbox;
exports.resolveCountryFromBounds = resolveCountryFromBounds;
const COUNTRY_GEOJSON_URL = '/data/countries.geojson';
const POLITICAL_OVERRIDES = { 'CN-TW': 'TW' };
const NAME_ALIASES = {
    'dr congo': 'CD', 'democratic republic of the congo': 'CD',
    'czech republic': 'CZ', 'ivory coast': 'CI', "cote d'ivoire": 'CI',
    'uae': 'AE', 'uk': 'GB', 'usa': 'US',
    'south korea': 'KR', 'north korea': 'KP',
    'republic of the congo': 'CG', 'east timor': 'TL',
    'cape verde': 'CV', 'swaziland': 'SZ', 'burma': 'MM',
};
let loadPromise = null;
let loadedGeoJson = null;
const countryIndex = new Map();
let countryList = [];
const iso3ToIso2 = new Map();
const nameToIso2 = new Map();
const codeToName = new Map();
let sortedCountryNames = [];
function normalizeCode(properties) {
    if (!properties)
        return null;
    const rawCode = properties['ISO3166-1-Alpha-2'] ?? properties.ISO_A2 ?? properties.iso_a2;
    if (typeof rawCode !== 'string')
        return null;
    const trimmed = rawCode.trim().toUpperCase();
    const overridden = POLITICAL_OVERRIDES[trimmed] ?? trimmed;
    return /^[A-Z]{2}$/.test(overridden) ? overridden : null;
}
function normalizeName(properties) {
    if (!properties)
        return null;
    const rawName = properties.name ?? properties.NAME ?? properties.admin;
    if (typeof rawName !== 'string')
        return null;
    const name = rawName.trim();
    return name.length > 0 ? name : null;
}
function toCoord(point) {
    if (!Array.isArray(point) || point.length < 2)
        return null;
    const lon = Number(point[0]);
    const lat = Number(point[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat))
        return null;
    return [lon, lat];
}
function normalizePolygonRings(rings) {
    return rings
        .map((ring) => ring.map(toCoord).filter((p) => p !== null))
        .filter((ring) => ring.length >= 3);
}
function normalizeGeometry(geometry) {
    if (!geometry)
        return [];
    if (geometry.type === 'Polygon') {
        const polygon = normalizePolygonRings(geometry.coordinates);
        return polygon.length > 0 ? [polygon] : [];
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates
            .map((polygonCoords) => normalizePolygonRings(polygonCoords))
            .filter((polygon) => polygon.length > 0);
    }
    return [];
}
function computeBbox(polygons) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    let hasPoint = false;
    polygons.forEach((polygon) => {
        polygon.forEach((ring) => {
            ring.forEach(([lon, lat]) => {
                hasPoint = true;
                if (lon < minLon)
                    minLon = lon;
                if (lat < minLat)
                    minLat = lat;
                if (lon > maxLon)
                    maxLon = lon;
                if (lat > maxLat)
                    maxLat = lat;
            });
        });
    });
    return hasPoint ? [minLon, minLat, maxLon, maxLat] : null;
}
function pointOnSegment(px, py, x1, y1, x2, y2) {
    const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
    if (Math.abs(cross) > 1e-9)
        return false;
    const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
    return dot <= 0;
}
function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const current = ring[i];
        const previous = ring[j];
        if (!current || !previous)
            continue;
        const [xi, yi] = current;
        const [xj, yj] = previous;
        if (pointOnSegment(lon, lat, xi, yi, xj, yj))
            return true;
        const intersects = ((yi > lat) !== (yj > lat))
            && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersects)
            inside = !inside;
    }
    return inside;
}
function pointInCountryGeometry(country, lon, lat) {
    const [minLon, minLat, maxLon, maxLat] = country.bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat)
        return false;
    for (const polygon of country.polygons) {
        const outer = polygon[0];
        if (!outer || !pointInRing(lon, lat, outer))
            continue;
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
            const hole = polygon[i];
            if (hole && pointInRing(lon, lat, hole)) {
                inHole = true;
                break;
            }
        }
        if (!inHole)
            return true;
    }
    return false;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function buildCountryNameMatchers() {
    sortedCountryNames = [...nameToIso2.entries()]
        .filter(([name]) => name.length >= 4)
        .sort((a, b) => b[0].length - a[0].length)
        .map(([name, code]) => ({
        name,
        code,
        regex: new RegExp(`\\b${escapeRegex(name)}\\b`, 'i'),
    }));
}
async function ensureLoaded() {
    if (loadedGeoJson || loadPromise) {
        await loadPromise;
        return;
    }
    loadPromise = (async () => {
        if (typeof fetch !== 'function')
            return;
        try {
            const response = await fetch(COUNTRY_GEOJSON_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
                return;
            }
            loadedGeoJson = data;
            countryIndex.clear();
            countryList = [];
            iso3ToIso2.clear();
            nameToIso2.clear();
            codeToName.clear();
            for (const feature of data.features) {
                const code = normalizeCode(feature.properties);
                const name = normalizeName(feature.properties);
                if (!code || !name)
                    continue;
                const iso3 = feature.properties?.['ISO3166-1-Alpha-3'];
                if (typeof iso3 === 'string' && /^[A-Z]{3}$/i.test(iso3.trim())) {
                    iso3ToIso2.set(iso3.trim().toUpperCase(), code);
                }
                nameToIso2.set(name.toLowerCase(), code);
                if (!codeToName.has(code))
                    codeToName.set(code, name);
                const polygons = normalizeGeometry(feature.geometry);
                const bbox = computeBbox(polygons);
                if (!bbox || polygons.length === 0)
                    continue;
                const indexed = { code, name, polygons, bbox };
                countryIndex.set(code, indexed);
                countryList.push(indexed);
            }
            for (const [alias, code] of Object.entries(NAME_ALIASES)) {
                if (!nameToIso2.has(alias)) {
                    nameToIso2.set(alias, code);
                }
            }
            buildCountryNameMatchers();
        }
        catch (err) {
            console.warn('[country-geometry] Failed to load countries.geojson:', err);
        }
    })();
    await loadPromise;
}
async function preloadCountryGeometry() {
    await ensureLoaded();
}
async function getCountriesGeoJson() {
    await ensureLoaded();
    return loadedGeoJson;
}
function hasCountryGeometry(code) {
    return countryIndex.has(code.toUpperCase());
}
function getCountryAtCoordinates(lat, lon, candidateCodes) {
    if (!loadedGeoJson)
        return null;
    const candidates = Array.isArray(candidateCodes) && candidateCodes.length > 0
        ? candidateCodes
            .map((code) => countryIndex.get(code.toUpperCase()))
            .filter((country) => Boolean(country))
        : countryList;
    for (const country of candidates) {
        if (pointInCountryGeometry(country, lon, lat)) {
            return { code: country.code, name: country.name };
        }
    }
    return null;
}
function isCoordinateInCountry(lat, lon, code) {
    if (!loadedGeoJson)
        return null;
    const country = countryIndex.get(code.toUpperCase());
    if (!country)
        return null;
    return pointInCountryGeometry(country, lon, lat);
}
function getCountryNameByCode(code) {
    const upper = code.toUpperCase();
    const entry = countryIndex.get(upper);
    if (entry)
        return entry.name;
    return codeToName.get(upper) ?? null;
}
function iso3ToIso2Code(iso3) {
    return iso3ToIso2.get(iso3.trim().toUpperCase()) ?? null;
}
function nameToCountryCode(text) {
    const normalized = text.toLowerCase().trim();
    return nameToIso2.get(normalized) ?? null;
}
function matchCountryNamesInText(text) {
    const matched = [];
    let remaining = text.toLowerCase();
    for (const { code, regex } of sortedCountryNames) {
        if (regex.test(remaining)) {
            matched.push(code);
            remaining = remaining.replace(regex, '');
        }
    }
    return matched;
}
function getAllCountryCodes() {
    return [...countryIndex.keys()];
}
function getCountryBbox(code) {
    const entry = countryIndex.get(code.toUpperCase());
    return entry?.bbox ?? null;
}
exports.ME_STRIKE_BOUNDS = {
    BH: { n: 26.3, s: 25.8, e: 50.8, w: 50.3 }, QA: { n: 26.2, s: 24.5, e: 51.7, w: 50.7 },
    LB: { n: 34.7, s: 33.1, e: 36.6, w: 35.1 }, KW: { n: 30.1, s: 28.5, e: 48.5, w: 46.5 },
    IL: { n: 33.3, s: 29.5, e: 35.9, w: 34.3 }, AE: { n: 26.1, s: 22.6, e: 56.4, w: 51.6 },
    JO: { n: 33.4, s: 29.2, e: 39.3, w: 34.9 }, SY: { n: 37.3, s: 32.3, e: 42.4, w: 35.7 },
    OM: { n: 26.4, s: 16.6, e: 59.8, w: 52.0 }, IQ: { n: 37.4, s: 29.1, e: 48.6, w: 38.8 },
    YE: { n: 19, s: 12, e: 54.5, w: 42 }, IR: { n: 40, s: 25, e: 63, w: 44 },
    SA: { n: 32, s: 16, e: 55, w: 35 },
};
function resolveCountryFromBounds(lat, lon, bounds) {
    const matches = [];
    for (const [code, b] of Object.entries(bounds)) {
        if (lat >= b.s && lat <= b.n && lon >= b.w && lon <= b.e) {
            matches.push({ code, area: (b.n - b.s) * (b.e - b.w) });
        }
    }
    if (matches.length === 0)
        return null;
    if (matches.length === 1)
        return matches[0].code;
    let anyGeometryAvailable = false;
    for (const m of matches) {
        const precise = isCoordinateInCountry(lat, lon, m.code);
        if (precise === true)
            return m.code;
        if (precise === false)
            anyGeometryAvailable = true;
    }
    if (!anyGeometryAvailable)
        return null;
    matches.sort((a, b) => a.area - b.area);
    return matches[0].code;
}
