"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GivingPanel = void 0;
const Panel_1 = require("./Panel");
const sanitize_1 = require("@/utils/sanitize");
const giving_1 = require("@/services/giving");
const i18n_1 = require("@/services/i18n");
class GivingPanel extends Panel_1.Panel {
    constructor() {
        super({
            id: 'giving',
            title: (0, i18n_1.t)('panels.giving'),
            showCount: true,
            trackActivity: true,
            infoTooltip: (0, i18n_1.t)('components.giving.infoTooltip'),
        });
        this.data = null;
        this.activeTab = 'platforms';
        this.showLoading((0, i18n_1.t)('common.loadingGiving'));
    }
    setData(data) {
        this.data = data;
        this.setCount(data.platforms.length);
        this.renderContent();
    }
    renderContent() {
        if (!this.data)
            return;
        const d = this.data;
        const trendIcon = (0, giving_1.getTrendIcon)(d.trend);
        const trendColor = (0, giving_1.getTrendColor)(d.trend);
        const indexColor = (0, giving_1.getActivityColor)(d.activityIndex);
        // Activity Index + summary stats
        const statsHtml = `
      <div class="giving-stat-box giving-stat-index">
        <span class="giving-stat-value" style="color: ${indexColor}">${d.activityIndex}</span>
        <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.activityIndex')}</span>
      </div>
      <div class="giving-stat-box giving-stat-trend">
        <span class="giving-stat-value" style="color: ${trendColor}">${trendIcon} ${(0, sanitize_1.escapeHtml)(d.trend)}</span>
        <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.trend')}</span>
      </div>
      <div class="giving-stat-box giving-stat-daily">
        <span class="giving-stat-value">${(0, giving_1.formatCurrency)(d.estimatedDailyFlowUsd)}</span>
        <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.estDailyFlow')}</span>
      </div>
      <div class="giving-stat-box giving-stat-crypto">
        <span class="giving-stat-value">${(0, giving_1.formatCurrency)(d.crypto.dailyInflowUsd)}</span>
        <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.cryptoDaily')}</span>
      </div>
    `;
        // Tabs
        const tabs = ['platforms', 'categories', 'crypto', 'institutional'];
        const tabLabels = {
            platforms: (0, i18n_1.t)('components.giving.tabs.platforms'),
            categories: (0, i18n_1.t)('components.giving.tabs.categories'),
            crypto: (0, i18n_1.t)('components.giving.tabs.crypto'),
            institutional: (0, i18n_1.t)('components.giving.tabs.institutional'),
        };
        const tabsHtml = `
      <div class="giving-tabs">
        ${tabs.map(tab => `<button class="giving-tab ${this.activeTab === tab ? 'giving-tab-active' : ''}" data-tab="${tab}">${tabLabels[tab]}</button>`).join('')}
      </div>
    `;
        // Tab content
        let contentHtml;
        switch (this.activeTab) {
            case 'platforms':
                contentHtml = this.renderPlatforms(d.platforms);
                break;
            case 'categories':
                contentHtml = this.renderCategories(d.categories);
                break;
            case 'crypto':
                contentHtml = this.renderCrypto();
                break;
            case 'institutional':
                contentHtml = this.renderInstitutional();
                break;
        }
        // Write directly to bypass debounced setContent — tabs need immediate listeners
        this.content.innerHTML = `
      <div class="giving-panel-content">
        <div class="giving-stats-grid">${statsHtml}</div>
        ${tabsHtml}
        ${contentHtml}
      </div>
    `;
        // Attach tab click listeners
        this.content.querySelectorAll('.giving-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.renderContent();
            });
        });
    }
    renderPlatforms(platforms) {
        if (platforms.length === 0) {
            return `<div class="panel-empty">${(0, i18n_1.t)('common.noDataShort')}</div>`;
        }
        const rows = platforms.map(p => {
            const freshnessCls = p.dataFreshness === 'live' ? 'giving-fresh-live'
                : p.dataFreshness === 'daily' ? 'giving-fresh-daily'
                    : p.dataFreshness === 'weekly' ? 'giving-fresh-weekly'
                        : 'giving-fresh-annual';
            return `<tr class="giving-row">
        <td class="giving-platform-name">${(0, sanitize_1.escapeHtml)(p.platform)}</td>
        <td class="giving-platform-vol">${(0, giving_1.formatCurrency)(p.dailyVolumeUsd)}</td>
        <td class="giving-platform-vel">${p.donationVelocity > 0 ? `${p.donationVelocity.toFixed(0)}/hr` : '\u2014'}</td>
        <td class="giving-platform-fresh"><span class="giving-fresh-badge ${freshnessCls}">${(0, sanitize_1.escapeHtml)(p.dataFreshness)}</span></td>
      </tr>`;
        }).join('');
        return `
      <table class="giving-table">
        <thead>
          <tr>
            <th>${(0, i18n_1.t)('components.giving.platform')}</th>
            <th>${(0, i18n_1.t)('components.giving.dailyVol')}</th>
            <th>${(0, i18n_1.t)('components.giving.velocity')}</th>
            <th>${(0, i18n_1.t)('components.giving.freshness')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    }
    renderCategories(categories) {
        if (categories.length === 0) {
            return `<div class="panel-empty">${(0, i18n_1.t)('common.noDataShort')}</div>`;
        }
        const rows = categories.map(c => {
            const barWidth = Math.round(c.share * 100);
            const trendingBadge = c.trending ? `<span class="giving-trending-badge">${(0, i18n_1.t)('components.giving.trending')}</span>` : '';
            return `<tr class="giving-row">
        <td class="giving-cat-name">${(0, sanitize_1.escapeHtml)(c.category)} ${trendingBadge}</td>
        <td class="giving-cat-share">
          <div class="giving-share-bar">
            <div class="giving-share-fill" style="width: ${barWidth}%"></div>
          </div>
          <span class="giving-share-label">${(0, giving_1.formatPercent)(c.share)}</span>
        </td>
      </tr>`;
        }).join('');
        return `
      <table class="giving-table giving-cat-table">
        <thead>
          <tr>
            <th>${(0, i18n_1.t)('components.giving.category')}</th>
            <th>${(0, i18n_1.t)('components.giving.share')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    }
    renderCrypto() {
        if (!this.data?.crypto) {
            return `<div class="panel-empty">${(0, i18n_1.t)('common.noDataShort')}</div>`;
        }
        const c = this.data.crypto;
        return `
      <div class="giving-crypto-content">
        <div class="giving-crypto-stats">
          <div class="giving-stat-box">
            <span class="giving-stat-value">${(0, giving_1.formatCurrency)(c.dailyInflowUsd)}</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.dailyInflow')}</span>
          </div>
          <div class="giving-stat-box">
            <span class="giving-stat-value">${c.trackedWallets}</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.wallets')}</span>
          </div>
          <div class="giving-stat-box">
            <span class="giving-stat-value">${(0, giving_1.formatPercent)(c.pctOfTotal / 100)}</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.ofTotal')}</span>
          </div>
        </div>
        <div class="giving-crypto-receivers">
          <div class="giving-section-title">${(0, i18n_1.t)('components.giving.topReceivers')}</div>
          <ul class="giving-receiver-list">
            ${c.topReceivers.map(r => `<li>${(0, sanitize_1.escapeHtml)(r)}</li>`).join('')}
          </ul>
        </div>
      </div>`;
    }
    renderInstitutional() {
        if (!this.data?.institutional) {
            return `<div class="panel-empty">${(0, i18n_1.t)('common.noDataShort')}</div>`;
        }
        const inst = this.data.institutional;
        return `
      <div class="giving-inst-content">
        <div class="giving-inst-grid">
          <div class="giving-stat-box">
            <span class="giving-stat-value">$${inst.oecdOdaAnnualUsdBn.toFixed(1)}B</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.oecdOda')} (${inst.oecdDataYear})</span>
          </div>
          <div class="giving-stat-box">
            <span class="giving-stat-value">${inst.cafWorldGivingIndex}%</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.cafIndex')} (${inst.cafDataYear})</span>
          </div>
          <div class="giving-stat-box">
            <span class="giving-stat-value">${inst.candidGrantsTracked >= 1000000 ? `${(inst.candidGrantsTracked / 1000000).toFixed(0)}M` : inst.candidGrantsTracked.toLocaleString()}</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.candidGrants')}</span>
          </div>
          <div class="giving-stat-box">
            <span class="giving-stat-value">${(0, sanitize_1.escapeHtml)(inst.dataLag)}</span>
            <span class="giving-stat-label">${(0, i18n_1.t)('components.giving.dataLag')}</span>
          </div>
        </div>
      </div>`;
    }
}
exports.GivingPanel = GivingPanel;
