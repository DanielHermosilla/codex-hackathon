// Telegrafías finales (D-055, D-087/D-143 → D-188): marcas planas, sin bordes ni brillo. El área entera
// va en `aviso` y `peligro` la llena hasta el golpe; activa = `peligro`. Se pintan encima del trigo bajo
// (que no escribe profundidad) y debajo de personajes y jefe. Proyectiles de Grano: semillas de ámbar
// corrupto en arco. Pools del tamaño de CONFIG.jefes.comun.pools (regla 6). Solo lee el estado.
import * as THREE from "three";

/**
 * @param {{ scene: import('three').Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, decalMat: import('./tipos.js').DecalMat, def: any }} args
 */
export function crearTelegrafias({ scene, cfg, keep, decalMat, def }) {
  const G = cfg.paleta.gameplay;
  const X = cfg.paleta.corrupcion;
  const avisoMat = decalMat(G.aviso, G.avisoOpacidad);
  const rellenoMat = decalMat(G.peligro, G.avisoRellenoOpacidad);
  const peligroMat = decalMat(G.peligro, G.peligroOpacidad);

  const circGeo = keep(new THREE.CircleGeometry(1, 40));
  circGeo.rotateX(-Math.PI / 2);
  const rectGeo = keep(new THREE.PlaneGeometry(1, 1));
  rectGeo.rotateX(-Math.PI / 2);
  rectGeo.translate(0.5, 0, 0);
  const sectorGeo = new Map();
  for (const a of Object.values(def.ataques))
    for (const b of a.bloques) {
      if (b.tipo !== "barrido") continue;
      const ap = (b.angulo * Math.PI) / 180;
      if (sectorGeo.has(ap)) continue;
      const g = keep(new THREE.CircleGeometry(1, 36, -ap / 2, ap));
      g.rotateX(-Math.PI / 2);
      sectorGeo.set(ap, g);
    }
  /** @param {any} z */
  const geoDe = (z) =>
    z.forma === "circulo"
      ? circGeo
      : z.forma === "rect"
        ? rectGeo
        : (sectorGeo.get(z.apertura) ?? circGeo);

  const NZ = cfg.jefes.comun.pools.zonas;
  /** @type {{ base: import('three').Mesh, relleno: import('three').Mesh, activaPrev: boolean }[]} */
  const zonas = [];
  for (let i = 0; i < NZ; i++) {
    const base = new THREE.Mesh(circGeo, avisoMat);
    const relleno = new THREE.Mesh(circGeo, rellenoMat);
    base.renderOrder = 2;
    relleno.renderOrder = 3;
    base.visible = relleno.visible = false;
    base.frustumCulled = relleno.frustumCulled = false;
    scene.add(base, relleno);
    zonas.push({ base, relleno, activaPrev: false });
  }

  const NP = cfg.jefes.comun.pools.proyectiles;
  const semillaGeo = keep(new THREE.OctahedronGeometry(0.32, 0));
  semillaGeo.scale(0.8, 1.3, 0.8);
  const semillaMat = keep(
    new THREE.MeshStandardMaterial({
      color: X.veta,
      emissive: X.veta,
      emissiveIntensity: 1.7,
      flatShading: true,
    }),
  );
  const proyectiles = new THREE.InstancedMesh(semillaGeo, semillaMat, NP);
  proyectiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  proyectiles.castShadow = true;
  proyectiles.frustumCulled = false;
  proyectiles.count = 0;
  scene.add(proyectiles);
  const d = new THREE.Object3D();
  const caidaPrev = new Uint8Array(NP);

  /**
   * @param {import('./tipos.js').Combate} c
   * @param {ReturnType<typeof import('./vfx.js').crearVfx> | null} vfx
   * @param {Record<string, number>} colores
   */
  function sync(c, vfx, colores) {
    const items = c.zonas.items;
    for (let i = 0; i < NZ; i++) {
      const z = items[i],
        v = zonas[i];
      const ver = z.activo && (z.etapa === "aviso" || z.etapa === "activa");
      v.base.visible = ver;
      v.relleno.visible = ver && z.etapa === "aviso" && z.progreso > 0.01;
      const activa = ver && z.etapa === "activa";
      // Al golpear: polvo (y grano en las púas del Grano) en el área. Solo efecto de render.
      if (activa && !v.activaPrev && vfx) {
        if (z.forma === "circulo")
          vfx.polvo(
            z.x,
            z.z,
            Math.min(10, 3 + Math.round(z.r * 3)),
            colores.polvo,
            1.2,
          );
        // La hoz levanta polvo a lo largo de su arco, dentro de la marca de daño.
        if (z.forma === "arco") {
          for (let i = 0; i < 5; i++) {
            const angulo = z.ang + z.apertura * (i / 4 - 0.5);
            const radio = z.r * 0.84;
            vfx.polvo(
              z.x + radio * Math.cos(angulo),
              z.z + radio * Math.sin(angulo),
              3,
              colores.polvo,
              0.8,
            );
          }
        }
      }
      v.activaPrev = activa;
      if (!ver) continue;
      const g = geoDe(z);
      v.base.geometry = g;
      v.relleno.geometry = g;
      v.base.material = activa ? peligroMat : avisoMat;
      v.base.position.set(z.x, 0.03, z.z);
      v.relleno.position.set(z.x, 0.04, z.z);
      v.base.rotation.set(0, -z.ang, 0);
      v.relleno.rotation.set(0, -z.ang, 0);
      const p = Math.max(0.01, z.progreso);
      if (z.forma === "rect") {
        // Activa: solo lo que aún puede golpear (lo que la carga ya dejó atrás es seguro).
        const atras = activa ? Math.min(z.atras, z.largo - 0.01) : 0;
        v.base.position.x += Math.cos(z.ang) * atras;
        v.base.position.z += Math.sin(z.ang) * atras;
        v.base.scale.set(z.largo - atras, 1, z.ancho);
        v.relleno.scale.set(z.largo * p, 1, z.ancho);
      } else {
        v.base.scale.set(z.r, 1, z.r);
        v.relleno.scale.set(z.r * p, 1, z.r * p);
      }
    }
    const pr = c.proyectiles.items;
    let n = 0;
    for (let i = 0; i < NP; i++) {
      const p = pr[i];
      const ver = p.activo && p.t >= 0;
      if (ver && p.t >= 0.97 && !caidaPrev[i] && vfx) {
        vfx.trozos(p.x1, 0.2, p.z1, 6, colores.grano, 0.8, 0.07);
        caidaPrev[i] = 1;
      }
      if (!ver || p.t < 0.5) caidaPrev[i] = 0;
      if (!ver) continue;
      const t = p.t;
      d.position.set(
        p.x0 + (p.x1 - p.x0) * t,
        2.6 * (1 - t) + 7 * t * (1 - t) + 0.3,
        p.z0 + (p.z1 - p.z0) * t,
      );
      d.rotation.set(t * 9, t * 7, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      proyectiles.setMatrixAt(n++, d.matrix);
    }
    proyectiles.count = n;
    if (n) proyectiles.instanceMatrix.needsUpdate = true;
  }

  return {
    sync,
    dispose() {
      proyectiles.dispose();
    },
  };
}
