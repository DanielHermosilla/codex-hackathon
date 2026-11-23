// Traducciones mínimas (D-102): todo texto visible pasa por t(clave). Idioma del navegador,
// cambiable (D-177); `?lang=en` lo fuerza. Sin DOM: el idioma se fija desde fuera.
import es from "./es.js";
import en from "./en.js";

/** @type {Record<string, Record<string, string>>} */
export const IDIOMAS = { es, en };
let idioma = "es";

/** @param {string} id */
export function setIdioma(id) {
  idioma = IDIOMAS[id] ? id : "es";
  return idioma;
}
export const getIdioma = () => idioma;

// Elige idioma a partir de una lista tipo navigator.languages.
/** @param {readonly string[]} [lista] */
export function idiomaDe(lista = []) {
  for (const l of lista) {
    const base = String(l).slice(0, 2).toLowerCase();
    if (IDIOMAS[base]) return base;
  }
  return "es";
}

// ¿Existe la clave en el idioma activo o en español?
/** @param {string} clave */
export const tieneClave = (clave) =>
  clave in IDIOMAS[idioma] || clave in IDIOMAS.es;

/**
 * @param {string} clave
 * @param {Record<string, any>} [vars]
 */
export function t(clave, vars) {
  let s = IDIOMAS[idioma][clave] ?? IDIOMAS.es[clave] ?? clave;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}
