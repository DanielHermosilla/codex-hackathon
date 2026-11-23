// Vestigios del Templo Celestial: conjuntos de ruinas talladas en la ladera del recorrido.
// Tres familias, todas de piedra trabajada y vistas desde la cámara cenital:
//   · Terrazas: estratos escalonados de bloques con juntas, hiedra colgando del frente y matas en las juntas.
//   · Dintel partido: umbral, dos jambas (una rota), medio dintel con dentículos y la otra mitad caída.
//   · Montón: anillo de bloques asentados, segunda capa y una piedra de remate inclinada, con verde entre bloques.
// Todo es decorado (no es gameplay): nunca entra en la cinta de losas ni en el claro del lobby.
// Posiciones deterministas (hash), geometría fusionada + dos InstancedMesh = 3 draw calls, sin update por cuadro.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { nuevaProyeccion, proyectarRuta, puntoRuta } from "../gameplay/ruta.js";

/** Ruido determinista 0..1. @param {number} x @param {number} z @returns {number} */
const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Tonos de piedra en sRGB: arenisca, rosa, gris, crema y ocre (estratos alternos). */
const TONOS_PIEDRA = [0xc8b089, 0xb99a82, 0xa7a294, 0xd6c39c, 0x9c8a74];
/** Musgo sobre las caras superiores. */
const MUSGO = 0x6d8a45;
/** Matas: cuatro verdes y dos acentos otoñales (raros). */
const TONOS_MATA = [0x5b7d37, 0x76944a, 0x4a6a36, 0x8c9b48, 0xa5652f, 0xb98f3c];
/** Hiedra colgante: verdes oscuros. */
const TONOS_HIEDRA = [0x46663a, 0x557a3e, 0x3d5a34, 0x6b8a44];
/** Muestras de una huella (centro y cuatro esquinas) en unidades de medio lado.
 * @type {ReadonlyArray<readonly [number, number]>} */
const ESQUINAS = [
  [0, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
/** m de junta entre bloques de un mismo estrato. */
const JUNTA = 0.08;

/**
 * Grano, líquenes y líneas de estrato en coordenadas de mundo (sin texturas ni UV).
 * @param {THREE.MeshStandardMaterial} mat
 * @returns {THREE.MeshStandardMaterial}
 */
function vetasTalladas(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vVestigio;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvVestigio = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vVestigio;
        float granoVestigio(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
          float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
          float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 nCara = normalize(cross(dFdx(vVestigio), dFdy(vVestigio)));
        float lateral = 1.0 - smoothstep(0.35, 0.75, abs(nCara.y));
        vec2 pv = mix(vVestigio.xz, vec2(vVestigio.x + vVestigio.z, vVestigio.y * 3.0), lateral);
        float poro = granoVestigio(pv * 9.0);
        float liquen = smoothstep(0.55, 0.8, granoVestigio(vVestigio.xz * 0.9 + vVestigio.y * 0.4));
        float estrato = smoothstep(0.86, 0.95, fract(vVestigio.y * 2.6)) * lateral;
        diffuseColor.rgb *= (0.9 + 0.16 * poro) * (1.0 - 0.24 * estrato);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 1.02, 0.8), liquen * 0.45);`,
      );
  };
  return mat;
}

/**
 * @typedef {object} ArgsVestigios
 * @property {THREE.Scene} scene
 * @property {import('./tipos.js').Keep} keep  registra geometrías y materiales para liberarlos
 * @property {import('../gameplay/ruta.js').Ruta} ruta
 * @property {number} ancho  m: medio ancho de la cinta de losas (W de templo.js)
 * @property {number} umbral  m de ruta (s) del arco de la cima
 * @property {(x: number, z: number) => number} terreno  cota de la malla de terreno (m)
 * @property {{ x: number, z: number }} centro  centro del claro del lobby
 * @property {number} radio  m: radio transitable del lobby
 */

/**
 * Crea los conjuntos de ruinas talladas de la ladera. Todo se construye aquí, una sola vez.
 * @param {ArgsVestigios} args
 * @returns {{ dispose: () => void }}
 */
export function crearVestigiosTemplo({
  scene,
  keep,
  ruta,
  ancho,
  umbral,
  terreno,
  centro,
  radio,
}) {
  const pq = nuevaProyeccion(); // reutilizada en todas las consultas
  const q = { x: 0, z: 0, ang: 0 };
  const o = new THREE.Object3D(); // transformaciones al construir (no por cuadro)
  const col = new THREE.Color();
  const musgo = new THREE.Color(MUSGO);
  const va = new THREE.Vector3(),
    vb = new THREE.Vector3(),
    vc = new THREE.Vector3(),
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3(),
    nf = new THREE.Vector3();

  /** @type {THREE.BufferGeometry[]} */
  const piezas = [];
  /** @type {number[]} x, y, z, escala, giro, semilla de color por mata */
  const matas = [];
  /** @type {number[]} x, y, z, giro, ancho, largo, semilla de color por hiedra */
  const hiedras = [];

  const holgura = ancho + 0.9; // m del eje: nada decorativo invade la cinta ni su cornisa

  /**
   * ¿Cabe una pieza de radio `r` en (x, z) sin tocar la cinta ni el claro?
   * @param {number} x @param {number} z @param {number} r
   * @returns {boolean}
   */
  function libre(x, z, r) {
    if (Math.hypot(x - centro.x, z - centro.z) - r < radio + 4) return false;
    proyectarRuta(ruta, x, z, pq);
    return pq.dist - r >= holgura;
  }

  // Marco local del conjunto: a = a lo largo de la ruta, b = hacia fuera del pasillo.
  let ox = 0,
    oz = 0,
    ux = 1,
    uz = 0,
    lado = -1,
    giro = 0;
  let wx = 0,
    wz = 0;
  /** Pasa (a, b) locales a (wx, wz) de mundo. @param {number} a @param {number} b */
  const local = (a, b) => {
    wx = ox + ux * a - uz * lado * b; // normal derecha = (−uz, ux)
    wz = oz + uz * a + ux * lado * b;
  };

  let yMin = 0,
    yMax = 0;
  /**
   * Cota mínima y máxima del terreno bajo una huella local (escribe en yMin / yMax).
   * @param {number} a @param {number} b @param {number} la @param {number} lb
   */
  function huella(a, b, la, lb) {
    yMin = Infinity;
    yMax = -Infinity;
    for (const [ka, kb] of ESQUINAS) {
      local(a + (ka * la) / 2, b + (kb * lb) / 2);
      const y = terreno(wx, wz);
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }

  /**
   * Color por cara: tono del estrato con veta por cara de bloque y musgo en las caras superiores.
   * @param {THREE.BufferGeometry} g @param {number} tono @param {number} semilla @param {number} musgoMax
   */
  function colorear(g, tono, semilla, musgoMax) {
    const pos = g.attributes.position;
    const c = new Float32Array(pos.count * 3);
    const base = TONOS_PIEDRA[tono % TONOS_PIEDRA.length];
    for (let f = 0; f < pos.count; f += 3) {
      va.fromBufferAttribute(pos, f);
      vb.fromBufferAttribute(pos, f + 1);
      vc.fromBufferAttribute(pos, f + 2);
      nf.crossVectors(e1.subVectors(vb, va), e2.subVectors(vc, va)).normalize();
      const cara = Math.floor(f / 6); // las dos mitades de una cara comparten veta
      col
        .setHex(base)
        .multiplyScalar(
          0.86 + 0.2 * hash(semilla * 7.3 + cara, cara * 0.17 + semilla),
        );
      if (nf.y > 0.6)
        col.lerp(musgo, musgoMax * hash(semilla + 3.1, cara * 1.7));
      else col.lerp(musgo, 0.12 * hash(semilla + 5.3, cara)); // humedad en los costados
      for (let j = 0; j < 3; j++) {
        const k = (f + j) * 3;
        c[k] = col.r;
        c[k + 1] = col.g;
        c[k + 2] = col.b;
      }
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  }

  /**
   * Añade un bloque tallado a la malla fusionada de piedra.
   * @param {number} a @param {number} b  m locales del centro de la huella
   * @param {number} y0 @param {number} y1  cota de la base y de la cara superior
   * @param {number} la @param {number} lb  m a lo largo y hacia fuera
   * @param {number} tono  índice en TONOS_PIEDRA
   * @param {number} semilla
   * @param {number} [giroExtra]  rad sobre el giro del conjunto
   * @param {number} [inclina]  rad alrededor del eje transversal
   * @param {number} [musgoMax]
   * @returns {boolean} si se colocó
   */
  function bloque(
    a,
    b,
    y0,
    y1,
    la,
    lb,
    tono,
    semilla,
    giroExtra = 0,
    inclina = 0,
    musgoMax = 0.55,
  ) {
    if (y1 - y0 <= 0.02) return false;
    local(a, b);
    if (!libre(wx, wz, Math.hypot(la, lb) / 2)) return false;
    const caja = new THREE.BoxGeometry(la, y1 - y0, lb);
    const g = caja.toNonIndexed();
    caja.dispose();
    g.deleteAttribute("uv");
    o.position.set(wx, (y0 + y1) / 2, wz);
    o.rotation.set(0, giro + giroExtra, inclina);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    colorear(g, tono, semilla, musgoMax);
    piezas.push(g);
    return true;
  }

  /**
   * Mata de follaje (instancia). `y` NaN = apoyada en el terreno.
   * @param {number} a @param {number} b @param {number} y @param {number} s @param {number} semilla
   */
  function mata(a, b, y, s, semilla) {
    local(a, b);
    if (!libre(wx, wz, s * 0.5)) return;
    matas.push(
      wx,
      Number.isNaN(y) ? terreno(wx, wz) : y,
      wz,
      s,
      hash(semilla, 61) * 6.28,
      semilla,
    );
  }

  /**
   * Cortina de hiedra que cuelga desde `yTop` por el frente de un bloque, con una mata en el borde.
   * @param {number} a @param {number} b @param {number} yTop @param {number} anchoH @param {number} largo
   * @param {number} semilla
   */
  function hiedra(a, b, yTop, anchoH, largo, semilla) {
    local(a, b);
    if (!libre(wx, wz, anchoH * 0.5)) return;
    const cae = Math.min(largo, Math.max(0.3, yTop - terreno(wx, wz) + 0.1));
    hiedras.push(wx, yTop + 0.04, wz, giro, anchoH, cae, semilla);
    mata(
      a,
      b + 0.18,
      yTop - 0.06,
      0.3 + 0.15 * hash(semilla, 72),
      semilla + 0.5,
    );
  }

  /** Estratos escalonados contra el monte. @param {number} i @param {number} tono */
  function terrazas(i, tono) {
    const niveles = 2 + Math.floor(hash(i, 11) * 3); // 2..4 estratos
    const largo = 4 + hash(i, 12) * 3.5;
    let b = 0;
    let cimaPrev = -Infinity;
    for (let k = 0; k < niveles; k++) {
      const prof = 1.2 + hash(i, 13 + k) * 0.7;
      const alto = 0.5 + hash(i, 17 + k) * 0.35;
      const largoK = largo * (1 - k * 0.14);
      const desfase = (hash(i, 21 + k) - 0.5) * 0.8;
      huella(desfase, b + prof / 2, largoK, prof);
      const cima = Math.max(cimaPrev + alto * 0.75, yMax + alto);
      const base = yMin - 0.35;
      const nB = 2 + Math.floor(hash(i, 25 + k) * 3);
      const paso = largoK / nB;
      for (let j = 0; j < nB; j++) {
        const ac = desfase - largoK / 2 + paso * (j + 0.5);
        const sem = i * 31 + k * 7 + j;
        const falta = k === niveles - 1 && hash(sem, 41) < 0.3; // el estrato alto está desmoronado
        if (!falta) {
          const hundido = hash(sem, 43) < 0.25 ? 0.12 + hash(sem, 44) * 0.2 : 0; // bloque asentado
          const puesto = bloque(
            ac,
            b + prof / 2,
            base,
            cima - hundido,
            paso - JUNTA,
            prof * (0.94 + 0.06 * hash(sem, 45)),
            tono + (k % 2), // estratos alternos de tono
            sem,
            (hash(sem, 46) - 0.5) * 0.05,
          );
          if (puesto && hash(sem, 47) < 0.45)
            hiedra(
              ac + (hash(sem, 48) - 0.5) * paso * 0.5,
              b - 0.06,
              cima - hundido,
              0.4 + 0.35 * hash(sem, 50),
              0.6 + 0.9 * hash(sem, 51),
              sem,
            );
        }
        // Vegetación en la junta con el bloque siguiente.
        if (j < nB - 1 && hash(sem, 49) < 0.7)
          mata(
            ac + paso / 2,
            b + prof * 0.35,
            cima - 0.12,
            0.32 + 0.25 * hash(sem, 52),
            sem + 0.3,
          );
      }
      cimaPrev = cima;
      b += prof * 0.82; // el siguiente estrato deja ver la huella del anterior
    }
    // Pie de la terraza: verde que trepa desde el suelo.
    for (let m = 0; m < 3; m++)
      mata(
        (hash(i, 55 + m) - 0.5) * largo,
        -0.35 - hash(i, 58 + m) * 0.6,
        NaN,
        0.45 + 0.35 * hash(i, 61 + m),
        i * 5 + m,
      );
  }

  /** Puerta en ruinas con el dintel partido. @param {number} i @param {number} tono */
  function dintel(i, tono) {
    const luz = 1.8 + hash(i, 51) * 1.2; // m entre jambas
    const altoJ = 1.7 + hash(i, 52) * 0.8;
    const b = 0.9;
    huella(0, b, luz + 2, 1.4);
    const yLosa = yMax + 0.14;
    bloque(0, b, yMin - 0.3, yLosa, luz + 2, 1.4, tono + 3, i * 13, 0, 0, 0.35); // umbral de losa
    let cimaIzq = yLosa;
    for (const lj of [-1, 1]) {
      const aj = lj * (luz / 2 + 0.38);
      huella(aj, b, 0.75, 0.85);
      const alto = altoJ * (lj < 0 ? 1 : 0.5 + 0.25 * hash(i, 53)); // la derecha está rota
      const cima = Math.max(yLosa, yMax) + alto;
      bloque(aj, b, yMin - 0.3, cima, 0.75, 0.85, tono, i * 13 + lj, 0, 0, 0.3);
      if (lj < 0) cimaIzq = cima;
      mata(
        aj + lj * 0.6,
        b - 0.55,
        NaN,
        0.4 + 0.2 * hash(i, 54 + lj),
        i * 9 + lj,
      );
    }
    // Medio dintel sobre la jamba entera, con dentículos en el frente.
    const ld = luz * 0.62 + 0.8;
    const ad = -(luz / 2 + 0.76) + ld / 2;
    if (
      bloque(
        ad,
        b,
        cimaIzq,
        cimaIzq + 0.55,
        ld,
        0.95,
        tono + 1,
        i * 13 + 5,
        0,
        0,
        0.6,
      )
    ) {
      for (let a = ad - ld / 2 + 0.2; a < ad + ld / 2 - 0.1; a += 0.34)
        bloque(
          a,
          b - 0.53,
          cimaIzq + 0.3,
          cimaIzq + 0.45,
          0.17,
          0.12,
          tono + 1,
          i * 17 + a,
          0,
          0,
          0,
        );
      hiedra(ad + ld * 0.25, b - 0.62, cimaIzq + 0.5, 0.5, 1.4, i * 19);
      mata(ad - ld * 0.2, b + 0.1, cimaIzq + 0.5, 0.35, i * 19 + 1);
    }
    // La otra mitad, caída detrás de la puerta.
    const lc = luz * 0.5 + 0.5;
    const bc = b + 1.6 + hash(i, 56) * 0.6;
    huella(luz * 0.3, bc, lc, 0.95);
    bloque(
      luz * 0.3,
      bc,
      yMin - 0.15,
      yMin + 0.45,
      lc,
      0.95,
      tono + 1,
      i * 13 + 7,
      0.5 + hash(i, 57),
      0.12,
      0.7,
    );
    mata(luz * 0.3 + lc * 0.45, bc + 0.5, NaN, 0.5, i * 21);
  }

  /** Montón de bloques asentados con verde en las juntas. @param {number} i @param {number} tono */
  function monton(i, tono) {
    const n = 4 + Math.floor(hash(i, 71) * 3);
    const bc = 1.3;
    let tope = -Infinity;
    for (let j = 0; j < n; j++) {
      const sem = i * 23 + j;
      const ang = (j / n) * Math.PI * 2 + hash(sem, 72);
      const r = 0.75 + hash(sem, 73) * 0.45;
      const a = Math.cos(ang) * r,
        bb = bc + Math.sin(ang) * r;
      const la = 0.9 + hash(sem, 74) * 0.7,
        lb = 0.8 + hash(sem, 75) * 0.6;
      huella(a, bb, la, lb);
      const cima = yMax + 0.5 + hash(sem, 76) * 0.45;
      if (
        bloque(
          a,
          bb,
          yMin - 0.3,
          cima,
          la,
          lb,
          tono + (j % 3 === 0 ? 1 : 0),
          sem,
          (hash(sem, 77) - 0.5) * 0.8,
        )
      )
        tope = Math.max(tope, cima);
      const angJ = ang + Math.PI / n; // junta entre este bloque y el siguiente
      mata(
        Math.cos(angJ) * (r + 0.35),
        bc + Math.sin(angJ) * (r + 0.35),
        NaN,
        0.35 + 0.3 * hash(sem, 78),
        sem,
      );
    }
    if (tope === -Infinity) return;
    // Segunda capa y remate inclinado: el montón se lee como pirámide desde arriba.
    for (let j = 0; j < 2; j++) {
      const sem = i * 29 + j;
      const a = (j - 0.5) * 0.7,
        bb = bc + (hash(sem, 81) - 0.5) * 0.4;
      huella(a, bb, 0.9, 0.8);
      bloque(
        a,
        bb,
        yMin - 0.3,
        Math.max(tope, yMax) + 0.45 + hash(sem, 82) * 0.3,
        0.9,
        0.8,
        tono + 2,
        sem,
        (hash(sem, 83) - 0.5) * 0.6,
      );
    }
    huella(0.1, bc, 0.8, 0.7);
    const yR = Math.max(tope, yMax) + 0.65;
    bloque(
      0.1,
      bc,
      yR,
      yR + 0.45,
      0.85,
      0.7,
      tono,
      i * 37,
      hash(i, 84) * 1.5,
      0.18,
      0.8,
    );
    mata(-0.3, bc + 0.2, yR + 0.1, 0.28, i * 37 + 1);
    hiedra(0.4, bc - 0.9, tope - 0.05, 0.45, 0.8, i * 41);
  }

  // ─── Conjuntos a lo largo de la subida (deterministas) ───
  for (let i = 0, s = 7; s < umbral - 4; i++, s += 11 + hash(i, 1) * 9) {
    lado = hash(i, 2) < 0.68 ? -1 : 1; // la mayoría en el monte (izquierda)
    const b0 =
      lado < 0 ? ancho + 2.6 + hash(i, 3) * 5 : ancho + 2.4 + hash(i, 4) * 2.5;
    puntoRuta(ruta, s, lado * b0, q);
    const ang = q.ang + (hash(i, 6) - 0.5) * 0.25;
    ox = q.x;
    oz = q.z;
    ux = Math.cos(ang);
    uz = Math.sin(ang);
    giro = -ang; // x local del bloque = avance
    const tono = Math.floor(hash(i, 5) * TONOS_PIEDRA.length);
    // En el valle (derecha) solo piezas bajas: no tapan la ruta a la cámara.
    const tipo =
      lado < 0 ? Math.floor(hash(i, 7) * 3) : hash(i, 8) < 0.6 ? 2 : 1;
    if (tipo === 0) terrazas(i, tono);
    else if (tipo === 1) dintel(i, tono);
    else monton(i, tono);
  }

  const grupo = new THREE.Group();

  // ─── Piedra: una malla fusionada con color por cara ───
  const fusion = piezas.length ? mergeGeometries(piezas) : null;
  piezas.forEach((g) => g.dispose());
  const piedraGeo = keep(fusion ?? new THREE.BufferGeometry());
  piedraGeo.computeVertexNormals();
  const piedraMat = keep(
    vetasTalladas(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.9,
      }),
    ),
  );
  const piedra = new THREE.Mesh(piedraGeo, piedraMat);
  piedra.castShadow = true;
  piedra.receiveShadow = true;
  grupo.add(piedra);

  // ─── Matas: icosaedros achatados, verdes con algún acento otoñal ───
  const mataGeo = keep(new THREE.IcosahedronGeometry(0.5, 0));
  mataGeo.translate(0, 0.18, 0);
  const mataMat = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: true,
      roughness: 1,
    }),
  );
  const nMatas = matas.length / 6;
  const matasMesh = new THREE.InstancedMesh(
    mataGeo,
    mataMat,
    Math.max(1, nMatas),
  );
  for (let k = 0; k < nMatas; k++) {
    const p = k * 6;
    const s = matas[p + 3],
      sem = matas[p + 5];
    o.position.set(matas[p], matas[p + 1], matas[p + 2]);
    o.rotation.set(0, matas[p + 4], 0);
    o.scale.set(s, s * 0.62, s);
    o.updateMatrix();
    matasMesh.setMatrixAt(k, o.matrix);
    const otono = hash(sem, 63) > 0.85; // pocos acentos cálidos
    const idx = otono
      ? 4 + Math.floor(hash(sem, 64) * 2)
      : Math.floor(hash(sem, 65) * 4);
    matasMesh.setColorAt(
      k,
      col.setHex(TONOS_MATA[idx]).multiplyScalar(0.9 + 0.2 * hash(sem, 66)),
    );
  }
  matasMesh.count = nMatas;
  matasMesh.castShadow = true;
  matasMesh.receiveShadow = true;
  grupo.add(matasMesh);

  // ─── Hiedra: cortina estrecha, irregular y afilada hacia abajo (origen en el borde superior) ───
  const hiedraGeo = keep(new THREE.BoxGeometry(1, 1, 0.07, 2, 3, 1));
  hiedraGeo.translate(0, -0.5, 0);
  {
    const pos = hiedraGeo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k),
        x = pos.getX(k);
      const t = -y; // 0 arriba, 1 abajo
      const melena =
        t > 0.01 ? (hash(Math.round(y * 10), Math.sign(x)) - 0.5) * 0.25 : 0; // mismo corte en vértices repetidos
      pos.setX(k, x * (1 - 0.6 * t) + melena);
    }
    hiedraGeo.computeVertexNormals();
  }
  const hiedraMat = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: true,
      roughness: 1,
    }),
  );
  const nHiedras = hiedras.length / 7;
  const hiedrasMesh = new THREE.InstancedMesh(
    hiedraGeo,
    hiedraMat,
    Math.max(1, nHiedras),
  );
  for (let k = 0; k < nHiedras; k++) {
    const p = k * 7;
    const sem = hiedras[p + 6];
    o.position.set(hiedras[p], hiedras[p + 1], hiedras[p + 2]);
    o.rotation.set(0, hiedras[p + 3], (hash(sem, 73) - 0.5) * 0.12);
    o.scale.set(hiedras[p + 4], hiedras[p + 5], 1);
    o.updateMatrix();
    hiedrasMesh.setMatrixAt(k, o.matrix);
    const idx = Math.floor(hash(sem, 74) * TONOS_HIEDRA.length);
    hiedrasMesh.setColorAt(
      k,
      col.setHex(TONOS_HIEDRA[idx]).multiplyScalar(0.88 + 0.22 * hash(sem, 75)),
    );
  }
  hiedrasMesh.count = nHiedras;
  hiedrasMesh.receiveShadow = true;
  grupo.add(hiedrasMesh);

  // Todo es estático: matrices calculadas una vez.
  grupo.updateMatrixWorld(true);
  grupo.matrixAutoUpdate = false;
  for (const m of grupo.children) m.matrixAutoUpdate = false;
  scene.add(grupo);

  return {
    /** Retira las mallas y libera los búferes de instancias (geometrías y materiales, vía `keep`). */
    dispose() {
      scene.remove(grupo);
      matasMesh.dispose();
      hiedrasMesh.dispose();
    },
  };
}
