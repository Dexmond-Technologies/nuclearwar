// GRAPHIC_FILES/GLOBE_SKINS/1/skin.js

window.applySkin_1 = function(skin) {
  // ----------------------------------------------------------------
  // BLK SKIN (Index 1)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    // 8-Ball Highly Polished Black Aesthetic
    globeMat.color.setHex(0x0c0c0c); // Deep solid black
    globeMat.emissive.setHex(0x000000);
    globeMat.map = null; // Remove standard earth texture for pure pool ball look
    globeMat.emissiveMap = null;
    globeMat.specular.setHex(0xaaaaaa); // Brighter specular reflection
    globeMat.shininess = 60; // Sharper reflection gloss
    globeMat.wireframe = false;
    
    // Near-opaque shiny layer (90% per user request)
    globeMat.transparent = true;
    globeMat.opacity = 0.9;
    globeMat.transmission = 0.0; // Disable glassy transmission illusion
    globeMat.ior = 1.0;          // Reset Index of Refraction to disable volume bending
    globeMat.thickness = 0.0;    // Reset glass volume thickness
    globeMat.specularIntensity = 1.0; 
    globeMat.roughness = 0.0;    // Extremely smooth pool ball surface
    globeMat.metalness = 0.2;
    globeMat.clearcoat = 1.0;
    globeMat.clearcoatRoughness = 0.0;
    globeMat.depthWrite = true;
  }
};
