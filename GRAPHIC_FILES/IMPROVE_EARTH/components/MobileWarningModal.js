"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileWarningModal = void 0;
const i18n_1 = require("@/services/i18n");
const utils_1 = require("@/utils");
const STORAGE_KEY = 'mobile-warning-dismissed';
class MobileWarningModal {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'mobile-warning-overlay';
        this.element.innerHTML = `
      <div class="mobile-warning-modal">
        <div class="mobile-warning-header">
          <span class="mobile-warning-icon">📱</span>
          <span class="mobile-warning-title">${(0, i18n_1.t)('modals.mobileWarning.title')}</span>
        </div>
        <div class="mobile-warning-content">
          <p>${(0, i18n_1.t)('modals.mobileWarning.description')}</p>
          <p>${(0, i18n_1.t)('modals.mobileWarning.tip')}</p>
        </div>
        <div class="mobile-warning-footer">
          <label class="mobile-warning-remember">
            <input type="checkbox" id="mobileWarningRemember">
            <span>${(0, i18n_1.t)('modals.mobileWarning.dontShowAgain')}</span>
          </label>
          <button class="mobile-warning-btn">${(0, i18n_1.t)('modals.mobileWarning.gotIt')}</button>
        </div>
      </div>
    `;
        document.body.appendChild(this.element);
        this.setupEventListeners();
        // Remove will-change after entrance animation to free GPU memory
        const modal = this.element.querySelector('.mobile-warning-modal');
        modal?.addEventListener('animationend', () => {
            modal.style.willChange = 'auto';
        }, { once: true });
    }
    setupEventListeners() {
        this.element.querySelector('.mobile-warning-btn')?.addEventListener('click', () => {
            this.dismiss();
        });
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-warning-overlay')) {
                this.dismiss();
            }
        });
    }
    dismiss() {
        const checkbox = this.element.querySelector('#mobileWarningRemember');
        if (checkbox?.checked) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
        this.hide();
    }
    show() {
        this.element.classList.add('active');
    }
    hide() {
        this.element.classList.remove('active');
    }
    static shouldShow() {
        if (localStorage.getItem(STORAGE_KEY) === 'true')
            return false;
        return (0, utils_1.isMobileDevice)();
    }
    getElement() {
        return this.element;
    }
}
exports.MobileWarningModal = MobileWarningModal;
