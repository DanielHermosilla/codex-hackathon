// Música adaptativa por etapas [D-060]: cada zona cambia con crossfade y puede usar un tema completo o capas.
// Si falta una pista, las capas de respaldo generan música por código (sintes.js); pistas.js descubre archivos.
// Temas de una vez (D-134): fanfarria de victoria y tema de derrota.
import { mezclaCapas, gananciaCompleta } from "./reglas.js";
import { crearSinte, crearTemaSinte } from "./sintes.js";
import {
  PISTAS,
  decodificarPista,
  resolverZona,
  resolverTema,
} from "./pistas.js";

const COMPLETA = "_completa";

/** @typedef {import('./reglas.js').Cfg} Cfg */
/** @typedef {import('./reglas.js').ZonaMusica} ZonaMusica */
/** @typedef {import('./reglas.js').CapaMusica} CapaMusica */
/** @typedef {import('./reglas.js').TemaMusica} TemaMusica */
/** @typedef {{ gain: GainNode, voz: import('./sintes.js').Sinte | null, stem: AudioBufferSourceNode | null, objetivo: number }} CapaGrupo */
/** @typedef {{ zona: string, t0: number, capas: Record<string, CapaGrupo>, vivo: boolean, completa: boolean }} Grupo */
/** @typedef {{ id: string, salida: GainNode, nodo: { dispose: () => void } | null, fin: number }} TemaEnCurso */

/**
 * @param {import('./motor.js').Motor} motor
 * @param {Cfg} cfg
 * @param {{ cargar?: (ctx: AudioContext, url: string) => Promise<AudioBuffer | null>, indice?: import('./pistas.js').IndicePistas }} [opciones]
 */
export function crearMusica(
  motor,
  cfg,
  { cargar = cargarBuffer, indice = PISTAS } = {},
) {
  const M = cfg.audio.musica;
  const ctx = motor.ctx;
  let placeholders = M.placeholders;
  /** @type {Grupo | null} */
  let grupo = null; // { zona, t0, capas: {id: {gain, voz, stem, objetivo}}, completa }
  /** @type {{ grupo: Grupo, fin: number }[]} */
  const saliendo = []; // grupos en fundido de salida: { grupo, fin }
  /** @type {TemaEnCurso[]} */
  const temas = []; // { id, nodo, fin }
  /** @type {Map<string, Promise<AudioBuffer | null>>} */
  const buffers = new Map(); // url → Promise<AudioBuffer|null>
  /** @type {{ zona: string | null, zonaBase: string | null, estado: string, fase: number, intensidad: number }} */
  const st = {
    zona: null,
    zonaBase: null,
    estado: "nada",
    fase: 1,
    intensidad: 0,
  };
  /** @type {{ id: string | null, t: number }} */
  let ultimoTema = { id: null, t: -1e9 };

  /** @param {string} url @returns {Promise<AudioBuffer | null>} */
  function cargarUrl(url) {
    if (!buffers.has(url))
      buffers.set(
        url,
        Promise.resolve(cargar(ctx, url)).catch(() => null),
      );
    return /** @type {Promise<AudioBuffer | null>} */ (buffers.get(url));
  }
  /** @param {Grupo} g @param {CapaGrupo} capa @param {string} url @param {() => void} siFalla */
  function stemEnBucle(g, capa, url, siFalla) {
    cargarUrl(url).then((buf) => {
      if (!g.vivo) return;
      if (!buf) {
        siFalla();
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const adelanto = Math.max(
        0,
        Math.min(M.zonas[g.zona].offsetS ?? 0, buf.duration - 0.01),
      );
      const largoBucle = Math.max(0.01, buf.duration - adelanto);
      src.loopStart = adelanto;
      src.loopEnd = buf.duration;
      src.connect(capa.gain);
      const ahora = ctx.currentTime;
      src.start(
        Math.max(ahora, g.t0),
        adelanto + (Math.max(0, ahora - g.t0) % largoBucle),
      ); // alineado al reloj del grupo
      capa.stem = src;
    });
  }
  /** @param {Grupo} g @param {string} id @param {AudioNode} destino @returns {CapaGrupo} */
  function nuevaCapa(g, id, destino) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(destino);
    return (g.capas[id] = { gain, voz: null, stem: null, objetivo: 0 });
  }

  /** @param {string} zona @returns {Grupo | null} */
  function crearGrupo(zona) {
    const Z = M.zonas[zona];
    if (!Z) return null;
    const t0 = ctx.currentTime + 0.05;
    /** @type {Grupo} */
    const g = { zona, t0, capas: {}, vivo: true, completa: false };
    const pistas = resolverZona(cfg, zona, indice);
    const placeholdersCapas = () => {
      for (const [id, C] of Object.entries(Z.capas)) {
        const capa =
          g.capas[id] ??
          nuevaCapa(g, id, C.alta ? motor.bus.capaAlta : motor.bus.musica);
        if (placeholders && !capa.voz) ponerSinte(capa, C, Z, t0);
      }
      aplicarMezcla(M.capaS);
    };
    if (pistas.completa) {
      g.completa = true;
      stemEnBucle(
        g,
        nuevaCapa(g, COMPLETA, motor.bus.musica),
        pistas.completa,
        () => {
          g.completa = false;
          placeholdersCapas();
        },
      );
      return g;
    }
    for (const [id, C] of Object.entries(Z.capas)) {
      const capa = nuevaCapa(
        g,
        id,
        C.alta ? motor.bus.capaAlta : motor.bus.musica,
      );
      if (pistas.capas[id])
        stemEnBucle(g, capa, pistas.capas[id], () => {
          if (placeholders) ponerSinte(capa, C, Z, t0);
        });
      else if (placeholders) ponerSinte(capa, C, Z, t0);
    }
    return g;
  }
  /** @param {CapaGrupo} capa @param {CapaMusica} C @param {ZonaMusica} Z @param {number} t0 */
  function ponerSinte(capa, C, Z, t0) {
    const v = crearSinte(ctx, C.sinte, Z, C, t0);
    if (!v) return;
    v.salida.connect(capa.gain);
    capa.voz = v;
  }
  /** @param {Grupo} g */
  function borrarGrupo(g) {
    g.vivo = false;
    for (const c of Object.values(g.capas)) {
      try {
        c.stem?.stop();
      } catch {
        /* */
      }
      try {
        c.stem?.disconnect();
      } catch {
        /* */
      }
      c.voz?.dispose();
      try {
        c.voz?.salida.disconnect();
      } catch {
        /* */
      }
      try {
        c.gain.disconnect();
      } catch {
        /* */
      }
    }
  }

  /** @param {number} [tau] */
  function aplicarMezcla(tau = M.capaS) {
    if (!grupo) return;
    const mezcla = grupo.completa
      ? { [COMPLETA]: gananciaCompleta(cfg, grupo.zona, st) }
      : mezclaCapas(cfg, grupo.zona, st);
    for (const [id, c] of Object.entries(grupo.capas)) {
      const v = mezcla[id] ?? 0;
      if (Math.abs(v - c.objetivo) < 4e-3 && !(v === 0 && c.objetivo !== 0))
        continue;
      c.objetivo = v;
      motor.lineal(c.gain.gain, v, tau);
    }
  }

  /** @param {string | null} zona */
  function ponerZona(zona) {
    if (zona === st.zona && grupo) return;
    st.zona = zona;
    if (grupo) {
      for (const c of Object.values(grupo.capas)) {
        c.objetivo = 0;
        motor.lineal(c.gain.gain, 0, M.crossfadeS);
      }
      saliendo.push({ grupo, fin: ctx.currentTime + M.crossfadeS + 0.1 });
    }
    grupo = M.activa && zona ? crearGrupo(zona) : null;
    aplicarMezcla(M.crossfadeS);
  }

  /** @param {{ zona?: string | null, estado?: string, fase?: number }} [e] */
  function ponerEstado({ zona, estado, fase } = {}) {
    if (estado != null) st.estado = estado;
    if (fase != null) st.fase = fase;
    if (zona !== undefined) st.zonaBase = zona;
    // La zona real sigue la fase; `zonaBase` conserva la identidad del jefe para el siguiente cambio.
    const zonasPorFase = /** @type {Record<string, Record<number, string>>} */ (
      M.zonaPorFase ?? {}
    );
    const porFase = st.zonaBase ? zonasPorFase[st.zonaBase]?.[st.fase] : null;
    const zonaActiva = porFase ?? st.zonaBase;
    if (zonaActiva !== st.zona) ponerZona(zonaActiva);
    const fin =
      st.estado === "victoria" ||
      st.estado === "derrota" ||
      st.estado === "nada";
    aplicarMezcla(fin ? M.finS : M.capaS);
    // Vuelve a sonar el juego (reintento, pasillo): los temas de una vez se apagan.
    if (!fin)
      for (const e of temas)
        if (e.fin > ctx.currentTime + M.finS) {
          motor.lineal(e.salida.gain, 0, M.finS);
          e.fin = ctx.currentTime + M.finS + 0.05;
        }
  }

  // Tema de una vez. Deduplica el mismo tema pedido dos veces seguidas (silencio + evento).
  /** @param {string} id @param {{ retraso?: number | null }} [opciones] */
  function tema(id, { retraso = null } = {}) {
    const T = M.temas[id];
    if (!T || !M.activa) return false;
    const ahora = ctx.currentTime;
    if (ultimoTema.id === id && ahora - ultimoTema.t < 3) return false;
    ultimoTema = { id, t: ahora };
    const t = ahora + (retraso ?? T.retrasoS ?? 0);
    const salida = ctx.createGain();
    salida.gain.value = T.ganancia;
    salida.connect(motor.bus.musica);
    const raiz = M.zonas[/** @type {string} */ (st.zona)]?.raiz ?? 146.83;
    const url = resolverTema(cfg, id, indice);
    /** @type {TemaEnCurso} */
    const entrada = { id, salida, nodo: null, fin: url ? Infinity : t + 8 };
    temas.push(entrada);
    if (url) {
      cargarUrl(url).then((buf) => {
        if (!temas.includes(entrada)) return;
        if (buf) {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(salida);
          src.start(Math.max(t, ctx.currentTime));
          entrada.nodo = {
            dispose: () => {
              try {
                src.stop();
              } catch {
                /* */
              }
              src.disconnect();
            },
          };
          entrada.fin = Math.max(t, ctx.currentTime) + buf.duration + 0.2;
        } else if (placeholders && T.sinte) sinteTema(entrada, T, raiz, t);
        else entrada.fin = 0;
      });
    } else if (placeholders && T.sinte) sinteTema(entrada, T, raiz, t);
    return true;
  }
  /** @param {TemaEnCurso} entrada @param {TemaMusica} T @param {number} raiz @param {number} t */
  function sinteTema(entrada, T, raiz, t) {
    const inicio = Math.max(t, ctx.currentTime); // un respaldo que llega tarde dura entero (regresión Codex)
    const n = crearTemaSinte(
      ctx,
      /** @type {string} */ (T.sinte),
      raiz,
      inicio,
    );
    if (!n) {
      entrada.fin = 0;
      return;
    }
    n.salida.connect(entrada.salida);
    entrada.nodo = n;
    entrada.fin = inicio + n.dur + 0.2;
  }
  /** @param {TemaEnCurso} e */
  function borrarTema(e) {
    e.nodo?.dispose();
    try {
      e.salida.disconnect();
    } catch {
      /* */
    }
  }

  function update() {
    const ahora = ctx.currentTime;
    const hasta = ahora + M.adelantoS;
    if (grupo)
      for (const c of Object.values(grupo.capas))
        if (c.voz && c.objetivo > 1e-3) c.voz.programar(ctx, hasta);
    for (const s of saliendo)
      if (s.fin > ahora)
        for (const c of Object.values(s.grupo.capas))
          c.voz?.programar(ctx, hasta);
    for (let i = saliendo.length - 1; i >= 0; i--)
      if (ahora >= saliendo[i].fin) {
        borrarGrupo(saliendo[i].grupo);
        saliendo.splice(i, 1);
      }
    for (let i = temas.length - 1; i >= 0; i--)
      if (ahora >= temas[i].fin) {
        borrarTema(temas[i]);
        temas.splice(i, 1);
      }
  }

  /** @param {boolean} on */
  function ponerPlaceholders(on) {
    if (placeholders === on) return;
    placeholders = on;
    const z = st.zona;
    st.zona = null;
    if (grupo) {
      saliendo.push({ grupo, fin: ctx.currentTime + 0.3 });
      for (const c of Object.values(grupo.capas))
        motor.lineal(c.gain.gain, 0, 0.25);
      grupo = null;
    }
    ponerZona(z);
  }

  function dispose() {
    if (grupo) borrarGrupo(grupo);
    grupo = null;
    for (const s of saliendo) borrarGrupo(s.grupo);
    saliendo.length = 0;
    for (const e of temas) borrarTema(e);
    temas.length = 0;
  }

  return {
    ponerZona,
    ponerEstado,
    tema,
    update,
    dispose,
    ponerPlaceholders,
    /** @param {number} i */
    ponerIntensidad(i) {
      st.intensidad = i;
      aplicarMezcla(M.capaS);
    },
    get estado() {
      return {
        ...st,
        placeholders,
        saliendo: saliendo.length,
        temas: temas.map((t) => t.id),
      };
    },
    get capas() {
      if (!grupo) return {};
      /** @type {Record<string, { objetivo: number, fuente: string }>} */
      const o = {};
      for (const [id, c] of Object.entries(grupo.capas))
        o[id] = {
          objetivo: c.objetivo,
          fuente: c.stem ? "stem" : c.voz ? "placeholder" : "nada",
        };
      return o;
    },
  };
}

/** @param {AudioContext} ctx @param {string} url @returns {Promise<AudioBuffer | null>} */
async function cargarBuffer(ctx, url) {
  try {
    return await decodificarPista(ctx, url);
  } catch (e) {
    console.warn(
      "[audio] no se pudo cargar",
      url,
      /** @type {Error} */ (e)?.message ?? e,
    );
    return null;
  }
}
