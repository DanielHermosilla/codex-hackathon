// HUD del juego: monta los componentes (jefe, lápida, números de daño, indicaciones) sobre una sola capa DOM.
// La vida, el dash y el ancla NO van aquí: son diegéticos, en el anillo del suelo (render/hud-anillos.js, D-063).
// `update(dt)` una vez por frame de render. `alEvento(ev)` recibe los eventos del flujo (tutorial:*, mural:*).
// `?dev` añade el HUD de debug (hud-debug.js), que no forma parte de esta capa.
import { montarEstilos } from "./hud-estilos.js";
import { crearHudJefe, ESTILOS_JEFE } from "./hud-jefe.js";
import { crearHudLapida, ESTILOS_LAPIDA } from "./hud-lapida.js";
import { crearHudNumeros, ESTILOS_NUMEROS } from "./hud-numeros.js";
import { crearHudTutorial, ESTILOS_TUTORIAL } from "./hud-tutorial.js";
import { crearDispositivo, crearRenderTexto } from "./hud-iconos.js";

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {() => import('./hud-logica.js').Combate} deps.getCombate
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 * @param {boolean} [deps.solo]
 * @param {HTMLElement} [deps.parent]
 */
export function crearHud({
  cfg,
  getCombate,
  toScreen,
  solo = false,
  parent = document.body,
}) {
  const quitarEstilos = montarEstilos(
    cfg.paleta,
    ESTILOS_JEFE + ESTILOS_LAPIDA + ESTILOS_NUMEROS + ESTILOS_TUTORIAL,
  );
  const root = document.createElement("div");
  root.id = "hud-combate"; // el id `hud` ya lo usa la barra superior de la página
  root.className = "hud";
  // Se monta sobre el canvas: las posiciones de toScreen son relativas a él.
  parent.appendChild(root);

  const disp = crearDispositivo(cfg);
  const dispositivo = () => ({
    dispositivo: disp.actual,
    familia: disp.familia,
  });
  const renderTexto = crearRenderTexto(cfg);
  const jefe = crearHudJefe({
    cfg,
    parent: root,
    getCombate,
    toScreen,
    renderTexto,
    dispositivo,
  });
  const lapida = crearHudLapida({ cfg, parent: root, getCombate, toScreen });
  const numeros = crearHudNumeros({
    cfg,
    parent: root,
    getWorld: () => getCombate().w,
    toScreen,
    altura: () => getCombate().jefe.def.altura,
  });
  const tutorial = crearHudTutorial({
    cfg,
    parent: root,
    renderTexto,
    dispositivo,
    solo,
  });

  return {
    /** @param {number} dt */
    update(dt) {
      disp.update();
      jefe.update(dt);
      lapida.update(dt);
      numeros.update();
      tutorial.update(dt);
    },
    alEvento: tutorial.alEvento,
    get dispositivo() {
      return disp.actual;
    },
    forzarDispositivo: disp.forzar,
    get tutorial() {
      return tutorial.estado;
    },
    // Oculta toda la capa (menú y resultados la tapan).
    /** @param {boolean} v */
    set visible(v) {
      root.hidden = !v;
    },
    dispose() {
      disp.dispose();
      jefe.dispose();
      lapida.dispose();
      numeros.dispose();
      tutorial.dispose();
      root.remove();
      quitarEstilos();
    },
  };
}
