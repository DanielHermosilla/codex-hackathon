// Lógica pura del HUD (sin DOM ni three.js, con test): estado de los anillos, números de daño,
// iconos de tecla/botón según dispositivo, y estado de las indicaciones (tutorial y murales).
// D-063 HUD diegético · D-065 · D-142 colores de jugador · D-166 número de daño · D-102 textos por t().
import { mezclarHex } from "../render/paleta.js";
import { t } from "../i18n/index.js";

/** @typedef {typeof import('../core/config.js').CONFIG} Config */
/** @typedef {import('../gameplay/tipos.js').Mundo} Mundo */
/** @typedef {import('../gameplay/tipos.js').Combate} Combate */
/** Proyecta una posición de mundo a píxeles de la capa del HUD; rellena `out`. @typedef {(x: number, y: number, z: number, out: { x: number, y: number, visible: boolean }) => void} ToScreen */
/** Estado del dispositivo por jugador: `dispositivo` ('teclado' | 'mando') y `familia` de mando ('xbox' | 'ps'). @typedef {{ dispositivo: string[], familia: string[] }} EstadoDispositivo */
/** Pinta un texto con marcas {dash} {ancla} {mover} en `el`, con los iconos del dispositivo en uso. @typedef {(el: HTMLElement, texto: string, estado: { dispositivo?: string | string[], familia?: string | string[], solo?: boolean }) => void} RenderTexto */
/** Una indicación en pantalla (tutorial o mural) con su fundido. @typedef {{ clave: string, t: number, saliendo: boolean, s: number, o: number }} Aviso */
/** Estado de las indicaciones: la del tutorial y la del mural (o null si no hay). @typedef {{ tutorial: Aviso | null, mural: Aviso | null }} EstadoUI */
/** Evento de UI del flujo: `tipo` más `clave` (tutorial) o `id` (mural). @typedef {{ tipo?: string, clave?: any, id?: any }} EventoUI */

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** @param {Combate} c */
export function escudoVisible(c) {
  const e = c.ritos?.escudo;
  return c.id === "mirra" && c.estado === "pelea" && e && e.restante > 0
    ? e
    : null;
}

/** @param {number} n */
export const hexCss = (n) => `#${n.toString(16).padStart(6, "0")}`;

// Colores del HUD: todos salen de tokens de CONFIG.paleta (nunca hex sueltos). El rojo queda para peligro (D-188),
// así que la vida del jefe va en el ámbar de la Brasa (corrupción) y el texto en el tono de la Brasa pura.
/** @param {Config['paleta']} P */
export function coloresHud(P) {
  const C = P.corrupcion;
  return {
    texto: C.brasaPura,
    textoSuave: mezclarHex(C.brasaPura, C.costra, 0.4),
    fondo: C.costra,
    barra: C.veta,
    barraInv: mezclarHex(C.veta, C.costra, 0.65),
    estela: mezclarHex(C.veta, C.brasaPura, 0.55),
    destacado: C.esquirla,
    sael: P.jugadores.sael,
    odo: P.jugadores.odo,
  };
}

// ─── Anillo diegético (D-063) ───
// Estado de lectura del anillo de un jugador, a partir de su estado de simulación.
/**
 * @param {Mundo['players'][number]} p
 * @param {Config} cfg
 * @param {number} [tiempo]
 */
export function estadoAnillo(p, cfg, tiempo = 0) {
  const A = cfg.hud.anillo;
  const vida = clamp01(p.hp / cfg.player.maxHp);
  const vivo = !!p.alive;
  const dashProgreso =
    p.dashT > 0 ? 0 : clamp01(1 - p.dashCd / cfg.dash.cooldown);
  const vidaBaja = vivo && vida > 0 && vida <= A.vidaBaja;
  // Latido de la vida baja: onda entre pulsoMin y 1 (determinista por tiempo de simulación).
  const onda = 0.5 + 0.5 * Math.sin(2 * Math.PI * A.pulsoHz * tiempo);
  return {
    vivo,
    vida: vivo ? vida : 0,
    vidaBaja,
    pulso: vidaBaja ? A.pulsoMin + (1 - A.pulsoMin) * onda : 1,
    dashProgreso,
    dashEnCooldown: vivo && dashProgreso < 1,
    ancla: vivo && !!p.anchored,
  };
}

// Segmentos de un arco con `total` segmentos para una fracción: nunca desaparece mientras sea > 0.
/**
 * @param {number} frac
 * @param {number} total
 */
export function segmentosVisibles(frac, total) {
  if (!(frac > 0)) return 0;
  return Math.min(total, Math.max(1, Math.round(frac * total)));
}

// ─── Números de daño (D-166) ───
/** @param {number} v */
export const formatoNumero = (v) => String(Math.round(v));

/**
 * @param {number} valor
 * @param {Config['hud']['numeroDano']} N
 */
export function tamanoNumero(valor, N) {
  return Math.min(
    N.tamanoMax,
    N.tamanoMin + Math.sqrt(Math.max(0, valor)) * N.escala,
  );
}

// Estado del número a partir de `hit` del muñeco/jefe. null = no mostrar. `fuerte` = cruzó tensión alta.
/**
 * @param {Mundo['dummy']['hit']} hit
 * @param {Config} cfg
 */
export function datosNumero(hit, cfg) {
  const N = cfg.hud.numeroDano;
  if (!N.activo || !(hit.shown > 0) || hit.value < N.valorMin) return null;
  return {
    texto: formatoNumero(hit.value),
    tamano: tamanoNumero(hit.value, N),
    opacidad: hit.active
      ? 1
      : clamp01(hit.shown / cfg.feedback.damageNumber.linger),
    fuerte: hit.maxT >= cfg.feedback.hitstop.tension,
  };
}

// ─── Tiempos ───
/** @param {number} s */
export const formatoTiempo = (s) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Sube de 0 a 1 en `fundido` segundos a partir de `desde`.
/**
 * @param {number} t0
 * @param {number} desde
 * @param {number} fundido
 */
export function escalon(t0, desde, fundido) {
  if (fundido <= 0) return t0 >= desde ? 1 : 0;
  return clamp01((t0 - desde) / fundido);
}

// Estela de la barra de vida del jefe: sigue al valor real hacia abajo con la tasa dada; hacia arriba, de golpe.
/**
 * @param {number} estela
 * @param {number} vida
 * @param {number} dt
 * @param {number} tasa
 */
export function seguirVida(estela, vida, dt, tasa) {
  if (vida >= estela) return vida;
  return Math.max(vida, estela - tasa * dt);
}

// ─── Iconos de tecla / botón (D-151, D-112) ───
/** @type {Record<string, string>} */
const GLIFOS = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};
const NOMBRADAS = new Set([
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Enter",
  "NumpadEnter",
  "ControlLeft",
  "ControlRight",
  "Tab",
  "Escape",
]);

// KeyboardEvent.code → etiqueta corta. Las teclas con nombre salen del archivo de traducciones.
/** @param {string} code */
export function etiquetaTecla(code) {
  if (GLIFOS[code]) return GLIFOS[code];
  if (NOMBRADAS.has(code)) return t(`tecla.${code}`);
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return code.slice(6);
  return code;
}

/** @param {Config['controls']['keyboard']['sael']} m */
const etiquetaMover = (m) =>
  [m.up, m.left, m.down, m.right].map(etiquetaTecla).join("");

// Iconos de una acción ('dash' | 'ancla' | 'mover'). `dispositivo` = 'teclado' | 'mando' para los dos, o
// [dispositivoSael, dispositivoOdo] (partida mixta: uno con teclado y otro con mando).
// Devuelve [{ tipo: 'tecla' | 'mando', etiqueta, jugador: 'sael' | 'odo' | null }]. Si los dos usan mando,
// es un solo icono (el mismo botón para los dos); en solo, el dash es uno solo (D-016, D-120).
/**
 * @param {string} accion
 * @param {{ dispositivo?: string | string[], solo?: boolean, familia?: string | string[] }} estado
 * @param {Config} cfg
 */
export function iconosAccion(
  accion,
  { dispositivo = "teclado", solo = false, familia = "xbox" },
  cfg,
) {
  const ds = Array.isArray(dispositivo)
    ? dispositivo
    : [dispositivo, dispositivo];
  const fam = Array.isArray(familia) ? familia : [familia, familia];
  const K = cfg.controls.keyboard,
    G = cfg.controls.gamepad;
  const JUG = ["sael", "odo"];
  /** @param {number} i */
  const uno = (i) => {
    if (ds[i] === "mando") {
      if (accion === "mover")
        return {
          tipo: "mando",
          etiqueta: t("tecla.stickIzq"),
          jugador: JUG[i],
        };
      const idx = accion === "dash" ? G.dash : G.anchor;
      // Rótulos de botones por familia de mando; la de Xbox sirve para los mandos genéricos.
      const familias = /** @type {Record<string, string[]>} */ (cfg.hud.mando);
      const rotulos = familias[fam[i]] ?? familias.xbox;
      return {
        tipo: "mando",
        etiqueta: rotulos[idx] ?? `B${idx}`,
        jugador: JUG[i],
      };
    }
    const map = i === 0 ? K.sael : K.odo;
    const etiqueta =
      accion === "mover"
        ? etiquetaMover(map)
        : etiquetaTecla((accion === "dash" ? map.dash : map.anchor)[0]);
    return { tipo: "tecla", etiqueta, jugador: JUG[i] };
  };
  if (accion === "dash" && solo) {
    // Solo la tecla común hace dashear a los dos: el mando en solo está pendiente (CONFIG.controls.keyboard.soloDash),
    // y cada mando alimenta solo a su jugador, así que no se promete un botón que no funcionaría.
    return [
      { tipo: "tecla", etiqueta: etiquetaTecla(K.soloDash[0]), jugador: null },
    ];
  }
  const out = [uno(0), uno(1)];
  // Dos mandos de la misma familia: mismo botón, un solo icono.
  if (
    out[0].tipo === "mando" &&
    out[1].tipo === "mando" &&
    out[0].etiqueta === out[1].etiqueta
  )
    return [{ ...out[0], jugador: null }];
  return out;
}

// Familia de un mando por su `id` de la Gamepad API: 'ps' (PlayStation) o 'xbox' (por defecto y genérico).
// «Wireless Controller» a secas es como algunos navegadores nombran al DualShock/DualSense, pero «Xbox Wireless Controller» no.
export const familiaMando = (id = "") => {
  if (/xbox|045e/i.test(id)) return "xbox";
  return /054c|playstation|dualshock|dualsense|wireless controller/i.test(id)
    ? "ps"
    : "xbox";
};

// Último dispositivo usado: una tecla lo lleva a teclado, un botón o stick a mando; sin señal, se queda.
/**
 * @param {string} actual
 * @param {{ tecla?: boolean, mando?: boolean }} [senal]
 */
export function elegirDispositivo(
  actual,
  { tecla = false, mando = false } = {},
) {
  if (tecla) return "teclado";
  if (mando) return "mando";
  return actual;
}

// A qué jugador pertenece una tecla (0 = Sael, 1 = Odo); null si no es de ninguno. Las teclas de debug no cuentan.
/**
 * @param {string} code
 * @param {Config} cfg
 */
export function jugadorDeTecla(code, cfg) {
  const K = cfg.controls.keyboard;
  /** @param {Config['controls']['keyboard']['sael']} m */
  const de = (m) => [m.up, m.down, m.left, m.right, ...m.dash, ...m.anchor];
  if (de(K.sael).includes(code) || K.soloDash.includes(code)) return 0;
  if (de(K.odo).includes(code)) return 1;
  return null;
}

// Asignación estable mando → jugador por gamepad.index: la MISMA regla que core/input.js (desconectar uno
// no le pasa el control al otro; un mando nuevo ocupa el primer hueco libre). Devuelve el nuevo [slotSael, slotOdo].
/**
 * @param {(number | null)[]} slots
 * @param {readonly (Gamepad | null)[] | null | undefined} pads
 */
export function asignarMandos(slots, pads) {
  const out = [...slots];
  for (let i = 0; i < 2; i++)
    if (out[i] !== null && !pads?.[/** @type {number} */ (out[i])])
      out[i] = null;
  for (const pad of pads ?? []) {
    if (!pad || out.includes(pad.index)) continue;
    const libre = out.indexOf(null);
    if (libre >= 0) out[libre] = pad.index;
  }
  return out;
}

// ¿Este mando está haciendo algo que el juego lee? Mismo criterio que la entrada real (core/input.js):
// stick fuera de la zona muerta de config (norma de los dos ejes), dash, ancla por encima de su umbral u otro botón.
/**
 * @param {Gamepad | null | undefined} pad
 * @param {Config['controls']['gamepad']} G
 */
export function mandoActivo(pad, G) {
  if (!pad) return false;
  const ax = pad.axes[G.axisX] ?? 0,
    ay = pad.axes[G.axisY] ?? 0;
  if (Math.hypot(ax, ay) >= G.deadzone) return true;
  if (
    (pad.buttons[G.anchor]?.value ?? (pad.buttons[G.anchor]?.pressed ? 1 : 0)) >
    G.anchorThreshold
  )
    return true;
  return pad.buttons.some((b) => b.pressed);
}

// Parte un texto con marcas {dash} {ancla} {mover} en trozos de texto y acciones.
/** @param {string} texto */
export function partirTexto(texto) {
  const out = [];
  const re = /\{(dash|ancla|mover)\}/g;
  let i = 0,
    m;
  while ((m = re.exec(texto))) {
    if (m.index > i) out.push({ tipo: "texto", v: texto.slice(i, m.index) });
    out.push({ tipo: "accion", v: m[1] });
    i = m.index + m[0].length;
  }
  if (i < texto.length) out.push({ tipo: "texto", v: texto.slice(i) });
  return out;
}

// ─── Indicaciones: tutorial y murales ───
// Eventos (los emite el flujo del pasillo): tutorial:mostrar {clave} · tutorial:ocultar · mural:activar {id} · mural:ocultar.
export const EVENTOS_UI = [
  "tutorial:mostrar",
  "tutorial:ocultar",
  "mural:activar",
  "mural:ocultar",
];

/** @returns {EstadoUI} */
export const nuevoUI = () => ({ tutorial: null, mural: null });

// `clave` puede ser una clave completa ('tutorial.dash') o corta ('dash').
/** @param {string} clave */
export const claveTutorial = (clave) =>
  String(clave).includes(".") ? String(clave) : `tutorial.${clave}`;
/** @param {string} id */
export const claveMural = (id) =>
  String(id).includes(".") ? String(id) : `mural.${id}`;

/**
 * @param {Aviso | null} prev
 * @param {string} clave
 * @returns {Aviso}
 */
function entrar(prev, clave) {
  // Mismo texto ya visible: no reinicia el fundido.
  if (prev && prev.clave === clave && !prev.saliendo) return prev;
  return /** @type {Aviso} */ ({ clave, t: 0, saliendo: false, s: 0 }); // `o` lo fija avanzarUI
}

/**
 * @param {EstadoUI} ui
 * @param {EventoUI | null | undefined} ev
 */
export function aplicarEventoUI(ui, ev) {
  switch (ev?.tipo) {
    case "tutorial:mostrar":
      if (ev.clave != null)
        ui.tutorial = entrar(ui.tutorial, claveTutorial(ev.clave));
      break;
    case "tutorial:ocultar":
      if (ui.tutorial) ui.tutorial.saliendo = true;
      break;
    case "mural:activar":
      if (ev.id != null) ui.mural = entrar(ui.mural, claveMural(ev.id));
      break;
    case "mural:ocultar":
      if (ui.mural) ui.mural.saliendo = true;
      break;
    default:
  }
  return ui;
}

// Avanza los fundidos y la caducidad de los murales. Opacidad en `o` (0..1). Devuelve ui.
/**
 * @param {EstadoUI} ui
 * @param {number} dt
 * @param {Config} cfg
 */
export function avanzarUI(ui, dt, cfg) {
  /**
   * @param {Aviso | null} x
   * @param {number} entradaT
   * @param {number} salidaT
   * @param {number | null} duracion
   */
  const paso = (x, entradaT, salidaT, duracion) => {
    if (!x) return null;
    x.t += dt;
    if (x.saliendo) x.s += dt;
    else if (duracion != null && x.t >= duracion) {
      x.saliendo = true;
      x.s = x.t - duracion;
    } // solo cuenta lo que pasó de la duración
    if (x.saliendo && x.s >= salidaT) return null;
    const entra = entradaT > 0 ? clamp01(x.t / entradaT) : 1;
    const sale = x.saliendo ? 1 - clamp01(x.s / salidaT) : 1;
    x.o = entra * sale;
    return x;
  };
  const T = cfg.hud.tutorial,
    M = cfg.hud.mural;
  ui.tutorial = paso(ui.tutorial, T.fundidoEntrada, T.fundidoSalida, null);
  ui.mural = paso(ui.mural, M.fundidoEntrada, M.fundidoSalida, M.duracion);
  return ui;
}
