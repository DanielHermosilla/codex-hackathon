// Catálogo de bloques de ataque (docs/atados/diseno/jefes/_BLOQUES.md). Puro: sin three.js ni DOM.
// Un jefe es datos en config que combinan estos bloques (regla 2). Cada bloque se puede cancelar en
// cualquier frame: `limpiar` es idempotente y libera todo lo que el bloque pidió a los pools (regla 3).
//
// Ciclo de un bloque dentro de un ataque (lo maneja jefe.js):
//   preparar (inicio de la telegrafía) → telegrafia(t) → activar → activo(dt) hasta `true` → limpiar.
// Cada bloque tiene su propia telegrafía; la del ataque es la más larga y el aviso de cada bloque
// aparece `inicioAviso` segundos después del inicio, para que todos golpeen a la vez.
//
// ctx (lo arma combate.js): { cfg, w, jefe, rng, L, tele(t), zonas, proyectiles, tiron[2], posObjetivo(acc, out),
//   golpear(b, i, dano, empuje, desdeX, desdeZ, tick) }

import { adquirir, liberarDe } from "./pool.js";

/** @typedef {import('./tipos.js').Zona} Zona */
/** @typedef {import('./tipos.js').Bloque} Bloque */
/** @typedef {import('./tipos.js').Ctx} Ctx */
/** @typedef {import('./tipos.js').DefBloque} DefBloque */

const TAU = Math.PI * 2;
/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ─── Geometría de zonas (el centro del jugador decide; telegrafía = área exacta del golpe) ───
/**
 * @param {number} px
 * @param {number} pz
 * @param {Zona} z
 * @returns {boolean}
 */
export function dentroCirculo(px, pz, z) {
  return Math.hypot(px - z.x, pz - z.z) <= z.r;
}
/**
 * @param {number} px
 * @param {number} pz
 * @param {Zona} z
 * @returns {boolean}
 */
export function dentroSector(px, pz, z) {
  const d = Math.hypot(px - z.x, pz - z.z);
  if (d > z.r) return false;
  return (
    Math.abs(angDiff(Math.atan2(pz - z.z, px - z.x), z.ang)) <= z.apertura / 2
  );
}
// Rectángulo que sale de (x,z) en la dirección `ang`, largo `largo` (o hasta `frente` si se da), ancho `ancho`.
// `atras` (opcional) recorta el inicio: solo cuenta desde ahí (la carga solo daña el tramo que barre ahora).
/**
 * @param {number} px
 * @param {number} pz
 * @param {Zona} z
 * @param {number} [frente]
 * @param {number} [atras]
 * @returns {boolean}
 */
export function dentroRect(px, pz, z, frente = z.largo, atras = z.atras ?? 0) {
  const ux = Math.cos(z.ang),
    uz = Math.sin(z.ang);
  const dx = px - z.x,
    dz = pz - z.z;
  const a = dx * ux + dz * uz;
  const p = -dx * uz + dz * ux;
  return (
    a >= atras && a <= Math.min(z.largo, frente) && Math.abs(p) < z.ancho / 2
  );
}
/**
 * @param {number} px
 * @param {number} pz
 * @param {Zona} z
 * @returns {boolean}
 */
export function dentroZona(px, pz, z) {
  if (z.forma === "circulo") return dentroCirculo(px, pz, z);
  if (z.forma === "sector") return dentroSector(px, pz, z);
  return dentroRect(px, pz, z, z.frente);
}

// Fábricas para los pools (forma fija de objeto: no se crean propiedades nuevas en caliente).
/** @returns {Zona} */
export const nuevaZona = () => ({
  forma: "circulo",
  etapa: "espera", // espera | aviso | activa
  x: 0,
  z: 0,
  r: 0,
  ang: 0,
  apertura: 0,
  largo: 0,
  ancho: 0,
  frente: 0,
  atras: 0,
  progreso: 0,
  sentido: 1,
  ataque: "",
});
/** @returns {import('./tipos.js').Proyectil} */
export const nuevoProyectil = () => ({
  x0: 0,
  z0: 0,
  x1: 0,
  z1: 0,
  t: 0,
  altura: 0,
  ataque: "",
});

/**
 * @param {Ctx} ctx
 * @param {Bloque} b
 * @param {string} forma
 * @returns {(Zona & import('./tipos.js').ItemPool) | null}
 */
function pedirZona(ctx, b, forma) {
  const z = adquirir(ctx.zonas, b);
  if (!z) return null;
  Object.assign(z, nuevaZona());
  z.forma = forma;
  z.ataque = b.accion.id;
  b.zonas.push(z);
  return z;
}

// Avance del aviso propio del bloque dentro de la telegrafía del ataque.
/**
 * @param {Bloque} b
 * @param {number} t
 * @returns {number}
 */
function avisar(b, t) {
  const dur = b.telegrafia;
  const k = dur > 0 ? Math.min(1, Math.max(0, (t - b.inicioAviso) / dur)) : 1;
  const visible = t >= b.inicioAviso - 1e-9;
  for (const z of b.zonas) {
    if (z.etapa === "activa") continue;
    z.etapa = visible ? "aviso" : "espera";
    z.progreso = k;
  }
  return k;
}
/** @param {Bloque} b */
function activarZonas(b) {
  for (const z of b.zonas) {
    z.etapa = "activa";
    z.progreso = 1;
  }
}

// Golpea a cada jugador vivo dentro de la zona una sola vez por golpe del bloque.
/**
 * @param {Ctx} ctx
 * @param {Bloque} b
 * @param {Zona} z
 * @param {number} dano
 * @param {number} empuje
 * @param {boolean} [tick]
 */
function golpearEnZona(ctx, b, z, dano, empuje, tick = false) {
  for (let i = 0; i < 2; i++) {
    const p = ctx.w.players[i];
    if (!p.alive || (!tick && b.golpeados[i])) continue;
    if (!dentroZona(p.x, p.z, z)) continue;
    if (ctx.golpear(b, i, dano, empuje, z.x, z.z, tick) && !tick)
      b.golpeados[i] = true;
  }
}

// Golpe de un barrido: franja angular [f0, f1] del arco (0 = borde de salida según `sentido`).
/**
 * @param {Ctx} ctx
 * @param {Bloque} b
 * @param {Zona} z
 * @param {number} f0
 * @param {number} f1
 * @param {number} dano
 * @param {number} empuje
 */
function golpearBarrido(ctx, b, z, f0, f1, dano, empuje) {
  for (let i = 0; i < 2; i++) {
    const p = ctx.w.players[i];
    if (!p.alive || b.golpeados[i]) continue;
    if (Math.hypot(p.x - z.x, p.z - z.z) > z.r) continue;
    const rel = angDiff(Math.atan2(p.z - z.z, p.x - z.x), z.ang) * z.sentido; // -apertura/2 … +apertura/2
    if (Math.abs(rel) > z.apertura / 2) continue;
    const f = rel / z.apertura + 0.5;
    if (f < f0 - 1e-9 || f > f1 + 1e-9) continue;
    if (ctx.golpear(b, i, dano, empuje, z.x, z.z, false)) b.golpeados[i] = true;
  }
}

/**
 * @param {Bloque} b
 * @param {Ctx} ctx
 */
function limpiarBase(b, ctx) {
  liberarDe(ctx.zonas, b);
  liberarDe(ctx.proyectiles, b);
  b.zonas.length = 0;
  b.limpio = true;
}

const _o = { x: 0, z: 0 };

// ─── Colocación de impactos «alrededor de los dos» con una salida garantizada (ficha Mirra: Grano) ───
// Elige un punto de salida S alcanzable por los dos durante la telegrafía (ninguno lo tiene más lejos
// que lo que recorre en ese tiempo × margen) y libre de obstáculos; ningún impacto toca un disco de
// radio `salidaRadio` alrededor de S, donde caben los dos con la cadena puesta. Devuelve S en `salida`.
/**
 * @param {Ctx} ctx
 * @param {Record<string, any>} def  definición del bloque (`salidaMargen`, `salidaRadio`, `dispersionL`…)
 * @param {number} cantidad
 * @param {number} r  radio de cada impacto
 * @param {number} telegrafia
 * @param {Float64Array | number[]} out  pares x,z de los impactos
 * @param {{ x: number, z: number, r: number }} salida
 * @returns {number}
 */
export function colocarAlrededorAmbos(
  ctx,
  def,
  cantidad,
  r,
  telegrafia,
  out,
  salida,
) {
  const { w, rng, L, cfg } = ctx;
  const vivos = w.players.filter((p) => p.alive);
  const ref = vivos.length ? vivos : w.players;
  const A = ref[0],
    B = ref[ref.length - 1];
  const mx = (A.x + B.x) / 2,
    mz = (A.z + B.z) / 2;
  const alcance = cfg.player.moveSpeed * telegrafia * def.salidaMargen;
  const rs = def.salidaRadio;
  /**
   * @param {number} x
   * @param {number} z
   * @param {number} margen
   * @returns {boolean}
   */
  const libre = (x, z, margen) => {
    if (Math.hypot(x, z) > w.arenaRadius - margen) return false;
    for (const P of w.pillars)
      if (Math.hypot(x - P.x, z - P.z) < P.r + margen) return false;
    return Math.hypot(x - w.dummy.x, z - w.dummy.z) >= w.dummy.r + margen;
  };
  // 1) Salida: anillo de candidatos alrededor del punto medio, empezando en un ángulo al azar.
  let sx = mx,
    sz = mz,
    ok = false;
  const th0 = rng.next() * TAU;
  for (const dist of [r + rs + 0.4, (r + rs) * 1.6, 0.6 * (r + rs)]) {
    for (let k = 0; k < 12 && !ok; k++) {
      const th = th0 + (k * TAU) / 12;
      const x = mx + Math.cos(th) * dist,
        z = mz + Math.sin(th) * dist;
      if (!libre(x, z, rs)) continue;
      if (
        Math.hypot(A.x - x, A.z - z) > alcance ||
        Math.hypot(B.x - x, B.z - z) > alcance
      )
        continue;
      sx = x;
      sz = z;
      ok = true;
    }
    if (ok) break;
  }
  salida.x = sx;
  salida.z = sz;
  salida.r = rs;
  // 2) Impactos: primero sobre cada jugador, luego al azar alrededor; nunca sobre la salida.
  const sep = Math.hypot(A.x - B.x, A.z - B.z);
  const disp = sep / 2 + def.dispersionL * L;
  let n = 0;
  for (let s = 0; s < cantidad; s++) {
    for (let intento = 0; intento < 10; intento++) {
      let x, z;
      const sobre = s < 2 ? (s === 0 ? A : B) : null;
      if (sobre && intento < 4) {
        x = sobre.x + rng.range(-0.5, 0.5) * r * (intento + 1) * 0.5;
        z = sobre.z + rng.range(-0.5, 0.5) * r * (intento + 1) * 0.5;
      } else {
        const a = rng.next() * TAU,
          d = Math.sqrt(rng.next()) * disp;
        x = mx + Math.cos(a) * d;
        z = mz + Math.sin(a) * d;
      }
      const lim = w.arenaRadius - r * 0.5;
      const dc = Math.hypot(x, z);
      if (dc > lim) {
        x *= lim / dc;
        z *= lim / dc;
      }
      if (Math.hypot(x - sx, z - sz) < r + rs) continue;
      out[n * 2] = x;
      out[n * 2 + 1] = z;
      n++;
      break;
    }
  }
  return n;
}

// ─── Bloques de ataque ───
/** @type {Record<string, DefBloque>} */
export const BLOQUES = {
  // Golpe que recorre un arco frente al jefe. `vueltas` 2 = ida y vuelta, con nuevo aviso `entre`.
  barrido: {
    telegrafia: (d, a, ctx) => ctx.tele(d.telegrafia ?? a.telegrafia),
    preparar(b, ctx) {
      const d = b.def,
        j = ctx.jefe;
      ctx.posObjetivo(b.accion, _o);
      const z = pedirZona(ctx, b, "sector");
      b.dir = Math.atan2(_o.z - j.z, _o.x - j.x);
      b.vuelta = 0;
      b.sub = "golpe";
      b.subT = 0;
      if (!z) return;
      z.x = j.x;
      z.z = j.z;
      z.r = d.radioL * ctx.L;
      z.apertura = (d.angulo * Math.PI) / 180;
      z.ang = b.dir;
    },
    telegrafia_(b, ctx, t) {
      avisar(b, t);
      ctx.jefe.face = b.dir;
      const z = b.zonas[0];
      if (z) {
        z.x = ctx.jefe.x;
        z.z = ctx.jefe.z;
      }
    },
    activar(b) {
      activarZonas(b);
      // El filo parte del borde inicial en el primer cuadro activo. 0 = aún no cruzó el sector.
      const z = b.zonas[0];
      if (z) z.progreso = 0;
      b.sub = "golpe";
      b.subT = 0;
      b.golpeados[0] = b.golpeados[1] = false;
    },
    activo(b, ctx, dt) {
      const d = b.def,
        z = b.zonas[0];
      b.subT += dt;
      if (z) {
        z.x = ctx.jefe.x;
        z.z = ctx.jefe.z;
      }
      if (b.sub === "golpe") {
        // La hoja recorre el arco de un borde al otro en `activo` s: golpea a quien está en la franja
        // que barre este paso. Quien dashea cuando la hoja pasa no recibe nada (D-014): la hoja ya pasó.
        const f0 = Math.min(1, (b.subT - dt) / d.activo),
          f1 = Math.min(1, b.subT / d.activo);
        if (z) {
          z.progreso = f1;
          golpearBarrido(ctx, b, z, f0, f1, d.dano, d.empuje);
        }
        if (b.subT < d.activo) return false;
        b.vuelta++;
        if (b.vuelta >= (d.vueltas ?? 1)) return true;
        // Segundo barrido: se vuelve a avisar (más corto) y se re-apunta al objetivo.
        b.sub = "entre";
        b.subT = 0;
        b.entre = ctx.tele(d.entre);
        ctx.posObjetivo(b.accion, _o);
        b.dir = Math.atan2(_o.z - ctx.jefe.z, _o.x - ctx.jefe.x);
        if (z) {
          z.etapa = "aviso";
          z.progreso = 0;
          z.ang = b.dir;
          z.sentido = -z.sentido;
        }
        return false;
      }
      ctx.jefe.face = b.dir;
      if (z) z.progreso = Math.min(1, b.subT / b.entre);
      if (b.subT >= b.entre) {
        b.sub = "golpe";
        b.subT = 0;
        b.golpeados[0] = b.golpeados[1] = false;
        if (z) {
          z.etapa = "activa";
          z.progreso = 0; // el segundo filo también empieza en su propio borde de salida
        }
      }
      return false;
    },
    limpiar: limpiarBase,
  },

  // Círculos en el suelo que estallan tras el aviso.
  zona_circular: {
    telegrafia: (d, a, ctx) => ctx.tele(d.telegrafia ?? a.telegrafia),
    preparar(b, ctx) {
      const d = b.def,
        j = ctx.jefe,
        r = d.radioL * ctx.L;
      const n = d.cantidad ?? 1;
      if (d.posicion === "alrededorAmbos") {
        b.salida = { x: 0, z: 0, r: 0 };
        const pos = new Float64Array(n * 2);
        const k = colocarAlrededorAmbos(
          ctx,
          d,
          n,
          r,
          b.telegrafia,
          pos,
          b.salida,
        );
        for (let i = 0; i < k; i++) {
          const z = pedirZona(ctx, b, "circulo");
          if (z) {
            z.x = pos[i * 2];
            z.z = pos[i * 2 + 1];
            z.r = r;
          }
        }
        return;
      }
      ctx.posObjetivo(b.accion, _o);
      for (let i = 0; i < n; i++) {
        const z = pedirZona(ctx, b, "circulo");
        if (!z) continue;
        z.r = r;
        if (d.posicion === "jefe") {
          z.x = j.x;
          z.z = j.z;
        } else {
          z.x = _o.x;
          z.z = _o.z;
        }
      }
      b.sigueJefe = d.posicion === "jefe";
    },
    telegrafia_(b, ctx, t) {
      avisar(b, t);
      if (b.sigueJefe)
        for (const z of b.zonas) {
          z.x = ctx.jefe.x;
          z.z = ctx.jefe.z;
        }
    },
    activar(b) {
      activarZonas(b);
      b.t = 0;
    },
    activo(b, ctx, dt) {
      b.t += dt;
      for (const z of b.zonas)
        golpearEnZona(ctx, b, z, b.def.dano, b.def.empuje);
      return b.t >= b.def.activo;
    },
    limpiar: limpiarBase,
  },

  // Lanzamiento parabólico que cae sobre zonas circulares marcadas; al caer deja púas `activo` s.
  proyectil_arco: {
    telegrafia: (d, a, ctx) => ctx.tele(d.telegrafia ?? a.telegrafia),
    preparar(b, ctx) {
      const d = b.def,
        j = ctx.jefe,
        r = d.radioImpactoL * ctx.L;
      b.salida = { x: 0, z: 0, r: 0 };
      const pos = new Float64Array(d.cantidad * 2);
      const n = colocarAlrededorAmbos(
        ctx,
        d,
        d.cantidad,
        r,
        b.telegrafia,
        pos,
        b.salida,
      );
      for (let i = 0; i < n; i++) {
        const z = pedirZona(ctx, b, "circulo");
        if (!z) continue;
        z.x = pos[i * 2];
        z.z = pos[i * 2 + 1];
        z.r = r;
        const p = adquirir(ctx.proyectiles, b);
        if (!p) continue;
        p.x0 = j.x;
        p.z0 = j.z;
        p.x1 = z.x;
        p.z1 = z.z;
        p.t = -1;
        p.altura = 0;
        p.ataque = b.accion.id;
      }
      b.vuelo = Math.min(d.vuelo, b.telegrafia);
    },
    telegrafia_(b, ctx, t) {
      avisar(b, t);
      // Vuelan durante el final del aviso y llegan justo al golpe (t = -1: aún en la boca).
      const T = b.inicioAviso + b.telegrafia;
      const k = (t - (T - b.vuelo)) / b.vuelo;
      let enVuelo = 0; // proyectiles de este bloque que existen (sin ninguno, no hay nada que oír)
      for (const p of ctx.proyectiles.items)
        if (p.activo && p.dueno === b) {
          p.t = k < 0 ? -1 : Math.min(1, k);
          enVuelo++;
        }
      // Primer paso del vuelo: aviso para el audio (el silbido dura `b.vuelo` s y acaba en el impacto).
      if (k >= 0 && !b.enVuelo && enVuelo > 0) {
        b.enVuelo = true;
        ctx.emitir("proyectil_vuelo", {
          ataque: b.accion.id,
          duracion: Math.max(0, T - t), // s que faltan hasta el impacto
        });
      }
    },
    activar(b, ctx) {
      liberarDe(ctx.proyectiles, b);
      activarZonas(b);
      b.t = 0;
    },
    activo(b, ctx, dt) {
      b.t += dt;
      for (const z of b.zonas)
        golpearEnZona(ctx, b, z, b.def.dano, b.def.empuje);
      return b.t >= b.def.activo;
    },
    limpiar: limpiarBase,
  },

  // Embestida en línea recta. Si la cadena tensa la corta durante la carga, tropieza (D-148, ficha).
  carga: {
    telegrafia: (d, a, ctx) => ctx.tele(d.telegrafia ?? a.telegrafia),
    preparar(b, ctx) {
      const d = b.def,
        j = ctx.jefe,
        w = ctx.w;
      ctx.posObjetivo(b.accion, _o);
      b.dir = Math.atan2(_o.z - j.z, _o.x - j.x);
      const ux = Math.cos(b.dir),
        uz = Math.sin(b.dir);
      // Recorrido real: hasta la distancia, el borde de la arena o el primer pilar (la marca = el recorrido).
      let largo = d.distanciaL * ctx.L;
      const R = w.arenaRadius - j.r;
      const bq = j.x * ux + j.z * uz,
        cq = j.x * j.x + j.z * j.z - R * R;
      const tBorde = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
      largo = Math.min(largo, Math.max(0, tBorde));
      for (const P of w.pillars) {
        const rr = P.r + j.r;
        const fx = j.x - P.x,
          fz = j.z - P.z;
        const bb = fx * ux + fz * uz,
          cc = fx * fx + fz * fz - rr * rr;
        const disc = bb * bb - cc;
        if (disc <= 0) continue;
        const tp = -bb - Math.sqrt(disc);
        if (tp > 0) largo = Math.min(largo, tp);
      }
      b.largo = largo;
      b.sx = j.x;
      b.sz = j.z;
      b.recorrido = 0;
      b.tropezo = false;
      b.dano = 0;
      const z = pedirZona(ctx, b, "rect");
      // Alcance por delante del centro: cuerpo + jugador (el cuerpo empuja al jugador hasta ahí antes de
      // que se resuelva el golpe; regresión Codex) + holgura.
      b.alcance = j.r + ctx.cfg.player.radius + 0.1;
      if (!z) return;
      // La marca empieza en el centro del jefe y cubre todo lo que puede golpear.
      z.x = j.x;
      z.z = j.z;
      z.ang = b.dir;
      z.largo = largo + b.alcance;
      z.ancho = d.anchoL * ctx.L;
      z.frente = 0;
    },
    telegrafia_(b, ctx, t) {
      avisar(b, t);
      ctx.jefe.face = b.dir;
    },
    activar(b) {
      activarZonas(b);
      b.ultimo = -1;
    },
    activo(b, ctx, dt) {
      const d = b.def,
        j = ctx.jefe,
        z = b.zonas[0];
      b.recorrido =
        (j.x - b.sx) * Math.cos(b.dir) + (j.z - b.sz) * Math.sin(b.dir);
      // Bloqueado (no avanzó el paso anterior pese a querer) o llegó: termina.
      const atascado =
        b.ultimo >= 0 && b.recorrido - b.ultimo < d.velocidad * dt * 0.1;
      const previo = b.ultimo >= 0 ? b.ultimo : b.recorrido;
      b.ultimo = b.recorrido;
      // Golpea solo lo que el cuerpo barre en este paso (de la cola en la posición anterior al frente
      // actual); lo que ya quedó atrás es seguro (regresión Codex). La marca sigue mostrando la línea entera.
      if (z) {
        z.frente = b.recorrido + b.alcance;
        z.atras = Math.max(0, previo - j.r);
        golpearEnZona(ctx, b, z, d.dano, d.empuje);
      }
      if (b.tropezo || atascado || b.recorrido >= b.largo - 1e-6) {
        j.vx = 0;
        j.vz = 0;
        return true;
      }
      const resto = Math.min(d.velocidad, (b.largo - b.recorrido) / dt);
      j.vx = Math.cos(b.dir) * resto;
      j.vz = Math.sin(b.dir) * resto;
      j.face = b.dir;
      return false;
    },
    // jefe.js avisa del daño de cadena recibido durante la acción.
    alRecibirDano(b, dano, tension) {
      if (b.accion.etapa !== "activo") return;
      b.dano += dano;
      const T = b.def.tropiezo;
      if (T && !b.tropezo && b.dano >= T.danoMin && tension >= T.tensionMin) {
        b.tropezo = true;
        b.accion.recuperacion = Math.max(
          /** @type {number} */ (b.accion.recuperacion),
          T.duracion,
        );
        b.accion.tropezo = true;
      }
    },
    limpiar(b, ctx) {
      ctx.jefe.vx = 0;
      ctx.jefe.vz = 0;
      limpiarBase(b, ctx);
    },
  },

  // Zona que persigue al objetivo, más lenta que el jugador. Es un área, no esbirros (D-163).
  zona_movil: {
    telegrafia: (d, a, ctx) => ctx.tele(d.telegrafia ?? a.telegrafia),
    preparar(b, ctx) {
      const z = pedirZona(ctx, b, "circulo");
      b.tick = [0, 0];
      if (!z) return;
      z.x = ctx.jefe.x;
      z.z = ctx.jefe.z;
      z.r = b.def.radioL * ctx.L;
    },
    telegrafia_(b, ctx, t) {
      avisar(b, t);
    },
    activar(b) {
      activarZonas(b);
      b.t = 0;
      b.tick[0] = b.tick[1] = 0;
    },
    activo(b, ctx, dt) {
      const d = b.def,
        z = b.zonas[0];
      b.t += dt;
      if (z) {
        ctx.posObjetivo(b.accion, _o);
        const dx = _o.x - z.x,
          dz = _o.z - z.z,
          dist = Math.hypot(dx, dz);
        const v = d.velocidadRelativa * ctx.cfg.player.moveSpeed * dt;
        if (dist > 1e-6) {
          const s = Math.min(v, dist) / dist;
          z.x += dx * s;
          z.z += dz * s;
        }
        for (let i = 0; i < 2; i++) {
          const p = ctx.w.players[i];
          if (!p.alive || !dentroCirculo(p.x, p.z, z)) {
            b.tick[i] = 0;
            continue;
          }
          b.tick[i] += dt;
          // 30 pasos de 1/60 s suman medio segundo con un pequeño error de coma flotante.
          if (b.tick[i] >= d.tick - 1e-9) {
            b.tick[i] = Math.max(0, b.tick[i] - d.tick);
            ctx.golpear(b, i, d.danoPorTick, 0, z.x, z.z, true);
          }
        }
      }
      return b.t >= d.duracion;
    },
    limpiar: limpiarBase,
  },

  // Atrae a los jugadores hacia el jefe durante los últimos `duracion` s de la telegrafía.
  // No daña. Correr en contra lo vence; anclado se reduce (D-122), no se anula (D-150).
  tiron_radial: {
    telegrafia: (d) => d.duracion,
    // Escribe en ctx.tiron (combate.js lo pasa al mundo en el paso siguiente). `aporte` = lo que sumó en
    // el último paso, para quitarlo si se cancela o al morder.
    preparar(b) {
      b.tirando = false;
      b.aporte = [0, 0, 0, 0];
    },
    telegrafia_(b, ctx, t) {
      b.aporte.fill(0);
      b.tirando = t >= b.inicioAviso;
      if (!b.tirando) return;
      const d = b.def,
        j = ctx.jefe,
        R = d.alcanceL * ctx.L;
      for (let i = 0; i < 2; i++) {
        const p = ctx.w.players[i];
        const dx = j.x - p.x,
          dz = j.z - p.z,
          dist = Math.hypot(dx, dz);
        if (dist > R || dist < 1e-6) continue;
        const ax = (dx / dist) * d.fuerza,
          az = (dz / dist) * d.fuerza;
        ctx.tiron[i].x += ax;
        ctx.tiron[i].z += az;
        b.aporte[i * 2] = ax;
        b.aporte[i * 2 + 1] = az;
      }
    },
    activar(b, ctx) {
      /** @type {Required<DefBloque>} */ (BLOQUES.tiron_radial).quitarAporte(
        b,
        ctx,
      );
      b.tirando = false;
    },
    activo() {
      return true;
    },
    quitarAporte(b, ctx) {
      if (!b.aporte) return;
      for (let i = 0; i < 2; i++) {
        ctx.tiron[i].x -= b.aporte[i * 2];
        ctx.tiron[i].z -= b.aporte[i * 2 + 1];
      }
      b.aporte.fill(0);
    },
    limpiar(b, ctx) {
      // Quita el tirón que ya había dejado preparado para el paso siguiente (regla 3).
      /** @type {Required<DefBloque>} */ (BLOQUES.tiron_radial).quitarAporte(
        b,
        ctx,
      );
      b.tirando = false;
      limpiarBase(b, ctx);
    },
  },
};

// Nombres de los bloques que no son ataques (los maneja jefe.js como acciones con duración).
export const ACCIONES = ["transicion_fase", "destello", "burla", "tambaleo"];
