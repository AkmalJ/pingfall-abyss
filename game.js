// ============================================================
// PINGFALL: ABYSS — a sonar-survival dive.
// Ping to see. Ping and be heard.
// All tuning numbers live in CONFIG below (single source).
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CONFIG = {
  // ---- assets: models/<name>.glb, placeholder fallback when missing ----
  assets: ['sub-minnow','sub-barracuda','sub-mule','sub-phantom','sub-leviathan','sub-forge',
           'hunter','hunter-brute','hunter-sentry','decoy','crystal','gate','torpedo'],
  assetSize: { 'sub-minnow':7,'sub-barracuda':8,'sub-mule':8.5,'sub-phantom':8,'sub-leviathan':11,'sub-forge':8,
               'hunter':6.5,'hunter-brute':9,'hunter-sentry':6,'decoy':1.8,'crystal':3.2,'gate':30,'torpedo':2.4 },
  assetYawFix: { 'hunter': -Math.PI / 2 }, // per-model GLB facing fix, applied on the loader wrap so it survives the movement lookAt. 'hunter' was authored head-at-+X (angler lure + jaw at +X, tail fin at -X — verified against the geometry), so -90° puts its face on +Z like the movement/swim code assumes. 'hunter-brute' (head +Z) and 'hunter-sentry' (face +Z) verified correct as authored.

  // ---- sonar / noise / battery ----
  sonar: { baseRadius: 95, waveSpeed: 150, revealDur: 3.4, pingCd: 30,
           pingNoiseRadiusMul: 1.15, noiseDecay: 16, engineHearBase: 30 },
  batteryRegen: 3.5, // stamina regen (Akmal 19 Nov redesign: battery no longer powers the ping — it is BOOST stamina; the ping runs on a flat 30 s cooldown instead)
  boostMul: 1.7, boostDrain: 7, boostRegenDelay: 0.8, // Shift boost: +70% speed, 7 stamina/s (≈14 s from full), regen starts 0.8 s after release
  emp: { cooldown: 20 },
  decoy: { life: 12, radius: 95, pulse: 0.6 },

  // ---- pulse cannon (hold LMB): rapid bolts, OVERHEAT instead of ammo ----
  pulse: { dmg: 5, skitterMul: 2, rate: 8, range: 32, speed: 88,
           heatRate: 100 / 2.2, ventRate: 100 / 1.6, unlockAt: 40 },

  // ---- hunter senses (DESIGN.md "Hunter senses & aggression") ----
  senses: { proxBase: 20, phantomStealth: 0.6, investigateDur: 10, patrolSpeedMul: 0.45, patrolReach: 7 },

  // ---- economy (DESIGN.md audited numbers) ----
  econ: { // coin sources rebalanced ~5x DOWN 19 Nov (Akmal: payouts were so high a few runs bought endgame gear and killed the grind; shop prices unchanged)
          golden: 40, starBonus: { 2: 10, 3: 30 }, closeCall: 5, minuteBonus: 4,
          stratumBonus: 5, cacheMin: 8, cacheMax: 20, cacheHull: 20, cellBatt: 30, patchHull: 15, ancientBounty: 75 },

  // ---- submarines ----
  subs: {
    'minnow':    { name:'Minnow',    asset:'sub-minnow',    role:'Scout',       price:0,
                   speed:26, hull:100, battery:100, sonarMul:1.25, torpDmg:50, torpCap:4, decoyCap:2,
                   empR:26, empDur:4, noiseMul:1.0, crystalMul:1.0, scale:1.0,  tint:0x2e8f86 },
    'barracuda': { name:'Barracuda', asset:'sub-barracuda', role:'Assault',     price:150,
                   speed:24, hull:120, battery:100, sonarMul:1.0,  torpDmg:100, torpCap:6, decoyCap:3,
                   empR:28, empDur:4, noiseMul:1.0, crystalMul:1.0, scale:1.05, tint:0xb35a2e },
    'mule':      { name:'Mule',      asset:'sub-mule',      role:'Hauler',      price:250,
                   speed:18, hull:140, battery:120, sonarMul:0.95, torpDmg:50, torpCap:5, decoyCap:3,
                   empR:26, empDur:4, noiseMul:1.1, crystalMul:1.5, scale:1.18, tint:0xb08a2e },
    'phantom':   { name:'Phantom',   asset:'sub-phantom',   role:'Stealth',     price:600,
                   speed:25, hull:100, battery:110, sonarMul:1.05, torpDmg:50, torpCap:4, decoyCap:3,
                   empR:30, empDur:5, noiseMul:0.45, crystalMul:1.0, scale:1.05, tint:0x3a3f4a },
    'leviathan': { name:'Leviathan', asset:'sub-leviathan', role:'Dreadnought', price:1000,
                   speed:16, hull:220, battery:130, sonarMul:1.1,  torpDmg:100, torpCap:10, decoyCap:5,
                   empR:40, empDur:6, noiseMul:1.2, crystalMul:1.0, scale:1.45, tint:0x51628f },
    'forge':     { name:'FORGE-01',  asset:'sub-forge',     role:'Abyss Forge', price:0,
                   speed:24, hull:130, battery:120, sonarMul:1.1,  torpDmg:50, torpCap:6, decoyCap:3,
                   empR:30, empDur:4, noiseMul:0.9, crystalMul:1.1, scale:1.05, tint:0xd6336c,
                   note:'One-of-one vessel forged by the Lux3D API from a captain\u2019s written description.' },
  },

  // ---- hunters: model mapping per DESIGN.md (hunter / hunter-brute / hunter-sentry) ----
  hunters: {
    stalker: { model:'hunter',        modelScale:1.0,  speed:15.5, hp:50, hearing:1.0,  dmg:12, tint:0x3d5a68, hitR:3.4 },
    skitter: { model:'hunter',        modelScale:0.6,  speed:21,   hp:50, hearing:0.9,  dmg:8,  tint:0x5b7d8a, hitR:2.4, erratic:1 },
    brute:   { model:'hunter-brute',  modelScale:1.15, speed:12.5, hp:150, hearing:1.1,  dmg:25, tint:0x6b5138, hitR:4.6 },
    sentry:  { model:'hunter-sentry', modelScale:1.0,  speed:0,    hp:100, hearing:1.2,  dmg:10, tint:0x54447a, hitR:3.2, pingRadius:58, pingEvery:6 },
    lurker:  { model:'hunter',        modelScale:0.9,  speed:17,   hp:100, hearing:0,    dmg:18, tint:0x0b0d13, hitR:3.0, dash:27, dark:true },
  },
  hunterStates: { dormant:{ core:0x2e7fd9 }, curious:{ core:0xffb84d }, hunting:{ core:0xff4d6d } },

  // ---- hazards ----
  jelly: { dmg: 8, hitR: 3.4, hitCd: 1.5, drift: 2.2 },
  mine:  { dmg: 26, triggerR: 5.5 },

  // ---- zones (data-driven; one arena system, re-tinted per zone) ----
  zones: [
    { id:1, name:'The Shelf',     depth:[60,160],    crystalValue:2,  crystals:12, escape:10, rec:'Minnow',
      mission:{ type:'collect', quota:7 },  hunters:['stalker'], hunterSpeedMul:0.7, mines:0, jellies:5, fogFar:118,
      tint:{ water:0x082a38, fog:0x04161d, accent:0x35e0c8 }, decor:'rocks',
      desc:'Sisa cahaya terakhir. Satu hunter lambat — belajarlah di sini.' },
    { id:2, name:'Kelp Ruins',    depth:[160,320],   crystalValue:4, crystals:14, escape:20, rec:'Minnow or Barracuda',
      mission:{ type:'rescue' },            hunters:['stalker','skitter'], hunterSpeedMul:0.9, mines:0, jellies:7, fogFar:80, decorMul:1.7,
      tint:{ water:0x0a2e1e, fog:0x061a10, accent:0x59e08a }, decor:'pillars',
      desc:'Labirin pilar dan kelp. Mini-sub hilang di dalamnya — radar adalah matamu.' },
    { id:3, name:'The Wreck Field', depth:[320,520], crystalValue:8, crystals:16, escape:40, rec:'Barracuda',
      mission:{ type:'nests', nests:3 },    hunters:['stalker','skitter','brute','skitter'], hunterSpeedMul:1.0, mines:8, jellies:9, decorMul:1.7,
      tint:{ water:0x1c1410, fog:0x120c08, accent:0xe08a4d }, decor:'wreck',
      desc:'Medan perang kuburan kapal: ranjau, sarang hunter yang dijaga penjaga, bangkai buat berlindung.' },
    { id:4, name:'Magenta Deep',  depth:[520,780],   crystalValue:14, crystals:18, escape:75, rec:'Phantom',
      mission:{ type:'survive', time:75 },  hunters:['stalker','skitter','sentry','brute','sentry','stalker'], hunterSpeedMul:1.1, mines:6, jellies:10, fogFar:92,
      tint:{ water:0x1e0618, fog:0x12030e, accent:0xe05ad0 }, decor:'crystals',
      desc:'Semua bercahaya, tapi Sentry mendengar. Main senyap — bertahanlah.' },
    { id:5, name:'The Abyss Gate', depth:[780,1100], crystalValue:24, crystals:20, escape:150, rec:'Leviathan',
      mission:{ type:'collect', quota:11 }, hunters:['stalker','skitter','brute','sentry','lurker','skitter'], hunterSpeedMul:1.16, mines:7, jellies:12, fogFar:100, guardians:1,
      tint:{ water:0x12081f, fog:0x0a0414, accent:0x8a6aff }, decor:'gate',
      desc:'Semua memburu di sini — dan Penjaga Gerbang menunggu di gerbang terakhir.' },
    { id:6, name:'The Drowned Catacombs', depth:[1100,1450], crystalValue:38, crystals:22, escape:240, rec:'Phantom or Leviathan',
      mission:{ type:'rescue' },            hunters:['stalker','skitter','lurker','brute'], hunterSpeedMul:1.21, mines:4, jellies:12, fogFar:95,
      tint:{ water:0x141a18, fog:0x0b100e, accent:0xcfc7a8 }, decor:'catacombs',
      desc:'Katakombe pilar pucat di balik gerbang. Mini-sub lain hilang di sini — Lurker menunggu di gelapnya.' },
    { id:7, name:'The Iron Reef', depth:[1450,1850], crystalValue:58, crystals:24, escape:380, rec:'Leviathan',
      mission:{ type:'nests', nests:4 },    hunters:['stalker','brute','skitter','brute','sentry'], hunterSpeedMul:1.26, mines:12, jellies:13, fogFar:100, decorMul:2,
      tint:{ water:0x1f100a, fog:0x140906, accent:0xff7a3c }, decor:'wreck',
      desc:'Wreck Field yang kejam: karang besi, 12 ranjau, 4 sarang yang dijaga penjaga. Perang total.' },
    { id:8, name:'The Silent Dark', depth:[1850,2250], crystalValue:84, crystals:26, escape:560, rec:'Leviathan',
      mission:{ type:'collect', quota:12 }, hunters:['sentry','lurker','sentry','lurker'], hunterSpeedMul:1.31, mines:5, jellies:14, fogFar:62, decorMul:0.55,
      tint:{ water:0x0a0614, fog:0x05030c, accent:0x7a5aff }, decor:'crystals',
      desc:'Nyaris gelap total. Cuma Sentry dan Lurker — dan mereka mendengar segalanya.' },
    { id:9, name:'The Vent Fields', depth:[2250,2650], crystalValue:124, crystals:28, escape:800, rec:'Leviathan',
      mission:{ type:'survive', time:90 },  hunters:['brute','stalker','brute','skitter','sentry'], hunterSpeedMul:1.36, mines:6, jellies:15, fogFar:105,
      tint:{ water:0x200b06, fog:0x150503, accent:0xffa03c }, decor:'vents',
      desc:'Ladang ventilasi mendidih. Bertahan 90 detik di antara para Brute.' },
    { id:10, name:'Heart of the Abyss', depth:[2650,3100], crystalValue:200, crystals:30, escape:1200, rec:'Leviathan',
      mission:{ type:'collect', quota:14 }, hunters:['stalker','skitter','brute','sentry','lurker','brute'], hunterSpeedMul:1.42, mines:9, jellies:16, fogFar:100, guardians:2,
      tint:{ water:0x160a20, fog:0x0d0516, accent:0xff4d6d }, decor:'gate',
      desc:'Jantung jurang. Semua memburu, DUA Penjaga Gerbang menunggu. Ini yang terakhir.' },
  ],
  arena: { radius: 235, floorY: -30, ceilY: 38 },

  // ---- upgrades: 3 tracks x 3 tiers, prices 100/200/350 ----
  upgrades: {
    sonar:   { name:'SONAR+',   prices:[100,200,350], radius:[1,1.25,1.5,1.8], echo:[1,1,1.5,2],
               blurb:t=> t===0?'Ping radius +25%': t===1?'Radius +50%, echoes 1.5× longer':'Radius +80%, echoes 2× longer' },
    battery: { name:'BATTERY+', prices:[100,200,350], cap:[1,1.3,1.6,2.0], cost:[1,1,0.9,0.8],
               blurb:t=> t===0?'Capacity +30%': t===1?'Capacity +60%, boost drains 10% less':'Capacity +100%, boost drains 20% less' },
    hull:    { name:'HULL+',    prices:[100,200,350], hp:[1,1.25,1.5,2.0], dmg:[1,1,0.75,0.6],
               blurb:t=> t===0?'Hull +25%': t===1?'Hull +50%, damage taken −25%':'Hull +100%, damage taken −40%' },
  },

  // ---- sub colours (cosmetic) ----
  colors: [
    { id:'teal',    name:'Teal',         hex:0x2ee6c8, price:0 },
    { id:'orange',  name:'Orange',       hex:0xff8c3a, price:0 },
    { id:'crimson', name:'Crimson',      hex:0xff3a5e, price:0 },
    { id:'violet',  name:'Violet',       hex:0x9a5eff, price:0 },
    { id:'ghost',   name:'Ghost White',  hex:0xf2f5f7, price:300 },
    { id:'stealth', name:'Stealth Black', hex:0x2a3138, price:300 },
    { id:'gold',    name:'Gold',         hex:0xffc93a, price:500 },
  ],

  // ---- hangar supplies ----
  supplies: {
    decoy:  { name:'Sonar decoys +2', price:30 },
    torp:   { name:'Torpedoes +3',    price:40 },
    repair: { name:'Full hull repair (selected sub)', price:50 },
  },

  // ---- survival ----
  survival: {
    difficulties: {
      calm:     { label:'CALM',     mult:0.5, hunterMul:0.8 },
      standard: { label:'STANDARD', mult:1.0, hunterMul:1.0 },
      nightmare:{ label:'NIGHTMARE',mult:2.0, hunterMul:1.35 },
    },
    strata: [
      { name:'Stratum I — Sunlit Grave',  tint:0x06222e, accent:0x35e0c8 },
      { name:'Stratum II — Kelp Dark',    tint:0x0a2e1e, accent:0x59e08a },
      { name:'Stratum III — The Furnace', tint:0x200c05, accent:0xff7a2a },
      { name:'Stratum IV — Magenta Deep', tint:0x2a0a24, accent:0xe05ad0 },
      { name:'Stratum V — The Violet',    tint:0x12081f, accent:0x8a6aff },
      { name:'Stratum VI — True Abyss',   tint:0x050508, accent:0x5a7aff },
    ],
    stratumDepth: 400, floorDepth: 40, floorsPerStratum: 10,
    spawnStart: 16, spawnMin: 6, spawnDecay: 0.97, maxHunters: 8,
    collapseStart: 90, collapseBase: 1.15, boonEvery: 60, ancientEvery: 300,
    crystalBase: 2, crystalPerStratum: 1, bandEvery: 40, shaftRadius: 150,
    gateQuota: 3, // crystals to collect ON a normal floor to open its descent gate (+1 per stratum)
  },

  // ---- Stratum Warden (survival boss at floors 10/20/30...) ----
  warden: {
    scale: 1.6, hp: 100, hpPerStratum: 50, speedMul: 1.15, dmg: 25,
    modifiers: ['armored','shrieker','splitter','swift'],
    modInfo: {
      armored:  { name:'ARMORED',  desc:'Plating halves all damage it takes.' },
      shrieker: { name:'SHRIEKER', desc:'Emits reveal pings that expose you to every hunter.' },
      splitter: { name:'SPLITTER', desc:'Splits off Skitters as it is wounded and when it dies.' },
      swift:    { name:'SWIFT',    desc:'Much faster, slightly fragile.' },
    },
    armoredDmgMul: 0.5, swiftSpeedMul: 1.45, swiftHpMul: 0.8, shriekEvery: 5,
    coinBase: 60, coinPerStratum: 30, warnBefore: 3, spawnBelow: 55,
  },

  // ---- Boss Trio "The Three Guardians" (floors 50/100/150... replace the Warden) ----
  trio: {
    everyFloors: 50, cycleMul: 1.35, warnBefore: 4,
    alpha: { scale:1.5, hp:300, speed:19, dmg:16 },   // hunter.glb — fast, persistent
    wall:  { scale:1.7, hp:700, speed:9,  dmg:25 },   // hunter-brute.glb — tank
    eye:   { scale:1.2, hp:250, dmg:10, pingRadius:70, pingEvery:4.5 }, // hunter-sentry.glb — exposes you
    coinBase: 150, coinPerCycle: 75,
  },

  // ---- boons (survival draft) ----
  boons: [
    { id:'repair', icon:'🛠', name:'Field Repair',  desc:'Restore 30 hull right now.' },
    { id:'cell',   icon:'🔋', name:'Abyssal Cell',  desc:'+50 boost stamina, +20 max stamina this dive.' },
    { id:'decoys', icon:'📡', name:'Decoy Cache',   desc:'+2 sonar decoys.' },
    { id:'torps',  icon:'🐚', name:'Torpedo Cache', desc:'+3 torpedoes.' },
    { id:'sonar',  icon:'🌐', name:'Wide Array',    desc:'Sonar radius +25% this dive.' },
    { id:'speed',  icon:'💨', name:'Ion Thrusters', desc:'Top speed +15% this dive.' },
    { id:'greed',  icon:'💰', name:'Greed Circuit', desc:'Crystal value +50% this dive.' },
    { id:'emp',    icon:'⚡', name:'Fast Capacitors', desc:'EMP cooldown halved this dive.' },
  ],
};

// ============================ SAVE ============================
const SAVE_KEY = 'pingfallAbyssSaveV1';
const SAVE = (() => {
  const def = { coins:0, subs:['minnow'], sub:'minnow',
    upg:{ sonar:0, battery:0, hull:0 }, stars:{}, golden:{},
    colorsOwned:['teal'], subColor:{}, stock:{ decoy:2, torp:4 },
    subHull:{}, bestDepth:0, bestTime:0, trioBest:0, music:1, forged:[], forgeSeq:2, lang:'en' };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') return Object.assign(def, s); } catch(e) {}
  return def;
})();
function persist(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e) {} }

// ============================ UTILS ============================
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
const lerp = (a,b,t)=> a + (b-a)*t;
const rand = (a,b)=> a + Math.random()*(b-a);
const randi = (a,b)=> Math.floor(rand(a,b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); };
const hexCss = h => '#' + h.toString(16).padStart(6,'0');
function derived(subId){
  const s = CONFIG.subs[subId], u = SAVE.upg;
  return { def:s,
    maxHull: Math.round(s.hull * CONFIG.upgrades.hull.hp[u.hull]),
    maxBatt: Math.round(s.battery * CONFIG.upgrades.battery.cap[u.battery]),
    sonarR: CONFIG.sonar.baseRadius * s.sonarMul * CONFIG.upgrades.sonar.radius[u.sonar],
    echoMul: CONFIG.upgrades.sonar.echo[u.sonar],
    boostDrainMul: CONFIG.upgrades.battery.cost[u.battery],
    dmgMul: CONFIG.upgrades.hull.dmg[u.hull] };
}
function accentHex(subId){ const cid = SAVE.subColor[subId] || 'teal'; const c = CONFIG.colors.find(x=>x.id===cid); return c ? c.hex : 0x2ee6c8; }

// ============================ AUDIO (procedural Web Audio) ============================
const AudioSys = {
  ctx:null, growlOsc:null, growlGain:null,
  init(){ if (this.ctx){ Music.resume(); if (this.ctx.state !== 'running') this.armGestureResume(); return; } try {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.growlOsc = this.ctx.createOscillator(); this.growlOsc.type = 'sawtooth'; this.growlOsc.frequency.value = 52;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.growlGain = this.ctx.createGain(); this.growlGain.gain.value = 0;
    this.growlOsc.connect(f); f.connect(this.growlGain); this.growlGain.connect(this.ctx.destination);
    this.growlOsc.start();
    Music.start();
    Ambience.start();
    if (this.ctx.state !== 'running') this.armGestureResume();
  } catch(e) {} },
  // If the context was born suspended (autoplay policy / webview), interval-driven
  // resume() calls are rejected without user activation — so retry the resume inside
  // EVERY genuine gesture (capture phase, any element) until the context runs. This is
  // what removes the old "mute, then unmute, before any sound" dance.
  armGestureResume(){
    if (this._grm || !this.ctx) return; this._grm = true;
    const kick = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'running'){
        document.removeEventListener('pointerdown', kick, true);
        document.removeEventListener('keydown', kick, true);
        this._grm = false; return;
      }
      Music.resume(); Music.applyMode(true);
    };
    document.addEventListener('pointerdown', kick, true);
    document.addEventListener('keydown', kick, true);
  },
  tone(freq, dur, type='sine', gain=0.12, slideTo=null, delay=0){ if (!this.ctx) return; try {
    const t0 = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch(e) {} },
  noiseBurst(dur=0.3, freq=800, gain=0.15){ if (!this.ctx) return; try {
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start();
  } catch(e) {} },
  ping(){ this.tone(920, 0.55, 'sine', 0.14, 210); },
  coin(){ this.tone(1318, 0.07, 'square', 0.05); this.tone(1760, 0.09, 'square', 0.05, null, 0.06); },
  torp(){ this.noiseBurst(0.35, 500, 0.16); this.tone(160, 0.3, 'sawtooth', 0.05, 60); },
  boom(){ this.noiseBurst(0.6, 240, 0.3); this.tone(70, 0.55, 'sine', 0.22, 30); },
  deepBoom(){ this.tone(64, 1.7, 'sine', 0.5, 26); this.tone(38, 2.1, 'sine', 0.34, 24, 0.05); this.noiseBurst(1.1, 130, 0.2); },
  emp(){ this.tone(1200, 0.5, 'sine', 0.1, 90); this.noiseBurst(0.4, 1600, 0.08); },
  hit(){ this.tone(110, 0.22, 'sawtooth', 0.16, 55); this.noiseBurst(0.18, 700, 0.12); },
  gate(){ this.tone(523, 0.16, 'sine', 0.1); this.tone(784, 0.22, 'sine', 0.1, null, 0.13); },
  zap(){ this.tone(rand(760, 980), 0.06, 'square', 0.045, 190); },
  overheat(){ this.noiseBurst(0.28, 2600, 0.06); this.tone(220, 0.2, 'sawtooth', 0.05, 70); },
  // ---- UI feedback: sonar-flavoured menu sounds, deliberately quiet (hover << click) ----
  ui(kind){
    if (!this.ctx || Music.muted()) return;
    if (kind === 'hover') this.tone(1150, 0.05, 'sine', 0.016, 900);          // soft tick
    else if (kind === 'back') this.tone(340, 0.11, 'sine', 0.05, 210);        // deeper negative blip
    else if (kind === 'buy') this.coin();                                     // purchase confirm arpeggio
    else if (kind === 'toggle') this.tone(760, 0.06, 'triangle', 0.045, 990); // pill / mute click
    else this.tone(880, 0.09, 'sine', 0.05, 660);                             // 'click': sonar blip confirm
  },
  setGrowl(level){ if (this.growlGain && this.ctx) { try { this.growlGain.gain.setTargetAtTime(clamp(level,0,0.14), this.ctx.currentTime, 0.15); } catch(e) {} } },
};

// ============================ MUSIC (generative ambient score) ============================
// TWO different compositions, crossfaded by gameMix (~2 s):
//  LOBBY (title / hangar / zones) — the "theme song": dark theme over Am–F–Am–E,
//    deep drone + slow bell motif through a feedback-delay abyss echo.
//  GAME (expedition + survival dives) — a separate piece, NOT a remix: the bell
//    melody is gone entirely; a pulsing A1/E1 sub-bass heartbeat is the backbone,
//    under a sparse two-chord pad drift (Am–F open fifths, two bars each) and the
//    dive-only undertow. A tension layer (heartbeat + minor-2nd pad) tracks
//    hunting hunters / high NOISE and fades with the hunt.
// Music ducks (keeps playing quietly) under pause / boon / end screens.
const MUSIC_STEP = 1.05; // seconds per step; 16 steps = one 4-bar loop
const Music = {
  started:false, bus:null, delay:null, tensionBus:null, padGain:null,
  padFilter:null, motifBus:null, cueBus:null, droneFilter:null,
  step:0, nextStep:0, loop:0, tension:0, nextBeat:0, grindGain:null, _scrapeT:0,
  gameMix:0, _wasSuspended:false,
  engGain:null, engFilter:null, engHum:null, engSaw:null, propGain:null, washGain:null, noiseBuf:null, _creakT:90,
  muted(){ return SAVE.music === 0; },
  mf(m){ return 440 * Math.pow(2, (m - 69) / 12); },
  start(){
    if (this.started || !AudioSys.ctx) return;
    const ctx = AudioSys.ctx; this.started = true;
    try {
      this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(ctx.destination);
      // feedback-delay echo send
      this.delay = ctx.createDelay(1.5); this.delay.delayTime.value = 0.42;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(wet); wet.connect(this.bus);
      // mode-shaping nodes: bells route via motifBus (thinned in dives), pads via
      // padFilter (darkened in dives), one-shots (transition cues) via cueBus.
      this.motifBus = ctx.createGain(); this.motifBus.gain.value = 1; this.motifBus.connect(this.bus);
      this.cueBus = ctx.createGain(); this.cueBus.gain.value = 0.8; this.cueBus.connect(ctx.destination);
      this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 1150;
      this.padFilter.connect(this.bus); this.padFilter.connect(this.delay);
      // ---- drone: A1 + E2 + A2 through a slowly breathing lowpass ----
      const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 210;
      this.droneFilter = df;
      const dg = ctx.createGain(); dg.gain.value = 0.055;
      df.connect(dg); dg.connect(this.bus);
      for (const [f, ty, g] of [[55,'sine',1],[82.41,'sine',0.6],[110,'triangle',0.25]]){
        const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = g; o.connect(og); og.connect(df); o.start();
      }
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
      const lg = ctx.createGain(); lg.gain.value = 70; lfo.connect(lg); lg.connect(df.frequency); lfo.start();
      // ---- tension pad: A2 + Bb2 saws (minor-2nd clash), gain driven by tensionTick ----
      this.tensionBus = ctx.createGain(); this.tensionBus.gain.value = 1; this.tensionBus.connect(ctx.destination);
      const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 360;
      this.padGain = ctx.createGain(); this.padGain.gain.value = 0;
      tf.connect(this.padGain); this.padGain.connect(this.tensionBus);
      for (const f of [110, 116.54]){
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(tf); o.start();
      }
      // ---- submarine bed: engine hum + prop whir + water wash (driven by engineTick) ----
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      this.noiseBuf = nb;
      this.engGain = ctx.createGain(); this.engGain.gain.value = 0; this.engGain.connect(ctx.destination);
      this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 190;
      this.engFilter.connect(this.engGain);
      this.engHum = ctx.createOscillator(); this.engHum.type = 'sine'; this.engHum.frequency.value = 47;
      const hg = ctx.createGain(); hg.gain.value = 0.55; this.engHum.connect(hg); hg.connect(this.engFilter); this.engHum.start();
      this.engSaw = ctx.createOscillator(); this.engSaw.type = 'sawtooth'; this.engSaw.frequency.value = 94;
      const sg = ctx.createGain(); sg.gain.value = 0.16; this.engSaw.connect(sg); sg.connect(this.engFilter); this.engSaw.start();
      const propSrc = ctx.createBufferSource(); propSrc.buffer = nb; propSrc.loop = true;
      const propBp = ctx.createBiquadFilter(); propBp.type = 'bandpass'; propBp.frequency.value = 480; propBp.Q.value = 0.8;
      this.propGain = ctx.createGain(); this.propGain.gain.value = 0;
      propSrc.connect(propBp); propBp.connect(this.propGain); this.propGain.connect(ctx.destination); propSrc.start();
      const washSrc = ctx.createBufferSource(); washSrc.buffer = nb; washSrc.loop = true; washSrc.playbackRate.value = 0.7;
      const washLp = ctx.createBiquadFilter(); washLp.type = 'lowpass'; washLp.frequency.value = 420;
      this.washGain = ctx.createGain(); this.washGain.gain.value = 0;
      washSrc.connect(washLp); washLp.connect(this.washGain); this.washGain.connect(ctx.destination); washSrc.start();
      // ---- collapse grind bed: looped noise, lowpassed — gain driven by tensionTick while the plane moves ----
      this.grindGain = ctx.createGain(); this.grindGain.gain.value = 0;
      const gf = ctx.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 250;
      const gsrc = ctx.createBufferSource(); gsrc.buffer = nb; gsrc.loop = true; gsrc.playbackRate.value = 0.45;
      gsrc.connect(gf); gf.connect(this.grindGain); this.grindGain.connect(ctx.destination); gsrc.start();
      this._creakT = rand(70, 150);
      this.nextStep = ctx.currentTime + 0.15;
      setInterval(()=> this.tick(), 200);
      setInterval(()=> this.tensionTick(), 120);
      setInterval(()=> this.engineTick(), 110);
      this.applyMode(true);
    } catch(e) {}
  },
  resume(){ if (AudioSys.ctx && AudioSys.ctx.state === 'suspended'){ try { AudioSys.ctx.resume(); } catch(e) {} } },
  mode(){
    if (uiState === 'playing') return 'game';
    if (uiState === 'paused' || uiState === 'boon' || uiState === 'end') return 'duck';
    return 'lobby';
  },
  applyMode(snap){
    if (!this.bus) return;
    const m = this.mode(), now = AudioSys.ctx.currentTime;
    const lvl = this.muted() ? 0 : (m === 'lobby' ? 0.20 : m === 'game' ? 0.12 : 0.045);
    try {
      this.bus.gain.setTargetAtTime(lvl, now, snap ? 0.05 : 1.2);
      // mode character: lobby = open pads + full bell motif; dives = dark pads
      // (380 Hz), motif bus closed entirely (the game piece has no bells),
      // drone sunk; duck (pause/end) in between.
      this.padFilter.frequency.setTargetAtTime(m === 'game' ? 380 : m === 'duck' ? 520 : 1150, now, snap ? 0.1 : 0.9);
      this.motifBus.gain.setTargetAtTime(m === 'game' ? 0 : 1, now, snap ? 0.1 : 0.9);
      this.droneFilter.frequency.setTargetAtTime(m === 'game' ? 140 : m === 'duck' ? 170 : 210, now, snap ? 0.1 : 0.9);
      this.cueBus.gain.setTargetAtTime(this.muted() ? 0 : 0.8, now, snap ? 0.05 : 0.4);
    } catch(e) {}
  },
  toggleMute(){
    SAVE.music = this.muted() ? 1 : 0; persist(); this.applyMode();
    const b = $('btn-sound'); if (b) b.textContent = this.muted() ? '🔇' : '🔊';
    toast(this.muted() ? 'Music off (M)' : 'Music on (M)', 1200);
  },
  bell(m, t, vol, decay){
    const ctx = AudioSys.ctx, f = this.mf(m);
    for (const [mult, g, dk] of [[1, 1, 1], [2.76, 0.32, 0.45], [5.4, 0.1, 0.25]]){
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult;
      const og = ctx.createGain();
      og.gain.setValueAtTime(vol * g, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + decay * dk);
      o.connect(og); og.connect(this.motifBus); og.connect(this.delay);
      o.start(t); o.stop(t + decay + 0.05);
    }
  },
  pad(midis, t, dur, vol = 1){
    const ctx = AudioSys.ctx;
    for (const m of midis){
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(m);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.030 * vol, t + 1.4);
      og.gain.setValueAtTime(0.030 * vol, Math.max(t + 1.4, t + dur - 1.2));
      og.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(og); og.connect(this.padFilter);
      o.start(t); o.stop(t + dur + 0.05);
    }
  },
  bass(m, t, vol = 1){
    const ctx = AudioSys.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(m);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.14 * vol, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(og); og.connect(this.bus);
    o.start(t); o.stop(t + 2.7);
  },
  pulse(m, t, vol){ // game-piece backbone: a deep sub-bass throb (sine + faint
    // octave body) sent through the abyss echo — a slow sonar heartbeat.
    const ctx = AudioSys.ctx, f = this.mf(m);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.22;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.bus); g.connect(this.delay);
    o.start(t); o.stop(t + 3); o2.start(t); o2.stop(t + 3);
  },
  scheduleStep(s, t){
    const gm = this.gameMix, lw = 1 - gm; // crossfade weights: game / lobby
    // ---- LOBBY piece: Am–F–Am–E, plucked bass + pad per bar, bell motif ----
    const CH = [ { r:33, pad:[57,60,64] },   // Am
                 { r:29, pad:[53,57,60] },   // F
                 { r:33, pad:[57,60,64] },   // Am
                 { r:28, pad:[52,56,59] } ]; // E
    if (s % 4 === 0 && lw > 0.04){ const c = CH[Math.floor(s / 4)]; this.bass(c.r, t, lw); this.pad(c.pad, t, MUSIC_STEP * 4, lw); }
    const MEL = { 0:69, 2:72, 4:76, 6:74, 8:72, 10:69, 12:67, 14:64 }; // A4 C5 E5 D5 C5 A4 G4 E4
    const m = MEL[s];
    if (m !== undefined && lw > 0.04) this.bell(m, t, 0.105 * lw, 3.6);
    // ---- GAME piece: no bells at all. Sub-bass pulse backbone (strong A1/E1
    // on the bar, softer echo two steps later) + a dark two-chord pad drift:
    // Am – F as open fifths, each held two bars. ----
    if (gm > 0.04){
      if (s % 8 === 0) this.pad(s === 0 ? [45,52,57] : [41,48,53], t, MUSIC_STEP * 8, gm * 1.15);
      if (s % 4 === 0) this.pulse(s % 8 === 0 ? 33 : 28, t, gm);
      else if (s % 4 === 2) this.pulse(s % 8 === 2 ? 33 : 28, t, gm * 0.45);
    }
    // dive undertow: a slow sonar bloom that only exists underwater
    if (gm > 0.35 && s % 8 === 4) this.undertow(t);
  },
  undertow(t){
    const ctx = AudioSys.ctx, gm = this.gameMix;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(49, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * gm, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 2.5);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(392, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.011 * gm, t + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o2.connect(g2); g2.connect(this.bus); o2.start(t); o2.stop(t + 1.7);
  },
  tick(){
    if (!this.started) return;
    this.resume();
    const ctx = AudioSys.ctx;
    // Never schedule against a frozen (suspended) clock — that was the silent-start
    // bug: notes queued at t=0 while suspended. On recovery, re-anchor + snap gains.
    if (ctx.state !== 'running'){ this._wasSuspended = true; return; }
    if (this._wasSuspended){ this._wasSuspended = false; this.nextStep = ctx.currentTime + 0.12; this.applyMode(true); }
    this.applyMode();
    const gmT = this.mode() === 'game' ? 1 : this.mode() === 'duck' ? 0.35 : 0;
    this.gameMix += (gmT - this.gameMix) * 0.09; // ~2 s perceptual crossfade of mode character
    while (this.nextStep < ctx.currentTime + 0.6){
      this.scheduleStep(this.step, this.nextStep);
      this.nextStep += MUSIC_STEP;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.loop++;
    }
  },
  diveCue(){ // soft descending sonar bloom when a run starts
    if (!this.started) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime + 0.02;
    try {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(84, t + 1.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
      o.connect(g); g.connect(this.cueBus); o.start(t); o.stop(t + 1.9);
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(150, t + 1.3);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.05, t + 0.18);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
      src.connect(bp); bp.connect(ng); ng.connect(this.cueBus); src.start(t, 0.4); src.stop(t + 1.4);
    } catch(e) {}
  },
  riseCue(){ // gentle ascending bloom when surfacing to the end screen
    if (!this.started) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime + 0.02;
    try {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(530, t + 1.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.075, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.connect(g); g.connect(this.cueBus); o.start(t); o.stop(t + 1.55);
      this.bell(69, t + 0.55, 0.05, 2.6);
    } catch(e) {}
  },
  engineTick(){ // submarine bed: follows thrust/speed; the M mute silences it too
    if (!this.started || !this.engGain) return;
    const ctx = AudioSys.ctx; if (!ctx) return;
    const m = this.muted() ? 0 : 1;
    let gT = 0, fT = 190, humF = 47, sawF = 94, propT = 0, washT = 0;
    if (uiState === 'playing' && player && G && !G.over){
      const maxSp = Math.max(1, player.d.def.speed * (G.boon ? G.boon.speedMul : 1));
      const sf = clamp(player.vel.length() / maxSp, 0, 1);
      const th = clamp(player.thrust || 0, 0, 1.7) / 1.7;
      const drive = clamp(sf * 0.75 + th * 0.45, 0, 1);
      gT = (0.014 + drive * 0.038) * m;
      fT = 170 + drive * 260; humF = 47 + drive * 24; sawF = 94 + drive * 66;
      propT = drive * drive * 0.016 * m;
      washT = sf * sf * 0.02 * m;
      // hull creaks: rare; sooner when deep or when a hunter is close
      this._creakT -= 1;
      if (this._creakT <= 0){
        let near = false;
        for (const h of G.hunters){ if (!h.dead && h.group.position.distanceToSquared(player.group.position) < 3600){ near = true; break; } }
        const deep = G.mode === 'survival' ? clamp((-player.group.position.y) / 300, 0, 1) : (G.zone ? (G.zone.id - 1) / 4 : 0);
        this._creakT = rand(160, 340) * (1 - deep * 0.35) * (near ? 0.45 : 1);
        this.creak();
      }
    } else if (uiState === 'hangar'){ gT = 0.006 * m; } // faint docked hum
    const now = ctx.currentTime;
    try {
      this.engGain.gain.setTargetAtTime(gT, now, gT > this.engGain.gain.value ? 0.16 : 0.3);
      this.engFilter.frequency.setTargetAtTime(fT, now, 0.25);
      this.engHum.frequency.setTargetAtTime(humF, now, 0.3);
      this.engSaw.frequency.setTargetAtTime(sawF, now, 0.3);
      this.propGain.gain.setTargetAtTime(propT, now, 0.2);
      this.washGain.gain.setTargetAtTime(washT, now, 0.35);
    } catch(e) {}
  },
  creak(){ // short metallic hull groan: bandpass-swept noise, kept very quiet
    if (this.muted() || !this.noiseBuf) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime + 0.02, dur = rand(0.25, 0.5);
    try {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9;
      bp.frequency.setValueAtTime(rand(500, 800), t);
      bp.frequency.exponentialRampToValueAtTime(rand(120, 200), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(rand(0.02, 0.045), t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(t, rand(0, 1.2)); src.stop(t + dur + 0.05);
    } catch(e) {}
  },
  grindScrape(k){ // a rock slab grinding past: bandpass-swept noise, low and slow
    if (!this.started || !AudioSys.ctx || !this.noiseBuf) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime;
    try {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2;
      const dur = rand(0.5, 0.95);
      bp.frequency.setValueAtTime(rand(300, 420), t);
      bp.frequency.exponentialRampToValueAtTime(rand(70, 110), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.028 + 0.075 * k, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(t, rand(0, 1.2)); src.stop(t + dur + 0.05);
    } catch(e) {}
  },
  tensionTick(){
    if (!this.started) return;
    const ctx = AudioSys.ctx;
    let target = 0;
    if (uiState === 'playing' && G && player){
      let nd = Infinity;
      for (const h of G.hunters){
        if (h.dead || h.disabled > 0) continue;
        const hunting = h.state === 'hunting' || (h.typeId === 'lurker' && h.lurkState === 'dash');
        if (hunting){ const d = h.group.position.distanceTo(player.group.position); if (d < nd) nd = d; }
      }
      if (nd !== Infinity) target = clamp(1.15 - nd / 85, 0.3, 1);
      else if (G.noise > 62) target = 0.22 * clamp((G.noise - 62) / 38, 0, 1);
    }
    this.tension += (target - this.tension) * (target > this.tension ? 0.3 : 0.06); // fast in, slow out
    if (target === 0 && this.tension < 0.01) this.tension = 0;
    const duckScale = (uiState === 'paused' || uiState === 'boon' || uiState === 'end') ? 0.35 : 1;
    try { this.padGain.gain.setTargetAtTime(this.muted() ? 0 : this.tension * 0.05 * duckScale, ctx.currentTime, 0.25); } catch(e) {}
    if (!this.muted() && this.tension > 0.05 && uiState === 'playing' && ctx.currentTime >= this.nextBeat){
      this.thump(ctx.currentTime, 0.34 * this.tension);
      this.thump(ctx.currentTime + 0.17, 0.22 * this.tension);
      this.nextBeat = ctx.currentTime + lerp(1.15, 0.42, this.tension);
    }
    // collapse grind (Akmal 19 Nov): while the plane moves, a rock-grinding
    // bed swells with proximity, with random slab scrapes over it.
    if (this.grindGain){
      let gT = 0;
      if (uiState === 'playing' && G && G.mode === 'survival' && !G.over && G.collapseMoving) gT = 0.025 + 0.085 * (G.collapseProx || 0);
      try { this.grindGain.gain.setTargetAtTime(this.muted() ? 0 : gT * duckScale, ctx.currentTime, 0.3); } catch(e) {}
      if (gT > 0 && ctx.currentTime >= (this._scrapeT || 0) && Math.random() < 0.55){ this._scrapeT = ctx.currentTime + rand(0.7, 2.4) * (1.2 - (G.collapseProx || 0)); this.grindScrape(0.3 + 0.7 * (G.collapseProx || 0)); }
    }
  },
  thump(t, vol){
    const ctx = AudioSys.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(66, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.13);
    const og = ctx.createGain();
    og.gain.setValueAtTime(vol, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(og); og.connect(this.tensionBus);
    o.start(t); o.stop(t + 0.2);
  },
};

// ============================ UNDERWATER AMBIENCE ============================
// A dive-only layer UNDER the music: a soft breathing water bed (looped noise
// through a slowly-wandering lowpass + a deep rumble sine) plus sparse random
// one-shots — rising bubble streams, a distant whale-like moan, sonar echoes
// from nowhere. Deeper water biases the palette lower and sparser. NOT
// duplicated here: hull creaks (Music.creak), crystal pickup (AudioSys.coin),
// gate opening (AudioSys.gate), boss warning tone — those already exist.
const Ambience = {
  started: false, bedGain: null, nextShot: 0,
  start(){
    if (this.started || !AudioSys.ctx || !Music.noiseBuf) return;
    const ctx = AudioSys.ctx;
    try {
      const src = ctx.createBufferSource(); src.buffer = Music.noiseBuf; src.loop = true; src.playbackRate.value = 0.32;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
      this.bedGain = ctx.createGain(); this.bedGain.gain.value = 0;
      src.connect(f); f.connect(this.bedGain); this.bedGain.connect(ctx.destination);
      src.start();
      const rum = ctx.createOscillator(); rum.type = 'sine'; rum.frequency.value = 44;
      const rg = ctx.createGain(); rg.gain.value = 0.35; rum.connect(rg); rg.connect(this.bedGain); rum.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = ctx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      this.nextShot = ctx.currentTime + rand(4, 9);
      setInterval(() => this.tick(), 400);
      this.started = true;
    } catch(e) {}
  },
  depth01(){ // 0 = bright shallows → 1 = the deep strata / last zones
    if (!G) return 0;
    if (G.mode === 'survival') return clamp(0.3 + (G.stratum || 0) * 0.14 + clamp(-player.group.position.y / 600, 0, 0.25), 0, 1);
    const zi = G.zone ? CONFIG.zones.indexOf(G.zone) : 0;
    return clamp((zi < 0 ? 0 : zi) / 4, 0, 1);
  },
  tick(){
    if (!this.bedGain || !AudioSys.ctx) return;
    const ctx = AudioSys.ctx, mode = Music.mode();
    // bed follows the dive: full in a dive, ducked on pause/end screens, off in menus; mute wins over all
    const target = Music.muted() ? 0 : mode === 'game' ? 0.034 : mode === 'duck' ? 0.016 : 0;
    try { this.bedGain.gain.setTargetAtTime(target, ctx.currentTime, 1.4); } catch(e) {}
    if (mode !== 'game' || Music.muted() || ctx.currentTime < this.nextShot) return;
    this.shot();
    this.nextShot = ctx.currentTime + rand(6, 18) * (1 + this.depth01() * 0.5);
  },
  shot(kind){
    const deep = this.depth01();
    const k = kind || pick(['bubbles', 'bubbles', 'whale', 'echo']);
    try {
      if (k === 'bubbles'){ // a rising stream of plops, each one higher than the last
        const n = randi(3, 6), f0 = rand(500, 800) * (1 - deep * 0.25);
        for (let i = 0; i < n; i++) AudioSys.tone(f0 * (1 + i * rand(0.12, 0.3)), 0.07, 'sine', 0.02, f0 * 1.8, i * rand(0.07, 0.13));
      } else if (k === 'whale'){ // distant moan: a slow sine glide down + a faint harmonic (a sine at ~100 Hz needs no filter)
        const f = rand(82, 120) * (1 - deep * 0.3);
        AudioSys.tone(f, 2.6, 'sine', 0.035, f * 0.62);
        AudioSys.tone(f * 1.5, 2.2, 'sine', 0.012, f * 0.9, 0.3);
      } else { // 'echo': a sonar ping from nowhere, answered once, weaker
        const f = rand(620, 760) * (1 - deep * 0.15);
        AudioSys.tone(f, 0.8, 'sine', 0.022, f * 0.55);
        AudioSys.tone(f, 0.7, 'sine', 0.01, f * 0.5, 0.55);
      }
    } catch(e) {}
  }
};

// ============================ THREE SETUP ============================
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(66, window.innerWidth/window.innerHeight, 0.1, 1200);
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================ ASSET SYSTEM ============================
// Tries models/<name>.glb; falls back to a primitive placeholder.
// Swapping in real GLBs later needs zero code changes.
const glbCache = {};   // name -> normalized template Group | null
function normalizeGLB(obj, target, name){
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  obj.scale.setScalar(target / maxDim);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = new THREE.Vector3(); box2.getCenter(c);
  obj.position.sub(c);
  const wrap = new THREE.Group(); wrap.add(obj);
  const yawFix = ((CONFIG.assetYawFix && CONFIG.assetYawFix['*']) || 0) + ((name && CONFIG.assetYawFix && CONFIG.assetYawFix[name]) || 0);
  if (yawFix) wrap.rotation.y = yawFix;
  return wrap;
}
async function preloadAssets(){
  const loader = new GLTFLoader();
  await Promise.all(CONFIG.assets.map(name => new Promise(res => {
    let done = false;
    const finish = v => { if (!done){ done = true; glbCache[name] = v; res(); } };
    const to = setTimeout(()=> finish(null), 4000);
    loader.load('models/' + name + '.glb',
      g => { clearTimeout(to); try { finish(normalizeGLB(g.scene, CONFIG.assetSize[name], name)); } catch(e){ finish(null); } },
      undefined,
      () => { clearTimeout(to); finish(null); });
  })));
}
function std(color, opts={}){ return new THREE.MeshStandardMaterial(Object.assign({ color, roughness:0.55, metalness:0.35, emissive:color, emissiveIntensity:0.06 }, opts)); }
function glowBall(r, hex){ const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color:hex })); m.userData.noReveal = true; return m; }

function buildPlaceholder(name){
  const g = new THREE.Group();
  const accentMats = [];
  const accentStd = hex => { const m = std(hex, { emissiveIntensity:0.5 }); accentMats.push(m); return m; };
  if (name.startsWith('sub-')){
    const id = name.slice(4), s = CONFIG.subs[id];
    const body = new THREE.Group();
    const hullMat = std(s.tint);
    const R = 1.15 * (id==='leviathan' ? 1.15 : 1), L = 3.4;
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(R, L, 6, id==='phantom' ? 6 : 14), hullMat);
    hull.rotation.x = Math.PI/2; body.add(hull);
    if (id === 'barracuda'){ const nose = new THREE.Mesh(new THREE.ConeGeometry(R*0.92, 2.4, 14), hullMat); nose.rotation.x = Math.PI/2; nose.position.z = L/2 + R + 1.1; body.add(nose);
      for (const sx of [-0.55, 0.55]){ const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,1.1,10), std(0x222222)); tube.rotation.x = Math.PI/2; tube.position.set(sx, -0.45, L/2 + R + 0.4); body.add(tube); } }
    if (id === 'mule'){ for (const sx of [-1.35, 1.35]){ const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 3.6), std(0x6b5a26)); pod.position.set(sx, -0.1, 0); body.add(pod); } }
    if (id === 'leviathan'){ for (const px of [-1.5, 1.5]){ const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.5,1.0,10), hullMat); tur.position.set(px, R + 0.5, 0.6); body.add(tur);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,1.5,8), std(0x222222)); barrel.rotation.x = Math.PI/2; barrel.position.set(px, R + 0.62, 1.4); body.add(barrel); } }
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 1.7), hullMat); tower.position.set(0, R + 0.4, 0.35); body.add(tower);
    const finT = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.8), hullMat); finT.position.set(0, 0.75, -L/2 - R + 0.3); body.add(finT);
    const finB = finT.clone(); finB.position.y = -0.75; body.add(finB);
    for (const sx of [-1, 1]){ const fin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.8), hullMat); fin.position.set(sx * (R + 0.5), 0, -L/2 - R + 0.3); body.add(fin); }
    const prop = new THREE.Group(); prop.position.z = -L/2 - R - 0.25;
    for (let i=0;i<3;i++){ const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.05), std(0x888888)); blade.rotation.z = i * Math.PI*2/3; prop.add(blade); }
    body.add(prop); g.userData.spin = prop;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(R + 0.03, 0.09, 8, 24), accentStd(0x2ee6c8)); stripe.position.z = 0.9; body.add(stripe);
    for (const sx of [-0.8, 0.8]){ const lamp = glowBall(0.13, 0xbffcff); lamp.position.set(sx, 0.25, L/2 + R - 0.4); body.add(lamp); }
    g.add(body); g.userData.body = body;
  }
  else if (name === 'hunter' || name === 'hunter-brute' || name === 'hunter-sentry'){
    const core = glowBall(name === 'hunter-brute' ? 0.55 : 0.4, 0x2e7fd9);
    if (name === 'hunter-sentry'){
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 1.0, 10), std(0x443a5e)); base.position.y = -2.2; g.add(base);
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 2.6, 8), std(0x54447a)); column.position.y = -0.6; g.add(column);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 14, 10, 0, Math.PI*2, 0, Math.PI/2), std(0x5a4a86)); dome.position.y = 0.7; g.add(dome);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.14, 8, 28), std(0x8a76c9, { emissiveIntensity:0.4 })); ring.rotation.x = Math.PI/2; ring.position.y = 0.4; g.add(ring);
      g.userData.spin = ring;
      core.position.set(0, 0.55, 1.35); g.add(core);
      for (let i=0;i<5;i++){ const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 6), std(0x332a4a)); const a = i/5 * Math.PI*2; spike.position.set(Math.cos(a)*1.9, -1.5, Math.sin(a)*1.9); spike.rotation.z = Math.cos(a)*0.7; spike.rotation.x = -Math.sin(a)*0.7; g.add(spike); }
    } else {
      const brute = name === 'hunter-brute';
      const mat = std(brute ? 0x6b5138 : 0x3d5a68);
      const bodyM = new THREE.Mesh(new THREE.SphereGeometry(brute ? 1.9 : 1.35, 14, 12), mat);
      bodyM.scale.set(brute ? 1.15 : 1, brute ? 1.0 : 0.82, 2.1); g.add(bodyM);
      const head = new THREE.Mesh(new THREE.ConeGeometry(brute ? 1.25 : 0.9, brute ? 2.4 : 1.9, 10), mat);
      head.rotation.x = Math.PI/2; head.position.z = 3.1; g.add(head);
      for (const sx of [-1, 1]){ const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 6), std(0xcccccc)); jaw.rotation.x = Math.PI/2 + 0.5; jaw.position.set(sx*0.45, -0.55, 3.2); g.add(jaw);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.9), mat); fin.position.set(sx * (brute ? 2.1 : 1.5), 0.3, -0.4); fin.rotation.z = sx * 0.5; g.add(fin); }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.0, 1.3), mat); tail.position.set(0, 0.4, -3.1); g.add(tail);
      if (brute){ for (let i=0;i<4;i++){ const plate = new THREE.Mesh(new THREE.BoxGeometry(1.7 - i*0.2, 0.35, 1.15), std(0x84704e, { metalness:0.6 })); plate.position.set(0, 1.75 - i*0.12, 1.3 - i*1.05); g.add(plate); }
        for (const sx of [-1,1]){ const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 7), std(0xd8cfb8)); horn.position.set(sx*1.15, 0.75, 3.3); horn.rotation.x = Math.PI/2.4; g.add(horn); } }
      core.position.set(0, -0.5, 2.2); g.add(core);
    }
    g.userData.core = core;
  }
  else if (name === 'decoy'){
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), std(0x707880, { metalness:0.6 })); g.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 8, 22), accentStd(0x2ee6c8)); ring.rotation.x = Math.PI/2; g.add(ring); g.userData.spin = ring;
    const tip = glowBall(0.2, 0x2ee6c8); tip.position.y = 1.0; g.add(tip); g.userData.core = tip;
  }
  else if (name === 'crystal'){
    const mat = std(0x37e0d0, { emissiveIntensity:0.85, roughness:0.2 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), std(0x2a3138)); rock.position.y = -0.9; rock.scale.y = 0.6; g.add(rock);
    const big = new THREE.Mesh(new THREE.OctahedronGeometry(1.25), mat); big.position.y = 0.55; big.rotation.z = 0.25; g.add(big);
    const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), mat); s1.position.set(1.05, 0, 0.4); s1.rotation.z = -0.5; g.add(s1);
    const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mat); s2.position.set(-1.0, -0.1, -0.5); s2.rotation.x = 0.6; g.add(s2);
  }
  else if (name === 'gate'){
    const mat = std(0x4a5560, { metalness:0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.85, 10, 40), mat); g.add(ring);
    g.userData.ringMat = ring.material;
    for (const sx of [-1, 1]){ const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 17, 2.6), mat); pillar.position.set(sx * 11.5, -3.5, 0); g.add(pillar);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 3.4), mat); cap.position.set(sx * 11.5, 5.6, 0); g.add(cap); }
    const shard = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.0, 2.2), mat); shard.position.set(-4, 11.8, 0); shard.rotation.z = 0.35; g.add(shard);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.22, 8, 36), std(0xff4d6d, { emissiveIntensity:0.7 }));
    g.add(inner); g.userData.innerMat = inner.material;
  }
  else if (name === 'torpedo'){
    const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.5, 4, 10), std(0x9aa4ac, { metalness:0.65 })); bodyM.rotation.x = Math.PI/2; g.add(bodyM);
    const tip = glowBall(0.17, 0xffc93a); tip.position.z = 1.15; g.add(tip);
    for (let i=0;i<3;i++){ const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.4), std(0x666666)); const a = i/3*Math.PI*2; fin.position.set(Math.cos(a)*0.3, Math.sin(a)*0.3, -0.95); fin.rotation.z = a; g.add(fin); }
  }
  g.userData.accentMats = accentMats;
  return g;
}
function makeAsset(name){
  const g = new THREE.Group();
  const tpl = glbCache[name];
  if (tpl){ const c = tpl.clone(true); g.add(c); g.userData.isGLB = true; }
  else { const ph = buildPlaceholder(name); g.add(ph); g.userData.accentMats = ph.userData.accentMats; g.userData.spin = ph.userData.spin; g.userData.body = ph.userData.body; g.userData.core = ph.userData.core; g.userData.ringMat = ph.userData.ringMat; g.userData.innerMat = ph.userData.innerMat; }
  // NOTE: per-model facing fixes (CONFIG.assetYawFix) are applied on the loader
  // wrap inside normalizeGLB, NOT here — an outer-group rotation would be
  // overwritten by the movement lookAt on hunters and would double-apply
  // against the wrap for anything stationary.
  return g;
}
function setAccent(group, hex){
  const mats = group.userData.accentMats || [];
  for (const m of mats){ if (m.color) m.color.setHex(hex); if (m.emissive) m.emissive.setHex(hex); }
  group.traverse(o => { if (o.userData && o.userData.accentMat){ o.userData.accentMat.color.setHex(hex); } });
}

// ============================ ABYSS FORGE ============================
// In-game vessel forge: the player describes a submarine, the Lux3D API
// (api.aholo.ai) generates the 3D model, and it becomes a playable sub.
// BYOK: the player's own API key is kept only in this browser
// (localStorage 'pf_forge_key') and sent only to api.aholo.ai. Model
// blobs live in IndexedDB (localStorage is far too small for ~10 MB GLBs);
// SAVE.forged holds the metadata + derived stats.
const FORGE_API = 'https://api.aholo.ai/global';
const forgeState = { busy:false, status:'', err:false };

function forgeDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('pingfall-forge', 1);
    r.onupgradeneeded = () => { try { r.result.createObjectStore('glbs'); } catch(e) {} };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function forgePut(id, blob){
  const db = await forgeDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('glbs', 'readwrite');
    tx.objectStore('glbs').put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function forgeGet(id){
  const db = await forgeDB();
  return new Promise((res, rej) => {
    const rq = db.transaction('glbs').objectStore('glbs').get(id);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  });
}

// The description is an engineering spec: keywords trade stats off.
function forgeStats(prompt){
  const p = ' ' + String(prompt || '').toLowerCase() + ' ';
  const d = { speed:24, hull:130, battery:120, sonarMul:1.1, torpDmg:50, torpCap:6, decoyCap:3,
              empR:30, empDur:4, noiseMul:0.9, crystalMul:1.1, scale:1.05, tint:0xd6336c };
  const has = re => re.test(p);
  if (has(/fast|swift|quick|speed|cepat|kencang|laju|高速|快/)) { d.speed += 4; d.hull -= 15; }
  if (has(/armor|armour|steel|baja|kuat|tank|heavy|giant|besar|raksasa|装甲|重/)) { d.hull += 40; d.speed -= 3; }
  if (has(/silent|stealth|senyap|hantu|ghost|quiet|隐形|静/)) { d.noiseMul *= 0.6; d.hull -= 10; }
  if (has(/glow|neon|bright|luminous|terang|cahaya|发光|霓虹/)) { d.sonarMul += 0.2; d.noiseMul += 0.15; }
  if (has(/battery|endurance|baterai|awet|续航/)) { d.battery += 20; }
  if (has(/torpedo|weapon|senjata|tempur|war|鱼雷|武器/)) { d.torpDmg = 100; d.torpCap += 2; }
  if (has(/gold|treasure|emas|harta|黄金|宝藏/)) { d.crystalMul = 1.3; }
  if (has(/gold|emas|黄金/)) d.tint = 0xb08a2e;
  else if (has(/blue|biru|蓝/)) d.tint = 0x2e6fb3;
  else if (has(/green|hijau|绿/)) d.tint = 0x3f9e4d;
  else if (has(/red|merah|红/)) d.tint = 0xb33a2e;
  else if (has(/black|hitam|黑/)) d.tint = 0x23272e;
  else if (has(/purple|ungu|紫/)) d.tint = 0x7a4fd0;
  else if (has(/silver|perak|银/)) d.tint = 0x9aa7b1;
  d.speed = clamp(d.speed, 12, 32); d.hull = clamp(d.hull, 80, 240);
  d.battery = clamp(d.battery, 90, 150); d.sonarMul = clamp(d.sonarMul, 0.8, 1.4);
  d.noiseMul = clamp(d.noiseMul, 0.4, 1.3);
  return d;
}

function registerForgedSub(meta, scene){
  CONFIG.subs[meta.id] = meta.def;
  CONFIG.assetSize[meta.def.asset] = 8;
  if (scene) { try { glbCache[meta.def.asset] = normalizeGLB(scene, 8, meta.def.asset); } catch(e) { glbCache[meta.def.asset] = null; } }
  if (!SAVE.subs.includes(meta.id)) SAVE.subs.push(meta.id);
}

async function loadForgedSubs(){
  try {
    if (!Array.isArray(SAVE.forged)) SAVE.forged = [];
    const loader = new GLTFLoader();
    for (const meta of SAVE.forged){
      try {
        registerForgedSub(meta, null);
        const blob = await forgeGet(meta.id);
        if (blob){
          const ab = await blob.arrayBuffer();
          const g = await loader.parseAsync(ab, '');
          registerForgedSub(meta, g.scene);
        }
      } catch(e) { /* a missing model degrades to the placeholder hull */ }
    }
  } catch(e) {}
}

function forgeSetStatus(txt, isErr){
  forgeState.status = txt; forgeState.err = !!isErr;
  const el = $('forge-status');
  if (el){ el.textContent = txt; el.className = 'forge-status' + (isErr ? ' err' : ''); }
}

function renderForgePanel(){
  const keyEl = $('forge-key');
  if (keyEl && !keyEl.value) { try { keyEl.value = localStorage.getItem('pf_forge_key') || ''; } catch(e) {} }
  forgeSetStatus(forgeState.status, forgeState.err);
  updateForgePreview();
  const list = $('forge-list'); if (!list) return;
  list.innerHTML = '';
  if (!SAVE.forged.length){
    list.innerHTML = '<div class="forge-empty">' + t('No forged vessels yet. Your first creation docks here.') + '</div>';
    return;
  }
  for (const meta of SAVE.forged){
    const it = document.createElement('div'); it.className = 'forge-item';
    it.innerHTML = `<b>${meta.def.name}</b> · ${meta.def.role}<div class="fp">“${meta.prompt.replace(/</g, '&lt;')}”</div>`;
    const b = document.createElement('button'); b.className = 'btn small';
    b.textContent = SAVE.sub === meta.id ? t('SELECTED') : t('SELECT');
    b.disabled = SAVE.sub === meta.id;
    b.onclick = () => { SAVE.sub = meta.id; hangarViewId = meta.id; persist(); buildHangar(); refreshHangarPreview(); renderForgePanel(); toast(meta.def.name + ' selected'); };
    it.appendChild(b);
    list.appendChild(it);
  }
}

function updateForgePreview(){
  const ta = $('forge-prompt'), pv = $('forge-stats'), cnt = $('forge-count');
  if (!ta || !pv) return;
  if (cnt) cnt.textContent = ta.value.length + ' / 200';
  const d = forgeStats(ta.value);
  pv.textContent = ta.value.trim().length >= 3
    ? (SAVE.lang === 'zh'
      ? `预计规格——速度 ${d.speed} · 船体 ${d.hull} · 电池 ${d.battery} · 声呐 ×${d.sonarMul.toFixed(2)} · 噪音 ${Math.round(d.noiseMul * 100)}% · 鱼雷 ${d.torpDmg}`
      : `Projected spec — Speed ${d.speed} · Hull ${d.hull} · Battery ${d.battery} · Sonar ×${d.sonarMul.toFixed(2)} · Noise ${Math.round(d.noiseMul * 100)}% · Torpedo ${d.torpDmg}`)
    : '';
}

async function forgeFetch(path, key, opts = {}){
  const r = await fetch(FORGE_API + path, { ...opts, headers: { 'Authorization': key, 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error('Lux3D API HTTP ' + r.status);
  return r.json();
}

async function runForge(){
  if (forgeState.busy) return;
  const key = ($('forge-key').value || '').trim();
  const prompt = ($('forge-prompt').value || '').trim();
  if (!key){ forgeSetStatus('Paste your Lux3D API key first — it never leaves this browser.', true); return; }
  if (prompt.length < 10){ forgeSetStatus('Describe your vessel in at least a few words (10+ characters).', true); return; }
  try { localStorage.setItem('pf_forge_key', key); } catch(e) {}
  forgeState.busy = true;
  const btn = $('btn-do-forge'); btn.disabled = true; btn.textContent = '⚒ FORGING…';
  const t0 = Date.now();
  const elapsed = () => Math.floor((Date.now() - t0) / 1000);
  try {
    forgeSetStatus('Contacting the Lux3D forge…');
    const created = await forgeFetch('/lux3d/v1/generate/text-to-3d/task/create', key, {
      method: 'POST',
      body: JSON.stringify({ prompt, style: 'cartoon', version: 'G1-Turbo', faceCount: 50000, outputFormat: ['glb'] }),
    });
    if (!created || created.c !== '0' || !created.d) throw new Error((created && created.m) || 'The forge refused the request — check the API key.');
    const taskId = created.d;
    forgeSetStatus('The forge is working — this usually takes 3–4 minutes…');
    let url = null;
    while (Date.now() - t0 < 12 * 60 * 1000){
      await new Promise(r => setTimeout(r, 15000));
      forgeSetStatus(`Forging your vessel… ${elapsed()}s elapsed (usually 180–240s)`);
      const q = await forgeFetch('/lux3d/v1/generate/task/get?taskid=' + taskId, key);
      if (q && q.f) throw new Error(q.m || 'The forge failed this vessel.');
      if (q && q.d && Array.isArray(q.d.outputs) && q.d.outputs.length){ url = q.d.outputs[0].content; break; }
    }
    if (!url) throw new Error('The forge is taking unusually long — your credits were charged only on success; try again in a while.');
    forgeSetStatus('Vessel forged — bringing her into the hangar…');
    const blob = await (await fetch(url)).blob();
    const seq = SAVE.forgeSeq || 2;
    const id = 'forge' + seq;
    const name = 'FORGE-' + String(seq).padStart(2, '0');
    const def = { name, asset: 'sub-' + id, role: 'Abyss Forge', price: 0, ...forgeStats(prompt),
                  note: 'Forged by the Lux3D API from your description: “' + prompt.slice(0, 60) + '”' };
    const meta = { id, prompt, def };
    await forgePut(id, blob);
    const ab = await blob.arrayBuffer();
    const g = await new GLTFLoader().parseAsync(ab, '');
    registerForgedSub(meta, g.scene);
    SAVE.forged.push(meta); SAVE.forgeSeq = seq + 1;
    SAVE.sub = id; hangarViewId = id;
    persist(); buildHangar(); refreshHangarPreview(); renderForgePanel();
    forgeSetStatus(`${name} has docked in your hangar — she is already selected. Dive well, captain.`);
    toast(name + ' forged and docked');
  } catch(e) {
    const m = e && e.message ? e.message : String(e);
    forgeSetStatus(/failed to fetch|networkerror/i.test(m)
      ? 'Forge failed: the browser could not read the Lux3D response. This almost always means the API key was rejected — the API hides its real error from browsers. Re-copy your fresh key from labs.aholo.ai/api-keys and try again.'
      : 'Forge failed: ' + m, true);
  } finally {
    forgeState.busy = false;
    btn.disabled = false; btn.textContent = '⚒ FORGE MY VESSEL';
  }
}

// ============================ LANGUAGE (EN / 中文) ============================
// English is the source string; STR_ZH maps it to Simplified Chinese.
// Static markup carries data-i18n (innerHTML) / data-i18n-ph (placeholder);
// dynamic strings route through t(). SAVE.lang persists the choice.
const STR_ZH = {
  '— A B Y S S —<br>Ping to see. Ping and be heard.': '— 深 渊 —<br>以声探路，以声招敌。',
  '▶ EXPEDITION': '▶ 探险', '▼ SURVIVAL': '▼ 生存', 'DIVE — SURVIVAL': '潜入 —— 生存',
  'CALM · coins ×0.5': '平静 · 金币 ×0.5', 'STANDARD · ×1': '标准 · ×1', 'NIGHTMARE · ×2': '噩梦 · ×2',
  '⚓ HANGAR': '⚓ 机库', '? HOW TO PLAY': '? 玩法说明', 'HOW TO PLAY': '玩法说明',
  'Wallet: 🪙 <span class="coins" id="title-coins">0</span> · Best depth <span id="title-depth">—</span> · Best survival <span id="title-time">—</span>': '钱包： 🪙 <span class="coins" id="title-coins">0</span> · 最深深度 <span id="title-depth">—</span> · 最佳生存 <span id="title-time">—</span>',
  'Powered by Aholo Lux3D': '由 Aholo Lux3D 驱动',
  '📱 Menus, hangar and the forge work by touch — diving itself needs a keyboard & mouse.': '📱 菜单、机库和锻造炉支持触控——但潜入航行需要键盘和鼠标。',
  'EXPEDITION — SELECT ZONE': '探险 —— 选择区域', '← BACK': '← 返回', '← BACK TO HANGAR': '← 返回机库',
  'Click a sub to preview it · drag on the water to rotate · scroll to zoom': '点击潜艇预览 · 拖动水面旋转 · 滚轮缩放',
  'UPGRADES': '升级', 'SUPPLIES': '补给',
  'Describe the vessel you dream of. The forge reads your words as an engineering spec — ask for speed and you trade hull for it — then the Lux3D API builds her in about 3–4 minutes. She is one of one: no other captain sails her.': '描述你梦想中的潜艇。锻造炉会把你的文字当作工程规格来解读——想要速度，就得用船体来交换——随后 Lux3D API 会在约 3–4 分钟内把她建造出来。她是独一无二的：没有第二位船长能驾驶她。',
  'Lux3D API key <span>— stays in this browser only · get a free key at <a href="https://labs.aholo.ai/api-keys" target="_blank" rel="noopener">labs.aholo.ai/api-keys</a></span>': 'Lux3D API 密钥 <span>— 只保存在此浏览器中 · 在 <a href="https://labs.aholo.ai/api-keys" target="_blank" rel="noopener">labs.aholo.ai/api-keys</a> 免费获取</span>',
  'Paste your Lux3D API key': '粘贴你的 Lux3D API 密钥',
  'Describe your vessel <span id="forge-count">0 / 200</span>': '描述你的潜艇 <span id="forge-count">0 / 200</span>',
  'A swift magenta raider with a glass dome, silent thrusters and a heart of gold...': '一艘迅捷的品红色突袭艇，配有玻璃穹顶、静音推进器和一颗金子般的心……',
  '⚒ FORGE MY VESSEL': '⚒ 锻造我的潜艇', 'YOUR FORGED FLEET': '你锻造的舰队',
  'No forged vessels yet. Your first creation docks here.': '尚无锻造的潜艇。你的第一件作品将停靠在这里。',
  'The trench is pitch black. Your <b style="color:var(--ink)">sonar ping</b> briefly reveals crystals, hunters and the gate — but every ping is <b style="color:var(--ink)">noise</b>, and the hunters are blind things that hunt by sound. Ping to see. Ping and be heard.': '海沟里漆黑一片。你的<b style="color:var(--ink)">声呐探测</b>能短暂照亮水晶、猎手与大门——但每一次探测都是<b style="color:var(--ink)">噪音</b>，而猎手是靠声音捕猎的盲兽。用声呐看路，也被声呐暴露。',
  'Thrust forward / back (mouse steers, click water to lock pointer)': '向前 / 向后推进（鼠标转向，点击水面锁定指针）',
  'Strafe': '侧移', 'Rise / sink (direct vertical thrust)': '上浮 / 下沉（直接垂直推进）',
  'Turn / pitch (when pointer is not locked)': '转向 / 俯仰（指针未锁定时）',
  'Sonar ping — reveals the world, 30 s cooldown, makes noise': '声呐探测——揭示周围世界，冷却 30 秒，会发出噪音',
  'Boost — +70% speed while held, drains the BOOST meter, much louder': '加速——按住时速度 +70%，消耗 BOOST 能量条，噪音大得多',
  'Pulse cannon — rapid bolts, no ammo but it OVERHEATS (watch the PULSE HEAT bar)': '脉冲炮——快速连发，无需弹药但会过热（注意 PULSE HEAT 条）',
  'Fire torpedo — heavy damage, limited stock': '发射鱼雷——高伤害，库存有限',
  'Drop sonar decoy — hunters chase its noise instead of you': '投放声呐诱饵——猎手会追逐它的噪音而不是你',
  'EMP pulse — disables nearby hunters (cooldown)': '电磁脉冲——使附近猎手瘫痪（有冷却）',
  'Pause': '暂停', 'Music + ambience on / off': '音乐与氛围音 开 / 关',
  'Collect 💎 crystals for coins. Finish the zone mission to open the gate, then swim through it. Hunter core lights: <span style="color:#59d7ff">blue = dormant</span>, <span style="color:#ffb84d">amber = curious</span>, <span style="color:#ff4d6d">red = hunting you</span>. Run silent and slow to stay unheard. Earn stars: finish (★), +70% crystals (★★), all crystals (★★★). One golden crystal hides in every zone…': '收集 💎 水晶换取金币。完成区域任务以打开大门，然后游过去。猎手核心灯光：<span style="color:#59d7ff">蓝色 = 休眠</span>，<span style="color:#ffb84d">琥珀色 = 好奇</span>，<span style="color:#ff4d6d">红色 = 正在猎杀你</span>。保持安静、慢速航行以免被听见。赢得星星：完成（★）、收集 70% 水晶（★★）、全部水晶（★★★）。每个区域都藏着一颗金色水晶……',
  'PAUSED': '已暂停', 'RESUME': '继续', 'RESTART DIVE': '重新潜入', 'ABANDON DIVE': '放弃潜入',
  '🧭 New captain? Start with Expedition Zone 1 — it teaches you as you dive.': '🧭 新船长？先玩探险模式第 1 区——它会边潜边教你。',
  'W thrust · Mouse steer · R/C rise/sink · SHIFT boost · SPACE ping · HOLD Click pulse cannon · F torpedo · Q decoy · E EMP · Esc pause': 'W 推进 · 鼠标转向 · R/C 上浮/下沉 · SHIFT 加速 · 空格 声呐 · 按住点击 脉冲炮 · F 鱼雷 · Q 诱饵 · E 电磁脉冲 · Esc 暂停',
  'SELECTED': '已选择', 'SELECT': '选择', 'OWNED': '已拥有', 'BUY': '购买',
  'Speed': '速度', 'Hull': '船体', 'Sonar': '声呐', 'Torpedo dmg': '鱼雷伤害', 'Decoys': '诱饵', 'Torps': '鱼雷', 'Hull integrity': '船体完整度',
  '▼ DIVE': '▼ 潜入', '🔒 LOCKED': '🔒 未解锁',
  'Mission': '任务', 'Hunters': '猎手', 'Jellyfish': '水母', 'Escape bonus': '逃脱奖励', 'Recommended': '推荐', 'coins each': '金币/颗',
  'Collect crystals': '收集水晶', 'Rescue the mini-sub': '营救迷你潜艇',
};
function t(en){
  if (SAVE.lang !== 'zh') return en;
  return STR_ZH[en] || STR_ZH[String(en).replace(/\s+/g, ' ')] || en;
}
function applyLang(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('.langbtn').forEach(b => b.classList.toggle('sel', b.dataset.lang === (SAVE.lang || 'en')));
  document.documentElement.lang = SAVE.lang === 'zh' ? 'zh-CN' : 'en';
  buildHangar(); buildZoneCards();
  if (typeof updateForgePreview === 'function') updateForgePreview();
  refreshCoinLabels();
}

// ============================ SONAR REVEAL ============================
let revealables = [];
function registerReveal(root, opts={}){
  const entries = [];
  root.traverse(o => {
    if (o.isMesh && !o.userData.noReveal){
      const wasArray = Array.isArray(o.material);
      const list = (wasArray ? o.material : [o.material]).map(m => m.clone());
      o.material = wasArray ? list : list[0];
      for (const m of list) entries.push({ m, c: m.color ? m.color.clone() : new THREE.Color(0x000000),
        e: m.emissive ? m.emissive.clone() : null, ei: (m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1) });
    }
  });
  root.userData.reveal = { at: -1e9, entries, min: (opts.min !== undefined ? opts.min : 0.05), dur: CONFIG.sonar.revealDur, prox: opts.prox || 0, _f: -1 };
  revealables.push(root);
  return root;
}
function updateReveal(now){
  for (const r of revealables){
    const rv = r.userData.reveal; if (!rv) continue;
    let k = 0;
    if (now >= rv.at) k = Math.max(0, 1 - (now - rv.at) / rv.dur);
    let f = rv.min + (1 - rv.min) * k;
    // Proximity floor (Akmal playtest 19 Nov): objects near the sub never
    // fade to invisible when the sonar memory decays — the old collective
    // fade read as "all objects vanish" mid-swim, and a rock you had just
    // passed was simply gone. Distant objects still sink into the dark.
    if (rv.prox && player){
      const d = r.position.distanceTo(player.group.position);
      const pf = clamp(1 - d / rv.prox, 0, 1);
      f = Math.max(f, 0.3 + 0.7 * pf * pf);
    }
    if (Math.abs(f - rv._f) < 0.012) continue;
    rv._f = f;
    for (const e of rv.entries){
      if (e.m.color) e.m.color.copy(e.c).multiplyScalar(Math.max(f, 0.002));
      if (e.e && e.m.emissive) e.m.emissive.copy(e.e).multiplyScalar(f * e.ei * 2.4);
    }
  }
}

// ============================ JELLYFISH (procedural) ============================
function buildJellyfish(accentHex){
  const g = new THREE.Group();
  const bellMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness:0.25, metalness:0.05,
    emissive: accentHex, emissiveIntensity:0.5, transparent:true, opacity:0.55, side:THREE.DoubleSide, depthWrite:false });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 10, 0, Math.PI*2, 0, Math.PI/2), bellMat);
  g.add(bell);
  const core = glowBall(0.55, accentHex); core.position.y = -0.25; core.material.transparent = true; core.material.opacity = 0.85; g.add(core);
  const tentacles = [];
  for (let i=0;i<7;i++){
    const pivot = new THREE.Group();
    const a = i/7 * Math.PI*2;
    pivot.position.set(Math.cos(a)*1.05, -0.15, Math.sin(a)*1.05);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.015, 3.6, 5),
      new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity:0.35, transparent:true, opacity:0.6 }));
    t.position.y = -1.8; pivot.add(t); g.add(pivot); tentacles.push(pivot);
  }
  const frill = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.1, 6, 20), bellMat);
  frill.rotation.x = Math.PI/2; frill.position.y = -0.1; g.add(frill);
  g.userData.jelly = { bell, core, tentacles, phase: Math.random()*Math.PI*2 };
  return g;
}
function updateJellyfishVisual(j, t){
  const u = j.group.userData.jelly; if (!u) return;
  const pulse = Math.sin(t * 1.9 + u.phase);
  u.bell.scale.set(1 + pulse*0.07, 1 + pulse*0.16, 1 + pulse*0.07);
  u.core.material.opacity = 0.55 + 0.4 * (0.5 + 0.5 * pulse);
  for (let i=0;i<u.tentacles.length;i++){
    const p = u.tentacles[i];
    p.rotation.x = Math.sin(t * 1.25 + u.phase + i * 1.7) * 0.22;
    p.rotation.z = Math.cos(t * 1.05 + u.phase + i * 2.3) * 0.22;
  }
}

// ============================ FISH SCHOOLS (ambient) ============================
function buildFishSchool(scene, center){
  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.ConeGeometry(0.16, 0.85, 5); geo.rotateX(Math.PI/2);
  const mat = new THREE.MeshBasicMaterial({ color:0x9fd8d2, transparent:true, opacity:0.5 });
  const fishes = [];
  for (let i=0;i<14;i++){
    const f = new THREE.Mesh(geo, mat);
    f.userData.off = new THREE.Vector3(rand(-7,7), rand(-2.5,2.5), rand(-7,7));
    f.userData.vel = new THREE.Vector3(rand(-1,1), 0, rand(-1,1)).normalize().multiplyScalar(6);
    f.position.copy(center).add(f.userData.off);
    group.add(f); fishes.push(f);
  }
  const school = { center: center.clone(), group, fishes, scatterT: 0, wanderT: 0, target: center.clone(),
    scatter(){ this.scatterT = 1.6; },
    update(dt, t, bounds){
      this.wanderT -= dt;
      if (this.wanderT <= 0){ this.wanderT = rand(3, 5.5);
        this.target.set(clamp(this.center.x + rand(-70,70), -bounds, bounds), clamp(this.center.y + rand(-14,14), -24, 30), clamp(this.center.z + rand(-70,70), -bounds, bounds)); }
      this.center.lerp(this.target, dt * 0.25);
      if (this.scatterT > 0) this.scatterT -= dt;
      const spread = this.scatterT > 0 ? 2.4 : 1.0;
      for (const f of this.fishes){
        const desired = this.center.clone(); desired.x += f.userData.off.x * spread; desired.y += f.userData.off.y * spread + Math.sin(t*2 + f.id)*0.4; desired.z += f.userData.off.z * spread;
        const to = desired.sub(f.position);
        const steer = to.multiplyScalar(this.scatterT > 0 ? 2.6 : 1.1);
        f.userData.vel.lerp(steer, clamp(dt * (this.scatterT > 0 ? 3.2 : 1.8), 0, 1));
        const sp = f.userData.vel.length(), maxSp = this.scatterT > 0 ? 30 : 11.5;
        if (sp > maxSp) f.userData.vel.multiplyScalar(maxSp / sp);
        f.position.addScaledVector(f.userData.vel, dt);
        if (f.userData.vel.lengthSq() > 0.1){ const look = f.position.clone().add(f.userData.vel); f.lookAt(look); }
      }
    } };
  return school;
}

// Ambient deep-sea passer-by (Survival decoration): one merged body mesh
// (elongated body, tail + dorsal fins, angler lure stalk) + one merged glow
// mesh (flank spots + lure tip). No collision, no damage, not a hunter — it
// just crosses the shaft slowly so the mid-water feels inhabited.
const DRIFTER_BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x24333d, roughness: 0.6, metalness: 0.15, emissive: 0x0a1a22, emissiveIntensity: 0.7, flatShading: true });
const DRIFTER_GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0x8fe8ff });
function buildDrifterFish(scene){
  const parts = [];
  const put = (geo, x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.scale(new THREE.Vector3(sx, sy, sz)); m.setPosition(x, y, z); geo.applyMatrix4(m); parts.push(geo);
  };
  put(new THREE.SphereGeometry(1, 10, 8), 0, 0, 0, 0, 0, 0, 2.7, 0.72, 0.55);              // elongated body (head +Z)
  put(new THREE.ConeGeometry(0.62, 1.5, 4), -3.1, 0, 0, 0, 0, 0, 0.25, 1, 1.9);            // tail fin, vertical fan
  put(new THREE.ConeGeometry(0.5, 1.1, 4), -0.2, 0.75, 0, 0.5, 0, 0, 0.22, 1, 1.1);        // dorsal fin
  put(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 5), 1.9, 0.85, 0, 0, 0, -0.8);          // lure stalk
  const body = new THREE.Mesh(mergeGeometries(parts), DRIFTER_BODY_MAT);
  const glows = [];
  const gput = (x, y, z, r) => { const g = new THREE.SphereGeometry(r, 6, 5); g.translate(x, y, z); glows.push(g); };
  gput(2.55, 1.35, 0, 0.17); // lure tip
  for (let i = 0; i < 5; i++){ const gx = 1.2 - i * 0.75; gput(gx, -0.05, 0.52, 0.09); gput(gx, -0.05, -0.52, 0.09); } // flank spots, both sides
  const glow = new THREE.Mesh(mergeGeometries(glows), DRIFTER_GLOW_MAT);
  const group = new THREE.Group(); group.add(body); group.add(glow); scene.add(group);
  const d = { group, vel: new THREE.Vector3(1, 0, 0), speed: rand(2.5, 4.5), phase: rand(0, 6.28), baseY: 0 };
  placeDrifter(d, null, true);
  return d;
}
function placeDrifter(d, playerPos, initial = false){
  // (Re)spawn at a random depth near the player, on a slow crossing heading.
  const cy = playerPos ? playerPos.y : 0;
  const a = rand(0, Math.PI * 2), r = initial ? rand(30, 110) : rand(70, 130);
  d.group.position.set(Math.cos(a) * r, cy + rand(-45, 15), Math.sin(a) * r);
  d.baseY = d.group.position.y;
  const heading = a + Math.PI / 2 + rand(-0.5, 0.5); // roughly tangential: crosses the view instead of charging the player
  d.vel.set(Math.cos(heading), 0, Math.sin(heading)).multiplyScalar(d.speed);
}
function updateDrifters(dt, t){
  const pos = player.group.position;
  for (const d of G.drifters){
    d.group.position.addScaledVector(d.vel, dt);
    d.group.position.y = d.baseY + Math.sin(t * 0.5 + d.phase) * 1.6; // slow vertical drift
    const look = d.group.position.clone().add(d.vel);
    d.group.lookAt(look);
    d.group.rotation.z += Math.sin(t * 1.7 + d.phase) * 0.1; // gentle roll — alive, not rigid
    const dx = d.group.position.x - pos.x, dz = d.group.position.z - pos.z;
    if (dx * dx + dz * dz > 175 * 175 || Math.abs(d.group.position.y - pos.y) > 95) placeDrifter(d, pos);
  }
}

// ============================ UI / SCREENS ============================
const $ = id => document.getElementById(id);
let uiState = 'title';
let survDiff = 'standard';
const SCREEN_OF = { title:'scr-title', zones:'scr-zones', hangar:'scr-hangar', howto:'scr-howto',
                    playing:null, paused:'scr-pause', boon:'scr-boon', end:'scr-end' };
function setUI(state){
  uiState = state;
  // Any screen other than active play hands the cursor back: forced modals
  // (the boon draft, the end screen) and menus need a clickable cursor, so
  // pointer lock is released here, centrally — the player must never have to
  // Esc out of a draft just to reach the cards. uiState is already updated
  // and pointerlockchange fires async, so the auto-pause handler sees the
  // new state and never stacks a pause menu under the draft/end screen.
  if (state !== 'playing' && document.pointerLockElement){ try { document.exitPointerLock(); } catch(e) {} }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  const scr = SCREEN_OF[state]; if (scr) $(scr).classList.add('on');
  $('hud').classList.toggle('on', state === 'playing' || state === 'paused' || state === 'boon');
  refreshCoinLabels();
}
function refreshCoinLabels(){
  for (const id of ['title-coins','zone-coins','hangar-coins']) { const el = $(id); if (el) el.textContent = SAVE.coins; }
  $('title-depth').textContent = SAVE.bestDepth > 0 ? Math.floor(SAVE.bestDepth) + ' m' : '—';
  $('title-time').textContent = SAVE.bestTime > 0 ? fmtTime(SAVE.bestTime) : '—';
}
let toastTimer = null;
function toast(msg, ms = 2800){
  const t = $('toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(()=> t.style.display = 'none', ms);
}
function showHint(msg){ const h = $('hint'); if (msg){ h.textContent = msg; h.style.display = 'block'; } else h.style.display = 'none'; }

// ============================ MENU & HANGAR SCENES ============================
function makeParticles(count, sx, sy, sz, color = 0x9fd8d2, size = 0.55){
  const pos = new Float32Array(count * 3);
  for (let i=0;i<count;i++){ pos[i*3] = rand(-sx/2, sx/2); pos[i*3+1] = rand(-sy/2, sy/2); pos[i*3+2] = rand(-sz/2, sz/2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent:true, opacity:0.5, sizeAttenuation:true }));
  return pts;
}
let menuScene, menuSub, menuHunter, hangarScene, hangarPreview = null, hangarCamDist = 14;
let hangarViewId = null; // sub shown on the hangar stage (may differ from SAVE.sub while browsing)
function buildMenuScene(){
  menuScene = new THREE.Scene();
  menuScene.background = new THREE.Color(0x04161d);
  menuScene.fog = new THREE.FogExp2(0x04161d, 0.02);
  menuScene.add(new THREE.AmbientLight(0x8899aa, 0.7));
  const key = new THREE.DirectionalLight(0xbffcff, 1.4); key.position.set(6, 10, 8); menuScene.add(key);
  const glow = new THREE.PointLight(0x2ee6c8, 220, 90, 1.8); glow.position.set(0, 0, 4); menuScene.add(glow);
  menuSub = makeAsset('sub-minnow'); menuSub.position.set(-4.8, -1.4, -5); menuSub.scale.multiplyScalar(0.85); menuScene.add(menuSub);
  menuHunter = makeAsset('hunter'); menuHunter.position.set(11, -2.5, -22); menuHunter.rotation.y = -0.7; menuScene.add(menuHunter);
  const pts = makeParticles(420, 130, 60, 130); menuScene.add(pts);
  const pts2 = makeParticles(160, 300, 160, 300, 0x3d7a72, 0.9); pts2.position.z = -60; menuScene.add(pts2);
}
function buildHangarScene(){
  hangarScene = new THREE.Scene();
  hangarScene.background = new THREE.Color(0x05141b);
  hangarScene.fog = new THREE.FogExp2(0x05141b, 0.012);
  hangarScene.add(new THREE.AmbientLight(0x8899aa, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 12, 9); hangarScene.add(key);
  const rim = new THREE.PointLight(0x2ee6c8, 260, 120, 1.8); rim.position.set(-8, 3, -6); hangarScene.add(rim);
  hangarScene.userData.rim = rim;
  const pts = makeParticles(240, 120, 60, 120); hangarScene.add(pts);
  refreshHangarPreview();
}
// The hangar layout reserves an open central stage (#hangar-stage) between the
// sub-card column and the shop column. hangarFrame() reports that stage's centre
// as a fraction of the window plus the half-angles the stage subtends inside the
// full-frame frustum, so the preview can be fitted into — and centred on — the
// open region instead of hiding behind the panels. Falls back to the full frame
// while the hangar screen is hidden (e.g. during boot).
function hangarFrame(){
  const W = window.innerWidth, H = window.innerHeight;
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const el = $('hangar-stage');
  if (el){
    const r = el.getBoundingClientRect();
    if (r.width > 40 && r.height > 40){
      return { fx:(r.left + r.width / 2) / W, fy:(r.top + r.height / 2) / H,
               vHalf:Math.atan(Math.tan(vHalf) * (r.height / H)),
               hHalf:Math.atan(Math.tan(hHalf) * (r.width / W)) };
    }
  }
  return { fx:0.5, fy:0.5, vHalf, hHalf };
}
// Locked-sub tease: an unowned sub previews as a pure silhouette — one shared
// flat, unlit material ASSIGNED to the preview clone's meshes. Assignment only:
// the clone shares material instances with the cached template, so nothing is
// mutated and the cached model (and a later full-colour reveal) stay intact.
const SILHOUETTE_MAT = new THREE.MeshBasicMaterial({ color: 0x02070a, fog: false });
function silhouettePreview(root){
  root.traverse(o => {
    if (o.isMesh) o.material = SILHOUETTE_MAT;
    else if (o.isSprite || o.isPoints) o.visible = false;
  });
}
function refreshHangarPreview(){
  if (!hangarScene) return;
  if (hangarPreview){ hangarScene.remove(hangarPreview); }
  const subId = hangarViewId || SAVE.sub, def = CONFIG.subs[subId];
  const owned = SAVE.subs.includes(subId);
  hangarPreview = makeAsset(def.asset);
  hangarPreview.scale.setScalar(def.scale * 1.15);
  if (owned) setAccent(hangarPreview, accentHex(subId));
  else silhouettePreview(hangarPreview);
  hangarScene.add(hangarPreview);
  hangarScene.userData.rim.color.setHex(accentHex(subId));
  // Frame the whole sub: fit the preview camera distance to this model's bounding
  // sphere within the open stage region, so big hulls (Leviathan) are fully
  // visible bow-to-stern instead of cropped or buried behind the panels.
  const sphere = new THREE.Box3().setFromObject(hangarPreview).getBoundingSphere(new THREE.Sphere());
  const fr = hangarFrame();
  const fitDist = sphere.radius / Math.sin(Math.min(fr.vHalf, fr.hHalf));
  hangarCamDist = clamp(fitDist * 1.12, 14, 40);
}

// ============================ ZONE SELECT ============================
function zoneUnlocked(z){ return z.id === 1 || (SAVE.stars[z.id - 1] || 0) >= 1; }
function buildZoneCards(){
  const wrap = $('zone-cards'); wrap.innerHTML = '';
  for (const z of CONFIG.zones){
    const unlocked = zoneUnlocked(z), stars = SAVE.stars[z.id] || 0;
    const card = document.createElement('div');
    card.className = 'card' + (unlocked ? '' : ' locked');
    const missionLabel = { collect:t('Collect crystals'), rescue:t('Rescue the mini-sub'), nests:(SAVE.lang === 'zh' ? '摧毁 ' + z.mission.nests + ' 个巢穴' : 'Destroy ' + z.mission.nests + ' nests'), survive:(SAVE.lang === 'zh' ? '存活 ' + z.mission.time + ' 秒' : 'Survive ' + z.mission.time + 's') }[z.mission.type];
    card.innerHTML = `<h3>${z.id}. ${z.name}</h3><div class="role">${z.depth[0]}–${z.depth[1]} m · 💎 ${z.crystalValue} ${t('coins each')}</div>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stat">${t('Mission')} <b>${missionLabel}</b></div>
      <div class="stat">${t('Hunters')} <b>${z.hunters.length}</b></div>
      <div class="stat">${t('Jellyfish')} <b>${z.jellies}</b></div>
      <div class="stat">${t('Escape bonus')} <b>🪙 ${z.escape}</b></div>
      <div class="stat">${t('Recommended')} <b>${z.rec}</b></div>
      <p class="stat" style="float:none">${z.desc}</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn small'; btn.textContent = unlocked ? t('▼ DIVE') : t('🔒 LOCKED');
    btn.disabled = !unlocked;
    btn.onclick = ()=> { AudioSys.init(); startExpedition(z); };
    card.appendChild(btn);
    wrap.appendChild(card);
  }
  refreshCoinLabels();
}

// ============================ HANGAR UI ============================
function buildHangar(){
  const wrap = $('sub-cards'); wrap.innerHTML = '';
  for (const [id, s] of Object.entries(CONFIG.subs)){
    const owned = SAVE.subs.includes(id), selected = SAVE.sub === id;
    const card = document.createElement('div');
    card.className = 'card' + (selected ? ' sel' : '') + ((hangarViewId || SAVE.sub) === id && !selected ? ' viewing' : '');
    // Clicking a card previews that sub on the stage — owned in full colour,
    // unowned as a silhouette tease. Buttons and colour swatches keep their
    // own actions (they stop the preview handler via the closest() guard).
    card.onclick = (e)=>{
      if (e.target.closest('button') || e.target.closest('.sw')) return;
      hangarViewId = id;
      wrap.querySelectorAll('.card').forEach(c => c.classList.remove('viewing'));
      if (!selected) card.classList.add('viewing');
      refreshHangarPreview();
    };
    const hullFrac = SAVE.subHull[id];
    const bar = (v, max) => `<div class="bar"><i style="width:${clamp(v/max*100, 2, 100)}%"></i></div>`;
    card.innerHTML = `<h3>${s.name}</h3><div class="role">${s.role} · ${owned ? (selected ? t('SELECTED') : t('OWNED')) : '🪙 ' + s.price}</div>
      <div class="stat">${t('Speed')}</div>${bar(s.speed, 30)}
      <div class="stat">${t('Hull')} <b>${s.hull}</b></div>${bar(s.hull, 240)}
      <div class="stat">${t('Sonar')} <b>×${s.sonarMul}</b></div>${bar(s.sonarMul, 1.3)}
      <div class="stat">${t('Torpedo dmg')} <b>${s.torpDmg}</b> · ${t('Decoys')} <b>${s.decoyCap}</b> · ${t('Torps')} <b>${s.torpCap}</b></div>
      ${s.note ? `<div class="stat" style="float:none;color:var(--accent)">${s.note}</div>` : ''}
      ${hullFrac !== undefined && hullFrac < 0.999 ? `<div class="stat" style="color:var(--warn)">${t('Hull integrity')} <b>${Math.round(hullFrac*100)}%</b></div>` : ''}`;
    const btn = document.createElement('button');
    btn.className = 'btn small' + (owned ? '' : ' buy');
    btn.textContent = selected ? t('SELECTED') : owned ? t('SELECT') : t('BUY') + ' · 🪙 ' + s.price;
    btn.disabled = selected || (!owned && SAVE.coins < s.price);
    btn.onclick = ()=>{
      if (!owned){ SAVE.coins -= s.price; SAVE.subs.push(id); toast(s.name + ' purchased'); }
      SAVE.sub = id; hangarViewId = id; persist(); buildHangar(); refreshHangarPreview();
    };
    card.appendChild(btn);
    if (selected){
      const sw = document.createElement('div'); sw.className = 'swatches';
      for (const c of CONFIG.colors){
        const ownedC = SAVE.colorsOwned.includes(c.id), active = (SAVE.subColor[id] || 'teal') === c.id;
        const d = document.createElement('div');
        d.className = 'sw' + (active ? ' sel' : '') + (ownedC ? '' : ' locked');
        d.style.background = hexCss(c.hex); d.title = c.name + (ownedC ? '' : ' · 🪙 ' + c.price);
        d.onclick = ()=>{
          if (!ownedC){ if (SAVE.coins < c.price){ toast('Not enough coins'); AudioSys.ui('back'); return; } SAVE.coins -= c.price; SAVE.colorsOwned.push(c.id); AudioSys.ui('buy'); }
          else AudioSys.ui('click');
          SAVE.subColor[id] = c.id; hangarViewId = id; persist(); buildHangar(); refreshHangarPreview();
          document.documentElement.style.setProperty('--accent', hexCss(c.hex));
        };
        sw.appendChild(d);
      }
      card.appendChild(sw);
    }
    wrap.appendChild(card);
  }
  // upgrades
  const up = $('upgrade-list'); up.innerHTML = '';
  for (const [key, track] of Object.entries(CONFIG.upgrades)){
    const tier = SAVE.upg[key];
    const row = document.createElement('div'); row.className = 'shopitem';
    row.innerHTML = `<div><b>${track.name}</b> <span class="pips">${'●'.repeat(tier)}${'○'.repeat(3 - tier)}</span>
      <div class="stat" style="float:none">${tier < 3 ? track.blurb(tier) : 'MAXED'}</div></div>`;
    if (tier < 3){
      const b = document.createElement('button'); b.className = 'btn small buy';
      b.textContent = '🪙 ' + track.prices[tier]; b.disabled = SAVE.coins < track.prices[tier];
      b.onclick = ()=>{ SAVE.coins -= track.prices[tier]; SAVE.upg[key]++; persist(); buildHangar(); toast(track.name + ' tier ' + SAVE.upg[key]); };
      row.appendChild(b);
    }
    up.appendChild(row);
  }
  // supplies
  const sp = $('supply-list'); sp.innerHTML = '';
  const mkRow = (label, price, disabled, fn) => {
    const row = document.createElement('div'); row.className = 'shopitem';
    row.innerHTML = `<div>${label}</div>`;
    const b = document.createElement('button'); b.className = 'btn small buy'; b.textContent = '🪙 ' + price; b.disabled = disabled;
    b.onclick = fn; row.appendChild(b); sp.appendChild(row);
  };
  mkRow(`Sonar decoys +2 <span class="stat">(stock: ${SAVE.stock.decoy})</span>`, CONFIG.supplies.decoy.price, SAVE.coins < CONFIG.supplies.decoy.price,
    ()=>{ SAVE.coins -= CONFIG.supplies.decoy.price; SAVE.stock.decoy += 2; persist(); buildHangar(); });
  mkRow(`Torpedoes +3 <span class="stat">(stock: ${SAVE.stock.torp})</span>`, CONFIG.supplies.torp.price, SAVE.coins < CONFIG.supplies.torp.price,
    ()=>{ SAVE.coins -= CONFIG.supplies.torp.price; SAVE.stock.torp += 3; persist(); buildHangar(); });
  const frac = SAVE.subHull[SAVE.sub];
  mkRow(`Full hull repair — ${CONFIG.subs[SAVE.sub].name}${frac !== undefined && frac < 0.999 ? ' (' + Math.round(frac*100) + '%)' : ' (pristine)'}`,
    CONFIG.supplies.repair.price, SAVE.coins < CONFIG.supplies.repair.price || (frac !== undefined && frac >= 0.999),
    ()=>{ SAVE.coins -= CONFIG.supplies.repair.price; SAVE.subHull[SAVE.sub] = 1; persist(); buildHangar(); toast('Hull repaired'); });
  refreshCoinLabels();
}

// ============================ INPUT ============================
const keys = {};
let pointerLocked = false;
window.addEventListener('keydown', e => {
  keys[e.code] = true; AudioSys.init();
  if (e.repeat) return;
  if (e.code === 'KeyM'){ Music.toggleMute(); return; }
  if (uiState === 'playing'){
    if (e.code === 'Space'){ e.preventDefault(); doPing(); }
    else if (e.code === 'KeyQ') dropDecoy();
    else if (e.code === 'KeyE') fireEMP();
    else if (e.code === 'KeyF') fireTorpedo();
    else if (e.code === 'KeyP') pauseGame();
  } else if (uiState === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) resumeGame();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
document.addEventListener('selectstart', e => e.preventDefault()); // belt-and-braces with the CSS: UI text is never selectable
canvas.addEventListener('mousedown', () => {
  AudioSys.init();
  if (uiState === 'playing'){ if (pointerLocked){ if (G) G.cannonHeld = true; } else canvas.requestPointerLock(); }
});
window.addEventListener('mouseup', () => { if (G) G.cannonHeld = false; });
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (G) G.cannonHeld = false;
  if (!pointerLocked && uiState === 'playing' && G && !G.over) pauseGame();
});
document.addEventListener('mousemove', e => {
  if (pointerLocked && uiState === 'playing' && player){
    player.yaw -= e.movementX * 0.0026;
    player.pitch = clamp(player.pitch - e.movementY * 0.0026, -1.15, 1.15);
  }
  if (uiState === 'hangar' && hangarPreview && e.buttons === 1){ e.preventDefault(); hangarPreview.rotation.y += e.movementX * 0.01; }
});
// Wheel zoom for the hangar preview. This listens on window, not the canvas:
// the .screen overlay always covers the canvas, so a canvas listener never
// fires. It is gated to the open stage rect so wheeling over the side columns
// still scrolls them instead of zooming.
window.addEventListener('wheel', e => {
  if (uiState !== 'hangar') return;
  const el = $('hangar-stage'); if (!el) return;
  const r = el.getBoundingClientRect();
  if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom){
    hangarCamDist = clamp(hangarCamDist + Math.sign(e.deltaY) * 1.6, 8, 40);
  }
}, { passive:true });

// ============================ GAME SESSION ============================
let G = null, player = null, gameScene = null;
function newG(mode){
  return { mode, time:0, over:false, zone:null, diff:null, diffId:null,
    crystalsGot:0, crystalsTotal:0, coinsRun:0, empCd:0, noise:0, noisePulse:0, pingReadyAt:0, boosting:false, boostRegenAt:0,
    gateOpen:false, missionDone:false, surviveT:0, nestsDown:0, rescued:false,
    closeCalls:0, kills:0, torps:0, decoys:0, hintStep:-1, camShake:0,
    hunters:[], crystals:[], jellies:[], mines:[], nests:[], fired:[], schools:[], waves:[], fx:[], drifters:[],
    decoyActive:null, gate:null, stranded:null, boon:{ sonarMul:1, speedMul:1, crystalMul:1, empCdMul:1, battMax:0 },
    // survival descent gate + pulse cannon state
    floorCrystals:0, survGate:null, gateWarnT:0,
    cannonHeld:false, cannonHeat:0, cannonLock:false, cannonFireT:0, bolts:[],
    // survival director
    stratum:0, floor:1, maxDepth:0, spawnT:6, spawnInterval:CONFIG.survival.spawnStart,
    nextMinuteAt:60, nextAncientAt:CONFIG.survival.ancientEvery,
    bandY:0, collapseY:46, collapseMesh:null, collapseStage:0, crushT:0, floorEnterT:0, graceWarned:false, gracePreWarned:false, collapseMoving:false, collapseProx:0, pendingBoss:null, bossWarnAt:-1, bossSpawnAt:-1, wardenAlive:null, trio:null };
}
function removeEntity(root){
  if (gameScene) gameScene.remove(root);
  const i = revealables.indexOf(root); if (i >= 0) revealables.splice(i, 1);
}
function tintRevealEntries(root, hex, amt){
  const rv = root.userData.reveal; if (!rv) return;
  const c = new THREE.Color(hex);
  for (const e of rv.entries){ e.c.lerp(c, amt); if (e.e) e.e.lerp(c, amt * 0.7); }
}
// Depth fog (linear): full clarity inside FOG_NEAR, total murk at FOG_FAR.
// The fog colour always equals the scene background (expedition: the zone's
// fog tint; survival: the stratum tint, re-set on every stratum cross), so
// distant geometry melts INTO the water instead of silhouetting against it —
// the far field and the depths below read as murk, never as visible emptiness.
// Linear, not FogExp2: an exp2 dense enough to erase ~110 units (≈0.02) would
// also wash the 20–40 unit gameplay band down to ~50%; the linear ramp keeps
// ≤40 units ≥87% visible while guaranteeing 0% at FOG_FAR. Visibility of an
// object at distance d: (FOG_FAR − d) / (FOG_FAR − FOG_NEAR), clamped 0..1 —
// 40 u → 87%, 65 u → 55%, 80 u → 36%, 95 u (base sonar edge) → 17%, ≥108 u → 0%.
const FOG_NEAR = 30, FOG_FAR = 108;
function baseGameScene(fogHex){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(fogHex);
  scene.fog = new THREE.Fog(fogHex, FOG_NEAR, FOG_FAR);
  scene.add(new THREE.AmbientLight(0x99aabb, 0.5));
  const moon = new THREE.DirectionalLight(0x88aaff, 0.42); moon.position.set(30, 80, 20); scene.add(moon);
  return scene;
}
function randArenaPos(minR, maxR, yMin = -18, yMax = 28){
  const a = rand(0, Math.PI * 2), r = rand(minR, maxR);
  return new THREE.Vector3(Math.cos(a) * r, rand(yMin, yMax), Math.sin(a) * r);
}

// ============================ ENTITY FACTORIES ============================
function spawnPlayer(scene, subId, pos){
  const d = derived(subId);
  const group = makeAsset(d.def.asset);
  group.scale.setScalar(d.def.scale);
  setAccent(group, accentHex(subId));
  group.position.copy(pos);
  scene.add(group);
  const lamp = new THREE.PointLight(accentHex(subId), 560, 85, 1.9); lamp.position.set(0, 1.6, 2); group.add(lamp);
  const spot = new THREE.SpotLight(0xcfefff, 1400, 95, 0.55, 0.55, 1.5);
  spot.position.set(0, 0.4, 1);
  const tgt = new THREE.Object3D(); tgt.position.set(0, 0, 40); group.add(tgt); spot.target = tgt; group.add(spot);
  let frac = SAVE.subHull[subId];
  if (frac === undefined) frac = 1;
  if (frac <= 0.02) frac = 0.25; // emergency patch so a wrecked sub is never a soft-lock
  return { group, vel:new THREE.Vector3(), yaw: Math.PI, pitch: 0, d, subId,
           hull: Math.round(d.maxHull * frac), batt: d.maxBatt, radius: 2.6, thrust: 0 };
}
// ---- eel swim: vertex bend via onBeforeCompile (the hunter GLBs have no skeleton).
// The bend runs along each geometry's longest axis, weighted so the tail end sways
// most and the head stays stable; amplitude/rate are driven per-frame from swim speed.
const SWIM_TIME = { value: 0 };
function applySwim(group, kind){
  const uniforms = { uTime: SWIM_TIME, uAmp: { value: kind === 'sway' ? 0.05 : 0 }, uFreq: { value: 3.4 },
    uRate: { value: kind === 'sway' ? 1.6 : 7 }, uPhase: { value: rand(0, Math.PI * 2) },
    uMin: { value: 0 }, uSpan: { value: 1 }, uAxisMask: { value: new THREE.Vector3(1, 0, 0) },
    uLatMask: { value: new THREE.Vector3(0, 0, 1) }, uWgtTop: { value: 0 }, uVertK: { value: 1 } };
  let measured = false;
  group.traverse(o => {
    if (!o.isMesh || o.userData.noReveal || (o.material && o.material.isMeshBasicMaterial)) return;
    if (!measured){
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox, sz = new THREE.Vector3(); bb.getSize(sz);
      const ax = (sz.x >= sz.y && sz.x >= sz.z) ? 0 : (sz.y >= sz.z ? 1 : 2);
      const mins = [bb.min.x, bb.min.y, bb.min.z], spans = [sz.x, sz.y, sz.z];
      uniforms.uMin.value = mins[ax]; uniforms.uSpan.value = Math.max(0.001, spans[ax]);
      uniforms.uAxisMask.value.set(ax === 0 ? 1 : 0, ax === 1 ? 1 : 0, ax === 2 ? 1 : 0);
      if (ax === 0){ uniforms.uLatMask.value.set(0, 0, 1); uniforms.uWgtTop.value = 0; uniforms.uVertK.value = 1; }
      else if (ax === 2){ uniforms.uLatMask.value.set(1, 0, 0); uniforms.uWgtTop.value = 0; uniforms.uVertK.value = 1; }
      else { uniforms.uLatMask.value.set(1, 0, 0); uniforms.uWgtTop.value = 1; uniforms.uVertK.value = 0; } // upright body: top sways
      measured = true;
    }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats){
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = ('uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uRate; uniform float uPhase;\n' +
          'uniform float uMin; uniform float uSpan; uniform vec3 uAxisMask; uniform vec3 uLatMask; uniform float uWgtTop; uniform float uVertK;\n') +
          sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            {
              float along = clamp((dot(position, uAxisMask) - uMin) / uSpan, 0.0, 1.0);
              float wgt = mix(pow(1.0 - along, 1.5), pow(along, 1.5), uWgtTop);
              float ph = along * uFreq - uTime * uRate + uPhase;
              transformed += uLatMask * (sin(ph) * uAmp * uSpan * wgt);
              transformed.y += cos(ph * 0.85) * uAmp * uSpan * 0.22 * wgt * uVertK;
            }`);
      };
      m.customProgramCacheKey = () => 'pf-swim';
    }
  });
  return uniforms;
}
function spawnHunter(scene, typeId, pos, opts = {}){
  const t = CONFIG.hunters[typeId];
  const group = makeAsset(t.model);
  group.scale.setScalar(t.modelScale * (opts.scaleMul || 1));
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.05, prox: 46 });
  tintRevealEntries(group, t.tint, t.dark ? 0.85 : 0.5);
  if (!group.userData.core){
    const core = glowBall(0.42, 0x2e7fd9); core.position.set(0, -0.4, CONFIG.assetSize[t.model] * 0.3);
    group.add(core); group.userData.core = core;
  }
  attachCoreGlow(group.userData.core, CONFIG.hunterStates.dormant.core);
  const swimU = applySwim(group, (typeId === 'sentry' || opts.trioRole === 'eye') ? 'sway' : 'swim');
  group.userData.isHunter = true;
  const hpMul = (opts.hpMul || 1) * (opts.swiftHp ? CONFIG.warden.swiftHpMul : 1);
  const h = { type: t, typeId, group, hp: Math.max(1, Math.round(t.hp * hpMul)), awareness: opts.aggro ? 1 : 0,
    lastNoise: pos.clone(), targetKind: 'player', home: pos.clone(), state: 'dormant',
    hitCd: 0, closeCd: 0, disabled: 0, sentryT: rand(2.5, 5.5), phase: rand(0, Math.PI * 2),
    ancient: !!opts.ancient, warden: opts.warden || null, trioRole: opts.trioRole || null,
    dmgTakenMul: opts.dmgTakenMul || 1, speedMul: (opts.speedMul || 1), splitDone: false, dead: false,
    investigateT: 0, investPoint: pos.clone(), patrolTarget: null, patrolT: 0,
    swim: swimU, vel: new THREE.Vector3() };
  G.hunters.push(h);
  return h;
}
// Survival floors are stacked 40 m apart in one shaft, so a crystal of the
// floor BELOW used to be visible (and ping-revealed) from the floor above —
// players chased it thinking it counted toward their gate quota. Survival
// crystals/caches therefore carry their floor (from their actual depth) and
// are rendered ONLY while the player is on that floor. visible=false sits
// above the reveal system: a ping on floor N can never reveal floor N±1's
// collectibles. State (taken/value/quota) is untouched — visibility only.
function survFloorOf(y){ return Math.floor(Math.max(0, -y) / CONFIG.survival.floorDepth) + 1; }
function survCullCollectibles(){
  if (!G || G.mode !== 'survival') return;
  for (const c of G.crystals) if (!c.taken && c.floor !== undefined) c.group.visible = (c.floor === G.floor);
  if (G.caches) for (const c of G.caches) if (!c.taken && c.floor !== undefined) c.group.visible = (c.floor === G.floor);
  if (G.pickups) for (const c of G.pickups) if (!c.taken && c.floor !== undefined) c.group.visible = (c.floor === G.floor);
}
function spawnCrystal(scene, pos, value, golden = false){
  const group = makeAsset('crystal');
  if (golden) group.scale.setScalar(1.35);
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.04, prox: 24 });
  group.userData.isCrystal = true;
  if (golden) tintRevealEntries(group, 0xffc93a, 0.85);
  // Dimmer, sonar-driven halo (was scale 8/11 at full opacity — visible across the
  // arena). Now the halo's brightness is driven by the ping-reveal factor in the
  // crystal update loop: near-invisible in the dark, flaring on a fresh ping.
  const halo = makeGlowSprite(golden ? 0xffc93a : 0x6ff5e2, golden ? 4.6 : 3.2, 0.05);
  halo.position.y = 0.6;
  group.add(halo);
  const c = { group, value, golden, taken: false, baseY: pos.y, phase: rand(0, Math.PI * 2),
              halo, haloBase: golden ? 0.55 : 0.42, haloScale: golden ? 4.6 : 3.2 };
  if (G && G.mode === 'survival'){ c.floor = survFloorOf(pos.y); group.userData.floor = c.floor; }
  G.crystals.push(c);
  return c;
}
function spawnJelly(scene, pos, tintHex){
  const group = buildJellyfish(tintHex);
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.06 });
  const j = { group, vel: new THREE.Vector3(rand(-1,1), rand(-0.25,0.25), rand(-1,1)).normalize().multiplyScalar(CONFIG.jelly.drift * rand(0.6, 1.3)),
              hitCd: 0, baseY: pos.y };
  G.jellies.push(j);
  return j;
}
// Decorative jellyfish drifter (Survival ambience): same build and drift as a
// hazard jelly, but flagged decor — the hazard loop skips its sting. It is
// life in the water column, not a threat. Expedition jellies are untouched.
function spawnJellyDrifter(scene, pos, tintHex){
  const j = spawnJelly(scene, pos, tintHex);
  j.decor = true;
  j.vel.multiplyScalar(0.45);
  return j;
}
function spawnMine(scene, pos){
  const group = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), std(0x23272c, { metalness: 0.6 }));
  group.add(ball);
  for (let i=0;i<8;i++){
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 6), std(0x3a4046));
    const dir = new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1)).normalize();
    spike.position.copy(dir).multiplyScalar(1.7);
    spike.lookAt(dir.clone().multiplyScalar(3)); spike.rotateX(Math.PI/2);
    group.add(spike);
  }
  const dot = glowBall(0.22, 0xff2233); dot.position.set(0, 1.55, 0); group.add(dot);
  group.position.copy(pos); scene.add(group);
  registerReveal(group, { min: 0.08 });
  const m = { group, dead: false, phase: rand(0, Math.PI*2) };
  G.mines.push(m);
  return m;
}
function spawnNest(scene, pos){
  const group = makeAsset('hunter-brute');
  group.scale.setScalar(0.85);
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.05 });
  tintRevealEntries(group, 0x4a7a3d, 0.55);
  const n = { group, hp: 150, maxHp: 150, dead: false, hpBar: null };
  G.nests.push(n);
  return n;
}
function spawnCache(scene, pos){
  const group = new THREE.Group();
  // A giant spinning gold coin instead of the old box (Akmal 19 Nov: round
  // like a real coin, with a spin effect) — upright cylinder, gold rim and a
  // raised emblem through both faces; the cache loop spins + bobs the group.
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.45, 28), std(0xffc93a, { metalness: 0.85, roughness: 0.3, emissiveIntensity: 0.35 }));
  coin.rotation.x = Math.PI / 2; group.add(coin);
  group.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 10, 36), std(0xd9962b, { metalness: 0.9, roughness: 0.35, emissiveIntensity: 0.25 })));
  const emb = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.52, 24), std(0xd9962b, { metalness: 0.8, roughness: 0.4, emissiveIntensity: 0.3 }));
  emb.rotation.x = Math.PI / 2; group.add(emb);
  group.position.copy(pos); scene.add(group);
  registerReveal(group, { min: 0.1, prox: 26 });
  const c = { group, taken: false, phase: rand(0, Math.PI*2), baseY: pos.y };
  if (G && G.mode === 'survival') c.floor = survFloorOf(pos.y);
  if (!G.caches) G.caches = [];
  G.caches.push(c);
  return c;
}
function spawnPickup(scene, pos, kind){
  // Collectible items (Akmal 19 Nov): battery cells and hull patches that
  // float in the water column and are gathered by swimming through them,
  // exactly like crystals. Survival-only (spawned per floor by
  // ensureBands); they carry their floor and cull like crystals/caches.
  const group = new THREE.Group();
  let haloHex;
  if (kind === 'cell'){
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 4, 10), std(0x8a6d1f, { metalness: 0.6, roughness: 0.35 }));
    body.rotation.z = Math.PI / 2;
    group.add(body);
    group.add(glowBall(0.42, 0xffe066));
    haloHex = 0xffe066;
  } else { // patch — a repair kit: orange box with a white cross
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.6), std(0xb8452a, { roughness: 0.6, metalness: 0.2 })));
    const crossMat = std(0xf2f2f2, { roughness: 0.5 });
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.68), crossMat));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.68), crossMat));
    group.add(glowBall(0.3, 0xff8a5c));
    haloHex = 0xff8a5c;
  }
  const halo = makeGlowSprite(haloHex, 3.0, 0.05);
  group.add(halo);
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.05, prox: 24 });
  const p = { group, kind, taken: false, baseY: pos.y, phase: rand(0, Math.PI * 2), halo, haloBase: 0.4, haloScale: 3.0 };
  if (G && G.mode === 'survival') p.floor = survFloorOf(pos.y);
  if (!G.pickups) G.pickups = [];
  G.pickups.push(p);
  return p;
}
function spawnGate(scene, pos){
  const group = makeAsset('gate');
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.12 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.2, 8, 40), ringMat);
  ring.userData.noReveal = true; group.add(ring);
  return { group, pos: pos.clone(), ringMat };
}

// ============================ ENVIRONMENT & ATMOSPHERE ============================
// Visual-only layer: glow sprites, marine snow, trench dressing.
// Rebuilt per dive; updated once per frame from the main loop.
const envFx = { kelp: [], pulses: [], snow: null, shaft: null, seabed: null, vents: [], dressColliders: null };
function resetEnvFx(){ envFx.kelp.length = 0; envFx.pulses.length = 0; envFx.snow = null; envFx.shaft = null; envFx.seabed = null; envFx.vents.length = 0; envFx.dressColliders = null; }

let _glowTex = null;
function glowTexture(){
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.16)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
function makeGlowSprite(hex, scale, opacity){
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color: hex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  s.renderOrder = 6;
  s.userData.noReveal = true;
  return s;
}
function addGlowPulse(sprite, amp = 0.18, speed = 1.6, oAmp = 0.1){
  envFx.pulses.push({ s: sprite, base: sprite.scale.x, baseO: sprite.material.opacity, amp, oAmp, speed, phase: rand(0, Math.PI * 2) });
}
function attachCoreGlow(core, hex){
  if (!core || core.userData.glowSprite) return;
  const sp = makeGlowSprite(hex, 3.6, 0.34);
  core.add(sp);
  core.userData.glowSprite = sp;
}
function addMarineSnow(scene){
  const N = 650;
  const pos = new Float32Array(N * 3), spd = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++){
    pos[i*3] = rand(-75, 75); pos[i*3+1] = rand(-48, 48); pos[i*3+2] = rand(-75, 75);
    spd[i] = rand(0.7, 2.1); ph[i] = rand(0, Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe8e2, size: 0.5, transparent: true, opacity: 0.55, sizeAttenuation: true, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  envFx.snow = { pts, spd, ph, N };
  return pts;
}
function updateEnvironmentFx(dt){
  if (!G || !player) return;
  const t = G.time, pp = player.group.position;
  if (envFx.snow){
    const sn = envFx.snow;
    sn.pts.position.set(pp.x, pp.y, pp.z);
    const a = sn.pts.geometry.attributes.position;
    for (let i = 0; i < sn.N; i++){
      let y = a.getY(i) - sn.spd[i] * dt;
      if (y < -48) y += 96;
      a.setY(i, y);
      const x = a.getX(i) + Math.sin(t * 0.5 + sn.ph[i]) * dt * 0.55;
      a.setX(i, x > 78 ? x - 156 : x < -78 ? x + 156 : x);
    }
    a.needsUpdate = true;
  }
  for (const k of envFx.kelp){
    k.pivot.rotation.x = Math.sin(t * k.speed + k.phase) * k.amp;
    k.pivot.rotation.z = Math.cos(t * k.speed * 0.8 + k.phase * 1.7) * k.amp * 1.25;
  }
  for (const p of envFx.pulses){
    const s = 1 + Math.sin(t * p.speed + p.phase) * p.amp;
    p.s.scale.set(p.base * s, p.base * s, 1);
    p.s.material.opacity = clamp(p.baseO + Math.sin(t * p.speed + p.phase) * p.oAmp, 0.05, 0.9);
  }
  for (const v of envFx.vents){ // bubble vents: points rise and wrap inside their column
    const a = v.pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++){
      let y = a.getY(i) + v.spd[i] * dt;
      if (y > v.h) y -= v.h;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  }
  // The shaft dressing column is authored in LOCAL coords matching the
  // first stratum's depths (set pieces sit at their own floors) and is
  // locked per stratum: position.y steps ONLY at stratum boundaries
  // (400 m), where the gate transition masks the recycle. The old 50 m
  // snap teleported every pillar, rock and coral 50 m each time the
  // player crossed a 25 m midpoint — the whole view vanished at once,
  // "like a different world" (Akmal playtest 19 Nov; this collective
  // teleport, not the reveal fade, was the main cause all along).
  if (envFx.shaft) envFx.shaft.position.y = Math.min(0, Math.ceil(pp.y / CONFIG.survival.stratumDepth) * CONFIG.survival.stratumDepth);
  // The seabed rings live in their OWN group locked to the player's current
  // floor (not the 50 m shaft snap): the current floor's base plane always
  // has its ring, and no ring ever floats above it as a fake layer.
  if (envFx.seabed) envFx.seabed.position.y = -(survFloorOf(pp.y) - 1) * CONFIG.survival.floorDepth; // rings are built one floor below the group origin; the -1 rebases the lock to Floor 1-based numbering (Akmal 19 Nov: seabed vanished)
}
function smoothstep(a, b, x){ const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function tintAsset(root, hex, amt){
  const c = new THREE.Color(hex);
  root.traverse(o => {
    if (o.isMesh && o.material && o.material.color){
      o.material.color.lerp(c, amt);
      if (o.material.emissive) o.material.emissive.lerp(c, amt * 0.8);
    }
  });
}
// Collects rock transforms and builds ONE InstancedMesh (1 draw call for all rocks).
function rockBatch(mat){
  const mats = [];
  return {
    add(x, y, z, sx, sy, sz){
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-0.25, 0.25), rand(0, Math.PI * 2), rand(-0.25, 0.25)));
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)));
    },
    build(){
      const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat, mats.length);
      for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
      im.instanceMatrix.needsUpdate = true;
      return im;
    }
  };
}
function buildSeabed(zone){
  const A = CONFIG.arena;
  const geo = new THREE.PlaneGeometry((A.radius + 70) * 2, (A.radius + 70) * 2, 76, 76);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    let y = Math.sin(x * 0.045) * Math.cos(z * 0.05) * 0.9 + Math.sin((x + z) * 0.02) * 1.2 + Math.sin(r * 0.055) * 0.6;
    y *= 0.4 + smoothstep(120, 230, r) * 1.5;
    y += Math.pow(smoothstep(205, 255, r), 2) * 22;   // trench wall rises at the rim
    y -= smoothstep(60, 240, r) * 2.5;                 // gentle bowl
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const mat = std(new THREE.Color(zone.tint.water).multiplyScalar(1.35).getHex(), { roughness: 1, metalness: 0.02, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = A.floorY;
  return m;
}
// ---- kelp (shared tapered geometries, sway via pivot) ----
const _kelpGeos = {};
function kelpGeo(h){
  if (_kelpGeos[h]) return _kelpGeos[h];
  const geo = new THREE.PlaneGeometry(1.15, h, 1, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const v = (pos.getY(i) + h / 2) / h;
    pos.setX(i, pos.getX(i) * (1 - v * 0.55));
    pos.setZ(i, Math.sin(v * 2.4) * 0.5 * v);
  }
  geo.computeVertexNormals();
  geo.translate(0, h / 2, 0);
  return (_kelpGeos[h] = geo);
}
function addKelp(parent, mat, x, yBase, z, accent){
  const h = pick([11, 17, 24]);
  const pivot = new THREE.Group();
  pivot.position.set(x, yBase, z);
  const blade = new THREE.Mesh(kelpGeo(h), mat);
  blade.rotation.y = rand(0, Math.PI);
  pivot.add(blade);
  if (Math.random() < 0.4){
    const tip = makeGlowSprite(accent, rand(2.2, 3.4), 0.3);
    tip.position.y = h * 0.96;
    pivot.add(tip);
  }
  parent.add(pivot);
  envFx.kelp.push({ pivot, phase: rand(0, Math.PI * 2), speed: rand(0.5, 0.85), amp: rand(0.05, 0.1) });
}
// ---- per-zone dressing (DESIGN.md themes) ----
const dressing = {
  rocks(g, zone){ // Z1 The Shelf — clean rock + crystal outcrops
    for (let i = 0; i < 5; i++){
      const c = makeAsset('crystal');
      c.scale.setScalar(rand(1.2, 2.0));
      const p = randArenaPos(45, 195, 0, 0);
      c.position.set(p.x, CONFIG.arena.floorY + 1.1, p.z);
      c.rotation.y = rand(0, 3);
      tintAsset(c, zone.tint.accent, 0.3);
      g.add(c);
    }
  },
  pillars(g, zone){ // Z2 Kelp Ruins — ruined pillars + swaying kelp
    const A = CONFIG.arena, F = A.floorY;
    const stone = std(0x3d5c4c, { roughness: 0.9, flatShading: true });
    const stone2 = std(0x33503f, { roughness: 0.9, flatShading: true });
    const spots = [];
    for (let i = 0, nP = Math.round(11 * (zone.decorMul || 1)); i < nP; i++){
      const p = randArenaPos(38, 205, 0, 0);
      spots.push(p);
      const broken = Math.random() < 0.35;
      const h = broken ? rand(5, 9) : rand(13, 26);
      const grp = new THREE.Group(); grp.position.set(p.x, F - 2, p.z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3, 4.6), stone2); base.position.y = 1; grp.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rand(1.5, 2.1), rand(1.9, 2.5), h, 9), stone);
      shaft.position.y = 2.4 + h / 2; shaft.rotation.z = rand(-0.045, 0.045); grp.add(shaft);
      if (!broken){
        const cap = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 4.4), stone2);
        cap.position.y = 2.4 + h + 0.7; cap.rotation.y = rand(0, 0.6); grp.add(cap);
      } else {
        const fall = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, rand(5, 8), 9), stone);
        fall.rotation.z = Math.PI / 2 + rand(-0.15, 0.15); fall.rotation.y = rand(0, 3);
        fall.position.set(rand(4, 7) * (Math.random() < 0.5 ? -1 : 1), 1.9, rand(-3, 3)); grp.add(fall);
      }
      g.add(grp);
    }
    const kelpMat = new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.6, metalness: 0.05,
      emissive: 0x1d5c38, emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 4; i++) spots.push(randArenaPos(40, 200, 0, 0));
    for (const p of spots){
      const n = randi(2, 4);
      for (let i = 0; i < n; i++) addKelp(g, kelpMat, p.x + rand(-6, 6), F - 2, p.z + rand(-6, 6), zone.tint.accent);
    }
  },
  wreck(g, zone){ // Z3 The Wreck Field — broken hulls, masts, debris
    const F = CONFIG.arena.floorY;
    const hullMat = std(0x54402c, { roughness: 0.72, metalness: 0.45, side: THREE.DoubleSide });
    const darkMetal = std(0x33302c, { roughness: 0.6, metalness: 0.55 });
    const woodMat = std(0x4a3826, { roughness: 0.9 });
    const hullGeo = new THREE.CylinderGeometry(5, 5.6, 16, 14, 1, true, 0, Math.PI);
    hullGeo.rotateZ(Math.PI / 2); // axis along X, shell opens downward = capsized hull
    for (let s = 0, nW = Math.round(3 * (zone.decorMul || 1)); s < nW; s++){
      const c = randArenaPos(85, 175, 0, 0);
      const site = new THREE.Group();
      site.position.set(c.x, F - 1.5, c.z);
      site.rotation.y = rand(0, Math.PI * 2);
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.scale.set(rand(0.85, 1.15), rand(0.9, 1.1), 1);
      hull.rotation.x = rand(-0.08, 0.08);
      site.add(hull);
      const keel = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 2.2), darkMetal);
      keel.position.y = 0.4; site.add(keel);
      for (let ri = 0; ri < 3; ri++){
        const rib = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.26, 6, 14, Math.PI), darkMetal);
        rib.position.x = -5 + ri * 5;
        rib.rotation.y = Math.PI / 2;
        site.add(rib);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 13, 7), woodMat);
      mast.position.set(rand(-4, 2), 3.4, rand(-2, 2));
      mast.rotation.z = rand(0.5, 0.85);
      site.add(mast);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7, 6), woodMat);
      yard.position.copy(mast.position); yard.position.y += 3.4;
      yard.rotation.z = Math.PI / 2; yard.rotation.y = rand(0, 1);
      site.add(yard);
      for (let d = 0; d < 7; d++){
        const plank = new THREE.Mesh(new THREE.BoxGeometry(rand(2.5, 5.5), 0.35, rand(0.8, 1.6)), Math.random() < 0.5 ? woodMat : darkMetal);
        plank.position.set(rand(-10, 10), rand(0.2, 1.2), rand(-9, 9));
        plank.rotation.set(rand(-0.2, 0.2), rand(0, 3), rand(-0.2, 0.2));
        site.add(plank);
      }
      for (let b = 0; b < 2; b++){
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2, 10), darkMetal);
        barrel.position.set(rand(-9, 9), 0.9, rand(-8, 8));
        barrel.rotation.z = Math.PI / 2 + rand(-0.2, 0.2);
        site.add(barrel);
      }
      g.add(site);
    }
  },
  crystals(g, zone){ // Z4 Magenta Deep — crystal outcrops + glowing flora
    const F = CONFIG.arena.floorY;
    for (let i = 0, nC = Math.round(8 * (zone.decorMul || 1)); i < nC; i++){
      const c = makeAsset('crystal');
      c.scale.setScalar(rand(1.8, 3.3));
      const p = randArenaPos(30, 210, 0, 0);
      c.position.set(p.x, F + 1.4, p.z);
      c.rotation.y = rand(0, 3);
      tintAsset(c, zone.tint.accent, 0.8);
      g.add(c);
    }
    const stalkMat = std(0x3a1030, { roughness: 0.8 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x57104a, emissive: zone.tint.accent, emissiveIntensity: 1.5, roughness: 0.4 });
    for (let i = 0, nF = Math.round(18 * (zone.decorMul || 1)); i < nF; i++){
      const p = randArenaPos(35, 205, 0, 0);
      const cl = new THREE.Group(); cl.position.set(p.x, F - 1.5, p.z);
      const n = randi(3, 5);
      for (let j = 0; j < n; j++){
        const h = rand(0.9, 2.1), ox = rand(-2.4, 2.4), oz = rand(-2.4, 2.4);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), stalkMat);
        stalk.position.set(ox, h / 2, oz); cl.add(stalk);
        const head = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.52), 10, 8), headMat);
        head.position.set(ox, h + 0.25, oz); cl.add(head);
      }
      const glow = makeGlowSprite(zone.tint.accent, rand(4.5, 6.5), 0.45);
      glow.position.y = 1.6; cl.add(glow);
      addGlowPulse(glow, 0.22, rand(1.1, 1.9), 0.1);
      g.add(cl);
    }
  },
  catacombs(g, zone){ // Z6 The Drowned Catacombs — pale broken pillars, no kelp; the dark between them hides things
    const F = CONFIG.arena.floorY;
    const bone = std(0x8a8578, { roughness: 0.95, flatShading: true });
    const bone2 = std(0x6e6a5e, { roughness: 0.95, flatShading: true });
    for (let i = 0; i < 14; i++){
      const p = randArenaPos(38, 205, 0, 0);
      const broken = Math.random() < 0.5;
      const h = broken ? rand(4, 8) : rand(12, 24);
      const grp = new THREE.Group(); grp.position.set(p.x, F - 2, p.z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3, 4.8), bone2); base.position.y = 1; grp.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rand(1.5, 2.1), rand(1.9, 2.5), h, 9), bone);
      shaft.position.y = 2.4 + h / 2; shaft.rotation.z = rand(-0.05, 0.05); grp.add(shaft);
      if (!broken){
        const cap = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.5, 4.6), bone2);
        cap.position.y = 2.4 + h + 0.7; cap.rotation.y = rand(0, 0.6); grp.add(cap);
      } else {
        const fall = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, rand(5, 9), 9), bone);
        fall.rotation.z = Math.PI / 2 + rand(-0.15, 0.15); fall.rotation.y = rand(0, 3);
        fall.position.set(rand(4, 7) * (Math.random() < 0.5 ? -1 : 1), 1.9, rand(-3, 3)); grp.add(fall);
      }
      g.add(grp);
    }
  },
  vents(g, zone){ // Z9 The Vent Fields — bubble vent columns with a hot glow at the base
    const F = CONFIG.arena.floorY;
    for (let i = 0; i < 6; i++){
      const p = randArenaPos(45, 200, 0, 0);
      g.add(makeBubbleVent(p.x, F - 1, p.z));
      const glow = makeGlowSprite(zone.tint.accent, rand(6, 9), 0.4);
      glow.position.set(p.x, F + 1.2, p.z); g.add(glow);
      addGlowPulse(glow, 0.25, rand(1.2, 2.0), 0.1);
    }
  },
  gate(g, zone, rb){ // Z5 The Abyss Gate — monumental rock framing the gate at (0, 2, -165)
    const F = CONFIG.arena.floorY, gz = -165;
    const slabMat = std(0x3d3454, { roughness: 0.9, flatShading: true });
    for (const sx of [-1, 1]){
      rb.add(sx * 21, F + 17, gz, 11, 34, 10);
      rb.add(sx * 25, F + 13, gz - 7, 9, 26, 9);
      rb.add(sx * 17, F + 9, gz + 8, 7, 18, 7);
      for (const [ox, oz] of [[13, -128], [15, -146]]){
        const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 14, 3.4), slabMat);
        slab.position.set(sx * ox, F + 5.5, oz);
        slab.rotation.set(rand(-0.05, 0.05), rand(-0.2, 0.2), rand(-0.05, 0.05));
        g.add(slab);
      }
    }
    rb.add(0, F + 50, gz, 18, 8, 9); // lintel boulder above the ring
    for (let i = 0; i < 8; i++){
      const a = rand(0, Math.PI * 2), r = rand(185, 220), s = rand(8, 14);
      rb.add(Math.cos(a) * r, F + s * 0.35, Math.sin(a) * r, s, s * 1.1, s);
    }
  }
};

// ============================ DECOR ============================
// ---- procedural coral + kelp beds (no new assets; instanced, decoration only) ----
let _coralGeos = null;
function coralGeos(){
  if (_coralGeos) return _coralGeos;
  const fan = new THREE.CylinderGeometry(1.7, 0.22, 2.4, 7, 1, true); // fan coral
  fan.scale(1, 1, 0.32); fan.translate(0, 1.2, 0);
  const brain = new THREE.IcosahedronGeometry(1.15, 1);               // brain coral
  brain.scale(1, 0.55, 1); brain.translate(0, 0.5, 0);
  const parts = [];                                                    // staghorn coral
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 1.6, 6); trunk.translate(0, 0.8, 0); parts.push(trunk);
  for (let i = 0; i < 5; i++){
    const b = new THREE.CylinderGeometry(0.05, 0.13, rand(1.1, 1.7), 5);
    b.translate(0, 0.75, 0);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rand(-0.4, 0.4), (i / 5) * Math.PI * 2, rand(0.35, 0.75) * (i % 2 ? 1 : -1)));
    m.setPosition(rand(-0.15, 0.15), rand(0.9, 1.4), rand(-0.15, 0.15));
    b.applyMatrix4(m); parts.push(b);
  }
  _coralGeos = { fan, brain, stag: mergeGeometries(parts) };
  return _coralGeos;
}
function coralMesh(geo, n, accentHex, eInt){
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.05,
    emissive: accentHex, emissiveIntensity: eInt, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.userData.flora = true;
  return im;
}
const FLORA_PALETTE = [0xff8c5a, 0xff5a7a, 0x35e0c8, 0xb46aff, 0xffc93a];
function addFlora(g, zone){ // Expedition: coral clusters + kelp beds on the arena floor
  const F = CONFIG.arena.floorY;
  const geos = coralGeos();
  const accent = new THREE.Color(zone.tint.accent);
  const palette = FLORA_PALETTE.map(h => new THREE.Color(h).lerp(accent, 0.4));
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const fill = (im, n, sMin, sMax) => {
    for (let i = 0; i < n; i++){
      const p = randArenaPos(24, 214, 0, 0);
      dummy.position.set(p.x, F - 1.6, p.z);
      dummy.rotation.set(rand(-0.12, 0.12), rand(0, Math.PI * 2), rand(-0.12, 0.12));
      const s = rand(sMin, sMax); dummy.scale.set(s, s * rand(0.8, 1.25), s);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      col.copy(pick(palette)).offsetHSL(rand(-0.03, 0.03), 0, rand(-0.06, 0.06));
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    g.add(im);
  };
  fill(coralMesh(geos.fan, 30, zone.tint.accent, 0.32), 30, 1.1, 2.6);
  fill(coralMesh(geos.brain, 24, zone.tint.accent, 0.22), 24, 0.9, 2.2);
  fill(coralMesh(geos.stag, 26, zone.tint.accent, 0.38), 26, 1.0, 2.3);
  const kelpMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x2e7d4f).lerp(accent, 0.25).getHex(), roughness: 0.6, metalness: 0.05,
    emissive: new THREE.Color(0x1d5c38).lerp(accent, 0.3).getHex(), emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  for (let b = 0; b < 7; b++){
    const c = randArenaPos(30, 205, 0, 0), n = randi(3, 5);
    for (let i = 0; i < n; i++) addKelp(g, kelpMat, c.x + rand(-7, 7), F - 2, c.z + rand(-7, 7), zone.tint.accent);
  }
}
function addSurvivalFlora(grp, outcrops){ // Survival: coral on wall ledges AND mid-field outcrops + kelp forests
  const S = CONFIG.survival, geos = coralGeos();
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const palette = FLORA_PALETTE.map(h => new THREE.Color(h).lerp(new THREE.Color(0x7fe0ff), 0.35));
  const ledge = () => { const a = rand(0, Math.PI * 2), r = S.shaftRadius - rand(3, 9);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: -randi(0, 7) * 50 - rand(4, 46) }; };
  let ocIdx = 0;
  const spot = () => { // alternate: wall ledge / mid-field outcrop top (the near+mid field fill)
    if (outcrops && outcrops.length && (ocIdx % 2 === 0)){
      const o = outcrops[ocIdx % outcrops.length]; ocIdx++;
      return { x: o.x + rand(-3, 3), z: o.z + rand(-3, 3), y: o.y - 0.4 };
    }
    ocIdx++; return ledge();
  };
  const fill = (im, n, sMin, sMax) => {
    for (let i = 0; i < n; i++){
      const p = spot();
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(rand(-0.15, 0.15), rand(0, Math.PI * 2), rand(-0.15, 0.15));
      const s = rand(sMin, sMax) * (p.y < -200 ? 1.35 : 1); // deeper = bigger silhouettes
      dummy.scale.set(s, s, s);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      col.copy(pick(palette)).offsetHSL(0, 0, rand(-0.06, 0.06)); im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    grp.add(im);
  };
  fill(coralMesh(geos.fan, 36, 0x2a7a8c, 0.3), 36, 0.9, 2.0);
  fill(coralMesh(geos.stag, 36, 0x2a7a8c, 0.36), 36, 0.9, 2.0);
  fill(coralMesh(geos.brain, 24, 0x2a7a8c, 0.22), 24, 0.9, 1.8);
  const kelpMat = new THREE.MeshStandardMaterial({ color: 0x27573f, roughness: 0.6, metalness: 0.05,
    emissive: 0x14301f, emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  // kelp forests: clustered blades (3–5) rooted on outcrop tops + wall ledges —
  // a 24-unit blade spans a whole floor, which is the water column's verticality.
  const anchors = [];
  if (outcrops) for (let i = 0; i < outcrops.length; i += 3) anchors.push({ x: outcrops[i].x, y: outcrops[i].y - 0.5, z: outcrops[i].z });
  for (let i = 0; i < 3; i++){ const p = ledge(); anchors.push(p); }
  for (const a of anchors){
    const n = randi(3, 4);
    for (let i = 0; i < n; i++) addKelp(grp, kelpMat, a.x + rand(-4, 4), a.y, a.z + rand(-4, 4), 0x7fe0ff);
  }
}
function addDecor(scene, zone){
  resetEnvFx();
  const A = CONFIG.arena, F = A.floorY;
  const g = new THREE.Group();
  scene.add(g);
  g.add(buildSeabed(zone));
  const rockMat = std(new THREE.Color(zone.tint.water).multiplyScalar(2.1).getHex(), { roughness: 0.95, metalness: 0.04, flatShading: true });
  const rocks = rockBatch(rockMat);
  // perimeter trench wall — two staggered layers of instanced rock
  for (let i = 0; i < 46; i++){
    const a = (i / 46) * Math.PI * 2 + rand(-0.05, 0.05), r = rand(226, 240), s = rand(10, 17);
    rocks.add(Math.cos(a) * r, F + 12 + s * 0.25, Math.sin(a) * r, s, s * rand(0.8, 1.15), s);
  }
  for (let i = 0; i < 34; i++){
    const a = (i / 34) * Math.PI * 2 + rand(-0.07, 0.07) + 0.09, r = rand(238, 254), s = rand(9, 15);
    rocks.add(Math.cos(a) * r, F + 20 + s * 0.25, Math.sin(a) * r, s, s * rand(0.9, 1.3), s);
  }
  // composed rock clusters (not random spam)
  for (let c = 0; c < 9; c++){
    const a = rand(0, Math.PI * 2), r = rand(55, 195), cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const n = randi(3, 6);
    for (let i = 0; i < n; i++){
      const s = rand(2.2, 6.5);
      rocks.add(cx + rand(-8, 8), F + s * 0.28, cz + rand(-8, 8), s, s * rand(0.65, 1), s);
    }
  }
  for (let i = 0; i < 14; i++){
    const p = randArenaPos(30, 215, 0, 0), s = rand(2.5, 5.5);
    rocks.add(p.x, F + s * 0.3, p.z, s, s * 0.8, s);
  }
  const dz = dressing[zone.decor];
  if (dz) dz(g, zone, rocks);
  addFlora(g, zone);
  g.add(rocks.build());
  registerReveal(g, { min: 0.3 });
  addMarineSnow(scene);
}
const SEABED_MAT = new THREE.MeshStandardMaterial({ color: 0x2b3a3c, roughness: 1, metalness: 0.02, flatShading: true, side: THREE.DoubleSide });
// ---- survival set pieces (decoration only; merged primitives, shared materials) ----
// One per floor, rotating vent → shipwreck → anemone → shipwreck. Placement keeps the descent
// gate's cylinder clear (gate sits at r ≤ 62 with an 8.6 ring): pillars and
// outcrops start at r ≥ 74, wrecks stay in a floor's upper half (the gate
// plane is at floorTop − 20), anemones hug the wall at r ≥ 128.
function makeBubbleVent(x, y, z){
  const N = 42, H = 23;
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++){
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 1.5;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rand(0, H); pos[i * 3 + 2] = Math.sin(a) * r;
    spd[i] = rand(2.6, 5.2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.65, transparent: true, opacity: 0.5, depthWrite: false }));
  pts.position.set(x, y, z);
  pts.userData.setPiece = 'vent';
  envFx.vents.push({ pts, spd, h: H });
  return pts;
}
function makeWreckCluster(mat){
  const parts = [];
  const plate = (w, h, d, x, y, z, rx, ry, rz) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.setPosition(x, y, z); g.applyMatrix4(m); parts.push(g);
  };
  plate(7, 0.35, 4.5, 0, 0, 0, 0.15, 0.4, 0.08);
  plate(5.5, 0.3, 3.6, 1.8, 0.9, -1.2, -0.3, 1.1, 0.5);
  plate(4.2, 0.3, 3, -2.2, 0.5, 1.4, 0.5, 2.2, -0.2);
  for (let i = 0; i < 3; i++){
    const g = new THREE.CylinderGeometry(0.85, 0.85, 2.3, 9);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2 + rand(-0.3, 0.3), 0, rand(0, 3)));
    m.setPosition(rand(-3, 3), 0.6, rand(-2.5, 2.5)); g.applyMatrix4(m); parts.push(g);
  }
  const holder = new THREE.Group(); holder.userData.setPiece = 'wreck';
  holder.add(new THREE.Mesh(mergeGeometries(parts), mat));
  return holder;
}
// A real sunken ship, not debris: ~19-unit broken hull in two sections with a
// gap at the break, exposed ribs arcing over the main section, a tilted mast
// with crossbar and a fallen second mast, plus a funnel — one merged mesh.
function makeShipwreck(mat){
  const parts = [];
  const put = (geo, x, y, z, rx, ry, rz) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.setPosition(x, y, z); geo.applyMatrix4(m); parts.push(geo);
  };
  // main hull section (stern), rolled slightly, deck plates on top
  put(new THREE.BoxGeometry(10.5, 1.1, 3.8), 0, 0, 0, 0, 0, 0.07);            // keel plate
  put(new THREE.BoxGeometry(10.5, 2.0, 0.35), 0, 1.2, 1.75, -0.22, 0, 0.07); // near hull side
  put(new THREE.BoxGeometry(10.5, 2.0, 0.35), 0, 1.0, -1.75, 0.3, 0, 0.07);  // far hull side, partially collapsed
  put(new THREE.BoxGeometry(9.6, 0.3, 3.3), 0, 2.15, 0, 0, 0, 0.1);          // deck
  // bow section, broken off and yawed away across a 2.5-unit gap
  put(new THREE.BoxGeometry(5.5, 1.0, 3.4), 9.2, -0.4, 1.6, 0.1, 0.65, -0.16);
  put(new THREE.ConeGeometry(1.7, 3.4, 4), 12.6, -0.3, 2.9, 0, Math.PI / 4 + 0.65, Math.PI / 2); // tapered bow tip
  // exposed ribs over the main section
  for (let i = 0; i < 5; i++)
    put(new THREE.TorusGeometry(2.05, 0.17, 6, 12, Math.PI), -4 + i * 2, 0.6, 0, 0, Math.PI / 2, 0.07);
  // standing mast (tilted) with crossbar + fallen mast across the deck
  put(new THREE.CylinderGeometry(0.16, 0.22, 8.5, 7), -1.5, 5.6, 0, 0.14, 0, 0.2);
  put(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6), -2.1, 8.2, 0, 0, 0, Math.PI / 2 - 0.2);
  put(new THREE.CylinderGeometry(0.14, 0.2, 7, 7), 2.6, 2.6, 0.6, Math.PI / 2 - 0.25, 0, 1.15);
  // funnel / smokestack — the instant "ship" read
  put(new THREE.CylinderGeometry(0.85, 1.0, 2.8, 10), -3.6, 3.2, 0, 0, 0, 0.12);
  // scattered cargo barrels by the break
  for (let i = 0; i < 3; i++)
    put(new THREE.CylinderGeometry(0.8, 0.8, 2.1, 9), 6.4 + rand(-1, 1), 0.4, rand(-2.4, 0.5), Math.PI / 2 + rand(-0.3, 0.3), 0, rand(0, 3));
  const holder = new THREE.Group(); holder.userData.setPiece = 'wreck';
  holder.add(new THREE.Mesh(mergeGeometries(parts), mat));
  return holder;
}
const ANEM_HEXES = [0xff5a7a, 0xb46aff, 0x35e0c8, 0xff8c5a];
function makeAnemonePatch(){
  const hex = pick(ANEM_HEXES);
  const mat = new THREE.MeshStandardMaterial({ color: 0x180d14, roughness: 0.5, metalness: 0.05, emissive: hex, emissiveIntensity: 1.1 });
  const parts = [];
  for (let i = 0; i < 12; i++){
    const g = new THREE.ConeGeometry(rand(0.22, 0.4), rand(1.2, 2.4), 6);
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 3.2;
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rand(-0.35, 0.35), 0, rand(-0.35, 0.35)));
    m.setPosition(Math.cos(a) * r, rand(0.5, 1.1), Math.sin(a) * r);
    g.applyMatrix4(m); parts.push(g);
  }
  for (let i = 0; i < 5; i++){
    const g = new THREE.SphereGeometry(rand(0.3, 0.55), 8, 6);
    g.translate(rand(-3, 3), 0.3, rand(-3, 3)); parts.push(g);
  }
  const holder = new THREE.Group(); holder.userData.setPiece = 'anemone';
  holder.add(new THREE.Mesh(mergeGeometries(parts), mat));
  const sp = makeGlowSprite(hex, 7.5, 0.28); sp.position.y = 1.2; holder.add(sp);
  return holder;
}
// Survival shaft dressing: a periodic rock wall (50 m bands) that snaps along
// with the descent, PLUS per-floor dressing so no floor reads empty: instanced
// spires/pillars for verticality, mid-field outcrops carrying coral + kelp
// forests, and one rotating set piece per floor. In-volume pieces carry
// LOCAL-space capsule colliders (envFx.dressColliders; world y adds the
// shaft snap) — playtest 19 Nov: the sub ghosted through these pillars.
// Deeper bands run sparser but bigger.
function addSurvivalDressing(scene){
  resetEnvFx();
  const S = CONFIG.survival;
  const mat = std(0x24333a, { roughness: 0.95, metalness: 0.04, flatShading: true });
  const batch = rockBatch(mat);   // wall + spires + pillars + outcrops: 1 draw call
  const batch2 = rockBatch(mat);  // set-piece base rocks: 1 more
  const BAND = 50, BANDS = 8;
  const outcrops = []; // {x, y(top), z} — coral / kelp / vent anchors in the play volume
  const dressCols = []; // {x, z, yBot, yTop, rad} LOCAL colliders for in-volume dressing
  for (let b = 0; b < BANDS; b++){
    const top = -b * BAND, deep = b >= 4, big = deep ? 1.4 : 1;
    for (let i = 0; i < 26; i++){
      const a = (i / 26) * Math.PI * 2 + rand(-0.09, 0.09) + b * 0.35, r = S.shaftRadius + rand(4, 18), s = rand(6, 13);
      batch.add(Math.cos(a) * r, -b * BAND - rand(0, BAND), Math.sin(a) * r, s, s * rand(0.9, 1.4), s);
    }
    for (let i = 0; i < 3; i++){
      const a = rand(0, Math.PI * 2), r = S.shaftRadius - rand(2, 10), s = rand(4, 8), y = -b * BAND - rand(6, 44), x = Math.cos(a) * r, z = Math.sin(a) * r;
      batch.add(x, y, z, s, s * 0.7, s);
      dressCols.push({ x, z, yBot: y - s * 0.35, yTop: y + s * 0.35, rad: s * 0.5 });
    }
    // rock spires hugging the wall — tall silhouettes that break its flatness
    for (let i = 0, n = deep ? 3 : 4; i < n; i++){
      const a = rand(0, Math.PI * 2), r = S.shaftRadius - rand(10, 24), h = rand(15, 34) * big, w = rand(2.6, 4.2) * big;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, yc = top - rand(6, 30);
      batch.add(x, yc, z, w, h, w);
      dressCols.push({ x, z, yBot: yc - h / 2, yTop: yc + h / 2, rad: w * 0.5 });
    }
    // free-standing pillars inside the play volume (r ≥ 76: clear of the gate)
    for (let i = 0, n = deep ? 2 : 3; i < n; i++){
      const a = rand(0, Math.PI * 2), r = rand(76, 118), h = rand(11, 24) * big, w = rand(3, 5) * big;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, yc = top - rand(10, 34);
      batch.add(x, yc, z, w, h, w);
      outcrops.push({ x, y: yc + h * 0.5, z }); // pillar tops carry coral/kelp too — raised glowing outcrops at eye level
      dressCols.push({ x, z, yBot: yc - h / 2, yTop: yc + h / 2, rad: w * 0.5 });
    }
    // floating islets + a small cluster per band: mid-water silhouettes that
    // layer through the fog INSIDE the view cone (the column read bare)
    for (let i = 0; i < 3; i++){
      const a = rand(0, Math.PI * 2), r = rand(30, 105), s = rand(3.5, 8.5) * big, y = top - rand(4, 46), x = Math.cos(a) * r, z = Math.sin(a) * r;
      batch.add(x, y, z, s, s * rand(0.6, 1), s);
      dressCols.push({ x, z, yBot: y - s * 0.5, yTop: y + s * 0.5, rad: s * 0.5 });
    }
    { const a = rand(0, Math.PI * 2), r = rand(40, 100), cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = top - rand(6, 44);
      for (let i = 0; i < 3; i++){ const s = rand(1.8, 4) * big; batch.add(cx + rand(-6, 6), cy + rand(-4, 4), cz + rand(-6, 6), s, s * 0.8, s); }
      dressCols.push({ x: cx, z: cz, yBot: cy - 5, yTop: cy + 5, rad: 6 }); }
    // mid-field outcrops (r ≥ 74: clear of the gate) — anchors for the flora
    for (let i = 0; i < 3; i++){
      const a = rand(0, Math.PI * 2), r = rand(74, 122), s = rand(4.5, 8) * big, y = top - rand(8, 42);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      batch.add(x, y, z, s, s * 0.75, s);
      outcrops.push({ x, y: y + s * 0.55, z });
      dressCols.push({ x, z, yBot: y - s * 0.4, yTop: y + s * 0.4, rad: s * 0.5 });
    }
  }
  const grp = new THREE.Group();
  grp.add(batch.build());
  // ---- set pieces: one per floor (25 m), rotating vent / WRECK / anemone / WRECK ----
  // Shipwrecks now anchor half the floors (Akmal: wrecks should read as real
  // sunken ships). They sit at r 78–118 so the ~19-unit hull keeps the gate
  // cylinder (r ≤ 62 + ring) structurally clear, in the floor's upper half.
  const wreckMat = std(0x2c3840, { roughness: 0.75, metalness: 0.5, flatShading: true });
  for (let f = 0, nF = Math.ceil(BANDS * BAND / S.floorDepth); f < nF; f++){
    const floorTop = -f * S.floorDepth, type = f % 4;
    if (type === 0){ // bubble vent — rooted on an outcrop of this floor when one is near
      const anchor = outcrops.find(o => o.y < floorTop + 2 && o.y > floorTop - (S.floorDepth + 2));
      if (anchor) grp.add(makeBubbleVent(anchor.x, anchor.y, anchor.z));
      else {
        const a = rand(0, Math.PI * 2), r = rand(80, 118), x = Math.cos(a) * r, z = Math.sin(a) * r;
        batch2.add(x, floorTop - (S.floorDepth - 1.5), z, 4, 2, 4);
        grp.add(makeBubbleVent(x, floorTop - (S.floorDepth - 2.5), z));
      }
    } else if (type === 1 || type === 3){ // shipwreck — lower half of the floor, resting toward the seabed
      const a = rand(0, Math.PI * 2), r = rand(78, 118);
      const w = makeShipwreck(wreckMat);
      w.position.set(Math.cos(a) * r, floorTop - rand(S.floorDepth * 0.52, S.floorDepth * 0.76), Math.sin(a) * r);
      w.rotation.y = rand(0, Math.PI * 2);
      grp.add(w);
      dressCols.push({ x: w.position.x, z: w.position.z, yBot: w.position.y - 4, yTop: w.position.y + 4, rad: 8 });
    } else { // glowing anemone patch on the wall
      const a = rand(0, Math.PI * 2), r = rand(128, 142), x = Math.cos(a) * r, z = Math.sin(a) * r, y = floorTop - rand(S.floorDepth * 0.24, S.floorDepth * 0.8);
      batch2.add(x, y - 1.2, z, 4.5, 2.6, 4.5);
      const an = makeAnemonePatch(); an.position.set(x, y, z); grp.add(an);
    }
  }
  grp.add(batch2.build());
  // ---- per-floor seabed: a terrain ring at every floor's base plane ----
  // The ring's centre (r < 74) stays open — that is the descent opening the
  // gates (r ≤ 62 + ring) sit in; spawnSurvivalGate adds a local disc with
  // the exact hole at the gate itself. Dune displacement is a smooth
  // deterministic function of position, so the merged rings have no seams.
  // The rings live in their OWN group (envFx.seabed), locked to the player's
  // current floor in updateEnvFx — NOT in the 50 m-snapping shaft group.
  // History (19 Nov playtests): inside the snapping group the ring vanished
  // from odd floors' base planes (the gate disc floated); extra rings above
  // fixed that but read as fake LAYERS stacked over the spawn floor. Locked
  // to the floor, the current base plane always has its ring and no ring
  // ever sits above it.
  {
    const FD = S.floorDepth, ringGeos = [];
    for (let f = 0, n = Math.ceil(BANDS * BAND / FD); f < n; f++){
      const g = new THREE.RingGeometry(74, 152, 48, 3);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++){
        const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
        if (r > 78 && r < 148) p.setY(i, Math.sin(x * 0.08) * Math.cos(z * 0.06) * 1.4);
      }
      g.computeVertexNormals();
      g.translate(0, -f * FD - FD, 0);
      ringGeos.push(g);
    }
    const seabedGrp = new THREE.Group();
    seabedGrp.add(new THREE.Mesh(mergeGeometries(ringGeos), SEABED_MAT));
    scene.add(seabedGrp);
    registerReveal(seabedGrp, { min: 0.45 });
    envFx.seabed = seabedGrp;
  }
  addSurvivalFlora(grp, outcrops);
  scene.add(grp);
  registerReveal(grp, { min: 0.45 });
  envFx.shaft = grp;
  envFx.dressColliders = dressCols.map(c => ({ ...c, rad: c.rad * 0.8 })); // 0.8: same phantom-hitbox trim as the band rocks
  addMarineSnow(scene);
}

// ============================ START: EXPEDITION ============================
function startExpedition(zone){
  revealables = [];
  gameScene = baseGameScene(zone.tint.fog);
  if (zone.fogFar) gameScene.fog.far = zone.fogFar; // per-zone murk: the Shelf stays clear, the Kelp Ruins close in
  G = newG('expedition'); G.zone = zone;
  G.crystalsTotal = zone.crystals;
  G.surviveT = zone.mission.time || 0;
  if (zone.id === 1) G.hintStep = 0;
  player = spawnPlayer(gameScene, SAVE.sub, new THREE.Vector3(0, 0, 95));
  player.yaw = Math.PI;
  G.torps = Math.min(SAVE.stock.torp, player.d.def.torpCap);
  G.decoys = Math.min(SAVE.stock.decoy, player.d.def.decoyCap);
  addDecor(gameScene, zone);
  for (let i=0;i<zone.crystals;i++) spawnCrystal(gameScene, randArenaPos(28, 205), zone.crystalValue);
  if (!SAVE.golden[zone.id]) spawnCrystal(gameScene, randArenaPos(195, 222), CONFIG.econ.golden, true);
  G.gate = spawnGate(gameScene, new THREE.Vector3(0, 2, -165));
  for (const typeId of zone.hunters){
    let pos = randArenaPos(70, 195);
    while (pos.distanceTo(player.group.position) < 75) pos = randArenaPos(70, 195);
    const h = spawnHunter(gameScene, typeId, pos);
    h.speedMul = zone.hunterSpeedMul;
  }
  for (let gi = 0; gi < (zone.guardians || 0); gi++){ // Gate Guardian(s) wait in front of the gate
    const gx = zone.guardians > 1 ? (gi === 0 ? rand(-40, -14) : rand(14, 40)) : rand(-35, 35);
    const grd = spawnHunter(gameScene, 'brute', new THREE.Vector3(gx, 2, -165 + rand(28, 48)), { hpMul: 3, scaleMul: 1.7 });
    grd.speedMul = zone.hunterSpeedMul;
  }
  for (let i=0;i<zone.jellies;i++) spawnJelly(gameScene, randArenaPos(25, 210), zone.tint.accent);
  for (let i=0;i<zone.mines;i++) spawnMine(gameScene, randArenaPos(45, 195));
  if (zone.mission.type === 'nests') for (let i=0;i<zone.mission.nests;i++){
    const np = randArenaPos(95, 185, -14, 18);
    const nest = spawnNest(gameScene, np);
    for (const gt of ['skitter','stalker']){ // every nest keeps a guard pack at its post
      const gp = np.clone(); gp.x += rand(-13, 13); gp.z += rand(-13, 13);
      gp.y = clamp(np.y + rand(-4, 6), CONFIG.arena.floorY + 4, CONFIG.arena.ceilY - 4);
      const gh = spawnHunter(gameScene, gt, gp);
      gh.guardNest = nest; gh.speedMul = zone.hunterSpeedMul;
    }
  }
  if (zone.mission.type === 'rescue'){
    const sg = makeAsset('sub-minnow'); sg.scale.setScalar(0.8);
    sg.position.copy(randArenaPos(140, 175, -10, 12));
    gameScene.add(registerReveal(sg, { min: 0.06 }));
    const lamp = glowBall(0.3, 0xffb84d); lamp.position.set(0, 2.2, 0); sg.add(lamp);
    G.stranded = { group: sg, rescued: false, lamp };
  }
  for (let i=0;i<3;i++) G.schools.push(buildFishSchool(gameScene, randArenaPos(40, 180, -12, 18)));
  gameScene.add(makeParticles(520, 540, 140, 540));
  document.documentElement.style.setProperty('--accent', hexCss(accentHex(SAVE.sub)));
  setUI('playing');
  updateObjective();
  toast(zone.name + ' — ' + zone.desc, 3400);
  Music.diveCue();
}

// ============================ START: SURVIVAL ============================
function crystalValueNow(){ return CONFIG.survival.crystalBase + G.stratum * CONFIG.survival.crystalPerStratum; }
const BAND_KELP_MAT = new THREE.MeshStandardMaterial({ color: 0x27573f, roughness: 0.6, metalness: 0.05,
  emissive: 0x14301f, emissiveIntensity: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
// Floor themes (hybrid expedition-style floors, Akmal 19 Nov): Survival
// keeps its endless shaft + descent, but every floor carries one rotating
// identity — a mid-shaft set piece with its own dressing language, like an
// expedition zone in miniature. Rotation is by floor number, so a dive
// reads Wreck → Kelp → Ruins → Vent → Wreck … all the way down.
const FLOOR_THEMES = [
  { id: 'wreck', name: 'WRECK FIELD', icon: '🛳' },
  { id: 'kelp', name: 'KELP FOREST', icon: '🌿' },
  { id: 'ruins', name: 'SUNKEN RUINS', icon: '🏛' },
  { id: 'vent', name: 'VENT FIELD', icon: '🌋' },
];
// Stratum mood (Akmal 19 Nov): every 10 floors the whole mood turns — each
// stratum has a SIGNATURE theme dominating its floors, so a stratum reads
// as one place (the Furnace burns vent-orange, Kelp Dark drowns in weed),
// with the other themes visiting. Deterministic per floor, so the
// floor-enter toast names the theme the band actually generated.
const STRATUM_SIGNATURE = ['wreck', 'kelp', 'vent', 'ruins', 'wreck', 'vent'];
function floorTheme(f){
  const s = Math.floor((f - 1) / 10) % STRATUM_SIGNATURE.length;
  const h = Math.abs(Math.sin(f * 127.1 + s * 311.7) * 43758.5453) % 1;
  if (h < 0.55) return FLOOR_THEMES.find(t => t.id === STRATUM_SIGNATURE[s]);
  return FLOOR_THEMES[Math.floor(h * FLOOR_THEMES.length) % FLOOR_THEMES.length];
}
const BAND_WRECK_MAT = std(0x2c3840, { roughness: 0.75, metalness: 0.5, flatShading: true });
const BAND_STONE_MAT = std(0x4a4a52, { roughness: 0.9, flatShading: true });
const BAND_LAVA_MAT = std(0x1c1712, { roughness: 1, flatShading: true });
const BAND_ROCK_MAT = std(0x1c2a30, { roughness: 0.95 });
function ensureBands(){
  const S = CONFIG.survival, py = player.group.position.y;
  // Rock colliders (spheres) for the player push-out in updatePlayer —
  // band rocks used to be ghost geometry the sub swam straight through.
  if (!G.colliders) G.colliders = [];
  const addCollider = (x, y, z, rad) => G.colliders.push({ x, y, z, rad: rad * 0.72 }); // 0.72: collider hugs the visible rock, not its bounding sphere
  while (G.bandY > py - 290){
    G.bandY -= S.bandEvery;
    const y = G.bandY + rand(-11, 11);
    // This band serves ONE floor: the 40 m slice directly above its base
    // plane (bandY = −40·m serves floor m−1, slice y ∈ [bandY, bandY+40]).
    // Crystals/caches sample INSIDE that slice with margins — the old
    // band-centred sampling straddled the boundary between two floors, so a
    // floor could spawn with fewer crystals than its gate quota (or with a
    // crystal embedded in the guard rocks) and be uncompletable.
    const servedFloor = survFloorOf(G.bandY) - 1;
    const sliceY = () => G.bandY + rand(5.6, 24); // depth ∈ [40·servedFloor + 16, +34.4]: inside the floor, biased toward the seabed half (item 8 banding still wins — never outside the slice)
    const bandRocks = []; // {x,y,z,rad} world-space, for crystal clearance sampling
    const clusterRocks = []; // the guard cluster's own rocks — guarded crystals sample against one of these
    // Guard feature (world-stable, culled with the band): a small rock cluster
    // with a kelp tuft. Two of the band's three crystals tuck against it —
    // fetching them means working terrain, not a straight open-water swim.
    // The third crystal stays in the open for variety/readability.
    const ga = rand(0, Math.PI * 2), gr = rand(38, 112);
    const anchor = new THREE.Vector3(Math.cos(ga) * gr, G.bandY + rand(7.2, 22.4), Math.sin(ga) * gr);
    const cg = new THREE.Group(); cg.position.copy(anchor);
    for (let i = 0, n = randi(2, 3); i < n; i++){
      const rad = rand(3, 7);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), std(0x1c2a30, { roughness: 0.95 }));
      rock.position.set(rand(-6, 6), rand(-3, 3), rand(-6, 6));
      cg.add(rock);
      const wr = { x: anchor.x + rock.position.x, y: anchor.y + rock.position.y, z: anchor.z + rock.position.z, rad };
      bandRocks.push(wr); clusterRocks.push(wr); addCollider(wr.x, wr.y, wr.z, wr.rad);
    }
    for (let i = 0; i < 5; i++) addKelp(cg, BAND_KELP_MAT, rand(-5, 5), -3, rand(-5, 5), 0x7fe0ff);
    gameScene.add(registerReveal(cg, { min: 0.2, prox: 34 }));
    if (!G.rocks) G.rocks = []; G.rocks.push(cg);
    if (Math.random() < 0.5){ // loose rock rolled BEFORE the crystals so they can clearance-check against it too
      const rad = rand(4, 10);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), std(0x1c2a30, { roughness: 0.95 }));
      const a = rand(0, Math.PI*2), r = rand(60, S.shaftRadius - 10);
      rock.position.set(Math.cos(a)*r, y, Math.sin(a)*r);
      gameScene.add(registerReveal(rock, { min: 0.2, prox: 30 }));
      G.rocks.push(rock);
      bandRocks.push({ x: rock.position.x, y: rock.position.y, z: rock.position.z, rad });
      addCollider(rock.position.x, rock.position.y, rock.position.z, rad);
    }
    // Floor theme set piece (see FLOOR_THEMES): one themed group per band,
    // culled with the band via G.rocks exactly like the guard cluster. The
    // theme anchor is pushed into bandRocks BEFORE the crystals sample, so
    // quota items keep their distance from the set piece.
    const theme = floorTheme(servedFloor);
    const ta = rand(0, Math.PI * 2), tr = rand(58, 102);
    const tAnchor = new THREE.Vector3(Math.cos(ta) * tr, G.bandY + rand(6, 12), Math.sin(ta) * tr);
    const tg = new THREE.Group(); tg.position.copy(tAnchor);
    if (theme.id === 'wreck'){
      const wreck = makeShipwreck(BAND_WRECK_MAT);
      wreck.position.set(0, -1, 0); wreck.rotation.y = rand(0, Math.PI * 2);
      tg.add(wreck);
      const debris = makeWreckCluster(BAND_WRECK_MAT);
      debris.position.set(rand(-16, 16), -2.5, rand(-16, 16)); debris.rotation.y = rand(0, Math.PI * 2);
      tg.add(debris);
      for (let i = 0; i < 3; i++){
        const dr = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.5, 3), 0), BAND_ROCK_MAT);
        dr.position.set(rand(-18, 18), rand(-3, 0), rand(-18, 18));
        tg.add(dr);
      }
    } else if (theme.id === 'kelp'){
      for (let i = 0; i < 15; i++){
        const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 20;
        addKelp(tg, BAND_KELP_MAT, Math.cos(a) * r, -4, Math.sin(a) * r, 0x7fe0ff);
      }
      const an = makeAnemonePatch(); an.position.set(rand(-10, 10), -2, rand(-10, 10)); tg.add(an);
    } else if (theme.id === 'ruins'){
      const nP = 7, ringR = 12;
      for (let i = 0; i < nP; i++){
        const a = (i / nP) * Math.PI * 2, h = rand(6, 13), toppled = (i === 2 || i === 5);
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, h, 8), BAND_STONE_MAT);
        if (toppled){ pil.rotation.z = Math.PI / 2 - rand(-0.12, 0.12); pil.position.set(Math.cos(a) * ringR, -2.5, Math.sin(a) * ringR); }
        else { pil.position.set(Math.cos(a) * ringR, h / 2 - 4, Math.sin(a) * ringR); pil.rotation.z = rand(-0.05, 0.05); }
        tg.add(pil);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 1.7), BAND_STONE_MAT);
      const la = (0.5 / nP) * Math.PI * 2;
      lintel.position.set(Math.cos(la) * ringR, 8.2, Math.sin(la) * ringR);
      lintel.rotation.y = -la + Math.PI / 2;
      tg.add(lintel);
      for (let i = 0; i < 3; i++){
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 8), BAND_STONE_MAT);
        drum.rotation.z = Math.PI / 2; drum.rotation.y = rand(0, 3);
        drum.position.set(rand(-4, 4), -3.2, rand(-4, 4));
        tg.add(drum);
      }
    } else { // vent
      for (let i = 0; i < 2; i++) tg.add(makeBubbleVent(rand(-12, 12), -2, rand(-12, 12)));
      for (let i = 0; i < 4; i++){
        const vr = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(2, 4.5), 0), BAND_LAVA_MAT);
        vr.position.set(rand(-15, 15), rand(-3.5, -1), rand(-15, 15));
        tg.add(vr);
        const ember = glowBall(0.35, 0xff6a2a);
        ember.position.set(vr.position.x, vr.position.y + 1.2, vr.position.z);
        tg.add(ember);
      }
    }
    gameScene.add(registerReveal(tg, { min: 0.2, prox: 42 }));
    G.rocks.push(tg);
    bandRocks.push({ x: tAnchor.x, y: tAnchor.y, z: tAnchor.z, rad: 11 });
    addCollider(tAnchor.x, tAnchor.y, tAnchor.z, 11);
    // Theme SCATTER (Akmal 19 Nov, from his playtest video): the centrepiece
    // alone reads as one patch in a 300 m shaft, so the theme's ambient
    // elements are ALSO spread across the whole floor slice at low density —
    // the floor feels themed wherever you swim. One group at the band's base
    // plane (children slice-relative), culled with the band via G.rocks.
    const sg = new THREE.Group(); sg.position.set(0, G.bandY, 0);
    const scat = () => { const a = rand(0, Math.PI * 2), r = rand(18, 135); return { x: Math.cos(a) * r, z: Math.sin(a) * r }; };
    if (theme.id === 'wreck'){
      for (let i = 0; i < 8; i++){
        const p = scat(), drR = rand(1.2, 3), dr = new THREE.Mesh(new THREE.DodecahedronGeometry(drR, 0), BAND_ROCK_MAT);
        dr.position.set(p.x, rand(2, 30), p.z); dr.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
        sg.add(dr);
        addCollider(p.x, G.bandY + dr.position.y, p.z, drR);
      }
      for (let i = 0; i < 3; i++){
        const p = scat(), barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.1, 9), BAND_WRECK_MAT);
        barrel.position.set(p.x, rand(2, 28), p.z); barrel.rotation.set(Math.PI / 2 + rand(-0.3, 0.3), 0, rand(0, 3));
        sg.add(barrel);
        addCollider(p.x, G.bandY + barrel.position.y, p.z, 1.3);
      }
    } else if (theme.id === 'kelp'){
      for (let i = 0; i < 12; i++){
        const p = scat();
        addKelp(sg, BAND_KELP_MAT, p.x, rand(0, 8), p.z, 0x7fe0ff);
      }
      for (let i = 0; i < 2; i++){
        const p = scat(), an = makeAnemonePatch();
        an.position.set(p.x, rand(1, 10), p.z); sg.add(an);
      }
    } else if (theme.id === 'ruins'){
      for (let i = 0; i < 5; i++){
        const p = scat(), drum = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 8), BAND_STONE_MAT);
        drum.rotation.z = Math.PI / 2; drum.rotation.y = rand(0, 3);
        drum.position.set(p.x, rand(2, 26), p.z);
        sg.add(drum);
        addCollider(p.x, G.bandY + drum.position.y, p.z, 1.7);
      }
      for (let i = 0; i < 3; i++){
        const p = scat(), h = rand(2, 5), stub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, h, 8), BAND_STONE_MAT);
        stub.position.set(p.x, rand(2, 24), p.z); stub.rotation.z = rand(-0.15, 0.15);
        sg.add(stub);
        addCollider(p.x, G.bandY + stub.position.y, p.z, 1.6);
      }
    } else { // vent
      for (let i = 0; i < 3; i++){
        const p = scat();
        sg.add(makeBubbleVent(p.x, rand(1, 8), p.z));
      }
      for (let i = 0; i < 5; i++){
        const p = scat(), vrR = rand(1.5, 3.2), vr = new THREE.Mesh(new THREE.DodecahedronGeometry(vrR, 0), BAND_LAVA_MAT);
        vr.position.set(p.x, rand(2, 28), p.z);
        sg.add(vr);
        addCollider(p.x, G.bandY + vr.position.y, p.z, vrR);
        const ember = glowBall(0.3, 0xff6a2a);
        ember.position.set(p.x, vr.position.y + 1, p.z);
        sg.add(ember);
      }
    }
    gameScene.add(registerReveal(sg, { min: 0.2, prox: 30 }));
    G.rocks.push(sg);
    // Ground cover (Akmal 19 Nov: the floor of each floor read as empty):
    // a dense carpet hugging the band's base plane — coral fans, grass
    // tufts, scattered rock — so the seabed feels alive wherever the
    // player skims it. Instanced coral keeps it cheap.
    const gg = new THREE.Group(); gg.position.set(0, G.bandY, 0);
    {
      const geos = coralGeos(), dummy = new THREE.Object3D(), col = new THREE.Color();
      const palette = FLORA_PALETTE.map(h => new THREE.Color(h).lerp(new THREE.Color(0x7fe0ff), 0.35));
      const gfill = (im, n, sMin, sMax) => {
        for (let i = 0; i < n; i++){
          const a = rand(0, Math.PI * 2), r = 14 + Math.sqrt(Math.random()) * 128;
          dummy.position.set(Math.cos(a) * r, rand(0.2, 1.4), Math.sin(a) * r);
          dummy.rotation.set(rand(-0.2, 0.2), rand(0, Math.PI * 2), rand(-0.2, 0.2));
          const s = rand(sMin, sMax); dummy.scale.set(s, s, s); dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
          col.copy(pick(palette)).offsetHSL(0, 0, rand(-0.06, 0.06)); im.setColorAt(i, col);
        }
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        gg.add(im);
      };
      gfill(coralMesh(geos.fan, 18, 0x2a7a8c, 0.3), 18, 0.8, 1.7);
      gfill(coralMesh(geos.stag, 18, 0x2a7a8c, 0.36), 18, 0.8, 1.7);
      gfill(coralMesh(geos.brain, 12, 0x2a7a8c, 0.22), 12, 0.8, 1.5);
      for (let i = 0; i < 16; i++){ // grass tufts rooted on the floor
        const a = rand(0, Math.PI * 2), r = 14 + Math.sqrt(Math.random()) * 128;
        addKelp(gg, BAND_KELP_MAT, Math.cos(a) * r, 0, Math.sin(a) * r, 0x7fe0ff);
      }
      for (let i = 0; i < 16; i++){ // loose floor rocks
        const a = rand(0, Math.PI * 2), r = 14 + Math.sqrt(Math.random()) * 126, rad = rand(0.8, 3.2);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), BAND_ROCK_MAT);
        rock.position.set(Math.cos(a) * r, rad * 0.35, Math.sin(a) * r);
        rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
        gg.add(rock);
        if (rad >= 2.4) addCollider(rock.position.x, G.bandY + rock.position.y, rock.position.z, rad);
      }
    }
    gameScene.add(registerReveal(gg, { min: 0.45, prox: 60 }));
    G.rocks.push(gg);
    // Feature set piece — ONE per band, rotating for variety (Akmal 19 Nov):
    // a swim-through rock arch, the ribcage of some giant dead thing, or a
    // spire cluster. Its anchor joins bandRocks BEFORE the crystals sample,
    // so quota items never spawn inside it.
    {
      const fa = rand(0, Math.PI * 2), fr = rand(34, 108);
      const fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr, frot = rand(0, Math.PI * 2);
      const fg = new THREE.Group(); fg.position.set(fx, G.bandY, fz); fg.rotation.y = frot;
      const roll = Math.random();
      if (roll < 0.34){ // rock arch / tunnel mouth
        const arch = new THREE.Mesh(new THREE.TorusGeometry(7.5, 2.3, 7, 14, Math.PI), BAND_ROCK_MAT);
        arch.position.y = 0.5; fg.add(arch);
        for (let i = 0; i < 3; i++){
          const br = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.6, 3), 0), BAND_ROCK_MAT);
          br.position.set(rand(-9, 9), rand(0, 1), rand(-3, 3)); fg.add(br);
        }
        const c = Math.cos(frot), s = Math.sin(frot);
        addCollider(fx + c * 7.5, G.bandY + 2, fz - s * 7.5, 2.6);
        addCollider(fx - c * 7.5, G.bandY + 2, fz + s * 7.5, 2.6);
      } else if (roll < 0.67){ // giant skeleton — spine, rib arcs, skull
        const bone = std(0xcfc7ae, { roughness: 0.9, flatShading: true });
        const nV = 9;
        for (let i = 0; i < nV; i++){
          const t = i / (nV - 1), vx = (t - 0.5) * 24, vy = 1.1 + Math.sin(t * Math.PI) * 1.6;
          const vert = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, 2.1), bone);
          vert.position.set(vx, vy, 0); vert.rotation.y = rand(-0.2, 0.2); fg.add(vert);
          if (i > 0 && i < nV - 1){
            const rib = new THREE.Mesh(new THREE.TorusGeometry(4.6 - Math.abs(t - 0.5) * 3.4, 0.34, 6, 12, Math.PI), bone);
            rib.position.set(vx, vy + 0.4, 0); rib.rotation.y = Math.PI / 2;
            fg.add(rib);
          }
        }
        const skull = new THREE.Mesh(new THREE.SphereGeometry(2.9, 10, 8), bone);
        skull.scale.set(1, 0.82, 1.45); skull.position.set(15.5, 1.9, 0); fg.add(skull);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 2.2), bone);
        jaw.position.set(16.8, 0.45, 0); jaw.rotation.z = -0.16; fg.add(jaw);
        const eye = glowBall(0.5, 0x6ff5e2); eye.position.set(14.6, 2.2, 1.6); fg.add(eye);
        addCollider(fx, G.bandY + 2, fz, 4);
      } else { // spire cluster
        for (let i = 0, n = randi(3, 5); i < n; i++){
          const h = rand(6, 15), sp = new THREE.Mesh(new THREE.ConeGeometry(rand(1.8, 3.2), h, 7), BAND_ROCK_MAT);
          sp.position.set(rand(-8, 8), h / 2 - 0.5, rand(-8, 8)); sp.rotation.z = rand(-0.09, 0.09);
          fg.add(sp);
        }
        addCollider(fx, G.bandY + 2, fz, 4);
      }
      gameScene.add(registerReveal(fg, { min: 0.35, prox: 55 }));
      G.rocks.push(fg);
      bandRocks.push({ x: fx, y: G.bandY + 3, z: fz, rad: 10 });
    }
    const clearOfRocks = (p, margin) => { for (const rk of bandRocks){ const dx = p.x - rk.x, dy = p.y - rk.y, dz = p.z - rk.z; if (dx*dx + dy*dy + dz*dz < (rk.rad + margin) * (rk.rad + margin)) return false; } return true; };
    const guarded = [];
    for (let i=0;i<3;i++){
      let pos = null;
      for (let t = 0; t < 20 && !pos; t++){
        let cand;
        if (i < 2){
          // Sample against a CHOSEN cluster rock: centre + direction × (radius
          // + 1.2–2.8) puts the crystal just off that rock's face by
          // construction (tucked, never embedded), then clearance-check the rest.
          const rk = pick(clusterRocks), a2 = rand(0, Math.PI * 2), d = rk.rad + rand(1.2, 2.8);
          cand = new THREE.Vector3(rk.x + Math.cos(a2) * d, Math.min(Math.max(rk.y + rand(-1.5, 2), G.bandY + 5.6), G.bandY + 36), rk.z + Math.sin(a2) * d);
          if (clearOfRocks(cand, 1.0)) pos = cand;
        } else {
          const a = rand(0, Math.PI*2), r = rand(22, S.shaftRadius - 28);
          cand = new THREE.Vector3(Math.cos(a)*r, sliceY(), Math.sin(a)*r);
          if (clearOfRocks(cand, 2.0)) pos = cand;
        }
      }
      if (!pos){ // by-construction clear: 16 from the anchor beats the cluster's max reach (offset 6 + radius 7 + clearance 2 = 15), y clamped into the slice
        const a3 = rand(0, Math.PI * 2);
        pos = new THREE.Vector3(anchor.x + Math.cos(a3) * 16, Math.min(Math.max(anchor.y, G.bandY + 7.2), G.bandY + 35.2), anchor.z + Math.sin(a3) * 16);
      }
      const c = spawnCrystal(gameScene, pos, crystalValueNow());
      if (i < 2) guarded.push(c);
    }
    // Mines at depth: from Stratum II (floor 10) on, 1–2 mines threaten the
    // approach to this floor's guarded crystals — offset 6–10 units, outside
    // the 4.6 pickup radius but inside the approach path. None above floor 10.
    if (servedFloor >= 10){
      for (let i = 0, nM = Math.min(guarded.length, randi(1, 2)); i < nM; i++){
        const gc = guarded[i], a3 = rand(0, Math.PI * 2), d = rand(6, 10);
        spawnMine(gameScene, new THREE.Vector3(gc.group.position.x + Math.cos(a3) * d, gc.baseY + rand(-2, 2), gc.group.position.z + Math.sin(a3) * d));
      }
    }
    // Exactly ONE supply cache per floor, guaranteed (mirrors the crystal
    // guarantee above): sampled inside the slice, clear of the guard rocks,
    // same by-construction fallback. Caches are the only in-dive hull source
    // on normal floors — the old lone 16% roll meant ~1 cache per 6 floors
    // and it restored no hull, so runs starved (Akmal playtest 19 Nov:
    // "kehabisan resource, emang gaada"). The 16% roll stays below as a
    // possible bonus second cache.
    {
      let cpos = null;
      for (let t = 0; t < 20 && !cpos; t++){
        const a = rand(0, Math.PI*2), r = rand(22, S.shaftRadius - 28);
        const cand = new THREE.Vector3(Math.cos(a)*r, sliceY(), Math.sin(a)*r);
        if (clearOfRocks(cand, 2.0)) cpos = cand;
      }
      if (!cpos){
        const a3 = rand(0, Math.PI * 2);
        cpos = new THREE.Vector3(anchor.x + Math.cos(a3) * 16, Math.min(Math.max(anchor.y, G.bandY + 7.2), G.bandY + 35.2), anchor.z + Math.sin(a3) * 16);
      }
      spawnCache(gameScene, cpos);
    }
    if (Math.random() < 0.16) spawnCache(gameScene, new THREE.Vector3(rand(-95, 95), G.bandY + rand(6.4, 33.6), rand(-95, 95)));
    // Collectible items (Akmal 19 Nov): one battery cell + one hull patch
    // per floor, gathered exactly like crystals — sampled inside the slice,
    // clear of the guard rocks, same by-construction fallback (offset 20 so
    // fallbacks never stack on the crystal/cache spot). A 50% bonus item of
    // a random kind keeps floors varied.
    const spawnFloorPickup = (kind) => {
      let ppos = null;
      for (let t = 0; t < 20 && !ppos; t++){
        const a = rand(0, Math.PI*2), r = rand(22, S.shaftRadius - 28);
        const cand = new THREE.Vector3(Math.cos(a)*r, sliceY(), Math.sin(a)*r);
        if (clearOfRocks(cand, 2.0)) ppos = cand;
      }
      if (!ppos){
        const a3 = rand(0, Math.PI * 2);
        ppos = new THREE.Vector3(anchor.x + Math.cos(a3) * 20, Math.min(Math.max(anchor.y, G.bandY + 7.2), G.bandY + 35.2), anchor.z + Math.sin(a3) * 20);
      }
      spawnPickup(gameScene, ppos, kind);
    };
    spawnFloorPickup('cell');
    spawnFloorPickup('patch');
    if (Math.random() < 0.5) spawnFloorPickup(Math.random() < 0.5 ? 'cell' : 'patch');
    if (Math.random() < 0.85) spawnJelly(gameScene, new THREE.Vector3(rand(-115, 115), y + rand(-4, 4), rand(-115, 115)), 0x7fe0ff);
    if (Math.random() < 0.8) spawnJellyDrifter(gameScene, new THREE.Vector3(rand(-115, 115), y + rand(-5, 5), rand(-115, 115)), 0x7fe0ff);
  }
  for (const listName of ['crystals', 'jellies', 'caches', 'pickups', 'rocks', 'mines']){
    const list = G[listName]; if (!list) continue;
    for (let i = list.length - 1; i >= 0; i--){
      const item = list[i];
      const grp = item.group || item; // survival rocks are stored as bare meshes/groups, the rest as { group }
      if (grp.position.y > py + 110 && !item.taken && !item.dead){ removeEntity(grp); list.splice(i, 1); }
    }
  }
  if (G.colliders) for (let i = G.colliders.length - 1; i >= 0; i--) if (G.colliders[i].y > py + 110) G.colliders.splice(i, 1);
}
function startSurvival(diffId){
  revealables = [];
  const st0 = CONFIG.survival.strata[0];
  gameScene = baseGameScene(st0.tint);
  G = newG('survival');
  G.diff = CONFIG.survival.difficulties[diffId]; G.diffId = diffId; G.caches = []; G.rocks = [];
  player = spawnPlayer(gameScene, SAVE.sub, new THREE.Vector3(0, 0, 0));
  player.yaw = Math.PI; player.pitch = -0.12;
  G.torps = Math.min(SAVE.stock.torp, player.d.def.torpCap);
  G.decoys = Math.min(SAVE.stock.decoy, player.d.def.decoyCap);
  const cm = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(CONFIG.survival.shaftRadius + 8, CONFIG.survival.shaftRadius + 8, 30, 36, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2233, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  cm.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CONFIG.survival.shaftRadius + 8, 0.7, 8, 44),
    new THREE.MeshBasicMaterial({ color: 0xff3344 }));
  rim.rotation.x = Math.PI/2; rim.position.y = -15; cm.add(rim);
  cm.position.y = G.collapseY;
  gameScene.add(cm); G.collapseMesh = cm;
  addSurvivalDressing(gameScene);
  const pts = makeParticles(900, 380, 380, 380); gameScene.add(pts); G.particles = pts;
  const motes = makeParticles(130, 300, 300, 300, 0x9fe8ff, 1.4); gameScene.add(motes); G.motes = motes; // sparse glowing motes: mid-range water texture
  for (let i=0;i<4;i++) G.schools.push(buildFishSchool(gameScene, new THREE.Vector3(rand(-80, 80), rand(-40, -10), rand(-80, 80))));
  for (let i=0;i<5;i++) G.drifters.push(buildDrifterFish(gameScene)); // ambient deep-sea passers-by (decoration only)
  ensureBands();
  spawnSurvivalGate(1);
  document.documentElement.style.setProperty('--accent', hexCss(accentHex(SAVE.sub)));
  setUI('playing');
  updateObjective();
  toast('SURVIVAL — ' + G.diff.label + '. Descend. The deep pays more, and bites harder.', 3600);
  Music.diveCue();
}

// ============================ GAMEPLAY SYSTEMS ============================
function playerForward(){
  return new THREE.Vector3(Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), Math.cos(player.yaw) * Math.cos(player.pitch));
}
function sonarRadius(){ return player.d.sonarR * G.boon.sonarMul; }
function bankCoins(n){ if (n > 0){ SAVE.coins += n; G.coinsRun += n; persist(); } }
function spawnWave(pos, maxR, hex){
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 13),
    new THREE.MeshBasicMaterial({ color: hex, wireframe: true, transparent: true, opacity: 0.10, depthWrite: false }));
  shell.position.copy(pos); gameScene.add(shell);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 48),
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI/2; ring.position.copy(pos); gameScene.add(ring);
  G.waves.push({ shell, ring, t0: G.time, maxR });
}
function explosionFx(pos, s){
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffa04d, transparent: true, opacity: 0.75, depthWrite: false }));
  m.position.copy(pos); gameScene.add(m);
  G.fx.push({ mesh: m, t: 0, dur: 0.45, s });
}
function hearNoise(h, pos, amt, kind){
  if (h.type.hearing <= 0 && kind === 'player') return;
  h.awareness = clamp(h.awareness + amt, 0, 1);
  if (amt > 0.04){ h.lastNoise.copy(pos); h.targetKind = kind; }
}
function drawRadar(){
  const cv = $('radar'); if (!cv || !player || !G) return;
  const ctx = cv.getContext('2d'); if (!ctx) return;
  const W = cv.width, C = W / 2, R = C - 6, RANGE = 150;
  ctx.clearRect(0, 0, W, W);
  ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(3,20,24,0.66)'; ctx.fill();
  ctx.strokeStyle = 'rgba(46,230,200,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(C, C, R * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(46,230,200,0.18)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(C, C, R * 0.25, 0, Math.PI * 2); ctx.stroke();
  const sa = (G.time * 0.9) % (Math.PI * 2);
  ctx.beginPath(); ctx.moveTo(C, C);
  ctx.lineTo(C + Math.sin(sa) * R, C - Math.cos(sa) * R);
  ctx.strokeStyle = 'rgba(46,230,200,0.25)'; ctx.stroke();
  const pp = player.group.position, sy = Math.sin(player.yaw), cyw = Math.cos(player.yaw);
  const plot = (wp) => {
    const dx = wp.x - pp.x, dz = wp.z - pp.z;
    const f = dx * sy + dz * cyw, r = dx * cyw - dz * sy;
    let x = (r / RANGE) * R, y = -(f / RANGE) * R;
    const m = Math.hypot(x, y), rim = m > R - 4;
    if (rim){ x *= (R - 4) / m; y *= (R - 4) / m; }
    return { x: C + x, y: C + y, rim };
  };
  if (G.mode === 'survival' && G.survGate && G.survGate.pos && G.survGate.floor === G.floor){
    const q = plot(G.survGate.pos);
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = G.survGate.open ? '#ffc93a' : 'rgba(255,201,58,0.45)';
    const s2 = G.survGate.open ? 6 : 5; ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2); ctx.restore();
  }
  for (const c of G.crystals){
    if (c.taken) continue;
    if (G.mode === 'survival' && c.floor !== G.floor) continue;
    const gp = c.group.position, d = gp.distanceTo(pp);
    const rv = c.group.userData.reveal;
    let a = 0;
    if (rv && G.time >= rv.at) a = clamp(1 - (G.time - rv.at) / rv.dur, 0, 1);
    if (d < 26) a = Math.max(a, 0.85);
    if (a <= 0.02) continue;
    const q = plot(gp);
    ctx.beginPath(); ctx.arc(q.x, q.y, q.rim ? 3 : 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(111,245,226,' + (0.25 + 0.75 * a).toFixed(3) + ')'; ctx.fill();
    const dy = gp.y - pp.y;
    if (dy > 4 || dy < -4){
      ctx.beginPath();
      if (dy > 4){ ctx.moveTo(q.x - 3, q.y - 6); ctx.lineTo(q.x + 3, q.y - 6); ctx.lineTo(q.x, q.y - 9.5); }
      else { ctx.moveTo(q.x - 3, q.y + 6); ctx.lineTo(q.x + 3, q.y + 6); ctx.lineTo(q.x, q.y + 9.5); }
      ctx.closePath(); ctx.fill();
    }
  }
  // Hunters (Akmal 19 Nov: show them too): red blips under the same sonar
  // rule — visible while their ping-reveal lasts or point-blank; a hunter
  // actively hunting gets a ring, a Warden a bigger dot.
  for (const h of G.hunters){
    if (h.dead) continue;
    const hp = h.group.position, d = hp.distanceTo(pp);
    const rv = h.group.userData.reveal;
    let a = 0;
    if (rv && G.time >= rv.at) a = clamp(1 - (G.time - rv.at) / rv.dur, 0, 1);
    if (d < 30) a = Math.max(a, 0.9);
    if (h.state === 'hunt') a = Math.max(a, 0.55);
    if (a <= 0.02) continue;
    const q = plot(hp);
    ctx.beginPath(); ctx.arc(q.x, q.y, h.warden ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,77,109,' + (0.25 + 0.75 * a).toFixed(3) + ')'; ctx.fill();
    if (h.state === 'hunt'){ ctx.beginPath(); ctx.arc(q.x, q.y, (h.warden ? 8 : 6.5), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,77,109,' + (0.6 * a).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  ctx.beginPath(); ctx.moveTo(C, C - 6); ctx.lineTo(C - 4, C + 5); ctx.lineTo(C + 4, C + 5); ctx.closePath();
  ctx.fillStyle = '#e8fff9'; ctx.fill();
}
function doPing(){
  if (!player || !G || G.over || uiState !== 'playing') return;
  if (G.time < (G.pingReadyAt || 0)){ toast('📡 Sonar recharging — ' + Math.ceil(G.pingReadyAt - G.time) + 's', 1200); return; }
  G.pingReadyAt = G.time + CONFIG.sonar.pingCd;
  G.pinged = true;
  G.noisePulse = 100;
  AudioSys.ping();
  const R = sonarRadius(), pp = player.group.position;
  spawnWave(pp, R, accentHex(player.subId));
  for (const r of revealables){
    const rv = r.userData.reveal; if (!rv) continue;
    const d = r.position.distanceTo(pp);
    const floorCrystal = r.userData.isCrystal && G.mode === 'survival' && r.userData.floor === G.floor;
    if (floorCrystal || d < R * 1.3){ rv.at = G.time + d / CONFIG.sonar.waveSpeed; rv.dur = CONFIG.sonar.revealDur * (r.userData.isHunter ? player.d.echoMul : (r.userData.isCrystal ? 1.6 : 1)); }
  }
  for (const h of G.hunters){
    if (h.dead || h.type.hearing <= 0) continue;
    const d = h.group.position.distanceTo(pp), hr = R * CONFIG.sonar.pingNoiseRadiusMul * h.type.hearing;
    if (d < hr) hearNoise(h, pp, 0.3 + 0.55 * (1 - d / hr), 'player');
  }
  for (const s of G.schools) if (s.center.distanceTo(pp) < R) s.scatter();
}
function fireTorpedo(){
  if (!player || !G || G.over || uiState !== 'playing') return;
  if (G.torps <= 0 || SAVE.stock.torp <= 0){ toast('🐚 No torpedoes — restock in the Hangar'); return; }
  G.torps--; SAVE.stock.torp--; persist();
  const fwd = playerForward();
  const g = makeAsset('torpedo');
  g.position.copy(player.group.position).addScaledVector(fwd, 5);
  g.lookAt(g.position.clone().add(fwd));
  gameScene.add(g);
  G.fired.push({ group: g, vel: fwd.multiplyScalar(58), life: 3.6 });
  AudioSys.torp();
}
function dropDecoy(){
  if (!player || !G || G.over || uiState !== 'playing') return;
  if (G.decoyActive){ toast('A decoy is already singing'); return; }
  if (G.decoys <= 0 || SAVE.stock.decoy <= 0){ toast('📡 No decoys — restock in the Hangar'); return; }
  G.decoys--; SAVE.stock.decoy--; persist();
  const g = makeAsset('decoy');
  g.position.copy(player.group.position);
  gameScene.add(g);
  registerReveal(g, { min: 0.3 });
  G.decoyActive = { group: g, until: G.time + CONFIG.decoy.life, pulseT: 0 };
  toast('📡 Decoy deployed — run silent, run deep!');
}
function fireEMP(){
  if (!player || !G || G.over || uiState !== 'playing' || G.empCd > 0) return;
  const R = player.d.def.empR;
  let hit = 0;
  for (const h of G.hunters) if (!h.dead && h.group.position.distanceTo(player.group.position) < R){ h.disabled = Math.max(h.disabled, player.d.def.empDur); hit++; }
  G.empCd = CONFIG.emp.cooldown * G.boon.empCdMul;
  spawnWave(player.group.position, R, 0x9fd8ff);
  AudioSys.emp();
  toast(hit ? '⚡ EMP — ' + hit + ' hunter(s) disabled!' : '⚡ EMP pulsed (nothing in range)');
}
function hunterName(h){
  if (h.ancient) return 'The Ancient One';
  if (h.warden) return 'Stratum Warden';
  if (h.trioRole) return 'A Guardian';
  return { stalker: 'Stalker', skitter: 'Skitter', brute: 'Brute', sentry: 'Sentry', lurker: 'Lurker' }[h.typeId] || 'Hunter';
}
function damagePlayer(dmg, fromPos, src){
  if (!G || G.over || !player) return;
  if (src) G.lastHit = src; // named on the death screen — no more unexplained deaths (Akmal 19 Nov)
  player.hull -= dmg * player.d.dmgMul;
  G.camShake = Math.min(1, G.camShake + 0.45);
  const fl = $('flash'); fl.style.opacity = 0.9; setTimeout(()=> fl.style.opacity = 0, 90);
  AudioSys.hit();
  if (fromPos){
    const away = player.group.position.clone().sub(fromPos); away.y *= 0.3;
    if (away.lengthSq() > 0.01){ away.normalize(); player.vel.addScaledVector(away, 9); }
  }
  if (player.hull <= 0){ player.hull = 0; endRun('dead'); }
}
function setCore(h, hex){
  const c = h.group.userData.core; if (!c) return;
  c.material.color.setHex(hex);
  if (c.userData.glowSprite) c.userData.glowSprite.material.color.setHex(hex);
}
function sentryPing(h){
  const R = h.trioRole === 'eye' ? CONFIG.trio.eye.pingRadius : (h.warden ? 62 : h.type.pingRadius);
  spawnWave(h.group.position, R, 0xffb84d);
  for (const r of revealables){
    const rv = r.userData.reveal; if (!rv) continue;
    const d = r.position.distanceTo(h.group.position);
    if (d < R){ const at = G.time + d / CONFIG.sonar.waveSpeed; if (at < rv.at || G.time >= rv.at) rv.at = at; }
  }
  const d = h.group.position.distanceTo(player.group.position);
  setTimeout(()=>{
    if (!G || G.over || uiState !== 'playing') return;
    if (player.group.position.distanceTo(h.group.position) < R){
      for (const o of G.hunters) if (!o.dead && o.type.hearing > 0){ o.awareness = Math.max(o.awareness, 0.85); o.lastNoise.copy(player.group.position); o.targetKind = 'player'; }
      toast('👁 A sentry ping caught you — they know where you are!');
      AudioSys.ping();
    }
  }, (d / CONFIG.sonar.waveSpeed) * 1000);
}
function splitSpawn(pos, n){
  for (let i=0;i<n;i++){
    const p = pos.clone(); p.x += rand(-4, 4); p.z += rand(-4, 4);
    spawnHunter(gameScene, 'skitter', p, { aggro: true, speedMul: G.diff ? G.diff.hunterMul : 1 });
  }
}
function killHunter(h){
  h.dead = true; G.kills++;
  explosionFx(h.group.position, 7 * Math.max(1, h.group.scale.x));
  AudioSys.boom();
  const pos = h.group.position.clone();
  removeEntity(h.group);
  if (h.warden && h.warden.mod === 'splitter') splitSpawn(pos, 2);
  if (h.ancient){ const b = Math.round(CONFIG.econ.ancientBounty * (G.diff ? G.diff.mult : 1)); bankCoins(b); toast('🐋 Ancient One destroyed! Bounty +🪙 ' + b); }
  if (h.warden) onWardenKilled(h);
  if (h.trioRole) onTrioMemberDown(h);
}
function makeHpBar(h){
  const w = h.maxHp >= 250 ? 8.5 : 6.5;
  const grp = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0a0f14, depthTest: false, transparent: true, opacity: 0.75 }));
  bg.scale.set(w + 0.5, 1.05, 1); bg.renderOrder = 998;
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x53ff7a, depthTest: false, transparent: true, opacity: 0.95 }));
  fg.center.set(0, 0.5); fg.scale.set(w, 0.62, 1); fg.position.x = -w / 2; fg.renderOrder = 999;
  grp.add(bg); grp.add(fg);
  grp.position.y = h.type.hitR + 3.4;
  h.group.add(grp);
  h.hpBar = { fg, w };
}
function makeNestBar(n){
  const w = 6.5;
  const grp = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0a0f14, depthTest: false, transparent: true, opacity: 0.75 }));
  bg.scale.set(w + 0.5, 1.05, 1); bg.renderOrder = 998;
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x53ff7a, depthTest: false, transparent: true, opacity: 0.95 }));
  fg.center.set(0, 0.5); fg.scale.set(w, 0.62, 1); fg.position.x = -w / 2; fg.renderOrder = 999;
  grp.add(bg); grp.add(fg); grp.position.y = 6.2;
  n.group.add(grp);
  return { fg, w, grp };
}
function damageTarget(c, dmg){
  if (c.kind === 'nest'){
    const n = c.ref;
    n.hp -= dmg; explosionFx(n.group.position, 2.5); AudioSys.hit();
    for (const gh of G.hunters) if (!gh.dead && gh.guardNest === n){ gh.awareness = Math.max(gh.awareness, 0.9); gh.lastNoise.copy(player.group.position); gh.targetKind = 'player'; } // damaging a nest calls its guards
    const rvN = n.group.userData.reveal; if (rvN) rvN.at = G.time; // a hit nest flares bright — visible hit feedback
    if (!n.hpBar) n.hpBar = makeNestBar(n);
    n.hpBar.fg.scale.x = n.hpBar.w * clamp(n.hp / n.maxHp, 0, 1);
    if (n.hp <= 0 && !n.dead){ n.dead = true; explosionFx(n.group.position, 10); AudioSys.boom(); removeEntity(n.group); G.nestsDown++; toast('Nest destroyed (' + G.nestsDown + '/' + G.zone.mission.nests + ')'); updateObjective(); }
    return;
  }
  const h = c.ref;
  if (h.maxHp === undefined) h.maxHp = h.hp;
  h.hp -= dmg * h.dmgTakenMul;
  const rvH = h.group.userData.reveal; if (rvH) rvH.at = G.time; // a hit hunter lights up — no invisible attackers
  explosionFx(h.group.position, 2.5 * Math.max(1, h.group.scale.x));
  // Visible HP (Akmal 19 Nov): a bar over every hunter once it is hurt, so
  // every hit visibly counts — green draining to red.
  if (!h.hpBar && !h.dead) makeHpBar(h);
  if (h.hpBar){ const f = clamp(h.hp / h.maxHp, 0, 1); h.hpBar.fg.scale.x = Math.max(0.01, h.hpBar.w * f); h.hpBar.fg.material.color.setHSL(0.33 * f, 0.95, 0.55); }
  if (h.hp <= 0 && !h.dead) killHunter(h);
  else {
    AudioSys.hit();
    if (h.warden && h.warden.mod === 'splitter' && !h.splitDone && h.hp <= h.maxHp / 2){ h.splitDone = true; splitSpawn(h.group.position, 2); toast('The Warden splits!'); }
  }
}
function updateTorpedoes(dt){
  for (let i = G.fired.length - 1; i >= 0; i--){
    const t = G.fired[i]; t.life -= dt;
    let best = null, bestCos = 0.86;
    const cand = [];
    for (const h of G.hunters) if (!h.dead) cand.push({ p: h.group.position, ref: h, kind: 'hunter' });
    for (const n of G.nests) if (!n.dead) cand.push({ p: n.group.position, ref: n, kind: 'nest' });
    for (const c of cand){
      const to = c.p.clone().sub(t.group.position), d = to.length();
      if (d > 115) continue;
      const cos = to.normalize().dot(t.vel.clone().normalize());
      if (cos > bestCos){ bestCos = cos; best = c; }
    }
    if (best){
      const desired = best.p.clone().sub(t.group.position).normalize().multiplyScalar(58);
      t.vel.lerp(desired, clamp(dt * 4.2, 0, 1));
    }
    t.group.position.addScaledVector(t.vel, dt);
    t.group.lookAt(t.group.position.clone().add(t.vel));
    let boom = t.life <= 0;
    if (best && t.group.position.distanceTo(best.p) < 3.6){ damageTarget(best, player.d.def.torpDmg); boom = true; }
    if (!boom) for (const m of G.mines){
      if (!m.dead && t.group.position.distanceTo(m.group.position) < 3.2){ m.dead = true; explosionFx(m.group.position, 6); removeEntity(m.group); boom = true; break; }
    }
    if (boom){ explosionFx(t.group.position, 4); gameScene.remove(t.group); G.fired.splice(i, 1); }
  }
}

// ============================ PULSE CANNON ============================
// Hold LMB: rapid close-range bolts. No ammo — an OVERHEAT gauge instead:
// ~2.2 s of continuous fire to full, vents in ~1.6 s, lockout until below 40.
function fireBolt(){
  const P = CONFIG.pulse, fwd = playerForward();
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xaef7ff }));
  core.scale.set(1, 1, 2.6); g.add(core);
  g.add(makeGlowSprite(accentHex(player.subId), 2.6, 0.5));
  g.position.copy(player.group.position).addScaledVector(fwd, 5.5);
  g.lookAt(g.position.clone().add(fwd));
  gameScene.add(g);
  const vel = fwd.clone();
  vel.x += rand(-0.012, 0.012); vel.y += rand(-0.012, 0.012); vel.z += rand(-0.012, 0.012);
  vel.normalize().multiplyScalar(P.speed);
  G.bolts.push({ group: g, vel, life: P.range / P.speed });
  AudioSys.zap();
}
function updatePulseCannon(dt){
  const P = CONFIG.pulse;
  const firing = G.cannonHeld && !G.cannonLock && !G.over;
  if (firing){
    G.cannonHeat = Math.min(100, G.cannonHeat + P.heatRate * dt);
    G.cannonFireT -= dt;
    if (G.cannonFireT <= 0){ G.cannonFireT = Math.max(0, G.cannonFireT + 1 / P.rate); fireBolt(); }
    if (G.cannonHeat >= 100){ G.cannonLock = true; AudioSys.overheat(); toast('🔥 Pulse cannon overheated — venting!'); }
  } else {
    G.cannonFireT = 0;
    if (G.cannonHeat > 0) G.cannonHeat = Math.max(0, G.cannonHeat - P.ventRate * dt);
    if (G.cannonLock && G.cannonHeat < P.unlockAt) G.cannonLock = false;
  }
  for (let i = G.bolts.length - 1; i >= 0; i--){
    const b = G.bolts[i]; b.life -= dt;
    b.group.position.addScaledVector(b.vel, dt);
    let boom = b.life <= 0, hitDone = false;
    if (!boom){
      for (const h of G.hunters){
        if (h.dead) continue;
        const rr = h.type.hitR * Math.max(1, h.group.scale.x) * 0.8 + 0.9;
        if (b.group.position.distanceTo(h.group.position) < rr){
          damageTarget({ kind: 'hunter', ref: h }, P.dmg * (h.typeId === 'skitter' ? P.skitterMul : 1));
          hitDone = true; break;
        }
      }
      if (!hitDone) for (const n of G.nests){
        if (!n.dead && b.group.position.distanceTo(n.group.position) < 5.2){
          damageTarget({ kind: 'nest', ref: n }, P.dmg); hitDone = true; break;
        }
      }
      if (hitDone) boom = true;
    }
    if (boom){ gameScene.remove(b.group); G.bolts.splice(i, 1); }
  }
}

// ============================ HUNTER AI ============================
function pickPatrolPoint(h){
  if (h.guardNest && !h.guardNest.dead){ // nest guards hold their post while the nest lives
    const p = h.guardNest.group.position.clone();
    p.x += rand(-11, 11); p.z += rand(-11, 11); p.y += rand(-3, 3);
    if (G.mode === 'expedition') p.y = clamp(p.y, CONFIG.arena.floorY + 3, CONFIG.arena.ceilY - 3);
    return p;
  }
  const cands = [];
  for (const c of G.crystals) if (!c.taken) cands.push(c.group.position);
  if (G.mode === 'expedition' && G.gate) cands.push(G.gate.pos);
  if (G.mode === 'survival' && G.survGate) cands.push(G.survGate.gate.pos);
  const base = cands.length ? pick(cands) : h.home;
  const p = base.clone(); p.x += rand(-9, 9); p.z += rand(-9, 9); p.y += rand(-3, 3);
  if (G.mode === 'expedition') p.y = clamp(p.y, CONFIG.arena.floorY + 3, CONFIG.arena.ceilY - 3);
  return p;
}
function updateHunters(dt){
  const pp = player.group.position;
  for (const h of G.hunters){
    if (h.dead) continue;
    const g = h.group, pos = g.position;
    const distP = pos.distanceTo(pp);
    h.hitCd -= dt; h.closeCd -= dt;
    if (g.userData.spin) g.userData.spin.rotation.z += dt * 1.4;
    if (h.disabled > 0){ h.disabled -= dt; setCore(h, 0x444444); continue; }
    const boss = h.ancient || h.warden || h.trioRole;
    if (boss){ h.awareness = 1; h.targetKind = 'player'; h.lastNoise.copy(pp); }
    else if (h.typeId !== 'lurker') h.awareness = Math.max(0, h.awareness - dt * (h.awareness > 0.65 ? 0.028 : 0.05));
    h.state = h.awareness < 0.25 ? 'dormant' : h.awareness < 0.6 ? 'curious' : 'hunting';
    // --- senses (DESIGN.md): investigation memory + proximity sense ---
    if (!boss && h.typeId !== 'lurker'){
      if (h.state === 'hunting'){ h.investigateT = CONFIG.senses.investigateDur; h.investPoint.copy(h.lastNoise); }
      else if (h.investigateT > 0) h.investigateT = Math.max(0, h.investigateT - dt);
      // proximity sense: a mobile hunter feels you nearby even in total silence
      // (sentries sense via their own pings; lurkers ambush by proximity already)
      if (h.typeId !== 'sentry'){
        const stealthF = player.subId === 'phantom' ? CONFIG.senses.phantomStealth : player.d.def.noiseMul;
        if (distP < CONFIG.senses.proxBase * stealthF){
          h.awareness = Math.max(h.awareness, 0.7);
          h.lastNoise.copy(pp); h.targetKind = 'player';
          h.state = 'hunting';
        }
      }
    }
    if (h.typeId === 'lurker') setCore(h, h.lurkState === 'dash' ? 0xff4d6d : 0x6a4aff);
    else if (h.typeId === 'sentry' || h.trioRole === 'eye') setCore(h, 0xffb84d);
    else setCore(h, CONFIG.hunterStates[h.state].core);
    // sentry / shrieker / eye pings
    if (h.typeId === 'sentry' || h.trioRole === 'eye' || (h.warden && h.warden.mod === 'shrieker')){
      h.sentryT -= dt;
      const every = h.trioRole === 'eye' ? CONFIG.trio.eye.pingEvery * (h.trioCycle >= 3 ? 0.75 : 1)
                  : (h.warden ? CONFIG.warden.shriekEvery : h.type.pingEvery);
      if (h.sentryT <= 0){ h.sentryT = every; sentryPing(h); }
    }
    // movement
    let target = null, speed = 0;
    const stationary = h.typeId === 'sentry' || h.trioRole === 'eye';
    if (!stationary){
      if (h.typeId === 'lurker'){
        h.lurkT = (h.lurkT || 0) - dt;
        const speedFrac = player.vel.length() / Math.max(1, player.d.def.speed);
        if (h.lurkState === 'dash'){
          target = pp; speed = h.type.dash;
          if (h.lurkT <= 0){ h.lurkState = 'hide'; h.lurkT = 4; }
        } else {
          h.vel.multiplyScalar(Math.max(0, 1 - 4 * dt));
          if (h.lurkT <= 0 && ((distP < 46 && speedFrac > 0.45) || distP < 17)){ h.lurkState = 'dash'; h.lurkT = 2.4; }
        }
      } else if (h.state === 'dormant'){
        // active patrol: cruise between waypoints around crystals and the gate
        h.patrolT -= dt;
        if (!h.patrolTarget || h.patrolT <= 0 || pos.distanceTo(h.patrolTarget) < CONFIG.senses.patrolReach){
          h.patrolTarget = pickPatrolPoint(h); h.patrolT = rand(14, 22);
        }
        target = h.patrolTarget;
        speed = h.type.speed * CONFIG.senses.patrolSpeedMul;
      } else if (h.state === 'curious'){
        if (h.targetKind === 'decoy' && G.decoyActive){ target = G.decoyActive.group.position; speed = h.type.speed * 0.7; }
        else if (h.investigateT > 0){
          // investigation: sweep the last-heard area before calming down
          target = h.investPoint.clone();
          target.x += Math.sin(G.time * 0.5 + h.phase) * 11;
          target.z += Math.cos(G.time * 0.43 + h.phase) * 11;
          target.y += Math.sin(G.time * 0.6 + h.phase) * 2.5;
          speed = h.type.speed * 0.65;
        }
        else { target = h.lastNoise; speed = h.type.speed * 0.7; }
      } else {
        target = (h.targetKind === 'decoy' && G.decoyActive) ? G.decoyActive.group.position : (boss ? pp : h.lastNoise);
        speed = h.type.speed;
      }
      if (target && speed > 0){
        const to = target.clone().sub(pos), d = to.length();
        if (d > 2){
          to.normalize();
          if (h.type.erratic){ const perp = new THREE.Vector3(-to.z, 0, to.x); to.addScaledVector(perp, Math.sin(G.time * 6 + h.phase) * 0.55).normalize(); }
          h.vel.lerp(to.multiplyScalar(speed * h.speedMul), clamp(dt * 2.2, 0, 1));
        } else h.vel.multiplyScalar(Math.max(0, 1 - 3 * dt));
      }
      pos.addScaledVector(h.vel, dt);
      // whole-body swim motion tied to actual swim speed: a smoothed speed factor
      // + phase accumulators (so rate changes never pop), feeding the roll and bob
      // below on top of the turn banking and the vertex bend
      const sfNow = h.type.speed > 0 ? clamp(h.vel.length() / h.type.speed, 0, 1.2) : 0;
      h.swimSf = lerp(h.swimSf || 0, sfNow, clamp(dt * 3, 0, 1));
      h.rollPh = (h.rollPh || 0) + dt * (2.2 + h.swimSf * 4.5);
      h.bobPh = (h.bobPh || 0) + dt * (3.0 + h.swimSf * 5.0);
      if (h.vel.lengthSq() > 0.5){
        g.lookAt(pos.clone().add(h.vel));
        // banking into turns + a gentle pitch wave (eel feel; complements the vertex bend)
        const yaw = Math.atan2(h.vel.x, h.vel.z);
        let dy = yaw - (h.lastYaw !== undefined ? h.lastYaw : yaw);
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        h.lastYaw = yaw;
        h.bank = lerp(h.bank || 0, clamp(-dy / Math.max(dt, 0.001) * 0.14, -0.5, 0.5), clamp(dt * 5, 0, 1));
        // roll oscillation grows with swim speed (was a fixed ±0.045 rad wave)
        g.rotateZ(h.bank + Math.sin(h.rollPh + h.phase) * (0.05 + h.swimSf * 0.11));
        g.rotateX(Math.sin(G.time * 1.7 + h.phase * 1.3) * 0.04);
      }
      // gentle vertical bob, delta-applied so it never fights movement integration
      const bobNow = Math.sin(h.bobPh + h.phase * 1.7) * 0.30 * h.swimSf * clamp(g.scale.x, 1, 2);
      pos.y += bobNow - (h.bobPrev || 0); h.bobPrev = bobNow;
      if (G.mode === 'expedition'){
        const horiz = Math.hypot(pos.x, pos.z), A = CONFIG.arena;
        if (horiz > A.radius){ const s = A.radius / horiz; pos.x *= s; pos.z *= s; }
        pos.y = clamp(pos.y, A.floorY + 2, A.ceilY);
      } else {
        const horiz = Math.hypot(pos.x, pos.z), S = CONFIG.survival;
        if (horiz > S.shaftRadius){ const s = S.shaftRadius / horiz; pos.x *= s; pos.z *= s; }
        if (pos.y > 4) pos.y = 4;
        if (pos.y < pp.y - 320 && !boss){ h.dead = true; removeEntity(g); continue; } // left far behind in the descent
      }
    } else {
      // sentries / guardian eyes don't swim — a slow scanning sway + hover bob instead
      g.rotation.y = Math.sin(G.time * 0.26 + h.phase) * 0.16;
      pos.y = h.home.y + Math.sin(G.time * 0.5 + h.phase * 1.7) * 0.35;
    }
    if (h.swim){ // vertex-bend drive: amplitude/rate follow the actual swim speed
      if (stationary){ h.swim.uAmp.value = 0.05; h.swim.uRate.value = 1.6; }
      else {
        const sf = h.type.speed > 0 ? clamp(h.vel.length() / h.type.speed, 0, 1.2) : 0;
        const k = h.typeId === 'skitter' ? 1.3 : 1;
        h.swim.uAmp.value = (0.06 + sf * 0.30) * k;
        h.swim.uRate.value = (5.5 + sf * 9.5) * k;
      }
    }
    // contact damage
    const hitRange = h.type.hitR * Math.max(1, g.scale.x) * 0.8 + player.radius;
    if (distP < hitRange && h.hitCd <= 0){ h.hitCd = 1.2; const rvA = h.group.userData.reveal; if (rvA) rvA.at = G.time; damagePlayer(h.dmgAbs || h.type.dmg, pos, hunterName(h)); }
    else if (distP < hitRange + 5.5 && h.closeCd <= 0){
      h.closeCd = 6; G.closeCalls++;
      if (G.mode === 'survival'){ const b = Math.round(CONFIG.econ.closeCall * G.diff.mult); bankCoins(b); }
    }
  }
  // growl audio from nearest hunting hunter
  let growl = 0;
  for (const h of G.hunters){
    if (h.dead || h.disabled > 0) continue;
    const d = h.group.position.distanceTo(pp);
    if (h.state === 'hunting') growl = Math.max(growl, (1 - d / 75) * 1.0);
    else if (h.state === 'curious') growl = Math.max(growl, (1 - d / 60) * 0.3);
  }
  AudioSys.setGrowl(clamp(growl, 0, 1) * 0.13);
}

// ============================ HAZARDS & PICKUPS ============================
function updateHazardsAndPickups(dt){
  const pp = player.group.position;
  for (const j of G.jellies){
    j.hitCd -= dt;
    const pos = j.group.position;
    pos.addScaledVector(j.vel, dt);
    pos.y = j.baseY + Math.sin(G.time * 0.9 + j.group.userData.jelly.phase) * 2.2;
    if (Math.random() < dt * 0.25) j.vel.set(rand(-1,1), rand(-0.2,0.2), rand(-1,1)).normalize().multiplyScalar(CONFIG.jelly.drift * rand(0.6, 1.3));
    const lim = G.mode === 'expedition' ? CONFIG.arena.radius - 6 : CONFIG.survival.shaftRadius - 6;
    const horiz = Math.hypot(pos.x, pos.z);
    if (horiz > lim){ j.vel.x -= pos.x * 0.03; j.vel.z -= pos.z * 0.03; }
    j.group.rotation.y += dt * 0.15;
    updateJellyfishVisual(j, G.time);
    if (!j.decor && pos.distanceTo(pp) < CONFIG.jelly.hitR + player.radius && j.hitCd <= 0){
      j.hitCd = CONFIG.jelly.hitCd; damagePlayer(CONFIG.jelly.dmg, pos, 'Jellyfish'); toast('🪼 Jellyfish sting!');
    }
  }
  for (const m of G.mines){
    if (m.dead) continue;
    if (m.group.position.distanceTo(pp) < CONFIG.mine.triggerR){
      m.dead = true; explosionFx(m.group.position, 11); AudioSys.boom(); removeEntity(m.group);
      damagePlayer(CONFIG.mine.dmg, m.group.position, 'Mine'); toast('💥 Mine!');
    }
  }
  for (const c of G.crystals){
    if (c.taken) continue;
    if (G.mode === 'survival' && c.floor !== undefined && c.floor !== G.floor) continue; // other floors' crystals are not here (see survCullCollectibles)
    c.group.rotation.y += dt * 0.8;
    c.group.position.y = c.baseY + Math.sin(G.time * 1.3 + c.phase) * 0.9;
    if (c.halo){ // halo brightness follows the sonar reveal (+ a proximity shimmer up close)
      const rv = c.group.userData.reveal;
      let f = 0.04;
      if (rv) f = (G.time >= rv.at) ? rv.min + (1 - rv.min) * clamp(1 - (G.time - rv.at) / rv.dur, 0, 1) : rv.min;
      const prox = clamp(1 - c.group.position.distanceTo(pp) / 16, 0, 1) * 0.35;
      f = Math.max(f, prox);
      const pulse = 1 + Math.sin(G.time * 1.7 + c.phase) * 0.12;
      c.halo.material.opacity = c.haloBase * Math.pow(f, 1.35) * pulse;
      const hs = c.haloScale * (0.55 + 0.45 * f) * pulse;
      c.halo.scale.set(hs, hs, 1);
    }
    if (c.group.position.distanceTo(pp) < 4.6){
      c.taken = true; removeEntity(c.group);
      let v = c.value;
      if (c.golden){
        if (G.mode === 'expedition' && G.zone) SAVE.golden[G.zone.id] = true;
        toast('✨ GOLDEN CRYSTAL! +🪙 ' + v);
      } else {
        G.crystalsGot++;
        if (G.mode === 'survival'){ G.floorCrystals++; updateObjective(); } // descent-gate quota counts this floor's crystals
        v = Math.round(v * player.d.def.crystalMul * G.boon.crystalMul *
             (G.mode === 'expedition' && G.zone && (SAVE.stars[G.zone.id] || 0) > 0 ? 0.5 : 1) *
             (G.mode === 'survival' ? G.diff.mult : 1));
        if (G.mode === 'expedition') updateObjective();
      }
      bankCoins(v); AudioSys.coin();
    }
  }
  if (G.caches) for (const c of G.caches){
    if (c.taken) continue;
    if (G.mode === 'survival' && c.floor !== undefined && c.floor !== G.floor) continue; // other floors' caches are not here
    c.group.rotation.y += dt * 2.4; // coin spin (Akmal 19 Nov)
    if (c.baseY !== undefined) c.group.position.y = c.baseY + Math.sin(G.time * 1.4 + c.phase) * 0.5;
    if (c.group.position.distanceTo(pp) < 5){
      c.taken = true; removeEntity(c.group);
      const v = Math.round(rand(CONFIG.econ.cacheMin, CONFIG.econ.cacheMax) * (G.diff ? G.diff.mult : 1));
      bankCoins(v); player.batt = Math.min(player.d.maxBatt + G.boon.battMax, player.batt + 30);
      player.hull = Math.min(player.d.maxHull, player.hull + CONFIG.econ.cacheHull); // caches are the in-dive hull source — without this, hull only ever goes down
      toast('📦 Supply cache: +' + CONFIG.econ.cacheHull + ' hull, +boost, +🪙 ' + v);
      AudioSys.coin();
    }
  }
  if (G.pickups) for (const p of G.pickups){
    if (p.taken) continue;
    if (G.mode === 'survival' && p.floor !== undefined && p.floor !== G.floor) continue; // other floors' items are not here
    p.group.rotation.y += dt * 0.8;
    p.group.position.y = p.baseY + Math.sin(G.time * 1.3 + p.phase) * 0.9;
    if (p.halo){ // same sonar-reveal halo behaviour as crystals
      const rv = p.group.userData.reveal;
      let f = 0.04;
      if (rv) f = (G.time >= rv.at) ? rv.min + (1 - rv.min) * clamp(1 - (G.time - rv.at) / rv.dur, 0, 1) : rv.min;
      const prox = clamp(1 - p.group.position.distanceTo(pp) / 16, 0, 1) * 0.35;
      f = Math.max(f, prox);
      const pulse = 1 + Math.sin(G.time * 1.7 + p.phase) * 0.12;
      p.halo.material.opacity = p.haloBase * Math.pow(f, 1.35) * pulse;
      const hs = p.haloScale * (0.55 + 0.45 * f) * pulse;
      p.halo.scale.set(hs, hs, 1);
    }
    if (p.group.position.distanceTo(pp) < 4.6){
      p.taken = true; removeEntity(p.group);
      if (p.kind === 'cell'){
        player.batt = Math.min(player.d.maxBatt + G.boon.battMax, player.batt + CONFIG.econ.cellBatt);
        toast('🔋 Battery cell: +' + CONFIG.econ.cellBatt + ' boost');
        AudioSys.tone(740, 0.1, 'sine', 0.08);
      } else {
        player.hull = Math.min(player.d.maxHull, player.hull + CONFIG.econ.patchHull);
        toast('🛠 Hull patch: +' + CONFIG.econ.patchHull + ' hull');
        AudioSys.coin();
      }
    }
  }
  // decoy lifecycle
  if (G.decoyActive){
    const da = G.decoyActive;
    if (G.time > da.until){ removeEntity(da.group); G.decoyActive = null; }
    else {
      da.pulseT -= dt;
      if (da.group.userData.spin) da.group.userData.spin.rotation.z += dt * 3;
      if (da.group.userData.core) da.group.userData.core.material.color.setHex(Math.sin(G.time * 9) > 0 ? 0x2ee6c8 : 0x0a3a34);
      if (da.pulseT <= 0){
        da.pulseT = CONFIG.decoy.pulse;
        spawnWave(da.group.position, 24, 0x2ee6c8);
        for (const h of G.hunters){
          if (h.dead || h.type.hearing <= 0 || h.ancient || h.warden || h.trioRole) continue;
          const d = h.group.position.distanceTo(da.group.position);
          if (d < CONFIG.decoy.radius * h.type.hearing){ h.awareness = Math.max(h.awareness, 0.75); h.lastNoise.copy(da.group.position); h.targetKind = 'decoy'; }
        }
      }
    }
  }
  // waves & explosion fx
  for (let i = G.waves.length - 1; i >= 0; i--){
    const w = G.waves[i], r = (G.time - w.t0) * CONFIG.sonar.waveSpeed;
    if (r >= w.maxR){ gameScene.remove(w.shell); gameScene.remove(w.ring); G.waves.splice(i, 1); continue; }
    w.shell.scale.setScalar(Math.max(r, 0.01)); w.shell.material.opacity = 0.10 * (1 - r / w.maxR);
    w.ring.scale.setScalar(Math.max(r, 0.01)); w.ring.material.opacity = 0.5 * (1 - r / w.maxR);
  }
  for (let i = G.fx.length - 1; i >= 0; i--){
    const f = G.fx[i]; f.t += dt; const k = f.t / f.dur;
    if (k >= 1){ gameScene.remove(f.mesh); G.fx.splice(i, 1); continue; }
    f.mesh.scale.setScalar(0.5 + k * f.s); f.mesh.material.opacity = 0.75 * (1 - k);
  }
}

// ============================ MISSIONS ============================
function updateObjective(){
  if (!G) return;
  const o = $('obj-txt'), s = $('obj-sub');
  if (G.mode === 'expedition'){
    const z = G.zone, m = z.mission;
    if (G.gateOpen){ o.textContent = '⚓ GATE OPEN — swim through the ring'; s.textContent = 'Stay for more crystals (stars) or leave now.'; return; }
    if (m.type === 'collect'){ o.textContent = 'Collect crystals to open the gate'; s.textContent = G.crystalsGot + '/' + m.quota + ' needed · ' + G.crystalsGot + '/' + G.crystalsTotal + ' total'; }
    else if (m.type === 'rescue'){ o.textContent = 'Find and reach the stranded mini-sub'; s.textContent = 'Ping to search. Its beacon blinks amber.'; }
    else if (m.type === 'nests'){ o.textContent = 'Destroy the hunter nests'; s.textContent = G.nestsDown + '/' + m.nests + ' destroyed · torpedoes: F · pulse: hold Click'; }
    else if (m.type === 'survive'){ o.textContent = 'Survive until the gate opens'; s.textContent = fmtTime(Math.max(0, G.surviveT)) + ' remaining'; }
  } else {
    const st = CONFIG.survival.strata[G.stratum % CONFIG.survival.strata.length];
    o.textContent = '▼ FLOOR ' + G.floor + ' · ' + st.name;
    const sg = G.survGate;
    if (sg && sg.open) s.textContent = '⚓ GATE OPEN — dive through the glowing ring ▼';
    else if (sg && survIsBossFloor(sg.floor)) s.textContent = survIsTrioFloor(sg.floor)
      ? '⛔ GATE LOCKED — slay the Three Guardians to descend'
      : '⛔ GATE LOCKED — slay the Stratum Warden to descend';
    else if (sg) s.textContent = '⛔ GATE LOCKED — floor crystals ' + Math.min(G.floorCrystals, sg.quota) + '/' + sg.quota;
    else s.textContent = 'Wardens guard every 10th floor · Trio at floor 50';
  }
}
function completeMission(){
  if (G.missionDone) return;
  G.missionDone = true; G.gateOpen = true;
  if (G.gate) G.gate.ringMat.color.setHex(0x37e08b);
  AudioSys.gate();
  toast('⚓ THE GATE IS OPEN — swim through the ring!');
  updateObjective();
}
function updateMissions(dt){
  if (G.mode !== 'expedition') return;
  const m = G.zone.mission;
  if (!G.missionDone){
    if (m.type === 'collect' && G.crystalsGot >= m.quota) completeMission();
    else if (m.type === 'nests' && G.nestsDown >= m.nests) completeMission();
    else if (m.type === 'survive'){ G.surviveT -= dt; if (G.surviveT <= 0) completeMission(); else if (Math.floor(G.surviveT) !== Math.floor(G.surviveT + dt)) updateObjective(); }
    else if (m.type === 'rescue' && G.stranded && !G.stranded.rescued){
      if (G.stranded.group.position.distanceTo(player.group.position) < 7){
        G.stranded.rescued = true; G.rescued = true;
        toast('🛟 Mini-sub rescued! The gate is open.');
        completeMission();
      }
    }
  }
  if (G.stranded){
    if (G.stranded.rescued){
      const behind = player.group.position.clone().add(new THREE.Vector3(Math.sin(player.yaw + Math.PI) * 9, 1.5, Math.cos(player.yaw + Math.PI) * 9));
      G.stranded.group.position.lerp(behind, clamp(dt * 1.7, 0, 1));
      G.stranded.group.lookAt(player.group.position);
    }
    G.stranded.lamp.material.color.setHex(Math.sin(G.time * 6) > 0 ? 0xffb84d : 0x553311);
  }
  if (G.gateOpen && G.gate && player.group.position.distanceTo(G.gate.pos) < 9) endRun('clear');
}

// ============================ SURVIVAL DESCENT GATES ============================
// Every Survival floor ends at a descent gate (DESIGN.md): while it is locked a
// pressure-current barrier at the floor boundary pushes the player back up — a
// floor cannot be skipped. Normal floors open on a crystal quota collected ON
// that floor; boss floors (10/20/30…) open only when the Warden dies; trio
// floors (50/100…) only when all Three Guardians are dead.
function survFloorQuota(f){ return CONFIG.survival.gateQuota + Math.max(0, Math.floor((f - 1) / CONFIG.survival.floorsPerStratum)); }
function survIsBossFloor(f){ return f > 0 && f % CONFIG.survival.floorsPerStratum === 0; }
function survIsTrioFloor(f){ return f > 0 && f % CONFIG.trio.everyFloors === 0; }
function spawnSurvivalGate(f){
  if (G.survGate){
    removeEntity(G.survGate.gate.group);
    if (G.survGate.column) gameScene.remove(G.survGate.column);
    if (G.survGate.disc) removeEntity(G.survGate.disc);
    G.survGate = null;
  }
  const S = CONFIG.survival;
  const a = rand(0, Math.PI * 2), r = rand(26, 62);
  const pos = new THREE.Vector3(Math.cos(a) * r, -f * S.floorDepth + 5, Math.sin(a) * r);
  // Seabed disc at this floor's base plane with the dive-through hole exactly
  // at the gate (the gate is NOT at the shaft centre — r 26–62 — so the hole
  // follows it). Visual only: the barrier clamp already stops the player at
  // this plane everywhere except through the opened gate.
  const discShape = new THREE.Shape(); discShape.absarc(0, 0, 20, 0, Math.PI * 2, false);
  const discHole = new THREE.Path(); discHole.absarc(0, 0, 10, 0, Math.PI * 2, true);
  discShape.holes.push(discHole);
  const discGeo = new THREE.ShapeGeometry(discShape, 28); discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, SEABED_MAT);
  disc.position.set(pos.x, -f * S.floorDepth + 0.15, pos.z);
  gameScene.add(registerReveal(disc, { min: 0.24 }));
  const gate = spawnGate(gameScene, pos);
  gate.group.rotation.x = Math.PI / 2; // ring lies flat — you dive through it
  const core = glowBall(0.9, 0xff4d6d); core.material.fog = false; gate.group.add(core);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x37e08b, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  column.position.copy(pos); column.position.y += 15;
  column.visible = false;
  gameScene.add(column);
  gate.ringMat.color.setHex(0xff4d6d);
  G.survGate = { gate, floor: f, open: false, bossDown: false, core, column, quota: survFloorQuota(f), disc };
}
function updateSurvivalGate(){
  if (!G.survGate || G.survGate.floor !== G.floor) spawnSurvivalGate(G.floor);
  const sg = G.survGate, S = CONFIG.survival;
  const open = survIsBossFloor(sg.floor) ? sg.bossDown : G.floorCrystals >= sg.quota;
  if (open && !sg.open){
    sg.open = true;
    sg.gate.ringMat.color.setHex(0x37e08b);
    if (sg.core) sg.core.material.color.setHex(0x37e08b);
    sg.column.visible = true;
    AudioSys.gate();
    toast('⚓ DESCENT GATE OPEN — dive through the ring!');
    updateObjective();
  }
  {
    const boundY = -G.floor * S.floorDepth, pp = player.group.position;
    const gp = sg.gate.group.position;
    const inHole = sg.open && Math.hypot(pp.x - gp.x, pp.z - gp.z) < 9.2; // the dive-through hole in the seabed disc
    if (!inHole && pp.y < boundY + 3){
      pp.y = boundY + 3;
      if (player.vel.y < 0) player.vel.y = Math.abs(player.vel.y) * 0.25; // pressure current shoves you back up
      if (!sg.open && G.time > G.gateWarnT){
        G.gateWarnT = G.time + 3;
        toast(survIsBossFloor(sg.floor)
          ? (survIsTrioFloor(sg.floor) ? '⛔ GATE LOCKED — the Three Guardians guard this floor' : '⛔ GATE LOCKED — the Warden guards this floor. Kill it!')
          : '⛔ GATE LOCKED — collect ' + Math.max(0, sg.quota - G.floorCrystals) + ' more crystal(s) on this floor');
        AudioSys.tone(140, 0.18, 'sawtooth', 0.07, 90);
        const ob = $('hud-obj');
        if (ob){ ob.style.borderColor = '#ff4d6d'; setTimeout(()=>{ ob.style.borderColor = ''; }, 350); }
      }
    }
  }
  // One-way descent seal (Akmal playtest 19 Nov): once you have dived into
  // a deeper floor, the current seals the shaft behind you — you cannot
  // rise back into the floor above. Mirrors the locked-gate clamp below:
  // same 3 m margin, same shove, so the seal reads as water, not a wall.
  if (G.floor > 1){
    const ceilY = -(G.floor - 1) * S.floorDepth, pp = player.group.position;
    if (pp.y > ceilY - 3){
      pp.y = ceilY - 3;
      if (player.vel.y > 0) player.vel.y = -Math.abs(player.vel.y) * 0.25; // sealed current shoves you back down
      if (G.time > G.gateWarnT){
        G.gateWarnT = G.time + 3;
        toast('⛔ SEALED — no way back up. Down is the only way.');
        AudioSys.tone(140, 0.18, 'sawtooth', 0.07, 90);
      }
    }
  }
}

// ============================ SURVIVAL DIRECTOR ============================
function spawnSurvivalHunter(){
  const S = CONFIG.survival, st = G.stratum;
  const pool = ['stalker'];
  if (st >= 1) pool.push('skitter', 'skitter');
  if (st >= 2) pool.push('brute');
  if (st >= 3) pool.push('sentry');
  if (st >= 4) pool.push('lurker');
  const typeId = pick(pool);
  const pp = player.group.position;
  const a = rand(0, Math.PI * 2), r = rand(28, S.shaftRadius - 28);
  // Spawn mix (Akmal 19 Nov: the dive felt empty — hunters only ever rose
  // from far below): ~45% arrive near the player's own level, the rest below.
  const yOff = Math.random() < 0.45 ? rand(-12, 8) : -rand(35, 75);
  const pos = new THREE.Vector3(Math.cos(a) * r, pp.y + yOff, Math.sin(a) * r);
  // HP grows +25 per stratum (Akmal 19 Nov's scaling table); speed as before.
  const baseHp = CONFIG.hunters[typeId].hp;
  return spawnHunter(gameScene, typeId, pos, { speedMul: G.diff.hunterMul * clamp(1 + st * 0.04, 1, 1.35), hpMul: (baseHp + 25 * st) / baseHp });
}
function spawnAncient(){
  const pos = player.group.position.clone(); pos.y -= 60; pos.x += rand(-40, 40); pos.z += rand(-40, 40);
  const h = spawnHunter(gameScene, 'brute', pos, { aggro: true, ancient: true, scaleMul: 2.0, hpMul: 4, speedMul: 1.3 * G.diff.hunterMul });
  h.dmgAbs = 30;
  toast('🐋 THE ANCIENT ONE rises… kill it, or outlast it.', 4200);
}
function spawnWarden(stratumIdx){
  const W = CONFIG.warden;
  const mod = pick(W.modifiers);
  const pos = player.group.position.clone();
  pos.y -= W.spawnBelow; pos.x += rand(-30, 30); pos.z += rand(-30, 30);
  const h = spawnHunter(gameScene, 'brute', pos, { aggro: true,
    scaleMul: W.scale / CONFIG.hunters.brute.modelScale,
    hpMul: (W.hp + W.hpPerStratum * (stratumIdx - 1)) / CONFIG.hunters.brute.hp,
    speedMul: W.speedMul * G.diff.hunterMul * (mod === 'swift' ? W.swiftSpeedMul : 1),
    dmgTakenMul: mod === 'armored' ? W.armoredDmgMul : 1, swiftHp: mod === 'swift' });
  h.warden = { mod, stratum: stratumIdx };
  h.dmgAbs = W.dmg;
  G.wardenAlive = h;
  toast('👹 STRATUM WARDEN — ' + W.modInfo[mod].name + ': ' + W.modInfo[mod].desc, 4600);
}
function onWardenKilled(h){
  G.wardenAlive = null;
  if (G.survGate && h.warden && G.survGate.floor === h.warden.stratum * CONFIG.survival.floorsPerStratum)
    G.survGate.bossDown = true; // the Warden was this floor's gate key
  const W = CONFIG.warden;
  const b = Math.round((W.coinBase + W.coinPerStratum * (h.warden.stratum - 1)) * G.diff.mult);
  bankCoins(b);
  player.batt = player.d.maxBatt + G.boon.battMax;
  toast('👹 Warden slain! +🪙 ' + b + ' · battery refilled', 3800);
  openBoonDraft();
}
function spawnTrio(milestone){
  const T = CONFIG.trio, cycle = milestone / T.everyFloors, mul = Math.pow(T.cycleMul, cycle - 1);
  const pp = player.group.position;
  const mk = (typeId, role, cfg, offset) => {
    const pos = pp.clone().add(offset);
    const h = spawnHunter(gameScene, typeId, pos, { aggro: true,
      scaleMul: cfg.scale / CONFIG.hunters[typeId].modelScale,
      hpMul: (cfg.hp * mul) / CONFIG.hunters[typeId].hp,
      speedMul: (cfg.speed ? cfg.speed / CONFIG.hunters[typeId].speed : 1) * G.diff.hunterMul * (role === 'alpha' && cycle >= 2 ? 1.15 : 1),
      dmgTakenMul: role === 'wall' && cycle >= 2 ? 0.6 : 1 });
    h.trioRole = role; h.trioCycle = cycle; h.dmgAbs = Math.round(cfg.dmg * mul);
    return h;
  };
  const alpha = mk('stalker', 'alpha', T.alpha, new THREE.Vector3(18, -48, 10));
  const wall = mk('brute', 'wall', T.wall, new THREE.Vector3(-24, -62, -14));
  const eye = mk('sentry', 'eye', T.eye, new THREE.Vector3(62, -26, 42));
  G.trio = { milestone, cycle, members: [alpha, wall, eye], cleared: false };
  toast('👁 FLOOR ' + milestone + ' — THE THREE GUARDIANS: the Alpha, the Wall, the Eye. Kill all three!', 4800);
}
function onTrioMemberDown(h){
  if (!G.trio || G.trio.cleared) return;
  const left = G.trio.members.filter(m => !m.dead).length;
  if (left > 0){ toast('Guardian down — ' + left + ' remain!'); return; }
  G.trio.cleared = true;
  if (G.survGate && G.survGate.floor === milestone) G.survGate.bossDown = true; // trio was this floor's gate key
  const T = CONFIG.trio, milestone = G.trio.milestone;
  const b = Math.round((T.coinBase + T.coinPerCycle * (G.trio.cycle - 1)) * G.diff.mult);
  bankCoins(b);
  player.batt = player.d.maxBatt + G.boon.battMax;
  player.hull = player.d.maxHull;
  SAVE.trioBest = Math.max(SAVE.trioBest || 0, milestone); persist();
  G.trio = null;
  toast('👑 GUARDIANS SLAIN at FLOOR ' + milestone + '! Jackpot +🪙 ' + b + ' · hull & battery restored', 4600);
  openBoonDraft();
}
function onStratumCross(newStratum, floor){
  const S = CONFIG.survival;
  G.stratum = newStratum;
  const st = S.strata[newStratum % S.strata.length];
  gameScene.background.setHex(st.tint);
  gameScene.fog.color.setHex(st.tint);
  // The deeper the stratum, the thicker the murk (fog colour follows above).
  gameScene.fog.near = Math.max(25, FOG_NEAR - newStratum);
  gameScene.fog.far = Math.max(84, FOG_FAR - newStratum * 5);
  bankCoins(Math.round(CONFIG.econ.stratumBonus * G.diff.mult));
  toast('▼ ' + st.name + ' — FLOOR ' + floor, 3200);
  updateObjective();
  // Bosses are no longer scheduled here: since the floor rebase the
  // guardian lives ON floor 10/20/30... (the last floor of the stratum
  // BELOW this one) and is scheduled on entry in updateSurvival — by the
  // time this new stratum opens (floor 11/21...) it is already dead.
  // (No draft on stratum cross any more — the Warden/Guardians kill grants it.)
}
function updateSurvival(dt){
  const S = CONFIG.survival, pos = player.group.position;
  const depth = Math.max(0, -pos.y);
  G.maxDepth = Math.max(G.maxDepth, depth);
  const newFloor = Math.floor(depth / S.floorDepth) + 1;
  if (newFloor > G.floor){
    G.floor = newFloor;
    G.floorEnterT = G.time; G.graceWarned = false; G.gracePreWarned = false; // the Collapse parks at this floor's ceiling for 2 min (Akmal 19 Nov)
    G.spawnInterval = Math.max(S.spawnMin, G.spawnInterval * 0.94); // deeper floors breed denser hunters
    G.floorCrystals = 0; // the descent-gate quota counts crystals collected ON the new floor
    const newStratum = Math.floor((newFloor - 1) / S.floorsPerStratum);
    if (newStratum > G.stratum) onStratumCross(newStratum, newFloor);
    // Descent boon draft on odd multiples of 5 (floors 5, 15, 25, …) — the
    // old 60 s timer draft and the stratum-cross draft are gone; boss kills
    // (Warden / Three Guardians) still grant their draft as the boss reward.
    // Guardian floors (Akmal 19 Nov): the boss lives ON floor 10/20/30...
    // and its gate stays sealed until it dies — schedule it on entry.
    if (survIsBossFloor(newFloor)){
      if (survIsTrioFloor(newFloor)){
        if (!G.trio && !G.pendingBoss){
          G.pendingBoss = { kind: 'trio', milestone: newFloor, warn: '⚠ FLOOR ' + newFloor + ' — THE THREE GUARDIANS guard this floor. Kill them to open the gate!' };
          G.bossWarnAt = G.time + 0.5; G.bossSpawnAt = G.time + CONFIG.trio.warnBefore; G.bossWarned = false;
        }
      } else if (!G.wardenAlive && !G.pendingBoss && !G.trio){
        G.pendingBoss = { kind: 'warden', stratum: newFloor / 10, warn: '⚠ A STRATUM WARDEN guards this floor — kill it to open the descent gate!' };
        G.bossWarnAt = G.time + 0.5; G.bossSpawnAt = G.time + CONFIG.warden.warnBefore; G.bossWarned = false;
      }
    }
    if (newFloor % 10 === 5) openBoonDraft();
    // Name the floor's theme on entry, expedition-style (skipped on stratum
    // floors — the stratum/boss announcement owns those).
    if (newFloor % 10 !== 0 && (newFloor - 1) % 10 !== 0){ const th = floorTheme(newFloor); toast(th.icon + ' FLOOR ' + newFloor + ' — ' + th.name, 1900); }
    updateObjective();
  }
  // Depth darkness gradient (Akmal 19 Nov): bright shallows, crushing dark
  // below — the water darkens ~1% per floor and the fog closes in, lerped
  // per-frame so the transition is a slow fade, never a jump.
  {
    const st = S.strata[G.stratum % S.strata.length];
    const dark = Math.min(1, G.floor / 55);
    if (!G.darkCol) G.darkCol = new THREE.Color();
    G.darkCol.setHex(st.tint).multiplyScalar(1 - 0.62 * dark);
    const lerpK = Math.min(1, dt * 1.6);
    gameScene.background.lerp(G.darkCol, lerpK);
    gameScene.fog.color.lerp(G.darkCol, lerpK);
    const farT = Math.max(44, FOG_FAR - G.stratum * 5 - dark * 36);
    const nearT = Math.max(13, FOG_NEAR - G.stratum - dark * 11);
    gameScene.fog.far += (farT - gameScene.fog.far) * lerpK;
    gameScene.fog.near += (nearT - gameScene.fog.near) * lerpK;
  }
  updateSurvivalGate();
  G.spawnT -= dt;
  const alive = G.hunters.reduce((n, h) => n + (h.dead ? 0 : 1), 0);
  if (G.spawnT <= 0 && alive < S.maxHunters){
    G.spawnT = G.spawnInterval;
    G.spawnInterval = Math.max(S.spawnMin, G.spawnInterval * S.spawnDecay);
    spawnSurvivalHunter();
  }
  if (G.time >= G.nextMinuteAt){ G.nextMinuteAt += 60; bankCoins(Math.round(CONFIG.econ.minuteBonus * G.diff.mult)); }
  if (G.time >= G.nextAncientAt){ G.nextAncientAt += S.ancientEvery; spawnAncient(); }
  if (G.pendingBoss){
    if (!G.bossWarned && G.time >= G.bossWarnAt){ G.bossWarned = true; toast(G.pendingBoss.warn, 3800); AudioSys.tone(196, 0.7, 'sawtooth', 0.1, 98); }
    if (G.time >= G.bossSpawnAt){
      const pb = G.pendingBoss; G.pendingBoss = null;
      if (pb.kind === 'warden') spawnWarden(pb.stratum); else spawnTrio(pb.milestone);
    }
  }
  // The Collapse — telegraphed (Akmal 19 Nov: he died to it twice without
  // ever seeing it coming): HUD countdown + headroom readout, warnings at
  // T-10s and at the start, a wall that flares as it nears, the red
  // vignette in animate(), and a damage RAMP — gentle at first, lethal
  // only if the player lingers in the crush zone.
  if (!G.collapseStage && G.time >= S.collapseStart - 10){
    G.collapseStage = 1;
    toast('⚠ THE DEEP STIRS — THE COLLAPSE BEGINS IN 10s. KEEP DIVING!', 3600);
    AudioSys.tone(98, 0.8, 'sawtooth', 0.09, 65);
  }
  if (G.collapseStage === 1 && G.time >= S.collapseStart){
    G.collapseStage = 2;
    toast('🟥 THE COLLAPSE HAS BEGUN — it never stops. DIVE!', 3600); AudioSys.deepBoom();
  }
  // Boss-floor hold (Akmal 19 Nov): the Collapse rides down with you
  // until a guardian floor (10, 20, 30, ...), then HOLDS while you fight
  // the boss — and only resumes once you descend past that floor.
  const onBossFloor = G.floor > 0 && G.floor % 10 === 0;
  if (onBossFloor && G.time >= S.collapseStart){
    const holdY = -((G.floor - 1) * 40) + 16; // parked at the entrance: crush band starts above the ceiling, whole floor is safe
    if (G.collapseY < holdY) G.collapseY = holdY; // never crush a boss fight
    if (!G.collapseHeld){ G.collapseHeld = true; toast('🟥 THE COLLAPSE HOLDS — finish this floor\'s guardian!', 3400); }
    G.crushT = 0; G.collapseMoving = false;
  } else if (G.time >= S.collapseStart){
    if (G.collapseHeld){ G.collapseHeld = false; toast('🟥 THE COLLAPSE RESUMES — DIVE!', 3000); AudioSys.deepBoom(); }
    // Per-floor grace (Akmal 19 Nov): after a floor change the Collapse
    // sits at the new floor's ceiling for 2 minutes while the player
    // hunts; then it creeps down bit by bit as pressure. Warnings fire
    // 10 s before it moves and again when it starts moving.
    const gateSealed = !!(G.survGate && G.survGate.floor === G.floor && !G.survGate.open);
    const graceLeft = 120 - (G.time - (G.floorEnterT || 0));
    const inGrace = gateSealed && graceLeft > 0;
    if (gateSealed && graceLeft <= 10 && graceLeft > 0 && !G.gracePreWarned){ G.gracePreWarned = true; toast('⚠ THE COLLAPSE MOVES IN ' + Math.ceil(graceLeft) + 's — wrap up this floor!', 3000); AudioSys.tone(660, 0.15, 'sine', 0.07); }
    if (gateSealed && !inGrace && !G.graceWarned){ G.graceWarned = true; toast('🟥 THE COLLAPSE IS ON THE MOVE — it creeps down this floor. Finish up and DIVE!', 3800); AudioSys.deepBoom(); }
    let speed = S.collapseBase * 0.65 + G.stratum * 0.2 + G.time / 600; // slowed 19 Nov — gated floors take longer than the old pace assumed
    if (gateSealed && !inGrace) speed = Math.min(speed, 0.35); // the bit-by-bit creep
    const yBefore = G.collapseY;
    G.collapseY -= speed * dt;
    // Sealed-gate hold (Akmal 19 Nov): while this floor's gate is sealed
    // the Collapse waits ABOVE THE FLOOR'S CEILING (entrance + 16 m, so
    // its 14 m crush band never enters the floor) — the whole floor stays
    // huntable, and the plane only comes down once the gate opens. (The
    // first version parked mid-floor and crushed all but the bottom few
    // metres of the floor the player still had to work.)
    if (gateSealed){
      const gateHoldY = inGrace ? -((G.floor - 1) * 40) + 16 : -(G.floor * 40) + 20; // grace: entrance park; after: bottom guard (gate-pinned player stays outside the crush band)
      if (G.collapseY < gateHoldY){
        G.collapseY = gateHoldY;
        if (!G.gateHeld){ G.gateHeld = true; if (inGrace) toast('🟥 THE COLLAPSE WAITS ABOVE THE SEALED GATE — open it and DIVE!', 3400); }
        G.crushT = 0;
      } else if (!inGrace) G.gateHeld = false; // creeping — the HUD shows the real distance, not HELD
    } else G.gateHeld = false;
    // Tremor drive (Akmal 19 Nov): while the plane actually moves the whole
    // shaft trembles — a proximity-scaled shake; Music reads the same flags
    // for the rock-grinding layer.
    G.collapseMoving = (yBefore - G.collapseY) > 0.001;
    G.collapseProx = clamp(1 - (G.collapseY - pos.y) / 85, 0, 1);
    if (G.collapseMoving) G.camShake = Math.max(G.camShake, 0.04 + 0.21 * G.collapseProx);
    if (pos.y > G.collapseY - 14){
      G.crushT = (G.crushT || 0) + dt;
      const rate = Math.min(10, 2.5 + G.crushT * 1.2);
      player.hull -= rate * dt * player.d.dmgMul;
      G.lastHit = 'The Collapse';
      G.camShake = Math.min(1, G.camShake + dt * 2);
      if ((G.collapseWarnT || 0) < G.time){ G.collapseWarnT = G.time + 3; toast('🟥 THE COLLAPSE IS CRUSHING YOU — DIVE!'); }
      if (player.hull <= 0){ player.hull = 0; endRun('dead'); return; }
    } else G.crushT = 0;
    if (G.collapseMesh){
      const w = G.collapseMesh.children[0];
      if (w){ const d = G.collapseY - pos.y; w.material.opacity = d < 50 ? 0.13 + 0.27 * (1 - Math.max(0, d) / 50) : 0.13; }
    }
  }
  G.collapseMesh.position.y = G.collapseY;
  // Collapse HUD readout: countdown over the last 30 s before it starts,
  // headroom in metres once it is moving.
  if (!G.colHud) G.colHud = { row: document.getElementById('collapse-row'), txt: document.getElementById('collapse-txt') };
  if (G.colHud.row){
    if (G.time < S.collapseStart - 30) G.colHud.row.style.display = 'none';
    else {
      G.colHud.row.style.display = '';
      if (G.time < S.collapseStart){ const s = Math.ceil(S.collapseStart - G.time); G.colHud.txt.textContent = 'IN ' + s + 's'; G.colHud.row.style.color = s <= 10 ? '#ff5566' : '#ffb84d'; }
      else if (G.collapseHeld){ G.colHud.txt.textContent = 'HELD — BOSS FIGHT'; G.colHud.row.style.color = '#7fe0a8'; }
      else if (G.gateHeld){ const gl2 = 120 - (G.time - (G.floorEnterT || 0)), sealed2 = !!(G.survGate && !G.survGate.open); G.colHud.txt.textContent = (sealed2 && gl2 > 0) ? 'HELD — GATE SEALED · MOVES IN ' + Math.ceil(gl2) + 's' : 'HELD — GATE SEALED'; G.colHud.row.style.color = (sealed2 && gl2 <= 15 && gl2 > 0) ? '#ffb84d' : '#7fe0a8'; }
      else { const d = Math.max(0, Math.round(G.collapseY - pos.y)); G.colHud.txt.textContent = d + ' m ABOVE YOU'; G.colHud.row.style.color = d < 20 ? '#ff3344' : (d < 50 ? '#ffb84d' : '#7fe0a8'); }
    }
  }
  if (G.particles) G.particles.position.y = pos.y;
  if (G.motes) G.motes.position.y = pos.y;
  updateDrifters(dt, G.time);
  for (const s of G.schools){
    if (Math.abs(s.center.y - pos.y) > 130){
      s.center.set(rand(-80, 80), pos.y - rand(30, 80), rand(-80, 80));
      s.target.copy(s.center);
      for (const f of s.fishes) f.position.copy(s.center).add(f.userData.off);
    }
  }
  ensureBands();
  survCullCollectibles();
}

// ============================ BOONS ============================
const BOON_APPLY = {
  repair(){ player.hull = Math.min(player.d.maxHull, player.hull + 30); },
  cell(){ G.boon.battMax += 20; player.batt = Math.min(player.d.maxBatt + G.boon.battMax, player.batt + 50); },
  decoys(){ SAVE.stock.decoy += 2; G.decoys = Math.min(player.d.def.decoyCap, G.decoys + 2); persist(); },
  torps(){ SAVE.stock.torp += 3; G.torps = Math.min(player.d.def.torpCap, G.torps + 3); persist(); },
  sonar(){ G.boon.sonarMul *= 1.25; },
  speed(){ G.boon.speedMul *= 1.15; },
  greed(){ G.boon.crystalMul *= 1.5; },
  emp(){ G.boon.empCdMul *= 0.5; },
};
// Re-engage pointer lock from a genuine click (e.g. picking a boon card):
// the pick click is itself a user gesture, so the lock can be re-requested
// immediately and steering control returns without an extra canvas click.
// If the browser refuses (rare cooldown), the rejection is swallowed and
// the normal click-canvas-to-lock flow remains as the fallback.
function tryRelock(){
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch(e) {}
}
function openBoonDraft(){
  if (uiState === 'boon' || !G || G.over || G.mode !== 'survival') return;
  const pool = [...CONFIG.boons], chosen = [];
  while (chosen.length < 3 && pool.length) chosen.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
  const wrap = $('boon-cards'); wrap.innerHTML = '';
  for (const b of chosen){
    const card = document.createElement('div');
    card.className = 'card boon';
    card.innerHTML = `<div class="ic">${b.icon}</div><h3>${b.name}</h3><p class="stat" style="float:none">${b.desc}</p>`;
    card.onclick = ()=>{ AudioSys.init(); BOON_APPLY[b.id](); toast('⚗ ' + b.name); setUI('playing'); tryRelock(); };
    wrap.appendChild(card);
  }
  setUI('boon');
}

// ============================ RUN FLOW ============================
function pauseGame(){
  if (uiState !== 'playing' || !G || G.over) return;
  const ps = $('pause-stats');
  if (ps) ps.innerHTML = G.mode === 'expedition'
    ? `💎 ${G.crystalsGot}/${G.crystalsTotal} crystals · 🪙 ${G.coinsRun} earned · 🎯 ${G.kills} hunters down · ⏱ ${fmtTime(G.time)}`
    : `▼ FLOOR ${G.floor} · ${Math.floor(G.maxDepth)} m · 🪙 ${G.coinsRun} earned · 🎯 ${G.kills} hunters down · ⏱ ${fmtTime(G.time)}`;
  setUI('paused'); AudioSys.setGrowl(0);
}
function resumeGame(){ if (uiState !== 'paused') return; setUI('playing'); }
function restartDive(){ if (!G) return; if (G.mode === 'expedition') startExpedition(G.zone); else startSurvival(G.diffId); }
function expeditionDepth(){
  const z = G.zone, A = CONFIG.arena;
  const k = clamp((A.ceilY - player.group.position.y) / (A.ceilY - A.floorY), 0, 1);
  return z.depth[0] + k * (z.depth[1] - z.depth[0]);
}
function endRun(result){
  if (!G || G.over) return;
  G.over = true;
  AudioSys.setGrowl(0);
  showHint(null);
  if (document.pointerLockElement) document.exitPointerLock();
  SAVE.subHull[player.subId] = clamp(player.hull / player.d.maxHull, 0, 1);
  const rows = [];
  let title = '', starsHtml = '';
  if (G.mode === 'expedition'){
    const z = G.zone;
    const frac = G.crystalsTotal ? G.crystalsGot / G.crystalsTotal : 0;
    rows.push(['Crystals', G.crystalsGot + ' / ' + G.crystalsTotal]);
    rows.push(['Hunters destroyed', G.kills], ['Close calls', G.closeCalls], ['Time', fmtTime(G.time)], ['Depth reached', Math.floor(expeditionDepth()) + ' m']);
    if (result === 'clear'){
      title = z.id === 5 ? '🏆 THE ABYSS GATE — GAME COMPLETE!' : '⚓ ZONE CLEARED — ' + z.name;
      const stars = 1 + (frac >= 0.7 ? 1 : 0) + (frac >= 1 ? 1 : 0);
      const prev = SAVE.stars[z.id] || 0;
      let bonus = 0;
      if (stars > prev){ for (let s = prev + 1; s <= stars; s++) bonus += CONFIG.econ.starBonus[s] || 0; SAVE.stars[z.id] = stars; }
      const escape = Math.round(z.escape * (prev > 0 ? 0.5 : 1));
      bankCoins(escape + bonus);
      starsHtml = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      rows.push(['Escape bonus', '🪙 ' + escape], ['Star bonus', '🪙 ' + bonus]);
    } else {
      title = result === 'dead' ? '💀 THE DEEP CLAIMS YOU' : 'DIVE ABANDONED';
      rows.push(['Bonuses', 'lost — crystal coins kept']);
    }
    rows.push(['Coins earned this dive', '🪙 ' + G.coinsRun]);
  } else {
    title = result === 'dead' ? '💀 THE DEEP CLAIMS YOU' : 'DIVE ABANDONED';
    const depthRec = Math.floor(G.maxDepth) > (SAVE.bestDepth || 0);
    const timeRec = Math.floor(G.time) > (SAVE.bestTime || 0);
    if (depthRec) SAVE.bestDepth = Math.floor(G.maxDepth);
    if (timeRec) SAVE.bestTime = Math.floor(G.time);
    rows.push(['Survived', fmtTime(G.time) + (timeRec ? ' 🏅 record!' : '')]);
    rows.push(['Deepest', Math.floor(G.maxDepth) + ' m' + (depthRec ? ' 🏅 record!' : '')]);
    rows.push(['Floor reached', 'FLOOR ' + G.floor]);
    if (result === 'dead' && G.lastHit) rows.push(['Killed by', G.lastHit]);
    rows.push(['Crystals', G.crystalsGot], ['Hunters destroyed', G.kills], ['Close calls', G.closeCalls]);
    rows.push(['Coins earned', '🪙 ' + G.coinsRun]);
    if (SAVE.trioBest) rows.push(['Guardians best', 'FLOOR ' + SAVE.trioBest]);
  }
  persist();
  $('end-title').textContent = title;
  $('end-stars').textContent = starsHtml;
  $('end-stats').innerHTML = rows.map(r => `<div class="endstat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('btn-end-next').textContent = G.mode === 'expedition' ? 'ZONE SELECT' : 'TITLE';
  Music.riseCue();
  setUI('end');
}

// ============================ PLAYER & CAMERA ============================
function updatePlayer(dt){
  const p = player, g = p.group;
  if (!pointerLocked){
    if (keys['ArrowLeft']) p.yaw += 1.9 * dt;
    if (keys['ArrowRight']) p.yaw -= 1.9 * dt;
    if (keys['ArrowUp']) p.pitch = clamp(p.pitch + 1.4 * dt, -1.15, 1.15);
    if (keys['ArrowDown']) p.pitch = clamp(p.pitch - 1.4 * dt, -1.15, 1.15);
  }
  const fwd = playerForward();
  const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));
  let thrust = 0, strafe = 0, vert = 0;
  if (keys['KeyW']) thrust += 1;
  if (keys['KeyS']) thrust -= 0.7;
  if (keys['KeyD']) strafe -= 0.75;
  if (keys['KeyA']) strafe += 0.75;
  if (keys['KeyR']) vert += 1;   // direct rise (F is torpedo, Space is ping — R/C were free)
  if (keys['KeyC']) vert -= 1;   // direct sink
  const wantBoost = (keys['ShiftLeft'] || keys['ShiftRight']) && (thrust !== 0 || strafe !== 0 || vert !== 0) && p.batt > 0.5;
  G.boosting = !!wantBoost;
  const maxSp = p.d.def.speed * G.boon.speedMul * (G.boosting ? CONFIG.boostMul : 1), accel = 46;
  p.vel.addScaledVector(fwd, thrust * accel * dt);
  p.vel.addScaledVector(right, strafe * accel * dt);
  p.vel.y += vert * accel * 0.7 * dt; // ~0.7x thrust rate, capped by the same max-speed clamp below
  p.vel.multiplyScalar(Math.max(0, 1 - 1.9 * dt));
  const sp = p.vel.length();
  if (sp > maxSp) p.vel.multiplyScalar(maxSp / sp);
  p.thrust = Math.abs(thrust) + Math.abs(strafe) * 0.7 + Math.abs(vert) * 0.7;
  g.position.addScaledVector(p.vel, dt);
  if (G.mode === 'expedition'){
    const A = CONFIG.arena, horiz = Math.hypot(g.position.x, g.position.z);
    if (horiz > A.radius){ const s = A.radius / horiz; g.position.x *= s; g.position.z *= s; }
    g.position.y = clamp(g.position.y, A.floorY + 3, A.ceilY);
  } else {
    const S = CONFIG.survival, horiz = Math.hypot(g.position.x, g.position.z);
    if (horiz > S.shaftRadius){ const s = S.shaftRadius / horiz; g.position.x *= s; g.position.z *= s; }
    if (g.position.y > 6) g.position.y = 6;
  }
  // Rock collision (Survival only): sphere push-out against the band
  // colliders, so the sub slides along rock faces instead of ghosting
  // through them (Akmal playtest 19 Nov: "kita bisa nembus batu").
  // Colliders near the gate are skipped — the gate approach never blocks.
  if (G.mode === 'survival' && G.colliders){
    const gp = (G.gate && G.gate.pos) ? G.gate.pos : null;
    for (const c of G.colliders){
      if (gp){ const gdx = c.x - gp.x, gdy = c.y - gp.y, gdz = c.z - gp.z; if (gdx*gdx + gdy*gdy + gdz*gdz < 256) continue; }
      const dx = g.position.x - c.x, dy = g.position.y - c.y, dz = g.position.z - c.z;
      const rr = c.rad + p.radius;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < rr * rr && d2 > 0.0001){
        const d = Math.sqrt(d2), push = (rr - d) / d;
        g.position.x += dx * push; g.position.y += dy * push; g.position.z += dz * push;
        const vn = (p.vel.x * dx + p.vel.y * dy + p.vel.z * dz) / d;
        if (vn < -12 && (rr - d) > 0.9 && G.time > (G.impactCdAt || 0)){ // hard rock impact costs hull (Akmal 19 Nov); penetration gate: a graze never damages
          G.impactCdAt = G.time + 0.7;
          damagePlayer(Math.min(15, (-vn - 11) * 1.05), new THREE.Vector3(c.x, c.y, c.z), 'Rock impact');
        }
        if (vn < 0){ p.vel.x -= vn * dx / d; p.vel.y -= vn * dy / d; p.vel.z -= vn * dz / d; }
      }
    }
  }
  // Dressing collision (Survival only): capsule push-out against the shaft
  // dressing's in-volume pieces — pillars, spires, islets, outcrops, wrecks.
  // Colliders are LOCAL to the shaft group; world y adds the 50 m snap.
  if (G.mode === 'survival' && envFx.dressColliders && envFx.shaft){
    const snapY = envFx.shaft.position.y;
    for (const c of envFx.dressColliders){
      const cy = clamp(g.position.y, c.yBot + snapY, c.yTop + snapY);
      const dx = g.position.x - c.x, dy = g.position.y - cy, dz = g.position.z - c.z;
      const rr = c.rad + p.radius;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < rr * rr && d2 > 0.0001){
        const d = Math.sqrt(d2), push = (rr - d) / d;
        g.position.x += dx * push; g.position.y += dy * push; g.position.z += dz * push;
        const vn = (p.vel.x * dx + p.vel.y * dy + p.vel.z * dz) / d;
        if (vn < -12 && (rr - d) > 0.9 && G.time > (G.impactCdAt || 0)){ // hard rock impact costs hull (Akmal 19 Nov); penetration gate: a graze never damages
          G.impactCdAt = G.time + 0.7;
          damagePlayer(Math.min(15, (-vn - 11) * 1.05), new THREE.Vector3(c.x, cy, c.z), 'Rock impact');
        }
        if (vn < 0){ p.vel.x -= vn * dx / d; p.vel.y -= vn * dy / d; p.vel.z -= vn * dz / d; }
      }
    }
  }
  const roll = clamp(-strafe * 0.35 + (keys['ArrowLeft'] ? 0.25 : 0) + (keys['ArrowRight'] ? -0.25 : 0), -0.6, 0.6);
  g.lookAt(g.position.clone().add(fwd));
  g.rotateZ(roll);
  if (g.userData.spin) g.userData.spin.rotation.z -= dt * (2 + sp * 0.9);
  if (G.boosting){ p.batt = Math.max(0, p.batt - CONFIG.boostDrain * p.d.boostDrainMul * dt); G.boostRegenAt = G.time + CONFIG.boostRegenDelay; }
  else if (G.time >= (G.boostRegenAt || 0)) p.batt = Math.min(p.d.maxBatt + G.boon.battMax, p.batt + CONFIG.batteryRegen * dt);
  const speedFrac = maxSp > 0 ? sp / maxSp : 0;
  G.noisePulse = Math.max(0, G.noisePulse - CONFIG.sonar.noiseDecay * dt);
  G.noise = clamp(G.noisePulse * 0.7 + speedFrac * 55 * p.d.def.noiseMul, 0, 100);
  if (G.boosting) G.noise = clamp(G.noise + 25, 0, 100);
  // engine hearing rides the same speedFrac × noiseMul product that drives the
  // NOISE meter: full thrust carries ~30–35 m, drifting idle is near-silent
  const hearR = Math.min(52, CONFIG.sonar.engineHearBase * p.d.def.noiseMul * (0.05 + 0.95 * Math.pow(speedFrac, 1.6)) * (G.boosting ? 1.5 : 1));
  if (hearR > 4) for (const h of G.hunters){
    if (h.dead || h.type.hearing <= 0) continue;
    const d = h.group.position.distanceTo(g.position);
    if (d < hearR * h.type.hearing) hearNoise(h, g.position, dt * 0.22 * (1 - d / (hearR * h.type.hearing)), 'player');
  }
  const camTarget = g.position.clone().addScaledVector(fwd, -16);
  camTarget.y += 5.5;
  camera.position.lerp(camTarget, 1 - Math.exp(-5 * dt));
  const fovT = G.boosting ? 75 : 66;
  if (Math.abs(camera.fov - fovT) > 0.05){ camera.fov += (fovT - camera.fov) * (1 - Math.exp(-6 * dt)); camera.updateProjectionMatrix(); }
  if (G.camShake > 0){
    camera.position.x += rand(-1, 1) * G.camShake * 0.5;
    camera.position.y += rand(-1, 1) * G.camShake * 0.5;
    G.camShake = Math.max(0, G.camShake - dt * 2.2);
  }
  camera.lookAt(g.position.clone().addScaledVector(fwd, 12).add(new THREE.Vector3(0, 1, 0)));
}

// ============================ HUD ============================
function updateHUD(){
  if (!player || !G) return;
  const p = player;
  $('hull-txt').textContent = Math.ceil(p.hull) + ' / ' + p.d.maxHull;
  const hullBar = $('m-hull').firstElementChild;
  hullBar.style.width = clamp(p.hull / p.d.maxHull * 100, 0, 100) + '%';
  hullBar.style.background = p.hull / p.d.maxHull < 0.3 ? '#ff4d6d' : '#37e08b';
  if (G && !G.over && p.hull > 0 && p.hull / p.d.maxHull < 0.3 && G.time > (G.hullWarnT || 0)){
    G.hullWarnT = G.time + 6;
    toast('⚠ HULL CRITICAL — find a supply cache or hull patch!', 2600);
    AudioSys.tone(98, 0.3, 'sawtooth', 0.06, 65);
  }
  const maxB = p.d.maxBatt + G.boon.battMax;
  $('batt-txt').textContent = Math.floor(p.batt) + ' / ' + maxB;
  $('m-batt').firstElementChild.style.width = clamp(p.batt / maxB * 100, 0, 100) + '%';
  const pingEl = $('ping-txt');
  if (pingEl){ const pc = Math.max(0, (G.pingReadyAt || 0) - G.time); pingEl.textContent = pc > 0 ? Math.ceil(pc) + 's' : 'READY'; }
  drawRadar();
  $('noise-txt').textContent = Math.round(G.noise) + '%';
  $('m-noise').firstElementChild.style.width = G.noise + '%';
  const heatRow = $('heat-row');
  if (heatRow){
    const heat = G.cannonHeat || 0;
    $('heat-txt').textContent = G.cannonLock ? 'VENTING' : Math.round(heat) + '%';
    const hb = $('m-heat').firstElementChild;
    hb.style.width = heat + '%';
    hb.style.background = G.cannonLock ? '#ff4d6d' : (heat > 70 ? '#ff7a4d' : '#ffb84d');
    heatRow.style.opacity = (heat > 1 || G.cannonHeld) ? 1 : 0.25;
  }
  $('coin-txt').textContent = SAVE.coins;
  $('depth-txt').textContent = G.mode === 'survival'
    ? Math.floor(Math.max(0, -p.group.position.y)) + ' m · FLOOR ' + G.floor
    : Math.floor(expeditionDepth()) + ' m';
  $('crys-txt').textContent = G.mode === 'expedition' ? G.crystalsGot + '/' + G.crystalsTotal : String(G.crystalsGot);
  $('torp-txt').textContent = G.torps;
  $('decoy-txt').textContent = G.decoys;
  $('emp-txt').textContent = G.empCd > 0 ? 'EMP ' + Math.ceil(G.empCd) + 's' : 'EMP READY [E]';
  $('time-txt').textContent = fmtTime(G.time);
  if (G.hintStep >= 0 && G.mode === 'expedition' && G.zone && G.zone.id === 1){
    const steps = [
      '🖱 Click the water to lock your view. W = thrust, mouse steers. R = rise, C = sink.',
      '📡 Press SPACE — a sonar ping reveals the trench… and announces you.',
      '💎 Collect glowing crystals. Watch the NOISE meter: hunters hear pings.',
      '🎯 Fill the quota and the gate at the far end of the trench opens.',
      '⚓ The gate is open! Swim through the glowing ring.'
    ];
    if (G.hintStep === 0 && (p.vel.length() > 3 || G.time > 7)) G.hintStep = 1;
    else if (G.hintStep === 1 && G.pinged) G.hintStep = 2;
    else if (G.hintStep === 2 && G.crystalsGot >= 2) G.hintStep = 3;
    else if (G.hintStep === 3 && G.gateOpen) G.hintStep = 4;
    showHint(steps[Math.min(G.hintStep, 4)]);
  } else showHint(null);
}

// ============================ MAIN LOOP ============================
const clock = new THREE.Clock();
let menuT = 0, objT = 0;
let huntVigCur = 0;
const huntVigEl = document.getElementById('huntvig');
let colVigCur = 0;
const colVigEl = document.getElementById('colvig');
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  SWIM_TIME.value = G ? G.time : performance.now() / 1000; // hunter vertex-bend clock (freezes on pause with G.time)
  // hunt vignette: subtle red edge pulse while a hunter is hunting you (driven by Music.tension)
  if (huntVigEl){
    const vigTgt = (uiState === 'playing' && Music.tension > 0.04)
      ? (0.08 + 0.17 * Music.tension) * (0.78 + 0.22 * Math.sin(performance.now() * 0.007)) : 0;
    huntVigCur += (vigTgt - huntVigCur) * Math.min(1, dt * 5);
    huntVigEl.style.opacity = huntVigCur.toFixed(3);
  }
  // collapse vignette: red edges close in as the Collapse nears the player
  if (colVigEl){
    const cTgt = (uiState === 'playing' && G && !G.over && G.mode === 'survival' && player && !G.collapseHeld && G.time >= CONFIG.survival.collapseStart - 5)
      ? Math.max(0, 0.6 * (1 - Math.max(0, G.collapseY - player.group.position.y) / 60)) * (0.8 + 0.2 * Math.sin(performance.now() * 0.01)) : 0;
    colVigCur += (cTgt - colVigCur) * Math.min(1, dt * 5);
    colVigEl.style.opacity = colVigCur.toFixed(3);
  }
  if (uiState === 'playing' && G && !G.over){
    G.time += dt;
    if (G.empCd > 0) G.empCd -= dt;
    updatePlayer(dt);
    updateHunters(dt);
    updateTorpedoes(dt);
    updatePulseCannon(dt);
    updateHazardsAndPickups(dt);
    const bounds = G.mode === 'expedition' ? CONFIG.arena.radius - 15 : CONFIG.survival.shaftRadius - 10;
    for (const s of G.schools) s.update(dt, G.time, bounds);
    updateMissions(dt);
    if (G.mode === 'survival' && !G.over) updateSurvival(dt);
    updateReveal(G.time);
    updateEnvironmentFx(dt);
    objT += dt;
    if (objT > 0.25){ objT = 0; updateObjective(); }
    updateHUD();
    renderer.render(gameScene, camera);
  }
  else if (uiState === 'paused' || uiState === 'end' || uiState === 'boon'){
    if (gameScene) renderer.render(gameScene, camera);
  }
  else if (uiState === 'hangar'){
    if (hangarPreview){
      hangarPreview.rotation.y += dt * 0.25;
      // Centre the sub on the open stage region (not the window): offset it by
      // the stage centre's displacement from frame centre, scaled to the
      // frustum size at the current camera distance so zoom keeps it centred.
      const fr = hangarFrame();
      const visH = 2 * hangarCamDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      hangarPreview.position.set((fr.fx - 0.5) * visH * camera.aspect, (0.5 - fr.fy) * visH, 0);
    }
    camera.position.set(0, 1.4, hangarCamDist);
    camera.lookAt(0, 0, 0);
    if (hangarScene) renderer.render(hangarScene, camera);
  }
  else {
    menuT += dt;
    if (menuSub){
      menuSub.rotation.y = Math.sin(menuT * 0.3) * 0.6 + 0.4;
      menuSub.position.y = -1.4 + Math.sin(menuT * 0.8) * 0.4;
      if (menuSub.userData.spin) menuSub.userData.spin.rotation.z -= dt * 3;
    }
    if (menuHunter){
      menuHunter.position.x = 11 + Math.sin(menuT * 0.22) * 2.5;
      menuHunter.position.y = -2.5 + Math.sin(menuT * 0.5) * 0.8;
    }
    camera.position.set(Math.sin(menuT * 0.1) * 2.5, 1.6, 11);
    camera.lookAt(0, 0, -6);
    if (menuScene) renderer.render(menuScene, camera);
  }
}

// ============================ WIRING & BOOT ============================
function wire(){
  // ---- first-gesture audio unlock (browser autoplay policy) ----
  // No AudioContext exists at page load, and init() used to be wired only
  // into SOME title controls (Expedition / Survival / Hangar buttons): a
  // first click on the water never reached the canvas mousedown handler
  // (the .screen overlay covers it), and the HOW TO PLAY button and the
  // difficulty pills carry no init() at all — so the lobby theme stayed
  // silent until a wired button happened to be pressed. Bind init() to the
  // FIRST pointer/key gesture anywhere on the document (capture phase,
  // once): whatever the player touches first creates the context and, on
  // the title/lobby screens, Music.start() brings the lobby theme up with
  // it. If the context is still born suspended, init()'s own
  // armGestureResume keeps retrying on later gestures until it runs.
  const unlockAudio = ()=> AudioSys.init();
  document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
  document.addEventListener('keydown', unlockAudio, { capture: true, once: true });
  $('btn-expedition').onclick = ()=>{ AudioSys.init(); buildZoneCards(); setUI('zones'); };
  $('btn-survival').onclick = ()=>{
    AudioSys.init();
    const r = $('diff-row'), open = r.style.display !== 'none';
    r.style.display = open ? 'none' : 'flex';
    $('btn-start-survival').style.display = open ? 'none' : 'block';
  };
  document.querySelectorAll('.diff').forEach(d => d.onclick = ()=>{
    document.querySelectorAll('.diff').forEach(x => x.classList.remove('sel'));
    d.classList.add('sel'); survDiff = d.dataset.diff;
  });
  $('btn-start-survival').onclick = ()=>{ AudioSys.init(); startSurvival(survDiff); };
  $('btn-hangar').onclick = ()=>{ AudioSys.init(); hangarViewId = SAVE.sub; setUI('hangar'); buildHangar(); refreshHangarPreview(); };
  $('btn-howto').onclick = ()=> setUI('howto');
  $('btn-howto-back').onclick = ()=> setUI('title');
  $('btn-zones-back').onclick = ()=> setUI('title');
  $('btn-hangar-back').onclick = ()=> setUI('title');
  $('btn-forge').onclick = ()=>{ AudioSys.init(); $('forge-overlay').classList.add('on'); renderForgePanel(); };
  $('btn-forge-close').onclick = ()=> $('forge-overlay').classList.remove('on');
  $('btn-do-forge').onclick = ()=> runForge();
  $('forge-prompt').addEventListener('input', updateForgePreview);
  document.querySelectorAll('.langbtn').forEach(b => { b.onclick = ()=>{ SAVE.lang = b.dataset.lang; persist(); applyLang(); }; });
  $('btn-resume').onclick = ()=> resumeGame();
  $('btn-restart').onclick = ()=> restartDive();
  $('btn-quit').onclick = ()=>{ if (G) endRun('abandon'); };
  $('btn-end-retry').onclick = ()=> restartDive();
  $('btn-end-hangar').onclick = ()=>{ AudioSys.init(); hangarViewId = SAVE.sub; setUI('hangar'); buildHangar(); refreshHangarPreview(); };
  $('btn-end-next').onclick = ()=>{ if (G && G.mode === 'expedition'){ buildZoneCards(); setUI('zones'); } else setUI('title'); };
  const sb = $('btn-sound');
  sb.textContent = Music.muted() ? '🔇' : '🔊';
  sb.onclick = ()=>{ AudioSys.init(); Music.toggleMute(); };
  // ---- UI sounds: ONE delegated hook covers every menu control, static and
  // dynamically built (zone DIVE buttons, hangar buy buttons, boon cards),
  // with per-action variants. Hangar buy buttons are disabled when
  // unaffordable, so a 'buy' sound only ever follows a real purchase. Hover
  // is deduped per element + throttled, so sweeping across the menu can't
  // machine-gun. Gameplay canvas clicks match nothing here — no UI sounds
  // in-game.
  let hoverEl = null, hoverT = 0;
  const uiTarget = e => e.target.closest ? (e.target.closest('button') || e.target.closest('.diff')) : null;
  document.addEventListener('pointerover', e => {
    const b = uiTarget(e);
    if (!b || b.disabled || b === hoverEl) return;
    hoverEl = b;
    const now = performance.now(); if (now - hoverT < 70) return; hoverT = now;
    AudioSys.ui('hover');
  });
  document.addEventListener('pointerout', e => { if (hoverEl && e.target === hoverEl) hoverEl = null; });
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#boon-cards .card')){ AudioSys.ui('click'); return; }
    const b = uiTarget(e);
    if (!b || b.disabled) return;
    const id = b.id || '';
    if (/back|quit/.test(id)) AudioSys.ui('back');
    else if (b.classList.contains('buy')) AudioSys.ui('buy');
    else if (b.classList.contains('diff') || id === 'btn-sound') AudioSys.ui('toggle');
    else AudioSys.ui('click');
  });
}
(async function boot(){
  if (SAVE.trioBest === undefined) SAVE.trioBest = 0;
  wire();
  refreshCoinLabels();
  await preloadAssets();
  await loadForgedSubs();
  buildMenuScene();
  buildHangarScene();
  setUI('title');
  applyLang();
  if (('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) $('touch-note').style.display = '';
  animate();
})();
