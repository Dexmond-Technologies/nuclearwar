
// =====================================================================
// GLOBAL API KEYS & CONFIG
// =====================================================================
const WINDY_API_KEY = 'vEqfjmfqyPguO0tTOX5gKMTXH6sz5dZR'; // Webcams integration planned
const AVIATIONSTACK_API_KEY = 'bbf22d54152c8666dd5a9fbe5a1344cb'; // Flight tracking integration planned

// =====================================================================
// AUDIO ENGINE (Procedural Web Audio)
// =====================================================================
const SFX = {
  ctx: null,
  muted: false,
  _bgOsc: null,
  _bgGain: null,
  init() {
    if (!this.ctx) {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.startAmbientRadio();
    }
  },
  startAmbientRadio() {
    if(!this.ctx || this._bgOsc) return;
    const t = this.ctx.currentTime;
    
    // Low, ominous pulsing drone for "World Radio" ambient feel
    this._bgOsc = this.ctx.createOscillator();
    this._bgGain = this.ctx.createGain();
    
    // Mix two oscillators for a thicker drone
    this._bgOsc.type = 'sine';
    this._bgOsc.frequency.setValueAtTime(45, t); // Low bass drone
    
    // Create slow LFO for pulsing volume
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, t); // 10 second cycle
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.02, t); // pulse depth
    
    // Base volume
    this._bgGain.gain.setValueAtTime(0.04, t); 
    
    // Connect LFO to gain
    lfo.connect(lfoGain);
    lfoGain.connect(this._bgGain.gain);
    
    this._bgOsc.connect(this._bgGain);
    this._bgGain.connect(this.ctx.destination);
    
    this._bgOsc.start(t);
    lfo.start(t);
  },
  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) this.playClick();
    const btnVol = document.getElementById('btn-vol');
    if (btnVol) btnVol.innerText = this.muted ? '🔈' : '🔊';
    if (this.ctx) {
      if (this.muted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
        if(!this._bgOsc) this.startAmbientRadio();
      }
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
  WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? `ws://${window.location.hostname}:8888` 
    : `${WS_PROTOCOL}//${window.location.hostname}:8888`;
}

const PLAYER_COLORS = [
  { hex:'#00dcff', int:0x00dcff, name:'HUMANITY' },
  { hex:'#ff3232', int:0xff3232, name:'RAINCLOUD AI' }
];
const NEUTRAL = { hex:'#445566', int:0x445566, name:'NEUTRAL' };

// =====================================================================
// THREE.JS SCENE
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x02050a,1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);

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
const globeGeo = new THREE.SphereGeometry(GLOBE_R,64,64);
const texLoader = new THREE.TextureLoader();
const earthTex  = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/land_ocean_ice_cloud_2048.jpg');
const globeMat  = new THREE.MeshPhongMaterial({map:earthTex,specular:new THREE.Color(0x003355),shininess:15});
const globeMesh = new THREE.Mesh(globeGeo, globeMat);
window.globeMesh = globeMesh;
// globeMesh.rotation.y = 0; // Default alignment is correct for this texture
scene.add(globeMesh);

// Atmosphere
const atmoMat = new THREE.MeshBasicMaterial({color:0x1155cc,side:THREE.BackSide,transparent:true,opacity:.18});
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R*1.06,32,32), atmoMat);
scene.add(atmosphere);

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

// Skin Toggle Logic
let isHostileSkin = false;
window.toggleGlobeSkin = function() {
  isHostileSkin = !isHostileSkin;
  const btn = document.getElementById('btn-skin-toggle');
  if(isHostileSkin) {
    // Red Glitch aesthetic
    globeMat.color.setHex(0xff3333);
    globeMat.specular.setHex(0x550000);
    atmoMat.color.setHex(0xaa1111);
    btn.innerHTML = '⏏ NORMAL SKIN';
    btn.style.background = '#f24';
    btn.style.color = '#fff';
    sun.color.setHex(0xff8888);
    fill.color.setHex(0x551111);
    
    // Enable Webcams layer on Hostile Skin
    if (intelGroups.webcams) intelGroups.webcams.visible = true;
  } else {
    // Revert to default
    globeMat.color.setHex(0xffffff);
    globeMat.specular.setHex(0x003355);
    atmoMat.color.setHex(0x1155cc);
    btn.innerHTML = '⏏ HOSTILE SKIN';
    btn.style.background = 'transparent';
    btn.style.color = '#f24';
    sun.color.setHex(0xffeedd);
    fill.color.setHex(0x223366);
    
    // Disable Webcams layer on Normal Skin
    if (intelGroups.webcams) intelGroups.webcams.visible = false;
  }
};
document.getElementById('btn-skin-toggle').addEventListener('click', () => {
  if (window._sfxClick) window._sfxClick();
  window.toggleGlobeSkin();
});

// Helpers
function ll2v(lat,lon,r){
  const la=lat*RAD,lo=lon*RAD;
  return new THREE.Vector3(r*Math.cos(la)*Math.cos(lo),r*Math.sin(la),r*Math.cos(la)*Math.sin(lo));
}

// =====================================================================
// NATIVE 3D INTEL LAYERS (Three.js over globe)
// =====================================================================
const intelGroups = {
  bases: new THREE.Group(),
  nuclear: new THREE.Group(),
  conflicts: new THREE.Group(),
  liveFlights: new THREE.Group(),
  webcams: new THREE.Group()
};

intelGroups.bases.visible = false;
intelGroups.nuclear.visible = false;
intelGroups.conflicts.visible = false;
intelGroups.liveFlights.visible = false;
intelGroups.webcams.visible = false; // Only visible on Hostile Skin
window.webcamsData = []; // Array to map raycaster hits to webcam player data

Object.values(intelGroups).forEach(g => scene.add(g));

// --- 1. Military Bases ---
const mockBases = [
  {name:'Ramstein AB', lat:49.43, lon:7.60},
  {name:'Yokosuka', lat:35.28, lon:139.66},
  {name:'Diego Garcia', lat:-7.31, lon:72.41},
  {name:'Pearl Harbor', lat:21.36, lon:-157.95},
  {name:'Guam', lat:13.58, lon:144.92},
  {name:'Incirlik AB', lat:37.00, lon:35.42},
  {name:'Okinawa', lat:26.35, lon:127.76},
  {name:'Rota', lat:36.64, lon:-6.33},
  {name:'Djibouti', lat:11.54, lon:43.14},
  {name:'Tartus (RUS)', lat:34.90, lon:35.87},
  {name:'Severomorsk', lat:69.06, lon:33.41},
  {name:'Yulin (CHN)', lat:18.23, lon:109.68}
];
const baseMaterial = new THREE.PointsMaterial({
  color: 0x00ffff, size: 0.04, transparent: true, opacity: 0.8,
  map: createGlowTexture(0x00ffff), blending: THREE.AdditiveBlending, depthWrite: false
});
const basePts = [];
mockBases.forEach(b => {
  const v = ll2v(b.lat, b.lon, GLOBE_R + 0.005);
  basePts.push(v.x, v.y, v.z);
});
const baseGeo = new THREE.BufferGeometry();
baseGeo.setAttribute('position', new THREE.Float32BufferAttribute(basePts, 3));
intelGroups.bases.add(new THREE.Points(baseGeo, baseMaterial));

// --- 2. Nuclear Sites ---
const mockNukes = [
  {name:'Minot AFB', lat:48.41, lon:-101.35},
  {name:'Malmstrom', lat:47.50, lon:-111.18},
  {name:'Los Alamos', lat:35.84, lon:-106.30},
  {name:'FAS Faslane', lat:56.06, lon:-4.81},
  {name:'Ile Longue', lat:48.30, lon:-4.50},
  {name:'Sarov', lat:54.91, lon:43.32},
  {name:'Dimona', lat:31.00, lon:35.14},
  {name:'Lop Nur', lat:40.16, lon:89.66}
];
const nukeMaterial = new THREE.PointsMaterial({
  color: 0xff3300, size: 0.05, transparent: true, opacity: 0.9,
  map: createGlowTexture(0xffaa00), blending: THREE.AdditiveBlending, depthWrite: false
});
const nukePts = [];
mockNukes.forEach(n => {
  const v = ll2v(n.lat, n.lon, GLOBE_R + 0.006);
  nukePts.push(v.x, v.y, v.z);
});
const nukeGeo = new THREE.BufferGeometry();
nukeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nukePts, 3));
intelGroups.nuclear.add(new THREE.Points(nukeGeo, nukeMaterial));

// --- 3. Conflict Zones ---
const mockConflicts = [
  {name:'Ukraine', lat:48.37, lon:31.16},
  {name:'Gaza', lat:31.50, lon:34.46},
  {name:'Red Sea', lat:15.00, lon:41.00},
  {name:'Sudan', lat:12.86, lon:30.21},
  {name:'Myanmar', lat:21.91, lon:95.95}
];
const conflictMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide
});
const conflictGeo = new THREE.CircleGeometry(0.025, 16);
mockConflicts.forEach(c => {
  const v = ll2v(c.lat, c.lon, GLOBE_R + 0.003);
  const m = new THREE.Mesh(conflictGeo, conflictMaterial);
  m.position.copy(v);
  m.lookAt(new THREE.Vector3(0,0,0));
  intelGroups.conflicts.add(m);
});

// Helper for soft glowing dots
function createGlowTexture(colorHex) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#' + colorHex.toString(16).padStart(6, '0'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,64,64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

  // --- 4. Webcams (Fetched from Proxy) ---
async function initWebcamsLayer() {
  try {
    const res = await fetch("/api/webcams");
    if (!res.ok) return;
    const data = await res.json();
    if (!data.result || !data.result.webcams) return;

    // Fix: make the points MUCH larger so they are visible, and turn off depthTest so they overlay the red globe
    const webcamMat = new THREE.PointsMaterial({
      color: 0xffff00, size: 0.12, transparent: true, opacity: 1.0,
      map: createGlowTexture(0xffff00), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false
    });
    
    const pts = [];
    window.webcamsData = []; // ensure it's clean
    
    data.result.webcams.forEach((cam) => {
      // Validate lat/lon directly on 'cam' instead of 'cam.location'
      if (cam.latitude === undefined || cam.longitude === undefined) return;
      
      // We embed the youtube stream
      let embedSrc = `https://www.youtube.com/embed/${cam.slug}?autoplay=1&mute=1`;
      
      // Fix: Raise the radius slightly more to ensure they float above the sphere geometry
      const v = ll2v(parseFloat(cam.latitude), parseFloat(cam.longitude), GLOBE_R + 0.05);
      pts.push(v.x, v.y, v.z);
      
      window.webcamsData.push({
        title: cam.title,
        city: cam.city || 'Unknown',
        playerEmbed: embedSrc
      });
    });
    
    const camGeo = new THREE.BufferGeometry();
    camGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const camPoints = new THREE.Points(camGeo, webcamMat);
    // Add explicitly to scene as well inside the group to ensure it renders over the globe
    camPoints.renderOrder = 999; 
    intelGroups.webcams.add(camPoints);
    
    console.log(`Loaded ${window.webcamsData.length} webcams onto the Hostile Skin layer.`);
  } catch (err) {
    console.error("Failed to load Webcams:", err);
  }
}
initWebcamsLayer();

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
    commJamTurns: 0
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

    // Helper to apply -30 degree prime meridian offset and wrap dateline
    const oLon = (lon) => {
      let l = lon - 30;
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

    countryData[iso] = { name: p.name||iso, lat: bestLat, lon: bestLon, polys };

    // --- INJECT CUSTOM VIRTUAL NODES FOR NORTH AMERICA & CENTRAL ASIA ---
    if (iso === 'USA') {
      countryData['US_W'] = { name: 'US West', lat: 41.5, lon: -115.0, polys: [] };
      countryData['US_E'] = { name: 'US East', lat: 38.5, lon: -78.0, polys: [] };
      countryData['US_C'] = { name: 'US Central', lat: 40.0, lon: -95.0, polys: [] };
      countryData['US_S'] = { name: 'US South', lat: 31.0, lon: -100.0, polys: [] };
      countryData['US_NE'] = { name: 'US Northeast', lat: 43.0, lon: -73.0, polys: [] };
    }
    if (iso === 'CAN') {
      countryData['CAN_W'] = { name: 'Canada West', lat: 55.0, lon: -120.0, polys: [] };
      countryData['CAN_E'] = { name: 'Canada East', lat: 52.0, lon: -75.0, polys: [] };
    }
    if (iso === 'IRN') {
      countryData['IRN_E'] = { name: 'Iran East', lat: 33.0, lon: 58.0, polys: [] };
    }
    if (iso === 'AFG') {
      countryData['AFG_N'] = { name: 'Afghan North', lat: 36.0, lon: 67.0, polys: [] };
    }
    if (iso === 'KAZ') {
      countryData['CASP'] = { name: 'Caspian Region', lat: 44.0, lon: 51.0, polys: [] };
    }
    // ----------------------------------------------------------------------
    // Draw border lines
    // Build border lines geometry but do not render them on the globe
    const mat = new THREE.LineBasicMaterial({color:NEUTRAL.int, transparent:true, opacity:.6});
    const group = new THREE.Group();
    geos.forEach(geo => group.add(new THREE.Line(geo, mat.clone())));
    group.userData = { iso, mat };
    group.visible = false; // Hide borders per user request
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
