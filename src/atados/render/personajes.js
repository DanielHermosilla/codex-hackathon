// Sael y Odo: modelos de Blender horneados en una SkinnedMesh rígida (un draw call cada uno) con
// animación procedural (D-090): pasos, inclinación, ladeo en los giros, squash & stretch, capa con
// muelle, reacción al dash y al golpe, postura anclada y cadáver arrastrado con pose de muerto.
// Anillo plano en el suelo (D-051, v2 de D-188) cuyo arco es la vida (D-063). Solo lee el estado.
import * as THREE from "three";
import { hornearPorPartes } from "./modelos.js";

const PARTES = [
  "torso",
  "cabeza",
  "brazoI",
  "brazoD",
  "piernaI",
  "piernaD",
  "capa1",
  "capa2",
];
/** @param {number} v @param {number} a @param {number} b */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** @param {number} a @param {number} b */
const angDif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, modelos: import('./tipos.js').Modelos, keep: import('./tipos.js').Keep, decalMat: import('./tipos.js').DecalMat, anillo?: boolean }} args
 */
export function crearPersonajes({
  scene,
  cfg,
  modelos,
  keep,
  decalMat,
  anillo = true,
}) {
  const P = cfg.paleta.jugadores;
  const M = cfg.render.materiales;
  const R = cfg.render.jugador;
  const A = R.anillo;

  // Anillo: línea fina (fondo tenue + arco de vida) y relleno muy suave. Geometrías compartidas.
  const ringGeo = keep(
    new THREE.RingGeometry(
      A.radio - A.grosor,
      A.radio,
      A.segmentos,
      1,
      Math.PI / 2,
      -Math.PI * 2,
    ),
  );
  ringGeo.rotateX(-Math.PI / 2);
  const fillGeo = keep(
    new THREE.CircleGeometry(A.radio - A.grosor, A.segmentos),
  );
  fillGeo.rotateX(-Math.PI / 2);
  // Estaca del ancla: clavo de bronce corto (se ve aunque el anillo quede tapado).
  const estacaGeo = keep(new THREE.ConeGeometry(0.07, 0.5, 5));
  estacaGeo.rotateX(Math.PI);
  estacaGeo.translate(0, 0.12, 0);
  const estacaMat = keep(
    new THREE.MeshStandardMaterial({
      color: cfg.paleta.cadena.bronce,
      flatShading: true,
      metalness: 0.6,
      roughness: 0.45,
    }),
  );

  /** @type {{ id: 'sael' | 'odo', color: number, ropa: number, capa: number }[]} */
  const defs = [
    { id: "sael", color: P.sael, ropa: P.ropaSael, capa: M.capaSael },
    { id: "odo", color: P.odo, ropa: P.ropaOdo, capa: M.capaOdo },
  ];
  const jugadores = defs.map((d, i) => {
    /** @param {string} n */
    const colorDe = (n) =>
      /** @type {Record<string, number>} */ ({
        ropa: d.ropa,
        piel: P.piel,
        acento: d.color,
        cuero: M.cuero,
        metal: M.metal,
        madera: M.maderaHerramienta,
        capa: d.capa,
      })[n] ?? d.ropa;
    const mat = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.82,
        emissive: 0xffffff,
        emissiveIntensity: 0,
      }),
    );
    const { mesh, huesos, reposo } = hornearPorPartes(
      modelos[d.id].scene,
      PARTES,
      colorDe,
      mat,
    );
    keep(mesh.geometry);
    mesh.scale.setScalar(cfg.render.jugador.escala); // más grande que la colisión: se leen a la distancia de la cámara
    mesh.castShadow = true;
    const root = new THREE.Group();
    const cuerpo = new THREE.Group(); // gira con face; escala para squash & stretch
    cuerpo.add(mesh);
    root.add(cuerpo);
    const lineaFondo = new THREE.Mesh(
      ringGeo,
      decalMat(d.color, A.fondoOpacidad),
    );
    const linea = new THREE.Mesh(ringGeo, decalMat(d.color, P.anilloOpacidad));
    const relleno = new THREE.Mesh(
      fillGeo,
      decalMat(d.color, A.rellenoOpacidad),
    );
    lineaFondo.position.y = 0.035;
    linea.position.y = 0.04;
    relleno.position.y = 0.03;
    lineaFondo.renderOrder = 4;
    linea.renderOrder = 5;
    relleno.renderOrder = 4;
    const estaca = new THREE.Mesh(estacaGeo, estacaMat);
    estaca.castShadow = true;
    lineaFondo.visible = linea.visible = relleno.visible = anillo;
    root.add(lineaFondo, linea, relleno, estaca);
    scene.add(root);
    return {
      i,
      d,
      root,
      cuerpo,
      mesh,
      mat,
      huesos,
      reposo,
      linea,
      lineaFondo,
      relleno,
      estaca,
      ringIdx: /** @type {THREE.BufferAttribute} */ (ringGeo.index).count,
      paso: i * 0.5,
      vel: 0,
      faceVel: 0,
      facePrev: /** @type {number | null} */ (null),
      inc: 0,
      ladeo: 0,
      capa: 0,
      capaV: 0,
      capa2: 0,
      capa2V: 0,
      estirar: 0,
      estirarV: 0,
      dashPrev: false,
      hurtPrev: 0,
      golpe: 0,
      muerto: 0,
      vivoPrev: true,
      yawMuerto: 0,
      anclaT: 0,
      hpVista: 1,
    };
  });

  /**
   * @param {{ huesos: Record<string, THREE.Object3D> }} j
   * @param {string} n
   * @param {number} rx @param {number} ry @param {number} rz
   */
  function poseHueso(j, n, rx, ry, rz) {
    const b = j.huesos[n];
    if (!b) return;
    b.rotation.set(rx, ry, rz);
  }

  // dt de render (no de simulación): la animación sigue aunque haya hit-stop, pero más lenta.
  /**
   * @param {import('./tipos.js').Mundo} w
   * @param {number} dt
   * @param {{ flashes: boolean, dash: (i: number, p: any) => void, golpe: (i: number, p: any) => void, muere: (i: number, p: any) => void, paso: (i: number, x: number, z: number, fuerza: number) => void }} eventos
   * @param {number} tiempo
   * @param {number|null} [colorEscudo]
   */
  function sync(w, dt, eventos, tiempo, colorEscudo = null) {
    const ch = w.chain;
    for (let i = 0; i < 2; i++) {
      const p = w.players[i],
        j = jugadores[i];
      const zancada = R.zancada[j.d.id];
      j.root.position.set(p.x, 0, p.z);
      const speed = Math.hypot(p.vx, p.vz);
      j.vel += (speed - j.vel) * Math.min(1, dt * 12);
      // Velocidad de giro (para el ladeo).
      if (j.facePrev === null) j.facePrev = p.face;
      const dFace = angDif(p.face, /** @type {number} */ (j.facePrev));
      j.facePrev = p.face;
      const fv = dt > 0 ? dFace / dt : 0;
      j.faceVel += (fv - j.faceVel) * Math.min(1, dt * 10);

      // Eventos de este jugador.
      const dash = p.dashT > 0;
      if (dash && !j.dashPrev && p.alive) {
        j.estirarV += 9;
        eventos.dash(i, p);
      }
      j.dashPrev = dash;
      if (p.hurtT > j.hurtPrev + 1e-6 && p.alive) {
        j.golpe = 1;
        eventos.golpe(i, p);
      }
      j.hurtPrev = p.hurtT;
      if (j.vivoPrev && !p.alive) {
        j.muerto = 0;
        eventos.muere(i, p);
      }
      if (!j.vivoPrev && p.alive) j.muerto = 0;
      j.vivoPrev = p.alive;

      // Muelle del estirado (dash) y de la capa.
      const objetivoEst = dash ? 1 : 0;
      j.estirarV += ((objetivoEst - j.estirar) * 160 - j.estirarV * 14) * dt;
      j.estirar += j.estirarV * dt;
      const C = R.capa;
      const capaObj = -clamp(
        j.vel * C.porVelocidad + (dash ? 0.5 : 0),
        0,
        C.maxAng,
      );
      j.capaV +=
        ((capaObj - j.capa) * C.rigidez - j.capaV * C.amortiguacion) * dt;
      j.capa += j.capaV * dt;
      j.capa2V +=
        ((j.capa * 0.6 - j.capa2) * C.rigidez * 0.8 -
          j.capa2V * C.amortiguacion) *
        dt;
      j.capa2 += j.capa2V * dt;
      j.golpe = Math.max(0, j.golpe - dt * R.golpe.recupera * 0.5);

      const b = j.huesos;
      if (!p.alive) {
        // Cadáver: cae de espaldas y queda tendido; los pies apuntan hacia donde tira la cadena.
        j.muerto = Math.min(1, j.muerto + dt / R.caida);
        const k = 1 - (1 - j.muerto) * (1 - j.muerto);
        const fin = i === 0 ? 0 : ch.n,
          ant = i === 0 ? 1 : ch.n - 1;
        const tira = Math.atan2(ch.z[ant] - ch.z[fin], ch.x[ant] - ch.x[fin]);
        if (j.muerto < 0.05) j.yawMuerto = p.face;
        j.yawMuerto +=
          angDif(tira, j.yawMuerto) * Math.min(1, dt * (speed > 0.3 ? 6 : 1.5));
        j.cuerpo.rotation.set(0, -j.yawMuerto, 0);
        j.cuerpo.scale.set(1, 1, 1);
        j.cuerpo.position.y = 0;
        b.raiz.rotation.set(0, 0, (Math.PI / 2) * k);
        b.raiz.position.set(-0.55 * k, 0.12 * k, 0);
        const sac = Math.sin(tiempo * 9) * Math.min(1, speed * 0.2) * 0.15; // tumbos al ser arrastrado
        poseHueso(j, "torso", sac, 0, 0);
        poseHueso(j, "cabeza", 0, 0.4 * k, 0.3 * k + sac);
        poseHueso(j, "brazoI", -1.3 * k, 0, 0.5 * k);
        poseHueso(j, "brazoD", 1.3 * k, 0, 0.5 * k);
        poseHueso(j, "piernaI", -0.25 * k, 0, 0);
        poseHueso(j, "piernaD", 0.2 * k, 0, 0.15 * k);
        poseHueso(j, "capa1", 0, 0, -0.3 * k);
        poseHueso(j, "capa2", 0, 0, 0);
        j.mat.color.setScalar(1 - (1 - R.cadaverTinte) * k);
        j.mat.emissiveIntensity = 0;
        j.mesh.visible = true;
      } else {
        j.mat.color.setScalar(1);
        b.raiz.rotation.set(0, 0, 0);
        b.raiz.position.set(0, 0, 0);
        j.cuerpo.rotation.set(0, -p.face, 0);
        const anclado = p.anchored;
        j.anclaT += ((anclado ? 1 : 0) - j.anclaT) * Math.min(1, dt * 14);
        const an = j.anclaT;
        // Pasos: la fase avanza con la distancia recorrida.
        const mov = clamp(j.vel / cfg.player.moveSpeed, 0, 1.4);
        const pasoAntes = Math.floor(j.paso * 2);
        j.paso += (j.vel * dt) / zancada;
        if (Math.floor(j.paso * 2) !== pasoAntes && mov > 0.55)
          eventos.paso(i, p.x, p.z, mov);
        const fase = j.paso * Math.PI * 2;
        const zz = Math.sin(fase) * 0.7 * Math.min(1, mov * 1.3) * (1 - an);
        const rebote =
          Math.abs(Math.cos(fase)) * 0.05 * Math.min(1, mov * 1.5) * (1 - an);
        // Inclinación hacia delante y ladeo en las curvas.
        const incObj =
          -clamp(j.vel * R.inclinacion, 0, 0.35) -
          (dash ? 0.25 : 0) -
          j.golpe * -R.golpe.inclinacion;
        j.inc += (incObj - j.inc) * Math.min(1, dt * 10);
        const ladObj = clamp(
          j.faceVel * R.ladeo * Math.min(1, mov + 0.2),
          -0.35,
          0.35,
        );
        j.ladeo += (ladObj - j.ladeo) * Math.min(1, dt * 8);
        // Squash & stretch: estira hacia delante en el dash; aplasta un poco en cada apoyo.
        const est = j.estirar * R.dashEstirar;
        const apoyo =
          (1 - Math.abs(Math.cos(fase))) * 0.04 * Math.min(1, mov) * (1 - an);
        j.cuerpo.scale.set(
          1 + est,
          1 - est * 0.55 - apoyo - an * 0.08,
          1 - est * 0.3 + apoyo * 0.5 + an * 0.06,
        );
        j.cuerpo.position.y = rebote - an * 0.04;
        const torsoR = j.reposo.torso;
        b.torso.position.set(
          torsoR.x + an * -0.03,
          torsoR.y - an * 0.08,
          torsoR.z,
        );
        b.torso.rotation.set(
          j.ladeo,
          Math.sin(fase) * 0.12 * mov,
          j.inc - an * 0.15,
        );
        poseHueso(j, "cabeza", -j.ladeo * 0.4, 0, -j.inc * 0.5 + an * 0.1);
        // Brazos: contrabalanceo; en el dash, atrás; anclado, abiertos agarrando la cadena.
        const brazo = -zz * 0.9;
        poseHueso(
          j,
          "brazoI",
          -0.12 - an * 0.5,
          0,
          brazo + (dash ? -0.9 : 0) + an * 0.6,
        );
        poseHueso(
          j,
          "brazoD",
          0.12 + an * 0.5,
          0,
          -brazo + (dash ? -0.9 : 0) + an * 0.6,
        );
        // Piernas: zancada; anclado, separadas y flexionadas.
        poseHueso(j, "piernaI", -an * 0.28, 0, zz + an * 0.25);
        poseHueso(j, "piernaD", an * 0.28, 0, -zz - an * 0.15);
        poseHueso(
          j,
          "capa1",
          0,
          0,
          j.capa + Math.sin(tiempo * 11 + i) * 0.04 * mov,
        );
        poseHueso(
          j,
          "capa2",
          0,
          0,
          j.capa2 + Math.sin(tiempo * 13 + i * 2) * 0.06 * mov,
        );
        // Golpe recibido: destello breve. Con flashes reducidos (D-112) nada parpadea: un tinte leve y
        // constante mientras dura la invulnerabilidad, y el personaje siempre visible.
        j.mat.emissiveIntensity = eventos.flashes
          ? j.golpe * j.golpe * 0.5
          : p.hurtT > 0
            ? R.golpe.tinteReducido
            : 0;
        j.mesh.visible = true;
      }

      // El escudo tiñe los dos cuerpos sin ocultar su animación de golpe.
      j.mat.emissive.setHex(colorEscudo ?? 0xffffff);
      if (colorEscudo !== null && p.alive) j.mat.emissiveIntensity += 0.65;
      j.estaca.visible = p.alive && p.anchored;
      if (!anillo) continue;
      // Anillo: arco = vida (D-063). Anclado: más opaco y con estaca; muerto: casi apagado.
      const hp = clamp(p.hp / cfg.player.maxHp, 0, 1);
      j.hpVista += (hp - j.hpVista) * Math.min(1, dt * 8);
      const segs = Math.max(0, Math.round(j.hpVista * A.segmentos));
      j.linea.geometry = ringGeo;
      j.linea.visible = p.alive && segs > 0;
      j.linea.userData.rango = segs * 6;
      j.lineaFondo.visible = true;
      /** @type {THREE.Material} */ (j.lineaFondo.material).opacity = p.alive
        ? A.fondoOpacidad + j.anclaT * 0.25
        : A.fondoOpacidad * 0.5;
      /** @type {THREE.Material} */ (j.relleno.material).opacity =
        A.rellenoOpacidad * (p.alive ? 1 + j.anclaT * 1.5 : 0.4);
      /** @type {THREE.Material} */ (j.linea.material).opacity =
        P.anilloOpacidad;
      j.estaca.visible = p.alive && p.anchored;
    }
  }

  // El arco de vida se dibuja con drawRange sobre la geometría compartida: se fija justo antes de cada malla.
  for (const j of jugadores) {
    j.linea.onBeforeRender = () => {
      ringGeo.setDrawRange(0, j.linea.userData.rango ?? j.ringIdx);
    };
    j.linea.onAfterRender = () => {
      ringGeo.setDrawRange(0, Infinity);
    };
  }

  return {
    jugadores,
    sync,
    /** @param {number} i */
    altura: (i) => (i === 0 ? 1.5 : 1.45),
    dispose() {
      for (const j of jugadores) j.mesh.skeleton.dispose();
    },
  };
}
