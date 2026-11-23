// Enemigos del pasillo (D-209, D-076, D-140): daño de la cadena, tope de atacantes, golpes poco letales,
// marcas de ataque y determinismo por semilla.
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  createWorld,
  stepWorld,
  emptyInput,
} from "../../../src/atados/gameplay/mundo.js";
import {
  crearHorda,
  moverHorda,
  actualizarHorda,
  atacandoAhora,
  tipoEnemigo,
} from "../../../src/atados/gameplay/enemigos.js";
import {
  crearRecorrido,
  pasoRecorrido,
  saltarCaida,
  irA,
} from "../../../src/atados/gameplay/recorrido.js";
import { crearRng } from "../../../src/atados/core/rng.js";
import { createChain } from "../../../src/atados/gameplay/cadena.js";

const dt = CONFIG.sim.fixedDt;
const E = CONFIG.recorrido.enemigos;

/**
 * Arena de prueba: mundo plano sin pilares ni muñeco y una horda con los enemigos dados.
 * @param {{ tipo: string, x: number, z: number }[]} lista
 * @param {number[]} [sael]
 * @param {number[]} [odo]
 */
function arena(lista, sael = [-1.5, 3], odo = [1.5, 3], seed = 1) {
  const w = createWorld(CONFIG, {
    sael,
    odo,
    pillars: [],
    arenaRadius: 50,
    dummy: { x: 1e4, z: 1e4, r: 0.01 }, // sin muñeco
  });
  const eventos = [];
  const h = crearHorda(CONFIG, lista, {
    rng: crearRng(seed),
    emitir: (tipo, datos) => eventos.push({ tipo, ...datos }),
  });
  const ins = [emptyInput(), emptyInput()];
  /** Avanza `n` pasos; `cada` se llama tras cada paso. */
  const correr = (n, a = {}, b = {}, cada = () => {}) => {
    for (let i = 0; i < n; i++) {
      Object.assign(ins[0], a);
      Object.assign(ins[1], b);
      moverHorda(h, w, dt);
      stepWorld(w, ins, dt);
      actualizarHorda(h, w, dt);
      cada();
    }
  };
  return { w, h, eventos, correr };
}

const deTipo = (evs, tipo) => evs.filter((e) => e.tipo === tipo);

describe("daño de la cadena a los enemigos (D-148)", () => {
  it("una pasada tensa corta al segador; floja casi no le hace nada", () => {
    const tenso = arena([{ tipo: "segador", x: 0, z: 0 }]);
    tenso.correr(30, { mx: -1 }, { mx: 1 }); // abren la cadena
    tenso.correr(60, { mx: -0.4, mz: -1 }, { mx: 0.4, mz: -1 }); // y la pasan por encima
    const s = tenso.h.enemigos[0];
    expect(s.vivo).toBe(false);
    expect(s.etapa).toBe("muere");
    expect(deTipo(tenso.eventos, "enemigo:muere")).toHaveLength(1);
    const herido = deTipo(tenso.eventos, "enemigo:herido");
    expect(herido.length).toBeGreaterThan(0);
    expect(herido[0].dano).toBeGreaterThan(0);

    const flojo = arena([{ tipo: "segador", x: 0, z: 0 }]);
    flojo.correr(60, { mz: -1 }, { mz: -1 }); // cadena floja: los dos van juntos
    const f = flojo.h.enemigos[0];
    expect(f.hpMax - f.hp).toBeLessThan(E.segador.vida * 0.1);
  });

  it("el brincador aguanta una pasada tensa (pide dos)", () => {
    const a = arena([{ tipo: "brincador", x: 0, z: 0 }]);
    a.correr(30, { mx: -1 }, { mx: 1 });
    a.correr(60, { mx: -0.4, mz: -1 }, { mx: 0.4, mz: -1 });
    const b = a.h.enemigos[0];
    expect(b.vivo).toBe(true);
    expect(b.hp).toBeLessThan(b.hpMax);
    expect(b.golpeT).toBeLessThan(2);
  });
});

describe("ataques (D-076)", () => {
  it("ningún golpe quita más del 10 % de la vida del jugador", () => {
    const tope = E.comun.danoMaxFraccion * CONFIG.player.maxHp;
    expect(E.segador.ataque.dano).toBeLessThanOrEqual(tope);
    expect(E.brincador.ataque.dano).toBeLessThanOrEqual(tope);
    // Y en juego: cada golpe que reciben quita como mucho eso.
    const lista = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      lista.push({
        tipo: k % 2 ? "segador" : "brincador",
        x: Math.cos(a) * 4,
        z: Math.sin(a) * 4,
      });
    }
    const t = arena(lista, [-1, 0], [1, 0]);
    const vidaAntes = [0, 0];
    let maxBajada = 0;
    t.correr(60 * 12, {}, {}, () => {
      for (let i = 0; i < 2; i++) {
        const p = t.w.players[i];
        if (vidaAntes[i]) maxBajada = Math.max(maxBajada, vidaAntes[i] - p.hp);
        vidaAntes[i] = p.hp;
      }
    });
    const golpes = deTipo(t.eventos, "enemigo:golpe");
    expect(golpes.length).toBeGreaterThan(0);
    for (const g of golpes) expect(g.dano).toBeLessThanOrEqual(tope);
    expect(maxBajada).toBeLessThanOrEqual(tope);
  });

  it("como mucho 2 enemigos atacan a la vez", () => {
    const lista = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      lista.push({
        tipo: "segador",
        x: Math.cos(a) * 2.5,
        z: Math.sin(a) * 2.5,
      });
    }
    const t = arena(lista, [-0.8, 0], [0.8, 0]);
    let max = 0;
    t.correr(60 * 10, {}, {}, () => {
      max = Math.max(max, atacandoAhora(t.h));
    });
    expect(max).toBe(E.comun.maxAtacando);
  });

  it("el segador avisa con un arco y el brincador con una línea antes de golpear", () => {
    const s = arena(
      [{ tipo: "segador", x: 0, z: 0 }],
      [-0.6, 1.3],
      [-3.6, 1.3],
    );
    let zonaS = null;
    s.correr(60 * 3, {}, {}, () => {
      const e = s.h.enemigos[0];
      if (e.etapa === "telegrafia" && !zonaS) zonaS = { ...e.zona };
    });
    expect(zonaS?.forma).toBe("arco");
    expect(zonaS?.radio).toBe(E.segador.ataque.radio);
    expect(deTipo(s.eventos, "enemigo:telegrafia").length).toBeGreaterThan(0);
    expect(deTipo(s.eventos, "enemigo:golpe").length).toBeGreaterThan(0);

    const b = arena([{ tipo: "brincador", x: 0, z: -6 }], [-1.5, 0], [1.5, 0]);
    let zonaB = null;
    b.correr(60 * 4, {}, {}, () => {
      const e = b.h.enemigos[0];
      if (e.etapa === "telegrafia" && !zonaB) zonaB = { ...e.zona };
    });
    expect(zonaB?.forma).toBe("linea");
    expect(zonaB?.largo).toBe(E.brincador.ataque.largo);
    const g = deTipo(b.eventos, "enemigo:golpe");
    expect(g.length).toBeGreaterThan(0);
    expect(b.w.players[g[0].jugador].hp).toBeLessThan(CONFIG.player.maxHp);
  });

  it("el dash esquiva el golpe (D-014)", () => {
    const t = arena(
      [{ tipo: "segador", x: 0, z: 0 }],
      [-0.6, 1.3],
      [-3.6, 1.3],
    );
    t.correr(60 * 4, {}, {}, () => {
      for (const p of t.w.players) p.dashT = 1; // siempre en dash: invulnerables
    });
    expect(deTipo(t.eventos, "enemigo:telegrafia").length).toBeGreaterThan(0);
    expect(deTipo(t.eventos, "enemigo:golpe")).toHaveLength(0);
  });

  it("dormidos hasta que alguien se acerca a menos del aggro", () => {
    const t = arena(
      [{ tipo: "segador", x: 0, z: -(E.comun.aggro + 3) }],
      [-1.5, 0],
      [1.5, 0],
    );
    t.correr(60);
    expect(t.h.enemigos[0].etapa).toBe("quieto");
    t.correr(60 * 2, { mz: -1 }, { mz: -1 });
    expect(t.h.enemigos[0].etapa).not.toBe("quieto");
  });

  it("un tipo desconocido es un error claro", () => {
    expect(tipoEnemigo("segador")).toBe("segador");
    let error = null;
    try {
      tipoEnemigo("dragon");
    } catch (e) {
      error = e;
    }
    expect(error instanceof Error).toBe(true);
  });
});

describe("determinismo por semilla", () => {
  /** Juega 15 s del pasillo junto a los primeros segadores con un guion fijo y devuelve la foto. */
  function partida(seed) {
    const r = crearRecorrido(CONFIG, { seed });
    saltarCaida(r);
    irA(r, 32);
    const ins = [emptyInput(), emptyInput()];
    for (let i = 0; i < 60 * 15; i++) {
      const k = Math.floor(i / 90) % 2 ? 1 : -1; // cambia de lado cada 1,5 s
      Object.assign(ins[0], { mx: k * 0.6, mz: -0.3 });
      Object.assign(ins[1], { mx: -k * 0.6, mz: -0.3 });
      pasoRecorrido(r, ins, dt);
    }
    return JSON.stringify({
      enemigos: r.estado.enemigos.map((e) => [e.x, e.z, e.hp, e.etapa]),
      jugadores: r.w.players.map((p) => [p.x, p.z, p.hp]),
    });
  }

  it("misma semilla y mismas entradas = mismo resultado", () => {
    const a = partida(5);
    expect(a).toBe(partida(5));
    expect(/acecha|telegrafia|activo|recupera|muere/.test(a)).toBe(true); // hubo pelea de verdad
  });

  it("otra semilla cambia las pausas de los enemigos", () => {
    const a = crearRecorrido(CONFIG, { seed: 5 }).horda.enemigos.map(
      (e) => e.pausa,
    );
    const b = crearRecorrido(CONFIG, { seed: 6 }).horda.enemigos.map(
      (e) => e.pausa,
    );
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

/**
 * Pone a Sael y Odo en (x, z) con la cadena recta, sin pasar por la física.
 * @param {ReturnType<typeof arena>} t
 * @param {number[]} sael
 * @param {number[]} odo
 */
function colocar(t, sael, odo) {
  t.w.chain = createChain(sael[0], sael[1], odo[0], odo[1], CONFIG);
  const [A, B] = t.w.players;
  Object.assign(A, {
    x: sael[0],
    z: sael[1],
    px: sael[0],
    pz: sael[1],
    vx: 0,
    vz: 0,
  });
  Object.assign(B, {
    x: odo[0],
    z: odo[1],
    px: odo[0],
    pz: odo[1],
    vx: 0,
    vz: 0,
  });
}

/**
 * Corre hasta que el enemigo 0 empieza a avisar, apunta su marca hacia +x desde donde está y deja a
 * los jugadores en las posiciones dadas. Devuelve el enemigo.
 */
function avisoHaciaX(t, sael, odo) {
  const e = t.h.enemigos[0];
  for (let i = 0; i < 60 * 6 && e.etapa !== "telegrafia"; i++) t.correr(1);
  expect(e.etapa).toBe("telegrafia");
  e.face = 0;
  e._zona.x = e.x;
  e._zona.z = e.z;
  e._zona.ang = 0;
  colocar(t, [e.x + sael[0], e.z + sael[1]], [e.x + odo[0], e.z + odo[1]]);
  return e;
}

describe("revisión: el golpe usa la geometría del aviso", () => {
  const P = CONFIG.player.radius;
  const B = E.brincador.ataque;

  it("la embestida no alcanza a quien tiene el cuerpo entero fuera de la franja anunciada", () => {
    const t = arena([{ tipo: "brincador", x: 0, z: 0 }], [-1.5, 6], [1.5, 6]);
    const lado = B.ancho / 2 + P + 0.075; // m del eje: el cuerpo queda 7,5 cm fuera de la franja
    const e = avisoHaciaX(t, [3, lado], [3, lado + 3]);
    t.correr(60 * 2, {}, {}, () => {});
    expect(e.etapa).not.toBe("telegrafia");
    expect(deTipo(t.eventos, "enemigo:golpe")).toHaveLength(0);
    expect(t.w.players[0].hp).toBe(CONFIG.player.maxHp);
  });

  it("la embestida sí alcanza a quien pisa la franja", () => {
    const t = arena([{ tipo: "brincador", x: 0, z: 0 }], [-1.5, 6], [1.5, 6]);
    const lado = B.ancho / 2 + P - 0.1; // el cuerpo entra 10 cm en la franja
    avisoHaciaX(t, [3, lado], [3, lado + 3]);
    t.correr(60 * 2);
    const g = deTipo(t.eventos, "enemigo:golpe");
    expect(g.map((x) => x.jugador)).toEqual([0]);
  });

  it("si la carga topa con una columna, no alcanza a quien está detrás", () => {
    const t = arena([{ tipo: "brincador", x: 0, z: 0 }], [-1.5, 6], [1.5, 6]);
    const e = avisoHaciaX(t, [5.5, 0], [5.5, 3]);
    t.w.pillars.push({ id: 0, x: e.x + 3, z: e.z + 0.0, r: 0.8 }); // columna en mitad de la línea
    t.correr(60 * 2);
    expect(deTipo(t.eventos, "enemigo:golpe")).toHaveLength(0);
  });

  it("el tajo pega en el arco anunciado aunque empujen al segador durante el aviso", () => {
    const t = arena([{ tipo: "segador", x: 0, z: 0 }], [-1.5, 3], [1.5, 3]);
    const S = E.segador.ataque;
    // Sael queda detrás del arco anunciado (a −x del origen), Odo lejos.
    const e = avisoHaciaX(t, [-1, 0], [-1, 5]);
    const ox = e._zona.x;
    // Justo antes del golpe, el segador aparece 2,2 m más atrás: Sael quedaría dentro de un arco movido.
    e.etapaT = e.etapaDur - dt / 2;
    e.x = ox - 2.2;
    t.correr(Math.ceil(S.activo / dt) + 2);
    expect(deTipo(t.eventos, "enemigo:golpe")).toHaveLength(0);
    expect(t.w.players[0].hp).toBe(CONFIG.player.maxHp);
  });

  it("el tajo pega a quien está dentro del arco anunciado", () => {
    const t = arena([{ tipo: "segador", x: 0, z: 0 }], [-1.5, 3], [1.5, 3]);
    const S = E.segador.ataque;
    avisoHaciaX(t, [1.3, 0], [1.3, 5]);
    t.correr(Math.ceil((S.telegrafia.normal + S.activo) / dt) + 2);
    expect(deTipo(t.eventos, "enemigo:golpe").map((x) => x.jugador)).toEqual([
      0,
    ]);
  });
});
