"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopulationExposurePanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const population_exposure_1 = require("@/services/population-exposure");
const i18n_1 = require("@/services/i18n");
class PopulationExposurePanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'population-exposure',
            title: (0, i18n_1.t)('panels.populationExposure'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.populationExposure.infoTooltip'),
        });
        this.exposures = [];
        this.showLoading((0, i18n_1.t)('common.calculatingExposure'));
    }
    setExposures(exposures) {
        this.exposures = exposures;
        this.setCount(exposures.length);
        this.renderContent();
    }
    renderContent() {
        if (this.exposures.length === 0) {
            this.setContent(`<div class="panel-empty">${(0, i18n_1.t)('common.noDataAvailable')}</div>`);
            return;
        }
        const totalAffected = this.exposures.reduce((sum, e) => sum + e.exposedPopulation, 0);
        const cards = this.exposures.slice(0, 30).map(e => {
            const typeIcon = this.getTypeIcon(e.eventType);
            const popClass = e.exposedPopulation >= 1000000 ? ' popexp-pop-large' : '';
            return `<div class="popexp-card">
        <div class="popexp-card-name">${typeIcon} ${(0, sanitize_1.escapeHtml)(e.eventName)}</div>
        <div class="popexp-card-meta">
          <span class="popexp-card-pop${popClass}">${(0, i18n_1.t)('components.populationExposure.affectedCount', { count: (0, population_exposure_1.formatPopulation)(e.exposedPopulation) })}</span>
          <span class="popexp-card-radius">${(0, i18n_1.t)('components.populationExposure.radiusKm', { km: String(e.exposureRadiusKm) })}</span>
        </div>
      </div>`;
        }).join('');
        this.setContent(`
      <div class="popexp-panel-content">
        <div class="popexp-summary">
          <span class="popexp-label">${(0, i18n_1.t)('components.populationExposure.totalAffected')}</span>
          <span class="popexp-total">${(0, population_exposure_1.formatPopulation)(totalAffected)}</span>
        </div>
        <div class="popexp-list">${cards}</div>
      </div>
    `);
    }
    getTypeIcon(type) {
        switch (type) {
            case 'state-based':
            case 'non-state':
            case 'one-sided':
            case 'conflict':
            case 'battle':
                return '\u2694\uFE0F';
            case 'earthquake':
                return '\uD83C\uDF0D';
            case 'flood':
                return '\uD83C\uDF0A';
            case 'fire':
            case 'wildfire':
                return '\uD83D\uDD25';
            default:
                return '\uD83D\uDCCD';
        }
    }
}
exports.PopulationExposurePanel = PopulationExposurePanel;
