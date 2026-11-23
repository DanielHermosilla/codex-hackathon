import * as THREE from "three";

const lerp = THREE.MathUtils.lerp;
const suave = THREE.MathUtils.smoothstep;
const Z_UMBRAL = 9.7; // m: arco de entrada, junto al borde sur de la arena

// El umbral y la nave del fondo enmarcan el anfiteatro existente. Solo se montan para el epílogo.
/**
 * @param {THREE.Scene} scene
 * @param {import('./tipos.js').Keep} keep
 */
function montarUmbral(scene, keep) {
  const caja = keep(new THREE.BoxGeometry());
  const piedra = keep(
    new THREE.MeshStandardMaterial({ color: 0x343243, roughness: 0.95 }),
  );
  const canto = keep(
    new THREE.MeshStandardMaterial({ color: 0x5a4d52, roughness: 0.88 }),
  );
  const metal = keep(
    new THREE.MeshStandardMaterial({
      color: 0xa4784d,
      roughness: 0.54,
      metalness: 0.28,
    }),
  );
  const llama = keep(new THREE.MeshBasicMaterial({ color: 0xffc17b }));
  const suelo = keep(
    new THREE.MeshStandardMaterial({ color: 0x4e4754, roughness: 0.92 }),
  );

  /** @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z
   * @param {number} w @param {number} h @param {number} d */
  function bloque(mat, x, y, z, w, h, d) {
    const m = new THREE.Mesh(caja, mat);
    m.position.set(x, y, z); // m, centro de la pieza
    m.scale.set(w, h, d); // m, dimensiones de la pieza
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // Dovelas de piedra sobre el arco; la piedra angular de bronce queda centrada sobre la pareja.
  const radio = 3.45; // m, radio al centro de las dovelas
  for (let i = 0; i < 13; i++) {
    const ang = (i * Math.PI) / 12;
    bloque(
      i === 6 ? metal : i % 2 ? canto : piedra,
      radio * Math.cos(ang),
      3.25 + radio * Math.sin(ang),
      Z_UMBRAL,
      0.74,
      0.96,
      1.12,
    ).rotation.z = ang - Math.PI / 2;
  }
  for (const lado of [-1, 1]) {
    const x = lado * radio;
    bloque(piedra, x, 1.63, Z_UMBRAL, 0.96, 3.26, 1.14);
    bloque(canto, x, 0.24, Z_UMBRAL, 1.28, 0.48, 1.5);
    bloque(canto, x, 3.12, Z_UMBRAL, 1.19, 0.25, 1.38);
    bloque(metal, x, 2.19, Z_UMBRAL + 0.67, 0.29, 0.48, 0.24);
    bloque(llama, x, 2.32, Z_UMBRAL + 0.81, 0.12, 0.23, 0.16);
    const antorcha = new THREE.PointLight(0xffa765, 35, 12, 2);
    antorcha.position.set(x * 0.93, 2.34, Z_UMBRAL + 0.83);
    scene.add(antorcha);
    // El muro se pierde en la neblina. Los pilares y sus cornisas enmarcan el halo del guardián.
    for (let i = 0; i < 4; i++) {
      const fondoX = lado * (2.5 + i * 2.15);
      const fondoZ = -11.6 + i * i * 0.29;
      bloque(piedra, fondoX, 2.72, fondoZ, 2.42, 5.44, 1.06);
      bloque(canto, fondoX, 2.88, fondoZ + 0.6, 0.46, 5.76, 0.72);
      bloque(metal, fondoX, 4.1, fondoZ + 1.03, 0.18, 0.62, 0.12);
      bloque(llama, fondoX, 4.2, fondoZ + 1.13, 0.13, 0.18, 0.12);
      bloque(canto, fondoX, 5.52, fondoZ + 0.19, 2.5, 0.26, 1.55);
    }
  }
  bloque(piedra, 0, 3.03, -12.3, 5.4, 6.1, 0.88);
  for (let i = 0; i < 8; i++) {
    // Losas en el eje de entrada, apenas por encima del disco que ya tiene la sala.
    const z = 12.35 - i * 1.1;
    bloque(suelo, 0, -0.04, z, 4.5, 0.085, 1.04);
    for (const lado of [-1, 1])
      bloque(canto, lado * 2.23, 0.009, z, 0.07, 0.018, 1.04);
  }

  const contraluz = new THREE.PointLight(0x9f9bff, 92, 20, 2);
  contraluz.position.set(0, 5, -7.4); // m, detrás del Farolero
  scene.add(contraluz);
  const luzPaso = new THREE.PointLight(0xe6c2ff, 16, 7.5, 2);
  scene.add(luzPaso); // luz de rebote sobre las dos capas
  return luzPaso;
}

/**
 * Un solo plano desde detrás de Sael y Odo. Mueve su mundo de ensayo exclusivamente visual.
 * @param {{scene: THREE.Scene, camera: THREE.PerspectiveCamera,
 * keep: import('./tipos.js').Keep, cfg: import('./tipos.js').Cfg,
 * reducir: () => boolean | undefined}} deps
 */
export function crearPlanoEpilogo({ scene, camera, keep, cfg, reducir }) {
  const luzPaso = montarUmbral(scene, keep);
  const E = cfg.ui.epilogo;
  /** @param {import('../gameplay/tipos.js').Combate} c @param {number} t */
  return function situar(c, t) {
    const quieto = reducir();
    const [sael, odo] = c.w.players;
    // El Farolero encara el umbral, mientras las capas de ambos viajeros miran a cámara.
    c.jefe.face = Math.PI / 2; // rad: +z
    sael.face = odo.face = -Math.PI / 2; // rad: −z
    const arranque = 0.12; // s: primera pausa antes del paso
    const desde = 10.36,
      hasta = 2.2; // m: del umbral al centro del anfiteatro
    const k = quieto ? 1 : suave(t, arranque, E.finMarcha);
    const z = lerp(desde, hasta, k);
    // La derivada del desplazamiento alimenta las zancadas del rig existente, en m/s.
    const marcha = E.finMarcha - arranque;
    const u = THREE.MathUtils.clamp((t - arranque) / marcha, 0, 1);
    const velocidad = quieto ? 0 : ((desde - hasta) * 6 * u * (1 - u)) / marcha;
    const lado = lerp(1.09, 1.55, k);
    sael.x = -lado;
    sael.z = z - 0.32;
    odo.x = lado;
    odo.z = z + 0.32;
    sael.vz = odo.vz = -velocidad;
    // Los eslabones siguen las manos y ceden hacia atrás durante la marcha.
    const ch = c.w.chain;
    for (let i = 0; i <= ch.n; i++) {
      const p = i / ch.n;
      ch.x[i] = lerp(sael.x, odo.x, p);
      ch.z[i] =
        lerp(sael.z, odo.z, p) +
        Math.sin(Math.PI * p) * (0.6 + velocidad * 0.21);
    }

    // El encuadre se abre mientras cruza el arco. En vertical retrocede para mantener ambas siluetas completas.
    const distancia =
      lerp(4.1, 5.85, k) + Math.max(0, 1.25 - camera.aspect) * 5.8;
    camera.position.set(
      lerp(0.26, -0.24, k),
      lerp(1.83, 2.7, k),
      z + distancia,
    );
    camera.lookAt(0, lerp(1.36, 1.8, k), c.jefe.z);
    luzPaso.position.set(-0.68, 2.62, z + 1.7); // m: acompaña el paso sin iluminar la nave entera
  };
}
