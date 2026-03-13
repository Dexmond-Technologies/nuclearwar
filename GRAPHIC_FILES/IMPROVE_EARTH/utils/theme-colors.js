"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCSSColor = getCSSColor;
exports.invalidateColorCache = invalidateColorCache;
const colorCache = new Map();
let cacheTheme = '';
/**
 * Read a CSS custom property value from the document root.
 * Caches values per theme — cache auto-invalidates when data-theme changes.
 * @param varName CSS variable name including -- prefix (e.g., '--semantic-critical')
 * @returns The computed color value string
 */
function getCSSColor(varName) {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    if (currentTheme !== cacheTheme) {
        colorCache.clear();
        cacheTheme = currentTheme;
    }
    const cached = colorCache.get(varName);
    if (cached)
        return cached;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
    colorCache.set(varName, value);
    return value;
}
/**
 * Invalidate the color cache. Call when theme changes to ensure
 * next getCSSColor() reads reflect the new theme.
 */
function invalidateColorCache() {
    colorCache.clear();
    cacheTheme = '';
}
