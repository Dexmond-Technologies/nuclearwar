// GRAPHIC_FILES/GLOBE_SKINS/5/skin.js

window.applySkin_5 = function(skin) {
  // ----------------------------------------------------------------
  // GREEN SKIN (Index 5)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    // greenGlobeMat is applied directly to the mesh in game.html logic

    // Clean up realism maps if exiting REAL skin
    globeMat.specularMap = null;
    globeMat.normalMap = null;
    
    if (window.greenMountainsGroup) {
      window.greenMountainsGroup.scale.set(1, 1.0 / 3.0, 1);
    }
    window.scene.fog = new THREE.FogExp2(0x0b290b, 0.05);
  }
};
