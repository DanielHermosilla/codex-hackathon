// Audio del combate: une los eventos del gameplay (onEvento) y el estado (lectura, nunca escritura) con
// el motor, la cadena y la música. Arranca tras el primer gesto (autoplay). Ver docs/atados/diseno/gdd/07-audio.md.
//
// Eventos → acciones: reglas.accionesDeEvento. Lo continuo o lo que también dispara el debug (vida, caídas,
// revivir, dash, ancla, arrastre, corte, tensión) se lee del estado cada frame.
// Contrato para el flujo del pasillo: emitir `{tipo:'zona_entra', zona:'pasillo'}` y `{tipo:'silencio', motivo:'umbral'}`.
import { crearMotor } from "./motor.js";
import { crearSonidoCadena } from "./cadena.js";
import { crearMusica } from "./musica.js";
import {
  accionesDeEvento,
  accionRompe,
  planSilencio,
  eslabonesPorSeg,
  tensaCadena,
  corteSegunTension,
  panDe,
  intensidadObjetivo,
  suavizarIntensidad,
  zonaDeJefe,
  busDeSonido,
} from "./reglas.js";

const MAX_REGISTRO = 40;

/** @typedef {import('./reglas.js').Cfg} Cfg */
/** @typedef {import('./reglas.js').Accion} Accion */
/** @typedef {import('./motor.js').Voz} Voz */
/** @typedef {Record<string, any>} Combate Combate en curso del gameplay (solo lectura: `w`, `jefe`, `estado`, `ctx`...). */
/** @typedef {Record<string, any>} EventoCombate Evento del gameplay: `tipo` más sus campos. */
/** @typedef {{ c: Combate | null | undefined, hp: number[], vivo: boolean[], dash: boolean[], ancla: boolean[], total: number, hitstop: number, corteT: number, cortando: boolean, tensa: boolean, eslabon: number, eslabonK: number, intensidad: number }} Seguimiento */

/**
 * @param {{
 *   cfg: Cfg,
 *   getCombate: () => Combate | null | undefined,
 *   onEvento?: (oyente: (e: EventoCombate) => void) => (() => void) | void,
 *   avisosFarolero?: () => boolean,
 *   target?: EventTarget | null,
 *   motorOpts?: { crearContexto?: () => AudioContext, cargarSintesis?: (ctx: AudioContext) => Promise<import('./motor.js').ConstruirSamples> },
 * }} opciones
 */
export function conectarAudio({
  cfg,
  getCombate,
  onEvento,
  avisosFarolero = () => true,
  target = typeof window !== "undefined" ? window : null,
  motorOpts = {},
}) {
  const A = cfg.audio;
  const motor = crearMotor({ cfg, ...motorOpts });
  let cadena = /** @type {ReturnType<typeof crearSonidoCadena> | null} */ (
      null
    ),
    musica = /** @type {ReturnType<typeof crearMusica> | null} */ (null);
  /** @type {string | null} */
  let jefeId = null;
  /** @type {Set<string>} */
  const vistos = new Set(); // silencios soloPrimeraVez ya usados
  /** @type {string[]} */
  const temasPendientes = []; // temas que esperan a que termine el silencio
  /** @type {number | null} */
  let fasePendiente = null;
  /** @type {Map<string, Voz[]>} */
  const porAtaque = new Map(); // ataque → manejadores (avisos, golpes programados, bucles)
  /** @type {Record<string, any>[]} */
  const registro = []; // últimos sonidos (pruebas y ?dev)
  /** @type {{ zona: string | null, estado: string, fase: number }} */
  const logico = { zona: null, estado: "nada", fase: 1 }; // estado de música aunque el audio esté bloqueado
  /** @type {Seguimiento} */
  const tr = {
    c: null,
    hp: [0, 0],
    vivo: [true, true],
    dash: [false, false],
    ancla: [false, false],
    total: 0,
    hitstop: 0,
    corteT: 0,
    cortando: false,
    tensa: false,
    eslabon: 0,
    eslabonK: 0,
    intensidad: 0,
  };

  /** @param {string} tipo @param {string} id @param {Record<string, any>} [extra] */
  function anotar(tipo, id, extra) {
    registro.push({ tipo, id, t: motor.ctx?.currentTime ?? 0, ...extra });
    if (registro.length > MAX_REGISTRO) registro.shift();
  }
  /** @param {string} id @param {import('./motor.js').OpcionesSonido} [opts] */
  function sonar(id, opts = {}) {
    const h = motor.sonar(id, opts);
    anotar("sfx", id, {
      sono: !!h,
      bus: busDeSonido(cfg, id),
      silencio: motor.silencio?.id ?? null,
    });
    return h;
  }
  /** @param {string | undefined} ataque @param {Voz | null} h */
  function guardar(ataque, h) {
    if (!h || !ataque) return;
    let l = porAtaque.get(ataque);
    if (!l) porAtaque.set(ataque, (l = []));
    for (let i = l.length - 1; i >= 0; i--) if (l[i].terminado) l.splice(i, 1);
    l.push(h);
  }
  /** @param {string} ataque @param {boolean} [soloBucle] */
  function detener(ataque, soloBucle) {
    const l = porAtaque.get(ataque);
    if (!l) return;
    for (const h of l) if (!soloBucle || h.src.loop) h.detener(0.08);
    if (!soloBucle) porAtaque.delete(ataque);
  }

  // ─── Acciones ───
  /** @param {Accion} a */
  function ejecutar(a) {
    switch (a.tipo) {
      case "jefe":
        jefeId = a.jefe;
        break;
      case "musica":
        if (a.zona !== undefined && a.zona !== null) logico.zona = a.zona;
        if (a.estado) logico.estado = a.estado;
        if (a.fase) {
          logico.fase = a.fase;
          fasePendiente = null;
        }
        musica?.ponerEstado({
          zona: logico.zona,
          estado: logico.estado,
          fase: logico.fase,
        });
        break;
      case "faseMusica":
        fasePendiente = a.fase;
        break;
      case "faseMusicaPendiente":
        if (fasePendiente == null) break;
        logico.fase = fasePendiente;
        fasePendiente = null;
        if (a.golpe) sonar("faseGolpe");
        musica?.ponerEstado({ fase: logico.fase });
        break;
      case "sfx": {
        const h = sonar(a.id, {
          duracion: a.duracion ?? null,
          tono: a.tono ?? 1,
          retraso: a.retraso ?? 0,
          bucle: !!a.bucle,
        });
        guardar(a.ataque, h);
        break;
      }
      case "detener":
        detener(a.ataque, a.soloBucle);
        break;
      case "silencio":
        silencio(a.motivo);
        break;
      case "romperSilencio":
        if (motor.silencio) motor.romperSilencio();
        break;
      case "tema":
        if (motor.silencio) {
          if (!temasPendientes.includes(a.id)) temasPendientes.push(a.id);
        } else musica?.tema(a.id);
        anotar("tema", a.id);
        break;
      default:
        break;
    }
  }

  /** @param {string} motivo */
  function silencio(motivo) {
    const plan = planSilencio(cfg, motivo, vistos);
    if (plan.id) vistos.add(plan.id);
    anotar("silencio", plan.id ?? motivo, { omitido: plan.omitido });
    const rompe = () => {
      const r = accionRompe(cfg, plan.rompeCon, jefeId);
      if (r) ejecutar(r);
      while (temasPendientes.length)
        musica?.tema(/** @type {string} */ (temasPendientes.shift()));
    };
    if (plan.omitido) {
      if (plan.omitido !== "repetido") rompe();
      return;
    }
    if (!motor.silenciar(plan, rompe)) rompe();
  }

  // Combate nuevo (reintento, reinicio): nada del anterior sigue sonando ni en cola (regresión Codex:
  // el silencio de derrota y su tema se arrastraban a la presentación del reintento).
  function nuevoCombate() {
    for (const id of [...porAtaque.keys()]) detener(id, false);
    temasPendientes.length = 0;
    fasePendiente = null;
    motor.cancelarSilencio();
  }

  /** @param {EventoCombate} e */
  function onEv(e) {
    // Enemigos del pasillo: reutilizan sonidos del combate (CONFIG.audio.enemigos); sin música ni silencios.
    const sfxEnemigo =
      A.enemigos?.[/** @type {keyof typeof A.enemigos} */ (e.tipo)];
    if (sfxEnemigo) {
      if (motor.estado === "activo") sonar(sfxEnemigo);
      return;
    }
    const c = getCombate?.();
    if (e.tipo === "presentacion_inicio" || e.tipo === "zona_entra") {
      nuevoCombate(); // cierra el silencio abierto, los temas pendientes y los ataques de la sala anterior
      leerSinSonar(c); // el próximo cuadro ya reconoce este mundo y conserva el nuevo silencio del nombre
      if (e.tipo === "zona_entra") vistos.clear(); // una partida nueva vuelve a presentar el nombre por primera vez
    }
    if (e.tipo === "pasillo:reinicio") leerSinSonar(c); // la nueva vida del lobby no es una resurrección
    const tele = c?.ctx?.tele;
    const acciones = accionesDeEvento(
      cfg,
      e,
      e.tipo === "presentacion_inicio" ? e.jefe : jefeId,
      tele,
    );
    for (const a of acciones) {
      // El ajuste solo quita la señal sonora que precede el golpe del Farolero.
      if (
        c?.id === "farolero" &&
        a.tipo === "sfx" &&
        a.aviso &&
        !avisosFarolero()
      )
        continue;
      // Bloqueado: solo se sigue el estado lógico (para sincronizar al desbloquear), sin sonido.
      if (
        motor.estado !== "activo" &&
        !(a.tipo === "jefe" || a.tipo === "musica" || a.tipo === "faseMusica")
      )
        continue;
      ejecutar(a);
    }
  }
  const quitarOyente = onEvento?.(onEv);

  // ─── Desbloqueo por gesto ───
  const gesto = () => {
    if (motor.estado === "cerrado") return;
    motor.desbloquear();
    if (motor.estado !== "activo" || cadena) return;
    cadena = crearSonidoCadena(motor, cfg);
    musica = crearMusica(motor, cfg);
    sincronizar();
  };
  if (target && A.activo)
    for (const ev of A.desbloqueo)
      target.addEventListener(ev, gesto, { passive: true });
  const reanudar = () => {
    if (
      motor.ctx?.state === "suspended" &&
      document.visibilityState === "visible"
    )
      motor.ctx.resume().catch(() => {});
  };
  if (typeof document !== "undefined")
    document.addEventListener("visibilitychange", reanudar);

  // Al desbloquear a mitad de partida, la música toma el estado actual del combate.
  function sincronizar() {
    const c = getCombate?.();
    if (c?.id) {
      jefeId = c.id;
      const est =
        c.estado === "pelea"
          ? "pelea"
          : c.estado === "presentacion"
            ? "presentacion"
            : "nada";
      logico.zona = zonaDeJefe(cfg, c.id) ?? logico.zona;
      logico.estado = est;
      logico.fase = (c.jefe?.fase ?? 0) + 1;
    }
    /** @type {NonNullable<typeof musica>} */ (musica).ponerEstado({
      zona: logico.zona,
      estado: logico.estado,
      fase: logico.fase,
    });
    leerSinSonar(c);
  }

  // ─── Lectura del estado (cada frame) ───
  /** @param {Combate | null | undefined} c */
  function leerSinSonar(c) {
    tr.c = c;
    if (!c) return;
    const w = c.w;
    for (let i = 0; i < 2; i++) {
      const p = w.players[i];
      tr.hp[i] = p.hp;
      tr.vivo[i] = p.alive;
      tr.dash[i] = p.dashT > 0;
      tr.ancla[i] = p.anchored;
    }
    tr.total = w.dummy.total;
    tr.hitstop = w.hitstop;
    tr.cortando = false;
    tr.tensa = false;
  }

  /** @param {number} dt */
  function update(dt) {
    const c = getCombate?.();
    if (motor.estado !== "activo" || !cadena) {
      leerSinSonar(c);
      return;
    }
    motor.update();
    if (!c) {
      cadena.actualizar(0, 0, false);
      /** @type {NonNullable<typeof musica>} */ (musica).update();
      return;
    }
    if (c !== tr.c) {
      if (tr.c) nuevoCombate();
      leerSinSonar(c);
    } // reintento: combate nuevo
    const w = c.w;
    const [P0, P1] = w.players;
    const tono = A.jugadores.tono;

    // Jugadores: golpe recibido (blanco, nunca se calla), caída, revivir, dash, ancla.
    for (let i = 0; i < 2; i++) {
      const p = w.players[i];
      const pan = panDe(cfg, p.x);
      if (p.hp < tr.hp[i] - 1e-6)
        sonar("golpeRecibido", { pan, tono: tono[i] });
      if (tr.vivo[i] && !p.alive)
        sonar("muerteJugador", { pan, tono: tono[i] });
      if (!tr.vivo[i] && p.alive) sonar("revivir", { pan, tono: tono[i] });
      const dash = p.dashT > 0;
      if (dash && !tr.dash[i] && p.alive) sonar("dash", { pan, tono: tono[i] });
      if (p.anchored && !tr.ancla[i]) sonar("ancla", { pan, tono: tono[i] });
      else if (!p.anchored && tr.ancla[i] && p.alive)
        sonar("anclaSuelta", { pan, tono: tono[i] });
      tr.hp[i] = p.hp;
      tr.vivo[i] = p.alive;
      tr.dash[i] = dash;
      tr.ancla[i] = p.anchored;
    }

    // Cadena: zumbido por tensión, chasquido al tensarse, eslabones con la cadena floja, roce del cadáver.
    const tension = w.chain.tensionMax ?? w.chain.tension ?? 0;
    let arrastre = 0;
    for (let i = 0; i < 2; i++) {
      const muerto = w.players[1 - i];
      if (w.drag[i] && !muerto.alive)
        arrastre = Math.max(
          arrastre,
          Math.hypot(muerto.vx, muerto.vz) / A.cadena.arrastre.velRef,
        );
    }
    cadena.actualizar(tension, arrastre, true);
    const ts = tensaCadena(cfg, tension, tr.tensa);
    tr.tensa = ts.tensa;
    if (ts.chasquido)
      sonar(A.cadena.tensa.sonido, { pan: panDe(cfg, (P0.x + P1.x) / 2) });
    const vRel =
      Math.hypot(P0.vx - P1.vx, P0.vz - P1.vz) +
      (0.5 * (Math.hypot(P0.vx, P0.vz) + Math.hypot(P1.vx, P1.vz))) / 2;
    tr.eslabon +=
      eslabonesPorSeg(cfg, vRel, tension) * Math.min(dt, cfg.sim.maxFrameDt);
    if (tr.eslabon >= 1) {
      tr.eslabon -= Math.floor(tr.eslabon);
      const E = A.cadena.eslabones;
      sonar(E.sonidos[tr.eslabonK++ % E.sonidos.length], {
        volumen: E.volumen,
        pan: panDe(cfg, (P0.x + P1.x) / 2),
      });
    }

    // Corte al jefe [D-148]: intensidad por la tensión en el contacto; golpe fuerte con el hit-stop [D-166].
    const dmg = w.dummy.total - tr.total;
    tr.total = w.dummy.total;
    const ahora = motor.ctx.currentTime;
    if (dmg > 0) {
      if (!tr.cortando || ahora - tr.corteT >= A.corte.repetirS) {
        const k = corteSegunTension(cfg, w._contact?.maxT ?? tension);
        sonar(A.corte.sonido, {
          volumen: k.volumen,
          tono: k.tono,
          pan: panDe(cfg, w._contact?.x ?? c.jefe.x),
        });
        tr.corteT = ahora;
      }
      tr.cortando = true;
    } else tr.cortando = false;
    if (w.hitstop > 0 && tr.hitstop <= 0)
      sonar(A.corte.fuerte, { pan: panDe(cfg, c.jefe.x) });
    tr.hitstop = w.hitstop;

    // Intensidad de la música.
    if (c.estado === "pelea") {
      const vivos = w.players.filter(
        (/** @type {Record<string, any>} */ p) => p.alive,
      );
      const obj = intensidadObjetivo(cfg, {
        vidaJefe: c.jefe.hp / c.jefe.hpMax,
        atacando: c.jefe.accion?.tipo === "ataque",
        caidos: 2 - vivos.length,
        vidaMinJugador: vivos.length
          ? Math.min(
              ...vivos.map(
                (/** @type {Record<string, any>} */ p) =>
                  p.hp / c.cfg.player.maxHp,
              ),
            )
          : 0,
      });
      tr.intensidad = suavizarIntensidad(
        cfg,
        tr.intensidad,
        obj,
        Math.min(dt, cfg.sim.maxFrameDt),
      );
      /** @type {NonNullable<typeof musica>} */ (musica).ponerIntensidad(
        tr.intensidad,
      );
    }
    /** @type {NonNullable<typeof musica>} */ (musica).update();
  }

  function dispose() {
    if (target)
      for (const ev of A.desbloqueo) target.removeEventListener(ev, gesto);
    if (typeof document !== "undefined")
      document.removeEventListener("visibilitychange", reanudar);
    quitarOyente?.();
    for (const id of [...porAtaque.keys()]) detener(id, false);
    cadena?.dispose();
    musica?.dispose();
    cadena = null;
    musica = null;
    motor.dispose();
  }

  // API para pruebas y ?dev (window.__game.audio).
  const api = {
    get estado() {
      return motor.estado;
    },
    get listo() {
      return motor.listo;
    },
    get silencio() {
      return motor.silencio;
    },
    get musica() {
      return musica
        ? { ...musica.estado, capas: musica.capas }
        : { ...logico, bloqueado: true };
    },
    get registro() {
      return registro.slice();
    },
    get voces() {
      return motor.voces;
    },
    get volumenes() {
      return motor.volumenes;
    },
    desbloquear: gesto,
    /** @param {string} bus @param {number} v */
    volumen: (bus, v) => motor.volumen(bus, v),
    /** @param {boolean} on */
    placeholders: (on) => musica?.ponerPlaceholders(!!on),
    /** @param {string} z */
    zona: (z) => onEv({ tipo: "zona_entra", zona: z }),
    /** @param {EventoCombate} e */
    evento: (e) => onEv(e),
    /** @param {string} id @param {import('./motor.js').OpcionesSonido} [o] */
    sonar: (id, o) => sonar(id, o),
  };

  return { update, dispose, api, evento: onEv };
}
