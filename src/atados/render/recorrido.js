// Render del recorrido de inicio (D-204 a D-211): lobby al pie del Templo Ancla y pasillo de subida entre
// ruinas hasta el arco de la cima. Compone luz y niebla de la zona `pasillo` (base → clímax con el avance,
// D-086/D-188), el entorno (templo.js), Sael y Odo con su cadena sobre el suelo visual (altura.js, D-210),
// el muñeco de paja del lobby (D-208), los enemigos del pasillo (enemigos-arte.js), VFX, bloom y la cámara
// con su perfil de recorrido. Caída al valle (D-205): bajan con aceleración y al aterrizar hay polvo y un
// temblor corto. En el menú (D-214) la cámara encuadra el lobby con la escalinata subiendo detrás.
// Al continuar tras Mirra, `puesto` monta el embarcadero con el furgón sobre suelo plano. Reutiliza pareja,
// cadena y cámara. Solo lee el estado y ofrece la misma interfaz que render/slice.js para el HUD.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { cargarModelos, hornearEstatico, liberarGltf } from "./modelos.js";
import { resolverPaleta, mezclarHex } from "./paleta.js";
import { crearCamara } from "./camara.js";
import { crearPersonajes } from "./personajes.js";
import { crearCadenaArte } from "./cadena-arte.js";
import { crearVfx } from "./vfx.js";
import { configurarRenderer, reducidoSistema } from "./renderer-config.js";
import { crearTemplo } from "./templo.js";
import { crearSalidaTrigal } from "./salida-trigal.js";
import { crearPuesto } from "./puesto.js";
import { crearAlturaSuelo } from "./altura.js";
import { crearEnemigosArte } from "./enemigos-arte.js";
import {
  crearRuta,
  nuevaProyeccion,
  proyectarRuta,
  puntoRuta,
} from "../gameplay/ruta.js";

export const MODELOS_RECORRIDO = ["sael", "odo", "espantapajaros"];
const ZONA = "pasillo"; // zona de CONFIG.paleta.zonas (D-175: el pasillo del dios del jefe siguiente)

// `extras` = fábricas con la misma firma que en render/slice.js (p. ej. crearAnillosHud de
// render/hud-anillos.js). Si hay extras, el anillo propio de los personajes se apaga (lo dibuja el HUD).
/**
 * @param {{
 *   renderer: THREE.WebGLRenderer,
 *   cfg: import('./tipos.js').Cfg,
 *   getWorld: () => import('./tipos.js').Mundo,
 *   getRecorrido: () => import('../gameplay/tipos.js').EstadoRecorrido,
 *   params?: URLSearchParams,
 *   puesto?: boolean,
 *   extras?: ((ctx: any) => any)[],
 * }} args
 */
export async function crearRenderRecorrido({
  renderer,
  cfg,
  getWorld,
  getRecorrido,
  params,
  puesto = false,
  extras = [],
}) {
  const modelos = await cargarModelos(
    puesto ? ["sael", "odo"] : MODELOS_RECORRIDO,
  ); // el muñeco solo vive en el lobby
  /** @type {any[]} */
  const keepList = [];
  /** @type {import('./tipos.js').Keep} */
  const keep = (o) => {
    keepList.push(o);
    return o;
  };
  const reducido = reducidoSistema(); // preferencia del sistema, leída en vivo
  const reducir = () =>
    cfg.feel.reducirMovimiento || params?.has("reducir") || reducido();
  const flashesOn = () => cfg.feel.flashes.activo && !reducir();
  // Marcas planas en el suelo (D-143): sin bordes ni brillo, debajo de los cuerpos.
  /** @type {import('./tipos.js').DecalMat} */
  const decalMat = (color, opacity) =>
    keep(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );

  const T = cfg.render.templo;
  const RC = cfg.recorrido;
  const ruta = crearRuta(RC.pasillo.ruta, RC.pasillo.ancho);
  const alturaSuelo = puesto ? () => 0 : crearAlturaSuelo(cfg); // el muelle es plano, el templo sube por la escalinata
  // Caída al valle (D-205): mientras dura, Sael, Odo y la cadena se dibujan por encima del suelo. Se lee
  // `caidaK` (0..1) y se baja con aceleración: y = altura · (1 − k²).
  let alturaCaida = 0; // m extra sobre el suelo en este cuadro
  const alturaJugadores = (/** @type {number} */ x, /** @type {number} */ z) =>
    alturaSuelo(x, z) + alturaCaida;

  /** @type {import('./tipos.js').Paleta} */
  let pal = resolverPaleta(
    puesto ? "muelle" : ZONA,
    { progreso: 0 },
    cfg.paleta.zonas,
  );
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(pal.niebla, pal.nieblaCerca, pal.nieblaLejos);
  scene.fog = fog;
  scene.background = new THREE.Color(pal.niebla);

  // ─── Luz: sol de hora dorada que baja hacia la tarde con el avance (D-086) + cielo ───
  configurarRenderer(renderer, cfg); // sombras y tone mapping (se repite en activar())
  const hemi = new THREE.HemisphereLight(
    pal.hemiCielo,
    pal.hemiSuelo,
    pal.hemiIntensidad,
  );
  const sun = new THREE.DirectionalLight(pal.sol, pal.solIntensidad);
  sun.castShadow = true;
  const SH = cfg.render.sombras;
  sun.shadow.mapSize.set(SH.mapa, SH.mapa);
  // La sombra cubre lo que encuadra la cámara del recorrido (sigue a la pareja, no a la arena).
  const SR = RC.camara.maxDist * 0.85 + SH.margen;
  Object.assign(sun.shadow.camera, {
    left: -SR,
    right: SR,
    top: SR,
    bottom: -SR,
    near: 1,
    far: 120,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = SH.radio;
  scene.add(hemi, sun, sun.target);
  const solDir = new THREE.Vector3(0, 1, 0); // dirección hacia el sol (unitaria)

  const camara = crearCamara({ cfg, reducir, perfil: RC.camara });
  const camera = camara.camera;
  const templo = puesto ? null : crearTemplo({ scene, cfg, keep, alturaSuelo });
  // La carta y su aviso usan la posición del furgón que se ve en esta sala.
  const carro = puesto ? cfg.tienda.carro : cfg.tienda.carroPractica;
  // El muelle ya trae su furgón. En la práctica la ventanilla mira al centro del claro.
  const furgon = puesto
    ? crearSalidaTrigal({ scene, cfg, keep })
    : crearPuesto({
        scene,
        cfg,
        keep,
        posicion: carro,
        mirarA: RC.lobby.centro,
      });
  // Capa de los jugadores: se oculta entera en el menú (D-214: aún no han caído).
  const capaJugadores = new THREE.Scene();
  scene.add(capaJugadores);
  const personajes = crearPersonajes({
    scene: capaJugadores,
    cfg,
    modelos,
    keep,
    decalMat,
    anillo: extras.length === 0,
    alturaSuelo,
    alturaAire: () => alturaCaida, // el anillo queda en el suelo: marca dónde aterrizan
  });
  const world0 = getWorld();
  const cadena = crearCadenaArte({
    scene: capaJugadores,
    cfg,
    renderer,
    keep,
    world0,
    alturaSuelo: alturaJugadores,
  });
  const vfx = crearVfx({ scene, cfg, keep, alturaSuelo });
  const enemigos = puesto
    ? null
    : crearEnemigosArte({
        scene,
        cfg,
        keep,
        decalMat,
        modelos,
        flashes: flashesOn,
      });
  const muneco = puesto ? null : crearMunecoLobby(scene, cfg, keep, modelos);
  const exts = extras
    .map((f) =>
      f({
        scene: capaJugadores, // los anillos de vida van con los jugadores: en el menú no se ven (D-214)
        cfg,
        getWorld,
        keep,
        mat: (
          /** @type {number} */ color,
          /** @type {THREE.MeshStandardMaterialParameters} */ o = {},
        ) =>
          keep(
            new THREE.MeshStandardMaterial({
              color,
              flatShading: true,
              roughness: 0.85,
              ...o,
            }),
          ),
        ambiente: null,
        alturaSuelo,
      }),
    )
    .filter(Boolean);

  const colores = { polvo: 0, paja: 0, piedra: 0 };
  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pal = p;
    /** @type {THREE.Color} */ (scene.background).setHex(p.niebla);
    fog.color.setHex(p.niebla);
    fog.near = p.nieblaCerca;
    fog.far = p.nieblaLejos;
    hemi.color.setHex(p.hemiCielo);
    hemi.groundColor.setHex(p.hemiSuelo);
    hemi.intensity = p.hemiIntensidad;
    sun.color.setHex(p.sol);
    sun.intensity = p.solIntensidad;
    const el = (p.solElevacion * Math.PI) / 180,
      az = (p.solAzimut * Math.PI) / 180;
    solDir.set(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    );
    templo?.aplicarPaleta(p);
    muneco?.aplicarPaleta(p);
    enemigos?.aplicarPaleta(p); // las vetas siguen la misma corrupción que el templo
    colores.polvo = mezclarHex(p.sueloAlt, p.niebla, 0.2); // más oscuro que las losas claras: se ve
    colores.paja = mezclarHex(p.vegetacion, 0xffffff, 0.12);
    colores.piedra = mezclarHex(p.piedra, p.suelo, 0.3);
    vfx.colorAmbiente(p.particula, 1.6);
  }
  vfx.paja = (x, y, z, n) => vfx.trozos(x, y, z, n, colores.paja, 1.1, 0.12);
  aplicarPaleta(pal);

  // ─── Post: bloom suave (D-089) ───
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const B = cfg.render.bloom;
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    B.fuerza,
    B.radio,
    B.umbral,
  );
  composer.addPass(bloom);
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // ─── Juice: reacciones del render a los eventos de cada jugador (como en slice.js) ───
  const eventosJug = {
    get flashes() {
      return flashesOn();
    },
    dash: (/** @type {number} */ i, /** @type {any} */ p) =>
      vfx.polvo(p.x, p.z, 7, colores.polvo, 1.3),
    golpe: (/** @type {number} */ i, /** @type {any} */ p) => {
      camara.sacudir(cfg.feel.shake.golpeRecibido);
      vfx.polvo(p.x, p.z, 5, colores.polvo, 1);
    },
    muere: (/** @type {number} */ i, /** @type {any} */ p) => {
      camara.sacudir(cfg.feel.shake.golpeRecibido);
      vfx.polvo(p.x, p.z, 12, colores.polvo, 1.6);
    },
    paso: (
      /** @type {number} */ i,
      /** @type {number} */ x,
      /** @type {number} */ z,
      /** @type {number} */ fuerza,
    ) => {
      if (alturaCaida <= 0) vfx.polvo(x, z, 1, colores.polvo, 0.5 * fuerza); // en el aire no levanta polvo
    },
  };
  /** @type {import('./tipos.js').FxJefe} */
  const fx = {
    polvo: (x, z, n, f) => vfx.polvo(x, z, n, colores.polvo, f),
    trozos: (x, y, z, n, f) => vfx.trozos(x, y, z, n, colores.piedra, f, 0.12),
    paja: (x, y, z, n) => vfx.paja(x, y, z, n),
    sacudir: (v) => camara.sacudir(v),
  };

  let tiempo = 0;
  let kVista = -1;
  let kSuave = 0; // avance suavizado (0..1) que mueve la paleta
  let verMenu = false; // true en el menú: la cámara encuadra el lobby y la escalinata (D-214)
  let enAire = getRecorrido().fase === "caida" && getRecorrido().caidaK < 1;
  /** @type {number[]} */
  const puntos = [];
  const menuPt = puntoRuta(ruta, T.menu.s, 0); // punto de la escalinata que entra en el encuadre del menú
  const C = T.caida;
  const proyPareja = nuevaProyeccion(); // reutilizados en cada cuadro (sin basura)
  const ptTmp = { x: 0, z: 0, ang: 0 };
  const umbralS = RC.pasillo.umbral.s; // m de ruta del arco de la cima

  /** @param {number} dt */
  function sync(dt) {
    const w = getWorld();
    const r = getRecorrido();
    tiempo += dt;
    const dtAnim = w.hitstop > 0 ? dt * 0.08 : dt; // hit-stop (D-166): la animación casi se congela

    // Paleta: el avance por la ruta lleva la hora dorada hacia la tarde (D-086).
    const kObj = Math.min(1, Math.max(0, r.s / ruta.total));
    kSuave += (kObj - kSuave) * Math.min(1, dt * 0.8);
    if (!puesto && Math.abs(kSuave - kVista) > 0.02) {
      kVista = kSuave;
      aplicarPaleta(
        resolverPaleta(ZONA, { progreso: kSuave }, cfg.paleta.zonas),
      );
    }

    // Caída (D-205): con aceleración desde `lobby.caida.altura`; al tocar suelo, polvo y temblor corto.
    const cayendo = r.fase === "caida" && r.caidaK < 1;
    const k = cayendo ? Math.max(0, r.caidaK) : 1;
    alturaCaida = RC.lobby.caida.altura * (1 - k * k);
    if (enAire && !cayendo) {
      camara.sacudir(C.sacudida, C.duracionSacudida);
      for (const p of w.players) {
        vfx.polvo(p.x, p.z, C.polvo, colores.polvo, C.fuerza);
        vfx.trozos(
          p.x,
          alturaSuelo(p.x, p.z) + 0.2,
          p.z,
          C.trozos,
          colores.piedra,
          0.8,
          0.14,
        );
      }
    }
    enAire = cayendo;
    capaJugadores.visible = !verMenu;

    personajes.sync(w, dtAnim, eventosJug, tiempo);
    cadena.sync(w, dtAnim);
    enemigos?.sync(r.enemigos, alturaSuelo, dtAnim, tiempo, fx);
    muneco?.sync(r.muneco, alturaSuelo, dtAnim, tiempo);
    furgon.sync(dtAnim, w.players, !reducir()); // La carta y el saludo comparten el alcance.
    for (const e of exts) e.sync?.(w, dt);

    // Cámara: encuadra a la pareja (y lo que pidan los extras) sobre el suelo bajo ella.
    puntos.length = 0;
    for (const e of exts) e.foco?.(puntos);
    const [a, b] = w.players;
    const mx = (a.x + b.x) / 2,
      mz = (a.z + b.z) / 2;
    // En el pasillo la cámara mira un poco por delante de la pareja (se ve lo que viene) y, cerca de la
    // cima, encuadra también el arco (D-211). En el lobby (s ≈ 0) no cambia nada.
    proyectarRuta(ruta, mx, mz, proyPareja);
    if (puesto) {
      puntos.push(carro.x, carro.z, 2); // desde la entrada se ve el completo gigante en el techo
    } else if (proyPareja.s > 0.5 && r.fase !== "caida") {
      puntoRuta(ruta, proyPareja.s + T.camara.adelante, 0, ptTmp);
      puntos.push(ptTmp.x, ptTmp.z, 1);
      if (umbralS - proyPareja.s < T.camara.arco && proyPareja.s < umbralS) {
        puntoRuta(ruta, umbralS, 0, ptTmp);
        puntos.push(ptTmp.x, ptTmp.z, T.camara.arcoRadio);
      }
    }
    // m: la cámara sube con los peldaños (suavizado en camara.js) y, en la caída, sigue a la pareja en parte.
    let base = alturaSuelo(mx, mz) + alturaCaida * C.camara;
    if (verMenu) {
      // Menú: el claro y la escalinata detrás (la pareja aún no ha caído, D-214).
      puntos.length = 0;
      puntos.push(
        RC.lobby.centro[0],
        RC.lobby.centro[1],
        4,
        menuPt.x,
        menuPt.z,
        T.menu.radio,
      );
      base = 0;
    }
    camara.update(w, puntos, dt, null, base);

    // Sol: la sombra sigue a lo que se ve.
    const lx = camera.position.x,
      lz = camera.position.z - 10;
    sun.target.position.set(mx, base, mz);
    sun.position.copy(sun.target.position).addScaledVector(solDir, 60);
    templo?.sync(lx, lz, r.s, dt);
    vfx.sync(dt, tiempo, lx, lz + 4, base);
  }

  const proj = new THREE.Vector3();
  const info = { calls: 0, triangles: 0, escena: 0 };
  return {
    camera,
    carro,
    alturaSuelo,
    /** @param {number} wd @param {number} ht */
    resize(wd, ht) {
      camara.resize(wd, ht);
      composer.setSize(wd, ht);
      bloom.resolution.set(wd / 2, ht / 2);
    },
    sync,
    /** Vuelve a aplicar la configuración del renderer: llamarlo al pasar a esta vista, tras liberar la anterior. */
    activar() {
      configurarRenderer(renderer, cfg);
    },
    render() {
      renderer.info.autoReset = false;
      renderer.info.reset();
      composer.render();
      info.calls = renderer.info.render.calls;
      info.triangles = renderer.info.render.triangles;
    },
    get drawCalls() {
      return info.calls;
    },
    get info() {
      return { ...info };
    },
    set verMenu(/** @type {boolean} */ v) {
      verMenu = v;
    },
    get verMenu() {
      return verMenu;
    },
    /**
     * @param {number} x @param {number} y @param {number} z
     * @param {{ x: number, y: number, visible: boolean }} out
     */
    toScreen(x, y, z, out) {
      proj.set(x, y, z).project(camera);
      const el2 = renderer.domElement;
      out.x = (proj.x * 0.5 + 0.5) * el2.clientWidth;
      out.y = (-proj.y * 0.5 + 0.5) * el2.clientHeight;
      out.visible = proj.z < 1;
      return out;
    },
    dispose() {
      for (const e of exts) e.dispose?.();
      templo?.dispose();
      furgon.dispose();
      personajes.dispose();
      cadena.dispose();
      enemigos?.dispose();
      muneco?.dispose();
      vfx.dispose();
      for (const o of keepList) o.dispose?.();
      for (const g of Object.values(modelos)) liberarGltf(g);
      // Los pases y la luz tienen su propia liberación (destinos de bloom, material de salida, mapa de sombras).
      renderPass.dispose();
      bloom.dispose();
      outputPass.dispose();
      composer.dispose();
      sun.dispose();
      hemi.dispose();
      scene.fog = null;
      // La configuración del renderer no se deshace: la aplica la vista que se activa (renderer-config.js).
    },
  };
}

/**
 * Muñeco de paja del lobby (D-208): el espantapájaros horneado en una malla. Lee `MunecoVista`: de pie
 * con un vaivén, cae de lado al quedarse sin vida y se rearma con `rearmeK`. Una malla + su sombra.
 * @param {THREE.Scene} scene
 * @param {import('./tipos.js').Cfg} cfg
 * @param {import('./tipos.js').Keep} keep
 * @param {import('./tipos.js').Modelos} modelos
 */
function crearMunecoLobby(scene, cfg, keep, modelos) {
  const M = cfg.render.muneco;
  const MATS = cfg.render.materiales;
  /** @type {Record<string, number>} */
  const tonos = {
    madera: MATS.maderaHerramienta,
    paja: 0xffffff,
    tela: MATS.telaEspantapajaros,
    cuerda: MATS.cuerda,
  };
  const geo = keep(
    hornearEstatico(
      modelos.espantapajaros.scene,
      (nombre) => tonos[nombre] ?? tonos.madera,
    ),
  );
  const idPaja = geo.userData.materiales.indexOf("paja"); // solo este material cambia al avanzar
  const colorPaja = new THREE.Color();
  const atributoColor = geo.getAttribute("color");
  const mat = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
    }),
  );
  const cuerpo = new THREE.Mesh(geo, mat);
  cuerpo.castShadow = true;
  cuerpo.receiveShadow = true;
  cuerpo.scale.setScalar(M.escala * cfg.render.templo.muneco); // menor que el de la práctica: es opcional
  const raiz = new THREE.Group();
  raiz.add(cuerpo);
  scene.add(raiz);
  let caidaT = 0; // s desde que cayó (para la animación de caída)
  let estabaCaido = false;

  return {
    /** @param {import('./tipos.js').Paleta} p */
    aplicarPaleta(p) {
      colorPaja.setHex(mezclarHex(p.vegetacion, 0xffffff, 0.12));
      for (let v = 0; v < atributoColor.count; v++) {
        if (geo.userData.vmat[v] === idPaja)
          atributoColor.setXYZ(v, colorPaja.r, colorPaja.g, colorPaja.b);
      }
      atributoColor.needsUpdate = true;
    },
    /**
     * @param {import('../gameplay/tipos.js').MunecoVista} m
     * @param {(x: number, z: number) => number} alturaSuelo
     * @param {number} dt @param {number} tiempo
     */
    sync(m, alturaSuelo, dt, tiempo) {
      raiz.position.set(m.x, alturaSuelo(m.x, m.z), m.z);
      raiz.rotation.y = Math.atan2(-m.x, -m.z); // mira al centro del claro
      if (m.caido && !estabaCaido) caidaT = 0;
      estabaCaido = m.caido;
      if (!m.caido) {
        cuerpo.rotation.z = Math.sin(tiempo * 1.7) * M.vaiven; // de pie: vaivén suave
        return;
      }
      // Caído: cae de lado en `caida` s; en el último cuarto del rearme se vuelve a levantar.
      caidaT = Math.min(M.caida, caidaT + dt);
      const k = caidaT / M.caida;
      const r = Math.min(1, Math.max(0, (m.rearmeK - 0.75) / 0.25)); // 0..1 de la subida
      const sube = r * r * (3 - 2 * r);
      cuerpo.rotation.z = k * k * (Math.PI / 2.1) * (1 - sube);
    },
    dispose() {
      scene.remove(raiz);
    },
  };
}
