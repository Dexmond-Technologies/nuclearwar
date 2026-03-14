// GRAPHIC_FILES/GLOBE_SKINS/1/skin.js

window.applySkin_1 = function(skin) {
  // ----------------------------------------------------------------
  // BLK SKIN (Index 1)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof window.globeMesh !== 'undefined') {
    const blackGlobeMat = new THREE.MeshStandardMaterial({
      color: 0x050505, // Visually pure black
      emissive: 0x080808, // Subtle constant glow to separate the silhouette from the black space vacuum
      roughness: 0.15, // Smooth but broad specular reflection
      metalness: 0.5,  // Semi-metallic to catch environmental ambient lighting strongly
      transparent: true,
      opacity: 0.90,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide
    });
    
    window.globeMesh.material = blackGlobeMat;
  }
};
