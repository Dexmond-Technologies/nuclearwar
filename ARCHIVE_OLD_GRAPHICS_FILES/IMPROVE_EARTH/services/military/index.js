"use strict";
/**
 * Unified military service module.
 *
 * Re-exports from legacy service files that have complex client-side logic
 * (OpenSky/Wingbits polling, AIS streaming, trail tracking, surge analysis).
 * Server-side theater posture is consolidated in the handler.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Military flights (client-side OpenSky/Wingbits tracking)
__exportStar(require("../military-flights"), exports);
// Military vessels (client-side AIS tracking)
__exportStar(require("../military-vessels"), exports);
// Cached theater posture (client-side cache layer)
__exportStar(require("../cached-theater-posture"), exports);
// Military surge analysis (client-side posture computation)
__exportStar(require("../military-surge"), exports);
