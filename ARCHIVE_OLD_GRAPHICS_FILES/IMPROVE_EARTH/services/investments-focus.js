"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.focusInvestmentOnMap = focusInvestmentOnMap;
function focusInvestmentOnMap(map, mapLayers, lat, lon) {
    map?.enableLayer('gulfInvestments');
    mapLayers.gulfInvestments = true;
    map?.setCenter(lat, lon, 6);
}
