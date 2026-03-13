"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
const runtime_config_1 = require("./runtime-config");
const settings_constants_1 = require("./settings-constants");
class SettingsManager {
    constructor() {
        this.pendingSecrets = new Map();
        this.validatedKeys = new Map();
        this.validationMessages = new Map();
    }
    captureUnsavedInputs(container) {
        container.querySelectorAll('input[data-secret]').forEach((input) => {
            const key = input.dataset.secret;
            if (!key)
                return;
            const raw = input.value.trim();
            if (!raw || raw === settings_constants_1.MASKED_SENTINEL)
                return;
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
        const modelSelect = container.querySelector('select[data-model-select]');
        const modelManual = container.querySelector('input[data-model-manual]');
        const modelValue = (modelManual && !modelManual.classList.contains('hidden-input') ? modelManual.value.trim() : modelSelect?.value) || '';
        if (modelValue && !this.pendingSecrets.has('OLLAMA_MODEL')) {
            this.pendingSecrets.set('OLLAMA_MODEL', modelValue);
            this.validatedKeys.set('OLLAMA_MODEL', true);
        }
    }
    hasPendingChanges() {
        return this.pendingSecrets.size > 0;
    }
    getMissingRequiredSecrets() {
        const missing = [];
        for (const feature of runtime_config_1.RUNTIME_FEATURES) {
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
        const errors = [];
        const context = Object.fromEntries(this.pendingSecrets.entries());
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
        return errors;
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
    setPending(key, value) {
        this.pendingSecrets.set(key, value);
    }
    getPending(key) {
        return this.pendingSecrets.get(key);
    }
    hasPending(key) {
        return this.pendingSecrets.has(key);
    }
    deletePending(key) {
        this.pendingSecrets.delete(key);
        this.validatedKeys.delete(key);
        this.validationMessages.delete(key);
    }
    setValidation(key, valid, message) {
        this.validatedKeys.set(key, valid);
        if (message) {
            this.validationMessages.set(key, message);
        }
        else {
            this.validationMessages.delete(key);
        }
    }
    getValidationState(key) {
        return {
            validated: this.validatedKeys.get(key),
            message: this.validationMessages.get(key),
        };
    }
    destroy() {
        this.pendingSecrets.clear();
        this.validatedKeys.clear();
        this.validationMessages.clear();
    }
}
exports.SettingsManager = SettingsManager;
