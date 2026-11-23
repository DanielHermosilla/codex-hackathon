// HUD del juego: monta los componentes (jefe, lápida, números de daño, indicaciones) sobre una sola capa DOM.
// La vida, el dash y el ancla NO van aquí: son diegéticos, en el anillo del suelo (render/hud-anillos.js, D-063).
// `update(dt)` una vez por frame de render. `alEvento(ev)` recibe los eventos del flujo (tutorial:*, mural:*,
// enemigo:herido). Sin combate (caída, lobby y pasillo: `getCombate()` devuelve null) solo viven el tutorial,
// las tarjetas, los números de daño del muñeco y de los enemigos; las capas del jefe (barra, presentación,
// derrota, lápida, franjas) se activan cuando hay combate.
// `?dev` añade el HUD de debug (hud-debug.js), que no forma parte de esta capa.
// Franjas de cine (cinematica.js, D-211): `hud.cinematica.seguirPresentacion()` las arma para la próxima
// presentación del jefe (solo la primera entrada a Mirra, D-213); también `mostrar()` / `ocultar()` a mano.
import { montarEstilos } from "./hud-estilos.js";
import { crearHudJefe, ESTILOS_JEFE } from "./hud-jefe.js";
import { crearHudLapida, ESTILOS_LAPIDA } from "./hud-lapida.js";
import { crearHudNumeros, ESTILOS_NUMEROS } from "./hud-numeros.js";
import { crearHudTutorial, ESTILOS_TUTORIAL } from "./hud-tutorial.js";
import { crearDispositivo, crearRenderTexto } from "./hud-iconos.js";
import { crearCinematica, ESTILOS_CINE } from "./cinematica.js";
import {
  crearHudNumerosEnemigos,
  ESTILOS_NUMEROS_ENEMIGOS,
} from "./hud-numeros-enemigos.js";

// Movimiento reducido por defecto: ajuste del juego, `?reducir` o la preferencia del sistema (D-080, D-112).
/** @param {import('./hud-logica.js').Config} cfg */
function reducirPorDefecto(cfg) {
  // Se guarda la consulta (no su valor): `matches` se lee en vivo, así cambiar la preferencia del sistema a mitad
  // de partida afecta a la siguiente tarjeta o franja sin recargar.
  const consulta =
    typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const param =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("reducir");
  return () => cfg.feel.reducirMovimiento || param || !!consulta?.matches;
}

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {() => import('./hud-logica.js').Combate | null} deps.getCombate combate en curso o null (recorrido)
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 * @param {() => import('./hud-logica.js').Mundo} [deps.getWorld] mundo de los números de daño (por defecto, el del combate)
 * @param {() => number} [deps.alturaNumero] m sobre el suelo del número del objetivo (por defecto, lo alto del jefe)
 * @param {() => import('../gameplay/tipos.js').EnemigoVista[]} [deps.getEnemigos] enemigos del pasillo (números de daño)
 * @param {(x: number, z: number) => number} [deps.alturaSuelo] m del suelo visual en (x, z) (D-210; 0 = plano)
 * @param {boolean} [deps.solo]
 * @param {HTMLElement} [deps.parent]
 * @param {() => boolean} [deps.reducir] movimiento reducido (por defecto: config, ?reducir o el sistema)
 */
export function crearHud({
  cfg,
  getCombate,
  toScreen,
  getWorld,
  alturaNumero,
  getEnemigos = () => [],
  alturaSuelo = () => 0,
  solo = false,
  parent = document.body,
  reducir = reducirPorDefecto(cfg),
}) {
  const quitarEstilos = montarEstilos(
    cfg.paleta,
    ESTILOS_CINE +
      ESTILOS_JEFE +
      ESTILOS_LAPIDA +
      ESTILOS_NUMEROS +
      ESTILOS_NUMEROS_ENEMIGOS +
      ESTILOS_TUTORIAL,
  );
  const root = document.createElement("div");
  root.id = "hud-combate"; // el id `hud` ya lo usa la barra superior de la página
  root.className = "hud";
  // Se monta sobre el canvas: las posiciones de toScreen son relativas a él.
  parent.appendChild(root);
  // Las franjas van primero en la capa: el título del jefe y los avisos quedan encima.
  const cine = crearCinematica({ parent: root, reducir });

  const disp = crearDispositivo(cfg);
  const dispositivo = () => disp.estado; // reutiliza el estado mientras se dibuja la tarjeta
  const renderTexto = crearRenderTexto(cfg);
  // El HUD entrega el combate a sus capas únicamente en los cuadros en que está presente.
  const jefe = crearHudJefe({
    cfg,
    parent: root,
    toScreen,
    renderTexto,
    dispositivo,
  });
  const lapida = crearHudLapida({
    cfg,
    parent: root,
    toScreen,
  });
  // Mundo de los números: el indicado, o el del combate. Sin ninguno de los dos no hay número que dibujar.
  const numeros = crearHudNumeros({
    cfg,
    parent: root,
    toScreen,
    altura: () => alturaNumero?.() ?? getCombate()?.jefe.def.altura ?? 0,
  });
  const numerosEnemigos = crearHudNumerosEnemigos({
    cfg,
    parent: root,
    toScreen,
    getEnemigos,
    alturaSuelo,
  });
  // Capas del jefe ocultas hasta que haya combate (se ocultan una vez al quedar sin combate, no cada cuadro).
  let capasJefe = true;
  /** @param {boolean} v */
  const mostrarCapasJefe = (v) => {
    if (v === capasJefe) return;
    capasJefe = v;
    jefe.visible = v;
    lapida.visible = v;
  };
  mostrarCapasJefe(false);
  const tutorial = crearHudTutorial({
    cfg,
    parent: root,
    renderTexto,
    dispositivo,
    solo,
    reducir,
  });

  return {
    /** @param {number} dt */
    update(dt) {
      disp.update(solo);
      const combate = getCombate();
      mostrarCapasJefe(!!combate);
      if (combate) {
        jefe.update(dt, combate);
        lapida.update(dt, combate);
      }
      numeros.update(getWorld?.() ?? combate?.w ?? null);
      numerosEnemigos.update(dt);
      tutorial.update(dt);
      cine.update(
        dt,
        combate?.estado === "presentacion" && combate.opts.primeraVez,
      );
    },
    /** @param {import('./hud-logica.js').EventoUI} ev */
    alEvento(ev) {
      tutorial.alEvento(ev);
      numerosEnemigos.alEvento(ev);
    },
    get dispositivo() {
      return disp.actual;
    },
    forzarDispositivo: disp.forzar,
    get tutorial() {
      return tutorial.estado;
    },
    get tarjeta() {
      return tutorial.tarjeta;
    },
    // Franjas de cine: mostrar(), ocultar(), fijar(v), seguirPresentacion(), valor, armada.
    cinematica: cine,
    // Oculta toda la capa (menú y resultados la tapan).
    /** @param {boolean} v */
    set visible(v) {
      root.hidden = !v;
    },
    dispose() {
      disp.dispose();
      jefe.dispose();
      lapida.dispose();
      numeros.dispose();
      numerosEnemigos.dispose();
      tutorial.dispose();
      cine.dispose();
      root.remove();
      quitarEstilos();
    },
  };
}
