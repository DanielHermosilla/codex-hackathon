// Señales de Mirra en los ritos de arena: de dónde sale cada peligro y qué rompe al llegar.
// - Luz divina: la esquirla se enciende y suelta motas hacia el sol; junto a la pareja, tres cuñas doradas en
//   el suelo señalan hacia dónde viaja la luz (se leen aunque el sol quede fuera del encuadre);
//   en el impacto la esquirla destella (menos sin flashes).
// Las coberturas perdidas se rompen en paja. Los efectos se crean antes de la pelea.
import * as THREE from "three";

import { IMPACTO_LUZ } from "../gameplay/arena-mirra.js";
const MAX_PILARES = 24; // coberturas que se vigilan a la vez

/** @param {number} v */
const frac = (v) => v - Math.floor(v); // parte decimal (0..1)

/**
 * @param {{ scene: THREE.Scene, keep: import('./tipos.js').Keep, brillos: ReturnType<typeof import('./brillos.js').crearBrillos>, def: any }} args
 */
export function crearRitosMirra({ scene, keep, brillos, def }) {
  const raiz = new THREE.Group();
  scene.add(raiz);
  /** @param {number} color */
  const halo = (color) => {
    const s = brillos.halo(raiz, color);
    s.visible = false;
    return s;
  };
  const motasSol = Array.from({ length: 5 }, () => halo(0xffd27a)); // motas doradas pecho → sol
  const esquirla = halo(0xffd27a); // brillo del pecho mientras invoca la luz
  // Seña de la luz junto a la pareja: tres cuñas doradas en el suelo, del lado del sol, que apuntan hacia
  // donde viaja la luz. Se leen aunque el sol quede fuera del encuadre.
  const cunaGeo = keep(new THREE.BufferGeometry());
  // Dos brazos de 0,3 de grosor que se unen en la punta (+x); medidas para 1 m, se escala con `CUNA`.
  cunaGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        ...[-0.45, 0, -0.6, -0.15, 0, -0.6, 0.45, 0, 0, 0.15, 0, 0], // brazo izquierdo
        ...[-0.45, 0, 0.6, -0.15, 0, 0.6, 0.45, 0, 0, 0.15, 0, 0], // brazo derecho
      ],
      3,
    ),
  );
  cunaGeo.setIndex([0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7]); // dos triángulos por brazo
  const cunaMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0xffd27a, // mismo oro que la luz divina
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false, // por encima del claro iluminado
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    }),
  );
  const CUNA = 1.8; // m de cada cuña
  const cunas = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(cunaGeo, cunaMat);
    m.renderOrder = 8; // después de las marcas del suelo y del claro de la luz
    m.scale.setScalar(CUNA);
    m.visible = false;
    raiz.add(m);
    return m;
  });
  const todos = [...motasSol, esquirla, ...cunas];

  const pecho = new THREE.Vector3(); // esquirla del pecho (m)
  let reloj = 0;
  // Coberturas del cuadro anterior: ids y posiciones en arreglos fijos (sin objetos nuevos por cuadro).
  /** @type {any[]} */
  const pilarId = new Array(MAX_PILARES).fill(null);
  const pilarX = new Float32Array(MAX_PILARES),
    pilarZ = new Float32Array(MAX_PILARES);
  let pilaresN = -1; // −1 = aún sin lista (primer cuadro)

  /** ¿Sigue en la arena una cobertura con este id? @param {any[]} pilares @param {any} id */
  function sigue(pilares, id) {
    for (let i = 0; i < pilares.length; i++)
      if (pilares[i].id === id) return true;
    return false;
  }

  /**
   * Cuñas de la luz: centradas a 3–6 m de la pareja hacia el sol, apuntando a la pareja (sentido de la luz).
   * Avanzan despacio hacia ella; con movimiento reducido quedan quietas. Brillan más cerca del impacto.
   * @param {{ x: number, z: number, t: number }} l @param {import('./tipos.js').Mundo} w
   * @param {number} carga  0..1 hasta el impacto @param {boolean} reducido
   */
  function cunasLuz(l, w, carga, reducido) {
    let mx = 0,
      mz = 0,
      n = 0;
    for (const p of w.players) {
      if (!p.alive) continue;
      mx += p.x; // suma de posiciones vivas (m)
      mz += p.z;
      n++;
    }
    if (!n) return; // nadie a quien avisar
    mx /= n; // punto medio de la pareja
    mz /= n;
    const dx = mx - l.x,
      dz = mz - l.z,
      largo = Math.hypot(dx, dz) || 1;
    const ux = dx / largo,
      uz = dz / largo; // dirección en que viaja la luz
    const paso = 1.6; // m entre cuñas
    const avance = reducido ? 0 : frac(reloj * 0.8) * paso; // m: desfile hacia la pareja (0,8 cuñas/s)
    for (let i = 0; i < cunas.length; i++) {
      const atras = 2.8 + (cunas.length - 1 - i) * paso - avance; // m desde la pareja hacia el sol
      const m = cunas[i];
      m.visible = true;
      m.position.set(mx - ux * atras, 0.12, mz - uz * atras);
      m.rotation.set(0, -Math.atan2(uz, ux), 0); // la punta (+x) mira a la pareja
    }
    // Aparecen en 0,33 s y brillan más cuanto más cerca está el impacto.
    cunaMat.opacity = (0.35 + 0.5 * carga) * Math.min(1, l.t * 3);
  }

  return {
    /**
     * @param {import('./tipos.js').Combate} c
     * @param {import('./tipos.js').Mundo} w
     * @param {number} dt  s de animación
     * @param {ReturnType<typeof import('./vfx.js').crearVfx>} vfx
     * @param {{ polvo: number, paja: number }} colores
     * @param {boolean} reducido  movimiento reducido activo
     * @param {boolean} flashes  destellos permitidos
     */
    sync(c, w, dt, vfx, colores, reducido, flashes) {
      reloj += dt;
      for (let i = 0; i < todos.length; i++) todos[i].visible = false;
      const pelea = c.estado === "pelea";
      const a = c.arenaMirra;
      const j = c.jefe;
      // La esquirla está en el pecho, algo por delante del tronco (mismo punto que el respaldo de mirra-arte.js).
      pecho.set(
        j.x + Math.cos(j.face) * 0.95,
        def.altura * 0.55,
        j.z + Math.sin(j.face) * 0.95,
      );

      // ─── Coberturas destruidas ───
      const pilares = w.pillars;
      if (pelea && pilaresN >= 0) {
        for (let k = 0; k < pilaresN; k++) {
          if (sigue(pilares, pilarId[k]) || pilarId[k] === "barril-polvora")
            continue; // la mecha tiene su propio desenlace
          vfx.paja(pilarX[k], 1.2, pilarZ[k], reducido ? 7 : 16);
          vfx.polvo(pilarX[k], pilarZ[k], reducido ? 3 : 6, colores.polvo, 1.4);
        }
      }
      pilaresN = Math.min(MAX_PILARES, pilares.length);
      for (let k = 0; k < pilaresN; k++) {
        pilarId[k] = pilares[k].id;
        pilarX[k] = pilares[k].x;
        pilarZ[k] = pilares[k].z;
      }
      if (!a || !pelea || !j.vivo) return;

      // ─── Luz divina ───
      const l = a.luz;
      if (l) {
        const carga = Math.min(1, l.t / IMPACTO_LUZ); // 0..1 hasta el impacto
        esquirla.visible = true;
        esquirla.position.copy(pecho);
        if (!l.impacto) {
          esquirla.scale.setScalar(1 + 1.5 * carga);
          esquirla.material.opacity = 0.2 + 0.5 * carga;
          // Motas hacia el sol: recorren 7 m en su dirección, así se lee de dónde viene la luz.
          const dx = l.x - pecho.x,
            dz = l.z - pecho.z,
            largo = Math.hypot(dx, dz) || 1;
          const vel = reducido ? 0.35 : 0.7;
          for (let i = 0; i < motasSol.length; i++) {
            const s = frac(reloj * vel + i / motasSol.length);
            const m = motasSol[i];
            m.visible = true;
            m.position.set(
              pecho.x + (dx / largo) * s * 7,
              pecho.y + s * 0.8,
              pecho.z + (dz / largo) * s * 7,
            );
            m.scale.setScalar(0.3);
            m.material.opacity = 0.7 * (1 - s) * Math.min(1, l.t * 3);
          }
          cunasLuz(l, w, carga, reducido);
        } else {
          const k = Math.max(0, 1 - (l.t - IMPACTO_LUZ) / 0.45); // se apaga en 0,45 s
          esquirla.scale.setScalar(2.5 + (flashes ? 1.5 : 0.5) * (1 - k));
          esquirla.material.opacity = (flashes ? 0.9 : 0.5) * k;
        }
      }
    },
    dispose() {
      scene.remove(raiz); // geometrías y materiales los libera `keep` desde slice.js
    },
  };
}
