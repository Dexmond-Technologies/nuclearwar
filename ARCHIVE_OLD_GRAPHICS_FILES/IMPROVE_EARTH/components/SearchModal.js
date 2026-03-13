"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchModal = void 0;
const sanitize_1 = require("@/utils/sanitize");
const i18n_1 = require("@/services/i18n");
const analytics_1 = require("@/services/analytics");
const commands_1 = require("@/config/commands");
const RECENT_SEARCHES_KEY = 'worldmonitor_recent_searches';
const MAX_RECENT = 8;
const MAX_RESULTS = 24;
const MAX_COMMANDS = 5;
class SearchModal {
    constructor(container, options) {
        this.overlay = null;
        this.input = null;
        this.resultsList = null;
        this.sources = [];
        this.results = [];
        this.commandResults = [];
        this.selectedIndex = 0;
        this.recentSearches = [];
        this.activePanelIds = new Set();
        this.container = container;
        this.placeholder = options?.placeholder || (0, i18n_1.t)('modals.search.placeholder');
        this.hint = options?.hint || (0, i18n_1.t)('modals.search.hint');
        this.loadRecentSearches();
    }
    registerSource(type, items) {
        const existingIndex = this.sources.findIndex(s => s.type === type);
        if (existingIndex >= 0) {
            this.sources[existingIndex] = { type, items };
        }
        else {
            this.sources.push({ type, items });
        }
    }
    setOnSelect(callback) {
        this.onSelect = callback;
    }
    setOnCommand(callback) {
        this.onCommand = callback;
    }
    setActivePanels(panelIds) {
        this.activePanelIds = new Set(panelIds);
    }
    open() {
        if (this.overlay)
            return;
        this.createModal();
        this.input?.focus();
        this.showRecentOrEmpty();
    }
    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.input = null;
            this.resultsList = null;
            this.results = [];
            this.commandResults = [];
            this.selectedIndex = 0;
        }
    }
    isOpen() {
        return this.overlay !== null;
    }
    createModal() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'search-overlay';
        this.overlay.innerHTML = `
      <div class="search-modal">
        <div class="search-header">
          <span class="search-icon">⌘</span>
          <input type="text" class="search-input" placeholder="${this.placeholder}" autofocus />
          <kbd class="search-kbd">ESC</kbd>
        </div>
        <div class="search-results"></div>
        <div class="search-footer">
          <span><kbd>↑↓</kbd> ${(0, i18n_1.t)('modals.search.navigate')}</span>
          <span><kbd>↵</kbd> ${(0, i18n_1.t)('modals.search.select')}</span>
          <span><kbd>esc</kbd> ${(0, i18n_1.t)('modals.search.close')}</span>
        </div>
      </div>
    `;
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay)
                this.close();
        });
        this.input = this.overlay.querySelector('.search-input');
        this.resultsList = this.overlay.querySelector('.search-results');
        this.input?.addEventListener('input', () => this.handleSearch());
        this.input?.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.container.appendChild(this.overlay);
    }
    matchCommands(query) {
        if (query.length < 2)
            return [];
        const matched = [];
        for (const cmd of commands_1.COMMANDS) {
            if (cmd.id.startsWith('panel:') && this.activePanelIds.size > 0) {
                const panelId = cmd.id.slice(6);
                if (!this.activePanelIds.has(panelId))
                    continue;
            }
            for (const keyword of cmd.keywords) {
                if (keyword.includes(query) || (keyword.length >= 3 && query.includes(keyword))) {
                    const isExact = keyword === query;
                    const isPrefix = keyword.startsWith(query);
                    matched.push({ command: cmd, score: isExact ? 3 : isPrefix ? 2 : 1 });
                    break;
                }
            }
        }
        return matched.sort((a, b) => b.score - a.score).slice(0, MAX_COMMANDS);
    }
    handleSearch() {
        const query = this.input?.value.trim().toLowerCase() || '';
        if (!query) {
            this.commandResults = [];
            this.showRecentOrEmpty();
            return;
        }
        this.commandResults = this.matchCommands(query);
        const byType = new Map();
        for (const source of this.sources) {
            for (const item of source.items) {
                const titleLower = item.title.toLowerCase();
                const subtitleLower = item.subtitle?.toLowerCase() || '';
                if (titleLower.includes(query) || subtitleLower.includes(query)) {
                    const isPrefix = titleLower.startsWith(query) || subtitleLower.startsWith(query);
                    const result = {
                        type: source.type,
                        id: item.id,
                        title: item.title,
                        subtitle: item.subtitle,
                        data: item.data,
                        _score: isPrefix ? 2 : 1,
                    };
                    if (!byType.has(source.type))
                        byType.set(source.type, []);
                    byType.get(source.type).push(result);
                }
            }
        }
        const priority = [
            'news', 'prediction', 'market', 'earthquake', 'outage',
            'conflict', 'hotspot', 'country',
            'base', 'pipeline', 'cable', 'datacenter', 'nuclear', 'irradiator',
            'techcompany', 'ailab', 'startup', 'techevent', 'techhq', 'accelerator'
        ];
        this.results = [];
        for (const type of priority) {
            const matches = byType.get(type) || [];
            matches.sort((a, b) => b._score - a._score);
            const limit = type === 'news' ? 6 : type === 'country' ? 4 : 3;
            this.results.push(...matches.slice(0, limit));
            if (this.results.length >= MAX_RESULTS)
                break;
        }
        this.results = this.results.slice(0, MAX_RESULTS);
        (0, analytics_1.trackSearchUsed)(query.length, this.results.length + this.commandResults.length);
        this.selectedIndex = 0;
        this.renderResults();
    }
    showRecentOrEmpty() {
        this.results = [];
        if (this.recentSearches.length > 0) {
            this.renderRecent();
        }
        else {
            this.renderEmpty();
        }
    }
    renderRecent() {
        if (!this.resultsList)
            return;
        this.resultsList.innerHTML = `<div class="search-section-header">${(0, i18n_1.t)('modals.search.recent')}</div>`;
        this.recentSearches.forEach((term, i) => {
            const item = document.createElement('div');
            item.className = `search-result-item recent${i === this.selectedIndex ? ' selected' : ''}`;
            item.dataset.recent = term;
            const icon = document.createElement('span');
            icon.className = 'search-result-icon';
            icon.textContent = '🕐';
            const title = document.createElement('span');
            title.className = 'search-result-title';
            title.textContent = term;
            item.appendChild(icon);
            item.appendChild(title);
            item.addEventListener('click', () => {
                if (this.input)
                    this.input.value = term;
                this.handleSearch();
            });
            this.resultsList.appendChild(item);
        });
    }
    renderEmpty() {
        if (!this.resultsList)
            return;
        this.resultsList.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">\u2318</div>
        <div>${(0, i18n_1.t)('modals.search.empty')}</div>
        <div class="search-empty-hint">${this.hint}</div>
        <div class="search-empty-examples">
          <span>Try: <kbd>dark mode</kbd> <kbd>iran</kbd> <kbd>military layers</kbd> <kbd>crypto</kbd></span>
        </div>
      </div>
    `;
    }
    get totalResultCount() {
        return this.commandResults.length + this.results.length;
    }
    renderResults() {
        if (!this.resultsList)
            return;
        if (this.commandResults.length === 0 && this.results.length === 0) {
            this.resultsList.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">\u2205</div>
          <div>${(0, i18n_1.t)('modals.search.noResults')}</div>
        </div>
      `;
            return;
        }
        const icons = {
            country: '\u{1F3F3}\uFE0F',
            news: '\u{1F4F0}',
            hotspot: '\u{1F4CD}',
            market: '\u{1F4C8}',
            prediction: '\u{1F3AF}',
            conflict: '\u2694\uFE0F',
            base: '\u{1F3DB}\uFE0F',
            pipeline: '\u{1F6E2}',
            cable: '\u{1F310}',
            datacenter: '\u{1F5A5}\uFE0F',
            earthquake: '\u{1F30D}',
            outage: '\u{1F4E1}',
            nuclear: '\u2622\uFE0F',
            irradiator: '\u269B\uFE0F',
            techcompany: '\u{1F3E2}',
            ailab: '\u{1F9E0}',
            startup: '\u{1F680}',
            techevent: '\u{1F4C5}',
            techhq: '\u{1F984}',
            accelerator: '\u{1F680}',
            exchange: '\u{1F3DB}\uFE0F',
            financialcenter: '\u{1F4B0}',
            centralbank: '\u{1F3E6}',
            commodityhub: '\u{1F4E6}',
        };
        let html = '';
        let globalIndex = 0;
        if (this.commandResults.length > 0) {
            html += '<div class="search-section-header">Commands</div>';
            for (const { command } of this.commandResults) {
                html += `
          <div class="search-result-item command-item ${globalIndex === this.selectedIndex ? 'selected' : ''}" data-index="${globalIndex}" data-command="${command.id}">
            <span class="search-result-icon">${command.icon}</span>
            <div class="search-result-content">
              <div class="search-result-title">${(0, sanitize_1.escapeHtml)(command.label)}</div>
            </div>
            <span class="search-result-type">${(0, sanitize_1.escapeHtml)(command.category)}</span>
          </div>`;
                globalIndex++;
            }
            if (this.results.length > 0) {
                html += '<div class="search-section-header">Results</div>';
            }
        }
        for (const result of this.results) {
            html += `
        <div class="search-result-item ${globalIndex === this.selectedIndex ? 'selected' : ''}" data-index="${globalIndex}">
          <span class="search-result-icon">${icons[result.type]}</span>
          <div class="search-result-content">
            <div class="search-result-title">${this.highlightMatch(result.title)}</div>
            ${result.subtitle ? `<div class="search-result-subtitle">${(0, sanitize_1.escapeHtml)(result.subtitle)}</div>` : ''}
          </div>
          <span class="search-result-type">${(0, sanitize_1.escapeHtml)((0, i18n_1.t)(`modals.search.types.${result.type}`) || result.type)}</span>
        </div>`;
            globalIndex++;
        }
        this.resultsList.innerHTML = html;
        this.resultsList.querySelectorAll('.search-result-item').forEach((el) => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index || '0');
                this.selectResult(index);
            });
        });
    }
    highlightMatch(text) {
        const query = this.input?.value.trim() || '';
        const escapedText = (0, sanitize_1.escapeHtml)(text);
        if (!query)
            return escapedText;
        const escapedQuery = (0, sanitize_1.escapeHtml)(query);
        const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }
    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.moveSelection(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.moveSelection(-1);
                break;
            case 'Enter':
                e.preventDefault();
                this.selectResult(this.selectedIndex);
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }
    moveSelection(delta) {
        const max = this.totalResultCount || this.recentSearches.length;
        if (max === 0)
            return;
        this.selectedIndex = (this.selectedIndex + delta + max) % max;
        this.updateSelection();
    }
    updateSelection() {
        if (!this.resultsList)
            return;
        this.resultsList.querySelectorAll('.search-result-item').forEach((el, i) => {
            el.classList.toggle('selected', i === this.selectedIndex);
        });
        const selected = this.resultsList.querySelector('.selected');
        selected?.scrollIntoView({ block: 'nearest' });
    }
    selectResult(index) {
        if (this.totalResultCount === 0 && this.recentSearches.length > 0) {
            const term = this.recentSearches[index];
            if (term && this.input) {
                this.input.value = term;
                this.handleSearch();
            }
            return;
        }
        if (index < this.commandResults.length) {
            const cmd = this.commandResults[index]?.command;
            if (cmd) {
                this.close();
                this.onCommand?.(cmd);
                return;
            }
        }
        const entityIndex = index - this.commandResults.length;
        const result = this.results[entityIndex];
        if (!result)
            return;
        this.saveRecentSearch(this.input?.value.trim() || '');
        this.close();
        this.onSelect?.(result);
    }
    loadRecentSearches() {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            this.recentSearches = stored ? JSON.parse(stored) : [];
        }
        catch {
            this.recentSearches = [];
        }
    }
    saveRecentSearch(term) {
        if (!term || term.length < 2)
            return;
        this.recentSearches = [
            term,
            ...this.recentSearches.filter(t => t !== term)
        ].slice(0, MAX_RECENT);
        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(this.recentSearches));
        }
        catch {
            // Storage full, ignore
        }
    }
}
exports.SearchModal = SearchModal;
