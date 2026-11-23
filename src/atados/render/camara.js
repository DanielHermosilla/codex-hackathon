// Cámara 3/4 dinámica (D-033): encuadra a los dos jugadores y al jefe (D-176), plano de presentación del
// jefe (D-064) con cinemática de entrada (D-211) y shake por «trauma» (skill game-feel: trauma² con decaimiento en tiempo real), reducible
// o apagable (D-080, D-112). Solo lee el estado.
import * as THREE from "three";

/**
 * Distancia mínima (m) de la cámara al centro del encuadre para que una caja de suelo de semiancho `semiX` y
 * semifondo `semiZ` (m, centrada en el punto mirado) quepa entera en pantalla, con la cámara elevada `el` rad
 * sobre el horizonte y mirando hacia −z. Usa los dos campos de visión: el vertical (`fovDeg`) y el horizontal,
 * que sale del aspecto (ancho / alto). Para un punto del suelo desplazado (dx, dz) del centro, su profundidad
 * en cámara es d − cos(el)·dz, su altura en pantalla −sin(el)·dz y su lado dx; despejando d de |x_ndc| ≤ 1 e
 * |y_ndc| ≤ 1 en la esquina más exigente salen las dos cotas. Ventana más estrecha → más distancia.
 * @param {number} semiX m
 * @param {number} semiZ m
 * @param {number} el rad de elevación
 * @param {number} fovDeg grados de campo vertical
 * @param {number} aspecto ancho / alto de la ventana
 */
export function distanciaEncuadre(semiX, semiZ, el, fovDeg, aspecto) {
  const tv = Math.tan((fovDeg * Math.PI) / 360); // tangente de medio campo vertical
  const th = tv * aspecto; // tangente de medio campo horizontal
  const adelante = Math.cos(el) * semiZ; // m: el borde cercano de la caja queda más cerca de la cámara
  const porAncho = semiX / th + adelante; // cota horizontal (esquina cercana: la que más se abre)
  const porFondo = (Math.sin(el) * semiZ) / tv + adelante; // cota vertical (borde cercano, abajo en pantalla)
  return Math.max(porAncho, porFondo);
}

/**
 * `perfil` = distancias de encuadre que pisan las de `cfg.camera` (minDist, maxDist, distPerMeter, margen).
 * Por defecto, las de jefe (`cfg.camera.jefe`); el recorrido (lobby y pasillo) puede pasar las suyas.
 * @param {{ cfg: import('./tipos.js').Cfg, reducir: () => boolean, perfil?: Partial<import('./tipos.js').Cfg['camera']['jefe']> }} args
 */
export function crearCamara({ cfg, reducir, perfil = cfg.camera.jefe }) {
  const camera = new THREE.PerspectiveCamera(
    cfg.view.fov,
    1,
    cfg.view.near,
    cfg.view.far,
  );
  const el = (cfg.camera.elevationDeg * Math.PI) / 180;
  const cam = { x: 0, y: 0, z: 0, dist: cfg.camera.minDist, init: false }; // y = altura del suelo encuadrado (m)
  const look = new THREE.Vector3();
  const base = new THREE.Vector3();
  const pres = new THREE.Vector3();
  const presLook = new THREE.Vector3();
  const S = cfg.feel.shake;
  let trauma = 0;
  let traumaCaida = 0,
    descensoCaida = 0; // impulso largo de aterrizaje, independiente del combate
  let t = 0;
  const CC = { ...cfg.camera, ...cfg.camera.jefe, ...perfil }; // el perfil manda sobre los valores de jefe

  // puntos = [x, z, radio, …] de lo que también hay que encuadrar (jefe, lápida).
  /** @param {import('./tipos.js').Mundo} w @param {number[]} puntos @param {number} dt @param {number} alturaBase */
  function encuadre(w, puntos, dt, alturaBase) {
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
    // Distancia de diseño (zoom por separación, D-033) recortada a [minDist, maxDist]; luego la mínima que mete
    // la caja entera en el campo de visión con el aspecto real de la ventana. Esa manda aunque pase de maxDist:
    // en ventanas estrechas (más altas que anchas) sacar a un jugador de cuadro es peor que alejarse más.
    const want = Math.max(
      Math.min(CC.maxDist, Math.max(CC.minDist, CC.distPerMeter * sep)),
      distanciaEncuadre(
        (x1 - x0) / 2,
        (z1 - z0) / 2,
        el,
        cfg.view.fov,
        camera.aspect,
      ),
    );
    const f = cam.init ? 1 - Math.exp(-CC.follow * dt) : 1;
    cam.init = true;
    cam.x += (cx - cam.x) * f;
    cam.z += (cz - cam.z) * f;
    cam.dist += (want - cam.dist) * f;
    // La altura del suelo (m) se suaviza igual que el encuadre: al subir escalones la cámara no salta.
    cam.y += (alturaBase - cam.y) * f;
    base.set(
      cam.x,
      cam.y + Math.sin(el) * cam.dist,
      cam.z + Math.cos(el) * cam.dist,
    );
    look.set(cam.x, cam.y + 0.5, cam.z); // mira a medio metro sobre el suelo visible
  }

  // Curva suave 0..1 (smoothstep): arranca y frena sin tirones. Fuera de [0, 1] se recorta.
  /** @param {number} v */
  const suave = (v) => {
    const e = Math.min(1, Math.max(0, v));
    return e * e * (3 - 2 * e);
  };

  // Cinemática de entrada del jefe (D-211): empuje lento desde un plano medio hasta la cara, sostén mientras
  // sale el nombre y apertura al encuadre de juego (`base`/`look`, ya calculados por encuadre()).
  // Con movimiento reducido: plano fijo, sin empuje ni giro, que se abre suave desde `entrada`.
  /**
   * @param {{ k: number, jx: number, jz: number, face: number, alto: number }} p
   * @param {number} alturaBase m: suelo bajo el jefe (0 en arenas planas)
   */
  function cinematica(p, alturaBase) {
    const P = cfg.render.presentacion;
    const C = P.cinematica;
    const k = p.k;
    const fx = Math.cos(p.face),
      fz = Math.sin(p.face);
    // Punto mirado: la cara, un poco delante del tronco y a una fracción de la altura del jefe (m).
    presLook.set(
      p.jx + fx * C.cara.adelante,
      alturaBase + p.alto * C.cara.altura,
      p.jz + fz * C.cara.adelante,
    );
    let dist, alt, ang, abrir;
    if (reducir()) {
      dist = C.reducido.distancia; // m: plano fijo
      alt = C.reducido.altura;
      ang = p.face;
      abrir = suave((k - P.entrada) / (1 - P.entrada));
    } else {
      const e = suave(k / C.empuje); // 0..1: avance del empuje (lento al principio y al final)
      const h = Math.min(
        1,
        Math.max(0, (k - C.empuje) / (C.sosten - C.empuje)),
      ); // 0..1 del sostén
      // Distancia: del plano medio al cercano, y durante el sostén una deriva corta para que no se congele.
      dist =
        C.distanciaMedio +
        (C.distanciaCerca - C.distanciaMedio) * e -
        C.deriva * h;
      alt = C.alturaMedio + (C.alturaCerca - C.alturaMedio) * e; // m: del contrapicado a la altura de la cara
      ang = p.face + (1 - e) * C.giro; // rad: rodea un poco al jefe y termina de frente
      abrir = suave((k - C.sosten) / (1 - C.sosten));
    }
    pres.set(
      presLook.x + Math.cos(ang) * dist,
      alturaBase + alt,
      presLook.z + Math.sin(ang) * dist,
    );
    camera.position.lerpVectors(pres, base, abrir);
    presLook.lerp(look, abrir);
    camera.lookAt(presLook);
  }

  return {
    camera,
    /**
     * Suma trauma (0..1). Con movimiento reducido, mucho menos.
     * @param {number} v
     * @param {number} [duracion]  s de un impulso de caída con envolvente propia
     */
    sacudir(v, duracion) {
      if (!S.activo) return;
      const intensidad = v * S.escala * (reducir() ? 0.25 : 1);
      if (duracion && duracion > 0) {
        traumaCaida = Math.min(1, intensidad);
        descensoCaida = traumaCaida / duracion; // unidades de trauma por segundo
      } else {
        trauma = Math.min(1, trauma + intensidad);
      }
    },
    get trauma() {
      return Math.min(1, trauma + traumaCaida);
    },
    /**
     * presentacion = null | { k: 0..1, jx, jz, face, alto, cinematica? } (plano bajo sobre el jefe que se abre al
     * encuadre). Con `cinematica: true`, la entrada larga de D-211 (empuje hasta la cara, sostén y apertura).
     * @param {import('./tipos.js').Mundo} w
     * @param {number[]} puntos
     * @param {number} dt
     * @param {{ k: number, jx: number, jz: number, face: number, alto: number, cinematica?: boolean } | null} presentacion
     * @param {number} [alturaBase] altura visual del suelo bajo la pareja (m). 0 en arenas planas; el
     *   recorrido pasa la de sus rampas y escalones (solo render: la física sigue plana).
     */
    update(w, puntos, dt, presentacion, alturaBase = 0) {
      t += dt;
      encuadre(w, puntos, dt, alturaBase);
      camera.position.copy(base);
      const lookAt = look;
      if (presentacion?.cinematica) {
        cinematica(presentacion, alturaBase);
      } else if (presentacion && reducir()) {
        // Presentación corta con movimiento reducido: el mismo plano fijo que la cinemática reducida (sin giro
        // alrededor del jefe ni subida), abriéndose desde `entrada`. Dura lo mismo: k la lleva gameplay.
        cinematica(presentacion, alturaBase);
      } else if (presentacion) {
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
        const s = suave((k - P.entrada) / (1 - P.entrada));
        camera.position.lerpVectors(pres, base, s);
        presLook.lerp(look, s);
        camera.lookAt(presLook);
      } else {
        camera.lookAt(lookAt);
      }
      // Shake: desplazamiento y giro con trauma², ruido de senos (determinista, no usa RNG de gameplay).
      const total = Math.min(1, trauma + traumaCaida);
      if (total > 0) {
        const q = total * total,
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
        traumaCaida = Math.max(0, traumaCaida - descensoCaida * dt);
      }
    },
    /** @param {number} w @param {number} h */
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
  };
}
