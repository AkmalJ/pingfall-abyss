// ============================================================
// PINGFALL: ABYSS — a sonar-survival dive.
// Ping to see. Ping and be heard.
// All tuning numbers live in CONFIG below (single source).
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = {
  // ---- assets: models/<name>.glb, placeholder fallback when missing ----
  assets: ['sub-minnow','sub-barracuda','sub-mule','sub-phantom','sub-leviathan',
           'hunter','hunter-brute','hunter-sentry','decoy','crystal','gate','torpedo'],
  assetSize: { 'sub-minnow':7,'sub-barracuda':8,'sub-mule':8.5,'sub-phantom':8,'sub-leviathan':11,
               'hunter':6.5,'hunter-brute':9,'hunter-sentry':6,'decoy':1.8,'crystal':3.2,'gate':30,'torpedo':2.4 },
  assetYawFix: {}, // e.g. { 'hunter': Math.PI } if a GLB's nose points -Z instead of +Z

  // ---- sonar / noise / battery ----
  sonar: { baseRadius: 95, waveSpeed: 150, revealDur: 3.4, pingCost: 10,
           pingNoiseRadiusMul: 1.15, noiseDecay: 16, engineHearBase: 30 },
  batteryRegen: 2.4,
  emp: { cooldown: 20 },
  decoy: { life: 12, radius: 95, pulse: 0.6 },

  // ---- economy (DESIGN.md audited numbers) ----
  econ: { golden: 100, starBonus: { 2: 25, 3: 75 }, closeCall: 10, minuteBonus: 20,
          stratumBonus: 10, cacheMin: 50, cacheMax: 150, ancientBounty: 150 },

  // ---- submarines ----
  subs: {
    'minnow':    { name:'Minnow',    asset:'sub-minnow',    role:'Scout',       price:0,
                   speed:26, hull:100, battery:100, sonarMul:1.25, torpDmg:1, torpCap:4, decoyCap:2,
                   empR:26, empDur:4, noiseMul:1.0, crystalMul:1.0, scale:1.0,  tint:0x2e8f86 },
    'barracuda': { name:'Barracuda', asset:'sub-barracuda', role:'Assault',     price:150,
                   speed:24, hull:120, battery:100, sonarMul:1.0,  torpDmg:2, torpCap:6, decoyCap:3,
                   empR:28, empDur:4, noiseMul:1.0, crystalMul:1.0, scale:1.05, tint:0xb35a2e },
    'mule':      { name:'Mule',      asset:'sub-mule',      role:'Hauler',      price:250,
                   speed:18, hull:140, battery:120, sonarMul:0.95, torpDmg:1, torpCap:5, decoyCap:3,
                   empR:26, empDur:4, noiseMul:1.1, crystalMul:1.5, scale:1.18, tint:0xb08a2e },
    'phantom':   { name:'Phantom',   asset:'sub-phantom',   role:'Stealth',     price:600,
                   speed:25, hull:100, battery:110, sonarMul:1.05, torpDmg:1, torpCap:4, decoyCap:3,
                   empR:30, empDur:5, noiseMul:0.45, crystalMul:1.0, scale:1.05, tint:0x3a3f4a },
    'leviathan': { name:'Leviathan', asset:'sub-leviathan', role:'Dreadnought', price:1000,
                   speed:16, hull:220, battery:130, sonarMul:1.1,  torpDmg:2, torpCap:10, decoyCap:5,
                   empR:40, empDur:6, noiseMul:1.2, crystalMul:1.0, scale:1.45, tint:0x51628f },
  },

  // ---- hunters: model mapping per DESIGN.md (hunter / hunter-brute / hunter-sentry) ----
  hunters: {
    stalker: { model:'hunter',        modelScale:1.0,  speed:13,   hp:1, hearing:1.0,  dmg:12, tint:0x3d5a68, hitR:3.4 },
    skitter: { model:'hunter',        modelScale:0.6,  speed:21,   hp:1, hearing:0.9,  dmg:8,  tint:0x5b7d8a, hitR:2.4, erratic:1 },
    brute:   { model:'hunter-brute',  modelScale:1.15, speed:9.5,  hp:3, hearing:1.1,  dmg:25, tint:0x6b5138, hitR:4.6 },
    sentry:  { model:'hunter-sentry', modelScale:1.0,  speed:0,    hp:2, hearing:1.2,  dmg:10, tint:0x54447a, hitR:3.2, pingRadius:58, pingEvery:6 },
    lurker:  { model:'hunter',        modelScale:0.9,  speed:17,   hp:2, hearing:0,    dmg:18, tint:0x0b0d13, hitR:3.0, dash:27, dark:true },
  },
  hunterStates: { dormant:{ core:0x2e7fd9 }, curious:{ core:0xffb84d }, hunting:{ core:0xff4d6d } },

  // ---- hazards ----
  jelly: { dmg: 8, hitR: 3.4, hitCd: 1.5, drift: 2.2 },
  mine:  { dmg: 26, triggerR: 5.5 },

  // ---- zones (data-driven; one arena system, re-tinted per zone) ----
  zones: [
    { id:1, name:'The Shelf',     depth:[60,160],    crystalValue:5,  crystals:12, escape:20, rec:'Minnow',
      mission:{ type:'collect', quota:7 },  hunters:['stalker'], hunterSpeedMul:0.7, mines:0, jellies:5,
      tint:{ water:0x06222e, fog:0x04161d, accent:0x35e0c8 }, decor:'rocks',
      desc:'Shallow training trench. One slow hunter.' },
    { id:2, name:'Kelp Ruins',    depth:[160,320],   crystalValue:10, crystals:14, escape:40, rec:'Minnow or Barracuda',
      mission:{ type:'rescue' },            hunters:['stalker','skitter'], hunterSpeedMul:0.9, mines:0, jellies:7,
      tint:{ water:0x0a2e1e, fog:0x061a10, accent:0x59e08a }, decor:'pillars',
      desc:'A stranded mini-sub waits among the pillars.' },
    { id:3, name:'The Wreck Field', depth:[320,520], crystalValue:20, crystals:16, escape:80, rec:'Barracuda',
      mission:{ type:'nests', nests:3 },    hunters:['stalker','skitter','brute'], hunterSpeedMul:1.0, mines:5, jellies:9,
      tint:{ water:0x1c1410, fog:0x120c08, accent:0xe08a4d }, decor:'wreck',
      desc:'Mines and hunter nests among the wrecks.' },
    { id:4, name:'Magenta Deep',  depth:[520,780],   crystalValue:35, crystals:18, escape:150, rec:'Phantom',
      mission:{ type:'survive', time:75 },  hunters:['stalker','skitter','sentry','brute'], hunterSpeedMul:1.25, mines:6, jellies:10,
      tint:{ water:0x2a0a24, fog:0x1a0616, accent:0xe05ad0 }, decor:'crystals',
      desc:'A sentry listens here. Survive the timer.' },
    { id:5, name:'The Abyss Gate', depth:[780,1100], crystalValue:60, crystals:20, escape:300, rec:'Leviathan',
      mission:{ type:'collect', quota:11 }, hunters:['stalker','skitter','brute','sentry','lurker'], hunterSpeedMul:1.15, mines:7, jellies:12,
      tint:{ water:0x12081f, fog:0x0a0414, accent:0x8a6aff }, decor:'gate',
      desc:'Everything hunts here. Reach the final gate.' },
  ],
  arena: { radius: 235, floorY: -30, ceilY: 38 },

  // ---- upgrades: 3 tracks x 3 tiers, prices 100/200/350 ----
  upgrades: {
    sonar:   { name:'SONAR+',   prices:[100,200,350], radius:[1,1.25,1.5,1.8], echo:[1,1,1.5,2],
               blurb:t=> t===0?'Ping radius +25%': t===1?'Radius +50%, echoes 1.5× longer':'Radius +80%, echoes 2× longer' },
    battery: { name:'BATTERY+', prices:[100,200,350], cap:[1,1.3,1.6,2.0], cost:[1,1,0.9,0.8],
               blurb:t=> t===0?'Capacity +30%': t===1?'Capacity +60%, ping −10% cost':'Capacity +100%, ping −20% cost' },
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
      { name:'Stratum III — Rust Belt',   tint:0x1c1410, accent:0xe08a4d },
      { name:'Stratum IV — Magenta Deep', tint:0x2a0a24, accent:0xe05ad0 },
      { name:'Stratum V — The Violet',    tint:0x12081f, accent:0x8a6aff },
      { name:'Stratum VI — True Abyss',   tint:0x050508, accent:0x5a7aff },
    ],
    stratumDepth: 250, floorDepth: 25, floorsPerStratum: 10,
    spawnStart: 16, spawnMin: 6, spawnDecay: 0.97, maxHunters: 8,
    collapseStart: 90, collapseBase: 1.15, boonEvery: 60, ancientEvery: 300,
    crystalBase: 5, crystalPerStratum: 3, bandEvery: 25, shaftRadius: 150,
  },

  // ---- Stratum Warden (survival boss at floors 10/20/30...) ----
  warden: {
    scale: 1.6, hp: 8, hpPerStratum: 2, speedMul: 1.05, dmg: 25,
    modifiers: ['armored','shrieker','splitter','swift'],
    modInfo: {
      armored:  { name:'ARMORED',  desc:'Plating halves all damage it takes.' },
      shrieker: { name:'SHRIEKER', desc:'Emits reveal pings that expose you to every hunter.' },
      splitter: { name:'SPLITTER', desc:'Splits off Skitters as it is wounded and when it dies.' },
      swift:    { name:'SWIFT',    desc:'Much faster, slightly fragile.' },
    },
    armoredDmgMul: 0.5, swiftSpeedMul: 1.45, swiftHpMul: 0.8, shriekEvery: 5,
    coinBase: 120, coinPerStratum: 60, warnBefore: 3, spawnBelow: 55,
  },

  // ---- Boss Trio "The Three Guardians" (floors 50/100/150... replace the Warden) ----
  trio: {
    everyFloors: 50, cycleMul: 1.35, warnBefore: 4,
    alpha: { scale:1.5, hp:6,  speed:19, dmg:16 },   // hunter.glb — fast, persistent
    wall:  { scale:1.7, hp:14, speed:9,  dmg:25 },   // hunter-brute.glb — tank
    eye:   { scale:1.2, hp:5,  dmg:10, pingRadius:70, pingEvery:4.5 }, // hunter-sentry.glb — exposes you
    coinBase: 500, coinPerCycle: 350,
  },

  // ---- boons (survival draft) ----
  boons: [
    { id:'repair', icon:'🛠', name:'Field Repair',  desc:'Restore 30 hull right now.' },
    { id:'cell',   icon:'🔋', name:'Abyssal Cell',  desc:'+50 battery, +20 max battery this dive.' },
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
    subHull:{}, bestDepth:0, bestTime:0, trioBest:0, music:1 };
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
    pingCost: CONFIG.sonar.pingCost * CONFIG.upgrades.battery.cost[u.battery],
    dmgMul: CONFIG.upgrades.hull.dmg[u.hull] };
}
function accentHex(subId){ const cid = SAVE.subColor[subId] || 'teal'; const c = CONFIG.colors.find(x=>x.id===cid); return c ? c.hex : 0x2ee6c8; }

// ============================ AUDIO (procedural Web Audio) ============================
const AudioSys = {
  ctx:null, growlOsc:null, growlGain:null,
  init(){ if (this.ctx){ Music.resume(); return; } try {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.growlOsc = this.ctx.createOscillator(); this.growlOsc.type = 'sawtooth'; this.growlOsc.frequency.value = 52;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.growlGain = this.ctx.createGain(); this.growlGain.gain.value = 0;
    this.growlOsc.connect(f); f.connect(this.growlGain); this.growlGain.connect(this.ctx.destination);
    this.growlOsc.start();
    Music.start();
  } catch(e) {} },
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
  emp(){ this.tone(1200, 0.5, 'sine', 0.1, 90); this.noiseBurst(0.4, 1600, 0.08); },
  hit(){ this.tone(110, 0.22, 'sawtooth', 0.16, 55); this.noiseBurst(0.18, 700, 0.12); },
  gate(){ this.tone(523, 0.16, 'sine', 0.1); this.tone(784, 0.22, 'sine', 0.1, null, 0.13); },
  setGrowl(level){ if (this.growlGain && this.ctx) { try { this.growlGain.gain.setTargetAtTime(clamp(level,0,0.14), this.ctx.currentTime, 0.15); } catch(e) {} } },
};

// ============================ MUSIC (generative ambient score) ============================
// Dark underwater theme over Am–F–Am–E: deep drone + slow bell motif (the "theme song")
// through a feedback-delay abyss echo. In dives the motif thins out; a tension layer
// (heartbeat + minor-2nd pad) tracks hunting hunters / high NOISE and fades with the hunt.
// Music ducks (keeps playing quietly) under pause / boon / end screens.
const MUSIC_STEP = 1.05; // seconds per step; 16 steps = one 4-bar loop
const Music = {
  started:false, bus:null, delay:null, tensionBus:null, padGain:null,
  step:0, nextStep:0, loop:0, tension:0, nextBeat:0,
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
      // ---- drone: A1 + E2 + A2 through a slowly breathing lowpass ----
      const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 210;
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
      this.nextStep = ctx.currentTime + 0.15;
      setInterval(()=> this.tick(), 200);
      setInterval(()=> this.tensionTick(), 120);
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
    const m = this.mode();
    const lvl = this.muted() ? 0 : (m === 'lobby' ? 0.20 : m === 'game' ? 0.12 : 0.045);
    try { this.bus.gain.setTargetAtTime(lvl, AudioSys.ctx.currentTime, snap ? 0.05 : 1.2); } catch(e) {}
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
      o.connect(og); og.connect(this.bus); og.connect(this.delay);
      o.start(t); o.stop(t + decay + 0.05);
    }
  },
  pad(midis, t, dur){
    const ctx = AudioSys.ctx;
    for (const m of midis){
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(m);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.030, t + 1.4);
      og.gain.setValueAtTime(0.030, Math.max(t + 1.4, t + dur - 1.2));
      og.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(og); og.connect(this.bus); og.connect(this.delay);
      o.start(t); o.stop(t + dur + 0.05);
    }
  },
  bass(m, t){
    const ctx = AudioSys.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(m);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.14, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(og); og.connect(this.bus);
    o.start(t); o.stop(t + 2.7);
  },
  scheduleStep(s, t){
    const CH = [ { r:33, pad:[57,60,64] },   // Am
                 { r:29, pad:[53,57,60] },   // F
                 { r:33, pad:[57,60,64] },   // Am
                 { r:28, pad:[52,56,59] } ]; // E
    if (s % 4 === 0){ const c = CH[Math.floor(s / 4)]; this.bass(c.r, t); this.pad(c.pad, t, MUSIC_STEP * 4); }
    const MEL = { 0:69, 2:72, 4:76, 6:74, 8:72, 10:69, 12:67, 14:64 }; // A4 C5 E5 D5 C5 A4 G4 E4
    const m = MEL[s];
    if (m !== undefined){
      const game = this.mode() === 'game';
      if (!game || this.loop % 2 === 0) this.bell(m, t, game ? 0.075 : 0.105, 3.6); // sparser in dives
    }
  },
  tick(){
    if (!this.started) return;
    this.resume(); this.applyMode();
    const ctx = AudioSys.ctx;
    while (this.nextStep < ctx.currentTime + 0.6){
      this.scheduleStep(this.step, this.nextStep);
      this.nextStep += MUSIC_STEP;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.loop++;
    }
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
function normalizeGLB(obj, target){
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  obj.scale.setScalar(target / maxDim);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = new THREE.Vector3(); box2.getCenter(c);
  obj.position.sub(c);
  const wrap = new THREE.Group(); wrap.add(obj);
  if (CONFIG.assetYawFix && CONFIG.assetYawFix['*']) wrap.rotation.y = CONFIG.assetYawFix['*'];
  return wrap;
}
async function preloadAssets(){
  const loader = new GLTFLoader();
  await Promise.all(CONFIG.assets.map(name => new Promise(res => {
    let done = false;
    const finish = v => { if (!done){ done = true; glbCache[name] = v; res(); } };
    const to = setTimeout(()=> finish(null), 4000);
    loader.load('models/' + name + '.glb',
      g => { clearTimeout(to); try { finish(normalizeGLB(g.scene, CONFIG.assetSize[name])); } catch(e){ finish(null); } },
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
  const yawFix = CONFIG.assetYawFix[name]; if (yawFix) g.rotation.y = yawFix;
  return g;
}
function setAccent(group, hex){
  const mats = group.userData.accentMats || [];
  for (const m of mats){ if (m.color) m.color.setHex(hex); if (m.emissive) m.emissive.setHex(hex); }
  group.traverse(o => { if (o.userData && o.userData.accentMat){ o.userData.accentMat.color.setHex(hex); } });
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
  root.userData.reveal = { at: -1e9, entries, min: (opts.min !== undefined ? opts.min : 0.05), dur: CONFIG.sonar.revealDur, _f: -1 };
  revealables.push(root);
  return root;
}
function updateReveal(now){
  for (const r of revealables){
    const rv = r.userData.reveal; if (!rv) continue;
    let k = 0;
    if (now >= rv.at) k = Math.max(0, 1 - (now - rv.at) / rv.dur);
    const f = rv.min + (1 - rv.min) * k;
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
      if (this.wanderT <= 0){ this.wanderT = rand(4,7);
        this.target.set(clamp(this.center.x + rand(-70,70), -bounds, bounds), clamp(this.center.y + rand(-14,14), -24, 30), clamp(this.center.z + rand(-70,70), -bounds, bounds)); }
      this.center.lerp(this.target, dt * 0.25);
      if (this.scatterT > 0) this.scatterT -= dt;
      const spread = this.scatterT > 0 ? 2.4 : 1.0;
      for (const f of this.fishes){
        const desired = this.center.clone(); desired.x += f.userData.off.x * spread; desired.y += f.userData.off.y * spread + Math.sin(t*2 + f.id)*0.4; desired.z += f.userData.off.z * spread;
        const to = desired.sub(f.position);
        const steer = to.multiplyScalar(this.scatterT > 0 ? 2.2 : 1.1);
        f.userData.vel.lerp(steer, clamp(dt * (this.scatterT > 0 ? 3.2 : 1.4), 0, 1));
        const sp = f.userData.vel.length(), maxSp = this.scatterT > 0 ? 26 : 9;
        if (sp > maxSp) f.userData.vel.multiplyScalar(maxSp / sp);
        f.position.addScaledVector(f.userData.vel, dt);
        if (f.userData.vel.lengthSq() > 0.1){ const look = f.position.clone().add(f.userData.vel); f.lookAt(look); }
      }
    } };
  return school;
}

// ============================ UI / SCREENS ============================
const $ = id => document.getElementById(id);
let uiState = 'title';
let survDiff = 'standard';
const SCREEN_OF = { title:'scr-title', zones:'scr-zones', hangar:'scr-hangar', howto:'scr-howto',
                    playing:null, paused:'scr-pause', boon:'scr-boon', end:'scr-end' };
function setUI(state){
  uiState = state;
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
function refreshHangarPreview(){
  if (!hangarScene) return;
  if (hangarPreview){ hangarScene.remove(hangarPreview); }
  const subId = SAVE.sub, def = CONFIG.subs[subId];
  hangarPreview = makeAsset(def.asset);
  hangarPreview.scale.setScalar(def.scale * 1.15);
  setAccent(hangarPreview, accentHex(subId));
  hangarScene.add(hangarPreview);
  hangarScene.userData.rim.color.setHex(accentHex(subId));
  // Frame the whole sub: fit the preview camera distance to this model's bounding
  // sphere, so big hulls (Leviathan) are fully in frame instead of cropped.
  const sphere = new THREE.Box3().setFromObject(hangarPreview).getBoundingSphere(new THREE.Sphere());
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const fitDist = sphere.radius / Math.sin(Math.min(vHalf, hHalf));
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
    const missionLabel = { collect:'Collect crystals', rescue:'Rescue the mini-sub', nests:'Destroy ' + z.mission.nests + ' nests', survive:'Survive ' + z.mission.time + 's' }[z.mission.type];
    card.innerHTML = `<h3>${z.id}. ${z.name}</h3><div class="role">${z.depth[0]}–${z.depth[1]} m · 💎 ${z.crystalValue} coins each</div>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="stat">Mission <b>${missionLabel}</b></div>
      <div class="stat">Hunters <b>${z.hunters.length}</b></div>
      <div class="stat">Jellyfish <b>${z.jellies}</b></div>
      <div class="stat">Escape bonus <b>🪙 ${z.escape}</b></div>
      <div class="stat">Recommended <b>${z.rec}</b></div>
      <p class="stat" style="float:none">${z.desc}</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn small'; btn.textContent = unlocked ? '▼ DIVE' : '🔒 LOCKED';
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
    card.className = 'card' + (selected ? ' sel' : '');
    const hullFrac = SAVE.subHull[id];
    const bar = (v, max) => `<div class="bar"><i style="width:${clamp(v/max*100, 2, 100)}%"></i></div>`;
    card.innerHTML = `<h3>${s.name}</h3><div class="role">${s.role} · ${owned ? (selected ? 'SELECTED' : 'OWNED') : '🪙 ' + s.price}</div>
      <div class="stat">Speed</div>${bar(s.speed, 30)}
      <div class="stat">Hull <b>${s.hull}</b></div>${bar(s.hull, 240)}
      <div class="stat">Sonar <b>×${s.sonarMul}</b></div>${bar(s.sonarMul, 1.3)}
      <div class="stat">Torpedo dmg <b>${s.torpDmg}</b> · Decoys <b>${s.decoyCap}</b> · Torps <b>${s.torpCap}</b></div>
      ${hullFrac !== undefined && hullFrac < 0.999 ? `<div class="stat" style="color:var(--warn)">Hull integrity <b>${Math.round(hullFrac*100)}%</b></div>` : ''}`;
    const btn = document.createElement('button');
    btn.className = 'btn small' + (owned ? '' : ' buy');
    btn.textContent = selected ? 'SELECTED' : owned ? 'SELECT' : 'BUY · 🪙 ' + s.price;
    btn.disabled = selected || (!owned && SAVE.coins < s.price);
    btn.onclick = ()=>{
      if (!owned){ SAVE.coins -= s.price; SAVE.subs.push(id); toast(s.name + ' purchased'); }
      SAVE.sub = id; persist(); buildHangar(); refreshHangarPreview();
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
          if (!ownedC){ if (SAVE.coins < c.price){ toast('Not enough coins'); return; } SAVE.coins -= c.price; SAVE.colorsOwned.push(c.id); }
          SAVE.subColor[id] = c.id; persist(); buildHangar(); refreshHangarPreview();
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
canvas.addEventListener('mousedown', () => {
  AudioSys.init();
  if (uiState === 'playing'){ if (pointerLocked) fireTorpedo(); else canvas.requestPointerLock(); }
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && uiState === 'playing' && G && !G.over) pauseGame();
});
document.addEventListener('mousemove', e => {
  if (pointerLocked && uiState === 'playing' && player){
    player.yaw -= e.movementX * 0.0026;
    player.pitch = clamp(player.pitch - e.movementY * 0.0026, -1.15, 1.15);
  }
  if (uiState === 'hangar' && hangarPreview && e.buttons === 1) hangarPreview.rotation.y += e.movementX * 0.01;
});
canvas.addEventListener('wheel', e => {
  if (uiState === 'hangar'){ hangarCamDist = clamp(hangarCamDist + Math.sign(e.deltaY) * 1.6, 8, 40); }
}, { passive:true });

// ============================ GAME SESSION ============================
let G = null, player = null, gameScene = null;
function newG(mode){
  return { mode, time:0, over:false, zone:null, diff:null, diffId:null,
    crystalsGot:0, crystalsTotal:0, coinsRun:0, empCd:0, noise:0, noisePulse:0,
    gateOpen:false, missionDone:false, surviveT:0, nestsDown:0, rescued:false,
    closeCalls:0, kills:0, torps:0, decoys:0, hintStep:-1, camShake:0,
    hunters:[], crystals:[], jellies:[], mines:[], nests:[], fired:[], schools:[], waves:[], fx:[],
    decoyActive:null, gate:null, stranded:null, boon:{ sonarMul:1, speedMul:1, crystalMul:1, empCdMul:1, battMax:0 },
    // survival director
    stratum:0, floor:0, maxDepth:0, spawnT:6, spawnInterval:CONFIG.survival.spawnStart,
    nextBoonAt:CONFIG.survival.boonEvery, nextMinuteAt:60, nextAncientAt:CONFIG.survival.ancientEvery,
    bandY:0, collapseY:46, collapseMesh:null, pendingBoss:null, bossWarnAt:-1, bossSpawnAt:-1, wardenAlive:null, trio:null };
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
function baseGameScene(fogHex){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(fogHex);
  scene.fog = new THREE.FogExp2(fogHex, 0.0063);
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
function spawnHunter(scene, typeId, pos, opts = {}){
  const t = CONFIG.hunters[typeId];
  const group = makeAsset(t.model);
  group.scale.setScalar(t.modelScale * (opts.scaleMul || 1));
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.05 });
  tintRevealEntries(group, t.tint, t.dark ? 0.85 : 0.5);
  if (!group.userData.core){
    const core = glowBall(0.42, 0x2e7fd9); core.position.set(0, -0.4, CONFIG.assetSize[t.model] * 0.3);
    group.add(core); group.userData.core = core;
  }
  attachCoreGlow(group.userData.core, CONFIG.hunterStates.dormant.core);
  group.userData.isHunter = true;
  const hpMul = (opts.hpMul || 1) * (opts.swiftHp ? CONFIG.warden.swiftHpMul : 1);
  const h = { type: t, typeId, group, hp: Math.max(1, Math.round(t.hp * hpMul)), awareness: opts.aggro ? 1 : 0,
    lastNoise: pos.clone(), targetKind: 'player', home: pos.clone(), state: 'dormant',
    hitCd: 0, closeCd: 0, disabled: 0, sentryT: rand(2.5, 5.5), phase: rand(0, Math.PI * 2),
    ancient: !!opts.ancient, warden: opts.warden || null, trioRole: opts.trioRole || null,
    dmgTakenMul: opts.dmgTakenMul || 1, speedMul: (opts.speedMul || 1), splitDone: false, dead: false,
    vel: new THREE.Vector3() };
  G.hunters.push(h);
  return h;
}
function spawnCrystal(scene, pos, value, golden = false){
  const group = makeAsset('crystal');
  if (golden) group.scale.setScalar(1.35);
  group.position.copy(pos);
  scene.add(group);
  registerReveal(group, { min: 0.04 });
  if (golden) tintRevealEntries(group, 0xffc93a, 0.85);
  const halo = makeGlowSprite(golden ? 0xffc93a : 0x6ff5e2, golden ? 11 : 8, golden ? 0.55 : 0.42);
  halo.position.y = 0.6;
  group.add(halo);
  addGlowPulse(halo, 0.16, 1.7, 0.1);
  const c = { group, value, golden, taken: false, baseY: pos.y, phase: rand(0, Math.PI * 2) };
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
  const n = { group, hp: 3, dead: false };
  G.nests.push(n);
  return n;
}
function spawnCache(scene, pos){
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.6), std(0x6b5a26, { metalness: 0.4 }));
  group.add(box);
  const lid = glowBall(0.4, 0xffd76a); lid.position.y = 1.15; group.add(lid);
  group.position.copy(pos); scene.add(group);
  registerReveal(group, { min: 0.1 });
  const c = { group, taken: false, phase: rand(0, Math.PI*2) };
  if (!G.caches) G.caches = [];
  G.caches.push(c);
  return c;
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
const envFx = { kelp: [], pulses: [], snow: null, shaft: null };
function resetEnvFx(){ envFx.kelp.length = 0; envFx.pulses.length = 0; envFx.snow = null; envFx.shaft = null; }

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
  if (envFx.shaft) envFx.shaft.position.y = Math.round(pp.y / 50) * 50;
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
    for (let i = 0; i < 11; i++){
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
    for (let s = 0; s < 3; s++){
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
    for (let i = 0; i < 8; i++){
      const c = makeAsset('crystal');
      c.scale.setScalar(rand(1.5, 2.7));
      const p = randArenaPos(30, 210, 0, 0);
      c.position.set(p.x, F + 1.4, p.z);
      c.rotation.y = rand(0, 3);
      tintAsset(c, zone.tint.accent, 0.55);
      g.add(c);
    }
    const stalkMat = std(0x3a1030, { roughness: 0.8 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x57104a, emissive: zone.tint.accent, emissiveIntensity: 1.15, roughness: 0.4 });
    for (let i = 0; i < 13; i++){
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
      const glow = makeGlowSprite(zone.tint.accent, rand(4.5, 6.5), 0.34);
      glow.position.y = 1.6; cl.add(glow);
      addGlowPulse(glow, 0.22, rand(1.1, 1.9), 0.1);
      g.add(cl);
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
  g.add(rocks.build());
  registerReveal(g, { min: 0.3 });
  addMarineSnow(scene);
}
// Survival shaft dressing: a periodic rock wall (50 m bands) that snaps along with the descent.
function addSurvivalDressing(scene){
  resetEnvFx();
  const S = CONFIG.survival;
  const mat = std(0x24333a, { roughness: 0.95, metalness: 0.04, flatShading: true });
  const batch = rockBatch(mat);
  const BAND = 50, BANDS = 8;
  for (let b = 0; b < BANDS; b++){
    for (let i = 0; i < 26; i++){
      const a = (i / 26) * Math.PI * 2 + rand(-0.09, 0.09) + b * 0.35, r = S.shaftRadius + rand(4, 18), s = rand(6, 13);
      batch.add(Math.cos(a) * r, -b * BAND - rand(0, BAND), Math.sin(a) * r, s, s * rand(0.9, 1.4), s);
    }
    for (let i = 0; i < 3; i++){
      const a = rand(0, Math.PI * 2), r = S.shaftRadius - rand(2, 10), s = rand(4, 8);
      batch.add(Math.cos(a) * r, -b * BAND - rand(6, 44), Math.sin(a) * r, s, s * 0.7, s);
    }
  }
  const grp = new THREE.Group();
  grp.add(batch.build());
  scene.add(grp);
  registerReveal(grp, { min: 0.24 });
  envFx.shaft = grp;
  addMarineSnow(scene);
}

// ============================ START: EXPEDITION ============================
function startExpedition(zone){
  revealables = [];
  gameScene = baseGameScene(zone.tint.fog);
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
  for (let i=0;i<zone.jellies;i++) spawnJelly(gameScene, randArenaPos(25, 210), zone.tint.accent);
  for (let i=0;i<zone.mines;i++) spawnMine(gameScene, randArenaPos(45, 195));
  if (zone.mission.type === 'nests') for (let i=0;i<zone.mission.nests;i++) spawnNest(gameScene, randArenaPos(95, 185, -14, 18));
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
}

// ============================ START: SURVIVAL ============================
function crystalValueNow(){ return CONFIG.survival.crystalBase + G.stratum * CONFIG.survival.crystalPerStratum; }
function ensureBands(){
  const S = CONFIG.survival, py = player.group.position.y;
  while (G.bandY > py - 290){
    G.bandY -= S.bandEvery;
    const y = G.bandY + rand(-7, 7);
    for (let i=0;i<3;i++){
      const a = rand(0, Math.PI*2), r = rand(22, S.shaftRadius - 28);
      spawnCrystal(gameScene, new THREE.Vector3(Math.cos(a)*r, y + rand(-6, 6), Math.sin(a)*r), crystalValueNow());
    }
    if (Math.random() < 0.16) spawnCache(gameScene, new THREE.Vector3(rand(-95, 95), y, rand(-95, 95)));
    if (Math.random() < 0.55) spawnJelly(gameScene, new THREE.Vector3(rand(-115, 115), y + rand(-4, 4), rand(-115, 115)), 0x7fe0ff);
    if (Math.random() < 0.3){
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(4, 10), 0), std(0x1c2a30, { roughness: 0.95 }));
      const a = rand(0, Math.PI*2), r = rand(60, S.shaftRadius - 10);
      rock.position.set(Math.cos(a)*r, y, Math.sin(a)*r);
      gameScene.add(registerReveal(rock, { min: 0.13 }));
      if (!G.rocks) G.rocks = []; G.rocks.push(rock);
    }
  }
  for (const listName of ['crystals', 'jellies', 'caches', 'rocks']){
    const list = G[listName]; if (!list) continue;
    for (let i = list.length - 1; i >= 0; i--){
      const item = list[i];
      const grp = item.group || item; // survival rocks are stored as bare meshes, the rest as { group }
      if (grp.position.y > py + 110 && !item.taken){ removeEntity(grp); list.splice(i, 1); }
    }
  }
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
  const pts = makeParticles(600, 380, 380, 380); gameScene.add(pts); G.particles = pts;
  for (let i=0;i<2;i++) G.schools.push(buildFishSchool(gameScene, new THREE.Vector3(rand(-80, 80), rand(-40, -10), rand(-80, 80))));
  ensureBands();
  document.documentElement.style.setProperty('--accent', hexCss(accentHex(SAVE.sub)));
  setUI('playing');
  updateObjective();
  toast('SURVIVAL — ' + G.diff.label + '. Descend. The deep pays more, and bites harder.', 3600);
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
function doPing(){
  if (!player || !G || G.over || uiState !== 'playing') return;
  const cost = player.d.pingCost;
  if (player.batt < cost){ toast('🔋 Battery too low to ping — it recharges slowly'); return; }
  player.batt -= cost;
  G.pinged = true;
  G.noisePulse = 100;
  AudioSys.ping();
  const R = sonarRadius(), pp = player.group.position;
  spawnWave(pp, R, accentHex(player.subId));
  for (const r of revealables){
    const rv = r.userData.reveal; if (!rv) continue;
    const d = r.position.distanceTo(pp);
    if (d < R * 1.3){ rv.at = G.time + d / CONFIG.sonar.waveSpeed; rv.dur = CONFIG.sonar.revealDur * (r.userData.isHunter ? player.d.echoMul : 1); }
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
function damagePlayer(dmg, fromPos){
  if (!G || G.over || !player) return;
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
function damageTarget(c, dmg){
  if (c.kind === 'nest'){
    c.ref.hp -= dmg; explosionFx(c.ref.group.position, 2.5); AudioSys.hit();
    if (c.ref.hp <= 0 && !c.ref.dead){ c.ref.dead = true; explosionFx(c.ref.group.position, 10); AudioSys.boom(); removeEntity(c.ref.group); G.nestsDown++; toast('Nest destroyed (' + G.nestsDown + '/' + G.zone.mission.nests + ')'); updateObjective(); }
    return;
  }
  const h = c.ref;
  if (h.maxHp === undefined) h.maxHp = h.hp;
  h.hp -= dmg * h.dmgTakenMul;
  explosionFx(h.group.position, 2.5);
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

// ============================ HUNTER AI ============================
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
        target = h.home.clone();
        target.x += Math.sin(G.time * 0.24 + h.phase) * 16;
        target.z += Math.cos(G.time * 0.19 + h.phase) * 16;
        target.y += Math.sin(G.time * 0.4 + h.phase) * 3;
        speed = h.type.speed * 0.3;
      } else if (h.state === 'curious'){
        target = (h.targetKind === 'decoy' && G.decoyActive) ? G.decoyActive.group.position : h.lastNoise;
        speed = h.type.speed * 0.7;
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
      if (h.vel.lengthSq() > 0.5) g.lookAt(pos.clone().add(h.vel));
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
    }
    // contact damage
    const hitRange = h.type.hitR * Math.max(1, g.scale.x) * 0.8 + player.radius;
    if (distP < hitRange && h.hitCd <= 0){ h.hitCd = 1.2; damagePlayer(h.dmgAbs || h.type.dmg, pos); }
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
    if (pos.distanceTo(pp) < CONFIG.jelly.hitR + player.radius && j.hitCd <= 0){
      j.hitCd = CONFIG.jelly.hitCd; damagePlayer(CONFIG.jelly.dmg, pos); toast('🪼 Jellyfish sting!');
    }
  }
  for (const m of G.mines){
    if (m.dead) continue;
    if (m.group.position.distanceTo(pp) < CONFIG.mine.triggerR){
      m.dead = true; explosionFx(m.group.position, 11); AudioSys.boom(); removeEntity(m.group);
      damagePlayer(CONFIG.mine.dmg, m.group.position); toast('💥 Mine!');
    }
  }
  for (const c of G.crystals){
    if (c.taken) continue;
    c.group.rotation.y += dt * 0.8;
    c.group.position.y = c.baseY + Math.sin(G.time * 1.3 + c.phase) * 0.9;
    if (c.group.position.distanceTo(pp) < 4.6){
      c.taken = true; removeEntity(c.group);
      let v = c.value;
      if (c.golden){
        if (G.mode === 'expedition' && G.zone) SAVE.golden[G.zone.id] = true;
        toast('✨ GOLDEN CRYSTAL! +🪙 ' + v);
      } else {
        G.crystalsGot++;
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
    c.group.rotation.y += dt * 0.6;
    if (c.group.position.distanceTo(pp) < 5){
      c.taken = true; removeEntity(c.group);
      const v = Math.round(rand(CONFIG.econ.cacheMin, CONFIG.econ.cacheMax) * (G.diff ? G.diff.mult : 1));
      bankCoins(v); player.batt = Math.min(player.d.maxBatt + G.boon.battMax, player.batt + 30);
      toast('📦 Supply cache: +🪙 ' + v + ', +battery');
      AudioSys.coin();
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
    else if (m.type === 'nests'){ o.textContent = 'Destroy the hunter nests'; s.textContent = G.nestsDown + '/' + m.nests + ' destroyed · torpedoes: Click / F'; }
    else if (m.type === 'survive'){ o.textContent = 'Survive until the gate opens'; s.textContent = fmtTime(Math.max(0, G.surviveT)) + ' remaining'; }
  } else {
    const st = CONFIG.survival.strata[G.stratum % CONFIG.survival.strata.length];
    o.textContent = '▼ FLOOR ' + G.floor + ' · ' + st.name;
    const into = Math.floor(G.maxDepth) - G.floor * CONFIG.survival.floorDepth;
    s.textContent = 'Next floor in ' + Math.max(0, CONFIG.survival.floorDepth - into) + ' m · Wardens guard every 10th floor · Trio at floor 50';
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
  const pos = new THREE.Vector3(Math.cos(a) * r, pp.y - rand(35, 75), Math.sin(a) * r);
  return spawnHunter(gameScene, typeId, pos, { speedMul: G.diff.hunterMul * clamp(1 + st * 0.04, 1, 1.35) });
}
function spawnAncient(){
  const pos = player.group.position.clone(); pos.y -= 60; pos.x += rand(-40, 40); pos.z += rand(-40, 40);
  const h = spawnHunter(gameScene, 'brute', pos, { aggro: true, ancient: true, scaleMul: 2.0, hpMul: 4, speedMul: 1.05 * G.diff.hunterMul });
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
  bankCoins(Math.round(CONFIG.econ.stratumBonus * G.diff.mult));
  toast('▼ ' + st.name + ' — FLOOR ' + floor, 3200);
  updateObjective();
  if (floor % CONFIG.trio.everyFloors === 0){
    if (!G.trio && !G.pendingBoss){
      G.pendingBoss = { kind: 'trio', milestone: floor, warn: '⚠ FLOOR ' + floor + ' — THE THREE GUARDIANS stir below…' };
      G.bossWarnAt = G.time + 0.5; G.bossSpawnAt = G.time + CONFIG.trio.warnBefore; G.bossWarned = false;
    }
  } else if (!G.wardenAlive && !G.pendingBoss && !G.trio){
    G.pendingBoss = { kind: 'warden', stratum: newStratum, warn: '⚠ Something massive stirs below — a STRATUM WARDEN approaches…' };
    G.bossWarnAt = G.time + 0.5; G.bossSpawnAt = G.time + CONFIG.warden.warnBefore; G.bossWarned = false;
  }
  openBoonDraft();
}
function updateSurvival(dt){
  const S = CONFIG.survival, pos = player.group.position;
  const depth = Math.max(0, -pos.y);
  G.maxDepth = Math.max(G.maxDepth, depth);
  const newFloor = Math.floor(depth / S.floorDepth);
  if (newFloor > G.floor){
    G.floor = newFloor;
    const newStratum = Math.floor(newFloor / S.floorsPerStratum);
    if (newStratum > G.stratum) onStratumCross(newStratum, newFloor);
    updateObjective();
  }
  G.spawnT -= dt;
  const alive = G.hunters.reduce((n, h) => n + (h.dead ? 0 : 1), 0);
  if (G.spawnT <= 0 && alive < S.maxHunters){
    G.spawnT = G.spawnInterval;
    G.spawnInterval = Math.max(S.spawnMin, G.spawnInterval * S.spawnDecay);
    spawnSurvivalHunter();
  }
  if (G.time >= G.nextMinuteAt){ G.nextMinuteAt += 60; bankCoins(Math.round(CONFIG.econ.minuteBonus * G.diff.mult)); }
  if (G.time >= G.nextBoonAt){ G.nextBoonAt += S.boonEvery; openBoonDraft(); }
  if (G.time >= G.nextAncientAt){ G.nextAncientAt += S.ancientEvery; spawnAncient(); }
  if (G.pendingBoss){
    if (!G.bossWarned && G.time >= G.bossWarnAt){ G.bossWarned = true; toast(G.pendingBoss.warn, 3800); AudioSys.tone(196, 0.7, 'sawtooth', 0.1, 98); }
    if (G.time >= G.bossSpawnAt){
      const pb = G.pendingBoss; G.pendingBoss = null;
      if (pb.kind === 'warden') spawnWarden(pb.stratum); else spawnTrio(pb.milestone);
    }
  }
  // The Collapse
  if (G.time >= S.collapseStart){
    const speed = S.collapseBase + G.stratum * 0.3 + G.time / 420;
    G.collapseY -= speed * dt;
    if (pos.y > G.collapseY - 14){
      player.hull -= 10 * dt * player.d.dmgMul;
      G.camShake = Math.min(1, G.camShake + dt * 2);
      if ((G.collapseWarnT || 0) < G.time){ G.collapseWarnT = G.time + 3; toast('🟥 THE COLLAPSE IS CRUSHING YOU — DIVE!'); }
      if (player.hull <= 0){ player.hull = 0; endRun('dead'); return; }
    }
  }
  G.collapseMesh.position.y = G.collapseY;
  if (G.particles) G.particles.position.y = pos.y;
  for (const s of G.schools){
    if (Math.abs(s.center.y - pos.y) > 130){
      s.center.set(rand(-80, 80), pos.y - rand(30, 80), rand(-80, 80));
      s.target.copy(s.center);
      for (const f of s.fishes) f.position.copy(s.center).add(f.userData.off);
    }
  }
  ensureBands();
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
function openBoonDraft(){
  if (uiState === 'boon' || !G || G.over || G.mode !== 'survival') return;
  const pool = [...CONFIG.boons], chosen = [];
  while (chosen.length < 3 && pool.length) chosen.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
  const wrap = $('boon-cards'); wrap.innerHTML = '';
  for (const b of chosen){
    const card = document.createElement('div');
    card.className = 'card boon';
    card.innerHTML = `<div class="ic">${b.icon}</div><h3>${b.name}</h3><p class="stat" style="float:none">${b.desc}</p>`;
    card.onclick = ()=>{ AudioSys.init(); BOON_APPLY[b.id](); toast('⚗ ' + b.name); setUI('playing'); };
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
    rows.push(['Crystals', G.crystalsGot], ['Hunters destroyed', G.kills], ['Close calls', G.closeCalls]);
    rows.push(['Coins earned', '🪙 ' + G.coinsRun]);
    if (SAVE.trioBest) rows.push(['Guardians best', 'FLOOR ' + SAVE.trioBest]);
  }
  persist();
  $('end-title').textContent = title;
  $('end-stars').textContent = starsHtml;
  $('end-stats').innerHTML = rows.map(r => `<div class="endstat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('btn-end-next').textContent = G.mode === 'expedition' ? 'ZONE SELECT' : 'TITLE';
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
  let thrust = 0, strafe = 0;
  if (keys['KeyW']) thrust += 1;
  if (keys['KeyS']) thrust -= 0.7;
  if (keys['KeyD']) strafe -= 0.75;
  if (keys['KeyA']) strafe += 0.75;
  const maxSp = p.d.def.speed * G.boon.speedMul, accel = 46;
  p.vel.addScaledVector(fwd, thrust * accel * dt);
  p.vel.addScaledVector(right, strafe * accel * dt);
  p.vel.multiplyScalar(Math.max(0, 1 - 1.9 * dt));
  const sp = p.vel.length();
  if (sp > maxSp) p.vel.multiplyScalar(maxSp / sp);
  p.thrust = Math.abs(thrust) + Math.abs(strafe) * 0.7;
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
  const roll = clamp(-strafe * 0.35 + (keys['ArrowLeft'] ? 0.25 : 0) + (keys['ArrowRight'] ? -0.25 : 0), -0.6, 0.6);
  g.lookAt(g.position.clone().add(fwd));
  g.rotateZ(roll);
  if (g.userData.spin) g.userData.spin.rotation.z -= dt * (2 + sp * 0.9);
  p.batt = Math.min(p.d.maxBatt + G.boon.battMax, p.batt + CONFIG.batteryRegen * dt);
  const speedFrac = maxSp > 0 ? sp / maxSp : 0;
  G.noisePulse = Math.max(0, G.noisePulse - CONFIG.sonar.noiseDecay * dt);
  G.noise = clamp(G.noisePulse * 0.7 + speedFrac * 55 * p.d.def.noiseMul, 0, 100);
  const hearR = CONFIG.sonar.engineHearBase * p.d.def.noiseMul * (0.35 + 0.65 * speedFrac);
  if (hearR > 4) for (const h of G.hunters){
    if (h.dead || h.type.hearing <= 0) continue;
    const d = h.group.position.distanceTo(g.position);
    if (d < hearR * h.type.hearing) hearNoise(h, g.position, dt * 0.22 * (1 - d / (hearR * h.type.hearing)), 'player');
  }
  const camTarget = g.position.clone().addScaledVector(fwd, -16);
  camTarget.y += 5.5;
  camera.position.lerp(camTarget, 1 - Math.exp(-5 * dt));
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
  const maxB = p.d.maxBatt + G.boon.battMax;
  $('batt-txt').textContent = Math.floor(p.batt) + ' / ' + maxB;
  $('m-batt').firstElementChild.style.width = clamp(p.batt / maxB * 100, 0, 100) + '%';
  $('noise-txt').textContent = Math.round(G.noise) + '%';
  $('m-noise').firstElementChild.style.width = G.noise + '%';
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
      '🖱 Click the water to lock your view. W = thrust, mouse steers.',
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
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  // hunt vignette: subtle red edge pulse while a hunter is hunting you (driven by Music.tension)
  if (huntVigEl){
    const vigTgt = (uiState === 'playing' && Music.tension > 0.04)
      ? (0.08 + 0.17 * Music.tension) * (0.78 + 0.22 * Math.sin(performance.now() * 0.007)) : 0;
    huntVigCur += (vigTgt - huntVigCur) * Math.min(1, dt * 5);
    huntVigEl.style.opacity = huntVigCur.toFixed(3);
  }
  if (uiState === 'playing' && G && !G.over){
    G.time += dt;
    if (G.empCd > 0) G.empCd -= dt;
    updatePlayer(dt);
    updateHunters(dt);
    updateTorpedoes(dt);
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
    if (hangarPreview) hangarPreview.rotation.y += dt * 0.25;
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
  $('btn-hangar').onclick = ()=>{ AudioSys.init(); setUI('hangar'); buildHangar(); refreshHangarPreview(); };
  $('btn-howto').onclick = ()=> setUI('howto');
  $('btn-howto-back').onclick = ()=> setUI('title');
  $('btn-zones-back').onclick = ()=> setUI('title');
  $('btn-hangar-back').onclick = ()=> setUI('title');
  $('btn-resume').onclick = ()=> resumeGame();
  $('btn-restart').onclick = ()=> restartDive();
  $('btn-quit').onclick = ()=>{ if (G) endRun('abandon'); };
  $('btn-end-retry').onclick = ()=> restartDive();
  $('btn-end-hangar').onclick = ()=>{ AudioSys.init(); setUI('hangar'); buildHangar(); refreshHangarPreview(); };
  $('btn-end-next').onclick = ()=>{ if (G && G.mode === 'expedition'){ buildZoneCards(); setUI('zones'); } else setUI('title'); };
  const sb = $('btn-sound');
  sb.textContent = Music.muted() ? '🔇' : '🔊';
  sb.onclick = ()=>{ AudioSys.init(); Music.toggleMute(); };
}
(async function boot(){
  if (SAVE.trioBest === undefined) SAVE.trioBest = 0;
  wire();
  refreshCoinLabels();
  await preloadAssets();
  buildMenuScene();
  buildHangarScene();
  setUI('title');
  animate();
})();
