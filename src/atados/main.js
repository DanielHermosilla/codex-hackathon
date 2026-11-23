// Arranque de AtaDos: une la página (menú, pausa, resultados, cartel) con el combate en 3D.
// Flujo: menú → práctica con el muñeco de paja → Mirra la Hambrienta → resultado.
// El combate (reglas puras), el render y el HUD se crean de nuevo en cada sala; el audio y la entrada duran
// toda la sesión. `window.__game` expone el estado y utilidades deterministas para las pruebas.
import * as THREE from "three";
import { CONFIG } from "./core/config.js";
import { RNG } from "./core/rng.js";
import { crearJuegoJefe, snapshot } from "./core/juego.js";
import { createInput } from "./core/input.js";
import { crearRenderSlice } from "./render/slice.js";
import { crearAnillosHud } from "./render/hud-anillos.js";
import { crearHud } from "./ui/hud.js";
import { conectarAudio } from "./audio/index.js";
import { setIdioma, t } from "./i18n/index.js";
import {
  saltarPresentacion,
  snapshotCombate,
  forzarAtaque,
  ponerVidaJefe,
  colocarParaPrueba,
  sinAtaques,
} from "./gameplay/combate.js";
import { createMural } from "./mural.js";
import "./ui.css";

/** @typedef {"muneco" | "mirra"} Etapa */
/** @typedef {"menu" | "cargando" | "playing" | "paused" | "result"} Pantalla */

const params = new URLSearchParams(window.location.search);
const MAX_EVENTOS = 60; // eventos recientes que guardamos para las pruebas

/** Busca un elemento de la página o explica cuál falta. @param {string} id */
function elemento(id) {
  const nodo = document.getElementById(id);
  if (!nodo) throw new Error("Falta el elemento " + id);
  return nodo;
}

/** Escribe texto solo si cambió, para no tocar el DOM en cada cuadro.
 * @param {HTMLElement} nodo @param {string} valor */
function texto(nodo, valor) {
  if (nodo.textContent !== valor) nodo.textContent = valor;
}

async function arrancar() {
  // La página está en español; ?lang=en cambia los textos del combate a inglés.
  setIdioma(params.get("lang") ?? (document.documentElement.lang || "es"));
  // Semilla del combate: ?seed=N o una al azar del RNG global (nunca Math.random en el juego).
  if (params.has("seed")) RNG.seed(Number(params.get("seed")));
  const seed = params.has("seed")
    ? Number(params.get("seed"))
    : Math.floor(RNG.next() * 2 ** 31) + 1;

  const canvas = elemento("arena");
  const stage = /** @type {HTMLElement} */ (canvas.parentElement);
  const controls = /** @type {HTMLDialogElement} */ (elemento("controls"));
  const hudPagina = elemento("hud");
  const velo = elemento("overlay");
  const caption = elemento("caption");
  const title = elemento("title");
  const intro = elemento("intro");
  const primary = /** @type {HTMLButtonElement} */ (elemento("primary"));
  const play = /** @type {HTMLButtonElement} */ (elemento("play"));
  const objetivo = elemento("objective");
  const announce = elemento("announce");
  const leerCartel = elemento("read-mural");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("No se pudo preparar la arena.");

  // WebGL 2 es obligatorio: sin él explicamos cómo activarlo en vez de mostrar una pantalla negra.
  const context = canvas.getContext("webgl2", { antialias: true });
  if (!context)
    throw new Error(
      "AtaDos necesita WebGL 2. Activa la aceleración gráfica y vuelve a cargar la página.",
    );
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    preserveDrawingBuffer: params.has("capture"), // ?capture: permite leer el canvas en pruebas
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace; // los hex de la paleta son sRGB
  // Tope de densidad de píxeles: más allá casi no se nota y cuesta mucho en pantallas Retina.
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, CONFIG.render.pixelRatioMax),
  );

  // La entrada escucha al canvas: las teclas del juego no roban Enter ni Espacio a los botones del menú.
  const input = createInput(CONFIG, canvas, { debug: params.has("dev") });
  const mural = createMural(elemento("mural"));

  /** @type {Pantalla} */
  let pantalla = "menu";
  /** @type {Etapa} */
  let etapa = "muneco";
  let solo = !params.has("coop"); // el menú arranca en «Solo»; ?coop elige dos jugadores
  let silencio = false; // botón «Sonido»
  let finT = 0; // segundos desde que terminó la pelea (victoria)
  let muralHasta = 0; // segundo del combate hasta el que se ve el cartel
  let montaje = 0; // contador para descartar cargas viejas si el jugador cambia de sala rápido

  /** @type {null | {juego: ReturnType<typeof crearJuegoJefe>, vista: Awaited<ReturnType<typeof crearRenderSlice>>, hud: ReturnType<typeof crearHud>}} */
  let sala = null;

  // Eventos del combate (avisos de ataque, golpes, fases): se reparten al audio, al HUD y a las pruebas.
  /** @type {any[]} */
  const recientes = [];
  /** @type {Set<(e: any) => void>} */
  const oyentes = new Set();
  function drenar() {
    if (!sala) return;
    const lista = sala.juego.combate.eventos;
    if (!lista.length) return;
    for (const e of lista) {
      recientes.push(e);
      for (const f of oyentes) f(e);
    }
    lista.length = 0;
    if (recientes.length > MAX_EVENTOS)
      recientes.splice(0, recientes.length - MAX_EVENTOS);
  }

  /** Ajusta el tamaño del render al del canvas visible. */
  function ajustar() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    sala?.vista.resize(w, h);
  }

  // El audio dura toda la sesión y lee siempre la sala actual.
  const audio = conectarAudio({
    cfg: CONFIG,
    getCombate: () => sala?.juego.combate ?? null,
    onEvento: (/** @type {(e: any) => void} */ f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  });

  /**
   * Crea una sala nueva (combate + render + HUD) y libera la anterior.
   * @param {Etapa} nueva
   * @param {{presentacion?: boolean}} [opciones] `presentacion` = mostrar la entrada completa del jefe.
   */
  async function montar(nueva, { presentacion = true } = {}) {
    const id = ++montaje;
    const juego = crearJuegoJefe(CONFIG, {
      solo,
      dificil: params.has("dificil"),
      seed,
      jefe: nueva,
      sample: (s) => ({ inputs: input.sample(s), debug: input.debug }),
    });
    if (!presentacion) juego.reiniciar(false); // reintento: presentación corta
    // El muñeco no necesita presentación: la práctica empieza enseguida.
    if (nueva === "muneco") saltarPresentacion(juego.combate);
    const vista = await crearRenderSlice({
      renderer,
      cfg: CONFIG,
      getWorld: () => juego.world,
      getCombate: () => juego.combate,
      params,
      extras: [crearAnillosHud()],
    });
    if (id !== montaje) {
      // Otra sala se pidió mientras esta cargaba: se descarta sin mostrarla.
      vista.dispose();
      return false;
    }
    const anterior = sala;
    anterior?.vista.dispose();
    anterior?.hud.dispose();
    const hud = crearHud({
      cfg: CONFIG,
      getCombate: () => juego.combate,
      toScreen: vista.toScreen,
      solo,
      parent: stage,
    });
    sala = { juego, vista, hud };
    etapa = nueva;
    finT = 0;
    recientes.length = 0;
    oyentes.clear();
    oyentes.add(hud.alEvento);
    oyentes.add(audio.evento);
    ajustar();
    return true;
  }

  /** Ajusta el volumen general según el botón «Sonido» y la pantalla (en pausa no suena nada). */
  function aplicarVolumen() {
    const callado = silencio || pantalla === "paused";
    audio.api.volumen("master", callado ? 0 : CONFIG.audio.volumen.master);
  }

  /** @param {boolean} unSolo */
  function modo(unSolo) {
    solo = unSolo;
    elemento("mode-solo").setAttribute("aria-pressed", String(solo));
    elemento("mode-coop").setAttribute("aria-pressed", String(!solo));
    elemento("dash-help").innerHTML = solo
      ? "<kbd>Espacio</kbd> Ambos"
      : "<kbd>Espacio</kbd> Sael · <kbd>⇧ der.</kbd> Odo";
  }

  /** Cambia de pantalla y ordena qué se ve. @param {Pantalla} siguiente */
  function mostrar(siguiente) {
    pantalla = siguiente;
    stage.dataset.screen = siguiente;
    input.clear();
    const jugando = siguiente === "playing";
    const menu = siguiente === "menu";
    hudPagina.hidden = !jugando;
    velo.hidden = jugando;
    if (sala) sala.hud.visible = jugando || siguiente === "paused";
    play.hidden = !menu;
    elemento("modes").hidden = !menu;
    primary.hidden = menu || jugando || siguiente === "cargando";
    elemento("restart").hidden = siguiente !== "paused";
    elemento("menu").hidden = menu || jugando || siguiente === "cargando";
    leerCartel.hidden = !jugando || etapa !== "muneco";
    aplicarVolumen();
    const tiempo = sala?.juego.combate.t ?? 0;
    if (jugando && etapa === "muneco" && tiempo < muralHasta) mural.show();
    else mural.hide();
    if (jugando) {
      canvas.focus({ preventScroll: true });
      return;
    }
    if (menu) {
      texto(caption, "El trigal de Mirra");
      title.innerHTML = "Ata<span>Dos</span>";
      texto(
        intro,
        "Sael y Odo robaron la Brasa. Ahora, su única arma contra los dioses es la cadena que los une.",
      );
      play.focus({ preventScroll: true });
      return;
    }
    if (siguiente === "cargando") {
      texto(caption, etapa === "muneco" ? "El trigal" : "Mirra la Hambrienta");
      texto(title, "Preparando…");
      texto(intro, "La cadena se tensa.");
      return;
    }
    if (siguiente === "paused") {
      texto(caption, etapa === "muneco" ? "El trigal" : "Mirra la Hambrienta");
      texto(title, "En pausa");
      texto(intro, "La partida seguirá donde la dejaste.");
      texto(primary, "Continuar");
    } else {
      const practica = etapa === "muneco";
      texto(caption, practica ? "El trigal" : "Mirra la Hambrienta");
      texto(title, practica ? "Primer corte" : "Mirra ha caído");
      texto(
        intro,
        practica
          ? "La cadena cortó el muñeco. Mirra aguarda en el trigal."
          : "La Brasa de Mirra vuelve a encender un eslabón.",
      );
      texto(primary, practica ? "Enfrentar a Mirra" : "Volver a jugar");
    }
    primary.focus({ preventScroll: true });
  }

  /** Entra a una sala y empieza a jugar. @param {Etapa} nueva @param {{presentacion?: boolean}} [opciones] */
  async function empezar(nueva, opciones) {
    void audio.api.desbloquear(); // el navegador solo deja sonar tras un gesto
    etapa = nueva;
    mostrar("cargando");
    if (!(await montar(nueva, opciones))) return;
    muralHasta = nueva === "muneco" ? CONFIG.ui.cartelPractica : 0;
    texto(
      announce,
      nueva === "muneco"
        ? "Práctica. Tensa la cadena y cruza el muñeco."
        : "Mirra la Hambrienta, antes la que Alimentaba.",
    );
    mostrar("playing");
  }

  function pausar() {
    if (pantalla === "playing") mostrar("paused");
  }
  async function alMenu() {
    mostrar("cargando");
    if (await montar("muneco")) mostrar("menu");
  }
  function accionPrincipal() {
    if (pantalla === "paused") mostrar("playing");
    else if (pantalla === "result") void empezar("mirra");
  }

  play.onclick = () => void empezar("muneco");
  primary.onclick = accionPrincipal;
  elemento("pause").onclick = pausar;
  elemento("menu").onclick = () => void alMenu();
  elemento("restart").onclick = () =>
    void empezar(etapa, { presentacion: false });
  elemento("mode-solo").onclick = () => modo(true);
  elemento("mode-coop").onclick = () => modo(false);
  elemento("sound").onclick = () => {
    silencio = !silencio;
    if (!silencio) void audio.api.desbloquear();
    aplicarVolumen();
    elemento("sound").setAttribute("aria-pressed", String(!silencio));
    if (pantalla === "playing") canvas.focus();
  };
  elemento("guide").onclick = () => {
    pausar();
    controls.showModal();
  };
  leerCartel.onclick = () => {
    muralHasta = (sala?.juego.combate.t ?? 0) + CONFIG.ui.cartelPractica;
    mural.show();
    canvas.focus();
  };
  // Al perder el foco se sueltan las teclas y se pausa: nadie queda corriendo sin control.
  window.addEventListener("blur", pausar);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pausar();
  });
  window.addEventListener("keydown", (event) => {
    if (controls.open || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Escape" && !event.repeat) {
      if (pantalla === "playing") pausar();
      else if (pantalla === "paused") mostrar("playing");
    }
  });
  window.addEventListener("resize", ajustar);
  new ResizeObserver(ajustar).observe(canvas);

  // Start en cualquier mando pausa o continúa (flanco: mantenerlo no repite).
  let startAntes = false;
  function leerStart() {
    /** @type {(Gamepad | null)[]} */
    let pads;
    try {
      pads = navigator.getGamepads?.() ?? [];
    } catch {
      pads = []; // algunos navegadores bloquean los mandos en ventanas incrustadas
    }
    const start = pads.some((p) => !!p?.buttons[9]?.pressed);
    const flanco = start && !startAntes;
    startAntes = start;
    if (!flanco || controls.open) return;
    if (pantalla === "playing") pausar();
    else if (pantalla === "paused") mostrar("playing");
    else if (pantalla === "menu") {
      // Start en el segundo mando significa que hay dos personas: el juego arranca en cooperativo.
      if (pads[1]?.buttons[9]?.pressed) modo(false);
      void empezar("muneco");
    } else if (pantalla === "result") accionPrincipal();
  }

  /** Texto de la esquina: qué hacer ahora, según la sala y el ataque en curso. */
  function pintarIndicacion() {
    if (!sala) return;
    const c = sala.juego.combate;
    const accion = c.jefe.accion;
    let clave = "indicacion.mirra";
    if (etapa === "muneco")
      clave =
        c.stats.dano[0] + c.stats.dano[1] > 0
          ? "indicacion.munecoPilar"
          : "indicacion.muneco";
    else if (c.estado === "derrota") clave = "indicacion.derrota";
    else if (accion?.tipo === "ataque" && accion.etapa === "telegrafia")
      clave = "indicacion." + accion.id;
    texto(objetivo, t(clave));
  }

  /** Revisa si terminó la sala para pasar al resultado. @param {number} dt */
  function revisarFin(dt) {
    if (!sala || sala.juego.combate.estado !== "victoria") return;
    finT += dt;
    // La práctica pasa rápido; con Mirra dejamos leer la lápida.
    const espera =
      etapa === "muneco" ? CONFIG.ui.finPractica : CONFIG.ui.finJefe;
    if (finT >= espera) mostrar("result");
  }

  let pendiente = 0; // dt acumulado para el render
  /** Un cuadro: simula (si se juega), actualiza audio y acumula tiempo para el render. @param {number} dt */
  function cuadro(dt) {
    leerStart();
    if (!sala) return;
    if (pantalla === "playing") {
      sala.juego.update(dt);
      drenar();
      revisarFin(dt);
      if (sala.juego.combate.t >= muralHasta) mural.hide();
    }
    audio.update(dt);
    pendiente += dt;
  }
  function dibujar() {
    if (!sala) return;
    // En pausa la escena se congela; en el menú el trigal sigue meciéndose de fondo.
    const dt = pantalla === "paused" ? 0 : pendiente;
    pendiente = 0;
    sala.vista.verPuesto = pantalla === "menu" || pantalla === "cargando";
    sala.vista.sync(dt);
    sala.hud.update(dt);
    if (pantalla === "playing") pintarIndicacion();
    sala.vista.render();
  }

  const timer = new THREE.Timer();
  renderer.setAnimationLoop((ms) => {
    timer.update(ms);
    cuadro(Math.min(timer.getDelta(), CONFIG.sim.maxFrameDt)); // dt con tope al volver de otra pestaña
    dibujar();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    pausar();
    texto(
      elemento("problem"),
      "Se perdió la conexión gráfica. Recarga la página para volver al trigal.",
    );
    elemento("problem").hidden = false;
  });
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return pausar(); // la caché de navegación conserva la escena para «Volver»
    renderer.setAnimationLoop(null);
    sala?.vista.dispose();
    sala?.hud.dispose();
    input.dispose();
    audio.dispose();
    mural.dispose();
    renderer.dispose();
  });

  /** Combate actual (solo existe con una sala montada). */
  const combate = () =>
    /** @type {NonNullable<typeof sala>} */ (sala).juego.combate;

  // Interfaz de pruebas: estado de solo lectura y pasos deterministas.
  Object.defineProperty(window, "__game", {
    configurable: true,
    value: {
      ready: true,
      get pantalla() {
        return pantalla;
      },
      get etapa() {
        return etapa;
      },
      get state() {
        return sala
          ? {
              ...snapshot(sala.juego.world),
              combate: snapshotCombate(combate()),
            }
          : null;
      },
      get combate() {
        return sala ? snapshotCombate(combate()) : null;
      },
      get eventos() {
        return recientes.slice();
      },
      get render() {
        return sala?.vista.info ?? null;
      },
      audio: audio.api,
      /** Detiene el bucle real y avanza `n` pasos fijos (pruebas reproducibles). */
      step(n = 1, dt = CONFIG.sim.fixedDt) {
        renderer.setAnimationLoop(null);
        for (let i = 0; i < n; i++) cuadro(dt);
        dibujar();
      },
      empezar: (/** @type {Etapa} */ e) => empezar(e),
      menu: () => alMenu(),
      pausar,
      continuar: () => mostrar("playing"),
      setInput: (/** @type {number} */ i, /** @type {any} */ v) =>
        input.setOverride(i, v),
      clearInput: () => {
        input.setOverride(0, null);
        input.setOverride(1, null);
      },
      saltarPresentacion: () => sala && saltarPresentacion(combate()),
      setVidaJefe: (/** @type {number} */ hp) =>
        sala && ponerVidaJefe(combate(), hp),
      forzarAtaque: (/** @type {string} */ id) => {
        if (!sala) return;
        forzarAtaque(combate(), id);
        drenar();
      },
      sinAtaques: (on = true) => sala && sinAtaques(combate(), on),
      colocar: (/** @type {any} */ pos) =>
        sala && colocarParaPrueba(combate(), pos),
    },
  });

  modo(solo);
  mostrar("cargando");
  if (await montar("muneco")) mostrar("menu");
}

arrancar().catch((error) => {
  // Cualquier fallo de arranque se explica en la página en vez de dejarla en blanco.
  const problema = document.getElementById("problem");
  document.getElementById("overlay")?.setAttribute("hidden", "");
  document.getElementById("arena")?.setAttribute("hidden", "");
  if (problema) {
    problema.textContent =
      error instanceof Error ? error.message : "No se pudo abrir la arena.";
    problema.hidden = false;
  }
});
