// Furgón de completos del trigal. Las piezas se montan una sola vez al crear la sala.
import * as THREE from "three";

/** @param {{scene: THREE.Scene, cfg: typeof import("../core/config.js").CONFIG, keep: <T>(o: T) => T, posicion: {x:number, z:number}, mirarA?: number[]}} opciones */
export function crearPuesto({
  scene,
  cfg,
  keep,
  posicion,
  mirarA = cfg.render.puesto.mirarA,
}) {
  const p = cfg.render.puesto;
  const carro = new THREE.Group();
  const caja = keep(new THREE.BoxGeometry());
  const ovalo = keep(new THREE.SphereGeometry(0.5, 12, 8));
  const rueda = keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
  rueda.rotateX(Math.PI / 2); // El eje cruza el furgón de lado a lado.
  /** @param {number} color */
  const pintura = (color) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.8,
      }),
    );
  const verde = pintura(p.carro),
    crema = pintura(p.borde),
    oscuro = pintura(p.rueda);
  const vidrio = pintura(p.vidrio),
    pan = pintura(p.pan),
    palta = pintura(p.palta);

  /** Coloca una pieza en metros respecto del centro del furgón.
   * @param {THREE.BufferGeometry} forma @param {THREE.Material} material
   * @param {number} x @param {number} y @param {number} z
   * @param {number} ancho @param {number} alto @param {number} fondo */
  function pieza(forma, material, x, y, z, ancho, alto, fondo) {
    const m = new THREE.Mesh(forma, material);
    m.position.set(x, y, z);
    m.scale.set(ancho, alto, fondo);
    m.castShadow = true;
    carro.add(m);
    return m;
  }
  // Carrocería bicolor, cabina corta a la izquierda y ventanilla de atención.
  pieza(caja, verde, 0, 0.72, 0, 3.1, 0.85, 1.2);
  pieza(caja, crema, 0.35, 1.48, 0, 2.4, 0.98, 1.2);
  pieza(caja, vidrio, -1.17, 1.35, 0, 0.66, 0.54, 1.1);
  pieza(caja, crema, -1.17, 1.65, 0, 0.76, 0.1, 1.2);
  pieza(caja, oscuro, 0.35, 1.47, 0.61, 1.95, 0.62, 0.04);
  pieza(caja, crema, 0.35, 1.14, 0.75, 2.18, 0.09, 0.48);
  // Un toldo inclinado proyecta sombra sobre el mesón.
  pieza(caja, verde, 0.35, 1.92, 0.81, 2.5, 0.12, 0.64).rotation.x = 0.14;
  for (const x of [-1.02, 1.02]) {
    for (const z of [-0.59, 0.59]) {
      pieza(rueda, oscuro, x, 0.36, z, 0.68, 0.68, 0.2);
      pieza(rueda, crema, x, 0.36, z * 1.17, 0.32, 0.32, 0.04);
    }
  }
  // El letrero es un italiano gigante: pan abierto, vienesa, palta y mayonesa.
  for (const z of [-0.27, 0.27])
    pieza(ovalo, pan, 0.32, 2.24, z, 2.12, 0.51, 0.48);
  pieza(ovalo, pintura(p.vienesa), 0.32, 2.3, 0, 2.2, 0.4, 0.48);
  pieza(ovalo, palta, 0.32, 2.47, 0, 1.92, 0.21, 0.42);
  for (const x of [-0.25, 0.28, 0.81]) {
    pieza(ovalo, crema, x, 2.55, 0, 0.18, 0.12, 0.44).rotation.y = -0.45;
  }

  carro.position.set(posicion.x, 0, posicion.z);
  carro.rotation.y = Math.atan2(
    mirarA[0] - carro.position.x,
    mirarA[1] - carro.position.z,
  );
  carro.scale.setScalar(p.escala);
  scene.add(carro);

  return {
    /** @param {number[]} puntos */
    foco(puntos) {
      puntos.push(carro.position.x, carro.position.z, 2);
    },
    dispose() {
      scene.remove(carro);
    }, // El render libera las geometrías y pinturas registradas con keep.
  };
}
