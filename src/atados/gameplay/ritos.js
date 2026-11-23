// Refugios y contramedidas cooperativas. El reloj es el paso fijo del combate.
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Pilar} Circulo */
/** @typedef {ReturnType<typeof crearRitos>} Ritos */
/** @typedef {{ tipo: "pilar" | "caida" | "escudo" | "impacto", x: number, z: number }} ResolucionTiro */
/** @typedef {{ x: number, z: number, activo: boolean, resolucion: ResolucionTiro | null }} Tiro */

export const PISOTON = { aviso: 3, radio: 2, separacion: 2.6 };
export const GOTA = { aviso: 3, radio: 2.6 }; // s hasta caer y m de radio seguro.
export const BRASEROS = {
  colores: [0xff513d, 0x4dafff, 0xffc641],
  viaje: 4,
  margenAparicion: 4.5,
  radio: 1.15,
  ventana: 3,
};

export function crearRitos() {
  return {
    tipo: "",
    tiempo: 0,
    x: 0,
    z: 0,
    braseros: BRASEROS.colores.map((_, color) => ({ x: 0, z: 0, color })),
    colorObjetivo: -1,
    escudo: { color: -1, restante: 0 },
    tiros: [0, 1].map(
      /** @returns {Tiro} */ () => ({
        x: 0,
        z: 0,
        activo: false,
        resolucion: null,
      }),
    ),
  };
}

// Busca suelo libre cerca de la pareja. El brasero exige entrar tras aparecer.
/** @param {Mundo} w @param {Circulo[]} huecos @param {number} radio @param {boolean} [esBrasero] */
function marca(w, huecos, radio, esBrasero = false) {
  const [a, b] = w.players;
  const superviviente = a.alive ? a : b;
  const centro =
    !esBrasero && (!a.alive || !b.alive)
      ? superviviente
      : { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const solidos = [...w.pillars, w.dummy, ...huecos];
  for (let distancia = 0; distancia < 2 * w.arenaRadius; distancia += 1) {
    for (let paso = 0; paso < 16; paso++) {
      const angulo = (paso * Math.PI) / 8;
      const x = centro.x + Math.cos(angulo) * distancia;
      const z = centro.z + Math.sin(angulo) * distancia;
      if (Math.hypot(x, z) + radio >= w.arenaRadius) continue;
      if (solidos.some((o) => Math.hypot(x - o.x, z - o.z) <= radio + o.r))
        continue;
      if (
        esBrasero &&
        w.players.some(
          (p) =>
            Math.hypot(x - p.x, z - p.z) <=
            radio + w.cfg.player.radius + BRASEROS.margenAparicion,
        )
      )
        continue;
      return { x, z };
    }
  }
  return null;
}

/** @param {Ritos} r @param {Mundo} w @param {Circulo[]} [huecos] */
export function iniciarPisoton(r, w, huecos = []) {
  const zona = marca(w, huecos, PISOTON.radio);
  if (!zona) return;
  Object.assign(r, zona, { tipo: "pisoton", tiempo: PISOTON.aviso });
}

/** @param {Ritos} r @param {Mundo} w @param {Circulo[]} [huecos] */
export function iniciarGota(r, w, huecos = []) {
  const zona = marca(w, huecos, GOTA.radio); // Comparte la búsqueda de suelo seguro del pisotón.
  if (!zona) return;
  Object.assign(r, zona, { tipo: "gota", tiempo: GOTA.aviso }); // La zona queda fija hasta el impacto.
}

/** @param {Ritos} r @param {Mundo} w @param {Circulo[]} [huecos] */
export function iniciarBraseros(r, w, huecos = []) {
  const ocupados = [...huecos];
  for (const fuego of r.braseros) {
    const sitio = marca(w, ocupados, BRASEROS.radio, true);
    if (!sitio) return;
    Object.assign(fuego, sitio);
    ocupados.push({ ...sitio, r: BRASEROS.radio + 0.75 });
  }
  // Ambos tiros comparten el color de esta salva; rota al repetir el rito.
  r.colorObjetivo = (r.colorObjetivo + 1) % BRASEROS.colores.length;
  r.escudo.color = -1;
  r.escudo.restante = 0;
  r.tipo = "braseros";
  r.tiempo = BRASEROS.viaje;
  for (const [i, p] of w.players.entries()) {
    // Salen del borde opuesto al objetivo para que ambos vean venir la descarga.
    const angulo = Math.atan2(p.z, p.x) + Math.PI + (i === 0 ? 0.2 : -0.2);
    Object.assign(r.tiros[i], {
      activo: p.alive,
      resolucion: null, // La salva anterior ya no puede generar destellos.
      x: w.arenaRadius * Math.cos(angulo),
      z: w.arenaRadius * Math.sin(angulo),
    });
  }
}

// Fracción de entrada en un círculo durante el paso (0 al salir, 1 al llegar).
/** @param {number} x @param {number} z @param {number} dx @param {number} dz @param {number} largo @param {number} radio */
function entradaCirculo(x, z, dx, dz, largo, radio) {
  const afuera = x * x + z * z - radio ** 2; // Distancia al centro al cuadrado menos el radio al cuadrado (m²).
  if (afuera <= 0) return 0; // El paso ya comienza dentro del círculo o sobre su borde.
  if (largo === 0) return Infinity; // Sin movimiento desde fuera, el círculo queda sin tocar.
  const proy = x * dx + z * dz;
  const disc = proy * proy - largo * afuera;
  if (disc < 0) return Infinity; // La trayectoria pasa por fuera del círculo.
  const t = (-proy - Math.sqrt(disc)) / largo; // La raíz menor da la entrada.
  return t >= 0 && t <= 1 ? t : Infinity;
}

/** @param {Tiro} tiro @param {ResolucionTiro["tipo"]} tipo */
function resolverTiro(tiro, tipo) {
  tiro.activo = false;
  // Esta posición en metros queda disponible para la vista hasta la próxima salva.
  tiro.resolucion = { tipo, x: tiro.x, z: tiro.z };
}

// Resuelve el primer cruce del borde de un brasero durante este paso fijo.
/** @param {Mundo} w @param {Ritos["braseros"]} fuegos */
function primerBrasero(w, fuegos) {
  let primero = -1,
    instante = Infinity;
  for (const p of w.players) {
    if (!p.alive) continue;
    const dx = p.x - p.px,
      dz = p.z - p.pz,
      largo = dx * dx + dz * dz;
    for (const f of fuegos) {
      const t = entradaCirculo(
        p.px - f.x,
        p.pz - f.z,
        dx,
        dz,
        largo,
        BRASEROS.radio,
      );
      if (t < instante) {
        instante = t;
        primero = f.color;
      }
    }
  }
  return primero;
}

/** Comprueba los pies del personaje, incluido el borde visible. @param {Ritos} r @param {{x:number,z:number}} p @param {number} radio */
function dentroDeMarca(r, p, radio) {
  return Math.hypot(p.x - r.x, p.z - r.z) <= radio;
}

/** @param {Ritos} r @param {Mundo} w @param {number} dt @param {(indice:number,dano:number)=>void} golpear */
export function avanzarRitos(r, w, dt, golpear) {
  r.escudo.restante = Math.max(0, r.escudo.restante - dt);
  if (r.escudo.restante < 1e-8) r.escudo.restante = 0;
  if (!r.tipo) return;
  const antes = r.tiempo;
  r.tiempo = Math.max(0, antes - dt);
  if (r.tipo === "pisoton") {
    if (r.tiempo > 1e-8) return;
    const [a, b] = w.players;
    const juntos =
      (!a.alive ||
        !b.alive ||
        Math.hypot(a.x - b.x, a.z - b.z) <= PISOTON.separacion) &&
      w.players.every((p) => !p.alive || dentroDeMarca(r, p, PISOTON.radio));
    if (!juntos)
      w.players.forEach((p, i) => {
        if (p.alive) golpear(i, w.cfg.jefes.mirra.ritual.dano.pisoton);
      });
    r.tipo = "";
    return;
  }
  if (r.tipo === "gota") {
    if (r.tiempo > 1e-8) return; // El golpe se decide una sola vez, al tocar el suelo.
    const dano = w.cfg.jefes.mirra.ritual.dano.gota;
    w.players.forEach((p, i) => {
      if (p.alive && !dentroDeMarca(r, p, GOTA.radio)) golpear(i, dano);
    });
    r.tipo = "";
    return;
  }
  // La primera elección de la pareja queda fijada incluso si el escudo caduca.
  if (r.escudo.color < 0) {
    const elegido = primerBrasero(w, r.braseros);
    if (elegido >= 0) {
      r.escudo.color = elegido;
      r.escudo.restante = BRASEROS.ventana;
    }
  }
  for (const [i, t] of r.tiros.entries()) {
    const p = w.players[i];
    if (!t.activo) continue;
    if (!p.alive) {
      // Si cae el objetivo, el tiro se apaga donde estaba al comienzo del paso.
      resolverTiro(t, "caida");
      continue;
    }
    // Se dirige a la posición actual, incluso después de un cambio de rumbo.
    const llega = r.tiempo <= 1e-8; // El margen absorbe el error acumulado del reloj (s).
    const paso = llega ? 1 : dt / antes;
    const dx = (p.x - t.x) * paso,
      dz = (p.z - t.z) * paso;
    const largo = dx * dx + dz * dz;
    let primerChoque = Infinity;
    for (const pilar of w.pillars) {
      // Si hay varios obstáculos en el paso, usamos el primer borde que cruza.
      const entrada = entradaCirculo(
        t.x - pilar.x,
        t.z - pilar.z,
        dx,
        dz,
        largo,
        pilar.r,
      );
      primerChoque = Math.min(primerChoque, entrada);
    }
    if (primerChoque !== Infinity) {
      t.x += dx * primerChoque;
      t.z += dz * primerChoque;
      resolverTiro(t, "pilar");
      continue;
    }
    t.x = llega ? p.x : t.x + dx;
    t.z = llega ? p.z : t.z + dz;
    if (llega) {
      const protegido =
        r.escudo.color === r.colorObjetivo && r.escudo.restante > 0;
      resolverTiro(t, protegido ? "escudo" : "impacto");
      if (!protegido) golpear(i, w.cfg.jefes.mirra.ritual.dano.braseros);
    }
  }
  if (r.tiros.every((t) => !t.activo)) r.tipo = "";
}
