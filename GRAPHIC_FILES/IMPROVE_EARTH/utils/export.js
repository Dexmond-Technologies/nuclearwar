"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPanel = void 0;
exports.exportToJSON = exportToJSON;
exports.exportToCSV = exportToCSV;
exports.exportCountryBriefJSON = exportCountryBriefJSON;
exports.exportCountryBriefCSV = exportCountryBriefCSV;
const i18n_1 = require("@/services/i18n");
function exportToJSON(data, filename = 'worldmonitor-export') {
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, `${filename}.json`, 'application/json');
}
function exportToCSV(data, filename = 'worldmonitor-export') {
    const lines = [];
    if (data.news && data.news.length > 0) {
        lines.push('=== NEWS ===');
        lines.push('Title,Source,Link,Published,IsAlert');
        data.news.forEach(item => {
            if ('primaryTitle' in item) {
                const cluster = item;
                lines.push(csvRow([
                    cluster.primaryTitle,
                    cluster.primarySource,
                    cluster.primaryLink,
                    cluster.lastUpdated.toISOString(),
                    String(cluster.isAlert),
                ]));
            }
            else {
                const news = item;
                lines.push(csvRow([
                    news.title,
                    news.source,
                    news.link,
                    news.pubDate?.toISOString() || '',
                    String(news.isAlert),
                ]));
            }
        });
        lines.push('');
    }
    if (data.markets && data.markets.length > 0) {
        lines.push('=== MARKETS ===');
        lines.push('Symbol,Name,Price,Change');
        data.markets.forEach(m => {
            lines.push(csvRow([m.symbol, m.name, String(m.price ?? ''), String(m.change ?? '')]));
        });
        lines.push('');
    }
    if (data.predictions && data.predictions.length > 0) {
        lines.push('=== PREDICTIONS ===');
        lines.push('Title,Yes Price,Volume');
        data.predictions.forEach(p => {
            lines.push(csvRow([p.title, String(p.yesPrice), String(p.volume ?? '')]));
        });
        lines.push('');
    }
    downloadFile(lines.join('\n'), `${filename}.csv`, 'text/csv');
}
function exportCountryBriefJSON(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(JSON.stringify(data, null, 2), `country-brief-${data.code}-${timestamp}.json`, 'application/json');
}
function exportCountryBriefCSV(data) {
    const lines = [];
    lines.push(`Country Brief: ${data.country} (${data.code})`);
    lines.push(`Generated: ${data.generatedAt}`);
    lines.push('');
    if (data.score != null) {
        lines.push(`Score,${data.score}`);
        lines.push(`Level,${data.level || ''}`);
        lines.push(`Trend,${data.trend || ''}`);
    }
    if (data.components) {
        lines.push('');
        lines.push('Component,Value');
        lines.push(`Unrest,${data.components.unrest}`);
        lines.push(`Conflict,${data.components.conflict}`);
        lines.push(`Security,${data.components.security}`);
        lines.push(`Information,${data.components.information}`);
    }
    if (data.signals) {
        lines.push('');
        lines.push('Signal,Count');
        for (const [k, v] of Object.entries(data.signals)) {
            lines.push(csvRow([k, String(v)]));
        }
    }
    if (data.headlines && data.headlines.length > 0) {
        lines.push('');
        lines.push('Title,Source,Link,Published');
        data.headlines.forEach(h => lines.push(csvRow([h.title, h.source, h.link, h.pubDate || ''])));
    }
    if (data.brief) {
        lines.push('');
        lines.push('Intelligence Brief');
        lines.push(`"${data.brief.replace(/"/g, '""')}"`);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(lines.join('\n'), `country-brief-${data.code}-${timestamp}.csv`, 'text/csv');
}
function csvRow(values) {
    return values.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',');
}
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
class ExportPanel {
    constructor(getDataFn) {
        this.isOpen = false;
        this.getData = getDataFn;
        this.element = document.createElement('div');
        this.element.className = 'export-panel-container';
        this.element.innerHTML = `
      <button class="export-btn" title="${(0, i18n_1.t)('common.exportData')}">⬇</button>
      <div class="export-menu hidden">
        <button class="export-option" data-format="csv">${(0, i18n_1.t)('common.exportCsv')}</button>
        <button class="export-option" data-format="json">${(0, i18n_1.t)('common.exportJson')}</button>
      </div>
    `;
        this.setupEventListeners();
    }
    setupEventListeners() {
        const btn = this.element.querySelector('.export-btn');
        const menu = this.element.querySelector('.export-menu');
        btn.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            menu.classList.toggle('hidden', !this.isOpen);
        });
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.isOpen = false;
                menu.classList.add('hidden');
            }
        });
        this.element.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', () => {
                const format = option.dataset.format;
                this.export(format);
                this.isOpen = false;
                menu.classList.add('hidden');
            });
        });
    }
    export(format) {
        const data = this.getData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `worldmonitor-${timestamp}`;
        if (format === 'json') {
            exportToJSON(data, filename);
        }
        else {
            exportToCSV(data, filename);
        }
    }
    getElement() {
        return this.element;
    }
}
exports.ExportPanel = ExportPanel;
