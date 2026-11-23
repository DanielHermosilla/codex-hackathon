// Motor de audio (WebAudio): contexto, buses con volumen (D-112), desbloqueo por gesto (autoplay),
// efectos zzfx cacheados como AudioBuffer (D-061) y silencios como duck con nombre sobre buses (D-183).
//
// Grafo:
//   destino ← master ← musicaVol ← musicaDuck ← (capas) · musicaDuck ← capaAltaDuck ← (capas altas)
//                    ← efectosVol ← efectosDuck ← (efectos)
//                                 ← ambienteDuck ← (ambiente)
//                                 ← blanco ← (avisos, golpe recibido)   ← nunca lo toca un silencio
//                                          ← cadena ← (zumbido, eslabones, cortes)  (ganancia = silencios.cadenaGanancia)
//                    ← vocesVol ← vocesDuck ← (voces: sin uso hasta que entren, D-117)
/// <reference path="./zzfx.d.ts" />
import {
  planSonido,
  busDeSonido,
  BUSES_SILENCIABLES,
  duracionesConocidas,
} from "./reglas.js";
import { mezclarPlan } from "./sintesis-efectos.js";

/** @typedef {ReturnType<typeof crearMotor>} Motor */
/** @typedef {(args: number[]) => ArrayLike<number>} ConstruirSamples zzfx.buildSamples con nuestro contexto. */
/** @typedef {{ volumen?: number, tono?: number, pan?: number, retraso?: number, duracion?: number | null, bucle?: boolean }} OpcionesSonido */
/** @typedef {{ src: AudioBufferSourceNode, g: GainNode, id: string, terminado: boolean, detener: (fadeS?: number) => void }} Voz Manejador de un efecto en marcha. */

const MAX_VOCES = 48; // técnico: tope de fuentes simultáneas (los blancos siempre entran)
const MAX_CACHE_AJUSTADOS = 96; // técnico: buffers de avisos estirados a una duración concreta
const MAX_EN_ESPERA = 8; // técnico: avisos guardados mientras carga zzfx
const MAX_ESPERA_S = 0.4; // técnico: un golpe sin duración que llega más tarde ya no se reproduce

// Carga zzfx usando NUESTRO contexto: zzfx crea un AudioContext al importarse; lo redirigimos para que
// no exista un segundo contexto (ni avisos de autoplay antes del gesto).
/**
 * @param {AudioContext} ctx
 * @returns {Promise<ConstruirSamples>}
 */
export async function cargarZzfx(ctx) {
  const G = /** @type {Record<string, any>} */ (globalThis);
  const Orig = G.AudioContext;
  G.AudioContext = function AudioContextZzfx() {
    return ctx;
  };
  let mod;
  try {
    mod = await import("zzfx");
  } finally {
    G.AudioContext = Orig;
  }
  const Z = mod.ZZFX;
  if (Z.audioContext !== ctx) {
    try {
      Z.audioContext?.close?.();
    } catch {
      /* ya cerrado */
    }
    Z.audioContext = ctx;
  }
  Z.sampleRate = ctx.sampleRate;
  return (args) => Z.buildSamples(...args);
}

/**
 * @param {{ cfg: import('./reglas.js').Cfg, crearContexto?: () => AudioContext, cargarSintesis?: (ctx: AudioContext) => Promise<ConstruirSamples> }} opts
 */
export function crearMotor(
  {
    cfg,
    crearContexto = () => new AudioContext({ latencyHint: "interactive" }),
    cargarSintesis = cargarZzfx,
  } = /** @type {any} */ ({}),
) {
  const A = cfg.audio;
  // Se asigna en desbloquear() (gesto del usuario); todo lo que lo usa corre después o protege con `!ctx`.
  let ctx = /** @type {AudioContext} */ (/** @type {unknown} */ (null));
  /** @type {'bloqueado' | 'activo' | 'cerrado'} */
  let estado = "bloqueado"; // bloqueado | activo | cerrado
  /** @type {ConstruirSamples | null} */
  let construir = null; // (args) => Float32Array (zzfx.buildSamples)
  /** @type {Promise<void> | null} */
  let listo = null; // promesa de carga de zzfx
  /** @type {Record<string, GainNode>} */
  const bus = {};
  /** @type {Map<string, AudioBuffer>} */
  const cache = new Map();
  /** @type {Map<string, AudioBuffer>} */
  const ajustados = new Map();
  /** @type {Set<Voz>} */
  const activos = new Set();
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  const temporizadores = new Set();
  /** @type {{ plan: import('./reglas.js').PlanSilencio, fin: number, onFin?: (plan: import('./reglas.js').PlanSilencio) => void } | null} */
  let silencio = null; // { plan, fin, onFin }
  /** @type {{ id: string, t: number, opts: Required<OpcionesSonido> }[]} */
  const enEspera = []; // sonidos blancos pedidos mientras zzfx carga
  // Al estar zzfx listo: suenan los avisos pendientes que aún tienen sentido, recortados a lo que les queda.
  function soltarEnEspera() {
    const ahora = ctx.currentTime;
    for (const p of enEspera.splice(0)) {
      const pasado = ahora - p.t - p.opts.retraso;
      if (p.opts.duracion != null) {
        if (pasado >= p.opts.duracion) continue;
        sonar(p.id, {
          ...p.opts,
          retraso: Math.max(0, -pasado),
          duracion: p.opts.duracion - Math.max(0, pasado),
        });
      } else if (pasado < MAX_ESPERA_S)
        sonar(p.id, { ...p.opts, retraso: Math.max(0, -pasado) });
    }
  }
  /** @type {Record<string, number>} */
  const vol = { ...A.volumen };

  /** @param {AudioParam} param @param {number} valor @param {number} [tau] */
  function rampa(param, valor, tau = A.rampaS) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(valor, t, Math.max(1e-3, tau));
  }
  /** @param {AudioParam} param @param {number} valor @param {number} dur */
  function lineal(param, valor, dur) {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(valor, t + Math.max(1e-3, dur));
  }

  function crearBuses() {
    /** @param {number} [v] */
    const g = (v = 1) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    bus.master = g(vol.master);
    bus.master.connect(ctx.destination);
    bus.musicaVol = g(vol.musica);
    bus.musicaVol.connect(bus.master);
    bus.musica = g();
    bus.musica.connect(bus.musicaVol);
    bus.capaAlta = g();
    bus.capaAlta.connect(bus.musica);
    bus.efectosVol = g(vol.efectos);
    bus.efectosVol.connect(bus.master);
    bus.efectos = g();
    bus.efectos.connect(bus.efectosVol);
    bus.ambiente = g();
    bus.ambiente.connect(bus.efectosVol);
    bus.blanco = g();
    bus.blanco.connect(bus.efectosVol);
    bus.cadena = g();
    bus.cadena.connect(bus.blanco);
    bus.vocesVol = g(vol.voces);
    bus.vocesVol.connect(bus.master);
    bus.voces = g();
    bus.voces.connect(bus.vocesVol);
  }

  // Se llama dentro del gesto del usuario (el contexto nace «running»). Idempotente.
  function desbloquear() {
    if (estado === "cerrado" || !A.activo) return null;
    if (!ctx) {
      ctx = crearContexto();
      crearBuses();
    }
    // Carga de zzfx; si falla, el próximo gesto la reintenta (regresión Codex).
    if (!construir && !listo) {
      listo = Promise.resolve()
        .then(() => cargarSintesis(ctx))
        .then((f) => {
          if (estado === "cerrado") return;
          construir = f;
          soltarEnEspera();
          precalentar();
        })
        .catch((e) => {
          listo = null;
          console.warn(
            "[audio] no se pudo cargar zzfx (se reintenta con el próximo gesto):",
            e?.message ?? e,
          );
        });
    }
    if (ctx.state === "suspended") ctx.resume?.().catch(() => {});
    estado = "activo";
    return listo;
  }

  // Genera los buffers en trozos (uno por tarea) para no trabar un frame: primero los fijos y después los
  // avisos estirados a las telegrafías conocidas (reglas.duracionesConocidas).
  function precalentar() {
    /** @type {[string, number | null][]} */
    const tareas = Object.keys(A.sfx)
      .filter(
        (id) => !A.sfx[id].capas.some((c) => c.ajuste || c.desdeFin != null),
      )
      .map((id) => [id, null]);
    tareas.push(...duracionesConocidas(cfg));
    const paso = () => {
      if (estado === "cerrado") return;
      const t = tareas.shift();
      if (!t) return;
      bufferDe(t[0], t[1]);
      programar(paso, 0);
    };
    programar(paso, 0);
  }
  /** @param {() => void} f @param {number} ms */
  function programar(f, ms) {
    const h = setTimeout(() => {
      temporizadores.delete(h);
      f();
    }, ms);
    temporizadores.add(h);
  }

  /** @param {string} id @param {number | null} duracion @returns {AudioBuffer | null} */
  function bufferDe(id, duracion) {
    const def = A.sfx[id];
    if (!def || !construir) return null;
    const estirable = def.capas.some((c) => c.ajuste || c.desdeFin != null);
    const d =
      estirable && duracion != null ? Math.round(duracion * 100) / 100 : null;
    const mapa = d != null ? ajustados : cache;
    const clave = d != null ? `${id}@${d}` : id;
    let b = mapa.get(clave);
    if (b) return b;
    // Mezcla pura y compartida con la herramienta de escucha y las pruebas (sintesis-efectos.js).
    const mezcla = mezclarPlan(
      planSonido(def, d),
      id,
      ctx.sampleRate,
      construir,
    );
    const sr = ctx.sampleRate;
    const n = mezcla.length;
    b = ctx.createBuffer(1, n, sr);
    b.getChannelData(0).set(mezcla);
    if (mapa === ajustados && ajustados.size >= MAX_CACHE_AJUSTADOS)
      ajustados.delete(/** @type {string} */ (ajustados.keys().next().value));
    mapa.set(clave, b);
    return b;
  }

  // Reproduce un efecto. Devuelve un manejador { detener(fadeS) } o null si no pudo sonar.
  /** @param {string} id @param {OpcionesSonido} [opciones] @returns {Voz | null} */
  function sonar(
    id,
    {
      volumen = 1,
      tono = 1,
      pan = 0,
      retraso = 0,
      duracion = null,
      bucle = false,
    } = {},
  ) {
    if (estado !== "activo" || !ctx) return null;
    const destino = bus[busDeSonido(cfg, id)];
    if (!destino) return null;
    if (
      activos.size >= MAX_VOCES &&
      destino !== bus.blanco &&
      destino !== bus.cadena
    )
      return null;
    if (!construir) {
      // zzfx aún cargando: los avisos y el golpe recibido esperan (no se pierden); el resto se descarta.
      if (destino === bus.blanco && enEspera.length < MAX_EN_ESPERA)
        enEspera.push({
          id,
          t: ctx.currentTime,
          opts: { volumen, tono, pan, retraso, duracion, bucle },
        });
      return null;
    }
    const buf = bufferDe(id, duracion);
    if (!buf) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = bucle;
    // `tonoFijo`: motivos afinados con la música; no cambian de tono entre Sael y Odo.
    src.playbackRate.value = A.sfx[id]?.tonoFijo ? 1 : tono;
    const g = ctx.createGain();
    g.gain.value = volumen;
    let p = null;
    if (pan && ctx.createStereoPanner) {
      p = ctx.createStereoPanner();
      p.pan.value = pan;
      src.connect(p);
      p.connect(g);
    } else src.connect(g);
    g.connect(destino);
    const h = /** @type {Voz} */ ({ src, g, id, terminado: false });
    const limpiar = () => {
      if (h.terminado) return;
      h.terminado = true;
      activos.delete(h);
      try {
        src.disconnect();
        g.disconnect();
        p?.disconnect();
      } catch {
        /* ya desconectado */
      }
    };
    src.onended = limpiar;
    h.detener = (fadeS = 0.04) => {
      if (h.terminado) return;
      const t = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + fadeS);
        src.stop(t + fadeS + 0.01);
      } catch {
        limpiar();
      }
    };
    activos.add(h);
    src.start(ctx.currentTime + Math.max(0, retraso));
    return h;
  }

  // ─── Silencios [D-183] ───
  // plan = planSilencio(...) sin omitir. onFin se llama una vez al terminar (o al romperlo antes).
  /** @param {import('./reglas.js').PlanSilencio} plan @param {(plan: import('./reglas.js').PlanSilencio) => void} [onFin] */
  function silenciar(plan, onFin) {
    if (estado !== "activo") return false;
    if (silencio) terminarSilencio(false); // uno nuevo reemplaza al anterior (sin su «rompeCon»)
    const S = A.silencios;
    for (const b of plan.buses)
      if (bus[b]) lineal(bus[b].gain, plan.nivel, plan.fadeOutS);
    lineal(bus.cadena.gain, S.cadenaGanancia, plan.fadeOutS);
    silencio = {
      plan,
      fin: ctx.currentTime + plan.fadeOutS + plan.duracionS, // Infinity = abierto: solo lo cierra romperSilencio / cancelarSilencio
      onFin,
    };
    return true;
  }
  function terminarSilencio(llamar = true) {
    const s = silencio;
    if (!s) return;
    silencio = null;
    for (const b of BUSES_SILENCIABLES)
      if (bus[b]) lineal(bus[b].gain, 1, s.plan.fadeInS);
    lineal(bus.cadena.gain, 1, s.plan.fadeInS);
    if (llamar) s.onFin?.(s.plan);
  }

  function update() {
    if (estado !== "activo" || !ctx) return;
    if (silencio && ctx.currentTime >= silencio.fin) terminarSilencio(true);
  }

  /** @param {string} nombre @param {number} v */
  function volumen(nombre, v) {
    const k = /** @type {Record<string, string>} */ ({
      master: "master",
      musica: "musicaVol",
      efectos: "efectosVol",
      voces: "vocesVol",
    })[nombre];
    if (!k) return;
    vol[nombre] = Math.max(0, Math.min(1, v));
    if (ctx) rampa(bus[k].gain, vol[nombre]);
  }

  function dispose() {
    if (estado === "cerrado") return;
    estado = "cerrado";
    for (const h of temporizadores) clearTimeout(h);
    temporizadores.clear();
    for (const h of [...activos]) {
      try {
        h.src.stop();
      } catch {
        /* no empezó */
      }
      try {
        h.src.disconnect();
        h.g.disconnect();
      } catch {
        /* */
      }
    }
    activos.clear();
    for (const n of Object.values(bus)) {
      try {
        n.disconnect();
      } catch {
        /* */
      }
    }
    cache.clear();
    ajustados.clear();
    enEspera.length = 0;
    silencio = null;
    ctx?.close?.().catch?.(() => {});
  }

  return {
    desbloquear,
    sonar,
    silenciar,
    update,
    volumen,
    dispose,
    romperSilencio: () => terminarSilencio(true),
    cancelarSilencio: () => terminarSilencio(false), // sin «rompeCon» (p. ej. reintento)
    get ctx() {
      return ctx;
    },
    get bus() {
      return bus;
    },
    get estado() {
      return estado;
    },
    get listo() {
      return !!construir;
    },
    get silencio() {
      return silencio
        ? {
            id: silencio.plan.id,
            buses: [...silencio.plan.buses],
            resta: Math.max(0, silencio.fin - ctx.currentTime),
          }
        : null;
    },
    get voces() {
      return activos.size;
    },
    get volumenes() {
      return { ...vol };
    },
    rampa,
    lineal,
  };
}
