// Entrada: teclado compartido + 1–2 mandos (D-032). Mapeo en CONFIG.controls (remapeable).
// Produce por jugador { mx, mz, dash, anchor }: mx/mz en el plano (W = -z, arriba en pantalla).
// `dash` = mantenido o pulsado desde el último muestreo (para no perder toques cortos entre frames).
import { emptyInput } from "../gameplay/mundo.js";

/** @type {readonly (Gamepad | null)[]} */
const SIN_MANDOS = []; // lista compartida para cuadros sin acceso a la API

/** Lee los mandos permitidos por el navegador. El teclado sigue disponible en páginas incrustadas. */
export function leerMandos() {
  try {
    return globalThis.navigator?.getGamepads?.() ?? SIN_MANDOS;
  } catch {
    return SIN_MANDOS; // la política de la página puede bloquear la lectura aunque el método exista
  }
}

/** @typedef {typeof import('./config.js').CONFIG} Config */
/**
 * Entrada de un jugador en un muestreo. `dashDown` = dash solo mantenido (sin contar toques entre frames).
 * @typedef {import('../gameplay/tipos.js').Entrada & { dashDown?: boolean }} Entrada
 */

/**
 * @param {Config} cfg
 * @param {EventTarget} [target] Origen de los eventos de teclado (`window` en las pruebas, el canvas en el juego).
 * @param {{ debug?: boolean }} [opciones]
 */
export function createInput(
  cfg,
  target = window,
  { debug: conDebug = false } = {},
) {
  const K = cfg.controls.keyboard;
  // Las teclas de prueba (herir, matar, reiniciar) solo existen con ?dev.
  const teclasDebug = conDebug ? K.debug : {};
  const down = new Set();
  const pressed = new Set();
  const tracked = new Set();
  for (const p of [K.sael, K.odo]) {
    for (const k of [p.up, p.down, p.left, p.right]) tracked.add(k);
    for (const k of [...p.dash, ...p.anchor]) tracked.add(k);
  }
  for (const k of K.soloDash) tracked.add(k);
  for (const k of Object.values(teclasDebug)) tracked.add(k);

  /** @param {KeyboardEvent} e */
  const onDown = (e) => {
    if (!tracked.has(e.code)) return;
    e.preventDefault(); // flechas y espacio no deben hacer scroll
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  };
  /** @param {KeyboardEvent} e */
  const onUp = (e) => {
    down.delete(e.code);
  };
  const onBlur = () => {
    down.clear(); // suelta las teclas sostenidas al salir del canvas
    pressed.clear(); // descarta también un toque que todavía no había leído la simulación
  };
  target.addEventListener("keydown", /** @type {EventListener} */ (onDown));
  target.addEventListener("keyup", /** @type {EventListener} */ (onUp));
  target.addEventListener("blur", onBlur);

  /** @type {Entrada[]} */
  const out = [emptyInput(), emptyInput()];
  /** @type {(Partial<Entrada> | null)[]} */
  const overrides = [null, null];
  /** @type {(number | null)[]} */
  const padSlot = [null, null]; // gamepad.index asignado a Sael / Odo
  /** @type {string[]} */
  const debug = [];
  /** @param {string[]} codes */
  const any = (codes) => codes.some((c) => down.has(c) || pressed.has(c));

  /**
   * Lee un mando hacia la entrada de un jugador. Por defecto usa el stick izquierdo y el gatillo de ancla.
   * @param {Gamepad | null | undefined} pad
   * @param {Entrada} o
   * @param {{ x?: number, y?: number, ancla?: number }} [ejes] Otros ejes o gatillo (modo solo con un mando).
   */
  function readPad(pad, o, ejes = {}) {
    const G = cfg.controls.gamepad;
    if (!pad) return;
    let ax = pad.axes[ejes.x ?? G.axisX] ?? 0,
      ay = pad.axes[ejes.y ?? G.axisY] ?? 0;
    if (Math.hypot(ax, ay) < G.deadzone) {
      ax = 0;
      ay = 0;
    }
    if (o.mx === 0 && o.mz === 0) {
      o.mx = ax;
      o.mz = ay;
    }
    if (pad.buttons[G.dash]?.pressed) {
      o.dash = true;
      o.dashDown = true;
    }
    if ((pad.buttons[ejes.ancla ?? G.anchor]?.value ?? 0) > G.anchorThreshold)
      o.anchor = true;
  }

  return {
    // Override de pruebas: window.__game.setInput(i, {...}) reemplaza la entrada real de ese jugador.
    /**
     * @param {number} i
     * @param {Partial<Entrada> | null} v
     */
    setOverride(i, v) {
      overrides[i] = v ? { ...emptyInput(), ...v } : null;
    },
    /** @param {boolean} solo */
    sample(solo) {
      const map = [K.sael, K.odo];
      for (let i = 0; i < 2; i++) {
        const m = map[i],
          o = out[i];
        o.mx = (down.has(m.right) ? 1 : 0) - (down.has(m.left) ? 1 : 0);
        o.mz = (down.has(m.down) ? 1 : 0) - (down.has(m.up) ? 1 : 0);
        const codes = solo ? K.soloDash : m.dash;
        o.dash = any(codes); // mantenido o tocado desde el último muestreo
        o.dashDown = codes.some((c) => down.has(c)); // solo mantenido
        o.anchor = m.anchor.some((c) => down.has(c));
        o.dashDir = null;
      }
      // Asignación estable mando → jugador por gamepad.index (desconectar uno no le pasa el control al otro).
      const pads = leerMandos();
      for (let i = 0; i < 2; i++)
        if (padSlot[i] !== null && !pads[/** @type {number} */ (padSlot[i])])
          padSlot[i] = null;
      for (const pad of pads) {
        if (!pad || padSlot.includes(pad.index)) continue;
        const libre = padSlot.indexOf(null);
        if (libre >= 0) padSlot[libre] = pad.index;
      }
      const S = cfg.controls.gamepad.solo;
      if (solo && padSlot[0] !== null && padSlot[1] === null) {
        // Un solo mando en modo solo: cada mitad del mando mueve a un personaje y A hace esquivar a los dos.
        const pad = pads[/** @type {number} */ (padSlot[0])];
        readPad(pad, out[0], { ancla: S.anclaSael });
        readPad(pad, out[1], { x: S.odoX, y: S.odoY, ancla: S.anclaOdo });
      } else {
        for (let i = 0; i < 2; i++)
          if (padSlot[i] !== null)
            readPad(pads[/** @type {number} */ (padSlot[i])], out[i]);
      }
      for (let i = 0; i < 2; i++)
        if (overrides[i]) {
          Object.assign(out[i], overrides[i]);
          out[i].dashDown = out[i].dash;
        }
      debug.length = 0;
      for (const [accion, code] of Object.entries(teclasDebug))
        if (pressed.has(code)) debug.push(accion);
      pressed.clear();
      return out;
    },
    debug,
    // Suelta todo al pausar o al perder el foco: ninguna tecla queda pegada.
    clear: onBlur,
    dispose() {
      target.removeEventListener(
        "keydown",
        /** @type {EventListener} */ (onDown),
      );
      target.removeEventListener("keyup", /** @type {EventListener} */ (onUp));
      target.removeEventListener("blur", onBlur);
    },
  };
}
