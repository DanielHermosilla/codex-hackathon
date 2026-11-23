// Estilos compartidos del HUD: tipografías con licencia OFL (public/atados/fonts, CREDITS.md) y variables de color
// que salen de tokens de CONFIG.paleta. Un solo <style> para todos los componentes.
//   Cinzel (títulos y nombres) · Cormorant Garamond (frases, indicaciones, murales).
import { coloresHud, hexCss } from "./hud-logica.js";

const BASE = import.meta.env?.BASE_URL ?? "./";

const FUENTES = `
@font-face{font-family:'Cinzel';src:url('${BASE}atados/fonts/Cinzel.woff2') format('woff2');font-weight:400 900;font-display:swap;}
@font-face{font-family:'Cormorant Garamond';src:url('${BASE}atados/fonts/CormorantGaramond.woff2') format('woff2');font-weight:300 700;font-style:normal;font-display:swap;}
@font-face{font-family:'Cormorant Garamond';src:url('${BASE}atados/fonts/CormorantGaramond-Italic.woff2') format('woff2');font-weight:300 700;font-style:italic;font-display:swap;}
`;

const CSS = `
.hud{position:absolute;inset:0;z-index:2;pointer-events:none;color:var(--texto);font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;}
.hud .titulo,.hud .nombre{font-family:'Cinzel',Georgia,serif;font-weight:700;}
.hud .oculto{display:none;}
.hud kbd{display:inline-flex;align-items:center;justify-content:center;min-width:1.5em;height:1.5em;padding:0 .4em;margin:0 .15em;box-sizing:border-box;
  font:600 .7em/1 'Cinzel',Georgia,serif;letter-spacing:.04em;color:var(--texto);background:color-mix(in srgb,var(--fondo) 85%,transparent);
  border:2px solid var(--texto-suave);border-radius:5px;vertical-align:.12em;white-space:nowrap;}
.hud kbd.mando{border-radius:50%;min-width:1.7em;height:1.7em;padding:0;}
.hud kbd.sael{border-color:var(--sael);}
.hud kbd.odo{border-color:var(--odo);}
.hud kbd+kbd{margin-left:.1em;}
`;

// Monta fuentes, variables y CSS. Devuelve dispose().
/**
 * @param {import('../core/config.js').CONFIG['paleta']} paleta
 * @param {string} [css]
 */
export function montarEstilos(paleta, css = "") {
  const C = coloresHud(paleta);
  const vars =
    `:root{--texto:${hexCss(C.texto)};--texto-suave:${hexCss(C.textoSuave)};--fondo:${hexCss(C.fondo)};` +
    `--barra:${hexCss(C.barra)};--barra-inv:${hexCss(C.barraInv)};--estela:${hexCss(C.estela)};--destacado:${hexCss(C.destacado)};` +
    `--sael:${hexCss(C.sael)};--odo:${hexCss(C.odo)};}`;
  const style = document.createElement("style");
  style.textContent = FUENTES + vars + CSS + css;
  document.head.appendChild(style);
  return () => style.remove();
}
