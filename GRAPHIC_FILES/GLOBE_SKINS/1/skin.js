// GRAPHIC_FILES/GLOBE_SKINS/1/skin.js

window.applySkin_1 = function(skin) {
  // ----------------------------------------------------------------
  // BLK SKIN (Index 1)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    globeMat.color.setHex(0x111111);
    globeMat.emissive.setHex(0x000000);
    globeMat.map = window.earthTex; // Default mapped earth texture
    globeMat.emissiveMap = null;
    globeMat.specular.setHex(0x777777);
    globeMat.shininess = 35;
    globeMat.wireframe = false;
    
    // Opaque layer
    globeMat.transparent = false;
    globeMat.opacity = 1.0;
    globeMat.transmission = 1.0;
    globeMat.roughness = 0.05;
    globeMat.metalness = 0.1;
    globeMat.clearcoat = 1.0;
    globeMat.depthWrite = true;
  }
};
