// Combate contra un jefe: une el mundo de la cadena (mundo.js) con el jefe (jefe.js) y lleva el flujo
// presentación → pelea → derrota | victoria, las stats de la lápida y el reintento. Puro, paso fijo.
//
// D-006/D-064/D-074/D-180 presentación (completa la 1.ª vez, saltable en reintentos);
// Si ambos caen, el combate emite la derrota y la página ofrece volver al inicio.
// Al vencer, el caído revive con vida llena (D-020/D-167) y la lápida muestra las estadísticas.

import {
  crearArenaMirra,
  iniciarAcido,
  iniciarLuz,
  avanzarArenaMirra,
} from "./arena-mirra.js";
import {
  crearRitos,
  iniciarPisoton,
  iniciarBraseros,
  avanzarRitos,
} from "./ritos.js";
import {
  crearFarolero,
  anunciarPrueba,
  actualizarFarolero,
} from "./farolero.js";
import { createWorld, stepWorld } from "./mundo.js";
import { createChain } from "./cadena.js";
import {
  hurtPlayer,
  killPlayer,
  revivePlayer,
  pushOutOfCircle,
  keepInsideCircle,
} from "./jugadores.js";
import {
  crearJefe,
  actualizarJefe,
  registrarDano,
  alMorirJugador,
  cancelarAccion,
  forzarAtaque as forzar,
  ponerVida,
  posObjetivo,
} from "./jefe.js";
import { crearPool, liberarTodo } from "./pool.js";
import { nuevaZona, nuevoProyectil } from "./bloques.js";
import { crearRng } from "../core/rng.js";

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Combate} Combate */
/** @typedef {import('./tipos.js').Entrada} Entrada */

const MAX_EVENTOS = 200;

/**
 * @param {Cfg} cfg
 * @param {import('./tipos.js').OpcionesCombate} [opts]
 * @returns {Combate}
 */
export function crearCombate(cfg, opts = {}) {
  const o = {
    jefe: "mirra",
    solo: false,
    dificil: false,
    seed: 1,
    primeraVez: true,
    reintentos: 0,
    ...opts,
  };
  const def = /** @type {Record<string, any>} */ (cfg.jefes)[o.jefe];
  if (!def) throw new Error(`jefe desconocido: ${o.jefe}`);
  const C = cfg.jefes.comun;
  const L = cfg.chain.length;
  const A = def.arena;
  const pillars = A.pilares.map(
    (
      /** @type {{ id: string, angDeg: number, distL: number, r: number }} */ P,
    ) => {
      const a = (P.angDeg * Math.PI) / 180;
      return {
        id: P.id,
        x: Math.cos(a) * P.distL * L,
        z: Math.sin(a) * P.distL * L,
        r: P.r,
      };
    },
  );
  const jx = A.jefe[0] * L,
    jz = A.jefe[1] * L;
  const w = createWorld(cfg, {
    solo: o.solo,
    sael: [A.sael[0] * L, A.sael[1] * L],
    odo: [A.odo[0] * L, A.odo[1] * L],
    pillars,
    arenaRadius: A.radioL * L,
    dummy: { x: jx, z: jz, r: def.radio },
  });
  const jefe = crearJefe(cfg, def, {
    x: jx,
    z: jz,
    vidaMult: o.solo ? C.vidaSolo : 1,
  });
  const dificultad = o.dificil ? "dificil" : "normal";
  const multSolo = o.solo ? C.telegrafiaSolo : 1;

  const c = /** @type {Combate} */ (
    /** @type {Omit<Combate, 'ctx' | 'golpeRito'>} */ ({
      cfg,
      opts: o,
      id: o.jefe,
      w,
      jefe,
      estado: "presentacion", // presentacion | pelea | derrota | victoria
      resultado: null,
      t: 0,
      tPelea: 0,
      farolero: o.jefe === "farolero" ? crearFarolero(w) : null,
      arenaMirra: crearArenaMirra(),
      ritos: crearRitos(),
      turnoArena: 0,
      proximoRito: cfg.jefes.mirra.ritual.inicio,
      avisoRito: "",
      finAviso: 0,
      presentacion: {
        t: 0,
        T: o.primeraVez ? C.presentacion.primera : C.presentacion.reintento,
        saltable: !o.primeraVez,
      },
      eventos: [],
      frase: null,
      stats: {
        tiempo: 0,
        dano: [0, 0],
        golpes: [0, 0],
        danoRecibido: [0, 0],
        arrastres: [0, 0],
        sinDano: true,
      },
      lapida: null,
      drops: [],
      zonas: crearPool(C.pools.zonas, nuevaZona),
      proyectiles: crearPool(C.pools.proyectiles, nuevoProyectil),
      _kb: [
        { x: 0, z: 0 },
        { x: 0, z: 0 },
      ],
      _vivos: [true, true],
      _prevBy: [0, 0],
      _por: [0, 0],
      _arr: [false, false],
      _arrGap: [0, 0],
      _dashPrev: [false, false],
      _pos: { x: 0, z: 0 },
    })
  );

  // Contexto que reciben jefe.js y los bloques (un solo objeto por combate: nada se crea por paso).
  /** @type {import('./tipos.js').Ctx} */
  const ctx = {
    cfg,
    w,
    jefe,
    L,
    dificultad,
    rng: crearRng(o.seed),
    zonas: c.zonas,
    proyectiles: c.proyectiles,
    tiron: [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ],
    tele: (t) => (typeof t === "number" ? t : t[dificultad]) * multSolo,
    posObjetivo: (acc, out) => posObjetivo(ctx, acc, out),
    golpear: (b, i, dano, empuje, fx, fz, tick) =>
      golpear(c, b, i, dano, empuje, fx, fz, tick),
    emitir: (tipo, datos) => emitir(c, tipo, datos),
    _cand: [],
  };
  c.ctx = ctx;
  c.golpeRito = (i, dano) =>
    golpear(c, { accion: { id: c.avisoRito } }, i, dano, 0, 0, 0);
  w.dummy.invulnerable = true;
  emitir(c, "presentacion_inicio", { jefe: o.jefe, completa: o.primeraVez });
  if (o.primeraVez) emitir(c, "silencio", { motivo: "nombre" }); // D-183: solo la primera vez
  return c;
}

/**
 * @param {Combate} c
 * @param {string} tipo
 * @param {Record<string, any>} [datos]
 * @returns {import('./tipos.js').Evento}
 */
export function emitir(c, tipo, datos = {}) {
  const ev = { tipo, t: c.t, ...datos };
  c.eventos.push(ev);
  if (c.eventos.length > MAX_EVENTOS) c.eventos.shift();
  if (datos.frase)
    c.frase = { clave: datos.frase, t: c.cfg.jefes.comun.fraseDuracion };
  return ev;
}

/**
 * @param {Combate} c
 * @param {{accion: {id: string}}} b
 * @param {number} i
 * @param {number} dano
 * @param {number} empuje
 * @param {number} fx
 * @param {number} fz
 * @param {boolean} [tick]
 * @returns {boolean}
 */
function golpear(c, b, i, dano, empuje, fx, fz, tick) {
  const p = c.w.players[i];
  if (!hurtPlayer(p, dano, c.cfg, tick)) return false;
  c.stats.golpes[i]++;
  c.stats.danoRecibido[i] += dano;
  c.stats.sinDano = false;
  if (empuje > 0) {
    const dx = p.x - fx,
      dz = p.z - fz,
      d = Math.hypot(dx, dz) || 1;
    c._kb[i].x = (dx / d) * empuje;
    c._kb[i].z = (dz / d) * empuje;
  }
  emitir(c, "golpe_jugador", { jugador: i, dano, ataque: b.accion.id });
  return true;
}

/** @param {Combate} c */
export function saltarPresentacion(c) {
  if (c.estado !== "presentacion") return;
  c.estado = "pelea";
  c.w.dummy.invulnerable = Boolean(c.farolero);
  emitir(c, "pelea_inicio", {});
  if (c.farolero) anunciarPrueba(c, c.farolero);
}

// Mueve el cuerpo del jefe según la velocidad que pidió su cerebro y lo pasa al mundo como «muñeco»
// (cuerpo que empuja y que la cadena atraviesa cortando, D-148/D-152).
/**
 * @param {Combate} c
 * @param {number} dt
 */
function moverJefe(c, dt) {
  const { jefe, w } = c;
  const x0 = jefe.x,
    z0 = jefe.z;
  if (jefe.vivo) {
    jefe.x += jefe.vx * dt;
    jefe.z += jefe.vz * dt;
    const pos = c._pos;
    pos.x = jefe.x;
    pos.z = jefe.z;
    for (const P of w.pillars) pushOutOfCircle(pos, P.x, P.z, P.r + jefe.r);
    keepInsideCircle(pos, w.arenaRadius - jefe.r);
    jefe.x = pos.x;
    jefe.z = pos.z;
  }
  const d = w.dummy;
  if (!jefe.vivo) {
    d.x = 1e4;
    d.z = 1e4;
    d.vx = 0;
    d.vz = 0;
    return;
  } // muerta: ya no es cuerpo
  d.x = jefe.x;
  d.z = jefe.z;
  d.vx = (jefe.x - x0) / dt;
  d.vz = (jefe.z - z0) / dt;
}

// Un anclado no se mueve (D-150): si el cuerpo del jefe se le mete encima, cede el jefe.
/** @param {Combate} c */
function cederAnclados(c) {
  const { jefe, w, cfg } = c;
  if (!jefe.vivo) return;
  const pos = c._pos;
  for (const p of w.players) {
    if (!p.anchored) continue;
    pos.x = jefe.x;
    pos.z = jefe.z;
    if (pushOutOfCircle(pos, p.x, p.z, jefe.r + cfg.player.radius)) {
      jefe.x = pos.x;
      jefe.z = pos.z;
      w.dummy.x = jefe.x;
      w.dummy.z = jefe.z;
    }
  }
}

// Deja leer el resultado de la mecha antes del siguiente aviso. El charco se evapora entre ataques.
/** @param {Combate} c */
function especialEnCurso(c) {
  const a = c.arenaMirra;
  return !!(
    c.ritos.tipo ||
    a.acido ||
    a.barril ||
    a.explosion ||
    a.resultadoAcido ||
    a.luz
  );
}

/** @param {Combate} c @param {number} dt */
function pasoArena(c, dt) {
  if (c.tPelea >= c.proximoRito && !especialEnCurso(c)) {
    const { secuencia, intervalo } = c.cfg.jefes.mirra.ritual;
    const { id, aviso } = secuencia[c.turnoArena % secuencia.length];
    if (id === "acido") iniciarAcido(c.arenaMirra, c.ctx);
    if (id === "luz") iniciarLuz(c.arenaMirra, c.ctx);
    if (id === "pisoton") iniciarPisoton(c.ritos, c.w, c.arenaMirra.charcos);
    if (id === "braseros") iniciarBraseros(c.ritos, c.w, c.arenaMirra.charcos);
    c.avisoRito = id;
    c.finAviso = c.tPelea + aviso;
    c.turnoArena++;
    c.proximoRito = c.tPelea + intervalo;
  }
  const ocupado = especialEnCurso(c);
  avanzarArenaMirra(c.arenaMirra, c.ctx, dt);
  avanzarRitos(c.ritos, c.w, dt, c.golpeRito);
  return ocupado;
}

// Un paso fijo. Devuelve false si no simuló (hit-stop), igual que stepWorld.
/**
 * @param {Combate} c
 * @param {Entrada[]} inputs
 * @param {number} dt
 * @returns {boolean}
 */
export function pasoCombate(c, inputs, dt) {
  const { w, jefe, cfg, ctx } = c;
  const C = cfg.jefes.comun;
  // Flanco por jugador: el dash mantenido de uno no tapa la pulsación del otro.
  let dashNuevo = false;
  for (let i = 0; i < 2; i++) {
    const d = !!inputs[i]?.dash;
    if (d && !c._dashPrev[i]) dashNuevo = true;
    c._dashPrev[i] = d;
  }
  // Un dash nuevo corta el hit-stop: responder al botón importa más que la pausa del impacto.
  if (w.hitstop > 0 && dashNuevo) w.hitstop = 0;
  if (w.hitstop > 0) return stepWorld(w, inputs, dt);
  c.t += dt;
  if (c.frase) {
    c.frase.t -= dt;
    if (c.frase.t <= 0) c.frase = null;
  }

  // Orden del paso: el cuerpo se mueve con lo que el jefe decidió el paso anterior, luego el mundo
  // (entrada de los jugadores: el dash pulsado en este paso ya es invulnerable) y al final el jefe
  // decide y resuelve golpes con las posiciones ya resueltas (regresión Codex: dash en el paso del impacto).
  if (c.estado === "presentacion") {
    c.presentacion.t += dt;
    if (
      c.presentacion.t >= c.presentacion.T ||
      (c.presentacion.saltable && dashNuevo)
    )
      saltarPresentacion(c);
  }

  // Empujes de ataques para este paso: tirón (decidido el paso anterior) + empuje de golpes que se frena solo.
  const kf = Math.exp(-C.empujeFrenado * dt);
  for (let i = 0; i < 2; i++) {
    w.ext[i].x = ctx.tiron[i].x + c._kb[i].x;
    w.ext[i].z = ctx.tiron[i].z + c._kb[i].z;
    c._kb[i].x *= kf;
    c._kb[i].z *= kf;
  }
  moverJefe(c, dt);
  w.dummy.invulnerable =
    c.estado !== "pelea" ||
    Boolean(c.farolero) ||
    jefe.invulnerable ||
    !jefe.vivo;
  stepWorld(w, inputs, dt);
  cederAnclados(c);

  // Daño de la cadena al jefe (D-148), atribuido al más cercano al contacto (D-165).
  const by = w.dummy.byPlayer;
  c._por[0] = by[0] - c._prevBy[0];
  c._por[1] = by[1] - c._prevBy[1];
  c._prevBy[0] = by[0];
  c._prevBy[1] = by[1];
  if (c.estado === "pelea") {
    const dmg = w.dummy.lastStep;
    const aplicado = registrarDano(ctx, dmg, w._contact.maxT, c._por);
    if (aplicado > 0 && dmg > 0) {
      c.stats.dano[0] += (aplicado * c._por[0]) / dmg;
      c.stats.dano[1] += (aplicado * c._por[1]) / dmg;
    }
    contarArrastres(c, dt);
  }

  // Cerebro del jefe y golpes. Los bloques escriben el tirón en ctx.tiron para el paso siguiente.
  for (let i = 0; i < 2; i++) {
    ctx.tiron[i].x = 0;
    ctx.tiron[i].z = 0;
  }
  if (c.estado === "pelea") {
    c.tPelea += dt;
    const especial =
      c.id === "mirra" && jefe.vivo && !jefe.sinAtaques && pasoArena(c, dt);
    if (especial && jefe.accion?.tipo === "ataque")
      cancelarAccion(ctx, "especial");
    if (c.farolero && jefe.vivo && !jefe.sinAtaques)
      actualizarFarolero(c, c.farolero, dt);
    actualizarJefe(ctx, dt, especial || Boolean(c.farolero));
  }

  // Caídas.
  for (let i = 0; i < 2; i++) {
    const vivo = w.players[i].alive;
    if (c._vivos[i] && !vivo) {
      emitir(c, "jugador_cae", { jugador: i });
      if (c.estado === "pelea" && w.players[1 - i].alive) alMorirJugador(ctx);
    }
    c._vivos[i] = vivo;
  }
  if (c.estado === "pelea" && !w.players[0].alive && !w.players[1].alive)
    derrota(c);
  if (c.estado === "pelea" && !jefe.vivo) victoria(c);
  return true;
}

/**
 * @param {Combate} c
 * @param {number} dt
 */
function contarArrastres(c, dt) {
  const S = c.cfg.stats.arrastre;
  for (let i = 0; i < 2; i++) {
    if (c.w.drag[i]) {
      if (!c._arr[i]) c.stats.arrastres[i]++;
      c._arr[i] = true;
      c._arrGap[i] = 0;
    } else if (c._arr[i]) {
      c._arrGap[i] += dt;
      if (c._arrGap[i] >= S.gap) c._arr[i] = false;
    }
  }
}

/** @param {Combate} c */
function limpiarEmpujes(c) {
  for (let i = 0; i < 2; i++) {
    c.w.ext[i].x = c.w.ext[i].z = 0;
    c._kb[i].x = c._kb[i].z = 0;
    c.ctx.tiron[i].x = c.ctx.tiron[i].z = 0;
  }
}

/** Retira los avisos, el escudo y el barril temporal al terminar la pelea. El terreno destruido no reaparece.
 * @param {Combate} c */
function cerrarArena(c) {
  const temporal = c.arenaMirra.barril;
  if (temporal) c.w.pillars = c.w.pillars.filter((p) => p !== temporal);
  c.arenaMirra = crearArenaMirra(); // no quedan charcos, luz ni explosiones junto a la lápida
  c.ritos = crearRitos();
  c.avisoRito = "";
}

/** @param {Combate} c */
function derrota(c) {
  cancelarAccion(c.ctx, "derrota");
  cerrarArena(c);
  limpiarEmpujes(c);
  c.jefe.cola.length = 0;
  liberarTodo(c.zonas);
  liberarTodo(c.proyectiles);
  c.estado = "derrota";
  c.resultado = "derrota";
  emitir(c, "silencio", { motivo: "muerte_ambos" }); // D-183
  emitir(c, "derrota", {
    frase: `jefe.${c.jefe.def.textos}.derrota`,
    reiniciaRush: !!c.opts.dificil,
  });
}

/** @param {Combate} c */
function victoria(c) {
  const { w, jefe, cfg } = c;
  cerrarArena(c);
  liberarTodo(c.zonas);
  liberarTodo(c.proyectiles);
  limpiarEmpujes(c);
  c.estado = "victoria";
  c.resultado = "victoria";
  c.stats.tiempo = c.tPelea;
  // D-020/D-167: el caído revive con vida llena al terminar el jefe.
  for (const p of w.players) if (!p.alive) revivePlayer(p, cfg);
  for (let i = 0; i < 2; i++) c._vivos[i] = true;
  // Lápida donde cayó (D-098) y un marcador por jugador (ítems reales en el hito 4).
  const R = w.arenaRadius - 2;
  const d = Math.hypot(jefe.x, jefe.z);
  const k = d > R ? R / d : 1;
  c.lapida = { x: jefe.x * k, z: jefe.z * k, stats: c.stats };
  const ox = 1.8;
  c.drops = [
    { jugador: 0, x: c.lapida.x - ox, z: c.lapida.z + 1.2, placeholder: true },
    { jugador: 1, x: c.lapida.x + ox, z: c.lapida.z + 1.2, placeholder: true },
  ];
  if (c.stats.sinDano)
    c.drops.push({
      jugador: -1,
      x: c.lapida.x,
      z: c.lapida.z + 2.4,
      placeholder: true,
      extra: true,
    }); // D-099
  emitir(c, "victoria", {
    stats: { ...c.stats },
    monedas: jefe.def.monedas ?? 0,
  });
}

// Reintento (D-028, D-167, D-213): mismo jefe, los dos a vida llena, misma semilla (estado reproducible),
// presentación corta y saltable también en difícil. Si en difícil caer los dos debe reiniciar el rush
// (D-029, D-172), eso no lo decide el combate: lo resuelve el flujo de partida (core/flujo.js); el evento
// `derrota` lo avisa con `reiniciaRush`.
/**
 * @param {Combate} c
 * @returns {Combate}
 */
export function reintentar(c) {
  const o = c.opts;
  const r = crearCombate(c.cfg, {
    ...o,
    primeraVez: false, // presentación corta (D-213): la completa solo sale la primera vez
    reintentos: o.reintentos + 1,
  });
  r._dashPrev[0] = r._dashPrev[1] = true; // lo que siga apretado no salta además la presentación: hay que soltarlo
  return r;
}

// Primer combate tras un pasillo (D-020, D-168): cada jugador entra con la vida que traía y el caído sigue
// caído (revive al vencer al jefe, no al cruzar el arco). Las posiciones son las de entrada de la arena.
// Solo para el primer combate: el reintento (`reintentar`) vuelve a empezar con los dos a vida llena.
/**
 * @param {Combate} c  combate recién creado (aún en la presentación)
 * @param {{ hp: number, alive: boolean }[]} jugadores  Sael y Odo al salir del pasillo
 */
export function heredarJugadores(c, jugadores) {
  for (let i = 0; i < 2; i++) {
    const p = c.w.players[i];
    const q = jugadores[i];
    if (!q.alive)
      killPlayer(p); // cadáver unido a la cadena: el otro lo arrastra (D-020)
    else p.hp = Math.min(q.hp, c.cfg.player.maxHp); // puntos: la vida que traía del pasillo
    c._vivos[i] = p.alive; // ya venía caído: no se anuncia otra caída (`jugador_cae`) en el primer paso
  }
}

/**
 * @param {Combate} c
 * @param {string} id
 */
export function forzarAtaque(c, id) {
  if (c.estado === "presentacion") saltarPresentacion(c);
  return forzar(c.ctx, id);
}

/**
 * @param {Combate} c
 * @param {number} hp
 */
export function ponerVidaJefe(c, hp) {
  if (c.estado === "presentacion") saltarPresentacion(c);
  ponerVida(c.ctx, hp);
  if (c.estado === "pelea" && !c.jefe.vivo) victoria(c);
}

// Para pruebas: coloca jugadores (cadena recta entre ellos) y jefe sin pasar por la física.
/**
 * @param {Combate} c
 * @param {{ sael?: number[], odo?: number[], jefe?: number[] }} [pos]  posiciones [x, z]
 */
export function colocarParaPrueba(c, { sael, odo, jefe } = {}) {
  const w = c.w;
  if (sael || odo) {
    const [A, B] = w.players;
    const a = sael ?? [A.x, A.z],
      b = odo ?? [B.x, B.z];
    w.chain = createChain(a[0], a[1], b[0], b[1], c.cfg);
    Object.assign(A, { x: a[0], z: a[1], px: a[0], pz: a[1], vx: 0, vz: 0 });
    Object.assign(B, { x: b[0], z: b[1], px: b[0], pz: b[1], vx: 0, vz: 0 });
  }
  if (jefe) {
    c.jefe.x = jefe[0];
    c.jefe.z = jefe[1];
    w.dummy.x = jefe[0];
    w.dummy.z = jefe[1];
  }
}

// Para pruebas: el planificador no lanza ataques por su cuenta (los forzados siguen funcionando).
/**
 * @param {Combate} c
 * @param {boolean} [on]
 */
export function sinAtaques(c, on = true) {
  c.jefe.pausa = on ? 1e9 : c.jefe.def.pausa;
  c.jefe.sinAtaques = on;
}

// Foto plana para pruebas y HUD.
/** @param {Combate} c */
export function snapshotCombate(c) {
  const j = c.jefe,
    a = j.accion;
  const salida = a?.bloques?.find((b) => b.salida)?.salida;
  return {
    estado: c.estado,
    resultado: c.resultado,
    t: c.t,
    tPelea: c.tPelea,
    dificil: !!c.opts.dificil,
    solo: !!c.opts.solo,
    reintentos: c.opts.reintentos,
    primeraVez: c.opts.primeraVez,
    presentacion: { ...c.presentacion },
    jefe: {
      id: c.id,
      vida: j.hp,
      vidaMax: j.hpMax,
      fase: j.fase + 1,
      vivo: j.vivo,
      invulnerable: j.invulnerable,
      x: j.x,
      z: j.z,
      face: j.face,
      objetivo: j.objetivo,
      pausa: j.pausa,
      tambaleoAcum: j.vsum,
      accion: a
        ? {
            tipo: a.tipo,
            id: a.id,
            etapa: a.etapa,
            t: a.t,
            T: a.T,
            recuperacion: a.recuperacion ?? 0,
            tropezo: !!a.tropezo,
            salida: salida ? { ...salida } : null,
          }
        : null,
      cola: j.cola.map((x) => x.tipo),
    },
    rito: {
      tipo: c.ritos.tipo,
      colorObjetivo: c.ritos.colorObjetivo,
      braseros:
        c.ritos.tipo === "braseros"
          ? c.ritos.braseros.map((f) => ({ ...f }))
          : [],
      escudo: { ...c.ritos.escudo },
    },
    zonas: c.zonas.items
      .filter((z) => z.activo)
      .map((z) => ({
        forma: z.forma,
        etapa: z.etapa,
        x: z.x,
        z: z.z,
        r: z.r,
        ang: z.ang,
        apertura: z.apertura,
        largo: z.largo,
        ancho: z.ancho,
        progreso: z.progreso,
        ataque: z.ataque,
      })),
    pools: {
      zonas: c.zonas.usados,
      proyectiles: c.proyectiles.usados,
      fallos: c.zonas.fallos + c.proyectiles.fallos,
    },
    farolero: c.farolero
      ? {
          ...c.farolero,
          marcas: c.farolero.marcas.map((marca) => ({ ...marca })),
        }
      : null,
    arenaMirra:
      c.id === "mirra"
        ? {
            acido: c.arenaMirra.acido
              ? {
                  ...c.arenaMirra.acido,
                  origen: { ...c.arenaMirra.acido.origen },
                  tiro: { ...c.arenaMirra.acido.tiro },
                }
              : null,
            barril: c.arenaMirra.barril && { ...c.arenaMirra.barril },
            charcos: c.arenaMirra.charcos.map((p) => ({ ...p })),
            mecha: c.arenaMirra.mecha,
            mechaTotal: c.arenaMirra.mechaTotal,
            resultadoAcido: c.arenaMirra.resultadoAcido && {
              ...c.arenaMirra.resultadoAcido,
            },
            explosion: c.arenaMirra.explosion && { ...c.arenaMirra.explosion },
            luz: c.arenaMirra.luz && { ...c.arenaMirra.luz },
          }
        : null,
    pilares: c.w.pillars.map((P) => P.id),
    stats: {
      ...c.stats,
      dano: [...c.stats.dano],
      golpes: [...c.stats.golpes],
      danoRecibido: [...c.stats.danoRecibido],
      arrastres: [...c.stats.arrastres],
    },
    lapida: c.lapida ? { x: c.lapida.x, z: c.lapida.z } : null,
    drops: c.drops.map((d) => ({ ...d })),
    frase: c.frase ? { ...c.frase } : null,
  };
}
