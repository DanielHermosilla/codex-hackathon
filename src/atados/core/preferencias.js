// Las preferencias describen teclas físicas. El juego y el HUD reciben el mismo mapa.
import { CONFIG } from "./config.js";

/** @typedef {"sael" | "odo"} Jugador */
/** @typedef {"up" | "left" | "down" | "right" | "dash" | "anchor"} Accion */
export const jugadores = /** @type {const} */ (["sael", "odo"]);
export const acciones = /** @type {const} */ ([
  "up",
  "left",
  "down",
  "right",
  "anchor",
  "dash",
]);
const originales = CONFIG.controls.keyboard;
const clave = "atados.ajustes.v1";

/** @param {typeof originales} teclado @param {Jugador} jugador @param {Accion} accion */
export function teclasDe(teclado, jugador, accion) {
  const valor = teclado[jugador][accion];
  return Array.isArray(valor) ? valor : [valor];
}

/** @param {string} codigo */
function permitida(codigo) {
  // P abre la tienda. Tab y Escape siguen disponibles para navegar y salir.
  return (
    codigo !== "KeyP" &&
    /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Enter|Shift(Left|Right)|Numpad(Enter|[0-9]))$/.test(
      codigo,
    )
  );
}

/** @param {typeof originales} teclado @param {Jugador} jugador @param {Accion} accion @param {string} codigo */
function asignar(teclado, jugador, accion, codigo) {
  if (accion === "dash" || accion === "anchor") {
    // Recuperar Intro como ancla de Odo también recupera su equivalente numérico.
    const base = originales[jugador][accion];
    teclado[jugador][accion] = codigo === base[0] ? [...base] : [codigo];
  } else teclado[jugador][accion] = codigo;
  // En solitario, la esquiva de Sael mueve a ambos.
  teclado.soloDash = [...teclado.sael.dash];
}

/** @param {typeof originales} teclado */
function hayDuplicados(teclado) {
  const usadas = new Set();
  for (const jugador of jugadores) {
    for (const accion of acciones) {
      for (const tecla of teclasDe(teclado, jugador, accion)) {
        if (usadas.has(tecla)) return true;
        usadas.add(tecla);
      }
    }
  }
  return false;
}

/** @param {typeof originales} teclado @param {Jugador} jugador @param {Accion} accion @param {string} codigo */
export function cambiarTecla(teclado, jugador, accion, codigo) {
  if (!permitida(codigo)) return "reservada";
  const nuevo = globalThis.structuredClone(teclado);
  asignar(nuevo, jugador, accion, codigo);
  if (hayDuplicados(nuevo)) return "ocupada";
  Object.assign(teclado, nuevo);
  return "";
}

export function cargarPreferencias() {
  const teclado = globalThis.structuredClone(originales);
  const ajustes = { teclado, volumen: CONFIG.audio.volumen.master };
  try {
    const datos = JSON.parse(window.localStorage.getItem(clave) ?? "null");
    if (!datos) return ajustes;
    if (
      Number.isFinite(datos.volumen) &&
      datos.volumen >= 0 &&
      datos.volumen <= 1
    )
      ajustes.volumen = datos.volumen;
    const candidato = globalThis.structuredClone(originales);
    for (const jugador of jugadores) {
      for (const accion of acciones) {
        const codigo = datos.teclas?.[jugador]?.[accion];
        if (typeof codigo !== "string" || !permitida(codigo)) return ajustes;
        asignar(candidato, jugador, accion, codigo);
      }
    }
    if (!hayDuplicados(candidato)) ajustes.teclado = candidato;
  } catch {
    // Una partida privada o datos antiguos no impiden arrancar.
  }
  return ajustes;
}

/** @param {ReturnType<typeof cargarPreferencias>} ajustes */
export function guardarPreferencias(ajustes) {
  const teclas = Object.fromEntries(
    jugadores.map((j) => [
      j,
      Object.fromEntries(
        acciones.map((a) => [a, teclasDe(ajustes.teclado, j, a)[0]]),
      ),
    ]),
  );
  try {
    window.localStorage.setItem(
      clave,
      JSON.stringify({ volumen: ajustes.volumen, teclas }),
    );
  } catch {
    // Si el navegador no permite guardar, los ajustes siguen activos durante la sesión.
  }
}
