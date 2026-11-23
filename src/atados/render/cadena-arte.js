// Cadena de metal divino (D-049): eslabones de bronce que pasan a oro antiguo con la tensión y runas que
// suben de brasa apagada a oro blanco (D-065, tokens de CONFIG.paleta.cadena). Es el único indicador de
// tensión: a tensión alta vibra y un pulso de luz recorre las runas. Estados propios, distintos de «floja»:
//   electrificada (D-157): metal teñido de `electrica`, runas que chisporrotean y arcos entre eslabones;
//   runas apagadas (D-161/D-192): runas de costra sin brillo y metal mate oscurecido.
// El estado sale de `w.chain.efecto` ('electrica' | 'apagada') si el gameplay lo pone; si no, de la vista
// de prueba (`setEfecto`). Dos InstancedMesh + uno de arcos: tres draw calls (+1 de sombra).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mezclarHex } from "./paleta.js";

/** @param {number} a @param {number} b @param {number} c @param {number} e @param {number} u */
const catmull = (a, b, c, e, u) => {
  const u2 = u * u,
    u3 = u2 * u;
  return (
    0.5 *
    (2 * b +
      (-a + c) * u +
      (2 * a - 5 * b + 4 * c - e) * u2 +
      (-a + 3 * b - 3 * c + e) * u3)
  );
};
/** @param {number} a @param {number} b */
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// `alturaSuelo(x, z)` = altura visual del suelo (m) en cada nodo (rampas y peldaños del recorrido, D-210).
// Por defecto 0: en las arenas planas la cadena se dibuja igual que siempre.
/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, renderer: THREE.WebGLRenderer, keep: import('./tipos.js').Keep, world0: import('./tipos.js').Mundo, alturaSuelo?: (x: number, z: number) => number }} args
 */
export function crearCadenaArte({
  scene,
  cfg,
  renderer,
  keep,
  world0,
  alturaSuelo,
}) {
  const suelo = alturaSuelo ?? (() => 0); // en una arena plana se conserva el trazado original
  const C = cfg.paleta.cadena;
  const G = cfg.paleta.gameplay;
  const X = cfg.paleta.corrupcion;
  const RC = cfg.render.cadena;
  const n = world0.chain.n;
  const sub = RC.subEslabones;
  const N = n * sub;
  const seg = world0.chain.seg / sub;

  // Reflejos de metal: entorno neutro precalculado (una vez).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = keep(pmrem.fromScene(room, 0.04));
  pmrem.dispose();
  room.traverse((/** @type {any} */ o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });

  const linkGeo = keep(new THREE.TorusGeometry(0.5, 0.17, 4, 6));
  linkGeo.scale(1.25, 0.8, 1); // óvalo: largo en x
  linkGeo.computeBoundingBox();
  const mitad = new THREE.Vector3(); // semiejes reales del eslabón (incluido el grosor del tubo)
  linkGeo.boundingBox?.getSize(mitad).multiplyScalar(0.5);
  const runaGeo = keep(new THREE.OctahedronGeometry(0.5, 0));
  runaGeo.scale(0.55, 0.22, 0.32);
  const metalMat = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: true,
      metalness: 0.85,
      roughness: 0.38,
      envMap: envRT.texture,
      envMapIntensity: 0.9,
    }),
  );
  const runaMat = keep(
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true }),
  );
  const metal = new THREE.InstancedMesh(linkGeo, metalMat, N);
  const runas = new THREE.InstancedMesh(runaGeo, runaMat, N);
  for (const m of [metal, runas]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.setColorAt(0, new THREE.Color());
    /** @type {THREE.InstancedBufferAttribute} */ (m.instanceColor).setUsage(
      THREE.DynamicDrawUsage,
    );
  }
  metal.castShadow = true;
  // Arcos eléctricos: astillas finas entre eslabones (solo en estado electrificado).
  const NA = 24;
  const arcoGeo = keep(new THREE.OctahedronGeometry(0.5, 0));
  arcoGeo.scale(1, 0.12, 0.12);
  const arcoMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const arcos = new THREE.InstancedMesh(arcoGeo, arcoMat, NA);
  arcos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arcos.frustumCulled = false;
  arcos.count = 0;
  arcoMat.color.setHex(G.electrica).multiplyScalar(2.2);
  scene.add(metal, runas, arcos);

  const pY = new Float64Array(n + 1);
  const px = new Float64Array(N + 1),
    py = new Float64Array(N + 1),
    pz = new Float64Array(N + 1),
    pt = new Float64Array(N + 1);
  const d = new THREE.Object3D();
  const tgt = new THREE.Vector3();
  const col = new THREE.Color();
  const cBronce = new THREE.Color(C.bronce),
    cOro = new THREE.Color(C.oro);
  const cElec = new THREE.Color(mezclarHex(C.bronce, G.electrica, 0.7));
  const cApag = new THREE.Color(mezclarHex(C.bronce, X.costra, 0.55));
  const cRunaApag = new THREE.Color(X.costra);
  /** @type {'electrica' | 'apagada' | null} */
  let efectoVista = null;
  let tiempo = 0;

  /** @param {number} t @param {THREE.Color} out */
  function colorRuna(t, out) {
    const hex =
      t < 0.5
        ? mezclarHex(C.runaFloja, C.runaMedia, t * 2)
        : mezclarHex(C.runaMedia, C.runaTensa, (t - 0.5) * 2);
    return out
      .setHex(hex)
      .multiplyScalar(
        C.brilloMin + (C.brilloMax - C.brilloMin) * Math.pow(t, 1.4),
      );
  }

  /** @param {import('./tipos.js').Mundo} w @param {number} dt */
  function sync(w, dt) {
    tiempo += dt;
    const ch = w.chain;
    const efecto = ch.efecto ?? efectoVista;
    const h = cfg.chain.height,
      sag = cfg.chain.sag;
    // Altura de cada nodo simulado: comba si está floja (la simulación es 2D, ADR-001).
    // Con suelo en pendiente, la cadena va en línea recta de mano a mano (altura de los extremos) y nunca
    // baja de su suelo: tensa sobre peldaños se apoya en sus bordes en vez de atravesarlos.
    const g0 = suelo(ch.x[0], ch.z[0]); // m: suelo bajo Sael
    const gN = suelo(ch.x[n], ch.z[n]); // m: suelo bajo Odo
    for (let i = 0; i <= n; i++) {
      const tL = i > 0 ? ch.segT[i - 1] : ch.segT[0];
      const tR = i < n ? ch.segT[i] : ch.segT[n - 1];
      const t = (tL + tR) / 2;
      const gi = i === 0 ? g0 : i === n ? gN : suelo(ch.x[i], ch.z[i]); // suelo bajo este nodo
      const base = g0 + ((gN - g0) * i) / n; // recta entre los suelos de los extremos
      let y = base + h - sag * (1 - t) * Math.sin((Math.PI * i) / n);
      if (i === 0 && !w.players[0].alive) y = g0 + 0.3;
      if (i === n && !w.players[1].alive) y = gN + 0.3;
      pY[i] = Math.max(gi + 0.06, y); // 0.06 m: el eslabón apoyado no se hunde en el suelo
    }
    // Subdivisión suave (Catmull-Rom uniforme) de los nodos simulados.
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1),
        i1 = i,
        i2 = i + 1,
        i3 = Math.min(n, i + 2);
      for (let s = 0; s < sub; s++) {
        const u = s / sub;
        const k = i * sub + s;
        px[k] = catmull(ch.x[i0], ch.x[i1], ch.x[i2], ch.x[i3], u);
        pz[k] = catmull(ch.z[i0], ch.z[i1], ch.z[i2], ch.z[i3], u);
        py[k] = catmull(pY[i0], pY[i1], pY[i2], pY[i3], u);
        // Catmull-Rom puede bajar del borde del peldaño entre dos nodos que sí estaban apoyados.
        if (alturaSuelo)
          py[k] = Math.max(py[k], alturaSuelo(px[k], pz[k]) + 0.06);
        pt[k] = ch.segT[i];
      }
    }
    px[N] = ch.x[n];
    pz[N] = ch.z[n];
    py[N] = pY[n];
    pt[N] = ch.segT[n - 1];

    const V = RC.vibracion,
      PU = RC.pulso;
    let na = 0;
    for (let k = 0; k < N; k++) {
      const t = pt[k];
      const x0 = px[k],
        z0 = pz[k],
        x1 = px[k + 1],
        z1 = pz[k + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      // Vibración a tensión alta: tiembla perpendicular al tramo (D-065 «llamativo»).
      const vib =
        efecto === "apagada"
          ? 0
          : Math.max(0, (t - V.desde) / (1 - V.desde)) * V.amplitud;
      const off = vib * Math.sin(tiempo * V.frecuencia + k * 1.7);
      const nx = len > 1e-5 ? -(z1 - z0) / len : 0,
        nz = len > 1e-5 ? (x1 - x0) / len : 0;
      d.position.set(
        (x0 + x1) / 2 + nx * off,
        (py[k] + py[k + 1]) / 2 + off * 0.5,
        (z0 + z1) / 2 + nz * off,
      );
      tgt.set(x1 + nx * off, py[k + 1], z1 + nz * off);
      d.rotation.set(0, 0, 0);
      if (len > 1e-5) d.lookAt(tgt);
      d.rotateY(-Math.PI / 2); // el eje largo (x) sigue al tramo
      const horiz = (k & 1) === 0;
      if (!horiz) d.rotateX(Math.PI / 2); // eslabones alternos a 90°
      const s = Math.max(seg * 0.8, Math.min(seg * 1.2, len)) * 1.0;
      d.scale.set(s, s, s);
      d.updateMatrix();
      if (alturaSuelo) {
        // La matriz incluye giro, vibración y escala. Comprobamos también los extremos de la huella final:
        // el centro puede estar en un escalón bajo y el borde del metal entrar en el siguiente.
        const m = d.matrix.elements;
        const radioX =
          Math.abs(m[0]) * mitad.x +
          Math.abs(m[4]) * mitad.y +
          Math.abs(m[8]) * mitad.z;
        const radioY =
          Math.abs(m[1]) * mitad.x +
          Math.abs(m[5]) * mitad.y +
          Math.abs(m[9]) * mitad.z;
        const radioZ =
          Math.abs(m[2]) * mitad.x +
          Math.abs(m[6]) * mitad.y +
          Math.abs(m[10]) * mitad.z;
        const { x, z } = d.position;
        const apoyo = Math.max(
          alturaSuelo(x, z),
          alturaSuelo(x - radioX, z - radioZ),
          alturaSuelo(x - radioX, z + radioZ),
          alturaSuelo(x + radioX, z - radioZ),
          alturaSuelo(x + radioX, z + radioZ),
        );
        d.position.y = Math.max(d.position.y, apoyo + radioY);
        d.matrix.setPosition(d.position);
      }
      metal.setMatrixAt(k, d.matrix);
      if (efecto === "electrica") col.copy(cElec);
      else if (efecto === "apagada") col.copy(cApag);
      else col.copy(cBronce).lerp(cOro, t);
      metal.setColorAt(k, col);

      // Runa: placa sobre el eslabón (encima del plano del eslabón horizontal, a un lado en el vertical).
      d.translateY(horiz ? s * 0.16 : 0);
      d.translateZ(horiz ? 0 : s * 0.16);
      if (!horiz) d.rotateX(-Math.PI / 2);
      d.scale.set(s * 0.9, s, s);
      d.updateMatrix();
      runas.setMatrixAt(k, d.matrix);
      if (efecto === "electrica") {
        const f = hash(k, Math.floor(tiempo * 24)) > 0.55 ? 1.9 : 0.5; // chisporroteo
        col.setHex(G.electrica).multiplyScalar(f);
      } else if (efecto === "apagada") {
        col.copy(cRunaApag);
      } else {
        colorRuna(t, col);
        // Pulso que recorre la cadena a tensión alta.
        if (t > PU.desde) {
          const Lc = N * seg,
            sp = (tiempo * PU.velocidad) % Lc;
          const pulso = Math.max(
            0,
            1 - Math.abs(k * seg - sp) / (PU.ancho * Lc),
          );
          col.multiplyScalar(
            1 + (pulso * 0.8 * (t - PU.desde)) / (1 - PU.desde),
          );
        }
      }
      runas.setColorAt(k, col);

      if (
        efecto === "electrica" &&
        na < NA &&
        hash(k, Math.floor(tiempo * 18)) > 0.82
      ) {
        d.position.set(
          x0 + nx * 0.12 * (hash(k, 3) - 0.5) * 2,
          py[k] + 0.05,
          z0 + nz * 0.12 * (hash(k, 4) - 0.5) * 2,
        );
        d.rotation.set(
          hash(k, tiempo) * 3,
          hash(tiempo, k) * 6,
          hash(k + 1, tiempo) * 3,
        );
        d.scale.set(0.35 + hash(k, 9) * 0.3, 1, 1);
        d.updateMatrix();
        arcos.setMatrixAt(na++, d.matrix);
      }
    }
    arcos.count = na;
    metal.instanceMatrix.needsUpdate = true;
    runas.instanceMatrix.needsUpdate = true;
    /** @type {THREE.InstancedBufferAttribute} */ (
      metal.instanceColor
    ).needsUpdate = true;
    /** @type {THREE.InstancedBufferAttribute} */ (
      runas.instanceColor
    ).needsUpdate = true;
    if (na) arcos.instanceMatrix.needsUpdate = true;
    metalMat.roughness = efecto === "apagada" ? 0.85 : 0.38;
    metalMat.envMapIntensity = efecto === "apagada" ? 0.25 : 0.9;
  }

  return {
    sync,
    /** @param {string | null | undefined} e */
    setEfecto(e) {
      efectoVista = e === "electrica" || e === "apagada" ? e : null;
    },
    get efecto() {
      return efectoVista;
    },
    // Para VFX: punto i (0..N) de la cadena dibujada.
    /** @param {number} k @param {THREE.Vector3} out */
    punto(k, out) {
      out.set(px[k], py[k], pz[k]);
      return out;
    },
    get puntos() {
      return N;
    },
    dispose() {
      metal.dispose();
      runas.dispose();
      arcos.dispose();
    },
  };
}
