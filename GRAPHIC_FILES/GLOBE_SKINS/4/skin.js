// GRAPHIC_FILES/GLOBE_SKINS/4/skin.js

window.applySkin_4 = function(skin) {
  // ----------------------------------------------------------------
  // CYBER SKIN (Index 4)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    globeMat.transmission = 0.0; // Turn off glass for cyber
    globeMat.emissive.setHex(0x001144); // Further darkened emissive blue
    
    // Apply the high-density grid texture map
    globeMat.map = window.cyberGridTex;
    globeMat.emissiveMap = window.cyberGridTex;
    
    // Solid layer
    globeMat.transparent = false; 
    globeMat.opacity = 1.0; 
    globeMat.depthWrite = true; 
    
    globeMat.wireframe = false;
  }

  // Toggle CYBER solid core layer
  if (typeof window.cyberBaseMesh !== 'undefined') {
    window.cyberBaseMesh.visible = true;
  }
};
