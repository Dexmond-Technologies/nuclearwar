"use strict";
/**
 * Unified infrastructure service module -- replaces two legacy services:
 *   - src/services/outages.ts (Cloudflare Radar internet outages)
 *   - ServiceStatusPanel's direct /api/service-status fetch
 *
 * All data now flows through the InfrastructureServiceClient RPC.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutagesConfigured = isOutagesConfigured;
exports.fetchInternetOutages = fetchInternetOutages;
exports.getOutagesStatus = getOutagesStatus;
exports.fetchServiceStatuses = fetchServiceStatuses;
const service_client_1 = require("@/generated/client/worldmonitor/infrastructure/v1/service_client");
const utils_1 = require("@/utils");
const runtime_config_1 = require("../runtime-config");
const bootstrap_1 = require("@/services/bootstrap");
// ---- Client + Circuit Breakers ----
const client = new service_client_1.InfrastructureServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
const outageBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Internet Outages', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const statusBreaker = (0, utils_1.createCircuitBreaker)({ name: 'Service Statuses', cacheTtlMs: 5 * 60 * 1000, persistCache: true });
const emptyOutageFallback = { outages: [], pagination: undefined };
const emptyStatusFallback = { statuses: [] };
// ---- Proto enum -> legacy string adapters ----
const SEVERITY_REVERSE = {
    OUTAGE_SEVERITY_PARTIAL: 'partial',
    OUTAGE_SEVERITY_MAJOR: 'major',
    OUTAGE_SEVERITY_TOTAL: 'total',
};
const STATUS_REVERSE = {
    SERVICE_OPERATIONAL_STATUS_OPERATIONAL: 'operational',
    SERVICE_OPERATIONAL_STATUS_DEGRADED: 'degraded',
    SERVICE_OPERATIONAL_STATUS_PARTIAL_OUTAGE: 'outage',
    SERVICE_OPERATIONAL_STATUS_MAJOR_OUTAGE: 'outage',
    SERVICE_OPERATIONAL_STATUS_MAINTENANCE: 'degraded',
    SERVICE_OPERATIONAL_STATUS_UNSPECIFIED: 'unknown',
};
// ---- Adapter: proto InternetOutage -> legacy InternetOutage ----
function toOutage(proto) {
    return {
        id: proto.id,
        title: proto.title,
        link: proto.link,
        description: proto.description,
        pubDate: proto.detectedAt ? new Date(proto.detectedAt) : new Date(),
        country: proto.country,
        region: proto.region || undefined,
        lat: proto.location?.latitude ?? 0,
        lon: proto.location?.longitude ?? 0,
        severity: SEVERITY_REVERSE[proto.severity] || 'partial',
        categories: proto.categories,
        cause: proto.cause || undefined,
        outageType: proto.outageType || undefined,
        endDate: proto.endedAt ? new Date(proto.endedAt) : undefined,
    };
}
// ========================================================================
// Internet Outages -- replaces src/services/outages.ts
// ========================================================================
let outagesConfigured = null;
function isOutagesConfigured() {
    return outagesConfigured;
}
async function fetchInternetOutages() {
    if (!(0, runtime_config_1.isFeatureAvailable)('internetOutages')) {
        outagesConfigured = false;
        return [];
    }
    const hydrated = (0, bootstrap_1.getHydratedData)('outages');
    const resp = hydrated ?? await outageBreaker.execute(async () => {
        return client.listInternetOutages({
            country: '',
            start: 0,
            end: 0,
            pageSize: 0,
            cursor: '',
        });
    }, emptyOutageFallback);
    if (resp.outages.length === 0) {
        if (outagesConfigured === null)
            outagesConfigured = false;
        return [];
    }
    outagesConfigured = true;
    return resp.outages.map(toOutage);
}
function getOutagesStatus() {
    return outageBreaker.getStatus();
}
// Category map for the service IDs (matches the handler's SERVICES list)
const CATEGORY_MAP = {
    aws: 'cloud', azure: 'cloud', gcp: 'cloud', cloudflare: 'cloud', vercel: 'cloud',
    netlify: 'cloud', digitalocean: 'cloud', render: 'cloud', railway: 'cloud',
    github: 'dev', gitlab: 'dev', npm: 'dev', docker: 'dev', bitbucket: 'dev',
    circleci: 'dev', jira: 'dev', confluence: 'dev', linear: 'dev',
    slack: 'comm', discord: 'comm', zoom: 'comm', notion: 'comm',
    openai: 'ai', anthropic: 'ai', replicate: 'ai',
    stripe: 'saas', twilio: 'saas', datadog: 'saas', sentry: 'saas', supabase: 'saas',
};
function toServiceResult(proto) {
    return {
        id: proto.id,
        name: proto.name,
        category: CATEGORY_MAP[proto.id] || 'saas',
        status: STATUS_REVERSE[proto.status] || 'unknown',
        description: proto.description,
    };
}
function computeSummary(services) {
    return {
        operational: services.filter((s) => s.status === 'operational').length,
        degraded: services.filter((s) => s.status === 'degraded').length,
        outage: services.filter((s) => s.status === 'outage').length,
        unknown: services.filter((s) => s.status === 'unknown').length,
    };
}
async function fetchServiceStatuses() {
    const hydrated = (0, bootstrap_1.getHydratedData)('serviceStatuses');
    if (hydrated) {
        const raw = hydrated;
        const services = (raw.statuses ?? []).map(toServiceResult);
        return { success: true, timestamp: new Date().toISOString(), summary: computeSummary(services), services };
    }
    const resp = await statusBreaker.execute(async () => {
        return client.listServiceStatuses({
            status: 'SERVICE_OPERATIONAL_STATUS_UNSPECIFIED',
        });
    }, emptyStatusFallback);
    const services = resp.statuses.map(toServiceResult);
    return {
        success: true,
        timestamp: new Date().toISOString(),
        summary: computeSummary(services),
        services,
    };
}
