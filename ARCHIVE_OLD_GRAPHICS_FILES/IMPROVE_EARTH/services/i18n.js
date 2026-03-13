"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGES = void 0;
exports.initI18n = initI18n;
exports.t = t;
exports.changeLanguage = changeLanguage;
exports.getCurrentLanguage = getCurrentLanguage;
exports.isRTL = isRTL;
exports.getLocale = getLocale;
const i18next_1 = __importDefault(require("i18next"));
const i18next_browser_languagedetector_1 = __importDefault(require("i18next-browser-languagedetector"));
// English is always needed as fallback — bundle it eagerly.
const en_json_1 = __importDefault(require("../locales/en.json"));
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'el', 'es', 'it', 'pl', 'pt', 'nl', 'sv', 'ru', 'ar', 'zh', 'ja', 'ko', 'tr', 'th', 'vi'];
const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);
const loadedLanguages = new Set();
// Lazy-load only the locale that's actually needed — all others stay out of the bundle.
const localeModules = import.meta.glob(['../locales/*.json', '!../locales/en.json'], { import: 'default' });
const RTL_LANGUAGES = new Set(['ar']);
function normalizeLanguage(lng) {
    const base = (lng || 'en').split('-')[0]?.toLowerCase() || 'en';
    if (SUPPORTED_LANGUAGE_SET.has(base)) {
        return base;
    }
    return 'en';
}
function applyDocumentDirection(lang) {
    const base = lang.split('-')[0] || lang;
    document.documentElement.setAttribute('lang', base === 'zh' ? 'zh-CN' : base);
    if (RTL_LANGUAGES.has(base)) {
        document.documentElement.setAttribute('dir', 'rtl');
    }
    else {
        document.documentElement.removeAttribute('dir');
    }
}
async function ensureLanguageLoaded(lng) {
    const normalized = normalizeLanguage(lng);
    if (loadedLanguages.has(normalized) && i18next_1.default.hasResourceBundle(normalized, 'translation')) {
        return normalized;
    }
    let translation;
    if (normalized === 'en') {
        translation = en_json_1.default;
    }
    else {
        const loader = localeModules[`../locales/${normalized}.json`];
        if (!loader) {
            console.warn(`No locale file for "${normalized}", falling back to English`);
            translation = en_json_1.default;
        }
        else {
            translation = await loader();
        }
    }
    i18next_1.default.addResourceBundle(normalized, 'translation', translation, true, true);
    loadedLanguages.add(normalized);
    return normalized;
}
// Initialize i18n
async function initI18n() {
    if (i18next_1.default.isInitialized) {
        const currentLanguage = normalizeLanguage(i18next_1.default.language || 'en');
        await ensureLanguageLoaded(currentLanguage);
        applyDocumentDirection(i18next_1.default.language || currentLanguage);
        return;
    }
    loadedLanguages.add('en');
    await i18next_1.default
        .use(i18next_browser_languagedetector_1.default)
        .init({
        resources: {
            en: { translation: en_json_1.default },
        },
        supportedLngs: [...SUPPORTED_LANGUAGES],
        nonExplicitSupportedLngs: true,
        fallbackLng: 'en',
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false, // not needed for these simple strings
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });
    const detectedLanguage = await ensureLanguageLoaded(i18next_1.default.language || 'en');
    if (detectedLanguage !== 'en') {
        // Re-trigger translation resolution now that the detected bundle is loaded.
        await i18next_1.default.changeLanguage(detectedLanguage);
    }
    applyDocumentDirection(i18next_1.default.language || detectedLanguage);
}
// Helper to translate
function t(key, options) {
    return i18next_1.default.t(key, options);
}
// Helper to change language
async function changeLanguage(lng) {
    const normalized = await ensureLanguageLoaded(lng);
    await i18next_1.default.changeLanguage(normalized);
    applyDocumentDirection(normalized);
    window.location.reload(); // Simple reload to update all components for now
}
// Helper to get current language (normalized to short code)
function getCurrentLanguage() {
    const lang = i18next_1.default.language || 'en';
    return lang.split('-')[0];
}
function isRTL() {
    return RTL_LANGUAGES.has(getCurrentLanguage());
}
function getLocale() {
    const lang = getCurrentLanguage();
    const map = { en: 'en-US', el: 'el-GR', zh: 'zh-CN', pt: 'pt-BR', ja: 'ja-JP', ko: 'ko-KR', tr: 'tr-TR', th: 'th-TH', vi: 'vi-VN' };
    return map[lang] || lang;
}
exports.LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'th', label: 'ไทย', flag: '🇹🇭' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];
