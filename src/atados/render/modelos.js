// Carga de modelos GLB (scripts de assets-src/atados/blender → public/atados/models/) y utilidades para prepararlos al cargar.
// Los GLB usan EXT_meshopt_compression: el loader necesita MeshoptDecoder (trampa r187, AGENTS.md).
// Los materiales del GLB se nombran por función ("ropa", "piel", "corteza"…); los colores reales salen
// de CONFIG.paleta / CONFIG.render.materiales, nunca del GLB.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const BASE = `${import.meta.env?.BASE_URL ?? "/"}atados/models/`;

/**
 * Carga varios GLB en paralelo → { nombre: gltf }.
 * @param {string[]} nombres
 * @returns {Promise<Record<string, import('three/addons/loaders/GLTFLoader.js').GLTF>>}
 */
export async function cargarModelos(nombres) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const lista = await Promise.all(
    nombres.map((n) => loader.loadAsync(`${BASE}${n}.glb`)),
  );
  /** @type {Record<string, import('three/addons/loaders/GLTFLoader.js').GLTF>} */
  const out = {};
  nombres.forEach((n, i) => {
    out[n] = lista[i];
  });
  return out;
}

/**
 * Libera geometrías, materiales y texturas de un gltf cargado (lo que no se haya reutilizado).
 * @param {import('three/addons/loaders/GLTFLoader.js').GLTF} gltf
 */
export function liberarGltf(gltf) {
  gltf.scene.traverse((/** @type {any} */ o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of /** @type {any[]} */ ([]).concat(o.material)) {
      for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

const _c = new THREE.Color();
const _m = new THREE.Matrix4();

// Copia una primitiva a geometría no indexada con posición, normal (por cara: sombreado plano) y color.
/**
 * @param {THREE.BufferGeometry} geo
 * @param {THREE.Matrix4} matrizMundo
 * @param {THREE.Color} color
 */
function primitivaColoreada(geo, matrizMundo, color) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  // Las posiciones cuantizadas (KHR_mesh_quantization) son enteros normalizados: se pasan a Float32
  // antes de transformar, o applyMatrix4 las recortaría a [-1, 1].
  const sp = src.attributes.position;
  const f = new Float32Array(sp.count * 3);
  for (let i = 0; i < sp.count; i++) {
    f[i * 3] = sp.getX(i);
    f[i * 3 + 1] = sp.getY(i);
    f[i * 3 + 2] = sp.getZ(i);
  }
  if (src !== geo) src.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(f, 3));
  g.applyMatrix4(matrizMundo);
  g.computeVertexNormals(); // no indexada → normales por cara
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

// Recorre las mallas de un nodo (sin bajar a otras partes) y devuelve sus primitivas coloreadas.
/**
 * @param {any} nodo
 * @param {THREE.Matrix4} raizInv
 * @param {(nombreMaterial: string) => number} colorDe
 * @param {(o: any) => boolean} esParte
 */
function piezasDe(nodo, raizInv, colorDe, esParte) {
  /** @type {THREE.BufferGeometry[]} */
  const out = [];
  /** @param {any} o */
  const visitar = (o) => {
    if (o !== nodo && esParte(o)) return;
    if (o.isMesh) {
      _m.multiplyMatrices(raizInv, o.matrixWorld);
      _c.set(colorDe(o.material.name));
      out.push(primitivaColoreada(o.geometry, _m, _c));
    }
    for (const h of o.children) visitar(h);
  };
  visitar(nodo);
  return out;
}

/**
 * Hornea un modelo estático en una sola geometría con color por vértice (un draw call).
 * colorDe(nombreMaterial) → hex. Devuelve BufferGeometry en el espacio de `raiz`.
 * @param {any} raiz
 * @param {(nombreMaterial: string) => number} colorDe
 */
export function hornearEstatico(raiz, colorDe) {
  raiz.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert();
  // Guarda qué material tenía cada vértice para poder recolorear sin recargar (paleta dinámica, D-083).
  /** @type {string[]} */
  const nombres = [];
  /** @type {number[]} */
  const idx = [];
  const piezas = piezasDe(
    raiz,
    inv,
    (/** @type {string} */ n) => {
      if (!nombres.includes(n)) nombres.push(n);
      return colorDe(n);
    },
    () => false,
  );
  raiz.traverse((/** @type {any} */ o) => {
    if (o.isMesh) idx.push(nombres.indexOf(o.material.name));
  });
  /** @type {number[]} */
  const vmat = [];
  piezas.forEach((p, i) => {
    for (let v = 0; v < p.attributes.position.count; v++) vmat.push(idx[i]);
  });
  const geo = mergeGeometries(piezas);
  for (const p of piezas) p.dispose();
  geo.userData.materiales = nombres;
  geo.userData.vmat = Uint8Array.from(vmat);
  return geo;
}

/**
 * Reescribe el color por vértice de una geometría de hornearEstatico.
 * @param {THREE.BufferGeometry} geo
 * @param {(nombreMaterial: string) => number} colorDe
 */
export function recolorear(geo, colorDe) {
  const { materiales, vmat } = geo.userData;
  const cols = materiales.map(
    (/** @type {string} */ n) => new THREE.Color(colorDe(n)),
  );
  const a = geo.attributes.color;
  for (let v = 0; v < vmat.length; v++) {
    const c = cols[vmat[v]];
    a.setXYZ(v, c.r, c.g, c.b);
  }
  a.needsUpdate = true;
}

/**
 * Hornea un modelo por partes en una SkinnedMesh rígida: cada parte con nombre es un hueso (peso 1),
 * todo el personaje en un draw call. `partes` = nombres de nodos del GLB (sin puntos).
 * Devuelve { mesh, huesos: { nombre: Bone }, reposo: { nombre: {x,y,z} } }.
 * @param {any} raiz
 * @param {string[]} partes
 * @param {(nombreMaterial: string) => number} colorDe
 * @param {THREE.Material} material
 */
export function hornearPorPartes(raiz, partes, colorDe, material) {
  raiz.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert();
  const set = new Set(partes);
  /** @param {any} o */
  const esParte = (o) => set.has(o.name);
  const huesoRaiz = new THREE.Bone();
  huesoRaiz.name = "raiz";
  /** @type {Record<string, THREE.Bone>} */
  const huesos = { raiz: huesoRaiz };
  const lista = [huesoRaiz];
  /** @type {Record<string, { x: number, y: number, z: number }>} */
  const reposo = {};
  /** @type {THREE.BufferGeometry[]} */
  const geos = [];
  /** @param {any} nodo @param {number} idx */
  const geoDe = (nodo, idx) => {
    const piezas = piezasDe(nodo, inv, colorDe, esParte);
    if (!piezas.length) return;
    const g = piezas.length > 1 ? mergeGeometries(piezas) : piezas[0];
    if (piezas.length > 1) for (const p of piezas) p.dispose();
    const n = g.attributes.position.count;
    const si = new Uint16Array(n * 4),
      sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      si[i * 4] = idx;
      sw[i * 4] = 1;
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    geos.push(g);
  };
  // Mallas colgadas directamente de la raíz (si las hay) van al hueso raíz.
  geoDe(raiz, 0);
  /** @param {any} o @param {THREE.Bone} padreHueso @param {any} padreNodo */
  const recorrer = (o, padreHueso, padreNodo) => {
    for (const h of o.children) {
      if (esParte(h)) {
        const b = new THREE.Bone();
        b.name = h.name;
        // Pivote relativo al hueso padre. Se lee de userData.pivote (extras de Blender): el cuantizado de
        // meshopt mete traslación y escala en los nodos y su matrixWorld ya no es el pivote.
        /** @param {any} n */
        const piv = (n) =>
          n?.userData?.pivote
            ? new THREE.Vector3().fromArray(n.userData.pivote)
            : n
              ? new THREE.Vector3()
                  .setFromMatrixPosition(n.matrixWorld)
                  .applyMatrix4(inv)
              : new THREE.Vector3();
        b.position.copy(piv(h)).sub(piv(padreNodo));
        reposo[h.name] = { x: b.position.x, y: b.position.y, z: b.position.z };
        padreHueso.add(b);
        huesos[h.name] = b;
        lista.push(b);
        geoDe(h, lista.length - 1);
        recorrer(h, b, h);
      } else {
        recorrer(h, padreHueso, padreNodo);
      }
    }
  };
  recorrer(raiz, huesoRaiz, null);
  const geo = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.add(huesoRaiz);
  mesh.updateMatrixWorld(true); // las inversas de los huesos salen de la pose de reposo actual
  mesh.bind(new THREE.Skeleton(lista));
  mesh.frustumCulled = false; // los huesos mueven la malla fuera de su caja de reposo
  return { mesh, huesos, reposo };
}
