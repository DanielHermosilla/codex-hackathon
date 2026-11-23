// Bucle de paso fijo con acumulador y tope de dt (regla 5). Sin three.js ni DOM:
// recibe una función `sample(solo)` que devuelve las entradas y la lista de acciones de debug.
// `crearJuego` = greybox del muñeco (hito 1); `crearJuegoJefe` = combate contra un jefe (hito 2).
import {
  createWorld,
  stepWorld,
  emptyInput,
  debugHurt,
  debugKill,
  debugReviveAll,
  SAEL,
  ODO,
} from "../gameplay/mundo.js";
import {
  crearCombate,
  pasoCombate,
  reintentar as reintentarCombate,
} from "../gameplay/combate.js";

/** @typedef {typeof import('./config.js').CONFIG} Config */
/** @typedef {import('./input.js').Entrada} Entrada */
/** @typedef {import('../gameplay/tipos.js').Mundo} Mundo */
/** @typedef {import('../gameplay/tipos.js').Combate} Combate */
/** Muestreo de entrada: las entradas de los dos jugadores y las acciones de debug pendientes. @typedef {(solo: boolean) => { inputs: Entrada[], debug: string[] }} Muestreo */

/**
 * @param {Config} cfg
 * @param {{ solo: boolean, sample: Muestreo, paso: (ins: Entrada[], dt: number) => boolean | void, debug: (acciones: string[]) => void }} deps
 */
function crearBucle(cfg, { solo, sample, paso, debug }) {
  let acc = 0;
  let steps = 0;
  // Pulsaciones de dash pendientes: se guardan hasta que un paso simulado las procese
  // (frames sin paso por el acumulador o pasos congelados por hit-stop no las pierden).
  const pending = [false, false];
  const ins = [emptyInput(), emptyInput()];
  return {
    get steps() {
      return steps;
    },
    resetAcc() {
      acc = 0;
    },
    // dt de frame → N pasos fijos. Devuelve cuántos pasos se dieron.
    /** @param {number} frameDt */
    update(frameDt) {
      const { fixedDt, maxFrameDt, maxStepsPerFrame } = cfg.sim;
      acc += Math.min(Math.max(frameDt, 0), maxFrameDt);
      const { inputs, debug: acciones } = sample(solo);
      debug(acciones);
      for (let i = 0; i < 2; i++) {
        Object.assign(ins[i], inputs[i]);
        if (inputs[i].dash) pending[i] = true;
      }
      let n = 0;
      while (acc >= fixedDt - 1e-9 && n < maxStepsPerFrame) {
        for (let i = 0; i < 2; i++) ins[i].dash = pending[i];
        if (paso(ins, fixedDt)) {
          // consumida: en los pasos siguientes solo cuenta si el botón sigue mantenido
          for (let i = 0; i < 2; i++)
            pending[i] = !!(inputs[i].dashDown ?? inputs[i].dash);
        }
        acc -= fixedDt;
        n++;
      }
      if (n === maxStepsPerFrame) acc = Math.min(acc, fixedDt);
      steps += n;
      return n;
    },
  };
}

/**
 * @param {Mundo} world
 * @param {string} a
 */
function aplicarDebugComun(world, a) {
  if (a === "hurtSael") debugHurt(world, SAEL);
  else if (a === "hurtOdo") debugHurt(world, ODO);
  else if (a === "killSael") debugKill(world, SAEL);
  else if (a === "killOdo") debugKill(world, ODO);
  else if (a === "revive") debugReviveAll(world);
}

/**
 * @param {Config} cfg
 * @param {{ solo?: boolean, sample: Muestreo }} opciones
 */
export function crearJuego(cfg, { solo = false, sample }) {
  let world = createWorld(cfg, { solo });
  /** @param {Record<string, any>} [opts] */
  function reset(opts = {}) {
    world = createWorld(cfg, { solo, ...opts });
    bucle.resetAcc();
  }
  const bucle = crearBucle(cfg, {
    solo,
    sample,
    paso: (ins, dt) => stepWorld(world, ins, dt),
    debug: (acciones) => {
      for (const a of acciones) {
        if (a === "reset") reset();
        else aplicarDebugComun(world, a);
      }
    },
  });
  return {
    get world() {
      return world;
    },
    get steps() {
      return bucle.steps;
    },
    /** @param {number} dt */
    update: (dt) => bucle.update(dt),
    reset,
  };
}

// Combate: el reintento reemplaza el combate entero (estado reproducible por semilla, D-028/D-173).
/**
 * @param {Config} cfg
 * @param {{ solo?: boolean, dificil?: boolean, seed?: number, jefe?: string, sample: Muestreo }} opciones
 */
export function crearJuegoJefe(
  cfg,
  { solo = false, dificil = false, seed = 1, jefe = "mirra", sample },
) {
  let combate = crearCombate(cfg, { jefe, solo, dificil, seed });
  const bucle = crearBucle(cfg, {
    solo,
    sample,
    paso: (ins, dt) => {
      const r = pasoCombate(combate, ins, dt);
      if (combate.pedirReintento) combate = reintentarCombate(combate);
      return r;
    },
    debug: (acciones) => {
      for (const a of acciones) {
        if (a === "reset") reiniciar();
        else aplicarDebugComun(combate.w, a);
      }
    },
  });
  /** @param {boolean} [primeraVez] */
  function reiniciar(primeraVez = false) {
    combate = crearCombate(cfg, {
      jefe,
      solo,
      dificil,
      seed,
      primeraVez,
      reintentos: combate.opts.reintentos,
    });
    bucle.resetAcc();
  }
  return {
    get world() {
      return combate.w;
    },
    get combate() {
      return combate;
    },
    get steps() {
      return bucle.steps;
    },
    /** @param {number} dt */
    update: (dt) => bucle.update(dt),
    reintentar() {
      combate = reintentarCombate(combate);
      bucle.resetAcc();
    },
    reiniciar,
  };
}

// Foto plana del estado para pruebas y HUD (no expone referencias internas).
/** @param {Mundo} world */
export function snapshot(world) {
  const ch = world.chain;
  const tramos = [];
  for (let t = 0; t < ch.tramoCount; t++) {
    const T = ch.tramos[t];
    tramos.push({
      a: T.a,
      b: T.b,
      pillar: T.pillar,
      straightness: T.straightness,
      tension: T.tension,
    });
  }
  return {
    time: world.time,
    solo: world.solo,
    hitstop: world.hitstop,
    solverReverts: world.solverReverts,
    players: world.players.map((p) => ({
      id: p.id,
      x: p.x,
      z: p.z,
      vx: p.vx,
      vz: p.vz,
      face: p.face,
      hp: p.hp,
      alive: p.alive,
      anchored: p.anchored,
      dashing: p.dashT > 0,
      dashCd: p.dashCd,
      hurtT: p.hurtT,
      invulnerable: p.dashT > 0 || p.hurtT > 0,
    })),
    chain: {
      length: ch.length,
      pathLength: ch.pathLength,
      tension: ch.tension,
      tensionMax: ch.tensionMax,
      tramos,
      contacts: Array.from(ch.contact).filter((c) => c >= 0).length,
    },
    dummy: {
      x: world.dummy.x,
      z: world.dummy.z,
      total: world.dummy.total,
      dps: world.dummy.dps,
      byPlayer: [...world.dummy.byPlayer],
      hit: { ...world.dummy.hit },
    },
  };
}
