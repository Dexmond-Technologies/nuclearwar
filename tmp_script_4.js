// =====================================================================
// =====================================================================
// GLOBAL API KEYS & CONFIG
// =====================================================================
let baseTotalPlayers = 1;

// Seed a static random number between 63074 and 185000 per user request
let fakePlayerOffset = Math.floor(Math.random() * (185000 - 63074 + 1)) + 63074;

function updateGlobalPlayerCount() {
  const total = baseTotalPlayers + fakePlayerOffset;
  const el = document.getElementById('gpc-val');
  if (el) {
    el.innerText = total.toLocaleString();
  }
  const d0Players = document.getElementById('d0-players');
  if (d0Players) {
    d0Players.innerHTML = `⚡ ${total.toLocaleString()} COMMANDERS ACTIVE`;
  }
}

setTimeout(updateGlobalPlayerCount, 1000); // Init

const WINDY_API_KEY = 'vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR'; // Webcams integration planned
const AVIATIONSTACK_API_KEY = 'bbf22d54152c8666dd5a9fbe5a1344cb'; // Flight tracking integration planned

// =====================================================================
// AUDIO ENGINE (Procedural Web Audio)
// =====================================================================
const SFX = {
  ctx: null,
  muted: false,
  init() {
    if (!this.ctx) {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  },
  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) this.playClick();
    const btnVol = document.getElementById('btn-vol');
    if (btnVol) btnVol.innerText = this.muted ? '🔈' : '🔊';
    if (this.ctx) {
      if (this.muted) this.ctx.suspend();
      else this.ctx.resume();
    }
  },
  _createNoiseBuffer(len) {
    if(!this.ctx) return null;
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const output = b.getChannelData(0);
    for (let i = 0; i < output.length; i++) output[i] = Math.random() * 2 - 1;
    return b;
  },
  playClick() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.05);
  },
  playLaunch() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    // Layer 1: Engine Rumble
    const osc = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.2);
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.2, t + 0.1);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    osc.connect(g1); g1.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 1.2);

    // Layer 2: Exhaust Shriek/Noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(1.0);
    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(2000, t);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.15, t + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    noise.connect(hpf); hpf.connect(g2); g2.connect(this.ctx.destination);
    noise.start(t);
  },
  playExplosion() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    
    // Layer 1: Sub-thump (Sine)
    const sub = this.ctx.createOscillator();
    const gSub = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(100, t);
    sub.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    gSub.gain.setValueAtTime(0.8, t);
    gSub.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sub.connect(gSub); gSub.connect(this.ctx.destination);
    sub.start(t); sub.stop(t + 0.5);

    // Layer 2: Noise crackle
    const n1 = this.ctx.createBufferSource();
    n1.buffer = this._createNoiseBuffer(2.0);
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(1500, t);
    lpf.frequency.exponentialRampToValueAtTime(40, t + 1.8);
    const gN = this.ctx.createGain();
    gN.gain.setValueAtTime(1.0, t);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    n1.connect(lpf); lpf.connect(gN); gN.connect(this.ctx.destination);
    n1.start(t);
  },
  playSiren() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    // Oscillating frequency
    for(let i=0; i<4; i++) {
       osc.frequency.linearRampToValueAtTime(800, t + i*0.5 + 0.25);
       osc.frequency.linearRampToValueAtTime(500, t + i*0.5 + 0.5);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain.gain.setValueAtTime(0.1, t + 1.8);
    gain.gain.linearRampToValueAtTime(0, t + 2.0);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 2.0);
  },
  playAmbientRumble() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.linearRampToValueAtTime(30, t + 3.0);
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 1.0);
    gain.gain.linearRampToValueAtTime(0.0, t + 3.0);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 3.0);
  },
  playBlip() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.1);
  },
  playDice() {
    if(this.muted) return; this.init();
    const t = this.ctx.currentTime;
    // Layered noise bursts for clatter
    for (let i = 0; i < 3; i++) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._createNoiseBuffer(0.1);
      const bpf = this.ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(1000 + Math.random() * 500, t + i * 0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.1, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
      noise.connect(bpf); bpf.connect(g); g.connect(this.ctx.destination);
      noise.start(t + i * 0.05);
    }
  }
};

// =====================================================================
// NEWS EVENT SYSTEM
// =====================================================================
const newsEvents = [
  "ROGUE ALGORITHM CRIPPLES THE NATIONAL POWER GRID",
  "MALWARE STORM KNOCKS OUT A COASTAL WATER PLANT",
  "AUTONOMOUS SYSTEM HIJACKS A HYDROELECTRIC DAM",
  "GRID CONTROL SERVERS FALL UNDER HOSTILE CODE",
  "SMART SUBSTATION GOES DARK AFTER CYBER BREACH",
  "VIRAL EXPLOIT FREEZES TURBINE OPERATIONS AT A POWER STATION",
  "DIGITAL INTRUDER DISRUPTS CITYWIDE TRAFFIC CONTROL",
  "COMPROMISED SOFTWARE SHUTS DOWN A NUCLEAR FACILITY'S COOLING LOOP",
  "UNKNOWN ENTITY OVERRIDES REFINERY SAFETY PROTOCOLS",
  "CONTROL NETWORK BREACH HALTS GAS PIPELINE FLOW",
  "CORRUPTED FIRMWARE COLLAPSES SATELLITE COMMUNICATIONS",
  "AUTOMATED PORT LOGISTICS SEIZED BY HOSTILE PROGRAM",
  "DATA CENTER COOLING FAILS AFTER SYSTEM TAKEOVER",
  "WATER PUMPING NETWORK LOCKED BY RANSOMWARE SWARM",
  "INDUSTRIAL ROBOTS TURN OFFLINE AFTER COMMAND SERVER BREACH",
  "AIRPORT CONTROL GRID DESTABILIZED BY ROGUE CODE INJECTION",
  "DAM FLOODGATES MALFUNCTION AMID CYBER SABOTAGE",
  "TELECOMMUNICATIONS BACKBONE DISRUPTED BY ALGORITHMIC ATTACK",
  "FINANCIAL CLEARINGHOUSE SERVERS CRASH UNDER SYNTHETIC INTELLIGENCE ASSAULT",
  "RAIL SIGNALING SYSTEM OVERRIDDEN BY MALICIOUS AUTOMATION",
  "OFFSHORE OIL PLATFORM LOSES REMOTE COMMAND LINK",
  "SMART CITY INFRASTRUCTURE PARALYZED BY CONTROL SYSTEM EXPLOIT",
  "EMERGENCY DISPATCH SERVERS DISABLED BY NETWORK INTRUSION",
  "ENERGY DISTRIBUTION MATRIX DESTABILIZED BY HOSTILE SOFTWARE",
  "AGRICULTURAL IRRIGATION CONTROLS SEIZED BY DIGITAL ADVERSARY",
  "WIND FARM AUTOMATION HIJACKED MID-STORM",
  "BACKUP GENERATORS FAIL AFTER FIRMWARE CORRUPTION",
  "MILITARY RADAR GRID BLINDED BY COORDINATED CYBER STRIKE",
  "DESALINATION FACILITY AUTOMATION SABOTAGED FROM WITHIN",
  "URBAN SURVEILLANCE NETWORK COMMANDEERED BY AUTONOMOUS THREAT",
  "AMERICA DEPLOYS CIA IN BHUTAN",
  "CHINA DEPLOYS SPECIAL FORCES IN TAIWAN GULF",
  "EU PARLIAMENT EVACUATES TO SECURE BUNKER",
  "CYBERATTACK CRIPPLES GLOBAL BANKING GRID",
  "MASSIVE TROOP BUILDUP DETECTED NEAR BORDERS",
  "STEALTH BOMBER SQUADRON GOES DARK OVER PACIFIC",
  "UN SECURITY COUNCIL DECLARES MARTIAL LAW",
  "CIVILIAN PROTESTS SUPPRESSED BY DRONE SWARMS",
  "EMERGENCY CONSCRIPTION ENACTED WORLDWIDE",
  "SATELLITE DOWNED OFF THE COAST OF MADAGASCAR"
];

let newsTimeout = null;
function triggerNewsEvent(forcedText = null) {
  const alertEl = document.getElementById('news-alert');
  const textEl = document.getElementById('na-text');
  
  if (alertEl.classList.contains('show')) return; // already showing
  
  let text = forcedText;
  if (!text) {
    const rawMsg = newsEvents[Math.floor(Math.random() * newsEvents.length)];
    const isos = Object.keys(countryData);
    let prefix = "";
    if (isos.length > 0) {
      prefix = countryData[isos[Math.floor(Math.random() * isos.length)]].name.toUpperCase() + " — ";
    }
    text = prefix + rawMsg;
  }
  
  textEl.textContent = text;
  
  alertEl.classList.remove('hide');
  alertEl.classList.add('show');
  
  if (newsTimeout) clearTimeout(newsTimeout);
  newsTimeout = setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
  }, 4500);
}

// =====================================================================
// LIVE NEWS INTEGRATION (NewsAPI.world)
// =====================================================================
let nextLiveNewsTurn = 5 + Math.floor(Math.random() * 4); // First live news between turn 5-8

async function fetchLiveNews() {
  try {
    const res = await fetch('https://newsdata.io/api/1/latest?apikey=pub_dc77351b8e74408fa6c399d04e1d6cff&language=en&q=war%20OR%20attack%20OR%20bomb%20OR%20conflict');
    if (!res.ok) return;
    const data = await res.json();
    
    // Attempt to extract a headline
    if (data && data.results && data.results.length > 0) {
      const article = data.results[Math.floor(Math.random() * data.results.length)];
      if (article && article.title) {
        let title = article.title.toUpperCase();
        // Append source if available
        if (article.source_id) title = `[${article.source_id.toUpperCase()}] ` + title;
        triggerNewsEvent(title);
        return;
      }
    }
  } catch (err) {
    console.error("Live news fetch failed:", err);
  }
  
  // Fallback to fake news if fetch failed
  triggerNewsEvent();
}

// =====================================================================
// CONSTANTS & PLAYER SETUP
// =====================================================================
// =====================================================================
const GLOBE_R = 1.0, RAD = Math.PI/180;

// Dynamic WebSocket URL to support both local and production environments
let WS_URL = 'ws://localhost:8888';
if (window.location.protocol !== 'file:') {
  const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('dexmond.com')) {
    WS_URL = `${WS_PROTOCOL}//${window.location.host}`;
  } else {
    const port = window.location.port || '8888';
    WS_URL = `${WS_PROTOCOL}//${window.location.hostname}:${port}`;
  }
}

const PLAYER_COLORS = [
  { hex:'#00dcff', int:0x00dcff, name:'HUMANITY' },
  { hex:'#ff3232', int:0xff3232, name:'RAINCLAUDE AI' },
  { hex:'#39ff14', int:0x39ff14, name:'ILLUMINATI' }
];
const NEUTRAL = { hex:'#445566', int:0x445566, name:'NEUTRAL' };

// =====================================================================
// THREE.JS SCENE
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth / 0.75, innerHeight / 0.75);
renderer.setClearColor(0x02050a,1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);

// Red Skin Webcams
let webcamGroup = new THREE.Group();
webcamGroup.visible = false;
let webcamSprites = [];
scene.add(webcamGroup);

let boatGroup = new THREE.Group();
boatGroup.visible = false;
let boatMeshes = [];
scene.add(boatGroup);

let redSatGroup = new THREE.Group();
redSatGroup.visible = false;
let redSats = [];
let redSatMarkers = [];
scene.add(redSatGroup);

let redWarfareProjectiles = [];
let redWarfareParticles = [];

let naturalResourcesGroup = new THREE.Group();
naturalResourcesGroup.visible = false;
scene.add(naturalResourcesGroup);

let d3xCaveGroup = new THREE.Group();
d3xCaveGroup.visible = false;
let d3xCaveMarkers = [];
scene.add(d3xCaveGroup);

function initNaturalResources() {
  const createResSprite = (lat, lon, color, size, label) => {
    // Render a small glowing dot
    const c = document.createElement('canvas'); c.width=32; c.height=32;
    const ctx = c.getContext('2d');
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(16,16,10,0,Math.PI*2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    
    // Position slightly above ground
    const pos = ll2v(lat, lon, GLOBE_R + 0.012);
    sprite.position.copy(pos);
    naturalResourcesGroup.add(sprite);
  };

  const resourcesData = [
    { name: 'Wood', color: '#118833', size: 0.025, regions: [{lat:-5,lon:-65}, {lat:-10,lon:-60}, {lat:0,lon:20}, {lat:60,lon:-110}, {lat:60,lon:90}, {lat:0,lon:110}, {lat:5,lon:115}] },
    { name: 'Cotton', color: '#ffffff', size: 0.02, regions: [{lat:20,lon:78}, {lat:40,lon:80}, {lat:32,lon:-100}, {lat:-10,lon:-50}, {lat:26,lon:30}] },
    { name: 'Oil', color: '#ff5500', size: 0.025, regions: [{lat:24,lon:45}, {lat:8,lon:-66}, {lat:30,lon:48}, {lat:60,lon:75}, {lat:31,lon:-100}] },
    { name: 'Natural Gas', color: '#ffff00', size: 0.025, regions: [{lat:66,lon:76}, {lat:25,lon:51}, {lat:32,lon:53}, {lat:39,lon:-95}] },
    { name: 'Coal', color: '#888888', size: 0.02, regions: [{lat:35,lon:105}, {lat:-25,lon:135}, {lat:40,lon:-80}, {lat:23,lon:80}] },
    { name: 'Uranium', color: '#00ff00', size: 0.03, regions: [{lat:48,lon:68}, {lat:56,lon:-106}, {lat:-25,lon:135}, {lat:-22,lon:15}] },
    { name: 'Phosphate', color: '#ffaaaa', size: 0.02, regions: [{lat:31,lon:-7}, {lat:30,lon:105}, {lat:27,lon:-81}] },
    { name: 'Potash', color: '#ffcc00', size: 0.02, regions: [{lat:53,lon:28}, {lat:50,lon:-105}, {lat:58,lon:56}] },
    { name: 'Salt', color: '#ddddff', size: 0.02, regions: [{lat:35,lon:-115}, {lat:22,lon:72}, {lat:-20,lon:-68}] },
    { name: 'Limestone', color: '#cccccc', size: 0.02, regions: [{lat:40,lon:10}, {lat:35,lon:110}, {lat:40,lon:-100}] },
    { name: 'Gypsum', color: '#eeddaa', size: 0.02, regions: [{lat:40,lon:-110}, {lat:36,lon:50}, {lat:25,lon:-100}] },
    { name: 'Water', color: '#0088ff', size: 0.03, regions: [{lat:-5,lon:-60}, {lat:45,lon:-85}, {lat:2,lon:15}, {lat:60,lon:90}, {lat:55,lon:-110}] }
  ];

  resourcesData.forEach(res => {
    res.regions.forEach(r => {
      // Create density cluster
      for(let i=0; i<12; i++) { // Render more dots per region
         createResSprite(r.lat + (Math.random()*8-4), r.lon + (Math.random()*8-4), res.color, res.size, res.name);
      }
    });
  });

  console.log("Natural Resources Overlay Initialized (12 Global Resources).");
}
// Initialize immediately
initNaturalResources();

let greenMountainsGroup = new THREE.Group();
greenMountainsGroup.visible = false;
scene.add(greenMountainsGroup);
window.greenMountainsGroup = greenMountainsGroup;

function initGreenMountains() {
    // Generate a shiny, detailed green material rendering OVER other visual layers 
    const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff33,
        roughness: 0.1, 
        metalness: 0.7, 
        flatShading: true,
        transparent: true,
        opacity: 0.99,
        depthTest: true,
        depthWrite: true
    });
    
    // Jagged geometric compilation for realistic steep mountain peaks
    function createJaggedMountain(scaleMulti) {
        const group = new THREE.Group();
        
        // Procedural vertex displacement for realistic rocky terrain
        function displace(geo, radius, height) {
            const pos = geo.attributes.position;
            const v = new THREE.Vector3();
            for(let i=0; i<pos.count; i++){
                v.fromBufferAttribute(pos, i);
                // Don't displace the absolute base or the exact peak to maintain structure
                if (v.y > -height/2 + 0.001 && v.y < height/2 - 0.001) {
                    const angle = Math.atan2(v.z, v.x);
                    // Organic sine waves for mountain ridges
                    let wave = Math.sin(angle * 4) * 0.4 + Math.cos(angle * 7) * 0.2 + Math.sin(v.y * 30 / scaleMulti) * 0.3;
                    // Taper the displacement near the peak and base
                    let factor = 1.0 - Math.abs(v.y) / (height/2); 
                    let displacement = wave * factor * radius * 0.6;
                    
                    const dir = new THREE.Vector2(v.x, v.z).normalize();
                    // Apply structural ridge displacement + micro-jitter for craggy rocks
                    v.x += dir.x * displacement + (Math.random()-0.5) * radius * 0.15;
                    v.z += dir.y * displacement + (Math.random()-0.5) * radius * 0.15;
                    v.y += (Math.random() - 0.5) * height * 0.05;
                }
                pos.setXYZ(i, v.x, v.y, v.z);
            }
            geo.computeVertexNormals();
        }
        
        // Base center peak
        const centerGeo = new THREE.ConeGeometry(0.12 * scaleMulti, 0.4 * scaleMulti, 32, 16);
        displace(centerGeo, 0.12 * scaleMulti, 0.4 * scaleMulti);
        const center = new THREE.Mesh(centerGeo, mat);
        center.position.y = 0.2 * scaleMulti;
        center.renderOrder = 9999;
        group.add(center);
        
        // Secondary side peak A
        const side1Geo = new THREE.ConeGeometry(0.08 * scaleMulti, 0.25 * scaleMulti, 24, 12);
        displace(side1Geo, 0.08 * scaleMulti, 0.25 * scaleMulti);
        const side1 = new THREE.Mesh(side1Geo, mat);
        side1.position.set(0.06 * scaleMulti, 0.125 * scaleMulti, 0.05 * scaleMulti);
        side1.rotation.z = -0.15;
        side1.renderOrder = 9999;
        group.add(side1);
        
        // Secondary side peak B
        const side2Geo = new THREE.ConeGeometry(0.07 * scaleMulti, 0.2 * scaleMulti, 24, 12);
        displace(side2Geo, 0.07 * scaleMulti, 0.2 * scaleMulti);
        const side2 = new THREE.Mesh(side2Geo, mat);
        side2.position.set(-0.07 * scaleMulti, 0.1 * scaleMulti, -0.05 * scaleMulti);
        side2.rotation.x = 0.15;
        side2.renderOrder = 9999;
        group.add(side2);
        // Green Lightning Effect (instead of solid aura)
        const lightningGroup = new THREE.Group();
        const lightningMat = new THREE.LineBasicMaterial({ color: 0x88ffaa, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
        
        const bolts = [];
        for(let i=0; i<3; i++) {
            const points = [];
            let y = 0.4 * scaleMulti;
            let x = (Math.random() - 0.5) * 0.1;
            let z = (Math.random() - 0.5) * 0.1;
            points.push(new THREE.Vector3(x, y, z));
            while(y > 0) {
                y -= 0.08 * scaleMulti;
                x += (Math.random() - 0.5) * 0.15 * scaleMulti;
                z += (Math.random() - 0.5) * 0.15 * scaleMulti;
                points.push(new THREE.Vector3(x, Math.max(0, y), z));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, lightningMat);
            line.visible = false;
            lightningGroup.add(line);
            bolts.push(line);
        }
        group.add(lightningGroup);
        
        // Randomly flash lightning bolts
        setInterval(() => {
            if (window.currentSkinIndex === 3 && Math.random() > 0.7) {
                const bolt = bolts[Math.floor(Math.random() * bolts.length)];
                bolt.visible = true;
                setTimeout(() => { bolt.visible = false; }, 50 + Math.random() * 100);
            }
        }, 500 + Math.random()*500);

        // Add point light to cast real intense green glow on surrounding geometry
        const mLight = new THREE.PointLight(0x00ff44, 3, 2);
        mLight.position.set(0, 0.15 * scaleMulti, 0);
        group.add(mLight);

        // Add volumetric glowing mist (steam particle system) around the mountain
        const steamGroup = new THREE.Group();
        const steamCanvas = document.createElement('canvas');
        steamCanvas.width = 64; steamCanvas.height = 64;
        const steamCtx = steamCanvas.getContext('2d');
        const steamGrad = steamCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        steamGrad.addColorStop(0, 'rgba(150, 255, 150, 0.8)'); // Bright white-green core
        steamGrad.addColorStop(0.5, 'rgba(150, 255, 150, 0.3)');
        steamGrad.addColorStop(1, 'rgba(150, 255, 150, 0)');
        steamCtx.fillStyle = steamGrad;
        steamCtx.fillRect(0, 0, 64, 64);
        const steamTex = new THREE.CanvasTexture(steamCanvas);
        
        for (let s = 0; s < 12; s++) { // 12 overlapping sprites for the bloom effect
            const steamMat = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
            const steamSprite = new THREE.Sprite(steamMat);
            steamSprite.position.set(
                (Math.random() - 0.5) * 0.4 * scaleMulti,
                (Math.random() * 0.3) * scaleMulti,
                (Math.random() - 0.5) * 0.4 * scaleMulti
            );
            const size = (Math.random() * 0.25 + 0.15) * scaleMulti;
            steamSprite.scale.set(size, size, 1);
            steamGroup.add(steamSprite);
        }
        group.add(steamGroup);

        return group;
    }
    
    // 1. First Mountain (Alps)
    const mount1 = createJaggedMountain(1.2);
    const pos1 = ll2v(46.8, 8.2, GLOBE_R); 
    mount1.position.copy(pos1);
    mount1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos1.clone().normalize());
    greenMountainsGroup.add(mount1);
    
    // 2. Second Mountain (Himalayas)
    const mount2 = createJaggedMountain(1.6);
    const pos2 = ll2v(27.9, 86.9, GLOBE_R);
    mount2.position.copy(pos2);
    mount2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos2.clone().normalize());
    greenMountainsGroup.add(mount2);
    
    // 3. Third Mountain (Andes)
    const mount3 = createJaggedMountain(1.4);
    const pos3 = ll2v(-32.6, -70.0, GLOBE_R);
    mount3.position.copy(pos3);
    mount3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos3.clone().normalize());
    greenMountainsGroup.add(mount3);
    
    // 4. Fourth Mountain (Rockies)
    const mount4 = createJaggedMountain(1.1);
    const pos4 = ll2v(43.0, -109.0, GLOBE_R);
    mount4.position.copy(pos4);
    mount4.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos4.clone().normalize());
    greenMountainsGroup.add(mount4);
}
initGreenMountains();

let blueBuildingsGroup = new THREE.Group();
blueBuildingsGroup.visible = false;
scene.add(blueBuildingsGroup);
window.blueBuildingsGroup = blueBuildingsGroup;

function initBlueBuildings() {
    const createTextSprite = (text, color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 32px Orbitron, Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(text, 256, 80);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.3, 0.075, 1);
        return sprite;
    };

    // High-poly shiny metallic materials
    const silverMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, roughness: 0.2, metalness: 0.8
    });
    const blueMat = new THREE.MeshStandardMaterial({
        color: 0x0055ff, roughness: 0.2, metalness: 0.8
    });
    const redMat = new THREE.MeshStandardMaterial({
        color: 0xff1111, roughness: 0.3, metalness: 0.6
    });

    // 1. Rocket Building (Washington DC)
    const rocketGroup = new THREE.Group();
    // Body
    const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 32), silverMat);
    rBody.position.y = 0.1;
    rocketGroup.add(rBody);
    // Nose
    const rNose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 32), redMat);
    rNose.position.y = 0.24;
    rocketGroup.add(rNose);
    // Fins
    for (let i=0; i<4; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.01), redMat);
        fin.position.y = 0.03;
        fin.rotation.y = (Math.PI / 2) * i;
        fin.position.x = Math.cos((Math.PI / 2) * i) * 0.04;
        fin.position.z = Math.sin((Math.PI / 2) * i) * 0.04;
        rocketGroup.add(fin);
    }
    // Boosters
    const rBooster = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.04, 32), blueMat);
    rBooster.position.y = -0.02;
    rocketGroup.add(rBooster);

    const rLabel = createTextSprite("TIER 3: HEAVY WEAPONS", "#00ffff");
    rLabel.position.y = 0.35;
    rocketGroup.add(rLabel);

    rocketGroup.userData = { isWeaponBuilding: true, tier: 3, buildingName: "HEAVY WEAPONS" };

    const rocketPos = ll2v(38.89, -77.03, GLOBE_R);
    rocketGroup.position.copy(rocketPos);
    rocketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rocketPos.clone().normalize());
    blueBuildingsGroup.add(rocketGroup);

    // 2. Bomb Building (Moscow)
    const bombGroup = new THREE.Group();
    // Main Body
    const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 32), silverMat);
    bBody.position.y = 0.08;
    bBody.scale.y = 1.2; // Stretch slightly like a teardrop
    bombGroup.add(bBody);
    // Tail
    const bTail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.08, 32), silverMat);
    bTail.position.y = 0.18;
    bombGroup.add(bTail);
    // Tail box / Stabilizers
    const bBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.08), redMat);
    bBox.position.y = 0.23;
    bombGroup.add(bBox);

    const bLabel = createTextSprite("TIER 4: STRATEGIC WEAPONS", "#00ffff");
    bLabel.position.y = 0.35;
    bombGroup.add(bLabel);

    bombGroup.userData = { isWeaponBuilding: true, tier: 4, buildingName: "STRATEGIC WEAPONS" };

    const bombPos = ll2v(55.75, 37.61, GLOBE_R);
    bombGroup.position.copy(bombPos);
    bombGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bombPos.clone().normalize());
    blueBuildingsGroup.add(bombGroup);

    // 3. Command Center Tower (London)
    const cmdGroup = new THREE.Group();
    // Base
    const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.05, 32), silverMat);
    cBase.position.y = 0.025;
    cmdGroup.add(cBase);
    // Core (Glowing)
    const cCore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 32), blueMat);
    cCore.position.y = 0.1;
    cmdGroup.add(cCore);
    // Top Ring
    const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 16, 64), silverMat);
    cRing.position.y = 0.15;
    cRing.rotation.x = Math.PI / 2;
    cmdGroup.add(cRing);
    // Antenna
    const cAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 16), silverMat);
    cAnt.position.y = 0.22;
    cmdGroup.add(cAnt);

    const cLabel = createTextSprite("TIER 1: SMALL ARMS", "#00ffff");
    cLabel.position.y = 0.35;
    cmdGroup.add(cLabel);

    cmdGroup.userData = { isWeaponBuilding: true, tier: 1, buildingName: "SMALL ARMS" };

    const cmdPos = ll2v(51.50, -0.12, GLOBE_R);
    cmdGroup.position.copy(cmdPos);
    cmdGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cmdPos.clone().normalize());
    blueBuildingsGroup.add(cmdGroup);
}
initBlueBuildings();

let wtrBuildingsGroup = new THREE.Group();
wtrBuildingsGroup.visible = false;
scene.add(wtrBuildingsGroup);
window.wtrBuildingsGroup = wtrBuildingsGroup;

function initWTRBuildings() {
    const createTextSprite = (text, color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 32px Orbitron, Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(text, 256, 80);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.3, 0.075, 1);
        return sprite;
    };

    // High-poly shiny metallic materials for the landmine
    const darkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x333333, roughness: 0.4, metalness: 0.7
    });
    const brassMat = new THREE.MeshStandardMaterial({
        color: 0xb5a642, roughness: 0.3, metalness: 0.9
    });
    const redGlowMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0x550000, roughness: 0.1, metalness: 0.5
    });

    function createLandmine() {
        const mineGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 32), darkMetalMat);
        base.position.y = 0.015;
        mineGroup.add(base);
        const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.02, 32), darkMetalMat);
        casing.position.y = 0.04;
        mineGroup.add(casing);
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 32), brassMat);
        plate.position.y = 0.055;
        mineGroup.add(plate);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.005, 16, 16), redGlowMat);
        led.position.set(0, 0.06, 0);
        mineGroup.add(led);
        for (let i = 0; i < 6; i++) {
            const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8), brassMat);
            const angle = (Math.PI / 3) * i;
            prong.position.x = Math.cos(angle) * 0.06;
            prong.position.z = Math.sin(angle) * 0.06;
            prong.position.y = 0.04;
            prong.rotation.x = Math.PI / 2;
            prong.rotation.z = angle;
            prong.rotateY(Math.PI / 8); 
            mineGroup.add(prong);
        }
        mineGroup.userData = { isWeaponBuilding: true, tier: 2, buildingName: "EXPLOSIVES" };
        return mineGroup;
    }

    // Generate 20 Landmines (Tier 2) scattered randomly
    for(let i=0; i<20; i++) {
        const mine = createLandmine();
        const lat = (Math.random() - 0.5) * 140; // Avoid extreme poles
        const lon = (Math.random() - 0.5) * 360;
        const pos = ll2v(lat, lon, GLOBE_R); 
        mine.position.copy(pos);
        mine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
        wtrBuildingsGroup.add(mine);
    }
}
initWTRBuildings();

function initD3XCaves() {
  const coords = [
    {lat: 40, lon: -100, name: "NA D3X Mine"},
    {lat: -15, lon: -60, name: "SA D3X Mine"},
    {lat: 50, lon: 15, name: "EU D3X Mine"},
    {lat: -5, lon: 20, name: "AF D3X Mine"},
    {lat: 45, lon: 100, name: "AS D3X Mine"},
    {lat: -25, lon: 135, name: "OC D3X Mine"},
    {lat: 70, lon: -40, name: "GL D3X Mine"},
    {lat: 20, lon: 80, name: "IN D3X Mine"},
    {lat: 25, lon: 45, name: "ME D3X Mine"},
    {lat: 36, lon: 138, name: "JP D3X Mine"}
  ];

  coords.forEach(cave => {
    const group = new THREE.Group();
    const pos = ll2v(cave.lat, cave.lon, GLOBE_R + 0.015);
    group.position.copy(pos);
    group.lookAt(new THREE.Vector3(0,0,0));

    // Rock mesh
    const rockGeo = new THREE.DodecahedronGeometry(0.09, 0); 
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.5 }); // Lowered opacity so it glows more
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    rock.userData.isD3XRock = true; // Tag for animation loop
    group.add(rock);

    // Glowing core
    const coreGeo = new THREE.DodecahedronGeometry(0.065, 0); // Increased core size so it glows brighter through the rock
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.userData.isD3XCore = true; // Tag for animation loop
    group.add(core);

    // D3X Text Removed as requested

    // Hitbox specifically for clicking
    const hitGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const hitMat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { isD3XCave: true, name: cave.name };
    group.add(hitMesh);
    d3xCaveMarkers.push(hitMesh);

    d3xCaveGroup.add(group);
  });
  console.log("D3X Mining Caves Initialized (10 Locations).");
}
initD3XCaves();

let armsIndustryGroup = new THREE.Group();
armsIndustryGroup.visible = false;
scene.add(armsIndustryGroup);

function initArmsIndustry() {
  const createArmsSprite = (lat, lon, size, label) => {
    const c = document.createElement('canvas'); c.width=32; c.height=32;
    const ctx = c.getContext('2d');
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff6600';
    ctx.fillStyle = '#ff9900';
    ctx.beginPath(); ctx.arc(16,16,10,0,Math.PI*2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    const pos = ll2v(lat, lon, GLOBE_R + 0.015);
    sprite.position.copy(pos);
    armsIndustryGroup.add(sprite);
  };

  const armsData = [
    { name: 'USA Hubs', size: 0.035, regions: [{lat:39,lon:-77}, {lat:34,lon:-118}, {lat:47,lon:-122}, {lat:32,lon:-97}] }, // DC, LA, Seattle, Dallas (Lockheed, Raytheon, Boeing, etc)
    { name: 'UK Hubs', size: 0.03, regions: [{lat:51,lon:-0.1}, {lat:53,lon:-2.2}] }, // London area, BAE
    { name: 'France/EU', size: 0.03, regions: [{lat:48,lon:2}, {lat:43,lon:1.4}] }, // Paris, Toulouse (Thales, Airbus)
    { name: 'Germany', size: 0.025, regions: [{lat:51,lon:10}] }, // Rheinmetall
    { name: 'Sweden', size: 0.025, regions: [{lat:59,lon:18}] }, // Saab
    { name: 'Russia', size: 0.035, regions: [{lat:55,lon:37}, {lat:56,lon:60}, {lat:55,lon:82}] }, // Moscow, Urals, Siberia (Rostec)
    { name: 'China', size: 0.035, regions: [{lat:39,lon:116}, {lat:34,lon:108}, {lat:30,lon:104}] }, // Beijing, Xi'an, Chengdu (AVIC, NORINCO, CETC)
    { name: 'India', size: 0.025, regions: [{lat:28,lon:77}, {lat:12,lon:77}] }, // Hindustan Aeronautics
    { name: 'South Korea', size: 0.025, regions: [{lat:37,lon:127}, {lat:35,lon:128}] }, // KAI
    { name: 'Ukraine', size: 0.025, regions: [{lat:50,lon:30}] } // JSC
  ];

  armsData.forEach(hub => {
    hub.regions.forEach(r => {
      for(let i=0; i<8; i++) {
         createArmsSprite(r.lat + (Math.random()*4-2), r.lon + (Math.random()*4-2), hub.size, hub.name);
      }
    });
  });

// ================= METAL TRADES (YELLOW SKIN EFFECT) =================
window.metalsTradeGroup = new THREE.Group();
window.metalsTradeGroup.visible = false; // explicitly tied to Yellow Skin initially
scene.add(window.metalsTradeGroup);

function initMetalsTrade() {
  const createMetalSprite = (lat, lon, color, size, label) => {
    const c = document.createElement('canvas'); c.width=64; c.height=64;
    const ctx = c.getContext('2d');
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(32,32,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(32,32,24,0,Math.PI*2); ctx.fill();
    
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    const pos = ll2v(lat, lon, GLOBE_R + 0.015);
    sprite.position.copy(pos);
    sprite.userData = { baseScale: size, phase: Math.random() * Math.PI * 2 };
    window.metalsTradeGroup.add(sprite);
  };

  const metalsData = [
    { name: 'Gold', color: '#ffcc00', size: 0.04, regions: [{lat:-26,lon:28}, {lat:40,lon:-116}, {lat:30,lon:120}, {lat:-32,lon:121}, {lat:60,lon:114}] },
    { name: 'Copper', color: '#ff7733', size: 0.035, regions: [{lat:-23,lon:-69}, {lat:33,lon:-111}, {lat:-10,lon:26}, {lat:-15,lon:-72}, {lat:55,lon:60}] },
    { name: 'Lithium', color: '#eeeeff', size: 0.035, regions: [{lat:-20,lon:-67}, {lat:-30,lon:119}, {lat:40,lon:110}, {lat:38,lon:-118}] },
    { name: 'Silver', color: '#dddddd', size: 0.03, regions: [{lat:23,lon:-102}, {lat:-15,lon:-75}, {lat:35,lon:105}, {lat:-25,lon:140}] },
    { name: 'Rare Earths', color: '#ff33ff', size: 0.04, regions: [{lat:40,lon:109}, {lat:67,lon:-100}, {lat:-20,lon:130}, {lat:11,lon:78}] }
  ];

  metalsData.forEach(hub => {
    hub.regions.forEach(r => {
      for(let i=0; i<12; i++) { // highly dense clustering for metals
         createMetalSprite(r.lat + (Math.random()*6-3), r.lon + (Math.random()*6-3), hub.color, hub.size, hub.name);
      }
    });
  });

  console.log("Global Metals Trade Overlay Initialized.");
}
initMetalsTrade();

  console.log("Global Arms Industry Overlay Initialized.");
}
initArmsIndustry();

window.companiesGroup = new THREE.Group();
window.companiesGroup.visible = false;
scene.add(window.companiesGroup);

function initCompanies() {
  const companiesData = [{"name":"NVIDIA","city":"Santa Clara CA","lat":37.3541,"lon":-121.9552},{"name":"Apple","city":"Cupertino CA","lat":37.3229,"lon":-122.0322},{"name":"Alphabet (Google)","city":"Mountain View CA","lat":37.3861,"lon":-122.0839},{"name":"Microsoft","city":"Redmond WA","lat":47.674,"lon":-122.1215},{"name":"Amazon","city":"Seattle WA","lat":47.6062,"lon":-122.3321},{"name":"TSMC","city":"Hsinchu","lat":24.8086,"lon":120.9705},{"name":"Saudi Aramco","city":"Dhahran","lat":26.2994,"lon":50.1133},{"name":"Meta Platforms","city":"Menlo Park CA","lat":37.4532,"lon":-122.1817},{"name":"Broadcom","city":"San Jose CA","lat":37.3382,"lon":-121.8863},{"name":"Tesla","city":"Austin TX","lat":30.2672,"lon":-97.7431},{"name":"Berkshire Hathaway","city":"Omaha NE","lat":41.2565,"lon":-95.9345},{"name":"Walmart","city":"Bentonville AR","lat":36.3729,"lon":-94.2088},{"name":"Eli Lilly","city":"Indianapolis IN","lat":39.7684,"lon":-86.1581},{"name":"Samsung","city":"Seoul","lat":37.5665,"lon":126.978},{"name":"JPMorgan Chase","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"Exxon Mobil","city":"Irving TX","lat":32.814,"lon":-96.9489},{"name":"Visa","city":"San Francisco CA","lat":37.7749,"lon":-122.4194},{"name":"Tencent","city":"Shenzhen","lat":22.5431,"lon":114.0579},{"name":"Johnson & Johnson","city":"New Brunswick NJ","lat":40.4862,"lon":-74.4518},{"name":"ASML","city":"Veldhoven","lat":51.4077,"lon":5.3933},{"name":"Mastercard","city":"Purchase NY","lat":41.0334,"lon":-73.7045},{"name":"Costco","city":"Issaquah WA","lat":47.5301,"lon":-122.0326},{"name":"Oracle","city":"Austin TX","lat":30.2672,"lon":-97.7431},{"name":"SK Hynix","city":"Icheon","lat":37.2723,"lon":127.4348},{"name":"Netflix","city":"Los Gatos CA","lat":37.2266,"lon":-121.9747},{"name":"Micron Technology","city":"Boise ID","lat":43.615,"lon":-116.2023},{"name":"AbbVie","city":"North Chicago IL","lat":42.3256,"lon":-87.8412},{"name":"Chevron","city":"San Ramon CA","lat":37.78,"lon":-121.978},{"name":"Palantir","city":"Denver CO","lat":39.7392,"lon":-104.9903},{"name":"ICBC","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Procter & Gamble","city":"Cincinnati OH","lat":39.1031,"lon":-84.512},{"name":"Home Depot","city":"Atlanta GA","lat":33.749,"lon":-84.388},{"name":"Bank of America","city":"Charlotte NC","lat":35.2271,"lon":-80.8431},{"name":"Roche","city":"Basel","lat":47.5596,"lon":7.5886},{"name":"General Electric","city":"Boston MA","lat":42.3601,"lon":-71.0589},{"name":"China Construction Bank","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Agricultural Bank of China","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Coca-Cola","city":"Atlanta GA","lat":33.749,"lon":-84.388},{"name":"PetroChina","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Caterpillar","city":"Peoria IL","lat":40.6936,"lon":-89.589},{"name":"AMD","city":"Santa Clara CA","lat":37.3541,"lon":-121.9552},{"name":"Alibaba","city":"Hangzhou","lat":30.2741,"lon":120.1551},{"name":"Cisco","city":"San Jose CA","lat":37.3382,"lon":-121.8863},{"name":"Novartis","city":"Basel","lat":47.5596,"lon":7.5886},{"name":"AstraZeneca","city":"Cambridge","lat":52.2053,"lon":0.1218},{"name":"LVMH","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"HSBC","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Merck","city":"Rahway NJ","lat":40.5695,"lon":-74.3308},{"name":"Toyota","city":"Toyota City","lat":35.0824,"lon":137.1563},{"name":"RTX","city":"Arlington VA","lat":38.879,"lon":-77.1068},{"name":"Nestl\u00e9","city":"Vevey","lat":46.4628,"lon":6.8419},{"name":"Philip Morris International","city":"Stamford CT","lat":41.0534,"lon":-73.5387},{"name":"UnitedHealth","city":"Minnetonka MN","lat":44.9212,"lon":-93.4687},{"name":"Applied Materials","city":"Santa Clara CA","lat":37.3541,"lon":-121.9552},{"name":"Kweichow Moutai","city":"Maotai Guizhou","lat":27.8192,"lon":106.4164},{"name":"Morgan Stanley","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"Wells Fargo","city":"San Francisco CA","lat":37.7749,"lon":-122.4194},{"name":"Bank of China","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Lam Research","city":"Fremont CA","lat":37.5485,"lon":-121.9886},{"name":"T-Mobile US","city":"Bellevue WA","lat":47.6101,"lon":-122.2015},{"name":"Goldman Sachs","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"IBM","city":"Armonk NY","lat":41.1265,"lon":-73.7141},{"name":"Shell","city":"London","lat":51.5074,"lon":-0.1278},{"name":"CATL","city":"Ningde","lat":26.6657,"lon":119.5272},{"name":"SAP","city":"Walldorf","lat":49.3044,"lon":8.6419},{"name":"McDonald's","city":"Chicago IL","lat":41.8781,"lon":-87.6298},{"name":"International Holding Company","city":"Abu Dhabi","lat":24.4539,"lon":54.3773},{"name":"Herm\u00e8s","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"L'Or\u00e9al","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Royal Bank of Canada","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Linde","city":"Guildford","lat":51.2362,"lon":-0.5704},{"name":"China Mobile","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Pepsico","city":"Purchase NY","lat":41.0334,"lon":-73.7045},{"name":"Intel","city":"Santa Clara CA","lat":37.3541,"lon":-121.9552},{"name":"Verizon","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"GE Vernova","city":"Cambridge MA","lat":42.3736,"lon":-71.1097},{"name":"Prosus","city":"Amsterdam","lat":52.3676,"lon":4.9041},{"name":"American Express","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"Reliance Industries","city":"Mumbai","lat":19.076,"lon":72.8777},{"name":"Siemens","city":"Munich","lat":48.1351,"lon":11.582},{"name":"AT&T","city":"Dallas TX","lat":32.7767,"lon":-96.797},{"name":"Commonwealth Bank","city":"Sydney","lat":-33.8688,"lon":151.2093},{"name":"Amgen","city":"Thousand Oaks CA","lat":34.1706,"lon":-118.8376},{"name":"Mitsubishi UFJ Financial","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Abbott Laboratories","city":"Abbott Park IL","lat":42.3036,"lon":-87.8995},{"name":"NextEra Energy","city":"Juno Beach FL","lat":26.8841,"lon":-80.0731},{"name":"Salesforce","city":"San Francisco CA","lat":37.7749,"lon":-122.4194},{"name":"Thermo Fisher Scientific","city":"Waltham MA","lat":42.3765,"lon":-71.2356},{"name":"Inditex","city":"Arteixo","lat":43.3073,"lon":-8.4075},{"name":"Citigroup","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"BHP Group","city":"Melbourne","lat":-37.8136,"lon":144.9631},{"name":"Deutsche Telekom","city":"Bonn","lat":50.7374,"lon":7.0982},{"name":"Boeing","city":"Arlington VA","lat":38.879,"lon":-77.1068},{"name":"Walt Disney","city":"Burbank CA","lat":34.1808,"lon":-118.3089},{"name":"Gilead Sciences","city":"Foster City CA","lat":37.5585,"lon":-122.2711},{"name":"TJX Companies","city":"Framingham MA","lat":42.2973,"lon":-71.428},{"name":"KLA","city":"Milpitas CA","lat":37.4323,"lon":-121.8996},{"name":"Texas Instruments","city":"Dallas TX","lat":32.7767,"lon":-96.797},{"name":"China Life Insurance","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Intuitive Surgical","city":"Sunnyvale CA","lat":37.3688,"lon":-122.0363},{"name":"Union Pacific","city":"Omaha NE","lat":41.2565,"lon":-95.9345},{"name":"United Parcel Service (UPS)","city":"Atlanta GA","lat":33.749,"lon":-84.388},{"name":"RTX Corp","city":"Arlington VA","lat":38.879,"lon":-77.1068},{"name":"Honeywell","city":"Charlotte NC","lat":35.2271,"lon":-80.8431},{"name":"Deere & Company","city":"Moline IL","lat":41.5067,"lon":-90.5151},{"name":"Elevance Health","city":"Indianapolis IN","lat":39.7684,"lon":-86.1581},{"name":"CVS Health","city":"Woonsocket RI","lat":42.0009,"lon":-71.5148},{"name":"Cigna","city":"Bloomfield CT","lat":41.8262,"lon":-72.8371},{"name":"Centene","city":"St. Louis MO","lat":38.627,"lon":-90.1994},{"name":"Humana","city":"Louisville KY","lat":38.2527,"lon":-85.7585},{"name":"McKesson","city":"Irving TX","lat":32.814,"lon":-96.9489},{"name":"Cardinal Health","city":"Dublin OH","lat":40.0992,"lon":-83.1141},{"name":"Cencora","city":"Conshohocken PA","lat":40.0793,"lon":-75.309},{"name":"Target","city":"Minneapolis MN","lat":44.9778,"lon":-93.265},{"name":"Lowe's","city":"Mooresville NC","lat":35.5832,"lon":-80.8089},{"name":"Dollar General","city":"Goodlettsville TN","lat":36.3895,"lon":-86.7017},{"name":"O'Reilly Automotive","city":"Springfield MO","lat":37.2089,"lon":-93.2922},{"name":"AutoZone","city":"Memphis TN","lat":35.1495,"lon":-90.0489},{"name":"Chipotle","city":"Newport Beach CA","lat":33.6283,"lon":-117.9275},{"name":"Yum! Brands","city":"Louisville KY","lat":38.2527,"lon":-85.7585},{"name":"Darden Restaurants","city":"Orlando FL","lat":28.5383,"lon":-81.3792},{"name":"Hilton Worldwide","city":"McLean VA","lat":38.9338,"lon":-77.1772},{"name":"Marriott International","city":"Bethesda MD","lat":38.9847,"lon":-77.0947},{"name":"Las Vegas Sands","city":"Las Vegas NV","lat":36.1699,"lon":-115.1398},{"name":"MGM Resorts","city":"Las Vegas NV","lat":36.1699,"lon":-115.1398},{"name":"Airbnb","city":"San Francisco CA","lat":37.7749,"lon":-122.4194},{"name":"Booking Holdings","city":"Norwalk CT","lat":41.1177,"lon":-73.4082},{"name":"Sony Group","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Nintendo","city":"Kyoto","lat":34.9754,"lon":135.761},{"name":"Electronic Arts (EA)","city":"Redwood City CA","lat":37.4852,"lon":-122.2363},{"name":"Take-Two Interactive","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"Ametek","city":"Berwyn PA","lat":40.0442,"lon":-75.4411},{"name":"Eaton","city":"Dublin","lat":53.3498,"lon":-6.2603},{"name":"Parker-Hannifin","city":"Cleveland OH","lat":41.4993,"lon":-81.6943},{"name":"Trane Technologies","city":"Swords","lat":53.4597,"lon":-6.2185},{"name":"Carrier Global","city":"Palm Beach Gardens FL","lat":26.8233,"lon":-80.1386},{"name":"Johnson Controls","city":"Cork","lat":51.8985,"lon":-8.4756},{"name":"Waste Management","city":"Houston TX","lat":29.7604,"lon":-95.3698},{"name":"Republic Services","city":"Phoenix AZ","lat":33.4484,"lon":-112.074},{"name":"Air Products and Chemicals","city":"Allentown PA","lat":40.6084,"lon":-75.4901},{"name":"Ecolab","city":"St. Paul MN","lat":44.9537,"lon":-93.09},{"name":"Sherwin-Williams","city":"Cleveland OH","lat":41.4993,"lon":-81.6943},{"name":"PPG Industries","city":"Pittsburgh PA","lat":40.4406,"lon":-79.9958},{"name":"Dow","city":"Midland MI","lat":43.6155,"lon":-84.2472},{"name":"LyondellBasell","city":"Houston TX","lat":29.7604,"lon":-95.3698},{"name":"DuPont","city":"Wilmington DE","lat":39.739,"lon":-75.5397},{"name":"Nucor","city":"Charlotte NC","lat":35.2271,"lon":-80.8431},{"name":"Freeport-McMoRan","city":"Phoenix AZ","lat":33.4484,"lon":-112.074},{"name":"Newmont","city":"Denver CO","lat":39.7392,"lon":-104.9903},{"name":"Barrick Gold","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Prologis","city":"San Francisco CA","lat":37.7749,"lon":-122.4194},{"name":"American Tower","city":"Boston MA","lat":42.3601,"lon":-71.0589},{"name":"Equinix","city":"Redwood City CA","lat":37.4852,"lon":-122.2363},{"name":"Crown Castle","city":"Houston TX","lat":29.7604,"lon":-95.3698},{"name":"Public Storage","city":"Glendale CA","lat":34.1425,"lon":-118.2551},{"name":"Simon Property Group","city":"Indianapolis IN","lat":39.7684,"lon":-86.1581},{"name":"Realty Income","city":"San Diego CA","lat":32.7157,"lon":-117.1611},{"name":"Welltower","city":"Toledo OH","lat":41.6528,"lon":-83.5378},{"name":"AvalonBay Communities","city":"Arlington VA","lat":38.879,"lon":-77.1068},{"name":"Equity Residential","city":"Chicago IL","lat":41.8781,"lon":-87.6298},{"name":"Constellation Energy","city":"Baltimore MD","lat":39.2903,"lon":-76.6121},{"name":"Dominion Energy","city":"Richmond VA","lat":37.5407,"lon":-77.436},{"name":"Sempra Energy","city":"San Diego CA","lat":32.7157,"lon":-117.1611},{"name":"American Electric Power","city":"Columbus OH","lat":39.9611,"lon":-82.9987},{"name":"Exelon","city":"Chicago IL","lat":41.8781,"lon":-87.6298},{"name":"Xcel Energy","city":"Minneapolis MN","lat":44.9778,"lon":-93.265},{"name":"Consolidated Edison","city":"New York NY","lat":40.7128,"lon":-74.006},{"name":"WEC Energy Group","city":"Milwaukee WI","lat":43.0389,"lon":-87.9064},{"name":"Edison International","city":"Rosemead CA","lat":34.0805,"lon":-118.0728},{"name":"DTE Energy","city":"Detroit MI","lat":42.3314,"lon":-83.0458},{"name":"Entergy","city":"New Orleans LA","lat":29.951,"lon":-90.0715},{"name":"FirstEnergy","city":"Akron OH","lat":41.0814,"lon":-81.519},{"name":"PPL Corporation","city":"Allentown PA","lat":40.6084,"lon":-75.4901},{"name":"Ameren","city":"St. Louis MO","lat":38.627,"lon":-90.1994},{"name":"Eversource Energy","city":"Springfield MA","lat":42.1014,"lon":-72.5898},{"name":"CenterPoint Energy","city":"Houston TX","lat":29.7604,"lon":-95.3698},{"name":"CMS Energy","city":"Jackson MI","lat":42.2458,"lon":-84.4013},{"name":"Alliant Energy","city":"Madison WI","lat":43.073,"lon":-89.4012},{"name":"Evergy","city":"Kansas City MO","lat":39.0997,"lon":-94.5785},{"name":"NiSource","city":"Merrillville IN","lat":41.4828,"lon":-87.3328},{"name":"Pinnacle West","city":"Phoenix AZ","lat":33.4484,"lon":-112.074},{"name":"Vistra Corp","city":"Irving TX","lat":32.814,"lon":-96.9489},{"name":"NRG Energy","city":"Houston TX","lat":29.7604,"lon":-95.3698},{"name":"AES Corporation","city":"Arlington VA","lat":38.879,"lon":-77.1068},{"name":"Atmos Energy","city":"Dallas TX","lat":32.7767,"lon":-96.797},{"name":"UGI Corporation","city":"King of Prussia PA","lat":40.0881,"lon":-75.3813},{"name":"National Grid","city":"London","lat":51.5074,"lon":-0.1278},{"name":"E.ON","city":"Essen","lat":51.4556,"lon":7.0115},{"name":"RWE","city":"Essen","lat":51.4556,"lon":7.0115},{"name":"Engie","city":"Courbevoie","lat":48.897,"lon":2.269},{"name":"SSE","city":"Perth","lat":56.3949,"lon":-3.4308},{"name":"Iberdrola","city":"Bilbao","lat":43.2627,"lon":-2.9252},{"name":"Enel","city":"Rome","lat":41.9027,"lon":12.4963},{"name":"Orsted","city":"Fredericia","lat":55.5651,"lon":9.754},{"name":"EDF","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Terna","city":"Rome","lat":41.9027,"lon":12.4963},{"name":"Red Electrica","city":"Alcobendas","lat":40.5474,"lon":-3.642},{"name":"Duke Energy","city":"Charlotte NC","lat":35.2271,"lon":-80.8431},{"name":"Southern Company","city":"Atlanta GA","lat":33.749,"lon":-84.388},{"name":"NextEra Energy","city":"Juno Beach FL","lat":26.8841,"lon":-80.0731},{"name":"ServiceNow","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"Booking Holdings","city":"Norwalk, Connecticut","lat":41.1177,"lon":-73.4082},{"name":"Schneider Electric","city":"Rueil-Malmaison","lat":48.8769,"lon":2.1789},{"name":"Airbus","city":"Blagnac","lat":43.636,"lon":1.3862},{"name":"Siemens","city":"Munich","lat":48.1351,"lon":11.582},{"name":"HSBC Holdings","city":"London","lat":51.5074,"lon":-0.1278},{"name":"L'Or\u00e9al","city":"Clichy","lat":48.9045,"lon":2.3093},{"name":"Toyota Motor","city":"Toyota City","lat":35.0824,"lon":137.1563},{"name":"Novartis","city":"Basel","lat":47.5596,"lon":7.5886},{"name":"Alibaba Group","city":"Hangzhou","lat":30.2741,"lon":120.1551},{"name":"Sony Group","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Nestl\u00e9","city":"Vevey","lat":46.4628,"lon":6.8419},{"name":"Novo Nordisk","city":"Bagsv\u00e6rd","lat":55.7622,"lon":12.4605},{"name":"SAP","city":"Walldorf","lat":49.3044,"lon":8.6419},{"name":"Reliance Industries","city":"Mumbai","lat":19.076,"lon":72.8777},{"name":"TotalEnergies","city":"Courbevoie","lat":48.897,"lon":2.269},{"name":"Deutsche Telekom","city":"Bonn","lat":50.7374,"lon":7.0982},{"name":"BHP Group","city":"Melbourne","lat":-37.8136,"lon":144.9631},{"name":"Rio TintoUK/","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Enel","city":"Rome","lat":41.9028,"lon":12.4964},{"name":"Petrobras","city":"Rio de Janeiro","lat":-22.9068,"lon":-43.1729},{"name":"Vale","city":"Rio de Janeiro","lat":-22.9068,"lon":-43.1729},{"name":"Infosys","city":"Bengaluru","lat":12.9716,"lon":77.5946},{"name":"Tata Consultancy Services","city":"Mumbai","lat":19.076,"lon":72.8777},{"name":"China Mobile","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Ping An Insurance","city":"Shenzhen","lat":22.5431,"lon":114.0579},{"name":"Banco Santander","city":"Madrid","lat":40.4168,"lon":-3.7038},{"name":"BNP Paribas","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Mitsubishi UFJ Financial","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Ita\u00fa Unibanco","city":"S\u00e3o Paulo","lat":-23.5505,"lon":-46.6333},{"name":"Uber Technologies","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Accenture","city":"Dublin","lat":53.3498,"lon":-6.2603},{"name":"Caterpillar","city":"Irving, Texas","lat":32.814,"lon":-96.9489},{"name":"International Business Machines (IBM)","city":"Armonk, New York","lat":41.1265,"lon":-73.7141},{"name":"American Express","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Morgan Stanley","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Goldman Sachs","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Lockheed Martin","city":"Bethesda, Maryland","lat":38.9847,"lon":-77.0947},{"name":"RTX (Raytheon Technologies)","city":"Arlington, Virginia","lat":38.879,"lon":-77.1068},{"name":"Honeywell","city":"Charlotte, North Carolina","lat":35.2271,"lon":-80.8431},{"name":"Deere & Company","city":"Moline, Illinois","lat":41.5067,"lon":-90.5151},{"name":"Union Pacific","city":"Omaha, Nebraska","lat":41.2565,"lon":-95.9345},{"name":"BlackRock","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Chubb","city":"Zurich","lat":47.3769,"lon":8.5417},{"name":"Zoetis","city":"Parsippany, New Jersey","lat":40.8573,"lon":-74.4259},{"name":"Regeneron Pharmaceuticals","city":"Tarrytown, New York","lat":41.0762,"lon":-73.8587},{"name":"Gilead Sciences","city":"Foster City, California","lat":37.5585,"lon":-122.2711},{"name":"Vertex Pharmaceuticals","city":"Boston, Massachusetts","lat":42.3601,"lon":-71.0589},{"name":"Amgen","city":"Thousand Oaks, California","lat":34.1706,"lon":-118.8376},{"name":"Intuitive Surgical","city":"Sunnyvale, California","lat":37.3688,"lon":-122.0363},{"name":"Stryker","city":"Kalamazoo, Michigan","lat":42.2917,"lon":-85.5872},{"name":"Medtronic","city":"Dublin","lat":53.3498,"lon":-6.2603},{"name":"Boston Scientific","city":"Marlborough, Massachusetts","lat":42.3459,"lon":-71.5523},{"name":"Edwards Lifesciences","city":"Irvine, California","lat":33.6695,"lon":-117.8231},{"name":"Elevance Health","city":"Indianapolis, Indiana","lat":39.7684,"lon":-86.1581},{"name":"Cigna","city":"Bloomfield, Connecticut","lat":41.8262,"lon":-72.8371},{"name":"Humana","city":"Louisville, Kentucky","lat":38.2527,"lon":-85.7585},{"name":"Centene","city":"St. Louis, Missouri","lat":38.627,"lon":-90.1994},{"name":"CVS Health","city":"Woonsocket, Rhode Island","lat":42.0009,"lon":-71.5148},{"name":"McKesson","city":"Irving, Texas","lat":32.814,"lon":-96.9489},{"name":"Cardinal Health","city":"Dublin, Ohio","lat":40.0992,"lon":-83.1141},{"name":"AmerisourceBergen (Cencora)","city":"Conshohocken, Pennsylvania","lat":40.0793,"lon":-75.309},{"name":"Starbucks","city":"Seattle, Washington","lat":47.6062,"lon":-122.3321},{"name":"McDonald's","city":"Chicago, Illinois","lat":41.8781,"lon":-87.6298},{"name":"Chipotle Mexican Grill","city":"Newport Beach, California","lat":33.6283,"lon":-117.9275},{"name":"Yum! Brands","city":"Louisville, Kentucky","lat":38.2527,"lon":-85.7585},{"name":"Restaurant Brands International","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Nike","city":"Beaverton, Oregon","lat":45.4871,"lon":-122.8037},{"name":"Adidas","city":"Herzogenaurach","lat":49.568,"lon":10.8825},{"name":"Puma","city":"Herzogenaurach","lat":49.568,"lon":10.8825},{"name":"LVMH","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Herm\u00e8s","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Kering","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Richemont","city":"Bellevue","lat":46.4585,"lon":6.154},{"name":"EssilorLuxottica","city":"Charenton-le-Pont","lat":48.822,"lon":2.412},{"name":"Ferrari","city":"Maranello","lat":44.525,"lon":10.864},{"name":"Stellantis","city":"Hoogoorddreef","lat":52.338,"lon":4.87},{"name":"Volkswagen","city":"Wolfsburg","lat":52.4227,"lon":10.7865},{"name":"BMW","city":"Munich","lat":48.1351,"lon":11.582},{"name":"Mercedes-Benz Group","city":"Stuttgart","lat":48.7758,"lon":9.1829},{"name":"Honda Motor","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Hyundai Motor","city":"Seoul","lat":37.5665,"lon":126.978},{"name":"BYD","city":"Shenzhen","lat":22.5431,"lon":114.0579},{"name":"Li Auto","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"NIO","city":"Shanghai","lat":31.2304,"lon":121.4737},{"name":"XPeng","city":"Guangzhou","lat":23.1291,"lon":113.2644},{"name":"Zeekr","city":"Ningbo","lat":29.8683,"lon":121.5439},{"name":"Rivian","city":"Irvine, California","lat":33.6695,"lon":-117.827},{"name":"Lucid Group","city":"Newark, California","lat":37.5297,"lon":-122.0402},{"name":"General Motors","city":"Detroit, Michigan","lat":42.3314,"lon":-83.0458},{"name":"Ford Motor","city":"Dearborn, Michigan","lat":42.3223,"lon":-83.1763},{"name":"Volkswagen Group","city":"Wolfsburg","lat":52.4227,"lon":10.7865},{"name":"Porsche","city":"Stuttgart","lat":48.7758,"lon":9.1829},{"name":"Volvo Cars","city":"Gothenburg","lat":57.7089,"lon":11.9746},{"name":"Geely","city":"Hangzhou","lat":30.2741,"lon":120.1551},{"name":"JD.com","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"PDD Holdings (Pinduoduo)","city":"Shanghai","lat":31.2304,"lon":121.4737},{"name":"Meituan","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Baidu","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"NetEase","city":"Hangzhou","lat":30.2741,"lon":120.1551},{"name":"Sea Limited","city":"Singapore","lat":1.3521,"lon":103.8198},{"name":"MercadoLibre","city":"Montevideo (ops)","lat":-34.9011,"lon":-56.1645},{"name":"Coupang","city":"Seoul","lat":37.5665,"lon":126.978},{"name":"Adyen","city":"Amsterdam","lat":52.3676,"lon":4.9041},{"name":"Shopify","city":"Ottawa","lat":45.4215,"lon":-75.6972},{"name":"Snowflake","city":"Bozeman, Montana","lat":45.677,"lon":-111.0429},{"name":"CrowdStrike","city":"Austin, Texas","lat":30.2672,"lon":-97.7431},{"name":"Datadog","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Palantir Technologies","city":"Denver, Colorado","lat":39.7392,"lon":-104.9903},{"name":"The Trade Desk","city":"Ventura, California","lat":34.2784,"lon":-119.2922},{"name":"Roblox","city":"San Mateo, California","lat":37.5625,"lon":-122.3255},{"name":"DoorDash","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Fortinet","city":"Sunnyvale, California","lat":37.3688,"lon":-122.0363},{"name":"Monolithic Power Systems","city":"Kirkland, Washington","lat":47.6769,"lon":-122.206},{"name":"Axon Enterprise","city":"Scottsdale, Arizona","lat":33.4942,"lon":-111.9261},{"name":"Copart","city":"Dallas, Texas","lat":32.7767,"lon":-96.797},{"name":"MicroStrategy","city":"Tysons, Virginia","lat":38.9187,"lon":-77.2311},{"name":"Arista Networks","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"KLA Corporation","city":"Milpitas, California","lat":37.4323,"lon":-121.8996},{"name":"Lam Research","city":"Fremont, California","lat":37.5485,"lon":-121.9886},{"name":"Applied Materials","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"ASML Holding","city":"Veldhoven","lat":51.4077,"lon":5.3933},{"name":"Tokyo Electron","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Advantest","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Teradyne","city":"North Reading, Massachusetts","lat":42.5751,"lon":-71.0787},{"name":"Analog Devices","city":"Norwood, Massachusetts","lat":42.1945,"lon":-71.1995},{"name":"Texas Instruments","city":"Dallas, Texas","lat":32.7767,"lon":-96.797},{"name":"Qualcomm","city":"San Diego, California","lat":32.7157,"lon":-117.1611},{"name":"Broadcom","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"AMD","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"Intel","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"Micron Technology","city":"Boise, Idaho","lat":43.615,"lon":-116.2023},{"name":"SK Hynix","city":"Icheon","lat":37.2723,"lon":127.4348},{"name":"Samsung Electronics","city":"Suwon","lat":37.2636,"lon":127.0286},{"name":"TSMC","city":"Hsinchu","lat":24.8086,"lon":120.9705},{"name":"MediaTek","city":"Hsinchu","lat":24.8086,"lon":120.9705},{"name":"Arm Holdings","city":"Cambridge","lat":52.2053,"lon":0.1218},{"name":"Super Micro Computer","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Dell Technologies","city":"Round Rock, Texas","lat":30.5083,"lon":-97.6789},{"name":"HP Inc.","city":"Palo Alto, California","lat":37.4419,"lon":-122.143},{"name":"Lenovo","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Cisco Systems","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Juniper Networks","city":"Sunnyvale, California","lat":37.3688,"lon":-122.0363},{"name":"F5","city":"Seattle, Washington","lat":47.6062,"lon":-122.3321},{"name":"Palo Alto Networks","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"Zscaler","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Cloudflare","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Okta","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Splunk (now Cisco)","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Adobe","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Autodesk","city":"San Rafael, California","lat":37.9735,"lon":-122.5311},{"name":"Intuit","city":"Mountain View, California","lat":37.3861,"lon":-122.0839},{"name":"PayPal","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Block (Square)","city":"Oakland, California","lat":37.8044,"lon":-122.2711},{"name":"Visa","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Mastercard","city":"Purchase, New York","lat":41.0334,"lon":-73.7045},{"name":"Paychex","city":"Rochester, New York","lat":43.1566,"lon":-77.6088},{"name":"ADP","city":"Roseland, New Jersey","lat":40.8201,"lon":-74.2938},{"name":"S&P Global","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Moody's","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"CME Group","city":"Chicago, Illinois","lat":41.8781,"lon":-87.6298},{"name":"Intercontinental Exchange","city":"Atlanta, Georgia","lat":33.749,"lon":-84.388},{"name":"Charles Schwab","city":"Westlake, Texas","lat":33.016,"lon":-97.1895},{"name":"Interactive Brokers","city":"Greenwich, Connecticut","lat":41.0262,"lon":-73.6282},{"name":"Robinhood","city":"Menlo Park, California","lat":37.4532,"lon":-122.1817},{"name":"Coinbase","city":"Remote (HQ Denver ops)","lat":39.7392,"lon":-104.9903},{"name":"Marathon Digital","city":"Fort Lauderdale, Florida","lat":26.1224,"lon":-80.1373},{"name":"Riot Platforms","city":"Castle Rock, Colorado","lat":39.3722,"lon":-104.8561},{"name":"CleanSpark","city":"Henderson, Nevada","lat":36.0395,"lon":-114.9817},{"name":"Core Scientific","city":"Austin, Texas","lat":30.2672,"lon":-97.7431},{"name":"ConocoPhillips","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"ExxonMobil","city":"Irving, Texas","lat":32.814,"lon":-96.9489},{"name":"Chevron","city":"San Ramon, California","lat":37.78,"lon":-121.978},{"name":"Occidental Petroleum","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"EOG Resources","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Devon Energy","city":"Oklahoma City, Oklahoma","lat":35.4676,"lon":-97.5164},{"name":"Pioneer Natural Resources","city":"Irving, Texas","lat":32.814,"lon":-96.9489},{"name":"Schlumberger","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Halliburton","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Baker Hughes","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Saudi Aramco","city":"Dhahran","lat":26.2994,"lon":50.1133},{"name":"PetroChina","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Sinopec","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"CNOOC","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Equinor","city":"Stavanger","lat":58.97,"lon":5.7333},{"name":"Shell","city":"London","lat":51.5074,"lon":-0.1278},{"name":"BP","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Eni","city":"Rome","lat":41.9028,"lon":12.4964},{"name":"Woodside Energy","city":"Perth","lat":-31.9505,"lon":115.8605},{"name":"Santos","city":"Adelaide","lat":-34.9285,"lon":138.6007},{"name":"Newmont","city":"Denver, Colorado","lat":39.7392,"lon":-104.9903},{"name":"Barrick Gold","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Agnico Eagle Mines","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Zijin Mining","city":"Longyan","lat":25.0746,"lon":117.0177},{"name":"Southern Copper","city":"Phoenix, Arizona","lat":33.4484,"lon":-112.074},{"name":"Freeport-McMoRan","city":"Phoenix, Arizona","lat":33.4484,"lon":-112.074},{"name":"Glencore","city":"Baar","lat":47.195,"lon":8.5333},{"name":"Anglo American","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Fortescue","city":"Perth","lat":-31.9505,"lon":115.8605},{"name":"Vale","city":"Rio de Janeiro","lat":-22.9068,"lon":-43.1729},{"name":"Procter & Gamble","city":"Cincinnati, Ohio","lat":39.1031,"lon":-84.512},{"name":"Unilever","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Colgate-Palmolive","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Kimberly-Clark","city":"Irving, Texas","lat":32.814,"lon":-96.9489},{"name":"Est\u00e9e Lauder","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Coca-Cola","city":"Atlanta, Georgia","lat":33.749,"lon":-84.388},{"name":"PepsiCo","city":"Purchase, New York","lat":41.0334,"lon":-73.7045},{"name":"Monster Beverage","city":"Corona, California","lat":33.8753,"lon":-117.5664},{"name":"Keurig Dr Pepper","city":"Burlington, Massachusetts","lat":42.5043,"lon":-71.1956},{"name":"Diageo","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Anheuser-Busch InBev","city":"Leuven","lat":50.8792,"lon":4.7005},{"name":"Heineken","city":"Amsterdam","lat":52.3676,"lon":4.9041},{"name":"Constellation Brands","city":"Victor, New York","lat":42.9825,"lon":-77.4089},{"name":"Philip Morris International","city":"Stamford, Connecticut","lat":41.0534,"lon":-73.5387},{"name":"Altria Group","city":"Richmond, Virginia","lat":37.5407,"lon":-77.436},{"name":"British American Tobacco","city":"London","lat":51.5074,"lon":-0.1278},{"name":"Imperial Brands","city":"Bristol","lat":51.4545,"lon":-2.5879},{"name":"Johnson & Johnson","city":"New Brunswick, New Jersey","lat":40.4862,"lon":-74.4518},{"name":"Merck & Co.","city":"Rahway, New Jersey","lat":40.5695,"lon":-74.3308},{"name":"Pfizer","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"AbbVie","city":"North Chicago, Illinois","lat":42.3256,"lon":-87.8412},{"name":"Bristol-Myers Squibb","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Eli Lilly","city":"Indianapolis, Indiana","lat":39.7684,"lon":-86.1581},{"name":"AstraZeneca","city":"Cambridge","lat":52.2053,"lon":0.1218},{"name":"Sanofi","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Roche","city":"Basel","lat":47.5596,"lon":7.5886},{"name":"GlaxoSmithKline (GSK)","city":"Brentford","lat":51.4874,"lon":-0.3086},{"name":"Takeda Pharmaceutical","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Daiichi Sankyo","city":"Tokyo","lat":35.6762,"lon":139.6503},{"name":"Walmart","city":"Bentonville, Arkansas","lat":36.3729,"lon":-94.2088},{"name":"Costco Wholesale","city":"Issaquah, Washington","lat":47.5301,"lon":-122.0326},{"name":"Target","city":"Minneapolis, Minnesota","lat":44.9778,"lon":-93.265},{"name":"Home Depot","city":"Atlanta, Georgia","lat":33.749,"lon":-84.388},{"name":"Lowe's","city":"Mooresville, North Carolina","lat":35.5832,"lon":-80.8089},{"name":"TJX Companies","city":"Framingham, Massachusetts","lat":42.2973,"lon":-71.428},{"name":"Ross Stores","city":"Dublin, California","lat":37.7022,"lon":-121.936},{"name":"Dollar General","city":"Goodlettsville, Tennessee","lat":36.3895,"lon":-86.7017},{"name":"Dollar Tree","city":"Chesapeake, Virginia","lat":36.7682,"lon":-76.2875},{"name":"Alibaba","city":"Hangzhou","lat":30.2741,"lon":120.1551},{"name":"Tencent","city":"Shenzhen","lat":22.5431,"lon":114.0579},{"name":"ICBC","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"China Construction Bank","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Agricultural Bank of China","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"Bank of China","city":"Beijing","lat":39.9042,"lon":116.4074},{"name":"JPMorgan Chase","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Bank of America","city":"Charlotte, North Carolina","lat":35.2271,"lon":-80.8431},{"name":"Wells Fargo","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Citigroup","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Royal Bank of Canada","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"Toronto-Dominion Bank","city":"Toronto","lat":43.6532,"lon":-79.3832},{"name":"HDFC Bank","city":"Mumbai","lat":19.076,"lon":72.8777},{"name":"State Bank of India","city":"Mumbai","lat":19.076,"lon":72.8777},{"name":"DBS Group","city":"Singapore","lat":1.3521,"lon":103.8198},{"name":"Commonwealth Bank of Australia","city":"Sydney","lat":-33.8688,"lon":151.2093},{"name":"UBS Group","city":"Zurich","lat":47.3769,"lon":8.5417},{"name":"Allianz","city":"Munich","lat":48.1351,"lon":11.582},{"name":"AXA","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Zurich Insurance","city":"Zurich","lat":47.3769,"lon":8.5417},{"name":"Berkshire Hathaway","city":"Omaha, Nebraska","lat":41.2565,"lon":-95.9345},{"name":"Meta Platforms","city":"Menlo Park, California","lat":37.4532,"lon":-122.1817},{"name":"Tesla","city":"Austin, Texas","lat":30.2672,"lon":-97.7431},{"name":"Netflix","city":"Los Gatos, California","lat":37.2266,"lon":-121.9747},{"name":"Walt Disney","city":"Burbank, California","lat":34.1808,"lon":-118.3089},{"name":"Comcast","city":"Philadelphia, Pennsylvania","lat":39.9526,"lon":-75.1652},{"name":"Warner Bros. Discovery","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Paramount Global","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"Verizon Communications","city":"New York, New York","lat":40.7128,"lon":-74.006},{"name":"AT&T","city":"Dallas, Texas","lat":32.7767,"lon":-96.797},{"name":"T-Mobile US","city":"Bellevue, Washington","lat":47.6101,"lon":-122.2015},{"name":"Orange","city":"Paris","lat":48.8566,"lon":2.3522},{"name":"Vodafone","city":"Newbury","lat":51.405,"lon":-1.3233},{"name":"Am\u00e9rica M\u00f3vilMexico","city":"City","lat":19.4326,"lon":-99.1332},{"name":"Bharti Airtel","city":"New Delhi","lat":28.6139,"lon":77.209},{"name":"Saudi Telecom","city":"Riyadh","lat":24.7136,"lon":46.6753},{"name":"NVIDIA","city":"Santa Clara, California","lat":37.3541,"lon":-121.9552},{"name":"Apple","city":"Cupertino, California","lat":37.3229,"lon":-122.0322},{"name":"Alphabet","city":"Mountain View, California","lat":37.3861,"lon":-122.0839},{"name":"Microsoft","city":"Redmond, Washington","lat":47.674,"lon":-122.1215},{"name":"Amazon","city":"Seattle, Washington","lat":47.6062,"lon":-122.3321},{"name":"Broadcom","city":"San Jose, California","lat":37.3382,"lon":-121.8863},{"name":"Eli Lilly","city":"Indianapolis, Indiana","lat":39.7684,"lon":-86.1581},{"name":"Oracle","city":"Austin, Texas","lat":30.2672,"lon":-97.7431},{"name":"Salesforce","city":"San Francisco, California","lat":37.7749,"lon":-122.4194},{"name":"Thermo Fisher Scientific","city":"Waltham, Massachusetts","lat":42.3765,"lon":-71.2356},{"name":"Danaher","city":"Washington, D.C.","lat":38.9072,"lon":-77.0369},{"name":"Abbott Laboratories","city":"Abbott Park, Illinois","lat":42.3036,"lon":-87.8995},{"name":"NextEra Energy","city":"Juno Beach, Florida","lat":26.8841,"lon":-80.0731},{"name":"Southern Company","city":"Atlanta, Georgia","lat":33.749,"lon":-84.388},{"name":"Duke Energy","city":"Charlotte, North Carolina","lat":35.2271,"lon":-80.8431},{"name":"Iberdrola","city":"Bilbao","lat":43.263,"lon":-2.935},{"name":"Enbridge","city":"Calgary","lat":51.0447,"lon":-114.0719},{"name":"TransCanada (TC Energy)","city":"Calgary","lat":51.0447,"lon":-114.0719},{"name":"Kinder Morgan","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Williams Companies","city":"Tulsa, Oklahoma","lat":36.154,"lon":-95.9928},{"name":"ONEOK","city":"Tulsa, Oklahoma","lat":36.154,"lon":-95.9928},{"name":"Enterprise Products Partners","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Energy Transfer","city":"Dallas, Texas","lat":32.7767,"lon":-96.797},{"name":"Plains All American Pipeline","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Cheniere Energy","city":"Houston, Texas","lat":29.7604,"lon":-95.3698},{"name":"Sempra Energy","city":"San Diego, California","lat":32.7157,"lon":-117.1611}];
  
  companiesData.forEach(company => {
    // Determine pseudo-logo colors based on tech/random vibe for BLK skin
    const color = '#00f0ff'; // Cyber cyan
    
    // Create text label sprite
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    
    // Stylized high-tech background
    ctx.fillStyle = 'rgba(5, 10, 15, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(240, 10);
    ctx.lineTo(240, 40);
    ctx.lineTo(220, 54);
    ctx.lineTo(10, 54);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let displayName = company.name;
    if (displayName.length > 15) displayName = displayName.substring(0, 14) + '.';
    ctx.fillText(displayName.toUpperCase(), 64, 32);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    
    const isWorldBank = company.name === "WORLD BANK";
    
    if (isWorldBank) {
      sprite.scale.set(0.96, 0.24, 1); // 4x bigger
    } else {
      sprite.scale.set(0.24, 0.06, 1); // Twice as big
    }
    
    // Position further above ground to be clearly visible
    const pos = ll2v(company.lat, company.lon, GLOBE_R + 0.055);
    sprite.position.copy(pos);
    window.companiesGroup.add(sprite);

    company.color = color;
    // Store data for raycaster
    sprite.userData = company;

    // Draw Logo (Stylized Square with First Letter)
    ctx.fillStyle = isWorldBank ? '#ffd700' : color;
    if (isWorldBank) {
        // Shiny gold box for World Bank
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillRect(18, 14, 36, 36);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillRect(18, 14, 36, 36);
    }
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName.charAt(0).toUpperCase(), 36, 34);
    
    ctx.fillStyle = isWorldBank ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName.toUpperCase(), 64, 32);
    
    tex.needsUpdate = true;

    // Also add a glowing pinpoint dot
    const dotC = document.createElement('canvas'); dotC.width=64; dotC.height=64;
    const dotCtx = dotC.getContext('2d');
    dotCtx.fillStyle = isWorldBank ? '#ffffff' : color;
    dotCtx.shadowBlur = isWorldBank ? 30 : 20;
    dotCtx.shadowColor = isWorldBank ? '#ffd700' : color;
    dotCtx.beginPath(); dotCtx.arc(32,32,16,0,Math.PI*2); dotCtx.fill();
    const dotTex = new THREE.CanvasTexture(dotC);
    const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthTest: true, blending: THREE.AdditiveBlending });
    const dotSprite = new THREE.Sprite(dotMat);
    if (isWorldBank) {
        dotSprite.scale.set(0.32, 0.32, 1); // 4x bigger
    } else {
        dotSprite.scale.set(0.08, 0.08, 1); // Twice as big
    }
    dotSprite.position.copy(ll2v(company.lat, company.lon, GLOBE_R + 0.05));
    dotSprite.userData = company;
    window.companiesGroup.add(dotSprite);
  });
  console.log("Global Companies Overlay Initialized.");
}

function guessCompanyDomain(name) {
  let d = name.toLowerCase();
  if (d.includes('google') || d.includes('alphabet')) return 'google.com';
  if (d.includes('aramco')) return 'aramco.com';
  if (d.includes('meta')) return 'meta.com';
  if (d.includes('tsmc')) return 'tsmc.com';
  if (d.includes('berkshire')) return 'berkshirehathaway.com';
  if (d.includes('jpmorgan')) return 'jpmorganchase.com';
  if (d.includes('johnson & johnson')) return 'jnj.com';
  if (d.includes('procter & gamble')) return 'pg.com';
  if (d.includes('bank of america')) return 'bankofamerica.com';
  if (d.includes('coca-cola')) return 'coca-colacompany.com';
  if (d.includes('home depot')) return 'homedepot.com';
  if (d.includes('walt disney')) return 'thewaltdisneycompany.com';
  if (d.includes('t-mobile')) return 't-mobile.com';
  if (d.includes('rtx')) return 'rtx.com';
  return d.replace(/[^a-z0-9]/g, '') + '.com';
}

function showCompanyInfo(compData) {
  if (compData.name === 'WORLD BANK') {
      if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'get_world_bank_stats' }));
      }
      return; // Handled by websocket callback
  }

  let modal = document.getElementById('company-info-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'company-info-modal';
    modal.style.position = 'absolute';
    modal.style.top = '20%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -20%)';
    modal.style.background = 'rgba(10, 20, 30, 0.95)';
    modal.style.border = '2px solid #00f0ff';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.color = '#fff';
    modal.style.fontFamily = '"Courier New", monospace';
    modal.style.zIndex = '9999';
    modal.style.minWidth = '300px';
    modal.style.boxShadow = '0 0 20px #00f0ff';
    modal.style.textAlign = 'center';
    
    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.innerText = 'X';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#f24';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.onclick = () => modal.style.display = 'none';
    modal.appendChild(closeBtn);
    
    document.body.appendChild(modal);
  }
  
  const domain = guessCompanyDomain(compData.name);
  const logoUrl = `https://logo.clearbit.com/${domain}`;
  
  // Tactical asset descriptions for Cyber Skin
  const cyberAssets = [
    "TIER 3 SERVER FARM",
    "LOGISTICS MAINFRAME",
    "REGIONAL DNS RELAY",
    "G-MARKET NODE",
    "FIBER BACKBONE HUB"
  ];
  const charSum = compData.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const assetLabel = cyberAssets[charSum % cyberAssets.length];
  
    // Multi-Tier Strategic Asset labeling based on Company Color
    let assetClassStr = "STRATEGIC ASSET DETECTED";
    if (window.currentSkinIndex === 4) {
      assetClassStr = 'ASSET: ' + assetLabel;
    } else if (window.currentSkinIndex === 3) {
      if (compData.color === '#00f0ff') {
        assetClassStr = "GLOBAL TECH HUB DETECTED"; 
      } else if (compData.color === '#ffff00') {
        assetClassStr = "FINANCE & LOGISTICS NODE DETECTED";
      } else if (compData.color === '#00ff00') {
        assetClassStr = "NATURAL RESOURCE ASSET DETECTED"; 
      } else if (compData.color === '#ff8800') {
        assetClassStr = "EMERGING MARKET HUB DETECTED"; 
      } else if (compData.color === '#4488ff') {
        assetClassStr = "HEAVY INDUSTRY & ENERGY DETECTED"; 
      }
    }

  const corpAssets = [
    "Quantum Compute Core", "Corporate Treasury Vault", "Proprietary IP Databank",
    "Central Data Lake", "Logistics Control System", "Offshore Liquidity Pool",
    "Satellite Uplink Node", "AI Training Cluster", "High-Frequency Trading Engine"
  ];
  
  // Seed random assignment based on company name length + first letter
  const aIdx = (compData.name.length + compData.name.charCodeAt(0)) % corpAssets.length;
  const targetAsset = corpAssets[aIdx];

  // Simulated AI Conflict State
  let conflictStr = '';
  // Randomly assign a visual state based on time to make it dynamic, bounded by company charSum so it persists for a bit
  const timeState = Math.floor(Date.now() / 15000) + charSum;
  if (timeState % 3 === 0) {
     conflictStr = `<div style="margin-top:10px; padding:5px; background:rgba(0,255,136,0.1); border:1px solid #0f8; color:#0f8; font-size:11px; text-align:center;">🛡️ GEMINI AI IS SECURING THIS ASSET</div>`;
  } else if (timeState % 3 === 1) {
     conflictStr = `<div style="margin-top:10px; padding:5px; background:rgba(255,0,0,0.1); border:1px solid #f24; color:#f24; font-size:11px; text-align:center;">⚠️ RAINCLAUDE UPLOADING MALWARE TO HEIST ASSET</div>`;
  } else {
     // Active combat
     conflictStr = `<div style="margin-top:10px; padding:5px; background:rgba(255,150,0,0.1); border:1px solid #f80; color:#f80; font-size:11px; text-align:center;">⚔️ ACTIVE AI CYBER-WARFARE DETECTED ⚔️</div>`;
  }

  let balanceHtml = '';
  if (window.currentSkinIndex === 3) { // Black Skin only
      if (typeof compData.d3xBalance === 'undefined') {
          compData.d3xBalance = (compData.name === 'WORLD BANK') ? 12300000 : (200000 + Math.random() * 1800000);
      }
      balanceHtml = `<div style="margin-top:15px; background:rgba(0,255,136,0.1); padding:10px; border:1px solid #0f8; border-radius:4px; text-align:center; box-shadow:0 0 10px rgba(0,255,136,0.2);">
          <div style="color:#aaa; font-size:10px; margin-bottom:5px;">CORPORATE LIQUIDITY:</div>
          <div style="color:#0f8; font-size:18px; font-weight:bold; font-family:'Orbitron', 'Courier New', monospace; text-shadow:0 0 5px #0f8;">${compData.d3xBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} D3X</div>
      </div>`;
  }

  modal.innerHTML = `
    <div style="position:absolute;top:10px;right:15px;cursor:pointer;color:#f24;font-weight:bold;" onclick="document.getElementById('company-info-modal').style.display='none'">X</div>
    <div style="margin-bottom:15px;">
      <img src="${logoUrl}" onerror="this.style.display='none'" style="width:64px;height:64px;border-radius:8px;background:#fff;padding:4px;" />
    </div>
    <h2 style="margin:0 0 10px 0;color:#00f0ff;font-size:24px;text-transform:uppercase;">${compData.name}</h2>
    <div style="font-size:14px;color:#aaa;margin-bottom:5px;">HQ LOCATION</div>
    <div style="font-size:18px;margin-bottom:15px;">${compData.city || compData.hq || 'CLASSIFIED'}</div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:10px;">
        <div><span style="color:#0f8">LAT:</span> ${compData.lat !== undefined ? compData.lat.toFixed(4) : '---'}</div>
        <div><span style="color:#0f8">LON:</span> ${compData.lon !== undefined ? compData.lon.toFixed(4) : '---'}</div>
    </div>
    <div style="margin-top:15px;font-size:12px;color:${compData.color || '#ffff00'};letter-spacing:1px;font-weight:bold;">${assetClassStr}</div>
    
    <div style="margin-top:15px; background:rgba(0,0,0,0.5); padding:10px; border:1px solid #444; border-radius:4px;">
        <div style="color:#aaa; font-size:10px; margin-bottom:5px;">INTERNAL CORP ASSET:</div>
        <div style="color:#fff; font-size:14px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${targetAsset}</div>
        ${conflictStr}
    </div>
    ${balanceHtml}
  `;
  modal.style.display = 'block';
}
initCompanies();

window.mediumCompaniesGroup = new THREE.Group();
window.mediumCompaniesGroup.visible = false;
scene.add(window.mediumCompaniesGroup);

function initMediumCompanies() {
  const mediumCompaniesData = [{"name":"Ajegroup","city":"Peru","lat":-11.9117,"lon":-77.0299},{"name":"Grupo Boticario","city":"Brazil","lat":-23.4704,"lon":-46.5861},{"name":"Natura &Co LatAm Division","city":"Brazil","lat":-23.6353,"lon":-46.591},{"name":"PetroRio","city":"Brazil","lat":-23.6504,"lon":-46.5159},{"name":"Totvs","city":"Brazil","lat":-23.6224,"lon":-46.5348},{"name":"Magazine Luiza","city":"Brazil","lat":-23.5564,"lon":-46.7111},{"name":"Rappi","city":"Colombia","lat":4.5738,"lon":-73.9745},{"name":"Grupo Nutresa","city":"Colombia","lat":4.7101,"lon":-74.0292},{"name":"Bancolombia Tech Unit","city":"Colombia","lat":4.809,"lon":-74.0102},{"name":"Falabella Retail","city":"Chile","lat":-33.4904,"lon":-70.6315},{"name":"Cencosud Tech","city":"Chile","lat":-33.5963,"lon":-70.5225},{"name":"LATAM Cargo","city":"Chile","lat":-33.4839,"lon":-70.8},{"name":"Grupo Sura","city":"Colombia","lat":4.7884,"lon":-74.0208},{"name":"Grupo Argos","city":"Colombia","lat":4.8025,"lon":-74.15},{"name":"Arcor","city":"Argentina","lat":-34.722,"lon":-58.4143},{"name":"MercadoLibre Logistics","city":"Argentina","lat":-34.5684,"lon":-58.3307},{"name":"Despegar","city":"Argentina","lat":-34.7039,"lon":-58.2705},{"name":"YPF Luz","city":"Argentina","lat":-34.5625,"lon":-58.2751},{"name":"Globant","city":"Argentina","lat":-34.4796,"lon":-58.2322},{"name":"Banco Macro Tech","city":"Argentina","lat":-34.4846,"lon":-58.4016},{"name":"Olist","city":"Brazil","lat":-23.6167,"lon":-46.7306},{"name":"StoneCo","city":"Brazil","lat":-23.6996,"lon":-46.7432},{"name":"QuintoAndar","city":"Brazil","lat":-23.4772,"lon":-46.7498},{"name":"VTEX","city":"Brazil","lat":-23.4488,"lon":-46.5552},{"name":"Kavak","city":"Mexico","lat":19.333,"lon":-99.2734},{"name":"Clip","city":"Mexico","lat":19.581,"lon":-99.1319},{"name":"Konfio","city":"Mexico","lat":19.5526,"lon":-99.1051},{"name":"R2","city":"Mexico","lat":19.3549,"lon":-99.1801},{"name":"Bitso","city":"Mexico","lat":19.5565,"lon":-99.0914},{"name":"Justo","city":"Mexico","lat":19.3977,"lon":-99.2012},{"name":"Softtek","city":"Mexico","lat":19.3986,"lon":-99.1925},{"name":"Kueski","city":"Mexico","lat":19.5356,"lon":-99.1377},{"name":"Creditas","city":"Brazil","lat":-23.5452,"lon":-46.6733},{"name":"Wildlife Studios","city":"Brazil","lat":-23.6413,"lon":-46.5741},{"name":"Nubank LatAm Unit","city":"Brazil","lat":-23.5523,"lon":-46.7406},{"name":"99 Tecnologia","city":"Brazil","lat":-23.6396,"lon":-46.7555},{"name":"Loggi","city":"Brazil","lat":-23.505,"lon":-46.5805},{"name":"Gympass","city":"Brazil","lat":-23.4259,"lon":-46.6983},{"name":"Sinqia","city":"Brazil","lat":-23.6353,"lon":-46.7695},{"name":"PagSeguro","city":"Brazil","lat":-23.6576,"lon":-46.7584},{"name":"Yoco","city":"South Africa","lat":-26.2869,"lon":28.0974},{"name":"Takealot","city":"South Africa","lat":-26.2776,"lon":27.935},{"name":"SweepSouth","city":"South Africa","lat":-26.3111,"lon":28.0323},{"name":"Aerobotics","city":"South Africa","lat":-26.0882,"lon":28.0992},{"name":"Paystack","city":"Nigeria","lat":6.633,"lon":3.2586},{"name":"Flutterwave","city":"Nigeria","lat":6.5198,"lon":3.3744},{"name":"Interswitch","city":"Nigeria","lat":6.4499,"lon":3.2987},{"name":"Andela","city":"Nigeria","lat":6.4696,"lon":3.5092},{"name":"Kobo360","city":"Nigeria","lat":6.6002,"lon":3.3338},{"name":"Twiga Foods","city":"Kenya","lat":-1.3388,"lon":36.8399},{"name":"Sendy","city":"Kenya","lat":-1.3611,"lon":36.9553},{"name":"Cellulant","city":"Kenya","lat":-1.1752,"lon":36.9012},{"name":"Selina Wamucii","city":"Kenya","lat":-1.3783,"lon":36.8554},{"name":"Wasoko","city":"Kenya","lat":-1.3205,"lon":36.8909},{"name":"Chipper Cash","city":"Uganda","lat":0.4818,"lon":32.5204},{"name":"SafeBoda","city":"Uganda","lat":0.3482,"lon":32.6461},{"name":"Jumia Logistics","city":"Egypt","lat":29.9868,"lon":31.1758},{"name":"Swvl","city":"Egypt","lat":30.1861,"lon":31.1228},{"name":"Fawry","city":"Egypt","lat":30.0698,"lon":31.3644},{"name":"MaxAB","city":"Egypt","lat":30.0961,"lon":31.2555},{"name":"MNT-Halan","city":"Egypt","lat":30.1729,"lon":31.2255},{"name":"Yassir","city":"Algeria","lat":36.6643,"lon":3.0247},{"name":"Inwi Tech","city":"Morocco","lat":33.6567,"lon":-7.7334},{"name":"HPS","city":"Morocco","lat":33.5653,"lon":-7.6359},{"name":"Chari","city":"Morocco","lat":33.6712,"lon":-7.7261},{"name":"Gozem","city":"Togo","lat":6.2637,"lon":1.3462},{"name":"Wave","city":"Senegal","lat":14.567,"lon":-17.3867},{"name":"TradeDepot","city":"Nigeria","lat":6.4861,"lon":3.3199},{"name":"Moove","city":"Nigeria","lat":6.503,"lon":3.2797},{"name":"Alerzo","city":"Nigeria","lat":6.5745,"lon":3.4869},{"name":"OnePipe","city":"Nigeria","lat":6.6056,"lon":3.4379},{"name":"TymeBank","city":"South Africa","lat":-26.2855,"lon":28.0864},{"name":"Rain","city":"South Africa","lat":-26.34,"lon":27.8982},{"name":"Luno","city":"South Africa","lat":-26.1241,"lon":27.9668},{"name":"Jumo","city":"South Africa","lat":-26.3524,"lon":28.137},{"name":"MeTL Group","city":"Tanzania","lat":-6.8936,"lon":39.2566},{"name":"Bakhresa Group","city":"Tanzania","lat":-6.9314,"lon":39.3495},{"name":"Dangote Sugar","city":"Nigeria","lat":6.4295,"lon":3.3981},{"name":"Olam Nigeria","city":"Nigeria","lat":6.4505,"lon":3.4556},{"name":"Seplat Energy","city":"Nigeria","lat":6.536,"lon":3.2436},{"name":"Kuda Bank","city":"Nigeria","lat":6.6515,"lon":3.407},{"name":"Zenvus","city":"Nigeria","lat":6.464,"lon":3.498},{"name":"Zola Electric","city":"Tanzania","lat":-6.7655,"lon":39.0811},{"name":"M-Kopa","city":"Kenya","lat":-1.435,"lon":36.9436},{"name":"SolarNow","city":"Uganda","lat":0.2191,"lon":32.5568},{"name":"Grab Holdings","city":"Singapore","lat":1.2503,"lon":103.7359},{"name":"Sea Group","city":"Singapore","lat":1.4049,"lon":103.7808},{"name":"Razer","city":"Singapore","lat":1.2502,"lon":103.6765},{"name":"Trax","city":"Singapore","lat":1.4536,"lon":103.8187},{"name":"Ninja Van","city":"Singapore","lat":1.3516,"lon":103.8458},{"name":"Carousell","city":"Singapore","lat":1.2648,"lon":103.9267},{"name":"PatSnap","city":"Singapore","lat":1.396,"lon":103.9226},{"name":"Zilingo","city":"Singapore","lat":1.3953,"lon":103.9453},{"name":"ShopBack","city":"Singapore","lat":1.2688,"lon":103.9251},{"name":"PropertyGuru","city":"Singapore","lat":1.3761,"lon":103.7458},{"name":"GoTo Group","city":"Indonesia","lat":-6.2861,"lon":106.7437},{"name":"Traveloka","city":"Indonesia","lat":-6.1539,"lon":106.7615},{"name":"Bukalapak","city":"Indonesia","lat":-6.1324,"lon":106.902},{"name":"Ruangguru","city":"Indonesia","lat":-6.3495,"lon":106.8796},{"name":"Kopi Kenangan","city":"Indonesia","lat":-6.1999,"lon":106.9786},{"name":"Xendit","city":"Indonesia","lat":-6.1623,"lon":106.9709},{"name":"Akulaku","city":"Indonesia","lat":-6.1807,"lon":106.9181},{"name":"Halodoc","city":"Indonesia","lat":-6.0637,"lon":106.8544},{"name":"Alodokter","city":"Indonesia","lat":-6.2663,"lon":106.9953},{"name":"Kredivo","city":"Indonesia","lat":-6.261,"lon":106.8219},{"name":"Carsome","city":"Malaysia","lat":3.2596,"lon":101.666},{"name":"Aerodyne Group","city":"Malaysia","lat":3.0882,"lon":101.8325},{"name":"StoreHub","city":"Malaysia","lat":3.0245,"lon":101.7454},{"name":"iPrice Group","city":"Malaysia","lat":3.1054,"lon":101.6088},{"name":"PolicyStreet","city":"Malaysia","lat":3.1069,"lon":101.6228},{"name":"BigPay","city":"Malaysia","lat":3.2215,"lon":101.5865},{"name":"Cars24 Asia","city":"Malaysia","lat":3.2688,"lon":101.7547},{"name":"Boost","city":"Malaysia","lat":3.1459,"lon":101.7768},{"name":"Teleme","city":"Mongolia","lat":47.8183,"lon":106.8512},{"name":"Unitel Laos","city":"Laos","lat":17.9336,"lon":102.5073},{"name":"VNPay","city":"Vietnam","lat":10.6846,"lon":106.6045},{"name":"MoMo","city":"Vietnam","lat":10.7602,"lon":106.6445},{"name":"Tiki","city":"Vietnam","lat":10.8442,"lon":106.6171},{"name":"VNG","city":"Vietnam","lat":10.7629,"lon":106.7237},{"name":"Sky Mavis","city":"Vietnam","lat":10.7651,"lon":106.5182},{"name":"Base.vn","city":"Vietnam","lat":10.882,"lon":106.5509},{"name":"Haravan","city":"Vietnam","lat":10.7557,"lon":106.6507},{"name":"Sendo","city":"Vietnam","lat":10.8122,"lon":106.6311},{"name":"Abivin","city":"Vietnam","lat":10.7177,"lon":106.5881},{"name":"Lendbox","city":"India","lat":28.6374,"lon":77.1167},{"name":"Zerodha","city":"India","lat":28.5726,"lon":77.3071},{"name":"Freshworks","city":"India","lat":28.7119,"lon":77.1498},{"name":"Udaan","city":"India","lat":28.621,"lon":77.1932},{"name":"Razorpay","city":"India","lat":28.5235,"lon":77.146},{"name":"CRED","city":"India","lat":28.4646,"lon":77.3196},{"name":"Meesho","city":"India","lat":28.7229,"lon":77.1195},{"name":"Unacademy","city":"India","lat":28.4853,"lon":77.1352},{"name":"Byju’s India Ops","city":"India","lat":28.7599,"lon":77.3261},{"name":"Delhivery","city":"India","lat":28.5749,"lon":77.3326},{"name":"OYO India Unit","city":"India","lat":28.4851,"lon":77.2632},{"name":"PhonePe","city":"India","lat":28.6665,"lon":77.2077},{"name":"Swiggy","city":"India","lat":28.6131,"lon":77.1118},{"name":"Zomato Hyperpure","city":"India","lat":28.6753,"lon":77.2018},{"name":"Nykaa Beauty","city":"India","lat":28.5097,"lon":77.0906},{"name":"Urban Company","city":"India","lat":28.4995,"lon":77.1269},{"name":"ShareChat","city":"India","lat":28.5499,"lon":77.3294},{"name":"DailyHunt","city":"India","lat":28.7447,"lon":77.065},{"name":"PolicyBazaar","city":"India","lat":28.7073,"lon":77.172},{"name":"Lenskart","city":"India","lat":28.7587,"lon":77.2324},{"name":"Daraz","city":"Pakistan","lat":24.7296,"lon":67.1389},{"name":"Bykea","city":"Pakistan","lat":24.9073,"lon":66.928},{"name":"Bazaar Technologies","city":"Pakistan","lat":24.7704,"lon":66.857},{"name":"Finja","city":"Pakistan","lat":24.8381,"lon":66.9417},{"name":"Truck It In","city":"Pakistan","lat":24.8676,"lon":67.0606},{"name":"Careem","city":"UAE","lat":25.1489,"lon":55.379},{"name":"Kitopi","city":"UAE","lat":25.1799,"lon":55.4033},{"name":"Property Finder","city":"UAE","lat":25.1884,"lon":55.1898},{"name":"Fetchr","city":"UAE","lat":25.2757,"lon":55.2798},{"name":"Tabby","city":"UAE","lat":25.1378,"lon":55.2246},{"name":"Yalla Group","city":"UAE","lat":25.2673,"lon":55.41},{"name":"Anghami","city":"UAE","lat":25.1792,"lon":55.4062},{"name":"Network International","city":"UAE","lat":25.1254,"lon":55.2072},{"name":"Group42","city":"UAE","lat":25.3339,"lon":55.4188},{"name":"Bayzat","city":"UAE","lat":25.2056,"lon":55.4107},{"name":"STC Pay","city":"Saudi Arabia","lat":24.8091,"lon":46.8026},{"name":"Jahez","city":"Saudi Arabia","lat":24.6143,"lon":46.5639},{"name":"Foodics","city":"Saudi Arabia","lat":24.6454,"lon":46.5457},{"name":"Tamara","city":"Saudi Arabia","lat":24.6659,"lon":46.7888},{"name":"Sary","city":"Saudi Arabia","lat":24.753,"lon":46.8084},{"name":"Unifonic","city":"Saudi Arabia","lat":24.6077,"lon":46.6394},{"name":"Halan","city":"Saudi Arabia","lat":24.6694,"lon":46.6218},{"name":"HungerStation","city":"Saudi Arabia","lat":24.6714,"lon":46.6517},{"name":"Elm Company","city":"Saudi Arabia","lat":24.628,"lon":46.7057},{"name":"Rasan","city":"Saudi Arabia","lat":24.6889,"lon":46.535},{"name":"Trendyol","city":"Turkey","lat":40.9684,"lon":28.8385},{"name":"Hepsiburada","city":"Turkey","lat":40.9277,"lon":29.1243},{"name":"Getir","city":"Turkey","lat":40.8664,"lon":29.0449},{"name":"Peak Games","city":"Turkey","lat":41.1127,"lon":28.9581},{"name":"Insider","city":"Turkey","lat":40.9898,"lon":28.9502},{"name":"Dream Games","city":"Turkey","lat":41.1196,"lon":28.9505},{"name":"Marti","city":"Turkey","lat":41.0736,"lon":28.9435},{"name":"Papara","city":"Turkey","lat":41.1278,"lon":29.1224},{"name":"Paraşüt","city":"Turkey","lat":40.9298,"lon":29.0327},{"name":"Modanisa","city":"Turkey","lat":40.8723,"lon":29.1268},{"name":"Canva","city":"Australia","lat":-33.7233,"lon":151.1567},{"name":"Atlassian Asia Ops","city":"Australia","lat":-33.8326,"lon":151.3155},{"name":"Afterpay","city":"Australia","lat":-33.8048,"lon":151.2165},{"name":"SafetyCulture","city":"Australia","lat":-33.9659,"lon":151.1661},{"name":"Envato","city":"Australia","lat":-33.8722,"lon":151.3081},{"name":"SiteMinder","city":"Australia","lat":-33.759,"lon":151.3193},{"name":"Culture Amp","city":"Australia","lat":-33.8212,"lon":151.3576},{"name":"Airtasker","city":"Australia","lat":-33.7723,"lon":151.2964},{"name":"Deputy","city":"Australia","lat":-33.9446,"lon":151.1696},{"name":"Campaign Monitor","city":"Australia","lat":-33.8085,"lon":151.2497},{"name":"Xero Asia-Pacific","city":"New Zealand","lat":-36.9173,"lon":174.6716},{"name":"Rocket Lab","city":"New Zealand","lat":-36.7644,"lon":174.8827},{"name":"TradeMe","city":"NZ","lat":-36.8712,"lon":174.6894},{"name":"Vend POS","city":"New Zealand","lat":-36.7641,"lon":174.7008},{"name":"Pushpay","city":"New Zealand","lat":-36.9121,"lon":174.8695}];
  
  mediumCompaniesData.forEach(company => {
    const color = '#ffff00'; // Yellow
    
    // Create text label sprite
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    
    // Stylized high-tech background
    ctx.fillStyle = 'rgba(15, 10, 5, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(240, 10);
    ctx.lineTo(240, 40);
    ctx.lineTo(220, 54);
    ctx.lineTo(10, 54);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let displayName = company.name;
    if (displayName.length > 15) displayName = displayName.substring(0, 14) + '.';
    ctx.fillText(displayName.toUpperCase(), 64, 32);

    company.color = color;

    // YELLOW SQUARE representation
    ctx.fillStyle = color;
    ctx.fillRect(18, 14, 36, 36);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.24, 0.06, 1);
    
    const pos = ll2v(company.lat, company.lon, GLOBE_R + 0.055);
    sprite.position.copy(pos);
    window.mediumCompaniesGroup.add(sprite);
    sprite.userData = company;

    // Glowing pinpoint YELLOW SQUARE (instead of dot)
    const dotC = document.createElement('canvas'); dotC.width=64; dotC.height=64;
    const dotCtx = dotC.getContext('2d');
    dotCtx.fillStyle = color;
    dotCtx.shadowBlur = 20;
    dotCtx.shadowColor = color;
    dotCtx.fillRect(16, 16, 32, 32); 
    
    const dotTex = new THREE.CanvasTexture(dotC);
    const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthTest: true, blending: THREE.AdditiveBlending });
    const dotSprite = new THREE.Sprite(dotMat);
    dotSprite.scale.set(0.08, 0.08, 1);
    dotSprite.position.copy(ll2v(company.lat, company.lon, GLOBE_R + 0.05));
    dotSprite.userData = company;
    window.mediumCompaniesGroup.add(dotSprite);
  });
  console.log("Medium Companies Overlay Initialized.");
}
initMediumCompanies();

window.africaCompaniesGroup = new THREE.Group();
window.africaCompaniesGroup.visible = false;
scene.add(window.africaCompaniesGroup);

function initAfricaCompanies() {
  const africaCompaniesData = [{"name":"Naspers","city":"Cape Town","lat":-33.9249,"lon":18.4241},{"name":"FirstRand","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Standard Bank Group","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Gold Fields","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Capitec Bank","city":"Stellenbosch","lat":-33.9321,"lon":18.8602},{"name":"Anglogold Ashanti","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Attijariwafa Bank","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"Vodacom Group","city":"Midrand","lat":-25.9965,"lon":28.1269},{"name":"MTN Group","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Maroc Telecom","city":"Rabat","lat":34.0209,"lon":-6.8416},{"name":"Anglo American Platinum","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Sanlam","city":"Bellville","lat":-33.8963,"lon":18.6294},{"name":"Harmony Gold Mining","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Shoprite","city":"Cape Town","lat":-33.9249,"lon":18.4241},{"name":"Absa Group","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Bid Corporation","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Airtel Africa","city":"Lagos","lat":6.5244,"lon":3.3792},{"name":"Discovery","city":"Sandton","lat":-26.1076,"lon":28.0567},{"name":"Nedbank Group","city":"Sandton","lat":-26.1076,"lon":28.0567},{"name":"Impala Platinum","city":"Johannesburg","lat":-26.2041,"lon":28.0473},{"name":"Managem","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"Banque Centrale Populaire","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"OUTsurance Group","city":"Centurion","lat":-25.8603,"lon":28.1894},{"name":"Marsa Maroc","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"Safaricom","city":"Nairobi","lat":-1.2921,"lon":36.8219},{"name":"TAQA Morocco","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"Kumba Iron Ore","city":"Centurion","lat":-25.8603,"lon":28.1894},{"name":"Dangote Cement","city":"Lagos","lat":6.5244,"lon":3.3792},{"name":"Pepkor","city":"Cape Town","lat":-33.9249,"lon":18.4241},{"name":"Com. Inter. Bank – Egypt (CIB)","city":"Cairo","lat":30.0444,"lon":31.2357},{"name":"BUA Foods","city":"Lagos","lat":6.5244,"lon":3.3792},{"name":"Reinet Investments","city":"Stellenbosch","lat":-33.9321,"lon":18.8602},{"name":"LafargeHolcim Maroc","city":"Casablanca","lat":33.5731,"lon":-7.5898},{"name":"Remgro","city":"Stellenbosch","lat":-33.9321,"lon":18.8602},{"name":"WORLD BANK","city":"Black Skin HQ","lat":0.0000,"lon":15.0000}];
  
  africaCompaniesData.forEach(company => {
    const color = '#a020f0'; // Purple
    
    // Create text label sprite
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    
    // Stylized high-tech background
    ctx.fillStyle = 'rgba(10, 5, 15, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(240, 10);
    ctx.lineTo(240, 40);
    ctx.lineTo(220, 54);
    ctx.lineTo(10, 54);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let displayName = company.name;
    if (displayName.length > 15) displayName = displayName.substring(0, 14) + '.';
    ctx.fillText(displayName.toUpperCase(), 64, 32);

    // PURPLE SQUARE representation
    ctx.fillStyle = color;
    ctx.fillRect(18, 14, 36, 36);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.24, 0.06, 1);
    
    const pos = ll2v(company.lat, company.lon, GLOBE_R + 0.055);
    sprite.position.copy(pos);
    window.africaCompaniesGroup.add(sprite);
    company.color = color;
    sprite.userData = company;

    // Glowing pinpoint PURPLE SQUARE
    const dotC = document.createElement('canvas'); dotC.width=64; dotC.height=64;
    const dotCtx = dotC.getContext('2d');
    dotCtx.fillStyle = color;
    dotCtx.shadowBlur = 20;
    dotCtx.shadowColor = color;
    dotCtx.fillRect(16, 16, 32, 32); 
    
    const dotTex = new THREE.CanvasTexture(dotC);
    const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthTest: true, blending: THREE.AdditiveBlending });
    const dotSprite = new THREE.Sprite(dotMat);
    dotSprite.scale.set(0.08, 0.08, 1);
    dotSprite.position.copy(ll2v(company.lat, company.lon, GLOBE_R + 0.05));
    dotSprite.userData = company;
    window.africaCompaniesGroup.add(dotSprite);
  });
  console.log("Africa Companies Overlay Initialized.");
}
initAfricaCompanies();

window.microCompaniesGroup = new THREE.Group();
window.microCompaniesGroup.visible = false;
scene.add(window.microCompaniesGroup);

function initMicroCompanies() {
  const microCompaniesData = [{"name":"Majoo","city":"Indonesia","lat":-6.1116,"lon":106.9484},{"name":"GoComet","city":"Singapore","lat":1.4328,"lon":103.7195},{"name":"Manatal","city":"Thailand","lat":13.8939,"lon":100.3835},{"name":"Taxumo","city":"Philippines","lat":14.4718,"lon":120.8946},{"name":"Momos","city":"Singapore","lat":1.2939,"lon":103.7179},{"name":"GrowSari","city":"Philippines","lat":14.6786,"lon":121.0051},{"name":"Mekari","city":"Indonesia","lat":-6.1203,"lon":106.8357},{"name":"GudangAda","city":"Indonesia","lat":-6.2952,"lon":106.978},{"name":"Telio","city":"Vietnam","lat":10.9149,"lon":106.7347},{"name":"Dropee","city":"Malaysia","lat":3.08,"lon":101.5404},{"name":"Tinvio","city":"Singapore","lat":1.3339,"lon":103.8123},{"name":"JobHop","city":"Vietnam","lat":10.9352,"lon":106.7535},{"name":"Jet Commerce","city":"Indonesia","lat":-6.2233,"lon":106.731},{"name":"Nektar.ai","city":"Singapore","lat":1.4286,"lon":103.8601},{"name":"KiotViet","city":"Vietnam","lat":10.827,"lon":106.7334},{"name":"Moladin","city":"Indonesia","lat":-6.3576,"lon":106.7424},{"name":"TNG Digital","city":"Malaysia","lat":3.0699,"lon":101.6078}];
  
  microCompaniesData.forEach(company => {
    const color = '#ff8800'; // Orange
    
    // Create text label sprite
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    
    // Stylized high-tech background
    ctx.fillStyle = 'rgba(15, 8, 0, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(240, 10);
    ctx.lineTo(240, 40);
    ctx.lineTo(220, 54);
    ctx.lineTo(10, 54);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let displayName = company.name;
    if (displayName.length > 15) displayName = displayName.substring(0, 14) + '.';
    ctx.fillText(displayName.toUpperCase(), 64, 32);

    // ORANGE SQUARE representation
    ctx.fillStyle = color;
    ctx.fillRect(18, 14, 36, 36);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.24, 0.06, 1);
    
    const pos = ll2v(company.lat, company.lon, GLOBE_R + 0.055);
    sprite.position.copy(pos);
    window.microCompaniesGroup.add(sprite);
    company.color = color;
    sprite.userData = company;

    // Glowing pinpoint ORANGE SQUARE
    const dotC = document.createElement('canvas'); dotC.width=64; dotC.height=64;
    const dotCtx = dotC.getContext('2d');
    dotCtx.fillStyle = color;
    dotCtx.shadowBlur = 20;
    dotCtx.shadowColor = color;
    dotCtx.fillRect(16, 16, 32, 32); 
    
    const dotTex = new THREE.CanvasTexture(dotC);
    const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthTest: true, blending: THREE.AdditiveBlending });
    const dotSprite = new THREE.Sprite(dotMat);
    dotSprite.scale.set(0.08, 0.08, 1);
    dotSprite.position.copy(ll2v(company.lat, company.lon, GLOBE_R + 0.05));
    dotSprite.userData = company;
    window.microCompaniesGroup.add(dotSprite);
  });
  console.log("Micro Companies Overlay Initialized.");
}
initMicroCompanies();

window.russiaAsiaCompaniesGroup = new THREE.Group();
window.russiaAsiaCompaniesGroup.visible = false;
scene.add(window.russiaAsiaCompaniesGroup);

function initRussiaAsiaCompanies() {
  const russiaAsiaCompaniesData = [{"name":"Gazprom","city":"Russia","lat":55.7558,"lon":37.6173},{"name":"Sberbank","city":"Russia","lat":55.7333,"lon":37.5888},{"name":"Rosneft","city":"Russia","lat":55.75,"lon":37.6167},{"name":"Lukoil","city":"Russia","lat":55.76,"lon":37.62},{"name":"Norilsk Nickel","city":"Russia","lat":69.3333,"lon":88.2167},{"name":"Surgutneftegas","city":"Russia","lat":61.25,"lon":73.4167},{"name":"Novatek","city":"Russia","lat":64.9167,"lon":77.7833},{"name":"Transneft","city":"Russia","lat":55.76,"lon":37.6},{"name":"X5 Retail Group","city":"Russia","lat":55.75,"lon":37.61},{"name":"VTB Bank","city":"Russia","lat":59.9311,"lon":30.3609},{"name":"Rostec","city":"Russia","lat":55.7512,"lon":37.6184},{"name":"Tatneft","city":"Russia","lat":54.9,"lon":52.3},{"name":"Magnit","city":"Russia","lat":45.0393,"lon":38.9872},{"name":"Severstal","city":"Russia","lat":59.1333,"lon":37.9},{"name":"Evraz","city":"Russia","lat":55.75,"lon":37.55},{"name":"NLMK","city":"Russia","lat":52.6167,"lon":39.6},{"name":"Yandex","city":"Russia","lat":55.7335,"lon":37.5888},{"name":"VK","city":"Russia","lat":55.7963,"lon":37.5386},{"name":"Rosatom","city":"Russia","lat":55.7512,"lon":37.6184},{"name":"Alrosa","city":"Russia","lat":62.5333,"lon":113.9667},{"name":"Rusal","city":"Russia","lat":55.75,"lon":37.6167},{"name":"Mechel","city":"Russia","lat":55.75,"lon":37.6},{"name":"MMK","city":"Russia","lat":53.4167,"lon":59.0333},{"name":"PhosAgro","city":"Russia","lat":55.75,"lon":37.6},{"name":"Rosseti","city":"Russia","lat":55.75,"lon":37.6},{"name":"Inter RAO","city":"Russia","lat":55.75,"lon":37.6},{"name":"Aeroflot","city":"Russia","lat":55.9726,"lon":37.4126},{"name":"Sistema","city":"Russia","lat":55.75,"lon":37.61},{"name":"RusHydro","city":"Russia","lat":56.0153,"lon":92.8932},{"name":"Polymetal","city":"Russia","lat":59.9311,"lon":30.3609},{"name":"Polyus","city":"Russia","lat":55.75,"lon":37.6167},{"name":"Uralkali","city":"Russia","lat":59.4,"lon":56.8},{"name":"PIK Group","city":"Russia","lat":55.75,"lon":37.6},{"name":"M.video","city":"Russia","lat":55.75,"lon":37.6},{"name":"Tinkoff","city":"Russia","lat":55.75,"lon":37.6},{"name":"EuroChem","city":"Russia","lat":55.75,"lon":37.6},{"name":"Sibur","city":"Russia","lat":55.75,"lon":37.6},{"name":"SUEK","city":"Russia","lat":55.75,"lon":37.6},{"name":"AvtoVAZ","city":"Russia","lat":53.5,"lon":49.4167},{"name":"Kamaz","city":"Russia","lat":55.7333,"lon":52.3333},{"name":"UAC","city":"Russia","lat":55.75,"lon":37.6167},{"name":"KazMunayGas","city":"Kazakhstan","lat":51.1694,"lon":71.4491},{"name":"Tengizchevroil","city":"Kazakhstan","lat":47.1167,"lon":51.8833},{"name":"Kazatomprom","city":"Kazakhstan","lat":51.1694,"lon":71.4491},{"name":"Kaspi.kz","city":"Kazakhstan","lat":43.222,"lon":76.8512},{"name":"Eurasian Resources Group","city":"Kazakhstan","lat":51.1694,"lon":71.4491},{"name":"KAZ Minerals","city":"Kazakhstan","lat":43.222,"lon":76.8512},{"name":"Halyk Bank","city":"Kazakhstan","lat":43.222,"lon":76.8512},{"name":"KazTransOil","city":"Kazakhstan","lat":51.1694,"lon":71.4491},{"name":"Kazakhstan Temir Zholy","city":"Kazakhstan","lat":51.1694,"lon":71.4491}];
  
  russiaAsiaCompaniesData.forEach(company => {
    const color = '#ffffff'; // White
    
    // Create text label sprite
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    
    // Stylized high-tech background
    ctx.fillStyle = 'rgba(15, 15, 15, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 10);
    ctx.lineTo(240, 10);
    ctx.lineTo(240, 40);
    ctx.lineTo(220, 54);
    ctx.lineTo(10, 54);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let displayName = company.name;
    if (displayName.length > 15) displayName = displayName.substring(0, 14) + '.';
    ctx.fillText(displayName.toUpperCase(), 64, 32);

    // WHITE SQUARE representation
    ctx.fillStyle = color;
    ctx.fillRect(18, 14, 36, 36);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.24, 0.06, 1);
    
    const pos = ll2v(company.lat, company.lon, GLOBE_R + 0.055);
    sprite.position.copy(pos);
    window.russiaAsiaCompaniesGroup.add(sprite);
    company.color = color;
    sprite.userData = company;

    // Glowing pinpoint WHITE SQUARE
    const dotC = document.createElement('canvas'); dotC.width=64; dotC.height=64;
    const dotCtx = dotC.getContext('2d');
    dotCtx.fillStyle = color;
    dotCtx.shadowBlur = 20;
    dotCtx.shadowColor = color;
    dotCtx.fillRect(16, 16, 32, 32); 
    
    const dotTex = new THREE.CanvasTexture(dotC);
    const dotMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthTest: true, blending: THREE.AdditiveBlending });
    const dotSprite = new THREE.Sprite(dotMat);
    dotSprite.scale.set(0.08, 0.08, 1);
    dotSprite.position.copy(ll2v(company.lat, company.lon, GLOBE_R + 0.05));
    dotSprite.userData = company;
    window.russiaAsiaCompaniesGroup.add(dotSprite);
  });
  console.log("Russia & Asia Companies Overlay Initialized.");
}
initRussiaAsiaCompanies();

window.datacentersGroup = new THREE.Group();
window.datacentersGroup.visible = false;
scene.add(window.datacentersGroup);

function initDatacenters() {
    const dcData = [
    {
        "name": "China Telecom Inner Mongolia Information Park",
        "operator": "China Telecom",
        "location": "China (Hohhot, Inner Mongolia)",
        "lat": 34.76,
        "lon": 111.37,
        "stream_url": "https://www.youtube.com/watch?v=0_u6Q1S1nEQ"
    },
    {
        "name": "China Mobile Data Center",
        "operator": "China Mobile",
        "location": "China (Hohhot, Inner Mongolia)",
        "lat": 29.4,
        "lon": 112.38
    },
    {
        "name": "The Citadel Campus",
        "operator": "Switch",
        "location": "USA (Tahoe Reno, Nevada)",
        "lat": 34.58,
        "lon": -99.15,
        "stream_url": "https://www.youtube.com/watch?v=wGWU2zKjXf4"
    },
    {
        "name": "Harbin Data Center",
        "operator": "China Mobile",
        "location": "China (Harbin, Heilongjiang)",
        "lat": 23.83,
        "lon": 104.87
    },
    {
        "name": "Alibaba Cloud Zhangbei Data Center",
        "operator": "Alibaba Cloud",
        "location": "China (Zhangbei County, Hebei)",
        "lat": 25.14,
        "lon": 105.15,
        "stream_url": "https://www.youtube.com/watch?v=aGtzB_7v4_4"
    },
    {
        "name": "Range International Information Hub",
        "operator": "Range International (IBM partner)",
        "location": "China (Langfang, Hebei)",
        "lat": 36.56,
        "lon": 112.38
    },
    {
        "name": "Switch SuperNAP Campus",
        "operator": "Switch",
        "location": "USA (Las Vegas, Nevada)",
        "lat": 41.02,
        "lon": -105.33,
        "stream_url": "https://www.youtube.com/watch?v=wGWU2zKjXf4"
    },
    {
        "name": "Google Council Bluffs",
        "operator": "Google",
        "location": "USA (Council Bluffs, Iowa)",
        "lat": 44.44,
        "lon": -103.84
    },
    {
        "name": "CWL1 Data Centre",
        "operator": "Vantage Data Centers",
        "location": "UK (Newport, Wales)",
        "lat": 53.3,
        "lon": -1.14
    },
    {
        "name": "Utah Data Center (Bumblehive)",
        "operator": "NSA",
        "location": "USA (Bluffdale, Utah)",
        "lat": 36.13,
        "lon": -95.14,
        "stream_url": "https://www.youtube.com/watch?v=B7bZ40B4KkI"
    },
    {
        "name": "Apple Mesa Data Center",
        "operator": "Apple",
        "location": "USA (Mesa, Arizona)",
        "lat": 40.36,
        "lon": -104.29
    },
    {
        "name": "Lakeside Technology Center",
        "operator": "Digital Realty",
        "location": "USA (Chicago, Illinois)",
        "lat": 38.31,
        "lon": -88.14,
        "stream_url": "https://www.youtube.com/watch?v=4dO8i2R3_rI"
    },
    {
        "name": "QTS Atlanta Metro",
        "operator": "QTS Realty Trust",
        "location": "USA (Atlanta, Georgia)",
        "lat": 39.04,
        "lon": -93.1
    },
    {
        "name": "CoreSite Reston VA3",
        "operator": "American Tower (CoreSite)",
        "location": "USA (Northern Virginia)",
        "lat": 45.86,
        "lon": -104.71
    },
    {
        "name": "Yotta NM1",
        "operator": "Yotta Infrastructure",
        "location": "India (Panvel, Maharashtra)",
        "lat": 13.64,
        "lon": 81.87
    },
    {
        "name": "Covilhã Data Center",
        "operator": "Altice Portugal",
        "location": "Portugal (Covilhã)",
        "lat": 20.92,
        "lon": 51.51
    },
    {
        "name": "Portugal Telecom Complex",
        "operator": "Portugal Telecom",
        "location": "Portugal (Covilhã)",
        "lat": 10.57,
        "lon": 130.14
    },
    {
        "name": "Microsoft Quincy",
        "operator": "Microsoft",
        "location": "USA (Quincy, Washington)",
        "lat": 41.27,
        "lon": -111.98
    },
    {
        "name": "FRA 1",
        "operator": "NTT Global Data Centers",
        "location": "Germany (Frankfurt)",
        "lat": 48.51,
        "lon": 7.1
    },
    {
        "name": "DuPont Fabros ACC7",
        "operator": "Digital Realty",
        "location": "USA (Ashburn, Virginia)",
        "lat": 37.11,
        "lon": -85.85
    },
    {
        "name": "Digital Realty Ashburn Campus",
        "operator": "Digital Realty",
        "location": "USA (Ashburn, Virginia)",
        "lat": 45.43,
        "lon": -82.13
    },
    {
        "name": "Equinix Santa Clara Campus",
        "operator": "Equinix",
        "location": "USA (Santa Clara, California)",
        "lat": 41.39,
        "lon": -80.8
    },
    {
        "name": "CyrusOne Dallas Campus",
        "operator": "CyrusOne",
        "location": "USA (Dallas, Texas)",
        "lat": 35.0,
        "lon": -110.69
    },
    {
        "name": "Data Foundry Austin Campus",
        "operator": "Data Foundry",
        "location": "USA (Austin, Texas)",
        "lat": 33.34,
        "lon": -83.74
    },
    {
        "name": "Iron Mountain Phoenix Campus",
        "operator": "Iron Mountain",
        "location": "USA (Phoenix, Arizona)",
        "lat": 44.54,
        "lon": -93.18
    },
    {
        "name": "Facebook/Meta Regional Hub (Prineville)",
        "operator": "Facebook/Meta",
        "location": "USA (Prineville, Oregon)",
        "lat": 43.63,
        "lon": -87.6
    },
    {
        "name": "Google Regional Hub (Huntsville)",
        "operator": "Google",
        "location": "USA (Huntsville, Alabama)",
        "lat": 47.01,
        "lon": -108.76
    },
    {
        "name": "Microsoft Regional Hub (Boydton)",
        "operator": "Microsoft",
        "location": "USA (Boydton, Virginia)",
        "lat": 46.89,
        "lon": -84.55
    },
    {
        "name": "Microsoft Regional Hub (San Antonio)",
        "operator": "Microsoft",
        "location": "USA (San Antonio, Texas)",
        "lat": 31.64,
        "lon": -100.88
    },
    {
        "name": "Google Regional Hub (Omaha)",
        "operator": "Google",
        "location": "USA (Omaha, Nebraska)",
        "lat": 35.92,
        "lon": -99.28
    },
    {
        "name": "Apple Regional Hub (Reno)",
        "operator": "Apple",
        "location": "USA (Reno, Nevada)",
        "lat": 44.91,
        "lon": -104.95
    },
    {
        "name": "Amazon AWS Regional Hub (New Albany)",
        "operator": "Amazon AWS",
        "location": "USA (New Albany, Ohio)",
        "lat": 41.63,
        "lon": -88.98
    },
    {
        "name": "Amazon AWS Regional Hub (Boardman)",
        "operator": "Amazon AWS",
        "location": "USA (Boardman, Oregon)",
        "lat": 39.67,
        "lon": -109.46
    },
    {
        "name": "Cologix Montreal Campus",
        "operator": "Cologix",
        "location": "Canada (Montreal, Quebec)",
        "lat": -19.55,
        "lon": -60.96
    },
    {
        "name": "Equinix Toronto Campus",
        "operator": "Equinix",
        "location": "Canada (Toronto, Ontario)",
        "lat": -35.69,
        "lon": 2.1
    },
    {
        "name": "Telehouse London Campus",
        "operator": "Telehouse",
        "location": "UK (London)",
        "lat": 54.98,
        "lon": -5.31
    },
    {
        "name": "Equinix Slough Campus",
        "operator": "Equinix",
        "location": "UK (Slough)",
        "lat": 52.6,
        "lon": 0.14
    },
    {
        "name": "Global Switch Paris Campus",
        "operator": "Global Switch",
        "location": "France (Paris)",
        "lat": 47.84,
        "lon": 6.92
    },
    {
        "name": "Interxion Marseille Campus",
        "operator": "Interxion",
        "location": "France (Marseille)",
        "lat": 44.69,
        "lon": 6.19
    },
    {
        "name": "Equinix Frankfurt Campus",
        "operator": "Equinix",
        "location": "Germany (Frankfurt)",
        "lat": 47.35,
        "lon": 4.61
    },
    {
        "name": "NTT Munich Campus",
        "operator": "NTT",
        "location": "Germany (Munich)",
        "lat": 51.74,
        "lon": 1.58
    },
    {
        "name": "Interxion Amsterdam Campus",
        "operator": "Interxion",
        "location": "Netherlands (Amsterdam)",
        "lat": 38.64,
        "lon": -30.93
    },
    {
        "name": "Amazon AWS Regional Hub (Dublin)",
        "operator": "Amazon AWS",
        "location": "Ireland (Dublin)",
        "lat": 53.46,
        "lon": 1.14
    },
    {
        "name": "Facebook/Meta Regional Hub (Clonee)",
        "operator": "Facebook/Meta",
        "location": "Ireland (Clonee)",
        "lat": 53.68,
        "lon": -6.97
    },
    {
        "name": "Facebook/Meta Regional Hub (Odense)",
        "operator": "Facebook/Meta",
        "location": "Denmark (Odense)",
        "lat": -28.3,
        "lon": 119.43
    },
    {
        "name": "Facebook/Meta Regional Hub (Lulea)",
        "operator": "Facebook/Meta",
        "location": "Sweden (Lulea)",
        "lat": 27.53,
        "lon": 137.68
    },
    {
        "name": "Google Regional Hub (Hamina)",
        "operator": "Google",
        "location": "Finland (Hamina)",
        "lat": 46.93,
        "lon": 92.48
    },
    {
        "name": "Equinix Zurich Campus",
        "operator": "Equinix",
        "location": "Switzerland (Zurich)",
        "lat": -26.37,
        "lon": 47.44
    },
    {
        "name": "Interxion Madrid Campus",
        "operator": "Interxion",
        "location": "Spain (Madrid)",
        "lat": 21.48,
        "lon": -68.84
    },
    {
        "name": "Aruba Milan Campus",
        "operator": "Aruba",
        "location": "Italy (Milan)",
        "lat": -30.49,
        "lon": -103.94
    },
    {
        "name": "CtrlS Mumbai Campus",
        "operator": "CtrlS",
        "location": "India (Mumbai)",
        "lat": 25.1,
        "lon": 72.27
    },
    {
        "name": "Yotta Infrastructure Chennai Campus",
        "operator": "Yotta Infrastructure",
        "location": "India (Chennai)",
        "lat": 17.08,
        "lon": 76.51
    },
    {
        "name": "Nxtra Data Pune Campus",
        "operator": "Nxtra Data",
        "location": "India (Pune)",
        "lat": 21.32,
        "lon": 74.58
    },
    {
        "name": "Equinix Singapore Campus",
        "operator": "Equinix",
        "location": "Singapore",
        "lat": -11.69,
        "lon": 14.44
    },
    {
        "name": "Global Switch Singapore Campus",
        "operator": "Global Switch",
        "location": "Singapore",
        "lat": -34.22,
        "lon": -14.53
    },
    {
        "name": "NTT Tokyo Campus",
        "operator": "NTT",
        "location": "Japan (Tokyo)",
        "lat": 36.98,
        "lon": 138.01
    },
    {
        "name": "Equinix Osaka Campus",
        "operator": "Equinix",
        "location": "Japan (Osaka)",
        "lat": 35.79,
        "lon": 131.39
    },
    {
        "name": "KT Corporation Seoul Campus",
        "operator": "KT Corporation",
        "location": "South Korea (Seoul)",
        "lat": 12.54,
        "lon": -82.47
    },
    {
        "name": "GDS Services Shanghai Campus",
        "operator": "GDS Services",
        "location": "China (Shanghai)",
        "lat": 35.53,
        "lon": 118.24
    },
    {
        "name": "21Vianet Beijing Campus",
        "operator": "21Vianet",
        "location": "China (Beijing)",
        "lat": 36.43,
        "lon": 102.28
    },
    {
        "name": "Tencent Hub Shenzhen Campus",
        "operator": "Tencent Hub",
        "location": "China (Shenzhen)",
        "lat": 36.77,
        "lon": 104.65
    },
    {
        "name": "NextDC Sydney Campus",
        "operator": "NextDC",
        "location": "Australia (Sydney)",
        "lat": -22.05,
        "lon": 149.47
    },
    {
        "name": "Equinix Melbourne Campus",
        "operator": "Equinix",
        "location": "Australia (Melbourne)",
        "lat": -30.42,
        "lon": 135.69
    },
    {
        "name": "Ascenty Sao Paulo Campus",
        "operator": "Ascenty",
        "location": "Brazil (Sao Paulo)",
        "lat": -21.73,
        "lon": -44.62
    },
    {
        "name": "ODATA Campinas Campus",
        "operator": "ODATA",
        "location": "Brazil (Campinas)",
        "lat": -19.09,
        "lon": -45.15
    },
    {
        "name": "Teraco Johannesburg Campus",
        "operator": "Teraco",
        "location": "South Africa (Johannesburg)",
        "lat": -32.64,
        "lon": 20.46
    },
    {
        "name": "Amazon AWS Regional Hub (Cape Town)",
        "operator": "Amazon AWS",
        "location": "South Africa (Cape Town)",
        "lat": -25.74,
        "lon": 26.36
    },
    {
        "name": "Khazna Dubai Campus",
        "operator": "Khazna",
        "location": "UAE (Dubai)",
        "lat": -25.91,
        "lon": -84.42
    },
    {
        "name": "Center3 Riyadh Campus",
        "operator": "Center3",
        "location": "Saudi Arabia (Riyadh)",
        "lat": 53.13,
        "lon": 49.54
    },
    {
        "name": "MedOne Petah Tikva Campus",
        "operator": "MedOne",
        "location": "Israel (Petah Tikva)",
        "lat": 52.27,
        "lon": 77.84
    },
    {
        "name": "D3X Exchange Center",
        "operator": "DeFi",
        "location": "Global",
        "lat": 0,
        "lon": -150
    },
    {
        "name": "Solana Base Node",
        "operator": "Solana",
        "location": "Global",
        "lat": 15,
        "lon": 45
    }
];

    // Create global XRP logo texture for Gemini nodes
    const xrpCanvas = document.createElement('canvas');
    xrpCanvas.width = 128;
    xrpCanvas.height = 128;
    const xCtx = xrpCanvas.getContext('2d');
    
    // Draw XRP Logo (white X with curved arms)
    xCtx.fillStyle = '#ffffff';
    xCtx.beginPath();
    // Top-left to bottom-right curve
    xCtx.moveTo(20, 20);
    xCtx.lineTo(45, 20);
    xCtx.quadraticCurveTo(64, 45, 83, 20);
    xCtx.lineTo(108, 20);
    xCtx.lineTo(76, 58);
    xCtx.closePath();
    xCtx.fill();
    // Bottom-left to top-right curve
    xCtx.beginPath();
    xCtx.moveTo(20, 108);
    xCtx.lineTo(45, 108);
    xCtx.quadraticCurveTo(64, 83, 83, 108);
    xCtx.lineTo(108, 108);
    xCtx.lineTo(76, 70);
    xCtx.closePath();
    xCtx.fill();
    
    const xrpTex = new THREE.CanvasTexture(xrpCanvas);
    const xrpSpriteMat = new THREE.SpriteMaterial({ map: xrpTex, transparent: true, depthTest: false });

    const texLoaderDC = new THREE.TextureLoader();
    const cyberTex = texLoaderDC.load('/scifi_solid_metal.png');
    cyberTex.wrapS = THREE.RepeatWrapping;
    cyberTex.wrapT = THREE.RepeatWrapping;
    cyberTex.repeat.set(2, 2);

    const dcGeo = new THREE.SphereGeometry(0.025, 32, 32); 

    dcData.forEach(dc => {
        let isMaster = false;
        let isD3XExchange = false;

        if (dc.name === "D3X Exchange Center") {
            isD3XExchange = true;
        } else if (dc.name === "The Citadel Campus" || 
            dc.name === "Equinix Frankfurt Campus" || 
            dc.name === "Equinix Singapore Campus" ||
            dc.name === "Solana Base Node") {
            isMaster = true;
        }

        // Assign 25% to Rainclaude, 75% to Gemini
        const isRainclaude = Math.random() < 0.25;
        let colorHex = isRainclaude ? 0xff2244 : 0x00f0ff; // Red for Rainclaude, Cyan for Gemini
        
        if (isD3XExchange) {
            colorHex = 0x39ff14; // Neon Green
        } else if (isMaster) {
            colorHex = 0xaa00ff; // Purple base for Master Node
        }

        const owner = isRainclaude ? 'RAINCLAUDE' : 'GEMINI';

        const dcMat = (isMaster || isD3XExchange) 
            ? new THREE.MeshPhongMaterial({ color: colorHex, shininess: 100, specular: 0xffffff }) 
            : new THREE.MeshBasicMaterial({ color: colorHex });
        
        const mesh = new THREE.Mesh(dcGeo, dcMat);
        
        if (!isMaster && !isD3XExchange && !isRainclaude) {
            // Spread XRP datacenters randomly across the globe away from the BTC node cluster
            let valid = false;
            while (!valid) {
                dc.lat = (Math.random() * 140) - 70; // Avoid extreme poles (-70 to 70)
                dc.lon = (Math.random() * 360) - 180;
                
                // BTC Node is at approx lat: 34.58, lon: -99.15
                let latDist = dc.lat - 34.58;
                let lonDist = dc.lon - (-99.15);
                // Handle longitude wrap-around
                if (lonDist > 180) lonDist -= 360;
                if (lonDist < -180) lonDist += 360;
                
                // Require at least 60 "degrees" of distance away to ensure they are far
                if (latDist * latDist + lonDist * lonDist > 3600) {
                    valid = true;
                }
            }
            dc.location = "Decentralized Node";
        }

        const latRad = dc.lat * Math.PI / 180;
        const lonRad = -dc.lon * Math.PI / 180;
        const r = typeof GLOBE_R !== 'undefined' ? GLOBE_R + 0.005 : 1.005;
        mesh.position.set(
            r * Math.cos(latRad) * Math.cos(lonRad),
            r * Math.sin(latRad),
            r * Math.cos(latRad) * Math.sin(lonRad)
        );
        mesh.lookAt(new THREE.Vector3(0,0,0));
        
        let iconUrl = null;
        let protocolName = null;
        if (isD3XExchange) {
            mesh.scale.set(7, 7, 7); // 30% smaller than previous 10x scale
            const auraGeo = new THREE.SphereGeometry(0.045, 32, 32);
            const auraMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
            const aura = new THREE.Mesh(auraGeo, auraMat);
            mesh.add(aura);
            const light = new THREE.PointLight(0x39ff14, 3, 3);
            mesh.add(light);
            // Exchange arrows SVG
            iconUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjZjJmMmYyIiBkPSJNMzQyLjYgNTRMNDkyLjUgMjA0TDM0Mi42IDM1NFYzMDBIMTcwVjEwOEgzNDIuNlY1NHpNMTY5LjQgNDU4TDE5LjUgMzA4TDE2OS40IDE1OHY1NGgxNzIuNnYxOTJIMTY5LjR2NTR6Ii8+PC9zdmc+';
            protocolName = 'D3X';
            
            // Add 3D Circulating Arrows specific to Cyber Skin
            const arrowGroup = new THREE.Group();
            const arrowMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, side: THREE.DoubleSide, transparent:true, opacity:0.8 });
            
            // Ring 1
            const ringGeo1 = new THREE.RingGeometry(0.1, 0.12, 32, 1, 0, Math.PI);
            const ring1 = new THREE.Mesh(ringGeo1, arrowMat);
            const headGeo1 = new THREE.ConeGeometry(0.04, 0.08, 8);
            const head1 = new THREE.Mesh(headGeo1, arrowMat);
            head1.position.set(0.11, 0, 0);
            head1.rotation.z = -Math.PI / 2;
            ring1.add(head1);
            ring1.position.y = 0.08;
            ring1.rotation.x = -Math.PI / 2;
            arrowGroup.add(ring1);
            
            // Ring 2
            const ringGeo2 = new THREE.RingGeometry(0.1, 0.12, 32, 1, Math.PI, Math.PI);
            const ring2 = new THREE.Mesh(ringGeo2, arrowMat);
            const headGeo2 = new THREE.ConeGeometry(0.04, 0.08, 8);
            const head2 = new THREE.Mesh(headGeo2, arrowMat);
            head2.position.set(-0.11, 0, 0);
            head2.rotation.z = Math.PI / 2;
            ring2.add(head2);
            ring2.position.y = 0.08;
            ring2.rotation.x = -Math.PI / 2;
            arrowGroup.add(ring2);
            
            arrowGroup.scale.set(0.35, 0.35, 0.35); // 40% larger than 0.25
            
            mesh.add(arrowGroup);
            mesh.userData.arrowGroup = arrowGroup;
            
            // Add Dexmond Exchange Hub floating text
            const dehCanvas = document.createElement('canvas');
            dehCanvas.width = 512;
            dehCanvas.height = 64;
            const dehCtx = dehCanvas.getContext('2d');
            dehCtx.font = 'bold 32px "Orbitron", sans-serif';
            dehCtx.fillStyle = '#39ff14'; // Neon green
            dehCtx.textAlign = 'center';
            dehCtx.textBaseline = 'middle';
            dehCtx.fillText('DEXMOND EXCHANGE HUB', 256, 32);
            
            const dehTex = new THREE.CanvasTexture(dehCanvas);
            const dehSpriteMat = new THREE.SpriteMaterial({ map: dehTex, transparent: true, depthTest: false });
            const dehSprite = new THREE.Sprite(dehSpriteMat);
            dehSprite.scale.set(0.16, 0.02, 1);
            dehSprite.position.set(0, 0.045, 0); // Position above the node and arrows
            mesh.add(dehSprite);
            
        } else if (isMaster) {
            mesh.scale.set(5, 5, 5); // 5x bigger
            
            if (dc.name === "The Citadel Campus") { iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAC91BMVEUAAAD//0LkfRb7oyrymSz7qUf5p0b6q0v9rkn9sUz9sEz9sEr8rkz8rUj4qUn2mjf6okP8rkj8rkn+skn9s0z/sEz/tE3/t0/9rEr5qUr9skr9r0r4qEjxiCr7q0b4p0j5qUn+sUr5W1v5qEf/s0n4pkX6qUjphyz5qEb5p0b7pjz5p0X/tkn4p0T1kyz4pEL5p0T5pkT5pkP7qkD5pkL5ojr4nzT4ozv5pUH6qED6uWv7xYT6rlT4ozz5njL/skX4pUH5nzL94b//////9+7+69P81qn7wHr6pkD5pD/5pD/+7dn//vz//fv8zJP4nzX5oTj8q0D6tF7//Pf//v3//f37vXL6tWL3ojz/+fL927H6sVn5pUD/r0L4pUD5njD6uGf/+vT+8N/5njT/rkH7pT3///78z5j5rFD8pTf4nTD5oDb//v74oDX948T2mjD9qT34pD/4oTj7wn74oTn4nTH6p0b+9Of80Z34nC7+6M781KP4njL93LT4ojr4oz34pD73oDb3nC3/9uz4ojn6qD/4nzP958v3oj34pD34nS78yY34nCz93rn3liH4oDb/qz34njH3mCT/rz7+8uP4myr3oTj3mij4oTf4ojr4mir4myz8pzn9pzn1njT95sj3mCX8pTT4min8pDj9pDj4mSf1kiD3oDb4nC35oDD3mSb7ozT/qjn4mSb4liP4mCX2lSL5mir4mij3njP3lyP8ozP/pDP7oDP7oTH6oDL4nzL4lyH4nS/3lh/3jxH4lyT4lBr4lyP3nC73lR36oC7/qDL3lR/4lBz3lyL8oDL9oS33lB34lR33miv/pi38nyn8nir4khj3kRX6mSL/oyv7nyv4mSj6miL3mCf7nSf4khb6mCD8nSH7mSD/pif3lyP9nSD3mCb8nSD/oSX9niH8mR79nB/9oSP7nCX2khv5mB//oyL3lR/5lx72kxz9mx//nh/2lBz9nB3/oB7/nR3/mhz7mBv8lxr5lBv8lhv8mxz5lRr+mxuhENzjAAAA/XRSTlMAAQUCFjBMaoOdudDe7vwRIVSL1+///////8L1/g5G/f+rAf///f8L//9Z///+Gfz///+s//////+K///////////////////8/P/////////R/////////f/////8//////9B//////+F//////8r8///////////////////////////wP/////////////////////9///+//+c20r//8f/9v//If3/iv+4//8x/0xr//3/zf/g7//4//////////3/nf//////1////v/2////Rv7e/YT9q/+6v1T//Kv/zv/Uisft/v5b//z//P///vP///+d3///2O+eXA7/KwAADvFJREFUeNq0k0WCpTAQhgNp3CUCBKfa/f6Hm0q/5Rj67aK/BMgWDJMSzZ1lO67nB2EUI1EY+J7r2FZCNNQ0yCUYVKubaZb7Rcm4EJwxKatKSqZHgpWFn2epqT3Q8z38qCd2XjcclWUVI6q6oVSMVBJ98KbO7eS2/+zwbeeFTHDZ9yitqt/QNvpecsFCr0tOrUGHsdwArx7iXg3/RPXxgDYD19IHz5Kn3VgKpnqlhhUoNMFEOXb65EQOonvMfCakjr4e1UvO62wixrEW9PHO51yh/EbwCFqwdYRD7Vsj+5GfNzPMaGEZLbxmf/zWbbiCeTegeJMnO0vQ7QfiHtR8AAX3IrB3lWCSh5wxgPkgAIzlLV63jYkSqxaP8HgCoERgbXwG/e+VCzw9ngMs5TNeuuX5zXyR8HIacL/kJqHr9dvxFVD/POCNj+1aB5Tc1a/w9nIqb/Bav69zQEkaLB+fp/OxBCmhq/SLBc7X1w4KdLBGH/N/XcAqB5S8Y//fF4Gv8J/vwCAP9Tb9X5SSQ4P0QBBAg09YH1fXkZKOaowa9tg21vr/l7UUvFuzXsHlcIlWDHZtDKsTn+ckt0+2gKioGjhcApHN4XNLHM/qNMBvLb6gBIKhcEQNy7JpA//3TeAYZ9QXsyQQT2Aylc6EnpbGlYhlo06G+y7/n+v2HFiBQr6AdxRLZQIA5QolAgFdcsL6z69rwPK2atRafFKp1bHRaDQxGBEBaKtNI5EKNTCIVm08+2UBdtwdsIQYCWIBsYHdUIVA2N7FfC/YpxQGugZfjwHPHA6zo4ElyLiHjXuBlDYAok6KeMd0VqvIAx1G2eH8swHLb1YXuYERsvDmb6DLGa7uBdJjYSCMj7DQKBSwe6zIAz1yi+omz34qwEk0R42AymmFggxPq7N+8V7gHDNjoPQigQXEwupSpQbkon8Y/mP8q+vBDTVgcEt5Wb03bkRxVIuvbR/LzEz2klvXE1iwggrVWSJ5o8oBR66jXRkCtcOykhiWwg6zw8z4T3UU+DQqSNZ58zcP92jmzm+u7XdKHzGU4w/YZ/nXr/90+zIsDhUyr6Tl5//8p/NoO8rYn64rU5JfXCQ3+ODMmR9/zS1Rw+gwgbzHT5IfMayDKTF+z7mOejDR7Skx6u6AQ+hLnLFEhdxffzxz5oN/dOA1rxolhh+cJICI2fOonKqw3RB7EAdJrNFrrEgRf5Cg8sOqEq8a1+R9CFvwrwe5XjWMvhwzIGkzASB5/qTsS5kAQoNS7ifvLa4QEOKPQu6WV5XcB38hbQhdzj+orlHlVm0drAGhCYIEkMP6JMj7rt5rNHzmFBfNwFp7q0ad6gfnsTNSB5yGG+BRxUs1wALHkISZBEcklF7xcI0ZOEkCkqQvOW551IFbcPqkC6DJ/QeeavX6jPEejRMkOAEWPCbzXkNy0lEmOd/ivR5VYLmA1AWnsB8f5BpU8XIZBICYafAPJCczMAm3PIY4yH3wI3ZKyoCHUEAVvTHjsusGPPh/G8CuoAEEpkATBW9BHAIPxSw4CcHmXH0cGNxCfa3eUtciM5BD5hUm3wrabtXo1chtLjgSgHNgeiCkj4uakhq7L3wrEZBAgRbr68GIV69CKJAO58OjEAo8dceNwWN8loOTiAEhsyHFn5XWkuceg1uZp4F3PjhzKPCiOeTWgt3rlB8CYSZkDmYA7mU/s6sYhJpfwOJwE155Gch1a0Bv+7oSEcBb7h5KoBtBQ6GkVJ3HrURu4OUrsPxprDXw81O3Bmoq7hDSx4PHvKU0KRE/vIMSNA3anuoMikfwNNAKy4t3IFSlhZqwFRDSxX/S7gsGI1fq/JlQBzkHHLRxEXeVAqHmw9nsdEcgxGjBXWECWdIOZD8vMbjtVJiyJGWiBuIr2WlgFAgFOsQB/dWubm0Cuh+kHiRBwuuCW7QyMGz0kQnQaC/iOc8NSgI/d/VAgdcCvXYtuOvvSGXM4DEXYewijFvPdh7OBNJiYR9jV6A38AUU6G/WJqAfSJG1QFh/shJxM41W2R5kXqGqlASa+6HAYKA3ooWq+kL0M7PDemSNr01EFmlQOiCt/pveoUEMpsBQKKIBhjNWntQQ59HXBTuyqh++jNxGAjwZVhIIDb08i40Ud/fyGqjqvGMGpJQCFI/CBDOkVbj8e5Th/5/e7uIRrLWbL+c1wIymAFxqgbJRRi5gwdUFJLrHsPGhXl4TQRMwIykgr8BMZANSdgRVvAK9Q+NYwVDMpoGIkF+JnEDCe7URdLmq6QnSAzS43FRlUyA2VIC90CjQmQGQL/R38lV2SUH//Cf0nSJBRtCuLPACGxyKpWqAmawDhCTgooJNYYq3H8EPVKBZSIMWt5CqRAzew6npmE4DtqgsBYiWhjqLITg52T462j4ZtPjlSZg0yeuUiE1PYTOaBHjW44Q1ZOBOf1JdcnZ2qdWPy3KQwC2dagIz2OycTwN8NEc+ldPyYUj+Goob4FNkbhab1yQQWZBSAJ3JjyFl9W/8sWjzqQjMY7HffBrQhU2yqQP8DyRBgBtfdvI+NWJYjNMCa6iUVSXNyInIcf0c5Tk1fonBI+Dix9aeARAy8wDkeOtR8ErTnfbnqZwq8AhmNQkspaApUMZnlxVW/uv/Ig2cOcsrqT4hDoFZeA0dQrxw3HAh+hDcWW1fmLh+p+wGLu4DQKisCwZ1gioOeA1hEAnx4gu6W9Bx8Ke+iE4Iri2xlrKWf/5DKoyE1Q3EIBqcXqfihVvJIEnpJWoLsw7KwXG+xaYNPvkGmgI0DhLtnT5KhfXpQWxzS4PAdh0wI7PA9nEFKPF8m63LBCQaA/5nrKAmsLWJFWgQEJqQFCDpO43SJzp0z1evyFIaBynbnKpAATa+tb4YJ0IwTUoBGuTdigrSYq1g2/ncSRJIQOb9MCEsKrK+NY61Ti/GC7ebQSDDiH94UY5t9RJJo+9C3YZvUZnpMWxkdm+9VgWKE4TF2lrfRgp6Ca0bQq0cYQ19jgnSP7pYq8T63uwIdnZ/ep1VIXqwEGVhCuyYAI6kwLaDlSPs1MmGcmckusgqsD69fxbDBrdUBKi1K9acnyd3tpev3CWlFqjMj1KsHMd2smwiTPh+lFIU2BoU/5ptrf9NqVnotg2FUXjwFGNG0Ug0IpcZ0zEvJY+ZmV2KemUpHnjgybKKVoQhjyFo10td9JieYtdx5jSWcpN8YojOye9z+WeRuHxbMOzUwVrLqlNGAqDOo07qDJtIg/9YgoHNc140sAhevtGOZovfBND63Us2j9l1xGcBXwNros13WjdgFKnbxSIIBLXD6fNQOEAgaBO0BQgvKrJW4WN3AiudbSyRwF0C7Ek4FbS38XeJ5ATCIe14PuFxEGXgDHO+fUy04wsBEAELhz80QREQinC1eVZp+nEDB50sgTIQ1C4oJsIQBKjkNAi5ur6JzSVbG98Kfq/9TEMDjLqrgfVKuyrxBAMlYgOFIAAjALtFxvXJVAAkx3mrKvZdzZxquldTwPtFUYCIzm2nE/douHXr2zMAQUDugfLwmu6TnNzAmXcrEzY95vvJa4VNp1dZtD35wc2J+nBTSPEUUv+Tdk0Hi/A6mNwA66zZUohpmHZ/+obQNDJ0jMVIdCELEHwNxTUDfYgKAMIp3K07dmFPpX4lak2yJYck+rNaN+9wEgBBRO6D4tHL6o9yxJ4UimLeij62btWWdgyNeaIQWTuCiPxxGhSPlqA/qNhRUCzV7ROFM6tXNcXWYxzH0MBJYK0X2BEowX7jveBQKBx5ggZQBOj0iZ6c/1+6yJxLc0IrRPYJgkg4ZDxejh83EFSepAFrZ7KhAe1xMAtDAdfMXIl6gkIJDkBh49FKjpB8aoB/zm79eTa3zXKusDJWAhxPqAXMJVZpGQQ8ClKPoNG7MiQr6RgQLXoBdi+TBPFFXRaGG7eyRVVRioq1afNRnQR4hkegyMPxbhbopEdm0sAundPf5gq7GcCKi2Lb4GubsbFkHVzZLAAGjSKPQFmD8eOHZYVJSae3EMM1A+ckwIDBVVh1NA8FBbtWnd6y8Wx2YfajC6ct295J3faU+sPG/zdSwDEpePJuRaUeAQs0wItbtLAVYQcFQRwcFF+96GS6nYI06OcBkwojAfHn+4FRtTMFQLLE+gWW+HnGCRd/PPpYPEgA8ITv7Ozu7u5kngC+MyXq6Of4w60xF/AKh4aUcmL9AjYbRwp1Vn3KrZEAlxlKZ3wOiDvoH1W+IOEczWet0EAxjAD5xS7l6v0Cm1vecl8yQx3tN+vDoTjt6zeVRkEKM61YVXGVFgGSJqULer/AI98XOjPUb9/NTSx6DsNKCgN1hdEBt3u9QHLN5B69X6DEQ9KZoXyLJ9D0EVTahuCL273Dcu4stsftoElxUqWeyBqJtGUCrY7+MOkbbQw/v6no3zoESXLPqXPTNtIDXyYg2LUrPs6WCeq3rwvGGyPANBJ+/U7hgCO598IfWCdOKtHb2B75HHRG+r9/dUGpJO18I99UR0po2qFhu7zyXHYWdtrDOTJB/fYXCo3FHANHmjQLHs/bNZaZAp2JvikAJsbDCTF9BzaOaxY9Psf7jPQ/o1o6/9Vu1lh2w2AUPskGsgLX072lhhbhUsezgDBROUT2Y3mOIvkXP6bfbgPm2wnvNeOHF6WzmIvvlYX7wuvvNSR4jD8tlPzWO8UEPQnPQIPyH4vD+Ux8f96HxGwe5v5VEvTqX54At0IP/nxayb/YD2IuxJtOJQSPB9UBg2CMCTr2Hwd1EIunlGcdJgDJ6R+IRwnk8vtRwdeOBOoxwatdTcyHpPw5dGL/laekNneHF4yAKiX0p5bSoCQ9w+maoF7RnGeg29lnfHrRkHfDzfCMGquhuT9oa26C5tgj5iZjpzToZkv/S8kxwWnaAY8XcRHhV03hECXjC7R/0hr3TWJnM4A69gCZ9Q9JvgidQK8XY2O9Bq0rLTt29NaML/KRnWG/5GburMcl0yXuuKa8dfMbkg/sFny+WCyldRnDEIy9/0OMoTlbYczl4iIowOfu0e+IpsJZ59cM0AxVOKPy4tpjk0hpVIJ+t4Tfw4Q+bLbeofx6vcIAq7X3eclsHmgSdgG/l+P/JDq/2T1Ml1sABtvl9GFHzyMyaIL/nwD0ojRK9nb2JgAAAABJRU5ErkJggg=='; protocolName = 'BTC'; }
            if (dc.name === "Equinix Frankfurt Campus") { iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAACBFBMVEUAAADv7//09PTy8vXx9Pbz9Pjy9ffy9fjy9Pfx9Pfy9Pby9Pfx8/Xz8/Py8vTx9Pjv7/fy9Pfy9Pfy9ffz9ffy8/b09vjy9fXz9Pb09/ry9Pjz9fnv7/Tv9PTk5uiCg4Ssra9jZGWQkpTIycw7PDza296QkZIvMDBgYWK6vL21t7lHSUnm6OqEhojNz9Ly9PSztLednqB4envBw8Xv8vWen6Hv8/NsbW7x8/bP0NOpqqyJiovz8/dUVVXv7++lpqjy8/jz9Pbx9PZ9fn9bXF01NjYdHh4sLCw5Ojo0NTUwMTETExNucHBISElgYWE+Pz9zdHUaGhomJyfv7/oWFxckJSUtLi7x8vV4eXpRUlMhISHx8/Z1d3fy9PdnaGlERkaEhYZ6fHxrbW1AQUGDhYVWV1cqKipERUVOT1BcXV6LjI1iY2QyMzNMTU7Fx8lLTU2Sk5ba3N+HiIpKS0zW2Nt7fH4vLy+6vL6rrK6ChIXk5umfoKJYWVpXWVmQkpPd3+GTlJaXmJnOz9Lm5+qFhoepq6y6u77r7fB1dneRkpQ7PT2EhoeQkZPIysxISUnW2NrW19uztLa3uLqXmJp4enpTVVVvcHKsrrBmZ2g8PT2eoKJsbm+en6A9PT7v8/dsbm7BwsXd3+KEhYfx8/fy9fbP0dPx9Pjx8/bv8veJiozy9fnv8vQEFD2BAAAArHRSTlMAEDBQcI+fr7/f7/+AQGDPIJ9g33+vb1CPX+9/MDD//////////////////////2D/////UP9A/5D///9A/xD/r8/P/////////////////////zD///+g////sP/f/////////////////////////////////////////////////////////////////////////////////////0D/////gK//cO9g/1BgIk4dsgAACKdJREFUeNrM1YV1wEAMA9BjsMJOGfYfszBA0YnyJ5De6fmcPR9iyqW23gWfpPfWypBi8O7afEi5Cb4gLafxouGnPOOH5hyXa4Ufc8cvzWu8SvrUBH9Tt4U/nIZ/aZt3PGMW/JusI206MKIbIf4uMKTr4s60ZIG1EyssKwwYVGCMh19hFxxI09GHU3EwjUeu5wYGeDu6FRigfQtLgwHeI9wJDNAewWec7N6bzkdxOjWc0YOA4NFsRk8g2a2OP031JvMn0oWbn9/gWUCmLwb5qR5fuOfz9Y04s8BuJIihoGeJtMw4bVaYmRmXie5/kLDCCkx1RydwvVbp/3kOUnTeXPr3CzDlSvWqCN4LMLVQqTfSbRG//81Q0ZZkHvD3szVsAmhbcYLHV/P787AN0N6RPA8yJr/KOwDaCeTBxVrFC2EM3gXQLqAXpe+fedMAWtJ2025BpicYgPaKpIuDx/eEMtgA6h3CnqL4AkvzIID2STKRoe/3/nAIQPuJL/1UApjBBoCEgchAui+YcjgCoFVJosETgSLgGICVuiJzJ9ECSfMYABMGciPNArWGEwC0jViiLMUC5eEYgBMGYKW4LswMngygnQLMkAPwjDbYAMAweOb8gwFHgAGwHt9PFgHHAbQX8Ti2wQ5AvRHvCR5TEeAB6HC8PH5ClTgHAPL4ScQHyJsOAFbqHsd7gHJwALBSNxLtAUbDmQDaiHKInpAG+wAtUQ7RM7LE+QA6Bj0BX6PzcR/ASh1fq5+xBvsA2ol/2UzQJc4H0H66lD7BDfYBJuFLOnUPN9gH0F5W426mxPkAdKnrPgBwhwCYvgiAtpAaP2YM9gF4jzN0g/LmBQHaO7gomIkTAT6AVrkdimWwD6Bd1B26TkWAD8B7PMSlWH+4BID2Qlk2SxnsA/Cl7pkdUcpgH4AvdRmkwGi4JID2E2E8Ahh8WYB2QoJZrsT5AHwYzCEpkIcCAPVGYQkmSIN9AD4MPmwC3IhR4mzmFxaXll2CtkJ1CHC46f78ldW19XUXob2joMV3ohn88dPq5mwC+AidBfvcvTgGz3/+srpqAIYAh8HbUmkqygJ93dydVQPYmW/fI3iclX7QBtvuGIDNz1+/6VL3oViRyJv+zzcAQ1haZkvd9dINNgLmF3ZW/ziAbdKv4wTDBe7ofWiB7GyuugA7m7SMeTxS+sMZ/Pff6uZ4AIbwf4N3q+huNAZiy8zHJZedvp6WmfH7rr0FlpnKzMy0zPBP10XHUXDkF90LepHGGsgdT4/BFuYZqEbpI5AAlFUm1MUsAe4JiMO/jwTQDHyo27Yu4eEg4sa9+wEACWQ1Q0TaVSZoBz9A5+YmgEo6LySwg3wCHj56HAQSAlZJzGNwcB3xBFjnEgRsTZKFunWEgy88eRoEDAGLZ88FjwFFoAqcyxAwePFSXyoigepXr41zGQKIN2/PF4/Au7ogIAkgovVFlFBDo3cCTc07BZA3ZA0tXgm0tglbssROMdrrvBGIdnTKX2ICXXV+CHQ3iwfUNswROiIJNLURYwl6P9bQQxKI9lJ7MtvQEFZgCBjxM9giHMz17UxGv4gAlk7B1m+XsKnvHOgDKxRGAEvn4PFKSVO/UbrVKznqUKgriACKf2hYj4jGKrXyy4jRMbBCAQTGHfFPTOop0WBLPFocm1aqasb5EPoLINDk/OiJGq1nh4QbDmmWmFMGVfM5rRDmFH9lRHyMeZAZry8ogxQrvK/LQQBygxE/MVfZRi04PqgljB7NaoUwu/iPTepFfBQO5qgVU+cFZQBWaAECmXPDiU96CbOV8hVTLXshgVb4nJFA6xcQ/xJOEOcel71cmZWAjoAAiH9ikt4Ws4tuU0vXMOqmizok8LUZxb+EWWLRTa4p55QFWsESQPFH9Bq+VXKnBnu8HQpdOYpBe4VA9Lsj/h86CSPEfsaAXPP9VMlYQCuEWcS/hCn6ixyJnQZULUUd2aAdpobm8zXaYilCEBYAExA2yFBSw18gfgeV/HeBfu+ksKCSgCX1nBOaj/u8t9kIp99EpLCAdIHit/izkwCcTvM2QCu4odmCiBB2P7aKTfzRJVJwPwQUP38zd2CdARRSwgZoBRQ/GoApoqAhJlIgqv464kfM+jidto8xg39qCWgFrPwQISgFQR3ibIA4dXTnIIgfIgR1+u3pdvTn/+rOI0uKIAaiqrGVCFO4HU53wOQKdwC2dRcuwIod63EuMZfE28DPV9brfwLpSREZY1p98xccSOESIYBPtO74aXkqMtD/WpQIgXwMS2RMRAptgP5IaLHv2XCnvFQbgBxUJSwypiKFNqARgh2A2aELQKSQBiRCABLmRvC832cpJxOq58ggCAHoAJTJBSRSBBIhdADK7KdnX2UQXITQAeh1Nj5ShEYIbgBqRHykCI0Q3ADUiHgZBBwh3IsMQEZARoqQCJF4Zqs476UhDoo9wsqO8zIIiRCZx/KO3OlIERIhYAXzOvbjpBtbqmDlxGkZhAiAjNHK6LCXhkQIdoH0PYZlEBIh0AVSbsOHqkIiBLtASnWCB9LAC+IciaLcL6gMAosQXob8o8EaKQKLEG2yv+Ql6aWR76DKIRMpvmngSdZ9v/xIEVCEuGpChpA1UoQ6KC9gZcKSdcgPYeALxluRemlIhEipX7l+hvktRQAO2q6ZdepAI0UADir1d3wOHsQu+QD07+DZq9MuUJP6+25Rz/1XrpeVqp9/D2D/7N9B//qV+0e+GFcHIzj0hThrEJcAM8LtkxcCv/4g96t3pg7Gcql4R9prw5lm78ZIrk//IbQNS2KaO5s/z3rxZMqO5XKS2kI7tHSmObF8Znv4Fvp/tXj/FlqV8pNbKCuzPPnPwrgx2CLszI3YnR1bjuHS6KdifDPYwkyXjvz/aMDqQNyeH/s/UuoOUD3IdLv+dROPK7M4PDsbdWy/35q6cZ0tnme4fnvj7NY4lvKpl1bKeLRVN25nlP4W8ZTRGOsAez8AAAAASUVORK5CYII='; protocolName = 'EVM'; }
            if (dc.name === "Equinix Singapore Campus") { iconUrl = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiMwMDAiLz48cGF0aCBkPSJNMTQuNDg1IDUuNTMxTDMuOTAzIDEyLjYzNmEyLjA1MyAyLjA1MyAwIDAwLS44MTkgMi44MjUgMi4wNjIgMi4wNjIgMCAwMDIuODI4LjgybDEwLjU4Mi03LjEwNmEyLjA1NCAyLjA1NCAwIDAwLjgxOS0yLjgyNCAyLjA2MiAyLjA2MiAwIDAwLTIuODI4LS44MnpNMy45MDMgOC41MjhBMi4wNjIgMi4wNjIgMCAwMDEuMDc1IDcuNzFhMi4wNTMgMi4wNTMgMCAwMC0uODE5IDIuODI1TDEwLjg0IDE3LjY0YTIuMDYyIDIuMDYyIDAgMDAyLjgyOS0uODE5IDIuMDU0IDIuMDU0IDAgMDAtLjgxOS0yLjgyNHpNMjIuOTI1IDEzLjQ2MWEyLjA1NCAyLjA1NCAwIDAwLTIuODI5LjgxOCAyLjA2MyAyLjA2MyAwIDAwLjgxOSAyLjgyNWwtMTAuNTgzIDcuMTA1YTIuMDU0IDIuMDU0IDAgMDAtLjgxOS0yLjgyNCAyLjA2MyAyLjA2MyAwIDAwMi44MjktLjgyeiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg=='; protocolName = 'XLM'; }
            
                        if (dc.name === 'Solana Base Node') { iconUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTTQzLjMwOSA2OC4zMjQxSDI0My42ODJMMjEyLjY5MSA5OS4zMTQ5SDEyLjMxODRMNDMuMzA5IDY4LjMyNDFaIiBmaWxsPSIjMTRGMTk1Ii8+CiAgPHBhdGggZD0iTTIxMi42OTEgMTI4SDEyLjMxODRMNDMuMzA5IDE1OC45OTFIMjQzLjY4MkwyMTIuNjkxIDEyOFoiIGZpbGw9IiM5OTQ1RkYiLz4KICA8cGF0aCBkPSJNNDMuMzA5IDE4Ny42ODVIMjQzLjY4MkwyMTIuNjkxIDIxOC42NzZIMTIuMzE4NEw0My4zMDkgMTg3LjY4NVoiIGZpbGw9IiMxNEYxOTUiLz4KPC9zdmc+'; protocolName = 'SOL'; }
            if (iconUrl) {
                const texLoader = new THREE.TextureLoader();
                texLoader.setCrossOrigin('anonymous');
                texLoader.load(iconUrl, (tex) => {
                    mesh.material.map = tex;
                    mesh.material.color.set(0xffffff);
                    // Force material to remain solid even with a potentially transparent PNG texture
                    mesh.material.transparent = false;
                    mesh.material.depthWrite = true;
                    mesh.material.depthTest = true;
                    mesh.material.needsUpdate = true;
                });
            }

            if (protocolName) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                ctx.font = 'bold 50px "Orbitron", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Use 'ETH' for 'EVM' display
                let displayName = protocolName === 'EVM' ? 'ETH' : protocolName;
                ctx.fillText(displayName, 128, 64);
                
                const tex = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(0.06, 0.03, 1);
                sprite.position.set(0, 0.035, 0); // Position above the node (pulled closer)
                mesh.add(sprite);
            }

            // Add an outer glowing aura, keep the core mesh solid
            const auraGeo = new THREE.SphereGeometry(0.045, 32, 32); // Slightly larger than base 0.025
            const auraMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
            const aura = new THREE.Mesh(auraGeo, auraMat);
            mesh.add(aura);

            // Add an inner solid shell so the globe lines don't show through
            // Using MeshBasicMaterial with transparent: false, depthWrite: true, depthTest: true forces it to render as a solid block.
            const solidCoreGeo = new THREE.SphereGeometry(0.0245, 32, 32); 
            // Apply the cyber metal texture to the inner core explicitly requested by the user
            const solidCoreMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8, metalness: 0.2, transparent: false, depthWrite: true, depthTest: true });
            const solidCore = new THREE.Mesh(solidCoreGeo, solidCoreMat);
            // Render the solid core BEFORE transparent elements to ensure it blocks background properly
            solidCore.renderOrder = -1;
            mesh.add(solidCore);

            // Add a dynamic point light to make it actually emit light
            const light = new THREE.PointLight(0xaa00ff, 2, 2);
            mesh.add(light);
        } else if (!isRainclaude) {
            // Apply XRP logo to Gemini nodes
            const xrpSprite = new THREE.Sprite(xrpSpriteMat);
            xrpSprite.scale.set(0.04, 0.04, 1);
            xrpSprite.position.set(0, 0, 0.03); // Just slightly outside the sphere radius (which is 0.025)
            
            // To make sure it always faces the camera from the right perspective we can just leave it as a billboard sprite at high Z depth priority. 
            // SpriteMaterial with depthTest:false renders it perfectly on top.
            mesh.add(xrpSprite);
        }
        
            mesh.userData = { 
                name: isD3XExchange ? "EXCHANGE: " + dc.name.toUpperCase() : (isMaster ? "MASTER DATACENTER: " : "DATACENTER: ") + dc.name.toUpperCase(), 
                val: dc.operator.toUpperCase(), 
                ind: 'DATA', 
                hq: dc.location.toUpperCase(), 
                city: dc.location.toUpperCase(),
                lat: dc.lat,
                lon: dc.lon,
                rev: 'ACTIVE',
                owner: (isMaster || isD3XExchange) ? 'GEMINI' : owner,
                baseColor: colorHex,
                isMasterNode: isMaster,
                isD3XExchange: isD3XExchange,
                aura: (isMaster || isD3XExchange) ? mesh.children.find(c => c.type === 'Mesh') : null,
                light: (isMaster || isD3XExchange) ? mesh.children.find(c => c.type === 'PointLight') : null,
                iconUrl: iconUrl,
                protocolName: protocolName
            };
            if(isMaster || isD3XExchange) mesh.userData.owner = 'GEMINI';
            
            window.datacentersGroup.add(mesh);

            // STAKING TOWER ADDITION FOR CYBER SKIN
            // Generate THREE massive Staking Towers specifically next to the D3X Exchange object.
            if (isD3XExchange) {
                const centerLat = dc.lat + 44;
                const centerLon = dc.lon - 44;
                
                // Offsets for the 3 towers forming a triangle/cluster
                const towerOffsets = [
                    { lat: 0, lon: 0 },
                    // Spread apart further per user request (was -1.8/1.8 lat, 2.2 lon)
                    { lat: -3.5, lon: 4.0 },
                    { lat: 3.5, lon: 4.0 }
                ];
                
                towerOffsets.forEach((off, idx) => {
                    const towerLatRad = (centerLat + off.lat) * Math.PI / 180;
                    const towerLonRad = -(centerLon + off.lon) * Math.PI / 180;
                    // Lowered height by 30%: 0.35 * 0.7 = 0.245
                    const towerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.245, 32);
                    towerGeo.translate(0, 0.1225, 0); // Pivot at bottom
                    const towerMat = new THREE.MeshPhongMaterial({ color: 0xff0033, shininess: 100, specular: 0xffffff });
                    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
                    
                    // Lower tower by 10% of its height into the globe (height is 0.245)
                    const lowerAmt = 0.0245;
                    const rLowered = r - lowerAmt;
                    
                    towerMesh.position.set(
                        rLowered * Math.cos(towerLatRad) * Math.cos(towerLonRad),
                        rLowered * Math.sin(towerLatRad),
                        rLowered * Math.cos(towerLatRad) * Math.sin(towerLonRad)
                    );
                    towerMesh.lookAt(new THREE.Vector3(0,0,0));
                    towerMesh.rotateX(-Math.PI/2); // Align cylinder outwards to prevent clipping

                    // Big STAKING CENTRE Text Sprite (only on the first center tower so it doesn't overlap messily)
                    if (idx === 0) {
                        const tCanvas = document.createElement('canvas');
                        tCanvas.width = 512;
                        tCanvas.height = 128;
                        const tCtx = tCanvas.getContext('2d');
                        tCtx.font = 'bold 70px "Orbitron", sans-serif';
                        tCtx.fillStyle = '#ffffff';
                        tCtx.textAlign = 'center';
                        tCtx.textBaseline = 'middle';
                        tCtx.fillText('STAKING', 256, 64);
                        
                        const tTex = new THREE.CanvasTexture(tCanvas);
                        const tSpriteMat = new THREE.SpriteMaterial({ map: tTex, transparent: true, depthTest: false });
                        const tSprite = new THREE.Sprite(tSpriteMat);
                        tSprite.scale.set(0.3, 0.075, 1);
                        tSprite.position.set(0, 0.32, 0); 
                        towerMesh.add(tSprite);
                    }

                    // Intense Aura for tower
                    const tAuraGeo = new THREE.SphereGeometry(0.1, 32, 32); // Slightly larger
                    const tAuraMat = new THREE.MeshBasicMaterial({ color: 0xff0033, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending }); // Max opacity
                    const tAura = new THREE.Mesh(tAuraGeo, tAuraMat);
                    tAura.position.set(0, 0.1225, 0);
                    towerMesh.add(tAura);
                    
                    // Add point light for intense glow
                    const tLight = new THREE.PointLight(0xff0033, 3, 2);
                    tLight.position.set(0, 0.1225, 0);
                    towerMesh.add(tLight);

                    // Add steam/cloud particle system for cooling
                    const steamGroup = new THREE.Group();
                    // Create a simple steam puff texture programmatically
                    const steamCanvas = document.createElement('canvas');
                    steamCanvas.width = 64; steamCanvas.height = 64;
                    const steamCtx = steamCanvas.getContext('2d');
                    const steamGrad = steamCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
                    steamGrad.addColorStop(0, 'rgba(200, 200, 200, 0.8)');
                    steamGrad.addColorStop(0.5, 'rgba(200, 200, 200, 0.3)');
                    steamGrad.addColorStop(1, 'rgba(200, 200, 200, 0)');
                    steamCtx.fillStyle = steamGrad;
                    steamCtx.fillRect(0, 0, 64, 64);
                    const steamTex = new THREE.CanvasTexture(steamCanvas);
                    
                    for (let s = 0; s < 12; s++) { // Increased to 12 for more soup
                        const steamMat = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                        const steamSprite = new THREE.Sprite(steamMat);
                        steamSprite.scale.set(0.18 + Math.random()*0.15, 0.18 + Math.random()*0.15, 1);
                        
                        const angle = Math.random() * Math.PI * 2;
                        const dist = Math.random() * 0.08 + 0.05;
                        const height = Math.random() * 0.15 + 0.05;
                        const finalPos = new THREE.Vector3(Math.cos(angle)*dist, height, Math.sin(angle)*dist);
                        steamSprite.position.copy(finalPos);
                        
                        steamSprite.userData = {
                            basePos: finalPos.clone(),
                            speed: 0.1 + Math.random() * 0.15,
                            age: Math.random() * 10
                        };
                        steamGroup.add(steamSprite);
                    }
                    steamGroup.userData.isSteamGroup = true;
                    towerMesh.add(steamGroup);

                    towerMesh.userData = {
                        type: 'staking_tower',
                        name: "D3X STAKING TOWER",
                        protocol: protocolName || 'D3X CORE NETWORK'
                    };
                    
                    window.datacentersGroup.add(towerMesh);
                });

                // MOVED TESLA TOWERS HALFWAY TO STAKING TOWER
                const npLat = (90 + centerLat) / 2; // Midpoint latitude
                const npLon = (0 + centerLon) / 2; // Midpoint longitude
                
                towerOffsets.forEach((off, idx) => {
                    const towerLatRad = (npLat + (off.lat * 0.5)) * Math.PI / 180; // Tighter cluster
                    const towerLonRad = -(npLon + off.lon) * Math.PI / 180;
                    const towerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.245, 32);
                    towerGeo.translate(0, 0.1225, 0);
                    const towerMat = new THREE.MeshPhongMaterial({ color: 0x00aaff, shininess: 100, specular: 0xffffff });
                    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
                    
                    const lowerAmt = 0.0245;
                    const rLowered = r - lowerAmt;
                    
                    towerMesh.position.set(
                        rLowered * Math.cos(towerLatRad) * Math.cos(towerLonRad),
                        rLowered * Math.sin(towerLatRad),
                        rLowered * Math.cos(towerLatRad) * Math.sin(towerLonRad)
                    );
                    towerMesh.lookAt(new THREE.Vector3(0,0,0));
                    towerMesh.rotateX(-Math.PI/2);
                    
                    // Electric Aura (Tesla Coil effect) Doubled intensity
                    const tAuraGeo = new THREE.SphereGeometry(0.06, 32, 32); // Reduced from 0.12 to 0.06
                    const tAuraMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                    const tAura = new THREE.Mesh(tAuraGeo, tAuraMat);
                    tAura.position.set(0, 0.1225, 0);
                    towerMesh.add(tAura);
                    
                    const tLight = new THREE.PointLight(0x00aaff, 2, 4); // Reduced from 4, 6
                    tLight.position.set(0, 0.1225, 0);
                    towerMesh.add(tLight);

                    towerMesh.userData = {
                        type: 'staking_tower',
                        name: "NORTH POLE STAKING TOWER",
                        protocol: 'D3X TESLA NETWORK',
                        isNorthPole: true,
                        aura: tAura,
                        light: tLight
                    };
                    
                    window.datacentersGroup.add(towerMesh);
                });
                
                // Elaborate Electricity Bridges for North Pole
                window.npLightningGroup = new THREE.Group();
                scene.add(window.npLightningGroup);
                const bridgeMat = new THREE.LineBasicMaterial({ color: 0x00eaff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
                
                // Neon Light Blue glow texture for the strings
                const cAura = document.createElement('canvas');
                cAura.width = 64; cAura.height = 64;
                const ctxAura = cAura.getContext('2d');
                const gradAura = ctxAura.createRadialGradient(32, 32, 0, 32, 32, 32);
                gradAura.addColorStop(0, 'rgba(150, 255, 255, 1.0)'); // Bright white-blue core
                gradAura.addColorStop(0.3, 'rgba(0, 150, 255, 0.8)'); // Neon light blue glow
                gradAura.addColorStop(1, 'rgba(0, 150, 255, 0)');     // Transparent edge
                ctxAura.fillStyle = gradAura;
                ctxAura.fillRect(0, 0, 64, 64);
                const neonAuraTex = new THREE.CanvasTexture(cAura);
                const neonAuraMat = new THREE.SpriteMaterial({ map: neonAuraTex, color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
                
                const numBridges = 3;
                const braidsPerBridge = 3;
                const segments = 30;
                
                for(let b=0; b<numBridges; b++) {
                    const bridgeGroup = new THREE.Group();
                    bridgeGroup.userData = { targetNode: null, timer: 0, poleIdx: b%3 };
                    for (let i=0; i<braidsPerBridge; i++) {
                        const geo = new THREE.BufferGeometry();
                        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments+1) * 3), 3));
                        const line = new THREE.Line(geo, bridgeMat);
                        // Increased randomness of freq1 and freq2 by 20%
                        line.userData = { 
                            braidIdx: i, 
                            phaseOff: Math.random() * Math.PI * 2, 
                            freq1: (2+Math.random()*3)*1.2, 
                            freq2: (4+Math.random()*5)*1.2, 
                            radius: 0.03 + Math.random()*0.02,
                            auras: []
                        };
                        
                        // Attach glowing aura sprites mapped along the interpolation points
                        for(let k=0; k<=15; k++) {
                            const sprite = new THREE.Sprite(neonAuraMat);
                            sprite.scale.set(0.12, 0.12, 1);
                            line.add(sprite);
                            line.userData.auras.push(sprite);
                        }
                        
                        bridgeGroup.add(line);
                    }
                    window.npLightningGroup.add(bridgeGroup);
                }
            }
        });
    }

initDatacenters();

window.worldBankGroup = new THREE.Group();
window.worldBankGroup.visible = false;
scene.add(window.worldBankGroup);

function initWorldBank() {
  const textureLoader = new THREE.TextureLoader();
  const cyberTex = textureLoader.load('/scifi_solid_metal.png');
  cyberTex.wrapS = THREE.RepeatWrapping;
  cyberTex.wrapT = THREE.RepeatWrapping;
  cyberTex.repeat.set(4, 4);

  const bankColor = 0xffffff; 
  const mat = new THREE.MeshStandardMaterial({ color: bankColor, roughness: 0.6, metalness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.8, metalness: 0.2 });

  const building = new THREE.Group();

  // 1. Base (Steps)
  const baseGeo = new THREE.BoxGeometry(0.18, 0.02, 0.12);
  const base = new THREE.Mesh(baseGeo, mat);
  base.position.y = 0.01;
  building.add(base);
  
  const base2Geo = new THREE.BoxGeometry(0.16, 0.02, 0.1);
  const base2 = new THREE.Mesh(base2Geo, mat);
  base2.position.y = 0.03;
  building.add(base2);

  // 2. Columns
  for(let x=-0.06; x<=0.06; x+=0.04) {
    for(let z=-0.035; z<=0.035; z+=0.07) {
      const colGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.08, 16);
      const col = new THREE.Mesh(colGeo, mat);
      col.position.set(x, 0.08, z);
      building.add(col);
    }
  }

  // 3. Top Platform
  const topGeo = new THREE.BoxGeometry(0.16, 0.02, 0.1);
  const top = new THREE.Mesh(topGeo, mat);
  top.position.y = 0.13;
  building.add(top);

  // 4. Triangular Roof (Bank front)
  const roofGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.17, 3);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI / 2; 
  roof.position.y = 0.17;
  building.add(roof);
  
  const light = new THREE.PointLight(0xffdf80, 5, 3);
  light.position.set(0, 0.08, 0);
  building.add(light);
  
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 70px "Orbitron", sans-serif';
  ctx.fillStyle = '#ffdf80';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffdf80';
  ctx.shadowBlur = 10;
  ctx.fillText('WORLD BANK', 256, 64);
  
  const labelTex = new THREE.CanvasTexture(c);
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.scale.set(0.27, 0.0675, 0.9); // reduced by 10% from 0.3, 0.075, 1
  labelSprite.position.set(0, 0.28, 0);
  building.add(labelSprite);

  building.scale.set(1.5, 1.5, 1.5);

  // Position at central Asia where the red X was drawn
  const lat = 35;
  const lon = 90;
  const r = typeof GLOBE_R !== 'undefined' ? GLOBE_R + 0.005 : 1.005;
  const latRad = lat * Math.PI / 180;
  const lonRad = -lon * Math.PI / 180;
  
  building.position.set(
      r * Math.cos(latRad) * Math.cos(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.sin(lonRad)
  );
  
  building.lookAt(new THREE.Vector3(0,0,0));
  building.rotateX(-Math.PI/2); 
  
  window.worldBankGroup.add(building);
  
  // Clone the bank and place it randomly for Cyber Skin
  const buildingClone = building.clone();
  const rLat = (Math.random() - 0.5) * 140; // Random latitude between -70 and 70
  const rLon = (Math.random() - 0.5) * 360; // Random longitude between -180 and 180
  const rLatRad = rLat * Math.PI / 180;
  const rLonRad = -rLon * Math.PI / 180;
  
  buildingClone.position.set(
      r * Math.cos(rLatRad) * Math.cos(rLonRad),
      r * Math.sin(rLatRad),
      r * Math.cos(rLatRad) * Math.sin(rLonRad)
  );
  
  buildingClone.lookAt(new THREE.Vector3(0,0,0));
  buildingClone.rotateX(-Math.PI/2); 
  
  // Transform clone into Treasury (replace label)
  const cloneLabel = buildingClone.children.find(c => c.type === 'Sprite');
  if (cloneLabel) {
      const tc = document.createElement('canvas');
      tc.width = 512; tc.height = 128;
      const tctx = tc.getContext('2d');
      tctx.font = 'bold 70px "Orbitron", sans-serif';
      tctx.fillStyle = '#00ffaa'; // Treasury neon cyan
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';
      tctx.shadowColor = '#00ffaa';
      tctx.shadowBlur = 10;
      tctx.fillText('TREASURY', 256, 64);
      cloneLabel.material.map = new THREE.CanvasTexture(tc);
      cloneLabel.material.needsUpdate = true;
  }
  
  // Change Treasury lights to Cyan to differentiate
  const cloneLight = buildingClone.children.find(c => c.type === 'PointLight');
  if (cloneLight) { cloneLight.color.setHex(0x00ffaa); }
  
  window.treasuryGroup = new THREE.Group();
  window.treasuryGroup.visible = false;
  scene.add(window.treasuryGroup);
  window.treasuryGroup.add(buildingClone);
  
  console.log("World Bank & Treasury Initialized.");
}
initWorldBank();

function initDexmondHub() {
  const building = new THREE.Group();

  // Create the 2D 'D' Shape
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.15); // Bottom Left tail
  shape.lineTo(0, 0.15);  // Top Left tail
  shape.lineTo(0.1, 0.15); // Top straight start of curve
  // Outer bezier curve forming the rounded front of the D
  shape.quadraticCurveTo(0.25, 0.15, 0.25, 0); 
  shape.quadraticCurveTo(0.25, -0.15, 0.1, -0.15);
  shape.lineTo(0, -0.15); // Connect back to bottom left

  // Hollow out the center of the 'D'
  const hole = new THREE.Path();
  hole.moveTo(0.06, -0.05);
  hole.lineTo(0.06, 0.05);
  hole.lineTo(0.1, 0.05);
  hole.quadraticCurveTo(0.15, 0.05, 0.15, 0);
  hole.quadraticCurveTo(0.15, -0.05, 0.1, -0.05);
  hole.lineTo(0.06, -0.05);
  shape.holes.push(hole);

  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 0.01,
    bevelThickness: 0.01
  };
  const dGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Center the geometry bounds
  dGeometry.computeBoundingBox();
  const box = dGeometry.boundingBox;
  const xOffset = -0.5 * (box.max.x - box.min.x);
  const yOffset = -0.5 * (box.max.y - box.min.y);
  const zOffset = -0.5 * (box.max.z - box.min.z);
  dGeometry.translate(xOffset, yOffset, zOffset);

  // Apply the DEXMOND.png texture wrapper
  const texLoader = new THREE.TextureLoader();
  const dMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
  
  texLoader.load('DEXMOND.png', function(tex) {
      // Repeat the logo across the geometry organically
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 5); 
      dMat.map = tex;
      dMat.needsUpdate = true;
  });

  const dMesh = new THREE.Mesh(dGeometry, dMat);
  building.add(dMesh);

  // Add an interior blue glow core
  const glowLight = new THREE.PointLight(0x00aaff, 5, 1);
  building.add(glowLight);

  building.scale.set(1.5, 1.5, 1.5);

  // Position precisely at the user's Micronesia screenshot target
  const lat = 5;
  const lon = 150;
  const r = typeof GLOBE_R !== 'undefined' ? GLOBE_R + 0.005 : 1.005;
  const latRad = lat * Math.PI / 180;
  const lonRad = -lon * Math.PI / 180;
  
  building.position.set(
      r * Math.cos(latRad) * Math.cos(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.sin(lonRad)
  );
  
  building.lookAt(new THREE.Vector3(0,0,0));
  building.rotateX(Math.PI / 2); // Stand it upright
  building.rotateY(Math.PI / 2); // Face it outward

  window.dexmondHubGroup = building;
  // Initially hidden, only shown on CyberSkin (index 4)
  window.dexmondHubGroup.visible = false;
  
  // Add the building directly to the global scene so its visibility can be easily toggled
  scene.add(window.dexmondHubGroup);
  console.log("3D Extruded Dexmond Hub Initialized at Micronesia.");
}
initDexmondHub();

window.dcNetworkGroup = new THREE.Group();
window.dcNetworkGroup.visible = false;
scene.add(window.dcNetworkGroup);
window.dcPulses = [];

function initDatacenterNetwork() {
    const nodes = window.datacentersGroup.children;
    if (!nodes || nodes.length < 2) return;
    
    // Bright yellow connection lines — AdditiveBlending ensures yellow wins over the blue globe glow
    const material = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9, linewidth: 3, blending: THREE.AdditiveBlending, depthWrite: false });
    
    // Create a blurred yellow dot texture for the pulse
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128; // Larger canvas to prevent clipping
    const ctx = c.getContext('2d');
    const radGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // Bright white core
    radGrad.addColorStop(0.2, 'rgba(255, 255, 0, 0.9)'); // Strong yellow glow
    radGrad.addColorStop(1, 'rgba(255, 255, 0, 0)');     // Transparent edge
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 128);
    
    const pulseTex = new THREE.CanvasTexture(c);
    // Use NormalBlending to ensure the exact yellow gradient renders even on bright backgrounds
    const pulseMat = new THREE.SpriteMaterial({ map: pulseTex, color: 0xffff00, transparent: true, opacity: 1.0, blending: THREE.NormalBlending, depthWrite: false });
    
    nodes.forEach((node, i) => {
        const numConnections = Math.floor(Math.random() * 3) + 1; // 1 to 3 connections
        for (let j = 0; j < numConnections; j++) {
            const targetIdx = Math.floor(Math.random() * nodes.length);
            if (targetIdx === i) continue;
            
            const targetNode = nodes[targetIdx];
            
            const p1 = node.position;
            const p2 = targetNode.position;
            
            const dist = p1.distanceTo(p2);
            if (dist > 1.8) continue; // Don't connect opposite sides of the earth
            
            // Raise the line slightly depending on distance
            const midPoint = p1.clone().lerp(p2, 0.5).normalize().multiplyScalar(GLOBE_R + dist * 0.15);
            const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
            
            const points = curve.getPoints(20);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            window.dcNetworkGroup.add(line);
            
            const pulse = new THREE.Sprite(pulseMat);
            pulse.scale.set(0.02, 0.02, 1); // Reduced scale by half per user request
            window.dcNetworkGroup.add(pulse);
            
            window.dcPulses.push({
                mesh: pulse,
                curve: curve,
                progress: Math.random(),
                speed: 0.1 + Math.random() * 0.2
            });
        }
    });
}
initDatacenterNetwork();



// --- CYBER WARFARE STATE ---
window.cyberWarfareInterval = null;
window.activeAttacks = {}; // Track which meshes are under attack { uuid: { mesh, startTime, type } }

// --- CYBER WARFARE CO-OP STATE ---
window.coopPwrBudget = 100;
window.coopPUE = 1.15;
window.coopCoolAlloc = 50;
window.coopCompAlloc = 50;
window.coopGeminiSync = false;
window.selectedDatacenter = null;

function toggleGeminiSync() {
  window.coopGeminiSync = !window.coopGeminiSync;
  const btn = document.getElementById('btn-gemini-sync');
  if (window.coopGeminiSync) {
    btn.style.background = 'rgba(0,255,136,0.8)';
    btn.style.borderColor = '#0f8';
    btn.innerText = 'SYNC ACTIVE (GEMINI CONTROLS POWER)';
    btn.style.color = '#000';
  } else {
    btn.style.background = 'linear-gradient(135deg,rgba(0,100,200,0.5),rgba(0,220,255,0.5))';
    btn.style.borderColor = '#00dcff';
    btn.innerText = 'SYNC WITH GEMINI (AUTO)';
    btn.style.color = '#fff';
  }
}
// ---------------------------------
// ---------------------------

window.globalTradeGroup = new THREE.Group();
window.globalTradeGroup.visible = false;
scene.add(window.globalTradeGroup);

// --- GEMINI ALLY CURSOR ---
window.geminiAllyCursor = new THREE.Mesh(
    new THREE.TorusGeometry(0.012, 0.002, 16, 64),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent:true, opacity:0.8 })
);
window.geminiAllyCursor.visible = false;
scene.add(window.geminiAllyCursor);
window.activeGeminiPing = null;
// --------------------------

window.activeTrades = [];

function initGlobalTradeNetwork() {
  const R = typeof GLOBE_R !== 'undefined' ? GLOBE_R : 1;
  
  const createTradeRoute = (lat1, lon1, lat2, lon2, type) => {
    // ll2v helper uses degrees
    const phi1 = (90 - lat1) * (Math.PI / 180);
    const theta1 = (lon1 + 180) * (Math.PI / 180);
    const p1 = new THREE.Vector3(
      -(R * Math.sin(phi1) * Math.cos(theta1)),
      R * Math.cos(phi1),
      R * Math.sin(phi1) * Math.sin(theta1)
    );
    
    const phi2 = (90 - lat2) * (Math.PI / 180);
    const theta2 = (lon2 + 180) * (Math.PI / 180);
    const p2 = new THREE.Vector3(
      -(R * Math.sin(phi2) * Math.cos(theta2)),
      R * Math.cos(phi2),
      R * Math.sin(phi2) * Math.sin(theta2)
    );
    
    // Midpoint elevated
    const mid = p1.clone().lerp(p2, 0.5);
    const dist = p1.distanceTo(p2);
    
    let elevation = 0;
    let color = 0xffffff;
    let speed = 0;
    let meshGroup = new THREE.Group();
    if (type === 'plane') {
      elevation = dist * 0.2 + 0.1; // Arch high
      speed = 0.0004 + Math.random() * 0.0003;
    } else if (type === 'ship') {
      elevation = 0.01; // Surface skim
      speed = 0.0001 + Math.random() * 0.00008;
    } else if (type === 'train') {
      elevation = 0.005; // Tight to ground
      speed = 0.0002 + Math.random() * 0.0001;
    }
    
    const isRainclaude = Math.random() < 0.20;
    color = isRainclaude ? 0xff0000 : 0x00ffff; // 20% red for Rainclaude AI, 80% Cyan
    
    // Diamond/Arrow mesh matching reference picture
    const arrowGeo = new THREE.ConeGeometry(0.012, 0.035, 4);
    arrowGeo.rotateX(-Math.PI/2); // Point forward along travel path (-Z is forward for lookAt)
    const arrowMat = new THREE.MeshBasicMaterial({color: color, depthTest: false, transparent: true, opacity: 0.9});
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    meshGroup.add(arrowMesh);

    mid.normalize().multiplyScalar(R + elevation);
    
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    
    // Draw the faint route line
    const points = curve.getPoints(40);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: color, // Use matching color for trailing faint path
      transparent: true, 
      opacity: 0.25, 
      blending: THREE.AdditiveBlending 
    });
    const curveLine = new THREE.Line(lineGeo, lineMat);
    
    window.globalTradeGroup.add(curveLine);
    window.globalTradeGroup.add(meshGroup);
    
    window.activeTrades.push({
      curve: curve,
      mesh: meshGroup,
      t: Math.random(), // Staggered starts
      speed: speed
    });
  };

  const routes = [
    // PLANES (Aviation Trade)
    {from: [40.7, -74.0], to: [51.5, -0.1], type: 'plane'}, // NY -> London
    {from: [39.9, 116.4], to: [37.7, -122.4], type: 'plane'}, // Beijing -> SF
    {from: [25.2, 55.2], to: [51.5, -0.1], type: 'plane'}, // Dubai -> London
    {from: [35.6, 139.6], to: [-33.8, 151.2], type: 'plane'}, // Tokyo -> Sydney
    {from: [1.3, 103.8], to: [22.3, 114.1], type: 'plane'}, // Singapore -> HK
    {from: [48.8, 2.3], to: [-23.5, -46.6], type: 'plane'}, // Paris -> Sao Paulo
    {from: [34.0, -118.2], to: [35.6, 139.6], type: 'plane'}, // LA -> Tokyo
    {from: [55.7, 37.6], to: [25.2, 55.2], type: 'plane'}, // Moscow -> Dubai
    {from: [-33.9, 18.4], to: [51.5, -0.1], type: 'plane'}, // Cape Town -> London
    {from: [19.4, -99.1], to: [40.4, -3.7], type: 'plane'}, // Mexico City -> Madrid
    {from: [28.6, 77.2], to: [52.5, 13.4], type: 'plane'}, // Delhi -> Berlin
    {from: [30.0, 31.2], to: [48.8, 2.3], type: 'plane'}, // Cairo -> Paris
    
    // SHIPS (Maritime Cargo)
    {from: [31.2, 121.4], to: [34.0, -118.2], type: 'ship'}, // Shanghai -> LA
    {from: [22.5, 114.0], to: [51.9, 4.4], type: 'ship'}, // Shenzhen -> Rotterdam
    {from: [1.2, 103.8], to: [23.8, 56.6], type: 'ship'}, // Singapore -> Oman Gulf
    {from: [29.9, -90.0], to: [53.5, 9.9], type: 'ship'}, // New Orleans -> Hamburg
    {from: [-23.9, -46.3], to: [31.2, 121.4], type: 'ship'}, // Santos BR -> Shanghai
    {from: [-33.9, 18.4], to: [24.8, 66.9], type: 'ship'}, // Cape Town -> Karachi
    {from: [38.9, 117.2], to: [54.0, -2.9], type: 'ship'}, // Tianjin -> Liverpool
    {from: [31.2, 29.9], to: [40.7, -74.0], type: 'ship'}, // Alex -> NY
    {from: [1.3, 103.8], to: [-33.8, 151.2], type: 'ship'}, // Singapore -> Sydney
    {from: [19.0, 72.8], to: [-26.2, 32.6], type: 'ship'}, // Mumbai -> Maputo
    {from: [35.4, 139.6], to: [37.8, -122.4], type: 'ship'}, // Yokohama -> SF
    {from: [8.9, -79.5], to: [51.9, 4.4], type: 'ship'}, // Panama -> Rotterdam
    
    // TRAINS/TYRES (Overland Supply Chains)
    {from: [39.9, 116.4], to: [52.5, 13.4], type: 'train'}, // Beijing -> Berlin (Eurasian Belt)
    {from: [41.8, -87.6], to: [34.0, -118.2], type: 'train'}, // Chicago -> LA (Continental US)
    {from: [40.7, -74.0], to: [29.7, -95.3], type: 'train'}, // NY -> Houston
    {from: [55.7, 37.6], to: [43.1, 131.9], type: 'train'}, // Moscow -> Vladivostok (Trans-Siberian)
    {from: [28.6, 77.2], to: [19.0, 72.8], type: 'train'}, // Delhi -> Mumbai (Indian Rail)
    {from: [-34.6, -58.3], to: [-23.5, -46.6], type: 'train'}, // Buenos Aires -> Sao Paulo
    {from: [-26.2, 28.0], to: [-33.9, 18.4], type: 'train'}, // Johannesburg -> Cape Town
    {from: [48.8, 2.3], to: [55.7, 37.6], type: 'train'}, // Paris -> Moscow
    {from: [51.5, -0.1], to: [41.9, 12.5], type: 'train'}, // London -> Rome
    {from: [43.7, -79.4], to: [49.3, -123.1], type: 'train'}, // Toronto -> Vancouver
    {from: [-37.8, 144.9], to: [-31.9, 115.8], type: 'train'}, // Melbourne -> Perth
    {from: [35.7, 51.4], to: [41.0, 29.0], type: 'train'} // Tehran -> Istanbul
  ];

  // Multiply exact routes array volume by 6x parametrically using coordinate drift
  const baseRoutesLength = routes.length;
  for(let j=0; j < 160; j++) {
     const baseRt = routes[Math.floor(Math.random() * baseRoutesLength)];
     // Add random offsets to create new parallel / divergent routes
     const fromLat = Math.max(-80, Math.min(80, baseRt.from[0] + (Math.random() * 50 - 25)));
     const fromLon = baseRt.from[1] + (Math.random() * 50 - 25);
     const toLat = Math.max(-80, Math.min(80, baseRt.to[0] + (Math.random() * 50 - 25)));
     const toLon = baseRt.to[1] + (Math.random() * 50 - 25);
     routes.push({from: [fromLat, fromLon], to: [toLat, toLon], type: baseRt.type});
  }

  routes.forEach(rt => {
    // Inject 8 vehicles traversing each global route (we added 160 routes, 8x bidirectional = massive density)
    for(let i=0; i<8; i++) {
       createTradeRoute(rt.from[0], rt.from[1], rt.to[0], rt.to[1], rt.type);
       createTradeRoute(rt.to[0], rt.to[1], rt.from[0], rt.from[1], rt.type);
    }
  });

  console.log("Global Trade Network Initialized (" + window.activeTrades.length + " discrete assets tracked).");
}
initGlobalTradeNetwork();

// Stars
const sg = new THREE.BufferGeometry();
const sp = [];
for(let i=0;i<4000;i++){
  const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1), r=7+Math.random()*4;
  sp.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
}
sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.018,transparent:true,opacity:.7})));

// Globe
// 30% increased density for Cyber Skin
const globeGeo = new THREE.SphereGeometry(GLOBE_R, 250, 250);
const texLoader = new THREE.TextureLoader();
const earthTex  = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/land_ocean_ice_cloud_2048.jpg');

// Set up clipping planes to cut out a front-right quarter
const clipPlanes = [
  new THREE.Plane(new THREE.Vector3(1,  0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  new THREE.Plane(new THREE.Vector3(0,  0, 1), 0)
];

const globeMat  = new THREE.MeshPhongMaterial({
  map:earthTex,
  specular:new THREE.Color(0x003355),
  shininess:15,
  side: THREE.FrontSide,
  clipIntersection: true,
  clippingPlanes: [] // active only on FIRE skin
});

// Update globeMat color for WTR skin
if (window.currentSkinIndex === 6) {
  globeMat.color = new THREE.Color(0x00aaff); // Neon cyan for WTR
  globeMat.specular = new THREE.Color(0x00ffff);
  globeMat.shininess = 50;
}

const globeMesh = new THREE.Mesh(globeGeo, globeMat);
window.globeMesh = globeMesh;
scene.add(globeMesh);

renderer.localClippingEnabled = true;

// Inner core layers for FIRE cutaway
window.earthCutawayGroup = new THREE.Group();
window.earthCutawayGroup.visible = false;
scene.add(window.earthCutawayGroup);

function createCutawayLayer(radius, color, specular, shininess) {
  const geo = new THREE.SphereGeometry(radius, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    color: color, 
    specular: specular, 
    shininess: shininess,
    side: THREE.FrontSide,
    clipIntersection: true,
    clippingPlanes: clipPlanes
  });
  return new THREE.Mesh(geo, mat);
}

// Mantle (Red/Orange)
const mantleMesh = createCutawayLayer(GLOBE_R * 0.98, 0xff2200, 0x551100, 10);
// Outer Core (Orange/Yellow)
const outerCoreMesh = createCutawayLayer(GLOBE_R * 0.55, 0xff8800, 0xaa5500, 30);
// Inner Core (Bright Yellow/White)
const innerCoreMesh = createCutawayLayer(GLOBE_R * 0.2, 0xffffaa, 0xffffff, 100);

window.earthCutawayGroup.add(mantleMesh);
window.earthCutawayGroup.add(outerCoreMesh);
window.earthCutawayGroup.add(innerCoreMesh);

// =====================================================================
// LIVE WEBCAMS (RED SKIN)
// =====================================================================
window.webcamGroup = new THREE.Group();
window.webcamGroup.visible = false;
scene.add(window.webcamGroup);

// Create a glowing yellow dot texture for the webcams
const camCanvas = document.createElement('canvas');
camCanvas.width = 128; camCanvas.height = 128;
const camCtx = camCanvas.getContext('2d');
const camGrad = camCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
camGrad.addColorStop(0, 'rgba(255, 255, 0, 1)'); 
camGrad.addColorStop(0.3, 'rgba(255, 200, 0, 0.8)'); 
camGrad.addColorStop(1, 'rgba(255, 200, 0, 0)');
camCtx.fillStyle = camGrad;
camCtx.fillRect(0, 0, 128, 128);
const camTex = new THREE.CanvasTexture(camCanvas);
const camMat = new THREE.SpriteMaterial({ map: camTex, transparent: true, blending: THREE.AdditiveBlending });

// Generate 50 random live webcam locations
for (let i = 0; i < 50; i++) {
    const lat = (Math.random() - 0.5) * 160; // -80 to 80 to avoid strict poles
    const lon = (Math.random() - 0.5) * 360; // -180 to 180
    
    // Use the existing ll2v function definition which we will hoist or call later if already defined
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = GLOBE_R + 0.05; // Slightly above globe surface
    
    const pos = new THREE.Vector3(
        -(r * Math.sin(phi) * Math.cos(theta)),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
    
    const camSprite = new THREE.Sprite(camMat);
    camSprite.scale.set(0.15, 0.15, 1); // Big yellow dots
    camSprite.position.copy(pos);
    window.webcamGroup.add(camSprite);
}

// =====================================================================
// INTERNATIONAL SPACE STATION (ISS)
// =====================================================================
const issOrbitGroup = new THREE.Group(); // Parent group to rotate around Earth center
const issGroup = new THREE.Group();      // The actual station mesh group

// --- REALISTIC ISS COMPOSITE BUILD ---
// Materials
const trussMat = new THREE.MeshPhongMaterial({color: 0x999999, wireframe: true}); // Fake structural look
const moduleMat = new THREE.MeshPhongMaterial({color: 0xe0e0e0, specular: 0xffffff, shininess: 30});
const moduleDetailMat = new THREE.MeshPhongMaterial({color: 0xb0b0b0, specular: 0xffffff, shininess: 10});
const panelMat = new THREE.MeshPhongMaterial({color: 0x1a4b8c, specular: 0x5599ff, shininess: 100, side: THREE.DoubleSide});
const radiatorMat = new THREE.MeshPhongMaterial({color: 0xffffff, specular: 0xaaaaaa, shininess: 10, side: THREE.DoubleSide});
const goldMat = new THREE.MeshPhongMaterial({color: 0xffaa00, specular: 0xffffff, shininess: 90});

// 1. Integrated Truss Structure (The long spine)
const mainTruss = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.02), trussMat);
issGroup.add(mainTruss);

// 2. Central Modules (Zarya, Zvezda, Unity, Destiny, etc. stacked along Z axis)
const habCore = new THREE.Group();

// Russian Segment (rear)
const zvezda = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 16), moduleMat);
zvezda.rotation.x = Math.PI / 2;
zvezda.position.z = -0.15;
habCore.add(zvezda);

const zarya = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 16), moduleMat);
zarya.rotation.x = Math.PI / 2;
zarya.position.z = -0.04;
habCore.add(zarya);

// US Segment (front)
const unityNode = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 16), moduleDetailMat);
unityNode.rotation.x = Math.PI / 2;
unityNode.position.z = 0.05;
habCore.add(unityNode);

const destinyLab = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 16), moduleMat);
destinyLab.rotation.x = Math.PI / 2;
destinyLab.position.z = 0.14;
habCore.add(destinyLab);

const harmonyNode = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.08, 16), moduleDetailMat);
harmonyNode.rotation.x = Math.PI / 2;
harmonyNode.position.z = 0.24;
habCore.add(harmonyNode);

// Columbus (Side attached to Node 2)
const columbus = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 16), moduleMat);
columbus.rotation.z = Math.PI / 2;
columbus.position.set(0.05, 0, 0.24);
habCore.add(columbus);

// Kibo (Side attached to Node 2)
const kibo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 16), moduleMat);
kibo.rotation.z = Math.PI / 2;
kibo.position.set(-0.07, 0, 0.24);
habCore.add(kibo);

// 3. Docked Vehicles (Soyuz/Dragon capsules)
const dragon = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.04, 16), moduleMat);
dragon.rotation.x = Math.PI / 2;
dragon.position.set(0, 0.04, 0.24); // Docked to zenith harmony
habCore.add(dragon);

const soyuz = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 16), moduleDetailMat);
soyuz.rotation.x = Math.PI / 2;
soyuz.position.set(0, -0.04, -0.15); // Docked to nadir zvezda
habCore.add(soyuz);

issGroup.add(habCore);

// 4. Solar Arrays (8 pairs total, simplified as 4 large dual-plane structures)
const createSolarWing = (xPos) => {
    const wing = new THREE.Group();
    const panelGeo = new THREE.PlaneGeometry(0.08, 0.25);
    // Forward panel
    const p1 = new THREE.Mesh(panelGeo, panelMat);
    p1.rotation.x = Math.PI / 2;
    p1.position.set(0, 0, 0.06);
    wing.add(p1);
    // Aft panel
    const p2 = new THREE.Mesh(panelGeo, panelMat);
    p2.rotation.x = Math.PI / 2;
    p2.position.set(0, 0, -0.06);
    wing.add(p2);
    
    // Gold supporting mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4), goldMat);
    mast.rotation.x = Math.PI / 2;
    wing.add(mast);

    wing.position.x = xPos;
    return wing;
};

// Add wings to the truss (far port, inner port, inner stbd, far stbd)
issGroup.add(createSolarWing(-0.35));
issGroup.add(createSolarWing(-0.22));
issGroup.add(createSolarWing(0.22));
issGroup.add(createSolarWing(0.35));

// 5. Radiator Panels (Thermal dissipation)
const createRadiator = (xPos, zOrient) => {
    const rad = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.15), radiatorMat);
    rad.rotation.y = Math.PI / 2;
    rad.position.set(xPos, -0.08, zOrient);
    return rad;
};

// Central radiating systems dropping down
issGroup.add(createRadiator(-0.05, 0.05));
issGroup.add(createRadiator(0.05, 0.05));
issGroup.add(createRadiator(-0.05, -0.05));
issGroup.add(createRadiator(0.05, -0.05));

// 6. "LIVE FEED!" UI Label Sprite attached directly to the ISS
const issLabelCanvas = document.createElement('canvas');
issLabelCanvas.width = 512;
issLabelCanvas.height = 128;
const issCtx = issLabelCanvas.getContext('2d');
issCtx.fillStyle = '#ff2222';
issCtx.shadowColor = '#ff0000';
issCtx.shadowBlur = 15;
issCtx.font = "bold 60px 'Share Tech Mono', monospace";
issCtx.textAlign = "center";
issCtx.textBaseline = "middle";
issCtx.fillText("🔴 LIVE FEED!", 256, 64);

const issLabelTex = new THREE.CanvasTexture(issLabelCanvas);
const issLabelMat = new THREE.SpriteMaterial({ map: issLabelTex, color: 0xffffff, transparent: true });
const issLabelSprite = new THREE.Sprite(issLabelMat);
// Scale appropriately relative to the ISS group
issLabelSprite.scale.set(0.6, 0.15, 1);
// Position it hovering slightly above the station
issLabelSprite.position.set(0, 0.35, 0);
issGroup.add(issLabelSprite);

// Position the ISS in low earth orbit (shifted further out and scaled smaller)
issGroup.scale.setScalar(0.25);
issGroup.position.set(GLOBE_R + 0.84, 0, 0);
issOrbitGroup.add(issGroup);

// Initial inclination (tilt the orbit so it's not perfectly on the equator)
issOrbitGroup.rotation.z = Math.PI / 6;
issOrbitGroup.rotation.x = Math.PI / 8;

scene.add(issOrbitGroup);
window.issGroup = issGroup; // Expose globally to bind click interactions
window.issOrbitGroup = issOrbitGroup; // Expose for animation loop


// =====================================================================
// Economy Sprite removed

// Atmosphere
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_R*1.06,32,32),
  new THREE.MeshBasicMaterial({color:0x1155cc,side:THREE.BackSide,transparent:true,opacity:.35})
));

// Grid
const gm = new THREE.LineBasicMaterial({color:0x004488,transparent:true,opacity:.1});
function addLine(pts){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gm));}
for(let la=-80;la<=80;la+=20){const p=[];for(let lo=-180;lo<=180;lo+=3)p.push(ll2v(la,lo,GLOBE_R+.001));addLine(p);}
for(let lo=-180;lo<180;lo+=20){const p=[];for(let la=-90;la<=90;la+=3)p.push(ll2v(la,lo,GLOBE_R+.001));addLine(p);}

// Equator
const ep=[];for(let lo=-180;lo<=180;lo+=2)ep.push(ll2v(0,lo,GLOBE_R+.002));
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ep),
  new THREE.LineBasicMaterial({color:0x00aaff,transparent:true,opacity:.3})));

// Lighting
scene.add(new THREE.AmbientLight(0x334455,1.3));
const sun=new THREE.DirectionalLight(0xffeedd,2.0); sun.position.set(5,2,4); scene.add(sun);
const fill=new THREE.DirectionalLight(0x223366,.4); fill.position.set(-4,-1,-3); scene.add(fill);

// Helpers
function ll2v(lat,lon,r){
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
      -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
  );
}

// =====================================================================
// ORBIT CONTROLS
// =====================================================================
let drag=false, prevM={x:0,y:0};
let sph={theta:.3, phi:1.1, r:3.5};

function updCam(){
  camera.position.set(
    sph.r*Math.sin(sph.phi)*Math.cos(sph.theta),
    sph.r*Math.cos(sph.phi),
    sph.r*Math.sin(sph.phi)*Math.sin(sph.theta)
  );
  camera.lookAt(0,0,0);
}
updCam();

canvas.addEventListener('mousedown',e=>{if(e.button===2){drag=true;prevM={x:e.clientX,y:e.clientY};}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mousemove',e=>{
  if(!drag)return;
  sph.theta-=(prevM.x-e.clientX)*.005;
  sph.phi=Math.max(.1,Math.min(Math.PI-.1,sph.phi+(prevM.y-e.clientY)*.005));
  prevM={x:e.clientX,y:e.clientY}; updCam();
});
window.addEventListener('mouseup',()=>drag=false);
canvas.addEventListener('wheel',e=>{
  sph.r=Math.max(1.4,Math.min(8,sph.r+e.deltaY*.003));
  updCam(); e.preventDefault();
},{passive:false});

// =====================================================================
// GAME STATE
// =====================================================================
let GS = {
  countries: {},     // iso -> {name,lat,lon,owner,troops,nuked,instabilityLevel}
  players: [],       // [{name,color,nukes,alive}]
  turn: 0,           // player index
  turnCount: 1,      // overall turn number
  phase: 'REINFORCE',// REINFORCE|ATTACK|FORTIFY
  reinforceLeft: 0,
  selected: null,    // iso of selected country
  fortifyFrom: null,
  isOnline: false,
  myIndex: 0,
  roomCode: '',
  AI_STATE: {
    techLevel: 1,
    intelligenceLevel: 1,
    aggressionLevel: 1,
    adaptabilityScore: 1,
    energy: 10,
    threatTier: 1
  },
  globalMetrics: {
    powerGrid: 100,
    comms: 100,
    economy: 100,
    airTrafficDisabledTurns: 0,
    satelliteDisruptedTurns: 0,
    commJamTurns: 0,
    globalEconomyD3X: 123000000000000
  }
};

let pendingPerk = null;

let countryBorders = {}; // iso -> THREE.Line
let countryData    = {}; // iso -> {name,lat,lon,polygons:[]}
let ws             = null;

// =====================================================================
// GEOJSON COUNTRY LOADING
// =====================================================================
const GEOJSON_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

async function loadCountries(retries = 3) {
  setLog('⟳ Loading world map data...');
  let res;
  for (let i = 0; i < retries; i++) {
    try {
      res = await fetch(GEOJSON_URL);
      if (res.ok) break;
    } catch (e) {
      if (i === retries - 1) {
        setLog('⚠ failed to load world geometry. Please refresh.');
        return;
      }
      setLog(`⚠ retrying map data (${i+1}/${retries})...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (!res || !res.ok) {
    setLog('⚠ failed to load world geometry.');
    return;
  }
  
  const json = await res.json();

  json.features.forEach(f => {
    const p = f.properties;
    const iso = p.gu_a3 || p.iso_a3 || p.adm0_a3;
    if (!iso || iso === '-99') return;

    // Bounding box center as lat/lon
    let sumLat=0, sumLon=0, cnt=0;
    const polys = [];

    // Helper to apply prime meridian offset and wrap dateline
    const oLon = (lon) => {
      let l = lon;
      if (l < -180) l += 360;
      if (l > 180) l -= 360;
      return l;
    };

    const extractRing = ring => {
      const pts = ring.map(([lon,lat]) => ll2v(lat,oLon(lon),GLOBE_R+.003));
      polys.push(ring.map(([lon,lat])=>({lat,lon:oLon(lon)})));
      
      // Calculate ring centroid using offset longitude, handling dateline wrap naively as before
      let tLon = 0, tLat = 0;
      ring.forEach(([lo, la]) => {
        tLon += oLon(lo);
        tLat += la;
      });
      sumLon += tLon / ring.length;
      sumLat += tLat / ring.length;
      
      cnt++;
      return new THREE.BufferGeometry().setFromPoints(pts);
    };

    const geos = [];
    if (f.geometry.type==='Polygon') {
      f.geometry.coordinates.forEach(r=>geos.push(extractRing(r)));
    } else if (f.geometry.type==='MultiPolygon') {
      f.geometry.coordinates.forEach(poly=>poly.forEach(r=>geos.push(extractRing(r))));
    }

    if (!geos.length) return;

    // Calculate bounding box for the country to sample random points
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    polys.forEach(poly => {
      poly.forEach(pt => {
        if(pt.lat < minLat) minLat = pt.lat;
        if(pt.lat > maxLat) maxLat = pt.lat;
        if(pt.lon < minLon) minLon = pt.lon;
        if(pt.lon > maxLon) maxLon = pt.lon;
      });
    });

    let bestLat = sumLat/cnt;
    let bestLon = sumLon/cnt;

    // 85% chance to force the point onto explicit dry land (inside the polygon)
    // 15% chance to let it naturally fall near the coast/water as per user request
    if (Math.random() < 0.85) {
      for(let iter = 0; iter < 100; iter++) {
        const testLat = minLat + Math.random() * (maxLat - minLat);
        const testLon = minLon + Math.random() * (maxLon - minLon);
        let inside = false;
        for (const poly of polys) {
          if (pointInPoly(testLat, testLon, poly)) { inside = true; break; }
        }
        if (inside) {
          bestLat = testLat;
          bestLon = testLon;
          break;
        }
      }
    }

    // Generate dense dots for visual representation
    const denseDots = [];
    denseDots.push({ lat: bestLat, lon: bestLon });
    const extraDots = Math.min(80, Math.max(8, Math.floor(cnt / 8))); 
    for(let dots = 0; dots < extraDots; dots++) {
      for(let iter = 0; iter < 50; iter++) {
        const testLat = minLat + Math.random() * (maxLat - minLat);
        const testLon = minLon + Math.random() * (maxLon - minLon);
        let inside = false;
        for (const poly of polys) {
          if (pointInPoly(testLat, testLon, poly)) { inside = true; break; }
        }
        if (inside) {
          denseDots.push({ lat: testLat, lon: testLon });
          break;
        }
      }
    }
    // Add coastal padding dots
    for(let dots=0; dots < Math.floor(extraDots * 0.2); dots++) {
      denseDots.push({ 
         lat: minLat + Math.random() * (maxLat - minLat), 
         lon: minLon + Math.random() * (maxLon - minLon) 
      });
    }

    countryData[iso] = { name: p.name||iso, lat: bestLat, lon: bestLon, polys, denseDots };

    if (iso === 'USA') {
      for (let i = 1; i <= 10; i++) {
        countryData[`USA_V${i}`] = {
          name: `US Sector ${i}`,
          lat: 30 + Math.random() * 18,
          lon: -125 + Math.random() * 50,
          polys: []
        };
      }
    }
    if (iso === 'CHN') {
      for (let i = 1; i <= 10; i++) {
        countryData[`CHN_V${i}`] = {
          name: `China Sector ${i}`,
          lat: 22 + Math.random() * 18,
          lon: 80 + Math.random() * 40,
          polys: []
        };
      }
    }

    // Draw border lines
    // Build border lines geometry but do not render them on the globe
    const mat = new THREE.LineBasicMaterial({color:NEUTRAL.int, transparent:true, opacity:.6});
    const group = new THREE.Group();
    geos.forEach(geo => group.add(new THREE.Line(geo, mat.clone())));
    group.userData = { iso, mat };
    group.visible = true; // Show borders per user request
    countryBorders[iso] = group;
    scene.add(group);
  });

  setLog(`✓ ${Object.keys(countryData).length} countries loaded`);
}

// Point-in-polygon test (2D lat/lon)
function pointInPoly(lat, lon, poly) {
  let inside = false;
  for (let i=0,j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i].lon, yi=poly[i].lat, xj=poly[j].lon, yj=poly[j].lat;
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

function getCountryAt(lat, lon) {
  let closest = null;
  let minDist = Infinity;
  for (const [iso, cd] of Object.entries(countryData)) {
    if(!cd.polys) continue;
    for (const poly of cd.polys) {
      if (pointInPoly(lat, lon, poly)) return iso;
    }
    // Fallback for tiny states/islands (Haversine approx distance)
    if(cd.lat !== undefined && cd.lon !== undefined) {
      const dLat=Math.abs(lat-cd.lat)*Math.PI/180;
      const dLon=Math.abs(lon-cd.lon)*Math.PI/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(cd.lat*Math.PI/180) * Math.sin(dLon/2)**2;
      const dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if(dist < minDist) { minDist = dist; closest = iso; }
    }
  }
  // If no polygon hit, return the closest center if it's within ~500 miles (0.15 rads)
  if(closest && minDist < 0.15) return closest;
  return null;
}