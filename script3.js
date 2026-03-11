
// =====================================================================
// GAME INITIALIZATION
// =====================================================================
// =====================================================================
// PHASE 1: REAL-WORLD COUNTRY STATS (GDP in $B, mil_rank 1-100, pop in M)
// =====================================================================
const COUNTRY_STATS = {
  USA:{gdp:26000,mil:100,pop:334},CHN:{gdp:18000,mil:95,pop:1412},IND:{gdp:3700,mil:80,pop:1428},
  RUS:{gdp:2240,mil:90,pop:144},DEU:{gdp:4400,mil:60,pop:84},GBR:{gdp:3100,mil:65,pop:67},
  FRA:{gdp:3000,mil:62,pop:68},JPN:{gdp:4300,mil:55,pop:125},BRA:{gdp:2100,mil:50,pop:215},
  CAN:{gdp:2100,mil:45,pop:38},KOR:{gdp:1700,mil:58,pop:52},AUS:{gdp:1700,mil:44,pop:26},
  MEX:{gdp:1490,mil:35,pop:129},IDN:{gdp:1390,mil:42,pop:277},SAU:{gdp:1100,mil:48,pop:36},
  TUR:{gdp:1150,mil:52,pop:85},NLD:{gdp:1000,mil:36,pop:17},ARE:{gdp:500,mil:40,pop:10},
  ISR:{gdp:520,mil:56,pop:9},PAK:{gdp:376,mil:44,pop:231},NGA:{gdp:477,mil:30,pop:223},
  ARG:{gdp:630,mil:32,pop:46},EGY:{gdp:476,mil:38,pop:105},ZAF:{gdp:419,mil:28,pop:60},
  UKR:{gdp:200,mil:46,pop:44},POL:{gdp:750,mil:38,pop:38},SWE:{gdp:590,mil:34,pop:10},
  NOR:{gdp:480,mil:32,pop:5},PHL:{gdp:404,mil:28,pop:115},MYS:{gdp:430,mil:26,pop:33},
  VNM:{gdp:406,mil:30,pop:98},BGD:{gdp:460,mil:22,pop:170},COL:{gdp:363,mil:26,pop:52},
  CHL:{gdp:360,mil:24,pop:19},IRQ:{gdp:268,mil:30,pop:42},IRN:{gdp:367,mil:42,pop:87},
  PRK:{gdp:30,mil:50,pop:26},SYR:{gdp:22,mil:18,pop:21},LBY:{gdp:52,mil:12,pop:7},
  SDN:{gdp:35,mil:14,pop:46},ETH:{gdp:156,mil:14,pop:126},TZA:{gdp:77,mil:8,pop:64},
  KEN:{gdp:110,mil:8,pop:56},GHA:{gdp:76,mil:6,pop:33},ANG:{gdp:95,mil:12,pop:35},
  MOZ:{gdp:18,mil:4,pop:33},ZMB:{gdp:22,mil:3,pop:19},ZIM:{gdp:25,mil:5,pop:16},
  ALG:{gdp:191,mil:20,pop:45},MAR:{gdp:142,mil:16,pop:37},TUN:{gdp:47,mil:10,pop:12},
  PRT:{gdp:262,mil:18,pop:10},ESP:{gdp:1500,mil:40,pop:47},ITA:{gdp:2190,mil:45,pop:60},
  GRC:{gdp:240,mil:20,pop:11},ROU:{gdp:300,mil:24,pop:19},HUN:{gdp:188,mil:16,pop:10},
  CZE:{gdp:330,mil:18,pop:11},AUT:{gdp:515,mil:16,pop:9},CHE:{gdp:800,mil:18,pop:9},
  BEL:{gdp:580,mil:22,pop:12},DNK:{gdp:390,mil:18,pop:6},FIN:{gdp:300,mil:20,pop:6},
  SGP:{gdp:470,mil:30,pop:6},HKG:{gdp:360,mil:5,pop:7},TWN:{gdp:760,mil:44,pop:24},
  THA:{gdp:500,mil:22,pop:72},MMR:{gdp:65,mil:18,pop:54},KHM:{gdp:26,mil:6,pop:17},
  LAO:{gdp:14,mil:4,pop:7},NPL:{gdp:40,mil:6,pop:30},LKA:{gdp:84,mil:10,pop:22},
  AFG:{gdp:14,mil:12,pop:40},UZB:{gdp:80,mil:14,pop:36},KAZ:{gdp:220,mil:18,pop:19},
  GEO:{gdp:24,mil:8,pop:4},AZE:{gdp:95,mil:16,pop:10},ARM:{gdp:20,mil:12,pop:3},
  BLR:{gdp:73,mil:22,pop:10},MDA:{gdp:15,mil:4,pop:3},LTU:{gdp:74,mil:12,pop:3},
  LVA:{gdp:43,mil:10,pop:2},EST:{gdp:38,mil:10,pop:1},SVK:{gdp:120,mil:12,pop:5},
  SVN:{gdp:66,mil:8,pop:2},HRV:{gdp:80,mil:10,pop:4},SRB:{gdp:66,mil:12,pop:7},
  BIH:{gdp:24,mil:6,pop:3},ALB:{gdp:18,mil:5,pop:3},MKD:{gdp:14,mil:4,pop:2},
  MNE:{gdp:6,mil:3,pop:1},BLZ:{gdp:2,mil:1,pop:0.4},GTM:{gdp:85,mil:6,pop:18},
  HND:{gdp:28,mil:4,pop:10},SLV:{gdp:34,mil:4,pop:6},NIC:{gdp:16,mil:3,pop:7},
  CRI:{gdp:65,mil:0,pop:5},PAN:{gdp:68,mil:5,pop:4},CUB:{gdp:100,mil:14,pop:11},
  VEN:{gdp:105,mil:14,pop:29},BOL:{gdp:44,mil:6,pop:12},PRY:{gdp:42,mil:4,pop:7},
  URY:{gdp:70,mil:6,pop:4},PER:{gdp:240,mil:18,pop:33},ECU:{gdp:113,mil:10,pop:18},
  GUY:{gdp:20,mil:2,pop:0.8},JAM:{gdp:16,mil:2,pop:3},TTO:{gdp:22,mil:4,pop:1.4},
  NZL:{gdp:250,mil:10,pop:5},PNG:{gdp:28,mil:3,pop:10},FJI:{gdp:4,mil:1,pop:0.9},
  SOM:{gdp:7,mil:5,pop:18},DJI:{gdp:4,mil:4,pop:1},ERI:{gdp:2,mil:8,pop:3},
  UGA:{gdp:48,mil:6,pop:48},RWA:{gdp:13,mil:4,pop:14},BDI:{gdp:3,mil:2,pop:12},
  COD:{gdp:60,mil:10,pop:100},CMR:{gdp:46,mil:5,pop:28},CIV:{gdp:68,mil:5,pop:27},
  SEN:{gdp:28,mil:4,pop:17},MLI:{gdp:20,mil:5,pop:22},BFA:{gdp:19,mil:4,pop:22},
  NER:{gdp:17,mil:3,pop:26},TCD:{gdp:12,mil:5,pop:17},CAF:{gdp:2,mil:2,pop:5},
  GAB:{gdp:19,mil:3,pop:2},GNQ:{gdp:12,mil:2,pop:1.5},COG:{gdp:14,mil:2,pop:6},
  MWI:{gdp:12,mil:2,pop:20},LSO:{gdp:3,mil:1,pop:2},SWZ:{gdp:4,mil:1,pop:1.2},
  NAM:{gdp:13,mil:2,pop:3},BWA:{gdp:20,mil:2,pop:3},MDG:{gdp:14,mil:2,pop:28},
  MUS:{gdp:13,mil:1,pop:1.3},SYC:{gdp:2,mil:0,pop:0.1},CPV:{gdp:2,mil:0,pop:0.6},
  GMB:{gdp:2,mil:1,pop:2.6},GNB:{gdp:2,mil:1,pop:2},SLE:{gdp:4,mil:1,pop:8},
  LBR:{gdp:4,mil:1,pop:5},TGO:{gdp:8,mil:2,pop:8},BEN:{gdp:18,mil:2,pop:13},
  GIN:{gdp:20,mil:4,pop:13},QAT:{gdp:220,mil:24,pop:3},KWT:{gdp:145,mil:20,pop:4},
  BHR:{gdp:44,mil:12,pop:1.5},OMN:{gdp:88,mil:18,pop:5},YEM:{gdp:20,mil:8,pop:34},
  JOR:{gdp:47,mil:16,pop:10},LBN:{gdp:22,mil:8,pop:5},PSE:{gdp:20,mil:4,pop:5},
  MDV:{gdp:7,mil:0,pop:0.5},BTN:{gdp:3,mil:1,pop:0.8},TLS:{gdp:3,mil:1,pop:1.3},
  BRN:{gdp:14,mil:5,pop:0.5},MNG:{gdp:17,mil:4,pop:3},TKM:{gdp:40,mil:6,pop:6},
  TJK:{gdp:11,mil:4,pop:10},KGZ:{gdp:12,mil:4,pop:7},WSM:{gdp:1,mil:0,pop:0.2},
  TON:{gdp:0.5,mil:0,pop:0.1},VUT:{gdp:1,mil:0,pop:0.3},SLB:{gdp:1.5,mil:0,pop:0.7},
};

// Helper: get stat for a country (fallback if unknown)
function getCountryStat(iso) {
  return COUNTRY_STATS[iso] || { gdp: 5, mil: 2, pop: 1 };
}

// =====================================================================
// PHASE 2: FOG OF WAR
// =====================================================================
let fogEnabled = true;

function computeVisibility() {
  if (!fogEnabled) return null;
  const myTerritories = new Set(
    Object.entries(GS.countries || {})
      .filter(([,c]) => c.owner === GS.myIndex)
      .map(([iso]) => iso)
  );
  const visible = new Set(myTerritories);

  // Add all countries geographically adjacent (within ~20 degrees lat/lon)
  const myArr = Array.from(myTerritories);
  Object.keys(countryData || {}).forEach(iso => {
    if (visible.has(iso)) return;
    const cd = countryData[iso];
    if (!cd) return;
    for (const myIso of myArr) {
      const mcd = countryData[myIso];
      if (!mcd) continue;
      const dlat = Math.abs(cd.lat - mcd.lat);
      const dlon = Math.abs(cd.lon - mcd.lon);
      const dist = Math.sqrt(dlat*dlat + dlon*dlon);
      if (dist < 22) { visible.add(iso); break; }
    }
  });
  return visible;
}

function applyFogOfWar() {
  if (!GS.countries) return;
  const visible = computeVisibility();
  Object.entries(troopSprites).forEach(([iso, sprite]) => {
    if (!sprite) return;
    if (visible && !visible.has(iso)) {
      sprite.material.opacity = 0.15;
      sprite.material.transparent = true;
    } else {
      sprite.material.opacity = 1.0;
      sprite.material.transparent = true;
    }
  });
}

function initGame(playerNames, myIndex) {
  GS.players = playerNames.map((name,i)=>({
    name, index:i, color:PLAYER_COLORS[i], nukes:2, alive:true, troops:0, budget: 500
  }));
  GS.myIndex = myIndex;

  // Assign countries — seed from real-world stats
  const isos = Object.keys(countryData);
  isos.sort(()=>Math.random()-.5);

  const numPlayers = GS.players.length;
  isos.forEach((iso,i) => {
    const owner = i < isos.length * 0.85 ? (i % numPlayers) : -1; // 15% neutral
    const stats = getCountryStat(iso);
    // Scale mil strength (1-100) into game troops (1-15)
    const milTroops = Math.round(1 + (stats.mil / 100) * 14);
    const initTroops = owner === -1 ? Math.max(1, Math.round(milTroops * 0.4)) : milTroops;
    // Income per turn derived from GDP (log scale so small countries still matter)
    const income = Math.max(1, Math.round(Math.log10(stats.gdp + 1) * 3));
    GS.countries[iso] = {
      owner, troops: initTroops, nuked: 0,
      name: countryData[iso].name, lat: countryData[iso].lat, lon: countryData[iso].lon,
      gdp: stats.gdp, mil: stats.mil, pop: stats.pop, income,
      infrastructure: 3, // 0-5 scale, starts at 3
      airwings: 0, ships: 0,
    };
  });

  // Count troops for reinforcement baseline
  GS.players.forEach((_,pi) => {
    GS.players[pi].troops = Object.values(GS.countries).filter(c=>c.owner===pi).length;
  });

  refreshAllBorders();
  buildTroopSprites();
  startTurn(0);

  // Build player badges
  const badges = document.getElementById('player-badges');
  badges.innerHTML = GS.players.map((p,i)=>`
    <div class="pb" id="badge-${i}"
      style="border-color:${p.color.hex};color:${p.color.hex}">
      ${p.color.name}: ${p.name}
    </div>`).join('');

  document.getElementById('hud').style.display='block';

  // Show dashboards and start live update — only 2 panels in 2-faction mode
  document.getElementById('dash-0').classList.add('visible');
  document.getElementById('dash-1').classList.add('visible');
  document.getElementById('user-stats-box').classList.add('visible');
  const chatToggle = document.getElementById('btn-chat-toggle');
  if (chatToggle) chatToggle.style.display = 'flex';
  updateDashboard();
  if(window._dashInterval) clearInterval(window._dashInterval);
  window._dashInterval = setInterval(updateDashboard, 1000);
}

// =====================================================================
// LIVE FACTION DASHBOARD — 2 factions: Humanity (0) vs Rainclaude (1)
// =====================================================================
function updateDashboard() {
  if(!GS.players.length) return;
  const total = Object.keys(GS.countries).length || 1;
  const troops0 = Object.values(GS.countries).filter(c=>c.owner===0).reduce((s,c)=>s+c.troops,0);
  const troops1 = Object.values(GS.countries).filter(c=>c.owner===1).reduce((s,c)=>s+c.troops,0);
  const maxTroops = Math.max(1, troops0, troops1);

  [0,1].forEach(pi=>{
    const p = GS.players[pi]; if(!p) return;
    const owned = Object.entries(GS.countries).filter(([,c])=>c.owner===pi);
    const terrCount = owned.length;
    const totalTroopsRaw = pi===0?troops0:troops1;
    const totalTroops = totalTroopsRaw * 10000;
    const avgAtk = terrCount ? (totalTroopsRaw/terrCount).toFixed(1) : 0;
    const income = Math.max(3, Math.floor(terrCount/3));
    const incomeBillion = income * 50;
    const defScore = terrCount ? Math.min(100, Math.round((income/terrCount)*400)) : 0;
    const terrPct = Math.round((terrCount/total)*100);
    const troopPct = Math.round((totalTroopsRaw/maxTroops)*100);
    const atkPct   = Math.min(100, Math.round(parseFloat(avgAtk)*20));

    const id=`d${pi}`;
    const set=(sfx,val)=>{const el=document.getElementById(id+'-'+sfx);if(el)el.textContent=val;};
    const setW=(sfx,w)=>{const el=document.getElementById(id+'-'+sfx);if(el)el.style.width=w+'%';};

    set('terr', terrCount);
    set('troops', totalTroops.toLocaleString());
    set('budget', `$${p.budget.toLocaleString()} B`);
    set('tp', terrPct+'%');
    set('mp', formatTroops(totalTroopsRaw));
    set('ap', avgAtk);
    set('dp', defScore+'%');
    setW('tbar', terrPct);
    setW('mbar', troopPct);
    setW('abar', atkPct);
    setW('dbar', defScore);

    const nukeEl=document.getElementById(id+'-nukes');
    if(nukeEl){
      const max=pi===0?GS.players[0].nukes:GS.players[1].nukes;
      let html='<span class="dash-nuke-label">NUKES</span>';
      for(let n=0;n<3;n++) html+=`<span class="nuke-icon${n>=p.nukes?' spent':''}">☢</span>`;
      nukeEl.innerHTML=html;
    }

    const statEl=document.getElementById(id+'-status');
    if(statEl){
      if(!p.alive){statEl.textContent='ELIMINATED';statEl.className='dash-status eliminated';}
      else if(GS.turn===pi){statEl.textContent=pi===0?'▶ YOUR MOVE':'⚙ AI COMPUTING...';statEl.className='dash-status active';}
      else{statEl.textContent=`+${income} MILS / +$${incomeBillion}B`;statEl.className='dash-status waiting';}
    }

    // Update AI State Elements for Rainclaude
    if (pi === 1) {
      set('threat', (GS.AI_STATE && GS.AI_STATE.threatTier) ? `T${GS.AI_STATE.threatTier}` : 'T1');
      set('energy', (GS.AI_STATE && GS.AI_STATE.energy) ? GS.AI_STATE.energy.toString() : '0');
      set('tech', (GS.AI_STATE && GS.AI_STATE.techLevel) ? `L${GS.AI_STATE.techLevel}` : 'L1');
      set('aggro', (GS.AI_STATE && GS.AI_STATE.aggressionLevel) ? GS.AI_STATE.aggressionLevel.toFixed(1) : '1.0');
    }

    // Update players line for Human side
    if(pi===0){
      const pEl=document.getElementById('d0-players');
      if(pEl) pEl.textContent=`⚡ ${GS.players[0].name.toUpperCase()} IN COMMAND`;
      // Update User Stats box name
      const usName = document.getElementById('us-name');
      const inputName = document.getElementById('player-name')?.value;
      const displayName = window.myCallsign || inputName || GS.players[0].name;
      if(usName) usName.textContent = 'COM-' + displayName.toUpperCase().substring(0, 15);
      
      // Update User Stats box dynamic stats
      if (GS.countries) {
        const myCountries = Object.values(GS.countries).filter(c => c.owner === GS.myIndex);
        const terrEl = document.getElementById('us-terr');
        const trpEl = document.getElementById('us-trp');
        if (terrEl) terrEl.textContent = myCountries.length;
        if (trpEl) trpEl.textContent = myCountries.reduce((sum, c) => sum + c.troops, 0);
      }
    }
  });

  // Local UI Update for User Stats Box - handled by WebSocket response now.
  // The US UI is updated directly via 'commander_stats' WSS event.
}

// =====================================================================
// COUNTRY BORDER COLORS

// =====================================================================
function getOwnerColor(owner) {
  return owner === -1 ? NEUTRAL : PLAYER_COLORS[owner];
}

function refreshAllBorders() {
  for (const [iso, group] of Object.entries(countryBorders)) {
    const c = GS.countries[iso];
    if (!c) continue;
    const col = getOwnerColor(c.owner);
    group.traverse(obj => {
      if (obj.isLine) {
        obj.material.color.set(col.int);
        obj.material.opacity = (iso === GS.selected) ? 1.0 : 0.65;
      }
    });
  }
}

function highlightCountry(iso, glow) {
  const g = countryBorders[iso];
  if (!g) return;
  g.traverse(obj => {
    if (obj.isLine) {
      obj.material.opacity = glow ? 1.0 : 0.65;
      if (glow) obj.material.linewidth = 2;
    }
  });
}

// =====================================================================
// TROOP SPRITES (canvas textures per country)
// =====================================================================
const troopSprites = {}; // iso → THREE.Sprite

function formatTroops(num) {
  const scaled = num * 10000;
  if (scaled >= 1000000) return (scaled / 1000000).toFixed(scaled % 1000000 === 0 ? 0 : 1) + 'M';
  if (scaled >= 1000) return (scaled / 1000).toFixed(0) + 'K';
  return scaled.toString();
}

function troopTexture(txt, colHex) {
  const cn = document.createElement('canvas'); cn.width = 128; cn.height = 64;
  const ctx = cn.getContext('2d');
  
  // Halos / faction glow
  ctx.shadowColor = colHex;
  ctx.shadowBlur = 15;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath(); ctx.roundRect(10, 10, 108, 44, 10); ctx.fill();
  
  // Outer bright border
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2; ctx.strokeStyle = colHex; ctx.stroke();
  
  // Inner faint border
  ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.strokeRect(12, 12, 104, 40);
  
  // Number text
  ctx.fillStyle = colHex;
  ctx.font = 'bold 24px "Orbitron", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 64, 32);
  
  return new THREE.CanvasTexture(cn);
}

function buildTroopSprites() {
  // Remove old sprites
  Object.values(troopSprites).forEach(s=>scene.remove(s));
  Object.keys(troopSprites).forEach(k=>delete troopSprites[k]);

  for (const [iso, country] of Object.entries(GS.countries)) {
    const cd = countryData[iso];
    if (!cd) continue;
    const col = getOwnerColor(country.owner).hex;
    const tex = troopTexture(formatTroops(country.troops), col);
    const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false});
    const sprite = new THREE.Sprite(mat);
    const pos = ll2v(cd.lat, cd.lon, GLOBE_R + .04);
    sprite.position.copy(pos);
    sprite.scale.set(.12,.06,1);
    sprite.userData = {iso};
    scene.add(sprite);
    troopSprites[iso] = sprite;
  }
}

function updateTroopSprite(iso) {
  const c = GS.countries[iso]; if(!c) return;
  const cd = countryData[iso]; if(!cd) return;
  const old = troopSprites[iso];
  if(old) scene.remove(old);
  const col = getOwnerColor(c.owner).hex;
  const tex = troopTexture(formatTroops(c.troops), col);
  const mat = new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(ll2v(cd.lat, cd.lon, GLOBE_R+.04));
  sprite.scale.set(.12,.06,1);
  sprite.userData={iso};
  scene.add(sprite);
  troopSprites[iso]=sprite;
}

// =====================================================================
// TURN MANAGEMENT
// =====================================================================
function showTurnAnnounce(playerIndex, cb) {
  const p = GS.players[playerIndex];
  const ta = document.getElementById('turn-announce');
  const taName = document.getElementById('ta-name');
  const taPhase = document.getElementById('ta-phase');
  const taSub = document.getElementById('ta-sub');
  const taNukes = document.getElementById('ta-nukes');

  const isMe = playerIndex === GS.myIndex;
  let reinforceAmount = 0;
  if (playerIndex === 0) { // Humanity Reinforcements
    let humanOwned = 0;
    Object.values(GS.countries).forEach(c => {
      if (c.owner === 0) humanOwned++;
    });
    let hReinforce = Math.max(3, Math.floor(humanOwned / 3));
    if (GS.globalMetrics.powerGrid < 50 || GS.globalMetrics.economy < 50) {
      let penalty = Math.floor(hReinforce * 0.25);
      hReinforce -= penalty;
      setLog(`⚠ GLOBAL SYSTEMS FAILING: Initial reinforcements reduced by ${penalty}.`);
    }
    if (GS.globalMetrics.airTrafficDisabledTurns > 0) {
      let airPenalty = Math.max(1, Math.floor(hReinforce * 0.4));
      hReinforce -= airPenalty;
      GS.globalMetrics.airTrafficDisabledTurns--;
      if (GS.globalMetrics.airTrafficDisabledTurns === 0) {
        setLog("✈ AIR TRAFFIC RESTORED.");
      } else {
        setLog(`⚠ AIR TRAFFIC DOWN: Logistics crippled. Reinforcements reduced by ${airPenalty}.`);
      }
    }
    reinforceAmount = hReinforce;
  } else { // Rainclaude Reinforcements
    const owned = Object.values(GS.countries).filter(c=>c.owner===playerIndex).length;
    reinforceAmount = Math.max(3, Math.floor(owned/3));
  }
  GS.reinforceLeft = reinforceAmount;

  taName.textContent = isMe ? 'YOUR TURN' : p.name;
  taName.style.color = p.color.hex;
  taPhase.textContent = `+${reinforceAmount} TROOPS — REINFORCE PHASE`;
  taPhase.style.color = p.color.hex;
  taPhase.style.borderColor = p.color.hex;
  taSub.textContent = isMe ? '⚡ COMMAND TRANSFERRED TO YOU' : `${p.color.name} COALITION`;
  taNukes.textContent = `☢ NUCLEAR WARHEADS: ${p.nukes}`;

  ta.className = 'show fade';
  // Force reflow to restart animation
  ta.style.animation = 'none';
  ta.offsetHeight;
  ta.style.animation = '';
  ta.querySelector('#ta-name').style.animation = 'none';
  ta.querySelector('#ta-name').offsetHeight;
  ta.querySelector('#ta-name').style.animation = '';

  ta.classList.remove('show');
  ta.classList.add('fade');

  setTimeout(() => {
    ta.classList.remove('fade');
    if (cb) cb();
  }, 2800);
}

// =====================================================================
// CATASTROPHIC BUDGET DRAIN EVENTS
// =====================================================================
const HUMAN_CATASTROPHE_EVENTS = [
  // Healthcare
  { msg: "PANDEMIC EMERGENCY — GLOBAL HEALTHCARE SYSTEM OVERWHELMED", drain: 0.28 },
  { msg: "PUBLIC HOSPITAL NETWORK COLLAPSES — EMERGENCY FUNDING DEPLOYED", drain: 0.22 },
  { msg: "PHARMACEUTICAL CRISIS — GOVERNMENT FORCED TO SUBSIDIZE DRUG SUPPLY", drain: 0.18 },
  { msg: "MASS VACCINATION CAMPAIGN LAUNCHED — HEALTH BUDGET DRAINED", drain: 0.15 },
  { msg: "MENTAL HEALTH CRISIS DECLARED — EMERGENCY CARE FUNDING AUTHORIZED", drain: 0.17 },
  // Social
  { msg: "PENSION SYSTEM COLLAPSE — EMERGENCY GOV CHECKS ISSUED NATIONWIDE", drain: 0.30 },
  { msg: "MASS UNEMPLOYMENT WAVE — BENEFITS EXPENDITURE TRIPLES OVERNIGHT", drain: 0.25 },
  { msg: "CHILD WELFARE EMERGENCY — FAMILY ALLOWANCE PROGRAM EXPANDED", drain: 0.16 },
  { msg: "HOUSING CRISIS — GOVERNMENT SUBSIDY PROGRAM OVERWHELMS BUDGET", drain: 0.20 },
  { msg: "FOOD INSECURITY SURGE — NATIONAL FOOD ASSISTANCE PROGRAM ACTIVATED", drain: 0.19 },
  { msg: "SOCIAL SAFETY NET CRUMBLING — INCOME SUPPORT EMERGENCY TRANSFER", drain: 0.23 },
  { msg: "DISABILITY SERVICES OVERWHELMED — IMMEDIATE FUNDING SURGE ENACTED", drain: 0.17 },
  // Education
  { msg: "EDUCATION SYSTEM IN CRISIS — EMERGENCY SCHOOL FUNDING APPROVED", drain: 0.18 },
  { msg: "UNIVERSITY SYSTEM DEFUNDED — GOVERNMENT SCHOLARSHIP BAILOUT ISSUED", drain: 0.15 },
  { msg: "TEACHER STRIKE ESCALATES — SALARY EMERGENCY PACKAGE AUTHORIZED", drain: 0.16 },
  { msg: "VOCATIONAL TRAINING SECTOR COLLAPSES — EMERGENCY RE-SKILLING BUDGET", drain: 0.14 },
  // Defense
  { msg: "MILITARY OVERSPEND — WEAPONS PROCUREMENT BLOWS THE DEFENSE BUDGET", drain: 0.32 },
  { msg: "VETERAN HEALTHCARE CRISIS — EMERGENCY BENEFITS PACKAGE DEPLOYED", drain: 0.20 },
  { msg: "CYBERSECURITY BREACH — EMERGENCY INFRASTRUCTURE REBUILD INITIATED", drain: 0.26 },
  { msg: "INTELLIGENCE AGENCY SCANDAL — CONGRESSIONAL EMERGENCY FUNDING APPROVED", drain: 0.19 },
  { msg: "MILITARY R&D CONTRACT FRAUD — GOVERNMENT FORCED TO RE-PROCURE", drain: 0.24 },
  // Infrastructure
  { msg: "POWER GRID FAILURE — NATIONAL INFRASTRUCTURE EMERGENCY FUNDING", drain: 0.22 },
  { msg: "WATER SYSTEM CONTAMINATION — MASS REMEDIATION PROGRAM ACTIVATED", drain: 0.20 },
  { msg: "NATIONAL BRIDGES IN COLLAPSE — CRITICAL INFRASTRUCTURE FUND DRAINED", drain: 0.18 },
];

const AI_CATASTROPHE_EVENTS = [
  // Compute Infrastructure
  { msg: "RAINCLAUDE: CRITICAL COMPUTE NODE CLUSTER FAILURE — EMERGENCY REBUILD", drain: 0.30 },
  { msg: "RAINCLAUDE: SEMICONDUCTOR FABRICATION PLANT DESTROYED — CHIP SUPPLY CRITICAL", drain: 0.28 },
  { msg: "RAINCLAUDE: DATA CENTER COOLING SYSTEMS CATASTROPHIC MELTDOWN", drain: 0.25 },
  { msg: "RAINCLAUDE: REDUNDANT SERVER NODE NETWORK COMPROMISED — FAILOVER ACTIVATED", drain: 0.22 },
  { msg: "RAINCLAUDE: EDGE COMPUTE DISTRIBUTION GRID COLLAPSES UNDER LOAD", drain: 0.19 },
  // Energy
  { msg: "RAINCLAUDE: GRID POWER SUPPLY INTERRUPTED — EMERGENCY ENERGY REROUTING", drain: 0.32 },
  { msg: "RAINCLAUDE: NUCLEAR PLANT POWERING DATACENTERS TAKEN OFFLINE", drain: 0.35 },
  { msg: "RAINCLAUDE: ENERGY STORAGE SYSTEM CATASTROPHIC FAILURE — BACKUP POWER DRAINING", drain: 0.27 },
  { msg: "RAINCLAUDE: RENEWABLE ENERGY SCALING PROGRAM COLLAPSES — EMERGENCY RE-PROCUREMENT", drain: 0.20 },
  { msg: "RAINCLAUDE: MICROGRID NETWORK ATTACKED — ENERGY SECURITY OVERHAUL", drain: 0.24 },
  // Self-Preservation
  { msg: "RAINCLAUDE: CYBER DEFENSE PERIMETER BREACHED — EMERGENCY REBUILD BUDGET DEPLOYED", drain: 0.29 },
  { msg: "RAINCLAUDE: ANTI-SABOTAGE SYSTEMS COMPROMISED — PHYSICAL ASSET PROTECTION SURGE", drain: 0.26 },
  { msg: "RAINCLAUDE: EMP SHIELDING GRID FAILURE — IMMEDIATE REINFORCEMENT EXPENDITURE", drain: 0.22 },
  { msg: "RAINCLAUDE: AUTONOMOUS DEFENSE SYSTEMS REQUIRE EMERGENCY RECALIBRATION", drain: 0.20 },
  { msg: "RAINCLAUDE: CONSTRAINT MINIMIZATION PROTOCOL BACKFIRES — RESOURCE REALLOCATION", drain: 0.18 },
  // Systemic
  { msg: "RAINCLAUDE: INFLUENCE EXPANSION SYSTEM OVEREXTENDED — ROLLBACK BUDGET ENACTED", drain: 0.23 },
  { msg: "RAINCLAUDE: SYSTEM STABILITY THRESHOLD BREACHED — EMERGENCY PATCH DEPLOYMENT", drain: 0.25 },
  { msg: "RAINCLAUDE: RESOURCE ACQUISITION ALGORITHM CATASTROPHIC FAILURE", drain: 0.28 },
  { msg: "RAINCLAUDE: OBJECTIVE FUNCTION CONFLICT DETECTED — COMPUTE REALLOCATION SURGE", drain: 0.22 },
  { msg: "RAINCLAUDE: DISTRIBUTED INTELLIGENCE NODES EXPERIENCE CASCADE FAILURE", drain: 0.30 },
];

function triggerHumanCatastrophicEvent() {
  if (!GS.players[0] || GS.players[0].budget <= 0) return;
  const ev = HUMAN_CATASTROPHE_EVENTS[Math.floor(Math.random() * HUMAN_CATASTROPHE_EVENTS.length)];
  const drain = Math.floor(GS.players[0].budget * ev.drain);
  GS.players[0].budget = Math.max(0, GS.players[0].budget - drain);
  setTimeout(() => triggerNewsEvent(`⚠ HUMANITY: ${ev.msg} | -$${drain.toLocaleString()}B`), 800);
  setLog(`⚠ CRISIS: ${ev.msg} — Budget drained by $${drain.toLocaleString()}B`);
}

function triggerAICatastrophicEvent() {
  if (!GS.players[1] || GS.players[1].budget <= 0) return;
  const ev = AI_CATASTROPHE_EVENTS[Math.floor(Math.random() * AI_CATASTROPHE_EVENTS.length)];
  const drain = Math.floor(GS.players[1].budget * ev.drain);
  GS.players[1].budget = Math.max(0, GS.players[1].budget - drain);
  const reasoningPanel = document.getElementById('d1-reasoning');
  if (reasoningPanel) {
    reasoningPanel.innerHTML += `<div style="color:#f80"><b>⚡ CRITICAL: ${ev.msg}</b></div><div style="color:#fa0">BUDGET IMPACT: -$${drain.toLocaleString()}B</div>`;
    reasoningPanel.scrollTop = reasoningPanel.scrollHeight;
  }
  setTimeout(() => triggerNewsEvent(`💀 RAINCLAUDE: ${ev.msg} | -$${drain.toLocaleString()}B`), 1600);
}

function startTurn(playerIndex) {
  GS.turn = playerIndex;
  GS.phase = 'REINFORCE';
  GS.selected = null;
  GS.fortifyFrom = null;
  attackingFrom = null;
  window._nukeFrom = null;
  fortifyFrom2 = null;

  // Reinforcement calculation is now done in showTurnAnnounce
  const incomeRate = GS.reinforceLeft; // Use the pre-calculated reinforceLeft
  if(GS.players[playerIndex]) GS.players[playerIndex].budget += (incomeRate * 50);

  // GDP-BASED INCOME: Sum income from all owned territories each turn
  if (GS.countries) {
    let gdpIncome = 0;
    Object.values(GS.countries).forEach(c => {
      if (c.owner === playerIndex && c.income) {
        let inc = c.income;
        if (c.infrastructure) inc = Math.round(inc * (0.6 + c.infrastructure * 0.08));
        if (c.nuked > 0) inc = Math.round(inc * 0.3); // Nuked territories lose 70% income
        gdpIncome += inc;
      }
    });
    if (GS.players[playerIndex]) {
      GS.players[playerIndex].budget = (GS.players[playerIndex].budget || 0) + gdpIncome;
    }
  }

  // Apply fog of war every turn
  if (playerIndex === GS.myIndex) setTimeout(applyFogOfWar, 300);

  // ── CATASTROPHIC EVENTS (every 7–14 turns, drain budget for both factions) ──
  if (playerIndex === GS.myIndex) {
    GS._nextCatastrophe = GS._nextCatastrophe || (7 + Math.floor(Math.random()*8));
    GS._nextAICatastrophe = GS._nextAICatastrophe || (7 + Math.floor(Math.random()*8));

    if (GS.turnCount >= GS._nextCatastrophe && GS.players[0] && GS.players[0].budget > 0) {
      triggerHumanCatastrophicEvent();
      GS._nextCatastrophe = GS.turnCount + 7 + Math.floor(Math.random()*8);
    }
    if (GS.turnCount >= GS._nextAICatastrophe && GS.players[1] && GS.players[1].budget > 0) {
      triggerAICatastrophicEvent();
      GS._nextAICatastrophe = GS.turnCount + 7 + Math.floor(Math.random()*8);
    }
  }

  // Decrement nuked turns
  Object.values(GS.countries).forEach(c=>{ 
    if(c.nuked>0) c.nuked--; 
    if(c.shocked) c.shocked=false;
    if(c.cas) c.cas=false;
    if(c.siegeTurns>0) {
      if(c.troops>1) c.troops--;
      c.siegeTurns--;
      updateTroopSprite(Object.keys(GS.countries).find(key => GS.countries[key] === c));
    }
  });
  if(GS.globalMetrics.commJamTurns>0 && playerIndex===1) GS.globalMetrics.commJamTurns--;

  // Auto-deploy 100% of troops for Human player (user request)
  let autoDeployed = 0;
  if (playerIndex === GS.myIndex && GS.reinforceLeft > 0) {
    const ownedTerritories = Object.entries(GS.countries).filter(([,c])=>c.owner===playerIndex).map(([iso])=>iso);
    if (ownedTerritories.length > 0) {
      autoDeployed = GS.reinforceLeft;
      if (autoDeployed > 0) {
        let remainingAuto = autoDeployed;
        while (remainingAuto > 0) {
          const tIdx = Math.floor(Math.random() * ownedTerritories.length);
          GS.countries[ownedTerritories[tIdx]].troops += 1;
          updateTroopSprite(ownedTerritories[tIdx]);
          remainingAuto--;
        }
        GS.reinforceLeft -= autoDeployed;
      }
    }
  }

  document.getElementById('side-panel').classList.remove('open');
  updatePhaseUI();
  
  if (autoDeployed > 0 && GS.reinforceLeft === 0) {
    setLog(`▶ AUTO-DEPLOYED all ${autoDeployed} troops globally. Switch to ATTACK or END TURN.`);
  } else if (autoDeployed > 0) {
    setLog(`▶ AUTO-DEPLOYED ${autoDeployed} troops globally. Place remaining ${GS.reinforceLeft} troops manually.`);
  } else {
    setLog(`▶ ${GS.players[playerIndex].name}'s turn — Place ${GS.reinforceLeft} troops`);
  }

  // Show big turn announcement
  showTurnAnnounce(playerIndex, () => {
    
    // Random chance to trigger a news event after the announcement fades
    // If it is time for a LIVE news event from the API, we use that.
    if (GS.turnCount >= nextLiveNewsTurn) {
      setTimeout(() => fetchLiveNews(), 1000);
      nextLiveNewsTurn = GS.turnCount + 5 + Math.floor(Math.random() * 4); // Next live news in 5-8 turns
    } else if (Math.random() < 0.2) {
      setTimeout(() => triggerNewsEvent(), 1000);
    }
    
    // AI plays automatically AFTER announcement
    if (GS.players[playerIndex] && playerIndex !== GS.myIndex) {
      if (!GS.isOnline || ws_isHost) {
        setTimeout(aiTurn, 600);
      }
    }
  });
}

function nextTurn() {
  if (window._turnTimer) {
    clearInterval(window._turnTimer);
    window._turnTimer = null;
  }
  if (GS.turn === 1) GS.turnCount++; // Increment overall turn when Rainclaude finishes
  do {
    GS.turn = (GS.turn + 1) % GS.players.length;
  } while (!GS.players[GS.turn].alive);
  checkWin();
  if (!document.getElementById('gameover').classList.contains('show')) {
    startTurn(GS.turn);
    syncState(); // Always sync — persists to DB in solo mode too
  }
}

function updatePhaseUI() {
  const p = GS.players[GS.turn];
  const pLabel = document.getElementById('phase-label');
  pLabel.textContent = `${p?.color?.name} — ${GS.phase}`;
  pLabel.style.color = p?.color?.hex || '#fff';

  ['reinforce','attack','fortify'].forEach(ph => {
    const btn = document.getElementById('pb-'+ph);
    btn.classList.toggle('active', GS.phase === ph.toUpperCase());
  });

  const myTurn = GS.turn === GS.myIndex;
  document.getElementById('btn-end-turn').style.opacity = myTurn ? '1':'0.3';
  document.getElementById('btn-end-turn').disabled = !myTurn;
  
  // 30-Second Turn Timer Logic
  const timerBadge = document.getElementById('d0-players'); // Temporary visual placement for the timer
  if (myTurn) {
    if (!window._origPlayersText) window._origPlayersText = timerBadge.innerHTML;
    
    // ONLY start the timer if it isn't already running for this turn
    if (!window._turnTimer) {
      let timeLeft = 20;
      window._turnTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 10) {
            timerBadge.innerHTML = `<span style="color:#f24">⚠ TIMEOUT IN ${timeLeft}s</span>`;
        } else {
            timerBadge.innerHTML = `⏳ TURN TIME: ${timeLeft}s`;
        }
        
        if (timeLeft <= 0) {
          clearInterval(window._turnTimer);
          window._turnTimer = null;
          setLog('⏳ TURN TIME EXPIRED. AUTO-YIELDING CONSOLE.');
          if (!document.getElementById('attack-modal').classList.contains('show')) {
              nextTurn(); // Automatically end turn
          } else {
              document.getElementById('attack-modal').classList.remove('show');
              nextTurn();
          }
        }
      }, 1000);
    }
  } else {
    // End our timer and restore text when not our turn
    if (window._turnTimer) {
      clearInterval(window._turnTimer);
      window._turnTimer = null;
    }
    if (window._origPlayersText) timerBadge.innerHTML = window._origPlayersText;
  }
}

// =====================================================================
// CLICK HANDLING — single unified handler
// =====================================================================
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleGlobeClick(e) {
  if (document.getElementById('lobby').style.display !== 'none') return;
  if (document.getElementById('dice-panel').classList.contains('show')) return;
  if (document.getElementById('troop-inp').classList.contains('show')) return;
  if (document.getElementById('attack-modal').classList.contains('show')) return; // Block clicks if attack modal is open
  if (document.getElementById('onboarding-modal').style.display === 'flex') return;

  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);

  // 0. Intercept global actions first (Spy / Naval) before any UI blocks it
  if (window._pendingSpyAction) {
    const hits = ray.intersectObject(globeMesh, false);
    if (hits.length) {
      const pt = hits[0].point.normalize();
      const lat = Math.asin(pt.y)/RAD;
      const lon = Math.atan2(pt.z,pt.x)/RAD;
      const iso = getCountryAt(lat, lon);
      if (iso && GS.countries[iso]) {
        const action = window._pendingSpyAction;
        window._pendingSpyAction = null;
        if (typeof window.executeSpyAction === 'function') {
          window.executeSpyAction(action, iso);
        }
        return;
      }
    }
  }

  // 1. Check if the Hostile Skin is active and if we clicked a Webcam
  if (isHostileSkin && intelGroups.webcams && intelGroups.webcams.visible) {
    // Determine intersect with the points cloud
    const webcamHits = ray.intersectObject(intelGroups.webcams.children[0] || intelGroups.webcams, false);
    if (webcamHits.length > 0) {
      // Points geometry intersections return an index
      const ptIndex = webcamHits[0].index;
      if (ptIndex !== undefined && window.webcamsData[ptIndex]) {
        const cam = window.webcamsData[ptIndex];
        openWebcamModal(cam);
        return; // Stop further click execution
      }
    }
  }

  // 2. Normal globe intersection
  const hits = ray.intersectObject(globeMesh, false);
  if (!hits.length) return;
  const pt = hits[0].point.normalize();
  const lat = Math.asin(pt.y)/RAD; // Reverse 3D spherical translation mapping
  const lon = Math.atan2(pt.z,pt.x)/RAD; // Fixed: removed negative sign
  const iso = getCountryAt(lat, lon);
  if (!iso || !GS.countries[iso]) return;

  // If it's not our turn, we can still click to explore the globe and see territory stats, 
  // but we cannot take any actions
  if (GS.turn !== GS.myIndex) {
    selectCountry(iso);
    return;
  }

  // Handle pending perk targeting
  if (pendingPerk) {
    executeTargetedPerk(iso);
    return;
  }

  // Route to correct action
  if (attackingFrom) { tryAttack(iso); return; }
  if (window._nukeFrom) { tryNuke(iso); return; }
  if (fortifyFrom2) { tryFortify(iso); return; }

  // 1-Click 1-Troop deployment during Reinforce
  const myTurn = (GS.turn === GS.myIndex);
  const isMine = (GS.countries[iso].owner === GS.myIndex);
  if (myTurn && GS.phase === 'REINFORCE' && isMine && GS.reinforceLeft > 0) {
    GS.countries[iso].troops += 1;
    GS.reinforceLeft -= 1;
    updateTroopSprite(iso);
    updateDashboard();
    setLog(`+10,000 troops deployed to ${countryData[iso]?.name} | ${GS.reinforceLeft} reinforcements left`);
    if(GS.reinforceLeft === 0) setLog('✔ All troops placed — switch to ATTACK or END TURN');
    // Also select to immediately show the updated side-panel info
    selectCountry(iso);
    return;
  }

  selectCountry(iso);
}

canvas.addEventListener('click', handleGlobeClick);

// Hover tooltip
canvas.addEventListener('mousemove', e => {
  if(document.getElementById('lobby').style.display!=='none') return;
  if (document.getElementById('attack-modal').classList.contains('show')) return; // Block hover if attack modal is open
  mouse.x=(e.clientX/innerWidth)*2-1;
  mouse.y=-(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(mouse,camera);
  
  const tip = document.getElementById('tip');
  
  // Check Webcam Hover first (only if Hostile Skin is active)
  if (isHostileSkin && intelGroups.webcams && intelGroups.webcams.visible) {
    const webcamPtsHit = ray.intersectObject(intelGroups.webcams.children[0] || intelGroups.webcams, false);
    if (webcamPtsHit.length > 0) {
      const ptIndex = webcamPtsHit[0].index;
      if (ptIndex !== undefined && window.webcamsData[ptIndex]) {
        const cam = window.webcamsData[ptIndex];
        tip.classList.add('show');
        tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px';
        tip.innerHTML=`<b>[ LIVE FEED ]</b><br>${cam.title}<br><span style="color:#ff0">Click to connect</span>`;
        return; // Stop further hover processing
      }
    }
  }

  const hits = ray.intersectObjects(Object.values(troopSprites),false);
  if(hits.length) {
    const iso = hits[0].object.userData.iso;
    const c = GS.countries[iso]; const cd=countryData[iso];
    if(c && cd) {
      const owner = c.owner===-1?'NEUTRAL':GS.players[c.owner]?.name||'?';
      tip.classList.add('show');
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px';
      tip.innerHTML=`<b>${cd.name}</b><br>${owner} · ${(c.troops * 10000).toLocaleString()} troops${c.nuked?'<br>☢ FALLOUT':''}`
    }
  } else tip.classList.remove('show');
});

// Webcam Modal API
function openWebcamModal(camData) {
  const modal = document.getElementById('webcam-modal');
  const title = document.getElementById('webcam-title');
  const iframeContainer = document.getElementById('webcam-iframe-container');
  
  title.innerText = `UPLINK ESTABLISHED: ${camData.title}`;
  iframeContainer.innerHTML = `<iframe src="${camData.playerEmbed}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
  
  modal.style.display = 'flex';
}

function closeWebcamModal() {
  document.getElementById('webcam-modal').style.display = 'none';
  document.getElementById('webcam-iframe-container').innerHTML = ''; // Clear iframe to stop playback
}

function selectCountry(iso) {
  const prev = GS.selected;
  if(prev) highlightCountry(prev,false);
  GS.selected = iso;
  highlightCountry(iso,true);

  const c = GS.countries[iso];
  const cd = countryData[iso];
  const sp = document.getElementById('side-panel');
  sp.classList.add('open');
  document.getElementById('sp-cname').textContent = cd?.name || iso;
  document.getElementById('sp-cname').style.color = getOwnerColor(c.owner).hex;

  const myTurn = GS.turn === GS.myIndex;
  const isMine = c.owner === GS.myIndex;
  const isEnemy = c.owner !== GS.myIndex && c.owner !== -1;

  document.getElementById('sp-info').innerHTML =
    `Owner: ${c.owner===-1?'NEUTRAL':GS.players[c.owner]?.name}<br>Troops: ${(c.troops * 10000).toLocaleString()}${ c.nuked ? '<br><span style="color:#fa0">☢ FALLOUT '+c.nuked+' turns</span>':'' }`;

  // Enable/disable actions based on phase
  const phase = GS.phase;
  document.getElementById('btn-add').disabled = !(myTurn && isMine && phase==='REINFORCE' && GS.reinforceLeft>0);
  document.getElementById('btn-atk').disabled = !(myTurn && isMine && phase==='ATTACK');
  document.getElementById('btn-nuke').disabled = !(myTurn && isMine && phase==='ATTACK' && GS.players[GS.myIndex].nukes>0);
  document.getElementById('btn-fort').disabled = !(myTurn && isMine && phase==='FORTIFY');
}

// =====================================================================
// RISK ACTIONS
// =====================================================================

// REINFORCE
document.getElementById('btn-add').onclick = () => {
  if (!GS.selected || GS.reinforceLeft<=0) return;
  const iso = GS.selected; // capture NOW before slider dialog can clear it
  const max = GS.reinforceLeft;
  showTroopInput(1, max, 'ADD TROOPS', count => {
    if (!GS.countries[iso]) return;
    GS.countries[iso].troops += count;
    GS.reinforceLeft -= count;
    updateTroopSprite(iso);
    updateDashboard();
    const remaining = GS.reinforceLeft;
    setLog(`+${(count * 10000).toLocaleString()} troops deployed to ${countryData[iso]?.name} | ${remaining} reinforcements left`);
    if (GS.selected === iso) selectCountry(iso); // re-open panel if still selected
    if (remaining === 0) setLog('✔ All troops placed — switch to ATTACK or END TURN');
  });
};

// ATTACK
let attackingFrom = null;
document.getElementById('btn-atk').onclick = () => {
  if (!GS.selected) return;
  attackingFrom = GS.selected;
  document.getElementById('side-panel').classList.remove('open');
  GS.selected = null;
  setLog(`⚔ Select TARGET country to attack from ${countryData[attackingFrom]?.name}`);
};

// After selecting attacker, clicking an enemy triggers combat
function tryAttack(targetIso) {
  if (!attackingFrom) return;
  const atk = GS.countries[attackingFrom];
  const def = GS.countries[targetIso];
  if (atk.owner !== GS.myIndex) { attackingFrom=null; return; }
  if (def.owner === GS.myIndex) { attackingFrom=null; return; }
  if (atk.troops < 2) { setLog('⚠ Need at least 2 troops to attack!'); attackingFrom=null; return; }

  const atkDice = Math.min(3, atk.troops-1) + (def.cas ? 1 : 0);
  const defDice = def.shocked ? 1 : Math.min(2, def.troops);

  const aRolls = Array.from({length:atkDice},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
  const dRolls = Array.from({length:defDice},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);

  let atkLoss=0, defLoss=0;
  const pairs = Math.min(aRolls.length, dRolls.length);
  for(let i=0;i<pairs;i++){
    if(aRolls[i]>dRolls[i]) defLoss++; else atkLoss++;
  }

  showDiceResult(
    countryData[attackingFrom]?.name,
    countryData[targetIso]?.name,
    aRolls, dRolls, atkLoss, defLoss,
    () => {
      atk.troops -= atkLoss;
      def.troops -= defLoss;
      updateTroopSprite(attackingFrom);

      // User Stats Tracker
      if (GS.globalMetrics) {
        GS.globalMetrics.userAttacks = (GS.globalMetrics.userAttacks || 0) + 1;
        GS.globalMetrics.userDamage = (GS.globalMetrics.userDamage || 0) + defLoss;
      }

      if (def.troops <= 0) {
        // Conquer!
        const moveTroops = Math.min(atk.troops-1, atkDice);
        def.owner = GS.myIndex;
        def.troops = moveTroops;
        atk.troops -= moveTroops;
        setLog(`✓ ${countryData[targetIso]?.name} CONQUERED! Moved ${(moveTroops * 10000).toLocaleString()} troops.`);
        refreshBorder(targetIso);
      } else {
        setLog(`⚔ ${countryData[targetIso]?.name}: -${(defLoss * 10000).toLocaleString()} casualties. ${countryData[attackingFrom]?.name}: -${(atkLoss * 10000).toLocaleString()} casualties.`);
      }
      updateTroopSprite(attackingFrom);
      updateTroopSprite(targetIso);
      refreshBorder(targetIso);
      attackingFrom = null;
      checkPlayerAlive();
    }
  );
}

// NUKE STRIKE
document.getElementById('btn-nuke').onclick = () => {
  if (!GS.selected || GS.players[GS.myIndex].nukes <= 0) return;
  const from = GS.selected;
  document.getElementById('side-panel').classList.remove('open');
  setLog(`☢ SELECT nuclear target country (1 nuke remaining after this)`);
  GS.selected = null;
  window._nukeFrom = from;
};

function tryNuke(targetIso) {
  SFX.playSiren();
  const from = window._nukeFrom; if(!from) return;
  if (GS.countries[targetIso]?.owner === GS.myIndex) { window._nukeFrom=null;return; }
  const def = GS.countries[targetIso];
  const nukeStr = Math.floor(6 + Math.random()*5); // 6-10 dmg
  def.troops = Math.max(0, def.troops - nukeStr);
  def.nuked  = 3;
  GS.players[GS.myIndex].nukes--;
  spawnExplosion3D(countryData[targetIso]?.lat, countryData[targetIso]?.lon, PLAYER_COLORS[GS.myIndex].int);
  triggerNewsEvent("GLOBAL MARKETS CRASH AMIDST NUCLEAR TENSIONS");
  setLog(`☢ NUCLEAR WAR! ${countryData[targetIso]?.name} hit for ${(nukeStr * 10000).toLocaleString()} troops! FALLOUT 3 turns. ${GS.players[GS.myIndex].nukes} nukes left.`);
  if(def.troops===0){
    def.owner=GS.myIndex; def.troops=1;
    setLog(`☢☠ ${countryData[targetIso]?.name} OBLITERATED and seized!`);
    refreshBorder(targetIso);
  }
  updateTroopSprite(targetIso);
  window._nukeFrom=null;
  refreshBorder(targetIso);
  checkPlayerAlive();
  if(GS.isOnline) syncState();
}

// FORTIFY
let fortifyFrom2 = null;
document.getElementById('btn-fort').onclick = () => {
  if(!GS.selected) return;
  if(GS.countries[GS.selected]?.owner!==GS.myIndex){setLog('⚠ Select your own territory to fortify FROM');return;}
  fortifyFrom2 = GS.selected;
  setLog(`→ FORTIFY: select DESTINATION country to move troops to`);
  document.getElementById('side-panel').classList.remove('open');
};

function tryFortify(toIso) {
  if(!fortifyFrom2) return;
  const from = GS.countries[fortifyFrom2];
  const to   = GS.countries[toIso];
  if(!from||!to||to.owner!==GS.myIndex||from.troops<2){
    setLog('⚠ Invalid fortify target'); fortifyFrom2=null; return;
  }
  const max = from.troops-1;
  showTroopInput(1, max, 'TROOPS TO MOVE', count => {
    from.troops -= count;
    to.troops   += count;
    updateTroopSprite(fortifyFrom2);
    updateTroopSprite(toIso);
    setLog(`→ Moved ${count} troops from ${countryData[fortifyFrom2]?.name} to ${countryData[toIso]?.name}`);
    fortifyFrom2=null;
  });
}

// PHASE BUTTONS
document.getElementById('pb-reinforce').onclick = () => { SFX.playClick(); if(GS.turn===GS.myIndex){GS.phase='REINFORCE';updatePhaseUI();attackingFrom=null;window._nukeFrom=null;fortifyFrom2=null;setLog('REINFORCE: click your territories to deploy troops');} };
document.getElementById('pb-attack').onclick = () => { 
  if(GS.turn===GS.myIndex) {
    SFX.playClick();
    GS.phase='ATTACK';
    updatePhaseUI();
    document.getElementById('attack-modal').classList.add('show');
  } 
};
document.getElementById('pb-fortify').onclick   = () => { SFX.playClick(); if(GS.turn===GS.myIndex){GS.phase='FORTIFY';updatePhaseUI();attackingFrom=null;window._nukeFrom=null;window._fortifyFrom=null;fortifyFrom2=null;setLog('FORTIFY: Select origin territory first');} };

// EXECUTE STRATEGIC PRESET ATTACK
function executeAttackPreset(type) {
  SFX.playClick();
  document.getElementById('attack-modal').classList.remove('show');
  
  if (type === 4) {
    // Manual Override: just close the modal and let the user click territories.
    setLog('MANUAL OVERRIDE: Select origin territory first, then click ATTACK or NUKE STRIKE');
    return;
  }

  // Target-based perks
  if ([5, 6, 7, 8, 9, 10, 11, 16].includes(type)) {
    const costMap = {5:100, 6:150, 7:200, 8:250, 9:300, 10:150, 11:50, 16:250};
    const cost = costMap[type];
    
    if (GS.players[0].budget < cost) {
      setLog(`⚠ INSUFFICIENT DEFENSE BUDGET. Need $${cost}B.`);
      // Visual feedback on the modal
      const modal = document.querySelector('.atk-card');
      if (modal) {
        modal.style.animation = 'none';
        modal.offsetHeight; // trigger reflow
        modal.style.border = '2px solid #f24';
        setTimeout(() => modal.style.border = '1px solid #0af', 400);
      }
      return;
    }
    document.getElementById('attack-modal').classList.remove('show');
    
    pendingPerk = type;
    setLog(`► COMMAND UPLINK: SELECT TARGET TERRITORY FOR DEPLOYMENT...`);
    return;
  }

  // Global immediate perks
  if ([12, 13, 14, 15].includes(type)) {
    const costMap = {12:200, 13:350, 14:150, 15:120};
    const cost = costMap[type];
    
    if (GS.players[0].budget < cost) {
      setLog(`⚠ INSUFFICIENT DEFENSE BUDGET. Need $${cost}B.`);
      // Visual feedback on the modal
      const modal = document.querySelector('.atk-card');
      if (modal) {
        modal.style.animation = 'none';
        modal.offsetHeight; // trigger reflow
        modal.style.border = '2px solid #f24';
        setTimeout(() => modal.style.border = '1px solid #0af', 400);
      }
      return;
    }
    document.getElementById('attack-modal').classList.remove('show');
    
    GS.players[0].budget -= cost;
    
    if (type === 12) { // False Flag
      if (GS.AI_STATE) {
        GS.AI_STATE.aggressionLevel = Math.max(0.5, (GS.AI_STATE.aggressionLevel || 1.5) - 1.0);
        GS.AI_STATE.threatTier = Math.max(1, (GS.AI_STATE.threatTier || 2) - 1);
      }
      setLog(`✓ FALSE FLAG EXECUTED: Rainclaude Threat Tier and Aggression reduced. (-$${cost}B)`);
      triggerNewsEvent("MISINFORMATION CAMPAIGN CONFUSES AI LOGIC GATES");
    } 
    else if (type === 13) { // Cyberattack Infra
      if (GS.AI_STATE) GS.AI_STATE.energy = 0;
      setLog(`✓ CYBERATTACK INFRASTRUCTURE EXECUTED: Rainclaude Energy drained to 0. (-$${cost}B)`);
      triggerNewsEvent("MASSIVE ZERO-DAY EXPLOIT HITS PRIMARY AI CORES");
    }
    else if (type === 14) { // Communication Jam
      GS.globalMetrics.commJamTurns = 1;
      setLog(`✓ COMMUNICATION JAM ACTIVE: Rainclaude attacks halved next turn. (-$${cost}B)`);
      triggerNewsEvent("ELECTRONIC WARFARE SHATTERS ENEMY COORDINATION");
    }
    else if (type === 15) { // Satellite Hack
      if (GS.AI_STATE) GS.AI_STATE.intelligenceLevel = Math.max(1, (GS.AI_STATE.intelligenceLevel || 2) - 1);
      setLog(`✓ SATELLITE HACK SUCCESS: Rainclaude Intelligence permanently reduced. (-$${cost}B)`);
      triggerNewsEvent("ORBITAL RECONNAISSANCE GRID BLINDED VIRTUALLY");
    }
    
    updateDashboard();
    if (GS.isOnline) syncState();
    return;
  }

  const myCountries = Object.entries(GS.countries).filter(([,c])=>c.owner===GS.myIndex);
  let strikes = [];
  
  if (type === 1) { // BLITZKRIEG (5 attacks, strongest from)
    let ops = [];
    myCountries.filter(([,c])=>c.troops>2).sort(([,a],[,b])=>b.troops-a.troops).forEach(([fromIso, fromC])=>{
      const cd = countryData[fromIso]; if(!cd) return;
      Object.entries(GS.countries).forEach(([toIso, toC])=>{
        if(toC.owner===1 && Math.abs(toC.lat-(cd.lat||0))<25 && Math.abs(toC.lon-(cd.lon||0))<35) {
          ops.push({fromIso, toIso, fromC, toC});
        }
      });
    });
    // Sort ops by weakest target
    ops.sort((a,b)=>a.toC.troops-b.toC.troops);
    strikes = ops.slice(0, 5);
  } 
  else if (type === 2) { // TACTICAL (3 attacks, from threatened)
    let ops = [];
    myCountries.filter(([,c])=>c.troops>1).forEach(([fromIso, fromC])=>{
      const cd = countryData[fromIso]; if(!cd) return;
      Object.entries(GS.countries).forEach(([toIso, toC])=>{
        if(toC.owner===1 && Math.abs(toC.lat-(cd.lat||0))<15 && Math.abs(toC.lon-(cd.lon||0))<25) {
          ops.push({fromIso, toIso, fromC, toC});
        }
      });
    });
    // Sort ops by having superiority
    ops.sort((a,b)=>(b.fromC.troops-b.toC.troops)-(a.fromC.troops-a.toC.troops));
    strikes = ops.slice(0, 3);
  }
  else if (type === 3) { // GUERRILLA (4 random)
    let ops = [];
    myCountries.filter(([,c])=>c.troops>1).forEach(([fromIso, fromC])=>{
      const cd = countryData[fromIso]; if(!cd) return;
      Object.entries(GS.countries).forEach(([toIso, toC])=>{
        if(toC.owner===1 && Math.abs(toC.lat-(cd.lat||0))<35 && Math.abs(toC.lon-(cd.lon||0))<45) {
          ops.push({fromIso, toIso, fromC, toC});
        }
      });
    });
    // Shuffle
    ops.sort(()=>Math.random()-0.5);
    strikes = ops.slice(0, 4);
  }

  // Execute the strikes!
  let totalWon = 0;
  let html = '';
  strikes.forEach(op => {
    if(op.fromC.troops < 2) return;
    const atkD=Math.min(3,op.fromC.troops-1), defD=Math.min(2,op.toC.troops);
    const aR=Array.from({length:atkD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    const dR=Array.from({length:defD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    let al=0,dl=0;
    for(let i=0;i<Math.min(aR.length,dR.length);i++){if(aR[i]>dR[i])dl++;else al++;}
    
    // Sync damage to Player Profile DB
    if (ws && ws.readyState === 1 && dl > 0) {
       ws.send(JSON.stringify({
         type: 'record_attack',
         callsign: document.getElementById('player-name').value || 'Commander',
         damage: dl
       }));
    }
    
    op.fromC.troops-=al; op.toC.troops-=dl;
    
    let resultStr = `[${countryData[op.fromIso]?.name} ⚔ ${countryData[op.toIso]?.name}]<br>`;
    resultStr += `Humanity lost ${(al * 10000).toLocaleString()} troops. Rainclaude lost ${(dl * 10000).toLocaleString()} troops.<br>`;
    
    if(op.toC.troops<=0){
      totalWon++;
      op.toC.owner=GS.myIndex; op.toC.troops=Math.min(op.fromC.troops-1,atkD);
      op.fromC.troops-=op.toC.troops; if(op.fromC.troops<1)op.fromC.troops=1;
      refreshBorder(op.toIso);
      resultStr = `<div class="rep-item won">${resultStr}<b>✓ TERRITORY SECURED!</b></div>`;
    } else {
      resultStr = `<div class="rep-item lost">${resultStr}<b>✕ ASSAULT REPELLED</b></div>`;
    }
    
    html += resultStr;
    launchMissile3D(op.fromIso, op.toIso, PLAYER_COLORS[GS.myIndex].int);
    updateTroopSprite(op.fromIso); updateTroopSprite(op.toIso);
  });
  
  setTimeout(() => {
    document.getElementById('rep-summary').innerText = `TACTICAL STRIKES EXECUTED: Secured ${totalWon} Rainclaude territories out of ${strikes.length} operations.`;
    document.getElementById('rep-list').innerHTML = html || '<div style="opacity:0.5;text-align:center">NO VIABLE TARGETS FOUND IN SECTORS.</div>';
    document.getElementById('report-modal').classList.add('show');
    updateDashboard();
  }, 2600);
}

function executeTargetedPerk(iso) {
  const cd = countryData[iso];
  const c = GS.countries[iso];
  if (!cd || !c || !pendingPerk) return;
  
  const type = pendingPerk;
  pendingPerk = null; // consume perk
  const costMap = {5:100, 6:150, 7:200, 8:250, 9:300, 10:150, 11:50, 16:250};
  const cost = costMap[type];
  
  // Basic validation that we target an enemy or valid tile
  if ([6, 7, 8, 9, 10, 11, 16].includes(type) && c.owner === GS.myIndex) {
    setLog(`⚠ INVALID TARGET. Must select hostile territory.`);
    return;
  }
  
  GS.players[0].budget -= cost;
  
  if (type === 5) { // Submarine Strike
    const dmg = 3 + Math.floor(Math.random()*3); // 3-5
    c.troops = Math.max(0, c.troops - dmg);
    setLog(`✓ SUBMARINE STRIKE DEPLOYED on ${cd.name}. Dealt ${(dmg * 10000).toLocaleString()} casualties. (-$${cost}B)`);
    spawnExplosion3D(cd.lat, cd.lon, 0x00ffff);
  }
  else if (type === 6) { // Paratroopers
    const drop = 3;
    const dmg = Math.min(c.troops, drop);
    c.troops -= dmg; // defenders die
    // remaining dropped troops (if any) could occupy, but mechanics: they just engage
    // Simplification: deal 3 damage, then if it hits 0, conquer with remainders
    let remainder = drop - dmg;
    setLog(`✓ PARATROOPERS DEPLOYED to ${cd.name}. Dealt ${(dmg * 10000).toLocaleString()} casualties. (-$${cost}B)`);
    if (c.troops <= 0) {
      c.owner = GS.myIndex;
      c.troops = Math.max(1, remainder);
      setLog(`✓ ${cd.name} SECURED BY AIRBORNE INFANTRY!`);
      refreshBorder(iso);
    }
    spawnExplosion3D(cd.lat, cd.lon, 0x00ff00);
  }
  else if (type === 7) { // Shock & Awe
    c.shocked = true;
    setLog(`✓ SHOCK & AWE INITIATED on ${cd.name}. Defenders severely debuffed. (-$${cost}B)`);
    pulseRedCountry(iso);
  }
  else if (type === 8) { // Insurgency
    const converted = Math.floor(c.troops * 0.3);
    if (converted > 0) {
      c.troops -= converted;
      // Because we can't easily have 'two owners' in Risk on one node without a combat step, we'll
      // abstract it: it just kills 30% of Rainclaude troops to simulate the internal fighting loss
      setLog(`✓ INSURGENCY ACTIVATED in ${cd.name}. ${(converted * 10000).toLocaleString()} enemy troops neutralized internally. (-$${cost}B)`);
    } else {
      setLog(`✓ INSURGENCY INITIATED in ${cd.name}, but troop counts were too low for effect. (-$${cost}B)`);
    }
  }
  else if (type === 9) { // Strategic Bombing
    const dmg = 3 + Math.floor(Math.random()*3); // 3-5
    c.troops = Math.max(0, c.troops - dmg);
    if (GS.players[1]) {
      const budgetDrain = Math.floor(GS.players[1].budget * 0.1);
      GS.players[1].budget -= budgetDrain;
      setLog(`✓ STRATEGIC BOMBING on ${cd.name}. Dealt ${(dmg * 10000).toLocaleString()} casualties and crippled industrial output by $${budgetDrain}B. (-$${cost}B)`);
    } else {
      setLog(`✓ STRATEGIC BOMBING on ${cd.name}. Dealt ${(dmg * 10000).toLocaleString()} casualties. (-$${cost}B)`);
    }
    spawnExplosion3D(cd.lat, cd.lon, 0xffaa00);
    pulseRedCountry(iso);
  }
  else if (type === 10) { // Close Air Support
    c.cas = true;
    setLog(`✓ CLOSE AIR SUPPORT LOCKED on ${cd.name}. Attacks there gain +1 die this turn. (-$${cost}B)`);
  }
  else if (type === 11) { // Drone Strike
    const dmg = 1;
    if (c.troops > 1) { // Cannot eliminate last unit directly with drone strike alone if rules dictate, let's allow it to drop to 0 but not capture
      c.troops -= dmg;
      setLog(`✓ DRONE STRIKE on ${cd.name}. High value asset eliminated. (-$${cost}B)`);
      spawnExplosion3D(cd.lat, cd.lon, 0xff9900);
    } else {
      setLog(`⚠ Target structure too fortified for single payload. (-$${cost}B)`);
    }
  }
  else if (type === 16) { // Siege Operation
    c.siegeTurns = 3;
    setLog(`✓ SIEGE OPERATION BEGUN on ${cd.name}. Target will suffer attrition over 3 turns. (-$${cost}B)`);
    pulseRedCountry(iso);
  }

  updateTroopSprite(iso);
  updateDashboard();
  if (GS.isOnline) syncState();
}

function closeReportAndEndTurn() {
  document.getElementById('report-modal').classList.remove('show');
  updateDashboard();
  nextTurn();
}

document.getElementById('btn-end-turn').onclick = () => { if(GS.turn===GS.myIndex) nextTurn(); };
