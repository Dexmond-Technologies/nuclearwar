// Catalog hardcoded exactly from the approved implementation_plan.md matrix
window.WEAPONS_CATALOG = [
  // Tier 1
  { name: "Pistol", tier: 1, attack: 5, cost: 3 },
  { name: "Revolver", tier: 1, attack: 8, cost: 5 },
  { name: "Rifle", tier: 1, attack: 15, cost: 10 },
  { name: "Shotgun", tier: 1, attack: 18, cost: 15 },
  { name: "Submachine Gun", tier: 1, attack: 20, cost: 20 },
  { name: "Assault Rifle", tier: 1, attack: 22, cost: 25 },
  { name: "Machine Gun", tier: 1, attack: 30, cost: 35 },
  { name: "Sniper Rifle", tier: 1, attack: 35, cost: 45 },
  // Tier 2
  { name: "Smoke Grenade", tier: 2, attack: 5, cost: 10 },
  { name: "Flashbang", tier: 2, attack: 10, cost: 15 },
  { name: "Hand Grenade", tier: 2, attack: 45, cost: 30 },
  { name: "TNT Charge", tier: 2, attack: 75, cost: 60 },
  { name: "Land Mine", tier: 2, attack: 85, cost: 75 },
  { name: "Plastic Explosive", tier: 2, attack: 90, cost: 80 },
  { name: "Depth Charge", tier: 2, attack: 110, cost: 100 },
  // Tier 3
  { name: "Rocket Launcher", tier: 3, attack: 150, cost: 150 },
  { name: "Anti-Tank Rocket", tier: 3, attack: 180, cost: 200 },
  { name: "Mortar", tier: 3, attack: 220, cost: 250 },
  { name: "Howitzer", tier: 3, attack: 350, cost: 350 },
  { name: "Artillery Cannon", tier: 3, attack: 400, cost: 450 },
  { name: "Multiple Rocket Launcher", tier: 3, attack: 550, cost: 600 },
  // Tier 4
  { name: "Guided Missile", tier: 4, attack: 800, cost: 850 },
  { name: "Surface-to-Air Missile", tier: 4, attack: 950, cost: 950 },
  { name: "Cruise Missile", tier: 4, attack: 1200, cost: 1200 },
  { name: "Torpedo", tier: 4, attack: 1500, cost: 1400 },
  { name: "Gravity Bomb", tier: 4, attack: 2000, cost: 1600 },
  { name: "Cluster Bomb", tier: 4, attack: 2500, cost: 1750 },
  { name: "Incendiary Bomb", tier: 4, attack: 2800, cost: 1850 },
  { name: "Bunker-Buster Bomb", tier: 4, attack: 3200, cost: 1900 },
  { name: "Ballistic Missile", tier: 4, attack: 3500, cost: 2000 }
];

function openWeaponArsenal(tierId, titleName) {
  if (typeof _sfxClick !== 'undefined') _sfxClick();
  const modal = document.getElementById('weapon-arsenal-modal');
  const title = document.getElementById('weapon-arsenal-title');
  const list = document.getElementById('weapon-arsenal-list');
  
  title.innerText = titleName + " ARSENAL";
  list.innerHTML = "";
  
  let filteredWeapons = [];
  if (tierId === 'DEXMOND') {
      filteredWeapons = window.WEAPONS_CATALOG.filter(w => w.tier !== 2);
  } else {
      filteredWeapons = window.WEAPONS_CATALOG.filter(w => w.tier === tierId);
  }
  filteredWeapons.forEach(w => {
    const card = document.createElement('div');
    card.style.background = 'rgba(0,40,80,0.6)';
    card.style.border = '1px solid rgba(0,170,255,0.3)';
    card.style.borderRadius = '4px';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.cursor = 'pointer';
    card.style.transition = '0.2s';
    
    card.onmouseover = () => { card.style.background = 'rgba(0,60,120,0.8)'; card.style.borderColor = '#0af'; };
    card.onmouseout = () => { card.style.background = 'rgba(0,40,80,0.6)'; card.style.borderColor = 'rgba(0,170,255,0.3)'; };
    card.onclick = () => { 
        if (typeof _sfxClick !== 'undefined') _sfxClick();
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({
                type: 'buy_weapon',
                callsign: window.PLAYER_NAME,
                weaponName: w.name,
                cost: w.cost
            }));
        } else {
            console.warn("WebSocket not connected to send purchase.");
        }
    };
    
    card.innerHTML = `
      <div style="font-family:'Share Tech Mono', monospace; font-size:16px; color:#fff; text-shadow:0 0 5px #0af;">
        ${w.name}
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <div style="font-family:'Orbitron', sans-serif; font-size:14px; font-weight:bold; color:#f24; text-shadow:0 0 5px #f00;">
            [ ATK: ${w.attack.toLocaleString()} ]
          </div>
          <div style="font-family:'Orbitron', sans-serif; font-size:12px; margin-top:4px; font-weight:bold; color:#39ff14; text-shadow:0 0 5px #0f0;">
            COST: ${w.cost.toLocaleString()} D3X
          </div>
      </div>
    `;
    list.appendChild(card);
  });
  
  modal.style.display = 'flex';
}

function closeWeaponArsenal() {
    if (typeof _sfxClick !== 'undefined') _sfxClick();
    document.getElementById('weapon-arsenal-modal').style.display = 'none';
}