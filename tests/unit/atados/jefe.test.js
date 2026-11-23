import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";
import { createChain } from "../../../src/atados/gameplay/cadena.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";
import {
  crearCombate,
  pasoCombate,
  saltarPresentacion,
  reintentar,
  forzarAtaque,
  ponerVidaJefe,
  snapshotCombate,
} from "../../../src/atados/gameplay/combate.js";
import {
  registrarDano,
  cancelarAccion,
  elegirObjetivo,
  iniciarAtaque,
} from "../../../src/atados/gameplay/jefe.js";
import { BLOQUES, dentroZona } from "../../../src/atados/gameplay/bloques.js";
import { crearJuegoJefe } from "../../../src/atados/core/juego.js";

const DT = CONFIG.sim.fixedDt;
const cfgBase = () => {
  const c = structuredClone(CONFIG);
  c.feedback.hitstop.enabled = false;
  return c;
};
const inp = (o = {}) => ({ ...emptyInput(), ...o });
const quietos = () => [inp(), inp()];

function nuevo(opts = {}, cfg = cfgBase()) {
  const c = crearCombate(cfg, { seed: 1, ...opts });
  return c;
}
function correr(c, seg, fn = quietos) {
  const n = Math.round(seg / DT);
  for (let s = 0; s < n; s++) pasoCombate(c, fn(s * DT), DT);
}
// Coloca a los jugadores (y rehace la cadena recta entre ellos) sin pasar por la física.
function colocar(c, [ax, az], [bx, bz]) {
  const w = c.w;
  w.chain = createChain(ax, az, bx, bz, c.cfg);
  const [A, B] = w.players;
  Object.assign(A, { x: ax, z: az, px: ax, pz: az, vx: 0, vz: 0 });
  Object.assign(B, { x: bx, z: bz, px: bx, pz: bz, vx: 0, vz: 0 });
}
function colocarJefe(c, x, z) {
  c.jefe.x = x;
  c.jefe.z = z;
  c.w.dummy.x = x;
  c.w.dummy.z = z;
}
// Sin ataques espontáneos (para aislar una regla).
function sinAtaques(c) {
  c.jefe.pausa = 1e9;
}
const IDS = Object.keys(CONFIG.jefes.mirra.ataques);

describe("presentación (D-064, D-074, D-180)", () => {
  it("la primera vez es completa: el dash no la salta y el jefe es invulnerable", () => {
    const c = nuevo();
    expect(c.estado).toBe("presentacion");
    correr(c, 0.5, () => [inp({ dash: true }), inp()]);
    expect(c.estado).toBe("presentacion");
    expect(c.w.dummy.invulnerable).toBe(true);
    correr(c, CONFIG.jefes.comun.presentacion.primera);
    expect(c.estado).toBe("pelea");
    expect(c.eventos.some((e) => e.tipo === "pelea_inicio")).toBe(true);
  });

  it("en el reintento se salta con dash", () => {
    const c = reintentar(nuevo());
    expect(c.presentacion.saltable).toBe(true);
    // El dash que pidió el reintento sigue apretado: no salta; hay que soltar y volver a pulsar.
    pasoCombate(c, [inp({ dash: true }), inp()], DT);
    expect(c.estado).toBe("presentacion");
    pasoCombate(c, quietos(), DT);
    pasoCombate(c, [inp(), inp({ dash: true })], DT);
    expect(c.estado).toBe("pelea");
  });
});

describe("fases por vida (D-153)", () => {
  it("al cruzar el 50 % empieza la transición: invulnerable, devora 2 pilares, luego destello y fase 2", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    const hpMax = c.jefe.hpMax;
    c.jefe.hp = hpMax * 0.5 + 100; // ×10 (D-202)
    const aplicado = registrarDano(c.ctx, 1000, 1, [1000, 0]);
    expect(aplicado).toBe(1000);
    expect(c.jefe.hp).toBe(hpMax * 0.5); // no se salta la fase
    expect(c.jefe.accion.tipo).toBe("transicion_fase");
    expect(c.jefe.invulnerable).toBe(true);
    expect(c.jefe.fase).toBe(1);
    expect(c.w.pillars.map((p) => p.id).sort()).toEqual([0, 2, 4, 5, 6, 7]);
    // Invulnerable mientras cambia la arena: ni la regla ni el mundo dejan pasar daño.
    expect(registrarDano(c.ctx, 5000, 1, [5000, 0])).toBe(0);
    pasoCombate(c, quietos(), DT);
    expect(c.w.dummy.invulnerable).toBe(true);
    expect(c.jefe.hp).toBe(hpMax * 0.5);
    correr(c, CONFIG.jefes.comun.transicion + DT * 2);
    expect(c.jefe.invulnerable).toBe(false);
    expect(c.jefe.accion?.tipo).toBe("destello"); // D-156: pausa real, vulnerable
    expect(registrarDano(c.ctx, 100, 1, [100, 0])).toBe(100);
    correr(c, CONFIG.jefes.comun.destello + DT * 2);
    expect(c.jefe.accion?.tipo === "destello").toBe(false);
  });

  it("la fase 2 usa sus ataques y pausas un 30 % más cortas", () => {
    const c = nuevo();
    saltarPresentacion(c);
    ponerVidaJefe(c, c.jefe.hpMax * 0.4);
    correr(
      c,
      CONFIG.jefes.comun.transicion + CONFIG.jefes.comun.destello + 0.1,
    );
    expect(c.jefe.fase).toBe(1);
    expect(c.jefe.pausa).toBeLessThanOrEqual(
      CONFIG.jefes.mirra.pausa * 0.7 + 1e-9,
    );
    const vistos = new Set();
    for (let k = 0; k < 40 && vistos.size < 4; k++) {
      correr(c, 1);
      for (const e of c.eventos)
        if (e.tipo === "telegrafia_inicio") vistos.add(e.ataque);
      c.jefe.hp = c.jefe.hpMax * 0.4; // que no muera
      c.w.players.forEach((p) => {
        p.hp = CONFIG.player.maxHp;
        p.alive = true;
      });
    }
    for (const id of vistos)
      expect(CONFIG.jefes.mirra.fases[1].ataques).toContain(id);
  });
});

describe("bloques cancelables y limpios (reglas 3 y 6)", () => {
  const momentos = (T) => [
    0,
    DT,
    T * 0.5,
    T - DT,
    T + DT,
    T + 0.3,
    T + 1.2,
    T + 4,
  ];
  for (const id of IDS) {
    it(`${id}: cancelar en cualquier momento no deja zonas, proyectiles ni velocidad`, () => {
      const T = 2.5;
      for (const m of momentos(T)) {
        const c = nuevo();
        saltarPresentacion(c);
        sinAtaques(c);
        colocar(c, [-2, 0], [2, 0]);
        colocarJefe(c, 0, -6);
        forzarAtaque(c, id);
        expect(c.zonas.usados + c.proyectiles.usados).toBeGreaterThanOrEqual(0);
        correr(c, m);
        const habia = !!c.jefe.accion;
        cancelarAccion(c.ctx, "prueba");
        expect(c.jefe.accion).toBe(null);
        expect(c.zonas.usados).toBe(0);
        expect(c.proyectiles.usados).toBe(0);
        expect(c.zonas.items.every((z) => !z.activo && z.dueno === null)).toBe(
          true,
        );
        if (habia) {
          expect(c.jefe.vx).toBe(0);
          expect(c.jefe.vz).toBe(0);
        }
        // No queda tirón preparado para el paso siguiente.
        for (const e of c.ctx.tiron) {
          expect(Math.abs(e.x)).toBeLessThan(1e-12);
          expect(Math.abs(e.z)).toBeLessThan(1e-12);
        }
        c._kb.forEach((k) => {
          k.x = 0;
          k.z = 0;
        }); // aislar del empuje de golpes
        pasoCombate(c, quietos(), DT);
        for (const e of c.w.ext) {
          expect(Math.abs(e.x)).toBeLessThan(1e-12);
          expect(Math.abs(e.z)).toBeLessThan(1e-12);
        }
      }
    });
  }

  it("al terminar normalmente cada ataque libera todo", () => {
    for (const id of IDS) {
      const c = nuevo();
      saltarPresentacion(c);
      sinAtaques(c);
      const acc = forzarAtaque(c, id);
      for (let s = 0; s < 60 * 12 && c.jefe.accion === acc; s++)
        pasoCombate(c, [inp({ mx: -1 }), inp({ mx: -1 })], DT);
      expect(c.jefe.accion).not.toBe(acc);
      expect(c.zonas.usados + c.proyectiles.usados).toBe(0);
      expect(c.zonas.fallos + c.proyectiles.fallos).toBe(0);
    }
  });
});

describe("telegrafías (D-055, D-172, D-121)", () => {
  it("cada bloque avisa más en normal que en difícil, y más en solo", () => {
    for (const id of IDS) {
      const n = nuevo();
      saltarPresentacion(n);
      sinAtaques(n);
      const d = nuevo({ dificil: true });
      saltarPresentacion(d);
      sinAtaques(d);
      const s = nuevo({ solo: true });
      saltarPresentacion(s);
      sinAtaques(s);
      const an = forzarAtaque(n, id),
        ad = forzarAtaque(d, id),
        as = forzarAtaque(s, id);
      an.bloques.forEach((b, k) => {
        if (b.tipo === "tiron_radial") return; // el tirón dura lo que dura (2 s), no es un aviso
        expect(b.telegrafia).toBeGreaterThan(ad.bloques[k].telegrafia);
        expect(as.bloques[k].telegrafia).toBeCloseTo(
          b.telegrafia * CONFIG.jefes.comun.telegrafiaSolo,
        );
      });
      expect(an.T).toBeGreaterThanOrEqual(ad.T);
    }
  });

  it("ningún daño sin aviso: durante la telegrafía nadie recibe golpes", () => {
    for (const id of IDS) {
      const c = nuevo();
      saltarPresentacion(c);
      sinAtaques(c);
      colocar(c, [-1, -1], [1, -1]);
      colocarJefe(c, 0, -5);
      const acc = forzarAtaque(c, id);
      correr(c, acc.T - DT);
      expect(c.stats.golpes).toEqual([0, 0]);
    }
  });

  it("emite telegrafia_inicio con el id del ataque y su sonido (D-106)", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    forzarAtaque(c, "siega");
    const ev = c.eventos.find((e) => e.tipo === "telegrafia_inicio");
    expect(ev).toMatchObject({ ataque: "siega", sonido: "hoz" });
  });
});

describe("daño de los ataques", () => {
  it("quien se queda en la Siega recibe su daño una vez; el dash la atraviesa", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -4);
    colocar(c, [0, 0], [0, 7]);
    const acc = forzarAtaque(c, "siega");
    correr(c, acc.T + 0.5);
    expect(c.w.players[0].hp).toBe(
      CONFIG.player.maxHp - CONFIG.jefes.mirra.ataques.siega.bloques[0].dano,
    );
    expect(c.stats.golpes[0]).toBe(1);
    expect(c.w.players[1].hp).toBe(CONFIG.player.maxHp); // fuera del radio

    const d = nuevo();
    saltarPresentacion(d);
    sinAtaques(d);
    colocarJefe(d, 0, -4);
    colocar(d, [0, 0], [0, 7]);
    const a2 = forzarAtaque(d, "siega");
    correr(d, a2.T - 0.03); // la hoja pasa por el centro del arco a mitad del golpe
    correr(d, 0.4, (t) => [inp({ mz: 1, dash: t < DT }), inp()]);
    expect(d.w.players[0].hp).toBe(CONFIG.player.maxHp);
  });

  it("el cuerpo del jefe solo empuja, no daña (D-152)", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, 0);
    colocar(c, [2.5, 0], [8, 0]);
    correr(c, 1.5, () => [inp({ mx: -1 }), inp()]);
    const p = c.w.players[0];
    expect(p.hp).toBe(CONFIG.player.maxHp);
    expect(Math.hypot(p.x - c.jefe.x, p.z - c.jefe.z)).toBeGreaterThanOrEqual(
      c.jefe.r + CONFIG.player.radius - 1e-6,
    );
  });

  it("Grano siempre deja una salida alcanzable para los dos con la cadena puesta", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    for (let seed = 1; seed <= 150; seed++) {
      for (const dificil of [false, true]) {
        const c = nuevo({ seed, dificil }, cfg);
        saltarPresentacion(c);
        sinAtaques(c);
        const r = c.ctx.rng;
        const a = r.next() * Math.PI * 2,
          d = r.next() * 12;
        const ax = Math.cos(a) * d,
          az = Math.sin(a) * d;
        const b2 = r.next() * Math.PI * 2,
          sep = 0.5 + r.next() * (L - 0.6);
        colocar(
          c,
          [ax, az],
          [ax + Math.cos(b2) * sep, az + Math.sin(b2) * sep],
        );
        const acc = forzarAtaque(c, "grano");
        const B = acc.bloques[0];
        const S = B.salida;
        const alcance = cfg.player.moveSpeed * B.telegrafia;
        for (const p of c.w.players)
          expect(Math.hypot(p.x - S.x, p.z - S.z)).toBeLessThanOrEqual(alcance);
        for (const z of B.zonas)
          expect(Math.hypot(z.x - S.x, z.z - S.z)).toBeGreaterThanOrEqual(
            z.r + S.r - 1e-9,
          );
        expect(B.zonas.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("el Tirón atrae; anclado se reduce (D-122) y correr en contra lo vence", () => {
    const mk = () => {
      const c = nuevo();
      saltarPresentacion(c);
      sinAtaques(c);
      colocarJefe(c, 0, -8);
      colocar(c, [-1, 0], [1, 0]);
      forzarAtaque(c, "banquete");
      return c;
    };
    const libre = mk();
    correr(libre, 1.0);
    const anc = mk();
    correr(anc, 1.0, () => [inp({ anchor: true }), inp({ anchor: true })]);
    const corre = mk();
    correr(corre, 1.0, () => [inp({ mz: 1 }), inp({ mz: 1 })]);
    const dz = (c) => c.w.players[0].z;
    expect(dz(libre)).toBeLessThan(-1.5);
    expect(dz(anc)).toBeLessThan(0);
    expect(dz(anc)).toBeGreaterThan(dz(libre));
    expect(dz(corre)).toBeGreaterThan(0.5);
  });
});

describe("salidas (ningún patrón sin salida para los dos)", () => {
  it("Banquete: pegado a Mirra, corriendo hacia fuera con un dash se sale de la mordida", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, 0);
    const r0 = c.jefe.r + CONFIG.player.radius + 0.05;
    colocar(c, [0, r0], [0, r0 + 6.5]);
    const acc = forzarAtaque(c, "banquete");
    correr(c, acc.T + 0.3, (t) => [
      inp({ mz: 1, dash: Math.abs(t - 0.3) < DT / 2 }),
      inp({ mz: 1 }),
    ]);
    expect(c.stats.golpes).toEqual([0, 0]);
  });

  it("Hambre: el objetivo sale de la línea de lado a tiempo, también en difícil", () => {
    for (const dificil of [false, true]) {
      const c = nuevo({ dificil });
      saltarPresentacion(c);
      sinAtaques(c);
      colocarJefe(c, 0, -10);
      colocar(c, [0, 2], [0, 8]);
      const acc = forzarAtaque(c, "hambre");
      // Cada uno a un lado (reacción a mitad del aviso).
      correr(c, acc.T + 2, (t) =>
        t < acc.T * 0.4 ? quietos() : [inp({ mx: -1 }), inp({ mx: 1 })],
      );
      expect(c.stats.golpes).toEqual([0, 0]); // los dos fuera y la cadena tensa cruza la línea (rol D-164)
    }
  });
});

describe("regresiones de la revisión Codex", () => {
  it("Hambre golpea al objetivo que se queda quieto en la línea (el empuje del cuerpo no lo saca del frente)", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -12);
    colocar(c, [0, 0], [5, 0]);
    forzarAtaque(c, "hambre");
    correr(c, 220 * DT);
    expect(c.w.players[0].hp).toBe(
      CONFIG.player.maxHp - CONFIG.jefes.mirra.ataques.hambre.bloques[0].dano,
    );
  });

  it("Hambre no daña lo que Mirra ya dejó atrás: cruzar por detrás de la carga es seguro", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -12);
    colocar(c, [0, 0], [5, 0]);
    forzarAtaque(c, "hambre");
    correr(c, 2.6, (t) =>
      t < 0.65
        ? [inp({ mx: 1 }), inp({ mx: 1 })]
        : t < 1.7
          ? quietos()
          : [inp({ mx: -1 }), inp({ mx: -1 })],
    );
    expect(c.stats.golpes).toEqual([0, 0]);
  });

  it("un golpe con empuje a dos anclados nunca estira la cadena por encima de su largo", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -4);
    colocar(c, [-3.5, 0], [3.5, 0]);
    forzarAtaque(c, "siega");
    const L = CONFIG.chain.length * (1 + CONFIG.chain.maxStretch);
    let max = 0;
    for (let s = 0; s < 180; s++) {
      pasoCombate(c, [inp({ anchor: true }), inp({ anchor: true })], DT);
      max = Math.max(max, c.w.chain.pathLength);
    }
    expect(max).toBeLessThanOrEqual(L + 1e-9);
  });

  it("mantener esquiva no reinicia el combate ni bloquea el salto de presentación del otro jugador", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    killPlayer(c.w.players[0]);
    killPlayer(c.w.players[1]);
    pasoCombate(c, [inp({ dash: true }), inp()], DT);
    expect(c.estado).toBe("derrota");
    correr(c, 1, () => [inp({ dash: true }), inp()]);
    expect(c.estado).toBe("derrota");
    pasoCombate(c, [inp({ dash: true }), inp({ dash: true })], DT);
    expect(c.estado).toBe("derrota");
    const r = reintentar(c);
    pasoCombate(r, [inp({ dash: true }), inp({ dash: true })], DT); // siguen mantenidos: no salta
    expect(r.estado).toBe("presentacion");
    pasoCombate(r, [inp({ dash: true }), inp()], DT);
    pasoCombate(r, [inp({ dash: true }), inp({ dash: true })], DT); // Odo vuelve a pulsar
    expect(r.estado).toBe("pelea");
  });

  it("un dash pulsado en el paso exacto del impacto ya protege (D-014, D-069)", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, 0);
    colocar(c, [0, 3], [0, 9.5]);
    const acc = forzarAtaque(c, "banquete");
    while (acc.etapa === "telegrafia") {
      const ultimo = acc.t + DT >= acc.T - 1e-9;
      pasoCombate(c, [inp({ dash: ultimo, mz: ultimo ? 1 : 0 }), inp()], DT);
    }
    expect(c.w.players[0].dashT).toBeGreaterThan(0);
    correr(c, 0.4);
    expect(c.w.players[0].hp).toBe(CONFIG.player.maxHp);
    // La mordida dura menos que la invulnerabilidad del dash: esquivarla a tiempo es posible.
    const bite = CONFIG.jefes.mirra.ataques.banquete.bloques[1];
    expect(bite.activo).toBeLessThanOrEqual(CONFIG.dash.duration);
  });

  it("la inmunidad del dash caduca: quien sigue en la zona después del dash recibe el golpe", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, 0);
    colocar(c, [0, 3], [0, 9.5]);
    const acc = forzarAtaque(c, "banquete");
    // Dash hacia dentro mucho antes del golpe: cuando muerde ya no es invulnerable.
    correr(c, acc.T + 0.3, (t) => [
      inp({ dash: Math.abs(t - 0.2) < DT / 2, mz: -1 }),
      inp(),
    ]);
    expect(c.w.players[0].hp).toBeLessThan(CONFIG.player.maxHp);
  });
});

describe("Hambre contra la cadena tensa (D-148)", () => {
  it("si carga contra la cadena tensa se corta sola y tropieza", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -12);
    colocar(c, [0, 1], [0, 8]); // Sael es el objetivo: la línea apunta a +z
    const acc = forzarAtaque(c, "hambre");
    // El objetivo sale hacia un lado y el otro hacia el contrario: la cadena tensa cruza la línea.
    colocar(c, [-3.5, 0], [3.5, 0]);
    const hp0 = c.jefe.hp;
    let tropezo = false,
      maxV = 0;
    for (let s = 0; s < 240 && c.jefe.accion; s++) {
      pasoCombate(c, [inp({ anchor: true }), inp({ anchor: true })], DT);
      if (c.jefe.accion?.tropezo) tropezo = true;
      maxV = Math.max(maxV, Math.hypot(c.w.dummy.vx, c.w.dummy.vz));
    }
    expect(maxV).toBeGreaterThan(10);
    expect(c.jefe.hp).toBeLessThan(hp0 - 100); // los dos quietos: el corte sale de la velocidad del jefe
    expect(tropezo).toBe(true);
    expect(acc.recuperacion).toBe(
      CONFIG.jefes.mirra.ataques.hambre.bloques[0].tropiezo.duracion,
    );
    // Tropieza antes de llegar a la altura de la cadena (frente = centro + radio).
    expect(c.jefe.z).toBeLessThan(0);
  });

  it("con la cadena floja la carga no se corta ni tropieza", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -12);
    colocar(c, [0, 1], [0, 8]);
    const acc = forzarAtaque(c, "hambre");
    colocar(c, [-2, 0], [2, 0]);
    const hp0 = c.jefe.hp;
    for (let s = 0; s < 240 && c.jefe.accion; s++)
      pasoCombate(c, [inp({ anchor: true }), inp({ anchor: true })], DT);
    expect(acc.tropezo).toBe(false);
    expect(hp0 - c.jefe.hp).toBeLessThan(50);
  });
});

describe("escala ×10 de vida y daño (D-202)", () => {
  it("los números de balance quedan ×10 y la proporción cadena / vida de Mirra no cambia", () => {
    expect(CONFIG.player.maxHp).toBe(1000);
    expect(CONFIG.jefes.mirra.vida).toBe(12000);
    expect(CONFIG.damage.chain.scale).toBe(70);
    expect(CONFIG.damage.chain.scale / CONFIG.jefes.mirra.vida).toBeCloseTo(
      7 / 1200,
      12,
    );
    // El daño de cada ataque es ≤ 30 % de la vida de un jugador, igual que antes (30 de 100).
    for (const a of Object.values(CONFIG.jefes.mirra.ataques))
      for (const b of a.bloques) {
        const d = b.dano ?? b.danoPorTick ?? 0;
        expect(d / CONFIG.player.maxHp).toBeLessThanOrEqual(0.3 + 1e-9);
      }
  });

  it("una pasada tensa quita la misma fracción de la vida de Mirra que con los números de antes (÷10)", () => {
    const fraccion = (cfg) => {
      const c = nuevo({}, cfg);
      saltarPresentacion(c);
      sinAtaques(c);
      colocarJefe(c, 0, -3);
      colocar(c, [-3.5, 0], [3.5, 0]);
      correr(c, 1.2, () => [
        inp({ mx: -0.5, mz: -1 }),
        inp({ mx: 0.5, mz: -1 }),
      ]);
      return (c.jefe.hpMax - c.jefe.hp) / c.jefe.hpMax;
    };
    const antes = cfgBase();
    antes.player.maxHp /= 10;
    antes.damage.chain.scale /= 10;
    antes.jefes.mirra.vida /= 10;
    const ahora = fraccion(cfgBase());
    expect(ahora).toBeGreaterThan(0.001);
    expect(ahora).toBeCloseTo(fraccion(antes), 6);
  });
});

describe("tambaleo (D-155)", () => {
  it("15 % de la vida en menos de 3 s: cancela el ataque, ~1 s quieta y limpia", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    forzarAtaque(c, "grano");
    expect(c.zonas.usados).toBeGreaterThan(0);
    const umbral = CONFIG.jefes.comun.tambaleo.umbral * c.jefe.hpMax;
    const golpes = 10;
    for (let k = 0; k < golpes; k++) {
      registrarDano(c.ctx, umbral / golpes + 0.01, 1, [1, 0]);
      pasoCombate(c, quietos(), DT);
    }
    expect(c.jefe.accion?.tipo).toBe("tambaleo");
    expect(c.zonas.usados + c.proyectiles.usados).toBe(0);
    correr(c, CONFIG.jefes.comun.tambaleo.duracion + DT);
    expect(c.jefe.accion?.tipo === "tambaleo").toBe(false);
  });

  it("el mismo daño repartido en más de 3 s no la tambalea", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    const umbral = CONFIG.jefes.comun.tambaleo.umbral * c.jefe.hpMax;
    for (let k = 0; k < 8; k++) {
      registrarDano(c.ctx, umbral / 7, 1, [1, 0]);
      correr(c, 0.5);
    }
    expect(c.eventos.some((e) => e.tipo === "tambaleo")).toBe(false);
  });
});

describe("objetivos (D-091, D-165)", () => {
  it("cercano, el que más daño hace y ambos", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -6);
    colocar(c, [-1, -3], [1, 3]);
    expect(elegirObjetivo(c.ctx, "cercano")).toBe(0);
    c.jefe.reciente[0] = 2;
    c.jefe.reciente[1] = 40;
    expect(elegirObjetivo(c.ctx, "masDano")).toBe(1);
    expect(elegirObjetivo(c.ctx, "ambos")).toBe(-1);
    killPlayer(c.w.players[1]);
    expect(elegirObjetivo(c.ctx, "masDano")).toBe(0);
  });
});

describe("caídas, derrota y reintento (D-020, D-028, D-111, D-167, D-173)", () => {
  it("si cae uno, la burla; si caen los dos, derrota con frase y reintento a vida llena", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    killPlayer(c.w.players[1]);
    pasoCombate(c, quietos(), DT);
    expect(c.estado).toBe("pelea");
    expect(c.jefe.cola.some((x) => x.tipo === "burla")).toBe(true);
    pasoCombate(c, quietos(), DT);
    expect(c.jefe.accion?.tipo).toBe("burla");
    expect(c.frase?.clave).toBe("jefe.mirra.burla");
    forzarAtaque(c, "grano");
    killPlayer(c.w.players[0]);
    pasoCombate(c, quietos(), DT);
    expect(c.estado).toBe("derrota");
    expect(c.resultado).toBe("derrota");
    expect(c.frase?.clave).toBe("jefe.mirra.derrota");
    expect(c.zonas.usados + c.proyectiles.usados).toBe(0);
    // Ni la pulsación inmediata ni otra posterior reinician el combate.
    pasoCombate(c, [inp({ dash: true }), inp()], DT);
    expect(c.estado).toBe("derrota");
    correr(c, 1);
    pasoCombate(c, [inp({ dash: true }), inp()], DT);
    expect(c.estado).toBe("derrota");
    const r = reintentar(c);
    expect(
      r.w.players.every((p) => p.alive && p.hp === CONFIG.player.maxHp),
    ).toBe(true);
    expect(r.jefe.hp).toBe(r.jefe.hpMax);
    expect(r.jefe.fase).toBe(0);
    expect(r.w.pillars.length).toBe(8);
    expect(r.opts.reintentos).toBe(1);
    expect(r.presentacion.saltable).toBe(true);
  });

  it("en difícil el reintento también trae la presentación corta (D-213; el rush lo decide el flujo)", () => {
    const c = nuevo({ dificil: true });
    const r = reintentar(c);
    expect(r.presentacion.saltable).toBe(true);
    expect(r.presentacion.T).toBe(CONFIG.jefes.comun.presentacion.reintento);
    expect(r.eventos.some((e) => e.tipo === "silencio")).toBe(false); // sin el silencio del nombre
  });

  it("el bucle mantiene la derrota después de pulsar y soltar esquiva", () => {
    const st = { inputs: [inp(), inp()], debug: [] };
    const j = crearJuegoJefe(cfgBase(), {
      seed: 3,
      sample: () => ({
        inputs: st.inputs.map((x) => ({ ...x, dashDown: false })),
        debug: [],
      }),
    });
    saltarPresentacion(j.combate);
    killPlayer(j.world.players[0]);
    killPlayer(j.world.players[1]);
    for (let i = 0; i < 70; i++) j.update(DT);
    expect(j.combate.estado).toBe("derrota");
    st.inputs[0].dash = true;
    j.update(DT);
    st.inputs[0].dash = false;
    j.update(DT);
    expect(j.combate.opts.reintentos).toBe(0);
    expect(j.combate.estado).toBe("derrota");
    expect(j.world.players[0].alive).toBe(false);
  });

  it("el reintento es reproducible: misma semilla, mismos ataques", () => {
    const seq = (c) => {
      saltarPresentacion(c);
      const out = [];
      // Espera cinco avisos de ataques básicos. La puntería y el resultado del ácido ocupan su propio turno.
      for (let k = 0; k < 120 && out.length < 5; k++) {
        correr(c, 0.5, () => [inp({ mx: 0.3 }), inp({ mx: -0.3 })]);
        c.w.players.forEach((p) => {
          p.hp = CONFIG.player.maxHp;
        });
        for (const e of c.eventos)
          if (e.tipo === "telegrafia_inicio") out.push(e.ataque);
        c.eventos.length = 0;
      }
      return out;
    };
    const a = nuevo({ seed: 11 });
    const s1 = seq(a);
    const s2 = seq(reintentar(a));
    expect(s1.length).toBe(5);
    expect(s2).toEqual(s1);
  });

  it("en la fase 1 nunca hay dos ataques a la vez", () => {
    const c = nuevo({ seed: 5 });
    saltarPresentacion(c);
    for (let s = 0; s < 60 * 40; s++) {
      pasoCombate(
        c,
        [inp({ mx: Math.sin(s / 50) }), inp({ mz: Math.cos(s / 70) })],
        DT,
      );
      c.w.players.forEach((p) => {
        p.hp = CONFIG.player.maxHp;
        p.alive = true;
      });
      const ids = new Set(
        c.zonas.items.filter((z) => z.activo).map((z) => z.ataque),
      );
      expect(ids.size).toBeLessThanOrEqual(1);
      if (c.jefe.fase > 0) break;
    }
  });
});

describe("victoria y lápida (D-020, D-098, D-099, D-100, D-174)", () => {
  it("al morir: victoria, revive al caído con vida llena, lápida con stats y un marcador por jugador", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    // Algo de daño atribuido a cada uno y un golpe recibido.
    c.w.dummy.byPlayer[0] += 0; // la atribución real sale de mundo.js; aquí se simula vía registrarDano
    c.jefe.hp = 500; // ×10 (D-202)
    c.jefe.fase = 1; // ya en la última fase
    c.ctx.golpear({ accion: { id: "prueba" } }, 0, 100, 0, 0, 0, false);
    killPlayer(c.w.players[1]);
    pasoCombate(c, quietos(), DT);
    registrarDano(c.ctx, 600, 1, [600, 0]);
    pasoCombate(c, quietos(), DT);
    expect(c.jefe.vivo).toBe(false);
    expect(c.estado).toBe("victoria");
    expect(c.w.players[1].alive).toBe(true);
    expect(c.w.players[1].hp).toBe(CONFIG.player.maxHp);
    expect(c.lapida).toBeTruthy();
    expect(c.drops.filter((d) => d.jugador >= 0).length).toBe(2);
    expect(c.drops.some((d) => d.extra)).toBe(false); // recibieron daño: sin drop extra
    const s = snapshotCombate(c);
    expect(s.stats.golpes[0]).toBe(1);
    expect(s.stats.tiempo).toBeGreaterThan(0);
    expect(
      c.eventos.some(
        (e) => e.tipo === "jefe_muere" && e.frase === "jefe.mirra.muerte",
      ),
    ).toBe(true);
  });

  it("sin daño recibido: drop extra (D-099)", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    ponerVidaJefe(c, 0);
    expect(c.estado).toBe("victoria");
    expect(c.drops.some((d) => d.extra)).toBe(true);
  });

  it("el daño de la cadena por mundo.js se atribuye a cada jugador en las stats", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -3);
    colocar(c, [-3.5, 0], [3.5, 0]);
    correr(c, 1.2, () => [inp({ mx: -0.5, mz: -1 }), inp({ mx: 0.5, mz: -1 })]);
    expect(c.stats.dano[0] + c.stats.dano[1]).toBeGreaterThan(50);
    expect(c.stats.dano[0] + c.stats.dano[1]).toBeCloseTo(
      c.jefe.hpMax - c.jefe.hp,
      5,
    );
  });

  it("cuenta arrastres (D-174): llevar al otro al largo máximo", () => {
    const c = nuevo();
    saltarPresentacion(c);
    sinAtaques(c);
    colocarJefe(c, 0, -15);
    colocar(c, [-3.4, 5], [3.4, 5]);
    correr(c, 1.0, () => [inp(), inp({ mx: 1 })]);
    expect(c.stats.arrastres[1]).toBeGreaterThanOrEqual(1);
    expect(c.stats.arrastres[0]).toBe(0);
  });
});

describe("geometría de zonas", () => {
  it("sector, círculo y rectángulo", () => {
    const s = {
      forma: "sector",
      x: 0,
      z: 0,
      r: 5,
      ang: 0,
      apertura: Math.PI / 2,
    };
    expect(dentroZona(3, 0, s)).toBe(true);
    expect(dentroZona(3, 3.5, s)).toBe(false);
    expect(dentroZona(-3, 0, s)).toBe(false);
    const r = {
      forma: "rect",
      x: 0,
      z: 0,
      ang: Math.PI / 2,
      largo: 10,
      ancho: 2,
      frente: 10,
    };
    expect(dentroZona(0.9, 5, r)).toBe(true);
    expect(dentroZona(1.1, 5, r)).toBe(false);
    expect(dentroZona(0, -1, r)).toBe(false);
    for (const v of [
      "barrido",
      "zona_circular",
      "proyectil_arco",
      "carga",
      "zona_movil",
      "tiron_radial",
    ])
      expect(Object.keys(BLOQUES)).toContain(v);
    expect(typeof iniciarAtaque).toBe("function");
  });
});
