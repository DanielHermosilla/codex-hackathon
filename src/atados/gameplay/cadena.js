// Cadena: Verlet + PBD en el plano XZ (ADR-001). Sin three.js ni DOM.
// Partícula 0 = Sael, partícula n = Odo. Durante el solver los extremos viven en los arrays;
// mundo.js los copia de/a los jugadores.
//
// Decisiones: D-011 (eslabones reales), D-013 (la tensión transmite fuerza), D-022 (inextensible, arrastra),
// D-048/D-184 (enredo en pilares), D-079 (largo fijo), D-147 (tensión = rectitud por tramo).

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Cadena} Cadena */

const EPS = 1e-9;

/**
 * @param {number} ax
 * @param {number} az
 * @param {number} bx
 * @param {number} bz
 * @param {Cfg} cfg
 * @returns {Cadena}
 */
export function createChain(ax, az, bx, bz, cfg) {
  const n = cfg.chain.linkCount;
  const ch = {
    n,
    length: cfg.chain.length,
    seg: cfg.chain.length / n,
    x: new Float64Array(n + 1),
    z: new Float64Array(n + 1),
    px: new Float64Array(n + 1),
    pz: new Float64Array(n + 1),
    contact: new Int16Array(n + 1).fill(-1), // índice de pilar en contacto o -1
    segKind: new Int16Array(n), // -1 tramo libre, k = enrollado en el pilar k
    segRaw: new Float64Array(n), // tensión instantánea por eslabón (0..1)
    segT: new Float64Array(n), // tensión suavizada por eslabón (la que daña)
    tramos: Array.from({ length: n }, () => ({
      a: 0,
      b: 0,
      pillar: -1,
      straightness: 0,
      tension: 0,
    })),
    tramoCount: 0,
    pathLength: 0,
    tension: 0, // media de los eslabones
    tensionMax: 0,
  };
  ensureScratch(n);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    ch.x[i] = ch.px[i] = ax + (bx - ax) * u;
    ch.z[i] = ch.pz[i] = az + (bz - az) * u;
  }
  return ch;
}

/**
 * @param {Cadena} ch
 * @returns {number}
 */
export function pathLength(ch) {
  let s = 0;
  for (let i = 0; i < ch.n; i++)
    s += Math.hypot(ch.x[i + 1] - ch.x[i], ch.z[i + 1] - ch.z[i]);
  return s;
}

// Verlet de los eslabones interiores con fricción de suelo. Deja px = posición al inicio del paso.
/**
 * @param {Cadena} ch
 * @param {number} dt
 * @param {Cfg} cfg
 */
export function integrateChain(ch, dt, cfg) {
  const keep = Math.exp(-cfg.chain.friction * dt);
  for (let i = 1; i < ch.n; i++) {
    const vx = (ch.x[i] - ch.px[i]) * keep;
    const vz = (ch.z[i] - ch.pz[i]) * keep;
    ch.px[i] = ch.x[i];
    ch.pz[i] = ch.z[i];
    ch.x[i] += vx;
    ch.z[i] += vz;
  }
}

// Eslabones: restricción de desigualdad (se afloja, no se estira). Extremos fijos aquí:
// a los jugadores solo los mueve la restricción de recorrido.
/**
 * @param {Cadena} ch
 * @param {boolean} reverse
 */
export function solveSegments(ch, reverse) {
  const { n, seg, x, z } = ch;
  for (let k = 0; k < n; k++) {
    const i = reverse ? n - 1 - k : k;
    const j = i + 1;
    const dx = x[j] - x[i],
      dz = z[j] - z[i];
    const d = Math.hypot(dx, dz);
    if (d <= seg || d < EPS) continue;
    const wi = i === 0 ? 0 : 1;
    const wj = j === n ? 0 : 1;
    const ws = wi + wj;
    if (ws === 0) continue;
    const f = (d - seg) / (d * ws);
    x[i] += dx * f * wi;
    z[i] += dz * f * wi;
    x[j] -= dx * f * wj;
    z[j] -= dz * f * wj;
  }
}

// Partículas y segmentos fuera de los pilares (enredo, D-048). Extremos no se tocan aquí.
/**
 * @param {Cadena} ch
 * @param {import('./tipos.js').Pilar[]} pillars
 * @param {Cfg} cfg
 */
export function collideChainPillars(ch, pillars, cfg) {
  const { n, x, z } = ch;
  const cr = cfg.chain.radius;
  for (let p = 0; p < pillars.length; p++) {
    const P = pillars[p];
    const R = P.r + cr;
    for (let i = 1; i < n; i++) {
      const dx = x[i] - P.x,
        dz = z[i] - P.z;
      const d = Math.hypot(dx, dz);
      if (d >= R) continue;
      if (d < EPS) {
        x[i] = P.x + R;
        continue;
      }
      x[i] = P.x + (dx / d) * R;
      z[i] = P.z + (dz / d) * R;
    }
    for (let i = 0; i < n; i++) {
      const j = i + 1;
      const sx = x[j] - x[i],
        sz = z[j] - z[i];
      const L2 = sx * sx + sz * sz;
      if (L2 < EPS) continue;
      let t = ((P.x - x[i]) * sx + (P.z - z[i]) * sz) / L2;
      if (t <= 0 || t >= 1) continue; // los extremos del segmento ya se resolvieron como partículas
      const cx = x[i] + sx * t,
        cz = z[i] + sz * t;
      let nx = cx - P.x,
        nz = cz - P.z;
      let d = Math.hypot(nx, nz);
      if (d >= R) continue;
      if (d < EPS) {
        const l = Math.sqrt(L2);
        nx = -sz / l;
        nz = sx / l;
        d = 0;
      } else {
        nx /= d;
        nz /= d;
      }
      const push = R - d;
      const wi = i === 0 ? 0 : 1;
      const wj = j === n ? 0 : 1;
      if (wi && wj) {
        x[i] += nx * push;
        z[i] += nz * push;
        x[j] += nx * push;
        z[j] += nz * push;
      } else if (wj) {
        const s = push / Math.max(t, 0.25);
        x[j] += nx * s;
        z[j] += nz * s;
      } else if (wi) {
        const s = push / Math.max(1 - t, 0.25);
        x[i] += nx * s;
        z[i] += nz * s;
      }
    }
  }
}

// Recoge cadena desde un extremo: lo avanza `m` metros SOBRE la polilínea. Los eslabones que
// sobrepasa quedan amontonados en el extremo (no se recrea largo detrás). Reduce el recorrido en
// exactamente min(m, recorrido). Devuelve los metros recogidos.
/**
 * @param {Cadena} ch
 * @param {boolean} fromStart
 * @param {number} m
 * @returns {number}
 */
function reelIn(ch, fromStart, m) {
  const { n, x, z } = ch;
  const e = fromStart ? 0 : n;
  const step = fromStart ? 1 : -1;
  let px = x[e],
    pz = z[e],
    rest = m;
  let k = e + step;
  for (; k >= 0 && k <= n && rest > 0; k += step) {
    const dx = x[k] - px,
      dz = z[k] - pz;
    const d = Math.hypot(dx, dz);
    if (d <= rest) {
      rest -= d;
      px = x[k];
      pz = z[k];
      continue;
    }
    px += (dx / d) * rest;
    pz += (dz / d) * rest;
    rest = 0;
    break;
  }
  // Amontonar en el extremo las partículas sobrepasadas.
  for (let q = e + step; q !== k && q >= 0 && q <= n; q += step) {
    x[q] = px;
    z[q] = pz;
  }
  x[e] = px;
  z[e] = pz;
  return m - rest;
}

// Restricción global de recorrido: suma de eslabones ≤ largo (D-022). Solo mueve a los extremos,
// recogiendo cadena sobre la polilínea, repartido por peso inverso (ancla 0, dash pesado, cadáver
// pesado; D-149, D-150). Es exacta: deja el recorrido = largo (si hay algún extremo móvil). Como el
// extremo avanza sobre segmentos ya resueltos, no mete la cadena en ningún pilar.
/**
 * @param {Cadena} ch
 * @param {number} wA
 * @param {number} wB
 * @returns {number}
 */
export function solvePath(ch, wA, wB) {
  const C = pathLength(ch) - ch.length;
  if (C <= 0) return 0;
  const ws = wA + wB;
  if (ws <= 0) return C;
  // Cada extremo recoge según su movilidad; si B no puede, A recoge también lo que falta.
  const done = wA > 0 ? reelIn(ch, true, C * (wA / ws)) : 0;
  if (wB > 0) reelIn(ch, false, C - done);
  else if (done < C) reelIn(ch, true, C - done);
  return C;
}

// Versión "blanda" de la misma restricción, con gradiente en TODAS las partículas: los eslabones,
// livianos (`wLink`), enderezan sus codos antes de mover a los jugadores; así la cadena se deja
// arrastrar de lado en vez de frenar a quien tira. Cerca de la recta el gradiente interior se anula
// y la proyección lineal se dispara: por eso el desplazamiento por iteración se limita a `maxStep`
// y el resto lo cierra `solvePath` (exacto). Ver regresiones de la revisión Codex en tests.
/**
 * @param {Cadena} ch
 * @param {number} wA
 * @param {number} wB
 * @param {number} wLink
 * @param {number} maxStep
 * @returns {number}
 */
export function solvePathSoft(ch, wA, wB, wLink, maxStep) {
  const { n, x, z } = ch;
  let S = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i + 1] - x[i],
      dz = z[i + 1] - z[i];
    const d = Math.hypot(dx, dz);
    S += d;
    if (d > 1e-9) {
      _ux[i] = dx / d;
      _uz[i] = dz / d;
    } else {
      _ux[i] = 0;
      _uz[i] = 0;
    }
  }
  const C = S - ch.length;
  if (C <= 0) return 0;
  let denom = 0,
    gmax = 0;
  for (let k = 0; k <= n; k++) {
    const w = k === 0 ? wA : k === n ? wB : wLink;
    const gx = (k > 0 ? _ux[k - 1] : 0) - (k < n ? _ux[k] : 0);
    const gz = (k > 0 ? _uz[k - 1] : 0) - (k < n ? _uz[k] : 0);
    _gx[k] = gx;
    _gz[k] = gz;
    const g2 = gx * gx + gz * gz;
    denom += w * g2;
    gmax = Math.max(gmax, w * Math.sqrt(g2));
  }
  if (denom < 1e-12) return C;
  let lam = C / denom;
  if (lam * gmax > maxStep) lam = maxStep / gmax;
  for (let k = 0; k <= n; k++) {
    const w = k === 0 ? wA : k === n ? wB : wLink;
    if (w === 0) continue;
    x[k] -= lam * w * _gx[k];
    z[k] -= lam * w * _gz[k];
  }
  return C;
}
let _ux = new Float64Array(0),
  _uz = _ux,
  _gx = _ux,
  _gz = _ux;
/** @param {number} n */
function ensureScratch(n) {
  if (_gx.length >= n + 1) return;
  _ux = new Float64Array(n + 1);
  _uz = new Float64Array(n + 1);
  _gx = new Float64Array(n + 1);
  _gz = new Float64Array(n + 1);
}

// D-147 + D-068: rectitud → tensión, continua y monótona; floja ≈ 0.
/**
 * @param {number} r
 * @param {Cfg} cfg
 * @returns {number}
 */
export function tensionFromStraightness(r, cfg) {
  const s0 = cfg.chain.tension.straightMin;
  const u = Math.min(1, Math.max(0, (r - s0) / (1 - s0)));
  return Math.pow(u, cfg.chain.tension.curvePow);
}

// Tensión por tramo (D-147). Los tramos se cortan donde la cadena se apoya en un pilar:
//  · tramo libre: cuerda / largo nominal del tramo (1 = recto y extendido);
//  · tramo enrollado: extensión de sus eslabones, limitada por el tramo libre vecino más tenso
//    (un pilar sin fricción transmite la tensión; si los dos lados están flojos, el enrollado también).
/**
 * @param {Cadena} ch
 * @param {import('./tipos.js').Pilar[]} pillars
 * @param {Cfg} cfg
 * @param {number} dt
 */
export function computeTension(ch, pillars, cfg, dt) {
  const { n, seg, x, z, contact, segKind, segRaw, segT, tramos } = ch;
  const R0 = cfg.chain.radius + cfg.chain.contactEps;
  for (let i = 0; i <= n; i++) {
    contact[i] = -1;
    for (let p = 0; p < pillars.length; p++) {
      const P = pillars[p];
      if (Math.hypot(x[i] - P.x, z[i] - P.z) <= P.r + R0) {
        contact[i] = p;
        break;
      }
    }
  }
  for (let i = 0; i < n; i++)
    segKind[i] =
      contact[i] >= 0 && contact[i] === contact[i + 1] ? contact[i] : -1;

  // Agrupar en tramos.
  let tc = 0;
  let start = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || segKind[i] !== segKind[start]) {
      const T = tramos[tc++];
      T.a = start;
      T.b = i;
      T.pillar = segKind[start];
      const nominal = (i - start) * seg;
      if (T.pillar < 0) {
        T.straightness = Math.hypot(x[i] - x[start], z[i] - z[start]) / nominal;
      } else {
        let s = 0;
        for (let k = start; k < i; k++)
          s += Math.hypot(x[k + 1] - x[k], z[k + 1] - z[k]);
        T.straightness = s / nominal;
      }
      start = i;
    }
  }
  for (let t = 0; t < tc; t++) {
    const T = tramos[t];
    if (T.pillar >= 0) {
      let nb = -1;
      if (t > 0 && tramos[t - 1].pillar < 0)
        nb = Math.max(nb, tramos[t - 1].straightness);
      if (t < tc - 1 && tramos[t + 1].pillar < 0)
        nb = Math.max(nb, tramos[t + 1].straightness);
      if (nb >= 0) T.straightness = Math.min(T.straightness, nb);
    }
    T.straightness = Math.min(1, T.straightness);
    T.tension = tensionFromStraightness(T.straightness, cfg);
    for (let k = T.a; k < T.b; k++) segRaw[k] = T.tension;
  }
  ch.tramoCount = tc;

  const sm = cfg.chain.tension.smoothing;
  const a = sm > 0 && dt > 0 ? 1 - Math.exp(-sm * dt) : 1;
  let sum = 0,
    mx = 0;
  for (let i = 0; i < n; i++) {
    segT[i] += (segRaw[i] - segT[i]) * a;
    sum += segT[i];
    if (segT[i] > mx) mx = segT[i];
  }
  ch.tension = sum / n;
  ch.tensionMax = mx;
  ch.pathLength = pathLength(ch);
}

// Longitud del segmento (x1,z1)-(x2,z2) que queda dentro del círculo, y su punto medio.
/**
 * @param {number} x1
 * @param {number} z1
 * @param {number} x2
 * @param {number} z2
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @param {import('./tipos.js').Punto} [out]
 * @returns {number}
 */
export function segmentInsideCircle(x1, z1, x2, z2, cx, cz, r, out) {
  const dx = x2 - x1,
    dz = z2 - z1;
  const fx = x1 - cx,
    fz = z1 - cz;
  const A = dx * dx + dz * dz;
  if (A < EPS) return 0;
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;
  const disc = B * B - 4 * A * C;
  if (disc <= 0) return 0;
  const sq = Math.sqrt(disc);
  const t0 = Math.max(0, (-B - sq) / (2 * A));
  const t1 = Math.min(1, (-B + sq) / (2 * A));
  if (t1 <= t0) return 0;
  if (out) {
    const tm = (t0 + t1) / 2;
    out.x = x1 + dx * tm;
    out.z = z1 + dz * tm;
  }
  return (t1 - t0) * Math.sqrt(A);
}

const _mid = { x: 0, z: 0 };

// Daño de la cadena a un cuerpo circular que atraviesa (D-148): por paso,
//   Σ eslabones dentro: escala × tensión × |vel. relativa cadena–cuerpo| × metros dentro × dt.
// Sin combos ni multiplicadores (D-081). `out` recibe el punto de contacto de mayor daño y la tensión máxima en contacto.
/**
 * @param {Cadena} ch
 * @param {import('./tipos.js').Cuerpo} body
 * @param {number} dt
 * @param {Cfg} cfg
 * @param {{ x: number, z: number, maxT: number, touching: boolean }} [out]
 * @returns {number}
 */
export function chainDamageStep(ch, body, dt, cfg, out) {
  const { n, x, z, px, pz, segT } = ch;
  const { scale, maxRelSpeed } = cfg.damage.chain;
  let total = 0,
    best = 0,
    maxT = 0,
    touching = false;
  for (let i = 0; i < n; i++) {
    const len = segmentInsideCircle(
      x[i],
      z[i],
      x[i + 1],
      z[i + 1],
      body.x,
      body.z,
      body.r,
      _mid,
    );
    if (len <= 0) continue;
    touching = true;
    const vx =
      (x[i] - px[i] + (x[i + 1] - px[i + 1])) / (2 * dt) - (body.vx || 0);
    const vz =
      (z[i] - pz[i] + (z[i + 1] - pz[i + 1])) / (2 * dt) - (body.vz || 0);
    const speed = Math.min(maxRelSpeed, Math.hypot(vx, vz));
    const d = scale * segT[i] * speed * len * dt;
    total += d;
    if (segT[i] > maxT) maxT = segT[i];
    if (d > best && out) {
      best = d;
      out.x = _mid.x;
      out.z = _mid.z;
    }
  }
  if (out) {
    out.maxT = maxT;
    out.touching = touching;
  }
  return total;
}
