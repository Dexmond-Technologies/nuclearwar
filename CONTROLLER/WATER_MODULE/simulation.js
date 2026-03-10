/**
 * WATER MODULE SIMULATION (Global Hydrology Engine)
 * Defines the real-time conservation of mass and flow equations based on the user's `rulesimplementation`.
 */

class WaterSimulation {
    constructor() {
        this.GRID_WIDTH = 360;  // 1 degree resolution
        this.GRID_HEIGHT = 180;
        this.water_height = new Float32Array(this.GRID_WIDTH * this.GRID_HEIGHT);
        this.terrain_height = new Float32Array(this.GRID_WIDTH * this.GRID_HEIGHT);
        this.temperatures = new Float32Array(this.GRID_WIDTH * this.GRID_HEIGHT);
        
        this.total_ocean_volume = 0;
        this.global_sea_level = 0;
        this.ocean_surface_area_constant = 361_000_000; // km^2

        // AI specific modifiers (0-1 multipliers or active flags)
        this.cloudSeedingActive = false;
        this.rainCloudActive = false;

        // Hydro Power metrics
        this.total_hydro_power_mw = 0;
        this.dams = [
            // Example dams (x, y coordinates mapping to 1D array index)
            { x: 180, y: 90, type: 'datacenter_feed' }
        ];

        this.initGrid();
    }

    _getIndex(x, y) {
        return y * this.GRID_WIDTH + x;
    }

    initGrid() {
        console.log("💧 WATER MODULE: Initializing 360x180 hydrology grid...");
        // Fast mock initialization (In a real scenario, this loads from a heightmap texture or DB)
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const idx = this._getIndex(x, y);
                // Simple Perlin noise approximation or hardcoded continent blocks
                let t_height = (Math.sin(x * 0.1) * Math.cos(y * 0.1)) * 1000; 
                this.terrain_height[idx] = t_height;
                
                // If terrain is below zero, fill with water up to sea level (0)
                if (t_height < 0) {
                    this.water_height[idx] = Math.abs(t_height); 
                } else {
                    this.water_height[idx] = 10; // Land gets 10m of surface/groundwater
                }

                // Global temperature gradient (hot at equator 90, cold at poles 0/180)
                this.temperatures[idx] = 30 - Math.abs(y - 90) * 0.5;
            }
        }
        this.calculateSeaLevel();
    }

    // Main tick execution (Called externally e.g., every 1000ms)
    tick() {
        // STEP 1: Atmosphere (Evaporation & Rain)
        this.simulateAtmosphere();

        // STEP 2: Gravity Flow (Rivers, Lakes, Oceans)
        this.simulateFlow();

        // STEP 3: Global Ocean Integrity
        this.calculateSeaLevel();

        // STEP 4: Power Generation
        this.calculateHydroPower();

        // Verification: Conservation of Mass
        // let totalMass = 0;
        // for(let i=0; i < this.water_height.length; i++) totalMass += this.water_height[i];
        // console.log("Total Water Volume:", totalMass);
    }

    simulateAtmosphere() {
        for (let i = 0; i < this.water_height.length; i++) {
            let temp = this.temperatures[i];
            if (temp < 0) continue; // Ice doesn't evaporate fast enough to matter per tick

            let evaporation = temp * 0.001; // Base rate
            let rain = 0;

            // Artificial AI Weather Modifications
            if (this.rainCloudActive) {
                evaporation *= 2.0; // Rain Cloud doubles stealing globally or locally
            } else if (this.cloudSeedingActive) {
                rain = 0.05; // Gemini forces condensation
            } else {
                // Natural atmospheric return (simplified) - return what evaporates mostly randomly over land
                if (Math.random() < 0.1) rain = temp * 0.01; 
            }

            // Apply to cell (prevent negative water)
            let stealAmount = Math.min(this.water_height[i], evaporation);
            this.water_height[i] = this.water_height[i] - stealAmount + rain;
        }
    }

    simulateFlow() {
        // Double buffering to prevent cascading artifacts
        let next_water_height = new Float32Array(this.water_height);

        for (let y = 1; y < this.GRID_HEIGHT - 1; y++) {
            for (let x = 1; x < this.GRID_WIDTH - 1; x++) {
                const cell = this._getIndex(x, y);
                if (this.water_height[cell] <= 0) continue;

                const my_total_elevation = this.water_height[cell] + this.terrain_height[cell];
                
                // 4-way neighbors mapping array
                const neighbors = [
                    this._getIndex(x, y - 1), // top
                    this._getIndex(x, y + 1), // bottom
                    this._getIndex(x - 1, y), // left
                    this._getIndex(x + 1, y)  // right
                ];

                for (let i = 0; i < neighbors.length; i++) {
                    const n_idx = neighbors[i];
                    const n_total_elevation = this.water_height[n_idx] + this.terrain_height[n_idx];
                    
                    const deltaH = my_total_elevation - n_total_elevation;

                    // If neighbor is lower, water flows downhill
                    if (deltaH > 0) {
                        // Flow speed constant = 0.3
                        let flow_amount = 0.3 * deltaH;
                        // Never drain more water than the cell currently has (1/8th rule prevents draining dry too fast across 4 neighbors)
                        flow_amount = Math.min(flow_amount, this.water_height[cell] / 8);

                        next_water_height[cell] -= flow_amount;
                        next_water_height[n_idx] += flow_amount;
                    }
                }
            }
        }
        
        // Commit changes to actual grid
        this.water_height = next_water_height;
    }

    calculateSeaLevel() {
        let total_ocean_vol = 0;
        for (let i = 0; i < this.water_height.length; i++) {
            if (this.terrain_height[i] < 0) {
                total_ocean_vol += this.water_height[i];
            }
        }
        this.total_ocean_volume = total_ocean_vol;
        // Fast approximation
        this.global_sea_level = this.total_ocean_volume / this.ocean_surface_area_constant;
    }

    calculateHydroPower() {
        let totalPowerWatts = 0;

        for (let i = 0; i < this.dams.length; i++) {
            const dam = this.dams[i];
            const cellIdx = this._getIndex(dam.x, dam.y);
            
            // Artificial flow rate calculation based on water height present in the dam's channel
            const flow_rate = this.water_height[cellIdx] * 5.0; // Approximation of volume moving passing through
            const height_drop = 30; // 30 meter gravity drop assumed for hydrostation

            if (flow_rate > 0 && height_drop > 0) {
                 // Power (watts) = efficiency(0.9) x waterDensity(1000 kg/m3) x gravity(9.81 m/s2) x Q x H
                 const power = 0.9 * 1000 * 9.81 * flow_rate * height_drop;
                 totalPowerWatts += power;
            }
        }

        this.total_hydro_power_mw = totalPowerWatts / 1_000_000;
    }

    getHydroPowerMW() {
        return this.total_hydro_power_mw;
    }
}

module.exports = new WaterSimulation();
