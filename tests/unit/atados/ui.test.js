import { describe, it, afterEach } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  setIdioma,
  IDIOMAS,
  tieneClave,
} from "../../../src/atados/i18n/index.js";
import {
  hexCss,
  coloresHud,
  estadoAnillo,
  segmentosVisibles,
  formatoNumero,
  tamanoNumero,
  datosNumero,
  formatoTiempo,
  escalon,
  seguirVida,
  etiquetaTecla,
  iconosAccion,
  elegirDispositivo,
  mandoActivo,
  partirTexto,
  jugadorDeTecla,
  asignarMandos,
  familiaMando,
  nuevoUI,
  aplicarEventoUI,
  avanzarUI,
  claveTutorial,
  claveMural,
} from "../../../src/atados/ui/hud-logica.js";

const cfg = CONFIG;
const jugador = (o = {}) => ({
  hp: cfg.player.maxHp,
  alive: true,
  anchored: false,
  dashT: 0,
  dashCd: 0,
  ...o,
});

describe("anillo diegético (D-063)", () => {
  it("vida llena: arco completo, sin dash ni ancla", () => {
    const s = estadoAnillo(jugador(), cfg, 0);
    expect(s).toMatchObject({
      vivo: true,
      vida: 1,
      vidaBaja: false,
      pulso: 1,
      dashProgreso: 1,
      dashEnCooldown: false,
      ancla: false,
    });
  });
  it("vida baja late entre pulsoMin y 1 sin salir de rango", () => {
    const A = cfg.hud.anillo;
    let min = 2,
      max = -1;
    for (let t = 0; t < 2; t += 0.01) {
      const s = estadoAnillo(jugador({ hp: 200 }), cfg, t);
      expect(s.vidaBaja).toBe(true);
      min = Math.min(min, s.pulso);
      max = Math.max(max, s.pulso);
    }
    expect(min).toBeGreaterThanOrEqual(A.pulsoMin - 1e-9);
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
    expect(max - min).toBeGreaterThan((1 - A.pulsoMin) * 0.9); // recorre casi todo el rango
  });
  it("el umbral de vida baja es el de config", () => {
    const lim = cfg.hud.anillo.vidaBaja * cfg.player.maxHp;
    expect(estadoAnillo(jugador({ hp: lim }), cfg).vidaBaja).toBe(true);
    expect(estadoAnillo(jugador({ hp: lim + 1 }), cfg).vidaBaja).toBe(false);
  });
  it("dash: progreso sube con la recarga y vale 0 durante el dash", () => {
    expect(
      estadoAnillo(jugador({ dashCd: cfg.dash.cooldown }), cfg).dashProgreso,
    ).toBe(0);
    const mitad = estadoAnillo(jugador({ dashCd: cfg.dash.cooldown / 2 }), cfg);
    expect(mitad.dashProgreso).toBeCloseTo(0.5);
    expect(mitad.dashEnCooldown).toBe(true);
    expect(
      estadoAnillo(jugador({ dashT: 0.1, dashCd: 0.3 }), cfg).dashProgreso,
    ).toBe(0);
  });
  it("ancla se refleja; el cadáver no muestra nada", () => {
    expect(estadoAnillo(jugador({ anchored: true }), cfg).ancla).toBe(true);
    const muerto = estadoAnillo(
      jugador({ hp: 0, alive: false, anchored: true, dashCd: 0.3 }),
      cfg,
    );
    expect(muerto).toMatchObject({
      vivo: false,
      vida: 0,
      ancla: false,
      dashEnCooldown: false,
      vidaBaja: false,
    });
  });
  it("segmentos: nunca desaparece con vida > 0 y no pasa del total", () => {
    expect(segmentosVisibles(0, 96)).toBe(0);
    expect(segmentosVisibles(0.001, 96)).toBe(1);
    expect(segmentosVisibles(1, 96)).toBe(96);
    expect(segmentosVisibles(1.4, 96)).toBe(96);
    expect(segmentosVisibles(0.5, 96)).toBe(48);
  });
});

describe("números de daño (D-166, D-112)", () => {
  const hit = (o = {}) => ({
    active: true,
    value: 40,
    idle: 0,
    shown: 0.8,
    maxT: 0.2,
    ...o,
  });
  it("formato entero y tamaño que crece con tope", () => {
    expect(formatoNumero(12.6)).toBe("13");
    const N = cfg.hud.numeroDano;
    expect(tamanoNumero(0, N)).toBe(N.tamanoMin);
    expect(tamanoNumero(100, N)).toBeGreaterThan(tamanoNumero(10, N));
    expect(tamanoNumero(1e9, N)).toBe(N.tamanoMax);
  });
  it("con el daño ×10 (D-202) el mismo golpe relativo se ve hasta ~20 % más grande, nunca gigante", () => {
    const N = cfg.hud.numeroDano;
    // Fórmula de antes de D-202: 22 + √valor × 5, tope 84, con el valor antes de multiplicar por 10.
    const antes = (v) => Math.min(84, 22 + Math.sqrt(v) * 5);
    for (const v of [1, 5, 10, 40, 100, 150]) {
      const ratio = tamanoNumero(v * 10, N) / antes(v);
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThanOrEqual(1.2);
    }
    expect(N.tamanoMax).toBeLessThanOrEqual(100);
  });
  it("visible mientras hay contacto y se apaga al terminar el fundido", () => {
    expect(datosNumero(hit(), cfg)).toMatchObject({
      texto: "40",
      opacidad: 1,
      fuerte: false,
    });
    const fade = datosNumero(
      hit({ active: false, shown: cfg.feedback.damageNumber.linger / 2 }),
      cfg,
    );
    expect(fade.opacidad).toBeCloseTo(0.5);
    expect(datosNumero(hit({ active: false, shown: 0 }), cfg)).toBeNull();
    expect(datosNumero(hit({ value: 0.1 }), cfg)).toBeNull();
  });
  it("marca el golpe fuerte al cruzar tensión alta", () => {
    expect(
      datosNumero(hit({ maxT: cfg.feedback.hitstop.tension }), cfg).fuerte,
    ).toBe(true);
  });
  it("se desactiva por config", () => {
    const apagado = {
      ...cfg,
      hud: { ...cfg.hud, numeroDano: { ...cfg.hud.numeroDano, activo: false } },
    };
    expect(datosNumero(hit(), apagado)).toBeNull();
  });
});

describe("utilidades de tiempo y barra", () => {
  it("mm:ss", () => {
    expect(formatoTiempo(192.4)).toBe("3:12");
    expect(formatoTiempo(5)).toBe("0:05");
  });
  it("escalon sube de 0 a 1", () => {
    expect(escalon(0.5, 1, 0.5)).toBe(0);
    expect(escalon(1.25, 1, 0.5)).toBeCloseTo(0.5);
    expect(escalon(9, 1, 0.5)).toBe(1);
    expect(escalon(1, 1, 0)).toBe(1);
  });
  it("la estela baja con tasa y sube de golpe", () => {
    expect(seguirVida(1, 0.5, 0.1, 1)).toBeCloseTo(0.9);
    expect(seguirVida(0.55, 0.5, 1, 1)).toBe(0.5);
    expect(seguirVida(0.4, 0.8, 0.1, 1)).toBe(0.8);
  });
});

describe("colores: solo tokens de la paleta (D-188, D-142)", () => {
  it("coloresHud sale de CONFIG.paleta", () => {
    const C = coloresHud(cfg.paleta);
    expect(C.sael).toBe(cfg.paleta.jugadores.sael);
    expect(C.odo).toBe(cfg.paleta.jugadores.odo);
    expect(C.barra).toBe(cfg.paleta.corrupcion.veta);
    expect(C.barra).not.toBe(cfg.paleta.gameplay.peligro); // el rojo es solo peligro
    for (const v of Object.values(C)) expect(Number.isInteger(v)).toBe(true);
  });
  it("hexCss", () => {
    expect(hexCss(0x4fb0ff)).toBe("#4fb0ff");
    expect(hexCss(0x0a0b0c)).toBe("#0a0b0c");
  });
});

describe("iconos de tecla / botón", () => {
  afterEach(() => setIdioma("es"));
  it("etiquetas de teclas", () => {
    expect(etiquetaTecla("KeyW")).toBe("W");
    expect(etiquetaTecla("ArrowUp")).toBe("↑");
    expect(etiquetaTecla("Digit1")).toBe("1");
    expect(etiquetaTecla("Space")).toBe("Espacio");
    expect(etiquetaTecla("ShiftRight")).toBe("Shift der.");
    setIdioma("en");
    expect(etiquetaTecla("Space")).toBe("Space");
    expect(etiquetaTecla("ShiftLeft")).toBe("Left Shift");
  });
  it("teclado: un icono por jugador con las teclas de config", () => {
    const K = cfg.controls.keyboard;
    const dash = iconosAccion("dash", { dispositivo: "teclado" }, cfg);
    expect(dash.map((i) => i.jugador)).toEqual(["sael", "odo"]);
    expect(dash[0].etiqueta).toBe(etiquetaTecla(K.sael.dash[0]));
    expect(dash[1].etiqueta).toBe(etiquetaTecla(K.odo.dash[0]));
    expect(
      iconosAccion("mover", { dispositivo: "teclado" }, cfg).map(
        (i) => i.etiqueta,
      ),
    ).toEqual(["WASD", "↑←↓→"]);
  });
  it("separa las teclas de movimiento con nombres largos en las tarjetas", () => {
    const config = structuredClone(cfg);
    config.controls.keyboard.sael.up = "Numpad8";
    expect(iconosAccion("mover", {}, config)[0].etiqueta).toBe("Num 8 A S D");
  });
  it("teclado en solo: el dash es uno solo (D-016, D-120); el ancla sigue por jugador", () => {
    const dash = iconosAccion(
      "dash",
      { dispositivo: "teclado", solo: true },
      cfg,
    );
    expect(dash).toHaveLength(1);
    expect(dash[0].jugador).toBeNull();
    expect(
      iconosAccion("ancla", { dispositivo: "teclado", solo: true }, cfg),
    ).toHaveLength(2);
  });
  it("mando: un botón compartido según la config", () => {
    const G = cfg.controls.gamepad;
    const dash = iconosAccion("dash", { dispositivo: "mando" }, cfg);
    expect(dash).toEqual([
      { tipo: "mando", etiqueta: cfg.hud.mando.xbox[G.dash], jugador: null },
    ]);
    expect(
      iconosAccion("ancla", { dispositivo: "mando" }, cfg)[0].etiqueta,
    ).toBe(cfg.hud.mando.xbox[G.anchor]);
    expect(
      iconosAccion("mover", { dispositivo: "mando" }, cfg)[0].etiqueta,
    ).toBe("Stick izq.");
  });
  it("dispositivo: gana el último usado", () => {
    expect(elegirDispositivo("teclado", { mando: true })).toBe("mando");
    expect(elegirDispositivo("mando", { tecla: true })).toBe("teclado");
    expect(elegirDispositivo("mando", {})).toBe("mando");
  });
  it("detecta mando con el mismo criterio que la entrada real", () => {
    const G = cfg.controls.gamepad;
    const pad = (axes, pulsados = [], valores = {}) => ({
      axes,
      buttons: Array.from({ length: 12 }, (_, i) => ({
        pressed: pulsados.includes(i),
        value: valores[i] ?? (pulsados.includes(i) ? 1 : 0),
      })),
    });
    expect(mandoActivo(null, G)).toBe(false);
    expect(mandoActivo(pad([0, 0.1]), G)).toBe(false);
    expect(mandoActivo(pad([0.3, 0]), G)).toBe(true); // entre la zona muerta (0,2) y 0,5: el personaje ya se mueve
    expect(mandoActivo(pad([0.15, 0.15]), G)).toBe(
      Math.hypot(0.15, 0.15) >= G.deadzone,
    ); // la norma, no cada eje
    expect(mandoActivo(pad([0, 0, 0.5, 0]), G, true)).toBe(true);
    expect(mandoActivo(pad([0, 0, 0.5, 0]), G, false)).toBe(false);
    expect(mandoActivo(pad([0, 0], [G.dash]), G)).toBe(true);
    expect(
      mandoActivo(pad([0, 0], [], { [G.anchor]: G.anchorThreshold + 0.1 }), G),
    ).toBe(true);
    expect(
      mandoActivo(pad([0, 0], [], { [G.anchor]: G.anchorThreshold - 0.1 }), G),
    ).toBe(false);
  });
  it("partida mixta: Sael con teclado y Odo con mando muestran cada uno lo suyo", () => {
    const K = cfg.controls.keyboard,
      G = cfg.controls.gamepad;
    const dash = iconosAccion(
      "dash",
      { dispositivo: ["teclado", "mando"] },
      cfg,
    );
    expect(dash).toEqual([
      {
        tipo: "tecla",
        etiqueta: etiquetaTecla(K.sael.dash[0]),
        jugador: "sael",
      },
      { tipo: "mando", etiqueta: cfg.hud.mando.xbox[G.dash], jugador: "odo" },
    ]);
    const inverso = iconosAccion(
      "ancla",
      { dispositivo: ["mando", "teclado"] },
      cfg,
    );
    expect(inverso.map((i) => [i.tipo, i.jugador])).toEqual([
      ["mando", "sael"],
      ["tecla", "odo"],
    ]);
    expect(
      iconosAccion("mover", { dispositivo: ["teclado", "mando"] }, cfg).map(
        (i) => i.etiqueta,
      ),
    ).toEqual(["WASD", "Stick izq."]);
  });
  it("familia del mando por id y glifos de PlayStation", () => {
    const G = cfg.controls.gamepad;
    expect(
      familiaMando(
        "Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)",
      ),
    ).toBe("xbox");
    expect(
      familiaMando(
        "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)",
      ),
    ).toBe("ps");
    expect(familiaMando("DualSense Wireless Controller")).toBe("ps");
    expect(familiaMando("054c-09cc-Wireless Controller")).toBe("ps");
    expect(
      familiaMando(
        "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
      ),
    ).toBe("xbox");
    expect(familiaMando("045e-0b13-Xbox Wireless Controller")).toBe("xbox");
    expect(familiaMando("")).toBe("xbox");
    expect(familiaMando()).toBe("xbox");
    const ps = iconosAccion(
      "dash",
      { dispositivo: "mando", familia: "ps" },
      cfg,
    );
    expect(ps).toEqual([
      { tipo: "mando", etiqueta: cfg.hud.mando.ps[G.dash], jugador: null },
    ]);
    expect(
      iconosAccion("ancla", { dispositivo: "mando", familia: "ps" }, cfg)[0]
        .etiqueta,
    ).toBe("R2");
    // Dos mandos de familias distintas: un icono por jugador.
    const mixto = iconosAccion(
      "dash",
      { dispositivo: ["mando", "mando"], familia: ["xbox", "ps"] },
      cfg,
    );
    expect(mixto.map((i) => [i.etiqueta, i.jugador])).toEqual([
      ["A", "sael"],
      ["✕", "odo"],
    ]);
  });
  it("en solo el dash conjunto es solo la tecla común, aunque haya mando (la entrada no lo hace con mando)", () => {
    const d = iconosAccion(
      "dash",
      { dispositivo: ["mando", "mando"], solo: true },
      cfg,
    );
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ tipo: "tecla", jugador: null });
  });
  it("tecla → jugador", () => {
    const K = cfg.controls.keyboard;
    expect(jugadorDeTecla(K.sael.up, cfg)).toBe(0);
    expect(jugadorDeTecla(K.soloDash[0], cfg)).toBe(0);
    expect(jugadorDeTecla(K.odo.anchor[0], cfg)).toBe(1);
    expect(jugadorDeTecla(K.debug.hurtSael, cfg)).toBeNull();
  });
  it("asignación de mandos igual que la entrada: estable por índice y primer hueco libre", () => {
    const p = (index) => ({ index });
    expect(asignarMandos([null, null], [p(0)])).toEqual([0, null]);
    expect(asignarMandos([0, null], [p(0), p(1)])).toEqual([0, 1]);
    expect(asignarMandos([0, 1], [undefined, p(1)])).toEqual([null, 1]); // desconectar el 0 no pasa el 1 a Sael
    expect(asignarMandos([null, 1], [p(0), p(1)])).toEqual([0, 1]); // el nuevo ocupa el hueco libre
    expect(asignarMandos([null, null], undefined)).toEqual([null, null]);
  });
  it("partirTexto separa marcas de acción", () => {
    expect(partirTexto("{dash} para esquivar")).toEqual([
      { tipo: "accion", v: "dash" },
      { tipo: "texto", v: " para esquivar" },
    ]);
    expect(partirTexto("Mantén {ancla} ya")).toHaveLength(3);
    expect(partirTexto("sin marcas")).toEqual([
      { tipo: "texto", v: "sin marcas" },
    ]);
    expect(partirTexto("{otra}")).toEqual([{ tipo: "texto", v: "{otra}" }]);
  });
});

describe("indicaciones: tutorial y murales por evento", () => {
  it("claves cortas y completas", () => {
    expect(claveTutorial("dash")).toBe("tutorial.dash");
    expect(claveTutorial("tutorial.dash")).toBe("tutorial.dash");
    expect(claveMural("prueba")).toBe("mural.prueba");
  });
  it("mostrar → fundido de entrada → ocultar → fundido de salida → fuera", () => {
    const ui = nuevoUI();
    aplicarEventoUI(ui, { tipo: "tutorial:mostrar", clave: "dash" });
    expect(ui.tutorial.clave).toBe("tutorial.dash");
    avanzarUI(ui, cfg.hud.tutorial.fundidoEntrada / 2, cfg);
    expect(ui.tutorial.o).toBeCloseTo(0.5);
    avanzarUI(ui, 1, cfg);
    expect(ui.tutorial.o).toBe(1);
    aplicarEventoUI(ui, { tipo: "tutorial:ocultar" });
    avanzarUI(ui, cfg.hud.tutorial.fundidoSalida / 2, cfg);
    expect(ui.tutorial.o).toBeCloseTo(0.5);
    avanzarUI(ui, 1, cfg);
    expect(ui.tutorial).toBeNull();
  });
  it("repetir el mismo aviso no reinicia el fundido; uno distinto sí", () => {
    const ui = nuevoUI();
    aplicarEventoUI(ui, { tipo: "tutorial:mostrar", clave: "dash" });
    avanzarUI(ui, 1, cfg);
    aplicarEventoUI(ui, { tipo: "tutorial:mostrar", clave: "dash" });
    expect(ui.tutorial.t).toBe(1);
    aplicarEventoUI(ui, { tipo: "tutorial:mostrar", clave: "ancla" });
    expect(ui.tutorial.t).toBe(0);
  });
  it("el mural caduca solo y también se puede ocultar antes", () => {
    const ui = nuevoUI();
    aplicarEventoUI(ui, { tipo: "mural:activar", id: "prueba" });
    expect(ui.mural.clave).toBe("mural.prueba");
    avanzarUI(ui, cfg.hud.mural.duracion + 0.1, cfg);
    expect(ui.mural.saliendo).toBe(true);
    avanzarUI(ui, cfg.hud.mural.fundidoSalida + 0.1, cfg);
    expect(ui.mural).toBeNull();
    aplicarEventoUI(ui, { tipo: "mural:activar", id: "prueba" });
    aplicarEventoUI(ui, { tipo: "mural:ocultar" });
    expect(ui.mural.saliendo).toBe(true);
  });
  it("ignora eventos ajenos o sin datos", () => {
    const ui = nuevoUI();
    aplicarEventoUI(ui, { tipo: "golpe_jugador" });
    aplicarEventoUI(ui, { tipo: "tutorial:mostrar" });
    aplicarEventoUI(ui, { tipo: "tutorial:ocultar" });
    aplicarEventoUI(ui, undefined);
    expect(ui).toEqual(nuevoUI());
  });
});

describe("i18n del HUD completo es/en (D-102)", () => {
  const marcas = (s) => (s.match(/\{\w+\}/g) ?? []).sort();
  it("las dos lenguas llevan las mismas marcas {…} en cada texto", () => {
    for (const k of Object.keys(IDIOMAS.es))
      expect(marcas(IDIOMAS.en[k]), k).toEqual(marcas(IDIOMAS.es[k]));
  });
  it("hay texto para cada aviso de tutorial y cada tecla con nombre", () => {
    const claves = [
      "tutorial.mover",
      "tutorial.corte",
      "tutorial.ancla",
      "tutorial.dash",
      "tecla.stickIzq",
      "combate.saltar",
      "combate.derrota",
      "lapida.titulo",
      "lapida.tiempo",
      "lapida.dano",
      "lapida.golpes",
      "lapida.arrastres",
      "lapida.sinDano",
      "jugador.sael",
      "jugador.odo",
    ];
    for (const k of claves)
      for (const id of ["es", "en"])
        expect(IDIOMAS[id][k], `${id}:${k}`).toBeTruthy();
    // Todas las teclas con nombre que usan las acciones de config.
    const K = cfg.controls.keyboard;
    for (const code of [
      ...K.soloDash,
      ...K.sael.dash,
      ...K.sael.anchor,
      ...K.odo.dash,
      ...K.odo.anchor,
    ]) {
      if (/^(Key|Digit|Arrow)/.test(code)) continue;
      expect(tieneClave(`tecla.${code}`), code).toBe(true);
    }
  });
  it("los avisos de tutorial usan solo marcas conocidas", () => {
    for (const k of Object.keys(IDIOMAS.es).filter((x) =>
      x.startsWith("tutorial."),
    )) {
      for (const m of marcas(IDIOMAS.es[k]))
        expect(["{dash}", "{ancla}", "{mover}"]).toContain(m);
    }
  });
  it("tieneClave", () => {
    expect(tieneClave("tutorial.dash")).toBe(true);
    expect(tieneClave("tutorial.inventado")).toBe(false);
  });
});
