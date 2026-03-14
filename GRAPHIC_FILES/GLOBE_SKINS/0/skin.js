// GRAPHIC_FILES/GLOBE_SKINS/0/skin.js

window.applySkin_0 = function(skin) {
  // ----------------------------------------------------------------
  // ABSOLUTE MATERIAL REPLACEMENT - NATIVE MESH (Index 0)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = true; // Atmosphere haze ON
  }

  // The engine's intrinsic `globeMat` (MeshPhysicalMaterial) permanently locks
  // transparency shaders in WebGL 1.0 upon compilation. Mutating it fails.
  // We MUST absolutely discard the material instance and replace it with a
  // freshly constructed Basic Material to guarantee opaque rendering.
  if (typeof window.globeMesh !== 'undefined') {
    
    // Completely replace the core renderer with a pristine, unlit solid blue sphere
    window.globeMesh.material = new THREE.MeshBasicMaterial({
      color: 0x0044ff, // Tactical Deep Ocean Blue
      transparent: false, // 100% Physically Solid
      opacity: 1.0,
      depthWrite: true, // Will properly block back-face stars and layers
      depthTest: true,
      side: THREE.FrontSide
    });
    
  }

  // Ensure scene lighting states remain stable for other components
  if (typeof window.sunLight !== 'undefined') {
    window.sunLight.visible = true;
  }
  if (typeof window.ambientLight !== 'undefined') {
    window.ambientLight.visible = true;
  }
};
