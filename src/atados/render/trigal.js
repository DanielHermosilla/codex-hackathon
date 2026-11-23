// Arena de Mirra: trigal seco a hora dorada (D-086, D-088) con paleta base → clímax (D-083/D-188).
// Dentro del claro el trigo queda bajo la rodilla y no escribe profundidad: los anillos y los avisos
// se pintan siempre encima (D-051, D-089). Fuera, trigo alto hasta el horizonte, lindes de piedra,
// colinas, árboles y un molino en la niebla. Espantapájaros-pilar instanciados (D-048, D-184) que Mirra
// devora en la transición (D-154). La pradera está en la cima del monte (D-204): meseta con ruinas de un
// olimpo (columnas rotas y el arco de llegada detrás de Sael y Odo), risco y, abajo, el valle y un mar de
// nubes. Todo eso es decorado fuera del claro: los pilares de gameplay no cambian. En la fase 2 el trigo queda segado en franjas y las vetas de la
// corrupción se extienden por el suelo (D-084). Decorado con ruido determinista (no es gameplay).
import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hornearEstatico, recolorear } from "./modelos.js";
import { mezclarHex } from "./paleta.js";
import {
  geometriaEspiga,
  geometriaFloresSecas,
  geometriaRastrojo,
  hashTrigal as hash,
  texturaTrigal,
  vestirPiedra,
} from "./trigal-detalle.js";
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
 * @param {number} [NF] número de instancias de trigo reservadas
 */
export function sembrarFuera(T, R, alturaMalla, NF = T.fuera.matas) {
  const RM = R + T.cima.borde; // m: radio de la meseta
  const out = new Float32Array(NF * 4);
  let n = 0;
  for (let i = 0; n < NF && i < NF * 5; i++) {
    const a = hash(i, 11) * Math.PI * 2,
      r =
        R +
        1.2 +
        Math.pow(hash(i, 12), 0.8) * (Math.min(T.fuera.radio, RM - 1.5) - R); // no pasa del risco
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const y = alturaMalla(x, z);
    if (y < T.cima.roca) continue; // sobre la roca del risco no crece trigo
    const cresta = Math.sin(x * 0.7 + Math.sin(z * 0.42) * 2); // lomas densas de trigo separadas por lomos bajos
    if (hash(i, 18) < (1 - cresta) * 0.3) continue;
    if (z > R && Math.abs(x) < 1.75 && hash(i, 19) < 0.96) continue; // paso entre el arco y el claro
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

/** Material compartido por las tallas de Mirra.
 * @param {import('./tipos.js').Keep} keep */
function crearMaterialTalla(keep) {
  const relieve = keep(
    new THREE.TextureLoader().load(
      `${import.meta.env?.BASE_URL ?? "/"}atados/talla-codex.png`,
    ),
  );
  relieve.colorSpace = THREE.SRGBColorSpace; // El mapa aporta el sombreado del surco.
  // El mismo trazo oscuro baja la altura del material en el fondo del surco.
  return keep(
    new THREE.MeshStandardMaterial({
      map: relieve,
      bumpMap: relieve,
      bumpScale: 0.016,
      roughness: 0.95,
      transparent: true, // El alfa deja ver el pilar incluso en el interior del contorno.
      depthWrite: false,
      polygonOffset: true, // Se dibuja sobre la misma superficie que la paja.
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
}

/** Proyecta el logo entre las cuerdas sobre la cara que mira hacia la cámara.
 * @param {THREE.Mesh} poste @param {number} giro @param {THREE.MeshStandardMaterial} material
 * @param {import('./tipos.js').Keep} keep */
function crearTallaCodex(poste, giro, material, keep) {
  const sector = Math.PI / 4; // Ocho caras. Sus centros caen a medio sector de cada arista.
  const cara = (Math.floor(-giro / sector) + 0.5) * sector;
  const centro = new THREE.Vector3(
    0.66 * Math.sin(cara),
    0.85,
    0.66 * Math.cos(cara),
  );
  const geo = keep(
    new DecalGeometry(
      poste,
      centro,
      new THREE.Euler(-0.077, cara, 0, "YXZ"),
      new THREE.Vector3(0.36, 0.35, 0.15),
    ),
  );
  const talla = new THREE.Mesh(geo, material);
  talla.name = "talla-codex";
  talla.receiveShadow = true;
  talla.matrixAutoUpdate = false; // Usa directamente la transformación del espantapájaros.
  return talla;
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

  // ─── Suelo: claro y meseta con manchas suaves, risco y ladera facetados ───
  const sueloGeo = keep(
    new THREE.PlaneGeometry(
      C.suelo.tam,
      C.suelo.tam,
      C.suelo.segmentos,
      C.suelo.segmentos,
    ).toNonIndexed(),
  );
  sueloGeo.rotateX(-Math.PI / 2);
  const sueloPesos = new Float32Array(sueloGeo.attributes.position.count * 3);
  {
    const { position: pos, uv } = sueloGeo.attributes;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i),
        d = Math.hypot(x, z);
      pos.setY(i, alturaCima(x, z, d));
      // El mosaico se repite cada cinco metros y comprime el grano en diagonal.
      uv.setXY(i, (x + z) * 0.14, (z - x) * 0.17);
      // Las caras comparten el tono de cada vértice y las manchas cruzan las diagonales.
      const veta = Math.sin(x * 0.33 + Math.cos(z * 0.28)) * Math.sin(z * 0.38);
      const mancha =
        Math.sin(x * 0.23 + Math.sin(z * 0.17) * 2) *
        Math.sin(z * 0.19 + Math.cos(x * 0.13) * 2);
      sueloPesos[i * 3] = 0.47 + 0.31 * veta;
      sueloPesos[i * 3 + 1] = Math.max(0, mancha - 0.15) * 0.56;
      sueloPesos[i * 3 + 2] = smooth(R + 0.25, R + 2.8, d) * 0.62;
    }
    sueloGeo.computeVertexNormals();
    sueloGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(pos.count * 3), 3),
    );
  }
  const tierra = keep(texturaTrigal("suelo"));
  const suelo = new THREE.Mesh(
    sueloGeo,
    std(0xffffff, {
      vertexColors: true,
      map: tierra,
      bumpMap: tierra,
      bumpScale: 0.055, // relieve de terrones en m, apenas visible desde la cámara alta
      roughness: 1,
    }),
  );
  suelo.receiveShadow = true;
  suelo.renderOrder = -3;
  scene.add(suelo);

  // ─── Gramíneas: la ráfaga viaja por el campo y dobla las puntas en el mismo sentido ───
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
            vec2 rumbo = vec2(0.91, 0.42);
            float onda = uViento - dot(ip, rumbo) * 0.53;
            float rafaga = sin(onda) + 0.35 * sin(uViento * 2.6 + ip.y * 1.1);
            float flexion = (rafaga + 0.24) * ${T.viento.fuerza.toFixed(3)} * position.y * position.y * 2.2;
            transformed.x += flexion * dot(normalize(instanceMatrix[0].xz + vec2(0.0001, 0.0)), rumbo);
            transformed.z += flexion * dot(normalize(instanceMatrix[2].xz + vec2(0.0, 0.0001)), rumbo);
          #endif`,
        );
    };
    mat.customProgramCacheKey = () => "trigo-viento";
    return mat;
  };
  const rastrojoMat = conViento(
    std(0xffffff, {
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexColors: true,
    }),
  );
  const trigoMatFuera = conViento(
    std(0xffffff, { side: THREE.DoubleSide, vertexColors: true }),
  );
  const d = new THREE.Object3D();
  const col = new THREE.Color();

  // Dentro del claro: matas bajas, posiciones fijas (se siegan por franjas en la fase 2).
  const ND = T.dentro.matas;
  const dentro = new THREE.InstancedMesh(
    keep(geometriaRastrojo()),
    rastrojoMat,
    ND,
  );
  dentro.renderOrder = -2; // tras el suelo, antes que todo lo opaco (no escribe profundidad)
  dentro.receiveShadow = true;
  dentro.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dPos = new Float32Array(ND * 5); // x, z, altura, giro y cota de la raíz
  for (let i = 0; i < ND; i++) {
    const j = i * 5;
    // Los grupos de tres dejan tierra a la vista y conservan más rastrojo en la orilla.
    const m = Math.floor(i / 3);
    const a = hash(m, 1) * Math.PI * 2,
      r = Math.pow(hash(m, 2), 0.39) * (R - 0.55);
    const da = hash(i, 8) * Math.PI * 2,
      dr = 0.07 + hash(i, 9) * 0.5;
    dPos[j] = Math.cos(a) * r + Math.cos(da) * dr;
    dPos[j + 1] = Math.sin(a) * r + Math.sin(da) * dr;
    dPos[j + 2] =
      (T.dentro.altura[0] +
        hash(i, 3) * (T.dentro.altura[1] - T.dentro.altura[0])) *
      (0.44 + 0.56 * smooth(R * 0.12, R * 0.78, r));
    dPos[j + 3] = hash(i, 4) * 6.28;
    dPos[j + 4] = alturaMalla(dPos[j], dPos[j + 1]) - 0.012; // La siega reutiliza la cota.
    const tono = 0.7 + hash(i, 5) * 0.42;
    dentro.setColorAt(
      i,
      col.setRGB(tono, tono * (0.86 + hash(i, 10) * 0.15), tono * 0.86),
    );
  }
  scene.add(dentro);

  // Fuera: trigo alto hasta el horizonte (estático salvo el viento).
  const NF = Math.round(T.fuera.matas * 1.55);
  const fuera = new THREE.InstancedMesh(
    keep(geometriaEspiga()),
    trigoMatFuera,
    NF,
  );
  fuera.receiveShadow = true;
  {
    // Sobre la malla del suelo (no a altura fija): junto al risco el terreno ya empieza a caer.
    const sembradas = sembrarFuera(T, R, alturaMalla, NF);
    let n = 0;
    for (let k = 0; k < sembradas.length; k += 4) {
      const x = sembradas[k],
        y = sembradas[k + 1],
        z = sembradas[k + 2],
        i = sembradas[k + 3]; // semilla del ruido de esta mata
      const lomo = Math.sin(x * 0.7 + Math.sin(z * 0.42) * 2);
      const h =
        (T.fuera.altura[0] +
          hash(i, 13) * (T.fuera.altura[1] - T.fuera.altura[0])) *
        (0.83 + 0.22 * lomo + 0.18 * smooth(R, R + 3, Math.hypot(x, z)));
      d.position.set(x, y - 0.02, z); // 2 cm enterrada: la base no flota en las caras inclinadas
      d.rotation.set(
        (hash(i, 14) - 0.5) * 0.3,
        hash(i, 15) * 6.28,
        (hash(i, 16) - 0.5) * 0.3,
      );
      d.scale.set(h * 1.25, h, h * 1.25);
      d.updateMatrix();
      fuera.setMatrixAt(n, d.matrix);
      const tono = 0.65 + hash(i, 17) * 0.49 + lomo * 0.07;
      fuera.setColorAt(
        n,
        col.setRGB(tono, tono * (0.91 + hash(i, 28) * 0.14), tono * 0.94),
      );
      n++;
    }
    fuera.count = n;
  }
  scene.add(fuera);

  // Las inflorescencias secas viven en grupos bajos entre el pedregal y el trigo.
  const floresMat = conViento(
    std(0xffffff, { side: THREE.DoubleSide, vertexColors: true }),
  );
  const flores = new THREE.InstancedMesh(
    keep(geometriaFloresSecas()),
    floresMat,
    320,
  );
  for (let i = 0; i < flores.count; i++) {
    const grupo = Math.floor(i / 4);
    const a = hash(grupo, 181) * Math.PI * 2;
    const r = R + 0.85 + hash(grupo, 182) * 3.2;
    const x = Math.cos(a) * r + hash(i, 183) - 0.5;
    const z = Math.sin(a) * r + hash(i, 184) - 0.5;
    const h = 0.38 + hash(i, 185) * 0.52;
    d.position.set(x, alturaMalla(x, z) - 0.02, z);
    d.rotation.set(0, hash(i, 186) * Math.PI * 2, 0);
    d.scale.setScalar(h);
    d.updateMatrix();
    flores.setMatrixAt(i, d.matrix);
    flores.setColorAt(i, col.setScalar(0.71 + hash(i, 187) * 0.36));
  }
  flores.receiveShadow = true;
  scene.add(flores);

  // ─── Lindes: borde de piedra gastado y fragmentos sueltos (un draw call) ───
  const piedraGeo = keep(new THREE.DodecahedronGeometry(0.42, 0));
  {
    const pos = piedraGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const corte = hash(x * 13 + y, z * 19);
      pos.setXYZ(
        i,
        x * (0.84 + corte * 0.36),
        Math.min(0.24, y) + corte * 0.075,
        z,
      );
    }
    piedraGeo.computeVertexNormals();
    vestirPiedra(piedraGeo, 1);
  }
  const estratos = keep(texturaTrigal("piedra"));
  const piedraMat = std(0xffffff, {
    vertexColors: true,
    map: estratos,
    bumpMap: estratos,
    bumpScale: 0.1,
  });
  const NP = Math.round((Math.PI * 2 * R) / 0.62);
  const piedras = new THREE.InstancedMesh(piedraGeo, piedraMat, NP * 3);
  let nPiedras = 0;
  for (let i = 0; i < NP; i++) {
    const a = ((i + hash(i, 21) * 0.6) / NP) * Math.PI * 2;
    if (Math.sin(a) > 0 && Math.abs(Math.cos(a) * R) < 1.4) continue; // deja el paso del arco
    const despejado = hash(i, 27) < 0.13;
    const cantidad = despejado ? 1 : 2 + Math.floor(hash(i, 28) * 2);
    for (let k = 0; k < cantidad; k++) {
      const j = i * 3 + k;
      const r = R + 0.27 + k * 0.45 + hash(j, 24) * (k ? 1.25 : 0.38);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = (0.75 + hash(j, 25) * 0.65) * (k || despejado ? 0.43 : 1);
      d.position.set(x, alturaMalla(x, z) + 0.04, z);
      d.rotation.set(
        (hash(j, 22) - 0.5) * 0.85,
        hash(j, 23) * 6.28,
        (hash(j, 29) - 0.5) * 0.65,
      );
      d.scale.set(s * 1.25, s * 0.67, s);
      d.updateMatrix();
      piedras.setMatrixAt(nPiedras, d.matrix);
      piedras.setColorAt(nPiedras, col.setScalar(0.72 + hash(j, 26) * 0.45));
      nPiedras++;
    }
  }
  piedras.count = nPiedras;
  piedras.receiveShadow = true;
  scene.add(piedras);
  // ─── Ruinas del olimpo (D-204): columnas rotas y muros en el borde, y el arco de llegada ───
  // Una sola malla con capas minerales. La costra horneada por vértice queda encima de la piedra.
  // Del lado de la cámara (+z) solo quedan tocones bajos (`altoCerca`) para no tapar a la pareja.
  const ruinaMat = std(0xffffff, {
    vertexColors: true,
    map: estratos,
    bumpMap: estratos,
    bumpScale: 0.13,
  });
  const RU = C.ruinas,
    AR = C.arco;
  let /** @type {THREE.Mesh} */ arcoSalida; // mismo arco de piedra que la entrada, visible al vencer a Mirra
  const RRu = R + RU.distancia; // m: radio del anillo de ruinas
  {
    /** @type {THREE.BufferGeometry[]} */
    const piezas = [];
    /** Añade una pieza con desgaste en las caras superiores. @param {THREE.BufferGeometry} g @param {number} gris */
    const poner = (g, gris) => {
      const q = sinIndice(g);
      g.dispose();
      vestirPiedra(q, gris);
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
      const gris = 0.8 + hash(i, 74) * 0.25;
      const y = alturaMalla(x, z);
      // Plinto escalonado y tambores con juntas estrechas. El corte de arriba deja aristas.
      for (const [ancho, alto, centro] of [
        [2.9, 0.22, 0.07],
        [2.44, 0.18, 0.25],
      ]) {
        const basa = new THREE.BoxGeometry(
          RU.radio * ancho,
          alto,
          RU.radio * ancho,
        );
        basa.rotateY(a * 0.38);
        basa.translate(x, y + centro, z);
        poner(basa, gris * 0.91);
      }
      const tambores = Math.ceil(h / 0.75);
      const altoTambor = h / tambores;
      const tieneCapitel = !cerca && hash(i, 76) > 0.45;
      for (let j = 0; j < tambores; j++) {
        const radio = RU.radio * (1 - (j / tambores) * 0.15);
        const fuste = new THREE.CylinderGeometry(
          radio - 0.01,
          radio,
          altoTambor - 0.015,
          9,
        );
        if (j === tambores - 1 && !tieneCapitel) {
          const pos = fuste.attributes.position;
          for (let v = 0; v < pos.count; v++) {
            if (pos.getY(v) <= 0) continue;
            const corte = hash(pos.getX(v) * 9 + i, pos.getZ(v) * 14);
            pos.setY(v, pos.getY(v) - 0.24 * corte);
          }
          fuste.computeVertexNormals();
        }
        fuste.rotateY(hash(i, 75) * 0.7);
        fuste.translate(x, y + 0.34 + (j + 0.5) * altoTambor, z);
        poner(fuste, gris * (0.89 + hash(i, j + 177) * 0.14));
      }
      if (tieneCapitel) {
        const capitel = new THREE.BoxGeometry(
          RU.radio * 2.6,
          0.45,
          RU.radio * 2.6,
        );
        capitel.rotateY(a);
        capitel.rotateZ((hash(i, 77) - 0.5) * 0.25);
        capitel.translate(x, y + 0.35 + h + 0.17, z);
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
        tambor.translate(
          x + ox,
          alturaMalla(x + ox, z + oz) + RU.radio * 0.65,
          z + oz,
        );
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
        const filas = 3 + Math.floor(hash(i, 83) * 3);
        const base = alturaMalla(px, pz) - 0.11;
        // Hiladas incompletas, con huecos y sillares de distinto ancho.
        for (let fila = 0; fila < filas; fila++) {
          const ancho = 0.62 + hash(i, fila + 201) * 0.54;
          const tramo = largo * (1 - fila * 0.13);
          for (
            let inicio = -ancho * (fila % 2) * 0.5;
            inicio < tramo;
            inicio += ancho
          ) {
            const desde = Math.max(0, inicio);
            const hasta = Math.min(tramo, inicio + ancho);
            if (hasta - desde < 0.22) continue;
            const semilla = hash(i + fila * 17, desde + 46);
            const m = new THREE.BoxGeometry(
              hasta - desde - 0.038,
              0.39,
              0.54 + semilla * 0.17,
            );
            const tm = (desde + hasta) / 2;
            const cx = px + (dx / dl) * tm;
            const cz = pz + (dz / dl) * tm;
            m.rotateZ((semilla - 0.5) * 0.1);
            m.rotateY(-Math.atan2(dz, dx));
            m.translate(cx, base + (fila + 0.5) * 0.41, cz);
            poner(m, gris * (0.81 + semilla * 0.2));
          }
        }
      }
    }
    // Arco de llegada (D-204, D-211): detrás de donde aparecen Sael y Odo, abierto hacia el claro.
    const inicioArco = piezas.length; // a partir de aquí están solo las piezas del arco de llegada
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
    // Reutiliza esas piedras en la salida que indica el HUD. La pareja pasa entre los dos pies.
    const arcoGeo = keep(mergeGeometries(piezas.slice(inicioArco)));
    arcoSalida = new THREE.Mesh(arcoGeo, ruinaMat);
    arcoSalida.position.z = cfg.recorrido.salida.zInicio - az;
    arcoSalida.visible = false;
    scene.add(arcoSalida);
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
    talla: /** @type {THREE.Mesh | null} */ (null),
    giro: Math.atan2(P.x, P.z) + Math.PI,
  }));
  const esp = new THREE.InstancedMesh(espGeo, espMat, pilares.length);
  esp.castShadow = true;
  esp.receiveShadow = true;
  esp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  esp.frustumCulled = false;
  scene.add(esp);

  // Los pilares 4 a 7 alternan con los otros cuatro al dar la vuelta al claro.
  const materialTalla =
    jefe0.def.arte === "mirra" ? crearMaterialTalla(keep) : null;
  if (materialTalla) {
    for (const p of pilares) {
      if (![4, 5, 6, 7].includes(p.id)) continue;
      p.talla = crearTallaCodex(esp, p.giro, materialTalla, keep);
      scene.add(p.talla);
    }
  }

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
    // Los pesos se calculan al crear el suelo. Aquí solo se mezclan los tonos de cada fase.
    {
      const pos = sueloGeo.attributes.position,
        c = sueloGeo.attributes.color;
      cA.setHex(p.suelo);
      cB.setHex(p.sueloAlt);
      cR.setHex(mezclarHex(p.sueloAlt, p.madera, 0.3)); // roca del monte
      cN.setHex(p.niebla);
      cV.setHex(mezclarHex(p.vegetacion, p.suelo, 0.45));
      cO.setHex(mezclarHex(p.sueloAlt, p.madera, 0.35));
      for (let i = 0; i < pos.count; i++) {
        // Risco y ladera: roca que se oscurece y se funde con la niebla al bajar.
        const y = pos.getY(i);
        const peso = i * 3;
        if (y < C.roca) {
          cTmp.copy(cR).multiplyScalar(0.85 + sueloPesos[peso] * 0.27);
          cTmp.lerp(cN, Math.min(0.6, -y / C.profundidad));
        } else {
          cTmp.copy(cA).lerp(cB, sueloPesos[peso]);
          cTmp.lerp(cO, sueloPesos[peso + 1]);
          cTmp.lerp(cV, sueloPesos[peso + 2]);
        }
        c.setXYZ(i, cTmp.r, cTmp.g, cTmp.b);
      }
      c.needsUpdate = true;
    }
    rastrojoMat.color.setHex(mezclarHex(p.vegetacion, p.suelo, 0.18));
    trigoMatFuera.color.setHex(p.vegetacion);
    floresMat.color.setHex(mezclarHex(p.vegetacion, p.particula, 0.52));
    piedraMat.color.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.23));
    ruinaMat.color.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.39)); // piedra gastada y polvorienta
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
    materialTalla?.color.setHex(p.madera); // Solo el trazo toma el café de la paleta de la fase.
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
  const peligrosSuelo = [];
  let habiaPeligros = false;
  // Solo las matas que cruzan el borde de un charco o un hueco necesitan cambiar su matriz.
  const ocultasPorSuelo = new Uint8Array(ND);
  function colocarDentro(soloCambiosDeSuelo = false) {
    let cambiado = false;
    for (let i = 0; i < ND; i++) {
      const j = i * 5;
      const x = dPos[j],
        z = dPos[j + 1];
      let oculta = 0;
      for (const p of peligrosSuelo) {
        if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) {
          oculta = 1;
          break;
        }
      }
      if (soloCambiosDeSuelo && ocultasPorSuelo[i] === oculta) continue;
      ocultasPorSuelo[i] = oculta;
      cambiado = true;
      const banda =
        (((x * dirX + z * dirZ) % F.ancho) + F.ancho) % F.ancho < F.segado;
      // La siega avanza a lo largo de la franja (perpendicular a la dirección de las bandas).
      const avance = (-x * dirZ + z * dirX) / (R * 2) + 0.5;
      const cortado = banda && siega >= avance;
      const h = cortado ? Math.min(F.altura, dPos[j + 2] * 0.55) : dPos[j + 2];
      d.position.set(x, dPos[j + 4], z);
      d.rotation.set(
        (hash(i, 6) - 0.5) * 0.4,
        dPos[j + 3],
        (hash(i, 7) - 0.5) * 0.4,
      );
      d.scale.set(h * 1.6 + 0.15, h, h * 1.6 + 0.15);
      // El trigo reaparece al evaporarse el charco de ácido.
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
    arcoSalida.visible = c.estado === "victoria";
    uViento.value = tiempo * T.viento.velocidad;
    peligrosSuelo.length = 0; // Reutiliza la lista al dibujar el ácido.
    if (c.arenaMirra) peligrosSuelo.push(...c.arenaMirra.charcos);
    if (peligrosSuelo.length || habiaPeligros) colocarDentro(true);
    habiaPeligros = peligrosSuelo.length > 0;
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
      const talla = P.talla;
      if (talla) {
        talla.matrix.copy(d.matrix); // El grabado acompaña al poste incluso cuando Mirra lo devora.
        talla.matrixWorldNeedsUpdate = true;
        talla.visible = P.s > 0;
      }
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
      flores.dispose();
      piedras.dispose();
      esp.dispose();
    },
  };
}
