// Mundo del greybox: dos jugadores + cadena + pilares + muñeco. Paso fijo, puro, determinista.
import {
  createChain,
  pathLength,
  integrateChain,
  solveSegments,
  collideChainPillars,
  solvePath,
  solvePathSoft,
  computeTension,
  chainDamageStep,
} from "./cadena.js";
import {
  createPlayer,
  updatePlayer,
  inverseMass,
  hurtPlayer,
  killPlayer,
  revivePlayer,
  pushOutOfCircle,
  keepInsideCircle,
} from "./jugadores.js";

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Entrada} Entrada */
/** @typedef {import('./tipos.js').Cadena} Cadena */
/** @typedef {import('./tipos.js').Punto} Punto */

/**
 * @typedef {object} OpcionesMundo
 * @property {boolean} [solo]
 * @property {number[]} [sael]  posición inicial [x, z]
 * @property {number[]} [odo]
 * @property {import('./tipos.js').Pilar[]} [pillars]
 * @property {number} [arenaRadius]
 * @property {{ x?: number, z?: number, r?: number }} [dummy]
 */

export const SAEL = 0;
export const ODO = 1;

/** @returns {Entrada} */
export const emptyInput = () => ({
  mx: 0,
  mz: 0,
  dash: false,
  anchor: false,
  dashDir: null,
});

/**
 * @param {Cfg} cfg
 * @param {OpcionesMundo} [opts]
 * @returns {Mundo}
 */
export function createWorld(cfg, opts = {}) {
  const G = cfg.greybox;
  const [sx, sz] = opts.sael ?? G.spawn.sael;
  const [ox, oz] = opts.odo ?? G.spawn.odo;
  const players = [
    createPlayer("sael", sx, sz, cfg),
    createPlayer("odo", ox, oz, cfg),
  ];
  return {
    cfg,
    solo: !!opts.solo,
    time: 0,
    players,
    chain: createChain(sx, sz, ox, oz, cfg),
    pillars: (opts.pillars ?? G.pillars).map((p) => ({ ...p })),
    arenaRadius: opts.arenaRadius ?? G.arenaRadius,
    dummy: {
      x: G.dummy.x,
      z: G.dummy.z,
      r: G.dummy.radius,
      vx: 0,
      vz: 0,
      ...(opts.dummy ?? {}),
      total: 0,
      dps: 0,
      lastStep: 0,
      byPlayer: [0, 0], // D-165: atribuido al más cercano al contacto
      hit: { active: false, value: 0, idle: 0, shown: 0, maxT: 0 }, // D-166
      invulnerable: false, // transición de fase, presentación… (D-153): la cadena pasa sin dañar
    },
    // Velocidad externa por jugador que ponen los ataques (tirón, empuje). Anclado recibe solo
    // `anchor.pushFactor` (D-122); frente a la cadena el ancla sigue siendo absoluta (D-150).
    ext: [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ],
    // drag[i] = el jugador i está arrastrando al otro este paso (D-174: largo máximo o cadáver).
    drag: [false, false],
    hitstop: 0,
    solverReverts: 0, // veces que el solver tuvo que cancelar un paso (diagnóstico)
    _contact: { x: 0, z: 0, maxT: 0, touching: false },
    _solo: [emptyInput(), emptyInput()],
    _dir: { x: 0, z: 0 },
  };
}

// Modo solo (D-016, D-120, D-145): un botón de dash hace dashear a los dos en la misma dirección,
// la media de las dos entradas. Si la media es nula, la media de hacia dónde miran (D-151).
/**
 * @param {Mundo} w
 * @param {Entrada[]} inputs
 * @returns {Entrada[]}
 */
export function combineSolo(w, inputs) {
  const [a, b] = inputs;
  const dash = !!(a.dash || b.dash);
  let dx = ((a.mx || 0) + (b.mx || 0)) / 2;
  let dz = ((a.mz || 0) + (b.mz || 0)) / 2;
  if (Math.hypot(dx, dz) < 1e-3) {
    const [s, o] = w.players;
    dx = (s.alive ? Math.cos(s.face) : 0) + (o.alive ? Math.cos(o.face) : 0);
    dz = (s.alive ? Math.sin(s.face) : 0) + (o.alive ? Math.sin(o.face) : 0);
    if (Math.hypot(dx, dz) < 1e-3) {
      dx = Math.cos(s.face);
      dz = Math.sin(s.face);
    }
  }
  const l = Math.hypot(dx, dz);
  w._dir.x = dx / l;
  w._dir.z = dz / l;
  for (let i = 0; i < 2; i++) {
    const o = w._solo[i];
    o.mx = inputs[i].mx || 0;
    o.mz = inputs[i].mz || 0;
    o.anchor = !!inputs[i].anchor;
    o.dash = dash;
    o.dashDir = w._dir;
  }
  return w._solo;
}

const _pos = { x: 0, z: 0 };

/**
 * @param {Mundo} w
 * @param {Punto} pos
 * @param {Cfg} cfg
 * @returns {boolean}
 */
function collidePoint(w, pos, cfg) {
  const pr = cfg.player.radius;
  let moved = false;
  for (const P of w.pillars)
    moved = pushOutOfCircle(pos, P.x, P.z, P.r + pr) || moved;
  moved = pushOutOfCircle(pos, w.dummy.x, w.dummy.z, w.dummy.r + pr) || moved; // el cuerpo solo empuja (D-152)
  moved = keepInsideCircle(pos, w.arenaRadius - pr) || moved;
  return moved;
}

// Saca a un extremo (jugador) de pilares, muñeco/jefe y borde. Devuelve true si lo movió.
/**
 * @param {Mundo} w
 * @param {Cadena} ch
 * @param {number} idx
 * @param {Cfg} cfg
 * @returns {boolean}
 */
function collideEnd(w, ch, idx, cfg) {
  _pos.x = ch.x[idx];
  _pos.z = ch.z[idx];
  const moved = collidePoint(w, _pos, cfg);
  ch.x[idx] = _pos.x;
  ch.z[idx] = _pos.z;
  return moved;
}

// Devuelve false si el paso no simuló (hit-stop): la entrada no se consumió.
/**
 * @param {Mundo} w
 * @param {Entrada[]} inputs
 * @param {number} dt
 * @returns {boolean}
 */
export function stepWorld(w, inputs, dt) {
  const cfg = w.cfg;
  if (w.hitstop > 0) {
    w.hitstop = Math.max(0, w.hitstop - dt);
    return false;
  }
  const ins = w.solo ? combineSolo(w, inputs) : inputs;
  const [A, B] = w.players;
  const ch = w.chain;
  const n = ch.n;

  updatePlayer(A, ins[0] ?? emptyInput(), !B.alive, dt, cfg);
  updatePlayer(B, ins[1] ?? emptyInput(), !A.alive, dt, cfg);

  // Empuje externo de ataques: se aplica antes de fijar px, así no cuenta como velocidad propia
  // y el ancla absoluta (que vuelve a px) conserva el empuje reducido. sx/sz = posición válida de
  // antes del empuje, para el último recurso del solver (regresión Codex: dos anclados empujados).
  for (let i = 0; i < 2; i++) {
    const p = w.players[i],
      e = w.ext[i];
    p.sx = p.x;
    p.sz = p.z;
    if (e.x === 0 && e.z === 0) continue;
    const f = p.anchored ? cfg.anchor.pushFactor : 1;
    p.x += e.x * f * dt;
    p.z += e.z * f * dt;
    if (p.anchored) {
      _pos.x = p.x;
      _pos.z = p.z;
      collidePoint(w, _pos, cfg);
      p.x = _pos.x;
      p.z = _pos.z;
    }
  }
  // Integrar jugadores y eslabones.
  for (const p of w.players) {
    p.ivx = p.vx;
    p.ivz = p.vz;
    p.px = p.x;
    p.pz = p.z;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
  }
  integrateChain(ch, dt, cfg);
  ch.px[0] = A.px;
  ch.pz[0] = A.pz;
  ch.x[0] = A.x;
  ch.z[0] = A.z;
  ch.px[n] = B.px;
  ch.pz[n] = B.pz;
  ch.x[n] = B.x;
  ch.z[n] = B.z;

  // Solver PBD en dos fases (ADR-001).
  const wA = inverseMass(A, cfg),
    wB = inverseMass(B, cfg);
  if (wA > 0) collideEnd(w, ch, 0, cfg);
  if (wB > 0) collideEnd(w, ch, n, cfg);
  // 1) Los jugadores mandan: los eslabones (sin masa apreciable) se arrastran tras ellos y rodean pilares.
  for (let it = 0; it < cfg.chain.iterations; it++) {
    solveSegments(ch, (it & 1) === 1);
    collideChainPillars(ch, w.pillars, cfg);
  }
  // 2) Largo máximo: el exceso lo pagan eslabones y jugadores según su peso (arrastre, D-022/D-149/D-150).
  //    Primero la versión blanda (los eslabones se enderezan), con paso limitado.
  const maxStep = cfg.chain.pathMaxStep * ch.seg;
  for (let it = 0; it < cfg.chain.pathIterations; it++) {
    solvePathSoft(ch, wA, wB, cfg.chain.linkInvMass, maxStep);
    if (wA > 0) collideEnd(w, ch, 0, cfg);
    if (wB > 0) collideEnd(w, ch, n, cfg);
    solveSegments(ch, (it & 1) === 1);
    collideChainPillars(ch, w.pillars, cfg);
  }
  // Cierre: solvePath deja el recorrido exacto; si eso mete a un jugador en un cuerpo, se le saca.
  //  · si el otro extremo puede moverse, el bloqueado pasa a contar como apoyado (peso 0) y paga el otro;
  //  · si no (el otro está anclado o también bloqueado), se alternan largo y colisión: el bloqueado
  //    resbala por el borde del cuerpo hasta una posición que cumple las dos.
  // Prioridad final: no atravesar cuerpos (la última operación siempre es la colisión).
  let ca = wA,
    cb = wB;
  for (let it = 0; it < cfg.chain.closeIterations; it++) {
    solvePath(ch, ca, cb);
    const pa = ca > 0 && collideEnd(w, ch, 0, cfg);
    const pb = cb > 0 && collideEnd(w, ch, n, cfg);
    if (!pa && !pb) break;
    if (pa && !pb && cb > 0) ca = 0;
    else if (pb && !pa && ca > 0) cb = 0;
  }
  // Último recurso: si largo y colisión no se pudieron cumplir a la vez (p. ej. ancla + choque contra el
  // muñeco con la cadena atravesándolo), se cancela el movimiento de este paso y se vuelve al estado
  // anterior, que sí los cumplía. Cuesta un paso quieto en un atasco raro; nunca estira ni atraviesa.
  if (pathLength(ch) > ch.length * (1 + cfg.chain.maxStretch)) {
    for (let i = 0; i <= n; i++) {
      ch.x[i] = ch.px[i];
      ch.z[i] = ch.pz[i];
    }
    // Los extremos vuelven a antes del empuje: el empuje que rompe el largo no se aplica.
    A.px = A.sx;
    A.pz = A.sz;
    B.px = B.sx;
    B.pz = B.sz;
    ch.x[0] = A.sx;
    ch.z[0] = A.sz;
    ch.x[n] = B.sx;
    ch.z[n] = B.sz;
    w.solverReverts++;
  }
  // Ancla absoluta: el anclado no se mueve ni un milímetro (D-150).
  if (wA === 0) {
    ch.x[0] = A.px;
    ch.z[0] = A.pz;
  }
  if (wB === 0) {
    ch.x[n] = B.px;
    ch.z[n] = B.pz;
  }

  A.x = ch.x[0];
  A.z = ch.z[0];
  B.x = ch.x[n];
  B.z = ch.z[n];
  for (const p of w.players) {
    if (p.dashT > 0) continue; // el dash fija su velocidad en el próximo paso
    p.vx = (p.x - p.px) / dt;
    p.vz = (p.z - p.pz) / dt;
  }

  computeTension(ch, w.pillars, cfg, dt);
  detectDrag(w, dt);
  applyDummyDamage(w, dt);
  w.time += dt;
  return true;
}

// D-174: i arrastra a j si la cadena está al máximo y j se desplaza hacia i más de lo que él mismo
// quería (desplazamiento real − velocidad propia, proyectado hacia i). Al cadáver basta con moverlo.
/**
 * @param {Mundo} w
 * @param {number} dt
 */
function detectDrag(w, dt) {
  const S = w.cfg.stats.arrastre;
  const taut = w.chain.pathLength >= w.chain.length * S.tenso;
  for (let i = 0; i < 2; i++) {
    const a = w.players[i],
      b = w.players[1 - i];
    w.drag[i] = false;
    if (!taut || !a.alive) continue;
    const dx = a.x - b.x,
      dz = a.z - b.z;
    const d = Math.hypot(dx, dz) || 1;
    // Tiene que moverse de verdad hacia i (no basta con que la cadena lo frene) y más de lo que quería.
    const vx = (b.x - b.px) / dt,
      vz = (b.z - b.pz) / dt;
    const fx = vx - (b.alive ? b.ivx : 0),
      fz = vz - (b.alive ? b.ivz : 0);
    if (
      (vx * dx + vz * dz) / d > S.velMin &&
      (fx * dx + fz * dz) / d > S.velMin
    )
      w.drag[i] = true;
  }
}

/**
 * @param {Mundo} w
 * @param {number} dt
 */
function applyDummyDamage(w, dt) {
  const cfg = w.cfg;
  const d = w.dummy;
  const c = w._contact;
  let dmg = chainDamageStep(w.chain, d, dt, cfg, c);
  if (d.invulnerable) dmg = 0;
  const hit = d.hit;
  d.lastStep = dmg;
  d.total += dmg;
  d.dps += (dmg / dt - d.dps) * (1 - Math.exp(-dt / cfg.feedback.dpsWindow));
  if (dmg > 0) {
    const [A, B] = w.players;
    const near =
      Math.hypot(A.x - c.x, A.z - c.z) <= Math.hypot(B.x - c.x, B.z - c.z)
        ? SAEL
        : ODO;
    d.byPlayer[near] += dmg;
    if (!hit.active) {
      hit.active = true;
      hit.value = 0;
      hit.maxT = 0;
    }
    // Hit-stop la primera vez que el contacto cruza la tensión alta (D-166).
    const H = cfg.feedback.hitstop;
    if (H.enabled && c.maxT >= H.tension && hit.maxT < H.tension)
      w.hitstop = H.duration;
    hit.value += dmg;
    hit.idle = 0;
    hit.maxT = Math.max(hit.maxT, c.maxT);
    hit.shown = cfg.feedback.damageNumber.linger;
  } else {
    if (hit.active) {
      hit.idle += dt;
      if (hit.idle >= cfg.feedback.damageNumber.gap) hit.active = false;
    }
    if (!hit.active) hit.shown = Math.max(0, hit.shown - dt);
  }
}

// Utilidades de prueba / debug.
/**
 * @param {Mundo} w
 * @param {number} idx
 * @param {number} [amount]
 */
export function debugHurt(w, idx, amount) {
  return hurtPlayer(w.players[idx], amount ?? w.cfg.greybox.debugHurt, w.cfg);
}
/**
 * @param {Mundo} w
 * @param {number} idx
 */
export function debugKill(w, idx) {
  killPlayer(w.players[idx]);
}
/** @param {Mundo} w */
export function debugReviveAll(w) {
  for (const p of w.players) if (!p.alive) revivePlayer(p, w.cfg);
}
