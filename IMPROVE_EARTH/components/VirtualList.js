"use strict";
/**
 * VirtualList - Efficient virtual scrolling with DOM recycling.
 * Only renders visible items + a small buffer, dramatically reducing DOM nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowedList = exports.VirtualList = void 0;
class VirtualList {
    constructor(options) {
        this.itemPool = [];
        this.totalItems = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollRAF = null;
        this.isDestroyed = false;
        this.handleScroll = () => {
            if (this.scrollRAF !== null)
                return;
            this.scrollRAF = requestAnimationFrame(() => {
                this.scrollRAF = null;
                if (!this.isDestroyed) {
                    this.updateVisibleRange();
                }
            });
        };
        this.container = options.container;
        this.itemHeight = options.itemHeight;
        this.overscan = options.overscan ?? 3;
        this.renderItem = options.renderItem;
        this.onRecycle = options.onRecycle;
        // Create viewport structure
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.content = document.createElement('div');
        this.content.className = 'virtual-content';
        this.topSpacer = document.createElement('div');
        this.topSpacer.className = 'virtual-spacer virtual-spacer-top';
        this.bottomSpacer = document.createElement('div');
        this.bottomSpacer.className = 'virtual-spacer virtual-spacer-bottom';
        this.content.appendChild(this.topSpacer);
        this.content.appendChild(this.bottomSpacer);
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
        // Bind scroll handler
        this.viewport.addEventListener('scroll', this.handleScroll, { passive: true });
        // Handle resize
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                if (!this.isDestroyed) {
                    this.updateVisibleRange();
                }
            });
            resizeObserver.observe(this.viewport);
        }
    }
    /**
     * Set the total number of items
     */
    setItemCount(count) {
        this.totalItems = count;
        this.updateLayout();
        this.updateVisibleRange();
    }
    /**
     * Force re-render of all visible items
     */
    refresh() {
        // Clear all pooled elements' indices to force re-render
        for (const pooled of this.itemPool) {
            pooled.currentIndex = -1;
        }
        this.updateVisibleRange();
    }
    /**
     * Scroll to a specific item index
     */
    scrollToIndex(index, behavior = 'auto') {
        const offset = index * this.itemHeight;
        this.viewport.scrollTo({ top: offset, behavior });
    }
    /**
     * Get the viewport element (for external scroll listeners)
     */
    getViewport() {
        return this.viewport;
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.isDestroyed = true;
        if (this.scrollRAF !== null) {
            cancelAnimationFrame(this.scrollRAF);
        }
        this.viewport.removeEventListener('scroll', this.handleScroll);
        this.itemPool = [];
        this.container.innerHTML = '';
    }
    updateLayout() {
        const totalHeight = this.totalItems * this.itemHeight;
        this.content.style.height = `${totalHeight}px`;
    }
    updateVisibleRange() {
        const scrollTop = this.viewport.scrollTop;
        const viewportHeight = this.viewport.clientHeight;
        // Calculate visible range
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.ceil((scrollTop + viewportHeight) / this.itemHeight);
        // Add overscan buffer
        const visibleStart = Math.max(0, startIndex - this.overscan);
        const visibleEnd = Math.min(this.totalItems, endIndex + this.overscan);
        // Skip if range hasn't changed
        if (visibleStart === this.visibleStart && visibleEnd === this.visibleEnd) {
            return;
        }
        this.visibleStart = visibleStart;
        this.visibleEnd = visibleEnd;
        // Update spacers
        this.topSpacer.style.height = `${visibleStart * this.itemHeight}px`;
        this.bottomSpacer.style.height = `${Math.max(0, (this.totalItems - visibleEnd) * this.itemHeight)}px`;
        // Determine which items need to be rendered
        const visibleCount = visibleEnd - visibleStart;
        // Ensure we have enough pooled elements
        this.ensurePoolSize(visibleCount);
        // Track which pool elements are in use
        const usedIndices = new Set();
        // First pass: reuse elements that are still visible
        for (const pooled of this.itemPool) {
            if (pooled.currentIndex >= visibleStart && pooled.currentIndex < visibleEnd) {
                usedIndices.add(pooled.currentIndex);
            }
        }
        // Second pass: assign new indices to recycled elements
        let poolIndex = 0;
        for (let i = visibleStart; i < visibleEnd; i++) {
            if (usedIndices.has(i))
                continue;
            // Find a recyclable element
            while (poolIndex < this.itemPool.length) {
                const pooled = this.itemPool[poolIndex];
                if (pooled.currentIndex < visibleStart || pooled.currentIndex >= visibleEnd) {
                    // Recycle this element
                    if (this.onRecycle) {
                        this.onRecycle(pooled.element);
                    }
                    pooled.currentIndex = i;
                    this.renderItem(i, pooled.element);
                    pooled.element.style.transform = `translateY(${i * this.itemHeight}px)`;
                    poolIndex++;
                    break;
                }
                poolIndex++;
            }
        }
        // Update positions for all visible elements
        for (const pooled of this.itemPool) {
            if (pooled.currentIndex >= visibleStart && pooled.currentIndex < visibleEnd) {
                pooled.element.style.transform = `translateY(${pooled.currentIndex * this.itemHeight}px)`;
            }
            else {
                // Hide off-screen elements
                pooled.element.style.transform = 'translateY(-9999px)';
            }
        }
    }
    ensurePoolSize(count) {
        while (this.itemPool.length < count) {
            const element = document.createElement('div');
            element.className = 'virtual-item';
            element.style.position = 'absolute';
            element.style.top = '0';
            element.style.left = '0';
            element.style.right = '0';
            element.style.transform = 'translateY(-9999px)';
            // Insert before bottom spacer
            this.content.insertBefore(element, this.bottomSpacer);
            this.itemPool.push({
                element,
                currentIndex: -1,
            });
        }
    }
}
exports.VirtualList = VirtualList;
class WindowedList {
    constructor(options, renderItem, onRendered) {
        this.items = [];
        this.renderedChunks = new Set();
        this.chunkElements = new Map();
        this.scrollRAF = null;
        this.handleScroll = () => {
            if (this.scrollRAF !== null)
                return;
            this.scrollRAF = requestAnimationFrame(() => {
                this.scrollRAF = null;
                this.updateVisibleChunks();
            });
        };
        this.container = options.container;
        this.chunkSize = options.chunkSize ?? 10;
        this.bufferChunks = options.bufferChunks ?? 1;
        this.renderItem = renderItem;
        this.onRendered = onRendered;
        this.container.classList.add('windowed-list');
        this.container.addEventListener('scroll', this.handleScroll, { passive: true });
    }
    /**
     * Set items and render initial chunks
     */
    setItems(items) {
        this.items = items;
        this.renderedChunks.clear();
        // Clear existing chunk elements
        for (const el of this.chunkElements.values()) {
            el.remove();
        }
        this.chunkElements.clear();
        // Create container structure
        this.container.innerHTML = '';
        if (items.length === 0) {
            return;
        }
        // Calculate chunks
        const totalChunks = Math.ceil(items.length / this.chunkSize);
        // Create placeholder for each chunk
        for (let i = 0; i < totalChunks; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'windowed-chunk';
            placeholder.dataset.chunk = String(i);
            this.container.appendChild(placeholder);
            this.chunkElements.set(i, placeholder);
        }
        // Render visible chunks
        this.updateVisibleChunks();
    }
    /**
     * Force refresh of rendered chunks
     */
    refresh() {
        const visibleChunks = this.getVisibleChunks();
        for (const chunkIndex of visibleChunks) {
            this.renderChunk(chunkIndex);
        }
        this.onRendered?.();
    }
    getVisibleChunks() {
        const scrollTop = this.container.scrollTop;
        const viewportHeight = this.container.clientHeight;
        const chunks = [];
        for (const [index, element] of this.chunkElements) {
            const rect = element.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            const relativeTop = rect.top - containerRect.top + scrollTop;
            const relativeBottom = relativeTop + rect.height;
            // Check if chunk is in viewport (with buffer)
            const bufferPx = viewportHeight * this.bufferChunks;
            if (relativeBottom >= scrollTop - bufferPx &&
                relativeTop <= scrollTop + viewportHeight + bufferPx) {
                chunks.push(index);
            }
        }
        return chunks;
    }
    updateVisibleChunks() {
        const visibleChunks = this.getVisibleChunks();
        // Render chunks that aren't rendered yet
        let needsCallback = false;
        for (const chunkIndex of visibleChunks) {
            if (!this.renderedChunks.has(chunkIndex)) {
                this.renderChunk(chunkIndex);
                needsCallback = true;
            }
        }
        if (needsCallback) {
            this.onRendered?.();
        }
    }
    renderChunk(chunkIndex) {
        const element = this.chunkElements.get(chunkIndex);
        if (!element)
            return;
        const startIdx = chunkIndex * this.chunkSize;
        const endIdx = Math.min(startIdx + this.chunkSize, this.items.length);
        const chunkItems = this.items.slice(startIdx, endIdx);
        const html = chunkItems
            .map((item, i) => this.renderItem(item, startIdx + i))
            .join('');
        element.innerHTML = html;
        element.classList.add('rendered');
        this.renderedChunks.add(chunkIndex);
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.scrollRAF !== null) {
            cancelAnimationFrame(this.scrollRAF);
            this.scrollRAF = null;
        }
        this.container.removeEventListener('scroll', this.handleScroll);
        this.chunkElements.clear();
        this.renderedChunks.clear();
        this.items = [];
    }
}
exports.WindowedList = WindowedList;
