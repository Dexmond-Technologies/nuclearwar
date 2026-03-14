// GRAPHIC_FILES/GLOBE_SKINS/3/skin.js

window.applySkin_3 = function(skin) {
  // ----------------------------------------------------------------
  // RED PLANET SKIN (Index 3)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    globeMat.map = window.risikoTexture; // Dynamically generated Risiko state!
    if (typeof window.updateRisikoMap === 'function') window.updateRisikoMap();
    globeMat.emissiveMap = null;
    
    // Apply neutral white lighting base so the canvas colors shine perfectly accurately
    globeMat.color.setHex(0xffffff);
    globeMat.emissive.setHex(0x222222);
    globeMat.wireframe = false;
    
    // Transparent layer
    globeMat.transparent = true;
    globeMat.opacity = 0.2;
    globeMat.depthWrite = false;
  }
};
