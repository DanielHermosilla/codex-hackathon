// Recorrido de inicio: lobby + pasillo en un solo mundo (D-204 a D-211). Ruta y límite, caída, tarjetas
// del tutorial, muñeco del lobby, murales, reinicio al caer los dos y arco de la cima.
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearRecorrido,
  pasoRecorrido,
  saltarCaida,
  colocarJugadores,
  irA,
} from "../../../src/atados/gameplay/recorrido.js";
import { puntoRuta } from "../../../src/atados/gameplay/ruta.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";

const dt = CONFIG.sim.fixedDt;
const R = CONFIG.recorrido;
const T = R.pasillo.tarjeta;

/** Avanza `n` pasos con la misma entrada para Sael (a) y Odo (b); devuelve los eventos de esos pasos. */
function correr(r, n, a = {}, b = {}) {
  const ins = [emptyInput(), emptyInput()];
  const vistos = [];
  for (let i = 0; i < n; i++) {
    Object.assign(ins[0], a);
    Object.assign(ins[1], b);
    pasoRecorrido(r, ins, dt);
    vistos.push(...r.eventos);
    r.eventos.length = 0;
  }
  return vistos;
}

/** Pasos que dura `s` segundos. */
const pasos = (s) => Math.ceil(s / dt);

/** Solo los eventos de un tipo. */
const deTipo = (evs, tipo) => evs.filter((e) => e.tipo === tipo);

/** Recorrido ya aterrizado y sin la tarjeta de «mover» a la vista. */
function aterrizado(opts = {}) {
  const r = crearRecorrido(CONFIG, { seed: 3, ...opts });
  saltarCaida(r);
  return r;
}

describe("ruta y límite (lobby ∪ pasillo)", () => {
  it("el borde deja andar por el claro del lobby y por el pasillo, y mete dentro lo que sale", () => {
    const r = crearRecorrido(CONFIG);
    const lim = r.w.limite;
    const enLobby = { x: 6, z: 6 };
    expect(lim(enLobby, 0.45)).toBe(false); // dentro del claro (radio 12)
    const q = puntoRuta(r.ruta, 100, 2);
    const enPasillo = { x: q.x, z: q.z };
    expect(lim(enPasillo, 0.45)).toBe(false); // dentro del pasillo (ancho 11)
    const fuera = { x: 0, z: 20 };
    expect(lim(fuera, 0.45)).toBe(true); // detrás del lobby: vuelve al borde del claro
    expect(Math.hypot(fuera.x, fuera.z)).toBeCloseTo(R.lobby.radio - 0.45, 6);
    const lado = puntoRuta(r.ruta, 100, 20);
    const p = { x: lado.x, z: lado.z };
    expect(lim(p, 0.45)).toBe(true); // muy al costado del pasillo: vuelve a su borde
    expect(lim(p, 0.45)).toBe(false);
  });

  it("las columnas salen de (s, d) sobre la ruta y el muñeco es el cuerpo del mundo", () => {
    const r = crearRecorrido(CONFIG);
    const c = R.pasillo.pilares[0];
    const q = puntoRuta(r.ruta, c.s, c.d);
    expect(r.w.pillars).toHaveLength(R.pasillo.pilares.length);
    expect(r.w.pillars[0].x).toBeCloseTo(q.x, 9);
    expect(r.w.pillars[0].z).toBeCloseTo(q.z, 9);
    expect(r.w.dummy.x).toBe(R.lobby.muneco.x);
    expect(r.w.dummy.r).toBe(R.lobby.muneco.radio);
  });

  it("corriendo por el pasillo nadie sale del borde", () => {
    const r = aterrizado();
    irA(r, 20);
    for (let k = 0; k < 4; k++) {
      correr(r, 60, { mx: 1, mz: -1 }, { mx: 1, mz: -1 }); // contra la pared derecha y hacia arriba
      for (const p of r.w.players) {
        const fuera = { x: p.x, z: p.z };
        expect(r.w.limite(fuera, CONFIG.player.radius - 1e-6)).toBe(false);
      }
    }
  });
});

describe("caída al valle (D-205)", () => {
  it("ignora las entradas, sube caidaK de 0 a 1 y aterriza con un evento", () => {
    const r = crearRecorrido(CONFIG);
    expect(r.estado.fase).toBe("caida");
    expect(r.estado.caidaK).toBe(0);
    const [sx, sz] = R.lobby.spawn.sael;
    const mitad = correr(
      r,
      pasos(R.lobby.caida.duracion / 2),
      { mx: 1 },
      { mx: 1 },
    );
    expect(r.estado.caidaK).toBeGreaterThan(0.4);
    expect(r.estado.caidaK).toBeLessThan(0.6);
    expect(r.w.players[0].x).toBeCloseTo(sx, 6); // no se movió pese a la entrada
    expect(r.w.players[0].z).toBeCloseTo(sz, 6);
    expect(deTipo(mitad, "caida:aterriza")).toHaveLength(0);
    const resto = correr(r, pasos(R.lobby.caida.duracion / 2) + 1);
    expect(r.estado.fase).toBe("recorrido");
    expect(r.estado.caidaK).toBe(1);
    expect(deTipo(resto, "caida:aterriza")).toHaveLength(1);
  });
});

describe("tarjetas del tutorial (D-206)", () => {
  it("«mover» sale al aterrizar y se oculta sola tras su duración", () => {
    const r = crearRecorrido(CONFIG);
    const evs = correr(r, pasos(R.lobby.caida.duracion) + 2);
    expect(deTipo(evs, "tutorial:mostrar").map((e) => e.clave)).toEqual([
      "mover",
    ]);
    const luego = correr(r, pasos(T.duracion));
    expect(deTipo(luego, "tutorial:ocultar").map((e) => e.clave)).toEqual([
      "mover",
    ]);
  });

  it("«cortar» espera a que se avance o a acercarse al muñeco", () => {
    const r = aterrizado();
    correr(r, pasos(T.duracion + T.separacion + 2)); // quietos en el spawn
    expect(r.sigTarjeta).toBe(1); // solo salió «mover»
    const M = R.lobby.muneco;
    colocarJugadores(r, [M.x - 1.6, M.z], [M.x - 4.6, M.z]); // Sael a 1,6 m del muñeco, aún en s = 0
    expect(r.estado.s).toBeLessThan(R.pasillo.tutorial[1].s ?? 0);
    const evs = correr(r, 2);
    expect(deTipo(evs, "tutorial:mostrar").map((e) => e.clave)).toEqual([
      "cortar",
    ]);
  });

  it("salen en orden, una a la vez y con separación, aunque se pasen varias marcas juntas", () => {
    const r = aterrizado();
    irA(r, 125); // ya pasó todas las marcas
    const evs = correr(r, pasos(6 * (T.duracion + T.separacion)));
    const claves = deTipo(evs, "tutorial:mostrar").map((e) => e.clave);
    expect(claves).toEqual(R.pasillo.tutorial.map((x) => x.clave));
    // Entre un «mostrar» y el siguiente siempre hay un «ocultar» y al menos la separación.
    let visible = false;
    let ocultaT = -Infinity;
    for (const e of evs) {
      if (e.tipo === "tutorial:mostrar") {
        expect(visible).toBe(false);
        expect(e.t - ocultaT).toBeGreaterThanOrEqual(T.separacion - dt);
        visible = true;
      } else if (e.tipo === "tutorial:ocultar") {
        visible = false;
        ocultaT = e.t;
      }
    }
  });

  it("no exigen la acción: se ocultan aunque nadie haga nada", () => {
    const r = aterrizado();
    const evs = correr(r, pasos(T.duracion + 0.1));
    expect(deTipo(evs, "tutorial:ocultar")).toHaveLength(1);
  });

  it("tras reiniciar el pasillo no se repiten las ya vistas", () => {
    const r = aterrizado();
    irA(r, 10);
    correr(r, pasos(2 * (T.duracion + T.separacion))); // «mover» y «cortar»
    expect(r.sigTarjeta).toBe(2);
    killPlayer(r.w.players[0]);
    killPlayer(r.w.players[1]);
    const evs = correr(r, pasos(R.flujo.reinicioPasillo) + 2);
    expect(deTipo(evs, "pasillo:reinicio")).toHaveLength(1);
    irA(r, 30); // otra vez pasando por las marcas de «mover» y «cortar»
    const luego = correr(r, pasos(T.duracion + T.separacion));
    expect(deTipo(luego, "tutorial:mostrar").map((e) => e.clave)).toEqual([
      "ancla",
    ]);
  });
});

describe("muñeco del lobby (D-208)", () => {
  it("la cadena tensa le hace daño", () => {
    const r = aterrizado();
    const M = R.lobby.muneco;
    colocarJugadores(r, [M.x - 1.5, M.z + 2.5], [M.x + 1.5, M.z + 2.5]);
    correr(r, 50, { mx: -1 }, { mx: 1 });
    correr(r, 120, { mx: -0.5, mz: -1 }, { mx: 0.5, mz: -1 });
    expect(r.w.dummy.total).toBeGreaterThan(0);
  });

  it("al recibir su vida en daño cae, no recibe daño y se rearma con la cuenta a cero", () => {
    const r = aterrizado();
    const M = R.lobby.muneco;
    r.w.dummy.total = M.vida; // como si la cadena le hubiera quitado toda su vida
    const evs = correr(r, 1);
    expect(deTipo(evs, "muneco:cae")).toHaveLength(1);
    expect(r.estado.muneco.caido).toBe(true);
    expect(r.w.dummy.invulnerable).toBe(true);
    const medio = correr(r, pasos(M.rearme / 2));
    expect(deTipo(medio, "muneco:rearma")).toHaveLength(0);
    expect(r.estado.muneco.rearmeK).toBeGreaterThan(0.4);
    const fin = correr(r, pasos(M.rearme / 2) + 1);
    expect(deTipo(fin, "muneco:rearma")).toHaveLength(1);
    expect(r.estado.muneco.caido).toBe(false);
    expect(r.w.dummy.invulnerable).toBe(false);
    r.w.dummy.total += M.vida - 1; // casi otra vida: aún no cae
    expect(deTipo(correr(r, 1), "muneco:cae")).toHaveLength(0);
  });

  it("no bloquea la salida: se puede cruzar el arco sin tocarlo", () => {
    const r = aterrizado();
    irA(r, R.pasillo.umbral.s + 1);
    const evs = correr(r, 1);
    expect(deTipo(evs, "umbral:cruzado")).toHaveLength(1);
    expect(r.w.dummy.total).toBe(0);
  });
});

describe("murales (D-126)", () => {
  it("se activan al pasar su marca, el nuevo oculta al anterior y cada uno sale una vez", () => {
    const r = aterrizado();
    const [m1, m2] = R.pasillo.murales;
    irA(r, m1.s + 1);
    const a = correr(r, 2);
    expect(deTipo(a, "mural:activar").map((e) => e.id)).toEqual([m1.id]);
    irA(r, m2.s + 1);
    const b = correr(r, 2);
    expect(deTipo(b, "mural:ocultar").map((e) => e.id)).toEqual([m1.id]);
    expect(deTipo(b, "mural:activar").map((e) => e.id)).toEqual([m2.id]);
    irA(r, m1.s + 1); // volver atrás no lo repite
    expect(deTipo(correr(r, 2), "mural:activar")).toHaveLength(0);
  });

  it("caer los dos oculta el mural y tras el reinicio no se repite", () => {
    const r = aterrizado();
    const m1 = R.pasillo.murales[0];
    irA(r, m1.s + 1);
    correr(r, 2);
    killPlayer(r.w.players[0]);
    killPlayer(r.w.players[1]);
    const evs = correr(r, pasos(R.flujo.reinicioPasillo) + 2);
    expect(deTipo(evs, "mural:ocultar")).toHaveLength(1);
    irA(r, m1.s + 1);
    expect(deTipo(correr(r, 2), "mural:activar")).toHaveLength(0);
  });
});

describe("muerte en el pasillo (D-168, D-076)", () => {
  it("si cae uno se sigue jugando arrastrando su cadáver", () => {
    const r = aterrizado();
    irA(r, 20);
    killPlayer(r.w.players[1]);
    const evs = correr(r, pasos(3), { mz: -1 });
    expect(deTipo(evs, "pasillo:caidos")).toHaveLength(0);
    expect(r.caidos).toBe(false);
    expect(r.estado.s).toBeGreaterThan(20);
  });

  it("si caen los dos, tras la espera el pasillo se reinicia en el lobby sin repetir la caída", () => {
    const r = aterrizado();
    irA(r, 40);
    correr(r, pasos(2)); // los segadores despiertan y se mueven
    const enemigo = r.horda.enemigos[0];
    enemigo.hp = 1;
    const mundoViejo = r.w;
    killPlayer(r.w.players[0]);
    killPlayer(r.w.players[1]);
    const a = correr(r, 1);
    expect(deTipo(a, "pasillo:caidos")).toHaveLength(1);
    const b = correr(r, pasos(R.flujo.reinicioPasillo) + 1);
    expect(deTipo(b, "pasillo:reinicio")).toHaveLength(1);
    expect(deTipo(b, "caida:aterriza")).toHaveLength(0);
    expect(r.w).not.toBe(mundoViejo);
    expect(r.estado.fase).toBe("recorrido");
    expect(r.estado.caidaK).toBe(1);
    expect(
      r.w.players.every((p) => p.alive && p.hp === CONFIG.player.maxHp),
    ).toBe(true);
    expect(r.w.players[0].x).toBeCloseTo(R.lobby.spawn.sael[0], 6);
    expect(enemigo.hp).toBe(enemigo.hpMax);
    expect(enemigo.x).toBe(enemigo.x0);
    expect(enemigo.etapa).toBe("quieto");
  });
});

describe("arco de la cima (D-211)", () => {
  it("al pasar su marca emite umbral:cruzado una sola vez y calma a los enemigos", () => {
    const r = aterrizado();
    irA(r, R.pasillo.umbral.s - 2);
    expect(deTipo(correr(r, 1), "umbral:cruzado")).toHaveLength(0);
    irA(r, R.pasillo.umbral.s + 0.5);
    const evs = correr(r, pasos(1));
    expect(deTipo(evs, "umbral:cruzado")).toHaveLength(1);
    expect(r.estado.umbralCruzado).toBe(true);
    expect(r.estado.fase).toBe("arco");
    expect(r.horda.pasivos).toBe(true);
  });
});

describe("revisión: marcas del tutorial que se cruzan antes de su turno", () => {
  it("acercarse al muñeco mientras sale «mover» deja «cortar» pendiente aunque se vuelva al spawn", () => {
    const r = aterrizado();
    correr(r, 2); // sale «mover»
    expect(r.tarjetaVis).toBe(0);
    const M = R.lobby.muneco;
    const S = R.lobby.spawn;
    colocarJugadores(r, S.sael, [M.x - 1.5, M.z]); // Odo entra en el radio del muñeco…
    correr(r, 2);
    colocarJugadores(r, S.sael, S.odo); // …y vuelve al spawn antes de que se oculte «mover»
    expect(r.tarjetaVis).toBe(0);
    const evs = correr(r, pasos(T.duracion + T.separacion + 1)); // los dos quietos en el lobby
    expect(deTipo(evs, "tutorial:mostrar").map((e) => e.clave)).toEqual([
      "cortar",
    ]);
  });
});
