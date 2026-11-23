// Pistas de música con licencia (D-061, D-182) en public/atados/audio/musica/<carpeta>/*.ogg|mp3.
// Se descubren en tiempo de build (import.meta.glob): si una carpeta no existe, no se pide nada por red
// (sin 404) y suena el placeholder por código. Reglas de nombres dentro de la carpeta de una zona:
//   - <capa>.ogg (p. ej. base.ogg, pulso.ogg) → stem de esa capa (todas del mismo largo, en bucle).
//   - cualquier otro archivo → «pista completa»: reemplaza a todas las capas de la zona (sin placeholders).
// Temas (menu, victoria, derrota): el primer archivo de su carpeta.

// Solo se usan las claves (qué archivos existen; Vite descarta los imports): se sirven desde public/.
const BASE = import.meta.env?.BASE_URL ?? "/";
// Vite reemplaza import.meta.glob al compilar. En las pruebas de Node no existe: sin pistas, suena el placeholder.
function listarPistas() {
  return Object.keys(
    import.meta.glob("/public/atados/audio/musica/**/*.{ogg,mp3}"),
  );
}
const URLS = Object.fromEntries(
  (import.meta.env ? listarPistas() : []).map((k) => [
    k,
    BASE + k.slice("/public/".length),
  ]),
);

/** @typedef {Record<string, Record<string, string>>} IndicePistas { carpeta: { nombre: url } } */

// rutas: { '/public/atados/audio/musica/<carpeta>/<nombre>.<ext>': url } → { carpeta: { nombre: url } } (prefiere .ogg).
/**
 * @param {Record<string, string>} rutas
 * @returns {IndicePistas}
 */
export function indexarPistas(rutas) {
  /** @type {IndicePistas} */
  const out = {};
  for (const ruta of Object.keys(rutas).sort()) {
    const m = /\/audio\/musica\/([^/]+)\/([^/]+)\.(ogg|mp3)$/i.exec(ruta);
    if (!m) continue;
    const [, carpeta, nombre, ext] = m;
    const c = (out[carpeta] ??= {});
    if (c[nombre] && ext.toLowerCase() === "mp3") continue;
    c[nombre] = rutas[ruta];
  }
  return out;
}

// Qué suena en una zona: { capas: {id: url}, completa: url | null }.
/**
 * @param {import('./reglas.js').Cfg} cfg
 * @param {string} zona
 * @param {IndicePistas} indice
 * @returns {{ capas: Record<string, string>, completa: string | null }}
 */
export function resolverZona(cfg, zona, indice) {
  const Z = cfg.audio.musica.zonas[zona];
  const archivos = (Z && indice[Z.carpeta]) || {};
  /** @type {Record<string, string>} */
  const capas = {};
  /** @type {string | null} */
  let completa = null;
  for (const nombre of Object.keys(archivos).sort()) {
    if (Z.capas[nombre]) capas[nombre] = archivos[nombre];
    else completa ??= archivos[nombre];
  }
  return { capas, completa };
}

/**
 * @param {import('./reglas.js').Cfg} cfg
 * @param {string} id
 * @param {IndicePistas} indice
 * @returns {string | null}
 */
export function resolverTema(cfg, id, indice) {
  const T = cfg.audio.musica.temas[id];
  const archivos = (T && indice[T.carpeta]) || {};
  const n = Object.keys(archivos).sort()[0];
  return n ? archivos[n] : null;
}

export const PISTAS = indexarPistas(URLS);
