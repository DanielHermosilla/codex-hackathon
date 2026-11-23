// Motor de audio, silencios y conexión con el combate real, con un AudioContext falso (node).
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearMotor } from "../../../src/atados/audio/motor.js";
import { crearMusica } from "../../../src/atados/audio/musica.js";
import { conectarAudio } from "../../../src/atados/audio/index.js";
import { planSilencio } from "../../../src/atados/audio/reglas.js";
import {
  crearCombate,
  pasoCombate,
  forzarAtaque,
  ponerVidaJefe,
  saltarPresentacion,
} from "../../../src/atados/gameplay/combate.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";
import {
  MockAudioContext,
  sintesisFalsa,
  objetivoFalso,
} from "./audio-mock.js";

const DT = CONFIG.sim.fixedDt;
const nuevoMotor = (cfg = CONFIG) => {
  let ctx = null;
  const m = crearMotor({
    cfg,
    crearContexto: () => (ctx = new MockAudioContext()),
    cargarSintesis: sintesisFalsa,
  });
  return { m, ctx: () => ctx };
};
const esperar = () => new Promise((r) => setTimeout(r, 0));

describe("motor", () => {
  it("nada suena ni se crea antes del gesto", () => {
    const { m, ctx } = nuevoMotor();
    expect(m.estado).toBe("bloqueado");
    expect(m.sonar("dash")).toBe(null);
    expect(ctx()).toBe(null);
  });
  it("desbloquea, crea buses con los volúmenes de ajustes y cambia volúmenes", async () => {
    const { m } = nuevoMotor();
    await m.desbloquear();
    expect(m.estado).toBe("activo");
    expect(m.bus.master.gain.value).toBe(CONFIG.audio.volumen.master);
    expect(m.bus.musicaVol.gain.value).toBe(CONFIG.audio.volumen.musica);
    expect(m.bus.vocesVol).toBeTruthy(); // bus de voces listo aunque no haya voces (D-117)
    m.volumen("efectos", 0.3);
    expect(m.bus.efectosVol.gain.value).toBeCloseTo(0.3);
    m.volumen("musica", 7);
    expect(m.bus.musicaVol.gain.value).toBe(1);
  });
  it("un silencio «todo» calla efectos y música, pero no el aviso ni la cadena", async () => {
    const { m, ctx } = nuevoMotor();
    await m.desbloquear();
    let rompio = 0;
    m.silenciar(planSilencio(CONFIG, "muerte_ambos"), () => rompio++);
    for (const b of ["musica", "efectos", "ambiente", "voces"])
      expect(m.bus[b].gain.value).toBe(0);
    expect(m.bus.blanco.gain.value).toBe(1);
    expect(m.bus.cadena.gain.value).toBe(CONFIG.audio.silencios.cadenaGanancia);
    const h = m.sonar("avisoHoz", { duracion: 1.2 });
    expect(h).toBeTruthy();
    expect([...h.g.salidas][0]).toBe(m.bus.blanco);
    ctx().avanzar(0.5);
    m.update();
    expect(rompio).toBe(0);
    ctx().avanzar(2);
    m.update();
    expect(rompio).toBe(1);
    expect(m.silencio).toBe(null);
    for (const b of ["musica", "efectos", "ambiente", "voces"])
      expect(m.bus[b].gain.value).toBe(1);
  });
  it("las fuentes se limpian al terminar y dispose no deja nodos", async () => {
    const { m, ctx } = nuevoMotor();
    await m.desbloquear();
    await esperar();
    await esperar();
    const base = ctx().vivos.size;
    for (let i = 0; i < 10; i++) m.sonar("dash");
    expect(m.voces).toBe(10);
    ctx().avanzar(5);
    expect(m.voces).toBe(0);
    expect(ctx().vivos.size).toBe(base);
    m.dispose();
    expect(ctx().cerrado).toBe(true);
    expect(ctx().vivos.size).toBe(1); // solo el destino
    expect(m.sonar("dash")).toBe(null);
  });
  it("un aviso pedido mientras carga zzfx suena al cargar, recortado (regresión Codex)", async () => {
    let soltar;
    let ctx;
    const m = crearMotor({
      cfg: CONFIG,
      crearContexto: () => (ctx = new MockAudioContext()),
      cargarSintesis: () =>
        new Promise((ok) => {
          soltar = ok;
        }),
    });
    const p = m.desbloquear();
    expect(m.sonar("avisoHoz", { duracion: 1.2 })).toBe(null);
    expect(m.sonar("dash")).toBe(null);
    ctx.avanzar(0.3);
    await esperar();
    soltar(sintesisFalsa());
    await p;
    expect(m.voces).toBe(1); // solo el aviso (blanco); el dash se descarta
  });
  it("si zzfx falla, el próximo gesto reintenta la carga (regresión Codex)", async () => {
    let n = 0;
    const m = crearMotor({
      cfg: CONFIG,
      crearContexto: () => new MockAudioContext(),
      cargarSintesis: () => {
        n++;
        if (n === 1) throw new Error("red");
        return sintesisFalsa();
      },
    });
    const warn = console.warn;
    console.warn = () => {};
    try {
      await m.desbloquear();
    } finally {
      console.warn = warn;
    }
    expect(m.listo).toBe(false);
    await m.desbloquear();
    expect(m.listo).toBe(true);
    expect(n).toBe(2);
  });
  it("el aviso estirado dura lo que la telegrafía", async () => {
    const { m } = nuevoMotor();
    await m.desbloquear();
    const h = m.sonar("avisoHoz", { duracion: 0.7 });
    expect(h.src.buffer.duration).toBeCloseTo(0.7, 2);
  });
});

describe("música", () => {
  it("cambia capas por estado y fase; crossfade entre zonas sin fugas", async () => {
    const { m, ctx } = nuevoMotor();
    await m.desbloquear();
    const mu = crearMusica(m, CONFIG, { indice: {} });
    mu.ponerEstado({ zona: "pasillo", estado: "pasillo" });
    expect(Object.keys(mu.capas).sort()).toEqual(["base", "folk"]);
    expect(mu.capas.folk.fuente).toBe("placeholder");
    for (let i = 0; i < 20; i++) {
      ctx().avanzar(0.1);
      mu.update();
    }
    mu.ponerEstado({ zona: "trigal", estado: "pelea", fase: 1 });
    expect(mu.capas.fase2.objetivo).toBe(0);
    mu.ponerEstado({ fase: 2 });
    expect(mu.capas.fase2.objetivo).toBeGreaterThan(0);
    expect(mu.estado.saliendo).toBe(1);
    for (let i = 0; i < 40; i++) {
      ctx().avanzar(0.1);
      mu.update();
    }
    expect(mu.estado.saliendo).toBe(0);
    mu.dispose();
  });
  it("pista completa reemplaza las capas; si falla la carga, vuelven los placeholders", async () => {
    const { m } = nuevoMotor();
    await m.desbloquear();
    const buf = m.ctx.createBuffer(1, 8000 * 4, 8000);
    const okMu = crearMusica(m, CONFIG, {
      indice: { mirra: { tema: "u" } },
      cargar: async () => buf,
    });
    okMu.ponerEstado({ zona: "trigal", estado: "pelea" });
    await esperar();
    expect(Object.keys(okMu.capas)).toEqual(["_completa"]);
    expect(okMu.capas._completa).toMatchObject({ fuente: "stem" });
    expect(okMu.capas._completa.objetivo).toBeGreaterThan(0);
    const malMu = crearMusica(m, CONFIG, {
      indice: { mirra: { tema: "u" } },
      cargar: async () => null,
    });
    malMu.ponerEstado({ zona: "trigal", estado: "pelea" });
    await esperar();
    await esperar();
    expect(malMu.capas.pulso.fuente).toBe("placeholder");
    expect(malMu.capas.pulso.objetivo).toBeGreaterThan(0);
  });
  it("tema de respaldo tras una carga fallida tardía dura entero (regresión Codex)", async () => {
    const { m, ctx } = nuevoMotor();
    await m.desbloquear();
    let fallar;
    const mu = crearMusica(m, CONFIG, {
      indice: { victoria: { f: "u" } },
      cargar: () =>
        new Promise((ok) => {
          fallar = () => ok(null);
        }),
    });
    mu.tema("victoria");
    ctx().avanzar(10);
    mu.update();
    fallar();
    await esperar();
    await esperar();
    mu.update();
    expect(mu.estado.temas).toContain("victoria");
    ctx().avanzar(2);
    mu.update();
    expect(mu.estado.temas).toContain("victoria");
    ctx().avanzar(3);
    mu.update();
    expect(mu.estado.temas).not.toContain("victoria");
  });
  it("placeholders apagables", async () => {
    const { m } = nuevoMotor();
    await m.desbloquear();
    const mu = crearMusica(m, CONFIG, { indice: {} });
    mu.ponerEstado({ zona: "trigal", estado: "pelea" });
    mu.ponerPlaceholders(false);
    expect(mu.capas.pulso.fuente).toBe("nada");
  });
});

describe("audio conectado al combate real", () => {
  function montar() {
    const cfg = structuredClone(CONFIG);
    cfg.feedback.hitstop.enabled = false;
    let c = crearCombate(cfg, { seed: 1 });
    const oyentes = new Set();
    const objetivo = objetivoFalso();
    let ctx = null;
    const audio = conectarAudio({
      cfg,
      getCombate: () => c,
      onEvento: (f) => {
        oyentes.add(f);
        return () => oyentes.delete(f);
      },
      target: objetivo,
      motorOpts: {
        crearContexto: () => (ctx = new MockAudioContext()),
        cargarSintesis: sintesisFalsa,
      },
    });
    const drenar = () => {
      for (const e of c.eventos) for (const f of oyentes) f(e);
      c.eventos.length = 0;
    };
    const paso = (n = 1, ins = [emptyInput(), emptyInput()]) => {
      for (let i = 0; i < n; i++) {
        pasoCombate(c, ins, DT);
        drenar();
        ctx?.avanzar(DT);
        audio.update(DT);
      }
    };
    return {
      cfg,
      audio,
      objetivo,
      paso,
      drenar,
      c: () => c,
      set: (x) => {
        c = x;
      },
      ctx: () => ctx,
      oyentes,
    };
  }
  const sfx = (audio) => audio.api.registro.filter((r) => r.tipo === "sfx");

  it("bloqueado hasta el gesto; luego sigue el estado del combate", async () => {
    const t = montar();
    t.paso(5);
    expect(t.audio.api.estado).toBe("bloqueado");
    expect(t.audio.api.registro).toEqual([]);
    t.objetivo.disparar("keydown");
    await esperar();
    expect(t.audio.api.estado).toBe("activo");
    expect(t.audio.api.musica).toMatchObject({
      zona: "trigal",
      estado: "presentacion",
    });
    t.audio.dispose();
    expect(t.objetivo.cuantos()).toBe(0);
    expect(t.oyentes.size).toBe(0);
  });

  it("cada ataque de Mirra suena con su aviso al empezar la telegrafía, también dentro de un silencio", async () => {
    const t = montar();
    t.objetivo.disparar("pointerdown");
    await esperar();
    saltarPresentacion(t.c());
    t.drenar();
    for (const id of Object.keys(CONFIG.jefes.mirra.ataques)) {
      t.audio.api.evento({ tipo: "silencio", motivo: "muerte_ambos" }); // silencio total forzado
      forzarAtaque(t.c(), id);
      t.drenar();
      const avisos = sfx(t.audio).filter(
        (r) =>
          r.id === t.cfg.audio.avisos[CONFIG.jefes.mirra.ataques[id].sonido],
      );
      expect(avisos.length, id).toBeGreaterThan(0);
      expect(avisos.at(-1)).toMatchObject({ sono: true, bus: "blanco" });
    }
  });

  it("golpe recibido, caída, revivir y dash se oyen leyendo el estado", async () => {
    const t = montar();
    t.objetivo.disparar("keydown");
    await esperar();
    saltarPresentacion(t.c());
    t.drenar();
    t.c().w.players[0].hp -= 10;
    t.paso(1);
    killPlayer(t.c().w.players[1]);
    t.paso(1);
    t.paso(1, [{ ...emptyInput(), dash: true }, emptyInput()]);
    const ids = sfx(t.audio).map((r) => r.id);
    for (const v of ["golpeRecibido", "muerteJugador", "dash"])
      expect(ids).toContain(v);
    expect(sfx(t.audio).find((r) => r.id === "golpeRecibido").bus).toBe(
      "blanco",
    );
    t.c().w.players[1].alive = true;
    t.c().w.players[1].hp = 100;
    t.paso(1);
    expect(sfx(t.audio).map((r) => r.id)).toContain("revivir");
  });

  it("cambio de fase: silencio de música y la capa nueva entra al romperlo", async () => {
    const t = montar();
    t.objetivo.disparar("keydown");
    await esperar();
    saltarPresentacion(t.c());
    t.drenar();
    ponerVidaJefe(t.c(), t.c().jefe.hpMax * 0.5);
    t.drenar();
    expect(t.audio.api.musica.fase).toBe(1); // pendiente hasta el silencio del destello
    t.paso(Math.round(1.8 / DT));
    const sil = t.audio.api.registro.find(
      (r) => r.tipo === "silencio" && r.id === "cambioFase",
    );
    expect(sil).toBeTruthy();
    t.paso(Math.round(1.5 / DT));
    expect(t.audio.api.musica.fase).toBe(2);
    expect(sfx(t.audio).map((r) => r.id)).toContain("faseGolpe");
  });

  it("golpe final: silencio, muerte del jefe y fanfarria después", async () => {
    const t = montar();
    t.objetivo.disparar("keydown");
    await esperar();
    saltarPresentacion(t.c());
    t.drenar();
    ponerVidaJefe(t.c(), 0);
    t.drenar();
    expect(t.audio.api.silencio?.id).toBe("golpeFinal");
    expect(sfx(t.audio).map((r) => r.id)).toContain("corteFinal");
    expect(sfx(t.audio).map((r) => r.id)).not.toContain("mirraMuerte");
    t.paso(Math.round(1.6 / DT));
    expect(sfx(t.audio).map((r) => r.id)).toContain("mirraMuerte");
    expect(t.audio.api.musica.temas).toContain("victoria");
  });

  it("reintento rápido durante el silencio de derrota: ni silencio ni tema de derrota en la partida nueva (regresión Codex)", async () => {
    const t = montar();
    t.objetivo.disparar("keydown");
    await esperar();
    saltarPresentacion(t.c());
    t.drenar();
    killPlayer(t.c().w.players[0]);
    killPlayer(t.c().w.players[1]);
    t.paso(1);
    expect(t.c().estado).toBe("derrota");
    expect(t.audio.api.silencio?.id).toBe("muerteAmbos");
    t.paso(Math.round(0.9 / DT));
    const nuevo = crearCombate(t.cfg, { seed: 1, primeraVez: false });
    t.set(nuevo);
    t.drenar();
    expect(t.audio.api.silencio).toBe(null);
    t.paso(Math.round(2 / DT));
    expect(t.audio.api.musica.temas).not.toContain("derrota");
    expect(t.audio.api.musica.estado).toBe("pelea"); // la presentación del reintento (1,6 s) ya pasó
  });

  it("el reintento no dispara sonidos de golpe/revivir por el cambio de combate", async () => {
    const t = montar();
    t.objetivo.disparar("keydown");
    await esperar();
    killPlayer(t.c().w.players[0]);
    t.paso(1);
    const n = sfx(t.audio).length;
    t.set(crearCombate(t.cfg, { seed: 1, primeraVez: false }));
    t.paso(1);
    expect(
      sfx(t.audio)
        .slice(n)
        .map((r) => r.id),
    ).not.toContain("revivir");
  });
});
