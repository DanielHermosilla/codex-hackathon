// Entorno del recorrido (D-204, D-209, D-210): lobby al pie del Templo Celestial y pasillo de subida entre
// ruinas, como un olimpo caído. Claro de losas con la urna de bronce rota sobre su altar (01-setting-lore),
// muros en ruinas, escalinata y rampas que suben (solo en el dibujo: la física es plana), columnas rotas
// justo donde están los pilares de gameplay (mismo radio), losas de mural a los lados, el arco de la cima
// y el valle abajo, lejos, para que se sienta la altura. A la izquierda de la subida el monte sube; a la
// derecha cae hacia el valle. Low-poly con sombreado plano (D-044); paleta de la zona `pasillo` (D-188).
// Geometrías fusionadas e instanciadas: unos 13 draw calls. Decorado con ruido determinista (no es
// gameplay). Nada de `new THREE.*` por cuadro: todo se crea aquí y se libera con `keep` / `dispose()`.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  crearRuta,
  nuevaProyeccion,
  proyectarRuta,
  puntoRuta,
} from "../gameplay/ruta.js";
import { alturaRuta, bordesEscalones } from "./altura.js";
import { crearDetalleTemplo } from "./detalle-templo.js";
import { mezclarHex } from "./paleta.js";
import { crearVestigiosTemplo } from "./vestigios-templo.js";

/** @param {number} x @param {number} z */
const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** @param {number} a @param {number} b @param {number} v */
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Ruido de valor suave (0..1) en una rejilla de 1 m: relieve del monte y del valle. @param {number} x @param {number} z */
const ruido = (x, z) => {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = x - ix,
    fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz),
    b = hash(ix + 1, iz),
    c = hash(ix, iz + 1),
    d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
};

/** Aplica pátina y grano a la roca en metros, también en las piezas instanciadas.
 * @param {THREE.MeshStandardMaterial} mat */
function piedraTallada(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 piedraMundo;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 piedraLocal = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          piedraLocal = instanceMatrix * piedraLocal;
        #endif
        piedraMundo = (modelMatrix * piedraLocal).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 piedraMundo;
        float granoPiedra(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          vec4 puntos = vec4(dot(i, vec2(127.1, 311.7))) + vec4(0.0, 127.1, 311.7, 438.8);
          vec4 valores = fract(sin(puntos) * 43758.5453);
          return mix(mix(valores.x, valores.y, f.x), mix(valores.z, valores.w, f.x), f.y);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 veta = piedraMundo.xz + piedraMundo.y * vec2(0.31, 0.65);
        float patina = granoPiedra(veta * 1.28);
        float poro = granoPiedra(veta * 15.0);
        float mancha = smoothstep(0.4, 0.72, patina);
        diffuseColor.rgb *= (0.88 + poro * 0.18) * mix(vec3(1.08, 1.05, 1.02), vec3(0.82, 0.88, 0.83), mancha);`,
      );
  };
  return mat;
}

/**
 * @param {{
 *   scene: THREE.Scene,
 *   cfg: import('./tipos.js').Cfg,
 *   keep: import('./tipos.js').Keep,
 *   alturaSuelo: (x: number, z: number) => number,
 * }} args
 */
export function crearTemplo({ scene, cfg, keep, alturaSuelo }) {
  const T = cfg.render.templo;
  const RC = cfg.recorrido;
  const P = RC.pasillo;
  const L = RC.lobby;
  const tramos = RC.altura;
  const ruta = crearRuta(P.ruta, P.ancho);
  const medio = P.ancho / 2; // m: borde transitable
  const W = medio + T.cinta.margen; // m: medio ancho de la cinta de losas
  const lc = { x: L.centro[0], z: L.centro[1] }; // centro del claro
  const Lr = L.radio; // m transitables del claro
  const umbralS = P.umbral.s;
  const pq = nuevaProyeccion(); // reutilizada en todas las consultas de terreno
  const q = { x: 0, z: 0, ang: 0 }; // punto de ruta reutilizable
  const q2 = { x: 0, z: 0, ang: 0 };
  const o = new THREE.Object3D(); // transformaciones al construir (no por cuadro)
  const col = new THREE.Color();
  const cA = new THREE.Color(),
    cB = new THREE.Color(),
    cN = new THREE.Color();

  /** @param {number} hex @param {THREE.MeshStandardMaterialParameters} [extra] */
  const std = (hex, extra = {}) =>
    keep(
      new THREE.MeshStandardMaterial({
        color: hex,
        flatShading: true,
        roughness: 0.95,
        ...extra,
      }),
    );

  // ─── Terreno: altura del monte, del valle y de los bordes ───
  /**
   * Altura del terreno que rodea la ruta (m). Dentro de la cinta y del claro queda bajo las losas; a la
   * izquierda de la subida el monte sube y a la derecha cae al valle.
   * @param {number} x @param {number} z
   */
  function terreno(x, z) {
    proyectarRuta(ruta, x, z, pq);
    const base = alturaSuelo(x, z);
    const extremo = pq.s <= 1e-6 || pq.s >= ruta.total - 1e-6; // antes del inicio o pasada la cima
    const lat = extremo ? Math.abs(pq.d) : pq.dist; // m del eje (en los extremos, del eje prolongado)
    const e = Math.max(0, lat - W); // m por fuera de la cinta
    const dl = Math.hypot(x - lc.x, z - lc.z);
    const fueraLobby = smooth(Lr + 1.2, Lr + 5, dl); // 0 en el claro: el lobby queda llano
    const izq = smooth(-2, 2, -pq.d); // 1 = a la izquierda de la subida (el monte)
    const sube = T.ladera.sube * smooth(0, T.ladera.ancho, e);
    const baja = (base + T.valle.fondo) * smooth(0, T.valle.ancho, e);
    const rug =
      (ruido(x * 0.12, z * 0.12) - 0.5) * 2 * T.valle.ruido * smooth(0, 5, e) +
      (ruido(x * 0.035, z * 0.035) - 0.5) * 4 * smooth(6, 30, e);
    const lado = (izq * sube - (1 - izq) * baja + rug) * fueraLobby;
    // Bajo la cinta y bajo el claro el terreno se hunde: las losas tapan y no asoma entre peldaños.
    const enCinta = !extremo && lat < W + 1.2 ? 1 - smooth(W, W + 1.2, lat) : 0;
    const enClaro = 1 - smooth(Lr + 0.8, Lr + 1.6, dl);
    return base + lado - 0.6 * Math.max(enCinta, enClaro) - 0.04;
  }

  // ─── Cielo: domo con degradado por vértice que sigue a la cámara ───
  const cieloGeo = keep(new THREE.SphereGeometry(175, 24, 12));
  cieloGeo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Float32Array(cieloGeo.attributes.position.count * 3),
      3,
    ),
  );
  const cielo = new THREE.Mesh(
    cieloGeo,
    keep(
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    ),
  );
  cielo.renderOrder = -10;
  cielo.frustumCulled = false;
  scene.add(cielo);

  // ─── Terreno: malla low-poly con color por cara (categoría + variación) ───
  const TT = T.terreno;
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const [px, pz] of P.ruta) {
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    z0 = Math.min(z0, pz);
    z1 = Math.max(z1, pz);
  }
  x0 -= TT.margen;
  x1 += TT.margen;
  z0 -= TT.detras; // más allá de la cima
  z1 = Math.max(z1, lc.z + Lr) + TT.delante; // hacia la cámara, por delante del claro
  const nx = Math.ceil((x1 - x0) / TT.paso),
    nz = Math.ceil((z1 - z0) / TT.paso);
  const terrGeo = keep(
    new THREE.PlaneGeometry(nx * TT.paso, nz * TT.paso, nx, nz).toNonIndexed(),
  );
  terrGeo.rotateX(-Math.PI / 2);
  terrGeo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const nCaras = terrGeo.attributes.position.count / 3;
  // Dos tonos por categoría: tierra, roca, hierba, campos y pradera. Los UV de cada cara
  // eligen la fila y la mezcla. Al avanzar basta con enviar 10 colores nuevos a la GPU.
  const filasTonos = 5;
  const pixeles = new Uint8Array(2 * filasTonos * 4); // RGBA de los diez tonos en sRGB
  const paletaTerreno = keep(new THREE.DataTexture(pixeles, 2, filasTonos));
  paletaTerreno.colorSpace = THREE.SRGBColorSpace;
  paletaTerreno.magFilter = paletaTerreno.minFilter = THREE.LinearFilter; // mezcla entre tonos de una misma fila
  const uvTerreno = terrGeo.attributes.uv;
  {
    const pos = terrGeo.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setY(i, terreno(pos.getX(i), pos.getZ(i)));
    terrGeo.computeVertexNormals();
    const nor = terrGeo.attributes.normal;
    for (let f = 0; f < nCaras; f++) {
      const i = f * 3;
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      proyectarRuta(ruta, cx, cz, pq);
      const ny = nor.getY(i); // cara plana: las tres normales coinciden
      const pasada = pq.s >= ruta.total - 1e-6; // más allá del final de la ruta
      let cat = 2;
      if (pasada && Math.abs(pq.d) < 40) cat = 4;
      else if (ny < 0.78) cat = 1;
      else if (cy < -T.valle.fondo * 0.45) cat = 3;
      else if (pq.dist < W + 1.5) cat = 0;
      else if (ruido(cx * 0.2, cz * 0.2) > 0.68) cat = 1; // afloramientos de roca en la ladera
      // Campos: parcelas de ~14 m con tono propio; el resto, variación fina por cara.
      const variacion =
        cat === 3
          ? hash(Math.floor(cx / 14), Math.floor(cz / 11))
          : hash(cx * 0.37, cz * 0.53);
      const u = 0.25 + variacion * 0.5; // centros de las dos columnas: U = 0,25 y 0,75
      const v = (cat + 0.5) / filasTonos; // centro de fila: el color nunca se mezcla con otra categoría
      for (let j = 0; j < 3; j++) uvTerreno.setXY(i + j, u, v);
    }
  }
  const terr = new THREE.Mesh(
    terrGeo,
    std(0xffffff, { map: paletaTerreno, roughness: 1 }),
  );
  terr.receiveShadow = true;
  scene.add(terr);
  const origenX = (x0 + x1 - nx * TT.paso) / 2;
  const origenZ = (z0 + z1 - nz * TT.paso) / 2;
  const verticesTerreno = terrGeo.attributes.position;
  /** Interpola el triángulo dibujado para apoyar la vegetación incluso donde cae la ladera.
   * @param {number} x @param {number} z */
  function superficie(x, z) {
    const gx = (x - origenX) / TT.paso;
    const gz = (z - origenZ) / TT.paso;
    const ix = Math.max(0, Math.min(nx - 1, Math.floor(gx)));
    const iz = Math.max(0, Math.min(nz - 1, Math.floor(gz)));
    const u = THREE.MathUtils.clamp(gx - ix, 0, 1);
    const v = THREE.MathUtils.clamp(gz - iz, 0, 1);
    const base = (iz * nx + ix) * 6; // caras (a,b,d) y (b,c,d)
    const b = verticesTerreno.getY(base + 1);
    const d = verticesTerreno.getY(base + 2);
    if (u + v <= 1) {
      const a = verticesTerreno.getY(base);
      return a + (d - a) * u + (b - a) * v;
    }
    const c = verticesTerreno.getY(base + 4);
    return c + (b - c) * (1 - u) + (d - c) * (1 - v);
  }
  const detalle = crearDetalleTemplo({
    scene,
    keep,
    ruta,
    ancho: W,
    centro: lc,
    radio: Lr,
    umbral: umbralS,
    terreno: superficie,
    suelo: alturaSuelo,
  });
  const vestigios = crearVestigiosTemplo({
    scene,
    keep,
    ruta,
    ancho: W,
    umbral: umbralS,
    terreno: superficie,
    centro: lc,
    radio: Lr,
  });
  // Fondo del valle: plano enorme bajo la malla para que el horizonte no se corte (se pierde en la niebla).
  const fondoMat = std(0xffffff, { roughness: 1 });
  const fondo = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(900, 900, 1, 1)),
    fondoMat,
  );
  fondo.rotation.x = -Math.PI / 2;
  fondo.position.set((x0 + x1) / 2, -T.valle.fondo - 1.5, (z0 + z1) / 2);
  scene.add(fondo);

  // ─── Cinta de losas del pasillo: sigue las rampas y corta los peldaños en vertical ───
  const cintaGeo = keep(construirCinta());
  // Desplazada hacia la cámara: donde coincide con el claro (s < 2) gana la cinta, sin parpadeo.
  const cintaMat = piedraTallada(
    std(0xffffff, {
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const cinta = new THREE.Mesh(cintaGeo, cintaMat);
  cinta.receiveShadow = true;
  scene.add(cinta);

  function construirCinta() {
    const C = T.cinta;
    // Filas: cada `paso` m, más dos filas pegadas a cada borde de peldaño (contrahuella vertical).
    /** @type {number[]} */
    const ss = [];
    for (let s = 0; s < ruta.total; s += C.paso) ss.push(s);
    for (const b of bordesEscalones(tramos)) ss.push(b - 0.002, b + 0.002);
    ss.push(ruta.total);
    ss.sort((a, b) => a - b);
    const filas = ss.filter((s, i) => i === 0 || s - ss[i - 1] > 1e-4);
    const K = C.columnas;
    const nf = filas.length;
    // Puntos de cada fila: K + 1 a lo ancho, con normal suavizada (sin solapes en las curvas).
    const px = new Float32Array(nf * (K + 1)),
      pz = new Float32Array(nf * (K + 1)),
      ph = new Float32Array(nf);
    for (let i = 0; i < nf; i++) {
      const s = filas[i];
      puntoRuta(ruta, s, 0, q);
      const cx = q.x,
        cz = q.z;
      puntoRuta(ruta, s - 2.5, 0, q);
      puntoRuta(ruta, s + 2.5, 0, q2);
      let dx = q2.x - q.x,
        dz = q2.z - q.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      ph[i] = alturaRuta(tramos, s);
      for (let k = 0; k <= K; k++) {
        const d = -W + (2 * W * k) / K; // m: de izquierda a derecha
        px[i * (K + 1) + k] = cx - dz * d; // normal derecha = (−dz, dx)
        pz[i * (K + 1) + k] = cz + dx * d;
      }
    }
    /** @type {number[]} */
    const v = [];
    /** @type {number[]} */
    const c = [];
    /** @param {number} r @param {number} g @param {number} b */
    const tri = (r, g, b) => {
      for (let j = 0; j < 3; j++) c.push(r, g, b);
    };
    /** Cuadrilátero a-b-c-d (en sentido antihorario visto desde la cara). @param {number[]} p @param {number} t */
    const quad = (p, t) => {
      v.push(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
      tri(t, t, t);
      v.push(p[0], p[1], p[2], p[6], p[7], p[8], p[9], p[10], p[11]);
      tri(t, t, t);
    };
    for (let i = 0; i < nf - 1; i++) {
      const s = filas[i];
      const h0 = ph[i],
        h1 = ph[i + 1];
      const contra = h1 - h0 > 0.05 && filas[i + 1] - s < 0.01; // contrahuella: sube casi sin avanzar (no la rampa)
      const banda = Math.floor(s / 1.7); // losas de ~1.7 m de largo
      for (let k = 0; k < K; k++) {
        const a = i * (K + 1) + k,
          b = (i + 1) * (K + 1) + k;
        // Losas desfasadas por banda; las de los bordes, algo más oscuras (gastadas, con musgo).
        const borde = k === 0 || k === K - 1 ? 0.88 : 1;
        const t = contra
          ? 0.58 // contrahuella en sombra: el peldaño se lee desde la cámara alta
          : borde *
            (0.82 +
              0.22 *
                hash(banda * 1.3 + (k >> 1) * 7.1, banda % 2 ? k : k + 0.5));
        // Desde arriba: a(i,k) → a(i,k+1) → b(i+1,k+1) → b(i+1,k). La ruta avanza; la normal sale hacia +y.
        quad(
          [
            px[a],
            h0,
            pz[a],
            px[a + 1],
            h0,
            pz[a + 1],
            px[b + 1],
            h1,
            pz[b + 1],
            px[b],
            h1,
            pz[b],
          ],
          t,
        );
      }
      // Cornisa: cara vertical en cada borde, hacia fuera, que baja `faldon` m (tapa el terreno).
      for (const k of [0, K]) {
        const a = i * (K + 1) + k,
          b = (i + 1) * (K + 1) + k;
        const t = 0.7 + 0.1 * hash(i, k);
        const top0 = h0,
          top1 = h1,
          bot0 = h0 - C.faldon,
          bot1 = h1 - C.faldon;
        if (k === 0)
          quad(
            [
              px[b],
              bot1,
              pz[b],
              px[a],
              bot0,
              pz[a],
              px[a],
              top0,
              pz[a],
              px[b],
              top1,
              pz[b],
            ],
            t,
          );
        else
          quad(
            [
              px[a],
              bot0,
              pz[a],
              px[b],
              bot1,
              pz[b],
              px[b],
              top1,
              pz[b],
              px[a],
              top0,
              pz[a],
            ],
            t,
          );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  }

  // ─── Claro del lobby: disco de losas en anillos con una rosa de piedra clara en el centro ───
  const claroGeo = keep(construirClaro());
  const claroMat = piedraTallada(std(0xffffff, { vertexColors: true }));
  const claro = new THREE.Mesh(claroGeo, claroMat);
  claro.receiveShadow = true;
  scene.add(claro);

  function construirClaro() {
    const R = Lr + 1; // m: el borde de losas pasa un poco del límite transitable
    const anillos = Math.ceil(R / 1.1);
    const sect = 56;
    /** @type {number[]} */
    const v = [];
    /** @type {number[]} */
    const c = [];
    /** @param {number} r @param {number} a */
    const px = (r, a) => lc.x + Math.cos(a) * r;
    /** @param {number} r @param {number} a */
    const pz = (r, a) => lc.z + Math.sin(a) * r;
    /** @param {number} x @param {number} z */
    const py = (x, z) => alturaSuelo(x, z);
    // En el claro la cinta sigue el primer tramo recto. Sus cuatro planos recortan
    // solo lo que tapa; así queda una junta exacta, sin huecos ni losas sobre los peldaños.
    const inicio = new THREE.Vector3(ruta.px[0], 0, ruta.pz[0]);
    const fin = new THREE.Vector3(ruta.px[1], 0, ruta.pz[1]);
    const avance = fin.clone().sub(inicio).normalize();
    const derecha = new THREE.Vector3(-avance.z, 0, avance.x);
    const cortes = [
      new THREE.Plane().setFromNormalAndCoplanarPoint(avance, inicio),
      new THREE.Plane().setFromNormalAndCoplanarPoint(
        avance.clone().negate(),
        fin,
      ),
      new THREE.Plane().setFromNormalAndCoplanarPoint(
        derecha,
        inicio.clone().addScaledVector(derecha, -W),
      ),
      new THREE.Plane().setFromNormalAndCoplanarPoint(
        derecha.clone().negate(),
        inicio.clone().addScaledVector(derecha, W),
      ),
    ];

    /** Parte una losa contra el contorno y triangula las porciones visibles en abanico.
     * Solo se ejecuta al construir el templo. @param {number[]} p @param {number} t */
    const tri = (p, t) => {
      let resto = [0, 3, 6].map(
        (i) => new THREE.Vector3(p[i], p[i + 1], p[i + 2]),
      );
      for (const plano of cortes) {
        /** @type {THREE.Vector3[]} */
        const dentro = [];
        /** @type {THREE.Vector3[]} */
        const fuera = [];
        for (let i = 0; i < resto.length; i++) {
          const a = resto[i],
            b = resto[(i + 1) % resto.length];
          const da = plano.distanceToPoint(a),
            db = plano.distanceToPoint(b);
          if (da >= 0) dentro.push(a);
          if (da <= 0) fuera.push(a);
          if (da * db < 0) {
            const cruce = a.clone().lerp(b, da / (da - db)); // ambos lados comparten el mismo borde
            dentro.push(cruce);
            fuera.push(cruce);
          }
        }
        for (let i = 1; i < fuera.length - 1; i++) {
          for (const vertice of [fuera[0], fuera[i], fuera[i + 1]]) {
            v.push(vertice.x, vertice.y, vertice.z);
            c.push(t, t, t);
          }
        }
        if (dentro.length < 3) break; // la losa ya quedó fuera de la cinta
        resto = dentro; // solo esta parte puede seguir bajo el siguiente plano
      }
    };
    for (let r = 0; r < anillos; r++) {
      const ra = (R * r) / anillos,
        rb = (R * (r + 1)) / anillos;
      for (let s = 0; s < sect; s++) {
        const a0 = (s / sect) * Math.PI * 2,
          a1 = ((s + 1) / sect) * Math.PI * 2;
        // Losas: dos sectores por losa, desfasadas en anillos alternos; centro y anillo 3 más claros.
        const losa = Math.floor((s + (r % 2)) / 2);
        let t = 0.84 + 0.16 * hash(r * 3.1, losa);
        if (r === 0) t = 1.06;
        else if (r === 3) t = 1.0;
        else if (r === anillos - 1) t *= 0.86; // borde gastado
        const ax = px(ra, a0),
          az = pz(ra, a0),
          bx = px(ra, a1),
          bz = pz(ra, a1);
        const cx = px(rb, a1),
          cz = pz(rb, a1),
          dx = px(rb, a0),
          dz = pz(rb, a0);
        if (r === 0)
          tri([ax, py(ax, az), az, cx, py(cx, cz), cz, dx, py(dx, dz), dz], t);
        else {
          // Orden de vértices antihorario visto desde arriba: la cara mira a +y.
          tri([ax, py(ax, az), az, cx, py(cx, cz), cz, dx, py(dx, dz), dz], t);
          tri([ax, py(ax, az), az, bx, py(bx, bz), bz, cx, py(cx, cz), cz], t);
        }
        // Cornisa del borde: el claro es una terraza de piedra sobre el monte.
        if (r === anillos - 1) {
          const ha = py(dx, dz),
            hb = py(cx, cz);
          tri([dx, ha - 1.4, dz, cx, hb, cz, cx, hb - 1.4, cz], 0.72);
          tri([dx, ha - 1.4, dz, dx, ha, dz, cx, hb, cz], 0.72);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  }

  // ─── Piedra: todo lo estático de mármol en una sola malla (columnas, arco, ruinas, altar, losas) ───
  /** @type {THREE.BufferGeometry[]} */
  const piezas = [];
  /**
   * Añade una pieza de piedra con la transformación actual de `o` y un tono (multiplica el color de zona).
   * @param {THREE.BufferGeometry} geo @param {number} tono
   */
  function pieza(geo, tono) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.deleteAttribute("uv");
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let f = 0; f < n; f += 3) {
      const t = tono * (0.9 + 0.14 * hash(piezas.length * 3.7 + f, f * 0.11)); // vetas por cara
      for (let j = 0; j < 9; j++) c[f * 3 + j] = t;
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    piezas.push(g);
  }
  /** Coloca `o` en (x, y, z) girado `ry` y escalado. @param {number} x @param {number} y @param {number} z @param {number} [ry] */
  function en(x, y, z, ry = 0) {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.scale.set(1, 1, 1);
  }

  /**
   * Fuste roto: cilindro de `lados` caras con la cima mellada (mismo corte para vértices repetidos).
   * @param {number} r @param {number} h @param {number} semilla @param {boolean} roto
   */
  function fuste(r, h, semilla, roto) {
    const g = new THREE.CylinderGeometry(r * 0.94, r, h, T.columnas.lados, 2);
    g.translate(0, h / 2, 0);
    if (roto) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) < h - 1e-3) continue;
        const a = Math.round(Math.atan2(pos.getZ(i), pos.getX(i)) * 100);
        const centro = Math.abs(pos.getX(i)) + Math.abs(pos.getZ(i)) < 1e-4;
        pos.setY(i, h - (centro ? 0.25 : 0.55 * hash(a, semilla))); // m que se comió la rotura
      }
    }
    return g;
  }

  // Columnas de gameplay: exactamente en `pasillo.pilares` y con su radio (la cadena se enreda ahí).
  P.pilares.forEach((pl, i) => {
    puntoRuta(ruta, pl.s, pl.d, q);
    const y0 = alturaSuelo(q.x, q.z);
    const [hMin, hMax] = T.columnas.alto;
    const h = hMin + (hMax - hMin) * hash(i, 5.5);
    const entera = i % 3 === 1; // una de cada tres conserva el capitel
    const cimaPlinto = y0 + 0.25; // m: la base cuadrada entra medio metro en la pendiente
    const cimaBasa = cimaPlinto + 0.25; // m: el fuste nace justo en la cara superior
    en(q.x, cimaPlinto - 0.75 / 2, q.z, hash(i, 2) * 6);
    pieza(new THREE.BoxGeometry(pl.r * 2.8, 0.75, pl.r * 2.8), 0.9); // plinto (entra en el suelo en rampa)
    en(q.x, cimaBasa - 0.25 / 2, q.z, hash(i, 2) * 6);
    pieza(
      new THREE.CylinderGeometry(
        pl.r * 1.18,
        pl.r * 1.25,
        0.25,
        T.columnas.lados,
      ),
      0.97,
    ); // basa
    en(q.x, cimaBasa, q.z, hash(i, 3) * 6);
    pieza(fuste(pl.r, h, i, !entera), 1.04);
    if (entera) {
      en(q.x, cimaBasa + h + 0.35 / 2, q.z, hash(i, 2) * 6);
      pieza(
        new THREE.CylinderGeometry(
          pl.r * 1.3,
          pl.r * 0.95,
          0.35,
          T.columnas.lados,
        ),
        0.98,
      );
      en(q.x, cimaBasa + h + 0.35 + 0.3 / 2, q.z, hash(i, 2) * 6);
      pieza(new THREE.BoxGeometry(pl.r * 2.9, 0.3, pl.r * 2.9), 0.93); // ábaco
    }
  });

  // Arco de la cima (D-211): dos machones, dintel, cornisa y frontón partido. Cruzarlo lleva a Mirra.
  {
    const A = T.arco;
    puntoRuta(ruta, umbralS, 0, q);
    const y0 = alturaRuta(tramos, umbralS);
    const ry = -q.ang; // x local = dirección de avance
    const ux = Math.cos(q.ang),
      uz = Math.sin(q.ang);
    const dLado = medio + A.grueso / 2 - 0.15; // m del eje a cada machón
    for (const lado of [-1, 1]) {
      const mx = q.x - uz * dLado * lado,
        mz = q.z + ux * dLado * lado;
      en(mx, y0 - 0.5, mz, ry);
      pieza(new THREE.BoxGeometry(A.grueso * 1.35, 1.0, A.grueso * 1.35), 0.88);
      en(mx, y0 + 0.5, mz, ry);
      const g = new THREE.BoxGeometry(A.grueso, A.alto, A.grueso, 1, 3, 1);
      g.translate(0, A.alto / 2, 0);
      pieza(g, 1.02);
      en(mx, y0 + 0.5 + A.alto, mz, ry);
      pieza(new THREE.BoxGeometry(A.grueso * 1.25, 0.3, A.grueso * 1.25), 0.95);
    }
    const largo = 2 * dLado + A.grueso * 1.4;
    en(q.x, y0 + 0.5 + A.alto + 0.75, q.z, ry);
    pieza(new THREE.BoxGeometry(A.grueso * 1.1, 1.0, largo), 1.0); // dintel
    en(q.x, y0 + 0.5 + A.alto + 1.38, q.z, ry);
    pieza(new THREE.BoxGeometry(A.grueso * 1.35, 0.26, largo + 0.5), 0.9); // cornisa
    // Frontón: prisma triangular bajo con la punta hacia arriba, de canto sobre la cornisa.
    const fr = new THREE.CylinderGeometry(1, 1, A.grueso * 1.05, 3, 1);
    fr.rotateZ(Math.PI / 2); // eje del prisma = avance (x local)
    fr.rotateX(-Math.PI / 2); // vértice del triángulo hacia +y
    const altoFr = 1.1; // m de frontón
    fr.scale(1, altoFr / 1.5, (largo * 0.85) / 1.732);
    en(q.x, y0 + 0.5 + A.alto + 1.51 + altoFr / 3, q.z, ry);
    pieza(fr, 0.97);
  }

  // Losas de mural (D-126) a los lados: piedra con un panel en relieve que se ilumina al pasar.
  /** @type {{ s: number, mat: THREE.MeshStandardMaterial }[]} */
  const murales = [];
  const muralGrupo = new THREE.Group();
  scene.add(muralGrupo);
  for (const m of P.murales) {
    const M = T.mural;
    puntoRuta(ruta, m.s, m.lado * (medio + M.separa), q);
    const y0 = alturaSuelo(q.x, q.z);
    puntoRuta(ruta, m.s, 0, q2);
    const mira = Math.atan2(q2.x - q.x, q2.z - q.z); // giro para que +z local mire al pasillo
    en(q.x, y0 - 0.5, q.z, mira);
    const losa = new THREE.BoxGeometry(M.ancho, M.alto + 0.5, 0.5);
    losa.translate(0, (M.alto + 0.5) / 2, 0);
    pieza(losa, 0.95);
    en(q.x, y0 + M.alto, q.z, mira);
    pieza(new THREE.BoxGeometry(M.ancho + 0.3, 0.22, 0.65), 0.86); // remate
    en(q.x, y0 - 0.3, q.z, mira);
    pieza(new THREE.BoxGeometry(M.ancho + 0.5, 0.6, 1.0), 0.84); // zócalo
    // Panel: fondo claro + figuras en relieve (más oscuras). Una malla por mural: se enciende sola.
    const panelGeo = keep(construirPanel(m.id, M.ancho * 0.84, M.alto * 0.72));
    const mat = std(0xffffff, {
      vertexColors: true,
      emissive: cfg.paleta.corrupcion.veta,
      emissiveIntensity: 0,
    });
    const panel = new THREE.Mesh(panelGeo, mat);
    panel.position.set(q.x, y0 + M.alto * 0.55, q.z);
    panel.rotation.y = mira;
    panel.translateZ(0.26); // justo delante de la cara de la losa
    panel.castShadow = false;
    muralGrupo.add(panel);
    murales.push({ s: m.s, mat });
  }

  /**
   * Relieve del mural en el plano local (x a lo ancho, y hacia arriba, +z hacia el pasillo).
   * Figuras de bloques: los ladrones frente a la urna, la urna partida en siete, Mirra con la hoz.
   * @param {string} id @param {number} w @param {number} h
   */
  function construirPanel(id, w, h) {
    /** @type {THREE.BufferGeometry[]} */
    const gs = [];
    /**
     * @param {number} x @param {number} y @param {number} sx @param {number} sy
     * @param {number} tono @param {number} [rz] @param {number} [prof]
     */
    const bloque = (x, y, sx, sy, tono, rz = 0, prof = 0.06) => {
      const g = new THREE.BoxGeometry(sx, sy, prof).toNonIndexed();
      g.deleteAttribute("uv");
      g.rotateZ(rz);
      g.translate(x, y, prof / 2);
      const c = new Float32Array(g.attributes.position.count * 3).fill(tono);
      g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
      gs.push(g);
    };
    bloque(0, 0, w, h, 1.0, 0, 0.04); // fondo
    const F = 0.55; // tono de las figuras (relieve en sombra)
    /** Figura humana de bloques. @param {number} x @param {number} y @param {number} s @param {number} [inc] */
    const figura = (x, y, s, inc = 0) => {
      bloque(x, y + 0.42 * s, 0.26 * s, 0.62 * s, F, inc, 0.1);
      bloque(x + inc * -0.3 * s, y + 0.86 * s, 0.22 * s, 0.22 * s, F, 0, 0.1);
      bloque(x - 0.07 * s, y + 0.06 * s, 0.08 * s, 0.3 * s, F, 0, 0.1);
      bloque(x + 0.07 * s, y + 0.06 * s, 0.08 * s, 0.3 * s, F, 0, 0.1);
    };
    /** Urna de bloques. @param {number} x @param {number} y @param {number} s */
    const urna = (x, y, s) => {
      bloque(x, y + 0.08 * s, 0.3 * s, 0.16 * s, F, 0, 0.1);
      bloque(x, y + 0.36 * s, 0.56 * s, 0.42 * s, F, 0, 0.1);
      bloque(x, y + 0.66 * s, 0.26 * s, 0.18 * s, F, 0, 0.1);
      bloque(x, y + 0.79 * s, 0.4 * s, 0.07 * s, F, 0, 0.1);
    };
    const suelo = -h / 2 + 0.12;
    if (id === "ladrones") {
      figura(-w * 0.28, suelo, 1.05, 0.25);
      figura(w * 0.28, suelo, 1.0, -0.25);
      bloque(0, suelo + 0.15, 0.36, 0.3, F, 0, 0.1); // pedestal
      urna(0, suelo + 0.3, 0.75);
    } else if (id === "urna") {
      urna(0, suelo + 0.05, 1.5);
      bloque(0.05, suelo + 0.65, 0.05, 0.7, 1.0, 0.3, 0.12); // la grieta
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.1 + (0.8 * k) / 6); // siete esquirlas en abanico (D-057)
        bloque(
          Math.cos(a) * w * 0.38,
          suelo + 0.7 + Math.sin(a) * h * 0.38,
          0.1,
          0.2,
          F,
          a,
          0.1,
        );
      }
    } else {
      figura(-w * 0.12, suelo, 1.45, 0.1);
      bloque(w * 0.08, suelo + 1.05, 0.05, 1.0, F, -0.25, 0.1); // mango de la hoz
      bloque(w * 0.17, suelo + 1.5, 0.42, 0.07, F, 0.5, 0.1); // hoja
      for (let k = 0; k < 6; k++)
        bloque(
          -w * 0.42 + k * 0.17 + (k > 2 ? w * 0.42 : 0),
          suelo + 0.22,
          0.05,
          0.44,
          F,
          (k - 2.5) * 0.08,
          0.1,
        ); // trigo
    }
    const g = mergeGeometries(gs);
    gs.forEach((x) => x.dispose());
    g.computeVertexNormals();
    return g;
  }

  // Altar del lobby: aquí reposa lo que queda de la urna de bronce (la Brasa se perdió).
  const [ax, az] = T.lobby.urna;
  const altarY = terreno(ax, az); // junto al claro: el pedestal descansa en el monte
  en(ax, altarY + 0.45, az, 0.3);
  pieza(new THREE.BoxGeometry(2.2, 0.9, 1.4), 0.92);
  en(ax, altarY + 0.98, az, 0.3);
  pieza(new THREE.BoxGeometry(2.6, 0.2, 1.8), 1.0);
  en(ax, altarY - 0.55, az, 0.3); // el plinto entra 1,3 m en la pendiente bajo el pedestal
  pieza(new THREE.BoxGeometry(3.0, 1.5, 2.2), 0.85);

  // Ruinas del claro: muros partidos en el borde (con huecos) y columnas caídas.
  {
    const NM = T.lobby.muros;
    for (let i = 0; i < NM; i++) {
      const a = (i / NM) * Math.PI * 2;
      const rx = lc.x + Math.cos(a) * (Lr + 0.7),
        rz = lc.z + Math.sin(a) * (Lr + 0.7);
      proyectarRuta(ruta, rx, rz, pq);
      if (pq.s > 1e-6 && pq.dist < W + 1) continue; // abierto hacia la escalinata
      if (hash(i, 77) < 0.3) continue; // huecos: muro en ruinas
      const hh = 0.4 + 1.3 * hash(i, 78) * (rz < lc.z ? 1.4 : 0.6); // más alto detrás, bajo hacia la cámara
      const y0 = alturaSuelo(rx, rz);
      en(rx, y0 - 0.6, rz, -a + Math.PI / 2);
      const g = new THREE.BoxGeometry(
        ((Lr + 0.7) * Math.PI * 2) / NM - 0.25,
        hh + 0.6,
        0.7,
      );
      g.translate(0, (hh + 0.6) / 2, 0);
      pieza(g, 0.86 + 0.1 * hash(i, 79));
    }
    // Columnas caídas y tambores sueltos fuera del claro.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + i * 0.6 + hash(i, 81) * 0.3;
      const r = Lr + 2.5 + hash(i, 82) * 5;
      const x = lc.x + Math.cos(a) * r,
        z = lc.z + Math.sin(a) * r;
      proyectarRuta(ruta, x, z, pq);
      if (pq.s > 1e-6 && pq.dist < W + 1.5) continue;
      const y = terreno(x, z);
      if (i % 2 === 0) {
        en(x, y - 0.2, z, hash(i, 83) * 6);
        pieza(fuste(0.6, 1 + 2.5 * hash(i, 84), i + 20, true), 0.98);
      } else {
        const largo = 2.5 + hash(i, 85) * 2.5;
        o.position.set(x, y + 0.45, z);
        o.rotation.set(0, hash(i, 86) * 6, Math.PI / 2);
        o.scale.set(1, 1, 1);
        pieza(
          new THREE.CylinderGeometry(0.55, 0.58, largo, T.columnas.lados),
          0.95,
        );
      }
    }
  }

  // Ruinas del monte: tocones de columna, tambores caídos y basamentos fuera del pasillo (nunca dentro: la
  // única columna en pie dentro del pasillo es un pilar de gameplay).
  for (let s = 8, i = 0; s < ruta.total + 20; s += 6 + hash(i, 90) * 7, i++) {
    const lado = hash(i, 91) < 0.7 ? -1 : 1; // la mayoría en la ladera del monte
    const d = lado * (W + 2 + hash(i, 92) * (lado < 0 ? 10 : 4));
    puntoRuta(ruta, s, d, q);
    const y = terreno(q.x, q.z);
    const tipo = Math.floor(hash(i, 93) * 3);
    if (tipo === 0) {
      en(q.x, y - 0.3, q.z, hash(i, 94) * 6);
      pieza(
        fuste(0.55 + hash(i, 95) * 0.25, 0.8 + 3.2 * hash(i, 96), i + 40, true),
        0.98,
      );
    } else if (tipo === 1) {
      o.position.set(q.x, y + 0.4, q.z);
      o.rotation.set(0, hash(i, 97) * 6, Math.PI / 2);
      o.scale.set(1, 1, 1);
      pieza(
        new THREE.CylinderGeometry(
          0.5,
          0.52,
          1.2 + 2.5 * hash(i, 98),
          T.columnas.lados,
        ),
        0.94,
      );
    } else {
      en(q.x, y - 0.2, q.z, -q.ang + (hash(i, 99) - 0.5) * 0.4);
      pieza(
        new THREE.BoxGeometry(
          2.5 + hash(i, 100) * 3,
          0.8,
          1.6 + hash(i, 101) * 1.5,
        ),
        0.86,
      );
    }
  }

  const piedraGeo = keep(mergeGeometries(piezas));
  piezas.forEach((g) => g.dispose());
  piedraGeo.computeVertexNormals();
  const piedraMat = piedraTallada(
    std(0xffffff, { vertexColors: true, roughness: 0.88 }),
  );
  const piedra = new THREE.Mesh(piedraGeo, piedraMat);
  piedra.castShadow = true;
  piedra.receiveShadow = true;
  scene.add(piedra);

  // ─── Muretes del borde: bloques en ruinas que marcan el límite de la ruta (`pasillo.ancho`) ───
  const MU = T.muretes;
  /** @type {number[]} */
  const muros = []; // x, y, z, giro, largo, alto por bloque
  {
    let i = 0;
    for (let s = 1; s < umbralS - 1.5; s += MU.cada, i++) {
      for (const lado of [-1, 1]) {
        const escalera =
          alturaRuta(tramos, s + MU.cada) - alturaRuta(tramos, s) > 0.2;
        if (!escalera && hash(i, lado * 13) < MU.huecos) continue; // huecos (no en la escalinata)
        const mural = P.murales.some(
          (m) => m.lado === lado && Math.abs(m.s - s) < T.mural.ancho / 2 + 0.9,
        );
        if (mural) continue;
        puntoRuta(
          ruta,
          s + MU.cada / 2,
          lado * (medio + MU.grueso / 2 + 0.08),
          q,
        );
        const [a0, a1] = MU.alto;
        const alto = escalera ? 0.75 : a0 + (a1 - a0) * hash(i, lado * 17);
        muros.push(
          q.x,
          alturaRuta(tramos, s + MU.cada / 2),
          q.z,
          -q.ang,
          MU.cada * (0.8 + 0.18 * hash(i, lado)),
          alto,
        );
      }
    }
  }
  const muroGeo = keep(new THREE.BoxGeometry(1, 1, 1));
  muroGeo.translate(0, 0.5, 0);
  const muroMat = piedraTallada(std(0xffffff, { roughness: 0.9 }));
  const nMuros = muros.length / 6;
  const muretes = new THREE.InstancedMesh(
    muroGeo,
    muroMat,
    Math.max(1, nMuros),
  );
  for (let k = 0; k < nMuros; k++) {
    const b = k * 6;
    o.position.set(muros[b], muros[b + 1] - 0.7, muros[b + 2]);
    o.rotation.set(0, muros[b + 3], (hash(k, 3) - 0.5) * 0.06);
    o.scale.set(
      muros[b + 4],
      muros[b + 5] + 0.7,
      MU.grueso * (0.85 + 0.3 * hash(k, 4)),
    );
    o.updateMatrix();
    muretes.setMatrixAt(k, o.matrix);
    muretes.setColorAt(k, col.setScalar(0.8 + 0.22 * hash(k, 5)));
  }
  muretes.count = nMuros;
  muretes.castShadow = true;
  muretes.receiveShadow = true;
  scene.add(muretes);

  // ─── Urna de bronce rota sobre el altar: medio cuerpo abierto, tapa y esquirlas en el suelo ───
  /** @type {THREE.BufferGeometry[]} */
  const bronces = [];
  {
    const perfil = [
      [0.0, 0],
      [0.32, 0],
      [0.28, 0.12],
      [0.5, 0.42],
      [0.56, 0.7],
      [0.42, 0.98],
      [0.24, 1.12],
      [0.3, 1.24],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    // Abierta: le falta una cuña (se partió al caer, D-057). Tumbada sobre el altar.
    const cuerpo = new THREE.LatheGeometry(
      perfil,
      10,
      0.4,
      Math.PI * 1.45,
    ).toNonIndexed();
    cuerpo.deleteAttribute("uv");
    o.position.set(ax + 0.2, altarY + 1.45, az);
    o.rotation.set(0.25, 0.9, Math.PI / 2.3);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    cuerpo.applyMatrix4(o.matrix);
    bronces.push(cuerpo);
    const tapa = new THREE.CylinderGeometry(0.34, 0.3, 0.1, 10).toNonIndexed();
    tapa.deleteAttribute("uv");
    o.position.set(ax - 1.6, terreno(ax - 1.6, az + 1.3) + 0.08, az + 1.3);
    o.rotation.set(0.15, 0, 0.1);
    o.updateMatrix();
    tapa.applyMatrix4(o.matrix);
    bronces.push(tapa);
    for (let k = 0; k < 6; k++) {
      const e = new THREE.TetrahedronGeometry(0.12 + 0.1 * hash(k, 61), 0); // ya sin índice
      e.deleteAttribute("uv");
      const a = hash(k, 62) * 6.28,
        r = 1.4 + hash(k, 63) * 1.4;
      const x = ax + Math.cos(a) * r,
        z = az + Math.sin(a) * r;
      o.position.set(x, terreno(x, z) + 0.06, z);
      o.rotation.set(hash(k, 64) * 3, hash(k, 65) * 3, 0);
      o.updateMatrix();
      e.applyMatrix4(o.matrix);
      bronces.push(e);
    }
  }
  const broncesGeo = keep(mergeGeometries(bronces));
  bronces.forEach((g) => g.dispose());
  broncesGeo.computeVertexNormals();
  const bronceMat = std(cfg.paleta.cadena.bronce, {
    metalness: 0.7,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });
  const urna = new THREE.Mesh(broncesGeo, bronceMat);
  urna.castShadow = true;
  scene.add(urna);

  // ─── Valle: cipreses y un pueblo de piedra, abajo y lejos (se pierden en la niebla) ───
  const LJ = T.lejos;
  const cipresGeo = keep(new THREE.ConeGeometry(0.75, 4.2, 6, 1));
  cipresGeo.translate(0, 2.0, 0);
  const cipresMat = std(0xffffff, { roughness: 1 });
  const cipreses = new THREE.InstancedMesh(cipresGeo, cipresMat, LJ.arboles);
  {
    let n = 0;
    for (let i = 0; n < LJ.arboles && i < LJ.arboles * 6; i++) {
      const x = x0 + hash(i, 201) * (x1 - x0),
        z = z0 + hash(i, 202) * (z1 - z0);
      proyectarRuta(ruta, x, z, pq);
      // Nunca en el camino ni pegados a él (taparían a la pareja); tampoco en los cortados.
      if (pq.dist < W + 7 || Math.hypot(x - lc.x, z - lc.z) < Lr + 9) continue;
      const y = terreno(x, z);
      const pendiente =
        Math.hypot(
          terreno(x + 1, z) - terreno(x - 1, z),
          terreno(x, z + 1) - terreno(x, z - 1),
        ) / 2;
      if (pendiente > 0.45) continue; // m por m: en la ladera abrupta no arraigan
      if (ruido(x * 0.05, z * 0.05) < 0.42) continue; // en bosquetes, no repartidos
      const s = 0.6 + hash(i, 203) * 0.6;
      o.position.set(x, y - 0.2, z);
      o.rotation.set(0, hash(i, 204) * 6, 0);
      o.scale.set(s, s * (1 + hash(i, 205) * 0.4), s);
      o.updateMatrix();
      cipreses.setMatrixAt(n, o.matrix);
      cipreses.setColorAt(n, col.setScalar(0.75 + 0.35 * hash(i, 206)));
      n++;
    }
    cipreses.count = n;
  }
  cipreses.castShadow = true;
  cipreses.receiveShadow = true;
  scene.add(cipreses);

  // Casas: caja + tejado a dos aguas, en dos caseríos del valle (a la derecha de la subida).
  const casaGeo = keep(
    (() => {
      const caja = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
      caja.translate(0, 0.5, 0);
      const tejado = new THREE.CylinderGeometry(
        0.62,
        0.62,
        1.1,
        3,
        1,
      ).toNonIndexed();
      tejado.rotateX(Math.PI / 2);
      tejado.rotateZ(Math.PI / 2);
      tejado.scale(1, 0.55, 1);
      tejado.translate(0, 1.15, 0);
      for (const [g, t] of /** @type {[THREE.BufferGeometry, number][]} */ ([
        [caja, 1.0],
        [tejado, 0.62],
      ])) {
        g.deleteAttribute("uv");
        g.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(
            new Float32Array(g.attributes.position.count * 3).fill(t),
            3,
          ),
        );
      }
      const g = mergeGeometries([caja, tejado]);
      caja.dispose();
      tejado.dispose();
      g.computeVertexNormals();
      return g;
    })(),
  );
  const casaMat = std(0xffffff, { vertexColors: true });
  const casas = new THREE.InstancedMesh(casaGeo, casaMat, LJ.casas);
  {
    // Caseríos: a la derecha del eje (+d), donde cae el valle.
    const centros = [
      [50, 40],
      [125, 48],
    ];
    let n = 0;
    for (let i = 0; i < LJ.casas; i++) {
      const [cs, cd] = centros[i % centros.length];
      puntoRuta(
        ruta,
        cs + (hash(i, 301) - 0.5) * 26,
        cd + (hash(i, 302) - 0.5) * 18,
        q,
      );
      const y = terreno(q.x, q.z);
      const s = 2 + hash(i, 303) * 1.6;
      o.position.set(q.x, y - 0.1, q.z);
      o.rotation.set(0, hash(i, 304) * 3, 0);
      o.scale.set(s * (1 + hash(i, 305) * 0.6), s * 0.8, s);
      o.updateMatrix();
      casas.setMatrixAt(n, o.matrix);
      casas.setColorAt(n, col.setScalar(0.85 + 0.2 * hash(i, 306)));
      n++;
    }
    casas.count = n;
  }
  casas.castShadow = true;
  casas.receiveShadow = true;
  scene.add(casas);

  // ─── Paleta de zona (D-188): base → clímax con el avance ───
  /** Escribe un color hexadecimal en la textura compartida, sin recorrer los vértices.
   * @param {number} indice @param {number} hex */
  function tonoTerreno(indice, hex) {
    const i = indice * 4;
    pixeles[i] = (hex >>> 16) & 255;
    pixeles[i + 1] = (hex >>> 8) & 255;
    pixeles[i + 2] = hex & 255;
    pixeles[i + 3] = 255; // opaco
  }

  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    // Cielo: niebla al horizonte, degradado hacia arriba.
    {
      const pos = cieloGeo.attributes.position,
        c = cieloGeo.attributes.color;
      cA.setHex(p.cieloHorizonte);
      cB.setHex(p.cieloAlto);
      cN.setHex(p.niebla);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 175;
        const t = y < 0.02 ? -1 : smooth(0.02, 0.6, y);
        const r = t < 0 ? cN.r : cA.r + (cB.r - cA.r) * t;
        const g = t < 0 ? cN.g : cA.g + (cB.g - cA.g) * t;
        const b = t < 0 ? cN.b : cA.b + (cB.b - cA.b) * t;
        c.setXYZ(i, r, g, b);
      }
      c.needsUpdate = true;
    }
    // Cada par corresponde a una fila de la paleta: la variación por cara ya está en sus UV.
    tonoTerreno(0, p.suelo);
    tonoTerreno(1, p.sueloAlt);
    tonoTerreno(2, mezclarHex(p.piedra, p.sueloAlt, 0.45));
    tonoTerreno(3, mezclarHex(p.piedra, p.suelo, 0.25));
    tonoTerreno(4, mezclarHex(p.vegetacion, p.sueloAlt, 0.17));
    tonoTerreno(5, mezclarHex(p.vegetacion, p.suelo, 0.36));
    tonoTerreno(6, mezclarHex(p.vegetacion, p.sueloAlt, 0.15));
    tonoTerreno(7, mezclarHex(p.suelo, p.piedra, 0.2));
    tonoTerreno(8, mezclarHex(p.vegetacion, p.particula, 0.2));
    tonoTerreno(9, p.vegetacion);
    paletaTerreno.needsUpdate = true; // 40 bytes, sea cual sea el tamaño del terreno
    fondoMat.color.setHex(mezclarHex(p.vegetacion, p.sueloAlt, 0.4));
    cintaMat.color.setHex(mezclarHex(p.piedra, p.suelo, 0.08));
    claroMat.color.setHex(mezclarHex(p.piedra, p.suelo, 0.05));
    piedraMat.color.setHex(p.piedra);
    muroMat.color.setHex(mezclarHex(p.piedra, p.sueloAlt, 0.2));
    for (const m of murales)
      m.mat.color.setHex(mezclarHex(p.piedra, 0xffffff, 0.15));
    cipresMat.color.setHex(mezclarHex(p.vegetacion, p.sueloAlt, 0.55));
    casaMat.color.setHex(mezclarHex(p.piedra, p.suelo, 0.3));
    detalle.aplicarPaleta(p);
  }

  return {
    aplicarPaleta,
    terreno,
    /**
     * @param {number} camX @param {number} camZ  m: centro de la vista (el cielo la sigue)
     * @param {number} s  m de ruta del jugador más adelantado (enciende los murales cercanos)
     * @param {number} dt
     * @param {boolean} reducido
     */
    sync(camX, camZ, s, dt, reducido) {
      cielo.position.set(camX, 0, camZ);
      detalle.avanzar(dt, reducido);
      for (const m of murales) {
        const objetivo =
          T.mural.brillo * (1 - smooth(0, T.mural.cerca, Math.abs(s - m.s)));
        m.mat.emissiveIntensity +=
          (objetivo - m.mat.emissiveIntensity) * Math.min(1, dt * 3);
      }
    },
    dispose() {
      vestigios.dispose();
      detalle.dispose();
      muretes.dispose();
      cipreses.dispose();
      casas.dispose();
      scene.remove(
        cielo,
        terr,
        fondo,
        cinta,
        claro,
        piedra,
        muretes,
        urna,
        cipreses,
        casas,
        muralGrupo,
      );
    },
  };
}
