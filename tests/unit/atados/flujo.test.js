// Flujo de la partida: caída → recorrido → arco → jefe → victoria (D-205, D-211, D-213).
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearPartida } from "../../../src/atados/core/flujo.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";
import {
  crearTienda,
  juntoAlCarro,
} from "../../../src/atados/gameplay/tienda.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";
import {
  saltarPresentacion,
  ponerVidaJefe,
} from "../../../src/atados/gameplay/combate.js";

const DT = CONFIG.sim.fixedDt;
const F = CONFIG.recorrido.flujo;

/** Entrada simulada (como input.js): `st.inputs` se copia en cada muestreo; un toque de dash dura un muestreo. */
function fuente() {
  const st = { inputs: [emptyInput(), emptyInput()], debug: [] };
  return {
    st,
    sample: () => {
      const r = { inputs: st.inputs.map((x) => ({ ...x })), debug: st.debug };
      for (const x of st.inputs) if (x.dashDown === false) x.dash = false;
      st.debug = [];
      return r;
    },
  };
}

/** Partida con su fuente de entrada y un registro de todos los eventos que va soltando. */
function nueva(opts = {}) {
  const f = fuente();
  const p = crearPartida(CONFIG, { seed: 4, sample: f.sample, ...opts });
  const vistos = [];
  /** Avanza `s` segundos en cuadros de un paso. */
  const correr = (s) => {
    const n = Math.ceil(s / DT);
    for (let i = 0; i < n; i++) {
      p.update(DT);
      vistos.push(...p.eventos);
      p.eventos.length = 0;
    }
  };
  const tipos = () => vistos.map((e) => e.tipo);
  return { p, f, vistos, correr, tipos };
}

describe("flujo de la partida", () => {
  it("empieza cayendo y pasa a recorrido al aterrizar", () => {
    const { p, correr, tipos } = nueva();
    expect(p.estado).toBe("caida");
    expect(p.juego).toBe(p.juegoRecorrido);
    correr(CONFIG.recorrido.lobby.caida.duracion + 0.1);
    expect(p.estado).toBe("recorrido");
    expect(tipos()).toContain("caida:aterriza"); // los eventos del recorrido llegan a la partida
    expect(tipos()).toContain("tutorial:mostrar");
  });

  it("al cruzar el arco avisa para montar la pradera y espera fundido, silencio y la carga", () => {
    const { p, correr, vistos } = nueva();
    p.saltarCaida();
    p.irA(CONFIG.recorrido.pasillo.umbral.s + 1);
    correr(DT * 2);
    expect(p.estado).toBe("arco");
    const preparar = vistos.filter((e) => e.tipo === "jefe:preparar");
    expect(preparar).toHaveLength(1);
    expect(preparar[0].jefe).toBe("mirra");
    expect(p.fundidoArco).toBeGreaterThan(0);
    // Sin el aviso de carga no se entra aunque pase el tiempo.
    correr(F.fundidoArco + F.silencioArco + 1);
    expect(p.estado).toBe("arco");
    expect(p.fundidoArco).toBe(1);
    expect(
      vistos.some((e) => e.tipo === "silencio" && e.motivo === "umbral"),
    ).toBe(true); // tras el fundido (D-183)
    p.jefeListo();
    expect(p.estado).toBe("jefe"); // ya había esperado de sobra: entra en el acto
    expect(p.combate?.id).toBe("mirra");
  });

  it("con la pradera cargada antes, entra justo tras fundido + silencio", () => {
    const { p, correr } = nueva({ caida: false });
    p.jefeListo();
    p.cruzarArco();
    expect(p.estado).toBe("arco");
    correr(F.fundidoArco + F.silencioArco - 0.1);
    expect(p.estado).toBe("arco");
    correr(0.2);
    expect(p.estado).toBe("jefe");
  });

  it("el primer combate trae cinemática y esquivar tras la derrota no lo reinicia", () => {
    const { p, f, correr, vistos } = nueva({ caida: false });
    expect(p.cinematica).toBe(false); // antes del jefe no hay cinemática
    p.saltarAlJefe();
    expect(
      p.eventos.some((e) => e.tipo === "jefe:entra" && e.cinematica === true),
    ).toBe(true);
    expect(p.cinematica).toBe(true);
    const C = CONFIG.jefes.comun;
    expect(p.combate?.presentacion.T).toBe(C.presentacion.primera);
    // Caen ambos. Ni esperar ni pulsar esquiva puede iniciar otro combate.
    const c = p.combate;
    if (!c) throw new Error("sin combate");
    saltarPresentacion(c);
    killPlayer(c.w.players[0]);
    killPlayer(c.w.players[1]);
    correr(1);
    expect(c.estado).toBe("derrota");
    f.st.inputs[0] = { ...emptyInput(), dash: true, dashDown: false };
    correr(DT * 2);
    expect(p.combate).toBe(c);
    expect(c.estado).toBe("derrota");
    expect(vistos.some((e) => e.tipo === "derrota")).toBe(true); // no se pierden los del combate viejo
  });

  it("vencer al jefe pasa a victoria", () => {
    const { p, correr } = nueva({ caida: false });
    p.saltarAlJefe();
    const c = p.combate;
    if (!c) throw new Error("sin combate");
    ponerVidaJefe(c, 0);
    correr(DT * 2);
    expect(p.estado).toBe("victoria");
  });

  it("recorre la secuencia completa caída → recorrido → arco → jefe con estados en orden", () => {
    const { p, correr, vistos } = nueva();
    correr(CONFIG.recorrido.lobby.caida.duracion + 0.1);
    p.irA(CONFIG.recorrido.pasillo.umbral.s + 1);
    correr(DT * 2);
    p.jefeListo();
    correr(F.fundidoArco + F.silencioArco + 0.1);
    const estados = vistos
      .filter((e) => e.tipo === "flujo:estado")
      .map((e) => e.estado);
    expect(estados).toEqual(["recorrido", "arco", "jefe"]);
    expect(p.world).toBe(p.combate?.w);
  });

  it("caer los dos en el pasillo lo reinicia sin salir del recorrido", () => {
    const { p, correr, tipos } = nueva({ caida: false });
    p.irA(30);
    killPlayer(p.world.players[0]);
    killPlayer(p.world.players[1]);
    correr(F.reinicioPasillo + 0.1);
    expect(tipos()).toContain("pasillo:reinicio");
    expect(p.estado).toBe("recorrido");
    expect(p.world.players.every((pl) => pl.alive)).toBe(true);
  });

  it("es determinista: misma semilla y mismas entradas dan el mismo estado", () => {
    const foto = () => {
      const { p, f, correr } = nueva();
      correr(CONFIG.recorrido.lobby.caida.duracion + 0.1);
      p.irA(34);
      f.st.inputs[0] = { ...emptyInput(), mx: -0.6, mz: -0.4 };
      f.st.inputs[1] = { ...emptyInput(), mx: 0.6, mz: -0.4 };
      correr(6);
      return JSON.stringify(
        p.recorrido.estado.enemigos.map((e) => [e.x, e.z, e.hp]),
      );
    };
    expect(foto()).toBe(foto());
  });
});

describe("revisión del flujo", () => {
  it("la vida y el caído del pasillo pasan al primer combate (D-020, D-168)", () => {
    const { p, correr, vistos } = nueva({ caida: false });
    killPlayer(p.world.players[0]); // Sael cae en el pasillo
    p.world.players[1].hp = 380; // Odo llega tocado
    p.jefeListo();
    p.cruzarArco();
    correr(F.fundidoArco + F.silencioArco + 0.1);
    expect(p.estado).toBe("jefe");
    const c = p.combate;
    if (!c) throw new Error("sin combate");
    const [S, O] = c.w.players;
    expect(S.alive).toBe(false);
    expect(S.hp).toBe(0);
    expect(O.alive).toBe(true);
    expect(O.hp).toBe(380);
    correr(DT * 3);
    expect(vistos.some((e) => e.tipo === "jugador_cae")).toBe(false); // ya venía caído: no se anuncia otra vez
    saltarPresentacion(c);
    killPlayer(O);
    correr(DT);
    expect(c.estado).toBe("derrota");
  });

  it("volver a jugar tras ganar inicia un combate nuevo con presentación corta y permite otra victoria", () => {
    const { p, correr } = nueva({ caida: false });
    p.saltarAlJefe();
    const primero = p.combate;
    ponerVidaJefe(primero, 0);
    correr(DT);
    expect(p.estado).toBe("victoria");
    p.reintentarJefe();
    const siguiente = p.combate;
    expect(siguiente).not.toBe(primero);
    expect(p.estado).toBe("jefe");
    expect(p.cinematica).toBe(false);
    expect(siguiente.presentacion.T).toBe(
      CONFIG.jefes.comun.presentacion.reintento,
    );
    p.update(DT);
    expect(
      p.eventos.filter((e) => e.tipo === "presentacion_inicio"),
    ).toHaveLength(1);
    ponerVidaJefe(siguiente, 0);
    correr(DT);
    expect(p.estado).toBe("victoria");
  });

  it("se compra en el puesto con la recompensa de cada victoria", () => {
    const tienda = crearTienda(CONFIG);
    const fuenteEntrada = fuente();
    const p = crearPartida(tienda.cfg, { sample: fuenteEntrada.sample });
    expect(p.entrarPuesto()).toBe(false);
    p.saltarAlJefe();
    p.world.players[1].hp = 380; // el jugador que sobrevivió conserva su vida
    ponerVidaJefe(p.combate, 0);
    p.update(DT);
    const cobrarVictorias = () => {
      const victorias = p.eventos.filter((e) => e.tipo === "victoria");
      for (const victoria of victorias) tienda.acreditar(victoria.monedas);
      p.eventos.length = 0; // el coordinador consume todos los eventos una sola vez por cuadro
      return victorias.length;
    };
    expect(cobrarVictorias()).toBe(1);
    p.update(DT);
    expect(cobrarVictorias()).toBe(0); // la lápida permanece a la vista sin repetir el abono
    expect(tienda.saldo).toBe(25);
    expect(p.entrarPuesto()).toBe(true);
    expect(p.entrarPuesto()).toBe(false);
    expect(cobrarVictorias()).toBe(0); // continuar dos veces no repite la victoria
    expect(p.recorrido.estado.fase).toBe("puesto");
    expect(p.combate).toBe(null);
    expect(p.recorrido.estado.enemigos).toEqual([]);
    expect(p.world.players[1].hp).toBe(380);
    p.eventos.length = 0;
    const cerca = () =>
      juntoAlCarro(p.world.players, CONFIG.tienda.carro, CONFIG.tienda.alcance);
    expect(cerca()).toBe(false);
    for (const entrada of fuenteEntrada.st.inputs) entrada.mz = -1;
    for (let i = 0; i < 55; i++) p.update(DT); // ambos andan hasta la ventanilla desde el punto de llegada
    expect(cerca()).toBe(true);
    expect(tienda.comprar("italiano", p.world.players)).toBe(true);
    expect(p.world.players[1].hp).toBe(630);
    for (let i = 0; i < 600; i++) p.update(DT); // llegan al final y se quedan, sin desencadenar otro encuentro
    expect(p.estado).toBe("puesto");
    expect(p.eventos).toEqual([]);
    for (const j of p.world.players)
      expect(j.z).toBeGreaterThanOrEqual(CONFIG.recorrido.salida.zFin);
    p.reintentarJefe(); // solo una acción explícita reabre la arena
    expect(p.estado).toBe("jefe");
    expect(p.cinematica).toBe(false);
    expect(p.world.players[0].hp).toBe(1250);
    expect(cobrarVictorias()).toBe(0); // reintentar conserva el saldo gastado hasta vencer
    expect(tienda.saldo).toBe(0);
    ponerVidaJefe(p.combate, 0);
    p.update(DT);
    expect(cobrarVictorias()).toBe(1); // esta victoria corresponde al nuevo combate
    expect(tienda.saldo).toBe(25);
    expect(p.entrarPuesto()).toBe(true);
    expect(tienda.comprar("mote", p.world.players)).toBe(true);
    expect(tienda.saldo).toBe(0);
  });

  it("el resultado no depende de cómo se agrupen los pasos en cuadros", () => {
    const foto = (porCuadro) => {
      const { p } = nueva({ caida: false });
      p.jefeListo();
      p.irA(CONFIG.recorrido.pasillo.umbral.s + 1);
      const N = 159;
      for (let i = 0; i < N / porCuadro; i++) {
        p.update(DT * porCuadro);
        p.eventos.length = 0;
      }
      return JSON.stringify({
        estado: p.estado,
        t: p.t.toFixed(9),
        tEstado: p.tEstado.toFixed(9),
        combate: p.combate?.estado ?? null,
        tc: p.combate?.t.toFixed(9) ?? null,
        jugadores: p.world.players.map((pl) => [
          pl.x.toFixed(6),
          pl.z.toFixed(6),
        ]),
      });
    };
    expect(foto(3)).toBe(foto(1));
  });

  it("silencio del arco: empieza al terminar el fundido y se cierra al entrar a la presentación (D-183, D-211)", () => {
    const { p, correr, vistos } = nueva({ caida: false });
    p.cruzarArco();
    vistos.push(...p.eventos);
    p.eventos.length = 0;
    const umbral = () =>
      vistos.filter((e) => e.tipo === "silencio" && e.motivo === "umbral");
    correr(F.fundidoArco - 0.05);
    expect(umbral()).toHaveLength(0); // aún en el fundido
    correr(0.1);
    expect(umbral()).toHaveLength(1);
    correr(F.silencioArco + 2); // la pradera tarda: el silencio sigue abierto
    expect(vistos.some((e) => e.tipo === "silencio:fin")).toBe(false);
    p.jefeListo();
    const tipos = p.eventos.map((e) => e.tipo);
    const fin = tipos.indexOf("silencio:fin");
    expect(fin).toBeGreaterThan(-1);
    expect(fin).toBeLessThan(tipos.indexOf("jefe:entra"));
    expect(tipos.indexOf("jefe:entra")).toBeLessThan(
      tipos.indexOf("presentacion_inicio"),
    );
    expect(umbral()).toHaveLength(1);
  });

  it("en difícil, la esquiva tampoco reinicia a Mirra tras la derrota", () => {
    const { p, f, correr } = nueva({ caida: false, dificil: true });
    p.saltarAlJefe();
    const c = p.combate;
    if (!c) throw new Error("sin combate");
    saltarPresentacion(c);
    killPlayer(c.w.players[0]);
    killPlayer(c.w.players[1]);
    correr(1);
    p.eventos.length = 0;
    f.st.inputs[0] = { ...emptyInput(), dash: true, dashDown: false };
    p.update(DT);
    expect(p.combate).toBe(c);
    expect(c.estado).toBe("derrota");
    expect(p.eventos.some((e) => e.tipo === "presentacion_inicio")).toBe(false);
  });

  it("el reinicio de depuración durante el arco cancela la entrada al jefe de una vez", () => {
    const { p, f, correr, vistos } = nueva({ caida: false });
    p.cruzarArco();
    correr(F.fundidoArco + 0.2); // ya en silencio
    f.st.debug = ["reset"];
    correr(DT);
    expect(p.estado).toBe("recorrido");
    expect(p.recorrido.estado.umbralCruzado).toBe(false);
    expect(vistos.some((e) => e.tipo === "silencio:fin")).toBe(true);
    // El aviso de carga que llega tarde no salta del lobby a Mirra.
    p.jefeListo();
    correr(F.fundidoArco + F.silencioArco + 0.5);
    expect(p.estado).toBe("recorrido");
    expect(p.juegoJefe).toBe(null);
    // Volver a cruzar: un solo umbral más y entra con su espera completa.
    const antes = vistos.filter((e) => e.tipo === "umbral:cruzado").length;
    p.irA(CONFIG.recorrido.pasillo.umbral.s + 1);
    correr(DT * 2);
    expect(p.estado).toBe("arco");
    expect(vistos.filter((e) => e.tipo === "umbral:cruzado").length).toBe(
      antes + 1,
    );
    correr(F.fundidoArco + F.silencioArco + 0.1);
    expect(p.estado).toBe("jefe");
  });

  it("dos reemplazos de combate entre lecturas no pierden eventos", () => {
    const { p, f } = nueva({ caida: false });
    p.saltarAlJefe();
    p.eventos.length = 0;
    p.juegoJefe?.reintentar(); // primer reemplazo
    f.st.debug = ["reset"]; // segundo reemplazo, en el cuadro siguiente
    p.update(DT);
    const inicios = p.eventos.filter((e) => e.tipo === "presentacion_inicio");
    expect(inicios).toHaveLength(2);
  });
});
