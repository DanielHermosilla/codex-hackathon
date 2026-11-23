import { muralText as es } from "./i18n/es.js";
import { muralText as en } from "./i18n/en.js";
import "./mural.css";

/**
 * Construye una sola vez la pequeña escena del puesto. El juego decide cuándo mostrarla.
 * @param {HTMLElement} element Contenedor situado en el borde inferior de la arena.
 */
export function createMural(element) {
  // El texto del diálogo sigue el idioma de la interfaz.
  const text = document.documentElement.lang.startsWith("en") ? en : es;
  // El título da contexto al lector de pantalla cuando aparece el diálogo.
  element.setAttribute("aria-label", text.stall);
  element.classList.add("atados-mural");
  element.hidden = true;

  // Esta plantilla solo contiene el texto fijo del juego y el emblema local.
  element.innerHTML = `
    <div class="mural-ticket">
      <div class="mural-heading">
        <span>${text.stall}</span>
        <span class="mural-broadcast">${text.radio}</span>
      </div>
      <div class="mural-dialogue">
        <dl>
          <dt>Sael</dt><dd>${text.sael}</dd>
          <dt>Odo</dt><dd>${text.odo}</dd>
        </dl>
        <img src="${import.meta.env.BASE_URL}atados/codex.svg" alt="Codex" width="24" height="24"/>
      </div>
    </div>`;

  return {
    show() {
      // Ocultar o mostrar conserva el mismo diálogo y la posición del teclado.
      element.hidden = false;
    },
    hide() {
      element.hidden = true;
    },
    dispose() {
      // Al desmontar el juego se libera también el contenido de este cartel.
      element.hidden = true;
      element.replaceChildren();
      element.classList.remove("atados-mural");
      element.removeAttribute("aria-label");
    },
  };
}
