"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Panel = void 0;
const runtime_1 = require("../services/runtime");
const tauri_bridge_1 = require("../services/tauri-bridge");
const i18n_1 = require("../services/i18n");
const dom_utils_1 = require("../utils/dom-utils");
const analytics_1 = require("@/services/analytics");
const PANEL_SPANS_KEY = 'worldmonitor-panel-spans';
function loadPanelSpans() {
    try {
        const stored = localStorage.getItem(PANEL_SPANS_KEY);
        return stored ? JSON.parse(stored) : {};
    }
    catch {
        return {};
    }
}
function savePanelSpan(panelId, span) {
    const spans = loadPanelSpans();
    spans[panelId] = span;
    localStorage.setItem(PANEL_SPANS_KEY, JSON.stringify(spans));
}
const PANEL_COL_SPANS_KEY = 'worldmonitor-panel-col-spans';
const ROW_RESIZE_STEP_PX = 80;
const COL_RESIZE_STEP_PX = 80;
const PANELS_GRID_MIN_TRACK_PX = 280;
function loadPanelColSpans() {
    try {
        const stored = localStorage.getItem(PANEL_COL_SPANS_KEY);
        return stored ? JSON.parse(stored) : {};
    }
    catch {
        return {};
    }
}
function savePanelColSpan(panelId, span) {
    const spans = loadPanelColSpans();
    spans[panelId] = span;
    localStorage.setItem(PANEL_COL_SPANS_KEY, JSON.stringify(spans));
}
function clearPanelColSpan(panelId) {
    const spans = loadPanelColSpans();
    if (!(panelId in spans))
        return;
    delete spans[panelId];
    if (Object.keys(spans).length === 0) {
        localStorage.removeItem(PANEL_COL_SPANS_KEY);
        return;
    }
    localStorage.setItem(PANEL_COL_SPANS_KEY, JSON.stringify(spans));
}
function getDefaultColSpan(element) {
    return element.classList.contains('panel-wide') ? 2 : 1;
}
function getColSpan(element) {
    if (element.classList.contains('col-span-3'))
        return 3;
    if (element.classList.contains('col-span-2'))
        return 2;
    if (element.classList.contains('col-span-1'))
        return 1;
    return getDefaultColSpan(element);
}
function getGridColumnCount(element) {
    const grid = element.closest('.panels-grid');
    if (!grid)
        return 3;
    const style = window.getComputedStyle(grid);
    const template = style.gridTemplateColumns;
    if (!template || template === 'none')
        return 3;
    if (template.includes('repeat(')) {
        const repeatCountMatch = template.match(/repeat\(\s*(\d+)\s*,/i);
        if (repeatCountMatch) {
            const parsed = Number.parseInt(repeatCountMatch[1] ?? '0', 10);
            if (Number.isFinite(parsed) && parsed > 0)
                return parsed;
        }
        // For repeat(auto-fill/auto-fit, minmax(...)), infer count from rendered width.
        const autoRepeatMatch = template.match(/repeat\(\s*auto-(fill|fit)\s*,/i);
        if (autoRepeatMatch) {
            const gap = Number.parseFloat(style.columnGap || '0') || 0;
            const width = grid.getBoundingClientRect().width;
            if (width > 0) {
                return Math.max(1, Math.floor((width + gap) / (PANELS_GRID_MIN_TRACK_PX + gap)));
            }
        }
    }
    const columns = template.trim().split(/\s+/).filter(Boolean);
    return columns.length > 0 ? columns.length : 3;
}
function getMaxColSpan(element) {
    return Math.max(1, Math.min(3, getGridColumnCount(element)));
}
function clampColSpan(span, maxSpan) {
    return Math.max(1, Math.min(maxSpan, span));
}
function persistPanelColSpan(panelId, element) {
    const maxSpan = getMaxColSpan(element);
    const naturalSpan = clampColSpan(getDefaultColSpan(element), maxSpan);
    const currentSpan = clampColSpan(getColSpan(element), maxSpan);
    if (currentSpan === naturalSpan) {
        element.classList.remove('col-span-1', 'col-span-2', 'col-span-3');
        clearPanelColSpan(panelId);
        return;
    }
    setColSpanClass(element, currentSpan);
    savePanelColSpan(panelId, currentSpan);
}
function deltaToColSpan(startSpan, deltaX, maxSpan = 3) {
    const spanDelta = deltaX > 0
        ? Math.floor(deltaX / COL_RESIZE_STEP_PX)
        : Math.ceil(deltaX / COL_RESIZE_STEP_PX);
    return clampColSpan(startSpan + spanDelta, maxSpan);
}
function clearColSpanClass(element) {
    element.classList.remove('col-span-1', 'col-span-2', 'col-span-3');
}
function setColSpanClass(element, span) {
    clearColSpanClass(element);
    element.classList.add(`col-span-${span}`);
}
function getRowSpan(element) {
    if (element.classList.contains('span-4'))
        return 4;
    if (element.classList.contains('span-3'))
        return 3;
    if (element.classList.contains('span-2'))
        return 2;
    return 1;
}
function deltaToRowSpan(startSpan, deltaY) {
    const spanDelta = deltaY > 0
        ? Math.floor(deltaY / ROW_RESIZE_STEP_PX)
        : Math.ceil(deltaY / ROW_RESIZE_STEP_PX);
    return Math.max(1, Math.min(4, startSpan + spanDelta));
}
function setSpanClass(element, span) {
    element.classList.remove('span-1', 'span-2', 'span-3', 'span-4');
    element.classList.add(`span-${span}`);
    element.classList.add('resized');
}
class Panel {
    constructor(options) {
        this.countEl = null;
        this.statusBadgeEl = null;
        this.newBadgeEl = null;
        this.abortController = new AbortController();
        this.tooltipCloseHandler = null;
        this.resizeHandle = null;
        this.isResizing = false;
        this.startY = 0;
        this.startRowSpan = 1;
        this.onTouchMove = null;
        this.onTouchEnd = null;
        this.onTouchCancel = null;
        this.onDocMouseUp = null;
        this.onRowMouseMove = null;
        this.onRowMouseUp = null;
        this.onRowWindowBlur = null;
        this.colResizeHandle = null;
        this.isColResizing = false;
        this.startX = 0;
        this.startColSpan = 1;
        this.onColMouseMove = null;
        this.onColMouseUp = null;
        this.onColWindowBlur = null;
        this.onColTouchMove = null;
        this.onColTouchEnd = null;
        this.onColTouchCancel = null;
        this.colSpanReconcileRaf = null;
        this.contentDebounceMs = 150;
        this.pendingContentHtml = null;
        this.contentDebounceTimer = null;
        this.panelId = options.id;
        this.element = document.createElement('div');
        this.element.className = `panel ${options.className || ''}`;
        this.element.dataset.panel = options.id;
        this.header = document.createElement('div');
        this.header.className = 'panel-header';
        const headerLeft = document.createElement('div');
        headerLeft.className = 'panel-header-left';
        const title = document.createElement('span');
        title.className = 'panel-title';
        title.textContent = options.title;
        headerLeft.appendChild(title);
        if (options.infoTooltip) {
            const infoBtn = (0, dom_utils_1.h)('button', { className: 'panel-info-btn', 'aria-label': (0, i18n_1.t)('components.panel.showMethodologyInfo') }, '?');
            const tooltip = (0, dom_utils_1.h)('div', { className: 'panel-info-tooltip' });
            tooltip.appendChild((0, dom_utils_1.safeHtml)(options.infoTooltip));
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltip.classList.toggle('visible');
            });
            this.tooltipCloseHandler = () => tooltip.classList.remove('visible');
            document.addEventListener('click', this.tooltipCloseHandler);
            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'panel-info-wrapper';
            infoWrapper.appendChild(infoBtn);
            infoWrapper.appendChild(tooltip);
            headerLeft.appendChild(infoWrapper);
        }
        // Add "new" badge element (hidden by default)
        if (options.trackActivity !== false) {
            this.newBadgeEl = document.createElement('span');
            this.newBadgeEl.className = 'panel-new-badge';
            this.newBadgeEl.style.display = 'none';
            headerLeft.appendChild(this.newBadgeEl);
        }
        this.header.appendChild(headerLeft);
        this.statusBadgeEl = document.createElement('span');
        this.statusBadgeEl.className = 'panel-data-badge';
        this.statusBadgeEl.style.display = 'none';
        this.header.appendChild(this.statusBadgeEl);
        if (options.showCount) {
            this.countEl = document.createElement('span');
            this.countEl.className = 'panel-count';
            this.countEl.textContent = '0';
            this.header.appendChild(this.countEl);
        }
        this.content = document.createElement('div');
        this.content.className = 'panel-content';
        this.content.id = `${options.id}Content`;
        this.element.appendChild(this.header);
        this.element.appendChild(this.content);
        // Add resize handle
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'panel-resize-handle';
        this.resizeHandle.title = (0, i18n_1.t)('components.panel.dragToResize');
        this.element.appendChild(this.resizeHandle);
        this.setupResizeHandlers();
        // Right-edge handle for width resizing
        this.colResizeHandle = document.createElement('div');
        this.colResizeHandle.className = 'panel-col-resize-handle';
        this.colResizeHandle.title = (0, i18n_1.t)('components.panel.dragToResize');
        this.element.appendChild(this.colResizeHandle);
        this.setupColResizeHandlers();
        // Restore saved span
        const savedSpans = loadPanelSpans();
        const savedSpan = savedSpans[this.panelId];
        if (savedSpan && savedSpan > 1) {
            setSpanClass(this.element, savedSpan);
        }
        // Restore saved col-span
        this.restoreSavedColSpan();
        this.reconcileColSpanAfterAttach();
        this.showLoading();
    }
    restoreSavedColSpan() {
        const savedColSpans = loadPanelColSpans();
        const savedColSpan = savedColSpans[this.panelId];
        if (typeof savedColSpan === 'number' && Number.isInteger(savedColSpan) && savedColSpan >= 1) {
            const naturalSpan = getDefaultColSpan(this.element);
            if (savedColSpan === naturalSpan) {
                clearColSpanClass(this.element);
                clearPanelColSpan(this.panelId);
                return;
            }
            const maxSpan = getMaxColSpan(this.element);
            const clampedSavedSpan = clampColSpan(savedColSpan, maxSpan);
            setColSpanClass(this.element, clampedSavedSpan);
        }
        else if (savedColSpan !== undefined) {
            clearPanelColSpan(this.panelId);
        }
    }
    reconcileColSpanAfterAttach(attempts = 3) {
        if (this.colSpanReconcileRaf !== null) {
            cancelAnimationFrame(this.colSpanReconcileRaf);
            this.colSpanReconcileRaf = null;
        }
        const tryReconcile = (remaining) => {
            if (!this.element.isConnected || !this.element.parentElement) {
                if (remaining <= 0)
                    return;
                this.colSpanReconcileRaf = requestAnimationFrame(() => tryReconcile(remaining - 1));
                return;
            }
            this.colSpanReconcileRaf = null;
            this.restoreSavedColSpan();
        };
        tryReconcile(attempts);
    }
    addRowTouchDocumentListeners() {
        if (this.onTouchMove) {
            document.addEventListener('touchmove', this.onTouchMove, { passive: false });
        }
        if (this.onTouchEnd) {
            document.addEventListener('touchend', this.onTouchEnd);
        }
        if (this.onTouchCancel) {
            document.addEventListener('touchcancel', this.onTouchCancel);
        }
    }
    removeRowTouchDocumentListeners() {
        if (this.onTouchMove) {
            document.removeEventListener('touchmove', this.onTouchMove);
        }
        if (this.onTouchEnd) {
            document.removeEventListener('touchend', this.onTouchEnd);
        }
        if (this.onTouchCancel) {
            document.removeEventListener('touchcancel', this.onTouchCancel);
        }
    }
    setupResizeHandlers() {
        if (!this.resizeHandle)
            return;
        this.onRowMouseMove = (e) => {
            if (!this.isResizing)
                return;
            const deltaY = e.clientY - this.startY;
            setSpanClass(this.element, deltaToRowSpan(this.startRowSpan, deltaY));
        };
        this.onRowMouseUp = () => {
            if (!this.isResizing)
                return;
            this.isResizing = false;
            this.element.classList.remove('resizing');
            delete this.element.dataset.resizing;
            document.body.classList.remove('panel-resize-active');
            this.resizeHandle?.classList.remove('active');
            if (this.onRowMouseMove) {
                document.removeEventListener('mousemove', this.onRowMouseMove);
            }
            if (this.onRowMouseUp) {
                document.removeEventListener('mouseup', this.onRowMouseUp);
            }
            if (this.onRowWindowBlur) {
                window.removeEventListener('blur', this.onRowWindowBlur);
            }
            const currentSpan = getRowSpan(this.element);
            savePanelSpan(this.panelId, currentSpan);
            (0, analytics_1.trackPanelResized)(this.panelId, currentSpan);
        };
        this.onRowWindowBlur = () => this.onRowMouseUp?.();
        const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isResizing = true;
            this.startY = e.clientY;
            this.startRowSpan = getRowSpan(this.element);
            this.element.dataset.resizing = 'true';
            this.element.classList.add('resizing');
            document.body.classList.add('panel-resize-active');
            this.resizeHandle?.classList.add('active');
            if (this.onRowMouseMove) {
                document.addEventListener('mousemove', this.onRowMouseMove);
            }
            if (this.onRowMouseUp) {
                document.addEventListener('mouseup', this.onRowMouseUp);
            }
            if (this.onRowWindowBlur) {
                window.addEventListener('blur', this.onRowWindowBlur);
            }
        };
        this.resizeHandle.addEventListener('mousedown', onMouseDown);
        // Double-click to reset
        this.resizeHandle.addEventListener('dblclick', () => {
            this.resetHeight();
        });
        // Touch support
        this.resizeHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            if (!touch)
                return;
            this.isResizing = true;
            this.startY = touch.clientY;
            this.startRowSpan = getRowSpan(this.element);
            this.element.classList.add('resizing');
            this.element.dataset.resizing = 'true';
            document.body.classList.add('panel-resize-active');
            this.resizeHandle?.classList.add('active');
            this.removeRowTouchDocumentListeners();
            this.addRowTouchDocumentListeners();
        }, { passive: false });
        // Use bound handlers so they can be removed in destroy()
        this.onTouchMove = (e) => {
            if (!this.isResizing)
                return;
            const touch = e.touches[0];
            if (!touch)
                return;
            const deltaY = touch.clientY - this.startY;
            setSpanClass(this.element, deltaToRowSpan(this.startRowSpan, deltaY));
        };
        this.onTouchEnd = () => {
            if (!this.isResizing) {
                this.removeRowTouchDocumentListeners();
                return;
            }
            this.isResizing = false;
            this.element.classList.remove('resizing');
            delete this.element.dataset.resizing;
            document.body.classList.remove('panel-resize-active');
            this.resizeHandle?.classList.remove('active');
            this.removeRowTouchDocumentListeners();
            const currentSpan = getRowSpan(this.element);
            savePanelSpan(this.panelId, currentSpan);
            (0, analytics_1.trackPanelResized)(this.panelId, currentSpan);
        };
        this.onTouchCancel = this.onTouchEnd;
        this.onDocMouseUp = () => {
            if (this.element.dataset.resizing) {
                delete this.element.dataset.resizing;
            }
            if (!this.isResizing && !this.isColResizing) {
                document.body.classList.remove('panel-resize-active');
            }
        };
        document.addEventListener('mouseup', this.onDocMouseUp);
    }
    addColTouchDocumentListeners() {
        if (this.onColTouchMove) {
            document.addEventListener('touchmove', this.onColTouchMove, { passive: false });
        }
        if (this.onColTouchEnd) {
            document.addEventListener('touchend', this.onColTouchEnd);
        }
        if (this.onColTouchCancel) {
            document.addEventListener('touchcancel', this.onColTouchCancel);
        }
    }
    removeColTouchDocumentListeners() {
        if (this.onColTouchMove) {
            document.removeEventListener('touchmove', this.onColTouchMove);
        }
        if (this.onColTouchEnd) {
            document.removeEventListener('touchend', this.onColTouchEnd);
        }
        if (this.onColTouchCancel) {
            document.removeEventListener('touchcancel', this.onColTouchCancel);
        }
    }
    setupColResizeHandlers() {
        if (!this.colResizeHandle)
            return;
        this.onColMouseMove = (e) => {
            if (!this.isColResizing)
                return;
            const deltaX = e.clientX - this.startX;
            const maxSpan = getMaxColSpan(this.element);
            setColSpanClass(this.element, deltaToColSpan(this.startColSpan, deltaX, maxSpan));
        };
        this.onColMouseUp = () => {
            if (!this.isColResizing)
                return;
            this.isColResizing = false;
            this.element.classList.remove('col-resizing');
            delete this.element.dataset.resizing;
            document.body.classList.remove('panel-resize-active');
            this.colResizeHandle?.classList.remove('active');
            if (this.onColMouseMove) {
                document.removeEventListener('mousemove', this.onColMouseMove);
            }
            if (this.onColMouseUp) {
                document.removeEventListener('mouseup', this.onColMouseUp);
            }
            if (this.onColWindowBlur) {
                window.removeEventListener('blur', this.onColWindowBlur);
            }
            const finalSpan = clampColSpan(getColSpan(this.element), getMaxColSpan(this.element));
            if (finalSpan !== this.startColSpan) {
                persistPanelColSpan(this.panelId, this.element);
            }
        };
        this.onColWindowBlur = () => this.onColMouseUp?.();
        const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isColResizing = true;
            this.startX = e.clientX;
            this.startColSpan = clampColSpan(getColSpan(this.element), getMaxColSpan(this.element));
            this.element.dataset.resizing = 'true';
            this.element.classList.add('col-resizing');
            document.body.classList.add('panel-resize-active');
            this.colResizeHandle?.classList.add('active');
            if (this.onColMouseMove) {
                document.addEventListener('mousemove', this.onColMouseMove);
            }
            if (this.onColMouseUp) {
                document.addEventListener('mouseup', this.onColMouseUp);
            }
            if (this.onColWindowBlur) {
                window.addEventListener('blur', this.onColWindowBlur);
            }
        };
        this.colResizeHandle.addEventListener('mousedown', onMouseDown);
        // Double-click resets width
        this.colResizeHandle.addEventListener('dblclick', () => this.resetWidth());
        // Touch
        this.colResizeHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            if (!touch)
                return;
            this.isColResizing = true;
            this.startX = touch.clientX;
            this.startColSpan = clampColSpan(getColSpan(this.element), getMaxColSpan(this.element));
            this.element.dataset.resizing = 'true';
            this.element.classList.add('col-resizing');
            document.body.classList.add('panel-resize-active');
            this.colResizeHandle?.classList.add('active');
            this.removeColTouchDocumentListeners();
            this.addColTouchDocumentListeners();
        }, { passive: false });
        this.onColTouchMove = (e) => {
            if (!this.isColResizing)
                return;
            const touch = e.touches[0];
            if (!touch)
                return;
            const deltaX = touch.clientX - this.startX;
            const maxSpan = getMaxColSpan(this.element);
            setColSpanClass(this.element, deltaToColSpan(this.startColSpan, deltaX, maxSpan));
        };
        this.onColTouchEnd = () => {
            if (!this.isColResizing) {
                this.removeColTouchDocumentListeners();
                return;
            }
            this.isColResizing = false;
            this.element.classList.remove('col-resizing');
            delete this.element.dataset.resizing;
            document.body.classList.remove('panel-resize-active');
            this.colResizeHandle?.classList.remove('active');
            this.removeColTouchDocumentListeners();
            const finalSpan = clampColSpan(getColSpan(this.element), getMaxColSpan(this.element));
            if (finalSpan !== this.startColSpan) {
                persistPanelColSpan(this.panelId, this.element);
            }
        };
        this.onColTouchCancel = this.onColTouchEnd;
    }
    setDataBadge(state, detail) {
        if (!this.statusBadgeEl)
            return;
        const labels = {
            live: (0, i18n_1.t)('common.live'),
            cached: (0, i18n_1.t)('common.cached'),
            unavailable: (0, i18n_1.t)('common.unavailable'),
        };
        this.statusBadgeEl.textContent = detail ? `${labels[state]} · ${detail}` : labels[state];
        this.statusBadgeEl.className = `panel-data-badge ${state}`;
        this.statusBadgeEl.style.display = 'inline-flex';
    }
    clearDataBadge() {
        if (!this.statusBadgeEl)
            return;
        this.statusBadgeEl.style.display = 'none';
    }
    getElement() {
        return this.element;
    }
    showLoading(message = (0, i18n_1.t)('common.loading')) {
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'panel-loading' }, (0, dom_utils_1.h)('div', { className: 'panel-loading-radar' }, (0, dom_utils_1.h)('div', { className: 'panel-radar-sweep' }), (0, dom_utils_1.h)('div', { className: 'panel-radar-dot' })), (0, dom_utils_1.h)('div', { className: 'panel-loading-text' }, message)));
    }
    showError(message = (0, i18n_1.t)('common.failedToLoad')) {
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'error-message' }, message));
    }
    showRetrying(message = (0, i18n_1.t)('common.retrying')) {
        (0, dom_utils_1.replaceChildren)(this.content, (0, dom_utils_1.h)('div', { className: 'panel-loading' }, (0, dom_utils_1.h)('div', { className: 'panel-loading-radar' }, (0, dom_utils_1.h)('div', { className: 'panel-radar-sweep' }), (0, dom_utils_1.h)('div', { className: 'panel-radar-dot' })), (0, dom_utils_1.h)('div', { className: 'panel-loading-text retrying' }, message)));
    }
    showConfigError(message) {
        const msgEl = (0, dom_utils_1.h)('div', { className: 'config-error-message' }, message);
        if ((0, runtime_1.isDesktopRuntime)()) {
            msgEl.appendChild((0, dom_utils_1.h)('button', {
                type: 'button',
                className: 'config-error-settings-btn',
                onClick: () => void (0, tauri_bridge_1.invokeTauri)('open_settings_window_command').catch(() => { }),
            }, (0, i18n_1.t)('components.panel.openSettings')));
        }
        (0, dom_utils_1.replaceChildren)(this.content, msgEl);
    }
    setCount(count) {
        if (this.countEl) {
            this.countEl.textContent = count.toString();
        }
    }
    setErrorState(hasError, tooltip) {
        this.header.classList.toggle('panel-header-error', hasError);
        if (tooltip) {
            this.header.title = tooltip;
        }
        else {
            this.header.removeAttribute('title');
        }
    }
    setContent(html) {
        if (this.pendingContentHtml === html || this.content.innerHTML === html) {
            return;
        }
        this.pendingContentHtml = html;
        if (this.contentDebounceTimer) {
            clearTimeout(this.contentDebounceTimer);
        }
        this.contentDebounceTimer = setTimeout(() => {
            if (this.pendingContentHtml !== null) {
                this.setContentImmediate(this.pendingContentHtml);
            }
        }, this.contentDebounceMs);
    }
    setContentImmediate(html) {
        if (this.contentDebounceTimer) {
            clearTimeout(this.contentDebounceTimer);
            this.contentDebounceTimer = null;
        }
        this.pendingContentHtml = null;
        if (this.content.innerHTML !== html) {
            this.content.innerHTML = html;
        }
    }
    show() {
        this.element.classList.remove('hidden');
    }
    hide() {
        this.element.classList.add('hidden');
    }
    toggle(visible) {
        if (visible)
            this.show();
        else
            this.hide();
    }
    /**
     * Update the "new items" badge
     * @param count Number of new items (0 hides badge)
     * @param pulse Whether to pulse the badge (for important updates)
     */
    setNewBadge(count, pulse = false) {
        if (!this.newBadgeEl)
            return;
        if (count <= 0) {
            this.newBadgeEl.style.display = 'none';
            this.newBadgeEl.classList.remove('pulse');
            this.element.classList.remove('has-new');
            return;
        }
        this.newBadgeEl.textContent = count > 99 ? '99+' : `${count} ${(0, i18n_1.t)('common.new')}`;
        this.newBadgeEl.style.display = 'inline-flex';
        this.element.classList.add('has-new');
        if (pulse) {
            this.newBadgeEl.classList.add('pulse');
        }
        else {
            this.newBadgeEl.classList.remove('pulse');
        }
    }
    /**
     * Clear the new items badge
     */
    clearNewBadge() {
        this.setNewBadge(0);
    }
    /**
     * Get the panel ID
     */
    getId() {
        return this.panelId;
    }
    /**
     * Reset panel height to default
     */
    resetHeight() {
        this.element.classList.remove('resized', 'span-1', 'span-2', 'span-3', 'span-4');
        const spans = loadPanelSpans();
        delete spans[this.panelId];
        localStorage.setItem(PANEL_SPANS_KEY, JSON.stringify(spans));
    }
    resetWidth() {
        clearColSpanClass(this.element);
        clearPanelColSpan(this.panelId);
    }
    get signal() {
        return this.abortController.signal;
    }
    isAbortError(error) {
        return error instanceof DOMException && error.name === 'AbortError';
    }
    destroy() {
        this.abortController.abort();
        if (this.colSpanReconcileRaf !== null) {
            cancelAnimationFrame(this.colSpanReconcileRaf);
            this.colSpanReconcileRaf = null;
        }
        if (this.contentDebounceTimer) {
            clearTimeout(this.contentDebounceTimer);
            this.contentDebounceTimer = null;
        }
        this.pendingContentHtml = null;
        if (this.tooltipCloseHandler) {
            document.removeEventListener('click', this.tooltipCloseHandler);
            this.tooltipCloseHandler = null;
        }
        this.removeRowTouchDocumentListeners();
        if (this.onTouchMove) {
            this.onTouchMove = null;
        }
        if (this.onTouchEnd) {
            this.onTouchEnd = null;
        }
        if (this.onTouchCancel) {
            this.onTouchCancel = null;
        }
        if (this.onDocMouseUp) {
            document.removeEventListener('mouseup', this.onDocMouseUp);
            this.onDocMouseUp = null;
        }
        if (this.onRowMouseMove) {
            document.removeEventListener('mousemove', this.onRowMouseMove);
            this.onRowMouseMove = null;
        }
        if (this.onRowMouseUp) {
            document.removeEventListener('mouseup', this.onRowMouseUp);
            this.onRowMouseUp = null;
        }
        if (this.onRowWindowBlur) {
            window.removeEventListener('blur', this.onRowWindowBlur);
            this.onRowWindowBlur = null;
        }
        if (this.onColMouseMove) {
            document.removeEventListener('mousemove', this.onColMouseMove);
            this.onColMouseMove = null;
        }
        if (this.onColMouseUp) {
            document.removeEventListener('mouseup', this.onColMouseUp);
            this.onColMouseUp = null;
        }
        if (this.onColWindowBlur) {
            window.removeEventListener('blur', this.onColWindowBlur);
            this.onColWindowBlur = null;
        }
        this.removeColTouchDocumentListeners();
        if (this.onColTouchMove) {
            this.onColTouchMove = null;
        }
        if (this.onColTouchEnd) {
            this.onColTouchEnd = null;
        }
        if (this.onColTouchCancel) {
            this.onColTouchCancel = null;
        }
        this.element.classList.remove('resizing', 'col-resizing');
        delete this.element.dataset.resizing;
        document.body.classList.remove('panel-resize-active');
    }
}
exports.Panel = Panel;
