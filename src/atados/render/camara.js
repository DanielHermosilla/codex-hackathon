// Cámara 3/4 dinámica (D-033): encuadra a los dos jugadores y al jefe (D-176), plano de presentación del
// jefe (D-064) y shake por «trauma» (skill game-feel: trauma² con decaimiento en tiempo real), reducible
// o apagable (D-080, D-112). Solo lee el estado.
import * as THREE from "three";

/**
 * @param {{ cfg: import('./tipos.js').Cfg, reducir: () => boolean }} args
 */
export function crearCamara({ cfg, reducir }) {
  const camera = new THREE.PerspectiveCamera(
    cfg.view.fov,
    1,
    cfg.view.near,
    cfg.view.far,
  );
  const el = (cfg.camera.elevationDeg * Math.PI) / 180;
  const cam = { x: 0, z: 0, dist: cfg.camera.minDist, init: false };
  const look = new THREE.Vector3();
  const base = new THREE.Vector3();
  const pres = new THREE.Vector3();
  const presLook = new THREE.Vector3();
  const S = cfg.feel.shake;
  let trauma = 0;
  let t = 0;
  const CC = { ...cfg.camera, ...cfg.camera.jefe };

  // puntos = [x, z, radio, …] de lo que también hay que encuadrar (jefe, lápida).
  /** @param {import('./tipos.js').Mundo} w @param {number[]} puntos @param {number} dt */
  function encuadre(w, puntos, dt) {
    const [a, b] = w.players;
    const m = CC.margen;
    let x0 = Math.min(a.x, b.x) - m,
      x1 = Math.max(a.x, b.x) + m,
      z0 = Math.min(a.z, b.z) - m,
      z1 = Math.max(a.z, b.z) + m * 1.6;
    for (let i = 0; i < puntos.length; i += 3) {
      const r = puntos[i + 2] + m;
      x0 = Math.min(x0, puntos[i] - r);
      x1 = Math.max(x1, puntos[i] + r);
      z0 = Math.min(z0, puntos[i + 1] - r);
      z1 = Math.max(z1, puntos[i + 1] + r);
    }
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    const sep = Math.max(x1 - x0, (z1 - z0) * 1.4); // en 3/4 la profundidad se ve más corta
    const want = Math.min(
      CC.maxDist,
      Math.max(CC.minDist, CC.distPerMeter * sep),
    );
    const f = cam.init ? 1 - Math.exp(-CC.follow * dt) : 1;
    cam.init = true;
    cam.x += (cx - cam.x) * f;
    cam.z += (cz - cam.z) * f;
    cam.dist += (want - cam.dist) * f;
    base.set(cam.x, Math.sin(el) * cam.dist, cam.z + Math.cos(el) * cam.dist);
    look.set(cam.x, 0.5, cam.z);
  }

  return {
    camera,
    /**
     * Suma trauma (0..1). Con movimiento reducido, mucho menos.
     * @param {number} v
     */
    sacudir(v) {
      if (!S.activo) return;
      trauma = Math.min(1, trauma + v * S.escala * (reducir() ? 0.25 : 1));
    },
    get trauma() {
      return trauma;
    },
    /**
     * presentacion = null | { k: 0..1, jx, jz, face, alto } (plano bajo sobre el jefe que se abre al encuadre).
     * @param {import('./tipos.js').Mundo} w
     * @param {number[]} puntos
     * @param {number} dt
     * @param {{ k: number, jx: number, jz: number, face: number, alto: number } | null} presentacion
     */
    update(w, puntos, dt, presentacion) {
      t += dt;
      encuadre(w, puntos, dt);
      camera.position.copy(base);
      const lookAt = look;
      if (presentacion) {
        const P = cfg.render.presentacion;
        const k = presentacion.k;
        // Entra desde delante del jefe, a baja altura, girando alrededor; al final se funde con el encuadre.
        const ang = presentacion.face + (1 - k) * P.giro;
        pres.set(
          presentacion.jx + Math.cos(ang) * P.distancia,
          P.altura + k * 1.5,
          presentacion.jz + Math.sin(ang) * P.distancia,
        );
        presLook.set(
          presentacion.jx,
          presentacion.alto * 0.75,
          presentacion.jz,
        );
        const e = Math.min(1, Math.max(0, (k - P.entrada) / (1 - P.entrada)));
        const s = e * e * (3 - 2 * e);
        camera.position.lerpVectors(pres, base, s);
        presLook.lerp(look, s);
        camera.lookAt(presLook);
      } else {
        camera.lookAt(lookAt);
      }
      // Shake: desplazamiento y giro con trauma², ruido de senos (determinista, no usa RNG de gameplay).
      if (trauma > 0) {
        const q = trauma * trauma,
          A = S.amplitud * q;
        const f = S.frecuencia;
        camera.position.x +=
          A * (Math.sin(t * f * 1.1) * 0.6 + Math.sin(t * f * 2.3 + 1.7) * 0.4);
        camera.position.y +=
          A *
          0.6 *
          (Math.sin(t * f * 1.3 + 0.5) * 0.6 + Math.sin(t * f * 2.9) * 0.4);
        camera.rotation.z += S.rotacion * q * Math.sin(t * f * 0.9 + 2.1);
        trauma = Math.max(0, trauma - S.decaimiento * dt);
      }
    },
    /** @param {number} w @param {number} h */
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
  };
}
