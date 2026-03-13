"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackControl = void 0;
const storage_1 = require("@/services/storage");
const i18n_1 = require("@/services/i18n");
class PlaybackControl {
    constructor() {
        this.isPlaybackMode = false;
        this.timestamps = [];
        this.currentIndex = 0;
        this.onSnapshotChange = null;
        this.element = document.createElement('div');
        this.element.className = 'playback-control';
        this.element.innerHTML = `
      <button class="playback-toggle" title="${(0, i18n_1.t)('components.playback.toggleMode')}">
        <span class="playback-icon">⏪</span>
      </button>
      <div class="playback-panel hidden">
        <div class="playback-header">
          <span>${(0, i18n_1.t)('components.playback.historicalPlayback')}</span>
          <button class="playback-close">×</button>
        </div>
        <div class="playback-slider-container">
          <input type="range" class="playback-slider" min="0" max="100" value="100">
          <div class="playback-time">${(0, i18n_1.t)('components.playback.live')}</div>
        </div>
        <div class="playback-controls">
          <button class="playback-btn" data-action="start">⏮</button>
          <button class="playback-btn" data-action="prev">◀</button>
          <button class="playback-btn playback-live" data-action="live">${(0, i18n_1.t)('components.playback.live')}</button>
          <button class="playback-btn" data-action="next">▶</button>
          <button class="playback-btn" data-action="end">⏭</button>
        </div>
      </div>
    `;
        this.setupEventListeners();
    }
    setupEventListeners() {
        const toggle = this.element.querySelector('.playback-toggle');
        const panel = this.element.querySelector('.playback-panel');
        const closeBtn = this.element.querySelector('.playback-close');
        const slider = this.element.querySelector('.playback-slider');
        toggle.addEventListener('click', async () => {
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                await this.loadTimestamps();
            }
        });
        closeBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
            this.goLive();
        });
        slider.addEventListener('input', () => {
            const idx = parseInt(slider.value);
            this.currentIndex = idx;
            this.loadSnapshot(idx);
        });
        this.element.querySelectorAll('.playback-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    }
    async loadTimestamps() {
        this.timestamps = await (0, storage_1.getSnapshotTimestamps)();
        this.timestamps.sort((a, b) => a - b);
        const slider = this.element.querySelector('.playback-slider');
        slider.max = String(Math.max(0, this.timestamps.length - 1));
        slider.value = slider.max;
        this.currentIndex = this.timestamps.length - 1;
        this.updateTimeDisplay();
    }
    async loadSnapshot(index) {
        if (index < 0 || index >= this.timestamps.length) {
            this.goLive();
            return;
        }
        const timestamp = this.timestamps[index];
        if (!timestamp) {
            this.goLive();
            return;
        }
        this.isPlaybackMode = true;
        this.updateTimeDisplay();
        const snapshot = await (0, storage_1.getSnapshotAt)(timestamp);
        this.onSnapshotChange?.(snapshot);
        document.body.classList.add('playback-mode');
        this.element.querySelector('.playback-live')?.classList.remove('active');
    }
    goLive() {
        this.isPlaybackMode = false;
        this.currentIndex = this.timestamps.length - 1;
        const slider = this.element.querySelector('.playback-slider');
        slider.value = slider.max;
        this.updateTimeDisplay();
        this.onSnapshotChange?.(null);
        document.body.classList.remove('playback-mode');
        this.element.querySelector('.playback-live')?.classList.add('active');
    }
    handleAction(action) {
        switch (action) {
            case 'start':
                this.currentIndex = 0;
                break;
            case 'prev':
                this.currentIndex = Math.max(0, this.currentIndex - 1);
                break;
            case 'next':
                this.currentIndex = Math.min(this.timestamps.length - 1, this.currentIndex + 1);
                break;
            case 'end':
                this.currentIndex = this.timestamps.length - 1;
                break;
            case 'live':
                this.goLive();
                return;
        }
        const slider = this.element.querySelector('.playback-slider');
        slider.value = String(this.currentIndex);
        this.loadSnapshot(this.currentIndex);
    }
    updateTimeDisplay() {
        const display = this.element.querySelector('.playback-time');
        if (!this.isPlaybackMode || this.timestamps.length === 0) {
            display.textContent = (0, i18n_1.t)('components.playback.live');
            display.classList.remove('historical');
            return;
        }
        const timestamp = this.timestamps[this.currentIndex];
        if (timestamp) {
            const date = new Date(timestamp);
            display.textContent = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            display.classList.add('historical');
        }
    }
    onSnapshot(callback) {
        this.onSnapshotChange = callback;
    }
    getElement() {
        return this.element;
    }
    isInPlaybackMode() {
        return this.isPlaybackMode;
    }
}
exports.PlaybackControl = PlaybackControl;
