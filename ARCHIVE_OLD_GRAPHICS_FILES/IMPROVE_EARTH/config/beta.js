"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BETA_MODE = void 0;
exports.BETA_MODE = typeof window !== 'undefined'
    && localStorage.getItem('worldmonitor-beta-mode') === 'true';
