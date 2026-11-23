// Jefe genérico: estado, planificador, acciones (ataques y no-ataques), fases por vida y reacción al
// daño. Puro: sin three.js ni DOM. Todo lo concreto de cada jefe sale de CONFIG.jefes.<id> (regla 2).
//
// Decisiones: D-025/D-153 fases por vida y transición corta e invulnerable; D-091 objetivos;
// D-093/D-155/D-156 tambaleo, destello, burla; D-148 corte por velocidad relativa (en mundo.js);
// D-152 el cuerpo solo empuja; D-163 sin esbirros; D-164 cada ataque da un rol a cada jugador (fichas);
// regla 3: toda acción se cancela en cualquier frame y limpia lo que creó.

import { BLOQUES } from "./bloques.js";

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Ctx} Ctx */
/** @typedef {import('./tipos.js').Jefe} Jefe */
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Accion} Accion */
/** @typedef {import('./tipos.js').Punto} Punto */

/**
 * @param {Cfg} cfg
 * @param {import('./tipos.js').DefJefe} def  datos del jefe (`CONFIG.jefes.<id>`)
 * @param {{ x: number, z: number, vidaMult?: number }} pos
 * @returns {Jefe}
 */
export function crearJefe(cfg, def, { x, z, vidaMult = 1 }) {
  const hpMax = Math.round(def.vida * vidaMult);
  const nVentana = Math.max(
    1,
    Math.round(cfg.jefes.comun.tambaleo.ventana / cfg.sim.fixedDt),
  );
  /** @type {Record<string, number>} */
  const cooldowns = {};
  for (const id of Object.keys(def.ataques)) cooldowns[id] = 0;
  return {
    def,
    hp: hpMax,
    hpMax,
    fase: 0,
    x,
    z,
    vx: 0,
    vz: 0,
    face: Math.PI / 2,
    r: def.radio,
    vivo: true,
    accion: null, // acción en curso (ataque o no-ataque)
    cola: [], // acciones pendientes (p. ej. burla)
    pausa: def.pausa, // s hasta el próximo ataque
    cooldowns,
    invulnerable: false,
    objetivo: -1,
    ventana: new Float64Array(nVentana),
    vi: 0,
    vsum: 0, // daño de los últimos `tambaleo.ventana` s
    reciente: [0, 0], // daño atribuido reciente (D-165) para «el que más daño hace»
    ultimoAtaque: "",
    sinAtaques: false, // pruebas: el planificador no ataca solo
    ataques: 0, // contador (diagnóstico)
  };
}

/** @param {Jefe} j */
const faseDef = (j) => j.def.fases[j.fase];

// ─── Objetivo (D-091) ───
/**
 * @param {Mundo} w
 * @param {number} x
 * @param {number} z
 * @returns {number}  índice del jugador vivo más cercano, o -1
 */
export function masCercano(w, x, z) {
  let best = -1,
    bd = Infinity;
  for (let i = 0; i < 2; i++) {
    const p = w.players[i];
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/**
 * @param {Ctx} ctx
 * @param {string} tipo
 * @returns {number}
 */
export function elegirObjetivo(ctx, tipo) {
  const { w, jefe } = ctx;
  if (tipo === "ambos") return -1;
  if (tipo === "masDano") {
    // P-31 abierta: se usa la atribución por cercanía de D-165 (PROVISIONAL), con memoria corta.
    const [a, b] = jefe.reciente;
    /** @param {number} i */
    const vivo = (i) => w.players[i].alive;
    if (Math.abs(a - b) > 1 && vivo(0) && vivo(1)) return a > b ? 0 : 1;
  }
  return masCercano(w, jefe.x, jefe.z);
}

// Punto al que apunta una acción: el objetivo si vive; si no, el vivo más cercano; `ambos` = punto medio.
/**
 * @param {Ctx} ctx
 * @param {{ objetivo: number } | null} acc
 * @param {Punto} out
 * @returns {Punto}
 */
export function posObjetivo(ctx, acc, out) {
  const { w, jefe } = ctx;
  let i = acc ? acc.objetivo : -1;
  if (acc && i < 0) {
    let n = 0,
      sx = 0,
      sz = 0;
    for (const p of w.players)
      if (p.alive) {
        n++;
        sx += p.x;
        sz += p.z;
      }
    if (n) {
      out.x = sx / n;
      out.z = sz / n;
      return out;
    }
  }
  if (i < 0 || !w.players[i].alive) i = masCercano(w, jefe.x, jefe.z);
  if (i < 0) {
    out.x = jefe.x;
    out.z = jefe.z;
    return out;
  }
  out.x = w.players[i].x;
  out.z = w.players[i].z;
  return out;
}

// ─── Acciones ───
// Ataque: telegrafía → activo → recuperación. Los bloques corren en paralelo dentro del ataque.
/**
 * @param {Ctx} ctx
 * @param {string} id
 * @returns {Accion}
 */
export function iniciarAtaque(ctx, id) {
  const { jefe } = ctx;
  const def = jefe.def.ataques[id];
  if (!def) throw new Error(`ataque desconocido: ${id}`);
  /** @type {Accion} */
  const acc = {
    tipo: "ataque",
    id,
    def,
    etapa: "telegrafia",
    t: 0,
    T: 0,
    recuperacion: def.recuperacion,
    tropezo: false,
    objetivo: elegirObjetivo(ctx, def.objetivo),
    bloques: [],
  };
  jefe.accion = acc;
  jefe.objetivo = acc.objetivo;
  for (const bd of def.bloques) {
    const B = BLOQUES[bd.tipo];
    if (!B) throw new Error(`bloque desconocido: ${bd.tipo}`);
    const b = {
      tipo: bd.tipo,
      def: bd,
      accion: acc,
      golpeados: [false, false],
      zonas: [],
      hecho: false,
      limpio: false,
      telegrafia: B.telegrafia(bd, def, ctx),
      inicioAviso: 0,
    };
    acc.bloques.push(b);
    acc.T = Math.max(acc.T, b.telegrafia);
  }
  for (const b of acc.bloques) {
    b.inicioAviso = acc.T - b.telegrafia;
    BLOQUES[b.tipo].preparar(b, ctx);
    BLOQUES[b.tipo].telegrafia_(b, ctx, 0);
  }
  jefe.ultimoAtaque = id;
  jefe.ataques++;
  jefe.cooldowns[id] = def.cooldown;
  ctx.emitir("telegrafia_inicio", {
    ataque: id,
    sonido: def.sonido,
    duracion: acc.T,
  });
  return acc;
}

// No-ataques (_BLOQUES.md): transicion_fase, destello, burla, tambaleo. Etapa única «activo».
/**
 * @param {Ctx} ctx
 * @param {string} tipo
 * @param {number} T
 * @param {Record<string, any>} [datos]
 * @returns {Accion}
 */
function iniciarNoAtaque(ctx, tipo, T, datos = {}) {
  const { jefe } = ctx;
  const acc = {
    tipo,
    id: tipo,
    etapa: "activo",
    t: 0,
    T,
    bloques: [],
    objetivo: -1,
    ...datos,
  };
  jefe.accion = acc;
  jefe.objetivo = -1;
  if (tipo === "transicion_fase") {
    jefe.invulnerable = true;
    jefe.fase++;
    const F = faseDef(jefe);
    // La gula devora la arena (D-154): los pilares listados desaparecen (D-184).
    if (F.devora?.length)
      ctx.w.pillars = ctx.w.pillars.filter((P) => !F.devora.includes(P.id));
    ctx.emitir("transicion_inicio", {
      fase: jefe.fase,
      devora: F.devora ?? [],
    });
  } else if (tipo === "destello") {
    ctx.emitir("silencio", { motivo: "fase" }); // D-183: el silencio de cambio de fase cae sobre el destello
    ctx.emitir("destello", {});
  } else if (tipo === "burla") {
    ctx.emitir("burla", { frase: `jefe.${jefe.def.textos}.burla` });
  } else if (tipo === "tambaleo") {
    ctx.emitir("tambaleo", {});
  }
  return acc;
}

// Termina la acción en curso y limpia todo lo que creó (regla 3). Idempotente.
/**
 * @param {Ctx} ctx
 * @param {string} [motivo]
 */
export function terminarAccion(ctx, motivo = "fin") {
  const { jefe } = ctx;
  const acc = jefe.accion;
  if (!acc) return;
  try {
    for (const b of acc.bloques) if (!b.limpio) BLOQUES[b.tipo].limpiar(b, ctx);
  } finally {
    if (acc.tipo === "transicion_fase") jefe.invulnerable = false;
    jefe.accion = null;
    jefe.vx = 0;
    jefe.vz = 0;
    if (motivo !== "fin")
      ctx.emitir("accion_cancelada", { accion: acc.id, motivo });
    else if (acc.tipo === "ataque")
      ctx.emitir("ataque_fin", { ataque: acc.id });
    // Qué viene después.
    if (motivo === "fin") {
      if (acc.tipo === "transicion_fase" && faseDef(jefe).destello)
        jefe.cola.unshift({ tipo: "destello" });
      jefe.pausa = jefe.sinAtaques
        ? 1e9
        : jefe.def.pausa * faseDef(jefe).pausaMult;
    }
  }
}

/**
 * @param {Ctx} ctx
 * @param {string} [motivo]
 */
export const cancelarAccion = (ctx, motivo = "cancelada") =>
  terminarAccion(ctx, motivo);

// Para pruebas y depuración: corta lo que haya y lanza el ataque ya (aunque no sea de esta fase).
/**
 * @param {Ctx} ctx
 * @param {string} id
 * @returns {Accion}
 */
export function forzarAtaque(ctx, id) {
  cancelarAccion(ctx, "forzado");
  ctx.jefe.cola.length = 0;
  return iniciarAtaque(ctx, id);
}

/**
 * @param {Ctx} ctx
 * @param {number} dt
 */
function actualizarAccion(ctx, dt) {
  const { jefe } = ctx;
  const acc = /** @type {Accion} */ (jefe.accion);
  acc.t += dt;
  if (acc.tipo !== "ataque") {
    if (acc.t >= acc.T) terminarAccion(ctx, "fin");
    return;
  }
  if (acc.etapa === "telegrafia") {
    for (const b of acc.bloques) BLOQUES[b.tipo].telegrafia_(b, ctx, acc.t);
    if (acc.t >= acc.T - 1e-9) {
      acc.etapa = "activo";
      acc.t = 0;
      for (const b of acc.bloques) BLOQUES[b.tipo].activar(b, ctx);
      ctx.emitir("ataque_activo", { ataque: acc.id });
    }
    return;
  }
  if (acc.etapa === "activo") {
    let todos = true;
    for (const b of acc.bloques) {
      if (!b.hecho) b.hecho = BLOQUES[b.tipo].activo(b, ctx, dt);
      if (b.hecho && !b.limpio) BLOQUES[b.tipo].limpiar(b, ctx);
      todos = todos && b.hecho;
    }
    if (todos) {
      acc.etapa = "recuperacion";
      acc.t = 0;
    }
    return;
  }
  if (acc.t >= /** @type {number} */ (acc.recuperacion))
    terminarAccion(ctx, "fin");
}

// Acercarse al objetivo más cercano entre ataques, sin girar de golpe.
/**
 * @param {Ctx} ctx
 * @param {number} dt
 */
function acercarse(ctx, dt) {
  const { jefe, w, cfg } = ctx;
  const i = masCercano(w, jefe.x, jefe.z);
  if (i < 0) return;
  const p = w.players[i];
  const dx = p.x - jefe.x,
    dz = p.z - jefe.z,
    d = Math.hypot(dx, dz);
  girarHacia(jefe, Math.atan2(dz, dx), dt);
  const hueco = d - jefe.r - cfg.player.radius;
  if (hueco <= jefe.def.distanciaIdealL * ctx.L) return;
  const v = Math.min(jefe.def.velocidad, hueco / dt);
  jefe.vx = Math.cos(jefe.face) * v;
  jefe.vz = Math.sin(jefe.face) * v;
}

/**
 * @param {Jefe} jefe
 * @param {number} ang
 * @param {number} dt
 */
function girarHacia(jefe, ang, dt) {
  const d = Math.atan2(Math.sin(ang - jefe.face), Math.cos(ang - jefe.face));
  const m = jefe.def.giro * dt;
  jefe.face += Math.max(-m, Math.min(m, d));
}

const _o = { x: 0, z: 0 };

// Planificador con RNG (regla 5): un ataque por vez (en la fase 1 nunca dos activos, _BLOQUES.md).
/**
 * @param {Ctx} ctx
 * @returns {string | null}
 */
function elegirAtaque(ctx) {
  const { jefe, rng } = ctx;
  let total = 0;
  const cand = ctx._cand;
  cand.length = 0;
  for (const id of faseDef(jefe).ataques) {
    const a = jefe.def.ataques[id];
    if (jefe.cooldowns[id] > 0) continue;
    if (id === jefe.ultimoAtaque && faseDef(jefe).ataques.length > 1) continue; // no repetir seguido
    const obj = elegirObjetivo(ctx, a.objetivo);
    posObjetivo(ctx, { objetivo: obj }, _o);
    const d = Math.hypot(_o.x - jefe.x, _o.z - jefe.z) - jefe.r;
    if (d > a.alcanceL * ctx.L) continue;
    cand.push(id);
    total += a.peso;
  }
  if (!cand.length) return null;
  let r = rng.next() * total;
  for (const id of cand) {
    r -= jefe.def.ataques[id].peso;
    if (r <= 0) return id;
  }
  return cand[cand.length - 1];
}

// Un paso del cerebro del jefe. Escribe la velocidad deseada en jefe.vx/vz (combate.js la aplica).
/**
 * @param {Ctx} ctx
 * @param {number} dt
 */
export function actualizarJefe(ctx, dt, especial = false) {
  const { jefe } = ctx;
  jefe.vx = 0;
  jefe.vz = 0;
  for (const id in jefe.cooldowns)
    if (jefe.cooldowns[id] > 0)
      jefe.cooldowns[id] = Math.max(0, jefe.cooldowns[id] - dt);
  const k = Math.exp(-dt / ctx.cfg.jefes.comun.masDanoVentana);
  jefe.reciente[0] *= k;
  jefe.reciente[1] *= k;
  if (!jefe.vivo) return;
  if (jefe.accion) {
    actualizarAccion(ctx, dt);
    // Lo encolado (destello tras la transición, burla) empieza sin un paso muerto.
    if (!jefe.accion && jefe.cola.length)
      iniciarCola(ctx, /** @type {{ tipo: string }} */ (jefe.cola.shift()));
    return;
  }
  if (jefe.cola.length) {
    iniciarCola(ctx, /** @type {{ tipo: string }} */ (jefe.cola.shift()));
    return;
  }
  if (especial) return;
  acercarse(ctx, dt);
  jefe.pausa -= dt;
  if (jefe.pausa > 0) return;
  const id = elegirAtaque(ctx);
  if (id) {
    jefe.vx = 0;
    jefe.vz = 0;
    iniciarAtaque(ctx, id);
  }
}

/**
 * @param {Ctx} ctx
 * @param {{ tipo: string }} item
 */
function iniciarCola(ctx, item) {
  const C = ctx.cfg.jefes.comun;
  if (item.tipo === "destello") iniciarNoAtaque(ctx, "destello", C.destello);
  else if (item.tipo === "burla") iniciarNoAtaque(ctx, "burla", C.burla);
}

// Al morir un jugador (no los dos): burla cuando termine lo que esté haciendo (D-093).
/** @param {Ctx} ctx */
export function alMorirJugador(ctx) {
  const { jefe } = ctx;
  if (!jefe.vivo || jefe.cola.some((c) => c.tipo === "burla")) return;
  jefe.cola.push({ tipo: "burla" });
}

// Daño de cadena del paso (ya atribuido por mundo.js, D-165). Aplica fases, tambaleo y muerte.
// `porJugador` = [daño de Sael, daño de Odo] de este paso; `tension` = tensión máx. en contacto.
/**
 * @param {Ctx} ctx
 * @param {number} dmg
 * @param {number} tension
 * @param {number[]} porJugador
 * @returns {number}  daño realmente aplicado
 */
export function registrarDano(ctx, dmg, tension, porJugador) {
  const { jefe, cfg } = ctx;
  const C = cfg.jefes.comun;
  // Ventana deslizante exacta para el tambaleo (D-155): se registra cada paso, también los de 0.
  jefe.vsum -= jefe.ventana[jefe.vi];
  const aplicado = jefe.vivo && !jefe.invulnerable ? Math.min(dmg, jefe.hp) : 0;
  jefe.ventana[jefe.vi] = aplicado;
  jefe.vsum += aplicado;
  jefe.vi = (jefe.vi + 1) % jefe.ventana.length;
  if (aplicado <= 0) return 0;
  jefe.reciente[0] += porJugador[0];
  jefe.reciente[1] += porJugador[1];
  for (const b of jefe.accion?.bloques ?? [])
    BLOQUES[b.tipo].alRecibirDano?.(b, aplicado, tension);

  // Fase siguiente: la vida no baja del umbral hasta que empieza la transición (no se salta una fase).
  const sig = jefe.def.fases[jefe.fase + 1];
  const umbral = sig ? sig.desde * jefe.hpMax : 0;
  jefe.hp = Math.max(umbral, jefe.hp - aplicado);
  if (sig && jefe.hp <= umbral) {
    cancelarAccion(ctx, "fase");
    jefe.cola.length = 0;
    vaciarVentana(jefe);
    iniciarNoAtaque(ctx, "transicion_fase", C.transicion);
    return aplicado;
  }
  if (jefe.hp <= 0) {
    morir(ctx);
    return aplicado;
  }
  // Tambaleo: ~1 s quieta (D-155). No durante la transición ni el destello (ya son ventanas).
  const tipo = jefe.accion?.tipo;
  if (
    jefe.vsum >= C.tambaleo.umbral * jefe.hpMax &&
    tipo !== "destello" &&
    tipo !== "tambaleo"
  ) {
    cancelarAccion(ctx, "tambaleo");
    vaciarVentana(jefe);
    iniciarNoAtaque(ctx, "tambaleo", C.tambaleo.duracion);
  }
  return aplicado;
}

/** @param {Jefe} jefe */
function vaciarVentana(jefe) {
  jefe.ventana.fill(0);
  jefe.vsum = 0;
}

/** @param {Ctx} ctx */
export function morir(ctx) {
  const { jefe } = ctx;
  jefe.hp = 0;
  cancelarAccion(ctx, "muerte");
  jefe.cola.length = 0;
  jefe.vivo = false;
  ctx.emitir("silencio", { motivo: "golpe_final" }); // D-183
  ctx.emitir("jefe_muere", { frase: `jefe.${jefe.def.textos}.muerte` });
}

// Para pruebas: fija la vida. Si cruza el umbral de la fase siguiente, empieza la transición
// (la vida queda en el valor pedido); a 0 muere sin pasar por la transición.
/**
 * @param {Ctx} ctx
 * @param {number} hp
 */
export function ponerVida(ctx, hp) {
  const { jefe } = ctx;
  if (!jefe.vivo) return;
  jefe.hp = Math.max(0, Math.min(jefe.hpMax, hp));
  if (jefe.hp <= 0) {
    morir(ctx);
    return;
  }
  const sig = jefe.def.fases[jefe.fase + 1];
  if (sig && jefe.hp <= sig.desde * jefe.hpMax) {
    cancelarAccion(ctx, "fase");
    jefe.cola.length = 0;
    vaciarVentana(jefe);
    iniciarNoAtaque(ctx, "transicion_fase", ctx.cfg.jefes.comun.transicion);
  }
}
