"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeShowDownloadBanner = maybeShowDownloadBanner;
const runtime_1 = require("@/services/runtime");
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const analytics_1 = require("@/services/analytics");
const STORAGE_KEY = 'wm-download-banner-dismissed';
const SHOW_DELAY_MS = 12000;
let bannerScheduled = false;
function maybeShowDownloadBanner() {
    if (bannerScheduled)
        return;
    if ((0, runtime_1.isDesktopRuntime)())
        return;
    if ((0, utils_1.isMobileDevice)())
        return;
    if (localStorage.getItem(STORAGE_KEY))
        return;
    bannerScheduled = true;
    setTimeout(() => {
        if (localStorage.getItem(STORAGE_KEY))
            return;
        const panel = buildPanel();
        document.body.appendChild(panel);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => panel.classList.add('wm-dl-show'));
        });
    }, SHOW_DELAY_MS);
}
function dismiss(panel, fromDownload = false) {
    if (!fromDownload)
        (0, analytics_1.trackDownloadBannerDismissed)();
    localStorage.setItem(STORAGE_KEY, '1');
    panel.classList.remove('wm-dl-show');
    panel.addEventListener('transitionend', () => panel.remove(), { once: true });
}
function detectPlatform() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua))
        return 'windows';
    if (/Linux/i.test(ua) && !/Android/i.test(ua))
        return 'linux';
    if (/Mac/i.test(ua)) {
        // WebGL renderer can reveal Apple Silicon vs Intel GPU
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl');
            if (gl) {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) {
                    const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
                    if (/Apple M/i.test(renderer))
                        return 'macos-arm64';
                    if (/Intel/i.test(renderer))
                        return 'macos-x64';
                }
            }
        }
        catch { /* ignore */ }
        // Can't determine architecture — show both Mac options
        return 'macos';
    }
    return 'unknown';
}
function allButtons() {
    return [
        { cls: 'mac', href: '/api/download?platform=macos-arm64', label: `\uF8FF ${(0, i18n_1.t)('modals.downloadBanner.macSilicon')}` },
        { cls: 'mac', href: '/api/download?platform=macos-x64', label: `\uF8FF ${(0, i18n_1.t)('modals.downloadBanner.macIntel')}` },
        { cls: 'win', href: '/api/download?platform=windows-exe', label: `\u229E ${(0, i18n_1.t)('modals.downloadBanner.windows')}` },
        { cls: 'linux', href: '/api/download?platform=linux-appimage', label: `\u{1F427} ${(0, i18n_1.t)('modals.downloadBanner.linux')} (x64)` },
        { cls: 'linux', href: '/api/download?platform=linux-appimage-arm64', label: `\u{1F427} ${(0, i18n_1.t)('modals.downloadBanner.linux')} (ARM64)` },
    ];
}
function buttonsForPlatform(p) {
    const buttons = allButtons();
    switch (p) {
        case 'macos-arm64': return buttons.filter(b => b.href.includes('macos-arm64'));
        case 'macos-x64': return buttons.filter(b => b.href.includes('macos-x64'));
        case 'macos': return buttons.filter(b => b.cls === 'mac');
        case 'windows': return buttons.filter(b => b.cls === 'win');
        case 'linux': return buttons.filter(b => b.cls === 'linux');
        case 'linux-x64': return buttons.filter(b => b.href.includes('linux-appimage') && !b.href.includes('arm64'));
        case 'linux-arm64': return buttons.filter(b => b.href.includes('linux-appimage-arm64'));
        default: return buttons;
    }
}
function renderButtons(container, buttons, panel) {
    container.innerHTML = buttons
        .map(b => `<a class="wm-dl-btn ${b.cls}" href="${b.href}">${b.label}</a>`)
        .join('');
    container.querySelectorAll('.wm-dl-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = new URL(btn.href, location.origin).searchParams.get('platform') || 'unknown';
            (0, analytics_1.trackDownloadClicked)(platform);
            dismiss(panel, true);
        });
    });
}
function buildPanel() {
    const platform = detectPlatform();
    const primaryButtons = buttonsForPlatform(platform);
    const buttons = allButtons();
    const showToggle = platform !== 'unknown' && primaryButtons.length < buttons.length;
    const el = document.createElement('div');
    el.className = 'wm-dl-panel';
    el.innerHTML = `
    <div class="wm-dl-head">
      <div class="wm-dl-title">\u{1F5A5} ${(0, i18n_1.t)('modals.downloadBanner.title')}</div>
      <button class="wm-dl-close" aria-label="${(0, i18n_1.t)('modals.downloadBanner.dismiss')}">\u00D7</button>
    </div>
    <div class="wm-dl-body">${(0, i18n_1.t)('modals.downloadBanner.description')}</div>
    <div class="wm-dl-btns"></div>
    ${showToggle ? `<button class="wm-dl-toggle">${(0, i18n_1.t)('modals.downloadBanner.showAllPlatforms')}</button>` : ''}
  `;
    const btnsContainer = el.querySelector('.wm-dl-btns');
    renderButtons(btnsContainer, primaryButtons, el);
    el.querySelector('.wm-dl-close').addEventListener('click', () => dismiss(el, false));
    const toggle = el.querySelector('.wm-dl-toggle');
    if (toggle) {
        let showingAll = false;
        toggle.addEventListener('click', () => {
            showingAll = !showingAll;
            renderButtons(btnsContainer, showingAll ? buttons : primaryButtons, el);
            toggle.textContent = showingAll
                ? (0, i18n_1.t)('modals.downloadBanner.showLess')
                : (0, i18n_1.t)('modals.downloadBanner.showAllPlatforms');
        });
    }
    return el;
}
