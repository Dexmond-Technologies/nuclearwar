"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulationPanel = void 0;
const Panel_1 = require("./Panel");
const config_1 = require("@/config");
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
class RegulationPanel extends Panel_1.Panel {
    constructor(id) {
        super({ id, title: (0, i18n_1.t)('panels.regulation') });
        this.viewMode = 'timeline';
        this.render();
    }
    render() {
        this.content.innerHTML = `
      <div class="regulation-panel">
        <div class="regulation-header">
          <h3>${(0, i18n_1.t)('components.regulation.dashboard')}</h3>
          <div class="regulation-tabs">
            <button class="tab ${this.viewMode === 'timeline' ? 'active' : ''}" data-view="timeline">${(0, i18n_1.t)('components.regulation.timeline')}</button>
            <button class="tab ${this.viewMode === 'deadlines' ? 'active' : ''}" data-view="deadlines">${(0, i18n_1.t)('components.regulation.deadlines')}</button>
            <button class="tab ${this.viewMode === 'regulations' ? 'active' : ''}" data-view="regulations">${(0, i18n_1.t)('components.regulation.regulations')}</button>
            <button class="tab ${this.viewMode === 'countries' ? 'active' : ''}" data-view="countries">${(0, i18n_1.t)('components.regulation.countries')}</button>
          </div>
        </div>
        <div class="regulation-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
        // Add event listeners for tabs
        this.content.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target;
                const view = target.dataset.view;
                if (view) {
                    this.viewMode = view;
                    this.render();
                }
            });
        });
    }
    renderContent() {
        switch (this.viewMode) {
            case 'timeline':
                return this.renderTimeline();
            case 'deadlines':
                return this.renderDeadlines();
            case 'regulations':
                return this.renderRegulations();
            case 'countries':
                return this.renderCountries();
            default:
                return '';
        }
    }
    renderTimeline() {
        const recentActions = (0, config_1.getRecentActions)(12); // Last 12 months
        if (recentActions.length === 0) {
            return `<div class="empty-state">${(0, i18n_1.t)('components.regulation.emptyActions')}</div>`;
        }
        return `
      <div class="timeline-view">
        <div class="timeline-header">
          <h4>${(0, i18n_1.t)('components.regulation.recentActions')}</h4>
          <span class="count">${(0, i18n_1.t)('components.regulation.actionsCount', { count: String(recentActions.length) })}</span>
        </div>
        <div class="timeline-list">
          ${recentActions.map(action => this.renderTimelineItem(action)).join('')}
        </div>
      </div>
    `;
    }
    renderTimelineItem(action) {
        const date = new Date(action.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const typeIcons = {
            'law-passed': '📜',
            'executive-order': '🏛️',
            'guideline': '📋',
            'enforcement': '⚖️',
            'consultation': '💬',
        };
        const impactColors = {
            high: (0, utils_1.getCSSColor)('--semantic-critical'),
            medium: (0, utils_1.getCSSColor)('--semantic-elevated'),
            low: (0, utils_1.getCSSColor)('--semantic-normal'),
        };
        return `
      <div class="timeline-item impact-${action.impact}">
        <div class="timeline-marker">
          <span class="timeline-icon">${typeIcons[action.type]}</span>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-header-row">
            <span class="timeline-date">${formattedDate}</span>
            <span class="timeline-country">${(0, sanitize_1.escapeHtml)(action.country)}</span>
            <span class="timeline-impact" style="color: ${impactColors[action.impact]}">${action.impact.toUpperCase()}</span>
          </div>
          <h5>${(0, sanitize_1.escapeHtml)(action.title)}</h5>
          <p>${(0, sanitize_1.escapeHtml)(action.description)}</p>
          ${action.source ? `<span class="timeline-source">${(0, i18n_1.t)('components.regulation.source')}: ${(0, sanitize_1.escapeHtml)(action.source)}</span>` : ''}
        </div>
      </div>
    `;
    }
    renderDeadlines() {
        const upcomingDeadlines = (0, config_1.getUpcomingDeadlines)();
        if (upcomingDeadlines.length === 0) {
            return `<div class="empty-state">${(0, i18n_1.t)('components.regulation.emptyDeadlines')}</div>`;
        }
        return `
      <div class="deadlines-view">
        <div class="deadlines-header">
          <h4>${(0, i18n_1.t)('components.regulation.upcomingDeadlines')}</h4>
          <span class="count">${(0, i18n_1.t)('components.regulation.deadlinesCount', { count: String(upcomingDeadlines.length) })}</span>
        </div>
        <div class="deadlines-list">
          ${upcomingDeadlines.map(reg => this.renderDeadlineItem(reg)).join('')}
        </div>
      </div>
    `;
    }
    renderDeadlineItem(regulation) {
        const deadline = new Date(regulation.complianceDeadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const formattedDate = deadline.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const urgencyClass = daysUntil < 90 ? 'urgent' : daysUntil < 180 ? 'warning' : 'normal';
        return `
      <div class="deadline-item ${urgencyClass}">
        <div class="deadline-countdown">
          <div class="days-until">${daysUntil}</div>
          <div class="days-label">${(0, i18n_1.t)('components.regulation.days')}</div>
        </div>
        <div class="deadline-content">
          <h5>${(0, sanitize_1.escapeHtml)(regulation.shortName)}</h5>
          <p class="deadline-name">${(0, sanitize_1.escapeHtml)(regulation.name)}</p>
          <div class="deadline-meta">
            <span class="deadline-date">📅 ${formattedDate}</span>
            <span class="deadline-country">🌍 ${(0, sanitize_1.escapeHtml)(regulation.country)}</span>
          </div>
          ${regulation.penalties ? `<p class="deadline-penalties">⚠️ Penalties: ${(0, sanitize_1.escapeHtml)(regulation.penalties)}</p>` : ''}
          <div class="deadline-scope">
            ${regulation.scope.map(s => `<span class="scope-tag">${(0, sanitize_1.escapeHtml)(s)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    }
    renderRegulations() {
        const activeRegulations = config_1.AI_REGULATIONS.filter(r => r.status === 'active');
        const proposedRegulations = config_1.AI_REGULATIONS.filter(r => r.status === 'proposed');
        return `
      <div class="regulations-view">
        <div class="regulations-section">
          <h4>${(0, i18n_1.t)('components.regulation.activeCount', { count: String(activeRegulations.length) })}</h4>
          <div class="regulations-list">
            ${activeRegulations.map(reg => this.renderRegulationCard(reg)).join('')}
          </div>
        </div>
        <div class="regulations-section">
          <h4>${(0, i18n_1.t)('components.regulation.proposedCount', { count: String(proposedRegulations.length) })}</h4>
          <div class="regulations-list">
            ${proposedRegulations.map(reg => this.renderRegulationCard(reg)).join('')}
          </div>
        </div>
      </div>
    `;
    }
    renderRegulationCard(regulation) {
        const typeColors = {
            comprehensive: (0, utils_1.getCSSColor)('--semantic-low'),
            sectoral: (0, utils_1.getCSSColor)('--semantic-high'),
            voluntary: (0, utils_1.getCSSColor)('--semantic-normal'),
            proposed: (0, utils_1.getCSSColor)('--semantic-elevated'),
        };
        const effectiveDate = regulation.effectiveDate
            ? new Date(regulation.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
            : 'TBD';
        const regulationLink = regulation.link ? (0, sanitize_1.sanitizeUrl)(regulation.link) : '';
        return `
      <div class="regulation-card">
        <div class="regulation-card-header">
          <h5>${(0, sanitize_1.escapeHtml)(regulation.shortName)}</h5>
          <span class="regulation-type" style="background-color: ${typeColors[regulation.type]}">${regulation.type}</span>
        </div>
        <p class="regulation-full-name">${(0, sanitize_1.escapeHtml)(regulation.name)}</p>
        <div class="regulation-meta">
          <span>🌍 ${(0, sanitize_1.escapeHtml)(regulation.country)}</span>
          <span>📅 ${effectiveDate}</span>
          <span class="status-badge status-${regulation.status}">${regulation.status}</span>
        </div>
        ${regulation.description ? `<p class="regulation-description">${(0, sanitize_1.escapeHtml)(regulation.description)}</p>` : ''}
        <div class="regulation-provisions">
          <strong>${(0, i18n_1.t)('components.regulation.keyProvisions')}:</strong>
          <ul>
            ${regulation.keyProvisions.slice(0, 3).map(p => `<li>${(0, sanitize_1.escapeHtml)(p)}</li>`).join('')}
            ${regulation.keyProvisions.length > 3 ? `<li class="more-provisions">${(0, i18n_1.t)('components.regulation.moreProvisions', { count: String(regulation.keyProvisions.length - 3) })}</li>` : ''}
          </ul>
        </div>
        <div class="regulation-scope">
          ${regulation.scope.map(s => `<span class="scope-tag">${(0, sanitize_1.escapeHtml)(s)}</span>`).join('')}
        </div>
        ${regulationLink ? `<a href="${regulationLink}" target="_blank" rel="noopener noreferrer" class="regulation-link">${(0, i18n_1.t)('components.regulation.learnMore')} →</a>` : ''}
      </div>
    `;
    }
    renderCountries() {
        const profiles = config_1.COUNTRY_REGULATION_PROFILES.sort((a, b) => {
            const stanceOrder = {
                strict: 0,
                moderate: 1,
                permissive: 2,
                undefined: 3,
            };
            return stanceOrder[a.stance] - stanceOrder[b.stance];
        });
        return `
      <div class="countries-view">
        <div class="countries-header">
          <h4>${(0, i18n_1.t)('components.regulation.globalLandscape')}</h4>
          <div class="stance-legend">
            <span class="legend-item"><span class="color-box strict"></span> ${(0, i18n_1.t)('components.regulation.stances.strict')}</span>
            <span class="legend-item"><span class="color-box moderate"></span> ${(0, i18n_1.t)('components.regulation.stances.moderate')}</span>
            <span class="legend-item"><span class="color-box permissive"></span> ${(0, i18n_1.t)('components.regulation.stances.permissive')}</span>
            <span class="legend-item"><span class="color-box undefined"></span> ${(0, i18n_1.t)('components.regulation.stances.undefined')}</span>
          </div>
        </div>
        <div class="countries-list">
          ${profiles.map(profile => this.renderCountryCard(profile)).join('')}
        </div>
      </div>
    `;
    }
    renderCountryCard(profile) {
        const stanceColors = {
            strict: (0, utils_1.getCSSColor)('--semantic-critical'),
            moderate: (0, utils_1.getCSSColor)('--semantic-elevated'),
            permissive: (0, utils_1.getCSSColor)('--semantic-normal'),
            undefined: (0, utils_1.getCSSColor)('--text-muted'),
        };
        const activeCount = profile.activeRegulations.length;
        const proposedCount = profile.proposedRegulations.length;
        return `
      <div class="country-card stance-${profile.stance}">
        <div class="country-card-header" style="border-left: 4px solid ${stanceColors[profile.stance]}">
          <h5>${(0, sanitize_1.escapeHtml)(profile.country)}</h5>
          <span class="stance-badge" style="background-color: ${stanceColors[profile.stance]}">${profile.stance.toUpperCase()}</span>
        </div>
        <p class="country-summary">${(0, sanitize_1.escapeHtml)(profile.summary)}</p>
        <div class="country-stats">
          <div class="stat">
            <span class="stat-value">${activeCount}</span>
            <span class="stat-label">${(0, i18n_1.t)('components.regulation.active')}</span>
          </div>
          <div class="stat">
            <span class="stat-value">${proposedCount}</span>
            <span class="stat-label">${(0, i18n_1.t)('components.regulation.proposed')}</span>
          </div>
          <div class="stat">
            <span class="stat-value">${new Date(profile.lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            <span class="stat-label">${(0, i18n_1.t)('components.regulation.updated')}</span>
          </div>
        </div>
      </div>
    `;
    }
    updateData() {
        this.render();
    }
    setView(view) {
        this.viewMode = view;
        this.render();
    }
}
exports.RegulationPanel = RegulationPanel;
