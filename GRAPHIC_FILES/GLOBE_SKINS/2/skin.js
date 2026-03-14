// GRAPHIC_FILES/GLOBE_SKINS/2/skin.js

window.applySkin_2 = function(skin) {
  // ----------------------------------------------------------------
  // WTR SKIN (Index 2)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    globeMat.map = window.earthTex; // Default mapped earth texture
    globeMat.emissiveMap = null;
    globeMat.emissive.setHex(0x0055aa); // Deep ocean blue emissive base
    globeMat.wireframe = false;
    
    // Transparent layer
    globeMat.transparent = true;
    globeMat.opacity = 0.5; // WTR default
    globeMat.depthWrite = false;
  }
};
