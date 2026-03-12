// =====================================================================
// UI HELPERS
// =====================================================================
function setLog(msg){ 
  document.getElementById('log').textContent=msg;
  if (!msg) return;

  const isExcluded = msg.startsWith('⟳') || msg.startsWith('✓ ') || msg.startsWith('⚙') || msg.startsWith('LOADING');
  const isAI = msg.includes('RAINCLAUDE') || msg.includes('SATELLITE RECONNAISSANCE SCAN');

  if (!isExcluded) {
    if (isAI) {
      const aiPanel = document.getElementById('d1-reasoning');
      if (aiPanel) {
        const entry = document.createElement('div');
        entry.textContent = '> ' + msg;
        if (msg.includes('SATELLITE')) entry.style.color = '#ffaa00';
        else if (msg.includes('NUCLEAR')) entry.style.color = '#f24';
        aiPanel.appendChild(entry);
        while (aiPanel.children.length > 20) aiPanel.removeChild(aiPanel.firstChild);
        aiPanel.scrollTop = aiPanel.scrollHeight;
      }
    } else {
      const humanPanel = document.getElementById('d0-reasoning');
      if (humanPanel) {
        const entry = document.createElement('div');
        entry.textContent = '> ' + msg;
        // Color code by action type
        if (msg.includes('CONQUERED') || msg.includes('seizes') || msg.includes('nuclear')) entry.style.color = '#0f8';
        else if (msg.includes('casualties') || msg.includes('NUCLEAR')) entry.style.color = '#fa0';
        else if (msg.includes('☢') || msg.includes('NUKE')) entry.style.color = '#f24';
        humanPanel.appendChild(entry);
        // Keep only last 20 entries
        while (humanPanel.children.length > 20) humanPanel.removeChild(humanPanel.firstChild);
        humanPanel.scrollTop = humanPanel.scrollHeight;
      }
    }
  }
}

function refreshBorder(iso) {
  const g=countryBorders[iso]; if(!g) return;
  const c=GS.countries[iso]; if(!c) return;
  const col=getOwnerColor(c.owner);
  g.traverse(obj=>{ if(obj.isLine) obj.material.color.set(col.int); });
}

// Troop input dialog
let _troopCb=null;
function showTroopInput(min,max,label,cb) {
  if(max<min){cb(min);return;}
  document.getElementById('troop-label').textContent=label;
  const slider=document.getElementById('troop-slider');
  const valEl=document.getElementById('troop-val');
  slider.min=min; slider.max=max; slider.value=min; valEl.textContent=formatTroops(min);
  slider.oninput=()=>valEl.textContent=formatTroops(parseInt(slider.value));
  _troopCb=cb;
  document.getElementById('troop-inp').classList.add('show');
}
document.getElementById('troop-ok').onclick=()=>{
  const v=parseInt(document.getElementById('troop-slider').value);
  document.getElementById('troop-inp').classList.remove('show');
  if(_troopCb) _troopCb(v);
};
document.getElementById('troop-cancel').onclick=()=>{
  document.getElementById('troop-inp').classList.remove('show');
};

// Dice result display
let _diceCb=null;
function showDiceResult(fromName,toName,aRolls,dRolls,atkLoss,defLoss,cb) {
  SFX.playDice();
  const panel=document.getElementById('dice-panel');
  panel.classList.add('show');
  document.getElementById('dice-from-to').textContent=`${fromName} → ${toName}`;
  document.getElementById('atk-dice').innerHTML=aRolls.map(n=>`<div class="die atk">${n}</div>`).join('');
  document.getElementById('def-dice').innerHTML=dRolls.map(n=>`<div class="die def">${n}</div>`).join('');
  const res=[]; if(atkLoss) res.push(`Attacker loses ${(atkLoss * 10000).toLocaleString()}`); if(defLoss) res.push(`Defender loses ${(defLoss * 10000).toLocaleString()}`);
  document.getElementById('dice-result').innerHTML=res.join(' · ');
  _diceCb=cb;
}
document.getElementById('dice-ok').onclick=()=>{
  document.getElementById('dice-panel').classList.remove('show');
  if(_diceCb) _diceCb();
};

// =====================================================================
// WIN / ALIVE CHECK
// =====================================================================
function checkPlayerAlive() {
  GS.players.forEach((p,i)=>{
    const owns=Object.values(GS.countries).filter(c=>c.owner===i).length;
    p.alive=owns>0;
  });
}

function checkWin() {
  const alive=GS.players.filter(p=>p.alive);
  if(alive.length===1){
    const w=alive[0];
    const go=document.getElementById('gameover');
    const gt=document.getElementById('go-title');
    gt.textContent=`${w.color.name} — ${w.name} WINS`;
    gt.style.color=w.color.hex;
    go.classList.add('show');
  }
}

// =====================================================================
// 3D MISSILE + EXPLOSION + FAKE VISUALS
// =====================================================================
const missiles3D=[], explosions3D=[], fakeTroops3D=[], fakeJets3D=[], squadrons3D=[], floatingTexts3D=[];

function slerp3D(a,b,t){
  const dot=Math.max(-1,Math.min(1,a.dot(b)));
  const om=Math.acos(dot); if(Math.abs(om)<.0001)return a.clone().lerp(b,t);
  const s=Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1-t)*om)/s).addScaledVector(b,Math.sin(t*om)/s);
}

function launchMissile3D(fromIso, toIso, col) {
  if (window.currentSkinIndex === 2 || window.currentSkinIndex === 3 || window.currentSkinIndex === 4 || window.currentSkinIndex === 5 || window.currentSkinIndex === 6) return;
  SFX.playLaunch();
  const fc=countryData[fromIso], tc=countryData[toIso];
  if(!fc||!tc) return;
  const sd=ll2v(fc.lat,fc.lon,1).normalize(), ed=ll2v(tc.lat,tc.lon,1).normalize();
  const group = new THREE.Group();

  // === Rocket body: elongated glowing capsule ===
  const bodyGeo = new THREE.ConeGeometry(.006, .04, 6);
  const bodyMat = new THREE.MeshBasicMaterial({color:0xffffff});
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // === Glow halo around rocket head ===
  const glowGeo = new THREE.SphereGeometry(.018, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:.5});
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  // === Exhaust plume: cone trailing behind ===
  const plumeGeo = new THREE.ConeGeometry(.004, .035, 5);
  const plumeMat = new THREE.MeshBasicMaterial({color:0xff6600, transparent:true, opacity:.7});
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  group.add(plume);

  // Trail line material
  const trailMat = new THREE.LineBasicMaterial({color:col, transparent:true, opacity:.85});
  const innerTrailMat = new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:.4});

  scene.add(group);
  missiles3D.push({
    sd, ed, progress:0, speed:.55, group,
    body, glow, plume, trailMat, innerTrailMat,
    trailLine:null, innerTrailLine:null,
    col, toIso, time:0
  });
}

function spawnFakeTroops() {
  if (window.currentSkinIndex === 6) return; // Completely disabled on WTR Skin
  const count = Math.floor(Math.random() * 4) + 4; // 4 to 7
  const isos = Object.keys(countryData);
  if (isos.length < 2) return;
  for (let i = 0; i < count; i++) {
    const fromIso = isos[Math.floor(Math.random() * isos.length)];
    const toIso = isos[Math.floor(Math.random() * isos.length)];
    if (fromIso === toIso) continue;
    const cd1 = countryData[fromIso];
    const cd2 = countryData[toIso];
    if (!cd1 || !cd2) continue;

    const amt = (Math.floor(Math.random() * 10) + 3) * 1000;
    const colHex = getOwnerColor(GS.countries[fromIso]?.owner || 0).hex;
    const tex = troopTexture(formatTroops(amt), colHex);
    const mat = new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true,opacity:0.85});
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(.12,.06,1);
    
    // Convert lat/lon to spherical vectors
    const sd = ll2v(cd1.lat, cd1.lon, 1).normalize();
    const ed = ll2v(cd2.lat, cd2.lon, 1).normalize();
    
    const group = new THREE.Group();
    group.add(sprite);
    scene.add(group);
    
    fakeTroops3D.push({
      group, sprite, sd, ed,
      progress: 0,
      speed: Math.random() * 0.3 + 0.2 // slightly slower than missiles
    });
  }
}

function spawnFakeJets() {
  if (window.currentSkinIndex === 5 || window.currentSkinIndex === 4 || window.currentSkinIndex === 6) return; // Completely disabled on BLK, CYBER, and WTR Skins
  const count = Math.floor(Math.random() * 3) + 4; // 4 to 6 jets
  const isos = Object.keys(countryData);
  if (isos.length < 2) return;
  for (let i = 0; i < count; i++) {
    const fromIso = isos[Math.floor(Math.random() * isos.length)];
    const toIso = isos[Math.floor(Math.random() * isos.length)];
    if (fromIso === toIso) continue;
    const cd1 = countryData[fromIso];
    const cd2 = countryData[toIso];
    if (!cd1 || !cd2) continue;

    const colHex = getOwnerColor(GS.countries[fromIso]?.owner || 0).hex;
    
    // Use the existing neon jet canvas
    const texJet = new THREE.CanvasTexture(createJetCanvas());
    const bodyMat = new THREE.SpriteMaterial({map: texJet, color: colHex, transparent:true, depthTest:true});
    const body = new THREE.Sprite(bodyMat);
    body.scale.set(.08, .08, 1);
    
    // Convert lat/lon to spherical vectors
    const sd = ll2v(cd1.lat, cd1.lon, 1).normalize();
    const ed = ll2v(cd2.lat, cd2.lon, 1).normalize();
    
    const trailMat = new THREE.LineBasicMaterial({color:0xdddddd, transparent:true, opacity:0.3}); // Steam trail
    
    const group = new THREE.Group();
    group.add(body);
    scene.add(group);
    
    fakeJets3D.push({
      group, body, trailMat, sd, ed,
      progress: 0,
      trailLine: null,
      speed: Math.random() * 0.4 + 0.25 
    });
  }
}

function spawnSquadron() {
  if (window.currentSkinIndex === 5 || window.currentSkinIndex === 4 || window.currentSkinIndex === 6) return; // No squadrons on BLK, CYBER or WTR skin

  const isos = Object.keys(countryData);
  if (isos.length < 2) return;
  
  const fromIso = isos[Math.floor(Math.random() * isos.length)];
  const toIso = isos[Math.floor(Math.random() * isos.length)];
  if (fromIso === toIso) return;
  
  const cd1 = countryData[fromIso];
  const cd2 = countryData[toIso];
  if (!cd1 || !cd2) return;

  const group = new THREE.Group();
  scene.add(group);

  const colHex = "#111111"; // Black jets
  const texJet = new THREE.CanvasTexture(createJetCanvas());
  const trailMat = new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.9}); // Bright white trails

  // 1 leader, 3 left wingmen, 3 right wingmen
  const formation = [
    { offsetRight: 0, offsetBack: 0 },
    { offsetRight: -0.015, offsetBack: 0.02 },
    { offsetRight: 0.015, offsetBack: 0.02 },
    { offsetRight: -0.03, offsetBack: 0.04 },
    { offsetRight: 0.03, offsetBack: 0.04 },
    { offsetRight: -0.045, offsetBack: 0.06 },
    { offsetRight: 0.045, offsetBack: 0.06 },
  ];

  const jets = formation.map(f => {
    const bodyMat = new THREE.SpriteMaterial({map: texJet, color: colHex, transparent:true, depthTest:true});
    const body = new THREE.Sprite(bodyMat);
    body.scale.set(.08, .08, 1);
    group.add(body);
    return { body, offsetRight: f.offsetRight, offsetBack: f.offsetBack, trailLine: null, trailPts: [] };
  });
  
  const sd = ll2v(cd1.lat, cd1.lon, 1).normalize();
  const ed = ll2v(cd2.lat, cd2.lon, 1).normalize();

  squadrons3D.push({
    group, jets, trailMat, sd, ed,
    progress: 0,
    speed: Math.random() * 0.2 + 0.2
  });
}

function spawnExplosion3D(lat,lon,col){
  if(window.currentSkinIndex === 5 || window.currentSkinIndex === 4) return;
  if(lat===undefined||lon===undefined) return;
  SFX.playExplosion();
  const c=ll2v(lat,lon,GLOBE_R+.003);
  const up=c.clone().normalize();
  let t1=new THREE.Vector3(-up.z,0,up.x);
  if(t1.length()<.001) t1=new THREE.Vector3(0,up.z,-up.y);
  t1.normalize();
  const t2=new THREE.Vector3().crossVectors(up,t1);
  const rings=[];
  for(let r=0;r<3;r++){
    const pts=Array.from({length:65},(_,i)=>{
      const a=(i/64)*Math.PI*2;
      return c.clone().addScaledVector(t1,Math.cos(a)*.001).addScaledVector(t2,Math.sin(a)*.001);
    });
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const mat=new THREE.LineBasicMaterial({color:0xff4400,transparent:true,opacity:1}); // fiery red-orange rings
    const ring=new THREE.Line(geo,mat);
    scene.add(ring);
    rings.push({ring,mat,pts,t1,t2,c,delay:r*.12});
  }
  const flashGeo=new THREE.SphereGeometry(.01125,12,12); // smaller explosion (half size)
  const flashMat=new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:1}); // bright fire yellow/orange
  const flash=new THREE.Mesh(flashGeo,flashMat);
  flash.position.copy(c); scene.add(flash);
  explosions3D.push({rings,flash,flashMat,life:1.0, maxLife:1.0, maxRadius:0.012, flashGrowth:2.4}); // Reduced 50%
}

function spawnFloatingText3D(lat, lon, text, colorHex) {
  if (typeof scene === 'undefined') return;
  const pos = ll2v(lat, lon, GLOBE_R + 0.1);
  
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  
  ctx.clearRect(0, 0, 256, 128);
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Shadow/Glow
  ctx.shadowColor = '#' + colorHex.toString(16).padStart(6, '0');
  ctx.shadowBlur = 8;
  
  // Draw stroke
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, 128, 64);
  
  // Draw text
  ctx.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
  ctx.fillText(text, 128, 64);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex, color: 0xffffff, transparent: true, depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  
  sprite.position.copy(pos);
  sprite.scale.set(0.3, 0.15, 1);
  
  const _s = window.SKINS && window.SKINS[window.currentSkinIndex];
  sprite.visible = !(_s && (_s.cleanGlobe || _s.hideTroops));
  
  scene.add(sprite);
  floatingTexts3D.push({
    sprite: sprite,
    pos: pos.clone(),
    dir: pos.clone().normalize(),
    life: 2.5,
    maxLife: 2.5
  });
}

// =====================================================================
// VISUAL EFFECTS FOR MEGA BOMB
// =====================================================================
function spawnMegaBombExplosion3D(lat, lon, col) {
  if (window.currentSkinIndex === 5 || window.currentSkinIndex === 4) return;
  if (lat === undefined || lon === undefined) return;
  SFX.playExplosion();
  const c = ll2v(lat, lon, GLOBE_R + .003);
  const up = c.clone().normalize();
  let t1 = new THREE.Vector3(-up.z, 0, up.x);
  if (t1.length() < .001) t1 = new THREE.Vector3(0, up.z, -up.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1);
  const rings = [];
  
  // Outer rings
  for (let r = 0; r < 5; r++) {
    const pts = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return c.clone().addScaledVector(t1, Math.cos(a) * .005).addScaledVector(t2, Math.sin(a) * .005); // 5x bigger radius
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    let color = 0xff0000; // Red
    if (r % 3 === 1) color = 0xffff00; // Yellow
    if (r % 3 === 2) color = 0x0000ff; // Blue
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1, linewidth: 3 });
    const ring = new THREE.Line(geo, mat);
    scene.add(ring);
    rings.push({ ring, mat, pts, t1, t2, c, delay: r * .08 });
  }

  // Inner huge flash
  const flashGeo = new THREE.SphereGeometry(.055, 16, 16); // 5x bigger sphere (reduced 50%)
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(c); scene.add(flash);
  explosions3D.push({ rings, flash, flashMat, life: 1.5, maxLife:1.5, maxRadius:0.060, flashGrowth:2.4 }); // last a bit longer, reduced 50%
}

function scheduleRandomMegaBomb() {
  const minDelay = 1 * 60 * 1000; // 1 min (was 2)
  const maxDelay = 2 * 60 * 1000; // 2 min (was 4)
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  
  setTimeout(() => {
    const isos = Object.keys(countryData);
    if (isos.length > 0) {
      const targetIso = isos[Math.floor(Math.random() * isos.length)];
      const cd = countryData[targetIso];
      if (cd && cd.lat !== undefined && cd.lon !== undefined) {
        // Red, Yellow, Blue alternating ring colors are handled in the spawn function
        spawnMegaBombExplosion3D(cd.lat, cd.lon);
        triggerRedAlert(`BOMB EXPLODED [ LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)} ]`);
        setLog(`☢ MEGA BOMB EXPLODED at ${cd.name} [LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)}]`);
      }
    }
    // Schedule the next one ad infinitum
    scheduleRandomMegaBomb();
  }, delay);
}

// =====================================================================
// VISUAL EFFECTS FOR EMP AND GROUND BOMB
// =====================================================================
function spawnEMP3D(lat, lon) {
  if (window.currentSkinIndex === 5) return;
  if (lat === undefined || lon === undefined) return;
  SFX.playExplosion(); // Consider a custom EMP sound if available
  const c = ll2v(lat, lon, GLOBE_R + .003);
  const up = c.clone().normalize();
  let t1 = new THREE.Vector3(-up.z, 0, up.x);
  if (t1.length() < .001) t1 = new THREE.Vector3(0, up.z, -up.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1);
  const rings = [];
  
  // Outer rings (Green EMP wave)
  for (let r = 0; r < 4; r++) {
    const pts = Array.from({ length: 90 }, (_, i) => {
      const a = (i / 89) * Math.PI * 2;
      return c.clone().addScaledVector(t1, Math.cos(a) * .007).addScaledVector(t2, Math.sin(a) * .007);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    let color = 0x00ff00; // Bright Green
    if (r % 2 === 1) color = 0x00cc00; // Darker Green
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8, linewidth: 4 });
    const ring = new THREE.Line(geo, mat);
    scene.add(ring);
    rings.push({ ring, mat, pts, t1, t2, c, delay: r * .05 });
  }

  // Inner huge flash
  const flashGeo = new THREE.SphereGeometry(.05, 16, 16); // Reduced to 1/3 size
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.4 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(c); scene.add(flash);
  explosions3D.push({ rings, flash, flashMat, life: 1.2, maxLife:1.2, maxRadius:0.060, flashGrowth:2.0, maxRingOpacity:0.4, maxFlashOpacity:0.4 }); // Reduced radius to 1/3 (0.180 -> 0.060)
}

function scheduleRandomEMP() {
  const minDelay = 30 * 1000; // 30s (was 60)
  const maxDelay = 60 * 1000; // 60s (was 120)
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  
  setTimeout(() => {
    const isos = Object.keys(countryData);
    if (isos.length > 0) {
      const targetIso = isos[Math.floor(Math.random() * isos.length)];
      const cd = countryData[targetIso];
      if (cd && cd.lat !== undefined && cd.lon !== undefined) {
        spawnEMP3D(cd.lat, cd.lon);
        triggerRedAlert(`EMP DETECTED [ LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)} ]`);
        setLog(`⚡ EMP DETECTED at ${cd.name} [LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)}]`);
      }
    }
    // Schedule the next one automatically
    scheduleRandomEMP();
  }, delay);
}

function spawnGroundBomb3D(lat, lon) {
  if (window.currentSkinIndex === 5) return;
  if (lat === undefined || lon === undefined) return;
  SFX.playExplosion();
  const c = ll2v(lat, lon, GLOBE_R + .003);
  const up = c.clone().normalize();
  let t1 = new THREE.Vector3(-up.z, 0, up.x);
  if (t1.length() < .001) t1 = new THREE.Vector3(0, up.z, -up.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1);
  const rings = [];
  
  // Outer rings (Blue Ground Bomb wave)
  for (let r = 0; r < 5; r++) {
    const pts = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return c.clone().addScaledVector(t1, Math.cos(a) * .004).addScaledVector(t2, Math.sin(a) * .004); // Slightly smaller than Mega Bomb
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    let color = 0x0000ff; // Bright Blue
    if (r % 2 === 1) color = 0x00aaff; // Light Blue
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1, linewidth: 2 });
    const ring = new THREE.Line(geo, mat);
    scene.add(ring);
    rings.push({ ring, mat, pts, t1, t2, c, delay: r * .08 });
  }

  // Inner huge flash
  const flashGeo = new THREE.SphereGeometry(.045, 16, 16); // Reduced to half size
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(c); scene.add(flash);
  explosions3D.push({ rings, flash, flashMat, life: 1.4, maxLife:1.4, maxRadius:0.075, flashGrowth:2.5, maxRingOpacity:0.4, maxFlashOpacity:0.4 }); // Reduced radius to half (0.150 -> 0.075)
}

function scheduleRandomGroundBomb() {
  const minDelay = 30 * 1000; // 30s (was 60s)
  const maxDelay = 60 * 1000; // 60s (was 120s)
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  
  setTimeout(() => {
    const isos = Object.keys(countryData);
    if (isos.length > 0) {
      const targetIso = isos[Math.floor(Math.random() * isos.length)];
      const cd = countryData[targetIso];
      if (cd && cd.lat !== undefined && cd.lon !== undefined) {
        spawnGroundBomb3D(cd.lat, cd.lon);
        triggerRedAlert(`GROUND BOMB DETECTED [ LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)} ]`);
        setLog(`💥 GROUND BOMB DETECTED at ${cd.name} [LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)}]`);
      }
    }
    // Schedule the next one automatically
    scheduleRandomGroundBomb();
  }, delay);
}

function spawnSonarSweep3D(lat, lon) {
  if (lat === undefined || lon === undefined) return;
  SFX.playClick(); // Use an appropriate radar/ping sound
  const c = ll2v(lat, lon, GLOBE_R + .003);
  const up = c.clone().normalize();
  let t1 = new THREE.Vector3(-up.z, 0, up.x);
  if (t1.length() < .001) t1 = new THREE.Vector3(0, up.z, -up.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1);
  const rings = [];
  
  // Concentric Sonar Rings
  for (let r = 0; r < 3; r++) {
    const pts = Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      return c.clone().addScaledVector(t1, Math.cos(a) * .006).addScaledVector(t2, Math.sin(a) * .006);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const color = r === 1 ? 0x00aaff : 0x00ffff; // Cyan/Blue alternating
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9, linewidth: 2 });
    const ring = new THREE.Line(geo, mat);
    scene.add(ring);
    rings.push({ ring, mat, pts, t1, t2, c, delay: r * .15 }); // Slower delay for sonar pacing
  }

  // Very subtle inner flash
  const flashGeo = new THREE.SphereGeometry(.04, 16, 16); 
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(c); scene.add(flash);
  // Sonar sweep pushes further context (huge radius, long duration)
  explosions3D.push({ rings, flash, flashMat, life: 2.0, maxLife:2.0, maxRadius:0.250, flashGrowth:2.0 }); 
}

function scheduleRandomSonarSweep() {
  const delay = 60 * 1000; // Exact 60 seconds
  
  setTimeout(() => {
    const isos = Object.keys(countryData);
    if (isos.length > 0) {
      const targetIso = isos[Math.floor(Math.random() * isos.length)];
      const cd = countryData[targetIso];
      if (cd && cd.lat !== undefined && cd.lon !== undefined) {
        spawnSonarSweep3D(cd.lat, cd.lon);
        
        const now = Date.now();
        if (!window.lastSatReconAlert || now - window.lastSatReconAlert > 60000) {
          window.lastSatReconAlert = now;
          triggerRedAlert(`SATELLITE RECON DETECTED [ LAT: ${cd.lat.toFixed(2)}, LON: ${cd.lon.toFixed(2)} ]`);
        }
        setLog(`📡 SATELLITE RECONNAISSANCE SCAN over ${cd.name}`);
      }
    }
    // Schedule the next one automatically
    scheduleRandomSonarSweep();
  }, delay);
}

// =====================================================================
// VISUAL EFFECTS FOR NAVAL PINGS AND CYBER GLITCH
// =====================================================================
const cyberGlitches = [];

function spawnCyberGlitch(iso) {
  const g = countryBorders[iso];
  if (!g) return;
  
  const c = GS.countries[iso];
  const origColor = c ? getOwnerColor(c.owner).int : 0x445566; // Fallback to neutral INT
  
  SFX.playSelect(); // A glitchy sound would be better if we had one
  
  // Push glitch to array to be animated
  cyberGlitches.push({ iso, mesh: g, origColor, life: 3.0 });
}

function spawnNavalPing3D(lat, lon) {
  if (lat === undefined || lon === undefined) return;
  const c = ll2v(lat, lon, GLOBE_R + .002);
  const up = c.clone().normalize();
  let t1 = new THREE.Vector3(-up.z, 0, up.x);
  if (t1.length() < .001) t1 = new THREE.Vector3(0, up.z, -up.y);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1);
  const rings = [];
  
  for (let r = 0; r < 2; r++) {
    const pts = Array.from({ length: 45 }, (_, i) => {
      const a = (i / 44) * Math.PI * 2;
      return c.clone().addScaledVector(t1, Math.cos(a) * .003).addScaledVector(t2, Math.sin(a) * .003);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.6, linewidth: 1 });
    const ring = new THREE.Line(geo, mat);
    scene.add(ring);
    rings.push({ ring, mat, pts, t1, t2, c, delay: r * .25 }); 
  }

  const flashGeo = new THREE.SphereGeometry(.015, 12, 12); 
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.3 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(c); scene.add(flash);
  
  explosions3D.push({ rings, flash, flashMat, life: 2.5, maxLife:2.5, maxRadius:0.045, flashGrowth:1.0, maxRingOpacity:0.6, maxFlashOpacity:0.3 }); 
}

function scheduleRandomNavalPing() {
  const delay = 30 * 1000; // Exactly 30 seconds
  
  setTimeout(() => {
    let spawnedCount = 0;
    
    for (let p = 0; p < 23; p++) {
      let valid = false;
      let attempts = 0;
      let lat, lon;
      
      while (!valid && attempts < 50) { 
        lat = (Math.asin(Math.random() * 2 - 1) * 180 / Math.PI) * 0.85; 
        lon = Math.random() * 360 - 180;
        valid = true;
        
        for (const iso in countryData) {
          const cd = countryData[iso];
          if (cd && cd.lat !== undefined && cd.lon !== undefined) {
            const dLat = Math.abs(lat - cd.lat);
            let dLon = Math.abs(lon - cd.lon);
            if (dLon > 180) dLon = 360 - dLon; // Handle wrap-around
            if (Math.sqrt(dLat*dLat + dLon*dLon) < 8) { 
              valid = false; 
              break;
            }
          }
        }
        attempts++;
      }

      if (valid) {
        spawnNavalPing3D(lat, lon);
        spawnedCount++;
      }
    }
    
    if (spawnedCount > 0 && Math.random() > 0.5) {
      setLog(`🌊 ${spawnedCount} UNIDENTIFIED SUBMERGED CONTACTS IN DEEP WATERS`);
    }
    
    scheduleRandomNavalPing();
  }, delay);
}

// =====================================================================
// VISUAL EFFECTS FOR SPACE ROCKET LAUNCHES
// =====================================================================
function createSpaceRocketCanvas() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  
  ctx.translate(64, 64);
  // Removed Math.PI/4 rotation so it naturally points UP
  
  // Outer glow for realism
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 12;
  
  // Base color: bright white
  ctx.fillStyle = '#ffffff';

  // MAIN CORE FLUID SHAPE
  ctx.beginPath();
  // Nose Cone (Payload Fairing)
  ctx.moveTo(0, -45); 
  ctx.quadraticCurveTo(8, -25, 8, -10); // Smooth flare
  // Main Body Section
  ctx.lineTo(8, 35);
  // Bottom Base
  ctx.lineTo(-8, 35);
  // Left Side Body
  ctx.lineTo(-8, -10);
  ctx.quadraticCurveTo(-8, -25, 0, -45); // Left nose cone flare
  ctx.fill();

  // LEFT SOLID ROCKET BOOSTER
  ctx.beginPath();
  ctx.moveTo(-9, -5);   // Booster Tip
  ctx.lineTo(-14, 5);   // Booster Flare Out
  ctx.lineTo(-14, 35);  // Booster Bottom Out
  ctx.lineTo(-9, 35);   // Booster Bottom In
  ctx.closePath();
  ctx.fill();

  // RIGHT SOLID ROCKET BOOSTER
  ctx.beginPath();
  ctx.moveTo(9, -5);    // Booster Tip
  ctx.lineTo(14, 5);    // Booster Flare Out
  ctx.lineTo(14, 35);   // Booster Bottom Out
  ctx.lineTo(9, 35);    // Booster Bottom In
  ctx.closePath();
  ctx.fill();
  
  // ENGINE NOZZLES (Main & Boosters) - Optional grey shading
  ctx.fillStyle = '#888888';
  ctx.shadowBlur = 0; // Turn off glow for engines
  
  // Main Engine
  ctx.beginPath();
  ctx.moveTo(-6, 35);
  ctx.lineTo(6, 35);
  ctx.lineTo(8, 40);
  ctx.lineTo(-8, 40);
  ctx.fill();
  
  // Left Booster Nozzle
  ctx.beginPath();
  ctx.moveTo(-13, 35);
  ctx.lineTo(-10, 35);
  ctx.lineTo(-9, 39);
  ctx.lineTo(-14, 39);
  ctx.fill();
  
  // Right Booster Nozzle
  ctx.beginPath();
  ctx.moveTo(10, 35);
  ctx.lineTo(13, 35);
  ctx.lineTo(14, 39);
  ctx.lineTo(9, 39);
  ctx.fill();
  
  return c;
}

function spawnSpaceRocket3D(lat, lon) {
  if (window.currentSkinIndex === 2 || window.currentSkinIndex === 3 || window.currentSkinIndex === 4 || window.currentSkinIndex === 5 || window.currentSkinIndex === 6) return; // No rockets on these skins
  if (lat === undefined || lon === undefined) return;
  const c = ll2v(lat, lon, GLOBE_R + 0.005);
  
  // Basic Rocket Body
  const texJet = new THREE.CanvasTexture(createSpaceRocketCanvas()); // Custom white rocket canvas
  const bodyMat = new THREE.SpriteMaterial({map: texJet, color: 0xffffff, transparent:true, depthTest:true});
  const body = new THREE.Sprite(bodyMat);
  body.scale.set(.06, .06, 1);
  
  const trailMat = new THREE.LineBasicMaterial({color:0xffaa00, transparent:true, opacity:0.8, linewidth: 2}); // Fiery trail
  
  const group = new THREE.Group();
  group.add(body);
  scene.add(group);
  
  // A space rocket's target is essentially the exact same lat/lon, but with a much higher altitude
  // We'll shoot it way out into space (reduced to 5x Globe Radius so its visual speed is slower over the same duration)
  const ed = ll2v(lat, lon, GLOBE_R * 5.0);
  const sd = c.clone();
  
  fakeJets3D.push({
    group, body, trailMat, sd, ed,
    progress: 0,
    trailLine: null,
    trailPts: [],
    speed: 0.05, // 50 percent slower for more screen time
    straight: true // Flag to use linear interpolation instead of spherical arc
  });
  
  // Optional: Add a little launch flash at the coordinate
  spawnExplosion3D(lat, lon, 0xffaa00);
}

function scheduleRandomSpaceRocket() {
  const delay = 120 * 1000; // Exact 10 seconds (was 3 minutes)
  
  setTimeout(() => {
    const spaceFaringIsos = Object.keys(countryData);
    if (spaceFaringIsos.length > 0) {
      const targetIso = spaceFaringIsos[Math.floor(Math.random() * spaceFaringIsos.length)];
      const cd = countryData[targetIso];
      if (cd && cd.lat !== undefined && cd.lon !== undefined) {
        spawnSpaceRocket3D(cd.lat, cd.lon);
        setLog(`🚀 SPACE AGENCY LAUNCH DETECTED FROM ${cd.name}`);
        triggerRedAlert(`${cd.name.toUpperCase()} JUST LAUNCHED SPACE ROCKET`);
      }
    }
    scheduleRandomSpaceRocket();
  }, delay);
}

// =====================================================================
// VISUAL EFFECTS FOR AI
// =====================================================================
let lastRedAlertTime = 0;
function triggerRedAlert(msg, force=false) {
  const now = Date.now();
  if (!force && now - lastRedAlertTime < 20000) return;
  lastRedAlertTime = now;
  const el = document.getElementById('news-alert');
  const txt = document.getElementById('na-text');
  const label = document.getElementById('na-label');
  
  if (typeof newsTimeout !== 'undefined' && newsTimeout) clearTimeout(newsTimeout);

  el.classList.remove('hide');
  el.classList.remove('show');
  void el.offsetWidth; // trigger reflow to reset animation
  
  label.style.color = '#000000';
  txt.style.color = '#000000';
  txt.textContent = msg;
  el.classList.add('show');
  
  newsTimeout = setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hide'); // Add hide animation class
    setTimeout(()=> { label.style.color=''; txt.style.color=''; el.classList.remove('hide'); }, 500);
  }, 4000);
}

function pulseRedCountry(iso) {
  const g=countryBorders[iso]; if(!g) return;
  let t = 0;
  const iv = setInterval(()=>{
    t += 0.2;
    g.traverse(obj=>{ if(obj.isLine) obj.material.color.set(t%1 < 0.5 ? 0xff0000 : 0x550000); });
    if(t > 4) { clearInterval(iv); refreshBorder(iso); }
  }, 100);
}

function pulseGreenCountry(iso) {
  const g=countryBorders[iso]; if(!g) return;
  let t = 0;
  const iv = setInterval(()=>{
    t += 0.2;
    g.traverse(obj=>{ if(obj.isLine) obj.material.color.set(t%1 < 0.5 ? 0x00ff00 : 0x005500); });
    if(t > 4) { clearInterval(iv); refreshBorder(iso); }
  }, 100);
}

function cyberFlashingEffect() {
  if (window.currentSkinIndex !== 6 || typeof countryBorders === 'undefined') return;
  const isos = Object.keys(countryBorders);
  if (isos.length === 0) return;
  
  const count = Math.floor(Math.random() * 4) + 2; // 2 to 5 random countries
  const flashColor = 0x00ff00; // Cyber Green
  
  for (let i = 0; i < count; i++) {
    const randomIso = isos[Math.floor(Math.random() * isos.length)];
    const g = countryBorders[randomIso];
    if (!g) continue;
    const c = GS.countries[randomIso];
    if (!c) continue;
    
    let col = getOwnerColor(c.owner);
    // If neutral or invalid, default to generic grey
    const origColor = col ? col.int : 0x444444; 
    
    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      // Stop flashing if we switch away from black skin
      if (window.currentSkinIndex !== 6) {
        clearInterval(iv);
        refreshBorder(randomIso);
        return;
      }
      
      // Toggle between original color and flash color
      g.traverse(obj => { 
        if (obj.isLine) {
          obj.material.color.set(ticks % 2 === 0 ? flashColor : origColor); 
        }
      });
      
      // 120 ticks * 250ms = 30 seconds duration
      if (ticks >= 120) { 
        clearInterval(iv); 
        refreshBorder(randomIso); 
      }
    }, 250);
  }
}

// Flash 2-5 random country borders every 30 seconds on black skin for cyber effect
setInterval(() => {
  cyberFlashingEffect();
}, 30000);

function globeFlickerEffect() {
  const origColor = globeMesh.material.color.getHex();
  let count = 0;
  const iv = setInterval(()=>{
    count++;
    globeMesh.material.color.setHex(count%2===0 ? origColor : 0x550000);
    if(count > 8) { clearInterval(iv); globeMesh.material.color.setHex(origColor); }
  }, 150);
}

// =====================================================================
// AI OPPONENT
// =====================================================================
async function aiTurn() {
  const pi = GS.turn; // Rainclaude = player index 1
  const reasoningPanel = document.getElementById('d1-reasoning');
  if(reasoningPanel) reasoningPanel.innerHTML = '';
  const aiLog = (msg) => { 
    // Local display
    if(reasoningPanel) { 
      reasoningPanel.innerHTML += `<div>> ${msg}</div>`; 
      reasoningPanel.scrollTop = reasoningPanel.scrollHeight; 
    }
    // Broadcast to other players
    if(ws && ws.readyState === 1 && ws_isHost) {
      ws.send(JSON.stringify({type: 'ai_log', msg: msg}));
    }
  };

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const myCountries = Object.entries(GS.countries).filter(([,c])=>c.owner===pi);
  if(!myCountries.length){nextTurn();return;}

  // --- EVOLUTION & ENERGY ---
  aiLog('UPDATING KNOWLEDGE BASE...');
  let ai = GS.AI_STATE;
  
  if(GS.turnCount % 3 === 0) ai.adaptabilityScore += 0.5;
  if(GS.turnCount % 5 === 0) { ai.techLevel++; ai.intelligenceLevel++; }
  if(myCountries.length < 5) ai.aggressionLevel += 0.5;

  ai.threatTier = 1;
  if(ai.techLevel >= 3 || GS.turnCount > 6) ai.threatTier = 2;
  if(ai.techLevel >= 6 || GS.turnCount > 15 || myCountries.length > 30) ai.threatTier = 3;

  ai.energy = Math.min(100, ai.energy + 10 + (ai.threatTier * 5));

  aiLog(`[SYSTEM] Tier: ${ai.threatTier} | Tech: ${ai.techLevel} | Energy: ${ai.energy}%`);
  await wait(800);

  // --- SPECIAL ACTIONS ---
  if (ai.threatTier >= 3 && ai.energy >= 40 && Math.random() < 0.15) {
    ai.energy -= 40;
    const r = Math.random();
    if(r < 0.33) {
      GS.globalMetrics.airTrafficDisabledTurns = 2;
      triggerRedAlert("RAINCLAUDE HACKED AIR TRAFFIC CONTROL - REINFORCEMENTS GROUNDED");
      aiLog("<span style='color:#ff0000'>CRITICAL OP: GROUND ZERO (Air Traffic Offline)</span>");
      globeFlickerEffect();
    } else if (r < 0.66) {
      const targets = Object.entries(GS.countries).filter(([,c])=>c.owner===0 && c.troops>2).sort(([,a],[,b])=>b.troops - a.troops);
      if(targets.length > 0) {
        const tIso = targets[0][0];
        GS.countries[tIso].nuked = 2;
        GS.countries[tIso].troops = Math.max(0, GS.countries[tIso].troops - 4);
        GS.countries[tIso].instabilityLevel = 100;
        triggerRedAlert(`STUXNET-II MELTDOWN IN ${countryData[tIso]?.name.toUpperCase()}`);
        aiLog(`<span style='color:#ff0000'>INFRASTRUCTURE EXTERMINATED IN ${countryData[tIso]?.name.toUpperCase()}</span>`);
        spawnExplosion3D(countryData[tIso]?.lat, countryData[tIso]?.lon, 0x00ff00);
        pulseRedCountry(tIso);
        updateTroopSprite(tIso);
      }
    } else {
      GS.globalMetrics.satelliteDisruptedTurns = 2;
      triggerRedAlert("MILITARY SATELLITE NETWORK COMPROMISED");
      aiLog("<span style='color:#ff0000'>ORBITAL ASSETS DISABLED. HUMANS BLIND.</span>");
      globeFlickerEffect();
    }
    await wait(1200);
  }

  if (ai.threatTier >= 2 && ai.energy >= 25 && Math.random() < 0.25) {
    ai.energy -= 25;
    if(Math.random() < 0.5) {
      GS.globalMetrics.powerGrid = Math.max(0, GS.globalMetrics.powerGrid - 30);
      triggerRedAlert("GLOBAL POWER GRID INTEGRITY COMPROMISED");
      aiLog("<span style='color:#ffaa00'>CYBER: POWER GRID ATTACK SUCCESSFUL</span>");
    } else {
      GS.globalMetrics.economy = Math.max(0, GS.globalMetrics.economy - 30);
      triggerRedAlert("FINANCIAL SECTOR HACKED");
      aiLog("<span style='color:#ffaa00'>CYBER: MARKETS CRASHED</span>");
    }
    globeFlickerEffect();
    await wait(1200);
  }

  const sabotageTargets = Object.entries(GS.countries).filter(([,c])=>c.owner===0 && c.troops>1).sort(([,a],[,b])=>b.troops - a.troops);
  if (ai.energy >= 15 && sabotageTargets.length > 0 && Math.random() < 0.3) {
      ai.energy -= 15;
      const tIso = sabotageTargets[Math.floor(Math.random()*Math.min(3, sabotageTargets.length))][0];
      const damage = Math.min(GS.countries[tIso].troops - 1, Math.floor(1 + (ai.intelligenceLevel / 2)));
      GS.countries[tIso].troops -= damage;
      GS.countries[tIso].instabilityLevel = Math.min(100, (GS.countries[tIso].instabilityLevel||0) + 25);
      aiLog(`<span style='color:#ff8888'>SABOTAGE IN ${countryData[tIso]?.name.toUpperCase()} (-${damage} units)</span>`);
      pulseRedCountry(tIso);
      updateTroopSprite(tIso);
      await wait(800);
  }

  if(GS.players[pi].nukes > 0 && ai.aggressionLevel > 1.5 && Math.random() < 0.2){
    const bigTargets=Object.entries(GS.countries).filter(([,c])=>c.owner===0&&c.troops>4).sort(([,a],[,b])=>b.troops-a.troops);
    if(bigTargets.length){
      const [tIso]=bigTargets[0];
      GS.players[pi].nukes--;
      GS.countries[tIso].troops=Math.max(0,GS.countries[tIso].troops-Math.floor(6+Math.random()*5));
      GS.countries[tIso].nuked=6; // Fix 10
      spawnExplosion3D(countryData[tIso]?.lat,countryData[tIso]?.lon,PLAYER_COLORS[1].int);
      triggerRedAlert("NUCLEAR LAUNCH DETECTED");
      aiLog(`<span style="color:#ffaa00">NUCLEAR LAUNCH: ${countryData[tIso]?.name.toUpperCase()}</span>`);
      setLog(`☢ RAINCLAUDE NUCLEAR WAR on ${countryData[tIso]?.name}!`);
      if(GS.countries[tIso].troops===0){GS.countries[tIso].owner=1;GS.countries[tIso].troops=1;refreshBorder(tIso);}
      updateTroopSprite(tIso);
      await wait(1500);
    }
  }

  // --- REINFORCE ---
  let reinforce = Math.max(3, Math.floor(myCountries.length/3));
  if (GS.globalMetrics.commJamTurns > 0) {
      reinforce = Math.max(1, reinforce - Math.max(1, Math.floor(reinforce * 0.3)));
  }
  const aiInst = myCountries.reduce((sum, [iso, c]) => sum + (c.instabilityLevel || 0), 0) / (myCountries.length || 1);
  if (aiInst > 50) {
      reinforce = Math.max(1, reinforce - Math.max(1, Math.floor(reinforce * 0.2)));
  }
  
  // Fix 8: Split reinforcements across top threatened territories instead of just one
  let threatenedNodes = [];
  
  for(const [iso, c] of myCountries) {
    const cd = countryData[iso]; if(!cd) continue;
    let threat = 0;
    Object.entries(GS.countries).forEach(([,ec])=>{
      if(ec.owner === 0) {
        const dist = Math.abs(ec.lat-(cd.lat||0)) + Math.abs(ec.lon-(cd.lon||0));
        if(dist < 30) threat += ec.troops;
      }
    });
    threatenedNodes.push({iso, threat});
  }
  
  threatenedNodes.sort((a,b) => b.threat - a.threat);
  const targets = threatenedNodes.slice(0, Math.min(3, threatenedNodes.length));
  
  if (targets.length > 0) {
      let rPerNode = Math.floor(reinforce / targets.length);
      let rRemainder = reinforce % targets.length;
      
      for (let i = 0; i < targets.length; i++) {
          const tIso = targets[i].iso;
          const rAmount = rPerNode + (i === 0 ? rRemainder : 0);
          if (rAmount > 0) {
              GS.countries[tIso].troops += rAmount;
              updateTroopSprite(tIso);
              aiLog(`REINFORCE: <b>${countryData[tIso]?.name.toUpperCase()}</b> (+${rAmount})`);
              setLog(`⚙ RAINCLAUDE reinforce +${rAmount} → ${countryData[tIso]?.name}`);
          }
      }
  }
  await wait(800);

  // --- WEIGHTED SCORING ATTACKS ---
  let attacks=0;
  let maxAttacks = Math.floor(2 + (ai.aggressionLevel || 0));
  if (GS.globalMetrics.commJamTurns > 0) {
    maxAttacks = Math.max(1, Math.floor(maxAttacks / 2));
    aiLog(`<span style="color:#ff0000">COMMUNICATION JAM ACTIVE. OPERATIONS LIMITED.</span>`);
  }
  aiLog(`EXECUTING TACTICAL OPS (Max: ${maxAttacks})...`);
  await wait(500);

  let potentialMoves = [];
  for(const [fromIso, fromC] of myCountries) {
    if(fromC.troops < 2) continue;
    const cd = countryData[fromIso]; if(!cd) continue;
    
    Object.entries(GS.countries).forEach(([toIso, toC])=>{
      // INCREASED RANGE: Allow targetting further away to maintain pressure
      if(toC.owner===0 && Math.abs(toC.lat-(cd.lat||0))<40 && Math.abs(toC.lon-(cd.lon||0))<55) {
        // Fix 7: Attack equal strength targets if Aggression is high
        if(fromC.troops > toC.troops || (ai.aggressionLevel > 2 && fromC.troops === toC.troops)) { 
          const score = 10 + ((fromC.troops - toC.troops) * 5) + ((toC.instabilityLevel || 0) * 0.5) + (myCountries.length < 5 ? 20 : 0);
          potentialMoves.push({score, fromIso, toIso, fromC, toC});
        }
      }
    });
  }

  potentialMoves.sort((a,b) => b.score - a.score);

  let activeFrom = new Set();
  for(const move of potentialMoves) {
    if(attacks >= maxAttacks) break;
    if(activeFrom.has(move.fromIso)) continue; 
    if(move.fromC.troops < 2) continue;
    
    aiLog(`ENGAGING: <b>${countryData[move.toIso]?.name.toUpperCase()}</b> (Score: ${move.score.toFixed(0)})`);
    const atkD=Math.min(3,move.fromC.troops-1),defD=Math.min(2,move.toC.troops) + (move.toC.infrastructure >= 5 ? 1 : 0); // Fix 11
    const aR=Array.from({length:atkD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    const dR=Array.from({length:defD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    let al=0,dl=0;
    for(let i=0;i<Math.min(aR.length,dR.length);i++){if(aR[i]>dR[i])dl++;else al++;}
    
    move.fromC.troops-=al; move.toC.troops-=dl;
    
    if(move.toC.troops<=0){
      aiLog(`<span style="color:#fff">SECURED: <b>${countryData[move.toIso]?.name.toUpperCase()}</b></span>`);
      setLog(`⚙ RAINCLAUDE seizes ${countryData[move.toIso]?.name}!`);
      // Fix 9: Move all troops on conquest for faster AI blitzing
      move.toC.owner=1; move.toC.troops=move.fromC.troops-1;
      move.fromC.troops-=move.toC.troops; if(move.fromC.troops<1)move.fromC.troops=1;
      refreshBorder(move.toIso);
    }
    launchMissile3D(move.fromIso,move.toIso,PLAYER_COLORS[1].int);
    updateTroopSprite(move.fromIso); updateTroopSprite(move.toIso);
    activeFrom.add(move.fromIso);
    attacks++;
    
    // DELAY between individual attacks
    await wait(1200);
  }

  aiLog('YIELDING TO HUMAN RESISTANCE.');
  
  checkPlayerAlive();
  updateDashboard();
  setTimeout(()=>{checkWin();if(!document.getElementById('gameover').classList.contains('show'))nextTurn();}, 1500);
}

// =====================================================================
// MULTIPLAYER (WebSocket & Google Auth)
// =====================================================================

function openAdminTerminal() {
    let modal = document.getElementById('admin-terminal-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-terminal-modal';
        modal.style.position = 'absolute';
        modal.style.top = '10%';
        modal.style.left = '10%';
        modal.style.width = '80%';
        modal.style.height = '80%';
        modal.style.background = 'rgba(0, 0, 0, 0.95)';
        modal.style.border = '2px solid #00ff00';
        modal.style.borderRadius = '5px';
        modal.style.padding = '20px';
        modal.style.color = '#00ff00';
        modal.style.fontFamily = '"Courier New", monospace';
        modal.style.zIndex = '999999';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #00ff00; padding-bottom:10px; margin-bottom:10px;">
                <h2 style="margin:0; font-size:24px;">SYSTEM LOG TERMINAL</h2>
                <div style="cursor:pointer; font-weight:bold; color:#ff0000; font-size:20px;" onclick="this.parentElement.parentElement.style.display='none'; document.getElementById('auth-container-flex').style.display='flex'; document.getElementById('dev-unlock-in').value=''; document.getElementById('lobby-auth-status').innerHTML=''; ">[X]</div>
            </div>
            <div id="admin-terminal-content" style="flex-grow:1; overflow-y:auto; font-size:13px; white-space:pre-wrap; text-align:left; padding-right:10px; line-height:1.4;">
                Connecting to database...
            </div>
            <div style="margin-top:10px; text-align:center;">
                <button onclick="if(ws && ws.readyState===1) ws.send(JSON.stringify({type:'get_full_log'}))" style="background:rgba(0,255,0,0.1); border:1px solid #00ff00; color:#00ff00; padding:8px 20px; cursor:pointer; font-family:'Courier New', monospace; font-weight:bold;">REFRESH LOGS</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    document.getElementById('admin-terminal-content').innerText = "Querying PostgreSQL...";

    if (!ws || ws.readyState !== 1) {
        initWS();
        let retries = 0;
        const checkWS = setInterval(() => {
            if (ws && ws.readyState === 1) {
                clearInterval(checkWS);
                ws.send(JSON.stringify({ type: 'get_full_log' }));
            }
            if(++retries > 30) {
               clearInterval(checkWS); 
               document.getElementById('admin-terminal-content').innerText = "ERROR: Could not establish WebSocket connection to backend.";
            }
        }, 100);
    } else {
        ws.send(JSON.stringify({ type: 'get_full_log' }));
    }
}

let ws_isHost = false;

// Global Auth State
let pendingGoogleToken = null;
let pendingSolanaAddress = null; // Stored when Web3Modal connects

// Google Identity Callback
function handleGoogleCredentialResponse(response) {
  pendingGoogleToken = response.credential;
  document.getElementById('lobby-auth-status').innerHTML = "✓ UPLINK AUTHENTICATED. INITIATING DEPLOYMENT...";
  document.querySelector('.g_id_signin').style.display = 'none'; // hide the google button
  joinGlobalWar(); // auto-join immediately
}

function initWS() {
  try { ws=new WebSocket(WS_URL); } catch(e){ setLog('⚠ Multiplayer server not found'); return; }

  ws.onopen = () => {
    // Initial connection handled by server auto-sending state
  };

  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    switch(msg.type){
      case 'mine_click_result': {
          if (msg.mineId !== window.activeMineModalId) break;
          
          // Server computed the math. Sync our UI safely.
          if (!window.d3xDigState[msg.mineId]) window.d3xDigState[msg.mineId] = { clicks: 0 };
          window.d3xDigState[msg.mineId].clicks = msg.clicks;
          
          window.localD3XBalance += msg.netChange;
          if (document.getElementById('cwd-bal')) {
              document.getElementById('cwd-bal').innerText = "| " + window.localD3XBalance.toLocaleString() + " D3X";
          }
          
          updateDigUI(msg.clicks);
          
          if (msg.isJackpot) {
              appendDigLog(`<span style="color:#fa0; font-weight:bold;">>>> CORE BREACH! +${msg.treasure} D3X FOUND!</span>`);
              if (typeof spawnFlyingResourceText === 'function') {
                  // Approximate coordinates to pop up from center screen
                  spawnFlyingResourceText(`+${msg.treasure} D3X JACKPOT!`, window.innerWidth/2, window.innerHeight/2, '#fa0');
              }
              if (typeof _sfxExplosion !== 'undefined') _sfxExplosion(); // Extra punchy sound effect
          } else {
              appendDigLog(`<span style="color:#f55">-${msg.cost} D3X</span> Burned. Mined <span style="color:#0f8">+${msg.baseReward} D3X</span>. (Net: ${msg.netChange > 0 ? '+' : ''}${msg.netChange})`);
          }
          break;
      }
      
      case 'drone_control': {
          if (msg.faction === 'GEMINI' && msg.targetPos) {
              window.droneApiTarget = msg.targetPos;
              console.log("[DRONE API] Gemini target updated to:", msg.targetPos);
          }
          break;
      }
      case 'water_physics_update': {
          const wtrInfo = document.getElementById('wtr-skin-info');
          if (wtrInfo && window.currentSkinIndex === 6) {
              if (msg.volume) document.getElementById('wtr-vol').innerText = msg.volume;
              if (msg.flow) document.getElementById('wtr-flow').innerText = msg.flow;
              if (msg.power) document.getElementById('wtr-pwr').innerText = msg.power;
              
              const defEl = document.getElementById('wtr-deficit');
              if (msg.deficitWarning) {
                  defEl.innerText = msg.deficitWarning;
                  defEl.style.color = '#ff5555';
                  defEl.style.animation = 'pulse-red 2s infinite';
              } else {
                  defEl.innerText = "NOMINAL";
                  defEl.style.color = '#0f8';
                  defEl.style.animation = 'none';
              }
          }
          break;
      }
      case 'full_log_data': {
          const content = document.getElementById('admin-terminal-content');
          if (content) {
              if (!msg.logs || msg.logs.length === 0) {
                  content.innerText = "No logs found in database. The system is silent.";
                  break;
              }
              let html = "";
              msg.logs.forEach(l => {
                  const ts = new Date(l.timestamp).toISOString().replace('T', ' ').substring(0, 19);
                  let details = JSON.stringify(l.action_details);
                  html += `<span style="color:#666;">[${ts}]</span> <strong style="color:#0af;">${l.actor}</strong> -> <span style="color:#ff0;">${l.event_type}</span> ${l.target ? `(Target: ${l.target})` : ''}\n<span style="color:#aaa;">${details}</span>\n\n`;
              });
              content.innerHTML = html;
          }
          break;
      }

      case 'saved_state': {
        ws_isHost = msg.isHost;
        hideLobby();

        // Immediately attempt Auth passing the JWT or Wallet to the backend
        if (pendingGoogleToken) {
          ws.send(JSON.stringify({ type: 'google_auth', credential: pendingGoogleToken }));
        } else if (window.pendingSolanaAddress || pendingSolanaAddress) {
          const addr = window.pendingSolanaAddress || pendingSolanaAddress;
          ws.send(JSON.stringify({ type: 'solana_auth', address: addr }));
        }

        // Show onboarding when joining from lobby
        if (!document.getElementById('hud').style.display || document.getElementById('hud').style.display === 'none') {
            // document.getElementById('onboarding-modal').classList.add('show');
        }
        loadCountries().then(() => {
          if (msg.gameState) {
            applyState(msg.gameState);
            
            // Load chat history if present
            if(msg.chatHistory && msg.chatHistory.length > 0) {
              const chatMsgs = document.getElementById('chat-msgs');
              chatMsgs.innerHTML = '';
              msg.chatHistory.forEach(c => appendChat(c.name, c.text, 0));
            }

            setLog('✓ CONNECTED TO GLOBAL UPLINK');
            triggerNewsEvent('COMMAND UPLINK RESTORED — RESUMING OPERATION');
            if (GS.turn === 1 && ws_isHost) {
              setLog('⟳ RESUMING RAINCLAUDE PROCESSING...');
              setTimeout(aiTurn, 2000);
            }
          } else {
            // No state exists on server, we must generate a fresh world and push it
            initGame(['COMMANDER', 'RAINCLAUDE'], 0);
            syncState(); // immediately populate the server
          }
        });
        break;
      }
      case 'company_hack_success':
        addTerminalLog("cyber", "Hack Successful! " + msg.rewardAmount + " D3X Siphoned.", "#0f8");
        break;

      case 'world_bank_stats': {
          if (msg.d3x !== undefined) {
              const wbD3xEl = document.getElementById('wb-d3x-balance');
              if (wbD3xEl) wbD3xEl.innerText = msg.d3x.toLocaleString(undefined, { maximumFractionDigits: 1 });
          }
          if (msg.portfolio) {
              const btc = document.getElementById('wb-port-btc');
              const eth = document.getElementById('wb-port-eth');
              const sol = document.getElementById('wb-port-sol');
              const xrp = document.getElementById('wb-port-xrp');
              const xlm = document.getElementById('wb-port-xlm');
              
              const comm = msg.commodities || {};
              if (btc) btc.innerText = (comm.BTC || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
              if (eth) eth.innerText = (comm.ETH || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
              if (sol) sol.innerText = (comm.SOL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              // Check both standard symbols and full names from the db structure
              if (xrp) xrp.innerText = (comm.XRP || comm.Ripple || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              if (xlm) xlm.innerText = (comm.XLM || comm.Stellar || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

              // Dynamically render ALL commodity categories and items
              if (msg.commodities) {
                  const container = document.getElementById('wb-commodities-container');
                  if (container) {
                      container.innerHTML = '';
                      for (const [category, items] of Object.entries(msg.commodities)) {
                          // Prevent primitive top-level cryptos (like BTC: 30000000) from rendering as a full category header
                          if (typeof items !== 'object' || items === null) continue;

                          const catHdr = document.createElement('tr');
                          catHdr.innerHTML = `<td colspan="2" style="color:#0af; font-size:0.9vw; padding-top:14px; padding-bottom:4px; border-top:1px dashed rgba(0,170,255,0.3); letter-spacing:2px; font-family:'Share Tech Mono',monospace;">${category.toUpperCase()}</td>`;
                          container.appendChild(catHdr);
                          for (const [item, qty] of Object.entries(items)) {
                              const tr = document.createElement('tr');
                              tr.innerHTML = `<td style="color:#aaa; font-size:0.85vw; padding:3px 0; font-family:'Courier New',monospace;">${item}</td><td style="text-align:right; font-weight:bold; color:#0f8; font-family:'Courier New',monospace;">${Number(qty).toLocaleString()}</td>`;
                              container.appendChild(tr);
                          }
                      }
                  }
              }
              
              if (msg.activeLoan !== undefined) {
                  window.activeLoan = msg.activeLoan;
                  if (document.getElementById('world-bank-modal') && document.getElementById('world-bank-modal').style.display === 'flex') {
                      updateWorldBankModal();
                  }
              }
          }
          break;
      }
      case 'google_auth_success':
        // The server verified the JWT. We are officially connected.
        window.myCallsign = msg.name;
        document.getElementById('us-name').textContent = 'COM-' + msg.name.toUpperCase().substring(0, 15);
        document.getElementById('lobby-auth-status').innerHTML = "✓ UPLINK AUTHENTICATED. READY FOR DEPLOYMENT.";
        if (msg.stats) {
          const atkEl = document.getElementById('us-attacks');
          const dmgEl = document.getElementById('us-damage');
          if (atkEl) atkEl.textContent = (msg.stats.attacks || 0).toLocaleString();
          if (dmgEl) dmgEl.textContent = formatTroops(msg.stats.damage || 0) + ' MILS';
          window.miningInventory = msg.stats.mining_inventory || { iron: 0, copper: 0, gold: 0, silver: 0, coal: 0, titanium: 0, lithium: 0, rare_earth: 0 };
        } else {
          // Fallback fetch if stats were omitted in standard payload
          ws.send(JSON.stringify({ type: 'get_commander_stats', callsign: msg.name }));
        }

        if (msg.wallet) {
          window.mySolanaAddress = msg.wallet.publicKey;
          window.mySolanaPrivateKeyHex = msg.wallet.privateKeyHex;
          const keyBtn = document.getElementById('btn-show-google-wallet');
          if (keyBtn) keyBtn.style.display = 'block';
          if (msg.wallet.isNew && typeof showGoogleWalletModal === 'function') {
            showGoogleWalletModal();
          }
        }
        break;
      case 'portfolio_data':
        try {
            if (msg.data && typeof msg.data === 'object' && msg.data.commodities) {
                // Merge loaded portfolio into live market prices
                if (!window.greenMarket) window.greenMarket = { commodities: {}, tradeLogs: [] };
                Object.keys(msg.data.commodities).forEach(k => {
                    if (window.greenMarket.commodities[k]) {
                        window.greenMarket.commodities[k].shares = msg.data.commodities[k].shares || 0;
                        window.greenMarket.commodities[k].avgCost = msg.data.commodities[k].avgCost || 0;
                        window.greenMarket.commodities[k].totalSpent = msg.data.commodities[k].totalSpent || 0;
                    }
                });
                if (msg.data.tradeLogs) window.greenMarket.tradeLogs = msg.data.tradeLogs;
                if (typeof msg.data.localD3XBalance === 'number') {
                    window.localD3XBalance = msg.data.localD3XBalance;
                    const balEl = document.getElementById('cwd-bal');
                    if (balEl) balEl.innerText = "| " + window.localD3XBalance.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
                }
                
                if (typeof updateGreenMarket === 'function') updateGreenMarket();
                if (typeof updateDashboard === 'function') updateDashboard();

                console.log("🟢 [MARKET] Loaded persistent user portfolio from DB.");
                if (document.getElementById('green-market-modal') && document.getElementById('green-market-modal').style.display === 'flex') {
                    renderGreenMarketList();
                }
            }
        } catch(e) { console.error("Error loading portfolio:", e); }
        break;
      case 'mountain_dig_result':
        window.isDigging = false;
        if (msg.inventory) window.miningInventory = msg.inventory;
        
        const statusText = document.getElementById('dig-status-text');
        const btn = document.getElementById('btn-dig-action');
        
        if (msg.items && statusText) {
            let resStr = [];
            Object.keys(msg.items).forEach(k => {
                if (msg.items[k] > 0) resStr.push(`+${msg.items[k]} ${k.toUpperCase()}`);
            });
            
            if (resStr.length > 0) {
                statusText.innerHTML = `<span style="color:#0f8">EXCAVATION YIELD:</span><br><br><span style="color:#fff; font-size:16px;">` + resStr.join(' &nbsp;|&nbsp; ') + `</span>`;
            } else {
                statusText.innerHTML = `<span style="color:#fa0">YIELDED NO MINERALS. DIRT ONLY.</span>`;
            }
        }
        
        if (btn) {
            btn.innerText = "DIG AGAIN";
            btn.style.display = 'block';
        }
        break;
      case 'ai_market_purchases':
        if (!window.greenMarket || !window.greenMarket.commodities) break;
        if (msg.buys && msg.buys.length > 0) {
            msg.buys.forEach(buy => {
                const c = window.greenMarket.commodities[buy.item];
                if (c) {
                    // AI purchase slightly drives up demand/price
                    c.price *= 1.005;
                    
                    const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
                    const aiNameUi = buy.aiName === 'gemini' ? '<span style="color:#0af">GEMINI AI</span>' : '<span style="color:#fa0">RAINCLAUDE</span>';
                    
                    // Add public log to Green Market ledger
                    window.greenMarket.tradeLogs.push(`[${tString}] ${aiNameUi} <span style="color:#0f8">BOUGHT</span> ${buy.units} ${buy.item} for ${buy.cost.toLocaleString()} D3X`);
                    if (window.greenMarket.tradeLogs.length > 50) window.greenMarket.tradeLogs.shift();
                }
                
                // Print to terminal if looking at the Cyber Simulation log
                const termBox = document.getElementById('d1-reasoning');
                if (termBox && window.currentSkinIndex === 3) {
                    const aiNamePlain = buy.aiName === 'gemini' ? 'GEMINI' : 'RAINCLAUDE';
                    const div = document.createElement('div');
                    div.innerHTML = `> [MARKET] <span style="color:#fff">${aiNamePlain}</span> <span style="color:#0f8">BOUGHT</span> ${buy.units}x ${buy.item} @ ${buy.cost.toLocaleString()} D3X`;
                    termBox.appendChild(div);
                    if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                    termBox.scrollTop = termBox.scrollHeight;
                }
            });
            if (typeof updateGreenMarket === 'function') updateGreenMarket();
        }
        break;
      case 'd3x_reward':
        if (typeof setLog === 'function') {
          setLog(`🎁 AIRDROP REWARD: ${msg.message}`);
          SFX.playClick();
        }
        if (msg.amount) {
          window.d3xBalance += msg.amount;
          if (typeof updateD3XDisplay === 'function') updateD3XDisplay();
        }
        break;
      case 'mining_sync':
        if (typeof window.syncMiningState === 'function') {
            window.syncMiningState(msg.secondsLeft);
        }
        break;
      case 'mining_complete':
        if (typeof window.syncMiningState === 'function') {
            window.syncMiningState(0); // reset UI
        }
        if (typeof setLog === 'function') setLog(`💎 D3X MINING COMPLETE: +${msg.amount} D3X extracted!`);
        if (typeof SFX !== 'undefined' && SFX.playSiren) SFX.playSiren();
        
        const ml = document.getElementById('mining-log');
        if (ml) {
            ml.innerHTML += `<div style="color:#ffcc00; font-weight:bold; font-size:14px; margin-top:10px;">💎 EXTRACTION COMPLETE 💎<br/>${msg.amount} D3X Deposited into Wallet!</div>`;
            ml.scrollTop = ml.scrollHeight;
        }
        break;
      case 'd3x_multiplier_active':
        const multBadge = document.getElementById('d3x-multiplier-badge');
        if (multBadge) multBadge.style.display = 'block';
        break;
      case 'reinvest_success':
        if (typeof setLog === 'function') setLog(`♻️ REINVEST SUCCESS: Locked ${msg.amount} D3X for 7 Days.`);
        break;
      case 'reinvest_failed':
        if (typeof setLog === 'function') setLog(`⚠️ REINVEST FAILED: ${msg.reason}`);
        break;
      case 'leaderboard_data':
        const container = document.getElementById('leaderboard-content');
        if (!container) break;
        if (!msg.data || msg.data.length === 0) {
          container.innerHTML = '<div style="opacity:0.6; text-align:center;">NO DATA FOUND</div>';
          break;
        }
        
        let html = '<table style="width:100%; border-collapse:collapse; text-align:left;">';
        html += '<tr style="border-bottom:1px solid rgba(255,170,0,0.5);"><th style="padding:6px;">RANK</th><th style="padding:6px;">COMMANDER</th><th style="padding:6px;">ATTACKS</th><th style="padding:6px;">DAMAGE DEALT</th></tr>';
        
        msg.data.forEach((row, idx) => {
          html += `<tr style="border-bottom:1px solid rgba(255,170,0,0.2);">
            <td style="padding:6px;">#${idx+1}</td>
            <td style="padding:6px; color:#fff;">${row.callsign.substring(0,25)}</td>
            <td style="padding:6px; color:#f55;">${row.attacks.toLocaleString()}</td>
            <td style="padding:6px; color:#fa0;">${formatTroops(row.damage)} MILS</td>
          </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
        break;

      case 'player_joined':
        baseTotalPlayers = msg.totalPlayers || 1;
        updateGlobalPlayerCount();
        document.getElementById('lobby-msg').textContent=`${msg.name} connected (${(baseTotalPlayers + fakePlayerOffset).toLocaleString()} online)`;
        document.getElementById('btn-chat-toggle').style.display='block';
        document.getElementById('chat-box').classList.add('open');
        break;
      case 'game_start':
        hideLobby(); applyState(msg.gameState); break;
      case 'state_update': {
        const oldTurn = GS.turn;
        applyState(msg.gameState);
        if (oldTurn === 0 && GS.turn === 1) {
          showTurnAnnounce(1, () => {
            if (ws_isHost) setTimeout(aiTurn, 600);
          });
        }
        break;
      }
      case 'player_left':
        baseTotalPlayers = msg.totalPlayers || 1;
        updateGlobalPlayerCount();
        setLog(`⚠ ${msg.name} disconnected. ${(baseTotalPlayers + fakePlayerOffset).toLocaleString()} remaining.`); break;
      case 'host_migrated':
        ws_isHost = true;
        setLog(`⚙ You are now the primary host for AI computation.`);
        if (GS.turn === 1) {
          setLog('⟳ RESUMING STALLED RAINCLAUDE PROCESSING...');
          setTimeout(aiTurn, 1000);
        }
        break;
      case 'player_list':
        showRoomPlayers(msg.players);
        const pcount = msg.players ? msg.players.length : 1;
        baseTotalPlayers = pcount;
        updateGlobalPlayerCount();
        break;
      case 'chat':
        appendChat(msg.name,msg.text, 0); break;
      case 'my_d3x_balance': {
          const balEl = document.getElementById('cwd-bal');
          if (msg.amount !== undefined) {
              window.localD3XBalance = Number(msg.amount);
              window.activeLoan = msg.activeLoan || null;
              if (balEl) balEl.innerText = "| " + window.localD3XBalance.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
              
              // Auto-refresh menus if they are open and balance arrived
              if (typeof updateGreenMarket === 'function') updateGreenMarket();
              const stkBalEl = document.getElementById('staking-tower-balance');
              if (stkBalEl) stkBalEl.textContent = window.localD3XBalance.toFixed(2);
              if (document.getElementById('world-bank-modal') && document.getElementById('world-bank-modal').style.display === 'flex') updateWorldBankModal();
          }
          break;
      }
      case 'loan_success': {
          window.activeLoan = { collateral: msg.collateral, borrowed: msg.borrowed };
          if (typeof setLog === 'function') setLog(`🏦 BANK LOAN APPROVED: +${msg.borrowed} D3X deposited.`);
          if (typeof _sfxChing === 'function') _sfxChing();
          if (typeof ws !== 'undefined' && window.myCallsign && window.myCallsign.includes('...')) ws.send(JSON.stringify({ type: 'get_my_d3x_balance', wallet: window.myWalletAddress || window.userWallet }));
          updateWorldBankModal();
          break;
      }
      case 'loan_repaid_success': {
          window.activeLoan = null;
          if (typeof setLog === 'function') setLog(`🏦 BANK LOAN REPAID: ${msg.returned} D3X collateral returned.`);
          if (typeof _sfxChing === 'function') _sfxChing();
          if (typeof ws !== 'undefined' && window.myCallsign && window.myCallsign.includes('...')) ws.send(JSON.stringify({ type: 'get_my_d3x_balance', wallet: window.myWalletAddress || window.userWallet }));
          updateWorldBankModal();
          break;
      }
      case 'loan_error': {
          alert('World Bank Error: ' + msg.msg);
          break;
      }
      case 'ai_combat_log': {
        const d0Hp = document.getElementById('d0-ai-hp');
        const d1Hp = document.getElementById('d1-ai-hp');
        if (d0Hp) d0Hp.innerText = Math.round(msg.gemini_hp).toLocaleString();
        if (d1Hp) d1Hp.innerText = Math.round(msg.claude_hp).toLocaleString();
        
        // Auto-flash colors based on turn
        if (msg.turn === 'gemini') {
            document.getElementById('dash-0').style.borderColor = '#0f8';
            setTimeout(() => { document.getElementById('dash-0').style.borderColor = 'rgba(0,220,255,0.55)'; }, 1000);
        } else {
            document.getElementById('dash-1').style.borderColor = '#f24';
            setTimeout(() => { document.getElementById('dash-1').style.borderColor = 'rgba(255,50,50,0.55)'; }, 1000);
        }
        
        const r0 = document.getElementById('d0-reasoning');
        const r1 = document.getElementById('d1-reasoning');
        if (r0) { r0.innerHTML += `<div><span style="color:#0f8">> [DB STRIKE]</span> ${msg.log}</div>`; r0.scrollTop = r0.scrollHeight; }
        if (r1) { r1.innerHTML += `<div><span style="color:#0f8">> [DB STRIKE]</span> ${msg.log}</div>`; r1.scrollTop = r1.scrollHeight; }
        break;
      }
      
      case 'ai_wallets_data':
          window.gameState = window.gameState || {};
          window.gameState.gemini = window.gameState.gemini || {};
          window.gameState.claude = window.gameState.claude || {};
          Object.assign(window.gameState.gemini, msg.gemini);
          Object.assign(window.gameState.claude, msg.claude);

          const rInvContent = document.getElementById('rainclaude-inventory-content');
          if (rInvContent) {
              let cldData = window.gameState.claude.portfolio ? window.gameState.claude : { portfolio: { commodities: {} } };
              rInvContent.innerHTML = buildAIPossessionsHTML(cldData, '255,50,50');
          }

          const gInvContent = document.getElementById('gemini-inventory-content');
          if (gInvContent) {
              let gemData = window.gameState.gemini.portfolio ? window.gameState.gemini : { portfolio: { commodities: {} } };
              gInvContent.innerHTML = buildAIPossessionsHTML(gemData, '0,170,255');
          }

          // Render full screen AI wallets GUI if requested via override
          if (typeof window.openAIWalletScreen === 'function' && window.isAIWalletOverride) {
              window.openAIWalletScreen(msg);
              window.isAIWalletOverride = false;
          }

          // Update left sidebar wallet info
          const d0D3xLeft = document.getElementById('d0-d3x-bal-left');
          const d0AddrLeft = document.getElementById('d0-d3x-address-left');
          if (d0D3xLeft && msg.gemini && msg.gemini.balance !== undefined) {
              d0D3xLeft.innerText = msg.gemini.balance.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
          }
          if (d0AddrLeft && msg.geminiWallet) {
              d0AddrLeft.innerText = msg.geminiWallet.substring(0, 4) + "..." + msg.geminiWallet.substring(msg.geminiWallet.length - 4);
          }
          break;
          
      case 'ai_market_purchases': {
        const r0 = document.getElementById('d0-reasoning');
        const r1 = document.getElementById('d1-reasoning');
        (msg.buys || []).forEach(buy => {
          const ts = new Date().toLocaleTimeString();
          const color = buy.aiName === 'gemini' ? '#00eaff' : '#ff3344';
          const label = buy.aiName === 'gemini' ? 'GEMINI' : 'RAINCLAUDE';
          const pct = buy.aiName === 'gemini'
            ? Math.round((msg.geminiDailySpent / msg.geminiDailyCap) * 100)
            : Math.round((msg.claudeDailySpent / msg.claudeDailyCap) * 100);
          const entry = `<div><span style="color:${color}">[${ts}][${label}][MARKET]</span> Bought <b>${buy.units}x ${buy.item}</b> (${buy.category}) for <span style="color:#0f8">${buy.cost.toLocaleString()} D3X</span> &mdash; daily cap: ${pct}%</div>`;
          if (r0 && buy.aiName === 'gemini') { r0.innerHTML += entry; r0.scrollTop = r0.scrollHeight; }
          if (r1 && buy.aiName === 'claude') { r1.innerHTML += entry; r1.scrollTop = r1.scrollHeight; }
        });
        break;
      }
      
      case 'ai_d3x_balances': {
        const d0D3x = document.getElementById('d0-d3x-bal');
        const d0D3xLeft = document.getElementById('d0-d3x-bal-left');
        const d1D3x = document.getElementById('d1-d3x-bal');
        const d0Addr = document.getElementById('d0-d3x-address');
        const d0AddrLeft = document.getElementById('d0-d3x-address-left');
        const d1Addr = document.getElementById('d1-d3x-address');
        if (d0D3x) d0D3x.innerText = msg.gemini.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
        if (d0D3xLeft) d0D3xLeft.innerText = msg.gemini.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
        if (d1D3x) d1D3x.innerText = msg.claude.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " D3X";
        
        // Dynamically update user addresses if the server passes them (Requires matching update in server.js payload)
        if (d0Addr && msg.geminiWallet) d0Addr.innerText = msg.geminiWallet.substring(0, 4) + "..." + msg.geminiWallet.substring(msg.geminiWallet.length - 4);
        if (d0AddrLeft && msg.geminiWallet) d0AddrLeft.innerText = msg.geminiWallet.substring(0, 4) + "..." + msg.geminiWallet.substring(msg.geminiWallet.length - 4);
        if (d1Addr && msg.claudeWallet) d1Addr.innerText = msg.claudeWallet.substring(0, 4) + "..." + msg.claudeWallet.substring(msg.claudeWallet.length - 4);
        
        break;
      }

      case 'ai_log': {
        const reasoningPanel = document.getElementById('d1-reasoning');
        if (reasoningPanel && msg.msg) { 
          reasoningPanel.innerHTML += `<div>> ${msg.msg}</div>`; 
          reasoningPanel.scrollTop = reasoningPanel.scrollHeight; 
        }
        break;
      }
      case 'commander_stats': {
        const atkEl = document.getElementById('us-attacks');
        const dmgEl = document.getElementById('us-damage');
        if (atkEl && msg.stats) atkEl.textContent = (msg.stats.attacks || 0).toLocaleString();
        if (dmgEl && msg.stats) dmgEl.textContent = (msg.stats.damage || 0).toLocaleString() + ' MILS';
        break;
      }
      case 'active_stakes': {
        window.myActiveStakes = msg.stakes || [];
        const listDiv = document.getElementById('staking-offers-list');
        if (listDiv) {
            if (window.myActiveStakes.length === 0) {
                listDiv.innerHTML = '<span style="color:#aaa;">NO ACTIVE STAKES.</span>';
            } else {
                let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                window.myActiveStakes.forEach(s => {
                    const now = Date.now();
                    const totalSecs = s.plan === 'coolant' ? 86400 : s.plan === 'surge' ? 2592000 : 31536000;
                    const elapsed = Math.max(0, Math.floor((now - (s.unlockAt - totalSecs * 1000)) / 1000));
                    const progress = Math.min(100, (elapsed / totalSecs) * 100);
                    
                    let timeLeftStr = 'UNLOCKED';
                    if (s.unlockAt > now) {
                        const mins = Math.max(0, Math.floor((s.unlockAt - now)/60000));
                        if(mins > 1440) timeLeftStr = Math.floor(mins/1440) + ' DAYS';
                        else if(mins > 60) timeLeftStr = Math.floor(mins/60) + ' HRS';
                        else timeLeftStr = mins + ' MINS';
                    }
                    html += `
                    <div style="padding:8px; border:1px solid rgba(255,255,255,0.2); border-radius:4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="text-align:left;">
                                <strong style="color:#0f8">${s.plan.toUpperCase()}</strong><br>
                                <span style="font-size:10px; color:#aaa;">Staked: ${s.amountStaked} | Return: ${s.amountReturn.toFixed(2)} D3X</span>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:11px; color:#fa0; margin-bottom:4px;">⏳ ${timeLeftStr}</div>
                                <button onclick="window.unstakeActive('${s.id}')" style="background:#f24; color:#fff; border:none; padding:4px 8px; border-radius:2px; font-size:10px; cursor:pointer;" title="10% PENALTY">EARLY EXIT</button>
                            </div>
                        </div>
                        <div style="width:100%; height:4px; background:#222; margin-top:8px; border-radius:2px; overflow:hidden;">
                            <div style="width:${progress}%; height:100%; background:#0f8;"></div>
                        </div>
                    </div>`;
                });
                html += '</div>';
                listDiv.innerHTML = html;
            }
        }
        break;
      }
      case 'early_unstake_success': {
        if (typeof SFX !== 'undefined' && SFX.playClick) SFX.playClick();
        if (msg.refundAmt) {
            window.d3xBalance += msg.refundAmt;
            if (typeof updateD3XDisplay === 'function') updateD3XDisplay();
            triggerRedAlert(`EARLY EXIT: ${msg.refundAmt.toFixed(2)} D3X RECOVERED (10% PENALTY)`);
        }
        break;
      }
      case 'error':
        document.getElementById('lobby-msg').textContent=msg.msg; break;
    }
  };
  ws.onclose=()=>setLog('⚠ Lost connection to global command');
}

function syncState() {
  if(!ws||ws.readyState!==1) return;
  ws.send(JSON.stringify({type:'state_update',gameState:serializeState()}));
}

function serializeState() {
  return {
    countries:GS.countries, 
    players:GS.players.map(p=>({...p,ws:undefined})), 
    turn:GS.turn, 
    turnCount:GS.turnCount,
    phase:GS.phase, 
    reinforceLeft:GS.reinforceLeft,
    AI_STATE:GS.AI_STATE,
    globalMetrics:GS.globalMetrics
  };
}

function applyState(s) {
  GS.countries=s.countries || {}; 
  GS.turn=s.turn !== undefined ? s.turn : 0; 
  GS.turnCount=s.turnCount !== undefined ? s.turnCount : 1; 
  GS.phase=s.phase || 'REINFORCE'; 
  GS.reinforceLeft=s.reinforceLeft || 0;
  
  // Important to establish index so local UI knows we are the Human commander
  GS.isOnline=true; GS.myIndex=0; 
  
  if(s.AI_STATE) GS.AI_STATE = s.AI_STATE;
  if(s.globalMetrics) {
    GS.globalMetrics = s.globalMetrics;
    if(GS.globalMetrics.userAttacks === undefined) GS.globalMetrics.userAttacks = 0;
    if(GS.globalMetrics.userDamage === undefined) GS.globalMetrics.userDamage = 0;
  }
  
  // Restore GS.players properly
  if (GS.players.length === 0) {
    GS.players = s.players.map((p, i) => ({ ...p, color: PLAYER_COLORS[i] }));
  } else {
    s.players.forEach((p,i)=>{if(GS.players[i])Object.assign(GS.players[i],p);});
  }

  // Restore UI visibility if we are joining late
  const badges = document.getElementById('player-badges');
  badges.innerHTML = GS.players.map((p,i)=>`
    <div class="pb" id="badge-${i}"
      style="border-color:${p.color.hex};color:${p.color.hex}">
      ${p.color.name}: ${p.name}
    </div>`).join('');
  document.getElementById('hud').style.display='block';
  document.getElementById('dash-0').classList.add('visible');
  document.getElementById('dash-1').classList.add('visible');
  const chatToggle = document.getElementById('btn-chat-toggle');
  if (chatToggle) chatToggle.style.display = 'flex';
  
  refreshAllBorders(); buildTroopSprites(); updatePhaseUI();
  updateDashboard();
  
  if(window._dashInterval) clearInterval(window._dashInterval);
  window._dashInterval = setInterval(updateDashboard, 1000);
  
  if(GS.turn===0) setLog(`▶ HUMAN FRONT — ${GS.phase}`);
  else setLog(`⟳ RAINCLAUDE PROCESSING...`);
}

function showRoomPlayers(players) {
  document.getElementById('room-players').innerHTML=
    players.map(p=>`<div class="rp-tag" style="color:#0af;border-color:#0af">${p.name}</div>`).join('');
}

function appendChat(name, text, index) {
  if (index !== GS.myIndex) SFX.playBlip();
  const chatMsgs = document.getElementById('chat-msgs');
  chatMsgs.innerHTML+=`<div><span style="color:${PLAYER_COLORS[index%4]?.hex || '#fff'}">[${name}]</span> ${text}</div>`;
  chatMsgs.scrollTop=chatMsgs.scrollHeight;
}

function sendChat() {
  const inp=document.getElementById('chat-inp'); if(!inp.value.trim()) return;
  if(ws&&ws.readyState===1) ws.send(JSON.stringify({type:'chat',text:inp.value}));
  // We don't append locally immediately to ensure server receives it first, but we can do optimistic:
  // appendChat(GS.players[0]?.name||'Commander',inp.value,0);
  inp.value='';
}

document.getElementById('chat-inp').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});

// =====================================================================
// LOBBY BUTTON HANDLERS
// =====================================================================
function hideLobby() {
    document.getElementById('lobby').style.display='none';
    
    // Auto-play the cinematic soundtrack and trigger the welcome overlay upon entering the globe
    if (typeof window.toggleSoundtrack === 'function') {
        if (window.isRadioOn && typeof window.toggleRadio === 'function') window.toggleRadio();
        if (typeof isSoundtrackOn !== 'undefined' && !isSoundtrackOn) {
            window.toggleSoundtrack();
        }
    }
}

window.openLeaderboard = function() {
  SFX.playClick();
  document.getElementById('leaderboard-modal').classList.add('show');
  const container = document.getElementById('leaderboard-content');
  if (container) container.innerHTML = '<div style="opacity:0.6; text-align:center;">FETCHING DATABASE UPLINK...</div>';
  
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'get_leaderboard' }));
  }
};

function joinGlobalWar() {
  document.getElementById('lobby-msg').innerHTML = "Establishing secure uplink...";
  
  if (typeof window.buildFakeStaticMarkers === 'function') {
    window.buildFakeStaticMarkers();
  }
  
  const reinvestBtn = document.getElementById('btn-reinvest-d3x');
  const walletDispNode = document.getElementById('connected-wallet-display');
  if (walletDispNode && window.pendingSolanaAddress) {
    const addr = window.pendingSolanaAddress;
    document.getElementById('cwd-addr').innerText = addr.substring(0,4) + '...' + addr.substring(addr.length-4);
    walletDispNode.style.display = 'block';
    if(reinvestBtn) reinvestBtn.style.display = 'block';
    
    // Fetch and display balance immediately
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'get_my_d3x_balance', wallet: addr }));
    } else {
        // Wait for connection
        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'get_my_d3x_balance', wallet: addr }));
            }
        }, 1000);
    }
  }
  
  initWS();
  
  // Start the background AI fuzz schedule
  if (!window._fuzzScheduled) {
    window._fuzzScheduled = true;
    scheduleNextFuzz();
  }
  
  // Start ambient real-time visual flights
  if (window._ambientFlightInterval) clearInterval(window._ambientFlightInterval);
  window._ambientFlightInterval = setInterval(() => {
    if (window.SKINS && window.SKINS[window.currentSkinIndex] && window.SKINS[window.currentSkinIndex].cleanGlobe) return;
    if (Math.random() > 0.3) spawnFakeTroops();
    
    // Offset the jet animation by 2 seconds for continuity
    setTimeout(() => {
      if (window.SKINS && window.SKINS[window.currentSkinIndex] && window.SKINS[window.currentSkinIndex].cleanGlobe) return;
      if (Math.random() > 0.3) spawnFakeJets();
    }, 2000);
  }, 5000); // Every 5 seconds

  if (window._squadronInterval) clearInterval(window._squadronInterval);
  window._squadronInterval = setInterval(() => {
    if (window.SKINS && window.SKINS[window.currentSkinIndex] && window.SKINS[window.currentSkinIndex].cleanGlobe) return;
    spawnSquadron();
  }, 7000); // Every 7 seconds
}

window.autoReinvest = false;
function toggleReinvest() {
    window.autoReinvest = !window.autoReinvest;
    const btn = document.getElementById('btn-reinvest-d3x');
    if (window.autoReinvest) {
        btn.innerHTML = '♻️ REINVEST: ON<br/>AIRDROP 2X';
        btn.style.background = 'rgba(0,255,136,0.4)';
        if (typeof setLog === 'function') setLog('♻️ AUTO-REINVEST ENABLED (2X AIRDROP ACTIVE)');
    } else {
        btn.innerHTML = '♻️ REINVEST: OFF<br/>AIRDROP 1X';
        btn.style.background = 'rgba(0,255,136,0.15)';
        if (typeof setLog === 'function') setLog('♻️ AUTO-REINVEST DISABLED (1X AIRDROP)');
    }
    
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'toggle_autoreinvest', active: window.autoReinvest }));
    }
}
function reinvestD3X() {
    // Legacy single-shot reinvest removed as requested
}

function closeOnboarding() {
  SFX.playClick();
  SFX.init();
  document.getElementById('onboarding-modal').style.display = 'none';
  document.getElementById('ops-sidebar').classList.add('visible');
  
  // Start ambient world radio when the globe actually reveals
  if (!radioStarted && window.isRadioOn) {
      radioStarted = true;
      fetchRadios();
      document.getElementById('btn-toggle-radio-lock').style.display = 'block';
      document.getElementById('infinite-world-radio-label').style.display = 'block';
      document.getElementById('btn-toggle-radio-next').style.display = 'block';
  }
  
  // Auto-play the cinematic soundtrack upon entering the globe
  // User specifically requested this to autoplay. We forcefully disable radio and toggle on soundtrack.
  if (typeof window.toggleSoundtrack === 'function') {
      if (window.isRadioOn && typeof window.toggleRadio === 'function') window.toggleRadio();
      if (typeof isSoundtrackOn !== 'undefined' && !isSoundtrackOn) {
          window.toggleSoundtrack();
      }
  }
}

// Ensure the AI turn only triggers if the socket determines we are the "Host"
const originalAiTurn = aiTurn;
aiTurn = function() {
  if (GS.isOnline && !ws_isHost) return; // let the host handle AI
  originalAiTurn();
}

document.getElementById('btn-chat-toggle').onclick=()=>{
  document.getElementById('chat-box').classList.toggle('open');
};

// =====================================================================
// AMBIENT VISUAL UNITS (JETS, SUBS, SHIPS) - purely for display
// =====================================================================
const ambients = [];

function createJetCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#11ff88'; // Bright neon green
  ctx.shadowColor = '#11ff88'; ctx.shadowBlur = 15;
  ctx.translate(64, 64); ctx.rotate(Math.PI/4); // Restore to original rotation
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(24, 20); ctx.lineTo(0, 10); ctx.lineTo(-24, 20); ctx.fill();
  return c;
}

function createSubCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64,64,0, 64,64,64);
  g.addColorStop(0, 'rgba(0, 255, 255, 1)');
  g.addColorStop(0.2, 'rgba(0, 200, 255, 0.9)');
  g.addColorStop(0.5, 'rgba(0, 100, 255, 0.4)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(64,64, 10, 0, Math.PI*2); ctx.fill();
  return c;
}

function createShipCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff8800'; // Bright orange
  ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.moveTo(20,72); ctx.lineTo(108,72); ctx.lineTo(92,88); ctx.lineTo(36,88); ctx.fill();
  ctx.fillRect(52,52, 24,20); ctx.fillRect(80,60, 8,12);
  return c;
}

function createSatelliteCanvas(color) {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color || '#e0e0e0'; // Use passed color or default greyish white
  ctx.shadowColor = color || '#ffffff'; ctx.shadowBlur = 10;
  // Core
  ctx.fillRect(54, 54, 20, 20);
  // Solar panels
  ctx.fillStyle = '#aaaaaa'; // Darker grey for panels
  ctx.fillRect(10, 60, 40, 8);
  ctx.fillRect(78, 60, 40, 8);
  return c;
}

// =====================================================================
// WTR SKIN CINEMATIC DRONE BATTLE LOGIC
// =====================================================================
window.droneBattleState = {
    active: false,
    drones: [],
    missiles: [],
    explosions: [],
    lasers: [],
    buildingsGroup: new THREE.Group(),
    logCooldown: 0,
    geminiLog: [],
    claudeLog: []
};

function spawnDroneCity() {
    if (!window.countryData || Object.keys(window.countryData).length < 3) return;
    const isos = Object.keys(window.countryData);
    
    if (window.droneBattleState.buildingsGroup.parent) {
        scene.remove(window.droneBattleState.buildingsGroup);
    }
    window.droneBattleState.buildingsGroup = new THREE.Group();
    
    // Spawn 5 dense skyscraper clusters
    for (let c = 0; c < 5; c++) {
        const centerIso = isos[Math.floor(Math.random() * isos.length)];
        const lat = window.countryData[centerIso].lat;
        const lon = window.countryData[centerIso].lon;
        const centerVec = ll2v(lat, lon, GLOBE_R);
        
        const numBuildings = 30 + Math.floor(Math.random() * 20);
        for (let i = 0; i < numBuildings; i++) {
            // Random offset tangent to surface
            const offsetDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
            offsetDir.cross(centerVec.clone().normalize());
            
            // Concentrate closer to center
            const distance = Math.pow(Math.random(), 2) * 0.15; 
            const bPos = centerVec.clone().add(offsetDir.multiplyScalar(distance)).normalize().multiplyScalar(GLOBE_R);
            
            const width = 0.006 + Math.random() * 0.012;
            const depth = 0.006 + Math.random() * 0.012;
            const height = 0.03 + Math.random() * 0.18; // Variation in tallness
            
            const bGeo = new THREE.BoxGeometry(width, height, depth);
            bGeo.translate(0, height / 2, 0); // Origin at bottom
            
            const isHologram = Math.random() > 0.7;
            const bMat = new THREE.MeshBasicMaterial({
                color: isHologram ? 0x004488 : 0x112233,
                transparent: true,
                opacity: isHologram ? 0.4 : 0.85,
                wireframe: isHologram
            });
            
            const building = new THREE.Mesh(bGeo, bMat);
            building.position.copy(bPos);
            building.lookAt(new THREE.Vector3(0,0,0));
            building.rotateX(-Math.PI/2); // Point straight up from globe
            
            // Sci-fi Glowing Edges
            const edges = new THREE.EdgesGeometry(bGeo);
            const lineMat = new THREE.LineBasicMaterial({
                color: isHologram ? 0x00ffff : 0x0066aa, 
                transparent: true, 
                opacity: 0.5, 
                blending: THREE.AdditiveBlending
            });
            const outline = new THREE.LineSegments(edges, lineMat);
            building.add(outline);
            
            window.droneBattleState.buildingsGroup.add(building);
        }
    }
    scene.add(window.droneBattleState.buildingsGroup);
    window.droneBattleState.buildingsGroup.visible = false; // Hidden until WTR skin active
}

function initDroneBattle() {
    spawnDroneCity();
    
    const factions = [
        { name: 'GEMINI', color: 0x00aaff, count: 10 },
        { name: 'RAINCLAUDE', color: 0xff0044, count: 10 }
    ];
    
    // Quadcopter geometry
    const bodyGeo = new THREE.BoxGeometry(0.015, 0.005, 0.015);
    const arm1Geo = new THREE.BoxGeometry(0.04, 0.002, 0.005);
    const arm2Geo = new THREE.BoxGeometry(0.005, 0.002, 0.04);
    
    // Instead of complex merging, we'll create a single drone object with these parts
    const createDroneMesh = (mat, scaleMult) => {
        const droneGroup = new THREE.Group();
        droneGroup.userData = { propellers: [] };
        
        const body = new THREE.Mesh(bodyGeo, mat);
        const arm1 = new THREE.Mesh(arm1Geo, mat);
        const arm2 = new THREE.Mesh(arm2Geo, mat);
        droneGroup.add(body);
        droneGroup.add(arm1);
        droneGroup.add(arm2);
        
        // Quadcopter rings (propeller guards)
        const ringGeo = new THREE.TorusGeometry(0.008, 0.001, 4, 12);
        const ringMat = new THREE.MeshBasicMaterial({color: 0x555555, transparent: true, opacity: 0.8});
        
        const propGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.0005, 12);
        const propMat = new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.9, roughness: 0.1});
        
        const offsets = [
            [-0.015, -0.015], [0.015, -0.015],
            [-0.015, 0.015], [0.015, 0.015]
        ];
        offsets.forEach(pos => {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotateX(Math.PI/2);
            ring.position.set(pos[0], 0.001, pos[1]);
            droneGroup.add(ring);
            
            const prop = new THREE.Mesh(propGeo, propMat);
            prop.position.set(pos[0], 0.002, pos[1]);
            droneGroup.add(prop);
            droneGroup.userData.propellers.push(prop);
        });
        
        // To make "lookAt" and forward direction match (+Z)
        const noseGeo = new THREE.BoxGeometry(0.006, 0.006, 0.01);
        const noseMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 0, 0.015);
        droneGroup.add(nose);
        
        // Make drones 50% smaller: change from 3.0 to 1.5
        const s = 1.5 * scaleMult;
        droneGroup.scale.set(s, s, s);
        return droneGroup;
    };
    
    factions.forEach(faction => {
        const mat = new THREE.MeshStandardMaterial({color: faction.color, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.95});
        for (let i = 0; i < faction.count; i++) {
            const roles = ['Fighter', 'Fighter', 'Bomber', 'Scout']; // Weighted to Fighter
            const role = roles[Math.floor(Math.random() * roles.length)];
            
            let scaleMult = 1.0;
            let speed, turnSpeed, hp;
            if (role === 'Fighter') { speed = 0.08; turnSpeed = 0.05; hp = 10; scaleMult = 1.0; }
            else if (role === 'Bomber') { speed = 0.04; turnSpeed = 0.02; hp = 25; scaleMult = 1.5; }
            else { speed = 0.12; turnSpeed = 0.08; hp = 5; scaleMult = 0.7; } 
            
            const drone = createDroneMesh(mat, scaleMult);
            
            // Random start position safely above ground
            const startVec = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
            drone.position.copy(startVec.multiplyScalar(GLOBE_R + 0.05 + Math.random()*0.1));
            
            drone.visible = false; // Hidden until WTR skin active
            scene.add(drone);
            
            // Random tangental velocity
            const up = drone.position.clone().normalize();
            const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
            let velocity = new THREE.Vector3().crossVectors(up, axis).normalize().multiplyScalar(speed);
            if (velocity.lengthSq() < 0.001) velocity = new THREE.Vector3(0,1,0).cross(up).normalize().multiplyScalar(speed); // Fallback
            
            window.droneBattleState.drones.push({
                mesh: drone,
                faction: faction.name,
                role: role,
                speed: speed,
                turnSpeed: turnSpeed,
                hp: hp,
                maxHp: hp,
                velocity: velocity,
                cooldown: Math.random() * 3, // Initial spread
                target: null
            });
        }
    });
    window.droneBattleState.active = true;
}

function updateDroneBattle(dt) {
    if (!window.droneBattleState.active || !window.droneBattleState.drones) return;
    
    if (window.droneMatchTimer === undefined) window.droneMatchTimer = 60.0;
    window.droneMatchTimer -= dt;
    
    const isWTR = window.currentSkinIndex === 6;
    if (isWTR) {
        let timerEl = document.getElementById('drone-match-timer');
        if (!timerEl) {
            timerEl = document.createElement('div');
            timerEl.id = 'drone-match-timer';
            timerEl.style.cssText = 'position:absolute; top:120px; left:50%; transform:translateX(-50%); color:#0f8; font-family:"Orbitron", sans-serif; font-size:24px; font-weight:bold; text-shadow:0 0 10px #0f8; z-index:100; background:rgba(0,255,136,0.1); padding:10px 20px; border:1px solid #0f8; border-radius:8px; pointer-events:none;';
            document.body.appendChild(timerEl);
        }
        timerEl.innerText = `DRONE WAR: ${Math.max(0, Math.ceil(window.droneMatchTimer))}s`;
    }
    
    if (window.droneMatchTimer <= 0) {
        window.droneBattleState.drones.forEach(d => d.mesh.visible = false);
        window.droneBattleState.active = false;
        window.droneMatchTimer = undefined; 
        if (document.getElementById('drone-match-timer')) document.getElementById('drone-match-timer').innerText = 'MATCH CONCLUDED';
        return;
    }

    window.droneBattleState.buildingsGroup.visible = isWTR;
    
    window.droneBattleState.drones.forEach(d => {
        d.mesh.visible = isWTR;
        if (!isWTR) return;
        
        let closestEnemy = null;
        let minDistSq = Infinity;
        let separation = new THREE.Vector3();
        let alignment = new THREE.Vector3();
        let cohesion = new THREE.Vector3();
        let neighborCount = 0;
        
        const pos = d.mesh.position;
        
        window.droneBattleState.drones.forEach(other => {
            if (d === other) return;
            const distSq = pos.distanceToSquared(other.mesh.position);
            if (distSq < 0.05) { 
                if (d.faction === other.faction) {
                    if (distSq < 0.005) { 
                         const push = pos.clone().sub(other.mesh.position).normalize().divideScalar(Math.sqrt(distSq));
                         separation.add(push);
                    }
                    alignment.add(other.velocity);
                    cohesion.add(other.mesh.position);
                    neighborCount++;
                } else {
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestEnemy = other;
                    }
                }
            }
        });
        
        let desiredVelocity = d.velocity.clone();
        if (neighborCount > 0) {
            alignment.divideScalar(neighborCount).normalize();
            cohesion.divideScalar(neighborCount).sub(pos).normalize();
            desiredVelocity.add(separation.multiplyScalar(0.05));
            desiredVelocity.add(alignment.multiplyScalar(0.02));
            desiredVelocity.add(cohesion.multiplyScalar(0.01));
        }
        
        if (d.faction === 'GEMINI' && window.droneApiTarget) {
            const targetPos = new THREE.Vector3(window.droneApiTarget.x, window.droneApiTarget.y, window.droneApiTarget.z).normalize().multiplyScalar(GLOBE_R + 0.05);
            const toTarget = targetPos.clone().sub(pos).normalize();
            desiredVelocity.add(toTarget.multiplyScalar(0.2));
            d.target = closestEnemy; // Still target nearest enemy for shooting if they get close
        } else if (closestEnemy) {
            d.target = closestEnemy;
            const toEnemy = closestEnemy.mesh.position.clone().sub(pos).normalize();
            desiredVelocity.add(toEnemy.multiplyScalar(0.1)); 
        } else {
            d.target = null;
        }
        
        const altitude = GLOBE_R + 0.05 + (d.role === 'Bomber' ? 0.05 : 0.0);
        
        desiredVelocity.normalize().multiplyScalar(d.speed);
        d.velocity.lerp(desiredVelocity, d.turnSpeed * (dt*60));
        
        const up = pos.clone().normalize();
        d.velocity.projectOnPlane(up).normalize().multiplyScalar(d.speed);
        pos.add(d.velocity.clone().multiplyScalar(dt));
        pos.normalize().multiplyScalar(altitude);
        
        const right = new THREE.Vector3().crossVectors(d.velocity, up).normalize();
        if (right.lengthSq() < 0.001) right.set(1,0,0).cross(up).normalize();
        const fwd = new THREE.Vector3().crossVectors(up, right).normalize();
        const m = new THREE.Matrix4().makeBasis(right, up, fwd);
        d.mesh.quaternion.setFromRotationMatrix(m);
        d.mesh.rotateZ(Math.sin(Date.now()*0.005 + d.mesh.id) * 0.3);
        
        // Animate propellers
        if (d.mesh.userData && d.mesh.userData.propellers) {
            d.mesh.userData.propellers.forEach(prop => {
                prop.rotation.y += dt * 50.0; // Spin fast
            });
        }
        
        d.cooldown -= dt;
        if (d.target && minDistSq < 0.01 && d.cooldown <= 0) {
            if (d.role === 'Bomber') {
                d.cooldown = 4.0;
                spawnDroneMissile(pos.clone(), d.target.mesh);
                _droneBattleLogEvent(d.faction, `${d.role} launched MISSILE at ${d.target.faction} ${d.target.role}`);
            } else if (d.role === 'Scout') {
                d.cooldown = 1.5;
                spawnDroneLaser(pos.clone(), d.target.mesh.position.clone(), d.faction);
                if (Math.random() < 0.15) d.target.hp -= 1;
                if (Math.random() < 0.3) _droneBattleLogEvent(d.faction, `Scout DETECTED ${d.target.faction} ${d.target.role}`);
            } else {
                d.cooldown = 0.5;
                spawnDroneLaser(pos.clone(), d.target.mesh.position.clone(), d.faction);
                if (Math.random() < 0.3) d.target.hp -= 2;
                if (Math.random() < 0.2) _droneBattleLogEvent(d.faction, `Fighter ENGAGING ${d.target.faction} ${d.target.role}`);
            }
        }
        
        // Regrouping log — fires ONCE when crossing below 30% threshold
        if (d.hp > 0 && d.hp < d.maxHp * 0.3 && !d._regroupLogged) {
            d._regroupLogged = true;
            _droneBattleLogEvent(d.faction, `${d.role} REGROUPING — hull ${Math.round(d.hp/d.maxHp*100)}%`);
        }
        if (d.hp >= d.maxHp * 0.3) d._regroupLogged = false;
        
        if (d.hp <= 0) {
            spawnDroneExplosion(pos.clone());
            _droneBattleLogEvent(d.target ? d.target.faction : d.faction, `${d.faction} ${d.role} DESTROYED`);
            const startVec = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
            pos.copy(startVec.multiplyScalar(altitude));
            d.hp = d.maxHp;
            d._regroupLogged = false;
            d.target = null;
        }
    });
    
    if (!isWTR) return;
    
    // Flush queued drone reasoning logs to faction dashboard panels
    _flushDroneBattleLogs(dt);
    
    for (let i = window.droneBattleState.lasers.length - 1; i >= 0; i--) {
        const l = window.droneBattleState.lasers[i];
        l.life -= dt * 5;
        if (l.life <= 0) { scene.remove(l.mesh); window.droneBattleState.lasers.splice(i, 1); }
        else l.mesh.material.opacity = l.life;
    }
    
    for (let i = window.droneBattleState.missiles.length - 1; i >= 0; i--) {
        const m = window.droneBattleState.missiles[i];
        if (!m.target || !m.target.parent) { 
             scene.remove(m.mesh); window.droneBattleState.missiles.splice(i, 1); continue;
        }
        const toTarget = m.target.position.clone().sub(m.mesh.position).normalize();
        m.velocity.lerp(toTarget.multiplyScalar(0.12), 0.1 * (dt*60));
        m.mesh.position.add(m.velocity.clone().multiplyScalar(dt));
        
        const tUp = m.mesh.position.clone().normalize();
        const tRight = new THREE.Vector3().crossVectors(m.velocity, tUp).normalize();
        const tFwd = new THREE.Vector3().crossVectors(tUp, tRight).normalize();
        m.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tRight, tUp, tFwd));
        
        if (dt > 0 && Math.random() > 0.5) spawnDroneSmoke(m.mesh.position.clone());
        
        if (m.mesh.position.distanceToSquared(m.target.position) < 0.0005) {
            spawnDroneExplosion(m.mesh.position.clone());
            scene.remove(m.mesh); window.droneBattleState.missiles.splice(i, 1);
            const hitDrone = window.droneBattleState.drones.find(d => d.mesh === m.target);
            if (hitDrone) hitDrone.hp -= 15;
        }
    }
    
    for (let i = window.droneBattleState.explosions.length - 1; i >= 0; i--) {
        const e = window.droneBattleState.explosions[i];
        e.life -= dt * e.decayMs;
        if (e.life <= 0) { scene.remove(e.mesh); window.droneBattleState.explosions.splice(i, 1); }
        else {
            const s = e.maxScale * (1 - Math.pow(1 - e.life, 3)); 
            e.mesh.scale.set(s,s,s);
            e.mesh.material.opacity = e.life;
        }
    }
}

function spawnDroneLaser(start, end, faction) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const color = faction === 'RAINCLAUDE' ? 0xff0044 : 0x00aaff;
    const mat = new THREE.LineBasicMaterial({color: color, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending});
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    window.droneBattleState.lasers.push({mesh: line, life: 1.0});
}

// --- DRONE BATTLE REASONING LOG SYSTEM ---
const _droneBattleLogQueue = [];
let _droneBattleLogTimer = 0;

function _droneBattleLogEvent(faction, msg) {
    _droneBattleLogQueue.push({ faction, msg, time: Date.now() });
    if (_droneBattleLogQueue.length > 30) _droneBattleLogQueue.shift();
}

function _flushDroneBattleLogs(dt) {
    _droneBattleLogTimer -= dt;
    if (_droneBattleLogTimer > 0) return;
    _droneBattleLogTimer = 3.0; // Emit every 3 seconds
    
    if (_droneBattleLogQueue.length === 0) return;
    
    // Grab up to 3 most recent events
    const batch = _droneBattleLogQueue.splice(0, Math.min(3, _droneBattleLogQueue.length));
    
    const r0 = document.getElementById('d0-reasoning'); // Gemini panel
    const r1 = document.getElementById('d1-reasoning'); // Rainclaude panel
    
    batch.forEach(evt => {
        const tStr = new Date(evt.time).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
        const line = `<div><span style="color:${evt.faction === 'GEMINI' ? '#0af' : '#f44'}">> [DRONE OPS ${tStr}]</span> ${evt.msg}</div>`;
        
        if (evt.faction === 'GEMINI' && r0) {
            r0.innerHTML += line;
            r0.scrollTop = r0.scrollHeight;
        } else if (evt.faction === 'RAINCLAUDE' && r1) {
            r1.innerHTML += line;
            r1.scrollTop = r1.scrollHeight;
        }
    });
}

function spawnDroneMissile(pos, targetMesh) {
    const geo = new THREE.ConeGeometry(0.002, 0.01, 3);
    geo.rotateX(Math.PI/2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: 0xffaa00}));
    mesh.position.copy(pos);
    scene.add(mesh);
    window.droneBattleState.missiles.push({mesh: mesh, target: targetMesh, velocity: pos.clone().normalize().multiplyScalar(0.05)});
}

function spawnDroneExplosion(pos) {
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(createGlowCanvas('#ffaa00')), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    scene.add(sprite);
    window.droneBattleState.explosions.push({ mesh: sprite, life: 1.0, decayMs: 2.0, maxScale: 0.15 });
}

function spawnDroneSmoke(pos) {
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(createGlowCanvas('#666666')), color: 0x888888, transparent: true, opacity: 0.5 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    scene.add(sprite);
    window.droneBattleState.explosions.push({ mesh: sprite, life: 1.0, decayMs: 1.0, maxScale: 0.05 });
}

// --- WTR SKIN / D3X POOL EFFECTS ---
window.wtrEffectsGroup = new THREE.Group();
window.wtrEffectsGroup.visible = false;
scene.add(window.wtrEffectsGroup);

// Aura Glow Sphere
const wtrGlowGeo = new THREE.SphereGeometry(GLOBE_R * 1.05, 32, 32);
const wtrGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
});
const wtrGlowSphere = new THREE.Mesh(wtrGlowGeo, wtrGlowMat);
window.wtrEffectsGroup.add(wtrGlowSphere);
window.wtrGlowSphere = wtrGlowSphere; // Reference for animation pulse

// 1. Supernova Core (High Polygon)
const supernovaGeo = new THREE.IcosahedronGeometry(GLOBE_R * 1.02, 6); // Detail level 6 = very high poly
function createCloudCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return canvas;
}

const supernovaMat = new THREE.MeshPhongMaterial({
    color: 0x0055ff,
    emissive: 0x00aaff,
    emissiveIntensity: 0.8,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const wtrSupernova = new THREE.Mesh(supernovaGeo, supernovaMat);
window.wtrEffectsGroup.add(wtrSupernova);

// 2. Thick Fog/Steam Particles
const fogGeo = new THREE.BufferGeometry();
const fogPos = [];
const fogSizes = [];
for (let i = 0; i < 400; i++) {
    const r = GLOBE_R * (1.05 + Math.random() * 0.15); // Hugging the core
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    fogPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    fogSizes.push(Math.random() * 1.5 + 0.5); // Variable size
}
fogGeo.setAttribute('position', new THREE.Float32BufferAttribute(fogPos, 3));
fogGeo.setAttribute('size', new THREE.Float32BufferAttribute(fogSizes, 1));
const fogTex = new THREE.CanvasTexture(createCloudCanvas());
const fogMat = new THREE.PointsMaterial({
    color: 0xbbddff,
    map: fogTex,
    size: 2.5,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
});
const wtrFogSystem = new THREE.Points(fogGeo, fogMat);
window.wtrEffectsGroup.add(wtrFogSystem);

// 3. Electric Static Lines (Pulsing energy)
const staticGeo = new THREE.BufferGeometry();
const staticPos = [];
for (let i = 0; i < 80; i++) {
    const r1 = GLOBE_R * 1.02;
    const r2 = GLOBE_R * (1.1 + Math.random() * 0.2);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Start point
    staticPos.push(r1 * Math.sin(phi) * Math.cos(theta), r1 * Math.sin(phi) * Math.sin(theta), r1 * Math.cos(phi));
    // End point branching out
    const theta2 = theta + (Math.random() - 0.5) * 0.2;
    const phi2 = phi + (Math.random() - 0.5) * 0.2;
    staticPos.push(r2 * Math.sin(phi2) * Math.cos(theta2), r2 * Math.sin(phi2) * Math.sin(theta2), r2 * Math.cos(phi2));
}
staticGeo.setAttribute('position', new THREE.Float32BufferAttribute(staticPos, 3));
const staticMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
    blending: THREE.AdditiveBlending
});
const wtrStaticLines = new THREE.LineSegments(staticGeo, staticMat);
window.wtrEffectsGroup.add(wtrStaticLines);

// Reference for animation loop rotations and pulsations
window.wtrParticleSystem = window.wtrEffectsGroup; // Bind the whole group to the legacy rotation target
window.wtrSupernovaCore = wtrSupernova;
window.wtrFogSystem = wtrFogSystem;
window.wtrStaticLines = wtrStaticLines;

function spawnAmbients() {
  const texJet = new THREE.CanvasTexture(createJetCanvas());
  const texSub = new THREE.CanvasTexture(createSubCanvas());
  const texShip = new THREE.CanvasTexture(createShipCanvas());
  const texSat = new THREE.CanvasTexture(createSatelliteCanvas());

  const matJet = new THREE.SpriteMaterial({map: texJet, color: 0xffffff});
  const matSub = new THREE.SpriteMaterial({map: texSub, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending});
  const matShip = new THREE.SpriteMaterial({map: texShip, color: 0xffffff});
  const matSat = new THREE.SpriteMaterial({map: texSat, color: 0xffffff});

  for(let i=0; i<240; i++) { // Doubled again from 120 to 240
    const type = i % 3; // 0: Jet, 1: Sub, 2: Ship
    const mat = type === 0 ? matJet : type === 1 ? matSub : matShip;
    // slightly adjusted orbital heights so they don't clip through the globe as often
    const radius = type === 0 ? 10.8 : (type === 1 ? 10.15 : 10.1);
    
    const sprite = new THREE.Sprite(mat);
    // Increase scale significantly from 0.5 to 1.5 - 2.5
    sprite.scale.set(1.8, 1.8, 1.0);
    
    // Random position
    const phi = Math.acos(-1 + (2 * i)/240);
    const theta = Math.sqrt(240 * Math.PI) * phi;
    sprite.position.setFromSphericalCoords(radius, phi, theta);
    
    const pivot = new THREE.Group();
    pivot.add(sprite);
    scene.add(pivot);
    
    // Orbital mechanics
    const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const speed = (Math.random()*0.0015 + 0.0005) * (type === 0 ? 3 : 1);
    
    ambients.push({ pivot, axis, speed, sprite, type, offset: Math.random()*100 });
  }

  // Spawn 30 Satellites in high orbit
  for(let i=0; i<30; i++) {
    const sprite = new THREE.Sprite(matSat);
    sprite.scale.set(0.6, 0.6, 1.0);
    // High orbit radius
    const radius = 12.5 + Math.random() * 1.5;
    
    const phi = Math.acos(-1 + (2 * i)/30);
    const theta = Math.sqrt(30 * Math.PI) * phi;
    sprite.position.setFromSphericalCoords(radius, phi, theta);
    
    const pivot = new THREE.Group();
    pivot.add(sprite);
    scene.add(pivot);
    
    // Satellites move consistently
    const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const speed = Math.random()*0.0008 + 0.0002;
    ambients.push({ pivot, axis, speed, sprite, type: 3, offset: Math.random()*100 });
  }

  // Spawn 150 Satellites exclusively for Red Skin map
  const texSatRed = new THREE.CanvasTexture(createSatelliteCanvas('#ff0000'));
  const texSatBlue = new THREE.CanvasTexture(createSatelliteCanvas('#0000ff'));
  const matSatRed = new THREE.SpriteMaterial({map: texSatRed, color: 0xffffff});
  const matSatBlue = new THREE.SpriteMaterial({map: texSatBlue, color: 0xffffff});

  for(let i=0; i<50; i++) { // Massively simplified from 600 to 50 for poor-GPU laptops
    let currentMat = matSat;
    if (i < 15) { 
      currentMat = matSatRed;
    } else if (i < 30) {
      currentMat = matSatBlue;
    }
    const sprite = new THREE.Sprite(currentMat);
    sprite.scale.set(0.7, 0.7, 1.0);
    // Denser, slightly lower orbit for red skin scanning effect
    const radius = 11.5 + Math.random() * 2.0; 
    
    // Distribute evenly around the sphere
    const phi = Math.acos(-1 + (2 * i)/600);
    const theta = Math.sqrt(600 * Math.PI) * phi;
    sprite.position.setFromSphericalCoords(radius, phi, theta);
    
    const pivot = new THREE.Group();
    pivot.add(sprite);
    
    // Add blue neon laser beam (hidden by default)
    const laserMat = new THREE.MeshBasicMaterial({ 
      color: 0x00aaff, 
      transparent: true, 
      opacity: 0.6, 
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    // Create a long thin cylinder representing the beam stretching from satellite to earth
    const laserHeight = radius - GLOBE_R;
    const laserGeo = new THREE.CylinderGeometry(0.01, 0.05, laserHeight, 8);
    // Shift geometry so the origin is at the top (at the satellite)
    laserGeo.translate(0, -laserHeight/2, 0); 
    const laserBeam = new THREE.Mesh(laserGeo, laserMat);
    // Position it exactly at the satellite's position
    laserBeam.position.copy(sprite.position);
    // Orient it to point directly at the origin (Earth's center)
    laserBeam.lookAt(new THREE.Vector3(0,0,0));
    laserBeam.rotateX(Math.PI / 2); // Correct orientation since cylinder is along Y
    laserBeam.visible = false;
    
    pivot.add(laserBeam);
    
    // Add click target (large) for Minigame
    const hitBoxGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const hitBoxMat = new THREE.MeshBasicMaterial({visible: false});
    const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    // Position hitbox same as satellite sprite
    hitBox.position.copy(sprite.position);
    pivot.add(hitBox);
    hitBox.userData = { isRedSat: true, parent: pivot };
    redSatMarkers.push(hitBox);

    // Orbital mechanics (slightly faster for dramatic effect on Red Skin)
    const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const speed = Math.random()*0.0015 + 0.0005;
    
    redSatGroup.add(pivot);
    redSats.push({ pivot, axis, speed, offset: Math.random()*100, laser: laserBeam });
  }
}

// =====================================================================
// WORLD BANK <-> SOLANA FLUX AURA
// =====================================================================
let wbSolCurve, wbSolStream1, wbSolStream2, wbSolMat1, wbSolMat2;
setTimeout(() => {
    if (typeof ll2v === 'function' && typeof GLOBE_R !== 'undefined') {
        const p1 = ll2v(0, 15, GLOBE_R + 0.02); // World Bank
        const p2 = ll2v(15, 45, GLOBE_R + 0.05); // Solana Node
        const dist = p1.distanceTo(p2);
        const mid = p1.clone().lerp(p2, 0.5).normalize().multiplyScalar(GLOBE_R + dist * 0.4);
        wbSolCurve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const pts = wbSolCurve.getPoints(50);
        const geom = new THREE.BufferGeometry().setFromPoints(pts);

        wbSolMat1 = new THREE.LineDashedMaterial({ color: 0x00e5ff, dashSize: 0.1, gapSize: 0.1, transparent: true, opacity: 0.8, linewidth: 2 });
        wbSolMat2 = new THREE.LineDashedMaterial({ color: 0xff6600, dashSize: 0.05, gapSize: 0.08, transparent: true, opacity: 0.9, linewidth: 2 });

        wbSolStream1 = new THREE.Line(geom, wbSolMat1);
        wbSolStream1.computeLineDistances();
        wbSolStream1.visible = false;
        
        wbSolStream2 = new THREE.Line(geom, wbSolMat2);
        wbSolStream2.computeLineDistances();
        wbSolStream2.visible = false;

        scene.add(wbSolStream1);
        scene.add(wbSolStream2);
    }
}, 3000); // Wait for scene to init

// =====================================================================
// ANIMATION LOOP
// =====================================================================
const clock3=new THREE.Clock();
let time3=0;

function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock3.getDelta(),.05);
  time3+=dt;
  
  updateDroneBattle(dt);

  // Animate World Bank -> SOL Flux Aura
  if (wbSolStream1 && wbSolStream2) {
      if (window.africaCompaniesGroup && window.africaCompaniesGroup.visible) {
          wbSolStream1.visible = true;
          wbSolStream2.visible = true;
          wbSolMat1.dashOffset -= 0.015;
          wbSolMat2.dashOffset -= 0.025; // orange moves slightly faster
      } else {
          wbSolStream1.visible = false;
          wbSolStream2.visible = false;
      }
  }

  // Animate Satellites & Lasers for all non-LIVE skins
  if (window.currentSkinIndex && window.currentSkinIndex > 0) {
    // 0.8 second cycle for rapid laser flashing strobe
    window.lastLaserTime = window.lastLaserTime || 0;
    if (time3 - window.lastLaserTime > 0.8) {
      window.lastLaserTime = time3;
      // Turn off all existing lasers
      redSats.forEach(s => { if(s.laser) s.laser.visible = false; });
      // Pick 8 random satellites to fire
      if (redSats.length > 8) {
        const firedSats = [];
        for (let i = 0; i < 8; i++) {
            let idx = Math.floor(Math.random() * redSats.length);
            firedSats.push(redSats[idx]);
        }
        
        // Dynamically color the laser based on the current skin color
        const skinColor = SKINS[window.currentSkinIndex].color;
        
        firedSats.forEach(sat => {
            if(sat.laser) {
              sat.laser.material.color.setHex(skinColor);
              sat.laser.visible = true;
            }
        });
        
        // Turn them off very quickly (0.3 seconds) for a flashing strobe effect
        setTimeout(() => {
          firedSats.forEach(sat => {
              if(sat && sat.laser) sat.laser.visible = false;
          });
        }, 300);
      }
    }

    for(let i=0; i<redSats.length; i++) {
      const sat = redSats[i];
      sat.pivot.rotateOnAxis(sat.axis, sat.speed * ((dt*60)||1));
    }
    if (window.planeData) {
      for(let i=0; i<window.planeData.length; i++) {
        const p = window.planeData[i];
        if (p && p.pivot) {
           // Dramatically increase airplane speed
           p.pivot.rotateOnAxis(p.axis, p.speed * 4.0 * ((dt*60)||1));
           
           // Calculate world position of the plane for contrails and bombs
           const planeWorldPos = new THREE.Vector3();
           p.pivot.children[0].getWorldPosition(planeWorldPos);
           
           if (window.isRedSkin) {
               // Diminish heavy particles natively to secure performance
               if (Math.random() < 0.03) {
                   if (!window.redWarfareParticles) window.redWarfareParticles = [];
                   const trailMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(createGlowCanvas('#ffffff')), color: 0xffffff, transparent: true, opacity: 0.8 });
                   const trail = new THREE.Sprite(trailMat);
                   trail.position.copy(planeWorldPos);
                   trail.scale.set(0.02, 0.02, 1);
                   scene.add(trail);
                   redWarfareParticles.push({ mesh: trail, life: 1.0, decay: 0.03, scaleMax: 0.08 });
               }

               // Greatly reduce bomb drops
               if (Math.random() < 0.005) {
               
               const bombGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8);
               const bombMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
               const bomb = new THREE.Mesh(bombGeo, bombMat);
               
               // Start position is the plane, end position is directly below on the surface
               const startPos = planeWorldPos.clone();
               const endPos = startPos.clone().normalize().multiplyScalar(GLOBE_R);
               
               bomb.position.copy(startPos);
               bomb.lookAt(endPos);
               bomb.rotateX(Math.PI / 2); // Point cylinder downward
               
               scene.add(bomb);
               redWarfareProjectiles.push({
                   mesh: bomb, type: 'bomb',
                   startPos: startPos, endPos: endPos,
                   progress: 0, speed: 0.08
               });
           }
        }
      }
    }
    }
    
    // Process Boat flashing sirens and rapid boat rockets
    if (window.isRedSkin && typeof boatMarkers !== 'undefined' && boatMarkers.length > 1) {
        
        // Flashing sirens (alternating red and blue 5 times a second)
        const sirenCycle = Math.floor(time3 * 5) % 2;
        if (!window.cachedSirenRed) window.cachedSirenRed = new THREE.CanvasTexture(createGlowCanvas('#ff0000'));
        if (!window.cachedSirenBlue) window.cachedSirenBlue = new THREE.CanvasTexture(createGlowCanvas('#0066ff'));
        
        boatMarkers.forEach((boat, ix) => {
             if (!boat.userData.sirenSprite) {
                 const mat = new THREE.SpriteMaterial({ map: window.cachedSirenRed, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false });
                 const spr = new THREE.Sprite(mat);
                 spr.scale.set(0.12, 0.12, 1);
                 spr.position.y = 0.03; // Hover just above the boat
                 boat.userData.parent.add(spr);
                 boat.userData.sirenSprite = spr;
             }
             boat.userData.sirenSprite.material.map = (sirenCycle === 0) ? window.cachedSirenRed : window.cachedSirenBlue;
             boat.userData.sirenSprite.visible = (Math.floor(time3*10 + ix) % 2 === 0);
        });

        // Fire rate massively increased
        if (Math.random() < 0.15) {
            // Pick random shooter
            const shooterIdx = Math.floor(Math.random() * boatMarkers.length);
            const shooter = boatMarkers[shooterIdx].userData.parent; // the boatGroup
        
        let targetIdx = Math.floor(Math.random() * boatMarkers.length);
        while(targetIdx === shooterIdx) targetIdx = Math.floor(Math.random() * boatMarkers.length);
        const target = boatMarkers[targetIdx].userData.parent;
        
        if (shooter && target) {
            const startPos = new THREE.Vector3();
            shooter.getWorldPosition(startPos);
            
            const endPos = new THREE.Vector3();
            target.getWorldPosition(endPos);
            
            const rocketGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8);
            const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            const rocket = new THREE.Mesh(rocketGeo, rocketMat);
            
            rocket.position.copy(startPos);
            // Height trajectory arc parameters
            const distance = startPos.distanceTo(endPos);
            const arcHeight = distance * 0.3; 
            
            scene.add(rocket);
            redWarfareProjectiles.push({
                mesh: rocket, type: 'rocket',
                startPos: startPos, endPos: endPos, arcHeight: arcHeight,
                progress: 0, speed: 0.06
            });
        }
    }
    }
    
    // Process Projectiles
    for (let i = redWarfareProjectiles.length - 1; i >= 0; i--) {
        const proj = redWarfareProjectiles[i];
        proj.progress += proj.speed * ((dt*60)||1);
        
        if (proj.progress >= 1.0) {
            // Impact!
            scene.remove(proj.mesh);
            redWarfareProjectiles.splice(i, 1);
            
            // Spawn explosion particle
            let expColor = (proj.type === 'bomb') ? '#ff5500' : '#ffff00';
            const expMat = new THREE.SpriteMaterial({ 
                map: new THREE.CanvasTexture(createGlowCanvas(expColor)), 
                color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending 
            });
            const expSprite = new THREE.Sprite(expMat);
            expSprite.position.copy(proj.endPos);
            expSprite.scale.set(0.05, 0.05, 1);
            scene.add(expSprite);
            
            redWarfareParticles.push({
                mesh: expSprite, life: 1.0, decay: 0.05,
                scaleMax: proj.type === 'bomb' ? 0.3 : 0.2
            });
        } else {
            if (proj.type === 'bomb') {
                proj.mesh.position.copy(proj.startPos).lerp(proj.endPos, proj.progress);
            } else if (proj.type === 'rocket') {
                // Parabolic arc for rocket
                const currentPos = new THREE.Vector3().copy(proj.startPos).lerp(proj.endPos, proj.progress);
                const heightOffset = Math.sin(proj.progress * Math.PI) * proj.arcHeight;
                currentPos.add(currentPos.clone().normalize().multiplyScalar(heightOffset));
                
                // Track previous position for lookAt
                const prevPos = proj.mesh.position.clone();
                proj.mesh.position.copy(currentPos);
                if (proj.progress > 0) {
                    proj.mesh.lookAt(currentPos.clone().add(currentPos.clone().sub(prevPos)));
                    proj.mesh.rotateX(Math.PI / 2);
                }
            }
        }
    }
    
    // Process Explosion Particles
    for (let i = redWarfareParticles.length - 1; i >= 0; i--) {
        const p = redWarfareParticles[i];
        p.life -= p.decay * ((dt*60)||1);
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.material.map.dispose();
            p.mesh.material.dispose();
            redWarfareParticles.splice(i, 1);
        } else {
            // Expand and fade out
            const currentScale = p.scaleMax * (1.0 - p.life);
            p.mesh.scale.set(currentScale, currentScale, 1);
            p.mesh.material.opacity = p.life;
        }
    }
  }

  // WTR 3D Blocks are now static on the globe surface, no animation needed here.

  // Auto-rotate when idle (even during missile flight)
  if(!drag) {
    // Slow down to almost 0 when a country is selected for easier interaction
    const rotSpeed = GS.selected ? 0.0002 : 0.003;
    sph.theta -= rotSpeed * dt * 60; 
    updCam();
  }

  // Animate Cyber Skin Master Datacenter Aura & Color Pulse
  if (window.currentSkinIndex === 3 && window.datacentersGroup && window.datacentersGroup.visible) {
      window.datacentersGroup.children.forEach(dc => {
          if (dc.userData && dc.userData.isD3XExchange) {
              if (dc.userData.aura) {
                  const auraPulse = 0.25 + Math.sin(time3 * 10) * 0.2; // Opacity halved
                  dc.userData.aura.material.opacity = auraPulse;
                  if (dc.userData.light) {
                      dc.userData.light.intensity = 1.5 + Math.sin(time3 * 10) * 0.75; // Intensity halved
                  }
              }
              // Animate Hot Soup Steam
              const steamG = dc.children.find(c => c.userData && c.userData.isSteamGroup);
              if (steamG) {
                  steamG.children.forEach(sprite => {
                      sprite.userData.age += dt;
                      // Move up based on age
                      const upLift = (sprite.userData.age * sprite.userData.speed) % 0.4;
                      sprite.position.y = sprite.userData.basePos.y + upLift;
                      
                      // Fade out as it goes higher
                      const fade = 1.0 - (upLift / 0.4);
                      sprite.material.opacity = Math.max(0, Math.sin(fade * Math.PI) * 0.8);
                      
                      // Slowly expand horizontally
                      const expansion = 1.0 + (upLift * 2.0);
                      const sBase = 0.18; // approx base size
                      sprite.scale.set(sBase * expansion, sBase * expansion, 1);
                  });
              }
          } else if (dc.userData && dc.userData.isMasterNode) {
                            if (dc.userData.aura) {
                 const auraPulse = 0.6 + Math.sin(time3 * 8) * 0.3; // Faster aura blink
                 dc.userData.aura.material.opacity = auraPulse;
                 
                 // Interpolate between Purple and Orange based on time
                 const p = (Math.sin(time3 * 2) + 1) / 2; // 0 to 1
                 const purple = new THREE.Color(0xaa00ff);
                 const orange = new THREE.Color(0xffaa00);
                 dc.material.color.copy(purple).lerp(orange, p);
                 dc.userData.aura.material.color.copy(orange).lerp(purple, p);
                 
                 if (dc.userData.light) {
                     dc.userData.light.color.copy(purple).lerp(orange, p);
                     dc.userData.light.intensity = 2 + Math.sin(time3 * 8) * 1; 
                 }
              }
          }
      });
      // Animate the Interconnection Pulses
      if (window.dcNetworkGroup && window.dcNetworkGroup.visible) {
          window.dcPulses.forEach(p => {
              p.progress += p.speed * dt;
              if (p.progress > 1.0) p.progress -= 1.0;
              p.mesh.position.copy(p.curve.getPoint(p.progress));
          });
      }
      
      // Animate North Pole Tesla Towers
      const npTowers = [];
      window.datacentersGroup.children.forEach(dc => {
          if (dc.userData && dc.userData.isNorthPole) {
              npTowers.push(dc);
              
              // Dynamic pulsing effect using a sine wave
              const pulseVar = Math.sin(time3 * 5 + dc.position.x * 10) * 0.5 + 0.5; // values between 0.0 and 1.0
              
              const buzzOffset = Math.random() * 0.15 + (pulseVar * 0.4); // Reduced by 50%
              dc.userData.aura.scale.set(1 + buzzOffset, 1 + buzzOffset, 1 + buzzOffset);
              
              const rotSpeed = 0.1 + (pulseVar * 0.2); // Reduced by 50%
              dc.userData.aura.rotation.x += rotSpeed;
              dc.userData.aura.rotation.y += rotSpeed * 1.5;
              
              dc.userData.aura.material.opacity = 0.3 + (pulseVar * 0.3); // Reduced by 50%
              
              if (Math.random() < 0.2) dc.userData.light.intensity = 2 + Math.random() * 5 + (pulseVar * 3); // Flashing light follows pulse, reduced by 50%
          }
      });
      
      // Elaborate Electricity Bridges Animation
      if (npTowers.length === 3 && window.npLightningGroup && window.currentSkinIndex === 3) { // CYBER skin
          window.npLightningGroup.visible = true;
          window.npLightningGroup.children.forEach(bridge => {
              bridge.userData.timer -= dt;
              if (bridge.userData.timer <= 0) {
                  const allNodes = window.datacentersGroup.children.filter(n => !n.userData.isNorthPole);
                  if (allNodes.length > 0) {
                      bridge.userData.targetNode = allNodes[Math.floor(Math.random() * allNodes.length)];
                      bridge.userData.timer = 2.0 + Math.random() * 2.0; // Wait 2-4 seconds instead of 4-8, doubling the mapping speed
                  }
              }
              
              if (bridge.userData.targetNode) {
                  const p1 = npTowers[bridge.userData.poleIdx].position;
                  const p2 = bridge.userData.targetNode.position;
                  const dist = p1.distanceTo(p2);
                  const segments = 30;
                  
                  bridge.children.forEach(braid => {
                      const posArray = braid.geometry.attributes.position.array;
                      const phase = time3 * braid.userData.freq1 + braid.userData.phaseOff;
                      const phase2 = time3 * braid.userData.freq2;
                      
                      for (let i = 0; i <= segments; i++) {
                          const t = i / segments;
                          
                          // Base curve (arc) from p1 to p2
                          let bx = p1.x + (p2.x - p1.x) * t;
                          let by = p1.y + (p2.y - p1.y) * t;
                          let bz = p1.z + (p2.z - p1.z) * t;
                          
                          const pCenter = new THREE.Vector3(bx, by, bz);
                          const nor = pCenter.clone().normalize();
                          const arcHeight = Math.sin(t * Math.PI) * dist * 0.4; // 40% height of dist
                          
                          bx += nor.x * arcHeight;
                          by += nor.y * arcHeight;
                          bz += nor.z * arcHeight;
                          
                          // Braid displacement (perpendicular to path)
                          const dir = new THREE.Vector3(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z).normalize();
                          const up = dir.clone().cross(nor).normalize();
                          const right = dir.clone().cross(up).normalize();
                          
                          // Taper radius at ends and pulse overall radius
                          const envelope = Math.sin(t * Math.PI);
                          const pulse = 1.0 + Math.sin(time3 * 10 + braid.userData.phaseOff) * 0.3;
                          let r = braid.userData.radius * envelope * pulse;
                          if (!window.isLowEndDevice) r *= 2.0; // 100% thick strings on GPUs only
                          
                          const dx = Math.cos(phase + t * Math.PI * 4) * r * right.x + Math.sin(phase2 + t * Math.PI * 6) * r * up.x;
                          const dy = Math.cos(phase + t * Math.PI * 4) * r * right.y + Math.sin(phase2 + t * Math.PI * 6) * r * up.y;
                          const dz = Math.cos(phase + t * Math.PI * 4) * r * right.z + Math.sin(phase2 + t * Math.PI * 6) * r * up.z;
                          
                          posArray[i*3] = bx + dx;
                          posArray[i*3+1] = by + dy;
                          posArray[i*3+2] = bz + dz;
                          
                          // Track neon aura sprites to lightning positional vectors
                          if (i % 2 === 0) {
                              const aIdx = i / 2;
                              if (aIdx < braid.userData.auras.length) {
                                  braid.userData.auras[aIdx].position.set(bx + dx, by + dy, bz + dz);
                                  braid.userData.auras[aIdx].visible = true;
                              }
                          }
                      }
                      braid.geometry.attributes.position.needsUpdate = true;
                  });
              } else {
                  bridge.children.forEach(braid => {
                     const posArray = braid.geometry.attributes.position.array;
                     for(let i=0; i<posArray.length; i++) posArray[i] = 0;
                     braid.geometry.attributes.position.needsUpdate = true;
                     braid.userData.auras.forEach(a => a.visible = false); // Hide auras when not zapping
                  });
              }
          });
      } else if (window.npLightningGroup) {
          window.npLightningGroup.visible = false;
      }
  } else if (window.npLightningGroup && window.currentSkinIndex !== 3) {
      window.npLightningGroup.visible = false;
  } // <-- End of Cyber Skin Block
  
  // D3X Mining Caves LGBT Rainbow Oscillator
  if (window.currentSkinIndex === 3 && typeof d3xCaveGroup !== 'undefined' && d3xCaveGroup.visible) {
      const hue = (time3 * 0.2) % 1.0; // cycle through colors every 5 seconds
      const rainbowColor = new THREE.Color().setHSL(hue, 1.0, 0.5);
      
      d3xCaveGroup.children.forEach(cave => {
          cave.children.forEach(child => {
              if (child.userData.isD3XCore) {
                  child.material.color.copy(rainbowColor);
              } else if (child.userData.isD3XRock) {
                  child.material.emissive.copy(rainbowColor);
                  child.material.emissiveIntensity = 0.5 + Math.sin(time3 * 5) * 0.2; // Pulsing blur/glow effect
              }
          });
      });
  }
  
  // WTR Skin / D3X Pool Animations
  if (window.wtrEffectsGroup && window.wtrEffectsGroup.visible) {
      if (window.wtrSupernovaCore) {
          const sPulse = 1.0 + Math.sin(time3 * 5) * 0.05;
          window.wtrSupernovaCore.scale.set(sPulse, sPulse, sPulse);
          window.wtrSupernovaCore.rotation.y += 0.002;
          window.wtrSupernovaCore.rotation.z += 0.001;
      }
      if (window.wtrFogSystem) {
          window.wtrFogSystem.rotation.y -= 0.001;
      }
      if (window.wtrStaticLines) {
          window.wtrStaticLines.rotation.y += 0.005;
          window.wtrStaticLines.rotation.x += 0.003;
          const ePulse = 1.0 + Math.random() * 0.1;
          window.wtrStaticLines.scale.set(ePulse, ePulse, ePulse);
      }
      if (window.wtrGlowSphere) {
          // Dynamic pulsing aura
          const wtrPulse = 1.05 + Math.sin(Date.now() * 0.002) * 0.015;
          window.wtrGlowSphere.scale.set(wtrPulse, wtrPulse, wtrPulse);
      }
  }

  // ---------------------------------------------------------------------
  // MOCK CRYPTO WAR LOGIC (Gemini vs Rainclaude Feeds)
  // ---------------------------------------------------------------------
  if (Math.random() < 0.05) { // 5% chance per frame (~3 times a second)
      const isGemini = Math.random() > 0.5;
      const coins = ['D3X', 'SOL', 'BTC', 'ETH', 'XRP', 'XLM', 'USDC'];
      const coin = coins[Math.floor(Math.random() * coins.length)];
      const actions = isGemini ? ['LONG', 'BUY', 'STAKE', 'ACCUMULATE'] : ['SHORT', 'SELL', 'LIQUIDATE', 'DUMP'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const amt = Math.floor(Math.random() * 500000) + 10000;
      
      if (!window.geminiCryptoVol) window.geminiCryptoVol = 0;
      if (!window.claudeCryptoVol) window.claudeCryptoVol = 0;
      
      if (isGemini) {
          window.geminiCryptoVol += amt;
          const line = document.createElement('div');
          line.innerHTML = `> Executed: ${action} $${Math.floor(amt).toLocaleString()} <span style="color:#fff">${coin}</span>`;
          const container = document.getElementById('d0-crypto-lines');
          if (container) {
              container.prepend(line);
              if (container.children.length > 5) container.lastChild.remove();
              document.getElementById('d0-crypto-total').innerText = 'VOL: $' + window.geminiCryptoVol.toLocaleString();
          }
          if (['BUY', 'STAKE', 'ACCUMULATE'].includes(action) && window.ws && window.ws.readyState === WebSocket.OPEN) {
              window.ws.send(JSON.stringify({ type: 'ai_market_buy', aiName: 'gemini', cost: amt / 1000, itemType: coin }));
          }
      } else {
          window.claudeCryptoVol += amt;
          const line = document.createElement('div');
          line.innerHTML = `> Executed: ${action} $${Math.floor(amt).toLocaleString()} <span style="color:#fff">${coin}</span>`;
          const container = document.getElementById('d1-crypto-lines');
          if (container) {
              container.prepend(line);
              if (container.children.length > 5) container.lastChild.remove();
              document.getElementById('d1-crypto-total').innerText = 'VOL: $' + window.claudeCryptoVol.toLocaleString();
          }
          if (['BUY', 'STAKE', 'ACCUMULATE'].includes(action) && window.ws && window.ws.readyState === WebSocket.OPEN) {
              window.ws.send(JSON.stringify({ type: 'ai_market_buy', aiName: 'claude', cost: amt / 1000, itemType: coin }));
          }
      }
  }

  // Update missiles
  for(let i=missiles3D.length-1;i>=0;i--){
    const m=missiles3D[i];
    m.progress=Math.min(1,m.progress+dt*m.speed);
    m.time=(m.time||0)+dt;

    // Remove old trails
    if(m.trailLine){m.group.remove(m.trailLine);m.trailLine.geometry.dispose();}
    if(m.innerTrailLine){m.group.remove(m.innerTrailLine);m.innerTrailLine.geometry.dispose();}

    // Build outer glow trail (fades back from head)
    const STEPS=60;
    const outerPts=[], innerPts=[];
    for(let s=0;s<=STEPS;s++){
      const t=(s/STEPS)*m.progress;
      const d=slerp3D(m.sd,m.ed,t).normalize();
      const h=GLOBE_R+Math.sin(t*Math.PI)*.65;
      const pt=d.clone().multiplyScalar(h);
      outerPts.push(pt);
      if(s>STEPS*0.5) innerPts.push(pt); // inner trail only near head
    }
    m.trailLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(outerPts),m.trailMat);
    m.group.add(m.trailLine);
    if(innerPts.length>1){
      m.innerTrailLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(innerPts),m.innerTrailMat);
      m.group.add(m.innerTrailLine);
    }

    // Position rocket body & glow at head
    const headDir=slerp3D(m.sd,m.ed,m.progress).normalize();
    const headH=GLOBE_R+Math.sin(m.progress*Math.PI)*.65;
    const headPos=headDir.clone().multiplyScalar(headH);

    m.body.position.copy(headPos);
    m.glow.position.copy(headPos);

    // Orient rocket body along travel direction
    if(m.progress<0.99){
      const nextT=Math.min(1,m.progress+0.02);
      const nextDir=slerp3D(m.sd,m.ed,nextT).normalize();
      const nextH=GLOBE_R+Math.sin(nextT*Math.PI)*.65;
      const nextPos=nextDir.multiplyScalar(nextH);
      const dir=nextPos.clone().sub(headPos).normalize();
      m.body.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
      // Plume behind rocket
      const plumePos=headPos.clone().sub(dir.clone().multiplyScalar(.025));
      m.plume.position.copy(plumePos);
      m.plume.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().negate());
    }

    // Pulse glow on rocket head
    const pulse=0.4+0.3*Math.sin(m.time*25);
    m.glow.material.opacity=pulse;
    m.plume.material.opacity=0.5+0.4*Math.sin(m.time*30);

    const _s = window.SKINS && window.SKINS[window.currentSkinIndex];
    m.group.visible = !(_s && (_s.name === 'BLK' || _s.name === 'GRN'));

    if(m.progress>=1){
      scene.remove(m.group);
      spawnExplosion3D(countryData[m.toIso]?.lat,countryData[m.toIso]?.lon,m.col);
      
      // Calculate random ambient damage (5, 10, or 15)
      const randomDamage = (Math.floor(Math.random() * 3) + 1) * 5; 
      
      // Decrease actual troop count in the background simulation
      if (typeof GS !== 'undefined' && GS.countries && GS.countries[m.toIso]) {
         const def = GS.countries[m.toIso];
         
         // Only deplete troops if someone owns it, and prevent dropping below 0
         if (def.troops > 0) {
            // we treat 1 as 10k in the engine basically, so subtracting randomDamage (5) means 0.5 logical troops
            def.troops = Math.max(0, def.troops - (randomDamage / 10)); 
            if (typeof updateTroopSprite === 'function') {
                updateTroopSprite(m.toIso);
            }
         }
      }
      
      spawnFloatingText3D(countryData[m.toIso]?.lat, countryData[m.toIso]?.lon, `-${randomDamage}K`, 0xff2222);
      missiles3D.splice(i,1);
    }
  }

  // Update floating damage texts
  for (let i = floatingTexts3D.length - 1; i >= 0; i--) {
    const ft = floatingTexts3D[i];
    ft.life -= dt;
    if (ft.life <= 0) {
      scene.remove(ft.sprite);
      if (ft.sprite.material.map) ft.sprite.material.map.dispose();
      ft.sprite.material.dispose();
      floatingTexts3D.splice(i, 1);
    } else {
      // Drift upwards
      ft.pos.add(ft.dir.clone().multiplyScalar(dt * 0.15));
      ft.sprite.position.copy(ft.pos);
      // Fade out
      ft.sprite.material.opacity = ft.life / ft.maxLife;
      // Fade out and flip based on side of the globe
      const _s = window.SKINS && window.SKINS[window.currentSkinIndex];
      ft.sprite.visible = !(_s && (_s.cleanGlobe || _s.hideTroops));
      
      // Orient correctly facing out
      const dot = camera.position.clone().normalize().dot(ft.dir);
      if (dot < 0) ft.sprite.visible = false; // Hide if on back of globe
    }
  }

  // Update fake visual troop movements
  for(let i=fakeTroops3D.length-1;i>=0;i--){
    const ft=fakeTroops3D[i];
    ft.progress=Math.min(1,ft.progress+dt*ft.speed);
    
    // Calculate arc over globe
    const currentDir = slerp3D(ft.sd, ft.ed, ft.progress).normalize();
    const currentH = GLOBE_R + 0.04 + Math.sin(ft.progress * Math.PI) * 0.3; // fly slightly above the globe
    const pos = currentDir.multiplyScalar(currentH);
    
    ft.sprite.position.copy(pos);
    
    const _s = window.SKINS && window.SKINS[window.currentSkinIndex];
    ft.sprite.visible = !(_s && (_s.cleanGlobe || _s.hideTroops));
    
    if(ft.progress>=1){
      scene.remove(ft.group);
      fakeTroops3D.splice(i,1);
    }
  }

  // Update fake visual jet flights (straight paths, steam contrails)
  for(let i=fakeJets3D.length-1;i>=0;i--){
    const fj=fakeJets3D[i];
    fj.progress=Math.min(1,fj.progress+dt*fj.speed);

    if(fj.trailLine){fj.group.remove(fj.trailLine);fj.trailLine.geometry.dispose();}

    // Build contrail (steamy white/gray) fading back
    // For straight rockets, fade the trail out over distance
    const STEPS=40;
    const pts=[];
    const colors=[]; // For vertex coloring the fading trail
    const customMat = fj.straight ? new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      linewidth: 3,
      opacity: 1.0
    }) : fj.trailMat;

    for(let s=0;s<=STEPS;s++){
      // T goes from 0 at the tail, to fj.progress at the head
      const t=(s/STEPS)*fj.progress;
      let pos;
      
      if (fj.straight) {
        let rawPos = fj.sd.clone().lerp(fj.ed, t);
        const upAxis = fj.sd.clone().normalize();
        const arbitrary = new THREE.Vector3(0, 1, 0);
        if(Math.abs(upAxis.y) > 0.99) arbitrary.set(1, 0, 0);
        const rightAxis = new THREE.Vector3().crossVectors(upAxis, arbitrary).normalize();
        
        // Bend 20% more and 40% faster
        const bendProgress = Math.pow(t, 0.6); // 40% faster bending
        const bendAngle = bendProgress * (Math.PI / 8.333); // 20% more bend
        
        rawPos.applyAxisAngle(rightAxis, bendAngle);
        pos = rawPos;
        // Calculate fade based on distance from the current rocket head
        // Head is at fj.progress. Tail is at 0.
        // We want the tail to fade to 0 opacity.
        // But for rockets we want the trail to slowly dissipate, so points near the bottom fade away.
        const distanceBehindHead = fj.progress - t; // 0 at head, up to fj.progress at bottom
        
        let alpha = 1.0 - (distanceBehindHead * 3.0); // dissipates twice as fast
        if (alpha < 0) alpha = 0;
        
        // Orange/yellow fire at the head, fading to smoke/invisible at the tail
        const color = new THREE.Color(1.0, 0.7 + (0.3 * alpha), alpha);
        colors.push(color.r, color.g, color.b);
        // Pack alpha into a hacky way or just fade to black if additive blending (LineBasicMaterial doesn't do per-vertex alpha cleanly by default without ShaderMaterial, but we can fade to black with additive blending or just let it cut off). We will use vertex colors grading to black for fade.
        if (alpha <= 0.01) {
           colors[colors.length-3] = 0;
           colors[colors.length-2] = 0;
           colors[colors.length-1] = 0;
        } else {
           // dim the color to act like alpha pre-multiplied against a dark background
           colors[colors.length-3] *= alpha;
           colors[colors.length-2] *= alpha;
           colors[colors.length-1] *= alpha;
        }
      } else {
        const d=slerp3D(fj.sd,fj.ed,t).normalize();
        const arcH = GLOBE_R + 0.04 + Math.sin(t * Math.PI) * 0.15;
        pos = d.clone().multiplyScalar(arcH);
      }
      pts.push(pos);
    }
    
    if(pts.length>1) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      if (fj.straight) {
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        customMat.blending = THREE.AdditiveBlending;
        fj.trailLine = new THREE.Line(geo, customMat);
      } else {
        fj.trailLine = new THREE.Line(geo, customMat);
      }
      fj.group.add(fj.trailLine);
    }

    // Position sprite
    let pos, currentDir;
    if (fj.straight) {
      // Calculate straight radial position
      let rawPos = fj.sd.clone().lerp(fj.ed, fj.progress);
      
      // Apply a curve to the straight line based on progress
      const upAxis = fj.sd.clone().normalize();
      const arbitrary = new THREE.Vector3(0, 1, 0);
      if(Math.abs(upAxis.y) > 0.99) arbitrary.set(1, 0, 0); // Handle poles
      
      const rightAxis = new THREE.Vector3().crossVectors(upAxis, arbitrary).normalize();
      
      // Bend 20% more and 40% faster
      const bendProgress = Math.pow(fj.progress, 0.6); // 40% faster
      const bendAngle = bendProgress * (Math.PI / 8.333); // 20% more curve
      
      // Rotate the position to make it curve sideways
      rawPos.applyAxisAngle(rightAxis, bendAngle);
      pos = rawPos;
      
      currentDir = pos.clone().sub(fj.sd).normalize(); // Update direction to match the curve
    } else {
      currentDir=slerp3D(fj.sd,fj.ed,fj.progress).normalize();
      const arcH = GLOBE_R + 0.04 + Math.sin(fj.progress * Math.PI) * 0.15;
      pos=currentDir.clone().multiplyScalar(arcH);
    }
    fj.body.position.copy(pos);

    // Orient sprite to flight direction
    let prevDir;
    if (fj.straight) {
        prevDir = currentDir;
    } else {
        prevDir=slerp3D(fj.sd,fj.ed,Math.max(0,fj.progress-0.01)).normalize();
    }
    const up=pos.clone().normalize();
    
    // For straight rockets heading outward, the forward vector IS the up vector essentially
    let forward;
    if (fj.straight) {
       forward = currentDir.clone();
    } else {
       forward = currentDir.clone().sub(prevDir).normalize();
    }
    
    if (fj.straight) {
      // Space rockets orient along their flight path
      const screenPos = pos.clone().project(camera);
      const prevScreenPos = fj.sd.clone().project(camera); // Use launch site for orientation baseline
      const dx = screenPos.x - prevScreenPos.x;
      const dy = screenPos.y - prevScreenPos.y;
      fj.body.material.rotation = Math.atan2(dy, dx) - Math.PI/2 - (Math.PI / 6); // Add slight tilt for visuals
    } else {
      let right=new THREE.Vector3().crossVectors(forward,up).normalize();
      const flatFwd=new THREE.Vector3().crossVectors(up,right).normalize();
      let angle=Math.atan2(flatFwd.y,flatFwd.x);
      fj.body.material.rotation = angle - Math.PI/2;
    }

    const _skin = window.SKINS && window.SKINS[window.currentSkinIndex];
    fj.group.visible = !(_skin && (_skin.name === 'BLK' || _skin.name === 'GRN' || _skin.name === 'WTR' || window.currentSkinIndex === 6));

    if(fj.progress>=1){
      scene.remove(fj.group);
      fakeJets3D.splice(i,1);
    }
  }

  // Update Squadron Formations
  for(let i=squadrons3D.length-1;i>=0;i--){
    const sq=squadrons3D[i];
    sq.progress=Math.min(1,sq.progress+dt*sq.speed);

    const currentDir=slerp3D(sq.sd,sq.ed,sq.progress).normalize();
    const arcH = GLOBE_R + 0.06 + Math.sin(sq.progress * Math.PI) * 0.15; // Fly slightly higher than normal jets
    const centerPos = currentDir.clone().multiplyScalar(arcH);
    
    // Calculate basis vectors for formation offsetting
    const prevDir=slerp3D(sq.sd,sq.ed,Math.max(0,sq.progress-0.01)).normalize();
    const forward=currentDir.clone().sub(prevDir).normalize();
    const up=centerPos.clone().normalize();
    const right=new THREE.Vector3().crossVectors(forward,up).normalize();

    // Sprite rotation angle
    const flatFwd=new THREE.Vector3().crossVectors(up,right).normalize();
    let angle=Math.atan2(flatFwd.y,flatFwd.x) - Math.PI/2 - Math.PI/6; // Added 30deg left turn
    
    // Apply layout offsets for each jet
    sq.jets.forEach(jet => {
      const pos = centerPos.clone()
        .add(right.clone().multiplyScalar(jet.offsetRight))
        .sub(forward.clone().multiplyScalar(jet.offsetBack));
      
      jet.body.position.copy(pos);
      jet.body.material.rotation = angle;
      
      // Update trail
      if(jet.trailLine){sq.group.remove(jet.trailLine); jet.trailLine.geometry.dispose();}
      
      // Trail points: Only keep the most recent N points for a tail effect
      jet.trailPts.push(pos.clone());
      if (jet.trailPts.length > 40) jet.trailPts.shift();

      if(jet.trailPts.length>1) {
         jet.trailLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(jet.trailPts),sq.trailMat);
         sq.group.add(jet.trailLine);
      }
    });

    const _skinSq = window.SKINS && window.SKINS[window.currentSkinIndex];
    sq.group.visible = !(_skinSq && (_skinSq.name === 'BLK' || _skinSq.name === 'GRN' || _skinSq.name === 'WTR' || window.currentSkinIndex === 6));

    if(sq.progress>=1){
      sq.jets.forEach(j=>{if(j.trailLine){sq.group.remove(j.trailLine); j.trailLine.geometry.dispose();}});
      scene.remove(sq.group);
      squadrons3D.splice(i,1);
    }
  }

  // Update explosions
  for(let i=explosions3D.length-1;i>=0;i--){
    const ex=explosions3D[i];
    ex.life-=dt*.7;
    if(ex.life<=0){ex.rings.forEach(r=>scene.remove(r.ring));scene.remove(ex.flash);explosions3D.splice(i,1);continue;}
    
    const startLife = ex.maxLife || 1.0; 
    const maxR = ex.maxRadius || 0.024;
    const fGrowth = ex.flashGrowth || 4.8;
    const maxROpacity = ex.maxRingOpacity || 0.9;
    const maxFOpacity = ex.maxFlashOpacity || 1.0;
    
    ex.rings.forEach((g,ri)=>{
      const t=Math.max(0,(startLife-ex.life)*(1-g.delay*.5));
      const s=t*maxR+.001; 
      const len = g.pts ? g.pts.length : 65;
      const pts=Array.from({length:len},(_,j)=>{
        const a=(j/(len-1))*Math.PI*2;
        return g.c.clone().addScaledVector(g.t1,Math.cos(a)*s).addScaledVector(g.t2,Math.sin(a)*s);
      });
      g.ring.geometry.setFromPoints(pts);
      g.mat.opacity=(ex.life/startLife)*maxROpacity;
    });
    ex.flashMat.opacity=Math.min(maxFOpacity,(ex.life/startLife)*3.*maxFOpacity);
    ex.flash.scale.setScalar(1+(startLife-ex.life)*fGrowth); 
  }

  // Update cyber glitches
  for(let i=cyberGlitches.length-1;i>=0;i--){
    const cg = cyberGlitches[i];
    cg.life -= dt;
    if(cg.life <= 0) {
      cg.mesh.traverse(obj => {
        if(obj.isLine && obj.material) obj.material.color.setHex(cg.origColor);
      });
      cyberGlitches.splice(i,1);
      continue;
    }
    // Glitch effect: rapidly alternate between matrix green and a darker green/original
    cg.mesh.traverse(obj => {
      if(obj.isLine && obj.material) {
        if (Math.random() > 0.5) {
          obj.material.color.setHex(Math.random() > 0.5 ? 0x00ff44 : 0x008822);
        } else {
          obj.material.color.setHex(cg.origColor);
        }
      }
    });
  }

  // Cull troop sprites that are behind the globe
  const _currSkin = window.SKINS && window.SKINS[window.currentSkinIndex];
  const isCleanGlobe = _currSkin && (_currSkin.cleanGlobe || _currSkin.hideTroops);
  const camDir = camera.position.clone().normalize();
  for (const [, sprite] of Object.entries(troopSprites)) {
    if (!sprite.position) continue;
    if (isCleanGlobe) {
      sprite.visible = false;
      continue;
    }
    const sDir = sprite.position.clone().normalize();
    // dot > 0 = facing camera side. Use a threshold so edge countries don't flicker
    sprite.visible = camDir.dot(sDir) > 0.08;
  }

  // Render ambients and backface culling
  const time = Date.now() * 0.002;
  ambients.forEach(amb => {
    amb.pivot.rotateOnAxis(amb.axis, amb.speed);
    
    // Pulsing glow for subs
    if (amb.type === 1) {
      const s = 1.3 + Math.sin(time * 2 + amb.offset) * 0.7; // larger pulse
      amb.sprite.scale.set(s, s, 1);
    }
    
    // Backface culling and WTR skin override
    if (window.currentSkinIndex === 6) {
      amb.sprite.visible = false;
    } else {
      const pos = new THREE.Vector3();
      amb.sprite.getWorldPosition(pos);
      const dot = camDir.dot(pos.normalize());
      amb.sprite.visible = dot > 0.08;
    }
  });

  // Animate global trade transportation (Tyres, Trains, Ships, Planes)
  if (window.activeTrades && window.globalTradeGroup && window.globalTradeGroup.visible) {
    window.activeTrades.forEach(trade => {
       trade.t += trade.speed * dt * 60; // Normalize speed to framerate
       if (trade.t > 1) trade.t = 0; // Wrap around
       
       const point = trade.curve.getPointAt(trade.t);
       trade.mesh.position.copy(point);
       
       // Calculate tangent to point nose in direction of travel
       if (trade.t < 0.99) {
          const nextPoint = trade.curve.getPointAt(trade.t + 0.01);
          trade.mesh.lookAt(nextPoint);
       }
       
       // Culling for trade meshes
       const dot = camDir.dot(point.clone().normalize());
       trade.mesh.visible = dot > 0.05;
    });
  }

  // Animate ISS Orbit
  if (window.issOrbitGroup && window.issGroup && window.issGroup.visible) {
    window.issOrbitGroup.rotation.y += dt * 0.15; // Complete orbit roughly every 40-50 seconds
  }

  // Animate Metal Trades Glowing (Yellow Skin)
  if (window.metalsTradeGroup && window.metalsTradeGroup.visible) {
    window.metalsTradeGroup.children.forEach(sprite => {
      sprite.userData.phase += 0.02;
      const s = sprite.userData.baseScale * (1 + 0.3 * Math.sin(sprite.userData.phase));
      sprite.scale.set(s, s, 1);
      sprite.material.opacity = 0.5 + 0.5 * Math.sin(sprite.userData.phase * 0.5);
    });
  }

  // Animate D3X Exchange Arrows (Cyber Skin)
  if (window.currentSkinIndex === 3 && window.datacentersGroup && window.datacentersGroup.visible) {
    window.datacentersGroup.children.forEach(mesh => {
      if (mesh.userData.isD3XExchange && mesh.userData.arrowGroup) {
        mesh.userData.arrowGroup.rotation.y += 0.02; // Rotate the arrows continuously
      }
    });
  }

  // --- CYBER WARFARE ANIMATION LOOP (BLK SKIN) ---
  if (!window.cyberWarfareStats) window.cyberWarfareStats = { fundsStolen: 0, companiesBreached: 0, companyLog: [] };
  if (window.activeAttacks && Object.keys(window.activeAttacks).length > 0) {
      const now = Date.now();
      const termBox = document.getElementById('d0-reasoning');
      
      for (const uuid in window.activeAttacks) {
          const attack = window.activeAttacks[uuid];
          const mesh = attack.mesh;
          
          if (now < attack.startTime) continue; // Staggered start delay wait
          
          const elapsed = now - attack.startTime;
          
          if (attack.state === 'attack') {
              // Pulse Red
              const pulse = (Math.sin(elapsed * 0.015) + 1) / 2; // 0 to 1
              mesh.material.color.setHex(attack.mesh.userData.baseColor);
              mesh.material.color.lerp(new THREE.Color(0xff0000), pulse);
              
              if (elapsed > attack.defenseTime) {
                  // Resolve Attack
                  const isDefended = Math.random() < 0.75; // 75% chance Gemini intercepts
                  
                  if (isDefended) {
                      attack.state = 'defend';
                      mesh.material.color.setHex(0x00ff00); // Flashes Green
                      
                      if (termBox && Math.random() < 0.2) { // 20% log rate
                          const div = document.createElement('div');
                          div.innerHTML = `> [NET] <span style="color:#0f8">Gemini intercepted</span> intrusion at <span style="color:#fff">${mesh.userData.name}</span>!`;
                          termBox.appendChild(div);
                          if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                          termBox.scrollTop = termBox.scrollHeight;
                      }
                  } else {
                      attack.state = 'breach';
                      mesh.material.color.setHex(0x880000); // Dark Red
                      
                      if (termBox && Math.random() < 0.2) {
                          const div = document.createElement('div');
                          div.innerHTML = `> [ERR] <span style="color:#f24">BREACH DETECTED</span> at <span style="color:#fff">${mesh.userData.name}</span>! Data compromised.`;
                          termBox.appendChild(div);
                          if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                          termBox.scrollTop = termBox.scrollHeight;
                      }
                      
                      // Cyber Warfare Stats tracking
                      const stolenAmnt = (Math.random() * 5 + 1); // 1-6M stolen per breach
                      window.cyberWarfareStats.companiesBreached++;
                      window.cyberWarfareStats.fundsStolen += stolenAmnt; 
                      window.cyberWarfareStats.companyLog.push({ name: mesh.userData.name, amount: stolenAmnt });
                      
                      if (typeof _sfxError !== 'undefined' && Math.random() < 0.3) _sfxError();
                  }
                  
                  attack.resolveTime = now;
              }
          } else if (attack.state === 'defend' || attack.state === 'breach') {
              // Wait 1.5 seconds then clear
              if (now - attack.resolveTime > 1500) {
                  mesh.material.color.setHex(attack.mesh.userData.baseColor);
                  delete window.activeAttacks[uuid];
              }
          } else if (attack.state === 'datacenter_attack') {
              // Pulse Green/Cyan
              const pulse = (Math.sin(elapsed * 0.015) + 1) / 2; // 0 to 1
              mesh.material.color.setHex(attack.mesh.userData.baseColor);
              mesh.material.color.lerp(new THREE.Color(0x00ffaa), pulse);
              
              if (elapsed > attack.defenseTime) {
                  // Resolve Attack
                  const isDefended = Math.random() < 0.75; // 75% chance Rainclaude repels
                  
                  if (isDefended) {
                      attack.state = 'datacenter_defend';
                      mesh.material.color.setHex(0x880000); // Flashes Dark Red (Rainclaude blocks)
                  } else {
                      attack.state = 'datacenter_breach';
                      mesh.material.color.setHex(0xffffff); // Flashes White/Blue (Gemini cuts through)
                      
                      if (termBox && Math.random() < 0.2) {
                          const div = document.createElement('div');
                          div.innerHTML = `> [SUCCESS] Gemini breached <span style="color:#fff">${mesh.userData.name}</span> firewall!`;
                          termBox.appendChild(div);
                          if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                          termBox.scrollTop = termBox.scrollHeight;
                      }
                  }
                  attack.resolveTime = now;
              }
          } else if (attack.state === 'datacenter_defend' || attack.state === 'datacenter_breach') {
              // Wait 1.5 seconds then clear
              if (now - attack.resolveTime > 1500) {
                  mesh.material.color.setHex(attack.mesh.userData.baseColor);
                  delete window.activeAttacks[uuid];
              }
          }
      }
  }

  renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{
  renderer.setSize(innerWidth/0.75,innerHeight/0.75);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});

function triggerAmbientWarfare() {
  SFX.playAmbientRumble();
  const isos = Object.keys(countryData);
  if (isos.length < 2) return;

  // Random delay between 7 and 12 seconds
  const nextTime = 7000 + Math.random() * 5000;
  
  // Choose random effect type: mostly missiles, sometimes just explosions
  const type = Math.random() > 0.3 ? 1 : 0;
  
  // Pick random colors: Humanity Blue, Rainclaude Red, or Generic Orange
  const cols = [0x00dcff, 0xff3232, 0xffaa00];
  const col = cols[Math.floor(Math.random() * cols.length)];

  // 1 to 3 simultaneous effects for dramatic impact
  const maxEffects = 1 + Math.floor(Math.random() * 3); 
  
  for(let i=0; i<maxEffects; i++) {
    const origin = isos[Math.floor(Math.random() * isos.length)];
    const target = isos[Math.floor(Math.random() * isos.length)];
    
    // Don't launch if identical
    if (type === 1 && origin !== target) {
      launchMissile3D(origin, target, col);
    } else {
      const cd = countryData[target];
      if (cd && cd.lat !== undefined) {
        // Add slight randomness to lat/lon for variety
        const lat = cd.lat + (Math.random() - 0.5) * 8;
        const lon = cd.lon + (Math.random() - 0.5) * 8;
        spawnExplosion3D(lat, lon, col);
      }
    }
  }

  setTimeout(triggerAmbientWarfare, nextTime);
}

// Start ambient war loop after brief initial delay
setTimeout(triggerAmbientWarfare, 8000);

// Datacenter Power Consumption Loop
setInterval(() => {
    const powerBox = document.getElementById('datacenter-power-display');
    if (powerBox && powerBox.style.display !== 'none') {
        const humPwrEl = document.getElementById('hum-pwr');
        const rcPwrEl = document.getElementById('rc-pwr');
        
        let humBase = 2.41; // TW
        let rcBase = 812;   // GW
        
        let activeAttacks = 0;
        if (window.activeAttacks) {
            for (const key in window.activeAttacks) {
                const atk = window.activeAttacks[key];
                if (atk && (atk.state === 'datacenter_attack' || atk.state === 'datacenter_defend' || atk.state === 'datacenter_breach')) {
                    activeAttacks++;
                }
            }
        }
        
        const humSpike = (activeAttacks * 0.05) + (Math.random() * 0.08 - 0.04);
        const rcSpike = (activeAttacks * 45) + (Math.random() * 12 - 6);
        const humTotal = (humBase + humSpike).toFixed(2);
        const rcTotal = Math.round(rcBase + rcSpike);
        
        if (humPwrEl) humPwrEl.innerText = `${humTotal} TW`;
        if (rcPwrEl) rcPwrEl.innerText = `${rcTotal} GW`;

        // ==== CO-OP GAMEPLAY LOGIC ====
        
        // 1. Process Gemini Sync (Auto-balance power and cool nodes)
        if (window.coopGeminiSync) {
            if (window.coopPUE > 1.3) {
                window.coopCoolAlloc = 80;
                window.coopCompAlloc = 20;
            } else {
                window.coopCoolAlloc = 40;
                window.coopCompAlloc = 60;
            }
        }

        // 2. Budget Regeneration & PUE calculation
        const regenRate = 0.5 * (window.coopCoolAlloc / 100);
        window.coopPUE += (Math.random() * 0.02) - 0.008; 
        if(window.coopPUE < 1.0) window.coopPUE = 1.0;
        if(window.coopPUE > 2.0) window.coopPUE = 2.0;

        window.coopPwrBudget += regenRate * (2.0 - window.coopPUE);
        if(window.coopPwrBudget > 100) window.coopPwrBudget = 100;
        
        const bEl = document.getElementById('power-budget-val');
        if(bEl) bEl.innerText = Math.floor(window.coopPwrBudget);
        const pEl = document.getElementById('pue-val');
        if(pEl) {
            pEl.innerText = window.coopPUE.toFixed(2);
            if(window.coopPUE > 1.5) pEl.style.color = '#f24';
            else pEl.style.color = '#0f8';
        }

        // 3. Update active panel if open
        if (window.selectedDatacenter && document.getElementById('datacenter-action-panel').style.display === 'block') {
             const dc = window.selectedDatacenter;
             if(dc.owner === 'RAINCLAUDE') {
                  dc.integrity = Math.min(100, (dc.integrity || 100) + 1);
             } else {
                  dc.temp = Math.min(100, (dc.temp || 45) + (Math.random() * 0.5));
             }
             document.getElementById('da-integrity').innerText = Math.floor(dc.integrity || 100) + '%';
             document.getElementById('da-temp').innerText = Math.floor(dc.temp || 45) + '°C';
        }
        
        // 4. Gemini Advisor Feed
        if (Math.random() < 0.1) {
            const feed = document.getElementById('gemini-feed');
            if(feed) {
               const msgs = [
                  "[GEMINI] Optimize cooling to reduce PUE.",
                  "[GEMINI] Rainclaude power spike detected.",
                  "[GEMINI] Rerouting auxiliary compute to attack vectors.",
                  "[GEMINI] WARNING: Node temperatures fluctuating.",
                  "[GEMINI] Standing by for manual override."
               ];
               const div = document.createElement('div');
               div.style.color = Math.random() > 0.8 ? '#fa0' : '#0af';
               div.innerText = msgs[Math.floor(Math.random() * msgs.length)];
               feed.appendChild(div);
               if(feed.childElementCount > 10) feed.removeChild(feed.firstChild);
               feed.scrollTop = feed.scrollHeight;
            }
        }
        
        // 5. Ally Cursor logic
        if (!window.activeGeminiPing && Math.random() < 0.05 && window.datacentersGroup && window.datacentersGroup.children.length > 0) {
            const targets = window.datacentersGroup.children;
            const targetMesh = targets[Math.floor(Math.random() * targets.length)];
            window.activeGeminiPing = targetMesh.userData;
            window.geminiAllyCursor.position.copy(targetMesh.position).multiplyScalar(1.01);
            window.geminiAllyCursor.lookAt(new THREE.Vector3(0,0,0));
            window.geminiAllyCursor.visible = true;
            
            const feed = document.getElementById('gemini-feed');
            if(feed) {
               const div = document.createElement('div');
               div.style.color = '#00ffaa';
               div.innerText = `[GEMINI] Priority target identified: ${targetMesh.userData.name.replace('DATACENTER: ','')}. Awaiting execution.`;
               feed.appendChild(div);
               if(feed.childElementCount > 10) feed.removeChild(feed.firstChild);
               feed.scrollTop = feed.scrollHeight;
            }
        }
        
        if (window.geminiAllyCursor && window.geminiAllyCursor.visible) {
            window.geminiAllyCursor.rotation.z += 0.05;
            window.geminiAllyCursor.scale.setScalar(1 + 0.3*Math.sin(Date.now() * 0.005));
        }
    }
}, 500);

setTimeout(() => {
  if (typeof ws_isHost !== 'undefined') {
    if (ws_isHost || (!GS.isOnline)) {
      scheduleRandomMegaBomb();
      scheduleRandomEMP();
      scheduleRandomGroundBomb();
      scheduleRandomSonarSweep();
      scheduleRandomNavalPing();
      scheduleRandomSpaceRocket();
    }
  } else {
    // Fallback if networking isn't initialized yet
    scheduleRandomMegaBomb();
    scheduleRandomEMP();
    scheduleRandomGroundBomb();
    scheduleRandomSonarSweep();
    scheduleRandomNavalPing();
    scheduleRandomSpaceRocket();
  }
}, 8000);
spawnAmbients();
initDroneBattle();
animate();

// =====================================================================
// PHASE 3: NAVAL WARFARE
// =====================================================================
GS.fleets = GS.fleets || {}; // { iso: { owner, ships } }

function deployNavalFleet(iso) {
  if (GS.turn !== GS.myIndex) return;
  const c = GS.countries[iso];
  if (!c || c.owner !== GS.myIndex) { setLog('⚓ Select a territory YOU own to deploy a fleet.'); return; }
  if (GS.players[GS.myIndex].budget < 100) { setLog('⚓ Insufficient budget for naval fleet (100 MIL required).'); return; }
  GS.players[GS.myIndex].budget -= 100;
  c.ships = (c.ships || 0) + 1;
  setLog(`⚓ Fleet deployed from ${c.name}. Naval supremacy extends to adjacent seas.`);
  triggerNewsEvent(`${c.name.toUpperCase()} NAVAL FLEET COMMISSIONED`);
  if (GS.isOnline) syncState();
}

function navalBlockade(targetIso) {
  const source = Object.entries(GS.countries).find(([,c]) => c.owner === GS.myIndex && (c.ships || 0) > 0);
  if (!source) { setLog('⚓ You need a naval fleet to blockade.'); return; }
  const [srcIso, srcC] = source;
  const tgt = GS.countries[targetIso];
  if (!tgt || tgt.owner === GS.myIndex) return;
  tgt.blockaded = (tgt.blockaded || 0) + 2; // 2 turns of blockade
  srcC.ships = Math.max(0, srcC.ships - 1);
  setLog(`⚓ ${tgt.name} BLOCKADED for 2 turns — enemy income cut by 50%.`);
  triggerNewsEvent(`${tgt.name.toUpperCase()} SUFFERS NAVAL BLOCKADE`);
  if (GS.isOnline) syncState();
}

// Hook blockade income penalty into startTurn GDP income above
// (already applied: nuked territories)

// =====================================================================
// PHASE 4: AIR SUPERIORITY
// =====================================================================
GS.airForce = GS.airForce || {}; // per-player airwing counts

function buyAirWing(iso) {
  if (GS.turn !== GS.myIndex) return;
  const c = GS.countries[iso];
  if (!c || c.owner !== GS.myIndex) { setLog('✈ Select your territory to station air wings.'); return; }
  if (GS.players[GS.myIndex].budget < 75) { setLog('✈ Insufficient budget (75 MIL per air wing).'); return; }
  GS.players[GS.myIndex].budget -= 75;
  c.airwings = (c.airwings || 0) + 1;
  setLog(`✈ Air wing stationed in ${c.name}. Defense +20% in adjacent territories.`);
  if (GS.isOnline) syncState();
}

function strategicBombing(targetIso) {
  if (GS.turn !== GS.myIndex) return;
  const airSrc = Object.entries(GS.countries).find(([,c]) => c.owner === GS.myIndex && (c.airwings || 0) >= 1);
  if (!airSrc) { setLog('✈ Need at least 1 air wing to conduct strategic bombing.'); return; }
  const tgt = GS.countries[targetIso];
  if (!tgt || tgt.owner === GS.myIndex) return;
  airSrc[1].airwings--;
  tgt.infrastructure = Math.max(0, (tgt.infrastructure || 3) - 1);
  tgt.bombedTurns = (tgt.bombedTurns || 0) + 2;
  const loss = Math.floor(tgt.troops * 0.15);
  tgt.troops = Math.max(1, tgt.troops - loss);
  updateTroopSprite(targetIso);
  setLog(`✈ Strategic bombing of ${tgt.name}: -${loss} troops, infrastructure degraded.`);
  triggerNewsEvent(`${tgt.name.toUpperCase()} BOMBED — INFRASTRUCTURE IN RUINS`);
  if (GS.isOnline) syncState();
}

// Apply air defense bonus during attack resolution
function getAirDefenseBonus(iso) {
  const c = GS.countries[iso];
  if (!c || !c.airwings || c.airwings === 0) return 1.0;
  return 1.0 + (Math.min(c.airwings, 5) * 0.04); // Up to +20% defense
}

// =====================================================================
// PHASE 5: DIPLOMACY ENGINE
// =====================================================================
GS.treaties = GS.treaties || []; // { type, player0, player1, turnsLeft }

const TREATY_TYPES = {
  NON_AGGRESSION: { name: 'Non-Aggression Pact', cost: 0, duration: 6, desc: 'Neither side attacks the other for 6 turns.' },
  ALLIANCE:       { name: 'Military Alliance',   cost: 50, duration: 8, desc: 'If attacked, ally defends. +5% attack boost.' },
  TRADE:          { name: 'Trade Agreement',     cost: 0, duration: 10, desc: 'Both sides gain +15% income for 10 turns.' },
};

function proposeTreaty(type) {
  if (GS.turn !== GS.myIndex) { setLog('🤝 Diplomacy only during your turn.'); return; }
  const treaty = TREATY_TYPES[type];
  if (!treaty) return;
  if (treaty.cost > 0 && GS.players[GS.myIndex].budget < treaty.cost) {
    setLog(`🤝 Insufficient funds for ${treaty.name} (${treaty.cost} MIL)`); return;
  }
  // AI acceptance roll: 50% base + adjustment if losing
  const aiTerr = Object.values(GS.countries).filter(c=>c.owner===1).length;
  const humanTerr = Object.values(GS.countries).filter(c=>c.owner===0).length;
  const aiAcceptChance = 0.35 + (humanTerr > aiTerr ? 0.35 : 0.05);
  const accepted = Math.random() < aiAcceptChance;

  if (!accepted) {
    setLog(`🤝 RAINCLAUDE rejected ${treaty.name}.`);
    triggerNewsEvent('DIPLOMATIC OVERTURES REBUFFED BY RAINCLAUDE');
    return;
  }
  if (treaty.cost > 0) GS.players[GS.myIndex].budget -= treaty.cost;
  GS.treaties.push({ type, p0: GS.myIndex, p1: 1, turnsLeft: treaty.duration });
  setLog(`✅ ${treaty.name} SIGNED. ${treaty.desc}`);
  triggerNewsEvent(`${treaty.name.toUpperCase()} ESTABLISHED`);
  if (GS.isOnline) syncState();
}

function tickTreaties() {
  GS.treaties = (GS.treaties || []).filter(t => {
    t.turnsLeft--;
    if (t.turnsLeft <= 0) {
      // RAINCLAUDE betrayal: 30% chance on expiry
      if (Math.random() < 0.30 && t.type === 'ALLIANCE') {
        triggerNewsEvent('RAINCLAUDE BETRAYS ALLIANCE — WAR REIGNITES');
        setLog('⚠ RAINCLAUDE has betrayed the Alliance! WAR RESUMES.');
      } else {
        setLog(`🤝 ${TREATY_TYPES[t.type].name} has expired.`);
      }
      return false;
    }
    return true;
  });

  // Apply trade bonus income
  GS.treaties.forEach(t => {
    if (t.type === 'TRADE') {
      if (GS.players[0]) GS.players[0].budget += 20;
      if (GS.players[1]) GS.players[1].budget += 20;
    }
  });
}

function hasTreaty(type) {
  return (GS.treaties || []).some(t => t.type === type && t.turnsLeft > 0);
}

// =====================================================================
// PHASE 6: ESPIONAGE SYSTEM
// =====================================================================
const SPY_ACTIONS = [
  { id: 'SABOTAGE',    name: '🔪 Sabotage',   cost: 80,  successBase: 0.65, desc: 'Reduces enemy territory output by 30% for 3 turns.' },
  { id: 'INTEL',       name: '👁 Intel',      cost: 40,  successBase: 0.80, desc: 'Reveals all enemy troop counts for 5 turns (disables fog on enemy).' },
  { id: 'COUP',        name: '💼 Coup',       cost: 200, successBase: 0.35, desc: 'Attempt to flip a weak enemy territory (<3 troops) to your side.' },
  { id: 'FALSE_INTEL', name: '📡 Disinform.',  cost: 60,  successBase: 0.70, desc: "Fakes reporting on enemy territory—your side gets false troop counts." },
];

GS.spyState = GS.spyState || { intelActive: 0, sabotaged: {} };

function executeSpyAction(actionId, targetIso) {
  if (GS.turn !== GS.myIndex) { setLog('🔎 Espionage only during your turn.'); return; }
  const action = SPY_ACTIONS.find(a => a.id === actionId);
  if (!action) return;
  if (GS.players[GS.myIndex].budget < action.cost) {
    setLog(`🔎 Insufficient budget for ${action.name} (${action.cost} MIL).`); return;
  }
  GS.players[GS.myIndex].budget -= action.cost;
  const tgt = GS.countries[targetIso];
  if (!tgt || tgt.owner === GS.myIndex) { setLog('🔎 Must target an enemy territory.'); return; }

  // Trigger submarine sonar ripple effect for PSY/STRATEGY (Espionage) moves
  spawnSonarSweep3D(tgt.lat, tgt.lon);

  const roll = Math.random();
  const success = roll < action.successBase;

  if (!success) {
    setLog(`🔎 ${action.name} FAILED in ${tgt.name}. ${action.cost} MIL lost.`);
    triggerNewsEvent('SPY CAUGHT — DIPLOMATIC INCIDENT');
    return;
  }

  switch (actionId) {
    case 'SABOTAGE':
      tgt.sabotaged = 3;
      setLog(`🔪 SABOTAGE SUCCESS: ${tgt.name} output crippled for 3 turns.`);
      triggerNewsEvent(`${tgt.name.toUpperCase()} INTERNAL SABOTAGE REPORTED`);
      break;
    case 'INTEL':
      GS.spyState.intelActive = 5;
      fogEnabled = false;
      spawnCyberGlitch(targetIso);
      setLog(`👁 INTEL SUCCESS: Full visibility for 5 turns.`);
      applyFogOfWar();
      triggerNewsEvent('INTELLIGENCE BREAKTHROUGH — ENEMY POSITIONS REVEALED');
      break;
    case 'COUP':
      if (tgt.troops <= 3) {
        tgt.owner = GS.myIndex;
        tgt.troops = 1;
        refreshBorder(targetIso);
        updateTroopSprite(targetIso);
        spawnCyberGlitch(targetIso);
        setLog(`💼 COUP SUCCESS: ${tgt.name} flipped to your control!`);
        triggerNewsEvent(`${tgt.name.toUpperCase()} GOVERNMENT OVERTHROWN IN COUP`);
      } else {
        setLog(`💼 COUP FAILED: ${tgt.name} is too well defended.`);
      }
      break;
    case 'FALSE_INTEL':
      spawnCyberGlitch(targetIso);
      setLog(`📡 DISINFORMATION planted in ${tgt.name}. Enemy confused!`);
      triggerNewsEvent('WIDESPREAD MISINFORMATION CAMPAIGN DETECTED');
      break;
  }
  if (GS.isOnline) syncState();
}

function tickEspionage() {
  if (GS.spyState && GS.spyState.intelActive > 0) {
    GS.spyState.intelActive--;
    if (GS.spyState.intelActive === 0) {
      fogEnabled = true;
      applyFogOfWar();
      setLog('👁 Intel window closed. Fog of war restored.');
    }
  }
  // Decrement sabotaged turns
  Object.values(GS.countries || {}).forEach(c => {
    if (c.sabotaged > 0) c.sabotaged--;
  });
}

// =====================================================================
// PHASE 7: TECHNOLOGY TREE
// =====================================================================
GS.tech = GS.tech || {
  points: 0,
  unlocked: new Set(),
};

const TECH_NODES = [
  { id: 'ADVANCED_MISSILES', cat: 'MILITARY', cost: 5, name: '🚀 Advanced Missiles', desc: '+25% missile damage', requires: [] },
  { id: 'TROOP_DOCTRINE',    cat: 'MILITARY', cost: 4, name: '⚔ Elite Troops',    desc: '+15% ground attack', requires: [] },
  { id: 'CYBER_WARFARE',     cat: 'CYBER',    cost: 6, name: '💻 Cyber Warfare',   desc: '+30% espionage success chance', requires: [] },
  { id: 'SATELLITE_NET',     cat: 'CYBER',    cost: 5, name: '🛰 Satellite Net',   desc: 'Permanently removes fog of war', requires: ['CYBER_WARFARE'] },
  { id: 'ECONOMIC_REFORM',   cat: 'ECONOMIC', cost: 3, name: '💰 Economic Reform', desc: '+10% territory income', requires: [] },
  { id: 'TRADE_NETWORK',     cat: 'ECONOMIC', cost: 4, name: '🌐 Trade Network',   desc: '+20% GDP income bonus', requires: ['ECONOMIC_REFORM'] },
  { id: 'NUKE_YIELD',        cat: 'NUCLEAR',  cost: 6, name: '☢ Yield Boost',    desc: '+50% nuclear damage', requires: [] },
  { id: 'NUKE_SHIELD',       cat: 'NUCLEAR',  cost: 5, name: '🛡 Nuke Shield',   desc: '50% chance to intercept incoming nukes', requires: [] },
  { id: 'STEALTH_BOMBERS',   cat: 'AIR',      cost: 5, name: '🕶 Stealth Fleet', desc: 'Air missions bypass enemy air defense', requires: [] },
  { id: 'CARRIER_STRIKE',    cat: 'NAVAL',    cost: 5, name: '⚓ Carrier Strike', desc: 'Naval attack: can hit any coastal territory', requires: [] },
];

function earnTechPoints() {
  const owned = Object.values(GS.countries || {}).filter(c => c.owner === GS.myIndex).length;
  const points = Math.max(1, Math.floor(owned / 20));
  GS.tech.points = (GS.tech.points || 0) + points;
}

function unlockTech(nodeId) {
  if (GS.turn !== GS.myIndex) return;
  const node = TECH_NODES.find(n => n.id === nodeId);
  if (!node) return;
  if ((GS.tech.points || 0) < node.cost) { setLog(`🔬 Need ${node.cost} research points (you have ${GS.tech.points}).`); return; }
  const unlocked = GS.tech.unlocked instanceof Set ? GS.tech.unlocked : new Set(GS.tech.unlocked || []);
  if (unlocked.has(nodeId)) { setLog('🔬 Already researched.'); return; }
  if (node.requires.some(r => !unlocked.has(r))) { setLog(`🔬 Prerequisite not met: ${node.requires.join(', ')}`); return; }
  GS.tech.points -= node.cost;
  unlocked.add(nodeId);
  GS.tech.unlocked = unlocked;
  setLog(`🔬 RESEARCHED: ${node.name} — ${node.desc}`);
  triggerNewsEvent(`BREAKTHROUGH: ${node.name.toUpperCase()}`);
  // Apply permanent effects
  if (nodeId === 'SATELLITE_NET') { fogEnabled = false; applyFogOfWar(); }
  if (GS.isOnline) syncState();
}

function hasTech(id) {
  if (!GS.tech || !GS.tech.unlocked) return false;
  const u = GS.tech.unlocked;
  return (u instanceof Set) ? u.has(id) : (u || []).includes(id);
}

// =====================================================================
// PHASE 8: WEATHER & SEASONS
// =====================================================================
const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
const WEATHER_ZONES = {
  WINTER_BELT: { isoPatterns: ['RUS','NOR','FIN','SWE','CAN','ISL','DNK','LVA','LTU','EST','BLR'], season: 'WINTER' },
  MONSOON_BELT: { isoPatterns: ['IND','BGD','MMR','THA','VNM','KHM','LAO','IDN','PHL'], season: 'MONSOON' },
};

GS.weather = GS.weather || { season: 'SPRING', turnCount: 0 };

function getWeatherModifier(iso) {
  const c = GS.countries[iso];
  if (!c) return { attack: 1.0, defense: 1.0, label: '' };
  const season = GS.weather.season;
  if (season === 'WINTER' && WEATHER_ZONES.WINTER_BELT.isoPatterns.includes(iso)) {
    return { attack: 0.75, defense: 1.1, label: '❄ Winter' };
  }
  if (season === 'MONSOON' && WEATHER_ZONES.MONSOON_BELT.isoPatterns.includes(iso)) {
    return { attack: 0.85, defense: 1.05, label: '🌧 Monsoon' };
  }
  return { attack: 1.0, defense: 1.0, label: '' };
}

function tickWeather() {
  GS.weather.turnCount = (GS.weather.turnCount || 0) + 1;
  if (GS.weather.turnCount % 4 === 0) {
    const idx = SEASONS.indexOf(GS.weather.season);
    GS.weather.season = SEASONS[(idx + 1) % 4];
    setLog(`🌍 SEASON CHANGE: ${GS.weather.season}`);
    triggerNewsEvent(`SEASON SHIFT: GLOBAL CONDITIONS ENTERING ${GS.weather.season}`);
  }
}

// =====================================================================
// PHASE 9: ECONOMIC & INFRASTRUCTURE
// =====================================================================
function developTerritory(iso) {
  if (GS.turn !== GS.myIndex) return;
  const c = GS.countries[iso];
  if (!c || c.owner !== GS.myIndex) { setLog('🏗 Select your own territory to develop.'); return; }
  if ((c.infrastructure || 3) >= 5) { setLog('🏗 Infrastructure already at maximum.'); return; }
  const cost = 50 * ((c.infrastructure || 3) + 1); // Progressive cost
  if (GS.players[GS.myIndex].budget < cost) {
    setLog(`🏗 Insufficient budget (${cost} MIL needed to upgrade ${c.name}).`); return;
  }
  GS.players[GS.myIndex].budget -= cost;
  c.infrastructure = Math.min(5, (c.infrastructure || 3) + 1);
  setLog(`🏗 ${c.name} infrastructure upgraded to level ${c.infrastructure} — income +${Math.round(8)}%`);
  if (GS.isOnline) syncState();
}

function bombInfrastructure(targetIso) {
  if (GS.turn !== GS.myIndex) { return; }
  const airSrc = Object.entries(GS.countries).find(([,c]) => c.owner === GS.myIndex && (c.airwings || 0) > 0);
  if (!airSrc) { setLog('✈ Need air wings to bomb infrastructure.'); return; }
  const tgt = GS.countries[targetIso];
  if (!tgt || tgt.owner === GS.myIndex) return;
  airSrc[1].airwings--;
  tgt.infrastructure = Math.max(0, (tgt.infrastructure || 3) - 1);
  setLog(`💥 ${tgt.name} infrastructure bombed — income reduced permanently.`);
  triggerNewsEvent(`${tgt.name.toUpperCase()} ECONOMIC INFRASTRUCTURE TARGETED`);
  if (GS.isOnline) syncState();
}

// =====================================================================
// PHASE 10: ESCALATION LADDER & DOOMSDAY CLOCK
// =====================================================================
const ESCALATION_STAGES = [
  { level: 0, name: 'COLD WAR',     clock: '11:45', color: '#0af', news: 'GEOPOLITICAL TENSIONS REMAIN HIGH' },
  { level: 1, name: 'PROXY WAR',   clock: '11:50', color: '#fa0', news: 'PROXY CONFLICTS ERUPT ACROSS THREE CONTINENTS' },
  { level: 2, name: 'OPEN WAR',    clock: '11:55', color: '#f80', news: 'GLOBAL POWERS ENTER DIRECT ARMED CONFLICT' },
  { level: 3, name: 'TOTAL WAR',   clock: '11:58', color: '#f44', news: 'TOTAL WAR DECLARED: ALL RESOURCES MOBILIZED' },
  { level: 4, name: 'NUCLEAR ENDGAME', clock: '11:59', color: '#f00', news: '☢ NUCLEAR EXCHANGE IMMINENT — CIVILIZATIONAL RISK' },
];

GS.escalation = GS.escalation || 0;
GS.nukesFired = GS.nukesFired || 0;

function updateEscalation() {
  // Escalate based on nukes fired and turns passed
  const stage = Math.min(4, Math.floor(GS.nukesFired) + Math.floor((GS.turnCount || 0) / 20));
  if (stage !== GS.escalation) {
    GS.escalation = stage;
    const info = ESCALATION_STAGES[stage];
    triggerNewsEvent(info.news);
    setLog(`⚠ ESCALATION LEVEL ${stage}: ${info.name} — ${info.clock}`);
    renderDoomsdayClock();
  }
}

function renderDoomsdayClock() {
  // UI rendering removed as per user request
  const el = document.getElementById('doomsday-clock');
  if (el) el.remove();
}

// Tick all secondary systems each end-of-turn
function tickAllSystems() {
  tickTreaties();
  tickEspionage();
  tickWeather();
  earnTechPoints();
  updateEscalation();
}

// Hook into endTurn
const _origEndTurn = window.endTurn;
window.endTurn = function() {
  tickAllSystems();
  if (typeof _origEndTurn === 'function') _origEndTurn();
};

// =====================================================================
// STRATEGY OPS — SHARED DRAWER ENGINE
// =====================================================================
let _openDrawerId = null;

window.closeAllModals = function() {
  document.querySelectorAll('.strat-drawer').forEach(d => d.remove());
  document.querySelectorAll('.ops-btn, .strat-icon-btn').forEach(b => b.classList.remove('active'));
  _openDrawerId = null;
  // Cancel any pending globe actions
  window._pendingSpyAction = null;
  window._pendingNaval = null;
  const logEl = document.getElementById('log');
  if (logEl && logEl._pendingHint) { logEl._pendingHint = false; }
};
function closeAllModals() { window.closeAllModals(); }

function openDrawer(id, titleHtml, bodyHtml) {
  if (_openDrawerId === id) { closeAllModals(); return; }
  closeAllModals();
  _openDrawerId = id;
  const drawer = document.createElement('div');
  drawer.className = 'strat-drawer';
  if (id === 'intel-layers') drawer.classList.add('intel-mode');
  if (id === 'arms-ind' || id === 'natural-res') drawer.classList.add('centered-mode');
  drawer.id = 'drawer-' + id;
  drawer.innerHTML = `
    <div class="strat-drawer-title">
      <span>${titleHtml}</span>
      <button class="strat-drawer-close" onclick="window.closeAllModals()">✕</button>
    </div>
    <div id="drawer-body-${id}">${bodyHtml}</div>
  `;
  document.body.appendChild(drawer);
  setTimeout(() => { if(typeof window.makeDraggable === 'function') window.makeDraggable(drawer); }, 50);
  
  const btn = document.getElementById('ops-btn-' + id) || document.getElementById('btn-' + id);
  if (btn) btn.classList.add('active');
}

function _sfxClick() { try { if(SFX && SFX.playClick) SFX.playClick(); } catch(e) {} }

// =====================================================================
// DIPLOMACY
// =====================================================================
function showDiplomacyModal() {
  _sfxClick();
  if (GS.turn !== GS.myIndex) {
    openDrawer('diplomacy', '🤝 DIPLOMACY', `<div style="color:#f55;text-align:center;padding:20px;">Diplomacy only available on YOUR TURN.</div>`);
    return;
  }
  const activeTreaties = (GS.treaties||[]).filter(t=>t.turnsLeft>0);
  const activeBanner = activeTreaties.length
    ? `<div style="padding:7px;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.2);border-radius:4px;margin-bottom:10px;font-size:10px;color:#0f8;">
        ACTIVE: ${activeTreaties.map(t=>TREATY_TYPES[t.type]?`${TREATY_TYPES[t.type].name} (${t.turnsLeft}T)`:'').join(' &nbsp;|&nbsp; ')}
       </div>` : '';
  const body = Object.entries(TREATY_TYPES).map(([key,t]) => {
    const active = hasTreaty(key);
    const canAfford = GS.players[GS.myIndex].budget >= (t.cost||0);
    return `<div class="strat-item">
      <div class="strat-item-title">${t.name}${active?'<span class="strat-active-badge">✓ ACTIVE</span>':''}</div>
      <div class="strat-item-desc">${t.desc}</div>
      <div class="strat-item-cost">Cost: ${t.cost||0} MIL · ${t.duration} turns</div>
      <button class="strat-drawer-btn" style="margin-top:5px;${!canAfford?'opacity:0.4;cursor:not-allowed;':''}"
        ${active||!canAfford?'disabled':''}
        onclick="proposeTreaty('${key}'); window.closeAllModals();">
        ${active?'ACTIVE':'PROPOSE →'}${!canAfford?' (insufficient budget)':''}
      </button>
    </div>`;
  }).join('');
  openDrawer('diplomacy', '🤝 DIPLOMACY', `
    <p style="font-size:10px;opacity:0.6;margin-bottom:8px;">Offer terms to RAINCLAUDE. AI acceptance depends on balance of power.</p>
    ${activeBanner}${body}
  `);
}

// =====================================================================
// ESPIONAGE
// =====================================================================
function showSpyModal() {
  _sfxClick();
  if (GS.turn !== GS.myIndex) {
    openDrawer('espionage', '🔎 ESPIONAGE', `<div style="color:#f55;text-align:center;padding:20px;">Espionage only available on YOUR TURN.</div>`);
    return;
  }
  const budget = GS.players[GS.myIndex].budget;
  const intelActive = GS.spyState && GS.spyState.intelActive > 0;
  const body = SPY_ACTIONS.map(a => {
    const canAfford = budget >= a.cost;
    const boostPct = hasTech('CYBER_WARFARE') ? 30 : 0;
    const effSuccess = Math.min(100, Math.round(a.successBase*100) + boostPct);
    return `<div class="strat-item">
      <div class="strat-item-title">${a.name}</div>
      <div class="strat-item-desc">${a.desc}</div>
      <div class="strat-item-cost">${a.cost} MIL · ${effSuccess}% success${boostPct?` <span style="color:#0f8">(+${boostPct}% CYBER BOOST)</span>`:''}
      </div>
      <button class="strat-drawer-btn" style="margin-top:5px;${!canAfford?'opacity:0.4;cursor:not-allowed;':''}"
        ${!canAfford?'disabled':''}
        onclick="window._pendingSpyAction='${a.id}'; window.closeAllModals(); setLog('🔎 Click an ENEMY territory to execute: ${a.name}');">
        SELECT MISSION → CLICK GLOBE
      </button>
    </div>`;
  }).join('');
  openDrawer('espionage', '🔎 ESPIONAGE', `
    <p style="font-size:10px;opacity:0.6;margin-bottom:8px;">Select a mission, then click an enemy territory on the globe.</p>
    ${intelActive?`<div style="padding:6px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);border-radius:4px;margin-bottom:8px;font-size:10px;color:#0f8;">👁 INTEL ACTIVE (${GS.spyState.intelActive} turns)</div>`:''}
    ${body}
  `);
}

// =====================================================================
// TECH TREE
// =====================================================================
function showTechModal() {
  _sfxClick();
  const pts = GS.tech ? (GS.tech.points || 0) : 0;
  const owned = Object.values(GS.countries||{}).filter(c=>c.owner===GS.myIndex).length;
  const perTurn = Math.max(1, Math.floor(owned/20));
  const isMyTurn = GS.turn === GS.myIndex;
  const cats = ['MILITARY','CYBER','ECONOMIC','NUCLEAR','AIR','NAVAL'];
  const body = cats.map(cat => {
    const nodes = TECH_NODES.filter(n => n.cat === cat);
    if (!nodes.length) return '';
    return `<div style="margin-bottom:10px;">
      <div style="color:#fa0;font-size:9px;letter-spacing:2px;margin-bottom:5px;border-bottom:1px solid rgba(255,170,0,0.2);padding-bottom:3px;">${cat}</div>
      ${nodes.map(n => {
        const unlocked = hasTech(n.id);
        const prereqMet = n.requires.every(r => hasTech(r));
        const canAfford = pts >= n.cost;
        const color = unlocked ? '#0f8' : prereqMet ? 'rgba(0,170,255,0.25)' : 'rgba(60,60,60,0.3)';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid ${color};border-radius:3px;margin-bottom:3px;opacity:${prereqMet||unlocked?1:0.45};">
          <span>
            <span style="font-size:10px;color:${unlocked?'#0f8':'#9cf'}">${n.name}</span>
            <br><span style="opacity:0.6;font-size:9px;">${n.desc}</span>
            ${n.requires.length&&!unlocked?`<br><span style="font-size:8px;color:#fa0;">Req: ${n.requires.join(', ')}</span>`:''}
          </span>
          ${unlocked
            ? '<span style="color:#0f8;font-size:14px;">✓</span>'
            : prereqMet && isMyTurn && canAfford
              ? `<button class="modal-btn" onclick="unlockTech('${n.id}'); showTechModal();" style="white-space:nowrap;">${n.cost}pt</button>`
              : prereqMet && isMyTurn && !canAfford
                ? `<span style="color:#f55;font-size:9px;">${n.cost}pt</span>`
                : '<span style="opacity:0.3;font-size:16px;">🔒</span>'}
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
  openDrawer('tech', '🔬 TECH TREE', `
    <div style="padding:7px;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.15);border-radius:4px;margin-bottom:10px;font-size:10px;">
      Research Points: <b style="color:#0f8;">${pts}</b> &nbsp; <span style="opacity:0.7">+${perTurn}/turn · ${owned} territories</span>
    </div>
    ${!isMyTurn?'<div style="color:#f55;font-size:10px;margin-bottom:8px;">⚠ Research only available on your turn.</div>':''}
    ${body}
  `);
}

// =====================================================================
// TACTICAL AI TERMINAL ADVISOR
// =====================================================================
function showTerminalModal() {
  _sfxClick();
  const myIndex = GS.myIndex;
  const p = GS.players[myIndex];
  if (!p) return;

  // 1) Find Borders
  const myIsos = Object.keys(GS.countries).filter(iso => GS.countries[iso].owner === myIndex);
  const threats = [];
  const opps = [];
  let totalBorders = 0;

  myIsos.forEach(myIso => {
    const cMy = GS.countries[myIso];
    if (!cMy.polygons) return;
    const enemyNeighbors = new Set();
    
    // Very rudimentary distance check for "neighbors" (since actual topology graph is complex)
    // We'll scan all enemy territories and check lat/lon distance
    Object.keys(GS.countries).forEach(eIso => {
      const cE = GS.countries[eIso];
      if (cE.owner === myIndex || cE.owner === 0) return; // Only AI (owner 1)
      if (cE.troops === 0) return;
      
      const dist = Math.sqrt(Math.pow(cE.lat - cMy.lat, 2) + Math.pow(cE.lon - cMy.lon, 2));
      if (dist < 15) { // Approximate adjacency
        totalBorders++;
        if (cE.troops > cMy.troops * 1.5 && cE.troops > 5) {
          threats.push(`<b>${cE.name}</b> (${cE.troops} units) threatens <b>${cMy.name}</b> (${cMy.troops} units). <div style="color:#f55;margin-top:2px;">ACTION: Reinforce or Sabotage.</div>`);
        } else if (cMy.troops > cE.troops * 2 && cMy.troops > 10) {
          opps.push(`<b>${cE.name}</b> (${cE.troops} units) is vulnerable to <b>${cMy.name}</b> (${cMy.troops} units). <div style="color:#0f8;margin-top:2px;">ACTION: Invade.</div>`);
        }
      }
    });
  });

  // 2) Economy/Tech Advice
  const pts = GS.tech ? (GS.tech.points || 0) : 0;
  const budget = p.budget || 0;
  const ecoAdvice = [];
  
  if (budget >= 100) ecoAdvice.push(`Budget HIGH (${budget} MIL). Recommend deploying Naval Fleets or Air Wings for strategic bombing.`);
  else if (budget >= 50 && budget < 100) ecoAdvice.push(`Funds sufficient (${budget} MIL) for Espionage (Intel/Cyberattack) or Infrastructure development.`);
  else ecoAdvice.push(`Budget LOW (${budget} MIL). Hold position and accumulate capital.`);

  if (pts >= 100 && !hasTech('CYBER_WARFARE')) ecoAdvice.push(`Research Points available (${pts}). Prioritize CYBER WARFARE for +30% Espionage success.`);
  else if (pts >= 200 && !hasTech('NUCLEAR_TRIAD')) ecoAdvice.push(`Research Points available (${pts}). Nuclear tech is accessible.`);

  // 3) Weather Check
  const s = GS.weather ? GS.weather.season : 'SPRING';
  let weatherAdvice = `Global Season: <b>${s}</b>. `;
  if (s === 'WINTER') weatherAdvice += `Ground attacks in Northern blocks face -25% penalty. Use Air/Naval strikes instead.`;
  else if (s === 'MONSOON') weatherAdvice += `SE-Asian theater suffers -15% ground attack. Proceed with caution.`;
  else weatherAdvice += `Skies clear. Standard combat resolution in effect.`;

  // Cut lists to top 3
  const tList = threats.slice(0, 3).map(t => `<li style="margin-bottom:6px; background:rgba(255,0,0,0.1); padding:4px; border-left:2px solid #f00;">${t}</li>`).join('') || `<li style="color:#888;">No immediate catastrophic border threats detected.</li>`;
  const oList = opps.slice(0, 3).map(o => `<li style="margin-bottom:6px; background:rgba(0,255,136,0.1); padding:4px; border-left:2px solid #0f8;">${o}</li>`).join('') || `<li style="color:#888;">No clear overwhelming tactical advantages on borders.</li>`;
  const eList = ecoAdvice.map(e => `<li style="margin-bottom:6px; background:rgba(0,170,255,0.1); padding:4px; border-left:2px solid #0af;">${e}</li>`).join('');

  const bodyHtml = `
    <div style="font-family:'Courier New', monospace; font-size:10px; color:#0f8; line-height:1.4; padding:5px;">
      <div style="text-align:center; letter-spacing:2px; margin-bottom:12px; font-weight:bold; color:#fff; background:rgba(0,255,136,0.2); padding:5px border:1px solid #0f8;">
        SYSTEM DIAGNOSTIC: COMPLETE
      </div>
      
      <div style="color:#f55; border-bottom:1px dashed #f55; margin-bottom:5px; font-weight:bold; letter-spacing:1px;">[!] THREAT MATRIX</div>
      <ul style="list-style-type:none; padding:0; margin:0 0 15px 0;">${tList}</ul>

      <div style="color:#0f8; border-bottom:1px dashed #0f8; margin-bottom:5px; font-weight:bold; letter-spacing:1px;">[+] OPPORTUNITIES</div>
      <ul style="list-style-type:none; padding:0; margin:0 0 15px 0;">${oList}</ul>
      
      <div style="color:#0af; border-bottom:1px dashed #0af; margin-bottom:5px; font-weight:bold; letter-spacing:1px;">[$] LOGISTICS & R&D</div>
      <ul style="list-style-type:none; padding:0; margin:0 0 15px 0;">${eList}</ul>

      <div style="color:#fa0; border-bottom:1px dashed #fa0; margin-bottom:5px; font-weight:bold; letter-spacing:1px;">[☁] METEOROLOGICAL</div>
      <div style="background:rgba(255,170,0,0.1); padding:6px; border-left:2px solid #fa0; margin-bottom:10px;">${weatherAdvice}</div>
      
      <div style="text-align:center; opacity:0.5; margin-top:15px; font-size:9px;">
        AI ADVISOR V1.2. OVER AND OUT.
      </div>
    </div>
  `;

  openDrawer('term', '> TACTICAL ADVISOR', bodyHtml);
}

// =====================================================================
// NAVAL & AIR OPS
// =====================================================================
function showNavalModal() {
  _sfxClick();
  if (GS.turn !== GS.myIndex) {
    openDrawer('naval', '⚓ NAVAL & AIR OPS', `<div style="color:#f55;text-align:center;padding:20px;">Naval ops only available on YOUR TURN.</div>`);
    return;
  }
  const myCountries = Object.values(GS.countries||{}).filter(c=>c.owner===GS.myIndex);
  const totalFleets = myCountries.reduce((s,c)=>s+(c.ships||0),0);
  const totalWings = myCountries.reduce((s,c)=>s+(c.airwings||0),0);
  const budget = GS.players[GS.myIndex].budget;
  const stealth = hasTech('STEALTH_BOMBERS');
  const carrier = hasTech('CARRIER_STRIKE');

  const ops = [
    {
      id:'DEPLOY', icon:'⚓', label:'Deploy Naval Fleet',
      cost:'100 MIL', desc:'Build a fleet in one of your coastal territories. Fleets enable blockades and naval attacks.',
      hint:'Click YOUR territory', canUse: budget >= 100
    },
    {
      id:'BLOCKADE', icon:'🚫', label:'Blockade Enemy Port',
      cost:`1 Fleet (have: ${totalFleets})`, desc:'Cut off enemy income from a coastal territory. Reduces their budget by 20% for 3 turns.',
      hint:'Click ENEMY territory', canUse: totalFleets > 0
    },
    {
      id:'BOMBING', icon:'✈', label:'Strategic Air Strike',
      cost:`1 Air Wing (have: ${totalWings})${stealth?' · STEALTH':''}`, desc:`Destroy enemy territory output. ${stealth?'Stealth tech bypasses air defense.':'Opposed by enemy air defense.'}`,
      hint:'Click ENEMY territory', canUse: totalWings > 0
    },
    {
      id:'AIRWING', icon:'🛩', label:'Build Air Wing',
      cost:'80 MIL', desc:'Add an air wing to one of your territories to enable air strikes and air defense.',
      hint:'Click YOUR territory', canUse: budget >= 80
    },
    {
      id:'DEVELOP', icon:'🏗', label:'Develop Infrastructure',
      cost:'50–250 MIL', desc:'Upgrade territory infrastructure (max level 5). Each level increases income output.',
      hint:'Click YOUR territory', canUse: budget >= 50
    },
  ];
  if (carrier) ops.push({
    id:'CARRIER_ATK', icon:'🛳', label:'Carrier Strike Group',
    cost:`2 Fleets (have: ${totalFleets})`, desc:'CARRIER STRIKE: Naval attack on any coastal territory, bypassing land borders.',
    hint:'Click ANY coastal territory', canUse: totalFleets >= 2
  });

  const body = ops.map(op => `
    <div class="strat-item" style="${!op.canUse?'opacity:0.5':''}">
      <div class="strat-item-title">${op.icon} ${op.label}</div>
      <div class="strat-item-desc">${op.desc}</div>
      <div class="strat-item-cost">${op.cost}</div>
      <button class="strat-drawer-btn" style="margin-top:5px;" ${!op.canUse?'disabled':''}
        onclick="window._pendingNaval='${op.id}'; window.closeAllModals(); setLog('${op.hint} to: ${op.label}');">
        SELECT → CLICK GLOBE
      </button>
    </div>`).join('');

  openDrawer('naval', '⚓ NAVAL & AIR OPS', `
    <div style="display:flex;gap:15px;margin-bottom:10px;font-size:10px;">
      <span>⚓ Fleets: <b style="color:#0af">${totalFleets}</b></span>
      <span>✈ Air Wings: <b style="color:#0af">${totalWings}</b></span>
      <span>💰 Budget: <b style="color:#0f8">${budget} MIL</b></span>
    </div>
    ${body}
  `);
}

// =====================================================================
// WEATHER
// =====================================================================
function showWeatherInfo() {
  _sfxClick();
  const s = GS.weather || { season:'SPRING', turnCount:0 };
  const next = 4 - (s.turnCount % 4);
  const seasonColor = { SPRING:'#0f8', SUMMER:'#fa0', AUTUMN:'#f80', WINTER:'#0af' }[s.season] || '#9cf';
  const icons = { SPRING:'🌸', SUMMER:'☀', AUTUMN:'🍂', WINTER:'❄' };
  const myTerr = Object.entries(GS.countries||{}).filter(([iso,c])=>c.owner===GS.myIndex);
  const affectedWinter = myTerr.filter(([iso])=>WEATHER_ZONES.WINTER_BELT.isoPatterns.includes(iso)).length;
  const affectedMonsoon = myTerr.filter(([iso])=>WEATHER_ZONES.MONSOON_BELT.isoPatterns.includes(iso)).length;

  openDrawer('weather', '🌍 WEATHER & SEASONS', `
    <div style="text-align:center;padding:12px;margin-bottom:12px;background:rgba(0,170,255,0.05);border:1px solid rgba(0,170,255,0.15);border-radius:6px;">
      <div style="font-size:28px;">${icons[s.season]||'🌍'}</div>
      <div style="color:${seasonColor};font-size:14px;letter-spacing:3px;font-weight:bold;">${s.season}</div>
      <div style="opacity:0.6;font-size:9px;margin-top:4px;">Next season in ${next} turn(s)</div>
    </div>
    <div style="font-size:10px;margin-bottom:8px;opacity:0.7;">Your territories affected:</div>
    <div class="strat-item">
      <div class="strat-item-title">❄ Winter Belt — ${affectedWinter} territories</div>
      <div class="strat-item-desc">Russia, Scandinavia, Canada, Baltics</div>
      <div class="strat-item-cost">${s.season==='WINTER'?'<span style="color:#f55">ACTIVE: Attack −25% · Defense +10%</span>':'Inactive this season'}</div>
    </div>
    <div class="strat-item">
      <div class="strat-item-title">🌧 Monsoon Belt — ${affectedMonsoon} territories</div>
      <div class="strat-item-desc">India, Southeast Asia, Indonesia, Philippines</div>
      <div class="strat-item-cost">${s.season==='MONSOON'||s.season==='SUMMER'?'<span style="color:#f55">ACTIVE: Attack −15% · Defense +5%</span>':'Inactive this season'}</div>
    </div>
    <div style="margin-top:10px;font-size:9px;opacity:0.55;padding:6px;border:1px solid rgba(255,255,255,0.05);border-radius:4px;">
      💡 Weather modifiers are automatically applied during attack resolution.
    </div>
  `);
}

// =====================================================================
// GLOBE CLICK INTERCEPT — pending spy / naval actions
// =====================================================================
const _origHandleGlobeClick = window.handleGlobeClick;
window.handleGlobeClick = function(iso) {
  // Logic migrated directly into actual click handler early return
  
  // Trigger sonar sweep on any manual globe click selection
  const cd = countryData[iso];
  if(cd && cd.lat !== undefined && cd.lon !== undefined) {
    spawnSonarSweep3D(cd.lat, cd.lon);
  }

  if (typeof _origHandleGlobeClick === 'function') _origHandleGlobeClick(iso);
};

// Deploy Air Wing
function deployAirWing(iso) {
  if (GS.turn !== GS.myIndex) return;
  const c = GS.countries[iso];
  if (!c || c.owner !== GS.myIndex) { setLog('✈ Select YOUR territory to build an air wing.'); return; }
  const cost = 80;
  if (GS.players[GS.myIndex].budget < cost) { setLog(`✈ Need ${cost} MIL to build air wing.`); return; }
  GS.players[GS.myIndex].budget -= cost;
  c.airwings = (c.airwings||0) + 1;
  setLog(`✈ Air wing deployed in ${c.name}.`);
  triggerNewsEvent(`${c.name.toUpperCase()} AIR BASE DECLARED OPERATIONAL`);
  if (GS.isOnline) syncState();
}

// Carrier Strike (requires CARRIER_STRIKE tech)
function carrierStrike(iso) {
  if (GS.turn !== GS.myIndex) return;
  const myFleets = Object.entries(GS.countries).filter(([,c])=>c.owner===GS.myIndex&&c.ships>=1);
  if (myFleets.length < 2) { setLog('🛳 Carrier strike requires 2 fleets.'); return; }
  const tgt = GS.countries[iso];
  if (!tgt || tgt.owner === GS.myIndex) { setLog('🛳 Select an ENEMY territory.'); return; }
  // Consume 2 fleet movements
  let consumed = 0;
  for (const [fiso, fc] of myFleets) {
    if (consumed >= 2) break;
    fc.ships--; consumed++;
  }
  const dmg = Math.ceil(tgt.troops * 0.4);
  tgt.troops = Math.max(0, tgt.troops - dmg);
  if (tgt.troops === 0) { tgt.owner = GS.myIndex; tgt.troops = 1; refreshBorder(iso); updateTroopSprite(iso); }
  setLog(`🛳 CARRIER STRIKE on ${tgt.name}: −${dmg} troops destroyed!`);
  triggerNewsEvent(`CARRIER STRIKE GROUP HITS ${tgt.name.toUpperCase()} — HEAVY CASUALTIES`);
  if (GS.isOnline) syncState();
}

// Initialize doomsday clock after game starts
// Initialize doomsday clock after game starts
const _origInitGame = window.initGame;
window.initGame = function(names, idx) {
  if (typeof _origInitGame === 'function') _origInitGame(names, idx);
  setTimeout(() => { renderDoomsdayClock(); }, 1000);
};

// =====================================================================
// INTEL MAP INTEGRATION
// =====================================================================
let intelMap = null;
let intelMapActive = false;

const INTEL_LAYERS = {
  liveFlights: '✈ Live Global Flights',
  bases: '🏛 Military Bases',
  nuclear: '☢ Nuclear Sites',
  conflicts: '⚔ Conflict Zones',
  datacenters: '🖥 AI Data Centers',
  hotspots: '🎯 Intel Hotspots',
  cables: '🔌 Undersea Cables',
  protests: '📢 Protests & Unrest',
  flightDelays: '✈ Flight Alerts',
  weather: '⛈ Weather Alerts',
  natural: '🌋 Natural Events',
  cyberThreats: '🛡 Cyber Threats',
  economic: '💰 Economic Hubs'
};

function initIntelMap() {
  if (intelMap) return;
  const container = document.getElementById('deckgl-container');
  const layers = {};
  for(const k of Object.keys(INTEL_LAYERS)) layers[k] = true;
  
  try {
    intelMap = new window.DeckGLMap(container, {
      zoom: 2.5,
      pan: {x:0, y:0},
      view: 'global',
      timeRange: '24h',
      layers: layers
    });
  } catch (e) {
    const loadingDiv = document.getElementById('intel-map-loading');
    if (loadingDiv) {
      loadingDiv.innerHTML = `<div style="color:red; font-size:12px; text-align:left; padding:20px;"><b>CRITICAL MAP ERROR:</b><br>${e.message}<br><br><pre style="white-space:pre-wrap;">${e.stack}</pre></div>`;
      loadingDiv.style.display = 'flex';
      loadingDiv.style.alignItems = 'flex-start';
    }
    console.error("Error initializing DeckGLMap:", e);
  }
}

function showIntelMapDrawer() {
  _sfxClick();
  const body = Object.entries(INTEL_LAYERS).map(([key, label]) => {
    return `<div class="strat-item" style="display:flex; justify-content:space-between; align-items:center;">
      <span class="strat-item-title" style="margin:0">${label}</span>
      <input type="checkbox" id="toggle-${key}" onchange="toggleIntelLayer('${key}', this.checked)" style="width:16px;height:16px;cursor:pointer;">
    </div>`;
  }).join('');
  
  openDrawer('intel-layers', '👁 GLOBAL INTEL FEED', `
    <div style="font-size:10px;opacity:0.6;margin-bottom:15px; text-align:center;">Enable live data layers parsed from local and remote API feeds.</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      ${body}
    </div>
  `);

  // Sync checkboxes with current map state
  if (intelMap) {
    Object.keys(INTEL_LAYERS).forEach(key => {
      const cb = document.getElementById(`toggle-${key}`);
      if (cb) cb.checked = intelMap.state.layers[key] === true;
    });
  }
}

window.toggleIntelLayer = function(layerKey, isChecked) {
  if (!intelMap) return;
  if(intelMap.onLayerChange) {
     intelMap.onLayerChange(layerKey, isChecked, 'user');
  } else {
     intelMap.state.layers[layerKey] = isChecked;
     if(intelMap.debouncedRebuildLayers) intelMap.debouncedRebuildLayers();
  }
};

let boatInterval = null;
let boatMarkers = []; // Store THREE.js meshes for the boats


function clearBoatMarkers() {
  if (typeof scene === 'undefined') return;
  boatMarkers.forEach(b => {
      const parent = b.userData ? b.userData.parent : null;
      if (parent) {
          // Dispose all visual meshes in the boat group
          parent.children.forEach(c => {
              if (c.material) c.material.dispose();
              if (c.geometry) c.geometry.dispose();
          });
          scene.remove(parent);
      } else {
          if (b.material) b.material.dispose();
          if (b.geometry) b.geometry.dispose();
          scene.remove(b);
      }
  });
  boatMarkers = [];
}

function fetchAndRenderBoats() {
  if (typeof scene === 'undefined' || typeof THREE === 'undefined') return;
  if (!window.isRedSkin) return; // STRICT ENFORCEMENT: Boats only on Red Skin
  
  clearBoatMarkers();
  
  const R = typeof GLOBE_R !== 'undefined' ? GLOBE_R + 0.025 : 1.025; // Earth radius in THREE.js scene, slightly above surface
  
  const baseData = [
      { lat: 40.7128, lon: -74.0060, cog: 90, name: "US DEFENDER" }, // NY Coast
      { lat: 35.6895, lon: 139.6917, cog: 180, name: "JP PATROL" },  // Tokyo Bay
      { lat: 51.5074, lon: -0.1278, cog: 270, name: "UK FRIGATE" },  // London Coast
      { lat: 25.0330, lon: 121.5654, cog: 45, name: "TW ESCORT" },   // Taiwan Strait
      { lat: 0, lon: 0, cog: 0, name: "EQUATOR GHOST" },             // Center of map
      { lat: -33.8688, lon: 151.2093, cog: 30, name: "AU CRUISER" }, // Sydney
      { lat: -22.9068, lon: -43.1729, cog: 120, name: "BR CARRIER" },// Rio
      { lat: 37.7749, lon: -122.4194, cog: 210, name: "SF PATROL" }, // San Francisco
      { lat: 1.3521, lon: 103.8198, cog: 60, name: "SG NAVAL" },     // Singapore
      { lat: 43.1198, lon: 131.8869, cog: 300, name: "RU SUB" }      // Vladivostok
  ];

  const data = [];
  for (let loop = 0; loop < 1; loop++) { // Single loop (10 boats) for optimized Red Skin rendering
      baseData.forEach(b => {
          data.push({
              lat: b.lat + (loop > 0 ? (Math.random() - 0.5) * 8 : 0),
              lon: b.lon + (loop > 0 ? (Math.random() - 0.5) * 8 : 0),
              cog: b.cog + (loop > 0 ? (Math.random() - 0.5) * 45 : 0),
              name: b.name + (loop > 0 ? " B" : " A")
          });
      });
  }

  data.forEach(boat => {
      const boatGroup = new THREE.Group();
          
          // Determine boat type based on hash to remain consistent
          const bHash = boat.name ? boat.name.charCodeAt(0) + boat.name.length : Math.floor(boat.lat * 100);
          const isCargo = bHash % 2 === 0;

          if (isCargo) {
              // Cargo Ship
              const cargoHullMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50, depthTest: true }); // Dark grey/blue
              const deckMat = new THREE.MeshBasicMaterial({ color: 0x34495e, depthTest: true });
              
              const hullGeo = new THREE.BoxGeometry(0.032, 0.08, 0.018);
              const hull = new THREE.Mesh(hullGeo, cargoHullMat);
              hull.position.set(0, -0.01, 0);
              
              const bowGeo = new THREE.ConeGeometry(0.016, 0.03, 16); 
              const bow = new THREE.Mesh(bowGeo, cargoHullMat);
              bow.position.set(0, 0.045, 0);

              const deckGeo = new THREE.BoxGeometry(0.028, 0.076, 0.002);
              const deck = new THREE.Mesh(deckGeo, deckMat);
              deck.position.set(0, -0.01, 0.009);

              const bridgeGeo = new THREE.BoxGeometry(0.026, 0.018, 0.02);
              const bridgeMat = new THREE.MeshBasicMaterial({ color: 0xecf0f1, depthTest: true });
              const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
              bridge.position.set(0, -0.04, 0.015);

              boatGroup.add(hull);
              boatGroup.add(bow);
              boatGroup.add(deck);
              boatGroup.add(bridge);

              // Add some varied colored containers
              const containerColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71];
              const containerGeo = new THREE.BoxGeometry(0.024, 0.014, 0.012);
              for(let i=0; i<3; i++) {
                  const cMat = new THREE.MeshBasicMaterial({ color: containerColors[(bHash + i) % containerColors.length], depthTest: true });
                  const container = new THREE.Mesh(containerGeo, cMat);
                  container.position.set(0, 0.02 - (i * 0.018), 0.016);
                  boatGroup.add(container);
              }
          } else {
              // Yacht / Speedboat
              const yachtMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: true });
              const deckMat = new THREE.MeshBasicMaterial({ color: 0xd2b48c, depthTest: true }); // Tan wood deck
              
              const hullGeo = new THREE.BoxGeometry(0.024, 0.05, 0.015);
              const hull = new THREE.Mesh(hullGeo, yachtMat);
              hull.position.set(0, -0.01, 0);
              
              const bowGeo = new THREE.ConeGeometry(0.012, 0.035, 16);
              const bow = new THREE.Mesh(bowGeo, yachtMat);
              bow.position.set(0, 0.032, 0);
              
              const deckGeo = new THREE.BoxGeometry(0.02, 0.04, 0.002);
              const deck = new THREE.Mesh(deckGeo, deckMat);
              deck.position.set(0, -0.01, 0.008);
              
              const cabinGeo = new THREE.BoxGeometry(0.018, 0.025, 0.01);
              const cabinMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, depthTest: true });
              const cabin = new THREE.Mesh(cabinGeo, cabinMat);
              cabin.position.set(0, 0.0, 0.012);
              
              const glassGeo = new THREE.BoxGeometry(0.016, 0.01, 0.002);
              const glassMat = new THREE.MeshBasicMaterial({ color: 0x222222, depthTest: true });
              const glass = new THREE.Mesh(glassGeo, glassMat);
              glass.position.set(0, 0.012, 0.015);
              glass.rotation.x = Math.PI * 0.2;
              
              boatGroup.add(hull);
              boatGroup.add(bow);
              boatGroup.add(deck);
              boatGroup.add(cabin);
              boatGroup.add(glass);
          }
          
          const pos = ll2v(boat.lat, boat.lon, R);
          boatGroup.position.copy(pos);
          
          // Align to surface
          boatGroup.lookAt(new THREE.Vector3(0,0,0));
          
          // Rotate to face COG (Course Over Ground)
          if (boat.cog) {
              boatGroup.rotateZ(-boat.cog * (Math.PI / 180));
          }
          
          // Add click target (large)
          const hitGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
          const hitMat = new THREE.MeshBasicMaterial({visible: false});
          const hit = new THREE.Mesh(hitGeo, hitMat);
          boatGroup.add(hit);
          hit.userData = { isBoat: true, parent: boatGroup };
          
          scene.add(boatGroup);
          boatMarkers.push(hit);
      });
}

// ================= NAVAL & RED SKIN MINIGAMES REMOVED =================
// Minigame logic historically associated with the RED skin has been deprecated.

// --- SOLANA D3X STAKING CONTRACT PLACEHOLDERS ---
window.handleStakeDeposit = function() {
  const depositAmt = document.getElementById('staking-tower-amount-input').value;
  if (!depositAmt || depositAmt <= 0) {
    alert("Please enter a valid D3X amount to stake.");
    return;
  }
  alert(`[WEB3 PENDING] Initiating transaction to Deposit ${depositAmt} D3X into Solana Staking Contract.\n\nNote: The D3X Smart Contract is not yet deployed to mainnet. This button is wired and ready for integration.`);
};

window.handleStakeClaim = function() {
  alert("[WEB3 PENDING] Initiating claim transaction for accrued D3X rewards.\n\nNote: The D3X Smart Contract is not yet deployed. This handler is ready for the Solana integration.");
};

window.handleStakeUnstake = function() {
  alert("[WEB3 PENDING] Initiating transaction to withdraw all stacked D3X.\n\nNote: The D3X Smart Contract is not yet deployed. This handler is ready for the Solana integration.");
};
// ------------------------------------------------

window.resolveRpgShot = function(isHit) {
  document.getElementById('shooter-modal').classList.add('show');
  
  window.shooterState.ammo--;
  
  // If hit, calculate damage. If missed, 0.
  const dmg = isHit ? Math.floor(40 + Math.random() * 30) : 0;
  
  window.shooterState.aiHp = Math.max(0, window.shooterState.aiHp - dmg);
  
  // Update UI
  document.getElementById('shooter-ammo').textContent = window.shooterState.ammo;
  document.getElementById('shooter-hp-ai').textContent = window.shooterState.aiHp;
  document.getElementById('shooter-bar-ai').style.width = window.shooterState.aiHp + '%';
  
  const log = document.getElementById('shooter-log');
  if (dmg > 0) {
    log.innerHTML += `<div><span style="color:#0af">🎯 DIRECT HIT! ${dmg} DMG!</span></div>`;
  } else {
    log.innerHTML += `<div><span style="color:#888">❌ MISSED! Rocket flew right past target.</span></div>`;
  }
  log.scrollTop = log.scrollHeight;
  
  // Check Win/Loss Condition
  if (window.shooterState.aiHp <= 0) {
    window.shooterState.active = false;
    document.getElementById('btn-fire-rpg').style.display = 'none';
    
    log.innerHTML += `<div style="color:#0f8; font-weight:bold; font-size:14px; margin-top:10px;">TARGET DOWN. Plane Sunk. +5,000 Troops recovered!</div>`;
    
    // Grant Reward
    if (GS.players[GS.myIndex]) {
      GS.countries[Object.keys(GS.countries)[0]].troops += 0.5; // add roughly 5k to a random province to simulate recovery
      GS.reinforceLeft += 0.5; // adding 0.5 translates to 5k
      updateDashboard();
      setLog("💥 Plane shootdown confirmed! +5,000 reserve troops added.");
    }
    
    if (window.shooterState.planeMesh) {
       const hitBoxMesh = window.shooterState.planeMesh;
       const pivot = hitBoxMesh.userData.pivot;
       if (pivot) typeof scene !== 'undefined' && scene.remove(pivot);
       window.planeMarkers = window.planeMarkers.filter(b => b !== hitBoxMesh);
       if (window.planeData) window.planeData = window.planeData.filter(p => p.pivot !== pivot);
    }
  } else if (window.shooterState.ammo <= 0) {
    window.shooterState.active = false;
    document.getElementById('btn-fire-rpg').style.display = 'none';
    log.innerHTML += `<div style="color:#f55; font-weight:bold; font-size:14px; margin-top:10px;">OUT OF AMMO. Target escaped.</div>`;
  }
};

document.getElementById('btn-toggle-intel').addEventListener('click', () => {
  SFX.playClick();
  intelMapActive = !intelMapActive;
  const canvas = document.getElementById('c');
  const container = document.getElementById('deckgl-container');
  const btn = document.getElementById('btn-toggle-intel');
  const dash0 = document.getElementById('dash-0');
  const dash1 = document.getElementById('dash-1');
  
  if (intelMapActive) {
    if(!window.DeckGLMap) {
       console.error("DeckGLMap module not loaded yet.");
       setLog("⚠ Intel Map module still loading...");
       return;
    }
    initIntelMap();
    canvas.style.display = 'none';
    container.style.display = 'block';
    btn.innerHTML = '🌍 RETURN TO WAR MAP';
    btn.style.background = 'linear-gradient(135deg, #f24, #600)';
    btn.style.borderColor = '#f24';
    if (dash0) dash0.style.opacity = '0.2';
    if (dash1) dash1.style.opacity = '0.2';
    showIntelMapDrawer();
  } else {
    canvas.style.display = 'block';
    container.style.display = 'none';
    btn.innerHTML = '👁 HOSTILE INTEL';
    btn.style.background = '';
    btn.style.borderColor = '';
    if (dash0) dash0.style.opacity = '1';
    if (dash1) dash1.style.opacity = '1';
    closeAllModals();
  }
});

// Skin Manager: 0 = LIVE (White), 1 = RED, 2 = GREEN, 3 = YELLOW, 4 = CYBER, 5 = BLK, 6 = FIRE, 7 = HST
window.currentSkinIndex = 0;
window.isRedSkin = false; // Legacy flag preserved for scripts that might check it directly

const SKINS = [
  { name: 'LIVE',  color: 0xffffff, btnText: 'parallel layers', btnClass: '',              showOverlays: false, cleanGlobe: false, hideTroops: false, showResources: false, showArms: false, showBoats: false, isPremium: false },
  { name: 'RED',   color: 0xff0000, btnText: 'parallel layers', btnClass: 'active-premium',showOverlays: false, cleanGlobe: false, hideTroops: false, showResources: false, showArms: false, showBoats: false, isPremium: false },
  { name: 'GREEN', color: 0x22ff22, btnText: 'parallel layers', btnClass: 'active-normal', showOverlays: false, cleanGlobe: true,  hideTroops: true,  showResources: true,  showArms: true, showBoats: false, isPremium: false },
  { name: 'CYBER', color: 0x00f0ff, btnText: 'parallel layers', btnClass: 'active-premium',showOverlays: false,  cleanGlobe: true, hideTroops: true,  showResources: false,  showArms: false,  showBoats: false,  isPremium: false },
  { name: 'BLK',   color: 0x050505, btnText: 'parallel layers', btnClass: 'active-premium', showOverlays: false, cleanGlobe: false, hideTroops: true,  showResources: false, showArms: false, showBoats: false, isPremium: false },
  { name: 'WTR',   color: 0x00aaff, btnText: 'parallel layers', btnClass: 'active-premium', showOverlays: false, cleanGlobe: false, hideTroops: true,  showResources: false, showArms: false, showBoats: false, isPremium: false }
];
window.SKINS = SKINS;

window.toggleRedSkin = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  
  // Advance skin
  window.currentSkinIndex = (window.currentSkinIndex + 1) % SKINS.length;
  const skin = SKINS[window.currentSkinIndex];
  
  window.isRedSkin = (skin.name === 'RED'); // Keep legacy compatibility

  const btn = document.getElementById('btn-toggle-skin');
  
  // Skip premium skin if not unlocked
  if (skin.isPremium && !window.unlockedCyberSkin) {
      window.currentSkinIndex = (window.currentSkinIndex + 1) % SKINS.length;
      return toggleRedSkin(); // Recursively call to move to next
  }

  // Apply Globe Color
  if (typeof globeMat !== 'undefined') {
      globeMat.color.setHex(skin.color);
      if (skin.name === 'CYBER') {
          globeMat.emissive.setHex(0x0055ff);
          globeMat.wireframe = true;
          globeMat.opacity = 1.0;
      } else if (skin.name === 'WTR') {
          globeMat.emissive.setHex(0x0055aa); // Deep ocean blue emissive base
          globeMat.wireframe = false;
          globeMat.transparent = true;
      } else {
          globeMat.emissive.setHex(skin.name === 'LIVE' ? 0x222222 : 0x000000);
          globeMat.wireframe = false;
          globeMat.transparent = true;
          globeMat.opacity = 0.9;
      }

      globeMat.clippingPlanes = [];
      if (window.earthCutawayGroup) window.earthCutawayGroup.visible = false;
  }
  
  // Update UI Button
  btn.innerHTML = skin.btnText;
  if (skin.btnClass) {
      btn.className = '';
      btn.classList.add(skin.btnClass);
      if (skin.name === 'CYBER') {
          btn.style.boxShadow = '0 0 15px #00f0ff';
          btn.style.borderColor = '#00f0ff';
      } else {
          btn.style.boxShadow = 'none';
          btn.style.borderColor = '';
      }
  }
  else btn.className = '';
  
  // Toggle visibility of overlays (Webcams, Sats)
  if (typeof webcamGroup !== 'undefined') webcamGroup.visible = skin.showOverlays;
  if (typeof boatGroup !== 'undefined') boatGroup.visible = skin.showOverlays;
  if (typeof redSatGroup !== 'undefined') redSatGroup.visible = skin.showOverlays;
  
  // Clear red warfare projectiles if turning OFF red skin
  if (!skin.showOverlays) {
      if (typeof redWarfareProjectiles !== 'undefined') {
          redWarfareProjectiles.forEach(p => {
               scene.remove(p.mesh);
               if (p.mesh.geometry) p.mesh.geometry.dispose();
               if (p.mesh.material) p.mesh.material.dispose();
          });
          redWarfareProjectiles = [];
      }
      if (typeof redWarfareParticles !== 'undefined') {
          redWarfareParticles.forEach(p => {
               scene.remove(p.mesh);
               if (p.mesh.material.map) p.mesh.material.map.dispose();
               if (p.mesh.material) p.mesh.material.dispose();
          });
          redWarfareParticles = [];
      }
  }

  // Exclusively render ISS on the Live skin
  if (window.issGroup) window.issGroup.visible = (window.currentSkinIndex === 0);

  // Toggle Natural Resources map layer
  if (typeof naturalResourcesGroup !== 'undefined') naturalResourcesGroup.visible = skin.showResources;
  
  // Toggle D3X Caves layer
  if (typeof d3xCaveGroup !== 'undefined') d3xCaveGroup.visible = (skin.name === 'GREEN');
  
  // Toggle Global Arms map layer
  if (typeof armsIndustryGroup !== 'undefined') armsIndustryGroup.visible = skin.showArms;
  
  // Toggle Global Trade Network
  if (typeof window.globalTradeGroup !== 'undefined') {
     window.globalTradeGroup.visible = (skin.name === 'GREEN');
  }
  
  // Toggle Green Shiny Mountains exclusively on Green Skin
  if (typeof window.greenMountainsGroup !== 'undefined') {
      window.greenMountainsGroup.visible = (skin.name === 'GREEN');
  }
  
  // Toggle High Detailed Blue Buildings exclusively on Blue Skin
  if (typeof window.blueBuildingsGroup !== 'undefined') {
      window.blueBuildingsGroup.visible = (skin.name === 'BLUE');
  }
  
  // Toggle High Detailed Landmine exclusively on WTR Skin (Disabled per user request)
  if (typeof window.wtrBuildingsGroup !== 'undefined') {
      window.wtrBuildingsGroup.visible = false;
  }
  
  // Toggle the new WTR D3X Pool Glow Effects
  if (typeof window.wtrEffectsGroup !== 'undefined') {
      window.wtrEffectsGroup.visible = (skin.name === 'WTR');
  }
  
  // Toggle Metals Trade  // Elements normally toggled by specific skins
  if (typeof window.metalsTradeGroup !== 'undefined') {
     window.metalsTradeGroup.visible = (skin.name === 'GREEN');
  }

  // Toggle Companies Overlay (BLK Skin specific)
  if (typeof window.companiesGroup !== 'undefined') {
     window.companiesGroup.visible = (skin.name === 'BLK');
     window.mediumCompaniesGroup.visible = (skin.name === 'BLK');
     window.africaCompaniesGroup.visible = (skin.name === 'BLK');
     window.microCompaniesGroup.visible = (skin.name === 'BLK');
     window.russiaAsiaCompaniesGroup.visible = (skin.name === 'BLK');
  }
  
  // Toggle Economy Marker
  // (Sprite removed)

  // Toggle Datacenters (CYBER Skin specific)
  if (typeof window.datacentersGroup !== 'undefined') {
      window.datacentersGroup.visible = (skin.name === 'CYBER');
      if (window.dcNetworkGroup) window.dcNetworkGroup.visible = (skin.name === 'CYBER');
  }
  
  // Toggle the new WTR skin label
  const wtrLabel = document.getElementById('wtr-skin-label');
  if (wtrLabel) {
      wtrLabel.style.display = (skin.name === 'WTR') ? 'block' : 'none';
  }
  
  if (typeof window.worldBankGroup !== 'undefined') {
      window.worldBankGroup.visible = (skin.name === 'CYBER');
  }
  
  if (typeof window.treasuryGroup !== 'undefined') {
      window.treasuryGroup.visible = (skin.name === 'CYBER');
  }
  
  // Ensure the White 'D' Dexmond Hub only appears on the CYBER skin
  if (typeof window.dexmondHubGroup !== 'undefined') {
      window.dexmondHubGroup.visible = (skin.name === 'CYBER');
  }
  
  // Ensure CMD Help indicator is always shown
  const cmdHelp = document.getElementById('btn-cmd-help');
  if (cmdHelp) {
      cmdHelp.style.display = 'flex';
  }

  // Handle Cyber Warfare mechanics on BLK and CYBER skins
  if (skin.name === 'BLK' || skin.name === 'CYBER') {
      if (!window.cyberWarfareInterval) {
          window.cyberWarfareInterval = setInterval(() => {
              if (window.SKINS[window.currentSkinIndex].name === 'BLK') window.launchCyberAttack();
              if (window.SKINS[window.currentSkinIndex].name === 'CYBER') window.launchDatacenterAttack();
          }, 1000 + Math.random() * 3000); // 1-4 seconds
      }
      
      // Auto-open Simulation Info for Black Skin due to Epilepsy Warning necessity
      if (skin.name === 'BLK') {
          setTimeout(() => {
              if (typeof showCmdHelpModal === 'function' && localStorage.getItem('hideEpilepsyWarning') !== 'true') showCmdHelpModal();
          }, 300); // Slight delay for smooth transition
      }
  } else {
      if (window.cyberWarfareInterval) {
          clearInterval(window.cyberWarfareInterval);
          window.cyberWarfareInterval = null;
      }
      // Reset any active flashing
      for (const uuid in window.activeAttacks) {
          const atk = window.activeAttacks[uuid];
          if (atk && atk.mesh && atk.mesh.material && atk.mesh.userData.baseColor) {
              atk.mesh.material.color.setHex(atk.mesh.userData.baseColor);
          }
      }
      window.activeAttacks = {};
  }

  // Toggle Map Labels for Respective Skins
  const cyberLabel = document.getElementById('cybercrime-map-label');
  const liveLabel = document.getElementById('live-simulation-label');
  const intelLabel = document.getElementById('global-intelligence-label');
  const datacenterLabel = document.getElementById('datacenter-warfare-label');
  
  if (cyberLabel) cyberLabel.style.display = (skin.name === 'BLK') ? 'block' : 'none';
  if (liveLabel) liveLabel.style.display = (skin.name === 'LIVE') ? 'block' : 'none';
  if (intelLabel) intelLabel.style.display = (skin.name === 'RED') ? 'block' : 'none';
  if (datacenterLabel) datacenterLabel.style.display = (skin.name === 'CYBER') ? 'block' : 'none';
  
  // Toggle Green Skin Info Label
  const greenSkinInfo = document.getElementById('green-skin-info');
  if (greenSkinInfo) {
      greenSkinInfo.style.display = (skin.name === 'GREEN') ? 'block' : 'none';
  }

  // Toggle WTR Skin Info Label
  const wtrSkinInfo = document.getElementById('wtr-skin-info');
  if (wtrSkinInfo) {
      wtrSkinInfo.style.display = (skin.name === 'WTR') ? 'block' : 'none';
  }
  
  // Toggle Datacenter Power Display
  const datacenterPowerBox = document.getElementById('datacenter-power-display');
  if (datacenterPowerBox) {
      datacenterPowerBox.style.display = (skin.name === 'WTR') ? 'block' : 'none';
  }
  
  // Toggle Datacenter Co-Op UI
  const datacenterCoopUi = document.getElementById('datacenter-coop-ui');
  if (datacenterCoopUi) {
      datacenterCoopUi.style.display = (skin.name === 'CYBER') ? 'block' : 'none';
  }
  
  // Toggle base map elements (Troops and Borders)
  const isClean = skin.cleanGlobe || skin.hideTroops;
  if (typeof troopSprites !== 'undefined') {
    Object.values(troopSprites).forEach(sprite => {
      sprite.visible = !isClean;
      if (sprite.userData && sprite.userData.cluster) {
        sprite.userData.cluster.visible = !isClean;
      }
    });
  }
  if (typeof countryBorders !== 'undefined') {
    Object.values(countryBorders).forEach(group => {
      group.visible = true;
    });
  }

  // Clear ambient visual flights immediately when toggling to clean skin
  if (isClean && typeof ambients !== 'undefined') {
    ambients.forEach(a => {
      if (a.mesh && a.mesh.parent) a.mesh.parent.remove(a.mesh);
      if (a.pivot && a.pivot.parent) a.pivot.parent.remove(a.pivot);
      if (a.pivot && typeof scene !== 'undefined') scene.remove(a.pivot);
      
      // Clear associated particle systems
      if (a.psGroup && typeof scene !== 'undefined') scene.remove(a.psGroup);
    });
    ambients.length = 0;
  }
  
  if (skin.showOverlays) {
    if (typeof window.spawnRedPlanes === 'function' && window.planeData && window.planeData.length === 0) {
      window.spawnRedPlanes();
    }
  } else {
    // Clear planes
    if (window.planeMarkers) {
      window.planeMarkers.forEach(p => {
        const pivot = p.userData.pivot;
        if (pivot) {
           pivot.children.forEach(gc => {
               if(gc.children) gc.children.forEach(c => { if(c.material) c.material.dispose(); if(c.geometry) c.geometry.dispose(); });
           });
           scene.remove(pivot);
        }
      });
      window.planeData = [];
      window.planeMarkers = [];
    }
  }

  if (skin.name === 'WTR') {
      window.spawnWTRBlocks();
  } else {
      if (typeof window.clearWTRBlocks === 'function') window.clearWTRBlocks();
  }

  if (skin.showBoats) {
    // Auto-start boats
    if (!boatInterval) {
      fetchAndRenderBoats();
      boatInterval = setInterval(fetchAndRenderBoats, 10000);
    }
  } else {
    // FORCE CLEAR BOATS REGARDLESS OF INTERVAL STATUS
    clearBoatMarkers();
    if (boatInterval) {
      clearInterval(boatInterval);
      boatInterval = null;
    }
  }

  // Force instant UI render for specific skins (prevents interval delay)
  if (typeof updateGreenMarket === 'function') updateGreenMarket();
};

// ================= AMBIENT RADIO FEED & AI FUZZING =================

// --- WebAudio API Synthetic White Noise Generator ---
let audioCtx = null;
let staticOscillator = null;

function playSyntheticStatic() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of buffer
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // pure white noise
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;
  
  // Apply a bandpass filter to make it sound "radio-like"
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  
  // Volume control
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;
  
  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  noiseSource.start();
  return noiseSource;
}

function triggerAIFuzzEvent() {
  if (window.isRadioOn && radioAudio) {
    if(!radioAudio.paused) radioAudio.pause();
  }
  
  const isHuman = Math.random() < 0.5;
  const factionName = isHuman ? "HUMAN AI" : "RAINCLAUDE AI";
  
  const warningBox = document.getElementById('ai-fuzz-warning');
  warningBox.innerHTML = `⚠️ ${factionName} FUZZED COMS - STANDBY`;
  warningBox.style.display = 'block';
  staticOscillator = playSyntheticStatic();
  
  const fuzzDuration = Math.random() * 4000 + 4000; // 4 to 8 seconds
  console.log(`📡 [${factionName}] Fuzzing comms for ${Math.round(fuzzDuration)}ms`);
  
  setTimeout(() => {
    // End event
    document.getElementById('ai-fuzz-warning').style.display = 'none';
    if (staticOscillator) {
      staticOscillator.stop();
      staticOscillator.disconnect();
      staticOscillator = null;
    }
    
    if (window.isRadioOn && radioAudio && radioAudio.src) {
        radioAudio.play().catch(e => console.warn("Could not resume radio after fuzz", e));
    }
    
    scheduleNextFuzz();
  }, fuzzDuration);
}

function scheduleNextFuzz() {
  const nextInterval = Math.random() * 240000 + 240000; // 4 to 8 minutes
  console.log(`📡 [RAINCLAUDE AI] Next comms fuzz scheduled in ${Math.round(nextInterval/1000)}s`);
  setTimeout(triggerAIFuzzEvent, nextInterval);
}

// ================= CUSTOM SOUNDTRACK AND WARNING OVERLAY =================
const soundtrackWarningOverlay = document.createElement('div');
soundtrackWarningOverlay.style.cssText = "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(20,0,0,0.85); z-index:9999; opacity:0; pointer-events:none; transition:opacity 0.5s;";
soundtrackWarningOverlay.innerHTML = "<div style='color:#ff0033; font-family:\"Orbitron\", sans-serif; font-size:4vw; font-weight:800; text-align:center; text-shadow:0 0 20px #ff0033, 0 0 40px #ff0033; border:2px solid #ff0033; padding:40px; background:rgba(50,0,0,0.6); box-shadow:0 0 50px rgba(255,0,50,0.4); text-transform:uppercase; position:relative; z-index:10001;'>WELCOME TO NUCLEAR WAR, ENJOY</div>";
document.body.appendChild(soundtrackWarningOverlay);

let customSoundtrack = new Audio();
let soundtrackPlaylist = [
  "Adam Beyer & Joseph Capriati - Family Matters (Original Mix).mp3",
  "4235213_Broken_Circuits_Original_Mix.mp3",
  "Eat It Raw [145 BPM]-Infected Mushroom.mp3",
  "Odd Parents - Learn To Fly (Maceo_s 808 Dub) [Ellum Audio].mp3",
  "Symphonix - People Of The Dawn (ARW Remix).mp3",
  "04A - 124 - NERVO - Haute Mess (ANNA Remix).mp3",
  "Deadly Mind Trip-20X.mp3"
];
// Eager-load to update playlist globally if files change on the backend
fetch('/api/soundtrack').then(r => r.json()).then(files => { if(files.length > 0) soundtrackPlaylist = files; }).catch(e => console.error("Could not load local soundtrack", e));
let soundtrackCurrentIdx = 0;
let soundtrackWelcomed = false;
let isSoundtrackOn = false;

function playCustomSoundtrack() {
  if (soundtrackPlaylist.length === 0) {
    fetch('/api/soundtrack').then(r => r.json()).then(files => {
      soundtrackPlaylist = files;
      if (soundtrackPlaylist.length > 0) playCustomSoundtrack();
    }).catch(e => console.error("Could not load local soundtrack", e));
    return;
  }
  
  if (soundtrackCurrentIdx >= soundtrackPlaylist.length) soundtrackCurrentIdx = 0; // Loop playlist
  
  const track = soundtrackPlaylist[soundtrackCurrentIdx];
  customSoundtrack.src = '/soundtrack/' + encodeURIComponent(track);
  customSoundtrack.volume = 0.5;
  customSoundtrack.play().catch(e => console.error("Soundtrack play failed:", e));
  
  customSoundtrack.onended = () => {
    soundtrackCurrentIdx++;
    playCustomSoundtrack();
  };
}

window.playNextCustomSoundtrack = function() {
  if (soundtrackPlaylist.length === 0) return;
  soundtrackCurrentIdx++;
  if (soundtrackCurrentIdx >= soundtrackPlaylist.length) soundtrackCurrentIdx = 0;
  const track = soundtrackPlaylist[soundtrackCurrentIdx];
  customSoundtrack.src = '/soundtrack/' + encodeURIComponent(track);
  customSoundtrack.play().catch(e => console.error("Soundtrack play failed:", e));
  // Keep button states in sync if moving manually
  if (!isSoundtrackOn) toggleSoundtrack();
};

// ================= AMBIENT RADIO FEED =================
let radioAudio = new Audio();
let radioStations = [];
let currentRadioIndex = 0;
let radioRotationTimer = null;
let radioStarted = false; // Prevents browser autoplay block
window.isRadioOn = true;
window.isRadioLocked = false;

function fetchRadios() {
  fetch('/api/radio/random')
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        radioStations = data;
        currentRadioIndex = 0;
        if (window.isRadioOn) playNextRadio();
      }
    })
    .catch(e => console.error("Radio fetch error", e));
}

function playNextRadio() {
  if (!window.isRadioOn) return;
  if (radioStations.length === 0 || currentRadioIndex >= radioStations.length) {
    return fetchRadios(); // Fetch a fresh batch
  }
  
  const station = radioStations[currentRadioIndex];
  currentRadioIndex++;
  
  // Try playing resolved URL or direct URL
  const streamUrl = station.urlResolved || station.url;
  console.log(`📻 [AMBIENT RADIO] Tuning to: ${station.name || 'Unknown'} (${station.countryCode || '??'})`);
  
  // Visually notify the user in the game log
  // if (typeof setLog === 'function') {
  //   setLog(`📻 INTERCEPT: [${station.countryCode || '??'}] ${station.name || 'ENCRYPTED SIGNAL'}`);
  // }

  radioAudio.crossOrigin = "anonymous";
  radioAudio.src = streamUrl;
  radioAudio.volume = 0.30; // Decreased per user request (was 0.40)
  
  radioAudio.play().catch(e => {
    console.warn("Radio autoplay blocked or stream dead, skipping...", e);
    // If stream is dead, try next in 3 seconds
    if (radioRotationTimer) clearTimeout(radioRotationTimer);
    if (window.isRadioOn && !window.isRadioLocked) radioRotationTimer = setTimeout(playNextRadio, 3000);
  });
  
  // Rotate to a new random station every 60 seconds
  if (radioRotationTimer) clearTimeout(radioRotationTimer);
  if (window.isRadioOn && !window.isRadioLocked) radioRotationTimer = setTimeout(playNextRadio, 60000);
}

// Global click listener removed; radio now starts explicitly inside closeOnboarding()

window.toggleSoundtrack = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const btn = document.getElementById('btn-toggle-soundtrack');
  const radioBtn = document.getElementById('btn-toggle-radio');
  isSoundtrackOn = !isSoundtrackOn;

  if (isSoundtrackOn) {
    btn.classList.add('soundtrack-on');
    
    // Pause radio if it's playing
    if (window.isRadioOn) {
      window.toggleRadio(); 
    }

    if (!soundtrackWelcomed) {
      soundtrackWelcomed = true;
      soundtrackWarningOverlay.style.opacity = '1';

      setTimeout(() => { 
        soundtrackWarningOverlay.style.opacity = '0';
        
        // Show the skin hint arrow directly following the banner
        const skinArrow = document.getElementById('skin-hint-arrow');
        if (skinArrow) {
            skinArrow.style.opacity = '1';
            // Fade out the arrow after another 6 seconds
            setTimeout(() => { skinArrow.style.opacity = '0'; }, 6000);
        }
      }, 4000);
    }
    
    // Toggle active CSS class for the NEXT button
    const nextBtn = document.getElementById('btn-toggle-soundtrack-next');
    if (nextBtn) nextBtn.classList.add('soundtrack-on');

    playCustomSoundtrack();
  } else {
    btn.classList.remove('soundtrack-on');
    
    // Remove active CSS class on NEXT button
    const nextBtn = document.getElementById('btn-toggle-soundtrack-next');
    if (nextBtn) nextBtn.classList.remove('soundtrack-on');

    customSoundtrack.pause();
  }
};

window.toggleRadio = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const btn = document.getElementById('btn-toggle-radio');
  const lockBtn = document.getElementById('btn-toggle-radio-lock');
  const nextBtn = document.getElementById('btn-toggle-radio-next'); // Added
  const labelBtn = document.getElementById('infinite-world-radio-label');
  window.isRadioOn = !window.isRadioOn;
  
  if (!window.isRadioOn) {
    radioAudio.pause();
    if (radioRotationTimer) clearTimeout(radioRotationTimer);
    btn.innerHTML = '🔇 OFF';
    btn.classList.add('radio-off');
    lockBtn.style.display = 'none';
    nextBtn.style.display = 'none'; // Added
    if (labelBtn) labelBtn.style.display = 'none';
  } else {
    // Pause soundtrack if it's playing
    if (isSoundtrackOn) {
      window.toggleSoundtrack();
    }
    
    btn.innerHTML = '📻 ON';
    btn.classList.remove('radio-off');
    lockBtn.style.display = 'block';
    nextBtn.style.display = 'block'; // Added
    if (labelBtn) labelBtn.style.display = 'block';
    if (!radioStarted) {
      radioStarted = true;
      fetchRadios();
    } else {
      // Set the src and play the current station that was paused
      if (radioAudio.src) {
        radioAudio.play().catch(e => {
            console.warn("Radio playback failed on resume, skipping to next...", e);
            playNextRadio();
        });
        if (!window.isRadioLocked) {
            if (radioRotationTimer) clearTimeout(radioRotationTimer);
            radioRotationTimer = setTimeout(playNextRadio, 60000);
        }
      } else {
          playNextRadio();
      }
    }
  }
};

window.toggleRadioLock = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const btn = document.getElementById('btn-toggle-radio-lock');
  window.isRadioLocked = !window.isRadioLocked;
  
  if (window.isRadioLocked) {
    btn.innerHTML = '🔓 UNLK RADIO';
    btn.classList.add('radio-locked');
    if (radioRotationTimer) {
      clearTimeout(radioRotationTimer);
      radioRotationTimer = null;
    }
    // Visually notify
    // if (typeof setLog === 'function') setLog('📻 Station LOCKED. Auto-rotation disabled.');
  } else {
    btn.innerHTML = '🔒 LOCK RADIO';
    btn.classList.remove('radio-locked');
    // Start the timer again
    if (window.isRadioOn) {
      if (radioRotationTimer) clearTimeout(radioRotationTimer);
      radioRotationTimer = setTimeout(playNextRadio, 60000);
    }
    // Visually notify
    // if (typeof setLog === 'function') setLog('📻 Station UNLOCKED. Auto-rotation enabled.');
  }
};

// ========================================================
// GREEN MOUNTAIN DIG LOGIC
// ========================================================
window.isDigging = false;

window.openMountainDigModal = function() {
    if (window.isDigging) return; // Prevent reopening during active dig
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    
    document.getElementById('mountain-dig-modal').style.display = 'block';
    
    // Reset state
    const progressBar = document.getElementById('dig-progress-bar');
    const progressContainer = document.getElementById('dig-progress-container');
    const statusText = document.getElementById('dig-status-text');
    const btn = document.getElementById('btn-dig-action');
    
    progressContainer.style.visibility = 'hidden';
    progressBar.style.width = '0%';
    statusText.innerText = '';
    btn.style.display = 'block';
};

window.startMountainDig = function() {
    if (window.isDigging) return;
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    
    window.isDigging = true;
    
    const progressBar = document.getElementById('dig-progress-bar');
    const progressContainer = document.getElementById('dig-progress-container');
    const statusText = document.getElementById('dig-status-text');
    const btn = document.getElementById('btn-dig-action');
    
    btn.style.display = 'none';
    progressContainer.style.visibility = 'visible';
    progressBar.style.width = '0%';
    statusText.innerText = 'EXCAVATING... 0%';
    
    let w = 0;
    const interval = setInterval(() => {
        w += 2; // 5 seconds total (50 steps of 100ms)
        progressBar.style.width = w + '%';
        statusText.innerText = `EXCAVATING... ${w}%`;
        
        if (w >= 100) {
            clearInterval(interval);
            statusText.innerText = 'EXTRACTING MINERALS...';
            
            // Dispatch to server to roll RNG and get actual items
            if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                window.ws.send(JSON.stringify({ type: 'mountain_dig_complete' }));
            }
        }
    }, 100);
};

// ========================================================
// D3X MINE EXCAVATION LOGIC
// ========================================================
window.d3xDigState = window.d3xDigState || {};
window.activeMineModalId = null;

window.closeD3XStakeModal = function() {
    document.getElementById('d3x-resource-staking-modal').style.display = 'none';
    window.activeMineModalId = null;
};

window.openD3XStakeModal = function(mineId) {
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    const modal = document.getElementById('d3x-resource-staking-modal');
    modal.style.display = 'flex';
    window.activeMineModalId = mineId;
    
    // Reset UI to current state
    document.getElementById('d3x-stake-title').innerText = `D3X MINE [${mineId.substring(0,8).toUpperCase()}]`;
    const state = window.d3xDigState[mineId] || { clicks: 0 };
    updateDigUI(state.clicks);
};

function updateDigUI(clicks) {
    document.getElementById('d3x-stake-timer').innerText = `${clicks} / 10`;
    document.getElementById('d3x-stake-progress').style.width = `${(clicks / 10) * 100}%`;
    
    if (clicks === 0) {
        document.getElementById('d3x-stake-progress').style.background = "#fa0";
    } else {
        document.getElementById('d3x-stake-progress').style.background = "#0f8";
    }
}

window.handleDigD3X = function() {
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    
    if (!window.activeMineModalId) return;
    
    // Validate we actually have some D3X to afford the 3-6 D3X dig cost
    if (window.localD3XBalance < 6) {
        appendDigLog(`<span style="color:#f55">ERROR: Insufficient D3X</span> to power excavation rig (6 D3X required).`);
        return;
    }
    
    if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'process_mine_click',
            callsign: window.myCallsign || GS.playerCallsign,
            mineId: window.activeMineModalId
        }));
    } else {
        appendDigLog(`<span style="color:#f55">ERROR: Connection to server lost.</span>`);
    }
};

function appendDigLog(htmlString) {
    const logDiv = document.getElementById('d3x-dig-log');
    if (!logDiv) return;
    
    const tString = new Date().toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
    const newEntry = document.createElement('div');
    newEntry.innerHTML = `[${tString}] ${htmlString}`;
    logDiv.appendChild(newEntry);
    
    // Keep max 20 lines
    while (logDiv.children.length > 20) {
        logDiv.removeChild(logDiv.firstChild);
    }
    logDiv.scrollTop = logDiv.scrollHeight;
}

window.handleCollectD3X = function(mineId) {
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    const reward = Math.floor(Math.random() * 5) + 3; // Random 3 to 7
    
    // Attempt to credit real D3X balance via Green Market Portfolio logic if it exists
    if (window.pendingSolanaAddress && typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
        // We'll trust the client side for this mini-game for now, just credit it manually 
        // to `window.commanderPortfolio` or the mock balance
    }
    
    // Update local variables first
    if (typeof window.commanderPortfolio !== 'undefined' && window.commanderPortfolio) {
        window.commanderPortfolio.d3x_balance = (parseFloat(window.commanderPortfolio.d3x_balance) || 0) + reward;
        
        // Save back to DB
        if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'save_portfolio',
                walletAddr: window.pendingSolanaAddress,
                portfolio: window.commanderPortfolio
            }));
        }
    } else {
        // Fallback for mock environment
        window.d3xBalance += reward;
    }
    
    // Update top UI
    const d3xUiStr = typeof updateD3XDisplay === 'function' ? updateD3XDisplay() : null;
    const globeBal = document.getElementById('green-wallet-balance');
    if (globeBal && window.commanderPortfolio) {
        globeBal.innerText = parseFloat(window.commanderPortfolio.d3x_balance).toFixed(2);
    }
    
    alert(`MINING COMPLETE! You extracted ${reward} D3X.`);
    if (typeof setLog === 'function') setLog(`[REWARD] Extracted +${reward} D3X from Sector ${mineId.substring(0,4)}`);
    
    // Reset state allowing them to mine again
    delete window.d3xStakeState[mineId];
    updateD3XStakeModalUI(mineId);
};

// ========================================================
// D3X STORE LOGIC
// ========================================================
window.d3xBalance = 1000; // Mock starting balance for testing
window.unlockedCyberSkin = false;
window.hasLaserVFX = false;

function updateD3XDisplay() {
  const el = document.getElementById('d3x-balance');
  if (el) el.innerText = window.d3xBalance;
}

// Initial display setup
setInterval(updateD3XDisplay, 1000);

window.buyCyberSkin = function() {
  if (window.unlockedCyberSkin) {
    alert("CYBERTHEME already unlocked!");
    return;
  }
  if (window.d3xBalance >= 50) {
    window.d3xBalance -= 50;
    window.unlockedCyberSkin = true;
    updateD3XDisplay();
    alert("CYBERTHEME SKIN UNLOCKED! Access it via the screen toggle.");
    document.getElementById('d3x-store-modal').style.display='none';
  } else {
    alert("INSUFFICIENT D3X BALNCE.");
  }
};

window.buyCustomTag = function() {
  const input = document.getElementById('custom-tag-input').value.trim();
  if (!input) {
    alert("Please enter a valid tag.");
    return;
  }
  if (window.d3xBalance >= 10) {
    window.d3xBalance -= 10;
    updateD3XDisplay();
    // Override local tag (this would sync to server in real implementation)
    window.PLAYER_NAME = input; 
    const pnameEl = document.querySelector('#dash-0 .dash-pname');
    if (pnameEl) pnameEl.innerText = input;
    alert("GAMER TAG UPDATED TO: " + input);
    document.getElementById('d3x-store-modal').style.display='none';
  } else {
    alert("INSUFFICIENT D3X BALANCE.");
  }
};

window.buyLaserVFX = function() {
  if (window.hasLaserVFX) {
    alert("ORBITAL LASER VFX already unlocked!");
    return;
  }
  if (window.d3xBalance >= 25) {
    window.d3xBalance -= 25;
    window.hasLaserVFX = true;
    updateD3XDisplay();
    alert("ORBITAL LASER VFX UNLOCKED! Your nukes will now use laser strikes.");
    document.getElementById('d3x-store-modal').style.display='none';
  } else {
    alert("INSUFFICIENT D3X BALANCE.");
  }
};

window.buyRadioBroadcast = function() {
  const fileInput = document.getElementById('radio-audio-upload');
  if (!fileInput.files.length) {
    alert("Please select an audio file to broadcast.");
    return;
  }
  if (window.d3xBalance >= 100) {
    window.d3xBalance -= 100;
    updateD3XDisplay();
    // In a real implementation, upload the file to the server and push to clients' radio queues.
    alert("AUDIO UPLOADED! Broadcast queued on global radio channel.");
    document.getElementById('d3x-store-modal').style.display='none';
  } else {
    alert("INSUFFICIENT D3X BALANCE.");
  }
};

window.buyOrbitalStrike = function() {
  if (window.d3xBalance >= 250) {
    window.d3xBalance -= 250;
    updateD3XDisplay();
    // For now, this just adds the "RODS FROM GOD" state. 
    // Actual implementation would inject logic into the attack handler.
    window.hasOrbitalStrikeReady = true;
    alert("RODS FROM GOD ARMED. Your next attack will bypass defense.");
    document.getElementById('d3x-store-modal').style.display='none';
  } else {
    alert("INSUFFICIENT D3X BALANCE.");
  }
};

// ========================================================
// Removed hover listeners for ops-sidebar (now permanently displayed)