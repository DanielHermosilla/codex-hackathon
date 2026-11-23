// Tarjetas del tutorial (D-206, D-207): mini animación en bucle de la mecánica, título corto, teclas o botones
// del dispositivo en uso y una línea de texto. Abajo al centro; entra deslizando y sale sola.
// No decide cuándo salen ni su orden: la cola y la separación entre tarjetas las lleva gameplay
// (CONFIG.recorrido.pasillo.tutorial/tarjeta). El HUD solo muestra lo que llega por
//   tutorial:mostrar {clave} · tutorial:ocultar {clave?}
// Si llega una tarjeta nueva con otra visible, la nueva la reemplaza al momento (gameplay ya las separa).
// Los fundidos y el bucle de la animación salen del tiempo de juego (`update(dt)`): las capturas a paso fijo
// son fieles. Las animaciones son keyframes CSS en pausa a las que se les fija el instante con la Web
// Animations API. Con movimiento reducido: un fotograma fijo y sin deslizamiento (solo fundido).
// Formas planas con los colores de Sael y Odo (D-142) y la cadena en bronce y oro (CONFIG.paleta.cadena).
import { t } from "../i18n/index.js";
import { iconosAccion } from "./hud-logica.js";

/** @typedef {import('./hud-logica.js').Config} Config */
/** @typedef {import('./hud-logica.js').EstadoDispositivo} EstadoDispositivo */
/** Tarjeta en pantalla: `t` s desde que entró, `s` s desde que empezó a salir, `e` 0..1 cuánto se ve. @typedef {{ clave: string, t: number, s: number, saliendo: boolean, e: number }} Tarjeta */
/** Estado de las tarjetas: la visible o null. @typedef {{ actual: Tarjeta | null }} EstadoTarjetas */
/** Tiempos en s: entrada y salida del deslizamiento y cuánto se ve antes de irse sola. @typedef {{ entrada: number, salida: number, duracion: number }} TiemposTarjeta */
/** Un icono de tecla o botón (de iconosAccion). @typedef {{ tipo: string, etiqueta: string, jugador: string | null }} Icono */
/** Iconos de un jugador ('sael' | 'odo') o comunes a los dos (null). @typedef {{ jugador: string | null, iconos: Icono[] }} GrupoTeclas */

// Animación de cada tarjeta. `periodo`: s que dura una vuelta del bucle (si lo cambias, cambia la velocidad de
// toda la mini animación). `quieto`: fracción del bucle que se muestra fija con movimiento reducido (se eligió el
// instante que mejor explica la mecánica). `accion`: qué teclas se muestran ('mover' | 'dash' | 'ancla').
/** @type {Record<string, { periodo: number, quieto: number, accion: string }>} */
export const TARJETAS = {
  mover: { periodo: 2.4, quieto: 0.25, accion: "mover" }, // los dos andando, a mitad del paseo
  cortar: { periodo: 3.4, quieto: 0.52, accion: "mover" }, // justo tras el corte: cadena tensa sobre el objetivo
  ancla: { periodo: 2.6, quieto: 0.3, accion: "ancla" }, // Odo a un tercio de la vuelta alrededor de Sael
  dash: { periodo: 2.4, quieto: 0.43, accion: "dash" }, // los dos dentro del ataque, con su rastro
  enredo: { periodo: 3.6, quieto: 0.76, accion: "mover" }, // la cadena ya enrollada y tensa
};
export const CLAVES_TARJETA = Object.keys(TARJETAS);

// Clave corta de tarjeta ('dash') a partir de la del evento ('dash' o 'tutorial.dash'); null si no es tarjeta.
/** @param {unknown} clave */
export function claveTarjeta(clave) {
  const c = String(clave ?? "").replace(/^tutorial\./, ""); // acepta la clave completa del aviso
  return c in TARJETAS ? c : null;
}

/** @returns {EstadoTarjetas} */
export const nuevasTarjetas = () => ({ actual: null });

// Aplica un evento del flujo. Devuelve true si la tarjeta lo atendió (si no, el aviso de texto puede usarlo).
/**
 * @param {EstadoTarjetas} est
 * @param {import('./hud-logica.js').EventoUI | null | undefined} ev
 */
export function aplicarEventoTarjeta(est, ev) {
  if (ev?.tipo === "tutorial:mostrar") {
    const c = claveTarjeta(ev.clave);
    if (!c) return false; // no es una de las cinco: se queda en el aviso de texto
    const a = est.actual;
    if (a && a.clave === c && !a.saliendo) return true; // la misma ya visible: no reinicia
    est.actual = { clave: c, t: 0, s: 0, saliendo: false, e: 0 }; // reemplaza a la anterior al momento
    return true;
  }
  if (ev?.tipo === "tutorial:ocultar") {
    const a = est.actual;
    if (!a) return false;
    // Sin clave oculta la que haya; con clave, solo si es esa (un ocultar atrasado no tapa a la siguiente).
    if (ev.clave != null && claveTarjeta(ev.clave) !== a.clave) return false;
    a.saliendo = true;
    return true;
  }
  return false;
}

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Avanza la tarjeta `dt` s. Se va sola al pasar `duracion` (cuenta desde que entró). `e` lleva la suavización
// (sale rápida al principio y frena al llegar): 0 = fuera, 1 = en su sitio. Devuelve est.
/**
 * @param {EstadoTarjetas} est
 * @param {number} dt
 * @param {TiemposTarjeta} T
 */
export function avanzarTarjeta(est, dt, T) {
  const a = est.actual;
  if (!a) return est;
  a.t += dt; // s visible
  if (a.saliendo) a.s += dt;
  else if (a.t >= T.duracion) {
    a.saliendo = true; // se va sola: no exige hacer la acción (D-206)
    a.s = a.t - T.duracion; // solo cuenta lo que pasó de la duración
  }
  if (a.saliendo && a.s >= T.salida) {
    est.actual = null; // terminó de salir
    return est;
  }
  const entra = T.entrada > 0 ? clamp01(a.t / T.entrada) : 1;
  const sale = a.saliendo && T.salida > 0 ? clamp01(a.s / T.salida) : 0;
  // Entrada con frenada (cúbica de salida) y salida que acelera (cúbica de entrada).
  a.e = (1 - (1 - entra) ** 3) * (1 - sale ** 3);
  return est;
}

// Tiempos de la tarjeta a partir de config: el deslizamiento usa los fundidos del aviso del tutorial y la
// duración la del recorrido (D-206, ~4 s).
/** @param {Config} cfg @returns {TiemposTarjeta} */
export const tiemposTarjeta = (cfg) => ({
  entrada: cfg.hud.tutorial.fundidoEntrada,
  salida: cfg.hud.tutorial.fundidoSalida,
  duracion: cfg.recorrido.pasillo.tarjeta.duracion,
});

// Instante del bucle (s) que se dibuja: el tiempo de la tarjeta dentro del periodo, o el fotograma fijo.
/** @param {string} clave @param {number} tiempo @param {boolean} reducir */
export function faseTarjeta(clave, tiempo, reducir) {
  const A = TARJETAS[clave];
  if (!A) return 0;
  if (reducir) return A.quieto * A.periodo; // fotograma fijo
  return ((tiempo % A.periodo) + A.periodo) % A.periodo; // siempre dentro de [0, periodo)
}

// Teclas de la tarjeta agrupadas por jugador. En coop, Sael y Odo lado a lado; si los dos comparten el mismo
// botón (dos mandos iguales) o en solo con el dash unificado, un solo grupo común (D-151, D-191).
/**
 * @param {string} clave
 * @param {EstadoDispositivo} disp
 * @param {boolean} solo
 * @param {Config} cfg
 * @returns {GrupoTeclas[]}
 */
export function gruposTeclas(clave, disp, solo, cfg) {
  const A = TARJETAS[clave];
  if (!A) return [];
  const iconos = iconosAccion(A.accion, { ...disp, solo }, cfg);
  /** @type {GrupoTeclas[]} */
  const out = [];
  for (const ic of iconos) {
    const g = out.find((x) => x.jugador === ic.jugador); // un grupo por jugador, en el orden Sael → Odo
    if (g) g.iconos.push(ic);
    else out.push({ jugador: ic.jugador, iconos: [ic] });
  }
  return out;
}

// ─── Dibujo ───
// Lienzo de 160 × 100 unidades. Jugadores = círculos de radio 7 con su color; cadena floja = eslabones
// punteados en bronce; cadena tensa = línea de oro con runas que pasan de apagadas a encendidas.
const SVG = {
  // Mover: los dos van y vienen juntos; la cadena floja los une.
  mover: `
<g class="tj-mv-par">
  <ellipse class="tj-sombra" cx="62" cy="60" rx="8" ry="2.5"/><ellipse class="tj-sombra" cx="98" cy="66" rx="8" ry="2.5"/>
  <path class="tj-floja" d="M62 50 Q80 68 98 56"/>
  <g class="tj-mv-paso1"><circle class="tj-sael" cx="62" cy="50" r="7"/></g>
  <g class="tj-mv-paso2"><circle class="tj-odo" cx="98" cy="56" r="7"/></g>
</g>`,
  // Tensar y cortar: se separan, la cadena se tensa (runas encendidas) y barre el objetivo, que recibe el corte.
  cortar: `
<g class="tj-escena tj-ct-escena">
  <g class="tj-ct-obj">
    <ellipse class="tj-sombra" cx="80" cy="67" rx="8" ry="2.4"/>
    <rect class="tj-objetivo" x="77.5" y="49" width="5" height="18" rx="1.5"/>
    <rect class="tj-objetivo" x="69" y="53" width="22" height="4" rx="2"/>
    <circle class="tj-objetivo" cx="80" cy="45" r="6"/>
  </g>
  <g class="tj-ct-par">
    <path class="tj-floja tj-ct-floja" d="M64 22 Q80 36 96 22"/>
    <g class="tj-ct-tensa"><line class="tj-tensa" x1="30" y1="22" x2="130" y2="22"/><line class="tj-runas tj-ct-runas" x1="30" y1="22" x2="130" y2="22"/></g>
    <g class="tj-ct-s"><circle class="tj-sael" cx="30" cy="22" r="7"/></g>
    <g class="tj-ct-o"><circle class="tj-odo" cx="130" cy="22" r="7"/></g>
  </g>
  <path class="tj-corte tj-ct-corte" d="M64 40 L96 58"/>
</g>`,
  // Ancla: Sael queda fijo (anillo de ancla) y Odo gira a su alrededor con la cadena tensa.
  ancla: `
<circle class="tj-orbita" cx="80" cy="50" r="34"/>
<g class="tj-an-giro">
  <path class="tj-estela tj-estela-odo" d="M97 20.6 A34 34 0 0 1 114 50"/>
  <line class="tj-tensa" x1="80" y1="50" x2="114" y2="50"/><line class="tj-runas on" x1="80" y1="50" x2="114" y2="50"/>
  <circle class="tj-odo" cx="114" cy="50" r="7"/>
</g>
<circle class="tj-ancla tj-an-anillo" cx="80" cy="50" r="12.5"/>
<circle class="tj-sael" cx="80" cy="50" r="7"/>`,
  // Dash: un ataque se avisa y golpea; los dos lo atraviesan con un dash y salen ilesos del otro lado.
  dash: `
<rect class="tj-zona tj-da-zona" x="70" y="10" width="22" height="80" rx="3"/>
<g class="tj-escena tj-da-escena">
  <g class="tj-da-fantasma">
    <circle class="tj-sael" cx="58" cy="36" r="7"/><circle class="tj-odo" cx="58" cy="64" r="7"/>
    <circle class="tj-sael" cx="88" cy="36" r="7"/><circle class="tj-odo" cx="88" cy="64" r="7"/>
  </g>
  <g class="tj-da-par">
    <g class="tj-da-rastro">
      <line class="tj-rastro-sael" x1="-4" y1="33" x2="20" y2="33"/><line class="tj-rastro-sael" x1="2" y1="39" x2="20" y2="39"/>
      <line class="tj-rastro-odo" x1="-4" y1="61" x2="20" y2="61"/><line class="tj-rastro-odo" x1="2" y1="67" x2="20" y2="67"/>
    </g>
    <path class="tj-floja" d="M30 36 Q38 50 30 64"/>
    <circle class="tj-sael" cx="30" cy="36" r="7"/><circle class="tj-odo" cx="30" cy="64" r="7"/>
  </g>
</g>`,
  // Enredo: Odo rodea una columna; la cadena se enrolla en ella y queda tensa (runas encendidas).
  // Geometría: columna en (88, 52), cadena enrollada a r = 11 y Odo a R = 34 del centro; la cadena sale tangente
  // a la columna (ángulo acos(11/34) ≈ 71° por delante del punto de contacto), por eso Odo empieza en (120.2, 41).
  enredo: `
<g class="tj-escena tj-en-escena">
  <ellipse class="tj-sombra" cx="88" cy="57" rx="12" ry="4"/>
  <circle class="tj-pilar" cx="88" cy="52" r="9"/>
  <line class="tj-tensa" x1="22" y1="41" x2="88" y2="41"/><line class="tj-runas tj-en-runas" x1="22" y1="41" x2="88" y2="41"/>
  <path class="tj-tensa tj-en-arco" d="M88 41 A11 11 0 0 1 99 52 A11 11 0 0 1 88 63 A11 11 0 0 1 77 52 A11 11 0 0 1 88 41"/>
  <g class="tj-en-giro">
    <line class="tj-tensa" x1="88" y1="41" x2="120.2" y2="41"/><line class="tj-runas tj-en-runas" x1="88" y1="41" x2="120.2" y2="41"/>
    <circle class="tj-odo" cx="120.2" cy="41" r="7"/>
  </g>
  <circle class="tj-sael" cx="22" cy="41" r="7"/>
</g>`,
};

// Keyframes en % del periodo de cada tarjeta. Las animaciones quedan en pausa: el instante lo fija update().
const CSS = `
.hud .tarjeta{position:absolute;left:50%;bottom:max(14px,4vh);width:min(500px,calc(100vw - 24px));box-sizing:border-box;
  display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:10px 14px 10px 10px;border-radius:12px;
  background:color-mix(in srgb,var(--fondo) 86%,transparent);
  box-shadow:0 0 0 1px color-mix(in srgb,var(--texto-suave) 30%,transparent),0 6px 22px color-mix(in srgb,var(--fondo) 55%,transparent);}
.hud .tarjeta.oculto{display:none;}
.hud .tarjeta .anim{display:block;width:clamp(112px,24vw,184px);height:auto;aspect-ratio:160/100;border-radius:8px;
  background:color-mix(in srgb,var(--texto) 9%,transparent);}
.hud .tarjeta .cuerpo{min-width:0;}
.hud .tarjeta .titulo{font-size:clamp(16px,1.5vw,21px);letter-spacing:.08em;text-transform:uppercase;line-height:1.15;}
.hud .tarjeta .teclas{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin:5px 0 4px;font-size:clamp(18px,1.6vw,22px);}
.hud .tarjeta .grupo{display:inline-flex;align-items:center;white-space:nowrap;}
.hud .tarjeta .quien{font:700 .6em/1 'Cinzel',Georgia,serif;letter-spacing:.06em;margin-right:.3em;}
.hud .tarjeta .quien.sael{color:var(--sael);}
.hud .tarjeta .quien.odo{color:var(--odo);}
.hud .tarjeta .linea{font-size:clamp(16px,1.4vw,19px);font-weight:500;line-height:1.2;color:var(--texto);}
.hud .tarjeta .anim *{animation-play-state:paused;animation-iteration-count:infinite;animation-fill-mode:both;
  animation-timing-function:linear;animation-duration:var(--periodo,2s);transform-box:view-box;}
.hud .tj-sael{fill:var(--sael);stroke:var(--fondo);stroke-width:1.5;}
.hud .tj-odo{fill:var(--odo);stroke:var(--fondo);stroke-width:1.5;}
.hud .tj-sombra{fill:var(--fondo);opacity:.4;}
.hud .tj-floja{fill:none;stroke:var(--cadena-bronce);stroke-width:3.2;stroke-linecap:round;stroke-dasharray:.1 4.2;}
.hud .tj-tensa{fill:none;stroke:var(--cadena-oro);stroke-width:2.6;stroke-linecap:round;}
.hud .tj-runas{fill:none;stroke:var(--runa-floja);stroke-width:2.6;stroke-linecap:round;stroke-dasharray:.1 6;}
.hud .tj-runas.on{stroke:var(--runa-tensa);}
.hud .tj-objetivo{fill:var(--objetivo);}
.hud .tj-corte{fill:none;stroke:var(--runa-tensa);stroke-width:3;stroke-linecap:round;stroke-dasharray:40 40;}
.hud .tj-orbita{fill:none;stroke:var(--texto-suave);stroke-opacity:.4;stroke-width:1;stroke-dasharray:2 4;}
.hud .tj-estela{fill:none;stroke-width:5;stroke-linecap:round;opacity:.35;}
.hud .tj-estela-odo{stroke:var(--odo);}
.hud .tj-ancla{fill:none;stroke:var(--sael);stroke-width:2;stroke-dasharray:3.5 2.5;}
.hud .tj-zona{fill:var(--aviso);}
.hud .tj-rastro-sael,.hud .tj-rastro-odo{stroke-width:2;stroke-linecap:round;}
.hud .tj-rastro-sael{stroke:var(--sael);}
.hud .tj-rastro-odo{stroke:var(--odo);}
.hud .tj-pilar{fill:var(--piedra);stroke:color-mix(in srgb,var(--piedra) 60%,var(--fondo));stroke-width:2;}

.hud .tj-escena{animation-name:tj-escena;}
@keyframes tj-escena{0%{opacity:0}5%{opacity:1}86%{opacity:1}95%,100%{opacity:0}}

.hud .tj-mv-par{animation-name:tj-mv-par;}
@keyframes tj-mv-par{0%,100%{transform:translateX(-26px);animation-timing-function:ease-in-out}50%{transform:translateX(26px);animation-timing-function:ease-in-out}}
.hud .tj-mv-paso1{animation-name:tj-mv-paso;}
.hud .tj-mv-paso2{animation-name:tj-mv-paso;animation-delay:calc(var(--periodo,2s) / -8);}
@keyframes tj-mv-paso{0%,25%,50%,75%,100%{transform:translateY(0)}12.5%,37.5%,62.5%,87.5%{transform:translateY(-2.5px)}}

.hud .tj-ct-s{animation-name:tj-ct-s;}
@keyframes tj-ct-s{0%,6%{transform:translateX(34px);animation-timing-function:ease-in-out}26%,100%{transform:translateX(0)}}
.hud .tj-ct-o{animation-name:tj-ct-o;}
@keyframes tj-ct-o{0%,6%{transform:translateX(-34px);animation-timing-function:ease-in-out}26%,100%{transform:translateX(0)}}
.hud .tj-ct-floja{animation-name:tj-ct-floja;transform-origin:80px 22px;}
@keyframes tj-ct-floja{0%,6%{opacity:1;transform:scaleX(1);animation-timing-function:ease-in-out}22%{opacity:0;transform:scaleX(2.6)}100%{opacity:0;transform:scaleX(2.6)}}
.hud .tj-ct-tensa{animation-name:tj-ct-tensa;transform-origin:80px 22px;}
@keyframes tj-ct-tensa{0%,6%{opacity:0;transform:scaleX(.34);animation-timing-function:ease-in-out}16%{opacity:.6}26%,100%{opacity:1;transform:scaleX(1)}}
.hud .tj-ct-runas{animation-name:tj-ct-runas;}
@keyframes tj-ct-runas{0%,22%{stroke:var(--runa-floja)}30%,100%{stroke:var(--runa-tensa)}}
.hud .tj-ct-par{animation-name:tj-ct-par;}
@keyframes tj-ct-par{0%,32%{transform:translateY(0);animation-timing-function:ease-in-out}62%,100%{transform:translateY(56px)}}
.hud .tj-ct-obj{animation-name:tj-ct-obj;transform-origin:80px 67px;}
@keyframes tj-ct-obj{0%,45%{transform:rotate(0)}50%{transform:rotate(-16deg)}58%{transform:rotate(7deg)}66%,100%{transform:rotate(0)}}
.hud .tj-ct-corte{animation-name:tj-ct-corte;}
@keyframes tj-ct-corte{0%,44%{opacity:0;stroke-dashoffset:40}45%{opacity:1;stroke-dashoffset:40}50%{opacity:1;stroke-dashoffset:0}74%{opacity:1;stroke-dashoffset:0}82%,100%{opacity:0;stroke-dashoffset:0}}

.hud .tj-an-giro{animation-name:tj-an-giro;transform-origin:80px 50px;}
@keyframes tj-an-giro{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
.hud .tj-an-anillo{animation-name:tj-an-anillo;}
@keyframes tj-an-anillo{0%,100%{opacity:1}50%{opacity:.45}}

.hud .tj-da-par{animation-name:tj-da-par;}
@keyframes tj-da-par{0%,30%{transform:translateX(0);animation-timing-function:cubic-bezier(.2,.8,.3,1)}44%,100%{transform:translateX(98px)}}
.hud .tj-da-zona{animation-name:tj-da-zona;}
@keyframes tj-da-zona{0%{opacity:0;fill:var(--aviso)}8%{opacity:.25;fill:var(--aviso)}33%{opacity:.5;fill:var(--aviso)}35%{opacity:var(--peligro-op);fill:var(--peligro)}
  54%{opacity:var(--peligro-op);fill:var(--peligro)}64%,100%{opacity:0;fill:var(--peligro)}}
.hud .tj-da-fantasma{animation-name:tj-da-fantasma;}
@keyframes tj-da-fantasma{0%,32%{opacity:0}36%{opacity:.45}58%,100%{opacity:0}}
.hud .tj-da-rastro{animation-name:tj-da-rastro;}
@keyframes tj-da-rastro{0%,30%{opacity:0}34%{opacity:1}48%{opacity:.8}56%,100%{opacity:0}}

.hud .tj-en-giro{animation-name:tj-en-giro;transform-origin:88px 52px;}
@keyframes tj-en-giro{0%,6%{transform:rotate(0);animation-timing-function:ease-in-out}70%,100%{transform:rotate(330deg)}}
.hud .tj-en-arco{animation-name:tj-en-arco;}
@keyframes tj-en-arco{0%,6%{stroke-dasharray:0 200;animation-timing-function:ease-in-out}70%,100%{stroke-dasharray:63.3 200}}
.hud .tj-en-runas{animation-name:tj-en-runas;}
@keyframes tj-en-runas{0%,66%{stroke:var(--runa-floja)}74%,100%{stroke:var(--runa-tensa)}}
`;
export const ESTILOS_TARJETAS = CSS;

/**
 * @param {object} deps
 * @param {Config} deps.cfg
 * @param {HTMLElement} deps.parent
 * @param {() => EstadoDispositivo} deps.dispositivo
 * @param {boolean} deps.solo
 * @param {() => boolean} [deps.reducir] movimiento reducido (fotograma fijo, sin deslizamiento)
 */
export function crearHudTarjetas({
  cfg,
  parent,
  dispositivo,
  solo,
  reducir = () => false,
}) {
  const est = nuevasTarjetas();
  const T = tiemposTarjeta(cfg);
  const el = document.createElement("div");
  el.className = "tarjeta oculto";
  el.setAttribute("role", "status"); // los lectores de pantalla leen el título y la línea al aparecer
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "anim");
  svg.setAttribute("viewBox", "0 0 160 100");
  svg.setAttribute("aria-hidden", "true");
  const cuerpo = document.createElement("div");
  cuerpo.className = "cuerpo";
  const titulo = document.createElement("div");
  titulo.className = "titulo";
  const teclas = document.createElement("div");
  teclas.className = "teclas";
  const linea = document.createElement("div");
  linea.className = "linea";
  cuerpo.append(titulo, teclas, linea);
  el.append(svg, cuerpo);
  parent.appendChild(el);

  let dibujada = ""; // clave cuyo dibujo está montado en el svg
  // Lo que hay pintado en las teclas: clave de la tarjeta y dispositivo y familia de cada jugador. Se compara
  // valor a valor (sin armar cadenas ni objetos) para no asignar memoria cada cuadro mientras la tarjeta se ve.
  let mandoCompartido = false;
  let teclasClave = ""; // "" = hay que repintar
  let dSael = "",
    dOdo = "",
    fSael = "",
    fOdo = "";
  /** @type {Animation[]} */
  let animaciones = []; // keyframes del dibujo actual (se piden una vez al montar)

  /** @param {string} clave */
  const montar = (clave) => {
    dibujada = clave;
    svg.innerHTML = SVG[/** @type {keyof typeof SVG} */ (clave)] ?? "";
    svg.style.setProperty("--periodo", `${TARJETAS[clave].periodo}s`);
    titulo.textContent = t(`tarjeta.${clave}.titulo`);
    linea.textContent = t(`tarjeta.${clave}.linea`);
    teclasClave = "";
    animaciones = []; // se piden cuando el elemento ya es visible (sin display:none no hay animaciones)
  };

  /** @param {string} clave */
  const pintaTeclas = (clave) => {
    const d = dispositivo();
    const d0 = d.dispositivo[0],
      d1 = d.dispositivo[1]; // por índice: desestructurar puede crear un iterador por cuadro
    const f0 = d.familia[0],
      f1 = d.familia[1];
    if (
      clave === teclasClave &&
      mandoCompartido === !!d.mandoCompartido &&
      d0 === dSael &&
      d1 === dOdo &&
      f0 === fSael &&
      f1 === fOdo
    )
      return; // nada cambió: las teclas pintadas siguen valiendo
    teclasClave = clave;
    mandoCompartido = !!d.mandoCompartido; // conectar otro mando cambia lo que hace cada stick
    dSael = d0;
    dOdo = d1;
    fSael = f0;
    fOdo = f1;
    teclas.textContent = "";
    const grupos = gruposTeclas(clave, d, solo, cfg);
    for (const g of grupos) {
      const ge = document.createElement("span");
      ge.className = "grupo";
      // En coop se nombra a cada uno; en solo los colores bastan (la misma persona maneja a los dos).
      if (!solo && g.jugador) {
        const q = document.createElement("span");
        q.className = `quien ${g.jugador}`;
        q.textContent = t(`jugador.${g.jugador}`);
        ge.append(q);
      }
      for (const ic of g.iconos) {
        const k = document.createElement("kbd");
        k.textContent = ic.etiqueta;
        k.className = [ic.tipo === "mando" ? "mando" : "", ic.jugador ?? ""]
          .filter(Boolean)
          .join(" ");
        ge.append(k);
      }
      teclas.append(ge);
    }
  };

  return {
    /** @param {import('./hud-logica.js').EventoUI | null | undefined} ev */
    alEvento: (ev) => aplicarEventoTarjeta(est, ev),
    /** @param {number} dt */
    update(dt) {
      avanzarTarjeta(est, dt, T);
      const a = est.actual;
      if (!a) {
        // Sin tarjeta: oculta (display:none por `.tarjeta.oculto`) y sin restos del último fundido, para que la
        // siguiente no arranque un cuadro con la opacidad y el desplazamiento de la anterior. Solo una vez.
        if (!el.classList.contains("oculto")) {
          el.classList.add("oculto");
          el.style.opacity = "0";
          el.style.transform = "";
        }
        return;
      }
      el.classList.remove("oculto");
      if (a.clave !== dibujada) montar(a.clave);
      pintaTeclas(a.clave);
      const quieto = reducir();
      // Deslizamiento desde abajo (en % del alto de la tarjeta) más fundido; con movimiento reducido, solo fundido.
      const y = quieto ? 0 : (1 - a.e) * 130;
      el.style.transform = `translate(-50%,${y.toFixed(1)}%)`;
      el.style.opacity = a.e.toFixed(3);
      if (!animaciones.length)
        animaciones = svg.getAnimations({ subtree: true });
      const ms = faseTarjeta(a.clave, a.t, quieto) * 1000; // instante del bucle, en ms
      for (const an of animaciones) an.currentTime = ms;
    },
    get estado() {
      return est;
    },
    dispose() {
      el.remove();
    },
  };
}
