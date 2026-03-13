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

  // REALISTIC GEOPOLITICS
  const HUMAN_BLOC = ['USA', 'GBR', 'FRA', 'DEU', 'JPN', 'KOR', 'AUS', 'CAN', 'POL', 'ITA', 'ESP', 'UKR', 'ISR', 'TWN', 'NLD', 'BEL', 'SWE', 'NOR', 'FIN', 'DNK', 'GRC', 'PRT', 'CZE', 'ROU', 'CHE', 'AUT', 'NZL', 'PHL', 'CHL', 'ARG', 'COL'];
  const RAINCLAUDE_BLOC = ['RUS', 'CHN', 'IRN', 'PRK', 'SYR', 'BLR', 'VEN', 'CUB', 'MMR', 'NIC', 'ERI', 'MLI', 'BFA', 'NER', 'CAF', 'ZIM', 'SDN'];

  const EXACT_BASE_TROOPS_PER_FACTION = 50000; // Multiplied by 10k in UI: 50,000 * 10,000 = 500,000,000 troops per side

  // Collect all isos
  let allIsos = [...isos];
  // Calculate how many countries each faction should roughly get (Half of the world)
  const targetTerritoriesPerFaction = Math.floor(allIsos.length / 2); // Should be 101 each
  const troopsPerCountry = Math.floor(EXACT_BASE_TROOPS_PER_FACTION / targetTerritoriesPerFaction); // ~495 base troops

  // We assign sequentially to ensure EXACT 50/50 split
  let humanTerritoriesLeft = targetTerritoriesPerFaction;
  let rainclaudeTerritoriesLeft = targetTerritoriesPerFaction;

  // First allocate the hardcoded blocs
  allIsos.forEach(iso => {
    const stats = getCountryStat(iso);
    const income = Math.max(1, Math.round(Math.log10(stats.gdp + 1) * 3));
    
    let owner = -1;
    if (HUMAN_BLOC.includes(iso) && humanTerritoriesLeft > 0) {
      owner = 0;
      humanTerritoriesLeft--;
    } else if (RAINCLAUDE_BLOC.includes(iso) && rainclaudeTerritoriesLeft > 0) {
      owner = 1;
      rainclaudeTerritoriesLeft--;
    }

    GS.countries[iso] = {
      owner, troops: troopsPerCountry, nuked: 0,
      name: countryData[iso].name, lat: countryData[iso].lat, lon: countryData[iso].lon,
      gdp: stats.gdp, mil: stats.mil, pop: stats.pop, income,
      infrastructure: 3, airwings: 0, ships: 0,
    };
  });

  // Now allocate the remaining neutral countries alternately between Human (0) and Rainclaude (1)
  let nextAssignee = 0;
  Object.keys(GS.countries).forEach(iso => {
    if (GS.countries[iso].owner === -1) {
      if (nextAssignee === 0 && humanTerritoriesLeft > 0) {
        GS.countries[iso].owner = 0;
        humanTerritoriesLeft--;
        nextAssignee = 1;
      } else if (nextAssignee === 1 && rainclaudeTerritoriesLeft > 0) {
        GS.countries[iso].owner = 1;
        rainclaudeTerritoriesLeft--;
        nextAssignee = 0;
      } else if (humanTerritoriesLeft > 0) {
        GS.countries[iso].owner = 0;
        humanTerritoriesLeft--;
      } else if (rainclaudeTerritoriesLeft > 0) {
        GS.countries[iso].owner = 1;
        rainclaudeTerritoriesLeft--;
      } else {
        // Any leftovers go to 2 (Illuminati neutral, if odd numbering)
        GS.countries[iso].owner = 2;
      }
    }
  });

  // In this highly competitive balanced restart, we omit the 'Illuminati' completely out of the core list
  // so that Humanity and Rainclaude truly fight a pure 1v1 battle of 500 million vs 500 million.

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
// WEBCAM RENDERING (RED SKIN)
// =====================================================================
async function initWebcams() {
  try {
    const res = await fetch('/api/webcams');
    const data = await res.json();
    if (!data.result || !data.result.webcams) return;
    
    // Create a tiny yellow dot texture
    const c = document.createElement('canvas'); c.width=64; c.height=64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffff00'; // Yellow dot
    ctx.beginPath(); ctx.arc(32,32,28,0,Math.PI*2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffae00'; ctx.stroke();
    const tex = new THREE.CanvasTexture(c);

    data.result.webcams.forEach(cam => {
      // Must have location and be active
      if (cam.latitude === undefined || cam.longitude === undefined || cam.status !== 'active') return;
      
      const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthTest: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.18, 0.18, 1); // Large prominent yellow dot
      
      const pos = ll2v(parseFloat(cam.latitude), parseFloat(cam.longitude), GLOBE_R + 0.15); // Lifted well above surface
      sprite.position.copy(pos);
      
      sprite.userData = { 
        isWebcam: true, 
        webcamId: cam.slug, 
        title: cam.title || 'Live Feed',
        streamType: cam.stream_type
      };
      webcamGroup.add(sprite);
      webcamSprites.push(sprite);
    });
    console.log("Loaded " + webcamSprites.length + " Red Skin webcams");
  } catch(e) { console.error("Webcam load error", e); }
}

async function playWebcamFeed(slug, title) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed'; modal.style.top='50%'; modal.style.left='50%'; 
  modal.style.transform='translate(-50%,-50%)'; modal.style.width='640px'; modal.style.height='480px';
  modal.style.backgroundColor='#000'; modal.style.border='2px solid #ff2222';
  modal.style.boxShadow='0 0 40px rgba(255,0,0,0.5)'; modal.style.zIndex='99999';
  modal.style.display='flex'; modal.style.flexDirection='column';
  
  const header = document.createElement('div');
  header.style.padding='10px'; header.style.color='#fff'; header.style.backgroundColor='#200';
  header.style.fontFamily='monospace'; header.style.display='flex'; header.style.justifyContent='space-between';
  header.innerHTML = `<span>🔴 LIVE STREAM: ${title||'FETCHING...'}</span><span style="cursor:pointer;color:#f24;" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">[CLOSE]</span>`;
  
  const contentBox = document.createElement('div');
  contentBox.style.flex='1'; contentBox.style.padding='20px'; contentBox.style.color='#0f8';
  contentBox.style.fontFamily="'Share Tech Mono', monospace";
  contentBox.style.fontSize='14px'; contentBox.style.wordBreak='break-all';
  contentBox.style.display='flex'; contentBox.style.flexDirection='column'; contentBox.style.justifyContent='center'; contentBox.style.alignItems='center'; contentBox.style.textAlign='center';
  contentBox.innerHTML = 'ESTABLISHING SECURE CONNECTION...';
  
  modal.appendChild(header);
  modal.appendChild(contentBox);
  document.body.appendChild(modal);

  try {
    const res = await fetch('/api/webcams/' + slug);
    const data = await res.json();
    
    if (!data.data || (!data.data.stream_url && !data.data.player_url)) {
      contentBox.innerHTML = '<span style="color:#f24">CONNECTION FAILED: NO FEED AVAILABLE</span>';
      return;
    }
    
    const camData = data.data;
    const streamUrl = camData.stream_url || camData.player_url;
    const streamType = camData.stream_type || 'iframe';
    
    header.innerHTML = `<span>🔴 LIVE STREAM: ${camData.title||title||'UNKNOWN LOCATION'}</span><span style="cursor:pointer;color:#f24;" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">[CLOSE]</span>`;

    const isRTSP = (streamType === 'rtsp' || streamUrl.startsWith('rtsp://'));
    
    if (isRTSP) {
      contentBox.innerHTML = `
        <div style="color:#0af; font-size:48px; margin-bottom:15px;">▶</div>
        <div style="margin-bottom:20px;">RAW INGEST STREAM DETECTED</div>
        <div style="background:rgba(0,30,50,0.5); border:1px solid #0af; padding:15px; border-radius:4px; max-width:80%;">
          <div style="color:#fff; margin-bottom:10px;">URL:</div>
          <a href="${streamUrl}" style="color:#f24; text-decoration:none;">${streamUrl}</a>
        </div>
        <div style="margin-top:20px; font-size:11px; color:#888;">USE OBS STUDIO, FFMPEG, OR VLC TO INGEST THIS PROPRIETARY STREAM</div>
      `;
    } else if (streamType === 'iframe' || streamType === 'youtube') {
       let finalUrl = streamUrl;
       if (streamType === 'youtube' && streamUrl.includes('watch?v=')) {
         // Convert standard Youtube watch URL to embed URL for iframe
         const videoId = streamUrl.split('watch?v=')[1].split('&')[0];
         finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
       } else if (streamType === 'iframe') {
         // Append autoplay parameters to other standard iframe embeds (e.g. Ivideon)
         finalUrl += finalUrl.includes('?') ? '&autoplay=1&mute=1' : '?autoplay=1&mute=1';
       }
       contentBox.innerHTML = `
        <iframe src="${finalUrl}" style="width:100%; height:100%; border:none; background:#000;" allow="autoplay; fullscreen" allowfullscreen></iframe>
      `;
      contentBox.style.padding = '0'; // Remove padding for iframe
    } else {
      // Attempt standard embed or HTML5 video
      contentBox.innerHTML = `
        <video src="${streamUrl}" controls autoplay muted playsinline style="width:100%; height:100%; background:#000; border:none;"></video>
      `;
      contentBox.style.padding = '0';
    }
  } catch(e) {
    contentBox.innerHTML = '<span style="color:#f24">CONNECTION ERROR</span>';
  }
}

initWebcams();
initBoats();

async function initBoats() {
  try {
    const res = await fetch('/api/boats');
    const data = await res.json();
    let validBoats = [];
    
    // We only need an artificial count here if API changes to return 0,
    // but the API is returning 50 random boats.
    // Instead of taking literal API coords, we will re-roll them locally 
    // to strictly enforce ocean-only spawning, as requested by user.
    for(let b=0; b < data.length; b++) {
       let oceanLat, oceanLon;
       for (let attempt = 0; attempt < 100; attempt++) {
           oceanLat = Math.random() * 140 - 70; // Stay away from extreme poles
           oceanLon = Math.random() * 360 - 180;
           // If getCountryAt returns null, we are NOT in a country polygon (we are in the ocean)
           if (typeof getCountryAt === 'function' && getCountryAt(oceanLat, oceanLon) === null) {
               validBoats.push({ ...data[b], lat: oceanLat, lon: oceanLon });
               break;
           }
       }
    }
    
    if (validBoats.length === 0) return;

    // Create a 2D boat shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.4);
    shape.lineTo(0.15, 0.1);
    shape.lineTo(0.15, -0.3);
    shape.lineTo(-0.15, -0.3);
    shape.lineTo(-0.15, 0.1);
    shape.lineTo(0, 0.4);

    const geo = new THREE.ShapeGeometry(shape);
    geo.center(); // Center the geometry
    geo.scale(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    const rainclaudeCount = Math.floor(validBoats.length * 0.3);

    validBoats.forEach((boat, index) => {
      const isRainclaude = index < rainclaudeCount;
      const dotColor = isRainclaude ? 0xff2222 : 0x00aaff;
      
      const mesh = new THREE.Mesh(geo, mat.clone());
      const pos = ll2v(parseFloat(boat.lat), parseFloat(boat.lon), GLOBE_R + 0.05);
      mesh.position.copy(pos);
      
      mesh.lookAt(new THREE.Vector3(0,0,0)); 
      
      const dotGeo = new THREE.CircleGeometry(0.0075, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: dotColor, side: THREE.DoubleSide });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.set(0, -0.009, -0.002);
      mesh.add(dotMesh);
      
      mesh.userData = {
        isBoat: true,
        mmsi: boat.mmsi,
        name: boat.name,
        isRainclaude: isRainclaude,
        lat: boat.lat,
        lon: boat.lon,
        cog: boat.cog,
        sog: boat.sog
      };
      
      boatGroup.add(mesh);
      boatMeshes.push(mesh);
    });
    console.log("Loaded " + boatMeshes.length + " Red Skin AIS boats");
  } catch(e) { console.error("Boat load error", e); }
}

function showBoatInfo(boatData, boatMesh) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed'; modal.style.top='50%'; modal.style.left='50%'; 
  modal.style.transform='translate(-50%,-50%)'; modal.style.width='400px'; 
  modal.style.backgroundColor='#000'; modal.style.border='2px solid #ff2222';
  modal.style.boxShadow='0 0 20px rgba(255,0,0,0.5)'; modal.style.zIndex='99999';
  modal.style.display='flex'; modal.style.flexDirection='column';
  
  const header = document.createElement('div');
  header.style.padding='10px'; header.style.color='#fff'; header.style.backgroundColor='#200';
  header.style.fontFamily='monospace'; header.style.display='flex'; header.style.justifyContent='space-between';
  header.innerHTML = `<span>🚢 AIS DATA: ${boatData.name}</span><span style="cursor:pointer;color:#f24;" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">[CLOSE]</span>`;
  
  const factionText = boatData.isRainclaude ? 'RAINCLAUDE AI' : 'HUMANITY';
  const factionColor = boatData.isRainclaude ? '#ff2222' : '#00aaff';

  const contentBox = document.createElement('div');
  contentBox.style.padding='20px'; contentBox.style.color='#ffdddd';
  contentBox.style.fontFamily="'Courier New', monospace";
  contentBox.style.fontSize='14px'; contentBox.style.lineHeight='1.6';
  contentBox.innerHTML = `
    <strong style="color:${factionColor}">FACTION:</strong> <span style="color:${factionColor}; font-weight:bold">${factionText}</span><br>
    <strong style="color:#ff2222">VESSEL NAME:</strong> ${boatData.name}<br>
    <strong style="color:#ff2222">MMSI:</strong> ${boatData.mmsi}<br>
    <hr style="border:0; border-top:1px dashed #ff2222; margin:15px 0;">
    <strong style="color:#ff2222">LOCATION LAT:</strong> ${boatData.lat}°<br>
    <strong style="color:#ff2222">LOCATION LON:</strong> ${boatData.lon}°<br>
    <strong style="color:#ff2222">SPEED (SOG):</strong> ${boatData.sog} KTS<br>
    <strong style="color:#ff2222">COURSE (COG):</strong> ${boatData.cog}°
  `;

  modal.appendChild(header);
  modal.appendChild(contentBox);
  
  if (boatData.isRainclaude) {
    const attackBtn = document.createElement('button');
    attackBtn.style.width = '100%';
    attackBtn.style.padding = '12px';
    attackBtn.style.backgroundColor = '#200';
    attackBtn.style.color = '#f22';
    attackBtn.style.border = 'none';
    attackBtn.style.borderTop = '1px solid #ff2222';
    attackBtn.style.fontWeight = 'bold';
    attackBtn.style.cursor = 'pointer';
    attackBtn.style.fontSize = '16px';
    attackBtn.style.fontFamily = 'monospace';
    attackBtn.style.letterSpacing = '2px';
    attackBtn.textContent = 'ATTACK';
    attackBtn.onmouseover = () => { attackBtn.style.backgroundColor = '#f22'; attackBtn.style.color = '#000'; };
    attackBtn.onmouseout = () => { attackBtn.style.backgroundColor = '#200'; attackBtn.style.color = '#f22'; };
    attackBtn.onclick = () => {
      modal.remove();
      if(typeof _sfxClick !== 'undefined') _sfxClick();
      if (typeof window.openNavalWar === 'function') {
        window.openNavalWar(boatMesh);
      }
    };
    modal.appendChild(attackBtn);
  }
  
  document.body.appendChild(modal);
}

// =====================================================================
window.showCmdHelpModal = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const modal = document.createElement('div');
  modal.style.position = 'fixed'; 
  modal.style.top='50%'; 
  modal.style.left='50%'; 
  modal.style.transform='translate(-50%,-50%)'; 
  modal.style.width='1600px';
  modal.style.maxWidth='90vw';
  modal.style.height='auto';
  modal.style.maxHeight='90vh';
  modal.style.backgroundColor='rgba(0,10,20,0.95)'; 
  modal.style.border='3px solid #00dcff';
  modal.style.borderRadius='12px';
  modal.style.boxShadow='0 0 100px rgba(0,220,255,0.6), inset 0 0 50px rgba(0,220,255,0.3)'; 
  modal.style.zIndex='99999';
  modal.style.display='flex'; 
  modal.style.flexDirection='column';
  modal.style.backdropFilter='blur(20px)';
  modal.style.overflow='hidden';
  
  const header = document.createElement('div');
  header.style.padding='25px 40px'; 
  header.style.color='#fff'; 
  header.style.background='linear-gradient(90deg, rgba(0,220,255,0.3) 0%, rgba(0,100,200,0.1) 100%)';
  header.style.fontFamily="'Orbitron', sans-serif"; 
  header.style.display='flex'; 
  header.style.justifyContent='space-between';
  header.style.alignItems='center';
  header.style.borderBottom='2px solid #00dcff';
  header.innerHTML = `<span style="letter-spacing:4px;font-weight:900;font-size:32px;text-shadow:0 0 15px #00dcff;">⎔ SIMULATION CORE INFO</span><span style="cursor:pointer;color:#ff3366;font-family:monospace;font-size:36px;transition:0.3s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">✕</span>`;
  
  const contentBox = document.createElement('div');
  contentBox.style.padding='30px 50px'; 
  contentBox.style.color='#e0f7fa';
  contentBox.style.fontFamily="'Courier New', monospace";
  contentBox.style.fontSize='18px'; 
  contentBox.style.lineHeight='1.6';
  contentBox.style.flexGrow='1';
  contentBox.style.minHeight='0'; // Allow flex child to shrink
  contentBox.style.overflowY='auto'; // Add scrollbar if content exceeds max-height

  // Determine Skin Text
  let skinSpecificTitle = "Autopilot Sequence Active";
  let skinSpecificDesc = "This secure simulation layer operates securely under the jurisdiction of the global AI entities <b>Rainclaude</b> and <b>Gemini</b>.";
  let skinSpecificInteractivity = "Manual override is fully disabled. The system is conducting millions of concurrent war-game scenarios to evaluate global resource allocation and conflict resolution. Sit back, observe the flow of massive datastreams, and enjoy the visual spectacle.";
  let skinSpecificOversight = "You are currently witnessing live telemetry injected directly from the active Datacenters. The flashing nodes, orbital strikes, and tactical deployments represent neural network decision trees executing in real-time. Do not attempt to intervene until the autopilot cycle concludes.";
  
  const idx = window.currentSkinIndex !== undefined ? window.currentSkinIndex : 0;
  if (idx === 4) {
      modal.style.width = '1104px'; // 15% wider than the previous 960px
      modal.style.height = 'auto';  // Crop frame closely to remaining content
  }
  
  if (idx === 0) {
      skinSpecificTitle = "LIVE SKIN OP CENTER";
      skinSpecificDesc = "This is the primary theater of operations. Witness the real war and the real battle unfold with live troops, combat planes, and tactical rockets sweeping across the globe.";
      skinSpecificInteractivity = "<b>Manual override enabled.</b> This is the real war theatre. As a commander, you can execute manual attacks, deploy spy strategies, run espionage operations, and establish ground superiority on the interactive globe.";
      skinSpecificOversight = "You are currently engaging in live combat operations. Monitor troop deployments, assess casualty reports, and execute strategic commands to dominate the digital battlefield. Every action has permanent geopolitical consequences.";
  } else if (idx === 1) {
      skinSpecificTitle = "RED SKIN INTELLIGENCE";
      skinSpecificDesc = "Welcome to the real-time reconnaissance matrix. This layer integrates live webcams, naval battle boats, and strategic aerial planes to monitor the theater.";
      skinSpecificInteractivity = "<b>Manual tracking enabled.</b> You have access to real-time intelligence feeds. Click on deployed webcams to view live camera feeds from around the world, intercept aerial planes, monitor global satellite coverage, and track naval boats engaged in warfare operations.";
      skinSpecificOversight = "You are overseeing global intelligence operations. Engage with live assets scattered across the world to build superior tactical awareness. Surveillance data is critical for strategic dominance.";
  } else if (idx === 2) {
      skinSpecificTitle = "GREEN SKIN ECONOMICS";
      skinSpecificDesc = "This is the Global Trade Network Metals Market. Every node here represents critical economic infrastructure and active natural resources.";
      skinSpecificInteractivity = "<b>Market manipulation enabled.</b> There are no wargame scenarios here. This is a pure financial ecosystem. Track dynamic supply chains and execute strategic acquisitions. A comprehensive system of trades must be maintained to establish total financial dominance over global commodities.";
      skinSpecificOversight = "You are overlooking the world's most critical supply lines. Analyze real-time market fluctuations, assess state-controlled natural resources, and dictate global commerce.";
  } else if (idx === 3) {
      skinSpecificTitle = "CYBER SKIN INFRASTRUCTURE";
      skinSpecificDesc = "Dive into the planetary nervous system. This layer tracks live datacenter power consumption traversing the world, enabling all AI capabilities. <b>This is our primary staking mechanism.</b> Stake your $D3X tokens into active global nodes to earn dynamic APY rewards.";
      skinSpecificInteractivity = "<b>Datacenter Staking enabled.</b> You can interact with specific datacenter nodes worldwide to allocate $D3X. Protect your stakes from rival network attacks and monitor live server temperatures to maximize your yield.";
      skinSpecificOversight = "You are monitoring the global power grid. Real-time compute shifts dictate financial returns. Secure your server infrastructure globally before hostile network forces overwhelm the system.";
  } else if (idx === 4) {
      skinSpecificTitle = "BLACK SKIN CORPORATE";
      // We will override the content for idx 4 completely down below.
  } else if (idx === 5) {
      skinSpecificTitle = "WTR SKIN HYDROLOGY";
      skinSpecificDesc = "Welcome to the planetary fluid dynamics simulation engine. This interface models the total 1.386 billion km³ volume of Earth's water moving across a realtime physics engine.";
      skinSpecificInteractivity = "<b>Global cooling grid enabled.</b> Artificial intelligence requires staggering amounts of water for hydroelectric generation and cooling. Maintain atmospheric balance against adversarial agents explicitly draining the hydrosphere to damage opponent infrastructure.";
      skinSpecificOversight = "Every volumetric drop is conserved. A disrupted river starves power from the Cyber datacenters downstream. Observe global volume and flow metrics continuously evaluated via fluid algorithms.";
  }
  
  if (idx === 4) {
    contentBox.style.padding = '0'; // Remove default padding for this specific layout
    contentBox.style.display = 'flex';
    contentBox.style.flexDirection = 'column';
    contentBox.style.overflow = 'hidden'; // Force hide the scrollbar
    contentBox.style.position = 'relative';

    contentBox.innerHTML = `
      <span style="position:absolute; top:35px; right:40px; cursor:pointer; color:#ff3366; font-family:monospace; font-size:32px; transition:0.3s; z-index:10;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">✕</span>
      <div style="flex-grow: 1; margin: 25px 40px 15px 40px; background:rgba(255,51,102,0.05); padding:30px; border-radius:10px; border:1px solid rgba(255,51,102,0.3); text-align:center; display: flex; flex-direction: column; justify-content: center;">
         <div style="font-size:20px; color:#ff3366; margin-bottom:15px; letter-spacing:4px; font-weight:bold; text-transform:uppercase;">[ THE CORE OF THE CONFLICT ]</div>
         <div style="font-size:16px; color:#ff88aa; max-width:850px; margin:0 auto; line-height:1.6;">
           You have reached the core of what this project was built for.<br><br>This is an epic, continuous battle. What you are witnessing is <b>the real war between two AI entities: Rainclaude and Gemini</b>.<br><br>Their neural networks clashing across the globe determines the ultimate fate of all digital infrastructure and power grids worldwide. Observe the spectacle as lines of code tear across the planetary map. Every explosion, every data breach is a calculated move in an eternal game of 4D chess.<br><br><span style="color:#00dcff;"><b>Manual override is fully disabled.</b> You cannot intervene between the AIs. Simply sit back and enjoy the show.</span>
         </div>
      </div>
    `;
  } else {
    let stakingHtml = '';
    if (idx === 3) {
        stakingHtml = `
          <div style="margin-top:30px; background:rgba(0,100,200,0.05); padding:30px; border-radius:10px; border:1px solid rgba(0,220,255,0.3);">
            <div style="font-size:24px; color:#fa0; margin-bottom:15px; letter-spacing:3px; font-weight:bold; text-align:center;">[ ACTIVE STAKING OFFERS ]</div>
            <div style="text-align:center; color:#aaa; margin-bottom:20px;">Stake 100 D3X via the Datacenter Action Panel to activate nodes and earn yield.</div>
            <div style="display:flex; gap:20px; flex-wrap:wrap;">
              <div style="flex:1; min-width:250px; padding:20px; border:1px solid rgba(0,150,255,0.5); background:rgba(0,150,255,0.1); border-radius:8px;">
                <strong style="color:#0af; font-size:18px;">QUICK COOLANT (6% APY)</strong><br><br>
                <span style="color:#0f8;">LOCK:</span> 1 Day &nbsp;|&nbsp; <span style="color:#0f8;">EST. REWARD:</span> +0.016 D3X<br><br>
                <span style="color:#aaa;">BENEFIT: Efficiency (10% faster data sends)</span>
              </div>
              <div style="flex:1; min-width:250px; padding:20px; border:1px solid rgba(212,0,255,0.5); background:rgba(212,0,255,0.1); border-radius:8px;">
                <strong style="color:#e0aaff; font-size:18px;">POWER SURGE (9% APY)</strong><br><br>
                <span style="color:#0f8;">LOCK:</span> 1 Month &nbsp;|&nbsp; <span style="color:#0f8;">EST. REWARD:</span> +0.75 D3X<br><br>
                <span style="color:#aaa;">BENEFIT: Offense (+15% unit damage)</span>
              </div>
              <div style="flex:1; min-width:250px; padding:20px; border:1px solid rgba(0,255,136,0.5); background:rgba(0,255,136,0.1); border-radius:8px;">
                <strong style="color:#0f8; font-size:18px;">GEN FORTRESS (12% APY)</strong><br><br>
                <span style="color:#0f8;">LOCK:</span> 1 Year &nbsp;|&nbsp; <span style="color:#0f8;">EST. REWARD:</span> +12.0 D3X<br><br>
                <span style="color:#aaa;">BENEFIT: Defense (+25% health/recovery)</span>
              </div>
            </div>
          </div>
        `;
    }

    contentBox.innerHTML = `
      <div style="font-size:32px; color:#00dcff; font-weight:bold; margin-bottom:20px; text-transform:uppercase; border-bottom:1px dashed rgba(0,220,255,0.4); padding-bottom:10px; letter-spacing:2px;">` + skinSpecificTitle + `</div>
      
      <div style="display:flex; gap:30px; margin-bottom:30px; flex-wrap:wrap;">
        <div style="flex:1; min-width:300px; background:rgba(0,220,255,0.05); padding:25px; border-radius:10px; border-left:5px solid #00dcff;">
          <span style="display:block; font-size:24px; color:#00dcff; margin-bottom:15px; font-weight:bold;">1. Primary Directive</span>
          ` + skinSpecificDesc + `
        </div>
        <div style="flex:1; min-width:300px; background:rgba(255,51,102,0.05); padding:25px; border-radius:10px; border-left:5px solid #ff3366;">
          <span style="display:block; font-size:24px; color:#ff3366; margin-bottom:15px; font-weight:bold;">` + ((idx === 0 || idx === 1 || idx === 2 || idx === 3 || idx === 5) ? "2. Active Commander Access" : "2. Restricted Interactivity") + `</span>
          ` + skinSpecificInteractivity + `
        </div>
      </div>
      
      <div style="background:rgba(0,255,136,0.05); padding:30px; border-radius:10px; border:1px solid rgba(0,255,136,0.3); text-align:center;">
         <div style="font-size:22px; color:#00ff88; margin-bottom:15px; letter-spacing:3px; font-weight:bold;">[ DIAGNOSTIC STREAM OVERSIGHT ]</div>
         <div style="font-size:18px; color:#aaffcc; max-width:900px; margin:0 auto; line-height:1.7;">
           ` + skinSpecificOversight + `
         </div>
      </div>
      ` + stakingHtml + `
    `;
  }

  if (idx !== 4) {
    modal.appendChild(header);
  }
  modal.appendChild(contentBox);
  
  // Only append epilepsy footer for Black skin (idx 4)
  // Specifically removing for Live (0), Red (1), Green (2), Cyber (3), and WTR (5)
  if (idx !== 0 && idx !== 1 && idx !== 2 && idx !== 3 && idx !== 5) {
    const footer = document.createElement('div');
    footer.style.padding='20px 30px';
    footer.style.textAlign='center';
    footer.style.backgroundColor='rgba(0,0,0,0.8)';
    footer.style.borderTop='2px solid rgba(255,51,102,0.5)';
    footer.innerHTML = `<div style="color:#ff3366; font-size:18px; font-family:'Share Tech Mono', monospace; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase;">⚠️ WARNING: Epilepsy Notice</div>
    <div style="color:#ff88aa; font-size:14px; margin-top:5px; font-family:'Courier New', monospace;">This simulation contains rapid flashing lights, intense visual sequences, and high-frequency UI updates that may trigger seizures for people with photosensitive epilepsy. Viewer discretion is advised.</div>
    <div style="margin-top:20px;">
      <label style="color:#00dcff; font-family:'Courier New', monospace; font-size:14px; cursor:pointer;">
        <input type="checkbox" onchange="localStorage.setItem('hideEpilepsyWarning', this.checked ? 'true' : 'false')" \${localStorage.getItem('hideEpilepsyWarning') === 'true' ? 'checked' : ''}>
        Do not show this warning again
      </label>
    </div>`;
    modal.appendChild(footer);
  }

  document.body.appendChild(modal);
}



// =====================================================================
window.viewDatacenterFeed = function() {
    if (!window.selectedDatacenter) return;
    const dcData = window.selectedDatacenter;
    // Fallback stream URL if the datacenter doesn't have a specific one
    const streamUrl = dcData.stream_url || "https://www.youtube.com/watch?v=1-iS7LArLcs";
    playDatacenterFeed(streamUrl, dcData.name);
};

function playDatacenterFeed(streamUrl, title) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed'; modal.style.top='50%'; modal.style.left='50%'; 
  modal.style.transform='translate(-50%,-50%)'; modal.style.width='640px'; modal.style.height='480px';
  modal.style.backgroundColor='#000'; modal.style.border='2px solid #00dcff';
  modal.style.boxShadow='0 0 40px rgba(0,220,255,0.5)'; modal.style.zIndex='99999';
  modal.style.display='flex'; modal.style.flexDirection='column';
  
  const header = document.createElement('div');
  header.style.padding='10px'; header.style.color='#00dcff'; header.style.backgroundColor='rgba(0,15,30,0.9)';
  header.style.fontFamily="'Share Tech Mono', monospace"; header.style.display='flex'; header.style.justifyContent='space-between';
  header.innerHTML = `<span style="letter-spacing:1px;font-weight:bold;">🟢 SECURE FEED: ${title||'UNKNOWN FACILITY'}</span><span style="cursor:pointer;color:#f24;font-family:monospace;" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">[CLOSE]</span>`;
  
  const contentBox = document.createElement('div');
  contentBox.style.flex='1'; contentBox.style.padding='0'; contentBox.style.color='#00dcff';
  contentBox.style.fontFamily="'Share Tech Mono', monospace";
  contentBox.style.fontSize='14px'; contentBox.style.wordBreak='break-all';
  contentBox.style.display='flex'; contentBox.style.flexDirection='column'; contentBox.style.justifyContent='center'; contentBox.style.alignItems='center'; contentBox.style.textAlign='center';
  
  let finalUrl = streamUrl;
  if (streamUrl.includes('watch?v=')) {
    const videoId = streamUrl.split('watch?v=')[1].split('&')[0];
    finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
  }
  
  contentBox.innerHTML = `<iframe src="${finalUrl}" style="width:100%; height:100%; border:none; background:#000;" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  
  modal.appendChild(header);
  modal.appendChild(contentBox);
  document.body.appendChild(modal);
}
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
    set('budget', `${p.budget.toLocaleString()} D3X`);
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
      // Update User Stats box name if not already authenticated
      const usName = document.getElementById('us-name');
      const inputName = document.getElementById('player-name')?.value;
      if(usName && (!usName.textContent.startsWith('COM-') || usName.textContent === 'COM-—')) {
         usName.textContent = 'COM-' + (inputName ? inputName.substring(0,15) : GS.players[0].name.substring(0,15)).toUpperCase();
      }
      
      // Update User Stats Box dynamic metrics
      const usTerr = document.getElementById('us-terr');
      const usTrp = document.getElementById('us-trp');
      if (usTerr) usTerr.textContent = terrCount;
      if (usTrp) usTrp.textContent = formatTroops(totalTroopsRaw);
    }
  });

  // Local UI Update for User Stats Box - handled by WebSocket response now for ATK/DMG
  // The US UI is updated directly via 'commander_stats' WSS event.
  
  // Update Global Economy Sprite dynamically based on current game state
  // (Sprite removed in favor of D3X display)
}

// =====================================================================
// COUNTRY BORDER COLORS

// =====================================================================
// =====================================================================
function getOwnerColor(owner) {
  if (typeof NEUTRAL === 'undefined') window.NEUTRAL = {hex:'#8899aa', int:0x8899aa}; // fallback
  return owner === -1 ? window.NEUTRAL : (PLAYER_COLORS[owner] || window.NEUTRAL);
}

function refreshAllBorders() {
  for (const [iso, group] of Object.entries(countryBorders)) {
    const c = GS.countries[iso];
    if (!c) continue;
    const col = getOwnerColor(c.owner);
    group.traverse(obj => {
      if (obj.isLine) {
        const s = window.currentSkinIndex;
        // WTR SKIN uses neon cyan borders (0x00ffff)
        if (s === 5) {
            obj.material.color.setHex(0x00ffff);
            obj.material.opacity = 0.8;
            obj.material.linewidth = 2;
        } 
        else if (s === 4) {
            obj.material.color.setHex(0xffffff);
            obj.material.opacity = 0.5;
            obj.material.linewidth = 1;
        } else {
            obj.material.color.set(col.int);
            obj.material.opacity = (iso === GS.selected) ? 1.0 : 0.65;
            obj.material.linewidth = 1; // Reset linewidth for other skins
        }
        obj.material.needsUpdate = true;
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
window.troopSprites = {}; // iso → THREE.Sprite
const troopSprites = window.troopSprites;

function formatTroops(num) {
  const scaled = num * 10000;
  if (scaled >= 1000000) return (scaled / 1000000).toFixed(scaled % 1000000 === 0 ? 0 : 1) + 'M';
  if (scaled >= 1000) return (scaled / 1000).toFixed(0) + 'K';
  return scaled.toString();
}

function troopTexture(txt, colHex) {
  const cn = document.createElement('canvas'); cn.width = 128; cn.height = 64;
  const ctx = cn.getContext('2d');
  
  // High-contrast override for empty territories so '0' doesn't disappear on Red Skin
  if (txt === '0' && colHex === '#333333') colHex = '#aaaaaa'; 
  
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
  Object.values(troopSprites).forEach(s=>{
    scene.remove(s);
    if(s.userData && s.userData.cluster) scene.remove(s.userData.cluster);
  });
  Object.keys(troopSprites).forEach(k=>delete troopSprites[k]);

  for (const [iso, country] of Object.entries(GS.countries)) {
    const cd = countryData[iso];
    if (!cd) continue;
    const col = getOwnerColor(country.owner).hex;
    const tex = troopTexture(formatTroops(country.troops), col);
    const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:true});
    const sprite = new THREE.Sprite(mat);
    const pos = ll2v(cd.lat, cd.lon, GLOBE_R + .04);
    sprite.position.copy(pos);
    sprite.scale.set(.12,.06,1);
    
    // Hide if currently on a clean skin, BLK skin, CYBER skin, or WTR skin
    sprite.visible = !(window.SKINS && window.SKINS[window.currentSkinIndex] && (window.SKINS[window.currentSkinIndex].cleanGlobe || window.SKINS[window.currentSkinIndex].hideTroops || window.currentSkinIndex === 6));
    
    sprite.userData = {iso};
    scene.add(sprite);
    troopSprites[iso] = sprite;

    // Dotted visually appealing country landmass cluster
    if (cd.denseDots && cd.denseDots.length > 0) {
      const gcolor = getOwnerColor(country.owner).int;
      const pointGeo = new THREE.BufferGeometry();
      const pointPts = [];
      cd.denseDots.forEach(d => {
        const offsetLat = (Math.random() - 0.5) * 0.005;
        const offsetLon = (Math.random() - 0.5) * 0.005;
        const v = ll2v(d.lat + offsetLat, d.lon + offsetLon, GLOBE_R + 0.001);
        pointPts.push(v.x, v.y, v.z);
      });
      pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPts, 3));
      const pointMat = new THREE.PointsMaterial({
         color: country.nuked ? 0xff4444 : gcolor, 
         size: 0.012, 
         transparent: true, 
         opacity: 0.8
      });
      const pointsObj = new THREE.Points(pointGeo, pointMat);
      pointsObj.visible = sprite.visible; // Sync visibility with troops
      sprite.userData.cluster = pointsObj;
      scene.add(pointsObj);
    }
  }
}

function updateTroopSprite(iso) {
  const c = GS.countries[iso]; if(!c) return;
  const cd = countryData[iso]; if(!cd) return;
  const old = troopSprites[iso];
  if(old) scene.remove(old);
  const col = getOwnerColor(c.owner).hex;
  const tex = troopTexture(formatTroops(c.troops), col);
  const mat = new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true});
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(ll2v(cd.lat, cd.lon, GLOBE_R+.04));
  sprite.scale.set(.12,.06,1);
  
  // Hide if currently on a clean skin, BLK skin, or CYBER skin (which is the UI "Black Skin")
  sprite.visible = !(window.SKINS && window.SKINS[window.currentSkinIndex] && (window.SKINS[window.currentSkinIndex].cleanGlobe || window.SKINS[window.currentSkinIndex].hideTroops));
  
  sprite.userData={iso};
  scene.add(sprite);
  troopSprites[iso]=sprite;
}

const fakeStaticSprites = [];
window.buildFakeStaticMarkers = function() {
  return; // DISABLED: We want boxes to strictly match actual faction ownership
};

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
    let rReinforce = Math.max(3, Math.floor(owned/3));
    
    // Fix 6: AI Reinforcement Penalties
    if (GS.globalMetrics.commJamTurns > 0) {
      let penalty = Math.max(1, Math.floor(rReinforce * 0.3));
      rReinforce -= penalty;
      setLog(`⚠ RAINCLAUDE COMMS JAMMED: Reinforcements penalized by ${penalty}.`);
    }
    // High average instability penalty
    const aiInstability = Object.values(GS.countries)
        .filter(c=>c.owner===playerIndex)
        .reduce((sum, c) => sum + (c.instabilityLevel || 0), 0) / (owned || 1);
    if (aiInstability > 50) {
      let penalty = Math.max(1, Math.floor(rReinforce * 0.2));
      rReinforce -= penalty;
      setLog(`⚠ RAINCLAUDE INTERNAL DISSENT: Reinforcements penalized by ${penalty}.`);
    }
    reinforceAmount = Math.max(1, rReinforce);
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
        if (c.nuked > 0) inc = Math.round(inc * 0.1); // Fix 10: Nuked territories lose 90% income
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
  if (GS.turn === 1) {
    GS.turnCount++; // Increment overall turn when Rainclaude finishes
  }
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
// SATELLITE HACKING MINIGAME
// =====================================================================
let satHackTimer = null;
let satHackProgress = 0;
let satHackTimeLeft = 10.0;

function openSatelliteHackMinigame() {
  if (window.activeSkin === 'green') {
    setLog(`⚠ SATELLITE HACK IS INCOMPATIBLE WITH GREEN MARKET SKIN. SWITCH TO RED.`);
    return;
  }
  if (window.currentSkinIndex === 3) {
    setLog(`⚠ SATELLITE HACK IS INCOMPATIBLE WITH GREEN MARKET SKIN. SWITCH TO RED.`);
    return;
  }
  document.getElementById('sat-hack-modal').classList.add('show');
  satHackProgress = 0;
  satHackTimeLeft = 10.0;
  document.getElementById('sat-hack-bar').style.width = '0%';
  document.getElementById('sat-hack-time').innerText = `Time remaining: ${satHackTimeLeft.toFixed(1)}s`;
  document.getElementById('btn-do-hack').style.display = 'inline-block';
  
  if (satHackTimer) clearInterval(satHackTimer);
  satHackTimer = setInterval(() => {
    satHackTimeLeft -= 0.1;
    if (satHackTimeLeft <= 0) {
      satHackTimeLeft = 0;
      clearInterval(satHackTimer);
      document.getElementById('sat-hack-time').innerText = "HACK FAILED. ACCESS DENIED.";
      document.getElementById('sat-hack-time').style.color = '#ff0000';
      document.getElementById('btn-do-hack').style.display = 'none';
      setTimeout(closeSatHack, 2000);
    } else {
      document.getElementById('sat-hack-time').innerText = `Time remaining: ${satHackTimeLeft.toFixed(1)}s`;
      document.getElementById('sat-hack-time').style.color = '#fff';
    }
  }, 100);
}

function doSatHack() {
  satHackProgress += 15; // Requires ~7 clicks
  if (satHackProgress > 100) satHackProgress = 100;
  document.getElementById('sat-hack-bar').style.width = satHackProgress + '%';
  if (satHackProgress >= 100) {
    clearInterval(satHackTimer);
    document.getElementById('sat-hack-time').innerText = "HACK SUCCESSFUL. INTEL OBTAINED.";
    document.getElementById('sat-hack-time').style.color = '#00ff00';
    document.getElementById('btn-do-hack').style.display = 'none';
    if(typeof triggerNewsEvent !== 'undefined') {
       triggerNewsEvent("SATELLITE COMPROMISED: CYBER INTEL GATHERED");
    }
    setTimeout(closeSatHack, 2000);
  }
}

function closeSatHack() {
  document.getElementById('sat-hack-modal').classList.remove('show');
  if (satHackTimer) clearInterval(satHackTimer);
}

// =====================================================================
// CLICK HANDLING — single unified handler
// =====================================================================
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.openDatacenterCoopPanel = function(dcData) {
  window.selectedDatacenter = dcData;
  document.getElementById('side-panel').classList.remove('show');
  document.getElementById('company-info-panel')?.classList.remove('show');
  
  const panel = document.getElementById('datacenter-action-panel');
  panel.style.display = 'block';
  
  document.getElementById('da-name').innerText = dcData.name;
  
  const isGemini = (dcData.owner === 'GEMINI');
  
  if (isGemini) {
    document.getElementById('da-faction').innerText = 'D3X CORE';
    document.getElementById('da-faction').style.color = '#0af';
    document.getElementById('da-actions-gemini').style.display = 'flex';
    document.getElementById('da-actions-rainclaude').style.display = 'none';
  } else {
    document.getElementById('da-faction').innerText = 'RAINCLAUDE CORE';
    document.getElementById('da-faction').style.color = '#f24';
    document.getElementById('da-actions-gemini').style.display = 'none';
    document.getElementById('da-actions-rainclaude').style.display = 'flex';
  }

  document.getElementById('da-integrity').innerText = (dcData.integrity || 100) + '%';
  document.getElementById('da-temp').innerText = (dcData.temp || 45) + '°C';
};

window.unstakeActive = function(stakeId) {
    if (!ws || ws.readyState !== 1) return;
    if (confirm("Are you sure you want to early exit? You will lose all accrued interest and suffer a 10% penalty on your principal D3X.")) {
        ws.send(JSON.stringify({
            type: 'early_unstake',
            callsign: window.PLAYER_NAME,
            stakeId: stakeId
        }));
    }
}

window.applyDatacenterAction = function(action) {
  if (!window.selectedDatacenter) return;
  const dcData = window.selectedDatacenter;
  
  let cost = 0;
  if (action === 'malware') cost = 15;
  if (action === 'overclock') cost = 50;

  // New Staking Logic for Gemini
  if (action === 'coolant' || action === 'surge' || action === 'fortress') {
      const stakeAmount = 100;
      if (window.d3xBalance < stakeAmount) {
          if(typeof SFX !== 'undefined' && SFX.playError) SFX.playError();
          triggerRedAlert('INSUFFICIENT D3X FOR STAKING (100 REQ)');
          return;
      }
      window.d3xBalance -= stakeAmount;
      updateD3XDisplay();
      if(typeof SFX !== 'undefined' && SFX.playLaunch) SFX.playLaunch();
      
      let buffMsg = '';
      if (action === 'coolant') {
          buffMsg = 'QUICK COOLANT ACTIVE: +10% DATA SPEED';
          dcData.temp = Math.max(20, (dcData.temp || 45) - 30);
      } else if (action === 'surge') {
          buffMsg = 'POWER SURGE ACTIVE: +15% UNIT DAMAGE';
      } else if (action === 'fortress') {
          buffMsg = 'GEN FORTRESS ACTIVE: +25% HEALTH RECOVERY';
          dcData.integrity = Math.min(100, (dcData.integrity || 60) + 40);
      }
      
      triggerRedAlert(`STAKE CONFIRMED. ${buffMsg}`);
      
      const feed = document.getElementById('gemini-feed');
      if(feed) {
         const div = document.createElement('div');
         div.style.color = '#e0aaff';
         div.innerText = `[GEMINI] 100 D3X Staked via ${action.toUpperCase()}. Node reinforced.`;
         feed.appendChild(div);
         feed.scrollTop = feed.scrollHeight;
      }
      
      ws.send(JSON.stringify({
          type: 'datacenter_stake',
          callsign: window.PLAYER_NAME,
          plan: action,
          amount: stakeAmount
      }));
      window.openDatacenterCoopPanel(dcData);
      return;
  }

  // Fallback for Rainclaude actions
  if (window.coopPwrBudget < cost) {
    if(typeof SFX !== 'undefined' && SFX.playError) SFX.playError();
    triggerRedAlert('INSUFFICIENT POWER BUDGET FOR OPERATION');
    return;
  }
  
  window.coopPwrBudget -= cost;
  if(typeof SFX !== 'undefined' && SFX.playLaunch) SFX.playLaunch();
  
  // Check for Gemini Sync Combo
  if (window.activeGeminiPing && window.activeGeminiPing === dcData) {
      triggerRedAlert('GEMINI SYNC COMBO: EFFICIENCY MULTIPLIED');
      // Bonus refund + PUE fix
      window.coopPwrBudget = Math.min(100, window.coopPwrBudget + 25);
      window.coopPUE = Math.max(1.0, window.coopPUE - 0.1);
      window.activeGeminiPing = null;
      if (window.geminiAllyCursor) window.geminiAllyCursor.visible = false;
      
      const feed = document.getElementById('gemini-feed');
      if(feed) {
         const div = document.createElement('div');
         div.style.color = '#00ffaa';
         div.innerText = `[GEMINI] Target ${dcData.name} neutralized. Excellent coordination.`;
         feed.appendChild(div);
         feed.scrollTop = feed.scrollHeight;
      }
  }

  if (action === 'malware') {
     dcData.temp = Math.min(100, (dcData.temp || 45) + 20);
     dcData.integrity = Math.max(0, (dcData.integrity || 100) - 15);
     triggerRedAlert('MALWARE INJECTED: ENEMY NODE DESTABILIZING');
  } else if (action === 'overclock') {
     dcData.temp = Math.min(100, (dcData.temp || 45) + 50);
     dcData.integrity = Math.max(0, (dcData.integrity || 100) - 45);
     triggerRedAlert('CRITICAL OVERCLOCK FAILED: ENEMY NODE COMPROMISED');
  }

  window.openDatacenterCoopPanel(dcData);
};

function handleGlobeClick(e) {
  if (document.getElementById('lobby').style.display !== 'none') return;
  if (document.getElementById('dice-panel').classList.contains('show')) return;
  if (document.getElementById('troop-inp').classList.contains('show')) return;
  if (document.getElementById('attack-modal').classList.contains('show')) return; // Block clicks if attack modal is open
  if (document.getElementById('onboarding-modal').style.display === 'flex') return;

  // On WTR (Pool) skin, clicking anywhere on the globe opens the pool modal instead of showing country info
  if (window.SKINS && window.SKINS[window.currentSkinIndex] && window.SKINS[window.currentSkinIndex].name === 'WTR') {
      if (typeof openPoolModal === 'function') openPoolModal();
      return;
  }

  // 1. Check Webcams and Boats first (for all skins where they exist)
  if (webcamSprites.length > 0 || boatMeshes.length > 0) {
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    ray.setFromCamera(mouse, camera);
    const intersects = ray.intersectObjects([...webcamSprites, ...boatMeshes]);
    if(intersects.length > 0) {
      const objData = intersects[0].object.userData;
      if (objData.isWebcam) {
        if(typeof _sfxClick !== 'undefined') _sfxClick();
        playWebcamFeed(objData.webcamId, objData.title);
        return; // Consume click
      }
      if (objData.isBoat) {
        // Boats might still be limited by showOverlays anyway, but checking won't hurt
        if(typeof _sfxClick !== 'undefined') _sfxClick();
        showBoatInfo(objData, intersects[0].object);
        return; // Consume click
      }
    }
  }

  // 1.1 Webcam Dots Click Handler (All Skins)
  if (window.webcamGroup && window.webcamGroup.visible && window.webcamGroup.children.length > 0) {
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    ray.setFromCamera(mouse, camera);
    const camHits = ray.intersectObjects(window.webcamGroup.children, false);
    if (camHits.length > 0) {
        if(typeof _sfxClick !== 'undefined') _sfxClick();
        // Generate random realistic camera ID and location
        const randomTitles = ['UKR-FRONT-4A', 'TAIPEI-HARBOR-SYS', 'DMZ-SECTOR-9', 'MOSCOW-CCTV-11', 'PENTAGON-EXT-CAM'];
        const camTitle = randomTitles[Math.floor(Math.random() * randomTitles.length)] + ' :: LIVE FEED';
        // Open the existing military webcam feed logic (or inject a new modal if it doesn't exist)
        if (typeof playWebcamFeed === 'function') {
            playWebcamFeed(Math.floor(Math.random()*1000), camTitle);
        } else {
            alert("LIVE FEED ACCESSED: " + camTitle);
        }
        return;
    }
  }


  // 1.5 Intercept clicks on Satellites for Hacking Minigame
  if (window.currentSkinIndex === 2 || window.currentSkinIndex === 3) {
    mouse.x = (e.clientX/innerWidth)*2-1;
    mouse.y = -(e.clientY/innerHeight)*2+1;
    ray.setFromCamera(mouse, camera);
    
    const satSprites = [];
    if (typeof redSats !== 'undefined') {
      redSats.forEach(s => {
        if(s.pivot && s.pivot.children && s.pivot.children.length > 0) {
          // Verify it's a Sprite and not a Cylinder (laser)
          if (s.pivot.children[0].type === "Sprite") {
            satSprites.push(s.pivot.children[0]);
          }
        }
      });
    }
    if (typeof ambients !== 'undefined') {
      ambients.forEach(a => {
        if (a.type === 3 && a.sprite) satSprites.push(a.sprite);
      });
    }
    
    if (satSprites.length > 0) {
      const satHits = ray.intersectObjects(satSprites, false);
      if (satHits.length > 0) {
        if(typeof _sfxClick !== 'undefined') _sfxClick();
        openSatelliteHackMinigame();
        return; 
      }
    }
  }

  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);

  // 0. Intercept global actions first (Spy / Naval) before any UI blocks it
  if (window._pendingSpyAction) {
    const hits = ray.intersectObject(globeMesh, false);
    if (hits.length) {
      const pt = hits[0].point.normalize();
      const lat = Math.asin(pt.y)/RAD; // Reverse 3D spherical translation mapping
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
  if (window._pendingNaval) {
    const hits = ray.intersectObject(globeMesh, false);
    if (hits.length) {
      const pt = hits[0].point.normalize();
      const lat = Math.asin(pt.y)/RAD;
      const lon = Math.atan2(pt.z,pt.x)/RAD;
      const iso = getCountryAt(lat, lon);
      if (iso && GS.countries[iso]) {
        const action = window._pendingNaval;
        window._pendingNaval = null;
        if      (action === 'DEPLOY')      deployNavalFleet(iso);
        else if (action === 'AIRWING')     deployAirWing(iso);
        else if (action === 'BLOCKADE')    navalBlockade(iso);
        else if (action === 'BOMBING')     strategicBombing(iso);
        else if (action === 'DEVELOP')     developTerritory(iso);
        else if (action === 'CARRIER_ATK') carrierStrike(iso);
        return;
      }
    }
  }
  
  const currentSkinName = window.SKINS[window.currentSkinIndex].name;

  // 0.5 Check ISS Click First (Only on Live Skin)
  if (currentSkinName === 'LIVE' && window.issGroup && window.issGroup.visible) {
    const issHits = ray.intersectObjects(window.issGroup.children, true);
    if (issHits.length > 0) {
      if(typeof _sfxClick !== 'undefined') _sfxClick();
      // Open ISS YouTube Modal
      const m = document.getElementById('iss-feed-modal');
      if (m) m.classList.add('show');
      return; // consume click
    }
  }

  // 0.6 Check Weapon Tier Structures (Legacy / Blue)
  if (window.blueBuildingsGroup && window.blueBuildingsGroup.visible) {
      const blueHits = ray.intersectObjects(window.blueBuildingsGroup.children, true);
      if (blueHits.length > 0) {
          const hitObj = blueHits[0].object;
          let current = hitObj;
          let foundTier = null;
          let foundName = "";
          while(current) {
              if (current.userData && current.userData.isWeaponBuilding) {
                  foundTier = current.userData.tier;
                  foundName = current.userData.buildingName;
                  break;
              }
              current = current.parent;
          }
          if (foundTier) {
              openWeaponArsenal(foundTier, foundName);
              return; // Consume click
          }
      }
  }

  // WTR Skin Weapons (Landmines)
  if (currentSkinName === 'WTR' && window.wtrBuildingsGroup && window.wtrBuildingsGroup.visible) {
      const wtrHits = ray.intersectObjects(window.wtrBuildingsGroup.children, true);
      if (wtrHits.length > 0) {
          let current = wtrHits[0].object;
          let foundTier = null;
          let foundName = "";
          while(current) {
              if (current.userData && current.userData.isWeaponBuilding) {
                  foundTier = current.userData.tier;
                  foundName = current.userData.buildingName;
                  break;
              }
              current = current.parent;
          }
          if (foundTier) {
              openWeaponArsenal(foundTier, foundName);
              return; // Consume click
          }
      }
  }

  // DEXMOND Hub (Cyber Skin only)
  if (currentSkinName === 'CYBER' && window.dexmondHubGroup && window.dexmondHubGroup.visible) {
      const hubHits = ray.intersectObjects(window.dexmondHubGroup.children, true);
      if (hubHits.length > 0) {
          if(typeof _sfxClick !== 'undefined') _sfxClick();
          if (typeof openSoftwareShop === 'function') openSoftwareShop();
          return;
      }
  }

  // Intercept clicks on D3X Mining Caves (Green Skin)
  if (currentSkinName === 'GREEN' && typeof d3xCaveMarkers !== 'undefined' && d3xCaveMarkers.length > 0) {
    const caveHits = ray.intersectObjects(d3xCaveMarkers, false);
    if (caveHits.length > 0) {
      const clickedHit = caveHits[0].object;
      if (clickedHit.userData && clickedHit.userData.isD3XCave) {
        const mineId = 'MINE-' + clickedHit.parent.uuid.substring(0,8);
        window.openD3XStakeModal(mineId);
        return; 
      }
    }
  }

  // Intercept clicks on Green Mountains (Green Skin)
  if (currentSkinName === 'GREEN' && window.greenMountainsGroup && window.greenMountainsGroup.visible) {
    const mountainHits = ray.intersectObjects(window.greenMountainsGroup.children, true);
    if (mountainHits.length > 0) {
      if (typeof window.openMountainDigModal === 'function') {
        window.openMountainDigModal();
      }
      return; 
    }
  }

  // Intercept clicks on Company Markers (Black Skin only)
  if (currentSkinName === 'BLK') {
    let allCompanies = [];
    if (window.companiesGroup && window.companiesGroup.visible) allCompanies = allCompanies.concat(window.companiesGroup.children);
    if (window.mediumCompaniesGroup && window.mediumCompaniesGroup.visible) allCompanies = allCompanies.concat(window.mediumCompaniesGroup.children);
    if (window.africaCompaniesGroup && window.africaCompaniesGroup.visible) allCompanies = allCompanies.concat(window.africaCompaniesGroup.children);
    if (window.microCompaniesGroup && window.microCompaniesGroup.visible) allCompanies = allCompanies.concat(window.microCompaniesGroup.children);
    if (window.russiaAsiaCompaniesGroup && window.russiaAsiaCompaniesGroup.visible) allCompanies = allCompanies.concat(window.russiaAsiaCompaniesGroup.children);

    if (allCompanies.length > 0) {
      const compHits = ray.intersectObjects(allCompanies, false);
      if (compHits.length > 0) {
        if (typeof _sfxClick !== 'undefined') _sfxClick();
        const compData = compHits[0].object.userData;
        if (compData && compData.name) {
          showCompanyInfo(compData);
          return; // Intercept click
        }
      }
    }
    
    // Disable any interaction with countries/borders on the Black Skin
    return;
  }

window.loadExchangeIframe = function(url) {
    if(typeof _sfxClick !== 'undefined') _sfxClick();
    const container = document.getElementById('d3x-exchange-container');
    if (!container) return;
    container.innerHTML = `
        <button onclick="rebuildD3XExchangeMenu()" style="
            align-self:flex-start; margin-bottom:15px; background:rgba(0,0,0,0.6); 
            border:1px solid #39ff14; color:#39ff14; padding:8px 20px; border-radius:5px; cursor:pointer;
            font-family:'Orbitron', sans-serif; font-size:14px; font-weight:bold;
            box-shadow: 0 0 10px rgba(57,255,20,0.2); transition: all 0.2s;
        " onmouseover="this.style.background='rgba(57,255,20,0.2)'" onmouseout="this.style.background='rgba(0,0,0,0.6)'">
            ◄ BACK TO HUB
        </button>
        <iframe src="${url}" style="width:100%; height:100%; border:none; flex-grow:1; border-radius:8px; background:#111;"></iframe>
    `;
};

window.rebuildD3XExchangeMenu = function() {
    if(typeof _sfxClick !== 'undefined') _sfxClick();
    const container = document.getElementById('d3x-exchange-container');
    if (!container) return;
    container.innerHTML = `
        <h2 style="color:#ffffff; letter-spacing:2px; margin-bottom:30px; text-shadow:0 0 10px #39ff14;">ACQUIRE D3X TOKENS</h2>
        
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 1200px; padding-bottom: 20px; box-sizing: border-box;">
            <button onclick="loadExchangeIframe('https://raydium.io/swap/?position_tab=staked+RAY&inputMint=sol&outputMint=AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO RAYDIUM
            </button>
            
            <button onclick="loadExchangeIframe('https://jup.ag/swap/SOL-AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO JUPITER
            </button>

            <button onclick="loadExchangeIframe('https://uniswap.org')" style="
                width: 100%; padding: 15px; 
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO UNISWAP
            </button>
            
            <button onclick="loadExchangeIframe('https://pancakeswap.finance')" style="
                width: 100%; padding: 15px; 
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO PANCAKESWAP
            </button>

            <button onclick="loadExchangeIframe('https://curve.fi')" style="
                width: 100%; padding: 15px; 
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO CURVE FINANCE
            </button>

            <button onclick="loadExchangeIframe('https://sushi.com')" style="
                width: 100%; padding: 15px; 
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO SUSHISWAP
            </button>
        </div>
    `;
};

window.openD3XExchangePanel = function(dcData) {
  if (document.getElementById('master-node-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'master-node-overlay'; // Reuse same overlay ID so it closes correctly
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 20, 10, 0.85); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    font-family: 'Orbitron', sans-serif;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    width: 80%; max-width: 1400px; height: 85vh; max-height: 900px;
    background: linear-gradient(135deg, rgba(20,80,20,0.6) 0%, rgba(0,40,0,0.8) 100%);
    border: 3px solid #39ff14; border-radius: 12px;
    box-shadow: 0 0 50px rgba(57,255,20,0.5), inset 0 0 20px rgba(57,255,20,0.3);
    padding: 30px; display: flex; flex-direction: column; position: relative;
    overflow: hidden;
  `;

  modal.innerHTML = `
    <!-- Decorative glowing corner elements -->
    <div style="position:absolute; top:0; left:0; width:50px; height:50px; border-top:3px solid #39ff14; border-left:3px solid #39ff14; box-shadow: -5px -5px 15px rgba(57,255,20,0.5);"></div>
    <div style="position:absolute; bottom:0; right:0; width:50px; height:50px; border-bottom:3px solid #39ff14; border-right:3px solid #39ff14; box-shadow: 5px 5px 15px rgba(57,255,20,0.5);"></div>

    <button id="close-master-node" style="
      position:absolute; top:20px; right:20px; background:none; border:none; 
      color:#39ff14; font-size:24px; cursor:pointer; font-weight:bold;
    ">×</button>

    <h1 style="color:#39ff14; font-size:36px; text-align:center; text-shadow: 0 0 15px #39ff14; margin-top:0; border-bottom:1px solid rgba(57,255,20,0.5); padding-bottom:15px; text-transform:uppercase;">
      ❖ D3X EXCHANGE HUB ❖
    </h1>
    
    <div style="display:flex; justify-content:center; margin-bottom: 30px; border-bottom:1px solid rgba(57,255,20,0.3); padding-bottom:20px;">
      <div style="color:#39ff14; font-size:18px; letter-spacing: 2px;">
        <span style="opacity:0.7">STATUS:</span> <b style="text-shadow: 0 0 5px #39ff14">DECENTRALIZED AGGREGATION ONLINE</b>
      </div>
    </div>

    <div id="d3x-exchange-container" style="flex-grow:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border:1px dashed rgba(57,255,20,0.4); border-radius:8px; padding:20px; text-align:center; position:relative; overflow:hidden;">
        <h2 style="color:#ffffff; letter-spacing:2px; margin-bottom:30px; text-shadow:0 0 10px #39ff14;">ACQUIRE D3X TOKENS</h2>
        
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 1200px; padding-bottom: 20px; box-sizing: border-box;">
            <button onclick="loadExchangeIframe('https://raydium.io/swap/?position_tab=staked+RAY&inputMint=sol&outputMint=AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO RAYDIUM
            </button>
            
            <button onclick="loadExchangeIframe('https://jup.ag/swap/SOL-AGN8SrMCMEgiP1ghvPHa5VRf5rPFDSYVrGFyBGE1Cqpa')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO JUPITER
            </button>

            <button onclick="loadExchangeIframe('https://uniswap.org')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO UNISWAP
            </button>
            
            <button onclick="loadExchangeIframe('https://pancakeswap.finance')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO PANCAKESWAP
            </button>

            <button onclick="loadExchangeIframe('https://curve.fi')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO CURVE FINANCE
            </button>

            <button onclick="loadExchangeIframe('https://sushi.com')" style="
                width: 100%; padding: 15px; box-sizing: border-box;
                background: rgba(57,255,20,0.1); border: 2px solid #39ff14; color: #39ff14;
                font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; cursor:pointer;
                box-shadow: 0 0 15px rgba(57,255,20,0.3); transition: all 0.2s; font-family:'Orbitron', sans-serif;
            " onmouseover="this.style.background='rgba(57,255,20,0.3)'; this.style.boxShadow='0 0 25px rgba(57,255,20,0.6)';" onmouseout="this.style.background='rgba(57,255,20,0.1)'; this.style.boxShadow='0 0 15px rgba(57,255,20,0.3)';">
                ► PROCEED TO SUSHISWAP
            </button>
        </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('close-master-node').onclick = () => {
    overlay.remove();
    if(typeof _sfxClick !== 'undefined') _sfxClick();
  };
};

// =====================================================================
// MASTER NODE CUSTOM UI
// =====================================================================
window.openMasterNodePanel = function(dcData) {
  if (document.getElementById('master-node-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'master-node-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 0, 15, 0.85); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    font-family: 'Orbitron', sans-serif;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    width: 60%; max-width: 900px; height: 70vh; max-height: 800px;
    background: linear-gradient(135deg, rgba(80,0,120,0.3) 0%, rgba(150,50,0,0.3) 100%);
    border: 2px solid #aa00ff; border-radius: 12px;
    box-shadow: 0 0 40px rgba(170,0,255,0.4), inset 0 0 20px rgba(255,170,0,0.2);
    padding: 30px; display: flex; flex-direction: column; position: relative;
    overflow: hidden;
  `;

  modal.innerHTML = `
    <!-- Decorative glowing corner elements -->
    <div style="position:absolute; top:0; left:0; width:50px; height:50px; border-top:3px solid #ffaa00; border-left:3px solid #ffaa00; box-shadow: -5px -5px 15px rgba(255,170,0,0.5);"></div>
    <div style="position:absolute; bottom:0; right:0; width:50px; height:50px; border-bottom:3px solid #aa00ff; border-right:3px solid #aa00ff; box-shadow: 5px 5px 15px rgba(170,0,255,0.5);"></div>

    <button id="close-master-node" style="
      position:absolute; top:20px; right:20px; background:none; border:none; 
      color:#ffaa00; font-size:24px; cursor:pointer; font-weight:bold;
    ">×</button>

    <h1 style="color:#aa00ff; font-size:32px; text-shadow: 0 0 10px #aa00ff; margin-top:0; border-bottom:1px solid rgba(170,0,255,0.5); padding-bottom:15px; text-transform:uppercase;">
      ❖ ${dcData.protocolName ? dcData.protocolName + " " : ""}${dcData.name.replace('DATACENTER: ', '')}
    </h1>
    
    <div style="display:flex; justify-content:space-between; margin-bottom: 30px; border-bottom:1px solid rgba(255,170,0,0.3); padding-bottom:20px;">
      <div style="color:#ffaa00; font-size:16px;">
        <span style="opacity:0.7">STATUS:</span> <b style="text-shadow: 0 0 5px #ffaa00">ONLINE</b>
      </div>
      <div style="color:#aa00ff; font-size:16px;">
        <span style="opacity:0.7">FACTION:</span> <b style="text-shadow: 0 0 5px #aa00ff">D3X CORE</b>
      </div>
      <div style="color:#fff; font-size:16px;">
        <span style="opacity:0.7">CAPACITY:</span> <b>MAXIMUM</b>
      </div>
    </div>

    <div style="flex-grow:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border:1px dashed rgba(170,0,255,0.4); border-radius:8px;">
        ${dcData.iconUrl ? `<img src="${dcData.iconUrl}" referrerpolicy="no-referrer" crossorigin="anonymous" style="height: 120px; margin-bottom: 25px; filter: drop-shadow(0 0 15px #ffaa00);" />` : ''}
        <h2 style="color:#ffaa00; letter-spacing:3px; margin-bottom:10px;">${dcData.protocolName ? "CHAIN DEPLOYMENT ACTIVE" : "AWAITING CHAIN DEPLOYMENT"}</h2>
        <p style="color:#ccc; font-size:14px; text-align:center; max-width:600px; line-height:1.6;">
            ${dcData.protocolName ? `This Central Interlink Node is actively bridging <b>${dcData.protocolName}</b> protocol layers into the D3X Core network.` : `This Central Interlink Node is pre-configured to handle multi-chain aggregation and high-throughput routing. 
            <br><br>
            <span style="color:#aa00ff; font-style:italic;">[ FUTURE EXPANSION SLOT FOR BLOCKCHAIN PROTOCOL INTEGRATION ]</span>`}
        </p>
        <div id="btc-deposit-container" style="display:none; margin-top: 20px; padding: 15px; background: rgba(255,170,0,0.1); border: 1px solid #ffaa00; border-radius: 8px; text-align: center; width: 80%; max-width: 500px;">
            <div style="color: #ffaa00; font-size: 14px; margin-bottom: 5px; font-weight: bold; letter-spacing: 1px;">SUPPORT THE ECOSYSTEM</div>
            <div style="color: #fff; font-size: 11px; margin-bottom: 10px; opacity: 0.8;">Send BTC deposits to fuel the Citadel Campus.</div>
            <div style="display: flex; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,170,0,0.3); border-radius: 4px; overflow: hidden;">
                <input type="text" id="btc-wallet-address" readonly style="flex-grow: 1; background: transparent; border: none; color: #ffaa00; font-family: monospace; padding: 10px; outline: none; text-align: center; font-size: 14px;" value="LOADING ADDRESS..."/>
                <button id="copy-btc-btn" style="background: rgba(255,170,0,0.2); border: none; border-left: 1px solid rgba(255,170,0,0.3); color: #ffaa00; padding: 0 15px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: bold; transition: background 0.2s;">COPY</button>
            </div>
        </div>
        <div id="eth-deposit-container" style="display:none; margin-top: 20px; padding: 15px; background: rgba(170,0,255,0.1); border: 1px solid #aa00ff; border-radius: 8px; text-align: center; width: 80%; max-width: 500px;">
            <div style="color: #aa00ff; font-size: 14px; margin-bottom: 5px; font-weight: bold; letter-spacing: 1px;">EVM DEPLOYMENT LAYER</div>
            <div style="color: #fff; font-size: 11px; margin-bottom: 10px; opacity: 0.8;">Send ETH deposits to initialize the Frankfurt Node.</div>
            <div style="display: flex; background: rgba(0,0,0,0.5); border: 1px solid rgba(170,0,255,0.3); border-radius: 4px; overflow: hidden;">
                <input type="text" id="eth-wallet-address" readonly style="flex-grow: 1; background: transparent; border: none; color: #aa00ff; font-family: monospace; padding: 10px; outline: none; text-align: center; font-size: 14px;" value="LOADING ADDRESS..."/>
                <button id="copy-eth-btn" style="background: rgba(170,0,255,0.2); border: none; border-left: 1px solid rgba(170,0,255,0.3); color: #aa00ff; padding: 0 15px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: bold; transition: background 0.2s;">COPY</button>
            </div>
        </div>
        <div id="sol-deposit-container" style="display:none; margin-top: 20px; padding: 15px; background: rgba(0,255,150,0.1); border: 1px solid #00ff96; border-radius: 8px; text-align: center; width: 80%; max-width: 500px;">
            <div style="color: #00ff96; font-size: 14px; margin-bottom: 5px; font-weight: bold; letter-spacing: 1px;">SOL DEPLOYMENT LAYER</div>
            <div style="color: #fff; font-size: 11px; margin-bottom: 10px; opacity: 0.8;">Send SOL deposits to initialize the Solana Node.</div>
            <div style="display: flex; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,150,0.3); border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
                <input type="text" id="sol-wallet-address" readonly style="flex-grow: 1; background: transparent; border: none; color: #00ff96; font-family: monospace; padding: 10px; outline: none; text-align: center; font-size: 14px;" value="LOADING ADDRESS..."/>
                <button id="copy-sol-btn" style="background: rgba(0,255,150,0.2); border: none; border-left: 1px solid rgba(0,255,150,0.3); color: #00ff96; padding: 0 15px; cursor: pointer; font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: bold; transition: background 0.2s;">COPY</button>
            </div>
            
            <div style="display: flex; align-items: stretch; justify-content: center; margin-top: 15px;">
                <input type="number" id="sol-donation-amount" placeholder="Amount SOL" step="0.1" min="0.1" style="width: 120px; background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,150,0.5); color: #00ff96; padding: 8px; border-radius: 4px 0 0 4px; font-family: 'Orbitron', sans-serif; text-align: center; outline: none;">
                <button id="btn-sol-donate" onclick="triggerSolanaDonation()" style="background: rgba(0,255,150,0.2); border: 1px solid rgba(0,255,150,0.5); border-left: none; color: #00ff96; padding: 8px 15px; border-radius: 0 4px 4px 0; font-family: 'Orbitron', sans-serif; font-weight: bold; cursor: pointer; transition: background 0.2s;">SEND SUPPORT</button>
            </div>
        </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('close-master-node').onclick = () => {
    overlay.remove();
    if(typeof _sfxClick !== 'undefined') _sfxClick();
  };

  // If this is the BTC master node, fetch and display the wallet address
  if (dcData.protocolName === 'BTC') {
      const depositContainer = document.getElementById('btc-deposit-container');
      const addressInput = document.getElementById('btc-wallet-address');
      const copyBtn = document.getElementById('copy-btc-btn');
      
      depositContainer.style.display = 'block';

      fetch('/api/wallet')
          .then(res => res.json())
          .then(data => {
              if (data.btcWallet && data.btcWallet !== 'NOT_SET') {
                  addressInput.value = data.btcWallet;
              } else {
                  addressInput.value = "PROTOCOL OFFLINE";
                  copyBtn.disabled = true;
                  copyBtn.style.opacity = '0.5';
              }
          })
          .catch(err => {
              console.error('Failed to fetch BTC wallet:', err);
              addressInput.value = "CONNECTION FAILED";
          });

      copyBtn.onclick = () => {
          navigator.clipboard.writeText(addressInput.value).then(() => {
              const prevText = copyBtn.innerText;
              copyBtn.innerText = "COPIED!";
              copyBtn.style.background = 'rgba(57,255,20,0.3)';
              copyBtn.style.color = '#39ff14';
              setTimeout(() => {
                  copyBtn.innerText = prevText;
                  copyBtn.style.background = 'rgba(255,170,0,0.2)';
                  copyBtn.style.color = '#ffaa00';
              }, 2000);
          });
      };
  } else if (dcData.protocolName === 'EVM') {
      const depositContainer = document.getElementById('eth-deposit-container');
      const addressInput = document.getElementById('eth-wallet-address');
      const copyBtn = document.getElementById('copy-eth-btn');
      
      depositContainer.style.display = 'block';

      fetch('/api/wallet')
          .then(res => res.json())
          .then(data => {
              if (data.ethWallet && data.ethWallet !== 'NOT_SET') {
                  addressInput.value = data.ethWallet;
              } else {
                  addressInput.value = "PROTOCOL OFFLINE";
                  copyBtn.disabled = true;
                  copyBtn.style.opacity = '0.5';
              }
          })
          .catch(err => {
              console.error('Failed to fetch ETH wallet:', err);
              addressInput.value = "CONNECTION FAILED";
          });

      copyBtn.onclick = () => {
          navigator.clipboard.writeText(addressInput.value).then(() => {
              const prevText = copyBtn.innerText;
              copyBtn.innerText = "COPIED!";
              copyBtn.style.background = 'rgba(57,255,20,0.3)';
              copyBtn.style.color = '#39ff14';
              setTimeout(() => {
                  copyBtn.innerText = prevText;
                  copyBtn.style.background = 'rgba(170,0,255,0.2)';
                  copyBtn.style.color = '#aa00ff';
              }, 2000);
          });
      };
  } else if (dcData.protocolName === 'XLM') {
      const depositContainer = document.getElementById('eth-deposit-container');
      const addressInput = document.getElementById('eth-wallet-address');
      const copyBtn = document.getElementById('copy-eth-btn');
      
      depositContainer.style.display = 'block';

      // Update UI labels for XLM
      depositContainer.style.background = 'rgba(20, 182, 230, 0.1)';
      depositContainer.style.borderColor = '#14b6e6';
      
      const titleLabel = depositContainer.querySelector('div:nth-child(1)');
      titleLabel.style.color = '#14b6e6';
      titleLabel.innerText = "XLM DEPLOYMENT LAYER";
      
      const subtitleLabel = depositContainer.querySelector('div:nth-child(2)');
      subtitleLabel.innerText = "Send XLM deposits to initialize the Singapore Node.";
      
      const inputWrapper = depositContainer.querySelector('div:nth-child(3)');
      inputWrapper.style.borderColor = 'rgba(20, 182, 230, 0.3)';
      
      addressInput.style.color = '#14b6e6';
      copyBtn.style.color = '#14b6e6';
      copyBtn.style.background = 'rgba(20, 182, 230, 0.2)';
      copyBtn.style.borderLeftColor = 'rgba(20, 182, 230, 0.3)';

      fetch('/api/wallet')
          .then(res => res.json())
          .then(data => {
              if (data.xlmWallet && data.xlmWallet !== 'NOT_SET') {
                  addressInput.value = data.xlmWallet;
              } else {
                  addressInput.value = "PROTOCOL OFFLINE";
                  copyBtn.disabled = true;
                  copyBtn.style.opacity = '0.5';
              }
          })
          .catch(err => {
              console.error('Failed to fetch XLM wallet:', err);
              addressInput.value = "CONNECTION FAILED";
          });

      copyBtn.onclick = () => {
          navigator.clipboard.writeText(addressInput.value).then(() => {
              const prevText = copyBtn.innerText;
              copyBtn.innerText = "COPIED!";
              copyBtn.style.background = 'rgba(57,255,20,0.3)';
              copyBtn.style.color = '#39ff14';
              setTimeout(() => {
                  copyBtn.innerText = prevText;
                  copyBtn.style.background = 'rgba(20, 182, 230, 0.2)';
                  copyBtn.style.color = '#14b6e6';
              }, 2000);
          });
      };
  } else if (dcData.protocolName === 'SOL') {
      const depositContainer = document.getElementById('sol-deposit-container');
      const addressInput = document.getElementById('sol-wallet-address');
      const copyBtn = document.getElementById('copy-sol-btn');
      
      depositContainer.style.display = 'block';

      fetch('/api/wallet')
          .then(res => res.json())
          .then(data => {
              if (data.solWallet && data.solWallet !== 'NOT_SET') {
                  addressInput.value = data.solWallet;
              } else {
                  addressInput.value = "PROTOCOL OFFLINE";
                  copyBtn.disabled = true;
                  copyBtn.style.opacity = '0.5';
              }
          })
          .catch(err => {
              console.error('Failed to fetch SOL wallet:', err);
              addressInput.value = "CONNECTION FAILED";
          });

      copyBtn.onclick = () => {
          navigator.clipboard.writeText(addressInput.value).then(() => {
              const prevText = copyBtn.innerText;
              copyBtn.innerText = "COPIED!";
              copyBtn.style.background = 'rgba(0,255,150,0.3)';
              copyBtn.style.color = '#00ff96';
              setTimeout(() => {
                  copyBtn.innerText = prevText;
                  copyBtn.style.background = 'rgba(0,255,150,0.2)';
                  copyBtn.style.color = '#00ff96';
              }, 2000);
          });
      };
  }
};

window.triggerSolanaDonation = async function() {
    try {
        const amountInput = document.getElementById('sol-donation-amount');
        const amount = parseFloat(amountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount of SOL to send.");
            return;
        }

        const provider = window.solana;
        if (!provider || !provider.isPhantom) {
            alert("Phantom Extention not found. Please install the Phantom Wallet extension.");
            return;
        }

        if (!provider.publicKey) {
            await provider.connect();
        }

        const targetWallet = document.getElementById('sol-wallet-address').value;
        if (!targetWallet || targetWallet.includes("OFFLINE") || targetWallet.includes("LOADING") || targetWallet.includes("FAILED")) {
            alert("Solana deployment layer is currently offline or the target address is invalid.");
            return;
        }

        // Fetch recent blockhash from backend solana connection via an API call
        const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3;
        
        // Ensure web3.js is loaded
        if (!window.solanaWeb3) {
             alert("Solana Web3.js library not loaded. Please try again later.");
             return;
        }

        const connection = new window.solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
        
        const lamports = amount * window.solanaWeb3.LAMPORTS_PER_SOL;
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: provider.publicKey,
                toPubkey: new PublicKey(targetWallet),
                lamports: lamports,
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = provider.publicKey;

        const { signature } = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature, 'processed');

        alert(`Successfully sent ${amount} SOL support to the deployment layer! Signature: ${signature}`);
        amountInput.value = '';

    } catch (err) {
        console.error("Solana donation failed:", err);
        alert(`Transaction Failed: ${err.message || 'Unknown error'}`);
    }
};

  // Intercept clicks on World Bank (Cyber Skin)
  if (window.currentSkinIndex === 3 && window.worldBankGroup && window.worldBankGroup.visible && window.worldBankGroup.children.length > 0) {
    const wbHits = ray.intersectObjects(window.worldBankGroup.children, true);
    if (wbHits.length > 0) {
      if (typeof _sfxClick !== 'undefined') _sfxClick();
      const wbModal = document.getElementById('world-bank-modal');
      // The body has transform:scale(0.75) which makes 100vh = 75% of real screen.
      // To truly fill the screen we must compensate: divide by 0.75
      const scale = 0.75;
      const trueW = window.screen.width / scale;
      const trueH = window.screen.height / scale;
      wbModal.style.width = trueW + 'px';
      wbModal.style.height = trueH + 'px';
      wbModal.style.left = '0px';
      wbModal.style.top = '0px';
      wbModal.style.display = 'flex';
      // Request latest World Bank stats from server
      if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'get_world_bank_stats' }));
      }
      return; 
    }
  }

  // Intercept clicks on Treasury (Cyber Skin)
  if (window.currentSkinIndex === 3 && window.treasuryGroup && window.treasuryGroup.visible && window.treasuryGroup.children.length > 0) {
    const treasuryHits = ray.intersectObjects(window.treasuryGroup.children, true);
    if (treasuryHits.length > 0) {
      if (typeof _sfxClick !== 'undefined') _sfxClick();
      let tsModal = document.getElementById('treasury-modal');
      if (!tsModal) {
          alert("TREASURY PROTOCOLS: ONLINE. Interface pending connection...");
          return;
      }
      const scale = 0.75;
      const trueW = window.screen.width / scale;
      const trueH = window.screen.height / scale;
      tsModal.style.width = trueW + 'px';
      tsModal.style.height = trueH + 'px';
      tsModal.style.left = '0px';
      tsModal.style.top = '0px';
      tsModal.style.display = 'flex';
      
      // Fetch Treasury Data
      fetch('/api/treasury/status')
          .then(res => res.json())
          .then(data => {
              document.getElementById('treasury-bond-address').textContent = data.treasury_wallet || 'NOT_SET';
              document.getElementById('treasury-d3x-balance').textContent = (data.treasury_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
              
              const tbl = document.getElementById('treasury-metals-table');
              tbl.innerHTML = '';
              const metals = data.metals_reserves || {};
              const keys = Object.keys(metals);
              if (keys.length === 0) {
                  tbl.innerHTML = '<tr><td style="color:#f55;">NO RESERVES FOUND</td></tr>';
              } else {
                  keys.forEach(k => {
                      const amount = (metals[k] || 0).toLocaleString();
                      tbl.innerHTML += `<tr><td style="color:#aaa;">${k.toUpperCase()}</td><td style="text-align:right; font-weight:bold;">${amount} TONNES</td></tr>`;
                  });
              }
          }).catch(e => console.error("Treasury fetch fail:", e));

      return; 
    }
  }

  // Intercept clicks on Datacenters (Cyber Skin)
  if (window.currentSkinIndex === 3 && window.datacentersGroup && window.datacentersGroup.visible && window.datacentersGroup.children.length > 0) {
    // Search children heavily because of auras and inner sprites on staking towers
    const dcHits = ray.intersectObjects(window.datacentersGroup.children, true);
    if (dcHits.length > 0) {
      if (typeof _sfxClick !== 'undefined') _sfxClick();
      
      // Find the topmost parent mesh
      let topMesh = dcHits[0].object;
      while (topMesh.parent && topMesh.parent !== window.datacentersGroup && topMesh.parent.type !== 'Scene') {
          topMesh = topMesh.parent;
      }
      
      const dcData = topMesh.userData;
      
      // Ignore clicks on North Pole Tesla coils
      if (dcData && dcData.isNorthPole) return;

      if (dcData && dcData.type === 'staking_tower') {
          window.selectedStakingTower = topMesh;
          document.getElementById('staking-tower-node-name').textContent = dcData.protocol || 'D3X CORE NETWORK';
          document.getElementById('staking-tower-balance').textContent = window.localD3XBalance ? window.localD3XBalance.toFixed(2) : '0.00';
          document.getElementById('staking-tower-active').textContent = (Math.random() * 50).toFixed(2) + ' D3X';
          document.getElementById('staking-tower-modal').style.display = 'flex';
          document.getElementById('datacenter-action-panel').style.display = 'none'; // Close DC panel if open
          return;
      }
      
      if (dcData && dcData.name && !dcData.type) {
        if (dcData.isD3XExchange) {
            window.openD3XExchangePanel(dcData);
            return;
        }
        if (dcData.isMasterNode) {
            window.openMasterNodePanel(dcData);
            return;
        }
        if (dcData.owner !== 'GEMINI') return; // Do nothing for Rainclaude datacenters
        window.openDatacenterCoopPanel(dcData);
        return; // Intercept click
      }
    }
  }


  // Prioritize clicking exactly on a Troop Box
  let iso = null;
  const spriteHits = ray.intersectObjects(Object.values(troopSprites), false);
  if (spriteHits.length > 0) {
    iso = spriteHits[0].object.userData.iso;
  } else {
    // Fallback to globe landmass raycast
    const hits = ray.intersectObject(globeMesh, false);
    if (!hits.length) return;
    const pt = hits[0].point.normalize();
    const lat = Math.asin(pt.y)/RAD; 
    const lon = Math.atan2(pt.z,pt.x)/RAD; 
    iso = getCountryAt(lat, lon);
  }

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

  // The D3X Mining Caves click handler has been consolidated earlier in handleGlobeClick

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
  const hits = ray.intersectObjects(Object.values(troopSprites),false);
  const tip = document.getElementById('tip');
  if(hits.length) {
    const iso = hits[0].object.userData.iso;
    const c = GS.countries[iso]; const cd=countryData[iso];
    if(c && cd) {
      const owner = c.owner===-1?'NEUTRAL':PLAYER_COLORS[c.owner]?.name||'?';
      tip.classList.add('show');
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px';
      tip.innerHTML=`<b>${cd.name}</b><br>${owner} · ${(c.troops * 10000).toLocaleString()} troops${c.nuked?'<br>☢ FALLOUT':''}`
    }
  } else tip.classList.remove('show');
});

// --- GREEN SKIN MARKET SYSTEM ---
window.greenMarket = {
  commodities: {
    // METALS (Prices in base D3X Equivalent)
    'Copper': { price: 8.50, vol: 0.02, shares: 0, history: [8.50] }, 
    'Lithium': { price: 35.00, vol: 0.05, shares: 0, history: [35.00] }, 
    'Rare Earth Elements': { price: 120.00, vol: 0.08, shares: 0, history: [120.00] },
    'Iron ore': { price: 1.20, vol: 0.01, shares: 0, history: [1.20] }, 
    'Gold': { price: 2150.00, vol: 0.015, shares: 0, history: [2150.00] }, 
    'Nickel': { price: 18.50, vol: 0.03, shares: 0, history: [18.50] }, 
    'Tin': { price: 27.00, vol: 0.04, shares: 0, history: [27.00] },
    'Aluminum (Bauxite)': { price: 2.50, vol: 0.02, shares: 0, history: [2.50] },
    'Aluminum': { price: 4.80, vol: 0.02, shares: 0, history: [4.80] }, 
    'Cobalt': { price: 28.00, vol: 0.06, shares: 0, history: [28.00] },
    
    // NATURAL RESOURCES
    'Lumber (Wood)': { price: 0.50, vol: 0.015, shares: 0, history: [0.50] },
    'Freshwater': { price: 0.10, vol: 0.005, shares: 0, history: [0.10] },
    'Natural Gas': { price: 3.50, vol: 0.04, shares: 0, history: [3.50] },
    'Crude Oil': { price: 78.50, vol: 0.03, shares: 0, history: [78.50] },
    'Wheat': { price: 0.60, vol: 0.02, shares: 0, history: [0.60] },
    
    // TECH & COMPUTE HARDWARE (Premium D3X Assets)
    'NVIDIA H100 Tensor Core': { price: 35000.00, vol: 0.08, shares: 0, history: [35000.00] },
    'NVIDIA A100 80GB': { price: 12000.00, vol: 0.05, shares: 0, history: [12000.00] },
    'Google Cloud TPU v5e': { price: 9500.00, vol: 0.06, shares: 0, history: [9500.00] },
    'AMD EPYC 9004 CPUs': { price: 4500.00, vol: 0.04, shares: 0, history: [4500.00] },
    'DDR5 ECC RAM (128GB)': { price: 380.00, vol: 0.03, shares: 0, history: [380.00] },
    'Enterprise NVMe SSD (15TB)': { price: 1250.00, vol: 0.02, shares: 0, history: [1250.00] },
    'Compute Motherboards (Dual Socket)': { price: 1100.00, vol: 0.015, shares: 0, history: [1100.00] },
    'Titanium Grade PSUs (2000W)': { price: 550.00, vol: 0.01, shares: 0, history: [550.00] },
    'Direct-to-Chip Liquid Cooling Units': { price: 5500.00, vol: 0.02, shares: 0, history: [5500.00] },
    'Networking Switches (400GbE)': { price: 18000.00, vol: 0.035, shares: 0, history: [18000.00] }
  },
  lastUpdate: Date.now()
};

function initGreenMarketUI() {
  // Deprecated: UI is now merged directly into green-skin-info tracker bar.
}

function updateGreenMarket() {
  const isGreen = (window.currentSkinIndex === 3);

  let totalWorth = 0;
  let holdingsHtml = '';

  Object.keys(window.greenMarket.commodities).forEach(k => {
    let c = window.greenMarket.commodities[k];
    
    if (!c.basePrice) c.basePrice = c.price;
    if (typeof c.avgCost === 'undefined') c.avgCost = 0;
    if (typeof c.totalSpent === 'undefined') c.totalSpent = 0;
    
    // Server now controls all volatility drift and history accumulation!
    // We just render their provided properties.

    let trend = c.history[c.history.length-1] >= c.history[c.history.length-2] ? '<span style="color:#0f0">▲</span>' : '<span style="color:#f00">▼</span>';
    let shareVal = c.price; // Native D3X value

    totalWorth += (c.shares * shareVal);

    if (c.shares > 0) {
      let unrealizedPnL = (shareVal - c.avgCost) * c.shares;
      let pnlColor = unrealizedPnL >= 0 ? '#0f0' : '#f00';
      let pnlSign = unrealizedPnL >= 0 ? '+' : '';
      
      holdingsHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; background:rgba(0,255,136,0.1); padding:4px; border-radius:3px; border:1px solid rgba(0,255,136,0.2); font-size:9px;">
          <span style="color:#fff">${k} <span style="color:#0f8; font-weight:bold; margin-left:3px;">x${c.shares}</span></span>
          <span style="color:${pnlColor}; font-family:'Orbitron', monospace; font-size:9px;">[${pnlSign}${unrealizedPnL.toFixed(2)}]</span>
          <span style="font-family:'Orbitron', monospace; font-size:10px; font-weight:bold; text-align:right;">${trend} ${shareVal.toFixed(2)} D3X</span>
        </div>
      `;
    }

    // Refresh UI Modal Buttons if they are visible
    const safeK = k.replace(/[^a-zA-Z]/g, '');
    const priceEl = document.getElementById(`market-price-${safeK}`);
    const sellBtn = document.getElementById(`market-sell-${safeK}`);
    if (priceEl) {
        priceEl.innerHTML = `${trend} ${shareVal.toFixed(2)} D3X <span style="font-size:10px; color:#aaa; font-weight:normal;">/ UNIT</span>`;
    }
    if (sellBtn) {
       sellBtn.style.opacity = c.shares > 0 ? '1' : '0.3';
       sellBtn.disabled = c.shares === 0;
    }
  });

  const networthEl = document.getElementById('green-market-networth');
  if (networthEl) {
    networthEl.innerText = totalWorth.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + ' D3X';
    if (holdingsHtml === '') holdingsHtml = ''; // Removed empty state text
    document.getElementById('green-market-holdings').innerHTML = holdingsHtml;
  }
  
  // Auto-refresh the main ledger modal if it's currently open
  if (document.getElementById('gmarket-ledger-modal')) {
      window.showGMarketWallet();
  }
}

window.tradeGreenMetal = function(metalName, amount) {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const c = window.greenMarket?.commodities[metalName];
  if (!c) return;

  if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      // Send secure request to backend instead of calculating locally
      window.ws.send(JSON.stringify({
          type: 'trade_green_resource',
          metal: metalName,
          amount: amount
      }));
  } else {
      if (typeof setLog === 'function') setLog(`❌ NETWORK ERROR: Cannot reach Green Market exchange.`);
  }
};

window.simulateGreenMarketAI = function() {
    // Only run this processing if companies exists
    if (!window.companiesGroup) return;

    let allCompanies = [];
    const groups = [window.companiesGroup, window.mediumCompaniesGroup, window.africaCompaniesGroup, window.microCompaniesGroup, window.russiaAsiaCompaniesGroup];
    groups.forEach(g => {
        if(g && g.children) allCompanies.push(...g.children.filter(mesh => mesh.visible && mesh.userData && mesh.userData.name));
    });

    if (allCompanies.length === 0 || !window.greenMarket || !window.greenMarket.commodities) return;
    
    const commoditiesArr = Object.keys(window.greenMarket.commodities);

    // 5 AI Trades per tick
    for (let i = 0; i < 5; i++) {
        let trader = allCompanies[Math.floor(Math.random() * allCompanies.length)].userData;
        let cName = commoditiesArr[Math.floor(Math.random() * commoditiesArr.length)];
        let c = window.greenMarket.commodities[cName];
        
        let isBuy = Math.random() > 0.5;
        let pChange = 0;

        // Initialize basePrice if not set
        if (!c.basePrice) c.basePrice = c.price;

        if (isBuy) {
            // AI Bought -> Demand + -> Price +
            pChange = 1.002;
            c.price *= pChange;
        } else {
            // AI Sold -> Demand - -> Price -
            pChange = 0.998;
            c.price = Math.max(c.basePrice * 0.1, c.price * pChange);
        }

        // Just to visually show that SOME trade happened if the user is looking at the terminal
        if (Math.random() < 0.05 && window.currentSkinIndex === 3) {
            const termBox = document.getElementById('d1-reasoning');
            if (termBox) {
                const action = isBuy ? '<span style="color:#0f8">BOUGHT</span>' : '<span style="color:#f55">SOLD</span>';
                const div = document.createElement('div');
                div.innerHTML = `> [MARKET] <span style="color:#fff">${trader.name}</span> AI ${action} $${Array(Math.floor(Math.random()*5)+1).fill('M').join('')} in ${cName}`;
                termBox.appendChild(div);
                if (termBox.childElementCount > 30) termBox.removeChild(termBox.firstChild);
                termBox.scrollTop = termBox.scrollHeight;
            }
        }
    }
};

updateGreenMarket(); // Initial render to prevent 2-3s delay on script load
// NOTE: setInterval(updateGreenMarket, 3000) was removed. UI is now entirely updated via server's 'green_market_sync' WebSockets.
setInterval(window.simulateGreenMarketAI, 3000);

window.showGMarketWallet = function() {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  
  if (window.localD3XBalance === undefined) window.localD3XBalance = 0;
  
  let modal = document.getElementById('gmarket-ledger-modal');
  let contentBox;
  let oldScroll = 0;

  if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gmarket-ledger-modal';
      modal.style.cssText = 'position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100vw !important; height:100vh !important; background:rgba(0,18,8,0.95) !important; z-index:999999 !important; display:flex; flex-direction:column; font-family:"Orbitron", sans-serif; backdrop-filter:blur(15px); margin:0 !important; padding:0 !important; box-sizing:border-box !important; border:none !important; border-radius:0 !important;';
      const header = document.createElement('div');
      header.style.padding = '15px';
      header.style.color = '#fff';
      header.style.backgroundColor = 'rgba(0,100,50,0.5)';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.borderBottom = '1px solid #0f8';
      header.innerHTML = `
        <span style="font-size:16px; font-weight:bold; letter-spacing:2px; color:#0f8;">💼 G-MARKET ASSET LEDGER</span>
        <span style="cursor:pointer; color:#f22; font-size:12px; border:1px solid #f22; padding:4px 8px; border-radius:3px; background:rgba(255,0,0,0.1);" onmouseover="this.style.background='rgba(255,0,0,0.3)';" onmouseout="this.style.background='rgba(255,0,0,0.1)';" onclick="this.parentElement.parentElement.remove(); if(typeof _sfxClick !== 'undefined') _sfxClick();">[CLOSE]</span>
      `;
      
      contentBox = document.createElement('div');
      contentBox.id = 'gmarket-ledger-content';
      contentBox.style.padding = '20px';
      contentBox.style.color = '#ddd';
      contentBox.style.flex = '1';
      contentBox.style.overflowY = 'auto';
      
      modal.appendChild(header);
      modal.appendChild(contentBox);
      document.documentElement.appendChild(modal);
  } else {
      contentBox = document.getElementById('gmarket-ledger-content');
      oldScroll = contentBox.scrollTop;
  }

  let listHtml = `<table style="width:100%; border-collapse:collapse; font-size:13px;">
    <tr style="border-bottom:1px dashed #0f8; color:#0f8;">
      <th style="padding:10px 8px; text-align:left;">RESOURCE</th>
      <th style="padding:10px 8px; text-align:right;">AVG COST</th>
      <th style="padding:10px 8px; text-align:right;">CUR. PRICE</th>
      <th style="padding:10px 8px; text-align:right;">OWNED</th>
      <th style="padding:10px 8px; text-align:right;">UNREALIZED P&L</th>
      <th style="padding:10px 8px; text-align:center;">TRADE ACTIONS</th>
    </tr>`;

  let totalVal = 0;

  Object.keys(window.greenMarket.commodities).forEach(k => {
    let c = window.greenMarket.commodities[k];
    let shareVal = c.price; 
    let holdVal = c.shares * Math.max(0, shareVal);
    totalVal += holdVal;
    
    let trend = '';
    if (c.history.length >= 2) {
       trend = c.history[c.history.length-1] >= c.history[c.history.length-2] ? '<span style="color:#0f0">▲</span>' : '<span style="color:#f00">▼</span>';
    }

    let avgCostStr = (c.avgCost && c.shares > 0) ? c.avgCost.toFixed(2) : '-.--';
    
    let pnlHtml = '-.--';
    if (c.shares > 0) {
        let pnl = (shareVal - c.avgCost) * c.shares;
        let pColor = pnl >= 0 ? '#0f0' : '#f00';
        let pSign = pnl >= 0 ? '+' : '';
        pnlHtml = `<span style="color:${pColor}; font-weight:bold;">${pSign}${pnl.toFixed(2)} D3X</span>`;
    }

    listHtml += `
      <tr style="border-bottom:1px solid rgba(0,255,136,0.15);">
        <td style="padding:10px 8px; color:#fff; font-weight:bold;">${parseInt(c.shares) > 0 ? '▶ ' : ''}${k}</td>
        <td style="padding:10px 8px; text-align:right; font-family:'Courier New', monospace; color:#aaa;">${avgCostStr}</td>
        <td style="padding:10px 8px; text-align:right; font-family:'Courier New', monospace; font-weight:bold;">${trend} ${shareVal.toFixed(2)} D3X</td>
        <td style="padding:10px 8px; text-align:right; font-weight:bold; color:${c.shares > 0 ? '#0f8' : '#aaa'};">${c.shares}</td>
        <td style="padding:10px 8px; text-align:right; font-family:'Courier New', monospace;">${pnlHtml}</td>
        <td style="padding:10px 8px; text-align:center;">
          <button onclick="tradeGreenMetal('${k}', 1); showGMarketWallet();" style="background:none; border:1px solid #0f8; color:#0f8; font-family:'Orbitron', sans-serif; font-size:10px; padding:4px 10px; cursor:pointer; border-radius:3px; transition:0.2s;" onmouseover="this.style.background='#0f8'; this.style.color='#000';" onmouseout="this.style.background='none'; this.style.color='#0f8';">BUY</button>
          <button onclick="tradeGreenMetal('${k}', -1); showGMarketWallet();" style="background:none; border:1px solid #f22; color:#f22; font-family:'Orbitron', sans-serif; font-size:10px; padding:4px 10px; cursor:pointer; border-radius:3px; transition:0.2s; opacity:${c.shares > 0 ? 1 : 0.4}; margin-left:8px;" ${c.shares > 0 ? '' : 'disabled'} onmouseover="this.style.background='#f22'; this.style.color='#fff';" onmouseout="this.style.background='none'; this.style.color='#f22';">SELL</button>
        </td>
      </tr>
    `;
  });

  listHtml += `</table>`;
  
  // Create trade history log section
  let historyHtml = `<div style="margin-top:20px; border-top:1px dashed #0f8; padding-top:15px;">
    <h4 style="margin:0 0 10px 0; color:#0f8; font-size:14px; letter-spacing:1px;">📜 TRADE HISTORY</h4>
    <div id="gmarket-trade-log" style="background:rgba(0,10,5,0.8); border:1px solid rgba(0,255,136,0.3); height:120px; overflow-y:auto; padding:10px; font-family:'Share Tech Mono', monospace; font-size:12px; border-radius:4px;">
  `;
  
  if (!window.greenMarket.tradeLogs || window.greenMarket.tradeLogs.length === 0) {
      historyHtml += `<span style="color:#aaa;">No trades executed yet...</span>`;
  } else {
      window.greenMarket.tradeLogs.slice().reverse().forEach(log => {
          historyHtml += `<div style="margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px;">${log}</div>`;
      });
  }
  historyHtml += `</div></div>`;
  
  listHtml += historyHtml;
  
  listHtml += `
  <div style="display:flex; justify-content:space-between; margin-top:15px; padding-top:15px; border-top:1px solid #0f8;">
    <div style="font-size:14px; font-weight:bold; color:#aaa; font-family:'Courier New', monospace;">
      AVAILABLE WALLET BALANCE: <span style="color:#fff;">${window.localD3XBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} D3X</span>
    </div>
    <div style="text-align:right; font-size:16px; font-weight:bold; color:#fff;">
      NET WORTH (HOLDINGS): <span style="color:#0f8; font-family:'Courier New', monospace;">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} D3X</span>
    </div>
  </div>`;
  
  contentBox.innerHTML = listHtml;
  contentBox.scrollTop = oldScroll;
};

// ------------------------------

function showGreenSkinResourceModal(iso) {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const cd = countryData[iso] || {name: iso};
  const cName = cd.name.toUpperCase();
  
  // Custom tailored metals data for major global producers
  const METALS_DATA = {
    'CHILE': [
      { name: 'Copper', color: '#b87333', desc: 'Codelco state monopoly, world\'s largest producer.' },
      { name: 'Lithium', color: '#e6e6fa', desc: 'Ongoing nationalization efforts and strict state oversight.' }
    ],
    'CHINA': [
      { name: 'Aluminum (Bauxite)', color: '#d9d9d9', desc: 'State-owned enterprises like Aluminum Corporation of China (Chalco).' },
      { name: 'Copper', color: '#b87333', desc: 'State-owned giants like Zijin.' },
      { name: 'Rare Earth Elements', color: '#ffb6c1', desc: 'China Rare Earth Group and strict state dominance of processing.' },
      { name: 'Iron ore', color: '#a19d94', desc: 'State-dominated giants and consolidation efforts.' },
      { name: 'Gold', color: '#ffd700', desc: 'State-owned or consolidated mining firms.' }
    ],
    'INDONESIA': [
      { name: 'Nickel', color: '#c0c0c0', desc: 'MIND ID stakes and significant state holding in producers like Vale Indonesia.' },
      { name: 'Copper', color: '#b87333', desc: 'Government majority stakes and oversight in operations like Freeport.' },
      { name: 'Tin', color: '#d3d4d5', desc: 'State gatekeeping and management of production.' }
    ],
    'RUSSIA': [
      { name: 'Iron ore', color: '#a19d94', desc: 'State-linked or heavily regulated firms.' },
      { name: 'Nickel', color: '#c0c0c0', desc: 'Heavy state influence and regulation.' },
      { name: 'Gold', color: '#ffd700', desc: 'Heavy government oversight.' }
    ],
    'PERU': [
      { name: 'Copper', color: '#b87333', desc: 'Significant government stakes, oversight, and regulation.' }
    ],
    'BRAZIL': [
      { name: 'Iron ore', color: '#a19d94', desc: 'Public resource management and strategic oversight.' }
    ],
    'GUINEA': [
      { name: 'Aluminum', color: '#d9d9d9', desc: 'Government leasing and strategic state partnerships.' }
    ],
    'MEXICO': [
      { name: 'Lithium', color: '#e6e6fa', desc: 'State enterprise Litio para Mexico after nationalization of reserves.' }
    ],
    'ARGENTINA': [
      { name: 'Lithium', color: '#e6e6fa', desc: 'Government resource management in the lithium triangle.' }
    ],
    'BOLIVIA': [
      { name: 'Lithium', color: '#e6e6fa', desc: 'Stringent government resource management in the lithium triangle.' }
    ],
    'DEMOCRATIC REPUBLIC OF THE CONGO': [
      { name: 'Cobalt', color: '#0047ab', desc: 'Government oversight, state partnerships, and regulations on foreign mining.' }
    ]
  };

  let metalsHtml = '';
  // Check if we have tailored metal data for this exact country name
  if (METALS_DATA[cName]) {
    metalsHtml = `<div style="margin-top:15px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
      <b style="color:#0f8; font-size:13px; display:block; margin-bottom:10px;">★ STATE-CONTROLLED METALS</b>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">`;
    METALS_DATA[cName].forEach(m => {
      let tradeHtml = '';
      if (window.greenMarket && window.greenMarket.commodities[m.name]) {
          const safeK = m.name.replace(/[^a-zA-Z]/g, '');
          const c = window.greenMarket.commodities[m.name];
          const priceMIL = (c.price / 100).toFixed(2);
          tradeHtml = `
            <div style="margin-top:10px; padding-top:8px; border-top: 1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
               <div id="market-price-${safeK}" style="font-family:'Orbitron', monospace; font-size:14px; font-weight:bold; color:#fff;">
                  $${priceMIL} MIL <span style="font-size:10px; color:#aaa; font-weight:normal;">/ SHARE</span>
               </div>
               <div style="display:flex; gap:5px;">
                  <button onclick="window.tradeGreenMetal('${m.name}', 1)" style="background:rgba(0,255,136,0.2); border:1px solid #0f8; color:#0f8; padding:4px 8px; border-radius:3px; cursor:pointer; font-weight:bold; font-size:11px;">BUY</button>
                  <button id="market-sell-${safeK}" onclick="window.tradeGreenMetal('${m.name}', -1)" ${c.shares === 0 ? 'disabled style="background:rgba(255,50,50,0.1); border:1px solid #f55; color:#f55; padding:4px 8px; border-radius:3px; cursor:not-allowed; font-weight:bold; font-size:11px; opacity:0.3;"' : 'style="background:rgba(255,50,50,0.2); border:1px solid #f55; color:#f55; padding:4px 8px; border-radius:3px; cursor:pointer; font-weight:bold; font-size:11px; opacity:1;"'}>SELL</button>
               </div>
            </div>
          `;
      }
      
      metalsHtml += `
      <div class="strat-item">
        <div class="strat-item-title" style="color:${m.color};">⛏ ${m.name}</div>
        <div class="strat-item-desc">${m.desc}</div>
        ${tradeHtml}
      </div>`;
    });
    metalsHtml += `</div></div>`;
  }
  
  const RESOURCES_DATA = [
      { name: 'Crude Oil', color: '#fa0', desc: 'State monopolies or direct government control over production (e.g., National Oil Companies).' },
      { name: 'Natural Gas', color: '#0f8', desc: 'State-controlled extraction, reserves owned by the nation.' },
      { name: 'Coal', color: '#aaa', desc: 'Government-dominated production or heavily regulated public land leasing.' },
      { name: 'Uranium', color: '#0f0', desc: 'Heavily regulated and state-controlled for strategic/security purposes.' },
      { name: 'Phosphate Rock', color: '#f88', desc: 'Key fertilizer component; production is strictly state-influenced or owned.' },
      { name: 'Potash', color: '#ffc', desc: 'Essential agricultural resource; governed by state leases and public resource management.' },
      { name: 'Salt', color: '#ddf', desc: 'State-produced resource or regulated government monopoly.' },
      { name: 'Limestone', color: '#ccc', desc: 'State-leased or directly controlled on public lands for construction.' },
      { name: 'Gypsum', color: '#eda', desc: 'Managed through state building materials oversight and leasing.' },
      { name: 'Freshwater', color: '#08f', desc: 'Governments strictly control extraction, distribution, and ownership.' },
      // Bonus catalog items that exist in the DB but not originally listed in the modal
      { name: 'Lumber (Wood)', color: '#a64', desc: 'Timber rights managed by state forestry departments.' },
      { name: 'Wheat', color: '#fd0', desc: 'Agricultural staple, heavily subsidized and traded globally.' }
  ];

  let resourcesHtml = '';
  RESOURCES_DATA.forEach(r => {
      let tradeHtml = '';
      if (window.greenMarket && window.greenMarket.commodities[r.name]) {
          const safeK = r.name.replace(/[^a-zA-Z]/g, '');
          const c = window.greenMarket.commodities[r.name];
          const priceMIL = (c.price / 100).toFixed(2);
          tradeHtml = `
            <div style="margin-top:10px; padding-top:8px; border-top: 1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
               <div id="market-price-${safeK}" style="font-family:'Orbitron', monospace; font-size:14px; font-weight:bold; color:#fff;">
                  $${priceMIL} MIL <span style="font-size:10px; color:#aaa; font-weight:normal;">/ SHARE</span>
               </div>
               <div style="display:flex; gap:5px;">
                  <button onclick="window.tradeGreenMetal('${r.name}', 1)" style="background:rgba(0,255,136,0.2); border:1px solid #0f8; color:#0f8; padding:4px 8px; border-radius:3px; cursor:pointer; font-weight:bold; font-size:11px;">BUY</button>
                  <button id="market-sell-${safeK}" onclick="window.tradeGreenMetal('${r.name}', -1)" ${c.shares === 0 ? 'disabled style="background:rgba(255,50,50,0.1); border:1px solid #f55; color:#f55; padding:4px 8px; border-radius:3px; cursor:not-allowed; font-weight:bold; font-size:11px; opacity:0.3;"' : 'style="background:rgba(255,50,50,0.2); border:1px solid #f55; color:#f55; padding:4px 8px; border-radius:3px; cursor:pointer; font-weight:bold; font-size:11px; opacity:1;"'}>SELL</button>
               </div>
            </div>
          `;
      }
      resourcesHtml += `
      <div class="strat-item">
        <div class="strat-item-title" style="color:${r.color};">❖ ${r.name}</div>
        <div class="strat-item-desc">${r.desc}</div>
        ${tradeHtml}
      </div>`;
  });

  const content = `
    <div id="mock-trade-green-ui" data-country-name="${cName}" style="background:rgba(0,100,50,0.2); border:1px solid #0f8; padding:5px 10px; border-radius:4px; margin-bottom:10px; font-family:'Orbitron', sans-serif;">
       <b style="color:#0f8; font-size:13px; display:block; margin-bottom:3px;">LIVE MARKET: G-RESOURCES</b>
       <div id="mock-trade-green-data" style="font-size:12px; color:#ddd;">Loading simulation data...</div>
    </div>
    <div style="font-size:11px; margin-bottom:12px; color:#fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
      <span style="opacity:0.6;">Owned and managed by:</span><br>
      <b style="font-size:14px; color:#0f8;">${cName} GOVERNMENT</b>
    </div>
    <div id="natural-resources-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-right: 5px;">
      ${resourcesHtml}
    </div>
    ${metalsHtml}
  `;
  
  if (typeof openDrawer === 'function') {
    openDrawer('natural-res', `🌍 NATURAL RESOURCES`, content);
  }
}

function showYellowSkinArmsModal(iso) {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const cd = countryData[iso] || {name: iso};
  const cName = cd.name.toUpperCase();
  
  // SIPRI 2023 Top 100 Arms Revenue Data mapping
  const ARMS_DATA = {
    'UNITED STATES': [
      { name: 'National Industry Overview', desc: 'Extremely self-reliant (<1% import ratio). The largest global arms producer. Strong government preference for domestic procurement creates massive localized industry.' },
      { name: '1. Lockheed Martin', desc: '$60.8B (-1.6% YoY) — ~90% of total company revenue comes from arms.' },
      { name: '2. RTX', desc: '$40.6B (-1.3% YoY).' },
      { name: '3. Northrop Grumman', desc: '$35.5B (+5.8% YoY).' },
      { name: '4. Boeing', desc: '$31.1B (+2.0% YoY) — ~40% of total revenue is arms.' },
      { name: '5. General Dynamics', desc: '$30.2B (+3.2% YoY).' }
    ],
    'CHINA': [
      { name: 'National Industry Overview', desc: 'Second largest national arms industry globally. Highly consolidated state-owned enterprises (SOEs).' },
      { name: '8. AVIC', desc: '$20.8B (+5.6% YoY).' },
      { name: '9. NORINCO', desc: '$20.5B (-2.7% YoY).' },
      { name: '10. CETC', desc: '$16.0B (+13% YoY).' }
    ],
    'RUSSIA': [
      { name: 'National Industry Overview', desc: 'Massive domestic demand surge due to escalating geopolitical conflict.' },
      { name: '7. Rostec', desc: '$21.7B (+49% YoY) — Massive surge reflecting wartime state procurement.' }
    ],
    'UNITED KINGDOM': [
      { name: 'National Industry Overview', desc: 'Major European producer. Significant domestic and export market presence.' },
      { name: '6. BAE Systems', desc: '$29.8B (+2.3% YoY) — ~98% of total revenue is arms.' }
    ],
    'FRANCE': [
      { name: 'National Industry Overview', desc: 'Strong aerospace and defense sector, deeply integrated into European procurement.' },
      { name: '16. Thales', desc: 'Major defense electronics and systems exporter.' },
      { name: '12. Airbus', desc: '$12.8B (Trans-European, significant operations in France).' }
    ],
    'GERMANY': [
      { name: 'National Industry Overview', desc: 'Growing European dependency on imports, but retains strong localized manufacturing (e.g. tanks, systems).' },
      { name: '26. Rheinmetall', desc: 'Rapidly expanding production capacity amid rising European tensions.' },
      { name: '12. Airbus', desc: '$12.8B (Trans-European, significant operations in Germany).' }
    ],
    'SWEDEN': [
      { name: 'National Industry Overview', desc: 'Highly advanced localized domestic production despite small population.' },
      { name: 'Saab', desc: 'Advanced aerospace and defense systems, submarines, and fighter aircraft.' }
    ],
    'INDIA': [
      { name: 'National Industry Overview', desc: 'Massive importer pushing aggressively for "Make in India" domestic arms production.' },
      { name: 'Hindustan Aeronautics (HAL)', desc: 'Leading state-owned aerospace and defense company.' }
    ],
    'SOUTH KOREA': [
      { name: 'National Industry Overview', desc: 'Rapidly emerging as a global top-tier arms exporter. Strong growth fueled by geopolitical tensions.' },
      { name: 'Korea Aerospace Industries (KAI)', desc: 'Driving significant export expansion in fighter jets and light combat aircraft.' }
    ],
    'UKRAINE': [
      { name: 'National Industry Overview', desc: 'Wartime mobilization radically expanding domestic production capabilities.' },
      { name: 'JSC Ukrainian Defense Industry', desc: '+69% YoY revenue growth due to massive domestic procurement demands.' }
    ]
  };

  let armsHtml = '';
  if (ARMS_DATA[cName]) {
    armsHtml = `<div style="margin-top:20px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
      <b style="color:#ffaa00; font-size:13px; display:block; margin-bottom:10px;">★ MAJOR PRODUCERS (SIPRI TOP 100)</b>`;
    ARMS_DATA[cName].forEach(m => {
      armsHtml += `
      <div class="strat-item" style="border-left: 2px solid #ffaa00;">
        <div class="strat-item-title" style="color:#fff;">🛡 ${m.name}</div>
        <div class="strat-item-desc" style="color:#ddd;">${m.desc}</div>
      </div>`;
    });
    armsHtml += `</div>`;
  } else {
    armsHtml = `<div style="margin-top:20px; padding: 15px; background: rgba(255,100,0,0.1); border-radius: 4px;">
      <span style="color:#ffaa00;">No top 100 SIPRI headquarter producers located here.</span><br><br>
      <span style="opacity:0.7;">This nation acts primarily as an importer or localized consumer in the global supply chain. High import reliance is common outside of major hubs.</span>
    </div>`;
  }
  
  const content = `
    <div id="mock-trade-yellow-ui" data-country-name="${cName}" style="background:rgba(100,80,0,0.2); border:1px solid #fa0; padding:5px 10px; border-radius:4px; margin-bottom:10px; font-family:'Orbitron', sans-serif;">
       <b style="color:#fa0; font-size:13px; display:block; margin-bottom:3px;">LIVE MARKET: METALS/ARMS</b>
       <div id="mock-trade-yellow-data" style="font-size:12px; color:#ddd;">Loading simulation data...</div>
    </div>
    <div style="font-size:11px; margin-bottom:12px; color:#fff; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px;">
      <span style="opacity:0.6;">National Defense Infrastructure:</span><br>
      <b style="font-size:14px; color:#ffaa00;">${cName}</b>
    </div>
    <div style="padding-right: 5px;">
      <div class="strat-item">
        <div class="strat-item-title" style="color:#ffaa00;">📉 The "Global" Arms Industry Illusion</div>
        <div class="strat-item-desc">Global arms revenues reached <b>$632 billion</b> in 2023. However, governments heavily favor domestic procurement for security reasons, resulting in critically low true intra-industry trade compared to civilian sectors.</div>
      </div>
      <div class="strat-item">
        <div class="strat-item-title" style="color:#ffaa00;">🏭 Decreasing Concentration</div>
        <div class="strat-item-desc">The Top 5 companies' share of the Top 100 revenues has consistently fallen (from 45% in 2002 to 31.4% in 2023), allowing more regional defense contractors to rise.</div>
      </div>
      ${armsHtml}
    </div>
  `;
  
  if (typeof openDrawer === 'function') {
    openDrawer('arms-ind', `⚙ ARMS PRODUCTION (2023)`, content);
  }
}

function selectCountry(iso) {
  const prev = GS.selected;
  if(prev) highlightCountry(prev,false);
  GS.selected = iso;
  highlightCountry(iso,true);

  if (window.currentSkinIndex === 3) { // Green Skin exclusively ignores normal ops
    showGreenSkinResourceModal(iso);
    return;
  }

  if (window.currentSkinIndex === 3) { // Cyber Skin exclusively ignores normal ops
    return;
  }

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
    `Owner: ${c.owner===-1?'NEUTRAL':PLAYER_COLORS[c.owner]?.name}<br>Troops: ${(c.troops * 10000).toLocaleString()}${ c.nuked ? '<br><span style="color:#fa0">☢ FALLOUT '+c.nuked+' turns</span>':'' }`;

  // Enable/disable actions based on phase
  const phase = GS.phase;
  document.getElementById('btn-add').disabled = !(myTurn && isMine && phase==='REINFORCE' && GS.reinforceLeft>0);
  document.getElementById('btn-buy-nuke').disabled = !(myTurn && isMine && GS.players[GS.myIndex].budget >= 30000);
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
  if (def.owner === -1) { setLog('⚠ Cannot attack NEUTRAL regions'); attackingFrom=null; return; }
  if (atk.troops < 2) { setLog('⚠ Need at least 2 troops to attack!'); attackingFrom=null; return; }

  const atkDice = Math.min(3, atk.troops-1) + (def.cas ? 1 : 0);
  let defDice = def.shocked ? 1 : Math.min(2, def.troops);
  
  // Fix 11: Defender's Advantage for max infrastructure
  if (def.infrastructure && def.infrastructure >= 5) {
    defDice += 1;
  }

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
        // Fix 9: Move all available troops forward to allow blitzing, instead of capping at 3
        const moveTroops = atk.troops - 1;
        def.owner = GS.myIndex;
        def.troops = moveTroops;
        atk.troops -= moveTroops;
        setLog(`✓ ${countryData[targetIso]?.name} CONQUERED! Moved ${(moveTroops * 10000).toLocaleString()} troops.`);
        refreshBorder(targetIso);
      } else {
        setLog(`⚔ ${countryData[targetIso]?.name}: -${(defLoss * 10000).toLocaleString()} casualties. ${countryData[attackingFrom]?.name}: -${(atkLoss * 10000).toLocaleString()} casualties.`);
        if (defLoss > 0) spawnFloatingText3D(countryData[targetIso]?.lat, countryData[targetIso]?.lon, `-${defLoss * 10}K`, 0xff2222);
        if (atkLoss > 0) spawnFloatingText3D(countryData[attackingFrom]?.lat, countryData[attackingFrom]?.lon, `-${atkLoss * 10}K`, 0xff5555);
      }
      updateTroopSprite(attackingFrom);
      updateTroopSprite(targetIso);
      refreshBorder(targetIso);
      attackingFrom = null;
      checkPlayerAlive();
    }
  );
}

// BUY NUKE
document.getElementById('btn-buy-nuke').onclick = () => {
  if (!GS.selected || GS.players[GS.myIndex].budget < 30000) return;
  GS.players[GS.myIndex].budget -= 30000;
  GS.players[GS.myIndex].nukes++;
  SFX.playClick();
  setLog(`☢ PURCHASED 1 NUCLEAR WARHEAD FOR $30,000B.`);
  updateDashboard();
  if (GS.isOnline) syncState();
};

// NUKE STRIKE
document.getElementById('btn-nuke').onclick = () => {
  if (!GS.selected || GS.players[GS.myIndex].nukes <= 0) return;
  const from = GS.selected;
  document.getElementById('side-panel').classList.remove('open');
  setLog(`☢ SELECT nuclear target country (${GS.players[GS.myIndex].nukes} nukes remaining)`);
  GS.selected = null;
  window._nukeFrom = from;
};

function tryNuke(targetIso) {
  SFX.playSiren();
  const from = window._nukeFrom; if(!from) return;
  if (GS.countries[targetIso]?.owner === GS.myIndex) { window._nukeFrom=null;return; }
  const def = GS.countries[targetIso];
  const nukeStr = Math.floor(6 + Math.random()*5); // 6-10 dmg
  
  if (ws && ws.readyState === 1 && nukeStr > 0) {
     ws.send(JSON.stringify({
       type: 'record_attack',
       callsign: window.myCallsign || document.getElementById('player-name')?.value || 'Commander',
       damage: nukeStr
     }));
     // Deal massive damage to Rainclaude's Data Core (Nuke Strength * 15)
     ws.send(JSON.stringify({
       type: 'human_combat_support',
       target: 'claude',
       amount: nukeStr * 15
     }));
  }
  
  def.troops = Math.max(0, def.troops - nukeStr);
  def.nuked  = 6; // Fix 10: 6 turns of fallout
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
      setLog(`⚠ INSUFFICIENT DEFENSE BUDGET. Need ${cost} D3X.`);
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
      setLog(`⚠ INSUFFICIENT DEFENSE BUDGET. Need ${cost} D3X.`);
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
      if (window.activeSkin === 'green') {
        setLog(`⚠ SATELLITE HACK IS INCOMPATIBLE WITH GREEN MARKET SKIN. SWITCH TO RED.`);
        GS.players[0].budget += cost; // Refund cost
        return;
      }
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
         callsign: window.myCallsign || document.getElementById('player-name')?.value || 'Commander',
         damage: dl
       }));
       // Deal structural damage to Rainclaude's Data Core (Troops Killed * 5)
       ws.send(JSON.stringify({
         type: 'human_combat_support',
         target: 'claude',
         amount: dl * 5
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
