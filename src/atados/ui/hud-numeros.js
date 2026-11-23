// Número de daño (D-080, D-166): un solo número sobre el jefe que crece mientras dura el contacto y se apaga
// al terminar. Activable/desactivable con CONFIG.hud.numeroDano.activo (ajustes, D-112). El hit-stop visual lo pone el render.
import { datosNumero } from "./hud-logica.js";

const CSS = `
.hud .numero{position:absolute;transform:translate(-50%,-100%);font:700 16px/1 'Cinzel',Georgia,serif;color:var(--texto);
  -webkit-text-stroke:.14em var(--fondo);paint-order:stroke fill;text-shadow:0 .06em .1em var(--fondo);white-space:nowrap;}
.hud .numero.fuerte{color:var(--destacado);}
`;

export const ESTILOS_NUMEROS = CSS;

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {() => import('./hud-logica.js').Mundo} deps.getWorld
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 * @param {() => number} deps.altura Altura del jefe sobre el suelo.
 * @param {HTMLElement} deps.parent
 */
export function crearHudNumeros({ cfg, getWorld, toScreen, altura, parent }) {
  const el = document.createElement("div");
  el.className = "numero oculto";
  parent.appendChild(el);
  const pos = { x: 0, y: 0, visible: false };
  let texto = "",
    tam = "",
    fuerte = false;
  return {
    update() {
      const w = getWorld();
      const d = datosNumero(w.dummy.hit, cfg);
      if (!d) {
        if (!el.classList.contains("oculto")) el.classList.add("oculto");
        return;
      }
      toScreen(
        w.dummy.x,
        altura() + cfg.hud.numeroDano.altoExtra,
        w.dummy.z,
        pos,
      );
      el.classList.toggle("oculto", !pos.visible);
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.opacity = d.opacidad.toFixed(2);
      const px = `${d.tamano.toFixed(0)}px`;
      if (px !== tam) {
        tam = px;
        el.style.fontSize = px;
      }
      if (d.texto !== texto) {
        texto = d.texto;
        el.textContent = texto;
      }
      if (d.fuerte !== fuerte) {
        fuerte = d.fuerte;
        el.classList.toggle("fuerte", fuerte);
      }
    },
    dispose() {
      el.remove();
    },
  };
}
