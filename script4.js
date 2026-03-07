
// =====================================================================
// UI HELPERS
// =====================================================================
function setLog(msg){ 
  document.getElementById('log').textContent=msg;
  // Mirror human-relevant messages into the Humanity reasoning panel
  const humanPanel = document.getElementById('d0-reasoning');
  if (humanPanel && msg && !msg.startsWith('⟳') && !msg.startsWith('✓ ') && !msg.startsWith('⚙') && !msg.startsWith('LOADING')) {
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
// 3D MISSILE + EXPLOSION
// =====================================================================
const missiles3D=[], explosions3D=[];

function slerp3D(a,b,t){
  const dot=Math.max(-1,Math.min(1,a.dot(b)));
  const om=Math.acos(dot); if(Math.abs(om)<.0001)return a.clone().lerp(b,t);
  const s=Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1-t)*om)/s).addScaledVector(b,Math.sin(t*om)/s);
}

function launchMissile3D(fromIso, toIso, col) {
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

function spawnExplosion3D(lat,lon,col){
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
  const flashGeo=new THREE.SphereGeometry(.0225,12,12); // smaller explosion
  const flashMat=new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:1}); // bright fire yellow/orange
  const flash=new THREE.Mesh(flashGeo,flashMat);
  flash.position.copy(c); scene.add(flash);
  explosions3D.push({rings,flash,flashMat,life:1.0});
}

// =====================================================================
// VISUAL EFFECTS FOR AI
// =====================================================================
function triggerRedAlert(msg) {
  const el = document.getElementById('news-alert');
  const txt = document.getElementById('na-text');
  const label = document.getElementById('na-label');
  label.style.color = '#ff0000';
  txt.style.color = '#ff4444';
  txt.textContent = msg;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(()=> { label.style.color=''; txt.style.color=''; }, 500);
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
  const pi = GS.turn; // Raincloud = player index 1
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
      triggerRedAlert("RAINCLOUD HACKED AIR TRAFFIC CONTROL - REINFORCEMENTS GROUNDED");
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
      GS.countries[tIso].nuked=3;
      spawnExplosion3D(countryData[tIso]?.lat,countryData[tIso]?.lon,PLAYER_COLORS[1].int);
      triggerRedAlert("NUCLEAR LAUNCH DETECTED");
      aiLog(`<span style="color:#ffaa00">NUCLEAR LAUNCH: ${countryData[tIso]?.name.toUpperCase()}</span>`);
      setLog(`☢ RAINCLOUD NUCLEAR WAR on ${countryData[tIso]?.name}!`);
      if(GS.countries[tIso].troops===0){GS.countries[tIso].owner=1;GS.countries[tIso].troops=1;refreshBorder(tIso);}
      updateTroopSprite(tIso);
      await wait(1500);
    }
  }

  // --- REINFORCE ---
  let reinforce=Math.max(3,Math.floor(myCountries.length/3));
  let highestThreat = -1;
  let reinforceTgt = myCountries[0][0];
  
  for(const [iso, c] of myCountries) {
    const cd = countryData[iso]; if(!cd) continue;
    let threat = 0;
    Object.entries(GS.countries).forEach(([,ec])=>{
      if(ec.owner === 0) {
        const dist = Math.abs(ec.lat-(cd.lat||0)) + Math.abs(ec.lon-(cd.lon||0));
        if(dist < 30) threat += ec.troops;
      }
    });
    if(threat > highestThreat) { highestThreat = threat; reinforceTgt = iso; }
  }
  
  GS.countries[reinforceTgt].troops += reinforce;
  updateTroopSprite(reinforceTgt);
  aiLog(`REINFORCE: <b>${countryData[reinforceTgt]?.name.toUpperCase()}</b> (+${reinforce})`);
  setLog(`⚙ RAINCLOUD reinforce +${reinforce} → ${countryData[reinforceTgt]?.name}`);
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
        if(fromC.troops > toC.troops) { 
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
    const atkD=Math.min(3,move.fromC.troops-1),defD=Math.min(2,move.toC.troops);
    const aR=Array.from({length:atkD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    const dR=Array.from({length:defD},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
    let al=0,dl=0;
    for(let i=0;i<Math.min(aR.length,dR.length);i++){if(aR[i]>dR[i])dl++;else al++;}
    
    move.fromC.troops-=al; move.toC.troops-=dl;
    
    if(move.toC.troops<=0){
      aiLog(`<span style="color:#fff">SECURED: <b>${countryData[move.toIso]?.name.toUpperCase()}</b></span>`);
      setLog(`⚙ RAINCLOUD seizes ${countryData[move.toIso]?.name}!`);
      move.toC.owner=1; move.toC.troops=Math.min(move.fromC.troops-1,atkD);
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
let ws_isHost = false;
let pendingGoogleToken = null;

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
      case 'saved_state': {
        ws_isHost = msg.isHost;
        hideLobby();

        // Immediately attempt Google Auth passing the JWT to the backend
        if (pendingGoogleToken) {
          ws.send(JSON.stringify({ type: 'google_auth', credential: pendingGoogleToken }));
        } else {
          if (window.myCallsign) {
            ws.send(JSON.stringify({ type: 'rename', name: window.myCallsign }));
          }
          ws.send(JSON.stringify({ type: 'get_commander_stats', callsign: window.myCallsign || 'COMMANDER' }));
        }

        // Show onboarding when joining from lobby
        if (!document.getElementById('hud').style.display || document.getElementById('hud').style.display === 'none') {
            document.getElementById('onboarding-modal').classList.add('show');
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
              setLog('⟳ RESUMING RAINCLOUD PROCESSING...');
              setTimeout(aiTurn, 2000);
            }
          } else {
            // No state exists on server, we must generate a fresh world and push it
            initGame(['COMMANDER', 'RAINCLOUD'], 0);
            syncState(); // immediately populate the server
          }
        });
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
        }
        break;
      case 'player_joined':
        document.getElementById('lobby-msg').textContent=`${msg.name} connected (${msg.totalPlayers} online)`;
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
        setLog(`⚠ ${msg.name} disconnected. ${msg.totalPlayers} remaining.`); break;
      case 'host_migrated':
        ws_isHost = true;
        setLog(`⚙ You are now the primary host for AI computation.`);
        if (GS.turn === 1) {
          setLog('⟳ RESUMING STALLED RAINCLOUD PROCESSING...');
          setTimeout(aiTurn, 1000);
        }
        break;
      case 'player_list':
        showRoomPlayers(msg.players);
        const pcount = msg.players ? msg.players.length : 1;
        document.getElementById('d0-players').innerHTML = `⚡ ${pcount} COMMANDER${pcount!==1?'S':''} ACTIVE`;
        break;
      case 'chat':
        appendChat(msg.name,msg.text, 0); break;
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
        if (dmgEl && msg.stats) dmgEl.textContent = formatTroops(msg.stats.damage || 0) + ' MILS';
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
  GS.countries=s.countries; GS.turn=s.turn; GS.turnCount=s.turnCount; 
  GS.phase=s.phase; GS.reinforceLeft=s.reinforceLeft;
  
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
  else setLog(`⟳ RAINCLOUD PROCESSING...`);
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
function hideLobby(){document.getElementById('lobby').style.display='none';}

function joinGlobalWar() {
  const inp = document.getElementById('player-name')?.value;
  if (inp) {
    window.myCallsign = inp;
  }
  document.getElementById('lobby-msg').innerHTML = "Establishing secure uplink...";
  initWS();
}

function closeOnboarding() {
  SFX.playClick();
  SFX.init();
  document.getElementById('onboarding-modal').style.display = 'none';
  document.getElementById('ops-sidebar').classList.add('visible');
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
// AMBIENT VISUAL UNITS (JETS, SUBS, SHIPS, PLANES) - purely for display
// =====================================================================
const ambients = [];
const planes3D = [];

function spawnAmbientPlanes() {
  if (!window.scene || !GS.countries || Object.keys(GS.countries).length < 2) return;
  const isos = Object.keys(GS.countries);
  const fromIso = isos[Math.floor(Math.random() * isos.length)];
  let toIso = isos[Math.floor(Math.random() * isos.length)];
  while(toIso === fromIso) toIso = isos[Math.floor(Math.random() * isos.length)];
  
  const fc = countryData[fromIso], tc = countryData[toIso];
  if(!fc || !tc) return;
  
  const sd = ll2v(fc.lat, fc.lon, 1.01).normalize(); 
  const ed = ll2v(tc.lat, tc.lon, 1.01).normalize();
  const owner = Math.random() > 0.5 ? 0 : 1;
  const col = PLAYER_COLORS[owner].hex;
  
  const numPlanes = 4 + Math.floor(Math.random() * 4); // 4 to 7
  
  for(let p=0; p<numPlanes; p++) {
    const troopsText = Math.floor(5 + Math.random() * 6) + 'K'; // 5K to 10K
    const tex = troopTexture(troopsText, col);
    const mat = new THREE.SpriteMaterial({map: tex, depthTest: false});
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(.12, .06, 1);
    scene.add(sprite);
    
    // Stagger their progress slightly so they move in a group/formation
    const delay = -(p * 0.04) - (Math.random() * 0.03);
    
    // Add some random lateral offset to the path
    const offset = new THREE.Vector3(
      (Math.random()-0.5)*0.06,
      (Math.random()-0.5)*0.06,
      (Math.random()-0.5)*0.06
    );
    
    planes3D.push({
       sprite, sd, ed, progress: delay, speed: 0.12 + (Math.random()*0.03), offset
    });
  }
}

// Spawn planes every 15-20 seconds
setInterval(() => {
  if (window.scene) spawnAmbientPlanes();
}, 15000 + Math.random() * 5000);

function createJetCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#11ff88'; // Bright neon green
  ctx.shadowColor = '#11ff88'; ctx.shadowBlur = 15;
  ctx.translate(64, 64); ctx.rotate(Math.PI/4); // Point top right
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(24, 20); ctx.lineTo(0, 10); ctx.lineTo(-24, 20); ctx.fill();
  return c;
}

function createSpaceRocketCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; // White rocket
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
  ctx.translate(64, 64); ctx.rotate(Math.PI/4); // Point top right
  
  // Fuselage
  ctx.beginPath(); 
  ctx.moveTo(0, -40); // nose
  ctx.lineTo(8, -20);
  ctx.lineTo(8, 30);
  ctx.lineTo(-8, 30);
  ctx.lineTo(-8, -20);
  ctx.fill();
  
  // Left fin
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-20, 30);
  ctx.lineTo(-8, 30);
  ctx.fill();
  
  // Right fin
  ctx.beginPath();
  ctx.moveTo(8, 10);
  ctx.lineTo(20, 30);
  ctx.lineTo(8, 30);
  ctx.fill();
  
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

function createSatelliteCanvas() {
  const c = document.createElement('canvas'); c.width=128; c.height=128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#00f0ff'; // Cyan
  ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
  // Core
  ctx.fillRect(54, 54, 20, 20);
  // Solar panels
  ctx.fillStyle = '#0066aa';
  ctx.fillRect(10, 60, 40, 8);
  ctx.fillRect(78, 60, 40, 8);
  return c;
}

function spawnAmbients() {
  const texJet = new THREE.CanvasTexture(createJetCanvas());
  const texSub = new THREE.CanvasTexture(createSubCanvas());
  const texShip = new THREE.CanvasTexture(createShipCanvas());
  const texSat = new THREE.CanvasTexture(createSatelliteCanvas());

  const matJet = new THREE.SpriteMaterial({map: texJet, color: 0xffffff});
  const matSub = new THREE.SpriteMaterial({map: texSub, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending});
  const matShip = new THREE.SpriteMaterial({map: texShip, color: 0xffffff});
  const matSat = new THREE.SpriteMaterial({map: texSat, color: 0xffffff});

  for(let i=0; i<60; i++) {
    const type = i % 3; // 0: Jet, 1: Sub, 2: Ship
    const mat = type === 0 ? matJet : type === 1 ? matSub : matShip;
    // slightly adjusted orbital heights so they don't clip through the globe as often
    const radius = type === 0 ? 10.8 : (type === 1 ? 10.15 : 10.1);
    
    const sprite = new THREE.Sprite(mat);
    // Increase scale significantly from 0.5 to 1.5 - 2.5
    sprite.scale.set(1.8, 1.8, 1.0);
    
    // Random position
    const phi = Math.acos(-1 + (2 * i)/60);
    const theta = Math.sqrt(60 * Math.PI) * phi;
    sprite.position.setFromSphericalCoords(radius, phi, theta);
    
    const pivot = new THREE.Group();
    pivot.add(sprite);
    scene.add(pivot);
    
    // Orbital mechanics
    const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const speed = (Math.random()*0.0015 + 0.0005) * (type === 0 ? 3 : 1);
    
    ambients.push({ pivot, axis, speed, sprite, type, offset: Math.random()*100 });
  }

  // Spawn 15 Satellites in high orbit
  for(let i=0; i<15; i++) {
    const sprite = new THREE.Sprite(matSat);
    sprite.scale.set(1.2, 1.2, 1.0);
    // High orbit radius
    const radius = 12.5 + Math.random() * 1.5;
    
    const phi = Math.acos(-1 + (2 * i)/15);
    const theta = Math.sqrt(15 * Math.PI) * phi;
    sprite.position.setFromSphericalCoords(radius, phi, theta);
    
    const pivot = new THREE.Group();
    pivot.add(sprite);
    scene.add(pivot);
    
    // Satellites move consistently
    const axis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const speed = Math.random()*0.0008 + 0.0002;
    ambients.push({ pivot, axis, speed, sprite, type: 3, offset: Math.random()*100 });
  }
}

// =====================================================================
// ANIMATION LOOP
// =====================================================================
const clock3=new THREE.Clock();
let time3=0;

function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock3.getDelta(),.05);
  time3+=dt;

  // Auto-rotate when idle (even during missile flight)
  if(!drag) {
    // Slow down to almost 0 when a country is selected for easier interaction
    const rotSpeed = GS.selected ? 0.0002 : 0.003;
    sph.theta -= rotSpeed * dt * 60; 
    updCam();
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

    if(m.progress>=1){
      scene.remove(m.group);
      spawnExplosion3D(countryData[m.toIso]?.lat,countryData[m.toIso]?.lon,m.col);
      missiles3D.splice(i,1);
    }
  }

  // Update explosions
  for(let i=explosions3D.length-1;i>=0;i--){
    const ex=explosions3D[i];
    ex.life-=dt*.7;
    if(ex.life<=0){ex.rings.forEach(r=>scene.remove(r.ring));scene.remove(ex.flash);explosions3D.splice(i,1);continue;}
    ex.rings.forEach((g,ri)=>{
      const t=Math.max(0,(1-ex.life)*(1-g.delay*.5));
      const s=t*.06+.001;
      const pts=Array.from({length:65},(_,j)=>{
        const a=(j/64)*Math.PI*2;
        return g.c.clone().addScaledVector(g.t1,Math.cos(a)*s).addScaledVector(g.t2,Math.sin(a)*s);
      });
      g.ring.geometry.setFromPoints(pts);
      g.mat.opacity=ex.life*.9;
    });
    ex.flashMat.opacity=Math.min(1,ex.life*3);
    ex.flash.scale.setScalar(1+(1-ex.life)*12);
  }

  // Cull troop sprites that are behind the globe
  const camDir = camera.position.clone().normalize();
  for (const [, sprite] of Object.entries(troopSprites)) {
    if (!sprite.position) continue;
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
    
    // Backface culling
    const pos = new THREE.Vector3();
    amb.sprite.getWorldPosition(pos);
    const dot = camDir.dot(pos.normalize());
    amb.sprite.visible = dot > 0.08;
  });

  // Update animated plane (troop box) flights
  for(let i = planes3D.length - 1; i >= 0; i--) {
    const p = planes3D[i];
    p.progress += dt * p.speed;
    
    if (p.progress < 0) {
       p.sprite.visible = false;
       continue;
    }
    
    if (p.progress >= 1) {
       scene.remove(p.sprite);
       if (p.sprite.material.map) p.sprite.material.map.dispose();
       p.sprite.material.dispose();
       planes3D.splice(i, 1);
       continue;
    }
    
    const basePos = slerp3D(p.sd, p.ed, p.progress).normalize();
    // Parabolic arc for flight
    const h = GLOBE_R + 0.02 + Math.sin(p.progress * Math.PI) * 0.25; 
    basePos.multiplyScalar(h).add(p.offset);
    p.sprite.position.copy(basePos);
    
    // Backface culling
    const dot = camDir.dot(basePos.clone().normalize());
    p.sprite.visible = (dot > 0.08);
  }

  renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{
  renderer.setSize(innerWidth,innerHeight);
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
  
  // Pick random colors: Humanity Blue, Raincloud Red, or Generic Orange
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

spawnAmbients();
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
    setLog(`🤝 RAINCLOUD rejected ${treaty.name}.`);
    triggerNewsEvent('DIPLOMATIC OVERTURES REBUFFED BY RAINCLOUD');
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
      // RAINCLOUD betrayal: 30% chance on expiry
      if (Math.random() < 0.30 && t.type === 'ALLIANCE') {
        triggerNewsEvent('RAINCLOUD BETRAYS ALLIANCE — WAR REIGNITES');
        setLog('⚠ RAINCLOUD has betrayed the Alliance! WAR RESUMES.');
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
        setLog(`💼 COUP SUCCESS: ${tgt.name} flipped to your control!`);
        triggerNewsEvent(`${tgt.name.toUpperCase()} GOVERNMENT OVERTHROWN IN COUP`);
      } else {
        setLog(`💼 COUP FAILED: ${tgt.name} is too well defended.`);
      }
      break;
    case 'FALSE_INTEL':
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
  drawer.id = 'drawer-' + id;
  drawer.innerHTML = `
    <div class="strat-drawer-title">
      <span>${titleHtml}</span>
      <button class="strat-drawer-close" onclick="window.closeAllModals()">✕</button>
    </div>
    <div id="drawer-body-${id}">${bodyHtml}</div>
  `;
  document.body.appendChild(drawer);
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
    <p style="font-size:10px;opacity:0.6;margin-bottom:8px;">Offer terms to RAINCLOUD. AI acceptance depends on balance of power.</p>
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
  if (window._pendingSpyAction && iso) {
    const action = window._pendingSpyAction;
    window._pendingSpyAction = null;
    executeSpyAction(action, iso);
    return;
  }
  if (window._pendingNaval && iso) {
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
    setLog("⚠ Error loading Intel Map. Check console for details.");
  }

  // --- Polling proxy server for flights removed ---
}

function showIntelMapDrawer() {
  _sfxClick();
  const body = Object.entries(INTEL_LAYERS).map(([key, label]) => {
    return `<div class="strat-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      <span class="strat-item-title" style="margin:0; font-size:10px;">${label}</span>
      <input type="checkbox" id="toggle-${key}" onchange="toggleIntelLayer('${key}', this.checked)" style="width:14px;height:14px;cursor:pointer;">
    </div>`;
  }).join('');
  
  openDrawer('intel-layers', '👁 GLOBAL INTEL FEED', `
    <div style="font-size:10px;opacity:0.6;margin-bottom:10px;">Enable live data layers parsed from local and remote API feeds.</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
      ${body}
    </div>
  `, 400);

  // Sync checkboxes with current map state
  if (intelMap) {
    Object.keys(INTEL_LAYERS).forEach(key => {
      const cb = document.getElementById(`toggle-${key}`);
      if (cb) cb.checked = intelMap.state.layers[key] === true;
    });
  }
}

window.toggleIntelLayer = function(layerKey, isChecked) {
  // 1. Sync Native Three.js Layers
  if (intelGroups[layerKey]) {
    intelGroups[layerKey].visible = isChecked;
  }

  // 2. Sync DeckGL Layers
  if (!intelMap) return;
  if(intelMap.onLayerChange) {
     intelMap.onLayerChange(layerKey, isChecked, 'user');
  } else {
     intelMap.state.layers[layerKey] = isChecked;
     if(intelMap.debouncedRebuildLayers) intelMap.debouncedRebuildLayers();
  }
};

document.getElementById('btn-toggle-intel').addEventListener('click', () => {
  SFX.playClick();
  intelMapActive = !intelMapActive;
  const canvas = document.getElementById('c');
  const container = document.getElementById('deckgl-container');
  const btn = document.getElementById('btn-toggle-intel');
  
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
    showIntelMapDrawer();
  } else {
    canvas.style.display = 'block';
    container.style.display = 'none';
    btn.innerHTML = '👁 HOSTILE INTEL';
    btn.style.background = '';
    btn.style.borderColor = '';
    closeAllModals();
  }
});

// Removed hover listeners for ops-sidebar (now permanently displayed)

// ============================================================================
// WORLD RADIO INTEGRATION
// ============================================================================
// ============================================================================
// WORLD RADIO INTEGRATION (Synthetic Ambient Noise)
// ============================================================================
let radioActive = false;
const radioBtn = document.getElementById('btn-radio-toggle');
const radioDisplay = document.getElementById('radio-display');

// Toggle radio state
radioBtn.addEventListener('click', () => {
  radioActive = !radioActive;
  if (radioActive) {
    radioBtn.innerText = '🔊';
    radioDisplay.innerText = 'World Radio: ON';
    // Initialize procedural ambient background music
    SFX.init();
    if (SFX._bgOsc && SFX.ctx.state === 'suspended') {
      SFX.ctx.resume();
    } else {
      SFX.startAmbientRadio();
    }
  } else {
    radioBtn.innerText = '🔇';
    radioDisplay.innerText = 'World Radio: OFF';
    if (SFX._bgOsc && SFX.ctx) {
      SFX.ctx.suspend(); // Pause the ambient track entirely
    }
  }
});



