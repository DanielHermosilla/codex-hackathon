// Lápida (D-098, D-100, D-174): las stats del combate escritas sobre la marca física del jefe, en el mundo
// y no en una pantalla de resultados. El texto aparece poco después de que la marca emerge y sigue a la marca
// en pantalla (se proyecta desde su posición de mundo). No persiste entre partidas en la demo.
import { t } from "../i18n/index.js";
import { escalon, formatoTiempo } from "./hud-logica.js";

export const ESTILOS_LAPIDA = `
.hud .lapida{position:absolute;transform:translate(-50%,-100%);min-width:250px;text-align:center;padding:14px 20px 12px;border-radius:4px;
  background:color-mix(in srgb,var(--fondo) 84%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--texto-suave) 40%,transparent);}
.hud .lapida .epitafio{font:700 17px/1.2 'Cinzel',Georgia,serif;letter-spacing:.08em;margin-bottom:2px;}
.hud .lapida .tiempo{font-size:30px;font-weight:600;line-height:1.1;margin:2px 0 6px;font-variant-numeric:lining-nums tabular-nums;}
.hud .lapida .cuadro{display:grid;grid-template-columns:1fr auto auto;column-gap:18px;row-gap:1px;font-size:20px;line-height:1.35;text-align:right;
  font-variant-numeric:lining-nums tabular-nums;font-weight:600;border-top:1px solid color-mix(in srgb,var(--texto-suave) 45%,transparent);padding-top:6px;}
.hud .lapida .cuadro .k{text-align:left;color:var(--texto-suave);font-weight:500;}
.hud .lapida .cuadro .cab{font:700 13px/1.6 'Cinzel',Georgia,serif;letter-spacing:.1em;}
.hud .lapida .sael{color:var(--sael);}.hud .lapida .odo{color:var(--odo);}
.hud .lapida .sin-dano:empty{display:none;}
.hud .lapida .sin-dano{margin-top:8px;font-style:italic;font-weight:600;font-size:19px;color:var(--destacado);}
`;

/**
 * @param {string} tag
 * @param {string | null} cls
 * @param {HTMLElement | null | undefined} parent
 * @param {string | null} [text]
 */
function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {HTMLElement} deps.parent
 * @param {() => import('./hud-logica.js').Combate} deps.getCombate
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 */
export function crearHudLapida({ cfg, parent, getCombate, toScreen }) {
  const L = cfg.hud.lapida;
  const root = el("div", "lapida", parent);
  const epitafio = el("div", "epitafio", root);
  const tiempo = el("div", "tiempo", root);
  const cuadro = el("div", "cuadro", root);
  el("span", "k", cuadro);
  const cabSael = el("span", "cab sael", cuadro);
  const cabOdo = el("span", "cab odo", cuadro);
  /** @type {[HTMLElement, string][]} */
  const etiquetas = [];
  /** @param {string} clave */
  const fila = (clave) => {
    etiquetas.push([el("span", "k", cuadro), clave]);
    return [el("span", "sael", cuadro), el("span", "odo", cuadro)];
  };
  const filas = {
    dano: fila("lapida.dano"),
    golpes: fila("lapida.golpes"),
    arrastres: fila("lapida.arrastres"),
  };
  const sinDano = el("div", "sin-dano", root);
  root.style.display = "none";

  const pos = { x: 0, y: 0, visible: false };
  const cache = new Map();
  /** @param {HTMLElement} e @param {string | number} v */
  const set = (e, v) => {
    const s = String(v);
    if (cache.get(e) !== s) {
      cache.set(e, s);
      e.textContent = s;
    }
  };
  let visibleT = 0;

  return {
    /** @param {number} dt */
    update(dt) {
      const c = getCombate();
      if (!c.lapida) {
        visibleT = 0;
        root.style.display = "none";
        return;
      }
      visibleT += dt;
      toScreen(c.lapida.x, L.altura, c.lapida.z, pos);
      const o = escalon(visibleT, L.retraso, L.fundido);
      root.style.display = pos.visible && o > 0 ? "block" : "none";
      root.style.left = `${pos.x}px`;
      root.style.top = `${pos.y}px`;
      root.style.opacity = o.toFixed(2);
      const s = c.stats;
      set(
        epitafio,
        t("lapida.titulo", { jefe: t(`jefe.${c.jefe.def.textos}.nombre`) }),
      );
      set(tiempo, formatoTiempo(s.tiempo));
      set(cabSael, t("jugador.sael"));
      set(cabOdo, t("jugador.odo"));
      for (const [k, clave] of etiquetas) set(k, t(clave));
      set(filas.dano[0], Math.round(s.dano[0]));
      set(filas.dano[1], Math.round(s.dano[1]));
      set(filas.golpes[0], s.golpes[0]);
      set(filas.golpes[1], s.golpes[1]);
      set(filas.arrastres[0], s.arrastres[0]);
      set(filas.arrastres[1], s.arrastres[1]);
      set(sinDano, s.sinDano ? t("lapida.sinDano") : "");
    },
    dispose() {
      root.remove();
    },
  };
}
