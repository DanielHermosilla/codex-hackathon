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
  // Llama cálida y fija de velas y farolas: no cambia con la prueba (la que cambia es `fuego`).
  const llama = mat(0xffd08a, { emissive: 0xffb45c, emissiveIntensity: 2.2 });
  const geo = {
    caja: keep(new THREE.BoxGeometry()),
    prisma: keep(new THREE.CylinderGeometry(0.8, 1, 1, 6)),
    disco: keep(new THREE.CylinderGeometry(1, 1, 1, 64)),
    joya: keep(new THREE.OctahedronGeometry()),
    aro: keep(new THREE.TorusGeometry(1, 0.065, 4, 16)),
    junta: keep(new THREE.TorusGeometry(1, 0.014, 4, 60)),
    esfera: keep(new THREE.IcosahedronGeometry(1)),
    octo: keep(new THREE.CylinderGeometry(0.88, 1, 1, 8)), // tronco de cono octogonal (base 1, arriba 0,88)
    cono: keep(new THREE.ConeGeometry(1, 1, 6)), // punta de seis caras (capucha, tejadillos)
    cupula: keep(
      new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
    ), // media esfera
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
  // Farolas de bronce alrededor de la arena: el Farolero es quien las enciende. Quedan fuera del límite jugable.
  const nFarolas = 14; // farolas en el borde (más = anillo de luz más denso)
  for (let i = 0; i < nFarolas; i++) {
    const ang = (i / nFarolas) * Math.PI * 2; // reparto uniforme alrededor del centro
    const borde = grupo(
      scene,
      Math.cos(ang) * (radio + 1.15),
      0,
      Math.sin(ang) * (radio + 1.15),
    );
    borde.rotation.y = -ang; // cada farola mira al centro
    malla(borde, "octo", basalto, [0, 0.3, 0], [0.62, 0.6, 0.62]); // zócalo
    malla(borde, "octo", bronce, [0, 0.64, 0], [0.42, 0.08, 0.42]); // moldura
    malla(borde, "octo", pizarra, [0, 1.45, 0], [0.13, 1.6, 0.13]).castShadow =
      true; // fuste delgado (m)
    malla(borde, "caja", bronce, [-0.18, 2.2, 0], [0.42, 0.05, 0.05]); // brazo que sale hacia el centro
    malla(borde, "octo", bronce, [-0.38, 2.12, 0], [0.16, 0.06, 0.16]); // tapa del farolillo
    malla(borde, "joya", llama, [-0.38, 1.98, 0], [0.09, 0.15, 0.09]); // llama fija (pasa el umbral del bloom)
    malla(borde, "cono", bronce, [-0.38, 2.24, 0], [0.12, 0.14, 0.12]); // remate en punta
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

  // ─── Guardián (mira a +x; ~3,6 m) ───
  // Silueta en tres masas que se leen desde la cámara cenital: túnica acampanada, capucha en punta con máscara
  // y la pértiga del farol por encima de la cabeza. Los grupos `farolBrazo`, `martillo` y `faldon` se animan en sync.
  malla(cuerpo, "octo", capa, [0, 0.62, 0], [1.25, 1.24, 1.25]); // falda ancha de la túnica
  malla(cuerpo, "octo", bronce, [0, 0.06, 0], [1.3, 0.12, 1.3]); // ribete del bajo
  malla(cuerpo, "octo", capa, [0, 1.62, 0], [0.86, 0.9, 0.86]); // cintura
  malla(cuerpo, "octo", bronce, [0, 1.24, 0], [0.92, 0.14, 0.92]); // cinturón
  // Tiras de bronce en la abertura delantera y en los costados: dibujan la túnica contra el suelo oscuro.
  for (const ang of [0, Math.PI / 2, -Math.PI / 2]) {
    const tira = malla(
      cuerpo,
      "caja",
      bronce,
      [Math.cos(ang) * 1.19, 0.64, Math.sin(ang) * 1.19],
      [0.06, 1.2, 0.1],
    );
    tira.rotation.y = -ang; // de cara hacia fuera
    tira.rotation.z = Math.cos(ang) * 0.1; // sigue la inclinación de la falda
    tira.rotation.x = -Math.sin(ang) * 0.1;
  }
  malla(cuerpo, "octo", placa, [0.05, 2.25, 0], [0.82, 0.72, 0.96]); // pecho
  malla(cuerpo, "joya", bronce, [0.62, 2.2, 0], [0.16, 0.38, 0.32]); // broche del pecho
  malla(cuerpo, "joya", fuego, [0.72, 2.2, 0], [0.07, 0.17, 0.13]); // runa encendida (toma el color de la prueba)
  for (const lado of [-1, 1]) {
    // Hombreras de bronce: dan anchura a la silueta vista desde arriba.
    malla(cuerpo, "cupula", bronce, [0, 2.55, lado * 0.82], [0.46, 0.34, 0.46]);
    malla(cuerpo, "cupula", placa, [0, 2.48, lado * 0.82], [0.52, 0.2, 0.52]);
  }
  // Capucha: cono de seis caras inclinado hacia delante y máscara de metal con rendija de luz.
  const capucha = grupo(cuerpo, 0, 3.0, 0);
  capucha.rotation.z = -0.12; // rad: se asoma hacia la arena
  malla(capucha, "cono", capa, [-0.08, 0.36, 0], [0.62, 1.15, 0.62]);
  malla(capucha, "octo", capa, [0, -0.12, 0], [0.6, 0.32, 0.6]); // cuello de la capucha
  malla(capucha, "octo", placa, [0.32, 0.02, 0], [0.12, 0.5, 0.36]); // máscara
  malla(capucha, "caja", fuego, [0.4, 0.06, 0], [0.04, 0.06, 0.4]); // rendija de los ojos
  malla(capucha, "joya", bronce, [0.42, 0.3, 0], [0.06, 0.12, 0.08]); // cresta de la frente
  // La espalda y el dobladillo de la capa tienen peso al girar el cuerpo.
  const faldon = malla(cuerpo, "cono", capa, [-0.72, 1.5, 0], [0.7, 2.6, 1.15]);
  faldon.rotation.z = 0.18; // rad: cae hacia atrás
  // Brazo del farol: hombro, antebrazo y una pértiga larga con el farol colgando del gancho.
  const farolBrazo = grupo(cuerpo, 0, 2.4, -0.86);
  malla(farolBrazo, "joya", placa, [0, 0, 0], [0.4, 0.36, 0.4]);
  malla(
    farolBrazo,
    "octo",
    capa,
    [0.4, -0.26, 0],
    [0.22, 0.7, 0.22],
  ).rotation.z = 1.1; // manga (rad: apunta hacia delante)
  const mano = grupo(farolBrazo, 0.78, -0.4, 0);
  malla(mano, "octo", bronce, [0.1, 0.95, 0], [0.06, 2.6, 0.06]); // pértiga (m)
  malla(mano, "caja", bronce, [0.32, 2.22, 0], [0.5, 0.05, 0.05]); // gancho
  malla(mano, "joya", fuego, [0.1, 2.3, 0], [0.08, 0.13, 0.08]); // chispa en la punta
  /** @param {THREE.Object3D} padre @param {number} escala */
  function lampara(padre, escala) {
    const lam = grupo(padre, 0, 0, 0);
    lam.scale.setScalar(escala);
    malla(lam, "octo", bronce, [0, -0.46, 0], [0.36, 0.12, 0.36]); // base
    malla(lam, "cono", bronce, [0, 0.55, 0], [0.42, 0.32, 0.42]); // tejadillo
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4; // cuatro barrotes
      malla(
        lam,
        "caja",
        bronce,
        [Math.cos(ang) * 0.27, -0.02, Math.sin(ang) * 0.27],
        [0.05, 0.84, 0.05],
      );
    }
    const cristal = malla(lam, "joya", fuego, [0, -0.03, 0], [0.26, 0.4, 0.26]);
    malla(lam, "aro", bronce, [0, 0.78, 0], [0.14, 0.14, 0.14]); // argolla
    return { lam, cristal };
  }
  const colgante = grupo(mano, 0.55, 1.55, 0); // cuelga del gancho de la pértiga
  const farolJefe = lampara(colgante, 0.95);
  // Luz del farol: baña la túnica y el suelo cercano con el color de la prueba (sin sombras: es barata).
  const luzFarol = new THREE.PointLight(0x61f0db, 6, 7, 1.6); // color, intensidad, alcance (m), caída
  luzFarol.position.set(0, -0.1, 0);
  colgante.add(luzFarol);

  // Mazo de campanero: mango largo y cabeza de bronce en forma de campana.
  const martillo = grupo(cuerpo, -0.06, 2.41, 0.94);
  malla(martillo, "joya", placa, [0, 0, 0], [0.44, 0.34, 0.4]);
  malla(martillo, "octo", capa, [0, -0.45, 0], [0.22, 0.9, 0.22]); // manga
  malla(martillo, "octo", bronce, [0, -1.05, 0], [0.07, 1.2, 0.07]); // mango
  malla(
    martillo,
    "cupula",
    bronce,
    [0, -1.72, 0],
    [0.38, 0.5, 0.38],
  ).rotation.x = Math.PI; // campana boca abajo
  malla(martillo, "octo", placa, [0, -1.66, 0], [0.42, 0.06, 0.42]); // labio de la campana
  cuerpo.traverse((m) => {
    if (m instanceof THREE.Mesh) m.castShadow = true;
  });

  const senales = crearSenalesFarolero({ scene, keep, decalMat });
  // Halo de bronce con cinco velas y tres faroles colgando a la espalda: la silueta de quien enciende la arena.
  const halo = malla(
    cuerpo,
    "aro",
    bronce,
    [-0.32, 3.05, 0],
    [1.05, 1.05, 1.1],
  );
  halo.rotation.y = Math.PI / 2;
  for (let k = 0; k < 5; k++) {
    const ang = Math.PI * (0.15 + (k / 4) * 0.7); // rad: velas repartidas por el arco superior
    const y = 3.05 + Math.sin(ang) * 1.05,
      z = Math.cos(ang) * 1.05;
    malla(cuerpo, "octo", placa, [-0.32, y + 0.06, z], [0.05, 0.14, 0.05]); // vela
    malla(cuerpo, "joya", llama, [-0.32, y + 0.2, z], [0.05, 0.09, 0.05]); // llama fija
  }
  for (const lado of [-1, 0, 1]) {
    const alto = 1 - Math.abs(lado) * 0.35;
    malla(
      cuerpo,
      "caja",
      bronce,
      [-0.62, 2.88, lado * 0.7],
      [0.04, alto, 0.04],
    );
    malla(
      cuerpo,
      "joya",
      fuego,
      [-0.62, 2.87 - alto / 2, lado * 0.7],
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

  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pizarra.color.setHex(p.suelo);
    basalto.color.setHex(p.sueloAlt).multiplyScalar(0.55);
    capa.color.setHex(p.jefe).multiplyScalar(1.05); // túnica algo más clara que el suelo para separarla
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
    luzFarol.color.setHex(tono); // la luz del farol también anuncia la prueba
    farolJefe.cristal.rotation.y = quieto ? 0 : t * 1.1;
    placa.emissive.setHex(0xffd790);
    placa.emissiveIntensity = Math.min(
      0.6,
      destello + (acierto && muestra ? 0.35 : 0),
    );
    lapida.visible = Boolean(c.lapida);
    if (c.lapida) lapida.position.set(c.lapida.x, 0.39, c.lapida.z);
  }
  return { aplicarPaleta, sync, dispose() {} };
}
