// Altura visual del suelo del recorrido (D-210): la subida al Templo Ancla se ve con rampas y peldaños,
// pero la física sigue plana. Puro: sin three.js ni DOM. Lo leen personajes, cadena, VFX, enemigos,
// cámara y el decorado para que nada flote ni quede enterrado. Unidades: metros.
// La altura de un punto (x, z) sale de su proyección sobre la ruta (s) y de los tramos de
// `CONFIG.recorrido.altura`. Fuera del pasillo los peldaños se funden en una rampa lisa, así el terreno
// que rodea la escalinata sube con ella (sin escalones flotando ni cortes) y el lobby queda a 0.
import { crearRuta, nuevaProyeccion, proyectarRuta } from "../gameplay/ruta.js";

/**
 * Tramo de subida: entre s0 y s1 el suelo sube `sube` m; con `escalones` se hace en peldaños.
 * @typedef {{ s0: number, s1: number, sube: number, escalones?: number }} TramoAltura
 */

/**
 * Lo mínimo de CONFIG que necesita la altura (así los tests pasan una ruta propia).
 * @typedef {object} CfgAltura
 * @property {{ pasillo: { ruta: ReadonlyArray<ReadonlyArray<number>>, ancho: number }, altura: ReadonlyArray<TramoAltura> }} recorrido
 * @property {{ templo?: { bordeEscalones?: number } }} [render]
 */

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Altura del suelo sobre el eje de la ruta en `s` (m). Con `liso` los peldaños se leen como rampa.
 * @param {ReadonlyArray<TramoAltura>} tramos
 * @param {number} s  m recorridos desde el inicio de la ruta
 * @param {boolean} [liso]  true = ignora los peldaños (rampa continua del mismo desnivel)
 * @returns {number}
 */
export function alturaRuta(tramos, s, liso = false) {
  let h = 0; // m acumulados de los tramos ya pasados
  for (let i = 0; i < tramos.length; i++) {
    const t = tramos[i];
    if (s >= t.s1) {
      h += t.sube; // tramo entero por detrás: suma todo su desnivel
      continue;
    }
    if (s <= t.s0) continue; // tramo por delante: aún no sube
    const k = (s - t.s0) / (t.s1 - t.s0); // 0..1 de avance dentro del tramo
    const n = t.escalones ?? 0;
    // Peldaños: n huellas iguales; cada contrahuella sube sube/n al empezar su huella (la primera en s0).
    // Si cambias `escalones`, cambia cuántos saltos hay; con 0 es una rampa recta.
    h +=
      n > 0 && !liso
        ? (t.sube * Math.min(n, Math.floor(k * n) + 1)) / n
        : t.sube * k;
  }
  return h;
}

/**
 * Posiciones s (m) donde empieza cada peldaño: el decorado las usa para cortar la cinta del suelo justo en
 * el borde y que la contrahuella quede vertical.
 * @param {ReadonlyArray<TramoAltura>} tramos
 * @returns {number[]}
 */
export function bordesEscalones(tramos) {
  /** @type {number[]} */
  const out = [];
  for (const t of tramos) {
    const n = t.escalones ?? 0;
    for (let i = 0; i < n; i++) out.push(t.s0 + ((t.s1 - t.s0) * i) / n); // borde delantero de la huella i
  }
  return out;
}

/**
 * Crea la función de altura del suelo del recorrido. Barata: una proyección sobre la ruta (pocos tramos)
 * y una suma por tramo de subida; sin crear objetos por llamada.
 * @param {CfgAltura} cfg
 * @returns {(x: number, z: number) => number}  m sobre el plano de la física (lobby = 0)
 */
export function crearAlturaSuelo(cfg) {
  const R = cfg.recorrido;
  const ruta = crearRuta(R.pasillo.ruta, R.pasillo.ancho);
  const tramos = R.altura;
  const medio = R.pasillo.ancho / 2; // m: borde transitable del pasillo
  // m por fuera del borde en que los peldaños pasan a rampa lisa. 0 = el corte es justo en el borde.
  const borde = Math.max(1e-3, cfg.render?.templo?.bordeEscalones ?? 0);
  const p = nuevaProyeccion(); // se reutiliza: sin basura por eslabón ni por cuadro
  return (x, z) => {
    proyectarRuta(ruta, x, z, p);
    const escalon = alturaRuta(tramos, p.s);
    const k = clamp01((p.dist - medio) / borde); // 0 dentro del pasillo, 1 ya en el terreno de al lado
    if (k <= 0) return escalon;
    const liso = alturaRuta(tramos, p.s, true);
    return escalon + (liso - escalon) * k; // mezcla continua: sin escalón en el borde
  };
}
