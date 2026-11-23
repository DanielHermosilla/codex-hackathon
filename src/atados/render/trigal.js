// Arena de Mirra: trigal seco a hora dorada (D-086, D-088) con paleta base → clímax (D-083/D-188).
// Dentro del claro el trigo queda bajo la rodilla y no escribe profundidad: los anillos y los avisos
// se pintan siempre encima (D-051, D-089). Fuera, trigo alto hasta el horizonte, lindes de piedra,
// colinas, árboles y un molino en la niebla. Espantapájaros-pilar instanciados (D-048, D-184) que Mirra
// devora en la transición (D-154). La pradera está en la cima del monte (D-204): meseta con ruinas de un
// olimpo (columnas rotas y el arco de llegada detrás de Sael y Odo), risco y, abajo, el valle y un mar de
// nubes. Todo eso es decorado fuera del claro: los pilares de gameplay no cambian. En la fase 2 el trigo queda segado en franjas y las vetas de la
// corrupción se extienden por el suelo (D-084). Decorado con ruido determinista (no es gameplay).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hornearEstatico, recolorear } from "./modelos.js";
import { mezclarHex } from "./paleta.js";

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

// Copia sin índice (cada triángulo con sus vértices) para fusionar piezas. Algunas primitivas, como el
// icosaedro, ya vienen así: se clonan para no repetir el aviso de three.js ni compartir buffers.
/** @param {THREE.BufferGeometry} g */
const sinIndice = (g) => (g.index ? g.toNonIndexed() : g.clone());

/** @typedef {import('./tipos.js').Cfg['render']['trigal']} CfgTrigal */

// Altura del suelo de la cima (m) para una arena de radio `R`: claro llano, meseta apenas ondulada, risco que
// cae `caida` m pasado el borde y ladera empinada hasta el fondo del valle (`profundidad`). El ruido rompe el
// borde en peñas. Devuelve (x, z, d) → m, con d = distancia al centro (m). Pura y determinista.
/** @param {number} R m @param {CfgTrigal['cima']} C */
export function alturaCimaDe(R, C) {
  const RM = R + C.borde; // m: radio de la meseta (el risco empieza aquí)
  /** @param {number} x @param {number} z @param {number} d */
  return (x, z, d) => {
    const ruido = hash(x, z) - 0.5;
    const borde = RM + (hash(x * 0.2, z * 0.2) - 0.5) * 2.2; // el borde no es un círculo perfecto
    const meseta = -0.02 + ruido * 0.18 * smooth(R - 1, R + 2, d);
    const risco = C.caida * smooth(borde - 0.5, borde + 2.5, d);
    const ladera = Math.max(0, d - borde - 2.5) * (1 + ruido * 0.5); // ~1 m de caída por m de distancia
    return Math.max(-C.profundidad, meseta - risco - ladera);
  };
}

// Altura (m) de la malla del suelo tal como se dibuja: la de `altura` en los vértices de una PlaneGeometry de
// lado `tam` m y `segs` celdas por lado, interpolada dentro de cada triángulo. Así lo que se apoya en el
// suelo (el trigo) queda sobre los triángulos que se ven y no sobre la curva exacta, que entre vértices
// puede pasar metros por encima o por debajo junto al risco. Fuera de la malla usa la celda del borde.
/**
 * @param {(x: number, z: number, d: number) => number} altura
 * @param {number} tam m de lado
 * @param {number} segs celdas por lado
 */
export function alturaMallaDe(altura, tam, segs) {
  const paso = tam / segs; // m por celda
  const mitad = tam / 2;
  /** Altura de un vértice de la malla por sus índices de columna y fila. @param {number} ix @param {number} iz */
  const vert = (ix, iz) => {
    const x = ix * paso - mitad,
      z = iz * paso - mitad;
    return altura(x, z, Math.hypot(x, z));
  };
  /** @param {number} x @param {number} z */
  return (x, z) => {
    const fx = (x + mitad) / paso,
      fz = (z + mitad) / paso;
    const ix = Math.min(segs - 1, Math.max(0, Math.floor(fx))),
      iz = Math.min(segs - 1, Math.max(0, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - ix)),
      v = Math.min(1, Math.max(0, fz - iz)); // 0..1 dentro de la celda
    // Triangulación de PlaneGeometry (ya tumbada al suelo): a = (ix, iz), b = (ix, iz + 1), c = (ix + 1, iz + 1),
    // d = (ix + 1, iz); caras (a, b, d) y (b, c, d), separadas por la diagonal b–d (u + v = 1).
    const hb = vert(ix, iz + 1),
      hd = vert(ix + 1, iz);
    if (u + v <= 1) {
      const ha = vert(ix, iz);
      return ha + (hd - ha) * u + (hb - ha) * v;
    }
    const hc = vert(ix + 1, iz + 1);
    return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
  };
}

// Siembra del trigo alto de fuera del claro: posiciones deterministas en el anillo entre el claro y el risco,
// apoyadas en la malla del suelo y nunca sobre roca (más bajo que `roca` m: ya es el risco). Devuelve
// [x, y, z, semilla] por mata (semilla = índice del ruido, para su altura, giro y tono). Solo al montar.
/**
 * @param {CfgTrigal} T
 * @param {number} R m: radio del claro
 * @param {(x: number, z: number) => number} alturaMalla
 */
export function sembrarFuera(T, R, alturaMalla) {
  const NF = T.fuera.matas;
  const RM = R + T.cima.borde; // m: radio de la meseta
  const out = new Float32Array(NF * 4);
  let n = 0;
  for (let i = 0; n < NF && i < NF * 3; i++) {
    const a = hash(i, 11) * Math.PI * 2,
      r =
        R +
        1.2 +
        Math.pow(hash(i, 12), 0.8) * (Math.min(T.fuera.radio, RM - 1.5) - R); // no pasa del risco
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const y = alturaMalla(x, z);
    if (y < T.cima.roca) continue; // sobre la roca del risco no crece trigo
    out[n * 4] = x;
    out[n * 4 + 1] = y;
    out[n * 4 + 2] = z;
    out[n * 4 + 3] = i;
    n++;
  }
  return out.subarray(0, n * 4);
}

// Fondo del valle: disco tumbado a la altura `y` (m), sin índice (color por cara) y con atributo de color.
// Los anillos lo parten en caras pequeñas: con un abanico de gajos, todas las caras tocaban el borde.
/** @param {CfgTrigal['cima']['valle']} V @param {number} y m */
export function geoValle(V, y) {
  const g = new THREE.RingGeometry(0, V.radio, V.segmentos, V.anillos);
  const q = g.toNonIndexed();
  g.dispose();
  q.rotateX(-Math.PI / 2);
  q.translate(0, y, 0);
  q.deleteAttribute("uv");
  q.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Float32Array(q.attributes.position.count * 3),
      3,
    ),
  );
  return q;
}

// Colorea el valle: la parcela (entre `cA` trigo y `cB` tierra) sale del centroide de cada cara, para que la
// cara entera sea un campo; el fundido hacia la niebla `cN` va por vértice con su propio radio, así el centro
// del disco conserva sus parcelas y solo el borde se pierde contra el fondo. `cTmp` es un temporal.
/**
 * @param {THREE.BufferGeometry} geo
 * @param {THREE.Color} cA @param {THREE.Color} cB @param {THREE.Color} cN @param {THREE.Color} cTmp
 */
export function pintarValle(geo, cA, cB, cN, cTmp) {
  const pos = geo.attributes.position,
    ca = geo.attributes.color;
  for (let f = 0; f < pos.count; f += 3) {
    const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3,
      cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
    const parcela = hash(Math.floor(cx / 9), Math.floor(cz / 9)); // campos de ~9 m
    for (let j = 0; j < 3; j++) {
      const r = Math.hypot(pos.getX(f + j), pos.getZ(f + j)); // m del centro de este vértice
      cTmp
        .copy(cA)
        .lerp(cB, parcela)
        .lerp(cN, smooth(70, 185, r));
      ca.setXYZ(f + j, cTmp.r, cTmp.g, cTmp.b);
    }
  }
  ca.needsUpdate = true;
}

/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, modelos: import('./tipos.js').Modelos, world0: import('./tipos.js').Mundo, jefe0: any }} args
 */
export function crearTrigal({ scene, cfg, keep, modelos, world0, jefe0 }) {
  const T = cfg.render.trigal;
  const R = world0.arenaRadius;
  const C = T.cima;
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
  const uViento = { value: 0 };
  /** @type {import('./tipos.js').Paleta | null} */
  let pal = null;

  // ─── Cielo: domo con degradado por vértice ───
  const cieloGeo = keep(new THREE.SphereGeometry(170, 24, 12));
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
  scene.add(cielo);

  // Altura del suelo de la cima (m) y la de la malla tal como se dibuja (para apoyar el trigo).
  const alturaCima = alturaCimaDe(R, C);
  const alturaMalla = alturaMallaDe(alturaCima, C.suelo.tam, C.suelo.segmentos);

  // ─── Suelo low-poly: claro llano, meseta, risco y ladera del monte; color por cara ───
  const sueloGeo = keep(
    new THREE.PlaneGeometry(
      C.suelo.tam,
      C.suelo.tam,
      C.suelo.segmentos,
      C.suelo.segmentos,
    ).toNonIndexed(),
  );
  sueloGeo.rotateX(-Math.PI / 2);
  {
    const pos = sueloGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i),
        d = Math.hypot(x, z);
      pos.setY(i, alturaCima(x, z, d));
    }
    sueloGeo.computeVertexNormals();
    sueloGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3),
    );
  }
  const suelo = new THREE.Mesh(
    sueloGeo,
    std(0xffffff, { vertexColors: true, roughness: 1 }),
  );
  suelo.receiveShadow = true;
  suelo.renderOrder = -3;
  scene.add(suelo);

  // ─── Trigo: espiga low-poly (tallo + espiga + dos hojas), altura normalizada 1 ───
  const espigaGeo = (() => {
    const tallo = new THREE.ConeGeometry(0.04, 1, 3, 1, true);
    tallo.translate(0, 0.5, 0);
    const espiga = new THREE.OctahedronGeometry(0.075, 0);
    espiga.scale(0.9, 2.6, 0.9);
    espiga.translate(0.015, 0.93, 0);
    const h1 = new THREE.ConeGeometry(0.05, 0.55, 3, 1, true);
    h1.rotateZ(0.5);
    h1.translate(0.1, 0.32, 0);
    const h2 = new THREE.ConeGeometry(0.045, 0.45, 3, 1, true);
    h2.rotateZ(-0.6);
    h2.rotateY(2);
    h2.translate(-0.05, 0.28, 0.07);
    const g = mergeGeometries([tallo, espiga, h1, h2].map((x) => sinIndice(x)));
    [tallo, espiga, h1, h2].forEach((x) => x.dispose());
    g.computeVertexNormals();
    return keep(g);
  })();
  // Viento: el vértice se desplaza según su altura y la posición de la instancia.
  /** @param {THREE.MeshStandardMaterial} mat */
  const conViento = (mat) => {
    mat.onBeforeCompile = (
      /** @type {import('three').WebGLProgramParametersWithUniforms} */ sh,
    ) => {
      sh.uniforms.uViento = uViento;
      sh.vertexShader = sh.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uViento;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 ip = instanceMatrix[3].xz;
            float wv = sin(uViento + ip.x * 0.35 + ip.y * 0.21) + 0.45 * sin(uViento * 2.3 + ip.x * 0.9);
            transformed.x += wv * ${T.viento.fuerza.toFixed(3)} * position.y * position.y * 2.0;
            transformed.z += wv * ${(T.viento.fuerza * 0.5).toFixed(3)} * position.y * position.y * 2.0;
          #endif`,
        );
    };
    mat.customProgramCacheKey = () => "trigo-viento";
    return mat;
  };
  const trigoMatDentro = conViento(
    std(0xffffff, { depthWrite: false, side: THREE.DoubleSide }),
  );
  const trigoMatFuera = conViento(std(0xffffff, { side: THREE.DoubleSide }));
  const d = new THREE.Object3D();
  const col = new THREE.Color();

  // Dentro del claro: matas bajas, posiciones fijas (se siegan por franjas en la fase 2).
  const ND = T.dentro.matas;
  const dentro = new THREE.InstancedMesh(espigaGeo, trigoMatDentro, ND);
  dentro.renderOrder = -2; // tras el suelo, antes que todo lo opaco (no escribe profundidad)
  dentro.receiveShadow = true;
  const dPos = new Float32Array(ND * 4); // x, z, altura, giro
  for (let i = 0; i < ND; i++) {
    // Mechones: cada 5 matas comparten centro (se lee como rastrojo con matas, no como ruido).
    const m = Math.floor(i / 5);
    const a = hash(m, 1) * Math.PI * 2,
      r = Math.sqrt(hash(m, 2)) * (R - 0.4);
    const da = hash(i, 8) * Math.PI * 2,
      dr = 0.08 + hash(i, 9) * 0.28;
    dPos[i * 4] = Math.cos(a) * r + Math.cos(da) * dr;
    dPos[i * 4 + 1] = Math.sin(a) * r + Math.sin(da) * dr;
    dPos[i * 4 + 2] =
      T.dentro.altura[0] +
      hash(i, 3) * (T.dentro.altura[1] - T.dentro.altura[0]);
    dPos[i * 4 + 3] = hash(i, 4) * 6.28;
    dentro.setColorAt(i, col.setScalar(0.78 + hash(i, 5) * 0.35));
  }
  scene.add(dentro);

  // Fuera: trigo alto hasta el horizonte (estático salvo el viento).
  const NF = T.fuera.matas;
  const fuera = new THREE.InstancedMesh(espigaGeo, trigoMatFuera, NF);
  fuera.receiveShadow = true;
  {
    // Sobre la malla del suelo (no a altura fija): junto al risco el terreno ya empieza a caer.
    const sembradas = sembrarFuera(T, R, alturaMalla);
    let n = 0;
    for (let k = 0; k < sembradas.length; k += 4) {
      const x = sembradas[k],
        y = sembradas[k + 1],
        z = sembradas[k + 2],
        i = sembradas[k + 3]; // semilla del ruido de esta mata
      const h =
        T.fuera.altura[0] +
        hash(i, 13) * (T.fuera.altura[1] - T.fuera.altura[0]);
      d.position.set(x, y - 0.02, z); // 2 cm enterrada: la base no flota en las caras inclinadas
      d.rotation.set(
        (hash(i, 14) - 0.5) * 0.3,
        hash(i, 15) * 6.28,
        (hash(i, 16) - 0.5) * 0.3,
      );
      d.scale.set(h * 1.6, h, h * 1.6);
      d.updateMatrix();
      fuera.setMatrixAt(n, d.matrix);
      fuera.setColorAt(n, col.setScalar(0.8 + hash(i, 17) * 0.32));
      n++;
    }
    fuera.count = n;
  }
  scene.add(fuera);

  // ─── Lindes: piedras bajas alrededor del claro (un draw call) ───
  const piedraGeo = keep(new THREE.DodecahedronGeometry(0.42, 0));
  const NP = Math.round((Math.PI * 2 * R) / 0.62);
  const piedras = new THREE.InstancedMesh(piedraGeo, std(0xffffff), NP);
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2,
      r = R + 0.35 + (hash(i, 21) - 0.5) * 0.25;
    d.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r);
    d.rotation.set(hash(i, 22) * 3, hash(i, 23) * 3, hash(i, 24) * 3);
    const s = 0.7 + hash(i, 25) * 0.6;
    d.scale.set(s * 1.2, s * 0.6, s);
    d.updateMatrix();
    piedras.setMatrixAt(i, d.matrix);
    piedras.setColorAt(i, col.setScalar(0.8 + hash(i, 26) * 0.35));
  }
  piedras.receiveShadow = true;
  scene.add(piedras);
  // ─── Ruinas del olimpo (D-204): columnas rotas y muros en el borde, y el arco de llegada ───
  // Una sola malla (un draw call) con gris por vértice: el color de la piedra sale de la paleta.
  // Del lado de la cámara (+z) solo quedan tocones bajos (`altoCerca`) para no tapar a la pareja.
  const ruinaMat = std(0xffffff, { vertexColors: true });
  const RU = C.ruinas,
    AR = C.arco;
  const RRu = R + RU.distancia; // m: radio del anillo de ruinas
  {
    /** @type {THREE.BufferGeometry[]} */
    const piezas = [];
    /** Añade una pieza con un gris (0..1) que multiplica el color de la piedra. @param {THREE.BufferGeometry} g @param {number} gris */
    const poner = (g, gris) => {
      const q = sinIndice(g);
      g.dispose();
      const n = q.attributes.position.count;
      const c = new Float32Array(n * 3).fill(gris);
      q.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
      piezas.push(q);
    };
    const NC = RU.columnas;
    const huecoArco = Math.atan2(AR.ancho / 2 + 1.6, RRu); // rad a cada lado de +z sin columnas (deja ver el arco)
    for (let i = 0; i < NC; i++) {
      const a = ((i + 0.5) / NC) * Math.PI * 2 + (hash(i, 71) - 0.5) * 0.12;
      // Distancia angular a +z (a = π/2): ahí está el arco.
      const da = Math.abs(
        Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)),
      );
      if (da < huecoArco) continue;
      const r = RRu + (hash(i, 72) - 0.5) * 0.8;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const cerca = Math.sin(a) > 0.15; // mitad de la cámara: tocones bajos
      const h = cerca
        ? RU.altoCerca * (0.5 + hash(i, 73) * 0.5)
        : RU.alto[0] + hash(i, 73) * (RU.alto[1] - RU.alto[0]);
      const gris = 0.82 + hash(i, 74) * 0.22;
      // Basa cuadrada, fuste de 8 caras y, en las altas, un capitel ladeado (rota, no derrumbada).
      const basa = new THREE.BoxGeometry(RU.radio * 2.5, 0.35, RU.radio * 2.5);
      basa.translate(x, 0.17, z);
      poner(basa, gris * 0.92);
      const fuste = new THREE.CylinderGeometry(RU.radio * 0.85, RU.radio, h, 8);
      fuste.rotateZ((hash(i, 75) - 0.5) * 0.06);
      fuste.translate(x, 0.35 + h / 2, z);
      poner(fuste, gris);
      if (!cerca && hash(i, 76) > 0.45) {
        const capitel = new THREE.BoxGeometry(
          RU.radio * 2.6,
          0.45,
          RU.radio * 2.6,
        );
        capitel.rotateY(a);
        capitel.rotateZ((hash(i, 77) - 0.5) * 0.25);
        capitel.translate(x, 0.35 + h + 0.2, z);
        poner(capitel, gris * 0.95);
      }
      // Tambor caído junto a la columna (piedra tumbada entre el trigo).
      if (hash(i, 78) > 0.55) {
        const tambor = new THREE.CylinderGeometry(
          RU.radio * 0.9,
          RU.radio * 0.9,
          1.1,
          8,
        );
        tambor.rotateZ(Math.PI / 2);
        tambor.rotateY(hash(i, 79) * Math.PI);
        const ox = (hash(i, 80) - 0.5) * 2.4,
          oz = (hash(i, 81) - 0.5) * 2.4;
        tambor.translate(x + ox, RU.radio * 0.85, z + oz);
        poner(tambor, gris * 0.88);
      }
      // Lienzo de muro roto hasta la columna siguiente, solo al fondo (no tapa nada).
      if (!cerca && hash(i, 82) > 0.4) {
        const a2 = ((i + 1.5) / NC) * Math.PI * 2;
        const x2 = Math.cos(a2) * RRu,
          z2 = Math.sin(a2) * RRu;
        // Extremos del muro: pegados a cada columna, sin meterse en el fuste (m).
        const dx = x2 - x,
          dz = z2 - z,
          dl = Math.hypot(dx, dz) || 1;
        const px = x + (dx / dl) * RU.radio * 1.2,
          pz = z + (dz / dl) * RU.radio * 1.2;
        const largo = dl - RU.radio * 2.4;
        const alto = 0.9 + hash(i, 83) * 1.6;
        // Dos bloques de distinta altura: el muro se lee mordido, no entero.
        for (const [t0, t1, f] of [
          [0, 0.55, 1],
          [0.55, 1, 0.45 + hash(i, 84) * 0.4],
        ]) {
          const l = largo * (t1 - t0);
          const m = new THREE.BoxGeometry(l, alto * f, 0.55);
          const tm = ((t0 + t1) / 2) * largo; // m desde el primer extremo hasta el centro del bloque
          const cx = px + (dx / dl) * tm,
            cz = pz + (dz / dl) * tm;
          m.rotateY(-Math.atan2(dz, dx));
          m.translate(cx, (alto * f) / 2, cz);
          poner(m, gris * 0.9);
        }
      }
    }
    // Arco de llegada (D-204, D-211): detrás de donde aparecen Sael y Odo, abierto hacia el claro.
    const az = R + AR.distancia; // m en +z
    const radioArco = AR.ancho / 2;
    const altoPie = AR.alto - radioArco; // m: altura de los pies hasta el arranque del medio punto
    for (const sx of [-1, 1]) {
      const pie = new THREE.BoxGeometry(0.95, altoPie, 1.1);
      pie.translate(sx * (radioArco + 0.2), altoPie / 2, az);
      poner(pie, 0.9);
      const zocalo = new THREE.BoxGeometry(1.35, 0.4, 1.5);
      zocalo.translate(sx * (radioArco + 0.2), 0.2, az);
      poner(zocalo, 0.82);
    }
    const medio = new THREE.TorusGeometry(radioArco + 0.2, 0.5, 4, 9, Math.PI);
    medio.translate(0, altoPie, az);
    poner(medio, 0.95);
    const clave = new THREE.BoxGeometry(0.7, 0.9, 1.25);
    clave.translate(0, AR.alto + 0.2, az);
    poner(clave, 1.05);
    const g = keep(mergeGeometries(piezas));
    piezas.forEach((q) => q.dispose());
    const ruinas = new THREE.Mesh(g, ruinaMat);
    ruinas.castShadow = true;
    ruinas.receiveShadow = true;
    scene.add(ruinas);
  }

  // ─── Abajo (D-204): el valle al pie del monte, con colinas, árboles y un molino en la niebla ───
  // Todo se coloca a `profundidad` m bajo la pradera y más allá de la ladera: se ve desde arriba.
  // Sin niebla de escena: a esa distancia la niebla los borraría del todo. La bruma va horneada en el color
  // (mezcla con `niebla` en aplicarPaleta), así el valle se lee abajo, lejano y velado, pero se lee.
  const VY = -C.profundidad; // m: altura del fondo del valle
  const lejos = { fog: false };
  // Colinas y fondo del valle sin luz (MeshBasic): con el sol se veían saturadas y con sombras duras, demasiado
  // cerca para estar 46 m más abajo. El sombreado va horneado por cara y muy suave.
  const sinLuz = () =>
    keep(new THREE.MeshBasicMaterial({ vertexColors: true, ...lejos }));
  const colinaMat = sinLuz();
  // Árboles y molino, también sin luz: con sol, sus copas brillaban como globos sobre las nubes.
  const arbolCopaMat = keep(new THREE.MeshBasicMaterial(lejos));
  const maderaLejosMat = keep(new THREE.MeshBasicMaterial(lejos));
  let /** @type {THREE.Mesh} */ molinoAspas, /** @type {THREE.Mesh} */ colinas;
  {
    const col2 = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 41),
        r = 105 + hash(i, 42) * 35;
      const g = new THREE.IcosahedronGeometry(20 + hash(i, 43) * 14, 1);
      g.scale(1.6, 0.4 + hash(i, 44) * 0.3, 1);
      g.rotateY(a);
      g.translate(Math.cos(a) * r, VY - 2, Math.sin(a) * r);
      col2.push(sinIndice(g));
      g.dispose();
    }
    const g = keep(mergeGeometries(col2));
    col2.forEach((x) => x.dispose());
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Float32Array(g.attributes.position.count * 3),
        3,
      ),
    );
    g.computeVertexNormals();
    colinas = new THREE.Mesh(g, colinaMat);
    scene.add(colinas);

    const copas = [],
      troncos = [];
    for (let i = 0; i < 22; i++) {
      const a = hash(i, 51) * Math.PI * 2,
        r = 72 + hash(i, 52) * 36; // m: más allá del pie de la ladera
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        h = 3 + hash(i, 53) * 3;
      const t = new THREE.CylinderGeometry(0.18, 0.3, h, 5);
      t.translate(x, VY + h / 2, z);
      troncos.push(sinIndice(t));
      t.dispose();
      const c = new THREE.IcosahedronGeometry(1.6 + hash(i, 54) * 1.4, 0);
      c.scale(1, 0.8 + hash(i, 55) * 0.5, 1);
      c.translate(x, VY + h + 0.8, z);
      copas.push(sinIndice(c));
      c.dispose();
    }
    // Molino: torre, tejado y aspas (las aspas giran despacio).
    const mx = -48,
      mz = -78;
    const torre = new THREE.CylinderGeometry(1.4, 2.2, 8, 7);
    torre.translate(mx, VY + 4, mz);
    troncos.push(sinIndice(torre));
    torre.dispose();
    const tejado = new THREE.ConeGeometry(1.9, 2.4, 7);
    tejado.translate(mx, VY + 9.2, mz);
    troncos.push(sinIndice(tejado));
    tejado.dispose();
    scene.add(new THREE.Mesh(keep(mergeGeometries(troncos)), maderaLejosMat));
    troncos.forEach((x) => x.dispose());
    scene.add(new THREE.Mesh(keep(mergeGeometries(copas)), arbolCopaMat));
    copas.forEach((x) => x.dispose());
    const aspas = [];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.BoxGeometry(0.5, 6, 0.08);
      b.translate(0, 3.2, 0);
      b.rotateZ((k * Math.PI) / 2);
      aspas.push(sinIndice(b));
      b.dispose();
    }
    molinoAspas = new THREE.Mesh(keep(mergeGeometries(aspas)), maderaLejosMat);
    aspas.forEach((x) => x.dispose());
    molinoAspas.position.set(mx + 1.2, VY + 8, mz + 1.6);
    molinoAspas.rotation.y = 0.6;
    scene.add(molinoAspas);
  }
  // Fondo del valle: un disco con parcelas de color por cara (campos), un draw call.
  const valleGeo = keep(geoValle(C.valle, VY - 0.3));
  const valle = new THREE.Mesh(valleGeo, sinLuz());
  valle.renderOrder = -4;
  scene.add(valle);

  // Mar de nubes bajo la cima: cúmulos de icosaedros aplastados en un anillo; giran muy despacio.
  // Sin luz (MeshBasic): con el sol, las caras en sombra se leían como rocas y las de arriba pasaban el umbral
  // del bloom (resplandor que tapaba el borde del claro). El sombreado va horneado por cara: arriba más claro.
  const nubeMat = keep(
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
  );
  const nubes = (() => {
    const N = C.nubes;
    /** @type {THREE.BufferGeometry[]} */
    const partes = [];
    for (let i = 0; i < N.n; i++) {
      const a = (i / N.n) * Math.PI * 2 + hash(i, 91) * 0.5;
      const r = N.radio[0] + hash(i, 92) * (N.radio[1] - N.radio[0]);
      const y = N.altura[0] + hash(i, 93) * (N.altura[1] - N.altura[0]);
      const bolas = 3 + Math.floor(hash(i, 94) * 3); // 3–5 bolas por cúmulo
      for (let k = 0; k < bolas; k++) {
        const t = 4 + hash(i, k + 95) * 5; // m de radio de cada bola
        const g = new THREE.IcosahedronGeometry(t, 0);
        g.scale(1.5, 0.32, 1.1); // aplastadas: un cúmulo bajo, no una roca
        const ox = (k - bolas / 2) * t * 1.3,
          oz = (hash(k, i + 96) - 0.5) * t;
        g.rotateY(-a - Math.PI / 2); // lo largo del cúmulo sigue el anillo
        g.translate(
          Math.cos(a) * r + ox * -Math.sin(a) + oz * Math.cos(a),
          y + hash(k, i) * 1.5,
          Math.sin(a) * r + ox * Math.cos(a) + oz * Math.sin(a),
        );
        partes.push(sinIndice(g));
        g.dispose();
      }
    }
    const g = keep(mergeGeometries(partes));
    partes.forEach((x) => x.dispose());
    g.computeVertexNormals(); // sin índice: normal por cara
    {
      const nor = g.attributes.normal;
      const sombra = new Float32Array(nor.count * 3);
      for (let v = 0; v < nor.count; v++)
        sombra.fill(0.8 + 0.2 * Math.max(0, nor.getY(v)), v * 3, v * 3 + 3); // 0,8 abajo → 1 arriba
      g.setAttribute("color", new THREE.Float32BufferAttribute(sombra, 3));
    }
    const m = new THREE.Mesh(g, nubeMat);
    scene.add(m);
    return m;
  })();

  // ─── Espantapájaros-pilar: un InstancedMesh horneado con color por vértice ───
  const espGeo = keep(
    hornearEstatico(modelos.espantapajaros.scene, () => 0xffffff),
  );
  const espMat = std(0xffffff, { vertexColors: true });
  const pilares = world0.pillars.map((/** @type {any} */ P) => ({
    id: P.id,
    x: P.x,
    z: P.z,
    r: P.r,
    s: 1,
    comido: 0,
    giro: Math.atan2(P.x, P.z) + Math.PI,
  }));
  const esp = new THREE.InstancedMesh(espGeo, espMat, pilares.length);
  esp.castShadow = true;
  esp.receiveShadow = true;
  esp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  esp.frustumCulled = false;
  scene.add(esp);

  // ─── Vetas de la corrupción en el suelo (D-084): tiras ordenadas por distancia, se revelan con drawRange ───
  const vetaMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthWrite: false,
      transparent: true,
      opacity: T.vetas.opacidad,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  let /** @type {THREE.Mesh} */ vetas, /** @type {number} */ vetasTotal;
  {
    const tiras = [];
    const ox = jefe0.x,
      oz = jefe0.z;
    for (let r = 0; r < T.vetas.ramas; r++) {
      let x = ox,
        z = oz,
        ang = (r / T.vetas.ramas) * Math.PI * 2 + hash(r, 61);
      let ancho = 0.12;
      for (let s = 0; s < T.vetas.pasos; s++) {
        const len = 0.8 + hash(r, s) * 0.9;
        const nx = x + Math.cos(ang) * len,
          nz = z + Math.sin(ang) * len;
        if (Math.hypot(nx, nz) > R - 0.4) break;
        const t = new THREE.PlaneGeometry(len, ancho);
        t.rotateX(-Math.PI / 2);
        t.rotateY(-ang);
        t.translate((x + nx) / 2, 0.025, (z + nz) / 2);
        tiras.push({ g: sinIndice(t), dist: s + hash(r, s + 7) * 0.5 });
        t.dispose();
        if (hash(s, r + 3) > 0.7 && s > 1) {
          // rama secundaria
          const a2 = ang + (hash(r, s + 9) > 0.5 ? 0.9 : -0.9),
            l2 = len * 0.8;
          const t2 = new THREE.PlaneGeometry(l2, ancho * 0.6);
          t2.rotateX(-Math.PI / 2);
          t2.rotateY(-a2);
          t2.translate(
            nx + (Math.cos(a2) * l2) / 2,
            0.025,
            nz + (Math.sin(a2) * l2) / 2,
          );
          tiras.push({ g: sinIndice(t2), dist: s + 0.6 });
          t2.dispose();
        }
        x = nx;
        z = nz;
        ang += (hash(s, r) - 0.5) * 1.1;
        ancho = Math.max(0.04, ancho * 0.86);
      }
    }
    tiras.sort((a, b) => a.dist - b.dist);
    const g = keep(mergeGeometries(tiras.map((t) => t.g)));
    tiras.forEach((t) => t.g.dispose());
    vetasTotal = g.attributes.position.count;
    g.setDrawRange(0, 0);
    vetas = new THREE.Mesh(g, vetaMat);
    vetas.renderOrder = 1;
    vetas.frustumCulled = false;
    scene.add(vetas);
  }
  let revelar = 0,
    revelarObj = T.vetas.revelarFase1;

  // ─── Paleta ───
  const cTmp = new THREE.Color(),
    cA = new THREE.Color(),
    cB = new THREE.Color(),
    cN = new THREE.Color(),
    cV = new THREE.Color(),
    cO = new THREE.Color(),
    cR = new THREE.Color();
  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pal = p;
    // Cielo
    {
      const pos = cieloGeo.attributes.position,
        c = cieloGeo.attributes.color;
      cA.setHex(p.cieloHorizonte);
      cB.setHex(p.cieloAlto);
      cN.setHex(p.niebla);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 170;
        if (y < 0.02) cTmp.copy(cN);
        else cTmp.copy(cA).lerp(cB, smooth(0.02, 0.6, y));
        c.setXYZ(i, cTmp.r, cTmp.g, cTmp.b);
      }
      c.needsUpdate = true;
    }
    // Suelo por cara
    {
      const pos = sueloGeo.attributes.position,
        c = sueloGeo.attributes.color;
      cA.setHex(p.suelo);
      cB.setHex(p.sueloAlt);
      cR.setHex(mezclarHex(p.sueloAlt, p.madera, 0.3)); // roca del monte
      cN.setHex(p.niebla);
      cV.setHex(mezclarHex(p.vegetacion, p.suelo, 0.45));
      cO.setHex(mezclarHex(p.sueloAlt, p.madera, 0.35));
      for (let f = 0; f < pos.count; f += 3) {
        const x = pos.getX(f),
          z = pos.getZ(f),
          dd = Math.hypot(x, z);
        cTmp.copy(cA).lerp(cB, hash(x * 0.37, z * 0.53));
        // Manchas grandes de rastrojo más oscuro (ruido de baja frecuencia) para romper el monocromo.
        const mancha =
          Math.sin(x * 0.23 + Math.sin(z * 0.17) * 2) *
          Math.sin(z * 0.19 + Math.cos(x * 0.13) * 2);
        if (mancha > 0.25) cTmp.lerp(cO, Math.min(0.55, (mancha - 0.25) * 1.2));
        if (dd > R + 0.8) cTmp.lerp(cV, 0.6); // fuera del claro: tierra de trigal
        // Risco y ladera: roca que se oscurece y se funde con la niebla al bajar.
        const y = pos.getY(f);
        if (y < C.roca) {
          cTmp.copy(cR).multiplyScalar(0.82 + hash(x * 0.7, z * 0.3) * 0.3);
          cTmp.lerp(cN, Math.min(0.6, -y / C.profundidad));
        }
        for (let j = 0; j < 3; j++) c.setXYZ(f + j, cTmp.r, cTmp.g, cTmp.b);
      }
      c.needsUpdate = true;
    }
    trigoMatDentro.color.setHex(mezclarHex(p.vegetacion, p.suelo, 0.25));
    trigoMatFuera.color.setHex(p.vegetacion);
    piedras.material.color.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.3));
    ruinaMat.color.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.45)); // mármol gastado y polvoriento
    nubeMat.color.setHex(mezclarHex(p.niebla, 0xffffff, 0.5)); // < 1: no pasa el umbral del bloom
    // Valle: parcelas entre trigo y tierra, fundidas con la niebla hacia el borde del disco.
    cA.setHex(mezclarHex(p.vegetacion, p.niebla, 0.6));
    cB.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.55));
    cN.setHex(p.niebla);
    pintarValle(valleGeo, cA, cB, cN, cTmp);
    {
      const g = colinas.geometry,
        pos = g.attributes.position,
        ca = g.attributes.color;
      cA.setHex(mezclarHex(p.vegetacion, p.niebla, 0.75)); // colinas del valle: casi bruma
      cB.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.72));
      const nor = g.attributes.normal;
      for (let f = 0; f < pos.count; f += 3) {
        cTmp.copy(cA).lerp(cB, hash(pos.getX(f) * 0.1, pos.getZ(f) * 0.1));
        cTmp.multiplyScalar(0.86 + 0.14 * Math.max(0, nor.getY(f))); // laderas un poco más oscuras
        for (let j = 0; j < 3; j++) ca.setXYZ(f + j, cTmp.r, cTmp.g, cTmp.b);
      }
      ca.needsUpdate = true;
    }
    arbolCopaMat.color.setHex(
      mezclarHex(mezclarHex(p.vegetacion, p.madera, 0.55), p.niebla, 0.6),
    );
    maderaLejosMat.color.setHex(mezclarHex(p.madera, p.niebla, 0.6));
    recolorear(
      espGeo,
      (/** @type {string} */ n) =>
        /** @type {Record<string, number>} */ ({
          madera: p.madera,
          paja: mezclarHex(p.vegetacion, 0xffffff, 0.12),
          tela: cfg.render.materiales.telaEspantapajaros,
          cuerda: cfg.render.materiales.cuerda,
        })[n] ?? p.madera,
    );
    vetaMat.color
      .setHex(cfg.paleta.corrupcion.veta)
      .multiplyScalar(T.brillo.vetaSuelo * p.corrupcion);
  }

  // ─── Siega por franjas (fase 2) ───
  const F = T.franjas;
  const dirX = Math.SQRT1_2,
    dirZ = Math.SQRT1_2;
  let siega = 0,
    siegaObj = 0; // 0 = intacto, 1 = franjas segadas
  /** @type {{x:number,z:number,r:number}[]} */
  let huecos = [];
  let habiaHuecos = false;
  // Solo las matas que cruzan el borde del vacío necesitan cambiar su matriz.
  const bajoVacio = new Uint8Array(ND);
  function colocarDentro(soloCambiosDeVacio = false) {
    let cambiado = false;
    for (let i = 0; i < ND; i++) {
      const x = dPos[i * 4],
        z = dPos[i * 4 + 1];
      let oculta = 0;
      for (const p of huecos) {
        if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) {
          oculta = 1;
          break;
        }
      }
      if (soloCambiosDeVacio && bajoVacio[i] === oculta) continue;
      bajoVacio[i] = oculta;
      cambiado = true;
      const banda =
        (((x * dirX + z * dirZ) % F.ancho) + F.ancho) % F.ancho < F.segado;
      // La siega avanza a lo largo de la franja (perpendicular a la dirección de las bandas).
      const avance = (-x * dirZ + z * dirX) / (R * 2) + 0.5;
      const cortado = banda && siega >= avance;
      const h = cortado ? F.altura : dPos[i * 4 + 2];
      d.position.set(x, -0.01, z);
      d.rotation.set(
        (hash(i, 6) - 0.5) * 0.4,
        dPos[i * 4 + 3],
        (hash(i, 7) - 0.5) * 0.4,
      );
      d.scale.set(h * 1.5 + 0.12, h, h * 1.5 + 0.12);
      // Cuando se abre un pozo, desaparece también el trigo que crecía encima.
      if (oculta) d.scale.setScalar(0);
      d.updateMatrix();
      dentro.setMatrixAt(i, d.matrix);
    }
    if (cambiado) dentro.instanceMatrix.needsUpdate = true;
  }
  colocarDentro();

  // ─── Sincronía ───
  /**
   * @param {import('./tipos.js').Mundo} w
   * @param {import('./tipos.js').Combate} c
   * @param {number} dt
   * @param {number} tiempo
   * @param {{ paja: (x: number, y: number, z: number, n: number) => void }} [vfx]
   */
  function sync(w, c, dt, tiempo, vfx) {
    uViento.value = tiempo * T.viento.velocidad;
    huecos = c.arenaMirra?.huecos ?? [];
    if (huecos.length || habiaHuecos) colocarDentro(true);
    habiaHuecos = huecos.length > 0;
    molinoAspas.rotation.z = tiempo * 0.25;
    nubes.rotation.y = tiempo * 0.004; // rad/s: el mar de nubes se desliza casi quieto
    // Fase 2 (jefe.fase interna ≥ 1): siega en franjas durante la transición.
    siegaObj = c.jefe.fase >= 1 ? 1 : 0;
    if (siega !== siegaObj) {
      const antes = siega;
      siega =
        siegaObj > siega
          ? Math.min(
              siegaObj,
              siega + dt / Math.max(0.2, cfg.jefes.comun.transicion),
            )
          : siegaObj;
      if (siega !== antes) colocarDentro();
    }
    revelarObj = c.jefe.fase >= 1 ? T.vetas.revelarFase2 : T.vetas.revelarFase1;
    if (!c.jefe.vivo) revelarObj = 0;
    revelar +=
      (revelarObj - revelar) *
      Math.min(1, dt * (revelarObj > revelar ? 0.9 : 0.5));
    vetas.geometry.setDrawRange(0, Math.floor((revelar * vetasTotal) / 3) * 3);

    // Pilares: presentes o devorados (vuelan a la boca de Mirra encogiendo y girando).
    for (let k = 0; k < pilares.length; k++) {
      const P = pilares[k];
      let presente = false;
      for (let j = 0; j < w.pillars.length; j++)
        if (w.pillars[j].id === P.id) {
          presente = true;
          break;
        }
      if (presente) {
        P.comido = 0;
        P.s = Math.min(1, P.s + dt * 3);
      } else if (c.arenaMirra?.explosion && P.comido === 0) {
        // La onda derriba la cobertura en su sitio, fuera de la animación de devorar.
        vfx?.paja(P.x, 1.2, P.z, 22);
        P.s = 0;
        P.comido = 1;
      } else if (P.comido < 1) {
        if (P.comido === 0) vfx?.paja(P.x, 1.6, P.z, 26);
        P.comido = Math.min(1, P.comido + dt / 0.9);
        P.s = 1 - P.comido;
      }
      const e = P.comido * P.comido;
      const bx = c.jefe.x + Math.cos(c.jefe.face) * 1.6,
        bz = c.jefe.z + Math.sin(c.jefe.face) * 1.6;
      d.position.set(P.x + (bx - P.x) * e, 2.4 * e, P.z + (bz - P.z) * e);
      d.rotation.set(P.comido * 0.8, P.giro + P.comido * 6, 0);
      d.scale.setScalar(Math.max(1e-3, P.s));
      d.updateMatrix();
      esp.setMatrixAt(k, d.matrix);
    }
    esp.instanceMatrix.needsUpdate = true;
  }

  return {
    sync,
    aplicarPaleta,
    get pal() {
      return pal;
    },
    dispose() {
      dentro.dispose();
      fuera.dispose();
      piedras.dispose();
      esp.dispose();
    },
  };
}
