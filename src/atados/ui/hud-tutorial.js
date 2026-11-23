// Indicaciones del pasillo: avisos breves del tutorial (D-066) y textos de los murales (D-126).
// No decide cuándo salen: los emite el flujo con
//   tutorial:mostrar {clave} · tutorial:ocultar · mural:activar {id} · mural:ocultar
// y se reciben por `alEvento(ev)` o como CustomEvent en `window` (detail = el resto de campos).
// El texto sale de i18n (`tutorial.<clave>` / `mural.<id>`, o la clave completa si trae punto) y puede llevar
// {dash} {ancla} {mover}, que se sustituyen por la tecla o el botón del dispositivo en uso.
import { t, tieneClave } from "../i18n/index.js";
import {
  aplicarEventoUI,
  avanzarUI,
  nuevoUI,
  claveTutorial,
  claveMural,
  EVENTOS_UI,
} from "./hud-logica.js";

const CSS = `
.hud .aviso-tutorial{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);width:max-content;max-width:70vw;text-align:center;
  font-size:clamp(22px,2.4vw,32px);font-weight:600;line-height:1.25;padding:.35em 1.1em .4em;border-radius:.4em;
  background:color-mix(in srgb,var(--fondo) 62%,transparent);text-shadow:0 1px 3px var(--fondo);}
.hud .mural{position:absolute;left:50%;top:14vh;transform:translateX(-50%);width:min(62vw,820px);text-align:center;
  background:radial-gradient(ellipse closest-side at 50% 50%,color-mix(in srgb,var(--fondo) 55%,transparent),transparent 100%);
  font-style:italic;font-weight:500;font-size:clamp(24px,2.8vw,40px);line-height:1.3;padding:1em 0;text-shadow:0 1px 6px var(--fondo),0 0 18px var(--fondo);}
.hud .mural::before,.hud .mural::after{content:'';display:block;height:1px;margin:0 auto;width:38%;
  background:linear-gradient(90deg,transparent,var(--texto-suave),transparent);}
.hud .mural::before{margin-bottom:.7em;}.hud .mural::after{margin-top:.7em;}
`;
export const ESTILOS_TUTORIAL = CSS;

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {HTMLElement} deps.parent
 * @param {import('./hud-logica.js').RenderTexto} deps.renderTexto
 * @param {() => import('./hud-logica.js').EstadoDispositivo} deps.dispositivo
 * @param {boolean} deps.solo
 * @param {EventTarget} [deps.target]
 */
export function crearHudTutorial({
  cfg,
  parent,
  renderTexto,
  dispositivo,
  solo,
  target = window,
}) {
  const ui = nuevoUI();
  const avisoEl = document.createElement("div");
  avisoEl.className = "aviso-tutorial oculto";
  const muralEl = document.createElement("div");
  muralEl.className = "mural oculto";
  parent.append(avisoEl, muralEl);

  /** @param {import('./hud-logica.js').EventoUI | null | undefined} ev */
  const alEvento = (ev) => {
    // Un texto sin traducción no se muestra (el id puede venir de un pasillo sin murales escritos).
    if (ev?.tipo === "tutorial:mostrar" && !tieneClave(claveTutorial(ev.clave)))
      return;
    if (ev?.tipo === "mural:activar" && !tieneClave(claveMural(ev.id))) return;
    aplicarEventoUI(ui, ev);
  };
  /** @type {[string, EventListener][]} */
  const oyentes = EVENTOS_UI.map((tipo) => {
    /** @param {CustomEvent} e */
    const f = (e) => alEvento({ tipo, ...(e.detail ?? {}) });
    target.addEventListener(tipo, /** @type {EventListener} */ (f));
    return [tipo, /** @type {EventListener} */ (f)];
  });

  /** @param {HTMLElement} el @param {import('./hud-logica.js').Aviso | null} x */
  const pinta = (el, x) => {
    el.classList.toggle("oculto", !x);
    if (!x) return;
    el.style.opacity = x.o.toFixed(2);
    renderTexto(el, t(x.clave), { ...dispositivo(), solo });
  };

  return {
    alEvento,
    /** @param {number} dt */
    update(dt) {
      avanzarUI(ui, dt, cfg);
      pinta(avisoEl, ui.tutorial);
      pinta(muralEl, ui.mural);
    },
    get estado() {
      return ui;
    },
    dispose() {
      for (const [tipo, f] of oyentes) target.removeEventListener(tipo, f);
      avisoEl.remove();
      muralEl.remove();
    },
  };
}
