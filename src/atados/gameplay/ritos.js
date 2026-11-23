// Dos contramedidas cooperativas. El reloj es el paso fijo del combate.
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Pilar} Circulo */
/** @typedef {ReturnType<typeof crearRitos>} Ritos */

export const PISOTON = { aviso: 3, radio: 2, separacion: 2.6, dano: 30 };
export const BRASEROS = {
  colores: [0xff513d, 0x4dafff, 0xffc641],
  viaje: 4,
  margenAparicion: 4.5,
  radio: 1.15,
  ventana: 3,
  dano: 26,
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
    tiros: [0, 1].map(() => ({ x: 0, z: 0, activo: false })),
  };
}

// Busca suelo libre cerca de la pareja. El brasero exige entrar tras aparecer.
/** @param {Mundo} w @param {Circulo[]} huecos @param {boolean} esBrasero */
function marca(w, huecos, esBrasero) {
  const [a, b] = w.players;
  const superviviente = a.alive ? a : b;
  const centro =
    !esBrasero && (!a.alive || !b.alive)
      ? superviviente
      : { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const radio = esBrasero ? BRASEROS.radio : PISOTON.radio;
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
  const zona = marca(w, huecos, false);
  if (!zona) return;
  Object.assign(r, zona, { tipo: "pisoton", tiempo: PISOTON.aviso });
}

/** @param {Ritos} r @param {Mundo} w @param {Circulo[]} [huecos] */
export function iniciarBraseros(r, w, huecos = []) {
  const ocupados = [...huecos];
  for (const fuego of r.braseros) {
    const sitio = marca(w, ocupados, true);
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
      x: w.arenaRadius * Math.cos(angulo),
      z: w.arenaRadius * Math.sin(angulo),
    });
  }
}

/** @param {number} x @param {number} z @param {number} dx @param {number} dz @param {Circulo} p */
function intercepta(x, z, dx, dz, p) {
  const longitud = dx * dx + dz * dz;
  const t = longitud
    ? Math.max(0, Math.min(1, ((p.x - x) * dx + (p.z - z) * dz) / longitud))
    : 0;
  return Math.hypot(x + t * dx - p.x, z + t * dz - p.z) <= p.r;
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
      const x = p.px - f.x,
        z = p.pz - f.z;
      const afuera = x * x + z * z - BRASEROS.radio ** 2;
      let t = 0;
      if (afuera > 0) {
        if (largo === 0) continue;
        const proy = x * dx + z * dz,
          disc = proy * proy - largo * afuera;
        if (disc < 0) continue;
        t = (-proy - Math.sqrt(disc)) / largo;
        if (t < 0 || t > 1) continue;
      }
      if (t < instante) {
        instante = t;
        primero = f.color;
      }
    }
  }
  return primero;
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
      w.players.every(
        (p) => !p.alive || Math.hypot(p.x - r.x, p.z - r.z) <= PISOTON.radio,
      );
    if (!juntos)
      w.players.forEach((p, i) => {
        if (p.alive) golpear(i, PISOTON.dano);
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
    // Se dirige a la posición actual, incluso después de un cambio de rumbo.
    const paso = Math.min(1, dt / antes);
    const dx = (p.x - t.x) * paso,
      dz = (p.z - t.z) * paso;
    if (!p.alive || w.pillars.some((o) => intercepta(t.x, t.z, dx, dz, o))) {
      t.activo = false;
      continue;
    }
    t.x += dx;
    t.z += dz;
    if (r.tiempo <= 1e-8) {
      t.activo = false;
      if (r.escudo.color !== r.colorObjetivo || r.escudo.restante <= 0)
        golpear(i, BRASEROS.dano);
    }
  }
  if (r.tiros.every((t) => !t.activo)) r.tipo = "";
}
