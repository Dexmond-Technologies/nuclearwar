"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredTheme = getStoredTheme;
exports.getCurrentTheme = getCurrentTheme;
exports.setTheme = setTheme;
exports.applyStoredTheme = applyStoredTheme;
const theme_colors_1 = require("./theme-colors");
const STORAGE_KEY = 'worldmonitor-theme';
const DEFAULT_THEME = 'dark';
/**
 * Read the stored theme preference from localStorage.
 * Returns 'dark' or 'light' if valid, otherwise DEFAULT_THEME.
 */
function getStoredTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light')
            return stored;
    }
    catch {
        // localStorage unavailable (e.g., sandboxed iframe, private browsing)
    }
    return DEFAULT_THEME;
}
/**
 * Read the current theme from the document root's data-theme attribute.
 */
function getCurrentTheme() {
    const value = document.documentElement.dataset.theme;
    if (value === 'dark' || value === 'light')
        return value;
    return DEFAULT_THEME;
}
/**
 * Set the active theme: update DOM attribute, invalidate color cache,
 * persist to localStorage, update meta theme-color, and dispatch event.
 */
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    (0, theme_colors_1.invalidateColorCache)();
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    }
    catch {
        // localStorage unavailable
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        const variant = document.documentElement.dataset.variant;
        meta.content = theme === 'dark' ? (variant === 'happy' ? '#1A2332' : '#0a0f0a') : (variant === 'happy' ? '#FAFAF5' : '#f8f9fa');
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}
/**
 * Apply the stored theme preference to the document before components mount.
 * Only sets the data-theme attribute and meta theme-color — does NOT dispatch
 * events or invalidate the color cache (components aren't mounted yet).
 *
 * The inline script in index.html already handles the fast FOUC-free path.
 * This is a safety net for cases where the inline script didn't run.
 */
function applyStoredTheme() {
    const variant = document.documentElement.dataset.variant;
    // Check raw localStorage to distinguish "no preference" from "explicitly chose dark"
    let raw = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    }
    catch { /* noop */ }
    const hasExplicitPreference = raw === 'dark' || raw === 'light';
    let effective;
    if (hasExplicitPreference) {
        // User made an explicit choice — respect it regardless of variant
        effective = raw;
    }
    else {
        // No stored preference: happy defaults to light, others to dark
        effective = variant === 'happy' ? 'light' : DEFAULT_THEME;
    }
    document.documentElement.dataset.theme = effective;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        if (effective === 'dark') {
            meta.content = variant === 'happy' ? '#1A2332' : '#0a0f0a';
        }
        else {
            meta.content = variant === 'happy' ? '#FAFAF5' : '#f8f9fa';
        }
    }
}
