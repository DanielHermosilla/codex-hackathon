// Mirra la Hambrienta (D-057, D-085, D-154): árbol-langosta ~4×, tamaño fijo, esquirla de la Brasa clavada
// en el pecho y vetas de ámbar (D-084, D-188). Esqueleto y clips hechos en Blender (D-090,
// assets-src/atados/blender/mirra.py): idle, camina, siega, grano, hambre, dolor, destello, muerte.
// Los clips se «friegan» con el tiempo del gameplay (telegrafía = 0..1 s del clip, golpe, recuperación),
// así la animación siempre coincide con el aviso. Fase 2: la copa se abre en alas.
// También la lápida (haz de trigal atado con una hoz, ficha) y los drops. Solo lee el estado.
import * as THREE from "three";
import { mezclarHex } from "./paleta.js";

// Clip para cada acción del jefe. `t0` = segundo del clip donde empieza el golpe (fin de la telegrafía).
/** @type {Record<string, string>} */
const CLIP_DE = {
  siega: "siega",
  siega_doble: "siega",
  grano: "grano",
  enjambre: "grano",
  hambre: "hambre",
  banquete: "hambre",
  tambaleo: "dolor",
  burla: "hambre",
  destello: "destello",
  transicion_fase: "dolor",
};
/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, modelos: import('./tipos.js').Modelos, def: any }} args
 */
export function crearMirra({ scene, cfg, keep, modelos, def }) {
  const X = cfg.paleta.corrupcion;
  const RJ = cfg.render.jefe;
  const TB = cfg.render.trigal.brillo;
  /** @param {number} hex @param {THREE.MeshStandardMaterialParameters} [extra] */
  const std = (hex, extra = {}) =>
    keep(
      new THREE.MeshStandardMaterial({
        color: hex,
        flatShading: true,
        roughness: 0.9,
        ...extra,
      }),
    );
  /** @type {Record<string, THREE.MeshStandardMaterial>} */
  const mats = {
    corteza: std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0 }),
    hojas: std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0 }),
    quitina: std(0xffffff, {
      roughness: 0.6,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    }),
    veta: std(X.veta, { emissive: X.veta, emissiveIntensity: 1 }),
    esquirla: std(X.esquirla, {
      emissive: X.esquirla,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    }),
    ojos: std(X.veta, { emissive: X.veta, emissiveIntensity: 1.2 }),
    espiga: std(X.brasaPura, { emissive: X.brasaPura, emissiveIntensity: 0.9 }),
  };
  const flashMats = [mats.corteza, mats.hojas, mats.quitina];

  const raiz = new THREE.Group();
  const cuerpo = new THREE.Group(); // gira con face (el modelo mira a +x)
  raiz.add(cuerpo);
  scene.add(raiz);

  /** @type {THREE.AnimationMixer | null} */
  let mixer = null;
  /** @type {Record<string, { a: THREE.AnimationAction, w: number, dur: number }>} */
  const acciones = {};
  let /** @type {THREE.Object3D | null} */ alas = null,
    /** @type {THREE.Object3D | null} */ espiga = null,
    /** @type {Record<string, THREE.Object3D>} */ huesos = {};
  const g = modelos.mirra;
  if (g) {
    const m = g.scene;
    m.traverse((/** @type {any} */ o) => {
      if (o.isMesh) {
        const orig = o.material;
        o.material = mats[orig.name] ?? mats.corteza;
        orig.dispose(); // el color sale de la paleta, no del GLB
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
      if (o.isBone) huesos[o.name] = o;
    });
    alas = m.getObjectByName("alas");
    espiga = m.getObjectByName("espiga");
    cuerpo.add(m);
    mixer = new THREE.AnimationMixer(m);
    for (const clip of g.animations) {
      const a = mixer.clipAction(clip);
      a.play();
      a.paused = true;
      a.setEffectiveWeight(0);
      acciones[clip.name] = { a, w: 0, dur: clip.duration };
    }
  } else {
    // Respaldo mientras no exista el GLB: silueta simple (no se usa si el modelo está construido).
    const tronco = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.75, 1.25, def.altura * 0.8, 7)),
      mats.corteza,
    );
    tronco.position.y = def.altura * 0.5;
    const copa = new THREE.Mesh(
      keep(new THREE.IcosahedronGeometry(1.9, 0)),
      mats.hojas,
    );
    copa.position.y = def.altura + 0.6;
    copa.scale.set(1, 0.65, 1);
    const esq = new THREE.Mesh(
      keep(new THREE.OctahedronGeometry(0.38, 0)),
      mats.esquirla,
    );
    esq.position.set(0.95, def.altura * 0.55, 0);
    cuerpo.add(tronco, copa, esq);
    cuerpo.traverse((/** @type {any} */ o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }

  // ─── Lápida y drops ───
  const lapida = new THREE.Group();
  const haz = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.45, 0.6, 1.8, 7)),
    mats.hojas,
  );
  haz.position.y = 0.9;
  const atadura = new THREE.Mesh(
    keep(new THREE.TorusGeometry(0.5, 0.08, 3, 8)),
    mats.quitina,
  );
  atadura.position.y = 1.0;
  atadura.rotation.x = Math.PI / 2;
  const hoz = new THREE.Mesh(
    keep(new THREE.TorusGeometry(0.55, 0.06, 3, 10, Math.PI * 1.1)),
    mats.esquirla,
  );
  hoz.position.set(0.1, 2.0, 0);
  hoz.rotation.z = 0.4;
  lapida.add(haz, atadura, hoz);
  lapida.traverse((/** @type {any} */ o) => {
    if (o.isMesh) o.castShadow = true;
  });
  lapida.visible = false;
  scene.add(lapida);
  const dropGeo = keep(new THREE.OctahedronGeometry(0.32, 0));
  const J = cfg.paleta.jugadores;
  const dropMats = [J.sael, J.odo, X.brasaPura].map((/** @type {number} */ h) =>
    std(h, { emissive: h, emissiveIntensity: 0.35 }),
  );
  const drops = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(dropGeo, dropMats[0]);
    m.visible = false;
    scene.add(m);
    return m;
  });

  /** @type {import('./tipos.js').Paleta | null} */
  let pal = null;
  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pal = p;
    mats.corteza.color.setHex(p.jefe);
    mats.hojas.color.setHex(mezclarHex(p.vegetacion, p.madera, 0.45));
    mats.quitina.color.setHex(mezclarHex(p.madera, p.jefe, 0.4));
    mats.veta.emissiveIntensity = TB.veta * p.corrupcion;
    mats.esquirla.emissiveIntensity = TB.esquirla * p.corrupcion;
    mats.ojos.emissiveIntensity = TB.veta * p.corrupcion;
  }

  // Pesos objetivo por clip y tiempo de cada uno; se mezclan con suavizado.
  /** @type {Record<string, number>} */
  const objetivo = {};
  /** @type {Record<string, number>} */
  const tiempoClip = {};
  /** @param {string} nombre @param {number} t */
  function poner(nombre, t) {
    objetivo[nombre] = 1;
    tiempoClip[nombre] = t;
  }

  let reloj = 0,
    muerteT = 0,
    fasePaso = 0,
    pasoVista = 0,
    aterrizaje = 0,
    golpeAcum = 0,
    polvoT = 0;
  const xPrev = { x: 0, z: 0, ok: false };
  let enSalto = false;

  /**
   * @param {import('./tipos.js').Combate} c
   * @param {import('./tipos.js').Mundo} w
   * @param {number} dt
   * @param {number} tiempo
   * @param {{ flash: number, fx: import('./tipos.js').FxJefe }} opts
   */
  function sync(c, w, dt, tiempo, { flash, fx }) {
    const j = c.jefe,
      a = j.accion;
    reloj += dt;
    raiz.position.set(j.x, 0, j.z);
    cuerpo.rotation.set(0, -j.face, 0);
    cuerpo.position.set(0, 0, 0);
    cuerpo.scale.setScalar(1);
    for (const m of flashMats) m.emissiveIntensity = flash;
    if (alas) alas.visible = j.fase >= 1;
    if (espiga) espiga.visible = !!a && a.tipo === "destello";
    const vel =
      xPrev.ok && dt > 0 ? Math.hypot(j.x - xPrev.x, j.z - xPrev.z) / dt : 0;
    xPrev.x = j.x;
    xPrev.z = j.z;
    xPrev.ok = true;

    // Conserva la fase de zancada al acelerar o frenar, sin reposicionar el clip de golpe.
    pasoVista +=
      (Math.min(2.3, vel / 2.5) - pasoVista) * (1 - Math.exp(-10 * dt));
    fasePaso = (fasePaso + dt * pasoVista) % (acciones.camina?.dur ?? 1);
    for (const k in objetivo) objetivo[k] = 0;
    const G = RJ.golpe;
    if (!j.vivo) {
      muerteT += dt;
      poner("muerte", Math.min(muerteT, acciones.muerte?.dur ?? 2));
      // Tras caer, se hunde en el trigal para dejar ver la lápida.
      const k3 = clamp01((muerteT - 2.0) / 1.4);
      cuerpo.position.y = -k3 * 4.5;
      raiz.visible = k3 < 1;
      mats.esquirla.emissiveIntensity =
        TB.esquirla * (pal?.corrupcion ?? 1) * (1 - clamp01(muerteT / 1.5));
      if (muerteT - dt < 0.9 && muerteT >= 0.9) fx.polvo(j.x, j.z, 24, 2.2);
    } else {
      muerteT = 0;
      raiz.visible = true;
      if (c.arenaMirra?.acido) {
        // El mismo clip que hincha el abdomen abre las mandíbulas justo al soltar la gota.
        const acido = c.arenaMirra.acido;
        const k = clamp01(acido.t / acido.duracion);
        poner("grano", acido.etapa === "punteria" ? k : 1 + 0.65 * k);
      } else if (!a) {
        poner("idle", reloj % (acciones.idle?.dur ?? 2));
        poner("camina", fasePaso);
        objetivo.camina = clamp01((pasoVista - 0.04) / 0.5);
        objetivo.idle = 1 - objetivo.camina;
      } else {
        const clip = a.tipo === "ataque" ? CLIP_DE[a.id] : CLIP_DE[a.tipo];
        /** @type {number} */
        let t;
        if (a.tipo === "ataque") {
          if (a.etapa === "telegrafia") t = clamp01(a.t / Math.max(0.01, a.T));
          else if (a.etapa === "activo") {
            // Siega y Siega doble siguen al bloque real: «entre» vuelve a cargar (0..1 s del clip) y «golpe»
            // recorre el tajo en los `activo` s que tarda la hoja en cruzar el arco.
            // El clip mueve ambos brazos a la vez. El filo del suelo dibuja el sentido real del barrido.
            const hoz =
              a.id === "siega" || a.id === "siega_doble" ? a.bloques[0] : null;
            if (hoz?.sub === "entre")
              t = clamp01(hoz.subT / Math.max(0.01, hoz.entre));
            else if (hoz)
              t = 1 + clamp01(hoz.subT / Math.max(0.01, hoz.def.activo)) * G;
            else t = 1 + clamp01(a.t / G) * G;
            if (a.id === "hambre" && vel > 2 && (polvoT += dt) > 0.05) {
              polvoT = 0;
              fx.polvo(j.x, j.z, 3, 1.4);
              fx.sacudir(cfg.feel.shake.carga * dt * 6);
            }
          } else
            t =
              1 +
              G +
              clamp01(a.t / Math.max(0.01, a.recuperacion)) *
                ((acciones[clip]?.dur ?? 2) - 1 - G);
          if (a.id === "hambre" && a.tropezo && a.etapa === "recuperacion") {
            poner("dolor", (reloj * 1.5) % (acciones.dolor?.dur ?? 1));
            t = -1;
          }
        } else if (a.tipo === "burla")
          t = 0.4 + Math.abs(Math.sin(reloj * 7)) * 0.5; // mastica el aire
        else if (a.tipo === "destello")
          t = Math.min(a.t, (acciones.destello?.dur ?? 1.5) - 0.01);
        else t = reloj % (acciones[clip]?.dur ?? 1);
        if (t >= 0 && clip) poner(clip, t);
        if (a.tipo === "transicion_fase" && reloj % 0.25 < dt)
          fx.trozos(j.x, 3.5, j.z, 3, 1.2);
      }
      // Dolor: corte fuerte → la corteza se astilla y suelta grano (ficha).
      golpeAcum += w.dummy.lastStep;
      if (golpeAcum > 6) {
        golpeAcum = 0;
        fx.trozos(w._contact.x, 1.4, w._contact.z, 3, 1);
      }
      if (!acciones.idle) cuerpo.position.y = Math.sin(reloj * 2.2) * 0.06;
      // El salto termina en el mismo paso que resuelve el daño del pisotón.
      const salta =
        c.estado === "pelea" &&
        c.ritos?.tipo === "pisoton" &&
        c.ritos.tiempo < 0.65;
      if (salta) {
        const fase = 1 - c.ritos.tiempo / 0.65;
        // Arco continuo hasta el golpe. Adelanta el tronco al bajar.
        cuerpo.position.y += 1.85 * 4 * fase * (1 - fase);
        cuerpo.rotation.z -= 0.2 * fase;
        aterrizaje = 0;
      } else {
        const prepara =
          c.ritos?.tipo === "pisoton"
            ? clamp01((1.2 - c.ritos.tiempo) / 0.55)
            : 0;
        cuerpo.scale.y -= 0.13 * prepara * Math.sin(Math.PI * prepara);
        if (enSalto && c.estado === "pelea") {
          aterrizaje = 0.16;
          fx.polvo(j.x, j.z, 20, 1.7);
          fx.sacudir(cfg.feel.shake.carga);
        }
        // La corteza se comprime al caer y recupera su volumen en una fracción de segundo.
        aterrizaje *= Math.exp(-8 * dt);
        cuerpo.scale.set(
          1 + aterrizaje * 0.4,
          cuerpo.scale.y - aterrizaje,
          1 + aterrizaje * 0.4,
        );
      }
      enSalto = salta;
    }

    if (mixer) {
      // Mezcla suavizada y normalizada (la suma de pesos es 1: nunca asoma la pose de reposo).
      const f = 1 - Math.exp(-14 * dt);
      let suma = 0;
      for (const n in acciones) {
        const ac = acciones[n];
        ac.w += ((objetivo[n] ?? 0) - ac.w) * f;
        suma += ac.w;
      }
      if (suma < 1e-3)
        for (const n in objetivo)
          if (objetivo[n] > 0 && acciones[n]) {
            acciones[n].w = 1;
            suma = 1;
          }
      for (const n in acciones) {
        const ac = acciones[n];
        if (tiempoClip[n] !== undefined)
          ac.a.time = Math.min(tiempoClip[n], ac.dur - 1e-3);
        const we = ac.w / Math.max(suma, 1e-3);
        ac.a.enabled = we > 0.001;
        ac.a.setEffectiveWeight(we);
      }
      mixer.update(0);
    }

    // Lápida y drops.
    lapida.visible = !!c.lapida;
    if (c.lapida) lapida.position.set(c.lapida.x, 0, c.lapida.z);
    for (let i = 0; i < drops.length; i++) {
      const d = c.drops[i],
        m = drops[i];
      m.visible = !!d;
      if (!d) continue;
      m.material = dropMats[d.jugador >= 0 ? d.jugador : 2];
      m.position.set(d.x, 0.8 + Math.sin(tiempo * 2 + i) * 0.15, d.z);
      m.rotation.y = tiempo * 1.5;
    }
  }

  return {
    sync,
    aplicarPaleta,
    get huesos() {
      return huesos;
    },
    dispose() {
      mixer?.stopAllAction();
      if (g) mixer?.uncacheRoot(g.scene);
    },
  };
}
