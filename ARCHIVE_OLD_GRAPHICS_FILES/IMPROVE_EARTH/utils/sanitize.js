"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.sanitizeUrl = sanitizeUrl;
exports.escapeAttr = escapeAttr;
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};
function escapeHtml(str) {
    if (!str)
        return '';
    return String(str).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}
function sanitizeUrl(url) {
    if (!url)
        return '';
    const trimmed = String(url).trim();
    if (!trimmed)
        return '';
    const isAllowedProtocol = (protocol) => protocol === 'http:' || protocol === 'https:';
    try {
        const parsed = new URL(trimmed);
        if (isAllowedProtocol(parsed.protocol)) {
            return escapeAttr(parsed.toString());
        }
    }
    catch {
        // Not an absolute URL, continue and validate as relative.
    }
    if (!/^(\/|\.\/|\.\.\/|\?|#)/.test(trimmed)) {
        return '';
    }
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
        const resolved = new URL(trimmed, base);
        if (!isAllowedProtocol(resolved.protocol)) {
            return '';
        }
        return escapeAttr(trimmed);
    }
    catch {
        return '';
    }
}
function escapeAttr(str) {
    return escapeHtml(str);
}
