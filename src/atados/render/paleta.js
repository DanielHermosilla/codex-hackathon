// Resuelve la paleta de una zona para un momento dado (D-083). Puro: sin three.js ni DOM.
import { CONFIG } from "../core/config.js";

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Mezcla dos colores 0xRRGGBB en espacio sRGB.
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
export function mezclarHex(a, b, t) {
  /** @param {number} c @param {number} s */
  const ch = (c, s) => (c >> s) & 255;
  let out = 0;
  for (const s of [16, 8, 0])
    out |= Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return out;
}

/**
 * k ∈ [0,1]: 0 = base, 1 = clímax. Pasillos usan el progreso; arenas, fase (1..3) e intensidad (0..1).
 * @param {string} tipo
 * @param {{ fase?: number, intensidad?: number, progreso?: number }} [momento]
 * @param {{ porFase: number, porIntensidad: number }} [mezcla]
 */
export function mezclaPaleta(
  tipo,
  { fase = 1, intensidad = 0, progreso = 0 } = {},
  mezcla = CONFIG.paleta.mezcla,
) {
  if (tipo === "pasillo") return clamp01(progreso);
  return clamp01(
    mezcla.porFase * (fase - 1) + mezcla.porIntensidad * intensidad,
  );
}

const ES_COLOR =
  /^(cielo|niebla$|sol$|hemiCielo|hemiSuelo|suelo|piedra|vegetacion|jefe|particula|agua|madera|brasaLuz$)/;

/**
 * @param {string} zona
 * @param {{ fase?: number, intensidad?: number, progreso?: number }} [momento]
 * @param {Record<string, any>} [zonas]
 * @returns {Record<string, any>}
 */
export function resolverPaleta(
  zona,
  momento = {},
  zonas = CONFIG.paleta.zonas,
) {
  const z = zonas[zona];
  if (!z) throw new Error(`zona de paleta desconocida: ${zona}`);
  const k = mezclaPaleta(z.tipo, momento);
  /** @type {Record<string, any>} */
  const out = { zona, k };
  for (const key of Object.keys(z.base)) {
    const a = z.base[key],
      b = z.climax[key] ?? a;
    out[key] = ES_COLOR.test(key) ? mezclarHex(a, b, k) : a + (b - a) * k;
  }
  return out;
}
