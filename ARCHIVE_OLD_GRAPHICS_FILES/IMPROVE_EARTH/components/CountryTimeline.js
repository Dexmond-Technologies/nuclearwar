"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryTimeline = void 0;
const d3 = __importStar(require("d3"));
const sanitize_1 = require("@/utils/sanitize");
const utils_1 = require("@/utils");
const i18n_1 = require("@/services/i18n");
const LANES = ['protest', 'conflict', 'natural', 'military'];
const LANE_COLORS = {
    protest: '#ffaa00',
    conflict: '#ff4444',
    natural: '#b478ff',
    military: '#64b4ff',
};
const SEVERITY_RADIUS = {
    low: 4,
    medium: 5,
    high: 7,
    critical: 9,
};
const MARGIN = { top: 20, right: 20, bottom: 30, left: 80 };
const HEIGHT = 200;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
class CountryTimeline {
    constructor(container) {
        this.svg = null;
        this.tooltip = null;
        this.resizeObserver = null;
        this.currentEvents = [];
        this.container = container;
        this.createTooltip();
        this.resizeObserver = new ResizeObserver(() => {
            if (this.currentEvents.length > 0)
                this.render(this.currentEvents);
        });
        this.resizeObserver.observe(this.container);
        window.addEventListener('theme-changed', () => {
            // Re-create tooltip with new theme colors
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
            this.createTooltip();
            // Re-render chart with new colors
            if (this.currentEvents.length > 0)
                this.render(this.currentEvents);
        });
    }
    createTooltip() {
        this.tooltip = document.createElement('div');
        Object.assign(this.tooltip.style, {
            position: 'absolute',
            pointerEvents: 'none',
            background: (0, utils_1.getCSSColor)('--bg'),
            border: `1px solid ${(0, utils_1.getCSSColor)('--border')}`,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            color: (0, utils_1.getCSSColor)('--text'),
            zIndex: '9999',
            display: 'none',
            whiteSpace: 'nowrap',
            boxShadow: `0 2px 8px ${(0, utils_1.getCSSColor)('--shadow-color')}`,
        });
        this.container.style.position = 'relative';
        this.container.appendChild(this.tooltip);
    }
    render(events) {
        this.currentEvents = events;
        if (this.svg)
            this.svg.remove();
        const width = this.container.clientWidth;
        if (width <= 0)
            return;
        const innerW = width - MARGIN.left - MARGIN.right;
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
        this.svg = d3
            .select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', HEIGHT)
            .attr('style', 'display:block;');
        const g = this.svg
            .append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
        const now = Date.now();
        const xScale = d3
            .scaleTime()
            .domain([new Date(now - SEVEN_DAYS_MS), new Date(now)])
            .range([0, innerW]);
        const yScale = d3
            .scaleBand()
            .domain(LANES)
            .range([0, innerH])
            .padding(0.2);
        this.drawGrid(g, xScale, innerH);
        this.drawAxes(g, xScale, yScale, innerH);
        this.drawNowMarker(g, xScale, new Date(now), innerH);
        this.drawEmptyLaneLabels(g, events, yScale, innerW);
        this.drawEvents(g, events, xScale, yScale);
    }
    drawGrid(g, xScale, innerH) {
        const ticks = xScale.ticks(6);
        g.selectAll('.grid-line')
            .data(ticks)
            .join('line')
            .attr('x1', (d) => xScale(d))
            .attr('x2', (d) => xScale(d))
            .attr('y1', 0)
            .attr('y2', innerH)
            .attr('stroke', (0, utils_1.getCSSColor)('--border-subtle'))
            .attr('stroke-width', 1);
    }
    drawAxes(g, xScale, yScale, innerH) {
        const xAxis = d3
            .axisBottom(xScale)
            .ticks(6)
            .tickFormat(d3.timeFormat('%b %d'));
        const xAxisG = g
            .append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(xAxis);
        xAxisG.selectAll('text').attr('fill', (0, utils_1.getCSSColor)('--text-dim')).attr('font-size', '10px');
        xAxisG.selectAll('line').attr('stroke', (0, utils_1.getCSSColor)('--border'));
        xAxisG.select('.domain').attr('stroke', (0, utils_1.getCSSColor)('--border'));
        const laneLabels = {
            protest: 'Protest',
            conflict: 'Conflict',
            natural: 'Natural',
            military: 'Military',
        };
        g.selectAll('.lane-label')
            .data(LANES)
            .join('text')
            .attr('x', -10)
            .attr('y', (d) => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'central')
            .attr('fill', (d) => LANE_COLORS[d])
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .text((d) => laneLabels[d] || d);
    }
    drawNowMarker(g, xScale, now, innerH) {
        const x = xScale(now);
        g.append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', 0)
            .attr('y2', innerH)
            .attr('stroke', (0, utils_1.getCSSColor)('--text'))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3')
            .attr('opacity', 0.6);
        g.append('text')
            .attr('x', x)
            .attr('y', -6)
            .attr('text-anchor', 'middle')
            .attr('fill', (0, utils_1.getCSSColor)('--text-muted'))
            .attr('font-size', '9px')
            .text((0, i18n_1.t)('components.countryTimeline.now'));
    }
    drawEmptyLaneLabels(g, events, yScale, innerW) {
        const populatedLanes = new Set(events.map((e) => e.lane));
        const emptyLanes = LANES.filter((l) => !populatedLanes.has(l));
        g.selectAll('.empty-label')
            .data(emptyLanes)
            .join('text')
            .attr('x', innerW / 2)
            .attr('y', (d) => (yScale(d) ?? 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', (0, utils_1.getCSSColor)('--text-ghost'))
            .attr('font-size', '10px')
            .attr('font-style', 'italic')
            .text((0, i18n_1.t)('components.countryTimeline.noEventsIn7Days'));
    }
    drawEvents(g, events, xScale, yScale) {
        const tooltip = this.tooltip;
        const container = this.container;
        const fmt = d3.timeFormat('%b %d, %H:%M');
        g.selectAll('.event-circle')
            .data(events)
            .join('circle')
            .attr('cx', (d) => xScale(new Date(d.timestamp)))
            .attr('cy', (d) => (yScale(d.lane) ?? 0) + yScale.bandwidth() / 2)
            .attr('r', (d) => SEVERITY_RADIUS[d.severity ?? 'medium'] ?? 5)
            .attr('fill', (d) => LANE_COLORS[d.lane])
            .attr('opacity', 0.85)
            .attr('cursor', 'pointer')
            .attr('stroke', (0, utils_1.getCSSColor)('--shadow-color'))
            .attr('stroke-width', 0.5)
            .on('mouseenter', function (event, d) {
            d3.select(this).attr('opacity', 1).attr('stroke', (0, utils_1.getCSSColor)('--text')).attr('stroke-width', 1.5);
            const dateStr = fmt(new Date(d.timestamp));
            tooltip.innerHTML = `<strong>${(0, sanitize_1.escapeHtml)(d.label)}</strong><br/>${(0, sanitize_1.escapeHtml)(dateStr)}`;
            tooltip.style.display = 'block';
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left + 12;
            const y = event.clientY - rect.top - 10;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        })
            .on('mousemove', function (event) {
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left + 12;
            const y = event.clientY - rect.top - 10;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        })
            .on('mouseleave', function () {
            d3.select(this).attr('opacity', 0.85).attr('stroke', (0, utils_1.getCSSColor)('--shadow-color')).attr('stroke-width', 0.5);
            tooltip.style.display = 'none';
        });
    }
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.svg) {
            this.svg.remove();
            this.svg = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
        this.currentEvents = [];
    }
}
exports.CountryTimeline = CountryTimeline;
