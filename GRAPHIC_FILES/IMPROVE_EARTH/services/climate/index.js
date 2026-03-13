"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchClimateAnomalies = fetchClimateAnomalies;
exports.getSeverityIcon = getSeverityIcon;
exports.formatDelta = formatDelta;
const service_client_1 = require("@/generated/client/worldmonitor/climate/v1/service_client");
const utils_1 = require("@/utils");
const bootstrap_1 = require("@/services/bootstrap");
const client = new service_client_1.ClimateServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'Climate Anomalies', cacheTtlMs: 10 * 60 * 1000, persistCache: true });
const emptyClimateFallback = { anomalies: [] };
async function fetchClimateAnomalies() {
    const hydrated = (0, bootstrap_1.getHydratedData)('climateAnomalies');
    if (hydrated) {
        const anomalies = (hydrated.anomalies ?? []).map(toDisplayAnomaly).filter(a => a.severity !== 'normal');
        return { ok: true, anomalies };
    }
    const response = await breaker.execute(async () => {
        return client.listClimateAnomalies({ minSeverity: 'ANOMALY_SEVERITY_UNSPECIFIED', pageSize: 0, cursor: '' });
    }, emptyClimateFallback);
    const anomalies = (response.anomalies ?? [])
        .map(toDisplayAnomaly)
        .filter(a => a.severity !== 'normal');
    return { ok: true, anomalies };
}
// Presentation helpers (used by ClimateAnomalyPanel)
function getSeverityIcon(anomaly) {
    switch (anomaly.type) {
        case 'warm': return '\u{1F321}\u{FE0F}'; // thermometer
        case 'cold': return '\u{2744}\u{FE0F}'; // snowflake
        case 'wet': return '\u{1F327}\u{FE0F}'; // rain
        case 'dry': return '\u{2600}\u{FE0F}'; // sun
        case 'mixed': return '\u{26A1}'; // lightning
        default: return '\u{1F321}\u{FE0F}'; // thermometer
    }
}
function formatDelta(value, unit) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${unit}`;
}
// Internal: Map proto ClimateAnomaly -> consumer-friendly shape
function toDisplayAnomaly(proto) {
    return {
        zone: proto.zone,
        lat: proto.location?.latitude ?? 0,
        lon: proto.location?.longitude ?? 0,
        tempDelta: proto.tempDelta,
        precipDelta: proto.precipDelta,
        severity: mapSeverity(proto.severity),
        type: mapType(proto.type),
        period: proto.period,
    };
}
function mapSeverity(s) {
    switch (s) {
        case 'ANOMALY_SEVERITY_EXTREME': return 'extreme';
        case 'ANOMALY_SEVERITY_MODERATE': return 'moderate';
        default: return 'normal';
    }
}
function mapType(t) {
    switch (t) {
        case 'ANOMALY_TYPE_WARM': return 'warm';
        case 'ANOMALY_TYPE_COLD': return 'cold';
        case 'ANOMALY_TYPE_WET': return 'wet';
        case 'ANOMALY_TYPE_DRY': return 'dry';
        case 'ANOMALY_TYPE_MIXED': return 'mixed';
        default: return 'warm';
    }
}
