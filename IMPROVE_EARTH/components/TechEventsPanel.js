"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechEventsPanel = void 0;
const Panel_1 = require("./Panel");
const i18n_1 = require("@/services/i18n");
const sanitize_1 = require("@/utils/sanitize");
const dom_utils_1 = require("@/utils/dom-utils");
const service_client_1 = require("@/generated/client/worldmonitor/research/v1/service_client");
const researchClient = new service_client_1.ResearchServiceClient('', { fetch: (...args) => globalThis.fetch(...args) });
class TechEventsPanel extends Panel_1.Panel {
    constructor(id) {
        super({ id, title: (0, i18n_1.t)('panels.events'), showCount: true });
        this.viewMode = 'upcoming';
        this.events = [];
        this.loading = true;
        this.error = null;
        this.element.classList.add('panel-tall');
        void this.fetchEvents();
    }
    async fetchEvents() {
        this.loading = true;
        this.error = null;
        this.render();
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const data = await researchClient.listTechEvents({
                    type: '',
                    mappable: false,
                    days: 180,
                    limit: 100,
                });
                if (!data.success)
                    throw new Error(data.error || 'Unknown error');
                this.events = data.events;
                this.setCount(data.conferenceCount);
                this.error = null;
                if (this.events.length === 0 && attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }
                break;
            }
            catch (err) {
                if (this.isAbortError(err))
                    return;
                if (attempt < 2) {
                    this.showRetrying();
                    await new Promise(r => setTimeout(r, 15000));
                    continue;
                }
                this.error = err instanceof Error ? err.message : 'Failed to fetch events';
                console.error('[TechEvents] Fetch error:', err);
            }
        }
        this.loading = false;
        this.render();
    }
    render() {
        if (this.loading) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'tech-events-loading' }, (0, dom_utils_1.h)('div', { className: 'loading-spinner' }), (0, dom_utils_1.h)('span', null, (0, i18n_1.t)('components.techEvents.loading'))));
            return;
        }
        if (this.error) {
            (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'tech-events-error' }, (0, dom_utils_1.h)('span', { className: 'error-icon' }, '⚠️'), (0, dom_utils_1.h)('span', { className: 'error-text' }, this.error), (0, dom_utils_1.h)('button', { className: 'retry-btn', onClick: () => this.refresh() }, (0, i18n_1.t)('common.retry'))));
            return;
        }
        const filteredEvents = this.getFilteredEvents();
        const upcomingConferences = this.events.filter(e => e.type === 'conference' && new Date(e.startDate) >= new Date());
        const mappableCount = upcomingConferences.filter(e => e.coords && !e.coords.virtual).length;
        const tabEntries = [
            ['upcoming', (0, i18n_1.t)('components.techEvents.upcoming')],
            ['conferences', (0, i18n_1.t)('components.techEvents.conferences')],
            ['earnings', (0, i18n_1.t)('components.techEvents.earnings')],
            ['all', (0, i18n_1.t)('components.techEvents.all')],
        ];
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'tech-events-panel' }, (0, dom_utils_1.h)('div', { className: 'tech-events-tabs' }, ...tabEntries.map(([view, label]) => (0, dom_utils_1.h)('button', {
            className: `tab ${this.viewMode === view ? 'active' : ''}`,
            dataset: { view },
            onClick: () => { this.viewMode = view; this.render(); },
        }, label))), (0, dom_utils_1.h)('div', { className: 'tech-events-stats' }, (0, dom_utils_1.h)('span', { className: 'stat' }, `📅 ${(0, i18n_1.t)('components.techEvents.conferencesCount', { count: String(upcomingConferences.length) })}`), (0, dom_utils_1.h)('span', { className: 'stat' }, `📍 ${(0, i18n_1.t)('components.techEvents.onMap', { count: String(mappableCount) })}`), (0, dom_utils_1.h)('a', { href: 'https://www.techmeme.com/events', target: '_blank', rel: 'noopener', className: 'source-link' }, (0, i18n_1.t)('components.techEvents.techmemeEvents'))), (0, dom_utils_1.h)('div', { className: 'tech-events-list' }, ...(filteredEvents.length > 0
            ? filteredEvents.map(e => this.buildEvent(e))
            : [(0, dom_utils_1.h)('div', { className: 'empty-state' }, (0, i18n_1.t)('components.techEvents.noEvents'))]))));
    }
    getFilteredEvents() {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        switch (this.viewMode) {
            case 'upcoming':
                return this.events.filter(e => {
                    const start = new Date(e.startDate);
                    return start >= now && start <= thirtyDaysFromNow;
                }).slice(0, 20);
            case 'conferences':
                return this.events.filter(e => e.type === 'conference' && new Date(e.startDate) >= now).slice(0, 30);
            case 'earnings':
                return this.events.filter(e => e.type === 'earnings' && new Date(e.startDate) >= now).slice(0, 30);
            case 'all':
                return this.events.filter(e => new Date(e.startDate) >= now).slice(0, 50);
            default:
                return [];
        }
    }
    buildEvent(event) {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        const now = new Date();
        const isToday = startDate.toDateString() === now.toDateString();
        const isSoon = !isToday && startDate <= new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const isThisWeek = startDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDateStr = endDate > startDate && endDate.toDateString() !== startDate.toDateString()
            ? ` - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : '';
        const typeIcons = {
            conference: '🎤',
            earnings: '📊',
            ipo: '🔔',
            other: '📌',
        };
        const typeClasses = {
            conference: 'type-conference',
            earnings: 'type-earnings',
            ipo: 'type-ipo',
            other: 'type-other',
        };
        const className = [
            'tech-event',
            typeClasses[event.type],
            isToday ? 'is-today' : '',
            isSoon ? 'is-soon' : '',
            isThisWeek ? 'is-this-week' : '',
        ].filter(Boolean).join(' ');
        const safeEventUrl = (0, sanitize_1.sanitizeUrl)(event.url || '');
        return (0, dom_utils_1.h)('div', { className }, (0, dom_utils_1.h)('div', { className: 'event-date' }, (0, dom_utils_1.h)('span', { className: 'event-month' }, startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()), (0, dom_utils_1.h)('span', { className: 'event-day' }, String(startDate.getDate())), isToday ? (0, dom_utils_1.h)('span', { className: 'today-badge' }, (0, i18n_1.t)('components.techEvents.today')) : false, isSoon ? (0, dom_utils_1.h)('span', { className: 'soon-badge' }, (0, i18n_1.t)('components.techEvents.soon')) : false), (0, dom_utils_1.h)('div', { className: 'event-content' }, (0, dom_utils_1.h)('div', { className: 'event-header' }, (0, dom_utils_1.h)('span', { className: 'event-icon' }, typeIcons[event.type] ?? '📌'), (0, dom_utils_1.h)('span', { className: 'event-title' }, event.title), safeEventUrl
            ? (0, dom_utils_1.h)('a', { href: safeEventUrl, target: '_blank', rel: 'noopener', className: 'event-url', title: (0, i18n_1.t)('components.techEvents.moreInfo') }, '↗')
            : false), (0, dom_utils_1.h)('div', { className: 'event-meta' }, (0, dom_utils_1.h)('span', { className: 'event-dates' }, `${dateStr}${endDateStr}`), event.location
            ? (0, dom_utils_1.h)('span', { className: 'event-location' }, event.location)
            : false, event.coords && !event.coords.virtual
            ? (0, dom_utils_1.h)('button', {
                className: 'event-map-link',
                title: (0, i18n_1.t)('components.techEvents.showOnMap'),
                onClick: (e) => {
                    e.preventDefault();
                    this.panToLocation(event.coords.lat, event.coords.lng);
                },
            }, '📍')
            : false)));
    }
    panToLocation(lat, lng) {
        // Dispatch event for map to handle
        window.dispatchEvent(new CustomEvent('tech-event-location', {
            detail: { lat, lng, zoom: 10 }
        }));
    }
    refresh() {
        void this.fetchEvents();
    }
    getConferencesForMap() {
        return this.events.filter(e => e.type === 'conference' &&
            e.coords &&
            !e.coords.virtual &&
            new Date(e.startDate) >= new Date());
    }
}
exports.TechEventsPanel = TechEventsPanel;
