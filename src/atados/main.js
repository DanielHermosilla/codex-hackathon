// Arranque de AtaDos: une la página (menú, pausa, resultados) con la partida en 3D.
// Flujo (core/flujo.js, D-204 a D-214):
//   menú con el lobby detrás → «Jugar» → caída al valle → lobby y pasillo de subida → arco de la cima
//   → fundido a negro → la pradera se abre en silencio → presentación de Mirra (cinemática solo la 1.ª vez)
//   → Mirra → carro de completos → arco norte → muelle → Ondar a pie o combate opcional con el Farolero.
// El recorrido y el puesto usan render/recorrido.js; la pradera del jefe usa render/slice.js. La del
// jefe se monta al cruzar el arco (evento `jefe:preparar`) mientras la pantalla funde a negro; al estar lista se
// avisa a la partida (`jefeListo`). El recorrido se libera al entrar al combate. Audio, entrada y HUD duran toda la
// partida. `window.__game` expone el estado y utilidades deterministas para las pruebas.
import * as THREE from "three";
import { CONFIG } from "./core/config.js";
import { RNG } from "./core/rng.js";
import { snapshot, aplicarDebugComun } from "./core/juego.js";
import { crearPartida } from "./core/flujo.js";
import { createInput, leerMandos } from "./core/input.js";
import { crearRenderSlice } from "./render/slice.js";
import { crearRenderRecorrido } from "./render/recorrido.js";
import { crearAnillosHud } from "./render/hud-anillos.js";
import { crearHud } from "./ui/hud.js";
import { coloresHud, etiquetaTecla, hexCss } from "./ui/hud-logica.js";
import { conectarAudio } from "./audio/index.js";
import { setIdioma, t } from "./i18n/index.js";
import {
  avisoRitoActual,
  crearCombate,
  saltarPresentacion,
  snapshotCombate,
  forzarAtaque,
  colocarParaPrueba,
  ponerVidaJefe,
  sinAtaques,
} from "./gameplay/combate.js";
import { crearTienda, juntoAlCarro } from "./gameplay/tienda.js";
import { crearCarta, textoMonedas } from "./ui/tienda.js";
import { navegarPanel, esConfirmacion } from "./ui/navegacion.js";
import { createMural } from "./mural.js";
import {
  acciones,
  cargarPreferencias,
  jugadores,
  teclasDe,
} from "./core/preferencias.js";
import { prepararAjustes } from "./ui/ajustes.js";
import "./ui.css";

/** @typedef {"menu" | "cargando" | "playing" | "paused" | "result" | "derrota"} Pantalla */
/** @typedef {ReturnType<typeof crearPartida>} Partida */
/** @typedef {Awaited<ReturnType<typeof crearRenderRecorrido>>} VistaRecorrido */
/** @typedef {Awaited<ReturnType<typeof crearRenderSlice>>} VistaJefe */
/** @typedef {import('./gameplay/tipos.js').Evento} Evento */

const params = new URLSearchParams(window.location.search);
const solicitado = params.get("jefe");
const jefeDirecto =
  solicitado === "mirra" || solicitado === "farolero" ? solicitado : null;
const MAX_EVENTOS = 80; // eventos recientes que guardamos para las pruebas

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
  // La página está en español; ?lang=en cambia los textos del juego a inglés.
  setIdioma(params.get("lang") ?? (document.documentElement.lang || "es"));
  // Semilla de la partida: ?seed=N o una al azar del RNG global (nunca Math.random en el juego).
  if (params.has("seed")) RNG.seed(Number(params.get("seed")));
  const seed = params.has("seed")
    ? Number(params.get("seed"))
    : Math.floor(RNG.next() * 2 ** 31) + 1;
  const dificil = params.has("dificil");

  const canvas = elemento("arena");
  const stage = /** @type {HTMLElement} */ (canvas.parentElement);
  const controls = /** @type {HTMLDialogElement} */ (elemento("controls"));
  const hudPagina = elemento("hud");
  const velo = elemento("overlay");
  const caption = elemento("caption");
  const title = elemento("title");
  const intro = elemento("intro");
  const primary = /** @type {HTMLButtonElement} */ (elemento("primary"));
  const volver = elemento("menu");
  const play = /** @type {HTMLButtonElement} */ (elemento("play"));
  const objetivo = elemento("objective");
  const farolHud = elemento("farol-hud");
  const farolEstado = elemento("farol-estado");
  const farolTiempo = elemento("farol-tiempo");
  const farolVuelta = elemento("farol-vuelta");
  const farolInstruccion = elemento("farol-instruccion");
  const farolReloj = elemento("farol-reloj");
  const farolPlazo = /** @type {HTMLProgressElement} */ (
    elemento("farol-plazo")
  );
  const farolAjustes = elemento("farol-ajustes");
  const farolBrillo = /** @type {HTMLSelectElement} */ (
    elemento("farol-brillo")
  );
  const farolAviso = /** @type {HTMLInputElement} */ (elemento("farol-aviso"));
  // El render lee el brillo en cada dibujo. El sonido se consulta al anunciar un ataque.
  farolPlazo.setAttribute("aria-label", t("farol.plazo"));
  for (const gesto of ["prisma", "ecos", "campanas"])
    texto(elemento("farol-guia-" + gesto), t("farol.guia." + gesto));
  texto(elemento("farol-controles"), t("farol.controles"));
  texto(elemento("farol-brillo-etiqueta"), t("farol.brillo"));
  texto(elemento("farol-brillo-8"), t("farol.brillo.bajo"));
  texto(elemento("farol-brillo-16"), t("farol.brillo.medio"));
  texto(elemento("farol-brillo-25"), t("farol.brillo.alto"));
  texto(elemento("farol-aviso-etiqueta"), t("farol.sonido"));
  const irAlFarolero = elemento("enfrentar-farolero");
  let atajoFarolero = true;
  let atajoReinicio = true; // un control personalizado tiene prioridad sobre el atajo de combate
  irAlFarolero.setAttribute("aria-label", t("farol.enfrentar"));
  const irAlPuesto = elemento("continuar-puesto");
  const atajoPuesto = elemento("atajo-puesto"); // permite continuar sin caminar hasta el arco
  const letrero = elemento("mural");
  const mural = createMural(letrero); // diálogo del carro de completos junto a la ventanilla
  const announce = elemento("announce");
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

  // Fundido del arco (D-211): capa DOM sobre el canvas, del color de fondo de la paleta (no es un color suelto).
  const fundido = document.createElement("div");
  fundido.id = "fundido";
  fundido.setAttribute("aria-hidden", "true");
  fundido.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;background:${hexCss(coloresHud(CONFIG.paleta).fondo)};`; // mismo fondo que el HUD
  canvas.after(fundido); // justo encima del canvas y por debajo del HUD y del menú
  let opacidadFundido = 0; // 0..1 que se ve ahora (lo leen las pruebas)

  // La entrada escucha al canvas: las teclas del juego no roban Enter ni Espacio a los botones del menú.
  const preferencias = cargarPreferencias();
  const cfg = {
    ...CONFIG,
    controls: { ...CONFIG.controls, keyboard: preferencias.teclado },
  };
  const input = createInput(cfg, canvas, { debug: params.has("dev") });

  /** @type {Pantalla} */
  let pantalla = "menu";
  let inicioR = 0; // milisegundos del evento, en el mismo reloj que requestAnimationFrame
  let segundosConR = -1; // negativo mientras no haya una pulsación nueva en plena pelea
  const soltarReinicio = () => {
    segundosConR = -1;
  };
  canvas.addEventListener("blur", soltarReinicio);
  window.addEventListener("keyup", (evento) => {
    if (evento.code === "KeyR") soltarReinicio(); // soltar antes del segundo cancela el intento
  });
  let solo = !params.has("coop"); // el menú arranca en «Solo»; ?coop elige dos jugadores
  let montaje = 0; // contador para descartar cargas viejas si se vuelve al menú mientras carga la pradera
  let aperturaDesde = -1; // s de partida en que la pradera empezó a abrirse tras el fundido (-1 = aún no)

  let tienda = crearTienda(cfg); // saldo, productos vendidos y mejoras de la pareja durante esta partida
  let recompensa = 0; // monedas que acreditó el evento de victoria más reciente

  /** Partida nueva desde la caída, con el modo elegido en el menú. */
  const nuevaPartida = () =>
    crearPartida(tienda.cfg, {
      solo,
      dificil,
      seed,
      jefe: jefeDirecto ?? tienda.cfg.recorrido.pasillo.jefe,
      sample: (s) => ({ inputs: input.sample(s), debug: input.debug }),
    });
  /** @type {Partida} */
  let partida = nuevaPartida();

  /** @type {VistaRecorrido | null} */
  let vistaRecorrido = null; // escena del lobby y el pasillo (se libera al pasar al jefe)
  /** @type {VistaRecorrido | null} */
  let vistaPuesto = null; // tramo seguro del siguiente pasillo, después de la lápida
  /** @type {VistaJefe | null} */
  let vistaJefe = null; // escena de la pradera del jefe (se monta al cruzar el arco)
  /** @type {Promise<void> | null} Montaje compartido por las peticiones del mismo cruce. */
  let cargaJefe = null;
  /** @type {VistaRecorrido | VistaJefe | null} */
  let vista = null; // la que se dibuja ahora
  /** @type {ReturnType<typeof crearHud> | null} */
  let hud = null;

  // Altura del muñeco del lobby (m) para su número de daño: la del muñeco de práctica a la escala del lobby.
  const alturaMuneco = CONFIG.jefes.muneco.altura * CONFIG.render.templo.muneco;

  const carta = crearCarta(
    elemento("tienda"),
    () => tienda,
    (id) =>
      tiendaAlAlcance() !== null && tienda.comprar(id, partida.world.players),
    () => {
      input.clear();
      aplicarVolumen();
      if (pantalla === "playing") canvas.focus({ preventScroll: true });
    },
  );

  // La misma ventanilla atiende a la pareja al terminar cualquiera de las dos peleas.
  function tiendaAlAlcance() {
    if (
      pantalla !== "playing" ||
      partida.estado !== "victoria" ||
      !vistaJefe?.puestoListo ||
      vista !== vistaJefe
    )
      return null;
    // Una sola distancia en metros controla el aviso, la tecla P y cada compra.
    return juntoAlCarro(
      partida.world.players,
      vistaJefe.carro,
      tienda.cfg.tienda.alcance,
    )
      ? vistaJefe
      : null;
  }

  canvas.addEventListener("keydown", (e) => {
    if (
      e.code !== "KeyP" ||
      e.repeat ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      !tiendaAlAlcance()
    )
      return;
    e.preventDefault();
    input.clear(); // al salir de la carta no quedan movimiento ni dash pendientes
    carta.abrir();
    aplicarVolumen();
  });

  // Eventos de la partida (recorrido, combate y flujo): se reparten al HUD, al audio y a las pruebas.
  /** @type {Evento[]} */
  const recientes = [];
  /** @type {((e: Evento) => void)[]} */
  const oyentes = [];
  function repartir() {
    const lista = partida.eventos;
    if (!lista.length) return;
    for (const e of lista) {
      recientes.push(e);
      for (const f of oyentes) f(e);
    }
    lista.length = 0; // la integración vacía la lista tras repartirla (contrato de core/flujo.js)
    if (recientes.length > MAX_EVENTOS)
      recientes.splice(0, recientes.length - MAX_EVENTOS);
  }

  /** Ajusta el tamaño del render al del canvas visible. */
  function ajustar() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    vistaRecorrido?.resize(w, h);
    vistaJefe?.resize(w, h);
    vistaPuesto?.resize(w, h);
  }

  // El audio dura toda la sesión. Sin combate (recorrido) lee un «combate» mínimo con el mundo del recorrido:
  // así suenan los pasos de la cadena, el dash, el ancla, los golpes recibidos y los cortes al muñeco.
  const combateRecorrido = {
    get w() {
      return partida.world;
    },
    jefe: { x: 0, fase: 0 }, // el pan de los cortes al muñeco queda al centro
    estado: "recorrido",
    id: null,
  };
  const audio = conectarAudio({
    cfg: CONFIG,
    getCombate: () => partida.combate ?? combateRecorrido,
    avisosFarolero: () => farolAviso.checked,
    onEvento: (/** @type {(e: Evento) => void} */ f) => {
      oyentes.push(f);
    },
  });

  /** HUD de la partida: tutorial y tarjetas en el recorrido, capas del jefe con combate. */
  function montarHud() {
    hud?.dispose();
    hud = crearHud({
      cfg: tienda.cfg,
      getCombate: () => partida.combate,
      toScreen: (x, y, z, out) => {
        if (vista) vista.toScreen(x, y, z, out);
        else out.visible = false;
      },
      getWorld: () => partida.world,
      alturaNumero: () => partida.combate?.jefe.def.altura ?? alturaMuneco,
      getEnemigos: () => partida.recorrido.estado.enemigos,
      alturaSuelo: (x, z) =>
        vista && vista === vistaRecorrido
          ? vistaRecorrido.alturaSuelo(x, z)
          : 0,
      solo,
      parent: stage,
    });
    hud.visible = pantalla === "playing" || pantalla === "paused";
  }

  /**
   * Monta la escena del recorrido si no existe (al arrancar y al volver al menú desde la pradera).
   * @returns {Promise<VistaRecorrido | null>} la escena, o null si mientras cargaba se pidió otra cosa
   */
  async function montarRecorrido(puesto = false) {
    const existente = puesto ? vistaPuesto : vistaRecorrido;
    if (existente) return existente;
    const id = montaje;
    const v = await crearRenderRecorrido({
      puesto, // el tramo posterior dibuja el muelle sin enemigos
      renderer,
      cfg: tienda.cfg,
      getWorld: () => partida.world,
      getRecorrido: () => partida.recorrido.estado,
      params,
      extras: [crearAnillosHud()],
    });
    if (id !== montaje) {
      v.dispose(); // se pidió otra cosa mientras cargaba
      return null;
    }
    if (puesto) vistaPuesto = v;
    else vistaRecorrido = v;
    return v;
  }

  /** Dibuja una vista ya montada. Durante el silencio del arco ambas salas siguen disponibles.
   * @param {VistaRecorrido | VistaJefe} v */
  function activar(v) {
    if (vista === v) return;
    vista = v;
    v.activar(); // repone sombras y exposición antes del primer cuadro de la sala
    ajustar();
  }

  /** Una partida nueva descarta cualquier pradera anterior, incluso si aún se estaba cargando. */
  function reemplazarPartida() {
    montaje++; // una carga anterior que llegue tarde libera su propia escena
    cargaJefe = null;
    if (vista === vistaJefe || vista === vistaPuesto) vista = null;
    vistaPuesto?.dispose();
    vistaPuesto = null;
    recompensa = 0;
    vistaJefe?.dispose();
    vistaJefe = null;
    partida = nuevaPartida();
    aperturaDesde = -1;
    recientes.length = 0;
  }

  /**
   * Monta la pradera del jefe mientras la pantalla funde (evento `jefe:preparar`). Se dibuja con un combate de
   * muestra idéntico al inicial (misma semilla) hasta que empieza el real. Al estar lista, avisa a la partida.
   * @param {string} jefe
   */
  function prepararJefe(jefe) {
    if (vistaJefe) {
      partida.jefeListo();
      return Promise.resolve();
    }
    if (cargaJefe) return cargaJefe;
    const id = montaje; // identifica la partida que pidió esta carga
    cargaJefe = montarPradera(jefe, id).finally(() => {
      if (id === montaje) cargaJefe = null;
    });
    return cargaJefe;
  }

  /** @param {string} jefe @param {number} id */
  async function montarPradera(jefe, id) {
    const previo = crearCombate(tienda.cfg, { jefe, solo, dificil, seed });
    const v = await crearRenderSlice({
      renderer,
      cfg: tienda.cfg,
      getWorld: () => (partida.combate ?? previo).w,
      getCombate: () => partida.combate ?? previo,
      // El reloj fijo también se detiene al pausar o abrir la carta.
      tiempoVictoria: () =>
        partida.estado === "victoria" ? partida.tEstado : 0,
      brilloFarolero: () => Number(farolBrillo.value),
      params,
      extras: [crearAnillosHud()],
    });
    if (id !== montaje) {
      v.dispose(); // se volvió al menú mientras cargaba
      return;
    }
    vistaJefe = v;
    v.cinematica = true; // la primera presentación lleva la cinemática de zoom (D-211)
    if (vista) vista.activar(); // crear la pradera tocó el renderer: la vista actual vuelve a su configuración
    ajustar();
    partida.jefeListo();
  }

  /** Reacciones de la página a los eventos del flujo (el HUD y el audio reciben todos por su lado). */
  /** @param {Evento} e */
  function alEventoFlujo(e) {
    if (e.tipo === "victoria") {
      recompensa = Number(e.monedas) || 0;
      tienda.acreditar(recompensa); // un único evento por combate ganado; la pantalla de resultado no vuelve a pagar
    } else if (e.tipo === "derrota") {
      mostrar("derrota", t(String(e.frase))); // Al caer ambos, termina la partida y se cierra el acceso a la pausa.
    } else if (e.tipo === "jefe:preparar") {
      const solicitante = partida;
      void prepararJefe(String(e.jefe)).catch(() => {
        if (partida !== solicitante || partida.estado !== "arco") return;
        pausar();
        texto(
          intro,
          "No se pudo cargar la pradera. Usa Reiniciar para volver a intentarlo.",
        );
      });
    } else if (e.tipo === "jefe:entra") {
      hud?.cinematica.seguirPresentacion(); // se arman al entrar de verdad, una vez pasado el arco
      texto(
        announce,
        e.jefe === "farolero" ? t("farol.intro") : t("jefe.mirra.nombre"),
      );
    }
  }
  oyentes.push((e) => hud?.alEvento(e), alEventoFlujo);
  // El audio se suscribió al crearse (conectarAudio → onEvento); el orden no importa.

  /** Ajusta el volumen general según las preferencias y la pantalla (en pausa no suena nada). */
  function aplicarVolumen() {
    const callado = pantalla === "paused" || carta.abierta;
    audio.api.volumen("master", callado ? 0 : preferencias.volumen);
  }

  /** Conserva las leyendas cortas de la barra del Templo Ancla. @param {string} codigo */
  function teclaDeBarra(codigo) {
    if (codigo === "Enter") return "Enter";
    return etiquetaTecla(codigo).replace("Shift", "⇧");
  }

  /** @param {boolean} unSolo */
  function modo(unSolo) {
    solo = unSolo;
    elemento("mode-solo").setAttribute("aria-pressed", String(solo));
    elemento("mode-coop").setAttribute("aria-pressed", String(!solo));
    const teclado = preferencias.teclado;
    // Las asignaciones guardadas tienen prioridad sobre los atajos F y R.
    const ocupadas = jugadores.flatMap((jugador) =>
      acciones.flatMap((accion) => teclasDe(teclado, jugador, accion)),
    );
    atajoFarolero = !ocupadas.includes("KeyF");
    atajoReinicio = !ocupadas.includes("KeyR");
    if (atajoFarolero) irAlFarolero.setAttribute("aria-keyshortcuts", "F");
    else irAlFarolero.removeAttribute("aria-keyshortcuts");
    texto(
      irAlFarolero,
      t("farol.enfrentar") + (atajoFarolero ? " · F / Y / △" : " · Y / △"),
    );
    for (const jugador of jugadores) {
      const m = teclado[jugador];
      texto(
        elemento(jugador + "-mover"),
        [m.up, m.left, m.down, m.right].map(teclaDeBarra).join(" "),
      );
      texto(elemento(jugador + "-ancla"), teclaDeBarra(m.anchor[0]));
    }
    const ayuda = elemento("dash-help");
    ayuda.replaceChildren();
    for (const [codigo, nombre] of solo
      ? [[teclado.soloDash[0], "Ambos"]]
      : [
          [teclado.sael.dash[0], "Sael"],
          [teclado.odo.dash[0], "Odo"],
        ]) {
      const tecla = document.createElement("kbd");
      tecla.textContent = teclaDeBarra(codigo);
      const par = document.createElement("span"); // La tecla y su jugador se centran juntos.
      par.append(tecla, " " + nombre);
      ayuda.append(par);
    }
  }

  /** Nombre del lugar para los textos del menú y la pausa. */
  const lugar = () =>
    partida.estado === "puesto"
      ? t("salida.muelle")
      : partida.combate
        ? t("jefe." + partida.combate.id + ".nombre")
        : t("mundo.templo");

  let pausaTrasCarga = false; // recuerda si la ventana perdió foco mientras se montaba una sala
  /** Cambia de pantalla y ordena qué se ve. @param {Pantalla} siguiente @param {string} [fraseDerrota] */
  function mostrar(siguiente, fraseDerrota = "") {
    if (siguiente === "cargando") pausaTrasCarga = false;
    soltarReinicio(); // también al pausar por pestaña oculta o pérdida de foco
    pantalla = siguiente;
    stage.dataset.screen = siguiente;
    document.body.dataset.screen = siguiente; // el CSS muestra u oculta las barras según esta pantalla
    input.clear();
    const jugando = siguiente === "playing";
    const menu = siguiente === "menu";
    carta.ocultarAviso();
    mural.hide();
    if (!jugando) carta.cerrar();
    const esFinal = partida.combate?.id === "farolero";
    irAlPuesto.hidden = siguiente !== "result" || esFinal;
    atajoPuesto.hidden = !jugando || !partida.salidaVictoriaLista;
    irAlFarolero.hidden = !jugando || !puestoListo();
    farolAjustes.hidden = !esFinal && !(menu && jefeDirecto === "farolero");
    if (siguiente === "result" && !esFinal)
      texto(irAlPuesto, t("salida.volver"));
    hudPagina.hidden = !jugando;
    velo.hidden = jugando;
    if (hud) hud.visible = jugando || siguiente === "paused";
    play.hidden = !menu;
    elemento("modes").hidden = !menu;
    primary.hidden = siguiente !== "paused" && siguiente !== "result";
    // Un mapa antiguo puede usar R para jugar. En ese caso el reintento sigue a mano en la derrota.
    elemento("restart").hidden =
      siguiente !== "paused" &&
      !(siguiente === "derrota" && !dificil && !atajoReinicio);
    texto(
      elemento("restart"),
      partida.estado === "puesto" ? "Reintentar a Mirra" : "Reintentar",
    );
    primary.classList.toggle("gold", siguiente !== "result");
    volver.classList.toggle("gold", siguiente === "derrota");
    volver.hidden = menu || jugando || siguiente === "cargando";
    aplicarVolumen();
    if (jugando) {
      canvas.focus({ preventScroll: true });
      return;
    }
    if (menu) {
      texto(
        caption,
        jefeDirecto ? t("jefe." + jefeDirecto + ".nombre") : t("mundo.templo"),
      );
      title.innerHTML = "Ata<span>Dos</span>";
      texto(intro, t("menu.lore"));
      if (jefeDirecto) {
        const prefijo = jefeDirecto === "farolero" ? "farol" : "mirra";
        texto(intro, t(prefijo + ".intro"));
        texto(play, t(prefijo + ".jugar"));
      }
      play.focus({ preventScroll: true });
      return;
    }
    if (siguiente === "cargando") {
      texto(caption, t("mundo.templo"));
      texto(title, "Preparando…");
      texto(intro, "La cadena se tensa.");
      return;
    }
    texto(caption, lugar());
    if (siguiente === "derrota") {
      texto(title, t("combate.derrota"));
      texto(
        intro,
        [
          fraseDerrota,
          !dificil && atajoReinicio ? t("combate.ayudaReintento") : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      // El foco sale del canvas. Una esquiva sostenida no activa el botón de salida.
      title.focus({ preventScroll: true });
      return;
    }
    const premio =
      recompensa > 0
        ? " " + t("tienda.recompensa", { cantidad: textoMonedas(recompensa) })
        : "";
    if (siguiente === "paused") {
      texto(title, "En pausa");
      texto(intro, "");
      texto(primary, "Continuar");
    } else if (esFinal) {
      texto(title, t("farol.victoria"));
      texto(intro, t("farol.recompensa") + premio);
      texto(primary, t("farol.repetir"));
    } else {
      texto(caption, t("salida.muelle"));
      texto(title, t("salida.destino"));
      texto(intro, t("salida.finDemo"));
      texto(primary, t("salida.repetir"));
    }
    (siguiente === "result" && !esFinal ? irAlPuesto : primary).focus({
      preventScroll: true,
    });
  }

  /** «Jugar»: partida nueva desde la caída, ahí mismo y sin pantalla de carga (D-214, D-205). */
  function empezar() {
    void audio.api.desbloquear(); // el navegador solo deja sonar tras un gesto
    if (!vistaRecorrido) return; // aún carga el lobby (solo pasa al arrancar)
    reemplazarPartida();
    if (jefeDirecto) {
      montarHud();
      void abrirCombate(jefeDirecto, false);
      return;
    }
    activar(vistaRecorrido);
    montarHud();
    // Música del pasillo (contrato de audio/index.js): el recorrido no tiene combate que la arranque.
    audio.evento({ tipo: "zona_entra", zona: "pasillo", t: 0 });
    texto(announce, t("mundo.caida"));
    mostrar("playing");
  }

  function puestoListo() {
    // El flujo puede haber llegado al puesto antes de que termine de cargar su vista.
    return (
      partida.estado === "puesto" &&
      vistaPuesto !== null &&
      vista === vistaPuesto
    );
  }

  /** Entra desde el acceso directo o desde el puesto, una vez preparada la escena correcta.
   * @param {string} jefe @param {boolean} desdePuesto */
  async function abrirCombate(jefe, desdePuesto) {
    if (
      desdePuesto &&
      (pantalla !== "playing" || !puestoListo() || carta.abierta)
    )
      return;
    const actual = partida;
    mostrar("cargando");
    try {
      await prepararJefe(jefe);
    } catch {
      if (actual !== partida) return;
      mostrar(desdePuesto ? "paused" : "menu");
      texto(intro, t("combate.cargaFallida"));
      return;
    }
    if (actual !== partida) return;
    if (desdePuesto) partida.entrarFarolero();
    else partida.saltarAlJefe();
    repartir();
    revisarEscena();
    vistaPuesto?.dispose();
    vistaPuesto = null;
    mostrar(pausaTrasCarga ? "paused" : "playing");
    pausaTrasCarga = false;
  }

  /** Vuelve a pelear contra el jefe en la pradera con la presentación corta (D-213), sin pasar por el pasillo. */
  async function repetirJefe() {
    if (
      partida.estado !== "puesto" &&
      partida.estado !== "destino" &&
      !partida.juegoJefe
    )
      return;
    if (!vistaJefe) {
      const actual = partida;
      mostrar("cargando");
      try {
        await prepararJefe(tienda.cfg.recorrido.pasillo.jefe);
      } catch {
        if (actual !== partida) return;
        mostrar(partida.estado === "destino" ? "result" : "paused");
        texto(
          intro,
          "No se pudo cargar la pradera. Puedes volver a intentarlo.",
        );
        return;
      }
      if (actual !== partida) return;
    }
    partida.reintentarJefe(); // vuelve también el flujo de victoria a jefe
    repartir(); // entrega los eventos de la presentación corta en este cuadro
    if (vistaJefe) activar(vistaJefe);
    vistaPuesto?.dispose();
    vistaPuesto = null;
    mostrar(pausaTrasCarga ? "paused" : "playing");
    pausaTrasCarga = false;
  }

  /** El siguiente pasillo es seguro: conserva compras y salud y no crea otro jefe. */
  async function continuarAlPuesto() {
    if (pantalla !== "playing" || partida.estado !== "puesto") return;
    const actual = partida;
    mostrar("cargando");
    try {
      const sala = await montarRecorrido(true);
      if (!sala || partida !== actual) return;
      activar(sala);
      vistaJefe?.dispose(); // la pradera y el carro dejan de dibujarse al entrar al muelle
      vistaJefe = null;
      aperturaDesde = -1;
      texto(announce, t("salida.camino"));
      mostrar(pausaTrasCarga ? "paused" : "playing");
      pausaTrasCarga = false;
    } catch {
      if (partida !== actual) return;
      mostrar("paused");
      texto(
        intro,
        "No se pudo cargar el muelle. Pulsa Continuar para volver a intentarlo.",
      );
    }
  }

  function pausar() {
    if (pantalla === "playing") mostrar("paused");
    else if (pantalla === "cargando") pausaTrasCarga = true;
  }
  async function alMenu() {
    tienda = crearTienda(cfg); // desde portada el saldo y los productos vuelven a su estado inicial
    reemplazarPartida();
    audio.evento({ tipo: "zona_entra", zona: "pasillo", estado: "nada" }); // termina la música y los ataques anteriores
    if (!vistaRecorrido) mostrar("cargando");
    const v = await montarRecorrido();
    if (!v) return;
    activar(v);
    montarHud();
    mostrar("menu");
  }
  function accionPrincipal() {
    if (pantalla === "paused") mostrar("playing");
    else if (pantalla === "result") repetirJefe();
  }
  // «Reiniciar» en la pausa: con el jefe, reintento en la pradera; en el recorrido, la partida desde la caída.
  function reiniciar() {
    if (
      partida.estado === "puesto" ||
      partida.estado === "destino" ||
      partida.juegoJefe
    )
      void repetirJefe();
    else empezar();
  }

  play.onclick = () => empezar();
  primary.onclick = accionPrincipal;
  irAlFarolero.onclick = () => void abrirCombate("farolero", true);
  function volverAlMuelle() {
    partida.volverAlPuesto(); // vuelve de la llegada a Ondar con las compras de esta partida
    mostrar("playing");
  }
  irAlPuesto.onclick = volverAlMuelle;
  // El jugador puede marcharse aunque conserve los 25 pesos o ya haya comprado.
  function salirDeVictoria() {
    if (pantalla !== "playing" || !partida.salidaVictoriaLista || carta.abierta)
      return;
    if (partida.combate?.id === "farolero") {
      mostrar("result"); // la pareja decide cuándo terminar su visita a Bodoque
    } else if (partida.entrarPuesto()) {
      repartir(); // mismo cambio de zona que al atravesar el arco norte a pie
      revisarEscena();
    }
  }
  atajoPuesto.onclick = salirDeVictoria;
  elemento("pause").onclick = pausar;
  volver.onclick = () => void alMenu();
  elemento("restart").onclick = reiniciar;
  elemento("mode-solo").onclick = () => modo(true);
  elemento("mode-coop").onclick = () => modo(false);
  prepararAjustes(controls, preferencias, aplicarVolumen, () => {
    // Reconstruimos las teclas escuchadas al editar, fuera del bucle de render.
    input.actualizarTeclado();
    modo(solo);
  });
  const engranaje = elemento("settings");
  engranaje.title = t("ajustes.titulo");
  engranaje.setAttribute("aria-label", engranaje.title);
  engranaje.onclick = () => {
    pausar();
    soltarReinicio();
    controls.showModal();
  };
  // Al perder el foco se sueltan las teclas y se pausa: nadie queda corriendo sin control.
  window.addEventListener("blur", pausar);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      soltarReinicio();
      pausar();
    }
  });
  /** @type {HTMLElement | null} Panel donde se pulsó Shift sin combinarlo con otra tecla. */
  let panelConShift = null;
  window.addEventListener("blur", () => {
    panelConShift = null;
    soltarReinicio();
  });
  window.addEventListener("keyup", (event) => {
    if (event.key !== "Shift" || !panelConShift) return;
    const panel = panelConShift;
    panelConShift = null;
    if (panel === panelActual()) navegarPanel(event, panel); // Shift solo confirma al soltarlo
  });
  function panelActual() {
    const dialogo = document.querySelector("dialog[open]");
    if (dialogo instanceof window.HTMLElement) return dialogo;
    if (pantalla === "derrota") return velo; // el primer movimiento elige la salida del panel
    return pantalla === "playing" ? null : document.body;
  }
  window.addEventListener(
    "keydown",
    (event) => {
      if (!event.repeat) panelConShift = null; // Tab y otras combinaciones cancelan la confirmación con Shift
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const panel = panelActual(); // el diálogo superior tiene prioridad sobre la pantalla del juego
      // La captura de teclas de Ajustes recibe incluso WASD, Shift, Enter y las flechas.
      if (
        controls.open &&
        controls.querySelector('#bindings button[aria-pressed="true"]')
      )
        return;
      if (
        atajoReinicio &&
        event.code === "KeyR" &&
        ((pantalla === "derrota" && !dificil && !controls.open) ||
          (pantalla === "playing" &&
            event.target === canvas &&
            partida.combate?.estado === "pelea"))
      ) {
        event.preventDefault();
        if (!event.repeat) {
          inicioR = event.timeStamp; // milisegundos, en el reloj de requestAnimationFrame
          segundosConR = 0;
        }
        return;
      }
      if (panel && event.key === "Shift") {
        event.preventDefault();
        event.stopPropagation(); // incluso si Tab dejó el foco sobre el canvas detrás del menú
        if (!event.repeat) panelConShift = panel;
        return;
      }
      if (panel && (event.code !== "Escape" || panel !== document.body)) {
        navegarPanel(event, panel);
        return;
      }
      if (event.code === "Escape" && !event.repeat) {
        if (pantalla === "playing") pausar();
        else if (pantalla === "paused") mostrar("playing");
        return;
      }
      if (pantalla !== "playing") return;
      if (event.code === "KeyF" && atajoFarolero && puestoListo()) {
        event.preventDefault();
        if (!event.repeat) void abrirCombate("farolero", true);
        return;
      }
      if (event.target !== canvas) return;
      const combate = partida.combate;
      if (esConfirmacion(event.code) && combate?.estado === "presentacion") {
        event.preventDefault();
        event.stopPropagation(); // confirmar no debe dejar un dash ni un ancla sostenidos en la pelea
        if (!event.repeat && combate.presentacion.saltable) {
          input.confirmar(); // sigue las reglas del combate sobre cuándo se puede saltar o reintentar
        }
      }
    },
    true,
  ); // la captura decide primero si la tecla pertenece al panel o al canvas
  window.addEventListener("resize", ajustar);
  new ResizeObserver(ajustar).observe(canvas);

  // Start en cualquier mando pausa o continúa (flanco: mantenerlo no repite).
  let startAntes = false;
  let finalAntes = false;
  function leerStart() {
    const pads = leerMandos();
    const final = pads.some((p) => !!p?.buttons[3]?.pressed); // Y o triángulo continúa desde la tienda
    const entrar = final && !finalAntes;
    finalAntes = final;
    if (
      entrar &&
      (partida.estado === "puesto" || partida.estado === "victoria") &&
      pantalla === "playing" &&
      !carta.abierta &&
      !controls.open
    ) {
      // Y o triángulo permite continuar la ruta también desde la arena final.
      if (partida.estado === "victoria") salirDeVictoria();
      else void abrirCombate("farolero", true);
      return;
    }
    const start = pads.some((p) => !!p?.buttons[9]?.pressed);
    const flanco = start && !startAntes;
    startAntes = start;
    if (!flanco || controls.open || carta.abierta) return;
    if (pantalla === "playing") pausar();
    else if (pantalla === "paused") mostrar("playing");
    else if (pantalla === "menu") {
      // Start en el segundo mando significa que hay dos personas: el juego arranca en cooperativo.
      if (pads[1]?.buttons[9]?.pressed) modo(false);
      empezar();
    } else if (pantalla === "result") {
      if (partida.combate?.id === "farolero") accionPrincipal();
      else volverAlMuelle();
    } else if (pantalla === "derrota") void alMenu();
  }

  /** Texto de la esquina: qué hacer ahora contra el jefe. En el recorrido hablan las tarjetas (D-206). */
  function pintarIndicacion() {
    atajoPuesto.hidden = !partida.salidaVictoriaLista;
    if (partida.estado === "victoria") {
      const final = partida.combate?.id === "farolero";
      texto(atajoPuesto, t(final ? "salida.terminar" : "salida.atajo"));
      objetivo.hidden = false;
      texto(
        objetivo,
        t(final ? "salida.final" : "salida.arco", {
          victoria: t(final ? "farol.victoria" : "mirra.victoria"),
          premio: t("tienda.recompensa", {
            cantidad: textoMonedas(recompensa),
          }),
        }),
      );
      return;
    }
    if (partida.estado === "puesto") {
      objetivo.hidden = false;
      texto(objetivo, t("salida.camino"));
      return;
    }
    const c = partida.combate;
    const visible =
      c?.estado === "pelea" && (c.id !== "farolero" || segundosConR >= 0);
    objetivo.hidden = !visible; // tampoco queda el fondo vacío durante la caída o la presentación
    if (!visible || !c) return;
    if (segundosConR >= 0) {
      // Diez pasos visibles dan tiempo de soltar R sin perder la pelea actual.
      texto(
        objetivo,
        t("indicacion.reinicio", {
          porcentaje: Math.floor(segundosConR * 10) * 10,
        }),
      );
      return;
    }
    const accion = c.jefe.accion;
    const rito = avisoRitoActual(c); // leer la señal activa evita avisos cuando falla su colocación
    let clave = "indicacion.mirra";
    if (rito) clave = "indicacion." + rito;
    else if (
      accion?.tipo === "ataque" &&
      (accion.etapa === "telegrafia" ||
        accion.bloques.some((b) => b.zonas.some((z) => z.etapa === "aviso")))
    )
      clave = "indicacion." + accion.id;
    if (clave === "indicacion.pisoton" && c.w.players.some((p) => !p.alive))
      clave = "indicacion.pisotonSolo";
    const arena = c.arenaMirra;
    if (c.id === "mirra" && c.estado === "pelea") {
      const acido = arena.acido;
      if (acido) {
        const nombre = t(acido.objetivo === 0 ? "jugador.sael" : "jugador.odo");
        const accion =
          acido.etapa === "vuelo"
            ? "vuelo"
            : acido.cubreBarril
              ? "mantener"
              : "apuntar";
        texto(objetivo, t("acido." + accion, { nombre }));
        return;
      }
      if (arena.resultadoAcido || arena.barril) {
        texto(objetivo, t("acido." + (arena.resultadoAcido?.tipo ?? "mecha")));
        return;
      }
    }
    if (rito === "braseros") {
      texto(
        objetivo,
        t("indicacion.braseros", {
          color: t("brasero.color." + c.ritos.colorObjetivo),
          tiempo: Math.ceil(c.ritos.tiempo - 1e-8), // segundos de viaje que quedan, redondeados hacia arriba
        }),
      );
    } else {
      texto(
        objetivo,
        t(
          clave === "indicacion.braseros" || clave === "indicacion.acido"
            ? "indicacion.mirra"
            : clave,
        ),
      );
    }
  }

  /** Anuncia cada instrucción una vez. El reloj queda fuera de la región hablada. */
  function pintarFarol() {
    const c = partida.combate;
    const f = c?.farolero;
    farolHud.hidden = c?.estado !== "pelea" || !f;
    if (!c || !f || farolHud.hidden) return;
    const practica = f.vuelta === 1;
    const resuelto = f.etapa === "acierto" || f.etapa === "fallo";
    if (farolHud.dataset.etapa !== f.etapa) farolHud.dataset.etapa = f.etapa;
    texto(
      farolVuelta,
      t(practica ? "farol.practica" : "farol.vuelta", {
        vuelta: f.vuelta,
        aciertos: f.aciertos,
        meta: CONFIG.jefes.farolero.pruebas.aciertosVictoria,
      }),
    );
    texto(
      farolEstado,
      t("farol." + f.etapa, { gesto: t("farol.nombre." + f.tipo) }),
    );
    const soloEnPie = c.w.players.some((p) => !p.alive);
    let clave = "farol.accion." + f.tipo;
    if (resuelto)
      clave =
        f.etapa === "acierto"
          ? "farol.logro." + f.tipo
          : practica
            ? f.tipo === "prisma" && soloEnPie
              ? "farol.prismaSuperviviente"
              : "farol.pista." + f.tipo
            : "farol.error." + f.tipo;
    else if (f.tipo === "prisma" && soloEnPie)
      clave = "farol.prismaSuperviviente";
    texto(farolInstruccion, t(clave, { campana: f.paso + 1 }));
    farolReloj.hidden = resuelto;
    if (resuelto) return;
    farolPlazo.max = f.duracion;
    farolPlazo.value = Math.max(0, f.restante);
    texto(farolTiempo, t("farol.segundos", { tiempo: Math.ceil(f.restante) }));
  }

  /**
   * Cambio de escena del arco: cuando la pantalla ya está negra y la pradera cargó, se pasa a ella y se abre
   * durante el silencio (D-183). Cuenta en tiempo simulado de la partida: las capturas a paso fijo son fieles.
   */
  function revisarEscena() {
    const est = partida.estado;
    if (est === "puesto") {
      if (!vistaPuesto) void continuarAlPuesto(); // al cruzar el arco el flujo ya conservó los PV
      return;
    }
    if (est === "destino") {
      mostrar("result"); // la pareja llegó caminando al último tablón
      return;
    }
    if (est === "recorrido" || est === "caida") {
      // Caer los dos o reiniciar con T puede cancelar el arco cuando la pradera ya estaba visible.
      if (vistaRecorrido && vista !== vistaRecorrido) activar(vistaRecorrido);
      aperturaDesde = -1;
      return;
    }
    if (!vistaJefe) return;
    if (est === "arco" && partida.fundidoArco < 1) return;
    if (vista !== vistaJefe) {
      activar(vistaJefe);
      aperturaDesde = partida.t;
    }
    if (partida.combate && vistaRecorrido) {
      vistaRecorrido.dispose(); // solo la entrada efectiva al combate hace definitivo el cambio
      vistaRecorrido = null;
    }
  }

  /** Opacidad del fundido (0..1): baja a negro al cruzar el arco y se abre ya en la pradera. */
  function calcularFundido() {
    if (vista === vistaRecorrido) return partida.fundidoArco;
    if (aperturaDesde < 0) return 0;
    const A = CONFIG.ui.aperturaJefe;
    const k = A > 0 ? (partida.t - aperturaDesde) / A : 1;
    return Math.min(1, Math.max(0, 1 - k));
  }

  let pendiente = 0; // dt acumulado para el render
  /** @param {number} delta Segundos transcurridos. @param {number} [ms] Instante del cuadro real. */
  function cuadro(delta, ms) {
    const dt = Math.min(delta, CONFIG.sim.maxFrameDt); // el límite de física no ralentiza el gesto de R
    leerStart();
    if (carta.abierta) return; // leer la carta detiene la simulación y sus temporizadores
    // El resultado congela la simulación pero aún puede contar una pulsación nueva de R.
    if (
      pantalla !== "derrota" &&
      (pantalla !== "playing" || partida.combate?.estado !== "pelea")
    )
      soltarReinicio();
    if (segundosConR >= 0) {
      segundosConR =
        ms === undefined
          ? segundosConR + delta
          : Math.max(0, (ms - inicioR) / 1000);
      if (segundosConR >= 1 - Number.EPSILON) void repetirJefe(); // mostrar() consume la pulsación
    }
    if (pantalla === "playing") {
      partida.update(dt);
      repartir();
      revisarEscena();
    }
    audio.update(dt);
    pendiente += dt;
  }
  const puntoAviso = { x: 0, y: 0, visible: false }; // píxeles sobre la ventanilla
  function dibujar() {
    if (!vista || carta.abierta) return;
    // En pausa la escena se congela; en el menú el lobby sigue vivo de fondo.
    const dt = pantalla === "paused" ? 0 : pendiente;
    pendiente = 0;
    if (vistaRecorrido)
      vistaRecorrido.verMenu = pantalla === "menu" || pantalla === "cargando";
    // La cinemática solo en la primera presentación (D-211, D-213): el reintento usa la presentación corta.
    if (vistaJefe)
      vistaJefe.cinematica = partida.combate ? partida.cinematica : true;
    vista.sync(dt);
    hud?.update(dt);
    if (pantalla === "playing") {
      pintarIndicacion();
      pintarFarol();
      farolAjustes.hidden = partida.combate?.id !== "farolero";
    }
    vista.render();
    const salaTienda = tiendaAlAlcance();
    if (salaTienda) {
      const carro = salaTienda.carro;
      const techo = 2.75 * tienda.cfg.render.puesto.escala; // m sobre el suelo plano de la arena
      salaTienda.toScreen(carro.x, techo, carro.z, puntoAviso);
      carta.situarAviso(puntoAviso);
      if (letrero.hidden) mural.show(); // el diálogo del carro acompaña al vendedor
    } else {
      carta.ocultarAviso();
      if (!letrero.hidden) mural.hide();
    }
    const o = calcularFundido();
    if (o !== opacidadFundido) {
      opacidadFundido = o;
      fundido.style.opacity = o.toFixed(3);
    }
  }

  const timer = new THREE.Timer();
  renderer.setAnimationLoop((ms) => {
    timer.update(ms);
    cuadro(timer.getDelta(), ms); // el gesto usa tiempo real y la física limita su propio delta
    dibujar();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    pausar();
    texto(
      elemento("problem"),
      "Se perdió la conexión gráfica. Recarga la página para volver al templo.",
    );
    elemento("problem").hidden = false;
  });
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return pausar(); // la caché de navegación conserva la escena para «Volver»
    montaje++; // una carga que termine tras salir debe liberar su escena
    renderer.setAnimationLoop(null);
    vistaRecorrido?.dispose();
    vistaPuesto?.dispose();
    vistaJefe?.dispose();
    mural.dispose();
    hud?.dispose();
    input.dispose();
    audio.dispose();
    renderer.dispose();
  });

  /** Combate en curso (las utilidades de prueba de combate no hacen nada sin él). */
  const combate = () => partida.combate;

  // Interfaz de pruebas: estado de solo lectura y pasos deterministas.
  Object.defineProperty(window, "__game", {
    configurable: true,
    value: {
      ready: true,
      get pantalla() {
        return pantalla;
      },
      /** caida | recorrido | arco | jefe | victoria | puesto | destino */
      get etapa() {
        return partida.estado;
      },
      /** s simulados en la etapa actual. */
      get tEtapa() {
        return partida.tEstado;
      },
      /** Escena visible: recorrido, jefe, puesto o null durante la carga inicial. */
      get escena() {
        if (!vista) return null;
        if (vista === vistaPuesto) return "puesto";
        return vista === vistaJefe ? "jefe" : "recorrido";
      },
      get jefeCargado() {
        return partida.jefeCargado;
      },
      get fundido() {
        return opacidadFundido;
      },
      get cinematica() {
        return {
          partida: partida.cinematica,
          franjas: hud?.cinematica.valor ?? 0,
          armada: hud?.cinematica.armada ?? false,
        };
      },
      get tarjeta() {
        const a = hud?.tarjeta.actual;
        return a ? { clave: a.clave, saliendo: a.saliendo, e: a.e } : null;
      },
      get recorrido() {
        const r = partida.recorrido.estado;
        return {
          fase: r.fase,
          caidaK: r.caidaK,
          s: r.s,
          umbralCruzado: r.umbralCruzado,
          muneco: { ...r.muneco },
          enemigos: r.enemigos.map((e) => ({
            id: e.id,
            tipo: e.tipo,
            x: e.x,
            z: e.z,
            vivo: e.vivo,
          })),
        };
      },
      get state() {
        const c = combate();
        return {
          ...snapshot(partida.world),
          combate: c ? snapshotCombate(c) : null,
        };
      },
      get combate() {
        const c = combate();
        return c ? snapshotCombate(c) : null;
      },
      get eventos() {
        return recientes.slice();
      },
      get render() {
        return vista?.info ?? null;
      },
      get tienda() {
        const carro =
          partida.estado === "victoria" && vistaJefe?.puestoListo
            ? { ...vistaJefe.carro }
            : null;
        return { saldo: tienda.saldo, carro };
      },
      audio: audio.api,
      /** Detiene el bucle real y avanza `n` pasos fijos (pruebas reproducibles). */
      step(n = 1, dt = CONFIG.sim.fixedDt) {
        renderer.setAnimationLoop(null);
        for (let i = 0; i < n; i++) cuadro(dt);
        dibujar();
      },
      empezar,
      menu: () => alMenu(),
      pausar,
      continuar: () => mostrar("playing"),
      reiniciar,
      setInput: (/** @type {number} */ i, /** @type {any} */ v) =>
        input.setOverride(i, v),
      clearInput: () => {
        input.setOverride(0, null);
        input.setOverride(1, null);
      },
      // Recorrido (core/flujo.js): saltos deterministas para llegar rápido a cada parte.
      saltarCaida: () => {
        partida.saltarCaida();
        repartir();
      },
      colocarJugadores: (
        /** @type {number[]} */ sael,
        /** @type {number[]} */ odo,
        /** @type {number | undefined} */ face,
      ) => partida.colocarJugadores(sael, odo, face),
      irA: (/** @type {number} */ s) => {
        partida.irA(s);
        repartir();
      },
      cruzarArco: () => {
        partida.cruzarArco();
        repartir();
      },
      /** Entra al jefe en el acto (con cinemática); espera a que la pradera cargue. */
      async saltarAlJefe() {
        const jefe = jefeDirecto ?? CONFIG.recorrido.pasillo.jefe;
        await prepararJefe(jefe);
        partida.saltarAlJefe();
        repartir();
        revisarEscena();
      },
      /** Deja a los dos jugadores sin vida (prueba de la derrota). */
      matarJugadores: () => {
        aplicarDebugComun(partida.world, "killSael");
        aplicarDebugComun(partida.world, "killOdo");
      },
      saltarPresentacion: () => {
        const c = combate();
        if (c) saltarPresentacion(c);
      },
      setVidaJefe: (/** @type {number} */ hp) => {
        const c = combate();
        if (c) ponerVidaJefe(c, hp);
      },
      forzarAtaque: (/** @type {string} */ id) => {
        const c = combate();
        if (!c) return;
        forzarAtaque(c, id);
        repartir();
      },
      sinAtaques: (on = true) => {
        const c = combate();
        if (c) sinAtaques(c, on);
      },
      colocar: (
        /** @type {{ sael?: number[], odo?: number[], jefe?: number[] }} */ pos,
      ) => {
        const c = combate();
        if (c) return colocarParaPrueba(c, pos); // en la pradera también puede colocar a Mirra para probar un rito
        if (!pos.sael && !pos.odo) return;
        const [sael, odo] = partida.world.players;
        partida.colocarJugadores(
          pos.sael ?? [sael.x, sael.z],
          pos.odo ?? [odo.x, odo.z],
        );
      },
    },
  });

  modo(solo);
  mostrar("cargando");
  const inicial = await montarRecorrido();
  if (inicial) {
    activar(inicial);
    montarHud();
    mostrar("menu");
  }
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
