// Herramienta de escucha de efectos: el mismo `conectarAudio` del juego (motor, reglas de eventos, perfiles
// de src/atados/audio/efectos.js y música de CONFIG). Abrir con el servidor de Vite en
// /tools/atados/escucha-efectos.html. Nada de esta página entra en la compilación del juego.
/* global document, window, fetch, setTimeout, clearTimeout, requestAnimationFrame, performance, URLSearchParams */
import { conectarAudio } from "../../src/atados/audio/index.js";
import {
  planSonido,
  corteSegunTension,
} from "../../src/atados/audio/reglas.js";
import { mezclarPlan } from "../../src/atados/audio/sintesis-efectos.js";
import { CONFIG } from "../../src/atados/core/config.js";

const A = CONFIG.audio;
const $ = (id) => document.getElementById(id);
const estado = $("estado");

// Audio del juego sin combate: los eventos llegan desde esta página (api.evento).
const audio = conectarAudio({
  cfg: CONFIG,
  getCombate: () => null,
  target: window,
});
const api = audio.api;
api.jefe("mirra"); // las reglas de golpes, dolor y fase usan la ficha de Mirra (no cambia la música)
window.__escucha = api; // para revisar el registro de sonidos desde la consola
let ultimo = performance.now();
// Bucle de cuadros: el motor necesita `update` para cerrar silencios y mover la música.
(function cuadro(ahora) {
  audio.update(Math.min(0.05, (ahora - ultimo) / 1000));
  ultimo = ahora;
  requestAnimationFrame(cuadro);
})(performance.now());

// ─── Tiempos de cada aviso estirable, como en el juego ───
const dificultad = () => $("dificultad").value; // "normal" | "dificil"
/** Segundos de telegrafía con los que el juego pediría el aviso `id`. */
function duracionDe(id) {
  for (const a of Object.values(CONFIG.jefes.mirra.ataques))
    if (A.avisos[a.sonido] === id) return a.telegrafia[dificultad()];
  if (id === "proyectilGrano")
    return CONFIG.jefes.mirra.ataques.grano.bloques[0].vuelo;
  if (id === A.enemigos["enemigo:telegrafia"])
    return CONFIG.recorrido.enemigos.segador.ataque.telegrafia[dificultad()];
  const estirable = A.sfx[id].capas.some((c) => c.ajuste || c.desdeFin != null);
  return estirable ? 1 : null;
}
// Volumen y tono con los que el juego llama a cada sonido (eslabones más bajos, corte a tensión máxima).
function opcionesDe(id) {
  if (A.cadena.eslabones.sonidos.includes(id))
    return { volumen: A.cadena.eslabones.volumen };
  if (id === A.corte.sonido) {
    const k = corteSegunTension(CONFIG, 1);
    return { volumen: k.volumen, tono: k.tono };
  }
  return {};
}

// ─── Medida: nivel máximo en 50 ms (dBFS) con las ganancias de bus del juego ───
const GAN_EFECTOS = A.volumen.master * A.volumen.efectos;
function medir(id, dur) {
  const sr = 48000;
  const x = mezclarPlan(planSonido(A.sfx[id], dur), id, sr, null);
  const n = sr * 0.05;
  let max = 0;
  for (let i = 0; i + n <= x.length; i += n) {
    let e = 0;
    for (let k = i; k < i + n; k++) e += x[k] * x[k];
    max = Math.max(max, Math.sqrt(e / n));
  }
  const v = (opcionesDe(id).volumen ?? 1) * GAN_EFECTOS;
  return {
    db: 20 * Math.log10(Math.max(1e-9, max * v)),
    s: planSonido(A.sfx[id], dur).cuerpo,
  };
}

// ─── Reproducción ───
const pendientes = new Set(); // temporizadores de escenas y grupos
const vivas = new Set(); // voces en bucle que hay que cortar a mano
function despues(s, f) {
  const h = setTimeout(() => {
    pendientes.delete(h);
    f();
  }, s * 1000);
  pendientes.add(h);
}
function asegurar() {
  api.desbloquear(); // dentro del clic: el navegador permite el audio
  return api.estado === "activo";
}
function tocar(id) {
  if (!asegurar()) return;
  if (id === "mirraEnjambre") {
    const h = api.sonar(id, { bucle: true });
    if (h) {
      vivas.add(h);
      despues(3, () => {
        h.detener(0.08); // el juego lo para con `ataque_fin` cuando la nube se disuelve
        vivas.delete(h);
      });
    }
    return;
  }
  api.sonar(id, { ...opcionesDe(id), duracion: duracionDe(id) });
}
function detenerTodo() {
  for (const h of pendientes) clearTimeout(h);
  pendientes.clear();
  for (const h of vivas) h.detener(0.05);
  vivas.clear();
  for (const ataque of Object.keys(CONFIG.jefes.mirra.ataques))
    api.evento({ tipo: "accion_cancelada", accion: ataque, motivo: "escucha" });
  estado.textContent = "Detenido.";
}

// ─── Catálogo por familias ───
const FAMILIAS = [
  [
    "Cadena",
    [
      "eslabon1",
      "eslabon2",
      "eslabon3",
      "cadenaTensa",
      "corte",
      "corteFuerte",
      "corteFinal",
    ],
  ],
  [
    "Sael y Odo",
    [
      "dash",
      "ancla",
      "anclaSuelta",
      "golpeRecibido",
      "muerteJugador",
      "revivir",
    ],
  ],
  [
    "Avisos de Mirra",
    [
      "avisoHoz",
      "avisoHozDoble",
      "avisoTripas",
      "avisoMandibulas",
      "avisoZumbido",
      "avisoInhalacion",
      "avisoGenerico",
    ],
  ],
  [
    "Golpes de Mirra",
    [
      "mirraSiega",
      "proyectilGrano",
      "mirraGrano",
      "mirraHambre",
      "mirraEnjambre",
      "mirraBanquete",
      "mirraDolor",
      "mirraTransicion",
      "mirraMuerte",
    ],
  ],
  [
    "Peligros de arena",
    [
      "avisoLuz",
      "luzImpacto",
      "avisoPisoton",
      "pisotonGolpe",
      "avisoBraseros",
      "braseroEscudo",
      "braseroDescarga",
      "braseroBloqueo",
    ],
  ],
  ["Enemigos del pasillo", ["enemigoAviso", "enemigoMuere"]],
  [
    "Momentos del combate",
    ["peleaInicio", "presentacionGolpe", "destello", "faseGolpe"],
  ],
];
const listados = new Set(FAMILIAS.flatMap(([, ids]) => ids));
const otros = Object.keys(A.sfx).filter((id) => !listados.has(id));
if (otros.length) FAMILIAS.push(["Otros", otros]);

function boton(texto, detalle, alPulsar) {
  const b = document.createElement("button");
  b.type = "button";
  b.append(texto);
  if (detalle) {
    const s = document.createElement("small");
    s.textContent = detalle;
    b.append(s);
  }
  b.addEventListener("click", () => {
    try {
      alPulsar(b);
    } catch (error) {
      estado.textContent = `Error: ${error?.message ?? error}`;
    }
  });
  return b;
}
function pintarCatalogo() {
  const raiz = $("catalogo");
  raiz.textContent = "";
  for (const [nombre, ids] of FAMILIAS) {
    const titulo = document.createElement("h2");
    titulo.textContent = nombre;
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    acciones.append(
      boton("Tocar la familia en orden", null, () => {
        if (!asegurar()) return;
        let t = 0;
        for (const id of ids.filter((x) => A.sfx[x])) {
          despues(t, () => tocar(id));
          t += Math.min(2.5, medir(id, duracionDe(id)).s) + 0.35;
        }
        estado.textContent = `Familia: ${nombre}`;
      }),
    );
    const lista = document.createElement("ul");
    for (const id of ids.filter((x) => A.sfx[x])) {
      const m = medir(id, duracionDe(id));
      const bus = A.silencios.blancos.includes(A.sfx[id].categoria)
        ? "nunca se calla"
        : "efectos";
      const li = document.createElement("li");
      li.append(
        boton(
          id,
          `${m.s.toFixed(2)} s · ${m.db.toFixed(1)} dBFS · ${bus}`,
          () => {
            tocar(id);
            estado.textContent = `Sonando: ${id}`;
          },
        ),
      );
      lista.append(li);
    }
    raiz.append(titulo, acciones, lista);
  }
}

// ─── Escenas: eventos del combate con sus tiempos reales ───
const tele = (ataque) =>
  CONFIG.jefes.mirra.ataques[ataque].telegrafia[dificultad()];
const ev = (e) => () => api.evento(e);
const ESCENAS = [
  [
    "Grano completo",
    "aviso → vuelo del grano → impacto",
    () => {
      const T = tele("grano");
      const vuelo = Math.min(
        CONFIG.jefes.mirra.ataques.grano.bloques[0].vuelo,
        T,
      );
      return [
        [
          0,
          ev({
            tipo: "telegrafia_inicio",
            ataque: "grano",
            sonido: "tripas",
            duracion: T,
          }),
        ],
        [
          T - vuelo,
          ev({ tipo: "proyectil_vuelo", ataque: "grano", duracion: vuelo }),
        ],
        [T, ev({ tipo: "ataque_activo", ataque: "grano" })],
      ];
    },
  ],
  [
    "Grano cancelado en vuelo",
    "el silbido y el aviso se cortan; no hay impacto",
    () => {
      const T = tele("grano");
      const vuelo = Math.min(
        CONFIG.jefes.mirra.ataques.grano.bloques[0].vuelo,
        T,
      );
      return [
        [
          0,
          ev({
            tipo: "telegrafia_inicio",
            ataque: "grano",
            sonido: "tripas",
            duracion: T,
          }),
        ],
        [
          T - vuelo,
          ev({ tipo: "proyectil_vuelo", ataque: "grano", duracion: vuelo }),
        ],
        [
          T - vuelo / 2,
          ev({ tipo: "accion_cancelada", accion: "grano", motivo: "escucha" }),
        ],
      ];
    },
  ],
  ...["siega", "siega_doble", "hambre", "banquete"].map((ataque) => [
    `Ataque: ${ataque}`,
    "aviso y golpe",
    () => [
      [
        0,
        ev({
          tipo: "telegrafia_inicio",
          ataque,
          sonido: CONFIG.jefes.mirra.ataques[ataque].sonido,
          duracion: tele(ataque),
        }),
      ],
      [tele(ataque), ev({ tipo: "ataque_activo", ataque })],
    ],
  ]),
  [
    "Ataque: enjambre",
    "aviso, nube 3 s y fin",
    () => [
      [
        0,
        ev({
          tipo: "telegrafia_inicio",
          ataque: "enjambre",
          sonido: "zumbido",
          duracion: tele("enjambre"),
        }),
      ],
      [tele("enjambre"), ev({ tipo: "ataque_activo", ataque: "enjambre" })],
      [tele("enjambre") + 3, ev({ tipo: "ataque_fin", ataque: "enjambre" })],
    ],
  ],
  [
    "Luz divina",
    "aparece; cae a los 2,5 s",
    () => [
      [0, ev({ tipo: "ritual_inicio", rito: "luz" })],
      [2.5, ev({ tipo: "arena_golpe", golpe: "luz" })],
    ],
  ],
  [
    "Pisotón",
    "aparece; cae a los 3 s",
    () => [
      [0, ev({ tipo: "ritual_inicio", rito: "pisoton" })],
      [3, ev({ tipo: "arena_golpe", golpe: "pisoton" })],
    ],
  ],
  [
    "Braseros con escudo",
    "aparecen; la pareja pisa uno a 1,5 s; descargas bloqueadas a 4 s",
    () => [
      [0, ev({ tipo: "ritual_inicio", rito: "braseros" })],
      [1.5, ev({ tipo: "arena_escudo", color: 0 })],
      [4, ev({ tipo: "arena_golpe", golpe: "bloqueo" })],
    ],
  ],
  [
    "Braseros sin escudo",
    "las descargas llegan a 4 s",
    () => [
      [0, ev({ tipo: "ritual_inicio", rito: "braseros" })],
      [4, ev({ tipo: "arena_golpe", golpe: "braseros" })],
    ],
  ],
  [
    "Cambio de fase",
    "transición, destello en silencio y golpe de fase 2",
    () => [
      [0, ev({ tipo: "transicion_inicio", fase: 1 })],
      [
        CONFIG.jefes.comun.transicion ?? 2,
        () => {
          api.evento({ tipo: "silencio", motivo: "fase" });
          api.evento({ tipo: "destello" });
        },
      ],
    ],
  ],
  [
    "Fragor de combate",
    "cadena floja, cortes, dash, golpe recibido y un ataque a la vez",
    () => {
      const pasos = [];
      for (let i = 0; i < 24; i++)
        pasos.push([
          i * 0.125,
          () =>
            api.sonar(
              A.cadena.eslabones.sonidos[i % 3],
              opcionesDe("eslabon1"),
            ),
        ]);
      for (const [t, k] of [
        [0.5, 0.3],
        [0.65, 0.6],
        [0.8, 1],
      ]) {
        const c = corteSegunTension(CONFIG, k);
        pasos.push([
          t,
          () => api.sonar(A.corte.sonido, { volumen: c.volumen, tono: c.tono }),
        ]);
      }
      pasos.push([1.1, () => api.sonar("corteFuerte")]);
      pasos.push([1.6, () => api.sonar("dash", { tono: A.jugadores.tono[0] })]);
      pasos.push([
        1.7,
        ev({
          tipo: "telegrafia_inicio",
          ataque: "siega",
          sonido: "hoz",
          duracion: tele("siega"),
        }),
      ]);
      pasos.push([
        1.7 + tele("siega"),
        ev({ tipo: "ataque_activo", ataque: "siega" }),
      ]);
      pasos.push([
        1.75 + tele("siega"),
        () => api.sonar("golpeRecibido", { tono: A.jugadores.tono[1] }),
      ]);
      pasos.push([
        2.4 + tele("siega"),
        () => api.sonar("ancla", { tono: A.jugadores.tono[1] }),
      ]);
      return pasos;
    },
  ],
  [
    "Caída y revivir",
    "un jugador cae y vuelve",
    () => [
      [0, () => api.sonar("golpeRecibido", { tono: A.jugadores.tono[0] })],
      [0.15, () => api.sonar("muerteJugador", { tono: A.jugadores.tono[0] })],
      [2, () => api.sonar("revivir", { tono: A.jugadores.tono[0] })],
    ],
  ],
];
function pintarEscenas() {
  const lista = $("escenas");
  for (const [nombre, detalle, crear] of ESCENAS) {
    const li = document.createElement("li");
    li.append(
      boton(nombre, detalle, () => {
        if (!asegurar()) return;
        for (const [t, f] of crear()) despues(t, f);
        estado.textContent = `Escena: ${nombre}`;
      }),
    );
    lista.append(li);
  }
}

// ─── Música de fondo ───
let pistas = []; // fuentes de música propias (rutas o archivos)
function pararPistas() {
  for (const p of pistas) {
    try {
      p.stop();
    } catch {
      /* ya parada */
    }
  }
  pistas = [];
}
async function sonarBuffers(lista) {
  pararPistas();
  const m = api.motor;
  const t0 = m.ctx.currentTime + 0.1; // todas arrancan juntas
  for (const { buffer, ganancia } of lista) {
    const src = m.ctx.createBufferSource();
    const g = m.ctx.createGain();
    src.buffer = buffer;
    src.loop = true;
    g.gain.value = ganancia;
    src.connect(g);
    g.connect(m.bus.musica); // mismo bus (y volumen) que la música del juego
    src.start(t0);
    pistas.push(src);
  }
}
async function sonarRutas(texto) {
  if (!asegurar()) return;
  await api.motor.desbloquear();
  const lista = [];
  for (const parte of texto
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)) {
    const [ruta, g = "1"] = parte.split(/:(?=[0-9.]+$)/);
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`no se pudo cargar ${ruta} (${r.status})`);
    lista.push({
      buffer: await api.motor.ctx.decodeAudioData(await r.arrayBuffer()),
      ganancia: Number(g),
    });
  }
  await sonarBuffers(lista);
  estado.textContent = `Música: ${texto}`;
}
// Presets desde CONFIG: cada zona con su carpeta; capas a su ganancia (o la pista completa).
function presets() {
  const out = [];
  for (const [zona, Z] of Object.entries(A.musica.zonas)) {
    const base = `/atados/audio/musica/${Z.carpeta}/`;
    const capas = Object.entries(Z.capas)
      .filter(
        ([, c]) =>
          c.estados.includes("pelea") ||
          c.estados.includes("pasillo") ||
          c.estados.includes("presentacion"),
      )
      .map(([id, c]) => `${base}${id}.ogg:${c.ganancia}`);
    if (Z.completa)
      out.push([
        `${zona}: pista completa`,
        `${base}tema.ogg:${Z.completa.ganancia}`,
      ]);
    if (capas.length) out.push([`${zona}: capas`, capas.join(",")]);
  }
  return out;
}
function pintarMusica() {
  const raiz = $("musicas");
  raiz.append(
    boton(
      "Juego: Mirra presentación → pelea",
      "eventos reales del audio",
      () => {
        if (!asegurar()) return;
        pararPistas();
        api.evento({ tipo: "presentacion_inicio", jefe: "mirra" });
        despues(2, () => api.evento({ tipo: "pelea_inicio" }));
        api.intensidad(0.6);
        estado.textContent = "Música del juego: Mirra (intensidad 0,6)";
      },
    ),
  );
  for (const [nombre, rutas] of presets())
    raiz.append(
      boton(nombre, null, () => {
        $("rutas").value = rutas;
        sonarRutas(rutas).catch(
          (e) => (estado.textContent = `Música: ${e.message}`),
        );
      }),
    );
}

// ─── Controles ───
$("detener").addEventListener("click", detenerTodo);
$("pararMusica").addEventListener("click", () => {
  pararPistas();
  api.evento({ tipo: "victoria" }); // apaga las capas del juego
  estado.textContent = "Música detenida.";
});
$("cargarRutas").addEventListener("click", () =>
  sonarRutas($("rutas").value).catch(
    (e) => (estado.textContent = `Música: ${e.message}`),
  ),
);
$("archivos").addEventListener("change", async (e) => {
  if (!asegurar()) return;
  await api.motor.desbloquear();
  const lista = [];
  for (const f of e.target.files)
    lista.push({
      buffer: await api.motor.ctx.decodeAudioData(await f.arrayBuffer()),
      ganancia: 0.8,
    });
  await sonarBuffers(lista);
  estado.textContent = `Música: ${lista.length} archivo(s) a ganancia 0,8`;
});
for (const [id, bus] of [
  ["volEfectos", "efectos"],
  ["volMusica", "musica"],
]) {
  $(id).value = String(A.volumen[bus]);
  $(id).addEventListener("input", (e) =>
    api.volumen(bus, Number(e.target.value)),
  );
}
$("dificultad").addEventListener("change", pintarCatalogo);

pintarCatalogo();
pintarEscenas();
pintarMusica();
const pedido = new URLSearchParams(window.location.search).get("musica");
if (pedido) $("rutas").value = pedido;
estado.textContent = "El audio arranca con el primer clic.";
window.addEventListener("pagehide", () => audio.dispose(), { once: true });
