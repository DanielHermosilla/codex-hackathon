import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  createWorld,
  stepWorld,
  emptyInput,
  debugKill,
  SAEL,
  ODO,
} from "../../../src/atados/gameplay/mundo.js";
import {
  createChain,
  computeTension,
  tensionFromStraightness,
  chainDamageStep,
  pathLength,
} from "../../../src/atados/gameplay/cadena.js";

const DT = CONFIG.sim.fixedDt;
const cfgBase = () => {
  const c = structuredClone(CONFIG);
  c.feedback.hitstop.enabled = false;
  return c;
};
const inp = (o = {}) => ({ ...emptyInput(), ...o });
function run(w, seconds, fn) {
  const steps = Math.round(seconds / DT);
  for (let s = 0; s < steps; s++) stepWorld(w, fn(s * DT), DT);
}
const sinPilares = { pillars: [] };
const lejos = { dummy: { x: 100, z: 100 } };

describe("cadena: largo inextensible y arrastre (D-022, D-149)", () => {
  it("a largo máximo no se estira: el que tira arrastra al otro", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const w = createWorld(cfg, {
      sael: [-L / 2, 0],
      odo: [L / 2, 0],
      ...sinPilares,
      ...lejos,
    });
    const odo0 = w.players[ODO].x;
    let maxS = 0;
    run(w, 1, () => {
      maxS = Math.max(maxS, w.chain.pathLength);
      return [inp(), inp({ mx: 1 })];
    });
    expect(maxS).toBeLessThan(L * 1.02);
    expect(w.players[ODO].x - odo0).toBeGreaterThan(1);
    expect(w.players[SAEL].x).toBeGreaterThan(-L / 2 + 0.5); // Sael fue arrastrado
    const d = Math.hypot(
      w.players[ODO].x - w.players[SAEL].x,
      w.players[ODO].z - w.players[SAEL].z,
    );
    expect(d).toBeLessThanOrEqual(L * 1.02);
  });

  it("gana quien empuja más", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const w = createWorld(cfg, {
      sael: [-L / 2, 0],
      odo: [L / 2, 0],
      ...sinPilares,
      ...lejos,
    });
    const mid0 = 0;
    run(w, 1.5, () => [inp({ mx: -0.5 }), inp({ mx: 1 })]);
    const mid = (w.players[0].x + w.players[1].x) / 2;
    expect(mid - mid0).toBeGreaterThan(0.5);
    expect(w.chain.pathLength).toBeLessThan(L * 1.02);
  });

  it("el dash siempre gana el tirón aunque el otro tire al máximo", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const w = createWorld(cfg, {
      sael: [-L / 2, 0],
      odo: [L / 2, 0],
      ...sinPilares,
      ...lejos,
    });
    run(w, 0.4, () => [inp({ mx: -1 }), inp({ mx: 1 })]); // tablas
    const sael0 = w.players[SAEL].x;
    run(w, cfg.dash.duration, (t) => [
      inp({ mx: -1 }),
      inp({ mx: 1, dash: t < DT }),
    ]);
    expect(w.players[SAEL].x - sael0).toBeGreaterThan(0.8);
  });

  it("la tensión transmite fuerza también a través de un pilar (D-013)", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, {
      sael: [-3, 0],
      odo: [3, 0],
      ...lejos,
      pillars: [{ x: 0, z: -0.8, r: 0.6 }],
    });
    const z0 = w.players[SAEL].z;
    run(w, 1.5, () => [inp(), inp({ mx: 0.5, mz: 1 })]);
    expect(w.chain.pathLength).toBeLessThan(cfg.chain.length * 1.03);
    expect(
      Math.abs(w.players[SAEL].z - z0) + Math.abs(w.players[SAEL].x + 3),
    ).toBeGreaterThan(0.3);
  });
});

describe("tensión = rectitud por tramo (D-147, D-068)", () => {
  it("la curva es continua, monótona y 0 cuando está floja", () => {
    const cfg = cfgBase();
    let prev = -1;
    for (let r = 0; r <= 1.0001; r += 0.01) {
      const t = tensionFromStraightness(r, cfg);
      expect(t).toBeGreaterThanOrEqual(prev);
      if (prev >= 0) expect(t - prev).toBeLessThan(0.1); // sin saltos
      prev = t;
    }
    expect(tensionFromStraightness(0.5, cfg)).toBe(0);
    expect(tensionFromStraightness(1, cfg)).toBeCloseTo(1);
  });

  it("recta y extendida ≈ 1; recta pero corta (floja) ≈ 0; en zigzag baja", () => {
    const cfg = cfgBase();
    cfg.chain.tension.smoothing = 0;
    const L = cfg.chain.length;
    const tensa = createChain(0, 0, L, 0, cfg);
    computeTension(tensa, [], cfg, DT);
    expect(tensa.tension).toBeGreaterThan(0.99);
    const floja = createChain(0, 0, L * 0.6, 0, cfg);
    computeTension(floja, [], cfg, DT);
    expect(floja.tension).toBe(0);
    const zig = createChain(0, 0, L, 0, cfg);
    for (let i = 1; i < zig.n; i++) zig.z[i] = (i % 2) * 0.15;
    // misma cuerda pero eslabones torcidos: la cuerda / largo nominal sigue ≈1 (rectitud = la del tramo)
    computeTension(zig, [], cfg, DT);
    expect(zig.tension).toBeGreaterThan(0.9);
  });

  it("enrollada en un pilar se mide tensa aunque los extremos estén cerca (D-048, D-147)", () => {
    const cfg = cfgBase();
    const pillar = { x: 0, z: 0, r: 0.7 };
    // Sael anclado al oeste; Odo rodea el pilar por el este y vuelve hacia el oeste por el norte.
    const w = createWorld(cfg, {
      sael: [-2.5, 0.2],
      odo: [-2.5, 1.6],
      pillars: [pillar],
      ...lejos,
    });
    run(w, 0.8, () => [inp({ anchor: true }), inp({ mx: 1 })]);
    run(w, 0.8, () => [inp({ anchor: true }), inp({ mz: -1 })]);
    run(w, 2.0, () => [inp({ anchor: true }), inp({ mx: -1 })]);
    const ch = w.chain;
    const A = w.players[SAEL],
      B = w.players[ODO];
    const chord = Math.hypot(B.x - A.x, B.z - A.z);
    let enContacto = 0;
    for (let i = 0; i <= ch.n; i++) if (ch.contact[i] === 0) enContacto++;
    expect(enContacto).toBeGreaterThan(2);
    expect(chord / cfg.chain.length).toBeLessThan(0.75);
    expect(ch.pathLength).toBeLessThan(cfg.chain.length * 1.03);
    expect(ch.tension).toBeGreaterThan(0.8);
    expect(ch.tramoCount).toBeGreaterThanOrEqual(3);
    // ningún eslabón atraviesa el pilar
    for (let i = 0; i <= ch.n; i++) {
      expect(
        Math.hypot(ch.x[i] - pillar.x, ch.z[i] - pillar.z),
      ).toBeGreaterThan(pillar.r);
    }
  });
});

describe("daño continuo: tensión y velocidad relativa", () => {
  it("con contacto el daño flojo es un cuarto del tenso y crece con la tensión", () => {
    const cfg = cfgBase();
    const ch = createChain(-3, 0, 3, 0, cfg);
    for (let i = 0; i <= ch.n; i++) ch.pz[i] = ch.z[i] - 5 * DT; // se mueve a 5 m/s en +z
    const body = { x: 0, z: 0, r: 1.8, vx: 0, vz: 0 };
    let prev = -1;
    for (const t of [0, 0.1, 0.3, 0.6, 1]) {
      ch.segT.fill(t);
      const d = chainDamageStep(ch, body, DT, cfg);
      expect(d).toBeGreaterThanOrEqual(prev);
      if (t === 0) expect(d).toBeGreaterThan(0);
      prev = d;
    }
    ch.segT.fill(1);
    const d5 = chainDamageStep(ch, body, DT, cfg);
    ch.segT.fill(0);
    expect(chainDamageStep(ch, body, DT, cfg)).toBeCloseTo(d5 * 0.25, 6);
    expect(chainDamageStep(ch, { ...body, x: 100 }, DT, cfg)).toBe(0); // sin contacto no hay daño
    ch.segT.fill(1);
    for (let i = 0; i <= ch.n; i++) ch.pz[i] = ch.z[i] - 10 * DT;
    expect(chainDamageStep(ch, body, DT, cfg)).toBeCloseTo(d5 * 2, 5); // y con la velocidad relativa
    // si el cuerpo se mueve con la cadena no hay corte
    expect(chainDamageStep(ch, { ...body, vz: 10 }, DT, cfg)).toBeCloseTo(0, 6);
  });

  it("barrido tenso por el muñeco hace mucho más daño que barrido flojo", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const tensa = createWorld(cfg, {
      sael: [-L / 2, 3.5],
      odo: [L / 2, 3.5],
      ...sinPilares,
    });
    // tensa: cada uno tira hacia afuera mientras avanzan (el golpe fuerte pide a los dos, D-017)
    run(tensa, 1.2, () => [
      inp({ mx: -0.5, mz: -1 }),
      inp({ mx: 0.5, mz: -1 }),
    ]);
    const floja = createWorld(cfg, {
      sael: [-2.6, 3.5],
      odo: [2.6, 3.5],
      ...sinPilares,
    });
    run(floja, 1.2, () => [inp({ mz: -1 }), inp({ mz: -1 })]);
    expect(tensa.dummy.total).toBeGreaterThan(20);
    expect(floja.dummy.total).toBeGreaterThan(0);
    expect(floja.dummy.total).toBeLessThan(tensa.dummy.total);
    console.log(
      `barrido: tensa=${tensa.dummy.total.toFixed(1)} floja=${floja.dummy.total.toFixed(2)}`,
    );
  });

  it("el cuerpo del muñeco empuja a los jugadores y la cadena lo atraviesa", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, { sael: [0, 4], odo: [3, 4], ...sinPilares });
    run(w, 1.5, () => [inp({ mz: -1 }), inp()]);
    const s = w.players[SAEL];
    expect(Math.hypot(s.x, s.z)).toBeGreaterThanOrEqual(
      cfg.greybox.dummy.radius + cfg.player.radius - 1e-6,
    );
  });
});

describe("dash (D-014, D-069, D-151) e invulnerabilidad (D-152)", () => {
  it("cooldown de 0.6 s e invulnerable solo durante el dash", async () => {
    const { createPlayer, updatePlayer, hurtPlayer, isDashing } =
      await import("../../../src/atados/gameplay/jugadores.js");
    const cfg = cfgBase();
    const p = createPlayer("sael", 0, 0, cfg);
    updatePlayer(p, inp({ mx: 1, dash: true }), false, DT, cfg);
    expect(isDashing(p)).toBe(true);
    expect(hurtPlayer(p, 10, cfg)).toBe(false); // inmune en el dash
    let t = DT;
    while (t < cfg.dash.duration + DT) {
      updatePlayer(p, inp({ mx: 1 }), false, DT, cfg);
      t += DT;
    }
    expect(isDashing(p)).toBe(false);
    // reintento antes del cooldown: no sale
    updatePlayer(p, inp({ mx: 1, dash: true }), false, DT, cfg);
    t += DT;
    expect(isDashing(p)).toBe(false);
    while (t < cfg.dash.cooldown + 0.02) {
      updatePlayer(p, inp({ mx: 1 }), false, DT, cfg);
      t += DT;
    }
    updatePlayer(p, inp({ mx: 1, dash: true }), false, DT, cfg);
    expect(isDashing(p)).toBe(true);
  });

  it("tras un golpe hay invulnerabilidad breve y luego vuelve a recibir", async () => {
    const { createPlayer, updatePlayer, hurtPlayer } =
      await import("../../../src/atados/gameplay/jugadores.js");
    const cfg = cfgBase();
    const p = createPlayer("odo", 0, 0, cfg);
    expect(hurtPlayer(p, 10, cfg)).toBe(true);
    expect(hurtPlayer(p, 10, cfg)).toBe(false);
    for (let t = 0; t < cfg.player.hurtIframes + DT; t += DT)
      updatePlayer(p, inp(), false, DT, cfg);
    expect(hurtPlayer(p, 10, cfg)).toBe(true);
    expect(p.hp).toBe(cfg.player.maxHp - 20);
  });

  it("dash sin dirección va hacia donde mira", async () => {
    const { createPlayer, updatePlayer } =
      await import("../../../src/atados/gameplay/jugadores.js");
    const cfg = cfgBase();
    const p = createPlayer("sael", 0, 0, cfg);
    for (let i = 0; i < 30; i++)
      updatePlayer(p, inp({ mx: 1 }), false, DT, cfg); // mira a +x
    for (let i = 0; i < 30; i++) updatePlayer(p, inp(), false, DT, cfg);
    updatePlayer(p, inp({ dash: true }), false, DT, cfg);
    expect(p.dashX).toBeCloseTo(1, 3);
    expect(p.dashZ).toBeCloseTo(0, 3);
  });
});

describe("ancla (D-019, D-122, D-150)", () => {
  it("anclado no se mueve aunque el otro tire o dashee, y el otro gira tenso a su alrededor", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const w = createWorld(cfg, {
      sael: [0, 0],
      odo: [L - 0.2, 0],
      ...sinPilares,
      ...lejos,
    });
    run(w, 1, (t) => [
      inp({ anchor: true, mx: 1 }),
      inp({ mx: 1, mz: 0.3, dash: t < DT }),
    ]);
    expect(w.players[SAEL].x).toBe(0);
    expect(w.players[SAEL].z).toBe(0);
    run(w, 1.5, () => [inp({ anchor: true }), inp({ mz: 1 })]);
    const o = w.players[ODO];
    expect(w.players[SAEL].x).toBe(0);
    expect(Math.hypot(o.x, o.z)).toBeGreaterThan(L * 0.9);
    expect(Math.hypot(o.x, o.z)).toBeLessThanOrEqual(L * 1.02);
    expect(o.z).toBeGreaterThan(2); // giró
  });

  it("anclado gira el cuerpo pero no puede dashear; al soltar sí", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, { ...sinPilares, ...lejos });
    run(w, 0.5, () => [inp({ anchor: true, mx: 1 }), inp()]);
    const s = w.players[SAEL];
    expect(Math.cos(s.face)).toBeGreaterThan(0.9);
    stepWorld(w, [inp({ anchor: true, dash: true }), inp()], DT);
    expect(s.dashT).toBe(0);
    stepWorld(w, [inp(), inp()], DT); // suelta ancla y botón
    stepWorld(w, [inp({ dash: true }), inp()], DT);
    expect(s.dashT).toBeGreaterThan(0);
  });
});

describe("cadáver (D-020, D-021, D-070)", () => {
  it("el vivo arrastra el cadáver, va más lento, y el cadáver sigue cortando", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const libre = createWorld(cfg, {
      sael: [-L / 2, 0],
      odo: [L / 2 - 2, 0],
      ...sinPilares,
      ...lejos,
    });
    run(libre, 0.6, () => [inp({ mx: -1 }), inp()]);
    const w = createWorld(cfg, {
      sael: [-L / 2, 0],
      odo: [L / 2, 0],
      ...sinPilares,
      ...lejos,
    });
    debugKill(w, ODO);
    const o0 = w.players[ODO].x;
    run(w, 1, () => [
      inp({ mx: -1 }),
      inp({ mx: 1, dash: true, anchor: true }),
    ]); // el muerto no responde
    const speed = Math.abs(w.players[SAEL].vx);
    expect(w.players[ODO].x).toBeLessThan(o0 - 1); // arrastrado
    expect(speed).toBeGreaterThan(0.5);
    expect(speed).toBeLessThan(cfg.player.moveSpeed * 0.7);
    expect(w.chain.pathLength).toBeLessThan(L * 1.02);

    // mangual: Sael gira con el cadáver tenso y la cadena corta al muñeco
    const m = createWorld(cfg, {
      sael: [0, 5],
      odo: [L, 5],
      ...sinPilares,
      dummy: { x: 4, z: 1.5 },
    });
    debugKill(m, ODO);
    run(m, 3, (t) => [
      inp({ mx: Math.cos(t * 3), mz: -Math.sin(t * 3) }),
      inp(),
    ]);
    expect(m.dummy.total).toBeGreaterThan(0.5);
  });
});

describe("modo solo (D-016, D-120, D-145)", () => {
  it("un dash hace dashear a los dos en la dirección media", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, { solo: true, ...sinPilares, ...lejos });
    stepWorld(w, [inp({ mx: 1, dash: true }), inp({ mz: 1 })], DT);
    const [s, o] = w.players;
    expect(s.dashT).toBeGreaterThan(0);
    expect(o.dashT).toBeGreaterThan(0);
    expect(s.dashX).toBeCloseTo(Math.SQRT1_2, 5);
    expect(s.dashZ).toBeCloseTo(Math.SQRT1_2, 5);
    expect(o.dashX).toBeCloseTo(s.dashX, 9);
    expect(o.dashZ).toBeCloseTo(s.dashZ, 9);
  });

  it("cada uno se mueve con su entrada", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, { solo: true, ...sinPilares, ...lejos });
    run(w, 0.3, () => [inp({ mx: -1 }), inp({ mx: 1 })]);
    expect(w.players[SAEL].vx).toBeLessThan(0);
    expect(w.players[ODO].vx).toBeGreaterThan(0);
  });
});

describe("determinismo", () => {
  it("mismo input → mismo estado", () => {
    const cfg = cfgBase();
    const a = createWorld(cfg),
      b = createWorld(cfg);
    const f = (t) => [
      inp({ mx: Math.sin(t * 2), mz: -1, dash: t > 0.5 && t < 0.52 }),
      inp({ mx: 1, anchor: t > 1 }),
    ];
    run(a, 2, f);
    run(b, 2, f);
    expect(Array.from(a.chain.x)).toEqual(Array.from(b.chain.x));
    expect(a.dummy.total).toBe(b.dummy.total);
    expect(pathLength(a.chain)).toBe(pathLength(b.chain));
  });
});

// Regresiones de la revisión adversarial (Codex): se comprueban en CADA paso.
function minSegDistToPillar(ch, P) {
  let m = Infinity;
  for (let i = 0; i < ch.n; i++) {
    const x1 = ch.x[i],
      z1 = ch.z[i],
      sx = ch.x[i + 1] - x1,
      sz = ch.z[i + 1] - z1;
    const L2 = sx * sx + sz * sz;
    const t =
      L2 > 0
        ? Math.max(0, Math.min(1, ((P.x - x1) * sx + (P.z - z1) * sz) / L2))
        : 0;
    m = Math.min(m, Math.hypot(x1 + sx * t - P.x, z1 + sz * t - P.z));
  }
  return m;
}

describe("regresiones del solver (revisión Codex)", () => {
  it("dashes diagonales opuestos simultáneos no estiran la cadena", () => {
    const cfg = cfgBase();
    const L = cfg.chain.length;
    const w = createWorld(cfg);
    let maxS = 0,
      maxSep = 0;
    for (let s = 0; s < 120; s++) {
      const dash = s === 0 || s === 40 || s === 80;
      stepWorld(
        w,
        [inp({ mx: -1, mz: 1, dash }), inp({ mx: 1, mz: -1, dash })],
        DT,
      );
      maxS = Math.max(maxS, w.chain.pathLength);
      const [a, b] = w.players;
      maxSep = Math.max(maxSep, Math.hypot(a.x - b.x, a.z - b.z));
    }
    expect(maxS).toBeLessThan(L * 1.02);
    expect(maxSep).toBeLessThan(L * 1.02);
  });

  it("dash contra el enredo con el otro anclado: ningún segmento entra en el pilar", () => {
    const cfg = cfgBase();
    const P = cfg.greybox.pillars[0];
    const R = P.r + cfg.chain.radius;
    const w = createWorld(cfg, { sael: [-9, 3.7], odo: [-9, 5.1] });
    let minD = Infinity,
      maxS = 0;
    const tramo = (seg, f) => {
      for (let s = 0; s < Math.round(seg / DT); s++) {
        stepWorld(w, f(s), DT);
        minD = Math.min(minD, minSegDistToPillar(w.chain, P));
        maxS = Math.max(maxS, w.chain.pathLength);
      }
    };
    tramo(0.8, () => [inp({ anchor: true }), inp({ mx: 1 })]);
    tramo(0.8, () => [inp({ anchor: true }), inp({ mz: -1 })]);
    tramo(2.0, () => [inp({ anchor: true }), inp({ mx: -1 })]);
    tramo(1.0, (s) => [
      inp({ anchor: true }),
      inp({ mx: -1, dash: s % 40 === 0 }),
    ]);
    tramo(1.0, (s) => [
      inp({ anchor: true }),
      inp({ mx: -1, mz: 1, dash: s % 40 === 0 }),
    ]);
    expect(maxS).toBeLessThan(cfg.chain.length * 1.02);
    expect(minD).toBeGreaterThan(R - 0.05);
  });

  // Invariantes por paso: largo ≤ 2 % y ningún jugador dentro de pilares, muñeco o fuera de la arena.
  function invariantes(w, cfg) {
    const pr = cfg.player.radius;
    let pen = 0;
    for (const p of w.players) {
      for (const P of w.pillars)
        pen = Math.max(pen, P.r + pr - Math.hypot(p.x - P.x, p.z - P.z));
      pen = Math.max(
        pen,
        w.dummy.r + pr - Math.hypot(p.x - w.dummy.x, p.z - w.dummy.z),
      );
      pen = Math.max(pen, Math.hypot(p.x, p.z) - (w.arenaRadius - pr));
    }
    return { S: w.chain.pathLength, pen };
  }
  function lcg(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  it("el cierre del largo no mete jugadores dentro del muñeco", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, {
      sael: [-2.25, 0],
      odo: [4.75, 0],
      pillars: [],
    });
    let maxPen = 0;
    for (let s = 0; s < 30; s++) {
      stepWorld(w, [inp(), inp({ mx: 1, dash: s === 0 })], DT);
      maxPen = Math.max(maxPen, invariantes(w, cfg).pen);
    }
    expect(maxPen).toBeLessThan(1e-6);
  });

  it("anclado + el otro chocando con el muñeco: no se estira ni lo atraviesa", () => {
    const cfg = cfgBase();
    const w = createWorld(cfg, { sael: [-2, 5.3], odo: [-3.4, -1.1] });
    let maxS = 0,
      maxPen = 0;
    for (let s = 0; s < 90; s++) {
      stepWorld(
        w,
        [inp({ anchor: true }), inp({ mx: 0.7, mz: -0.5, dash: s === 0 })],
        DT,
      );
      const v = invariantes(w, cfg);
      maxS = Math.max(maxS, v.S);
      maxPen = Math.max(maxPen, v.pen);
    }
    expect(maxS).toBeLessThan(cfg.chain.length * 1.005);
    expect(maxPen).toBeLessThan(1e-6);
    expect(w.players[SAEL].x).toBe(-2);
  });

  it("secuencias aleatorias (LCG, varias semillas): largo y cuerpos se respetan en cada paso", () => {
    const cfg = cfgBase();
    for (const seed of [16, 1, 2, 3, 99]) {
      const rnd = lcg(seed);
      const w = createWorld(cfg);
      let maxS = 0,
        maxPen = 0;
      let a = inp(),
        b = inp();
      for (let s = 0; s < 1800; s++) {
        if (s % 20 === 0) {
          a = inp({
            mx: rnd() * 2 - 1,
            mz: rnd() * 2 - 1,
            dash: rnd() < 0.3,
            anchor: rnd() < 0.15,
          });
          b = inp({
            mx: rnd() * 2 - 1,
            mz: rnd() * 2 - 1,
            dash: rnd() < 0.3,
            anchor: rnd() < 0.15,
          });
        }
        stepWorld(w, [a, b], DT);
        const v = invariantes(w, cfg);
        maxS = Math.max(maxS, v.S);
        maxPen = Math.max(maxPen, v.pen);
      }
      expect(maxS, `semilla ${seed}`).toBeLessThan(cfg.chain.length * 1.02);
      expect(maxPen, `semilla ${seed}`).toBeLessThan(1e-6);
    }
  });

  it("entradas aleatorias con semilla: el largo se respeta siempre", async () => {
    const { RNG } = await import("../../../src/atados/core/rng.js");
    RNG.seed(1234);
    const cfg = cfgBase();
    const w = createWorld(cfg);
    let maxS = 0;
    const r = () => RNG.range(-1, 1);
    let a = inp(),
      b = inp();
    for (let s = 0; s < 3600; s++) {
      if (s % 20 === 0) {
        a = inp({
          mx: r(),
          mz: r(),
          dash: RNG.next() < 0.3,
          anchor: RNG.next() < 0.15,
        });
        b = inp({
          mx: r(),
          mz: r(),
          dash: RNG.next() < 0.3,
          anchor: RNG.next() < 0.15,
        });
      }
      stepWorld(w, [a, b], DT);
      maxS = Math.max(maxS, w.chain.pathLength);
    }
    expect(maxS).toBeLessThan(cfg.chain.length * 1.02);
  });
});
