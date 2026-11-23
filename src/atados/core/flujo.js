// Flujo de la partida completa: máquina de estados pura, sin three.js ni DOM, sobre el paso fijo.
//
//   caida ──(aterrizan, D-205)──▶ recorrido ──(cruzan el arco, D-211)──▶ arco
//     arco ──(fundido + silencio y la pradera ya cargó)──▶ jefe ──(Mirra cae)──▶ victoria ──(arco norte)──▶ puesto ──(fin del muelle)──▶ destino
//   recorrido: caer los dos reinicia el pasillo dentro del recorrido (D-168), sin salir de este estado.
//   jefe: si ambos caen, la pantalla de derrota permite volver al inicio.
//
// Un solo bucle de paso fijo (core/juego.js → crearBucle) para toda la partida: cada paso simula el juego
// activo (recorrido o jefe) y al final de ESE paso se revisan las transiciones. Así el resultado no depende
// de cuántos pasos caigan en un cuadro, y el acumulador sigue igual al cambiar de mundo a mitad de cuadro.
//
// Eventos propios (en `partida.eventos`, junto con los del recorrido y del combate, en orden):
//   flujo:estado {estado}     cada cambio de estado
//   jefe:preparar {jefe}      al cruzar el arco: la integración empieza a montar la pradera del jefe
//   silencio {motivo: "umbral"}  al terminar el fundido del arco (D-183); queda abierto hasta `silencio:fin`
//   silencio:fin {motivo: "umbral"}  cierra ese silencio: justo antes de `jefe:entra` o si se cancela el arco
//   jefe:entra {jefe, cinematica}  empieza el combate (cinematica = zoom al jefe, solo la 1.ª vez)
//
// Tecla de reinicio de depuración (`reset`): la gestiona el flujo. En caida/recorrido/arco reinicia el
// pasillo y cancela de una vez la entrada al jefe pendiente (vuelve a `recorrido`, cierra el silencio);
// en jefe/victoria reinicia el combate con la presentación corta.
//
// Uso desde la integración:
//   const partida = crearPartida(CONFIG, { solo, seed, sample });
//   cada cuadro: partida.update(dt); leer partida.estado / partida.world / partida.recorrido.estado /
//   partida.combate; vaciar partida.eventos (length = 0) tras repartirlos.
//   Cuando la pradera esté montada: partida.jefeListo().

import {
  crearJuegoRecorrido,
  crearJuegoJefe,
  crearBucle,
  aplicarDebugComun,
} from "./juego.js";
import {
  saltarCaida as saltarCaidaRecorrido,
  colocarJugadores as colocarEnRecorrido,
  irA as irARecorrido,
  cruzarUmbral,
  abrirPasilloPuesto,
  reiniciarPasillo,
} from "../gameplay/recorrido.js";
import { colocarParaPrueba, heredarJugadores } from "../gameplay/combate.js";

/** @typedef {typeof import('./config.js').CONFIG} Config */
/** @typedef {import('./juego.js').Muestreo} Muestreo */
/** @typedef {import('./input.js').Entrada} Entrada */
/** @typedef {import('../gameplay/tipos.js').Evento} Evento */
/** @typedef {"caida" | "recorrido" | "arco" | "jefe" | "victoria" | "puesto" | "destino"} EstadoPartida */
/** @typedef {ReturnType<typeof crearJuegoRecorrido>} JuegoRecorrido */
/** @typedef {ReturnType<typeof crearJuegoJefe>} JuegoJefe */

const MAX_EVENTOS = 400; // tope si nadie vacía la lista (pruebas): se descartan los más viejos
const EPS = 1e-9; // s: holgura al comparar tiempos sumados paso a paso (1/60 no es exacto en coma flotante)

/**
 * Opciones de la partida.
 * @typedef {object} OpcionesPartida
 * @property {Muestreo} sample  entradas de los dos jugadores y acciones de debug (core/input.js)
 * @property {boolean} [solo]  modo solo (D-016)
 * @property {boolean} [dificil]  modo difícil (telegrafías más cortas)
 * @property {number} [seed]  semilla del azar (`?seed=N`)
 * @property {string} [jefe]  jefe al final del pasillo; por defecto `recorrido.pasillo.jefe`
 * @property {boolean} [caida]  false = empieza ya aterrizado (pruebas); por defecto true (D-205)
 */

/**
 * Crea la partida completa: recorrido (lobby + pasillo) y, tras el arco, el combate contra el jefe.
 * @param {Config} cfg
 * @param {OpcionesPartida} opciones
 */
export function crearPartida(cfg, opciones) {
  const {
    sample,
    solo = false,
    dificil = false,
    seed = 1,
    jefe: primerJefe = cfg.recorrido.pasillo.jefe,
    caida = true,
  } = opciones;
  let jefe = primerJefe; // El puesto conecta el primer combate con el jefe final.
  const F = cfg.recorrido.flujo;
  // El juego del recorrido trae su propio bucle, pero la partida no lo usa: simula con `paso` y su bucle.
  const juegoRecorrido = crearJuegoRecorrido(cfg, {
    solo,
    dificil,
    seed,
    caida,
    sample,
  });
  /** @type {JuegoJefe | null} */
  let juegoJefe = null;
  /** @type {EstadoPartida} */
  let estado = caida ? "caida" : "recorrido";
  let t = 0; // s simulados de la partida
  let tEstado = 0; // s simulados en el estado actual
  let jefeCargado = false; // la integración avisó que la pradera ya está montada (sigue montada tras cancelar)
  let silencioAbierto = false; // se emitió `silencio` del umbral y aún no su `silencio:fin`
  /** @type {Evento[]} */
  const eventos = [];

  /**
   * Evento propio del flujo.
   * @param {string} tipo
   * @param {Record<string, any>} [datos]
   */
  function emitir(tipo, datos = {}) {
    eventos.push({ tipo, t, ...datos });
    recortar();
  }

  /** Mantiene la lista bajo el tope (solo pasa si nadie la vacía). */
  function recortar() {
    if (eventos.length > MAX_EVENTOS)
      eventos.splice(0, eventos.length - MAX_EVENTOS);
  }

  /**
   * Pasa los eventos de una fuente (recorrido o combate) a la lista de la partida, en orden.
   * Mueve los mismos objetos (no crea copias) y vacía la fuente.
   * @param {Evento[]} lista
   */
  function drenar(lista) {
    if (!lista.length) return;
    for (const e of lista) eventos.push(e);
    lista.length = 0;
    recortar();
  }

  /** Eventos del juego activo. Los de combates reemplazados ya están al frente del vigente (juego.js). */
  function drenarActivo() {
    if (juegoJefe) drenar(juegoJefe.combate.eventos);
    else drenar(juegoRecorrido.eventos);
  }

  /** @param {EstadoPartida} nuevo */
  function cambiar(nuevo) {
    estado = nuevo;
    tEstado = 0;
    emitir("flujo:estado", { estado: nuevo });
  }

  /** Cierra el silencio del umbral si estaba abierto (entrada al jefe o arco cancelado). */
  function cerrarSilencio() {
    if (!silencioAbierto) return;
    silencioAbierto = false;
    emitir("silencio:fin", { motivo: "umbral" });
  }

  /** Cruzaron el arco: empieza el fundido y la integración monta la pradera. */
  function alCruzarArco() {
    cambiar("arco");
    emitir("jefe:preparar", { jefe });
  }

  /**
   * Vuelve del arco (o de la caída) al recorrido: cancela de una vez la entrada al jefe pendiente.
   * Un `jefeListo()` que llegue después solo anota que la pradera está montada; no hay salto al jefe.
   */
  function volverAlRecorrido() {
    cerrarSilencio();
    if (estado !== "recorrido") cambiar("recorrido");
  }

  /**
   * Empieza el combate: presentación completa y cinemática de zoom (solo la primera vez, D-213).
   * Los jugadores entran con la vida y el estado vivo o caído que traían del pasillo (D-020, D-168).
   */
  function entrarJefe() {
    cerrarSilencio(); // el silencio del umbral dura hasta la entrada efectiva a la presentación (D-183)
    juegoJefe = crearJuegoJefe(cfg, { solo, dificil, seed, jefe, sample });
    heredarJugadores(juegoJefe.combate, juegoRecorrido.world.players);
    cambiar("jefe");
    emitir("jefe:entra", { jefe, cinematica: true });
    drenarActivo(); // presentacion_inicio y su silencio del nombre
  }

  /** Revisa las transiciones que dependen del recorrido. */
  function revisarRecorrido() {
    const E = juegoRecorrido.estado;
    if (estado === "caida" && E.fase !== "caida") cambiar("recorrido");
    if (estado === "recorrido" && E.umbralCruzado) alCruzarArco();
    // El pasillo se reinició debajo del arco (p. ej. cayeron los dos durante el fundido): se cancela.
    if (estado === "arco" && !E.umbralCruzado) volverAlRecorrido();
  }

  /** En el arco: abre el silencio al terminar el fundido y entra al jefe cuando toca y la pradera cargó. */
  function revisarArco() {
    if (estado !== "arco") return;
    if (!silencioAbierto && tEstado >= F.fundidoArco - EPS) {
      silencioAbierto = true;
      emitir("silencio", { motivo: "umbral" }); // D-183: del fin del fundido hasta la presentación
    }
    if (!jefeCargado) return;
    if (tEstado >= F.fundidoArco + F.silencioArco - EPS) entrarJefe();
  }

  /** Tras la victoria cualquiera puede guiar a su compañero por el arco norte.
   * @param {Entrada[]} ins */
  function cruzarSalida(ins) {
    const salida = cfg.recorrido.salida;
    if (!juegoJefe || jefe === "farolero") return; // la victoria final conserva su propia lápida
    const jugadores = juegoJefe.world.players;
    // El compañero puede llegar a un lado del arco. Si se queda atrás, el primero lo espera.
    if (
      jugadores.some(
        (p) =>
          p.alive && Math.hypot(p.x, p.z - salida.zInicio) > salida.reunion,
      )
    )
      return;
    // Exigimos caminar hacia fuera para que ganar junto al arco permita quedarse a leer la lápida.
    if (
      !jugadores.some(
        (p, i) =>
          !p.anchored &&
          p.z <= salida.zInicio &&
          Math.abs(p.x) <= salida.anchoArco / 2 &&
          (ins[i]?.mz ?? 0) < -0.1,
      )
    )
      return;
    entrarPuesto(); // caminar y pulsar el atajo completan la misma transición una sola vez
  }

  /** Pasa de la lápida de Mirra al carro y conserva la salud de la pareja. */
  function entrarPuesto() {
    if (estado !== "victoria" || !juegoJefe || jefe === "farolero")
      return false;
    abrirPasilloPuesto(juegoRecorrido.recorrido, juegoJefe.world);
    juegoJefe = null; // el puesto conserva los PV, la cadena se coloca a la entrada del muelle
    cambiar("puesto");
    emitir("zona_entra", { zona: "pasillo" });
    return true;
  }

  /** Revisa todas las transiciones (al final de cada paso fijo y tras las utilidades de prueba). */
  function revisar() {
    if (juegoJefe) {
      if (estado === "jefe" && juegoJefe.combate.estado === "victoria")
        cambiar("victoria");
      return;
    }
    revisarRecorrido();
    revisarArco();
  }

  /**
   * Un paso fijo de la partida: simula el juego activo, cuenta el tiempo y revisa las transiciones.
   * Si aquí se entra al jefe, los pasos que queden en el mismo cuadro ya simulan el combate.
   * @param {Entrada[]} ins
   * @param {number} dt  s (paso fijo)
   * @returns {boolean} false si no simuló (hit-stop), como stepWorld
   */
  function paso(ins, dt) {
    const r = juegoJefe
      ? juegoJefe.paso(ins, dt)
      : juegoRecorrido.paso(ins, dt);
    t += dt;
    tEstado += dt;
    drenarActivo();
    // Comprobamos la salida antes de revisar la victoria para no cruzar en el mismo paso en que cae Mirra.
    if (estado === "victoria") cruzarSalida(ins);
    else if (estado === "puesto") {
      const meta = cfg.recorrido.salida.zFin + 1; // m: último tablón antes del borde físico
      const jugadores = juegoRecorrido.world.players;
      if (
        jugadores.some((p) => p.z <= meta) &&
        jugadores.every(
          (p) => !p.alive || p.z <= meta + cfg.recorrido.salida.reunion,
        )
      )
        cambiar("destino");
    }
    revisar();
    return r;
  }

  /** Vuelve a la presentación corta de Mirra desde el resultado o el reinicio de depuración. */
  function reintentarJefe() {
    if (estado === "puesto" || estado === "destino") {
      // Un desafío repetido desde el puesto usa las mejoras compradas y omite la cinemática.
      juegoJefe = crearJuegoJefe(cfg, {
        solo,
        dificil,
        seed,
        jefe,
        sample,
        primeraVez: false,
      });
    } else if (juegoJefe) {
      juegoJefe.reintentar(); // conserva el contador entre intentos
    } else return;
    if (estado !== "jefe") cambiar("jefe"); // la partida vuelve al combate junto con los jugadores
    drenarActivo(); // entrega los eventos de la nueva presentación una sola vez
  }

  /**
   * Acciones de debug del cuadro. El reinicio lo gestiona el flujo para que no queden estados cruzados.
   * @param {string[]} acciones
   */
  function aplicarDebug(acciones) {
    for (const a of acciones) {
      if (estado === "puesto" || estado === "destino") {
        if (a === "reset") {
          const { sael, odo } = cfg.recorrido.salida.spawn;
          colocarEnRecorrido(juegoRecorrido.recorrido, sael, odo);
        }
        continue; // las teclas de daño y reinicio no reabren el combate en una zona segura
      }
      if (a !== "reset") {
        aplicarDebugComun(
          juegoJefe ? juegoJefe.world : juegoRecorrido.world,
          a,
        );
        continue;
      }
      if (juegoJefe) {
        reintentarJefe();
        continue;
      }
      reiniciarPasillo(juegoRecorrido.recorrido); // de vuelta al lobby: emite `pasillo:reinicio`
      drenarActivo();
      volverAlRecorrido(); // y en el mismo acto se cancela el arco pendiente
    }
  }

  const bucle = crearBucle(cfg, { solo, sample, paso, debug: aplicarDebug });

  /** Termina la caída al instante (prueba). */
  function saltarCaida() {
    if (juegoJefe || estado === "puesto" || estado === "destino") return;
    saltarCaidaRecorrido(juegoRecorrido.recorrido);
    drenarActivo();
    revisarRecorrido();
  }

  return {
    /** @returns {EstadoPartida} Etapa actual de la partida. */
    get estado() {
      return estado;
    },
    /** s simulados en el estado actual. */
    get tEstado() {
      return tEstado;
    },
    /** s simulados de la partida. */
    get t() {
      return t;
    },
    /** Eventos pendientes (recorrido, combate y flujo, en orden). Vaciar con `length = 0` tras leerlos. */
    eventos,
    reintentarJefe,
    entrarPuesto,
    /** Desde el final de la demo se puede volver a visitar el carro con la misma salud y saldo. */
    volverAlPuesto() {
      if (estado !== "destino") return;
      const { sael, odo } = cfg.recorrido.salida.spawn;
      colocarEnRecorrido(juegoRecorrido.recorrido, sael, odo);
      cambiar("puesto");
    },
    /** Conserva la salud y las compras al pasar del carro a la arena final. */
    entrarFarolero() {
      if (estado !== "puesto") return false;
      jefe = "farolero";
      entrarJefe();
      return true;
    },
    /** Juego del recorrido (sigue existiendo durante el jefe; deja de simular al entrar). */
    juegoRecorrido,
    /** Recorrido (estado de lectura en `recorrido.estado`). */
    get recorrido() {
      return juegoRecorrido.recorrido;
    },
    /** Juego del jefe, o null antes de entrar a la pradera. */
    get juegoJefe() {
      return juegoJefe;
    },
    /** Juego que se simula ahora: el del recorrido o el del jefe. */
    get juego() {
      return juegoJefe ?? juegoRecorrido;
    },
    /** Mundo que se simula ahora (leerlo cada cuadro: cambia al reiniciar el pasillo y al entrar al jefe). */
    get world() {
      return juegoJefe ? juegoJefe.world : juegoRecorrido.world;
    },
    /** Combate en curso, o null antes del jefe. */
    get combate() {
      return juegoJefe ? juegoJefe.combate : null;
    },
    /**
     * true durante el primer combate (presentación completa con zoom al jefe, D-211); false tras un
     * reintento o un reinicio (D-213) y antes del jefe. La integración la combina con
     * `combate.estado === "presentacion"`.
     */
    get cinematica() {
      return !!juegoJefe && juegoJefe.combate.opts.primeraVez;
    },
    /** 0..1 del fundido al cruzar el arco (1 = negro); 0 fuera del estado `arco`. */
    get fundidoArco() {
      return estado === "arco" ? Math.min(1, tEstado / F.fundidoArco) : 0;
    },
    /** La integración ya avisó que la pradera está lista. */
    get jefeCargado() {
      return jefeCargado;
    },
    /**
     * Avanza un cuadro: N pasos fijos (acumulador con tope de dt), cada uno con sus transiciones.
     * El tiempo del flujo cuenta pasos simulados, no tiempo real.
     * @param {number} dt  s del cuadro
     * @returns {number} pasos fijos simulados
     */
    update: (dt) => bucle.update(dt),
    /** Aviso de la integración: la escena del jefe ya cargó (sin esto no se sale del arco). */
    jefeListo() {
      jefeCargado = true;
      if (estado === "arco") revisarArco();
    },

    // ─── Utilidades de prueba (deterministas) ───
    saltarCaida,
    /**
     * Coloca a Sael y Odo (cadena recta) en el recorrido o en la arena del jefe.
     * @param {number[]} sael  [x, z]
     * @param {number[]} odo  [x, z]
     * @param {number} [face]  rad (solo en el recorrido)
     */
    colocarJugadores(sael, odo, face) {
      if (juegoJefe) colocarParaPrueba(juegoJefe.combate, { sael, odo });
      else colocarEnRecorrido(juegoRecorrido.recorrido, sael, odo, face);
    },
    /**
     * Lleva a los dos a `s` m de ruta (termina la caída si hacía falta).
     * @param {number} s  m
     */
    irA(s) {
      if (juegoJefe || estado === "puesto" || estado === "destino") return;
      if (estado === "caida") saltarCaida();
      irARecorrido(juegoRecorrido.recorrido, s);
    },
    /** Cruza el arco en el acto (estado `arco`). */
    cruzarArco() {
      if (
        juegoJefe ||
        estado === "arco" ||
        estado === "puesto" ||
        estado === "destino"
      )
        return;
      cruzarUmbral(juegoRecorrido.recorrido);
      drenarActivo();
      revisarRecorrido();
    },
    /** Entra al jefe en el acto, como la primera vez (con cinemática). */
    saltarAlJefe() {
      if (juegoJefe || estado === "puesto" || estado === "destino") return;
      jefeCargado = true;
      entrarJefe();
    },
  };
}
