window['applySkin_6'] = function(skin) {
  // Clear any existing procedural groups
  if (window.greenSkinGroup) window.greenSkinGroup.visible = false;
  
  // Real Earth uses high-fidelity 4K and 8K texture maps from the Three-Globe CDN
  const texLoader = new THREE.TextureLoader();
  
  // 1. Diffuse Color Map (Blue Oceans, Green Landmasses)
  const earthTex = texLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    
    // Apply to the core globe material
    globeMat.color.setHex(0xffffff); // White base to let texture show
    globeMat.map = tex;
    
    // Bump Mapping
    const bumpMap = texLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png');
    globeMat.bumpMap = bumpMap;
    globeMat.bumpScale = 0.05;
    
    // Material Physics (Shiny Oceans, Rough Land)
    const waterMap = texLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png');
    globeMat.roughnessMap = waterMap; 
    globeMat.metalnessMap = waterMap;
    globeMat.metalness = 0.2; // Base metalness
    globeMat.roughness = 0.6; // Base roughness (land)
    
    globeMat.emissive.setHex(0x000000);
    
    // Remove transmission/glass properties so it looks like a solid physical rock
    globeMat.transmission = 0.0;
    globeMat.opacity = 1.0;
    globeMat.transparent = false;
    globeMat.wireframe = false;
    
    globeMat.needsUpdate = true;
    
    setLog("🌍 ATMOSPHERIC RENDERING: [REAL_EARTH] High-Fidelity Photogrammetry Mapped.", "#00ffcc");
  });
};
