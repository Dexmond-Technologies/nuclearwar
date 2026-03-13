"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFlightDelays = fetchFlightDelays;
const service_client_1 = require("@/generated/client/worldmonitor/aviation/v1/service_client");
const utils_1 = require("@/utils");
// --- Internal: proto -> legacy mapping ---
const SEVERITY_MAP = {
    FLIGHT_DELAY_SEVERITY_NORMAL: 'normal',
    FLIGHT_DELAY_SEVERITY_MINOR: 'minor',
    FLIGHT_DELAY_SEVERITY_MODERATE: 'moderate',
    FLIGHT_DELAY_SEVERITY_MAJOR: 'major',
    FLIGHT_DELAY_SEVERITY_SEVERE: 'severe',
};
const DELAY_TYPE_MAP = {
    FLIGHT_DELAY_TYPE_GROUND_STOP: 'ground_stop',
    FLIGHT_DELAY_TYPE_GROUND_DELAY: 'ground_delay',
    FLIGHT_DELAY_TYPE_DEPARTURE_DELAY: 'departure_delay',
    FLIGHT_DELAY_TYPE_ARRIVAL_DELAY: 'arrival_delay',
    FLIGHT_DELAY_TYPE_GENERAL: 'general',
    FLIGHT_DELAY_TYPE_CLOSURE: 'closure',
};
const REGION_MAP = {
    AIRPORT_REGION_AMERICAS: 'americas',
    AIRPORT_REGION_EUROPE: 'europe',
    AIRPORT_REGION_APAC: 'apac',
    AIRPORT_REGION_MENA: 'mena',
    AIRPORT_REGION_AFRICA: 'africa',
};
const SOURCE_MAP = {
    FLIGHT_DELAY_SOURCE_FAA: 'faa',
    FLIGHT_DELAY_SOURCE_EUROCONTROL: 'eurocontrol',
    FLIGHT_DELAY_SOURCE_COMPUTED: 'computed',
};
function toDisplayAlert(proto) {
    return {
        id: proto.id,
        iata: proto.iata,
        icao: proto.icao,
        name: proto.name,
        city: proto.city,
        country: proto.country,
        lat: proto.location?.latitude ?? 0,
        lon: proto.location?.longitude ?? 0,
        region: REGION_MAP[proto.region] ?? 'americas',
        delayType: DELAY_TYPE_MAP[proto.delayType] ?? 'general',
        severity: SEVERITY_MAP[proto.severity] ?? 'normal',
        avgDelayMinutes: proto.avgDelayMinutes,
        delayedFlightsPct: proto.delayedFlightsPct || undefined,
        cancelledFlights: proto.cancelledFlights || undefined,
        totalFlights: proto.totalFlights || undefined,
        reason: proto.reason || undefined,
        source: SOURCE_MAP[proto.source] ?? 'computed',
        updatedAt: new Date(proto.updatedAt),
    };
}
// --- Client + circuit breaker ---
const client = new service_client_1.AviationServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const breaker = (0, utils_1.createCircuitBreaker)({ name: 'FAA Flight Delays', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
// --- Main fetch (public API) ---
async function fetchFlightDelays() {
    return breaker.execute(async () => {
        const response = await client.listAirportDelays({
            region: 'AIRPORT_REGION_UNSPECIFIED',
            minSeverity: 'FLIGHT_DELAY_SEVERITY_UNSPECIFIED',
            pageSize: 0,
            cursor: '',
        });
        return response.alerts.map(toDisplayAlert);
    }, []);
}
