// Reglas puras del audio (sin WebAudio ni DOM): mapeos, mezcla de capas, silencios y qué suena en cada evento.
// D-060 capas por zona/fase · D-062 cadena · D-106 aviso propio por ataque · D-183 silencios · D-112 volúmenes.

// Tipos compartidos del audio (los demás módulos los importan con `import('./reglas.js').X`).
/** @typedef {typeof import('../core/config.js').CONFIG} Config */
/** @typedef {Record<string, any>} CapaZzfx Capa zzfx: claves en español de ORDEN_ZZFX más `retraso`, `desdeFin` y `ajuste`. */
/** @typedef {{ categoria: string, bus?: string, capas: CapaZzfx[] }} DefSfx */
/** @typedef {{ rompeCon?: string | null, soloPrimeraVez?: boolean, habilitado: boolean, duracionMs: number | null, buses: string[], nivel?: number, fadeOutMs?: number, fadeInMs?: number }} MomentoSilencio */
/** @typedef {{ sinte: string, ganancia: number, estados: string[], patron?: number[], cada?: number, acordes?: number[][], porFase?: number[], faseMin?: number, faseMax?: number, intensidadMin?: number, intensidadAncho?: number, alta?: boolean }} CapaMusica */
/** @typedef {{ ganancia: number, estados: Record<string, number>, porFase?: number[] }} CompletaMusica */
/** @typedef {{ carpeta: string, completa?: CompletaMusica, bpm: number, raiz: number, escala: number[], capas: Record<string, CapaMusica> }} ZonaMusica */
/** @typedef {{ carpeta: string, sinte: string | null, ganancia: number, retrasoS?: number }} TemaMusica */
/** @typedef {Record<string, any>} Accion Acción de audio: `tipo` más sus campos (ver `accionesDeEvento`). */
/** @typedef {Record<string, any>} PlanSilencio Resultado de `planSilencio` (`omitido` null si el silencio se ejecuta). */
/**
 * Config del juego con los mapas dinámicos del audio indexables por cadena.
 * @typedef {Config & { jefes: Record<string, any>, audio: Config['audio'] & {
 *   sfx: Record<string, DefSfx>,
 *   avisos: Record<string, string>,
 *   jefes: Record<string, any>,
 *   silencios: Config['audio']['silencios'] & { motivos: Record<string, string>, momentos: Record<string, MomentoSilencio> },
 *   musica: Config['audio']['musica'] & { zonaPorJefe: Record<string, string>, zonas: Record<string, ZonaMusica>, temas: Record<string, TemaMusica> },
 * } }} Cfg
 */

// Orden de los parámetros de zzfx 1.4 (buildSamples). Las claves en español son las de CONFIG.audio.sfx.
export const ORDEN_ZZFX = [
  "volumen",
  "azar",
  "frecuencia",
  "ataque",
  "sostener",
  "soltar",
  "forma",
  "curva",
  "desliz",
  "deslizDelta",
  "salto",
  "saltoT",
  "repetir",
  "ruido",
  "modulacion",
  "crush",
  "eco",
  "volSostener",
  "caida",
  "tremolo",
  "filtro",
];
// Defaults de zzfx salvo `azar`: 0 para que el buffer sea determinista y se pueda cachear.
const DEF_ZZFX = {
  volumen: 1,
  azar: 0,
  frecuencia: 220,
  ataque: 0,
  sostener: 0,
  soltar: 0.1,
  forma: 0,
  curva: 1,
  desliz: 0,
  deslizDelta: 0,
  salto: 0,
  saltoT: 0,
  repetir: 0,
  ruido: 0,
  modulacion: 0,
  crush: 0,
  eco: 0,
  volSostener: 1,
  caida: 0,
  tremolo: 0,
  filtro: 0,
};

// Buses: `blanco` (avisos, golpe recibido, cadena) nunca lo toca un silencio [D-183].
export const BUSES_SILENCIABLES = [
  "musica",
  "capaAlta",
  "ambiente",
  "efectos",
  "voces",
];
const TODO = ["musica", "ambiente", "efectos", "voces"];

/** @param {number} x */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** @param {number} a @param {number} b @param {number} t */
const lerp = (a, b, t) => a + (b - a) * t;
/** @param {number} a @param {number} b @param {number} x */
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a || 1e-9));
  return t * t * (3 - 2 * t);
};

// Capa zzfx (objeto con claves en español) → array de argumentos de zzfx. `duracion` (s) estira la capa
// marcada con `ajuste` para que termine justo con la telegrafía.
/**
 * @param {CapaZzfx} capa
 * @param {number | null} [duracion]
 * @returns {number[]}
 */
export function zzfxArgs(capa, duracion = null) {
  /** @type {Record<string, any>} */
  const p = { ...DEF_ZZFX, ...capa };
  if (duracion != null && capa.ajuste) {
    if (capa.ajuste === "ataque")
      p.ataque = Math.max(0.01, duracion - p.sostener - p.soltar - p.caida);
    else p.sostener = Math.max(0, duracion - p.ataque - p.soltar - p.caida);
  }
  return ORDEN_ZZFX.map((k) => p[k]);
}

// Duración (s) de una capa ya resuelta (lo que zzfx genera).
/** @param {number[]} args */
export function duracionCapa(args) {
  const [, , , ataque, sostener, soltar, , , , , , , , , , , eco, , caida] =
    args;
  return ataque + caida + sostener + soltar + eco;
}

// Plan de mezcla de un sonido de varias capas: [{args, offset}] y largo total (s).
/**
 * @param {DefSfx} def
 * @param {number | null} [duracion]
 * @returns {{ capas: { args: number[], offset: number }[], largo: number }}
 */
export function planSonido(def, duracion = null) {
  /** @type {{ args: number[], offset: number }[]} */
  const capas = [];
  let largo = 0;
  for (const c of def.capas) {
    const args = zzfxArgs(c, duracion);
    let offset = c.retraso ?? 0;
    if (c.desdeFin != null && duracion != null)
      offset = Math.max(0, duracion - c.desdeFin);
    capas.push({ args, offset });
    largo = Math.max(largo, offset + duracionCapa(args));
  }
  return { capas, largo };
}

// ─── Buses ───
/** @param {Cfg} cfg @param {string} id */
export function esBlanco(cfg, id) {
  const def = cfg.audio.sfx[id];
  return !!def && cfg.audio.silencios.blancos.includes(def.categoria);
}
// Bus de salida de un sonido: 'cadena' (sub-bus del blanco con su propia ganancia de silencio), 'blanco' o 'efectos'.
/** @param {Cfg} cfg @param {string} id @returns {string} */
export function busDeSonido(cfg, id) {
  const def = cfg.audio.sfx[id];
  if (!def) return "efectos";
  if (def.categoria === "cadena" && esBlanco(cfg, id)) return "cadena";
  if (esBlanco(cfg, id)) return "blanco";
  return def.bus ?? "efectos";
}

// ─── Cadena [D-062] ───
// Tensión 0..1 → parámetros del zumbido. Continuo y monótono (D-068: sin umbral de daño).
/** @param {Cfg} cfg @param {number} tension */
export function tonoCadena(cfg, tension) {
  const Z = cfg.audio.cadena.zumbido;
  const t = Math.pow(clamp01(tension || 0), Z.curva);
  const [f0, f1] = Z.frecuencia;
  return {
    frecuencia: f0 * Math.pow(f1 / f0, t), // sube en escala musical (exponencial)
    ganancia: lerp(Z.ganancia[0], Z.ganancia[1], t),
    brillo: Z.brillo[0] * Math.pow(Z.brillo[1] / Z.brillo[0], t),
    tremoloHz: lerp(Z.tremolo.hz[0], Z.tremolo.hz[1], t),
    tremoloProf: lerp(Z.tremolo.profundidad[0], Z.tremolo.profundidad[1], t),
  };
}

// Eslabones que suenan por segundo: con la cadena floja y moviéndose. `vel` = m/s de los extremos.
/** @param {Cfg} cfg @param {number} vel @param {number} tension */
export function eslabonesPorSeg(cfg, vel, tension) {
  const E = cfg.audio.cadena.eslabones;
  if (tension >= E.tensionMax) return 0;
  const k = 1 - tension / E.tensionMax;
  return Math.min(E.maxPorSeg, Math.max(0, vel) * E.porMetro * k);
}

// Histéresis del chasquido de cadena tensa: devuelve { tensa, chasquido }.
/** @param {Cfg} cfg @param {number} tension @param {boolean} tensaAntes */
export function tensaCadena(cfg, tension, tensaAntes) {
  const T = cfg.audio.cadena.tensa;
  if (!tensaAntes && tension >= T.sube) return { tensa: true, chasquido: true };
  if (tensaAntes && tension <= T.baja)
    return { tensa: false, chasquido: false };
  return { tensa: tensaAntes, chasquido: false };
}

// Corte al jefe: volumen y tono según la tensión en el contacto.
/** @param {Cfg} cfg @param {number} tension */
export function corteSegunTension(cfg, tension) {
  const C = cfg.audio.corte;
  const t = clamp01(tension || 0);
  return {
    volumen: lerp(C.volumen[0], C.volumen[1], t),
    tono: lerp(C.tono[0], C.tono[1], t),
  };
}

// Pan estéreo por posición x en el mundo (la cámara mira a -z: x del mundo = x de pantalla).
/** @param {Cfg} cfg @param {number} x */
export function panDe(cfg, x) {
  const P = cfg.audio.pan;
  return Math.max(-1, Math.min(1, x / P.ancho)) * P.max;
}

// ─── Música por capas [D-060] ───
// Estados de música: 'pasillo' | 'presentacion' | 'pelea' | 'victoria' | 'derrota' | 'nada'.
/**
 * @param {Cfg} cfg
 * @param {string} zona
 * @param {{ estado?: string, fase?: number, intensidad?: number }} [st]
 * @returns {Record<string, number>}
 */
export function mezclaCapas(
  cfg,
  zona,
  { estado, fase = 1, intensidad = 0 } = {},
) {
  const Z = cfg.audio.musica.zonas[zona];
  /** @type {Record<string, number>} */
  const out = {};
  if (!Z) return out;
  for (const [id, c] of Object.entries(Z.capas)) {
    let g = 0;
    if (
      c.estados.includes(/** @type {string} */ (estado)) &&
      fase >= (c.faseMin ?? 1) &&
      fase <= (c.faseMax ?? Infinity)
    ) {
      g = c.ganancia;
      if (c.porFase)
        g *= c.porFase[Math.min(c.porFase.length, Math.max(1, fase)) - 1];
      if (c.intensidadMin != null)
        g *= smooth(
          c.intensidadMin,
          c.intensidadMin + (c.intensidadAncho ?? 0.2),
          intensidad,
        );
    }
    out[id] = g;
  }
  return out;
}

// Ganancia de la «pista completa» de una zona (cuando no hay stems por capa): sigue al estado y la fase.
/** @param {Cfg} cfg @param {string} zona @param {{ estado?: string, fase?: number }} [st] */
export function gananciaCompleta(cfg, zona, { estado, fase = 1 } = {}) {
  const C = cfg.audio.musica.zonas[zona]?.completa;
  if (!C) return 0;
  const pf = C.porFase
    ? C.porFase[Math.min(C.porFase.length, Math.max(1, fase)) - 1]
    : 1;
  return C.ganancia * (C.estados[/** @type {string} */ (estado)] ?? 0) * pf;
}

// Intensidad objetivo del combate (0..1) a partir de una foto mínima.
// datos: { vidaJefe (0..1), atacando (bool), caidos (0..2), vidaMinJugador (0..1, de los vivos) }.
/** @param {Cfg} cfg @param {{ vidaJefe?: number, atacando?: boolean, caidos?: number, vidaMinJugador?: number }} [datos] */
export function intensidadObjetivo(
  cfg,
  { vidaJefe = 1, atacando = false, caidos = 0, vidaMinJugador = 1 } = {},
) {
  const I = cfg.audio.musica.intensidad;
  let x = (1 - clamp01(vidaJefe)) * I.porVidaJefe;
  if (atacando) x += I.porAtaque;
  if (caidos > 0) x += I.porCaido;
  if (vidaMinJugador < I.vidaBaja) x += I.porVidaBaja;
  return clamp01(x);
}

// Suavizado asimétrico (sube rápido, baja lento).
/** @param {Cfg} cfg @param {number} actual @param {number} objetivo @param {number} dt */
export function suavizarIntensidad(cfg, actual, objetivo, dt) {
  const I = cfg.audio.musica.intensidad;
  const tau = objetivo > actual ? I.subeS : I.bajaS;
  return (
    actual + (objetivo - actual) * (1 - Math.exp(-dt / Math.max(tau, 1e-3)))
  );
}

/** @param {Cfg} cfg @param {string} jefe @returns {string | null} */
export const zonaDeJefe = (cfg, jefe) =>
  cfg.audio.musica.zonaPorJefe[jefe] ?? null;

// ─── Silencios [D-183] ───
// Plan de un silencio para `motivo` (evento `silencio`). `vistos` = Set de ids ya usados (soloPrimeraVez).
// Devuelve { id, omitido, rompeCon, duracionS, buses, nivel, fadeOutS, fadeInS }. Nunca incluye 'blanco' ni 'cadena'.
// duracionS = Infinity si el momento no tiene duración (`duracionMs: null`): dura hasta que lo rompan.
/** @param {Cfg} cfg @param {string} motivo @param {Set<string>} [vistos] @returns {PlanSilencio} */
export function planSilencio(cfg, motivo, vistos = new Set()) {
  const S = cfg.audio.silencios;
  const id = S.motivos[motivo] ?? null;
  const M = id ? S.momentos[id] : null;
  if (!M) return { id, omitido: "desconocido", rompeCon: null };
  const base = { id, rompeCon: M.rompeCon ?? null };
  if (M.soloPrimeraVez && vistos.has(id))
    return { ...base, omitido: "repetido", rompeCon: null };
  if (!S.activo) return { ...base, omitido: "inactivo" };
  if (!M.habilitado) return { ...base, omitido: "deshabilitado" };
  /** @type {string[]} */
  const buses = [];
  for (const b of M.buses)
    for (const x of b === "todo" ? TODO : [b])
      if (BUSES_SILENCIABLES.includes(x) && !buses.includes(x)) buses.push(x);
  return {
    ...base,
    omitido: null,
    // duracionMs null = silencio abierto: no termina solo, lo cierra el gameplay (evento `silencio:fin`).
    duracionS: M.duracionMs == null ? Infinity : M.duracionMs / 1000,
    buses,
    nivel: clamp01(M.nivel ?? 0),
    fadeOutS: (M.fadeOutMs ?? S.fadeOutMs) / 1000,
    fadeInS: (M.fadeInMs ?? S.fadeInMs) / 1000,
  };
}

// ─── Eventos del combate → acciones de audio ───
// Acciones: {tipo:'sfx', id, duracion?, retraso?, aviso?, ataque?, bucle?, repetir?} | {tipo:'silencio', motivo}
// | {tipo:'musica', zona?, estado?} | {tipo:'faseMusica', fase} | {tipo:'tema', id} | {tipo:'detener', ataque}
// | {tipo:'romperSilencio'} | {tipo:'jefe', jefe}.
// `tele(v)` resuelve un tiempo de la ficha ({normal, dificil} o número) con la dificultad y el modo solo
// del combate (ctx.tele del gameplay); por defecto, `normal`.
/** @param {number | { normal?: number } | null | undefined} v */
const teleNormal = (v) => (typeof v === "number" ? v : (v?.normal ?? 0));
/** @param {Cfg['audio']} A @param {string} sonido */
const avisoDe = (A, sonido) =>
  A.avisos[sonido] && A.sfx[A.avisos[sonido]]
    ? A.avisos[sonido]
    : A.avisoGenerico;

/**
 * @param {Cfg} cfg
 * @param {Record<string, any>} e Evento del combate (`tipo` más sus campos).
 * @param {string | null} jefeId
 * @param {(v: any) => number} [tele]
 * @returns {Accion[]}
 */
export function accionesDeEvento(cfg, e, jefeId, tele = teleNormal) {
  const A = cfg.audio;
  const J = A.jefes[/** @type {string} */ (jefeId)] ?? null;
  switch (e.tipo) {
    case "presentacion_inicio":
      return [
        { tipo: "jefe", jefe: e.jefe },
        {
          tipo: "musica",
          zona: zonaDeJefe(cfg, e.jefe),
          estado: "presentacion",
          fase: 1,
        },
      ];
    case "zona_entra":
      return [
        {
          tipo: "musica",
          zona: e.zona,
          estado: e.estado ?? "pasillo",
          fase: 1,
        },
      ];
    case "silencio":
      return [{ tipo: "silencio", motivo: e.motivo }];
    case "silencio:fin":
      // El flujo cierra un silencio abierto (el del umbral, al entrar a la presentación o al cancelar el
      // arco). Romperlo ejecuta su `rompeCon` (null en el umbral) y suelta los temas en espera.
      return [{ tipo: "romperSilencio" }];
    case "pelea_inicio":
      return [
        { tipo: "musica", estado: "pelea" },
        { tipo: "sfx", id: "peleaInicio" },
      ];
    case "mirra_escupe":
      return [{ tipo: "sfx", id: "mirraSiega", tono: 0.78 }];
    case "mirra_barril":
      return [
        {
          tipo: "sfx",
          id: e.resultado === "apagado" ? "anclaSuelta" : "mirraHambre",
        },
      ];
    case "farol_aviso":
      return [{ tipo: "sfx", id: avisoDe(A, e.gesto), aviso: true }];
    case "farol_campana":
      // Las tres campanas forman una tríada ascendente en el orden de la ruta.
      return [
        { tipo: "sfx", id: "avisoCampanas", tono: [1, 1.25, 1.5][e.paso - 1] },
      ];
    case "farol_acierto":
      return [{ tipo: "sfx", id: "destello" }];
    case "telegrafia_inicio": {
      const out = [
        {
          tipo: "sfx",
          id: avisoDe(A, e.sonido),
          duracion: e.duracion ?? null,
          aviso: true,
          ataque: e.ataque,
        },
        { tipo: "faseMusicaPendiente" },
      ];
      if (A.silencios.cancelable) out.push({ tipo: "romperSilencio" });
      return out;
    }
    case "ataque_activo": {
      if (!J) return [];
      const g = J.golpes[e.ataque] ?? { sonido: J.golpeGenerico };
      const def =
        cfg.jefes[/** @type {string} */ (jefeId)]?.ataques?.[e.ataque];
      const bloque = def?.bloques?.[0] ?? {};
      /** @type {Accion} */
      const a = { tipo: "sfx", id: g.sonido, ataque: e.ataque };
      if (g.retrasoDe) a.retraso = bloque[g.retrasoDe] ?? 0; // tiempos físicos (vuelo): no cambian con la dificultad
      if (g.bucle) a.bucle = true;
      const out = [a];
      if (g.repetirDe) {
        // Segundo golpe con nuevo aviso (barrido de 2 vueltas): el peligro se vuelve a oír antes del daño.
        const t0 = (a.retraso ?? 0) + (bloque.activo ?? 0);
        const entre = tele(bloque[g.repetirDe]);
        out.push({
          tipo: "sfx",
          id: avisoDe(A, def?.sonido),
          duracion: entre,
          retraso: t0,
          aviso: true,
          ataque: e.ataque,
        });
        out.push({ ...a, retraso: t0 + entre });
      }
      return out;
    }
    case "ataque_fin":
      return [{ tipo: "detener", ataque: e.ataque, soloBucle: true }];
    case "accion_cancelada":
      return [{ tipo: "detener", ataque: e.accion, soloBucle: false }];
    case "transicion_inicio":
      return J
        ? [
            { tipo: "sfx", id: J.transicion },
            { tipo: "faseMusica", fase: (e.fase ?? 0) + 1 },
          ]
        : [];
    case "destello":
      return [{ tipo: "sfx", id: "destello" }];
    case "tambaleo":
      return J ? [{ tipo: "sfx", id: J.dolor }] : [];
    case "jefe_muere":
      return [
        { tipo: "sfx", id: A.corte.final },
        { tipo: "musica", estado: "nada" },
      ];
    case "victoria":
      return [
        { tipo: "musica", estado: "victoria" },
        { tipo: "tema", id: "victoria" },
      ];
    case "derrota":
      // Si hay silencio, el tema espera a que termine (el motor no repite un tema ya en cola).
      return [
        { tipo: "musica", estado: "derrota" },
        { tipo: "tema", id: "derrota" },
      ];
    default:
      return []; // burla: voces (recorte D-117). golpe_jugador / jugador_cae: se leen del estado (cubre debug).
  }
}

// Resuelve `rompeCon` de un silencio a una acción.
/** @param {Cfg} cfg @param {string | null | undefined} rompeCon @param {string | null} jefeId @returns {Accion | null} */
export function accionRompe(cfg, rompeCon, jefeId) {
  if (!rompeCon) return null;
  if (rompeCon === "musica:fase")
    return { tipo: "faseMusicaPendiente", golpe: true };
  if (rompeCon.startsWith("tema:"))
    return { tipo: "tema", id: rompeCon.slice(5) };
  if (rompeCon.startsWith("jefe:")) {
    const id =
      cfg.audio.jefes[/** @type {string} */ (jefeId)]?.[rompeCon.slice(5)];
    return id ? { tipo: "sfx", id } : null;
  }
  return cfg.audio.sfx[rompeCon] ? { tipo: "sfx", id: rompeCon } : null;
}
