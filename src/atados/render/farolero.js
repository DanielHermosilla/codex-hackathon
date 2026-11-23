import * as THREE from "three";
import { crearSenalesFarolero } from "./farolero-senales.js";

/**
 * Anfiteatro de bronce y guardián. Las marcas de cada toque comparten las posiciones del combate.
 * @param {{scene: THREE.Scene, keep: import('./tipos.js').Keep, world0: import('./tipos.js').Mundo,
 * decalMat: import('./tipos.js').DecalMat, reducir: () => boolean | undefined}} args
 */
export function crearArteFarolero({ scene, keep, world0, decalMat, reducir }) {
  const raiz = new THREE.Group(),
    cuerpo = new THREE.Group();
  raiz.add(cuerpo);
  scene.add(raiz);
  /** @param {number} color @param {THREE.MeshStandardMaterialParameters} [extra] */
  const mat = (color, extra = {}) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.81,
        ...extra,
      }),
    );
  const pizarra = mat(0x424557),
    basalto = mat(0x282b36),
    bronce = mat(0x9f774a, { roughness: 0.48, metalness: 0.25 });
  const capa = mat(0x242536),
    placa = mat(0x5e6070);
  const fuego = mat(0xfbb25f, { emissive: 0xffa747, emissiveIntensity: 2.0 });
  const ceniza = mat(0x3c3448);
  const geo = {
    caja: keep(new THREE.BoxGeometry()),
    prisma: keep(new THREE.CylinderGeometry(0.8, 1, 1, 6)),
    disco: keep(new THREE.CylinderGeometry(1, 1, 1, 64)),
    joya: keep(new THREE.OctahedronGeometry()),
    aro: keep(new THREE.TorusGeometry(1, 0.065, 4, 16)),
    junta: keep(new THREE.TorusGeometry(1, 0.014, 4, 60)),
    esfera: keep(new THREE.IcosahedronGeometry(1)),
  };
  /** @param {THREE.Object3D} padre @param {keyof typeof geo} figura @param {THREE.Material} material
   * @param {number[]} posicion @param {number[]} dimensiones */
  function malla(padre, figura, material, posicion, dimensiones) {
    const m = new THREE.Mesh(geo[figura], material);
    m.position.fromArray(posicion);
    m.scale.fromArray(dimensiones);
    padre.add(m);
    return m;
  }
  /** @param {THREE.Object3D} padre @param {number} x @param {number} y @param {number} z */
  function grupo(padre, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    padre.add(g);
    return g;
  }

  const radio = world0.arenaRadius;
  const piso = malla(
    scene,
    "disco",
    pizarra,
    [0, -0.22, 0],
    [radio + 0.25, 0.42, radio + 0.25],
  );
  piso.receiveShadow = true;
  const linea = malla(
    scene,
    "junta",
    bronce,
    [0, -0.005, 0],
    [radio, radio, 0.28],
  );
  linea.rotation.x = Math.PI * 0.5;
  // Los anillos del pavimento quedan al ras. No recortan la salida ni la telegrafía.
  for (const r of [0.29, 0.6, 0.81]) {
    const aro = malla(
      scene,
      "junta",
      basalto,
      [0, -0.008, 0],
      [radio * r, radio * r, 0.15],
    );
    aro.rotation.x = Math.PI * 0.5;
  }
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const borde = grupo(
      scene,
      Math.cos(ang) * (radio + 1.15),
      0,
      Math.sin(ang) * (radio + 1.15),
    );
    borde.rotation.y = -ang;
    // Los contrafuertes exteriores quedan en el otro lado del límite jugable.
    malla(borde, "caja", basalto, [0, 0.48, 0], [1.08, 0.93, 0.94]);
    malla(borde, "prisma", pizarra, [0, 1.03, 0], [0.48, 0.23, 0.48]);
  }
  for (const p of world0.pillars) {
    const columna = grupo(scene, p.x, 0, p.z);
    malla(columna, "prisma", basalto, [0, 0.16, 0], [p.r, 0.32, p.r]);
    malla(
      columna,
      "prisma",
      pizarra,
      [0, 1.27, 0],
      [p.r * 0.86, 2.35, p.r * 0.86],
    ).castShadow = true;
    malla(
      columna,
      "prisma",
      bronce,
      [0, 2.42, 0],
      [p.r * 0.78, 0.16, p.r * 0.78],
    );
    malla(
      columna,
      "joya",
      basalto,
      [0, 2.68, 0],
      [p.r * 0.57, 0.32, p.r * 0.57],
    );
  }

  // Silueta del guardián: manto, máscara de metal y dos brazos articulados.
  malla(cuerpo, "prisma", capa, [-0.28, 1.46, 0], [0.79, 2.68, 1.0]);
  malla(cuerpo, "prisma", placa, [0.11, 2.28, 0], [0.78, 1.04, 0.81]);
  malla(cuerpo, "joya", bronce, [0.71, 2.35, 0], [0.15, 0.43, 0.3]);
  malla(cuerpo, "joya", capa, [0, 3.1, 0], [0.63, 0.62, 0.64]);
  malla(cuerpo, "prisma", placa, [0.37, 3.1, 0], [0.35, 0.58, 0.4]);
  malla(cuerpo, "caja", fuego, [0.63, 3.13, 0], [0.033, 0.095, 0.49]);
  malla(cuerpo, "prisma", bronce, [0.02, 3.57, 0], [0.49, 0.13, 0.53]);
  // La espalda y el dobladillo de la capa tienen peso al girar el cuerpo.
  const faldon = malla(
    cuerpo,
    "joya",
    capa,
    [-0.98, 1.66, 0],
    [0.57, 1.29, 1.07],
  );
  const farolBrazo = grupo(cuerpo, 0, 2.39, -0.86);
  malla(farolBrazo, "joya", placa, [0, 0, 0], [0.47, 0.39, 0.45]);
  malla(farolBrazo, "caja", capa, [0.52, -0.28, 0], [0.99, 0.26, 0.26]);
  const mano = grupo(farolBrazo, 1.03, -0.36, 0);
  /** @param {THREE.Object3D} padre @param {number} escala */
  function lampara(padre, escala) {
    const lam = grupo(padre, 0, 0, 0);
    lam.scale.setScalar(escala);
    malla(lam, "prisma", bronce, [0, -0.46, 0], [0.38, 0.18, 0.38]);
    malla(lam, "prisma", bronce, [0, 0.42, 0], [0.4, 0.21, 0.4]);
    for (const ang of [0, 2.1, 4.2]) {
      malla(
        lam,
        "caja",
        bronce,
        [Math.cos(ang) * 0.28, -0.02, Math.sin(ang) * 0.28],
        [0.058, 0.84, 0.058],
      );
    }
    const cristal = malla(
      lam,
      "joya",
      fuego,
      [0, -0.03, 0],
      [0.29, 0.43, 0.29],
    );
    malla(lam, "aro", bronce, [0, 0.55, 0], [0.17, 0.17, 0.17]);
    return { lam, cristal };
  }
  const farolJefe = lampara(mano, 1);

  const martillo = grupo(cuerpo, -0.06, 2.41, 0.94);
  malla(martillo, "joya", placa, [0, 0, 0], [0.51, 0.36, 0.41]);
  malla(martillo, "prisma", capa, [0, -0.5, 0], [0.25, 1.16, 0.25]);
  malla(martillo, "prisma", bronce, [0, -1.03, 0], [0.13, 1.32, 0.13]);
  malla(martillo, "caja", placa, [0, -1.56, 0], [0.75, 0.54, 0.69]);
  malla(martillo, "caja", bronce, [0, -1.56, 0], [0.27, 0.57, 0.74]);
  cuerpo.traverse((m) => {
    if (m instanceof THREE.Mesh) m.castShadow = true;
  });

  const senales = crearSenalesFarolero({ scene, keep, decalMat });
  // Un halo de bronce y tres péndulos hacen legible la silueta de quien dirige las campanas.
  const halo = malla(
    cuerpo,
    "aro",
    bronce,
    [-0.22, 3.01, 0],
    [1.14, 1.14, 1.12],
  );
  halo.rotation.y = Math.PI / 2;
  for (const lado of [-1, 0, 1]) {
    const alto = 1 - Math.abs(lado) * 0.35;
    malla(
      cuerpo,
      "caja",
      bronce,
      [-0.46, 2.88, lado * 0.85],
      [0.045, alto, 0.045],
    );
    malla(
      cuerpo,
      "joya",
      fuego,
      [-0.46, 2.87 - alto / 2, lado * 0.85],
      [0.1, 0.17, 0.1],
    );
  }
  const lapida = malla(
    scene,
    "prisma",
    ceniza,
    [0, 0.39, 0],
    [0.48, 0.78, 0.34],
  );
  const premio = malla(scene, "joya", fuego, [0, 0.94, 0], [0.25, 0.32, 0.25]);

  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pizarra.color.setHex(p.suelo);
    basalto.color.setHex(p.sueloAlt).multiplyScalar(0.55);
    capa.color.setHex(p.jefe).multiplyScalar(0.8);
  }
  /**
   * @param {import('./tipos.js').Combate} c @param {import('./tipos.js').Mundo} w
   * @param {number} dt @param {number} t @param {{flash: number}} efectos
   */
  function sync(c, w, dt, t, { flash: destello }) {
    const j = c.jefe,
      f = c.farolero;
    if (!f) return;
    const q = 1 - Math.max(0, Math.min(1, f.restante / f.duracion));
    const quieto = reducir();
    const pulso = quieto ? 0 : Math.sin(t * 2.6);
    const acierto = f.etapa === "acierto";
    const campanas = f.tipo === "campanas";
    const ecos = f.tipo === "ecos";
    const muestra = c.estado === "pelea" && j.vivo;
    senales.sync(
      f,
      muestra,
      t,
      Boolean(quieto),
      j,
      w.players[0].alive && w.players[1].alive,
    );
    raiz.visible = j.vivo;
    raiz.position.set(j.x, 0, j.z);
    raiz.rotation.y = -j.face;
    // Sostiene el prisma en alto, carga el martillo para los ecos y marca el ritmo de la secuencia.
    const gestoFarol = !muestra
      ? 0
      : acierto
        ? -0.6
        : ecos
          ? 0.22
          : campanas
            ? 0.52
            : 1.05;
    const gestoMartillo = !muestra
      ? 0
      : ecos && f.etapa === "reto"
        ? 0.7 + q * 1.4
        : campanas
          ? 0.4 + f.paso * 0.22
          : 0;
    const peso = 1 - Math.exp(-Math.min(dt, 0.1) * 12);
    martillo.rotation.z += (gestoMartillo - martillo.rotation.z) * peso;
    farolBrazo.rotation.z += (gestoFarol - farolBrazo.rotation.z) * peso;
    cuerpo.rotation.z = acierto && muestra ? Math.sin(Math.PI * q) * 0.16 : 0;
    cuerpo.position.y = pulso * 0.032;
    faldon.rotation.z = pulso * 0.028;
    const tono = ecos ? 0xff7956 : campanas ? 0xffc354 : 0x61f0db;
    fuego.emissive.setHex(tono);
    fuego.color.setHex(tono);
    farolJefe.cristal.rotation.y = quieto ? 0 : t * 1.1;
    placa.emissive.setHex(0xffd790);
    placa.emissiveIntensity = Math.min(
      0.6,
      destello + (acierto && muestra ? 0.35 : 0),
    );
    lapida.visible = premio.visible = Boolean(c.lapida);
    if (c.lapida) {
      lapida.position.set(c.lapida.x, 0.39, c.lapida.z);
      premio.position.set(
        c.lapida.x,
        0.94 + 0.08 * Math.sin(t * 3),
        c.lapida.z,
      );
      premio.rotation.y = t;
    }
  }
  return { aplicarPaleta, sync, dispose() {} };
}
