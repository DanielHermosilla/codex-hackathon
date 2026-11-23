// Configuración común del renderer para las escenas del juego (recorrido y pradera del jefe).
// El renderer es uno solo y lo comparten las dos escenas: cada vista la aplica al crearse y otra vez al activarse
// (`vista.activar()`), después de liberar la anterior. Ninguna vista la deshace al liberarse: si lo hiciera, el
// `dispose()` de la escena vieja apagaría las sombras y el tone mapping de la nueva.
import * as THREE from "three";

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ render: { exposicion: number } }} cfg
 */
export function configurarRenderer(renderer, cfg) {
  renderer.shadowMap.enabled = true; // sombras del sol
  renderer.shadowMap.type = THREE.PCFShadowMap; // filtro suave de las sombras
  renderer.toneMapping = THREE.NeutralToneMapping; // igual que la propuesta de color aprobada (D-188)
  renderer.toneMappingExposure = cfg.render.exposicion; // más = escena más clara
}

/**
 * Consulta de movimiento reducido del sistema que se lee en vivo (cambiarla a mitad de partida surte efecto
 * sin recargar). Devuelve una función que dice si el sistema lo pide ahora.
 * @returns {() => boolean}
 */
export function reducidoSistema() {
  const consulta =
    typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null; // se guarda la consulta, no su valor
  return () => !!consulta?.matches;
}
