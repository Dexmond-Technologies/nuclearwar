// GRAPHIC_FILES/GLOBE_SKINS/4/skin.js
window['applySkin_4'] = function(skin) {
  // ----------------------------------------------------------------
  // GREEN SKIN (Index 4)
  // ----------------------------------------------------------------
  
  if (typeof window.atmosphereGroup !== 'undefined') {
    window.atmosphereGroup.visible = false;
  }

  if (typeof globeMat !== 'undefined') {
    // greenGlobeMat is applied directly to the mesh in game.html logic

    // Clean up realism maps if exiting REAL skin
    globeMat.specularMap = null;
    globeMat.normalMap = null;
    globeMat.bumpMap = null;
    globeMat.roughnessMap = null;
    globeMat.metalnessMap = null;
    
    if (window.greenMountainsGroup) {
      window.greenMountainsGroup.scale.set(1, 1.0 / 3.0, 1);
    }
    // High density dark green fog for visibility and ambiance
    window.scene.fog = new THREE.FogExp2(0x0b290b, 0.05);
  }
};
