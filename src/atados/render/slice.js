// Render del vertical slice (hito 3): pelea contra Mirra con arte low-poly (D-044), hora dorada y paleta
// base → clímax (D-083/D-188), personajes con animación procedural (D-090), cadena de metal divino
// (D-049/D-065), telegrafías planas (D-188), VFX y juice (D-080, D-089, D-166) y cámara con presentación.
// Solo lee el estado del mundo y del combate: no decide gameplay. Misma interfaz que render/greybox.js
// (resize, sync, render, drawCalls, toScreen, dispose) para que el HUD no cambie.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { cargarModelos, liberarGltf } from "./modelos.js";
import { resolverPaleta, mezclarHex } from "./paleta.js";
import { crearCamara } from "./camara.js";
import { crearArenaMirraVisual } from "./arena-mirra.js";
import { BRASEROS } from "../gameplay/ritos.js";
import { escudoVisible } from "../ui/hud-logica.js";
import { crearVistaRitos } from "./ritos.js";
import { crearTrigal } from "./trigal.js";
import { crearPersonajes } from "./personajes.js";
import { crearCadenaArte } from "./cadena-arte.js";
import { crearTelegrafias } from "./telegrafias.js";
import { crearMirra } from "./mirra-arte.js";
import { crearAtaquesMirra } from "./ataques-mirra.js";
import { crearRitosMirra } from "./ritos-mirra.js";
import { crearMuneco } from "./muneco-arte.js";
import { crearArteFarolero } from "./farolero.js";
import { crearPlanoEpilogo } from "./epilogo-farolero.js";
import { crearBrillos } from "./brillos.js";
import { crearVistaVictoria } from "./victoria.js";
import { crearVfx } from "./vfx.js";
import { configurarRenderer, reducidoSistema } from "./renderer-config.js";

export const MODELOS_SLICE = ["sael", "odo", "espantapajaros", "mirra"];
// Modelos que necesita cada arte de jefe (`def.arte`); la práctica no carga a Mirra.
/** @type {Record<string, string[]>} */
const MODELOS_DE = {
  mirra: MODELOS_SLICE,
  farolero: ["sael", "odo"],
  muneco: ["sael", "odo", "espantapajaros"],
};

// `extras` = fábricas con la misma firma que el `extra` de render/greybox.js (p. ej. crearAnillosHud de
// render/hud-anillos.js). Si hay extras, el anillo propio de los personajes se apaga: el HUD dibuja el anillo
// con vida, dash y ancla (D-063) y no se duplica.
/**
 * @param {{
 *   renderer: THREE.WebGLRenderer,
 *   cfg: import('./tipos.js').Cfg,
 *   getWorld: () => import('./tipos.js').Mundo,
 *   getCombate: () => import('./tipos.js').Combate,
 *   getEpilogo?: () => number | null,
 *   params?: URLSearchParams,
 *   brilloFarolero?: () => number,
 *   tiempoVictoria?: () => number,
 *   extras?: ((ctx: any) => any)[],
 * }} args
 */
export async function crearRenderSlice({
  renderer,
  cfg,
  getWorld,
  getCombate,
  getEpilogo,
  params,
  brilloFarolero = () => 0.16,
  tiempoVictoria = () => 0,
  extras = [],
}) {
  const modelos = await cargarModelos(
    MODELOS_DE[getCombate().jefe.def.arte ?? "mirra"] ?? MODELOS_SLICE,
  );
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
  // Marcas planas en el suelo (D-143): sin bordes ni brillo, encima del trigo bajo, debajo de cuerpos.
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

  const world0 = getWorld();
  const c0 = getCombate();
  const def = c0.jefe.def;
  const farolero = c0.id === "farolero";
  const ZONA = farolero ? "tavor" : "trigal";
  /** @type {import('./tipos.js').Paleta} */
  let pal = resolverPaleta(ZONA, { fase: 1 });

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(pal.niebla, pal.nieblaCerca, pal.nieblaLejos);
  scene.fog = fog;
  scene.background = new THREE.Color(pal.niebla);

  // ─── Luz: sol de hora dorada + cielo (D-086) ───
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
  const SR = world0.arenaRadius + SH.margen;
  Object.assign(sun.shadow.camera, {
    left: -SR,
    right: SR,
    top: SR,
    bottom: -SR,
    near: 1,
    far: 90,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = SH.radio;
  scene.add(hemi, sun, sun.target);

  const camara = crearCamara({ cfg, reducir });
  const camera = camara.camera;
  const trigal = farolero
    ? null
    : crearTrigal({
        scene,
        cfg,
        keep,
        modelos,
        world0,
        jefe0: c0.jefe,
      });
  const brillos = crearBrillos(keep);
  const personajes = crearPersonajes({
    brillos,
    scene,
    cfg,
    modelos,
    keep,
    decalMat,
    anillo: !getEpilogo && extras.length === 0,
  });
  const cadena = crearCadenaArte({ scene, cfg, renderer, keep, world0 });
  const tele = crearTelegrafias({ scene, cfg, keep, decalMat, def });
  // Cada sala carga solo su jefe y las señales de sus propias pruebas.
  const arteFarolero = farolero
    ? crearArteFarolero({ scene, keep, world0, decalMat, reducir })
    : null;
  const arteJefe =
    arteFarolero ??
    (def.arte === "muneco"
      ? crearMuneco({ scene, cfg, keep, modelos, def })
      : crearMirra({ scene, cfg, keep, modelos, def }));
  const planoEpilogo =
    getEpilogo && arteFarolero
      ? crearPlanoEpilogo({ scene, camera, keep, cfg, reducir })
      : null;
  const arenaVisual =
    c0.id === "mirra"
      ? crearArenaMirraVisual({
          scene,
          keep,
          brillos,
          alturaArco: cfg.jefes.mirra.acido.arco,
        })
      : null;
  const vistaRitos = farolero ? null : crearVistaRitos(scene, keep, brillos);
  // Señales físicas de cada ataque y de los ritos de Mirra (la práctica con el muñeco no las necesita).
  const conMirra = c0.id === "mirra";
  const ataquesMirra = conMirra
    ? crearAtaquesMirra({ scene, cfg, keep, brillos })
    : null;
  const ritosMirra = conMirra
    ? crearRitosMirra({ scene, keep, brillos, def })
    : null;
  // El muñeco de práctica carece de premio y tampoco necesita cargar el carro.
  const victoria =
    def.monedas > 0 ? crearVistaVictoria({ scene, cfg, keep }) : null;
  const vfx = crearVfx({ scene, cfg, keep });
  const exts = extras
    .map((f) =>
      f({
        scene,
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
      }),
    )
    .filter(Boolean);

  const colores = {
    polvo: 0,
    grano: cfg.paleta.corrupcion.veta,
    corteza: 0,
    paja: 0,
  };
  /** @param {import('./tipos.js').Paleta} p */
  function aplicarPaleta(p) {
    pal = p;
    /** @type {THREE.Color} */ (scene.background).setHex(p.niebla);
    fog.color.setHex(p.niebla);
    fog.near = p.nieblaCerca;
    fog.far = p.nieblaLejos;
    hemi.color.setHex(farolero ? 0xc4d0ed : p.hemiCielo);
    hemi.groundColor.setHex(farolero ? 0x78665a : p.hemiSuelo);
    hemi.intensity = p.hemiIntensidad;
    sun.color.setHex(p.sol);
    sun.intensity = p.solIntensidad;
    const el = (p.solElevacion * Math.PI) / 180,
      az = (p.solAzimut * Math.PI) / 180;
    sun.position.set(
      Math.sin(az) * Math.cos(el) * 40,
      Math.sin(el) * 40,
      Math.cos(az) * Math.cos(el) * 40,
    );
    trigal?.aplicarPaleta(p);
    arteJefe.aplicarPaleta(p);
    colores.polvo = mezclarHex(p.suelo, p.niebla, 0.35);
    colores.corteza = p.jefe;
    colores.paja = mezclarHex(p.vegetacion, 0xffffff, 0.12);
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
  const salida = new OutputPass();
  const suavizarBordes = new ShaderPass(FXAAShader);
  composer.addPass(salida);
  // El suavizado lee el color final, incluidos los halos y los contornos del trigo.
  composer.addPass(suavizarBordes);

  // ─── Juice: reacciones a cambios de estado (render puro) ───
  /** Reacciones del render a los eventos de cada jugador (ver personajes.js). */
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
    ) => vfx.polvo(x, z, 1, colores.polvo, 0.5 * fuerza),
  };
  /** @type {import('./tipos.js').FxJefe} */
  const fxJefe = {
    polvo: (x, z, n, f) => vfx.polvo(x, z, n, colores.polvo, f),
    trozos: (x, y, z, n, f) => vfx.trozos(x, y, z, n, colores.corteza, f, 0.13),
    paja: (x, y, z, n) => vfx.paja(x, y, z, n),
    sacudir: (v) => camara.sacudir(v),
  };

  let tiempo = 0;
  let kVista = -1;
  let cinematica = false; // true: la próxima presentación usa la cinemática de entrada (D-211)
  let intensidad = 0;
  let hitPrev = 0;
  let flashT = 0,
    ultimoFlash = -1;
  let faseVista = c0.jefe.fase;
  let vivoPrev = true;
  /** @type {number[]} */
  const puntos = [];
  const momento = { fase: 1, intensidad: 0 };
  const presentacion = {
    k: 0,
    jx: 0,
    jz: 0,
    face: 0,
    alto: def.altura,
    cinematica: false,
  };
  const sinEvento = () => {};
  const eventosEpilogo = {
    flashes: false,
    dash: sinEvento,
    golpe: sinEvento,
    muere: sinEvento,
    paso: sinEvento,
  };

  /** @param {number} dt */
  function sync(dt) {
    const w = getWorld();
    const c = getCombate();
    const epilogo = getEpilogo?.();
    if (epilogo != null && planoEpilogo && arteFarolero) {
      // El tiempo absoluto coloca la cámara y las marcas de actuación. El rig acota su propio paso de animación.
      const dtCine = Math.min(dt, 1 / 30);
      planoEpilogo(c, epilogo);
      personajes.sync(w, dtCine, eventosEpilogo, epilogo);
      cadena.sync(w, dtCine);
      const revelado = THREE.MathUtils.smoothstep(
        epilogo,
        cfg.ui.epilogo.finMarcha - 1.5,
        cfg.ui.epilogo.cierre,
      );
      arteFarolero.sync(c, w, dtCine, epilogo, { flash: 0, revelado });
      return;
    }
    tiempo += dt;
    // Hit-stop (gameplay, D-166): la animación casi se congela; cámara y partículas siguen.
    const dtAnim = w.hitstop > 0 ? dt * 0.08 : dt;

    // Paleta: fase e intensidad (vida perdida) mueven la mezcla base → clímax.
    const vidaF = c.jefe.hpMax > 0 ? c.jefe.hp / c.jefe.hpMax : 1;
    intensidad += (1 - vidaF - intensidad) * Math.min(1, dt * 2);
    momento.fase = c.jefe.fase + 1;
    momento.intensidad = intensidad;
    const k = Math.min(
      1,
      Math.max(
        0,
        cfg.paleta.mezcla.porFase * (momento.fase - 1) +
          cfg.paleta.mezcla.porIntensidad * intensidad,
      ),
    );
    if (Math.abs(k - kVista) > 0.012) {
      kVista = k;
      aplicarPaleta(resolverPaleta(ZONA, momento));
    }

    // Corte: chispas según tensión en el punto de contacto, astillas, shake leve y destello del jefe.
    const D = w.dummy,
      ct = w._contact;
    if (D.lastStep > 0 && ct.touching) {
      const t = ct.maxT;
      const nx = ct.x - D.x,
        nz = ct.z - D.z,
        l = Math.hypot(nx, nz) || 1;
      const n = Math.min(
        12,
        Math.floor(cfg.vfx.chispas.porSegundo * dt * t * t + (t > 0.3 ? 1 : 0)),
      );
      const hex = mezclarHex(
        cfg.paleta.cadena.runaMedia,
        cfg.paleta.cadena.runaTensa,
        t,
      );
      vfx.chispas(
        ct.x,
        cfg.chain.height,
        ct.z,
        nx / l,
        nz / l,
        t,
        n,
        hex,
        2.2 + t * 1.6,
      );
      if (t > 0.6 && (tiempo * 10) % 1 < dt * 10)
        vfx.trozos(ct.x, 1.2, ct.z, 2, colores.corteza, 0.8, 0.1);
      camara.sacudir(cfg.feel.shake.corte * t * t * dt * 4);
      if (
        t > cfg.feel.flashes.desdeTension &&
        tiempo - ultimoFlash > 1 / cfg.feel.flashes.maxPorSegundo &&
        flashesOn()
      ) {
        flashT = 1;
        ultimoFlash = tiempo;
      }
    }
    if (w.hitstop > 0 && hitPrev <= 0) camara.sacudir(cfg.feel.shake.hitstop);
    hitPrev = w.hitstop;
    flashT = Math.max(0, flashT - dt * 8);
    if (c.jefe.fase !== faseVista) {
      faseVista = c.jefe.fase;
      camara.sacudir(cfg.feel.shake.fase);
    }
    if (vivoPrev && !c.jefe.vivo) camara.sacudir(cfg.feel.shake.muerteJefe);
    vivoPrev = c.jefe.vivo;

    const flashes = flashesOn();
    arenaVisual?.sync(w, c, flashes);
    vistaRitos?.(
      c.estado === "pelea" && c.id === "mirra" ? c.ritos : null,
      dtAnim,
      flashes,
      c.jefe,
    );
    // El rito ya emite paja al perder un pilar; una sola nube respeta el ajuste de movimiento.
    trigal?.sync(w, c, dtAnim, tiempo, ritosMirra ? undefined : fxJefe);
    // El brillo regula la luz ambiente de la sala completa durante toda la pelea.
    if (farolero)
      hemi.intensity = pal.hemiIntensidad * (0.75 + 2 * brilloFarolero());
    const escudo = escudoVisible(c);
    personajes.sync(
      w,
      dtAnim,
      eventosJug,
      tiempo,
      escudo ? BRASEROS.colores[escudo.color] : null,
    );
    cadena.sync(w, dtAnim);
    tele.sync(c, vfx, colores);
    arteJefe.sync(c, w, dtAnim, tiempo, {
      flash: flashT * cfg.render.jefe.flash,
      fx: fxJefe,
    });
    // Después de animar al jefe: los retoques de huesos van encima de la pose del mixer.
    const reducido = reducir();
    if (ataquesMirra && "huesos" in arteJefe)
      ataquesMirra.sync(
        c,
        dtAnim,
        arteJefe.huesos,
        vfx,
        colores,
        reducido,
        flashes,
      );
    ritosMirra?.sync(c, w, dtAnim, vfx, colores, reducido, flashes);
    victoria?.sync(c, tiempoVictoria(), dtAnim, Boolean(reducido));
    vfx.sync(dt, tiempo, camera.position.x, camera.position.z - 6);
    for (const e of exts) e.sync?.(w, dt);

    // Cámara: presentación del jefe (D-064) o encuadre de jugadores + jefe/lápida (D-176).
    puntos.length = 0;
    if (c.jefe.vivo) puntos.push(c.jefe.x, c.jefe.z, c.jefe.r);
    else if (c.lapida) puntos.push(c.lapida.x, c.lapida.z, 1.5);
    victoria?.foco(puntos);
    if (c.estado === "pelea" && c.farolero)
      for (const marca of c.farolero.marcas)
        puntos.push(marca.x, marca.z, marca.r);
    const barril = c.arenaMirra?.barril;
    if (c.estado === "pelea" && barril) puntos.push(barril.x, barril.z, 1.5);
    // Mantén las opciones de color dentro del encuadre cuando aparecen lejos de la pareja.
    if (c.estado === "pelea" && c.ritos.tipo === "braseros") {
      for (const fuego of c.ritos.braseros)
        puntos.push(fuego.x, fuego.z, BRASEROS.radio);
    }
    for (const e of exts) e.foco?.(puntos);
    let pres = null;
    if (c.estado === "presentacion") {
      presentacion.k = Math.min(
        1,
        c.presentacion.t / Math.max(0.01, c.presentacion.T),
      );
      presentacion.jx = c.jefe.x;
      presentacion.jz = c.jefe.z;
      presentacion.face = c.jefe.face;
      presentacion.cinematica = cinematica;
      pres = presentacion;
    }
    camara.update(w, puntos, dt, pres);
  }

  const proj = new THREE.Vector3();
  const info = { calls: 0, triangles: 0, escena: 0 };
  return {
    camera,
    carro: cfg.tienda.carroVictoria,
    get puestoListo() {
      return victoria?.puestoListo ?? false;
    },
    /** @param {number} wd @param {number} ht */
    resize(wd, ht) {
      camara.resize(wd, ht);
      composer.setSize(wd, ht);
      suavizarBordes.uniforms.resolution.value.set(
        1 / composer.readBuffer.width,
        1 / composer.readBuffer.height,
      );
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
      const carro = victoria?.carro;
      return {
        ...info,
        carroVictoria: carro?.visible
          ? { x: carro.position.x, z: carro.position.z }
          : null,
        monedasVisibles: victoria?.monedasVisibles ?? 0,
      };
    },
    // Vista de prueba de los estados de la cadena (gameplay no los usa con Mirra: D-193).
    setEfectoCadena: (/** @type {string | null | undefined} */ e) =>
      cadena.setEfecto(e),
    /**
     * Cinemática de entrada del jefe (D-211). La integración la pone en `true` antes de la primera presentación
     * de Mirra (tras cruzar el arco) y en `false` para los reintentos, que vuelven a la presentación corta.
     * Se lee en cada cuadro mientras `combate.estado === "presentacion"`; fuera de ella no hace nada.
     */
    set cinematica(/** @type {boolean} */ v) {
      cinematica = v;
    },
    get cinematica() {
      return cinematica;
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
      trigal?.dispose();
      personajes.dispose();
      cadena.dispose();
      tele.dispose();
      arteJefe.dispose();
      ataquesMirra?.dispose();
      ritosMirra?.dispose();
      victoria?.dispose();
      vfx.dispose();
      for (const o of keepList) o.dispose?.();
      for (const g of Object.values(modelos)) liberarGltf(g);
      // Los pases y las luces mantienen recursos de GPU propios.
      renderPass.dispose();
      suavizarBordes.dispose();
      salida.dispose();
      bloom.dispose();
      composer.dispose();
      sun.dispose();
      hemi.dispose();
      scene.fog = null;
      // La configuración del renderer no se deshace: la aplica la vista que se activa (renderer-config.js).
    },
  };
}
