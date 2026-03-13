"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodThingsDigestPanel = void 0;
const Panel_1 = require("./Panel");
const summarization_1 = require("@/services/summarization");
const sanitize_1 = require("@/utils/sanitize");
/**
 * GoodThingsDigestPanel -- Displays the top 5 positive stories of the day,
 * each with an AI-generated summary of 50 words or less.
 *
 * Progressive rendering: titles render immediately as numbered cards,
 * then AI summaries fill in asynchronously via generateSummary().
 * Handles abort on re-render and graceful fallback on summarization failure.
 */
class GoodThingsDigestPanel extends Panel_1.Panel {
    constructor() {
        super({ id: 'digest', title: '5 Good Things', trackActivity: false });
        this.cardElements = [];
        this.summaryAbort = null;
        this.content.innerHTML = '<p class="digest-placeholder">Loading today\u2019s digest\u2026</p>';
    }
    /**
     * Set the stories to display. Takes the first 5 items, renders stub cards
     * with titles immediately, then summarizes each in parallel.
     */
    async setStories(items) {
        // Cancel any previous summarization batch
        if (this.summaryAbort) {
            this.summaryAbort.abort();
        }
        this.summaryAbort = new AbortController();
        const top5 = items.slice(0, 5);
        if (top5.length === 0) {
            this.content.innerHTML = '<p class="digest-placeholder">No stories available</p>';
            this.cardElements = [];
            return;
        }
        // Render stub cards immediately (titles only, no summaries yet)
        this.content.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'digest-list';
        this.cardElements = [];
        for (let i = 0; i < top5.length; i++) {
            const item = top5[i];
            const card = document.createElement('div');
            card.className = 'digest-card';
            card.innerHTML = `
        <span class="digest-card-number">${i + 1}</span>
        <div class="digest-card-body">
          <a class="digest-card-title" href="${(0, sanitize_1.sanitizeUrl)(item.link)}" target="_blank" rel="noopener">
            ${(0, sanitize_1.escapeHtml)(item.title)}
          </a>
          <span class="digest-card-source">${(0, sanitize_1.escapeHtml)(item.source)}</span>
          <p class="digest-card-summary digest-card-summary--loading">Summarizing\u2026</p>
        </div>
      `;
            list.appendChild(card);
            this.cardElements.push(card);
        }
        this.content.appendChild(list);
        // Summarize in parallel with progressive updates
        const signal = this.summaryAbort.signal;
        await Promise.allSettled(top5.map(async (item, idx) => {
            if (signal.aborted)
                return;
            try {
                // Pass [title, source] as two headlines to satisfy generateSummary's
                // minimum length requirement (headlines.length >= 2).
                const result = await (0, summarization_1.generateSummary)([item.title, item.source], undefined, item.locationName);
                if (signal.aborted)
                    return;
                const summary = result?.summary ?? item.title.slice(0, 200);
                this.updateCardSummary(idx, summary);
            }
            catch {
                if (!signal.aborted) {
                    this.updateCardSummary(idx, item.title.slice(0, 200));
                }
            }
        }));
    }
    /**
     * Update a single card's summary text and remove the loading indicator.
     */
    updateCardSummary(idx, summary) {
        const card = this.cardElements[idx];
        if (!card)
            return;
        const summaryEl = card.querySelector('.digest-card-summary');
        if (!summaryEl)
            return;
        summaryEl.textContent = summary;
        summaryEl.classList.remove('digest-card-summary--loading');
    }
    /**
     * Clean up abort controller, card references, and parent resources.
     */
    destroy() {
        if (this.summaryAbort) {
            this.summaryAbort.abort();
            this.summaryAbort = null;
        }
        this.cardElements = [];
        super.destroy();
    }
}
exports.GoodThingsDigestPanel = GoodThingsDigestPanel;
