// Reglas puras del audio: cadena (D-062), capas (D-060), silencios (D-183), avisos (D-106), pistas (D-061).
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  ORDEN_ZZFX,
  zzfxArgs,
  planSonido,
  tonoCadena,
  eslabonesPorSeg,
  tensaCadena,
  corteSegunTension,
  mezclaCapas,
  gananciaCompleta,
  intensidadObjetivo,
  planSilencio,
  busDeSonido,
  esBlanco,
  accionesDeEvento,
  accionRompe,
} from "../../../src/atados/audio/reglas.js";
import {
  indexarPistas,
  resolverZona,
  resolverTema,
} from "../../../src/atados/audio/pistas.js";

const cfg = () => structuredClone(CONFIG);
const A = CONFIG.audio;

describe("zzfx", () => {
  it("convierte la capa al orden de zzfx con defaults", () => {
    const a = zzfxArgs({ volumen: 0.5, frecuencia: 300, filtro: -900 });
    expect(a).toHaveLength(ORDEN_ZZFX.length);
    expect(a[0]).toBe(0.5);
    expect(a[1]).toBe(0);
    expect(a[2]).toBe(300);
    expect(a[20]).toBe(-900);
  });
  it("estira la capa marcada a la duración de la telegrafía", () => {
    for (const [id, dur] of [
      ["avisoHoz", 1.2],
      ["avisoHoz", 0.7],
      ["avisoZumbido", 1.5],
      ["avisoInhalacion", 0.8],
    ]) {
      const p = planSonido(A.sfx[id], dur);
      expect(p.largo).toBeCloseTo(dur, 2);
    }
  });
  it("las capas desdeFin caen antes del final del aviso", () => {
    const p = planSonido(A.sfx.avisoTripas, 1.4);
    expect(p.capas[1].offset).toBeCloseTo(1.0, 5);
  });
});

describe("cadena (D-062)", () => {
  it("el zumbido sube de tono, ganancia, brillo y pulso con la tensión, de forma continua", () => {
    let prev = tonoCadena(CONFIG, 0);
    expect(prev.frecuencia).toBeCloseTo(A.cadena.zumbido.frecuencia[0]);
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const p = tonoCadena(CONFIG, t);
      expect(p.frecuencia).toBeGreaterThan(prev.frecuencia);
      expect(p.ganancia).toBeGreaterThan(prev.ganancia);
      expect(p.brillo).toBeGreaterThan(prev.brillo);
      expect(p.tremoloHz).toBeGreaterThan(prev.tremoloHz);
      expect(p.frecuencia / prev.frecuencia).toBeLessThan(1.12); // sin saltos
      prev = p;
    }
    expect(prev.frecuencia).toBeCloseTo(A.cadena.zumbido.frecuencia[1]);
    expect(tonoCadena(CONFIG, 3).frecuencia).toBeCloseTo(
      A.cadena.zumbido.frecuencia[1],
    ); // satura
    expect(tonoCadena(CONFIG, NaN).frecuencia).toBeCloseTo(
      A.cadena.zumbido.frecuencia[0],
    );
  });
  it("eslabones solo con la cadena floja y en movimiento", () => {
    expect(eslabonesPorSeg(CONFIG, 0, 0)).toBe(0);
    expect(eslabonesPorSeg(CONFIG, 5, 0)).toBeGreaterThan(0);
    expect(eslabonesPorSeg(CONFIG, 5, 0.9)).toBe(0);
    expect(eslabonesPorSeg(CONFIG, 1e3, 0)).toBe(A.cadena.eslabones.maxPorSeg);
  });
  it("chasquido de tensado con histéresis (no repiquetea)", () => {
    let s = { tensa: false };
    let n = 0;
    for (const t of [0.2, 0.65, 0.5, 0.62, 0.4, 0.7, 0.25, 0.7]) {
      s = tensaCadena(CONFIG, t, s.tensa);
      if (s.chasquido) n++;
    }
    expect(n).toBe(2);
  });
  it("el corte suena más fuerte y agudo con más tensión", () => {
    const a = corteSegunTension(CONFIG, 0.2),
      b = corteSegunTension(CONFIG, 0.9);
    expect(b.volumen).toBeGreaterThan(a.volumen);
    expect(b.tono).toBeGreaterThan(a.tono);
  });
});

describe("música por capas (D-060)", () => {
  const activas = (m) =>
    Object.entries(m)
      .filter(([, g]) => g > 0)
      .map(([k]) => k)
      .sort();
  it("pasillo calmo: solo sus capas", () => {
    expect(
      activas(mezclaCapas(CONFIG, "pasillo", { estado: "pasillo" })),
    ).toEqual(["base", "folk"]);
  });
  it("el jefe suma capas: presentación < pelea fase 1 < fase 2", () => {
    const pres = activas(
      mezclaCapas(CONFIG, "trigal", { estado: "presentacion" }),
    );
    const f1 = activas(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", fase: 1 }),
    );
    const f2 = activas(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", fase: 2 }),
    );
    expect(pres).toEqual(["base"]);
    expect(f1).toEqual(["base", "cuerdas", "pulso"]);
    expect(f2).toEqual(["base", "cuerdas", "fase2", "pulso"]);
    expect(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", fase: 2 }).cuerdas,
    ).toBeGreaterThan(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", fase: 1 }).cuerdas,
    );
  });
  it("la capa alta entra con la intensidad", () => {
    expect(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", intensidad: 0.2 }).alto,
    ).toBe(0);
    expect(
      mezclaCapas(CONFIG, "trigal", { estado: "pelea", intensidad: 1 }).alto,
    ).toBeCloseTo(A.musica.zonas.trigal.capas.alto.ganancia);
  });
  it("victoria/derrota apagan todas las capas", () => {
    for (const estado of ["victoria", "derrota", "nada"])
      expect(activas(mezclaCapas(CONFIG, "trigal", { estado }))).toEqual([]);
  });
  it("pista completa sigue al estado", () => {
    expect(
      gananciaCompleta(CONFIG, "trigal", { estado: "pelea" }),
    ).toBeGreaterThan(
      gananciaCompleta(CONFIG, "trigal", { estado: "presentacion" }),
    );
    expect(gananciaCompleta(CONFIG, "trigal", { estado: "victoria" })).toBe(0);
  });
  it("la intensidad sube con el peligro", () => {
    const calma = intensidadObjetivo(CONFIG, {});
    expect(
      intensidadObjetivo(CONFIG, { atacando: true, caidos: 1, vidaJefe: 0.3 }),
    ).toBeGreaterThan(calma);
    expect(
      intensidadObjetivo(CONFIG, {
        atacando: true,
        caidos: 2,
        vidaJefe: 0,
        vidaMinJugador: 0,
      }),
    ).toBe(1);
  });
});

describe("pistas con licencia (carpetas en public/audio/musica)", () => {
  const rutas = {
    "/public/audio/musica/mirra/mirra-tema.ogg": "u1",
    "/public/audio/musica/mirra/mirra-tema.mp3": "u1mp3",
    "/public/audio/musica/victoria/fanfarria.ogg": "u2",
    "/public/audio/musica/pasillo-mirra/base.mp3": "u3",
    "/public/audio/musica/pasillo-mirra/folk.ogg": "u4",
  };
  const idx = indexarPistas(rutas);
  it("prefiere .ogg y agrupa por carpeta", () => {
    expect(idx.mirra["mirra-tema"]).toBe("u1");
  });
  it("archivo con nombre de capa = stem; otro nombre = pista completa", () => {
    expect(resolverZona(CONFIG, "trigal", idx)).toEqual({
      capas: {},
      completa: "u1",
    });
    expect(resolverZona(CONFIG, "pasillo", idx)).toEqual({
      capas: { base: "u3", folk: "u4" },
      completa: null,
    });
  });
  it("lo que falta cae al placeholder (null)", () => {
    expect(resolverTema(CONFIG, "victoria", idx)).toBe("u2");
    expect(resolverTema(CONFIG, "derrota", idx)).toBe(null);
    expect(resolverZona(CONFIG, "pasillo", {})).toEqual({
      capas: {},
      completa: null,
    });
  });
});

describe("silencios (D-183)", () => {
  it("ningún momento calla la cadena, los avisos ni el golpe recibido", () => {
    const c = cfg();
    for (const m of Object.values(c.audio.silencios.momentos))
      m.habilitado = true;
    for (const motivo of Object.keys(c.audio.silencios.motivos)) {
      const p = planSilencio(c, motivo);
      expect(p.omitido).toBe(null);
      expect(p.buses).not.toContain("blanco");
      expect(p.buses).not.toContain("cadena");
    }
    for (const v of ["cadena", "avisoAtaque", "golpeRecibido"])
      expect(c.audio.silencios.blancos).toContain(v);
  });
  it("set 5+1 aprobado habilitado; opcionales apagados", () => {
    const on = Object.entries(A.silencios.momentos)
      .filter(([, m]) => m.habilitado)
      .map(([k]) => k)
      .sort();
    expect(on).toEqual([
      "cambioFase",
      "golpeFinal",
      "muerteAmbos",
      "nombreJefe",
      "prologoBrasa",
      "umbral",
    ]);
  });
  it("«todo» se expande sin blancos; muerte de ambos calla todo lo demás", () => {
    expect(planSilencio(CONFIG, "muerte_ambos").buses.sort()).toEqual([
      "ambiente",
      "efectos",
      "musica",
      "voces",
    ]);
    expect(planSilencio(CONFIG, "fase").buses.sort()).toEqual([
      "ambiente",
      "musica",
    ]);
  });
  it("el nombre del jefe solo la primera vez", () => {
    const vistos = new Set();
    const p1 = planSilencio(CONFIG, "nombre", vistos);
    vistos.add(p1.id);
    expect(p1.omitido).toBe(null);
    expect(planSilencio(CONFIG, "nombre", vistos).omitido).toBe("repetido");
  });
  it("interruptor global y opcionales: no callan pero conservan quién lo rompe", () => {
    const c = cfg();
    c.audio.silencios.activo = false;
    const p = planSilencio(c, "golpe_final");
    expect(p.omitido).toBe("inactivo");
    expect(p.rompeCon).toBe("jefe:muerte");
    expect(planSilencio(CONFIG, "muerte_uno").omitido).toBe("deshabilitado");
    expect(planSilencio(CONFIG, "inventado").omitido).toBe("desconocido");
  });
  it("rompeCon se resuelve a una acción", () => {
    expect(accionRompe(CONFIG, "jefe:muerte", "mirra")).toEqual({
      tipo: "sfx",
      id: "mirraMuerte",
    });
    expect(accionRompe(CONFIG, "tema:derrota", "mirra")).toEqual({
      tipo: "tema",
      id: "derrota",
    });
    expect(accionRompe(CONFIG, "musica:fase", "mirra").tipo).toBe(
      "faseMusicaPendiente",
    );
    for (const m of Object.values(A.silencios.momentos))
      if (m.rompeCon)
        expect(accionRompe(CONFIG, m.rompeCon, "mirra")).not.toBe(null);
  });
});

describe("avisos y buses (D-106)", () => {
  const ataques = Object.entries(CONFIG.jefes)
    .filter(([k]) => k !== "comun")
    .flatMap(([j, d]) =>
      Object.entries(d.ataques).map(([id, a]) => ({ j, id, a })),
    );
  it("cada ataque tiene su aviso propio, distinto y en el bus que nunca se calla", () => {
    const ids = new Set();
    for (const { a } of ataques) {
      const id = A.avisos[a.sonido];
      expect(A.sfx[id], a.sonido).toBeTruthy();
      expect(esBlanco(CONFIG, id)).toBe(true);
      expect(busDeSonido(CONFIG, id)).toBe("blanco");
      ids.add(id);
    }
    expect(ids.size).toBe(new Set(ataques.map((x) => x.a.sonido)).size);
  });
  it("golpe recibido al blanco; cadena a su sub-bus; el resto a efectos", () => {
    expect(busDeSonido(CONFIG, "golpeRecibido")).toBe("blanco");
    for (const id of ["eslabon1", "corte", "corteFinal", "cadenaTensa"])
      expect(busDeSonido(CONFIG, id)).toBe("cadena");
    for (const id of ["dash", "mirraSiega", "muerteJugador"])
      expect(busDeSonido(CONFIG, id)).toBe("efectos");
  });
  it("todos los sonidos referenciados existen", () => {
    const refs = [
      A.avisoGenerico,
      A.corte.sonido,
      A.corte.fuerte,
      A.corte.final,
      A.cadena.tensa.sonido,
      ...A.cadena.eslabones.sonidos,
      "peleaInicio",
      "faseGolpe",
      "destello",
      "golpeRecibido",
      "muerteJugador",
      "revivir",
      "dash",
      "ancla",
      "anclaSuelta",
    ];
    for (const J of Object.values(A.jefes)) {
      refs.push(
        J.golpeGenerico,
        J.dolor,
        J.transicion,
        J.muerte,
        ...Object.values(J.golpes).map((g) => g.sonido),
      );
    }
    for (const id of refs) expect(A.sfx[id], id).toBeTruthy();
    for (const { j, id } of ataques)
      expect(A.jefes[j].golpes[id], id).toBeTruthy();
  });
  it("telegrafía → aviso con la duración del aviso visual; nunca depende del silencio", () => {
    const acc = accionesDeEvento(
      CONFIG,
      {
        tipo: "telegrafia_inicio",
        ataque: "siega",
        sonido: "hoz",
        duracion: 0.7,
      },
      "mirra",
    );
    expect(acc[0]).toMatchObject({
      tipo: "sfx",
      id: "avisoHoz",
      duracion: 0.7,
      aviso: true,
    });
    const gen = accionesDeEvento(
      CONFIG,
      {
        tipo: "telegrafia_inicio",
        ataque: "x",
        sonido: "desconocido",
        duracion: 1,
      },
      "mirra",
    );
    expect(gen[0].id).toBe(A.avisoGenerico);
  });
  it("siega doble: el segundo barrido se vuelve a avisar antes de golpear (con la dificultad del combate)", () => {
    const tele = (v) => (typeof v === "number" ? v : v.dificil);
    const acc = accionesDeEvento(
      CONFIG,
      { tipo: "ataque_activo", ataque: "siega_doble" },
      "mirra",
      tele,
    );
    const b = CONFIG.jefes.mirra.ataques.siega_doble.bloques[0];
    expect(acc.map((a) => a.id)).toEqual([
      "mirraSiega",
      "avisoHozDoble",
      "mirraSiega",
    ]);
    expect(acc[1].retraso).toBeCloseTo(b.activo);
    expect(acc[1].duracion).toBeCloseTo(b.entre.dificil);
    expect(acc[2].retraso).toBeCloseTo(b.activo + b.entre.dificil);
  });
  it("grano cae tras el vuelo; enjambre en bucle mientras exista", () => {
    const g = accionesDeEvento(
      CONFIG,
      { tipo: "ataque_activo", ataque: "grano" },
      "mirra",
    );
    expect(g[0].retraso).toBe(
      CONFIG.jefes.mirra.ataques.grano.bloques[0].vuelo,
    );
    expect(
      accionesDeEvento(
        CONFIG,
        { tipo: "ataque_activo", ataque: "enjambre" },
        "mirra",
      )[0].bucle,
    ).toBe(true);
    expect(
      accionesDeEvento(
        CONFIG,
        { tipo: "ataque_fin", ataque: "enjambre" },
        "mirra",
      )[0],
    ).toMatchObject({ tipo: "detener", soloBucle: true });
  });
  it("sin voces aún (D-117): la burla no suena", () => {
    expect(accionesDeEvento(CONFIG, { tipo: "burla" }, "mirra")).toEqual([]);
  });
});

describe("revisión: silencio del umbral (D-183, D-211)", () => {
  it("queda abierto hasta que el flujo lo cierra y no se rompe con el efecto de inicio de pelea", () => {
    const p = planSilencio(CONFIG, "umbral");
    expect(p.omitido).toBe(null);
    expect(p.duracionS).toBe(Infinity); // no termina solo: lo cierra `silencio:fin`
    expect(p.rompeCon).toBe(null); // `peleaInicio` suena una sola vez, con `pelea_inicio`
    expect(accionesDeEvento(CONFIG, { tipo: "silencio:fin" }, "mirra")).toEqual(
      [{ tipo: "romperSilencio" }],
    );
    // Ningún silencio vuelve a sonar el efecto de inicio de pelea.
    for (const m of Object.values(A.silencios.momentos))
      expect(m.rompeCon).not.toBe("peleaInicio");
  });
});
