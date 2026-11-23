// Franjas de cine (D-211): dos bandas, arriba y abajo, que entran durante la cinemática de entrada de Mirra y
// salen al terminar. No dibujan el título del jefe: ese lo pone hud-jefe.js en la presentación (D-180); las
// franjas se montan antes en la capa, así el título queda siempre por encima.
// Sincronía con la presentación: `seguirPresentacion()` arma las franjas para la próxima presentación del jefe;
// entran cuando el combate pasa a «presentacion» y salen cuando termina, una sola vez (la cinemática sale solo la
// primera vez, D-213: en el reintento no se arma). También se pueden manejar a mano con mostrar()/ocultar().
// El valor 0..1 avanza con el tiempo de juego (`update(dt)`), sin transiciones CSS: capturas fieles.
// Con movimiento reducido no se deslizan: aparecen y se van con un fundido.

import { CONFIG } from "../core/config.js";

// Tiempos (s) y tamaño (% del alto) de las franjas: CONFIG.hud.cinematica (PROVISIONAL, comentado allí).
export const CINE = CONFIG.hud.cinematica;

/** Estado de la sincronía con la presentación del jefe. @typedef {{ armada: boolean, vista: boolean }} SyncCine */

// Acerca `v` (0..1) a `objetivo` a velocidad constante: 1/entrada por s al subir, 1/salida por s al bajar.
/**
 * @param {number} v
 * @param {number} objetivo
 * @param {number} dt
 * @param {{ entrada: number, salida: number }} T
 */
export function avanzarCine(v, objetivo, dt, T) {
  if (objetivo > v)
    return T.entrada > 0 ? Math.min(objetivo, v + dt / T.entrada) : objetivo;
  if (objetivo < v)
    return T.salida > 0 ? Math.max(objetivo, v - dt / T.salida) : objetivo;
  return v;
}

// Suavizado de la posición: frena al llegar (cúbica de salida). 0 = fuera, 1 = dentro.
/** @param {number} v */
export const suaveCine = (v) => 1 - (1 - Math.min(1, Math.max(0, v))) ** 3;

/** @returns {SyncCine} */
export const nuevaSyncCine = () => ({ armada: false, vista: false });

// Un paso de la sincronía con la presentación. Devuelve 'mostrar', 'ocultar' o null (nada que hacer).
// Armada: al entrar en la presentación pide mostrar; al salir de ella pide ocultar y se desarma sola.
/**
 * @param {SyncCine} s
 * @param {boolean} enPresentacion
 * @returns {'mostrar' | 'ocultar' | null}
 */
export function pasoSyncCine(s, enPresentacion) {
  if (!s.armada) return null;
  if (enPresentacion) {
    s.vista = true; // ya empezó la presentación que esperábamos
    return "mostrar";
  }
  if (!s.vista) return null; // armada pero la presentación aún no llega (fundido y silencio del arco)
  s.armada = false; // terminó: la cinemática no se repite (D-213)
  s.vista = false;
  return "ocultar";
}

export const ESTILOS_CINE = `
.hud .franja{position:absolute;left:0;right:0;height:${CINE.alto}vh;background:var(--fondo);}
.hud .franja.arriba{top:0;}
.hud .franja.abajo{bottom:0;}
`;

/**
 * @param {object} deps
 * @param {HTMLElement} deps.parent capa del HUD
 * @param {() => boolean} [deps.reducir] movimiento reducido: fundido en vez de deslizamiento
 */
export function crearCinematica({ parent, reducir = () => false }) {
  const arriba = document.createElement("div");
  arriba.className = "franja arriba oculto";
  arriba.setAttribute("aria-hidden", "true");
  const abajo = document.createElement("div");
  abajo.className = "franja abajo oculto";
  abajo.setAttribute("aria-hidden", "true");
  // Primeros hijos de la capa: todo lo demás (título del jefe, avisos) se dibuja encima.
  parent.prepend(arriba, abajo);
  const sync = nuevaSyncCine();
  let v = 0; // 0 = fuera, 1 = dentro
  let objetivo = 0;
  let pintado = -1; // último valor dibujado: no toca el DOM si no cambió

  const pinta = () => {
    if (v === pintado) return;
    pintado = v;
    const fuera = v <= 0;
    arriba.classList.toggle("oculto", fuera);
    abajo.classList.toggle("oculto", fuera);
    if (fuera) return;
    if (reducir()) {
      // Sin movimiento: en su sitio, con fundido.
      arriba.style.transform = abajo.style.transform = "";
      arriba.style.opacity = abajo.style.opacity = v.toFixed(3);
      return;
    }
    const d = ((1 - suaveCine(v)) * 100).toFixed(1); // % de su alto que queda fuera de pantalla
    arriba.style.transform = `translateY(-${d}%)`;
    abajo.style.transform = `translateY(${d}%)`;
    arriba.style.opacity = abajo.style.opacity = "1";
  };

  return {
    mostrar() {
      objetivo = 1;
    },
    ocultar() {
      objetivo = 0;
    },
    // Fija el valor al momento (0..1), sin animación: para guiarlas desde fuera o para capturas.
    /** @param {number} x */
    fijar(x) {
      v = objetivo = Math.min(1, Math.max(0, x));
      pinta();
    },
    // Arma las franjas para la próxima presentación del jefe (solo la primera entrada a Mirra, D-213).
    seguirPresentacion() {
      sync.armada = true;
      sync.vista = false;
    },
    // Un paso: `enPresentacion` = el combate está en «presentacion» (lo lee hud.js del estado del combate).
    /** @param {number} dt @param {boolean} [enPresentacion] */
    update(dt, enPresentacion = false) {
      const orden = pasoSyncCine(sync, enPresentacion);
      if (orden === "mostrar") objetivo = 1;
      else if (orden === "ocultar") objetivo = 0;
      v = avanzarCine(v, objetivo, dt, CINE);
      pinta();
    },
    get valor() {
      return v;
    },
    get armada() {
      return sync.armada;
    },
    dispose() {
      arriba.remove();
      abajo.remove();
    },
  };
}
