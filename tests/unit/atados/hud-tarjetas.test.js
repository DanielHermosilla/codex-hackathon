import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { IDIOMAS } from "../../../src/atados/i18n/index.js";
import {
  TARJETAS,
  CLAVES_TARJETA,
  claveTarjeta,
  nuevasTarjetas,
  aplicarEventoTarjeta,
  avanzarTarjeta,
  tiemposTarjeta,
  faseTarjeta,
  gruposTeclas,
  ESTILOS_TARJETAS,
} from "../../../src/atados/ui/hud-tarjetas.js";
import { t } from "../../../src/atados/i18n/index.js";
import {
  CINE,
  avanzarCine,
  suaveCine,
  nuevaSyncCine,
  pasoSyncCine,
} from "../../../src/atados/ui/cinematica.js";

const T = { entrada: 0.25, salida: 0.25, duracion: 4 };
const teclado = {
  dispositivo: ["teclado", "teclado"],
  familia: ["xbox", "xbox"],
};
const mandos = { dispositivo: ["mando", "mando"], familia: ["xbox", "xbox"] };

describe("tarjetas del tutorial (D-206, D-207)", () => {
  it("hay una tarjeta por cada paso del recorrido, con textos en las dos lenguas", () => {
    const pasos = CONFIG.recorrido.pasillo.tutorial.map((p) => p.clave);
    expect(CLAVES_TARJETA.slice().sort()).toEqual(pasos.slice().sort());
    for (const c of CLAVES_TARJETA)
      for (const id of ["es", "en"])
        for (const k of ["titulo", "linea"])
          expect(
            IDIOMAS[id][`tarjeta.${c}.${k}`],
            `${id}:${c}.${k}`,
          ).toBeTruthy();
  });

  it("claveTarjeta acepta la clave corta o la completa, y nada más", () => {
    expect(claveTarjeta("dash")).toBe("dash");
    expect(claveTarjeta("tutorial.enredo")).toBe("enredo");
    expect(claveTarjeta("corte")).toBe(null);
    expect(claveTarjeta(undefined)).toBe(null);
  });

  it("entra deslizando, se queda y sale sola tras la duración", () => {
    const est = nuevasTarjetas();
    expect(
      aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "mover" }),
    ).toBe(true);
    avanzarTarjeta(est, 0, T);
    expect(est.actual?.e).toBe(0);
    avanzarTarjeta(est, T.entrada, T);
    expect(est.actual?.e).toBe(1);
    avanzarTarjeta(est, T.duracion - T.entrada - 0.01, T);
    expect(est.actual?.saliendo).toBe(false);
    avanzarTarjeta(est, 0.02, T); // pasa la duración: empieza a salir
    expect(est.actual?.saliendo).toBe(true);
    expect(est.actual?.e ?? 0).toBeLessThan(1);
    avanzarTarjeta(est, T.salida, T);
    expect(est.actual).toBe(null);
  });

  it("ocultar con otra clave no tapa a la visible; sin clave, sí", () => {
    const est = nuevasTarjetas();
    aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "ancla" });
    expect(
      aplicarEventoTarjeta(est, { tipo: "tutorial:ocultar", clave: "mover" }),
    ).toBe(false);
    expect(est.actual?.saliendo).toBe(false);
    expect(aplicarEventoTarjeta(est, { tipo: "tutorial:ocultar" })).toBe(true);
    expect(est.actual?.saliendo).toBe(true);
  });

  it("la misma tarjeta no se reinicia; otra la reemplaza al momento", () => {
    const est = nuevasTarjetas();
    aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "dash" });
    avanzarTarjeta(est, 1, T);
    aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "dash" });
    expect(est.actual?.t).toBe(1);
    aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "enredo" });
    expect(est.actual?.clave).toBe("enredo");
    expect(est.actual?.t).toBe(0);
  });

  it("una clave que no es tarjeta queda para el aviso de texto", () => {
    const est = nuevasTarjetas();
    expect(
      aplicarEventoTarjeta(est, { tipo: "tutorial:mostrar", clave: "corte" }),
    ).toBe(false);
    expect(est.actual).toBe(null);
    expect(
      aplicarEventoTarjeta(est, { tipo: "mural:activar", id: "urna" }),
    ).toBe(false);
  });

  it("los tiempos salen de config", () => {
    const t = tiemposTarjeta(CONFIG);
    expect(t.duracion).toBe(CONFIG.recorrido.pasillo.tarjeta.duracion);
    expect(t.entrada).toBe(CONFIG.hud.tutorial.fundidoEntrada);
  });

  it("la fase recorre el bucle y con movimiento reducido es un fotograma fijo", () => {
    const P = TARJETAS.ancla.periodo;
    expect(faseTarjeta("ancla", P * 2 + 0.5, false)).toBeCloseTo(0.5);
    expect(faseTarjeta("ancla", 0.1, true)).toBeCloseTo(
      TARJETAS.ancla.quieto * P,
    );
    expect(faseTarjeta("ancla", 9, true)).toBe(faseTarjeta("ancla", 0, true));
  });

  it("teclas: coop con Sael y Odo lado a lado; solo con el dash unificado (D-151, D-191)", () => {
    const coop = gruposTeclas("dash", teclado, false, CONFIG);
    expect(coop.map((g) => g.jugador)).toEqual(["sael", "odo"]);
    expect(coop[0].iconos[0].etiqueta).toBe("Espacio");
    const solo = gruposTeclas("dash", teclado, true, CONFIG);
    expect(solo.length).toBe(1);
    expect(solo[0].jugador).toBe(null);
    // En solo, el ancla sigue siendo una por personaje (Shift izq. y Enter).
    expect(
      gruposTeclas("ancla", teclado, true, CONFIG).map((g) => g.jugador),
    ).toEqual(["sael", "odo"]);
    // Mover: WASD para Sael y flechas para Odo.
    const mover = gruposTeclas("mover", teclado, false, CONFIG);
    expect(mover[0].iconos[0].etiqueta).toBe("WASD");
  });

  it("con dos mandos iguales el botón común sale una sola vez", () => {
    const g = gruposTeclas("dash", mandos, false, CONFIG);
    expect(g.length).toBe(1);
    expect(g[0].iconos[0].tipo).toBe("mando");
  });

  it("un solo mando en modo solo: las teclas siguen el mapeo de la entrada real (input.sample(solo))", () => {
    // Sael con el mando y Odo sin mando propio: así lo ve el HUD con un único mando conectado.
    const unMando = {
      mandoCompartido: true,
      dispositivo: ["mando", "teclado"],
      familia: ["xbox", "xbox"],
    };
    const G = CONFIG.controls.gamepad;
    const X = CONFIG.hud.mando.xbox;
    // Mover: stick izquierdo para Sael y derecho para Odo (nada de flechas).
    const mover = gruposTeclas("mover", unMando, true, CONFIG);
    expect(mover.map((g) => [g.jugador, g.iconos[0].etiqueta])).toEqual([
      ["sael", t("tecla.stickIzq")],
      ["odo", t("tecla.stickDer")],
    ]);
    expect(mover.every((g) => g.iconos[0].tipo === "mando")).toBe(true);
    // El segundo mando está conectado pero quieto: el stick derecho de Sael ya no mueve a Odo.
    const dos = gruposTeclas(
      "mover",
      { ...unMando, mandoCompartido: false },
      true,
      CONFIG,
    );
    expect(dos[1].iconos[0].tipo).toBe("tecla");
    // Ancla: un gatillo por personaje (izquierdo Sael, derecho Odo).
    const ancla = gruposTeclas("ancla", unMando, true, CONFIG);
    expect(ancla.map((g) => [g.jugador, g.iconos[0].etiqueta])).toEqual([
      ["sael", X[G.solo.anclaSael]],
      ["odo", X[G.solo.anclaOdo]],
    ]);
    // Dash: el botón A hace esquivar a los dos (no la barra espaciadora).
    const dash = gruposTeclas("dash", unMando, true, CONFIG);
    expect(dash).toHaveLength(1);
    expect(dash[0].jugador).toBe(null);
    expect(dash[0].iconos[0]).toEqual({
      tipo: "mando",
      etiqueta: X[G.dash],
      jugador: null,
    });
    // Con mando de PlayStation, los rótulos de su familia.
    const ps = gruposTeclas(
      "ancla",
      {
        dispositivo: ["mando", "teclado"],
        familia: ["ps", "xbox"],
        mandoCompartido: true,
      },
      true,
      CONFIG,
    );
    expect(ps[0].iconos[0].etiqueta).toBe(
      CONFIG.hud.mando.ps[G.solo.anclaSael],
    );
    // En coop, el mismo estado sigue siendo partida mixta (cada uno lo suyo).
    expect(
      gruposTeclas("mover", unMando, false, CONFIG)[1].iconos[0].tipo,
    ).toBe("tecla");
  });

  it("oculta, la tarjeta no ocupa sitio: la regla de oculto le gana a su display:grid", () => {
    // `.hud .oculto` y `.hud .tarjeta` tienen la misma especificidad y la de la tarjeta va después;
    // hace falta una regla propia más específica que la deje en display:none.
    const regla = ESTILOS_TARJETAS.indexOf(
      ".hud .tarjeta.oculto{display:none;}",
    );
    expect(regla).toBeGreaterThan(ESTILOS_TARJETAS.indexOf(".hud .tarjeta{"));
  });
});

describe("franjas de cine (D-211)", () => {
  it("entran y salen a velocidad constante, sin pasarse", () => {
    let v = avanzarCine(0, 1, CINE.entrada / 2, CINE);
    expect(v).toBeCloseTo(0.5);
    v = avanzarCine(v, 1, CINE.entrada, CINE);
    expect(v).toBe(1);
    v = avanzarCine(v, 0, CINE.salida / 2, CINE);
    expect(v).toBeCloseTo(0.5);
    expect(avanzarCine(v, 0, 10, CINE)).toBe(0);
    expect(suaveCine(0)).toBe(0);
    expect(suaveCine(1)).toBe(1);
    expect(suaveCine(0.5)).toBeGreaterThan(0.5);
  });

  it("armadas, siguen a la presentación una sola vez (D-213)", () => {
    const s = nuevaSyncCine();
    expect(pasoSyncCine(s, true)).toBe(null); // sin armar no hacen nada
    s.armada = true;
    expect(pasoSyncCine(s, false)).toBe(null); // aún en el fundido y el silencio del arco
    expect(pasoSyncCine(s, true)).toBe("mostrar");
    expect(pasoSyncCine(s, true)).toBe("mostrar");
    expect(pasoSyncCine(s, false)).toBe("ocultar");
    expect(s.armada).toBe(false);
    expect(pasoSyncCine(s, true)).toBe(null); // el reintento no repite la cinemática
  });
});
