// Muñeco de práctica: un espantapájaros grande y quieto que recibe los primeros cortes.
// Misma interfaz que el arte de Mirra (sync, aplicarPaleta, dispose) para que el render del combate
// no distinga entre jefes. Solo lee el estado: se inclina al recibir cortes y cae al quedarse sin vida.
import * as THREE from "three";
import { hornearEstatico, recolorear } from "./modelos.js";
import { mezclarHex } from "./paleta.js";

/**
 * @param {{scene: THREE.Scene, cfg: any, keep: <T>(o: T) => T, modelos: Record<string, any>, def: any}} opciones
 */
export function crearMuneco({ scene, cfg, keep, modelos, def }) {
  const M = cfg.render.muneco;
  // El modelo del espantapájaros se hornea en una sola malla con color por vértice (un draw call).
  const geo = keep(
    hornearEstatico(modelos.espantapajaros.scene, () => 0xffffff),
  );
  const mat = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true, // el color de cada pieza (madera, paja, tela) va en los vértices
      flatShading: true, // caras planas: el estilo low-poly del juego
      roughness: 0.9,
      emissive: 0xffffff, // el destello del corte enciende todo el muñeco
      emissiveIntensity: 0,
    }),
  );
  const cuerpo = new THREE.Mesh(geo, mat);
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;
  // `escala` agranda el modelo de pilar hasta la altura del muñeco de práctica (en metros).
  cuerpo.scale.setScalar(M.escala);
  // Diana plana en el suelo: distingue al muñeco (el objetivo) de los pilares, que usan el mismo modelo.
  const marca = new THREE.Mesh(
    keep(new THREE.RingGeometry(def.radio + 0.75, def.radio + 0.98, 48)),
    keep(
      new THREE.MeshBasicMaterial({
        color: cfg.paleta.cadena.runaTensa,
        transparent: true,
        opacity: M.marca,
        depthWrite: false,
      }),
    ),
  );
  marca.rotation.x = -Math.PI / 2; // acostada sobre el suelo
  marca.position.y = 0.04;
  const raiz = new THREE.Group();
  raiz.add(cuerpo, marca);
  scene.add(raiz);

  let caidaT = 0; // segundos desde que el muñeco se quedó sin vida
  let golpe = 0; // 0..1: cuánto se inclina por el último corte; se apaga solo
  let lado = 1; // hacia dónde se inclina (+1 o −1), según el lado del corte

  /** Recolorea las piezas con la paleta activa de la zona. @param {any} p */
  function aplicarPaleta(p) {
    recolorear(geo, (/** @type {string} */ n) => {
      // Cada nombre de material del GLB toma un token de la paleta (nunca hex sueltos).
      const colores = /** @type {Record<string, number>} */ ({
        madera: p.madera,
        paja: mezclarHex(p.vegetacion, 0xffffff, 0.12),
        tela: cfg.render.materiales.telaEspantapajaros,
        cuerda: cfg.render.materiales.cuerda,
      });
      return colores[n] ?? p.madera;
    });
  }

  /**
   * @param {any} c Combate (estado del jefe).
   * @param {any} w Mundo (jugadores, cadena y punto de contacto).
   * @param {number} dt Segundos de animación de este cuadro.
   * @param {number} tiempo Segundos totales, para el vaivén.
   * @param {{flash: number}} efectos `flash` 0..1 enciende el muñeco al cortarlo.
   */
  function sync(c, w, dt, tiempo, { flash }) {
    const j = c.jefe;
    raiz.position.set(j.x, 0, j.z);
    // Mira hacia el centro de la arena (donde empiezan Sael y Odo).
    raiz.rotation.y = Math.atan2(-j.x, -j.z);
    mat.emissiveIntensity = flash * M.flash;
    // Un corte en curso empuja el muñeco hacia el lado contrario al contacto.
    if (w.dummy.lastStep > 0) {
      golpe = 1;
      lado = w._contact.x >= j.x ? -1 : 1;
    }
    golpe = Math.max(0, golpe - dt * M.recuperacion);
    if (!j.vivo) {
      // Sin vida: cae de lado en `caida` segundos y se queda tumbado.
      caidaT = Math.min(M.caida, caidaT + dt);
      const k = caidaT / M.caida;
      cuerpo.rotation.z = lado * k * k * (Math.PI / 2.1);
      cuerpo.position.y = 0;
      marca.visible = false;
      return;
    }
    caidaT = 0;
    marca.visible = true;
    // Vaivén suave en reposo más el golpe del último corte (radianes).
    cuerpo.rotation.z =
      Math.sin(tiempo * 1.7) * M.vaiven + lado * golpe * M.inclinacion;
    cuerpo.position.y = golpe * 0.04;
  }

  return {
    sync,
    aplicarPaleta,
    dispose() {
      scene.remove(raiz);
    },
    // El muñeco no tiene huesos; se expone vacío por compatibilidad con el arte de Mirra.
    get huesos() {
      return {};
    },
    // La altura sirve para colocar los números de daño sobre la cabeza.
    altura: def.altura,
  };
}
