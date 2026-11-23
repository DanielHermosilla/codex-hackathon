// Enemigos de pasillo (D-140, D-209): mortales tocados por el polvo de esquirla de Mirra (cosecha, gula,
// langostas). Segador = campesino hueco con capucha y hoz (tajo en arco); brincador = mortal encorvado como
// una langosta, con patas traseras de salto (embiste en línea). Low-poly con sombreado plano (D-044) hecho
// en three.js, animación procedural por etapa (D-090), vetas ámbar de la Brasa corrupta (D-084) y
// telegrafías planas en el suelo con el código de gameplay (D-188: el aviso se llena de peligro).
// Pool fijo de `render.enemigos.max` huecos (regla 6): nada de `new THREE.*` por cuadro; solo lee el estado.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mezclarHex, resolverPaleta } from "./paleta.js";

// Canales de color de las piezas: cada vértice guarda su canal y la paleta decide el color real.
// ceniza = piel del segador (gris de ceniza) · cenizaB = piel del brincador (ceniza con tinte de trigo seco)
// · tela = capucha, túnica y harapos · costra = hueco de la cara y antenas · madera = mango de la hoz
// · metal = hoja de la hoz · veta = vetas ámbar · esquirla = esquirla clavada (las dos últimas, en la malla de brillo).
/** @typedef {"ceniza" | "cenizaB" | "tela" | "costra" | "madera" | "metal" | "veta" | "esquirla"} Canal */
/** @type {Canal[]} */
const CANALES = [
  "ceniza",
  "cenizaB",
  "tela",
  "costra",
  "madera",
  "metal",
  "veta",
  "esquirla",
];

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Curva suave 0..1 (smoothstep). @param {number} v */
const suave = (v) => {
  const e = clamp01(v);
  return e * e * (3 - 2 * e);
};

/**
 * Una pieza de un modelo: geometría ya colocada y su canal de color.
 * @typedef {{ g: THREE.BufferGeometry, canal: Canal }} Pieza
 */

/**
 * Fusiona piezas en una geometría no indexada (normales por cara: sombreado plano) con color por vértice.
 * Devuelve también el canal de cada vértice para recolorear con la paleta sin reconstruir nada.
 * @param {Pieza[]} piezas
 * @returns {{ geo: THREE.BufferGeometry, canales: Uint8Array }}
 */
function fusionar(piezas) {
  /** @type {THREE.BufferGeometry[]} */
  const sueltas = [];
  /** @type {number[]} */
  const porPieza = [];
  for (const p of piezas) {
    const q = p.g.index ? p.g.toNonIndexed() : p.g.clone();
    p.g.dispose();
    q.deleteAttribute("uv"); // no hay texturas: menos memoria y todas las piezas con los mismos atributos
    q.deleteAttribute("normal");
    sueltas.push(q);
    porPieza.push(CANALES.indexOf(p.canal));
  }
  const geo = mergeGeometries(sueltas);
  geo.computeVertexNormals(); // sin índice → una normal por cara
  const n = geo.attributes.position.count;
  const canales = new Uint8Array(n);
  let v = 0;
  sueltas.forEach((q, i) => {
    canales.fill(porPieza[i], v, v + q.attributes.position.count);
    v += q.attributes.position.count;
    q.dispose();
  });
  geo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3),
  );
  return { geo, canales };
}

// Temporales de construcción (solo al crear; nunca en el bucle).
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _y = new THREE.Vector3(0, 1, 0);

/**
 * Tira fina entre dos puntos (m): vetas ámbar, antenas, patas finas.
 * @param {number[]} p0 [x, y, z] @param {number[]} p1 [x, y, z] @param {number} grosor m
 * @param {number} [lados] caras del prisma
 */
function tira(p0, p1, grosor, lados = 4) {
  _a.fromArray(p0);
  _b.fromArray(p1).sub(_a);
  const largo = _b.length();
  const g = new THREE.CylinderGeometry(grosor * 0.7, grosor, largo, lados);
  g.translate(0, largo / 2, 0); // el pie del prisma queda en p0
  _q.setFromUnitVectors(_y, _b.normalize());
  g.applyQuaternion(_q);
  g.translate(_a.x, _a.y, _a.z);
  return g;
}

// ─── Segador: ~1,4 m de modelo (× escala), mira a +x, suelo en y = 0 ───
function geoSegador() {
  /** @type {Pieza[]} */
  const cuerpo = [];
  /** @type {Pieza[]} */
  const brillo = [];
  // Túnica larga hasta el suelo (tapa las piernas: se mueve por balanceo, no por pasos).
  const tunica = new THREE.ConeGeometry(0.36, 0.95, 7);
  tunica.translate(0, 0.5, 0);
  cuerpo.push({ g: tunica, canal: "tela" });
  // Torso encorvado hacia delante (hueco, cansado).
  const torso = new THREE.CylinderGeometry(0.19, 0.25, 0.42, 6);
  torso.rotateZ(-0.3);
  torso.translate(0.05, 1.08, 0);
  cuerpo.push({ g: torso, canal: "tela" });
  // Capucha: cono con la punta hacia atrás; dentro, el hueco oscuro de la cara.
  const capucha = new THREE.ConeGeometry(0.21, 0.5, 6);
  capucha.rotateZ(0.55);
  capucha.translate(0.1, 1.36, 0);
  cuerpo.push({ g: capucha, canal: "tela" });
  const cara = new THREE.OctahedronGeometry(0.12, 0);
  cara.scale(0.55, 1, 1);
  cara.translate(0.2, 1.3, 0);
  cuerpo.push({ g: cara, canal: "costra" });
  // Brazo izquierdo colgando (ceniza): el derecho va con la hoz (malla aparte, se anima).
  cuerpo.push({
    g: tira([0.08, 1.2, -0.22], [0.2, 0.78, -0.27], 0.045),
    canal: "ceniza",
  });
  const mano = new THREE.OctahedronGeometry(0.06, 0);
  mano.translate(0.21, 0.75, -0.27);
  cuerpo.push({ g: mano, canal: "ceniza" });
  // Ojos: dos brasas en el hueco de la capucha.
  for (const s of [-1, 1]) {
    const ojo = new THREE.OctahedronGeometry(0.035, 0);
    ojo.translate(0.25, 1.33, 0.05 * s);
    brillo.push({ g: ojo, canal: "veta" });
  }
  // Vetas ámbar por la túnica y el torso (siguen la superficie del cono, un poco por fuera).
  /** Punto sobre la túnica a la altura y (m) y el ángulo a (rad). @param {number} y @param {number} a */
  const enTunica = (y, a) => {
    const r = 0.36 * (1 - (y - 0.03) / 0.95) + 0.012;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  for (const [a, y0, y1, da] of [
    [0.4, 0.08, 0.62, 0.25],
    [-0.5, 0.15, 0.5, -0.35],
    [2.6, 0.05, 0.55, 0.3],
    [-2.2, 0.1, 0.42, -0.2],
  ])
    brillo.push({
      g: tira(enTunica(y0, a), enTunica(y1, a + da), 0.022, 3),
      canal: "veta",
    });
  brillo.push({
    g: tira([0.2, 0.92, 0.08], [0.14, 1.22, 0.16], 0.02, 3),
    canal: "veta",
  });
  // Esquirla clavada en el pecho (D-084): el polvo de la Brasa que los tocó.
  const esq = new THREE.OctahedronGeometry(0.08, 0);
  esq.scale(0.6, 1.5, 0.6);
  esq.rotateZ(-0.7);
  esq.translate(0.26, 1.02, 0.06);
  brillo.push({ g: esq, canal: "esquirla" });

  // Brazo derecho con la hoz. Pivote en el hombro (malla aparte); en local, el mango apunta a +x y baja.
  /** @type {Pieza[]} */
  const brazo = [];
  brazo.push({ g: tira([0, 0, 0], [0.3, -0.16, 0.02], 0.05), canal: "ceniza" });
  const dir = [Math.cos(-0.32), Math.sin(-0.32)]; // dirección del mango en el plano xy local
  const p0 = [0.3 - dir[0] * 0.25, -0.16 - dir[1] * 0.25, 0.02];
  const p1 = [0.3 + dir[0] * 1.05, -0.16 + dir[1] * 1.05, 0.02];
  brazo.push({ g: tira(p0, p1, 0.035, 5), canal: "madera" });
  // Hoja: media luna plana extruida. En su plano, nace en el origen, avanza por +x y la punta se curva hacia
  // +y; tumbada, avanza hacia −z (el lado hacia el que barre) y la punta vuelve hacia el segador (−x).
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  // m en el plano de la hoja (× 1,4 al construir: se tiene que leer desde la cámara de juego).
  for (const [x, y] of [
    [0.18, -0.05],
    [0.36, -0.04],
    [0.52, 0.04],
    [0.66, 0.18], // punta
    [0.48, 0.08],
    [0.32, 0.04],
    [0.16, 0.05],
    [0.02, 0.11],
  ])
    forma.lineTo(x * 1.4, y * 1.4);
  const hoja = new THREE.ExtrudeGeometry(forma, {
    depth: 0.04,
    bevelEnabled: false,
  });
  hoja.rotateX(-Math.PI / 2); // tumbada: (x, y) del plano → (x, −z)
  hoja.rotateY(Math.PI / 2); // +x del plano → −z; +y del plano → −x
  hoja.translate(p1[0], p1[1], p1[2]);
  brazo.push({ g: hoja, canal: "metal" });
  return {
    cuerpo: fusionar(cuerpo),
    brillo: fusionar(brillo),
    brazo: fusionar(brazo),
    hombro: [0.06, 1.2, 0.22], // m: pivote del brazo de la hoz en el modelo
  };
}

// ─── Brincador: mortal encorvado como langosta, ~1,05 m en la joroba, mira a +x ───
function geoBrincador() {
  /** @type {Pieza[]} */
  const cuerpo = [];
  /** @type {Pieza[]} */
  const brillo = [];
  // Tórax inclinado hacia delante y abdomen largo hacia atrás (silueta de langosta).
  const torax = new THREE.IcosahedronGeometry(0.36, 0);
  torax.scale(1.25, 0.8, 0.85);
  torax.rotateZ(-0.25);
  torax.translate(0.05, 0.7, 0);
  cuerpo.push({ g: torax, canal: "cenizaB" });
  const abdomen = new THREE.ConeGeometry(0.24, 0.75, 6);
  abdomen.rotateZ(Math.PI / 2 - 0.25); // la punta hacia atrás y algo abajo
  abdomen.translate(-0.55, 0.58, 0);
  cuerpo.push({ g: abdomen, canal: "cenizaB" });
  // Harapos sobre la espalda que se leen como alas plegadas.
  for (const s of [-1, 1]) {
    const ala = new THREE.BoxGeometry(0.95, 0.025, 0.24);
    ala.rotateX(0.18 * s);
    ala.rotateZ(0.22);
    ala.translate(-0.32, 0.93, 0.11 * s);
    cuerpo.push({ g: ala, canal: "tela" });
  }
  // Cabeza baja y larga, con capucha raída encima; ojos de brasa.
  const cabeza = new THREE.IcosahedronGeometry(0.19, 0);
  cabeza.scale(1, 1.3, 0.85);
  cabeza.rotateZ(-0.5);
  cabeza.translate(0.5, 0.78, 0);
  cuerpo.push({ g: cabeza, canal: "cenizaB" });
  const capucha = new THREE.ConeGeometry(0.2, 0.36, 6);
  capucha.rotateZ(0.9);
  capucha.translate(0.4, 0.95, 0);
  cuerpo.push({ g: capucha, canal: "tela" });
  for (const s of [-1, 1]) {
    // Antenas hacia atrás y arriba.
    cuerpo.push({
      g: tira([0.55, 0.98, 0.06 * s], [0.25, 1.42, 0.16 * s], 0.016, 3),
      canal: "costra",
    });
    // Brazos delanteros apoyados en el suelo (camina encorvado).
    cuerpo.push({
      g: tira([0.32, 0.62, 0.2 * s], [0.58, 0.02, 0.27 * s], 0.045),
      canal: "cenizaB",
    });
    const ojo = new THREE.OctahedronGeometry(0.055, 0);
    ojo.translate(0.62, 0.86, 0.1 * s);
    brillo.push({ g: ojo, canal: "veta" });
  }
  // Vetas por el tórax y el abdomen; esquirla clavada en la espalda.
  brillo.push({
    g: tira([0.3, 0.6, 0.27], [-0.05, 0.82, 0.26], 0.022, 3),
    canal: "veta",
  });
  brillo.push({
    g: tira([0.2, 0.52, -0.28], [-0.15, 0.66, -0.25], 0.022, 3),
    canal: "veta",
  });
  brillo.push({
    g: tira([-0.3, 0.68, 0.2], [-0.78, 0.5, 0.08], 0.02, 3),
    canal: "veta",
  });
  brillo.push({
    g: tira([-0.35, 0.5, -0.18], [-0.8, 0.46, -0.06], 0.02, 3),
    canal: "veta",
  });
  const esq = new THREE.OctahedronGeometry(0.09, 0);
  esq.scale(0.6, 1.6, 0.6);
  esq.rotateZ(0.6);
  esq.translate(-0.08, 1.02, 0);
  brillo.push({ g: esq, canal: "esquirla" });

  // Pata trasera de salto (una malla por lado, pivote en la cadera): muslo grueso hacia atrás y arriba,
  // canilla hasta el suelo. En local: cadera en el origen.
  /** @type {Pieza[]} */
  const pata = [];
  const muslo = new THREE.IcosahedronGeometry(0.17, 0);
  muslo.scale(2.4, 0.8, 0.65);
  muslo.rotateZ(-0.85); // sube hacia atrás: la rodilla asoma por encima del lomo
  muslo.translate(-0.26, 0.26, 0);
  pata.push({ g: muslo, canal: "cenizaB" });
  pata.push({
    g: tira([-0.53, 0.57, 0], [-0.38, -0.6, 0.04], 0.05),
    canal: "cenizaB",
  });
  pata.push({
    g: tira([-0.38, -0.6, 0.04], [-0.15, -0.61, 0.05], 0.035),
    canal: "costra",
  });
  return {
    cuerpo: fusionar(cuerpo),
    brillo: fusionar(brillo),
    pata: fusionar(pata),
    cadera: [-0.32, 0.62, 0.24], // m: pivote de las patas traseras (z = ± este valor)
  };
}

/**
 * @param {{
 *   scene: THREE.Scene,
 *   cfg: import('./tipos.js').Cfg,
 *   keep: import('./tipos.js').Keep,
 *   decalMat: import('./tipos.js').DecalMat,
 *   modelos?: import('./tipos.js').Modelos,
 *   flashes?: () => boolean,
 * }} args `modelos` queda por si un día hay GLB de enemigos (hoy se construyen aquí). `flashes` = false con
 *   flashes reducidos (D-112): el corte tiñe estable en vez de destellar.
 */
export function crearEnemigosArte({
  scene,
  cfg,
  keep,
  decalMat,
  flashes = () => true,
}) {
  const E = cfg.render.enemigos;
  const G = cfg.paleta.gameplay;
  const X = cfg.paleta.corrupcion;
  const MAT = cfg.render.materiales;

  // Geometrías compartidas por todos los huecos del pool.
  const seg = geoSegador();
  const brin = geoBrincador();
  const conColor = [
    seg.cuerpo,
    seg.brillo,
    seg.brazo,
    brin.cuerpo,
    brin.brillo,
    brin.pata,
  ];
  for (const m of conColor) keep(m.geo);

  // Telegrafías: mismas marcas planas que los jefes (aviso que se llena → peligro al activarse).
  const avisoMat = decalMat(G.aviso, G.avisoOpacidad);
  const rellenoMat = decalMat(G.peligro, G.avisoRellenoOpacidad);
  const peligroMat = decalMat(G.peligro, G.peligroOpacidad);
  // Cada marca tiene su propia geometría subdividida (creada al montar el pool, regla 6) cuyos vértices se
  // apoyan cada cuadro sobre la altura visual del suelo: en una rampa ningún borde del aviso queda enterrado
  // mientras gameplay sigue haciendo daño allí. Plantillas de radio / largo 1 en el plano del suelo:
  // · embestida: rectángulo que empieza en el origen y avanza por +x (sale del cuerpo); u = 0..1, w = −½..½.
  // · arco: abanico centrado en +x; por vértice, r = 0..1 y t = −½..½ (fracción de la apertura), así la
  //   apertura del tajo puede cambiar sin crear geometría nueva.
  const rectBase = new THREE.PlaneGeometry(
    1,
    1,
    E.marca.tramos[0],
    E.marca.tramos[1],
  );
  rectBase.rotateX(-Math.PI / 2);
  rectBase.translate(0.5, 0, 0);
  const AP0 = Math.PI / 2; // rad: apertura de la plantilla (cualquiera menor que una vuelta sirve)
  const secBase = new THREE.RingGeometry(
    0,
    1,
    E.marca.segmentos,
    E.marca.anillos,
    -AP0 / 2,
    AP0,
  );
  secBase.rotateX(-Math.PI / 2); // del plano XY al suelo: (x, y) → (x, −z)
  /** @param {THREE.BufferGeometry} g @param {boolean} arco */
  function plantilla(g, arco) {
    const pos = g.attributes.position;
    const a = new Float32Array(pos.count); // u (embestida) o r (arco)
    const b = new Float32Array(pos.count); // w (embestida) o t (arco)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      if (arco) {
        a[i] = Math.hypot(x, z);
        b[i] = a[i] > 1e-6 ? Math.atan2(-z, x) / AP0 : 0; // el centro no tiene ángulo
      } else {
        a[i] = x;
        b[i] = z;
      }
    }
    return { a, b, arco, index: g.index, n: pos.count };
  }
  const plantRect = plantilla(rectBase, false);
  const plantSec = plantilla(secBase, true);
  /**
   * Geometría propia de una marca, con las posiciones de la plantilla (se reescriben al apoyarla).
   * @param {ReturnType<typeof plantilla>} pl
   */
  function geoMarca(pl) {
    const g = keep(new THREE.BufferGeometry());
    const pos = new THREE.Float32BufferAttribute(new Float32Array(pl.n * 3), 3);
    pos.setUsage(THREE.DynamicDrawUsage); // cambia mientras la marca se ve
    g.setAttribute("position", pos);
    if (pl.index) g.setIndex(pl.index.clone());
    return { g, pl };
  }

  /**
   * Apoya una marca en el suelo: escribe sus vértices en el espacio local de la malla (que está en (zx, yb, zz),
   * girada −ang en y y escalada (sx, 1, sz)) con la altura del suelo bajo cada vértice, relativa a `yb`.
   * Sin asignaciones: solo recorre el buffer.
   * @param {{ g: THREE.BufferGeometry, pl: ReturnType<typeof plantilla> }} m
   * @param {number} zx m @param {number} zz m @param {number} ang rad hacia donde apunta
   * @param {number} sx m de largo o radio @param {number} sz m de ancho o radio
   * @param {number} apertura rad (solo arco)
   * @param {number} yb m: altura del suelo en el origen de la marca
   * @param {(x: number, z: number) => number} alturaSuelo
   */
  function apoyar(m, zx, zz, ang, sx, sz, apertura, yb, alturaSuelo) {
    const { a, b, arco, n } = m.pl;
    const pos = /** @type {THREE.BufferAttribute} */ (m.g.attributes.position);
    const arr = pos.array;
    const c = Math.cos(ang),
      s = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      let u = a[i],
        w = b[i];
      if (arco) {
        const t = b[i] * apertura; // rad dentro del abanico
        u = a[i] * Math.cos(t);
        w = -a[i] * Math.sin(t); // mismo sentido que la plantilla girada al suelo
      }
      const lx = u * sx,
        lz = w * sz; // m en el espacio de la marca (antes de girar)
      // Giro −ang en y (como la malla): +x local apunta a (cos ang, sin ang) en el mundo.
      const wx = zx + lx * c - lz * s,
        wz = zz + lx * s + lz * c;
      arr[i * 3] = u;
      arr[i * 3 + 1] = alturaSuelo(wx, wz) - yb; // la escala en y es 1: metros tal cual
      arr[i * 3 + 2] = w;
    }
    pos.needsUpdate = true;
  }

  /**
   * Un hueco del pool: los dos modelos (se ve el del tipo del enemigo) con materiales propios para el
   * destello y el brillo, y las dos marcas de su telegrafía.
   */
  function crearHueco() {
    const matCuerpo = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.9,
        emissive: 0xffffff, // el destello del corte enciende todo el cuerpo
        emissiveIntensity: 0,
      }),
    );
    // Brillo: color por vértice (veta / esquirla) multiplicado por la intensidad; > 1 pasa el umbral del bloom.
    const matBrillo = keep(
      new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    );
    /** @param {THREE.BufferGeometry} g @param {THREE.Material} m */
    const malla = (g, m) => {
      const o = new THREE.Mesh(g, m);
      o.castShadow = m === matCuerpo;
      return o;
    };
    // Segador
    const sRaiz = new THREE.Group();
    const sCuerpo = new THREE.Group(); // pivote del balanceo y el giro de cintura
    const brazo = new THREE.Group();
    brazo.position.fromArray(seg.hombro);
    brazo.add(malla(seg.brazo.geo, matCuerpo));
    sCuerpo.add(
      malla(seg.cuerpo.geo, matCuerpo),
      malla(seg.brillo.geo, matBrillo),
      brazo,
    );
    sRaiz.add(sCuerpo);
    // Brincador
    const bRaiz = new THREE.Group();
    const bCuerpo = new THREE.Group();
    /** @type {THREE.Group[]} */
    const patas = [];
    for (const s of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(brin.cadera[0], brin.cadera[1], brin.cadera[2] * s);
      const m = malla(brin.pata.geo, matCuerpo);
      if (s < 0) m.scale.z = -1; // espejo: la misma pata para los dos lados
      p.add(m);
      patas.push(p);
      bCuerpo.add(p);
    }
    bCuerpo.add(
      malla(brin.cuerpo.geo, matCuerpo),
      malla(brin.brillo.geo, matBrillo),
    );
    bRaiz.add(bCuerpo);
    for (const r of [sRaiz, bRaiz]) {
      r.scale.setScalar(E.escala);
      r.visible = false;
      scene.add(r);
    }
    // Marcas de la telegrafía en el suelo, cada una con su geometría de embestida y de arco.
    const marcas = {
      baseRect: geoMarca(plantRect),
      baseSec: geoMarca(plantSec),
      rellenoRect: geoMarca(plantRect),
      rellenoSec: geoMarca(plantSec),
    };
    const base = new THREE.Mesh(marcas.baseRect.g, avisoMat);
    const relleno = new THREE.Mesh(marcas.rellenoRect.g, rellenoMat);
    base.renderOrder = 2;
    relleno.renderOrder = 3;
    base.visible = relleno.visible = false;
    base.frustumCulled = relleno.frustumCulled = false;
    scene.add(base, relleno);
    return {
      sRaiz,
      sCuerpo,
      brazo,
      bRaiz,
      bCuerpo,
      patas,
      base,
      relleno,
      marcas,
      matCuerpo,
      matBrillo,
      id: -1, // enemigo que ocupa el hueco (-1 = libre)
      etapaPrev: "",
      polvoMedio: false, // ya soltó el segundo polvo al desmoronarse
      fase: 0, // rad: ciclo de paso al acechar
    };
  }
  const huecos = Array.from({ length: E.max }, crearHueco);
  rectBase.dispose(); // las plantillas ya se copiaron a cada marca
  secBase.dispose();

  // ─── Paleta: colores de cada canal (tokens; nunca hex sueltos) ───
  const _c = new THREE.Color();
  /** @type {Record<Canal, number>} */
  const colorCanal = {
    ceniza: 0,
    cenizaB: 0,
    tela: 0,
    costra: X.costra,
    madera: MAT.maderaHerramienta,
    metal: MAT.metal,
    veta: X.veta,
    esquirla: X.esquirla,
  };
  let corrupcion = 1;
  /**
   * Recolorea con la paleta de la zona (por defecto, la del pasillo de Mirra). Llamar solo al cambiar la
   * paleta (recorre vértices), no cada cuadro.
   * @param {import('./tipos.js').Paleta} p
   */
  function aplicarPaleta(p) {
    const piel = mezclarHex(p.jefe, p.piedra ?? p.sueloAlt, 0.25); // mortales grises de ceniza
    colorCanal.ceniza = piel;
    colorCanal.cenizaB = mezclarHex(piel, p.vegetacion, 0.3); // la langosta tira a trigo seco
    colorCanal.tela = mezclarHex(MAT.telaEspantapajaros, p.jefe, 0.45);
    corrupcion = p.corrupcion ?? 1;
    for (const { geo, canales } of conColor) {
      const col = geo.attributes.color;
      for (let i = 0; i < canales.length; i++) {
        _c.setHex(colorCanal[CANALES[canales[i]]]);
        col.setXYZ(i, _c.r, _c.g, _c.b);
      }
      col.needsUpdate = true;
    }
  }
  aplicarPaleta(resolverPaleta(cfg.recorrido?.pasillo?.paleta ?? "pasillo"));

  /**
   * Pose del segador según la etapa (m, rad; el modelo mira a +x en su espacio).
   * @param {ReturnType<typeof crearHueco>} h
   * @param {import('../gameplay/tipos.js').EnemigoVista} e
   * @param {number} tiempo
   */
  function poseSegador(h, e, tiempo) {
    const S = E.segador;
    const k = e.etapaK;
    const medio = ((e.zona?.angulo ?? 120) * Math.PI) / 360; // rad: media apertura del tajo
    // Reposo: hoz al hombro, en alto y algo a la derecha (+z).
    let yaw = -0.45,
      alzar = 1.05,
      giro = 0,
      bajar = 0,
      temblor = 0;
    if (e.etapa === "telegrafia") {
      // Anticipación: lleva la hoz atrás a la derecha, más allá del arco, la baja y se agacha.
      const s = suave(k);
      yaw = -0.45 + (-(medio + S.guardia) + 0.45) * s;
      alzar = 1.05 + (0.12 - 1.05) * s;
      giro = -0.35 * s;
      bajar = S.agacharse * s;
      temblor = k > 0.65 ? S.temblor * ((k - 0.65) / 0.35) : 0;
    } else if (e.etapa === "activo") {
      // Tajo: barre de derecha a izquierda, rápido al principio (ease-out).
      const s = 1 - (1 - k) * (1 - k) * (1 - k);
      yaw = -medio + 2 * medio * s;
      alzar = -0.05;
      giro = -0.35 + 0.75 * s;
      bajar = S.agacharse * (1 - 0.5 * s);
    } else if (e.etapa === "recupera") {
      // Queda vencido con la punta en el suelo y vuelve despacio a la guardia (ventana para cortarlo).
      const s = suave(k);
      yaw = medio + (-0.45 - medio) * s;
      alzar = -0.18 + (1.05 + 0.18) * s;
      giro = 0.4 * (1 - s);
      bajar = S.agacharse * 0.5 * (1 - s);
    }
    h.brazo.rotation.set(0, yaw, alzar + Math.sin(tiempo * 61) * temblor);
    h.sCuerpo.rotation.y = giro;
    h.sCuerpo.position.y -= bajar; // se suma a la base (el paso de acecha ya puso su rebote)
  }

  /**
   * Pose del brincador según la etapa.
   * @param {ReturnType<typeof crearHueco>} h
   * @param {import('../gameplay/tipos.js').EnemigoVista} e
   * @param {number} tiempo
   */
  function poseBrincador(h, e, tiempo) {
    const B = E.brincador;
    const k = e.etapaK;
    let bajar = 0,
      ladeo = 0,
      pliegue = 0,
      estirar = 0,
      alto = 0,
      dx = 0;
    if (e.etapa === "telegrafia") {
      // Se agacha y se echa atrás, patas plegadas; al final tiembla (va a saltar).
      const s = suave(k);
      bajar = B.agacharse * s;
      ladeo = 0.22 * s;
      pliegue = 0.45 * s;
      dx = k > 0.6 ? Math.sin(tiempo * 70) * B.temblor * ((k - 0.6) / 0.4) : 0;
    } else if (e.etapa === "activo") {
      // Embestida: estirado hacia delante, patas atrás, despegado del suelo.
      estirar = B.estirar * (1 - 0.4 * k);
      alto = B.salto * Math.sin(Math.PI * Math.min(1, k * 1.4));
      ladeo = -0.25;
      pliegue = -0.6;
    } else if (e.etapa === "recupera") {
      // Aterriza aplastado y se rehace.
      const s = suave(k);
      estirar = -0.22 * (1 - s);
      bajar = B.agacharse * 0.6 * (1 - s);
      pliegue = 0.3 * (1 - s);
    }
    // Se suma a la base que ya calculó sync (rebote de acecha): la pose no borra el saltito de persecución.
    h.bCuerpo.position.x += dx;
    h.bCuerpo.position.y += alto - bajar;
    h.bCuerpo.rotation.z += ladeo;
    // Squash & stretch con volumen aproximado: lo que se estira a lo largo se adelgaza en alto y ancho.
    h.bCuerpo.scale.set(1 + estirar, 1 - estirar * 0.45, 1 - estirar * 0.3);
    for (const p of h.patas) p.rotation.z = pliegue;
  }

  /**
   * @param {import('../gameplay/tipos.js').EnemigoVista[]} enemigos
   * @param {(x: number, z: number) => number} alturaSuelo m: altura visual del suelo (0 en arenas planas)
   * @param {number} dt s de animación de este cuadro
   * @param {number} tiempo s totales (vaivenes)
   * @param {import('./tipos.js').FxJefe} fx polvo, paja y sacudida al morir
   */
  function sync(enemigos, alturaSuelo, dt, tiempo, fx) {
    const conFlash = flashes();
    for (let i = 0; i < huecos.length; i++) {
      const h = huecos[i];
      const e = i < enemigos.length ? enemigos[i] : null;
      const muere = !!e && e.etapa === "muere";
      if (!e || (!e.vivo && !muere)) {
        // Hueco libre o enemigo ya desmoronado: nada visible.
        h.sRaiz.visible = h.bRaiz.visible = false;
        h.base.visible = h.relleno.visible = false;
        h.id = e ? e.id : -1;
        h.etapaPrev = e ? e.etapa : "";
        continue;
      }
      if (h.id !== e.id) {
        // Otro enemigo ocupa el hueco: se olvida lo del anterior.
        h.id = e.id;
        h.etapaPrev = "";
        h.polvoMedio = false;
        h.fase = 0;
      }
      const esSeg = e.tipo === "segador";
      const raiz = esSeg ? h.sRaiz : h.bRaiz;
      const cuerpo = esSeg ? h.sCuerpo : h.bCuerpo;
      h.sRaiz.visible = esSeg;
      h.bRaiz.visible = !esSeg;
      const y0 = alturaSuelo(e.x, e.z);
      raiz.position.set(e.x, y0, e.z);
      raiz.rotation.set(0, -e.face, 0); // el modelo mira a +x; face = rad hacia donde mira

      // Base común: reposo, paso al acechar y retroceso por el corte.
      cuerpo.position.set(0, 0, 0);
      cuerpo.rotation.set(0, 0, 0);
      cuerpo.scale.set(1, 1, 1);
      if (e.etapa === "quieto") {
        cuerpo.rotation.x =
          Math.sin(tiempo * E.quieto.velocidad + i * 1.7) * E.quieto.vaiven;
        cuerpo.rotation.z = 0.06; // cabizbajo: el polvo los tiene vacíos hasta que ven a alguien
      } else if (e.etapa === "acecha") {
        h.fase += dt * E.acecha.paso;
        const r = Math.abs(Math.sin(h.fase));
        cuerpo.position.y = r * E.acecha.rebote * (esSeg ? 1 : 1.8); // el brincador avanza a saltitos
        cuerpo.rotation.z = -E.acecha.inclinacion; // inclinado hacia delante, hacia su presa
        cuerpo.rotation.x = Math.sin(h.fase) * 0.06; // vaivén lateral del paso
      }
      const golpeK = e.golpeT < E.destello ? 1 - e.golpeT / E.destello : 0;
      cuerpo.rotation.z += golpeK * E.retroceso; // se echa atrás con el corte

      if (esSeg) poseSegador(h, e, tiempo);
      else poseBrincador(h, e, tiempo);

      // Vetas: brillo de reposo que sube durante la telegrafía (segunda señal además de la marca).
      let brillo = E.vetas.brillo;
      if (e.etapa === "telegrafia")
        brillo += (E.vetas.telegrafia - E.vetas.brillo) * e.etapaK;
      else if (e.etapa === "activo") brillo = E.vetas.telegrafia;

      // Muerte: se desmorona en paja y polvo, ladeado y hundiéndose en el suelo.
      if (muere) {
        const k = e.etapaK;
        if (h.etapaPrev !== "muere") {
          fx.paja(e.x, y0 + 0.9, e.z, E.muere.pajaN);
          fx.polvo(e.x, e.z, E.muere.polvoN, 1.2);
          h.polvoMedio = false;
        }
        if (!h.polvoMedio && k > 0.5) {
          fx.polvo(e.x, e.z, Math.ceil(E.muere.polvoN / 2), 0.8);
          h.polvoMedio = true;
        }
        const s = suave(k);
        cuerpo.rotation.x += s * E.muere.inclinar * 0.4;
        cuerpo.rotation.z += s * E.muere.inclinar;
        cuerpo.position.y -= s * E.muere.hundir;
        cuerpo.scale.set(
          1 - 0.35 * s,
          Math.max(0.05, 1 - 0.8 * s),
          1 - 0.35 * s,
        );
        brillo *= 1 - s;
      }
      h.matBrillo.color.setScalar(brillo * corrupcion);

      // Corte recibido: destello blanco breve o, con flashes reducidos, un aclarado estable.
      h.matCuerpo.emissiveIntensity = conFlash
        ? golpeK * E.flash
        : e.golpeT < E.destello * 3
          ? E.tinteReducido
          : 0;

      // Telegrafía en el suelo, con cada vértice sobre la altura visual (rampas y escalones del recorrido).
      const z = e.zona;
      const ver =
        !!z && !muere && (e.etapa === "telegrafia" || e.etapa === "activo");
      h.base.visible = ver;
      h.relleno.visible = ver && e.etapa === "telegrafia" && e.etapaK > 0.01;
      if (ver && z) {
        const activa = e.etapa === "activo";
        const linea = z.forma === "linea";
        const M = h.marcas;
        const mb = linea ? M.baseRect : M.baseSec;
        const mr = linea ? M.rellenoRect : M.rellenoSec;
        const ap = linea ? 0 : (z.angulo * Math.PI) / 180; // rad de apertura del tajo
        const yb = alturaSuelo(z.x, z.z); // m: suelo en el origen de la marca
        h.base.geometry = mb.g;
        h.relleno.geometry = mr.g;
        h.base.material = activa ? peligroMat : avisoMat;
        h.base.position.set(z.x, yb + E.marca.alto, z.z);
        h.relleno.position.set(z.x, yb + E.marca.relleno, z.z);
        h.base.rotation.set(0, -z.ang, 0);
        h.relleno.rotation.set(0, -z.ang, 0);
        const p = Math.max(0.01, e.etapa === "telegrafia" ? e.etapaK : 1); // el relleno crece hasta el golpe
        if (linea) {
          h.base.scale.set(z.largo, 1, z.ancho);
          h.relleno.scale.set(z.largo * p, 1, z.ancho);
        } else {
          h.base.scale.set(z.radio, 1, z.radio);
          h.relleno.scale.set(z.radio * p, 1, z.radio * p);
        }
        // Cada vértice sobre el relieve (con la escala ya puesta: el relleno pequeño mira el suelo bajo él).
        apoyar(
          mb,
          z.x,
          z.z,
          z.ang,
          h.base.scale.x,
          h.base.scale.z,
          ap,
          yb,
          alturaSuelo,
        );
        if (h.relleno.visible)
          apoyar(
            mr,
            z.x,
            z.z,
            z.ang,
            h.relleno.scale.x,
            h.relleno.scale.z,
            ap,
            yb,
            alturaSuelo,
          );
      }
      h.etapaPrev = e.etapa;
    }
  }

  return {
    sync,
    aplicarPaleta,
    dispose() {
      for (const h of huecos) scene.remove(h.sRaiz, h.bRaiz, h.base, h.relleno);
    },
  };
}
