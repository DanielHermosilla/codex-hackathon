// Arena de Mirra: trigal seco a hora dorada (D-086, D-088) con paleta base → clímax (D-083/D-188).
// Dentro del claro el trigo queda bajo la rodilla y no escribe profundidad: los anillos y los avisos
// se pintan siempre encima (D-051, D-089). Fuera, trigo alto hasta el horizonte, lindes de piedra y cerca,
// colinas, árboles y un molino en la niebla. Espantapájaros-pilar instanciados (D-048, D-184) que Mirra
// devora en la transición (D-154); en la fase 2 el trigo queda segado en franjas y las vetas de la
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

/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, modelos: import('./tipos.js').Modelos, world0: import('./tipos.js').Mundo, jefe0: any }} args
 */
export function crearTrigal({ scene, cfg, keep, modelos, world0, jefe0 }) {
  const T = cfg.render.trigal;
  const R = world0.arenaRadius;
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

  // ─── Suelo low-poly: claro llano dentro, ondulado fuera; color por cara ───
  const sueloGeo = keep(
    new THREE.PlaneGeometry(150, 150, 75, 75).toNonIndexed(),
  );
  sueloGeo.rotateX(-Math.PI / 2);
  {
    const pos = sueloGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i),
        d = Math.hypot(x, z);
      pos.setY(
        i,
        -0.02 +
          (hash(x, z) - 0.5) * 0.18 * smooth(R - 1, R + 2, d) +
          Math.max(0, d - R - 6) * 0.06 * (0.5 + hash(x * 0.1, z * 0.1)),
      );
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
    let n = 0;
    for (let i = 0; n < NF && i < NF * 3; i++) {
      const a = hash(i, 11) * Math.PI * 2,
        r = R + 1.2 + Math.pow(hash(i, 12), 0.8) * (T.fuera.radio - R);
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const h =
        T.fuera.altura[0] +
        hash(i, 13) * (T.fuera.altura[1] - T.fuera.altura[0]);
      d.position.set(x, -0.02, z);
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

  // ─── Lindes: piedras bajas y cerca de madera (un draw call cada una) ───
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
  const cercaMat = std(0xffffff);
  let cerca;
  {
    const piezas = [];
    const NPOST = 40;
    for (let i = 0; i < NPOST; i++) {
      if (hash(i, 31) < 0.12) continue; // algún hueco: cerca vieja
      const a = (i / NPOST) * Math.PI * 2,
        r = R + 1.2;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const p = new THREE.BoxGeometry(0.14, 1.1, 0.14);
      p.rotateZ((hash(i, 32) - 0.5) * 0.2);
      p.translate(x, 0.5, z);
      piezas.push(p);
      const a2 = ((i + 1) / NPOST) * Math.PI * 2,
        x2 = Math.cos(a2) * r,
        z2 = Math.sin(a2) * r;
      if (hash(i, 33) > 0.25)
        for (const y of [0.45, 0.85]) {
          const len = Math.hypot(x2 - x, z2 - z);
          const t = new THREE.BoxGeometry(len, 0.07, 0.05);
          t.rotateY(-Math.atan2(z2 - z, x2 - x));
          t.translate((x + x2) / 2, y + (hash(i, y) - 0.5) * 0.1, (z + z2) / 2);
          piezas.push(t);
        }
    }
    const g = keep(mergeGeometries(piezas.map((p) => sinIndice(p))));
    piezas.forEach((p) => p.dispose());
    cerca = new THREE.Mesh(g, cercaMat);
    cerca.castShadow = true;
    cerca.receiveShadow = true;
    scene.add(cerca);
  }

  // ─── Lejos: colinas, árboles y un molino en la niebla ───
  const colinaMat = std(0xffffff, { vertexColors: true });
  const arbolCopaMat = std(0xffffff);
  const maderaLejosMat = std(0xffffff);
  let /** @type {THREE.Mesh} */ molinoAspas, /** @type {THREE.Mesh} */ colinas;
  {
    const col2 = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 41),
        r = 62 + hash(i, 42) * 18;
      const g = new THREE.IcosahedronGeometry(14 + hash(i, 43) * 10, 1);
      g.scale(1.6, 0.32 + hash(i, 44) * 0.2, 1);
      g.rotateY(a);
      g.translate(Math.cos(a) * r, -2, Math.sin(a) * r);
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
        r = 34 + hash(i, 52) * 22;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        h = 3 + hash(i, 53) * 3;
      const t = new THREE.CylinderGeometry(0.18, 0.3, h, 5);
      t.translate(x, h / 2, z);
      troncos.push(sinIndice(t));
      t.dispose();
      const c = new THREE.IcosahedronGeometry(1.6 + hash(i, 54) * 1.4, 0);
      c.scale(1, 0.8 + hash(i, 55) * 0.5, 1);
      c.translate(x, h + 0.8, z);
      copas.push(sinIndice(c));
      c.dispose();
    }
    // Molino: torre, tejado y aspas (las aspas giran despacio).
    const mx = -30,
      mz = -40;
    const torre = new THREE.CylinderGeometry(1.4, 2.2, 8, 7);
    torre.translate(mx, 4, mz);
    troncos.push(sinIndice(torre));
    torre.dispose();
    const tejado = new THREE.ConeGeometry(1.9, 2.4, 7);
    tejado.translate(mx, 9.2, mz);
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
    molinoAspas.position.set(mx + 1.2, 8, mz + 1.6);
    molinoAspas.rotation.y = 0.6;
    scene.add(molinoAspas);
  }

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
    cO = new THREE.Color();
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
        for (let j = 0; j < 3; j++) c.setXYZ(f + j, cTmp.r, cTmp.g, cTmp.b);
      }
      c.needsUpdate = true;
    }
    trigoMatDentro.color.setHex(mezclarHex(p.vegetacion, p.suelo, 0.25));
    trigoMatFuera.color.setHex(p.vegetacion);
    piedras.material.color.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.3));
    cercaMat.color.setHex(p.madera);
    {
      const g = colinas.geometry,
        pos = g.attributes.position,
        ca = g.attributes.color;
      cA.setHex(mezclarHex(p.vegetacion, p.niebla, 0.55));
      cB.setHex(mezclarHex(p.sueloAlt, p.niebla, 0.5));
      for (let f = 0; f < pos.count; f += 3) {
        cTmp.copy(cA).lerp(cB, hash(pos.getX(f) * 0.1, pos.getZ(f) * 0.1));
        for (let j = 0; j < 3; j++) ca.setXYZ(f + j, cTmp.r, cTmp.g, cTmp.b);
      }
      ca.needsUpdate = true;
    }
    arbolCopaMat.color.setHex(mezclarHex(p.vegetacion, p.madera, 0.55));
    maderaLejosMat.color.setHex(mezclarHex(p.madera, p.niebla, 0.2));
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
      // Cuando se abre un pozo, desaparece tambi�n el trigo que crec�a encima.
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
        // La onda derriba la cobertura en su sitio, fuera de la animaci�n de devorar.
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
