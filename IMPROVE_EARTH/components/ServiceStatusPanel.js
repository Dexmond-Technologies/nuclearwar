"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceStatusPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const runtime_1 = require("@/services/runtime");
const desktop_readiness_1 = require("@/services/desktop-readiness");
const infrastructure_1 = require("@/services/infrastructure");
const dom_utils_1 = require("@/utils/dom-utils");
function getCategoryLabel(category) {
    const labels = {
        all: (0, i18n_1.t)('components.serviceStatus.categories.all'),
        cloud: (0, i18n_1.t)('components.serviceStatus.categories.cloud'),
        dev: (0, i18n_1.t)('components.serviceStatus.categories.dev'),
        comm: (0, i18n_1.t)('components.serviceStatus.categories.comm'),
        ai: (0, i18n_1.t)('components.serviceStatus.categories.ai'),
        saas: (0, i18n_1.t)('components.serviceStatus.categories.saas'),
    };
    return labels[category];
}
class ServiceStatusPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'service-status', title: (0, i18n_1.t)('panels.serviceStatus'), showCount: false });
        this.services = [];
        this.loading = true;
        this.error = null;
        this.filter = 'all';
        this.localBackend = null;
        this.lastServicesJson = '';
        void this.fetchStatus();
    }
    async fetchStatus() {
        try {
            const data = await (0, infrastructure_1.fetchServiceStatuses)();
            if (!data.success)
                throw new Error('Failed to load status');
            const fingerprint = data.services.map(s => `${s.name}:${s.status}`).join(',');
            const changed = fingerprint !== this.lastServicesJson;
            this.lastServicesJson = fingerprint;
            this.services = data.services;
            this.error = null;
            return changed;
        }
        catch (err) {
            if (this.isAbortError(err))
                return false;
            this.error = err instanceof Error ? err.message : 'Failed to fetch';
            console.error('[ServiceStatus] Fetch error:', err);
            return true;
        }
        finally {
            this.loading = false;
            this.render();
        }
    }
    setFilter(filter) {
        this.filter = filter;
        this.render();
    }
    getFilteredServices() {
        if (this.filter === 'all')
            return this.services;
        return this.services.filter(s => s.category === this.filter);
    }
    render() {
        if (this.loading) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'service-status-loading' }, (0, dom_utils_1.h)('div', { className: 'loading-spinner' }), (0, dom_utils_1.h)('span', null, (0, i18n_1.t)('components.serviceStatus.checkingServices'))));
            return;
        }
        if (this.error) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'service-status-error' }, (0, dom_utils_1.h)('span', { className: 'error-text' }, this.error), (0, dom_utils_1.h)('button', {
                className: 'retry-btn',
                onClick: () => { this.loading = true; this.render(); void this.fetchStatus(); },
            }, (0, i18n_1.t)('common.retry'))));
            return;
        }
        const filtered = this.getFilteredServices();
        const issues = filtered.filter(s => s.status !== 'operational');
        (0, dom_utils_1.replaceChildren)(this.content, this.buildBackendStatus(), this.buildDesktopReadiness(), this.buildSummary(filtered), this.buildFilters(), (0, dom_utils_1.h)('div', { className: 'service-status-list' }, ...this.buildServiceItems(filtered)), issues.length === 0 ? (0, dom_utils_1.h)('div', { className: 'all-operational' }, (0, i18n_1.t)('components.serviceStatus.allOperational')) : false);
    }
    buildBackendStatus() {
        if (!(0, runtime_1.isDesktopRuntime)())
            return false;
        if (!this.localBackend?.enabled) {
            return (0, dom_utils_1.h)('div', { className: 'service-status-backend warning' }, (0, i18n_1.t)('components.serviceStatus.backendUnavailable'));
        }
        const port = this.localBackend.port ?? (0, runtime_1.getLocalApiPort)();
        const remote = this.localBackend.remoteBase ?? 'https://worldmonitor.app';
        return (0, dom_utils_1.h)('div', { className: 'service-status-backend' }, 'Local backend active on ', (0, dom_utils_1.h)('strong', null, `127.0.0.1:${port}`), ' · cloud fallback: ', (0, dom_utils_1.h)('strong', null, remote));
    }
    buildSummary(services) {
        const operational = services.filter(s => s.status === 'operational').length;
        const degraded = services.filter(s => s.status === 'degraded').length;
        const outage = services.filter(s => s.status === 'outage').length;
        return (0, dom_utils_1.h)('div', { className: 'service-status-summary' }, (0, dom_utils_1.h)('div', { className: 'summary-item operational' }, (0, dom_utils_1.h)('span', { className: 'summary-count' }, String(operational)), (0, dom_utils_1.h)('span', { className: 'summary-label' }, (0, i18n_1.t)('components.serviceStatus.ok'))), (0, dom_utils_1.h)('div', { className: 'summary-item degraded' }, (0, dom_utils_1.h)('span', { className: 'summary-count' }, String(degraded)), (0, dom_utils_1.h)('span', { className: 'summary-label' }, (0, i18n_1.t)('components.serviceStatus.degraded'))), (0, dom_utils_1.h)('div', { className: 'summary-item outage' }, (0, dom_utils_1.h)('span', { className: 'summary-count' }, String(outage)), (0, dom_utils_1.h)('span', { className: 'summary-label' }, (0, i18n_1.t)('components.serviceStatus.outage'))));
    }
    buildDesktopReadiness() {
        if (!(0, runtime_1.isDesktopRuntime)())
            return false;
        const checks = (0, desktop_readiness_1.getDesktopReadinessChecks)(Boolean(this.localBackend?.enabled));
        const keySummary = (0, desktop_readiness_1.getKeyBackedAvailabilitySummary)();
        const nonParity = (0, desktop_readiness_1.getNonParityFeatures)();
        return (0, dom_utils_1.h)('div', { className: 'service-status-desktop-readiness' }, (0, dom_utils_1.h)('div', { className: 'service-status-desktop-title' }, (0, i18n_1.t)('components.serviceStatus.desktopReadiness')), (0, dom_utils_1.h)('div', { className: 'service-status-desktop-subtitle' }, (0, i18n_1.t)('components.serviceStatus.acceptanceChecks', { ready: String(checks.filter(check => check.ready).length), total: String(checks.length), available: String(keySummary.available), featureTotal: String(keySummary.total) })), (0, dom_utils_1.h)('ul', { className: 'service-status-desktop-list' }, ...checks.map(check => (0, dom_utils_1.h)('li', null, `${check.ready ? '✅' : '⚠️'} ${check.label}`))), (0, dom_utils_1.h)('details', { className: 'service-status-non-parity' }, (0, dom_utils_1.h)('summary', null, (0, i18n_1.t)('components.serviceStatus.nonParityFallbacks', { count: String(nonParity.length) })), (0, dom_utils_1.h)('ul', null, ...nonParity.map(feature => (0, dom_utils_1.h)('li', null, (0, dom_utils_1.h)('strong', null, feature.panel), `: ${feature.fallback}`)))));
    }
    buildFilters() {
        const categories = ['all', 'cloud', 'dev', 'comm', 'ai', 'saas'];
        return (0, dom_utils_1.h)('div', { className: 'service-status-filters' }, ...categories.map(key => (0, dom_utils_1.h)('button', {
            className: `status-filter-btn ${this.filter === key ? 'active' : ''}`,
            dataset: { filter: key },
            onClick: () => this.setFilter(key),
        }, getCategoryLabel(key))));
    }
    buildServiceItems(services) {
        return services.map(service => (0, dom_utils_1.h)('div', { className: `service-status-item ${service.status}` }, (0, dom_utils_1.h)('span', { className: 'status-icon' }, this.getStatusIcon(service.status)), (0, dom_utils_1.h)('span', { className: 'status-name' }, service.name), (0, dom_utils_1.h)('span', { className: `status-badge ${service.status}` }, service.status.toUpperCase())));
    }
    getStatusIcon(status) {
        switch (status) {
            case 'operational': return '●';
            case 'degraded': return '◐';
            case 'outage': return '○';
            default: return '?';
        }
    }
}
exports.ServiceStatusPanel = ServiceStatusPanel;
