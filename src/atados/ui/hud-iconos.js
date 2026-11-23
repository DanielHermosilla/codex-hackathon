// Iconos de tecla/botón en el DOM: seguimiento del dispositivo en uso (teclado o mando) y render de textos
// con marcas {dash} {ancla} {mover}. La lógica de qué icono toca es pura (hud-logica.js).
import { leerMandos } from "../core/input.js";
import {
  asignarMandos,
  familiaMando,
  elegirDispositivo,
  iconosAccion,
  jugadorDeTecla,
  mandoActivo,
  partirTexto,
} from "./hud-logica.js";

// Dispositivo de entrada en uso, por jugador: [Sael, Odo]. Cada uno es 'teclado' o 'mando'; el mando de cada
// jugador es el que le asigna la entrada real (asignarMandos). `forzar` solo sirve a las pruebas.
/**
 * @param {import('./hud-logica.js').Config} cfg
 * @param {EventTarget} [target]
 */
export function crearDispositivo(cfg, target = window) {
  const G = cfg.controls.gamepad;
  const actual = ["teclado", "teclado"];
  const familia = ["xbox", "xbox"];
  const tecla = [false, false];
  /** @type {(number | null)[]} */
  let slots = [null, null];
  // Un mando conectado puede seguir quieto mientras se muestra la tarjeta.
  const estado = { dispositivo: actual, familia, mandoCompartido: false };
  let forzado = false; // pruebas: mantiene el dispositivo forzado aunque no haya mando real
  /** @param {KeyboardEvent} e */
  const onKey = (e) => {
    const j = jugadorDeTecla(e.code, cfg);
    if (j !== null) tecla[j] = true;
  };
  target.addEventListener("keydown", /** @type {EventListener} */ (onKey));
  return {
    estado,
    get actual() {
      return actual;
    },
    get familia() {
      return familia;
    },
    /** @param {boolean} solo */
    update(solo) {
      const pads = leerMandos();
      slots = asignarMandos(slots, pads);
      estado.mandoCompartido = solo && slots[0] !== null && slots[1] === null;
      for (let i = 0; i < 2; i++) {
        const pad =
          slots[i] !== null ? pads[/** @type {number} */ (slots[i])] : null;
        const mando = mandoActivo(pad, G, estado.mandoCompartido && i === 0);
        actual[i] = elegirDispositivo(actual[i], {
          tecla: tecla[i],
          mando: mando && !tecla[i],
        });
        if (pad) familia[i] = familiaMando(pad.id);
        else if (actual[i] === "mando" && !forzado) actual[i] = "teclado"; // se desconectó: el aviso vuelve a las teclas
        tecla[i] = false;
      }
    },
    /** @param {string} d */
    forzar(d) {
      actual[0] = actual[1] = d;
      forzado = d === "mando";
    },
    dispose() {
      target.removeEventListener(
        "keydown",
        /** @type {EventListener} */ (onKey),
      );
    },
  };
}

// Rellena `el` con el texto y los iconos de la acción. Cachea por contenido: solo reconstruye si cambia algo.
/** @param {import('./hud-logica.js').Config} cfg */
export function crearRenderTexto(cfg) {
  const cache = new WeakMap();
  /** @type {import('./hud-logica.js').RenderTexto} */
  return function renderTexto(el, texto, estado) {
    const { dispositivo, familia, solo, mandoCompartido } = estado;
    const clave = `${/** @type {any[]} */ ([]).concat(dispositivo)}|${/** @type {any[]} */ ([]).concat(familia)}|${solo ? (mandoCompartido ? 2 : 1) : 0}|${texto}`;
    if (cache.get(el) === clave) return;
    cache.set(el, clave);
    el.textContent = "";
    for (const trozo of partirTexto(texto)) {
      if (trozo.tipo === "texto") {
        el.append(document.createTextNode(trozo.v));
        continue;
      }
      for (const ic of iconosAccion(trozo.v, estado, cfg)) {
        const k = document.createElement("kbd");
        k.textContent = ic.etiqueta;
        k.className = [ic.tipo === "mando" ? "mando" : "", ic.jugador ?? ""]
          .filter(Boolean)
          .join(" ");
        el.append(k);
      }
    }
  };
}
