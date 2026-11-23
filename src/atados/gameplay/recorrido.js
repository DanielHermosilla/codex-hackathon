// Recorrido de inicio en un solo mundo: lobby al pie del Templo Celestial + pasillo de subida (D-204 a D-211).
// Puro: sin three.js ni DOM. Paso fijo y determinista (azar por semilla, tiempo por parámetro).
//
// D-205 caída al valle: fase `caida` con las entradas ignoradas; al terminar, `caida:aterriza`.
// D-206 tarjetas del tutorial por zonas, en orden fijo, una a la vez y una sola vez por partida.
// D-208 muñeco de paja opcional en el lobby: la cadena lo daña; al recibir su vida, cae y se rearma.
// D-209 pasillo con segadores y brincadores (enemigos.js), columnas para enredar y murales (D-126).
// D-168/D-076 si cae uno se arrastra su cadáver; si caen los dos, el pasillo se reinicia en el lobby.
// D-211 cruzar el arco de la cima: `umbral:cruzado` (el flujo pone fundido, silencio y el jefe).
//
// Eventos (en `r.eventos`, objetos { tipo, t, ...datos }):
//   caida:aterriza · tutorial:mostrar {clave} · tutorial:ocultar {clave} · mural:activar {id} ·
//   mural:ocultar {id} · muneco:cae · muneco:rearma · enemigo:telegrafia {id} · enemigo:activo {id} ·
//   enemigo:golpe {id, jugador, dano} · enemigo:herido {id, dano} · enemigo:muere {id} ·
//   pasillo:caidos · pasillo:reinicio · umbral:cruzado

import { createWorld, stepWorld, emptyInput } from "./mundo.js";
import { createChain } from "./cadena.js";
import {
  crearRuta,
  crearLimiteRuta,
  nuevaProyeccion,
  proyectarRuta,
  puntoRuta,
} from "./ruta.js";
import {
  crearHorda,
  reiniciarHorda,
  moverHorda,
  actualizarHorda,
  calmarHorda,
} from "./enemigos.js";
import { crearRng } from "../core/rng.js";

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Entrada} Entrada */
/** @typedef {import('./tipos.js').Evento} Evento */
/** @typedef {import('./tipos.js').Pilar} Pilar */
/** @typedef {import('./tipos.js').EstadoRecorrido} EstadoRecorrido */
/** @typedef {import('./ruta.js').Ruta} Ruta */
/** @typedef {import('./enemigos.js').Horda} Horda */

/**
 * Opciones al crear el recorrido.
 * @typedef {object} OpcionesRecorrido
 * @property {boolean} [solo]  modo solo (D-016)
 * @property {boolean} [dificil]  telegrafías del modo difícil
 * @property {number} [seed]  semilla del azar (`?seed=N`)
 * @property {boolean} [caida]  false = empieza ya aterrizado (pruebas); por defecto true (D-205)
 */

/**
 * Recorrido completo: mundo, enemigos, memoria del tutorial y estado de lectura.
 * @typedef {object} Recorrido
 * @property {Cfg} cfg
 * @property {Required<OpcionesRecorrido>} opts
 * @property {Ruta} ruta  eje del pasillo (ruta.js)
 * @property {import('./tipos.js').Limite} limite  borde transitable: lobby ∪ pasillo
 * @property {Pilar[]} pilares  columnas del pasillo ya en x/z
 * @property {Mundo} w  mundo de la cadena (se reemplaza al reiniciar el pasillo: leerlo siempre de aquí)
 * @property {Horda} horda
 * @property {EstadoRecorrido} estado  lo que leen render y HUD (mismo objeto toda la partida)
 * @property {Evento[]} eventos
 * @property {number} t  s simulados desde que se creó
 * @property {number} caidaT  s de caída transcurridos
 * @property {boolean} aterrizo  ya terminó la caída (dispara la tarjeta `alAterrizar`)
 * @property {number} progreso  m: máxima s alcanzada por un vivo desde el último reinicio
 * @property {number} sigTarjeta  índice de la próxima tarjeta por mostrar (no retrocede: una vez por partida)
 * @property {number} tarjetaVis  índice de la tarjeta a la vista, o -1
 * @property {number} tarjetaT  s que lleva a la vista
 * @property {number} esperaT  s que faltan para poder mostrar la siguiente (separación)
 * @property {boolean[]} marcasTarjeta  por tarjeta: su marca de cercanía ya se cumplió alguna vez (queda
 *   anotada aunque se alejen: sale cuando le toque el turno)
 * @property {boolean[]} muralesVistos  por índice de mural: ya salió en esta partida
 * @property {string | null} muralVis  id del mural a la vista
 * @property {number} munecoBase  daño total del muñeco al levantarse por última vez
 * @property {number} munecoT  s caído
 * @property {boolean} caidos  cayeron los dos (esperando el reinicio)
 * @property {number} caidosT  s desde que cayeron los dos
 * @property {number} reinicios  veces que se reinició el pasillo
 * @property {Entrada[]} _quietos  entradas vacías para la caída
 * @property {import('./ruta.js').Proyeccion} _proj  temporal reutilizado
 */

const MAX_EVENTOS = 200; // tope de la lista si nadie la vacía (pruebas): evita que crezca sin fin

/**
 * Crea el recorrido: mundo con el borde lobby ∪ pasillo, columnas, muñeco del lobby y enemigos.
 * @param {Cfg} cfg
 * @param {OpcionesRecorrido} [opts]
 * @returns {Recorrido}
 */
export function crearRecorrido(cfg, opts = {}) {
  const o = { solo: false, dificil: false, seed: 1, caida: true, ...opts };
  const L = cfg.recorrido.lobby;
  const P = cfg.recorrido.pasillo;
  const ruta = crearRuta(P.ruta, P.ancho);
  // Borde: el claro del lobby más el pasillo (a ≤ ancho/2 del eje).
  const limite = crearLimiteRuta(ruta, {
    x: L.centro[0],
    z: L.centro[1],
    radio: L.radio,
  });
  // Columnas: de (s, d) sobre la ruta a (x, z).
  const pilares = P.pilares.map((c, i) => {
    const q = puntoRuta(ruta, c.s, c.d);
    return { id: i, x: q.x, z: q.z, r: c.r };
  });
  /** @type {Evento[]} */
  const eventos = [];
  /** @type {Recorrido} */
  const r = {
    cfg,
    opts: o,
    ruta,
    limite,
    pilares,
    w: crearMundo(cfg, o.solo, limite, pilares),
    horda: crearHorda(
      cfg,
      P.enemigos.map((e) => {
        const q = puntoRuta(ruta, e.s, e.d);
        return { tipo: e.tipo, x: q.x, z: q.z };
      }),
      {
        rng: crearRng(o.seed),
        solo: o.solo,
        dificil: o.dificil,
        emitir: (tipo, datos) => emitirRecorrido(r, tipo, datos),
      },
    ),
    estado: {
      fase: o.caida ? "caida" : "recorrido",
      caidaK: o.caida ? 0 : 1, // 1 = ya en el suelo
      s: 0,
      muneco: {
        x: L.muneco.x,
        z: L.muneco.z,
        r: L.muneco.radio,
        caido: false,
        rearmeK: 1,
      },
      enemigos: [], // se enlaza abajo con la lista de la horda (mismos objetos)
      umbralCruzado: false,
    },
    eventos,
    t: 0,
    caidaT: 0,
    aterrizo: !o.caida,
    progreso: 0,
    sigTarjeta: 0,
    tarjetaVis: -1,
    tarjetaT: 0,
    esperaT: 0,
    marcasTarjeta: P.tutorial.map(() => false),
    muralesVistos: P.murales.map(() => false),
    muralVis: null,
    munecoBase: 0,
    munecoT: 0,
    caidos: false,
    caidosT: 0,
    reinicios: 0,
    _quietos: [emptyInput(), emptyInput()],
    _proj: nuevaProyeccion(),
  };
  r.estado.enemigos = r.horda.enemigos; // render y HUD leen los enemigos tal cual (EnemigoVista)
  return r;
}

/**
 * Mundo de la cadena en el lobby: Sael y Odo en su spawn, el muñeco como cuerpo que la cadena daña.
 * @param {Cfg} cfg
 * @param {boolean} solo
 * @param {import('./tipos.js').Limite} limite
 * @param {Pilar[]} pilares
 * @returns {Mundo}
 */
function crearMundo(cfg, solo, limite, pilares) {
  const L = cfg.recorrido.lobby;
  return createWorld(cfg, {
    solo,
    sael: L.spawn.sael,
    odo: L.spawn.odo,
    pillars: pilares,
    arenaRadius: cfg.recorrido.pasillo.arenaTecnica, // técnico: el borde real es `limite`
    limite,
    dummy: { x: L.muneco.x, z: L.muneco.z, r: L.muneco.radio },
  });
}

/** Abre el tramo seguro tras la victoria. Se conservan los PV ganados al vencer a Mirra.
 * @param {Recorrido} r @param {Mundo} anterior */
export function abrirPasilloPuesto(r, anterior) {
  const salida = r.cfg.recorrido.salida;
  // Paredes y carro limitan el paso. El furgón no es un pilar donde se pueda enredar la cadena.
  const mundo = createWorld(r.cfg, {
    solo: r.opts.solo,
    ...salida.spawn,
    pillars: [],
    limite(pos, margen) {
      const x = Math.max(
        -salida.ancho / 2 + margen,
        Math.min(salida.bordePuesto - margen, pos.x),
      );
      const z = Math.max(
        salida.zFin + margen,
        Math.min(salida.zInicio - margen, pos.z),
      );
      const movido = pos.x !== x || pos.z !== z;
      pos.x = x;
      pos.z = z;
      return movido;
    },
    arenaRadius: r.cfg.recorrido.pasillo.arenaTecnica,
    // En esta sala no hay blanco de combate: queda fuera de las paredes y la cadena lo ignora.
    dummy: { x: 0, z: 0, r: 0 },
  });
  for (let i = 0; i < mundo.players.length; i++)
    mundo.players[i].hp = anterior.players[i].hp;
  mundo.dummy.invulnerable = true;
  r.w = mundo;
  r.estado.fase = "puesto";
  r.estado.caidaK = 1;
  r.estado.enemigos = [];
  r.estado.umbralCruzado = false;
  actualizarProgreso(r);
}

/**
 * Añade un evento a la lista del recorrido.
 * @param {Recorrido} r
 * @param {string} tipo
 * @param {Record<string, any>} [datos]
 * @returns {Evento}
 */
export function emitirRecorrido(r, tipo, datos = {}) {
  const ev = { tipo, t: r.t, ...datos };
  r.eventos.push(ev);
  if (r.eventos.length > MAX_EVENTOS) r.eventos.shift(); // nadie la vació: se pierde la más vieja
  return ev;
}

/**
 * Un paso fijo del recorrido. Devuelve false si no simuló (hit-stop), igual que stepWorld.
 * @param {Recorrido} r
 * @param {Entrada[]} inputs  entradas de Sael y Odo
 * @param {number} dt  s (paso fijo)
 * @returns {boolean}
 */
export function pasoRecorrido(r, inputs, dt) {
  const w = r.w;
  if (w.hitstop > 0) return stepWorld(w, inputs, dt); // congelado: el mundo descuenta el hit-stop
  r.t += dt;
  const E = r.estado;
  if (E.fase === "puesto") {
    stepWorld(w, inputs, dt); // solo la pareja y la cadena: no hay enemigos, tutorial ni salida al jefe
    actualizarProgreso(r);
    return true;
  }
  if (E.fase === "caida") {
    r.caidaT += dt;
    const dur = r.cfg.recorrido.lobby.caida.duracion; // s
    E.caidaK = Math.min(1, r.caidaT / dur);
    stepWorld(w, r._quietos, dt); // entradas ignoradas: siguen en el spawn mientras caen
    if (r.caidaT >= dur) aterrizar(r);
    actualizarTarjetas(r, dt);
    return true;
  }
  moverHorda(r.horda, w, dt);
  stepWorld(w, inputs, dt);
  actualizarHorda(r.horda, r.w, dt);
  actualizarMuneco(r, dt);
  actualizarProgreso(r);
  if (actualizarCaidos(r, dt)) return true; // se reinició el pasillo: el resto empieza el paso que viene
  actualizarUmbral(r);
  actualizarTarjetas(r, dt);
  actualizarMurales(r);
  return true;
}

/**
 * Fin de la caída: aterrizan y empieza el recorrido.
 * @param {Recorrido} r
 */
function aterrizar(r) {
  if (r.estado.fase !== "caida") return;
  r.estado.fase = "recorrido";
  r.estado.caidaK = 1;
  r.aterrizo = true;
  emitirRecorrido(r, "caida:aterriza", {});
}

/**
 * Muñeco del lobby (D-208): al acumular `vida` de daño desde que se levantó, cae; tras `rearme` s se
 * levanta con la cuenta a cero. Mientras está caído la cadena lo atraviesa sin dañarlo.
 * @param {Recorrido} r
 * @param {number} dt
 */
function actualizarMuneco(r, dt) {
  const M = r.cfg.recorrido.lobby.muneco;
  const d = r.w.dummy;
  const V = r.estado.muneco;
  if (V.caido) {
    r.munecoT += dt;
    V.rearmeK = Math.min(1, r.munecoT / M.rearme);
    if (r.munecoT < M.rearme) return;
    V.caido = false;
    V.rearmeK = 1;
    d.invulnerable = false;
    r.munecoBase = d.total; // la cuenta empieza de nuevo
    emitirRecorrido(r, "muneco:rearma", {});
    return;
  }
  if (d.total - r.munecoBase < M.vida) return;
  V.caido = true;
  V.rearmeK = 0;
  r.munecoT = 0;
  d.invulnerable = true; // en el suelo no recibe daño
  emitirRecorrido(r, "muneco:cae", {});
}

/**
 * s del vivo más adelantado (estado.s) y máxima s alcanzada (progreso, dispara tarjetas y murales).
 * @param {Recorrido} r
 */
function actualizarProgreso(r) {
  let frente = -Infinity;
  for (const p of r.w.players) {
    if (!p.alive) continue;
    proyectarRuta(r.ruta, p.x, p.z, r._proj);
    if (r._proj.s > frente) frente = r._proj.s;
  }
  if (frente === -Infinity) return; // sin vivos: se queda la última
  r.estado.s = frente;
  if (frente > r.progreso) r.progreso = frente;
}

/**
 * Caer los dos (D-168): calma la horda, cierra avisos y tras `flujo.reinicioPasillo` s reinicia.
 * @param {Recorrido} r
 * @param {number} dt
 * @returns {boolean} true si reinició el pasillo en este paso
 */
function actualizarCaidos(r, dt) {
  const [A, B] = r.w.players;
  if (!r.caidos) {
    if (A.alive || B.alive) return false;
    r.caidos = true;
    r.caidosT = 0;
    calmarHorda(r.horda);
    ocultarTarjeta(r);
    ocultarMural(r);
    emitirRecorrido(r, "pasillo:caidos", {});
    return false;
  }
  r.caidosT += dt;
  if (r.caidosT < r.cfg.recorrido.flujo.reinicioPasillo) return false;
  reiniciarPasillo(r);
  return true;
}

/**
 * Reinicia el pasillo en el spawn del lobby: mundo nuevo (los dos con vida llena), enemigos de vuelta y
 * muñeco de pie. No repite la caída (PROVISIONAL) ni las tarjetas ni los murales ya vistos.
 * @param {Recorrido} r
 */
export function reiniciarPasillo(r) {
  r.w = crearMundo(r.cfg, r.opts.solo, r.limite, r.pilares);
  reiniciarHorda(r.horda, crearRng(r.opts.seed)); // misma semilla: el reintento se juega igual
  const E = r.estado;
  E.fase = "recorrido";
  E.caidaK = 1;
  E.s = 0;
  E.umbralCruzado = false;
  E.muneco.caido = false;
  E.muneco.rearmeK = 1;
  r.aterrizo = true;
  r.progreso = 0;
  r.munecoBase = 0;
  r.munecoT = 0;
  r.caidos = false;
  r.caidosT = 0;
  r.reinicios++;
  ocultarTarjeta(r);
  ocultarMural(r);
  r.esperaT = 0; // el reinicio ya separa: la siguiente puede salir enseguida
  emitirRecorrido(r, "pasillo:reinicio", { reinicios: r.reinicios });
}

/**
 * Arco de la cima (D-211): cuando el vivo más adelantado pasa `umbral.s`, una sola vez.
 * @param {Recorrido} r
 */
function actualizarUmbral(r) {
  const E = r.estado;
  if (E.umbralCruzado || r.caidos) return;
  if (E.s < r.cfg.recorrido.pasillo.umbral.s) return;
  E.umbralCruzado = true;
  E.fase = "arco";
  calmarHorda(r.horda); // nadie ataca durante el fundido
  ocultarTarjeta(r);
  ocultarMural(r);
  emitirRecorrido(r, "umbral:cruzado", { jefe: r.cfg.recorrido.pasillo.jefe });
}

// ─── Tarjetas del tutorial (D-206) ───

/**
 * Muestra la siguiente tarjeta cuando se cumple su marca, en orden, una a la vez, con `tarjeta.separacion`
 * s entre una y otra. Se ocultan solas tras `tarjeta.duracion` s; no exigen la acción.
 * @param {Recorrido} r
 * @param {number} dt
 */
function actualizarTarjetas(r, dt) {
  const P = r.cfg.recorrido.pasillo;
  anotarMarcas(r); // antes de nada: una marca cruzada mientras otra tarjeta está a la vista no se pierde
  if (r.tarjetaVis >= 0) {
    r.tarjetaT += dt;
    if (r.tarjetaT >= P.tarjeta.duracion) ocultarTarjeta(r);
    return;
  }
  if (r.esperaT > 0) {
    r.esperaT -= dt;
    return;
  }
  if (r.estado.fase !== "recorrido" || r.caidos) return; // en la caída, el arco o caídos no sale nada nuevo
  if (r.sigTarjeta >= P.tutorial.length) return; // ya salieron todas
  if (!disparaTarjeta(r, r.sigTarjeta)) return;
  r.tarjetaVis = r.sigTarjeta;
  r.sigTarjeta++; // no retrocede nunca: cada tarjeta sale una sola vez por partida
  r.tarjetaT = 0;
  emitirRecorrido(r, "tutorial:mostrar", {
    clave: P.tutorial[r.tarjetaVis].clave,
  });
}

/**
 * Anota el primer cruce de las marcas de cercanía al muñeco de las tarjetas que aún no salieron (cada
 * paso del recorrido, aunque haya otra tarjeta a la vista o esté corriendo la separación). Sin esto, quien
 * se acerca al muñeco y se aleja mientras sale «mover» se quedaría sin «cortar».
 * @param {Recorrido} r
 */
function anotarMarcas(r) {
  if (r.estado.fase !== "recorrido" || r.caidos) return; // en la caída siguen en el spawn
  const lista = r.cfg.recorrido.pasillo.tutorial;
  const M = r.estado.muneco;
  for (let k = r.sigTarjeta; k < lista.length; k++) {
    const radio = lista[k].cercaMuneco; // m, o undefined si la tarjeta no tiene esta marca
    if (radio === undefined || r.marcasTarjeta[k]) continue;
    for (const p of r.w.players)
      if (p.alive && Math.hypot(p.x - M.x, p.z - M.z) <= radio)
        r.marcasTarjeta[k] = true;
  }
}

/**
 * ¿Se cumple alguna marca de la tarjeta `k`? (al aterrizar, por s alcanzada o cerca del muñeco alguna vez)
 * @param {Recorrido} r
 * @param {number} k
 * @returns {boolean}
 */
function disparaTarjeta(r, k) {
  const T = r.cfg.recorrido.pasillo.tutorial[k];
  if (T.alAterrizar && r.aterrizo) return true;
  if (T.s !== undefined && r.progreso >= T.s) return true;
  if (r.marcasTarjeta[k]) return true; // alguien estuvo cerca del muñeco (anotarMarcas)
  return false;
}

/**
 * Oculta la tarjeta a la vista (si hay) y empieza la separación hasta la siguiente.
 * @param {Recorrido} r
 */
function ocultarTarjeta(r) {
  if (r.tarjetaVis < 0) return;
  const P = r.cfg.recorrido.pasillo;
  emitirRecorrido(r, "tutorial:ocultar", {
    clave: P.tutorial[r.tarjetaVis].clave,
  });
  r.tarjetaVis = -1;
  r.esperaT = P.tarjeta.separacion;
}

// ─── Murales (D-126) ───

/**
 * Activa cada mural al pasar su s, una vez por partida. El nuevo oculta al anterior.
 * (El HUD además lo apaga solo tras `hud.mural.duracion` s.)
 * @param {Recorrido} r
 */
function actualizarMurales(r) {
  if (r.estado.fase !== "recorrido" || r.caidos) return;
  const lista = r.cfg.recorrido.pasillo.murales;
  for (let i = 0; i < lista.length; i++) {
    if (r.muralesVistos[i] || r.progreso < lista[i].s) continue;
    r.muralesVistos[i] = true;
    ocultarMural(r);
    r.muralVis = lista[i].id;
    emitirRecorrido(r, "mural:activar", { id: lista[i].id });
  }
}

/**
 * Oculta el mural a la vista (si hay).
 * @param {Recorrido} r
 */
function ocultarMural(r) {
  if (!r.muralVis) return;
  emitirRecorrido(r, "mural:ocultar", { id: r.muralVis });
  r.muralVis = null;
}

// ─── Utilidades de prueba (deterministas) ───

/**
 * Termina la caída al instante (aterrizan y empieza el recorrido).
 * @param {Recorrido} r
 */
export function saltarCaida(r) {
  r.caidaT = r.cfg.recorrido.lobby.caida.duracion;
  aterrizar(r);
}

/**
 * Coloca a Sael y Odo (cadena recta entre ellos) sin pasar por la física.
 * @param {Recorrido} r
 * @param {number[]} sael  [x, z]
 * @param {number[]} odo  [x, z]
 * @param {number} [face]  rad: hacia dónde miran los dos
 */
export function colocarJugadores(r, sael, odo, face) {
  const w = r.w;
  const [A, B] = w.players;
  w.chain = createChain(sael[0], sael[1], odo[0], odo[1], r.cfg);
  Object.assign(A, {
    x: sael[0],
    z: sael[1],
    px: sael[0],
    pz: sael[1],
    vx: 0,
    vz: 0,
  });
  Object.assign(B, {
    x: odo[0],
    z: odo[1],
    px: odo[0],
    pz: odo[1],
    vx: 0,
    vz: 0,
  });
  if (face !== undefined) A.face = B.face = face;
  actualizarProgreso(r);
}

/**
 * Coloca a los dos a `s` m de ruta (separados `pasillo.separacion` m a lo ancho), mirando hacia delante.
 * Las tarjetas y murales con marca ≤ s saltan en los pasos siguientes, en orden.
 * @param {Recorrido} r
 * @param {number} s  m
 */
export function irA(r, s) {
  const mitad = r.cfg.recorrido.pasillo.separacion / 2;
  const a = puntoRuta(r.ruta, s, -mitad);
  const b = puntoRuta(r.ruta, s, mitad);
  colocarJugadores(r, [a.x, a.z], [b.x, b.z], a.ang);
}

/**
 * Lleva a los dos más allá del arco y lo cruza en el acto (`umbral:cruzado`).
 * @param {Recorrido} r
 */
export function cruzarUmbral(r) {
  if (r.estado.fase === "caida") saltarCaida(r);
  irA(r, r.cfg.recorrido.pasillo.umbral.s + 1);
  actualizarUmbral(r);
}
