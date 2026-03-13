"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCommunityWidget = mountCommunityWidget;
const i18n_1 = require("@/services/i18n");
const DISMISSED_KEY = 'wm-community-dismissed';
const DISCUSSION_URL = 'https://github.com/Dexmond-Technologies/WORLD_MONITOR/discussions/94';
function mountCommunityWidget() {
    if (localStorage.getItem(DISMISSED_KEY) === 'true')
        return;
    if (document.querySelector('.community-widget'))
        return;
    const widget = document.createElement('div');
    widget.className = 'community-widget';
    widget.innerHTML = `
    <div class="cw-pill">
      <div class="cw-dot"></div>
      <span class="cw-text">${(0, i18n_1.t)('components.community.joinDiscussion')}</span>
      <a class="cw-cta" href="${DISCUSSION_URL}" target="_blank" rel="noopener">${(0, i18n_1.t)('components.community.openDiscussion')}</a>
      <button class="cw-close" aria-label="${(0, i18n_1.t)('common.close')}">&times;</button>
    </div>
    <button class="cw-dismiss">${(0, i18n_1.t)('components.community.dontShowAgain')}</button>
  `;
    const dismiss = () => {
        widget.classList.add('cw-hiding');
        setTimeout(() => widget.remove(), 300);
    };
    widget.querySelector('.cw-close').addEventListener('click', dismiss);
    widget.querySelector('.cw-dismiss').addEventListener('click', () => {
        localStorage.setItem(DISMISSED_KEY, 'true');
        dismiss();
    });
    document.body.appendChild(widget);
}
