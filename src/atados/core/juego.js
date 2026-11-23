// Bucle de paso fijo con acumulador y tope de dt (regla 5). Sin three.js ni DOM:
// recibe una función `sample(solo)` que devuelve las entradas y la lista de acciones de debug.
// `crearJuego` = greybox del muñeco (hito 1); `crearJuegoJefe` = combate contra un jefe (hito 2);
// `crearJuegoRecorrido` = lobby + pasillo de subida (D-204 a D-211).
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
import {
  crearRecorrido,
  pasoRecorrido,
  reiniciarPasillo,
} from "../gameplay/recorrido.js";

/** @typedef {typeof import('./config.js').CONFIG} Config */
/** @typedef {import('./input.js').Entrada} Entrada */
/** @typedef {import('../gameplay/tipos.js').Mundo} Mundo */
/** @typedef {import('../gameplay/tipos.js').Combate} Combate */
/** Muestreo de entrada: las entradas de los dos jugadores y las acciones de debug pendientes. @typedef {(solo: boolean) => { inputs: Entrada[], debug: string[] }} Muestreo */

/**
 * @param {Config} cfg
 * @param {{ solo: boolean, sample: Muestreo, paso: (ins: Entrada[], dt: number) => boolean | void, debug: (acciones: string[]) => void }} deps
 */
export function crearBucle(cfg, { solo, sample, paso, debug }) {
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
export function aplicarDebugComun(world, a) {
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
// Cada reemplazo por reintento o reinicio explícito pasa los
// eventos que el combate viejo aún no entregó al principio de la lista del nuevo: quien lee
// `combate.eventos` no pierde ninguno aunque haya varios reemplazos entre dos lecturas.
/**
 * @param {Config} cfg
 * @param {{ solo?: boolean, dificil?: boolean, seed?: number, jefe?: string, primeraVez?: boolean, sample: Muestreo }} opciones
 */
export function crearJuegoJefe(
  cfg,
  {
    solo = false,
    dificil = false,
    seed = 1,
    jefe = "mirra",
    primeraVez = true,
    sample,
  },
) {
  let combate = crearCombate(cfg, { jefe, solo, dificil, seed, primeraVez });
  /**
   * Cambia el combate en curso conservando sus eventos pendientes (van delante de los del nuevo).
   * Solo pasa en un reemplazo, no en cada paso: la copia no cuenta como asignación por paso.
   * @param {Combate} nuevo
   */
  function reemplazar(nuevo) {
    const viejos = combate.eventos;
    if (viejos.length) {
      nuevo.eventos.splice(0, 0, ...viejos); // primero lo del combate viejo, en su orden
      viejos.length = 0;
    }
    combate = nuevo;
  }
  /**
   * Un paso fijo del combate; la derrota permanece hasta abandonar la partida.
   * @param {Entrada[]} ins
   * @param {number} dt  s
   */
  function paso(ins, dt) {
    return pasoCombate(combate, ins, dt);
  }
  /** @param {string[]} acciones  acciones de debug del cuadro */
  function aplicarDebug(acciones) {
    for (const a of acciones) {
      if (a === "reset") reiniciar();
      else aplicarDebugComun(combate.w, a);
    }
  }
  const bucle = crearBucle(cfg, { solo, sample, paso, debug: aplicarDebug });
  /** @param {boolean} [primeraVez] */
  function reiniciar(primeraVez = false) {
    reemplazar(
      crearCombate(cfg, {
        jefe,
        solo,
        dificil,
        seed,
        primeraVez,
        reintentos: combate.opts.reintentos,
      }),
    );
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
    /** Un paso fijo sin bucle propio (lo usa el flujo de la partida, core/flujo.js, con su bucle). */
    paso,
    /** Acciones de debug sin bucle propio (el flujo gestiona antes la tecla de reinicio). */
    aplicarDebug,
    reintentar() {
      reemplazar(reintentarCombate(combate));
      bucle.resetAcc();
    },
    reiniciar,
  };
}

// Recorrido de inicio (lobby + pasillo, D-204 a D-211) sobre el mismo bucle de paso fijo.
// El mundo se reemplaza al reiniciar el pasillo: leerlo siempre por `world` (no guardar la referencia).
/**
 * @param {Config} cfg
 * @param {{ solo?: boolean, dificil?: boolean, seed?: number, caida?: boolean, sample: Muestreo }} opciones
 *   caida = false empieza ya aterrizado (pruebas)
 */
export function crearJuegoRecorrido(
  cfg,
  { solo = false, dificil = false, seed = 1, caida = true, sample },
) {
  const recorrido = crearRecorrido(cfg, { solo, dificil, seed, caida });
  /**
   * Un paso fijo del recorrido.
   * @param {Entrada[]} ins
   * @param {number} dt  s
   */
  const paso = (ins, dt) => pasoRecorrido(recorrido, ins, dt);
  /** @param {string[]} acciones  acciones de debug del cuadro */
  function aplicarDebug(acciones) {
    for (const a of acciones) {
      if (a === "reset")
        reiniciarPasillo(recorrido); // tecla de reinicio: vuelve al lobby
      else aplicarDebugComun(recorrido.w, a);
    }
  }
  const bucle = crearBucle(cfg, { solo, sample, paso, debug: aplicarDebug });
  return {
    recorrido,
    /** Mundo de la cadena (cambia al reiniciar el pasillo). */
    get world() {
      return recorrido.w;
    },
    /** Estado de lectura para render y HUD (mismo objeto toda la partida). */
    get estado() {
      return recorrido.estado;
    },
    /** Eventos pendientes; quien los lee vacía la lista (`length = 0`). */
    get eventos() {
      return recorrido.eventos;
    },
    get steps() {
      return bucle.steps;
    },
    /** @param {number} dt  s del cuadro; devuelve cuántos pasos fijos simuló */
    update: (dt) => bucle.update(dt),
    /** Un paso fijo sin bucle propio (lo usa el flujo de la partida, core/flujo.js, con su bucle). */
    paso,
    /** Acciones de debug sin bucle propio (el flujo gestiona antes la tecla de reinicio). */
    aplicarDebug,
    resetAcc: () => bucle.resetAcc(),
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
