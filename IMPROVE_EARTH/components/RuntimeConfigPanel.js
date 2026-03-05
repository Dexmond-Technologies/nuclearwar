"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeConfigPanel = void 0;
const Panel_1 = require("./Panel");
const runtime_config_1 = require("@/services/runtime-config");
const tauri_bridge_1 = require("@/services/tauri-bridge");
const sanitize_1 = require("@/utils/sanitize");
const runtime_1 = require("@/services/runtime");
const i18n_1 = require("@/services/i18n");
const analytics_1 = require("@/services/analytics");
const settings_constants_1 = require("@/services/settings-constants");
class RuntimeConfigPanel extends Panel_1.Panel {
    constructor(options = {}) {
        super({ id: 'runtime-config', title: (0, i18n_1.t)('modals.runtimeConfig.title'), showCount: false });
        this.unsubscribe = null;
        this.pendingSecrets = new Map();
        this.validatedKeys = new Map();
        this.validationMessages = new Map();
        this.mode = options.mode ?? ((0, runtime_1.isDesktopRuntime)() ? 'alert' : 'full');
        this.buffered = options.buffered ?? false;
        this.featureFilter = options.featureFilter;
        this.unsubscribe = (0, runtime_config_1.subscribeRuntimeConfig)(() => this.render());
        this.render();
    }
    async commitPendingSecrets() {
        for (const [key, value] of this.pendingSecrets) {
            await (0, runtime_config_1.setSecretValue)(key, value);
        }
        this.pendingSecrets.clear();
        this.validatedKeys.clear();
        this.validationMessages.clear();
    }
    async commitVerifiedSecrets() {
        for (const [key, value] of this.pendingSecrets) {
            if (this.validatedKeys.get(key) !== false) {
                await (0, runtime_config_1.setSecretValue)(key, value);
                this.pendingSecrets.delete(key);
                this.validatedKeys.delete(key);
                this.validationMessages.delete(key);
            }
        }
    }
    hasPendingChanges() {
        return this.pendingSecrets.size > 0;
    }
    getFilteredFeatures() {
        return this.featureFilter
            ? runtime_config_1.RUNTIME_FEATURES.filter(f => this.featureFilter.includes(f.id))
            : runtime_config_1.RUNTIME_FEATURES;
    }
    /** Returns missing required secrets for enabled features that have at least one pending key. */
    getMissingRequiredSecrets() {
        const missing = [];
        for (const feature of this.getFilteredFeatures()) {
            if (!(0, runtime_config_1.isFeatureEnabled)(feature.id))
                continue;
            const secrets = (0, runtime_config_1.getEffectiveSecrets)(feature);
            const hasPending = secrets.some(k => this.pendingSecrets.has(k));
            if (!hasPending)
                continue;
            for (const key of secrets) {
                if (!(0, runtime_config_1.getSecretState)(key).valid && !this.pendingSecrets.has(key)) {
                    missing.push(key);
                }
            }
        }
        return missing;
    }
    getValidationErrors() {
        const errors = [];
        for (const [key, value] of this.pendingSecrets) {
            const result = (0, runtime_config_1.validateSecret)(key, value);
            if (!result.valid)
                errors.push(`${key}: ${result.hint || 'Invalid format'}`);
        }
        return errors;
    }
    async verifyPendingSecrets() {
        this.captureUnsavedInputs();
        const errors = [];
        const context = Object.fromEntries(this.pendingSecrets.entries());
        // Split into local-only failures vs keys needing remote verification
        const toVerifyRemotely = [];
        for (const [key, value] of this.pendingSecrets) {
            const localResult = (0, runtime_config_1.validateSecret)(key, value);
            if (!localResult.valid) {
                this.validatedKeys.set(key, false);
                this.validationMessages.set(key, localResult.hint || 'Invalid format');
                errors.push(`${key}: ${localResult.hint || 'Invalid format'}`);
            }
            else {
                toVerifyRemotely.push([key, value]);
            }
        }
        // Run all remote verifications in parallel with a 15s global timeout
        if (toVerifyRemotely.length > 0) {
            const results = await Promise.race([
                Promise.all(toVerifyRemotely.map(async ([key, value]) => {
                    const result = await (0, runtime_config_1.verifySecretWithApi)(key, value, context);
                    return { key, result };
                })),
                new Promise(resolve => setTimeout(() => resolve(toVerifyRemotely.map(([key]) => ({
                    key, result: { valid: true, message: 'Saved (verification timed out)' },
                }))), 15000)),
            ]);
            for (const { key, result: verifyResult } of results) {
                this.validatedKeys.set(key, verifyResult.valid);
                if (!verifyResult.valid) {
                    this.validationMessages.set(key, verifyResult.message || 'Verification failed');
                    errors.push(`${key}: ${verifyResult.message || 'Verification failed'}`);
                }
                else {
                    this.validationMessages.delete(key);
                }
            }
        }
        if (this.pendingSecrets.size > 0) {
            this.render();
        }
        return errors;
    }
    destroy() {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }
    captureUnsavedInputs() {
        if (!this.buffered)
            return;
        this.content.querySelectorAll('input[data-secret]').forEach((input) => {
            const key = input.dataset.secret;
            if (!key)
                return;
            const raw = input.value.trim();
            if (!raw || raw === settings_constants_1.MASKED_SENTINEL)
                return;
            // Skip plaintext keys whose value hasn't changed from stored value
            if (settings_constants_1.PLAINTEXT_KEYS.has(key) && !this.pendingSecrets.has(key)) {
                const stored = (0, runtime_config_1.getRuntimeConfigSnapshot)().secrets[key]?.value || '';
                if (raw === stored)
                    return;
            }
            this.pendingSecrets.set(key, raw);
            const result = (0, runtime_config_1.validateSecret)(key, raw);
            if (!result.valid) {
                this.validatedKeys.set(key, false);
                this.validationMessages.set(key, result.hint || 'Invalid format');
            }
        });
        // Capture model from select or manual input
        const modelSelect = this.content.querySelector('select[data-model-select]');
        const modelManual = this.content.querySelector('input[data-model-manual]');
        const modelValue = (modelManual && !modelManual.classList.contains('hidden-input') ? modelManual.value.trim() : modelSelect?.value) || '';
        if (modelValue && !this.pendingSecrets.has('OLLAMA_MODEL')) {
            this.pendingSecrets.set('OLLAMA_MODEL', modelValue);
            this.validatedKeys.set('OLLAMA_MODEL', true);
        }
    }
    render() {
        this.captureUnsavedInputs();
        const snapshot = (0, runtime_config_1.getRuntimeConfigSnapshot)();
        const desktop = (0, runtime_1.isDesktopRuntime)();
        const features = this.getFilteredFeatures();
        if (desktop && this.mode === 'alert') {
            const totalFeatures = runtime_config_1.RUNTIME_FEATURES.length;
            const availableFeatures = runtime_config_1.RUNTIME_FEATURES.filter((feature) => (0, runtime_config_1.isFeatureAvailable)(feature.id)).length;
            const missingFeatures = Math.max(0, totalFeatures - availableFeatures);
            const configuredCount = Object.keys(snapshot.secrets).length;
            if (missingFeatures === 0 && configuredCount >= totalFeatures) {
                this.hide();
                return;
            }
            const alertTitle = configuredCount > 0
                ? (missingFeatures > 0 ? (0, i18n_1.t)('modals.runtimeConfig.alertTitle.some') : (0, i18n_1.t)('modals.runtimeConfig.alertTitle.configured'))
                : (0, i18n_1.t)('modals.runtimeConfig.alertTitle.needsKeys');
            const alertClass = missingFeatures > 0 ? 'warn' : 'ok';
            this.show();
            this.content.innerHTML = `
        <section class="runtime-alert runtime-alert-${alertClass}">
          <h3>${alertTitle}</h3>
          <p>
            ${availableFeatures}/${totalFeatures} ${(0, i18n_1.t)('modals.runtimeConfig.summary.available')}${configuredCount > 0 ? ` · ${configuredCount} ${(0, i18n_1.t)('modals.runtimeConfig.summary.secrets')}` : ''}.
          </p>
          <p class="runtime-alert-skip">${(0, i18n_1.t)('modals.runtimeConfig.skipSetup')}</p>
          <button type="button" class="runtime-open-settings-btn" data-open-settings>
            ${(0, i18n_1.t)('modals.runtimeConfig.openSettings')}
          </button>
        </section>
      `;
            this.attachListeners();
            return;
        }
        this.content.innerHTML = `
      <div class="runtime-config-summary">
        ${desktop ? (0, i18n_1.t)('modals.runtimeConfig.summary.desktop') : (0, i18n_1.t)('modals.runtimeConfig.summary.web')} · ${features.filter(f => (0, runtime_config_1.isFeatureAvailable)(f.id)).length}/${features.length} ${(0, i18n_1.t)('modals.runtimeConfig.summary.available')}
      </div>
      <div class="runtime-config-list">
        ${features.map(feature => this.renderFeature(feature)).join('')}
      </div>
    `;
        this.attachListeners();
    }
    renderFeature(feature) {
        const enabled = (0, runtime_config_1.isFeatureEnabled)(feature.id);
        const available = (0, runtime_config_1.isFeatureAvailable)(feature.id);
        const effectiveSecrets = (0, runtime_config_1.getEffectiveSecrets)(feature);
        const allStaged = !available && effectiveSecrets.every((k) => (0, runtime_config_1.getSecretState)(k).valid || (this.pendingSecrets.has(k) && this.validatedKeys.get(k) !== false));
        const pillClass = available ? 'ok' : allStaged ? 'staged' : 'warn';
        const pillLabel = available ? (0, i18n_1.t)('modals.runtimeConfig.status.ready') : allStaged ? (0, i18n_1.t)('modals.runtimeConfig.status.staged') : (0, i18n_1.t)('modals.runtimeConfig.status.needsKeys');
        const secrets = effectiveSecrets.map((key) => this.renderSecretRow(key)).join('');
        const desktop = (0, runtime_1.isDesktopRuntime)();
        const fallbackHtml = available || allStaged ? '' : `<p class="runtime-feature-fallback fallback">${(0, sanitize_1.escapeHtml)(feature.fallback)}</p>`;
        return `
      <section class="runtime-feature ${available ? 'available' : allStaged ? 'staged' : 'degraded'}">
        <header class="runtime-feature-header">
          <label>
            <input type="checkbox" data-toggle="${feature.id}" ${enabled ? 'checked' : ''} ${desktop ? '' : 'disabled'}>
            <span>${(0, sanitize_1.escapeHtml)(feature.name)}</span>
          </label>
          <span class="runtime-pill ${pillClass}">${pillLabel}</span>
        </header>
        <div class="runtime-secrets">${secrets}</div>
        ${fallbackHtml}
      </section>
    `;
    }
    renderSecretRow(key) {
        const state = (0, runtime_config_1.getSecretState)(key);
        const pending = this.pendingSecrets.has(key);
        const pendingValid = pending ? this.validatedKeys.get(key) : undefined;
        const status = pending
            ? (pendingValid === false ? (0, i18n_1.t)('modals.runtimeConfig.status.invalid') : (0, i18n_1.t)('modals.runtimeConfig.status.staged'))
            : !state.present ? (0, i18n_1.t)('modals.runtimeConfig.status.missing') : state.valid ? (0, i18n_1.t)('modals.runtimeConfig.status.valid') : (0, i18n_1.t)('modals.runtimeConfig.status.looksInvalid');
        const statusClass = pending
            ? (pendingValid === false ? 'warn' : 'staged')
            : state.valid ? 'ok' : 'warn';
        const signupUrl = settings_constants_1.SIGNUP_URLS[key];
        const helpKey = `modals.runtimeConfig.help.${key}`;
        const helpRaw = (0, i18n_1.t)(helpKey);
        const helpText = helpRaw !== helpKey ? helpRaw : '';
        const showGetKey = signupUrl && !state.present && !pending;
        const validated = this.validatedKeys.get(key);
        const inputClass = pending ? (validated === false ? 'invalid' : 'valid-staged') : '';
        const checkClass = validated === true ? 'visible' : '';
        const hintText = pending && validated === false
            ? (this.validationMessages.get(key) || (0, runtime_config_1.validateSecret)(key, this.pendingSecrets.get(key) || '').hint || 'Invalid value')
            : null;
        if (key === 'OLLAMA_MODEL') {
            const storedModel = pending
                ? this.pendingSecrets.get(key) || ''
                : (0, runtime_config_1.getRuntimeConfigSnapshot)().secrets[key]?.value || '';
            return `
        <div class="runtime-secret-row">
          <div class="runtime-secret-key"><code>${(0, sanitize_1.escapeHtml)(key)}</code></div>
          <span class="runtime-secret-status ${statusClass}">${(0, sanitize_1.escapeHtml)(status)}</span>
          <span class="runtime-secret-check ${checkClass}">&#x2713;</span>
          ${helpText ? `<div class="runtime-secret-meta">${(0, sanitize_1.escapeHtml)(helpText)}</div>` : ''}
          <select data-model-select class="${inputClass}" ${(0, runtime_1.isDesktopRuntime)() ? '' : 'disabled'}>
            ${storedModel ? `<option value="${(0, sanitize_1.escapeHtml)(storedModel)}" selected>${(0, sanitize_1.escapeHtml)(storedModel)}</option>` : '<option value="" selected disabled>Loading models...</option>'}
          </select>
          <input type="text" data-model-manual class="${inputClass} hidden-input" placeholder="Or type model name" autocomplete="off" ${(0, runtime_1.isDesktopRuntime)() ? '' : 'disabled'} ${storedModel ? `value="${(0, sanitize_1.escapeHtml)(storedModel)}"` : ''}>
          ${hintText ? `<span class="runtime-secret-hint">${(0, sanitize_1.escapeHtml)(hintText)}</span>` : ''}
        </div>
      `;
        }
        const getKeyHtml = showGetKey
            ? `<a href="#" data-signup-url="${signupUrl}" class="runtime-secret-link">Get key</a>`
            : '';
        return `
      <div class="runtime-secret-row">
        <div class="runtime-secret-key"><code>${(0, sanitize_1.escapeHtml)(key)}</code></div>
        <span class="runtime-secret-status ${statusClass}">${(0, sanitize_1.escapeHtml)(status)}</span>
        <span class="runtime-secret-check ${checkClass}">&#x2713;</span>
        ${helpText ? `<div class="runtime-secret-meta">${(0, sanitize_1.escapeHtml)(helpText)}</div>` : ''}
        <div class="runtime-input-wrapper${showGetKey ? ' has-suffix' : ''}">
          <input type="${settings_constants_1.PLAINTEXT_KEYS.has(key) ? 'text' : 'password'}" data-secret="${key}" placeholder="${pending ? (0, i18n_1.t)('modals.runtimeConfig.placeholder.staged') : (0, i18n_1.t)('modals.runtimeConfig.placeholder.setSecret')}" autocomplete="off" ${(0, runtime_1.isDesktopRuntime)() ? '' : 'disabled'} class="${inputClass}" ${pending ? `value="${settings_constants_1.PLAINTEXT_KEYS.has(key) ? (0, sanitize_1.escapeHtml)(this.pendingSecrets.get(key) || '') : settings_constants_1.MASKED_SENTINEL}"` : (settings_constants_1.PLAINTEXT_KEYS.has(key) && state.present ? `value="${(0, sanitize_1.escapeHtml)((0, runtime_config_1.getRuntimeConfigSnapshot)().secrets[key]?.value || '')}"` : '')}>
          ${getKeyHtml}
        </div>
        ${hintText ? `<span class="runtime-secret-hint">${(0, sanitize_1.escapeHtml)(hintText)}</span>` : ''}
      </div>
    `;
    }
    attachListeners() {
        this.content.querySelectorAll('a[data-signup-url]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.dataset.signupUrl;
                if (!url)
                    return;
                if ((0, runtime_1.isDesktopRuntime)()) {
                    void (0, tauri_bridge_1.invokeTauri)('open_url', { url }).catch(() => window.open(url, '_blank'));
                }
                else {
                    window.open(url, '_blank');
                }
            });
        });
        if (!(0, runtime_1.isDesktopRuntime)())
            return;
        if (this.mode === 'alert') {
            this.content.querySelector('[data-open-settings]')?.addEventListener('click', () => {
                void (0, tauri_bridge_1.invokeTauri)('open_settings_window_command').catch((error) => {
                    console.warn('[runtime-config] Failed to open settings window', error);
                });
            });
            return;
        }
        // Ollama model dropdown: fetch models and handle selection
        const modelSelect = this.content.querySelector('select[data-model-select]');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                const model = modelSelect.value;
                if (model && this.buffered) {
                    this.pendingSecrets.set('OLLAMA_MODEL', model);
                    this.validatedKeys.set('OLLAMA_MODEL', true);
                    modelSelect.classList.remove('invalid');
                    modelSelect.classList.add('valid-staged');
                    this.updateFeatureCardStatus('OLLAMA_MODEL');
                }
            });
            void this.fetchOllamaModels(modelSelect);
        }
        this.content.querySelectorAll('input[data-toggle]').forEach((input) => {
            input.addEventListener('change', () => {
                const featureId = input.dataset.toggle;
                if (!featureId)
                    return;
                (0, analytics_1.trackFeatureToggle)(featureId, input.checked);
                (0, runtime_config_1.setFeatureToggle)(featureId, input.checked);
            });
        });
        this.content.querySelectorAll('input[data-secret]').forEach((input) => {
            input.addEventListener('input', () => {
                const key = input.dataset.secret;
                if (!key)
                    return;
                if (this.buffered && this.pendingSecrets.has(key) && input.value.startsWith(settings_constants_1.MASKED_SENTINEL)) {
                    input.value = input.value.slice(settings_constants_1.MASKED_SENTINEL.length);
                }
                this.validatedKeys.delete(key);
                this.validationMessages.delete(key);
                const check = input.closest('.runtime-secret-row')?.querySelector('.runtime-secret-check');
                check?.classList.remove('visible');
                input.classList.remove('valid-staged', 'invalid');
                const hint = input.closest('.runtime-secret-row')?.querySelector('.runtime-secret-hint');
                if (hint)
                    hint.remove();
            });
            input.addEventListener('blur', () => {
                const key = input.dataset.secret;
                if (!key)
                    return;
                const raw = input.value.trim();
                if (!raw) {
                    if (this.buffered && this.pendingSecrets.has(key)) {
                        this.pendingSecrets.delete(key);
                        this.validatedKeys.delete(key);
                        this.validationMessages.delete(key);
                        this.render();
                    }
                    return;
                }
                if (raw === settings_constants_1.MASKED_SENTINEL)
                    return;
                if (this.buffered) {
                    this.pendingSecrets.set(key, raw);
                    const result = (0, runtime_config_1.validateSecret)(key, raw);
                    if (result.valid) {
                        this.validatedKeys.delete(key);
                        this.validationMessages.delete(key);
                    }
                    else {
                        this.validatedKeys.set(key, false);
                        this.validationMessages.set(key, result.hint || 'Invalid format');
                    }
                    if (settings_constants_1.PLAINTEXT_KEYS.has(key)) {
                        input.value = raw;
                    }
                    else {
                        input.type = 'password';
                        input.value = settings_constants_1.MASKED_SENTINEL;
                    }
                    input.placeholder = (0, i18n_1.t)('modals.runtimeConfig.placeholder.staged');
                    const row = input.closest('.runtime-secret-row');
                    const check = row?.querySelector('.runtime-secret-check');
                    input.classList.remove('valid-staged', 'invalid');
                    if (result.valid) {
                        check?.classList.remove('visible');
                        input.classList.add('valid-staged');
                    }
                    else {
                        check?.classList.remove('visible');
                        input.classList.add('invalid');
                        const existingHint = row?.querySelector('.runtime-secret-hint');
                        if (existingHint)
                            existingHint.remove();
                        if (result.hint) {
                            const hint = document.createElement('span');
                            hint.className = 'runtime-secret-hint';
                            hint.textContent = result.hint;
                            row?.appendChild(hint);
                        }
                    }
                    this.updateFeatureCardStatus(key);
                    // Update inline status text to reflect staged state
                    const statusEl = input.closest('.runtime-secret-row')?.querySelector('.runtime-secret-status');
                    if (statusEl) {
                        statusEl.textContent = result.valid ? (0, i18n_1.t)('modals.runtimeConfig.status.staged') : (0, i18n_1.t)('modals.runtimeConfig.status.invalid');
                        statusEl.className = `runtime-secret-status ${result.valid ? 'staged' : 'warn'}`;
                    }
                    // When Ollama URL is staged, auto-fetch available models
                    if (key === 'OLLAMA_API_URL' && result.valid) {
                        const modelSelect = this.content.querySelector('select[data-model-select]');
                        if (modelSelect)
                            void this.fetchOllamaModels(modelSelect);
                    }
                }
                else {
                    void (0, runtime_config_1.setSecretValue)(key, raw);
                    input.value = '';
                }
            });
        });
    }
    updateFeatureCardStatus(secretKey) {
        const feature = runtime_config_1.RUNTIME_FEATURES.find(f => (0, runtime_config_1.getEffectiveSecrets)(f).includes(secretKey));
        if (!feature)
            return;
        const section = Array.from(this.content.querySelectorAll('.runtime-feature')).find(el => {
            const toggle = el.querySelector(`input[data-toggle="${feature.id}"]`);
            return !!toggle;
        });
        if (!section)
            return;
        const available = (0, runtime_config_1.isFeatureAvailable)(feature.id);
        const effectiveSecrets = (0, runtime_config_1.getEffectiveSecrets)(feature);
        const allStaged = !available && effectiveSecrets.every((k) => (0, runtime_config_1.getSecretState)(k).valid || (this.pendingSecrets.has(k) && this.validatedKeys.get(k) !== false));
        section.className = `runtime-feature ${available ? 'available' : allStaged ? 'staged' : 'degraded'}`;
        const pill = section.querySelector('.runtime-pill');
        if (pill) {
            pill.className = `runtime-pill ${available ? 'ok' : allStaged ? 'staged' : 'warn'}`;
            pill.textContent = available ? (0, i18n_1.t)('modals.runtimeConfig.status.ready') : allStaged ? (0, i18n_1.t)('modals.runtimeConfig.status.staged') : (0, i18n_1.t)('modals.runtimeConfig.status.needsKeys');
        }
        const fallback = section.querySelector('.runtime-feature-fallback');
        if (available || allStaged) {
            fallback?.remove();
        }
    }
    static makeTimeout(ms) {
        if (typeof AbortSignal.timeout === 'function')
            return AbortSignal.timeout(ms);
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), ms);
        return ctrl.signal;
    }
    showManualModelInput(select) {
        const manual = select.parentElement?.querySelector('input[data-model-manual]');
        if (!manual)
            return;
        select.style.display = 'none';
        manual.classList.remove('hidden-input');
        manual.addEventListener('blur', () => {
            const model = manual.value.trim();
            if (model && this.buffered) {
                this.pendingSecrets.set('OLLAMA_MODEL', model);
                this.validatedKeys.set('OLLAMA_MODEL', true);
                manual.classList.remove('invalid');
                manual.classList.add('valid-staged');
                this.updateFeatureCardStatus('OLLAMA_MODEL');
            }
        });
    }
    async fetchOllamaModels(select) {
        const snapshot = (0, runtime_config_1.getRuntimeConfigSnapshot)();
        const ollamaUrl = this.pendingSecrets.get('OLLAMA_API_URL')
            || snapshot.secrets['OLLAMA_API_URL']?.value
            || '';
        if (!ollamaUrl) {
            select.innerHTML = '<option value="" disabled selected>Set Ollama URL first</option>';
            return;
        }
        const currentModel = this.pendingSecrets.get('OLLAMA_MODEL')
            || snapshot.secrets['OLLAMA_MODEL']?.value
            || '';
        try {
            // Try Ollama-native /api/tags first, fall back to OpenAI-compatible /v1/models
            let models = [];
            try {
                const res = await fetch(new URL('/api/tags', ollamaUrl).toString(), {
                    signal: RuntimeConfigPanel.makeTimeout(5000),
                });
                if (res.ok) {
                    const data = await res.json();
                    models = (data.models?.map(m => m.name) || []).filter(n => !n.includes('embed'));
                }
            }
            catch { /* Ollama endpoint not available, try OpenAI format */ }
            if (models.length === 0) {
                try {
                    const res = await fetch(new URL('/v1/models', ollamaUrl).toString(), {
                        signal: RuntimeConfigPanel.makeTimeout(5000),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        models = (data.data?.map(m => m.id) || []).filter(n => !n.includes('embed'));
                    }
                }
                catch { /* OpenAI endpoint also unavailable */ }
            }
            if (models.length === 0) {
                // No models discovered — show manual text input as fallback
                this.showManualModelInput(select);
                return;
            }
            select.innerHTML = models.map(name => `<option value="${(0, sanitize_1.escapeHtml)(name)}" ${name === currentModel ? 'selected' : ''}>${(0, sanitize_1.escapeHtml)(name)}</option>`).join('');
            // Auto-select first model if none stored
            if (!currentModel && models.length > 0) {
                const first = models[0];
                select.value = first;
                if (this.buffered) {
                    this.pendingSecrets.set('OLLAMA_MODEL', first);
                    this.validatedKeys.set('OLLAMA_MODEL', true);
                    select.classList.add('valid-staged');
                    this.updateFeatureCardStatus('OLLAMA_MODEL');
                }
            }
        }
        catch {
            // Complete failure — fall back to manual input
            this.showManualModelInput(select);
        }
    }
}
exports.RuntimeConfigPanel = RuntimeConfigPanel;
