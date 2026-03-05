"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapContainer = void 0;
/**
 * MapContainer - Conditional map renderer
 * Renders DeckGLMap (WebGL) on desktop, fallback to D3/SVG MapComponent on mobile
 */
const utils_1 = require("@/utils");
const Map_1 = require("./Map");
const DeckGLMap_1 = require("./DeckGLMap");
/**
 * Unified map interface that delegates to either DeckGLMap or MapComponent
 * based on device capabilities
 */
class MapContainer {
    constructor(container, initialState) {
        this.deckGLMap = null;
        this.svgMap = null;
        this.container = container;
        this.initialState = initialState;
        this.isMobile = (0, utils_1.isMobileDevice)();
        // Use deck.gl on desktop with WebGL support, SVG on mobile
        this.useDeckGL = !this.isMobile && this.hasWebGLSupport();
        this.init();
    }
    hasWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            // deck.gl + maplibre rely on WebGL2 features in desktop mode.
            // Some Linux WebKitGTK builds expose only WebGL1, which can lead to
            // an empty/black render surface instead of a usable map.
            const gl2 = canvas.getContext('webgl2');
            return !!gl2;
        }
        catch {
            return false;
        }
    }
    initSvgMap(logMessage) {
        console.log(logMessage);
        this.useDeckGL = false;
        this.deckGLMap = null;
        this.container.classList.remove('deckgl-mode');
        this.container.classList.add('svg-mode');
        // DeckGLMap mutates DOM early during construction. If initialization throws,
        // clear partial deck.gl nodes before creating the SVG fallback.
        this.container.innerHTML = '';
        this.svgMap = new Map_1.MapComponent(this.container, this.initialState);
    }
    init() {
        if (this.useDeckGL) {
            console.log('[MapContainer] Initializing deck.gl map (desktop mode)');
            try {
                this.container.classList.add('deckgl-mode');
                this.deckGLMap = new DeckGLMap_1.DeckGLMap(this.container, {
                    ...this.initialState,
                    view: this.initialState.view,
                });
            }
            catch (error) {
                console.warn('[MapContainer] DeckGL initialization failed, falling back to SVG map', error);
                this.initSvgMap('[MapContainer] Initializing SVG map (DeckGL fallback mode)');
            }
        }
        else {
            this.initSvgMap('[MapContainer] Initializing SVG map (mobile/fallback mode)');
        }
    }
    // Unified public API - delegates to active map implementation
    render() {
        if (this.useDeckGL) {
            this.deckGLMap?.render();
        }
        else {
            this.svgMap?.render();
        }
    }
    setView(view) {
        if (this.useDeckGL) {
            this.deckGLMap?.setView(view);
        }
        else {
            this.svgMap?.setView(view);
        }
    }
    setZoom(zoom) {
        if (this.useDeckGL) {
            this.deckGLMap?.setZoom(zoom);
        }
        else {
            this.svgMap?.setZoom(zoom);
        }
    }
    setCenter(lat, lon, zoom) {
        if (this.useDeckGL) {
            this.deckGLMap?.setCenter(lat, lon, zoom);
        }
        else {
            this.svgMap?.setCenter(lat, lon);
            if (zoom != null)
                this.svgMap?.setZoom(zoom);
        }
    }
    getCenter() {
        if (this.useDeckGL) {
            return this.deckGLMap?.getCenter() ?? null;
        }
        return this.svgMap?.getCenter() ?? null;
    }
    setTimeRange(range) {
        if (this.useDeckGL) {
            this.deckGLMap?.setTimeRange(range);
        }
        else {
            this.svgMap?.setTimeRange(range);
        }
    }
    getTimeRange() {
        if (this.useDeckGL) {
            return this.deckGLMap?.getTimeRange() ?? '7d';
        }
        return this.svgMap?.getTimeRange() ?? '7d';
    }
    setLayers(layers) {
        if (this.useDeckGL) {
            this.deckGLMap?.setLayers(layers);
        }
        else {
            this.svgMap?.setLayers(layers);
        }
    }
    getState() {
        if (this.useDeckGL) {
            const state = this.deckGLMap?.getState();
            return state ? { ...state, view: state.view } : this.initialState;
        }
        return this.svgMap?.getState() ?? this.initialState;
    }
    // Data setters
    setEarthquakes(earthquakes) {
        if (this.useDeckGL) {
            this.deckGLMap?.setEarthquakes(earthquakes);
        }
        else {
            this.svgMap?.setEarthquakes(earthquakes);
        }
    }
    setWeatherAlerts(alerts) {
        if (this.useDeckGL) {
            this.deckGLMap?.setWeatherAlerts(alerts);
        }
        else {
            this.svgMap?.setWeatherAlerts(alerts);
        }
    }
    setOutages(outages) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOutages(outages);
        }
        else {
            this.svgMap?.setOutages(outages);
        }
    }
    setAisData(disruptions, density) {
        if (this.useDeckGL) {
            this.deckGLMap?.setAisData(disruptions, density);
        }
        else {
            this.svgMap?.setAisData(disruptions, density);
        }
    }
    setCableActivity(advisories, repairShips) {
        if (this.useDeckGL) {
            this.deckGLMap?.setCableActivity(advisories, repairShips);
        }
        else {
            this.svgMap?.setCableActivity(advisories, repairShips);
        }
    }
    setCableHealth(healthMap) {
        if (this.useDeckGL) {
            this.deckGLMap?.setCableHealth(healthMap);
        }
        else {
            this.svgMap?.setCableHealth(healthMap);
        }
    }
    setProtests(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setProtests(events);
        }
        else {
            this.svgMap?.setProtests(events);
        }
    }
    setFlightDelays(delays) {
        if (this.useDeckGL) {
            this.deckGLMap?.setFlightDelays(delays);
        }
        else {
            this.svgMap?.setFlightDelays(delays);
        }
    }
    setMilitaryFlights(flights, clusters = []) {
        if (this.useDeckGL) {
            this.deckGLMap?.setMilitaryFlights(flights, clusters);
        }
        else {
            this.svgMap?.setMilitaryFlights(flights, clusters);
        }
    }
    setMilitaryVessels(vessels, clusters = []) {
        if (this.useDeckGL) {
            this.deckGLMap?.setMilitaryVessels(vessels, clusters);
        }
        else {
            this.svgMap?.setMilitaryVessels(vessels, clusters);
        }
    }
    setNaturalEvents(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setNaturalEvents(events);
        }
        else {
            this.svgMap?.setNaturalEvents(events);
        }
    }
    setFires(fires) {
        if (this.useDeckGL) {
            this.deckGLMap?.setFires(fires);
        }
        else {
            this.svgMap?.setFires(fires);
        }
    }
    setTechEvents(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setTechEvents(events);
        }
        else {
            this.svgMap?.setTechEvents(events);
        }
    }
    setUcdpEvents(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setUcdpEvents(events);
        }
    }
    setDisplacementFlows(flows) {
        if (this.useDeckGL) {
            this.deckGLMap?.setDisplacementFlows(flows);
        }
    }
    setClimateAnomalies(anomalies) {
        if (this.useDeckGL) {
            this.deckGLMap?.setClimateAnomalies(anomalies);
        }
    }
    setCyberThreats(threats) {
        if (this.useDeckGL) {
            this.deckGLMap?.setCyberThreats(threats);
        }
        else {
            this.svgMap?.setCyberThreats(threats);
        }
    }
    setIranEvents(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setIranEvents(events);
        }
        else {
            this.svgMap?.setIranEvents(events);
        }
    }
    setNewsLocations(data) {
        if (this.useDeckGL) {
            this.deckGLMap?.setNewsLocations(data);
        }
        else {
            this.svgMap?.setNewsLocations(data);
        }
    }
    setPositiveEvents(events) {
        if (this.useDeckGL) {
            this.deckGLMap?.setPositiveEvents(events);
        }
        // SVG map does not support positive events layer
    }
    setKindnessData(points) {
        if (this.useDeckGL) {
            this.deckGLMap?.setKindnessData(points);
        }
        // SVG map does not support kindness layer
    }
    setHappinessScores(data) {
        if (this.useDeckGL) {
            this.deckGLMap?.setHappinessScores(data);
        }
        // SVG map does not support choropleth overlay
    }
    setSpeciesRecoveryZones(species) {
        if (this.useDeckGL) {
            this.deckGLMap?.setSpeciesRecoveryZones(species);
        }
        // SVG map does not support species recovery layer
    }
    setRenewableInstallations(installations) {
        if (this.useDeckGL) {
            this.deckGLMap?.setRenewableInstallations(installations);
        }
        // SVG map does not support renewable installations layer
    }
    updateHotspotActivity(news) {
        if (this.useDeckGL) {
            this.deckGLMap?.updateHotspotActivity(news);
        }
        else {
            this.svgMap?.updateHotspotActivity(news);
        }
    }
    updateMilitaryForEscalation(flights, vessels) {
        if (this.useDeckGL) {
            this.deckGLMap?.updateMilitaryForEscalation(flights, vessels);
        }
        else {
            this.svgMap?.updateMilitaryForEscalation(flights, vessels);
        }
    }
    getHotspotDynamicScore(hotspotId) {
        if (this.useDeckGL) {
            return this.deckGLMap?.getHotspotDynamicScore(hotspotId);
        }
        return this.svgMap?.getHotspotDynamicScore(hotspotId);
    }
    highlightAssets(assets) {
        if (this.useDeckGL) {
            this.deckGLMap?.highlightAssets(assets);
        }
        else {
            this.svgMap?.highlightAssets(assets);
        }
    }
    // Callback setters - MapComponent uses different names
    onHotspotClicked(callback) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOnHotspotClick(callback);
        }
        else {
            this.svgMap?.onHotspotClicked(callback);
        }
    }
    onTimeRangeChanged(callback) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOnTimeRangeChange(callback);
        }
        else {
            this.svgMap?.onTimeRangeChanged(callback);
        }
    }
    setOnLayerChange(callback) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOnLayerChange(callback);
        }
        else {
            this.svgMap?.setOnLayerChange(callback);
        }
    }
    onStateChanged(callback) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOnStateChange((state) => {
                callback({ ...state, view: state.view });
            });
        }
        else {
            this.svgMap?.onStateChanged(callback);
        }
    }
    getHotspotLevels() {
        if (this.useDeckGL) {
            return this.deckGLMap?.getHotspotLevels() ?? {};
        }
        return this.svgMap?.getHotspotLevels() ?? {};
    }
    setHotspotLevels(levels) {
        if (this.useDeckGL) {
            this.deckGLMap?.setHotspotLevels(levels);
        }
        else {
            this.svgMap?.setHotspotLevels(levels);
        }
    }
    initEscalationGetters() {
        if (this.useDeckGL) {
            this.deckGLMap?.initEscalationGetters();
        }
        else {
            this.svgMap?.initEscalationGetters();
        }
    }
    // UI visibility methods
    hideLayerToggle(layer) {
        if (this.useDeckGL) {
            this.deckGLMap?.hideLayerToggle(layer);
        }
        else {
            this.svgMap?.hideLayerToggle(layer);
        }
    }
    setLayerLoading(layer, loading) {
        if (this.useDeckGL) {
            this.deckGLMap?.setLayerLoading(layer, loading);
        }
        else {
            this.svgMap?.setLayerLoading(layer, loading);
        }
    }
    setLayerReady(layer, hasData) {
        if (this.useDeckGL) {
            this.deckGLMap?.setLayerReady(layer, hasData);
        }
        else {
            this.svgMap?.setLayerReady(layer, hasData);
        }
    }
    flashAssets(assetType, ids) {
        if (this.useDeckGL) {
            this.deckGLMap?.flashAssets(assetType, ids);
        }
        // SVG map doesn't have flashAssets - only supported in deck.gl mode
    }
    // Layer enable/disable and trigger methods
    enableLayer(layer) {
        if (this.useDeckGL) {
            this.deckGLMap?.enableLayer(layer);
        }
        else {
            this.svgMap?.enableLayer(layer);
        }
    }
    triggerHotspotClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerHotspotClick(id);
        }
        else {
            this.svgMap?.triggerHotspotClick(id);
        }
    }
    triggerConflictClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerConflictClick(id);
        }
        else {
            this.svgMap?.triggerConflictClick(id);
        }
    }
    triggerBaseClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerBaseClick(id);
        }
        else {
            this.svgMap?.triggerBaseClick(id);
        }
    }
    triggerPipelineClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerPipelineClick(id);
        }
        else {
            this.svgMap?.triggerPipelineClick(id);
        }
    }
    triggerCableClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerCableClick(id);
        }
        else {
            this.svgMap?.triggerCableClick(id);
        }
    }
    triggerDatacenterClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerDatacenterClick(id);
        }
        else {
            this.svgMap?.triggerDatacenterClick(id);
        }
    }
    triggerNuclearClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerNuclearClick(id);
        }
        else {
            this.svgMap?.triggerNuclearClick(id);
        }
    }
    triggerIrradiatorClick(id) {
        if (this.useDeckGL) {
            this.deckGLMap?.triggerIrradiatorClick(id);
        }
        else {
            this.svgMap?.triggerIrradiatorClick(id);
        }
    }
    flashLocation(lat, lon, durationMs) {
        if (this.useDeckGL) {
            this.deckGLMap?.flashLocation(lat, lon, durationMs);
        }
        else {
            this.svgMap?.flashLocation(lat, lon, durationMs);
        }
    }
    // Country click + highlight (deck.gl only)
    onCountryClicked(callback) {
        if (this.useDeckGL) {
            this.deckGLMap?.setOnCountryClick(callback);
        }
    }
    highlightCountry(code) {
        if (this.useDeckGL) {
            this.deckGLMap?.highlightCountry(code);
        }
    }
    clearCountryHighlight() {
        if (this.useDeckGL) {
            this.deckGLMap?.clearCountryHighlight();
        }
    }
    setRenderPaused(paused) {
        if (this.useDeckGL) {
            this.deckGLMap?.setRenderPaused(paused);
        }
    }
    // Utility methods
    isDeckGLMode() {
        return this.useDeckGL;
    }
    isMobileMode() {
        return this.isMobile;
    }
    destroy() {
        if (this.useDeckGL) {
            this.deckGLMap?.destroy();
        }
        else {
            this.svgMap?.destroy();
        }
    }
}
exports.MapContainer = MapContainer;
