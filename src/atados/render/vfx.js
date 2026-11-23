// VFX del slice (D-080, D-089): chispas según tensión al cortar, polvo, paja y astillas, y brasas/polen
// flotando. Todo con pools pre-asignados (regla 6): dos InstancedMesh (brillante y mate) + unos Points.
// Ningún efecto se dibuja encima de los avisos con color de gameplay: son pequeños, y el brillo solo lo
// tienen chispas y brasas (umbral del bloom). Nada de `new THREE.*` por frame.
import * as THREE from "three";

/** @param {number} a @param {number} b */
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Pool de partículas en arreglos tipados (sin objetos por partícula).
 * @param {number} N
 */
function crearPool(N) {
  return {
    N,
    vivos: 0,
    cursor: 0,
    x: new Float32Array(N),
    y: new Float32Array(N),
    z: new Float32Array(N),
    vx: new Float32Array(N),
    vy: new Float32Array(N),
    vz: new Float32Array(N),
    vida: new Float32Array(N),
    vidaMax: new Float32Array(N),
    tam: new Float32Array(N),
    grav: new Float32Array(N),
    roce: new Float32Array(N),
    crece: new Float32Array(N),
    giro: new Float32Array(N),
    r: new Float32Array(N),
    g: new Float32Array(N),
    b: new Float32Array(N),
    estira: new Uint8Array(N),
  };
}

/**
 * @param {{ scene: import('three').Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep }} args
 */
export function crearVfx({ scene, cfg, keep }) {
  const V = cfg.vfx;
  let semilla = 1; // ruido determinista propio (decorado, no gameplay)
  const rnd = () => {
    semilla++;
    return hash(semilla * 0.731, semilla * 1.37);
  };

  // ─── Brillantes (chispas): MeshBasic con color > 1 → bloom ───
  const chispaGeo = keep(new THREE.OctahedronGeometry(0.5, 0));
  chispaGeo.scale(1, 0.25, 0.25);
  const brillo = new THREE.InstancedMesh(
    chispaGeo,
    keep(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })),
    V.chispas.pool,
  );
  // ─── Mates (polvo, paja, astillas, grano) ───
  const polvoGeo = keep(new THREE.IcosahedronGeometry(0.5, 0));
  const mate = new THREE.InstancedMesh(
    polvoGeo,
    keep(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        flatShading: true,
        roughness: 1,
      }),
    ),
    V.polvo.pool,
  );
  for (const m of [brillo, mate]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color());
    /** @type {THREE.InstancedBufferAttribute} */ (m.instanceColor).setUsage(
      THREE.DynamicDrawUsage,
    );
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }
  const pb = crearPool(V.chispas.pool);
  const pm = crearPool(V.polvo.pool);

  // ─── Brasas y polen flotando (Points, posiciones en CPU) ───
  const B = V.brasas;
  const bPos = new Float32Array(B.cantidad * 3);
  const bFase = new Float32Array(B.cantidad);
  for (let i = 0; i < B.cantidad; i++) {
    bPos[i * 3] = (hash(i, 1) - 0.5) * 2 * B.radio;
    bPos[i * 3 + 1] = hash(i, 2) * B.altura;
    bPos[i * 3 + 2] = (hash(i, 3) - 0.5) * 2 * B.radio;
    bFase[i] = hash(i, 4) * 6.28;
  }
  const bGeo = keep(new THREE.BufferGeometry());
  bGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(bPos, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const bMat = keep(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  const brasas = new THREE.Points(bGeo, bMat);
  brasas.frustumCulled = false;
  scene.add(brasas);

  const col = new THREE.Color();
  /**
   * @param {ReturnType<typeof crearPool>} p
   * @param {number} x @param {number} y @param {number} z
   * @param {number} vx @param {number} vy @param {number} vz
   * @param {number} vida @param {number} tam @param {number} grav @param {number} roce @param {number} crece
   * @param {number} color @param {number} mult @param {boolean} estira
   */
  function emitir(
    p,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    vida,
    tam,
    grav,
    roce,
    crece,
    color,
    mult,
    estira,
  ) {
    const i = p.cursor;
    p.cursor = (p.cursor + 1) % p.N;
    if (p.vida[i] <= 0) p.vivos++;
    p.x[i] = x;
    p.y[i] = y;
    p.z[i] = z;
    p.vx[i] = vx;
    p.vy[i] = vy;
    p.vz[i] = vz;
    p.vida[i] = vida;
    p.vidaMax[i] = vida;
    p.tam[i] = tam;
    p.grav[i] = grav;
    p.roce[i] = roce;
    p.crece[i] = crece;
    p.giro[i] = rnd() * 6.28;
    col.setHex(color).multiplyScalar(mult);
    p.r[i] = col.r;
    p.g[i] = col.g;
    p.b[i] = col.b;
    p.estira[i] = estira ? 1 : 0;
  }

  const api = {
    /**
     * Chispas del corte: cantidad y velocidad según tensión (0..1), salen hacia fuera del jefe.
     * @param {number} x @param {number} y @param {number} z @param {number} nx @param {number} nz
     * @param {number} tension @param {number} n @param {number} colorHex @param {number} [mult]
     */
    chispas(x, y, z, nx, nz, tension, n, colorHex, mult = 3) {
      const C = V.chispas;
      for (let k = 0; k < n; k++) {
        const a = Math.atan2(nz, nx) + (rnd() - 0.5) * 2.2;
        const v = C.velocidad * (0.4 + rnd() * 0.8) * (0.5 + tension * 0.7);
        emitir(
          pb,
          x,
          y + (rnd() - 0.5) * 0.3,
          z,
          Math.cos(a) * v,
          1 + rnd() * 3.5,
          Math.sin(a) * v,
          C.vida * (0.6 + rnd() * 0.8),
          0.18 + tension * 0.14,
          C.gravedad,
          1.5,
          0,
          colorHex,
          mult * (0.7 + rnd() * 0.6),
          true,
        );
      }
    },
    /**
     * Polvo que se levanta del suelo (dash, pasos, carga, caída).
     * @param {number} x @param {number} z @param {number} n @param {number} colorHex @param {number} [fuerza]
     */
    polvo(x, z, n, colorHex, fuerza = 1) {
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28,
          v = (0.6 + rnd() * 1.4) * fuerza;
        emitir(
          pm,
          x + Math.cos(a) * 0.2,
          0.08,
          z + Math.sin(a) * 0.2,
          Math.cos(a) * v,
          0.4 + rnd() * 0.8,
          Math.sin(a) * v,
          V.polvo.vida * (0.6 + rnd() * 0.8),
          0.12 + rnd() * 0.12,
          -0.3,
          3,
          0.9,
          colorHex,
          1,
          false,
        );
      }
    },
    /**
     * Trozos que saltan (astillas de corteza, grano, paja).
     * @param {number} x @param {number} y @param {number} z @param {number} n @param {number} colorHex
     * @param {number} [fuerza] @param {number} [tam]
     */
    trozos(x, y, z, n, colorHex, fuerza = 1, tam = 0.09) {
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28,
          v = (1.5 + rnd() * 3) * fuerza;
        emitir(
          pm,
          x,
          y,
          z,
          Math.cos(a) * v,
          2 + rnd() * 3 * fuerza,
          Math.sin(a) * v,
          0.6 + rnd() * 0.5,
          tam * (0.6 + rnd() * 0.8),
          12,
          0.6,
          0,
          colorHex,
          1,
          false,
        );
      }
    },
    // lo asigna quien conoce el color (slice.js); el cast evita tipar el valor inicial como `null`.
    paja: /** @type {(x: number, y: number, z: number, n: number) => void} */ (
      /** @type {unknown} */ (null)
    ),
    /**
     * Color de las brasas/polen flotando (paleta de zona).
     * @param {number} hex @param {number} mult
     */
    colorAmbiente(hex, mult) {
      bMat.color.setHex(hex).multiplyScalar(mult);
    },
    /** @param {number} dt @param {number} tiempo @param {number} centroX @param {number} centroZ */
    sync(dt, tiempo, centroX, centroZ) {
      // Partículas.
      actualizar(pb, brillo, dt);
      actualizar(pm, mate, dt);
      // Brasas: suben despacio, oscilan, se reciclan dentro de un cilindro alrededor del centro.
      for (let i = 0; i < B.cantidad; i++) {
        let y = bPos[i * 3 + 1] + B.subida * dt * (0.5 + (i % 5) * 0.2);
        if (y > B.altura) y -= B.altura;
        bPos[i * 3 + 1] = y;
        bPos[i * 3] += Math.sin(tiempo * 0.7 + bFase[i]) * 0.2 * dt;
        bPos[i * 3 + 2] += Math.cos(tiempo * 0.5 + bFase[i]) * 0.2 * dt;
        const dx = bPos[i * 3] - centroX,
          dz = bPos[i * 3 + 2] - centroZ;
        if (dx > B.radio) bPos[i * 3] -= 2 * B.radio;
        else if (dx < -B.radio) bPos[i * 3] += 2 * B.radio;
        if (dz > B.radio) bPos[i * 3 + 2] -= 2 * B.radio;
        else if (dz < -B.radio) bPos[i * 3 + 2] += 2 * B.radio;
      }
      bGeo.attributes.position.needsUpdate = true;
    },
    get activos() {
      return pb.vivos + pm.vivos;
    },
    dispose() {
      brillo.dispose();
      mate.dispose();
    },
  };

  const o = new THREE.Object3D();
  const dir = new THREE.Vector3(),
    X = new THREE.Vector3(1, 0, 0);
  /**
   * @param {ReturnType<typeof crearPool>} p
   * @param {import('three').InstancedMesh} mesh
   * @param {number} dt
   */
  function actualizar(p, mesh, dt) {
    let n = 0;
    for (let i = 0; i < p.N; i++) {
      if (p.vida[i] <= 0) continue;
      p.vida[i] -= dt;
      if (p.vida[i] <= 0) {
        p.vivos--;
        continue;
      }
      const f = Math.exp(-p.roce[i] * dt);
      p.vx[i] *= f;
      p.vz[i] *= f;
      p.vy[i] = p.vy[i] * f - p.grav[i] * dt;
      p.x[i] += p.vx[i] * dt;
      p.y[i] += p.vy[i] * dt;
      p.z[i] += p.vz[i] * dt;
      if (p.y[i] < 0.03) {
        p.y[i] = 0.03;
        p.vy[i] *= -0.35;
        p.vx[i] *= 0.6;
        p.vz[i] *= 0.6;
      }
      const k = p.vida[i] / p.vidaMax[i];
      const s =
        p.tam[i] *
        (p.crece[i]
          ? (1 + (1 - k) * p.crece[i] * 2) * Math.min(1, k * 3)
          : Math.min(1, k * 2.5));
      o.position.set(p.x[i], p.y[i], p.z[i]);
      if (p.estira[i]) {
        dir.set(p.vx[i], p.vy[i], p.vz[i]);
        const v = dir.length();
        if (v > 1e-4)
          o.quaternion.setFromUnitVectors(X, dir.multiplyScalar(1 / v));
        o.scale.set(s * (1 + v * 0.35), s, s);
      } else {
        p.giro[i] += dt * 3;
        o.rotation.set(p.giro[i], p.giro[i] * 0.7, 0);
        o.scale.setScalar(s);
      }
      o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix);
      col.setRGB(p.r[i], p.g[i], p.b[i]);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n;
    if (n) {
      mesh.instanceMatrix.needsUpdate = true;
      /** @type {THREE.InstancedBufferAttribute} */ (
        mesh.instanceColor
      ).needsUpdate = true;
    }
  }
  return api;
}
