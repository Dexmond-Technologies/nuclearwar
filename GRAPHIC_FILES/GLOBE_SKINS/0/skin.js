// GRAPHIC_FILES/GLOBE_SKINS/0/skin.js

window.applySkin_0 = function(skin) {
  // ----------------------------------------------------------------
  // LIVE SKIN (Index 0)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = true;
  }

  if (typeof globeMat !== 'undefined') {
    globeMat.map = window.earthTex; // Default mapped earth texture
    globeMat.emissiveMap = null;
    globeMat.emissive.setHex(0x000000);
    globeMat.wireframe = false;
    
    // Transparent glass layer
    globeMat.transparent = true;
    globeMat.opacity = 0.0;
    globeMat.transmission = 1.0;
    globeMat.roughness = 0.05;
    globeMat.metalness = 0.1;
    globeMat.clearcoat = 1.0;
    globeMat.depthWrite = false;
  }
};
