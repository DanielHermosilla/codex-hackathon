// Enemigos del pasillo (D-209): segadores (tajo en arco) y brincadores (embestida en línea).
// Mortales tocados por polvo de esquirla, temáticos del dios de la zona (D-140); quitan poca vida y rara
// vez matan (D-076). Puro: sin three.js ni DOM. Paso fijo y determinista: el azar entra por un `Rng`.
// La cadena los corta igual que al jefe y al muñeco (D-148): daño = tensión × velocidad relativa × largo
// de cadena dentro del cuerpo (`chainDamageStep` de cadena.js).
//
// Cada enemigo es a la vez su estado interno y su `EnemigoVista` (render y HUD solo leen). Todo se crea
// una vez en `crearHorda`: la marca del ataque (`zona`) es un objeto propio de cada enemigo que se
// enciende y apaga (pool de uno por enemigo), así no se crea nada en el paso fijo.
//
// Orden dentro de un paso (lo arma recorrido.js):
//   moverHorda → stepWorld (jugadores y cadena) → actualizarHorda (daño de la cadena, cerebros, golpes)

import { chainDamageStep } from "./cadena.js";
import { hurtPlayer, pushOutOfCircle } from "./jugadores.js";

/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Mundo} Mundo */
/** @typedef {import('./tipos.js').Punto} Punto */
/** @typedef {import('./tipos.js').Rng} Rng */
/** @typedef {import('./tipos.js').EnemigoVista} EnemigoVista */
/** @typedef {import('./tipos.js').ZonaEnemigo} ZonaEnemigo */
/** @typedef {Cfg['recorrido']['enemigos']['segador']} DefEnemigo */
/** @typedef {"segador" | "brincador"} TipoEnemigo */

/**
 * Enemigo completo: lo que lee el render (`EnemigoVista`) más su estado interno.
 * @typedef {EnemigoVista & {
 *   def: DefEnemigo,
 *   x0: number, z0: number,
 *   vx: number, vz: number,
 *   dvx: number, dvz: number,
 *   despierto: boolean,
 *   etapaT: number, etapaDur: number,
 *   pausa: number, cooldown: number,
 *   objetivo: number,
 *   golpeados: boolean[],
 *   avance: number,
 *   corteDano: number, corteIdle: number, enCorte: boolean,
 *   _zona: ZonaEnemigo,
 * }} Enemigo
 */

/**
 * Datos de aparición de un enemigo (ya convertidos de s/d a x/z).
 * @typedef {{ tipo: string, x: number, z: number }} AparicionEnemigo
 */

/**
 * Grupo de enemigos de un pasillo.
 * @typedef {object} Horda
 * @property {Cfg} cfg
 * @property {Enemigo[]} enemigos
 * @property {Rng} rng  azar con semilla (pausas)
 * @property {boolean} solo  modo solo: avisos más largos (D-121)
 * @property {boolean} dificil  telegrafías del modo difícil
 * @property {boolean} pasivos  true = no empiezan ataques (umbral cruzado, caídos)
 * @property {Punto[]} kb  empujón de golpes por jugador (m/s), se frena solo
 * @property {(tipo: string, datos: Record<string, any>) => void} emitir  salida de eventos
 * @property {{ muertes: number, danoAJugadores: number[], golpesAJugadores: number[] }} totales
 * @property {Punto} _pos  temporal reutilizado para mover cuerpos
 * @property {{ x: number, z: number, maxT: number, touching: boolean }} _contacto  temporal de la cadena
 */

/**
 * Convierte el texto de config en el tipo de enemigo (falla si no existe: mejor un error claro al cargar).
 * @param {string} tipo
 * @returns {TipoEnemigo}
 */
export function tipoEnemigo(tipo) {
  if (tipo === "segador" || tipo === "brincador") return tipo;
  throw new Error(`Enemigo de pasillo desconocido: ${tipo}`);
}

/**
 * Crea un enemigo en su punto de aparición. Se llama solo al montar la horda (no en el paso fijo).
 * @param {Cfg} cfg
 * @param {AparicionEnemigo} ap
 * @param {number} id  índice dentro de la horda
 * @returns {Enemigo}
 */
function crearEnemigo(cfg, ap, id) {
  const tipo = tipoEnemigo(ap.tipo); // valida el texto de config
  const def = cfg.recorrido.enemigos[tipo]; // números del tipo (vida, ataque…)
  return {
    id,
    tipo,
    def,
    x: ap.x, // m: posición actual
    z: ap.z,
    x0: ap.x, // m: aparición (para reiniciar el pasillo)
    z0: ap.z,
    face: Math.PI / 2, // rad: mira hacia +z (hacia el lobby, de donde vienen los jugadores)
    r: def.radio, // m: radio del cuerpo
    vivo: true,
    etapa: "quieto", // dormido hasta que alguien se acerca
    etapaK: 0,
    hp: def.vida,
    hpMax: def.vida,
    golpeT: Infinity, // s desde el último corte (Infinity = nunca)
    zona: null, // marca del ataque; apunta a `_zona` mientras ataca
    vx: 0, // m/s: velocidad real del último paso (la usa la cadena para el daño relativo)
    vz: 0,
    dvx: 0, // m/s: velocidad que pide el cerebro para el paso siguiente
    dvz: 0,
    despierto: false,
    etapaT: 0, // s dentro de la etapa actual
    etapaDur: 0, // s que dura la etapa actual (0 = sin fin fijo)
    pausa: def.pausa, // s que faltan para poder atacar
    cooldown: 0, // s que faltan para repetir el ataque
    objetivo: -1, // índice del jugador al que apunta el ataque (-1 = ninguno)
    golpeados: [false, false], // a quién ya golpeó este ataque (un golpe por ataque y jugador)
    avance: 0, // m recorridos en la embestida en curso
    corteDano: 0, // daño acumulado del corte en curso (se emite agrupado, como el número de daño D-166)
    corteIdle: 0, // s sin contacto desde el último daño del corte
    enCorte: false,
    _zona: {
      forma: "arco",
      x: 0,
      z: 0,
      ang: 0,
      radio: 0,
      angulo: 0,
      largo: 0,
      ancho: 0,
    },
  };
}

/**
 * Monta la horda de un pasillo. Todo lo que usa el paso fijo se crea aquí.
 * @param {Cfg} cfg
 * @param {AparicionEnemigo[]} lista
 * @param {{ rng: Rng, solo?: boolean, dificil?: boolean, emitir: (tipo: string, datos: Record<string, any>) => void }} opts
 * @returns {Horda}
 */
export function crearHorda(
  cfg,
  lista,
  { rng, solo = false, dificil = false, emitir },
) {
  const h = {
    cfg,
    enemigos: lista.map((ap, i) => crearEnemigo(cfg, ap, i)),
    rng,
    solo,
    dificil,
    pasivos: false,
    kb: [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ],
    emitir,
    totales: { muertes: 0, danoAJugadores: [0, 0], golpesAJugadores: [0, 0] },
    _pos: { x: 0, z: 0 },
    _contacto: { x: 0, z: 0, maxT: 0, touching: false },
  };
  for (const e of h.enemigos) e.pausa = pausaConAzar(h, e); // primera pausa ya desfasada entre enemigos
  return h;
}

/**
 * Devuelve a todos los enemigos a su aparición con vida llena (reinicio del pasillo, D-076/D-168).
 * Reutiliza los mismos objetos: el render puede seguir leyendo la misma lista.
 * @param {Horda} h
 * @param {Rng} rng  azar nuevo con la misma semilla: el pasillo reiniciado se juega igual
 */
export function reiniciarHorda(h, rng) {
  h.rng = rng;
  h.pasivos = false;
  for (let i = 0; i < 2; i++) h.kb[i].x = h.kb[i].z = 0; // sin empujones pendientes
  h.totales.muertes = 0;
  for (const e of h.enemigos) {
    e.x = e.x0;
    e.z = e.z0;
    e.face = Math.PI / 2;
    e.vivo = true;
    e.hp = e.hpMax;
    e.golpeT = Infinity;
    e.vx = e.vz = e.dvx = e.dvz = 0;
    e.despierto = false;
    e.cooldown = 0;
    e.objetivo = -1;
    e.avance = 0;
    e.corteDano = 0;
    e.corteIdle = 0;
    e.enCorte = false;
    ponerEtapa(e, "quieto", 0);
    e.pausa = pausaConAzar(h, e);
  }
}

/**
 * Pausa entre ataques con un poco de azar con semilla (± `pausaAzar`): los enemigos no atacan a la par.
 * @param {Horda} h
 * @param {Enemigo} e
 * @returns {number} s
 */
function pausaConAzar(h, e) {
  const k = h.cfg.recorrido.enemigos.comun.pausaAzar; // 0.25 = entre 75 % y 125 % de la pausa
  return e.def.pausa * (1 + k * (h.rng.next() * 2 - 1));
}

/**
 * Cambia la etapa y reinicia su reloj.
 * @param {Enemigo} e
 * @param {EnemigoVista['etapa']} etapa
 * @param {number} dur  s que dura (0 = sin fin fijo; etapaK queda en 0)
 */
function ponerEtapa(e, etapa, dur) {
  e.etapa = etapa;
  e.etapaT = 0;
  e.etapaDur = dur;
  e.etapaK = 0;
  // La marca del suelo solo existe mientras avisa o golpea.
  if (etapa !== "telegrafia" && etapa !== "activo") e.zona = null;
}

/**
 * Índice del jugador vivo más cercano a (x, z), o -1 si no queda ninguno.
 * @param {Mundo} w
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
function masCercano(w, x, z) {
  let mejor = -1;
  let md = Infinity;
  for (let i = 0; i < 2; i++) {
    const p = w.players[i];
    if (!p.alive) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < md) {
      md = d;
      mejor = i;
    }
  }
  return mejor;
}

// ─── Antes del mundo: empujones y cuerpos ───

/**
 * Pasa los empujones de los golpes al mundo y mueve los cuerpos con la velocidad que pidieron sus cerebros.
 * Los enemigos ceden ante pilares, jugadores (también cadáveres), otros enemigos y el borde: nunca empujan
 * a un jugador.
 * @param {Horda} h
 * @param {Mundo} w
 * @param {number} dt  s
 */
export function moverHorda(h, w, dt) {
  const C = h.cfg.recorrido.enemigos.comun;
  const kf = Math.exp(-C.empujeFrenado * dt); // frenado exponencial del empujón
  for (let i = 0; i < 2; i++) {
    w.ext[i].x = h.kb[i].x; // el mundo lo aplica como velocidad externa (ancla: reducido, D-122)
    w.ext[i].z = h.kb[i].z;
    h.kb[i].x *= kf;
    h.kb[i].z *= kf;
  }
  const pr = h.cfg.player.radius; // m: radio del jugador
  const pos = h._pos;
  for (const e of h.enemigos) {
    if (!e.vivo) {
      e.vx = e.vz = 0;
      continue;
    }
    const x0 = e.x;
    const z0 = e.z;
    pos.x = e.x + e.dvx * dt; // a donde quiere ir
    pos.z = e.z + e.dvz * dt;
    for (const P of w.pillars) pushOutOfCircle(pos, P.x, P.z, P.r + e.r);
    for (const o of h.enemigos)
      if (o !== e && o.vivo)
        pushOutOfCircle(pos, o.x, o.z, o.r + e.r + C.separacion);
    for (const p of w.players) pushOutOfCircle(pos, p.x, p.z, pr + e.r);
    if (w.limite) w.limite(pos, e.r); // dentro del lobby ∪ pasillo
    e.x = pos.x;
    e.z = pos.z;
    e.vx = (e.x - x0) / dt; // velocidad real: si embiste contra la cadena tensa, se corta solo (D-148)
    e.vz = (e.z - z0) / dt;
    if (e.etapa === "activo") e.avance += Math.hypot(e.x - x0, e.z - z0); // m de embestida
  }
}

// ─── Después del mundo: cadena, cerebros y golpes ───

/**
 * Daño de la cadena a cada enemigo, decisiones y golpes a los jugadores.
 * @param {Horda} h
 * @param {Mundo} w
 * @param {number} dt  s
 */
export function actualizarHorda(h, w, dt) {
  danoCadena(h, w, dt);
  const C = h.cfg.recorrido.enemigos.comun;
  let atacando = 0; // cuántos están en un ataque (aviso, golpe o recuperación)
  for (const e of h.enemigos) if (e.vivo && enAtaque(e)) atacando++;
  for (const e of h.enemigos) {
    if (!e.vivo) {
      if (e.etapa === "muere") avanzarEtapa(e, dt); // solo la animación de caída
      continue;
    }
    e.golpeT += dt;
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.dvx = 0; // por defecto quieto; cada etapa pide su velocidad
    e.dvz = 0;
    if (e.etapa === "quieto") {
      if (!e.despierto) e.despierto = alguienCerca(w, e, C.aggro);
      if (!e.despierto) continue;
      ponerEtapa(e, "acecha", 0);
    }
    if (e.etapa === "acecha") {
      if (h.pasivos) continue; // umbral o caídos: no hacen nada nuevo
      acercarse(h, w, e, dt);
      e.pausa -= dt;
      if (e.pausa > 0 || e.cooldown > 0 || atacando >= C.maxAtacando) continue;
      if (!alAlcance(h, w, e)) continue;
      iniciarAtaque(h, w, e);
      atacando++;
      continue;
    }
    avanzarEtapa(e, dt);
    if (e.etapa === "telegrafia") {
      if (e.etapaT >= e.etapaDur) activar(h, e);
    } else if (e.etapa === "activo") {
      golpes(h, w, e);
      if (
        e.etapaT >= e.etapaDur ||
        (e.def.ataque.forma === "linea" && e.avance >= e.def.ataque.largo)
      )
        ponerEtapa(e, "recupera", e.def.ataque.recuperacion);
      else if (e.def.ataque.forma === "linea") pedirEmbestida(e);
    } else if (e.etapa === "recupera" && e.etapaT >= e.etapaDur) {
      ponerEtapa(e, "acecha", 0);
      e.pausa = pausaConAzar(h, e);
    }
  }
}

/**
 * @param {Enemigo} e
 * @returns {boolean} true si está en un ataque (cuenta para el tope de D-076)
 */
const enAtaque = (e) =>
  e.etapa === "telegrafia" || e.etapa === "activo" || e.etapa === "recupera";

/**
 * Avanza el reloj de la etapa y su progreso 0..1.
 * @param {Enemigo} e
 * @param {number} dt
 */
function avanzarEtapa(e, dt) {
  e.etapaT += dt;
  e.etapaK = e.etapaDur > 0 ? Math.min(1, e.etapaT / e.etapaDur) : 0;
}

/**
 * ¿Hay un jugador vivo a menos de `radio` m?
 * @param {Mundo} w
 * @param {Enemigo} e
 * @param {number} radio
 * @returns {boolean}
 */
function alguienCerca(w, e, radio) {
  for (const p of w.players)
    if (p.alive && Math.hypot(p.x - e.x, p.z - e.z) <= radio) return true;
  return false;
}

/**
 * Gira hacia el jugador más cercano y se acerca hasta su distancia ideal.
 * @param {Horda} h
 * @param {Mundo} w
 * @param {Enemigo} e
 * @param {number} dt
 */
function acercarse(h, w, e, dt) {
  const i = masCercano(w, e.x, e.z);
  if (i < 0) return;
  const p = w.players[i];
  const dx = p.x - e.x;
  const dz = p.z - e.z;
  const ang = Math.atan2(dz, dx);
  const dif = Math.atan2(Math.sin(ang - e.face), Math.cos(ang - e.face)); // giro más corto, en rad
  const m = e.def.giro * dt; // giro máximo de este paso
  e.face += Math.max(-m, Math.min(m, dif));
  const hueco = Math.hypot(dx, dz) - e.r - h.cfg.player.radius; // m entre cuerpos
  if (hueco <= e.def.distanciaIdeal) return; // ya está donde quiere
  const v = Math.min(e.def.velocidad, (hueco - e.def.distanciaIdeal) / dt); // no se pasa de largo
  e.dvx = Math.cos(e.face) * v;
  e.dvz = Math.sin(e.face) * v;
}

/**
 * ¿El jugador más cercano está dentro del alcance del ataque?
 * @param {Horda} h
 * @param {Mundo} w
 * @param {Enemigo} e
 * @returns {boolean}
 */
function alAlcance(h, w, e) {
  const i = masCercano(w, e.x, e.z);
  if (i < 0) return false;
  const p = w.players[i];
  const hueco = Math.hypot(p.x - e.x, p.z - e.z) - e.r - h.cfg.player.radius;
  return hueco <= e.def.ataque.alcance;
}

/**
 * Empieza el aviso del ataque: fija la dirección hacia el objetivo y enciende la marca del suelo.
 * @param {Horda} h
 * @param {Mundo} w
 * @param {Enemigo} e
 */
function iniciarAtaque(h, w, e) {
  const A = e.def.ataque;
  e.objetivo = masCercano(w, e.x, e.z);
  const p = w.players[e.objetivo];
  e.face = Math.atan2(p.z - e.z, p.x - e.x); // apunta de golpe al objetivo al empezar el aviso
  const multSolo = h.solo ? h.cfg.jefes.comun.telegrafiaSolo : 1; // D-121: avisos más largos en solo
  const tele =
    (h.dificil ? A.telegrafia.dificil : A.telegrafia.normal) * multSolo; // s
  ponerEtapa(e, "telegrafia", tele);
  e.golpeados[0] = e.golpeados[1] = false;
  e.avance = 0;
  e.cooldown = A.cooldown;
  const z = e._zona; // marca del ataque (objeto propio: nada se crea)
  z.forma = A.forma === "linea" ? "linea" : "arco";
  z.x = e.x;
  z.z = e.z;
  z.ang = e.face;
  z.radio = A.radio;
  z.angulo = A.angulo;
  z.largo = A.largo;
  z.ancho = A.ancho;
  e.zona = z;
  h.emitir("enemigo:telegrafia", {
    id: e.id,
    tipoEnemigo: e.tipo,
    duracion: tele,
  });
}

/**
 * Pasa del aviso al golpe.
 * @param {Horda} h
 * @param {Enemigo} e
 */
function activar(h, e) {
  const A = e.def.ataque;
  // La embestida dura lo que tarda en recorrer su largo, más un margen; el tajo, su ventana activa.
  const dur = A.forma === "linea" ? A.largo / A.velocidad + A.activo : A.activo;
  ponerEtapa(e, "activo", dur);
  e.zona = e._zona; // la marca sigue a la vista mientras golpea
  if (A.forma === "linea") pedirEmbestida(e);
  h.emitir("enemigo:activo", { id: e.id, tipoEnemigo: e.tipo });
}

/**
 * La embestida pide moverse a toda velocidad en la dirección fijada en el aviso.
 * @param {Enemigo} e
 */
function pedirEmbestida(e) {
  const v = e.def.ataque.velocidad; // m/s
  e.dvx = Math.cos(e._zona.ang) * v;
  e.dvz = Math.sin(e._zona.ang) * v;
  e.face = e._zona.ang;
}

/**
 * Golpes del ataque activo con la misma geometría que la marca anunciada en el aviso (`_zona`, fija desde
 * `iniciarAtaque`): si empujan al enemigo durante el aviso o la carga topa con algo, el golpe no se mueve
 * de donde se avisó.
 *   tajo (arco): alcanza a quien tenga el centro a ≤ radio + radio del jugador del origen anunciado y
 *     dentro de la apertura.
 *   embestida (linea): franja de `ancho` m desde el origen anunciado; solo la parte ya barrida por el
 *     frente del cuerpo (avance a lo largo del eje + radio + `toque`, sin pasar de `largo`) hace daño, y
 *     alcanza a quien tenga el cuerpo dentro de ella (círculo del jugador que toca el rectángulo).
 * Un golpe por ataque y jugador. El dash esquiva (D-014) y la ventana tras un golpe protege (D-152).
 * @param {Horda} h
 * @param {Mundo} w
 * @param {Enemigo} e
 */
function golpes(h, w, e) {
  const A = e.def.ataque;
  const Z = e._zona; // marca anunciada: origen y dirección fijos durante todo el ataque
  const pr = h.cfg.player.radius; // m: radio del jugador
  const toque = h.cfg.recorrido.enemigos.comun.toque; // m de holgura del frente de la embestida
  const ux = Math.cos(Z.ang); // eje de la marca (unitario)
  const uz = Math.sin(Z.ang);
  // Embestida: hasta dónde llegó el frente del cuerpo a lo largo del eje (m desde el origen anunciado).
  // Se mide por la posición real proyectada: si una columna frena la carga, el frente se queda ahí.
  const frente =
    A.forma === "linea"
      ? Math.min(A.largo, (e.x - Z.x) * ux + (e.z - Z.z) * uz + e.r + toque)
      : 0;
  for (let i = 0; i < 2; i++) {
    const p = w.players[i];
    if (!p.alive || e.golpeados[i]) continue;
    const dx = p.x - Z.x; // m: jugador respecto al origen anunciado
    const dz = p.z - Z.z;
    let dentro;
    if (A.forma === "linea") {
      const a = dx * ux + dz * uz; // m a lo largo del eje
      const l = -dx * uz + dz * ux; // m a un lado del eje
      // Punto del rectángulo barrido [0, frente] × [−ancho/2, ancho/2] más cercano al centro del jugador.
      const ca = Math.max(0, Math.min(frente, a));
      const cl = Math.max(-A.ancho / 2, Math.min(A.ancho / 2, l));
      dentro = frente > 0 && Math.hypot(a - ca, l - cl) <= pr; // el cuerpo toca la franja barrida
    } else {
      const d = Math.hypot(dx, dz); // m del origen anunciado
      const dif = Math.atan2(
        Math.sin(Math.atan2(dz, dx) - Z.ang),
        Math.cos(Math.atan2(dz, dx) - Z.ang),
      ); // rad respecto a la dirección anunciada
      const mitad = (A.angulo * Math.PI) / 360; // media apertura en rad
      dentro = d <= A.radio + pr && Math.abs(dif) <= mitad;
    }
    if (!dentro) continue;
    if (!hurtPlayer(p, A.dano, h.cfg)) continue; // dash o ventana de invulnerabilidad: no cuenta
    e.golpeados[i] = true;
    h.totales.danoAJugadores[i] += A.dano;
    h.totales.golpesAJugadores[i]++;
    if (A.empuje > 0) {
      // Empujón hacia fuera del cuerpo que golpea (la embestida) o del origen del tajo.
      const kx = A.forma === "linea" ? p.x - e.x : dx;
      const kz = A.forma === "linea" ? p.z - e.z : dz;
      const l = Math.hypot(kx, kz) || 1; // evita dividir por cero si están encima
      h.kb[i].x = (kx / l) * A.empuje;
      h.kb[i].z = (kz / l) * A.empuje;
    }
    h.emitir("enemigo:golpe", { id: e.id, jugador: i, dano: A.dano });
  }
}

/**
 * Daño de la cadena: floja hace menos daño y tensa alcanza el máximo. El daño de un corte se agrupa y se emite como
 * `enemigo:herido` al cerrar el corte (`feedback.damageNumber.gap` s sin contacto) o al morir.
 * @param {Horda} h
 * @param {Mundo} w
 * @param {number} dt
 */
function danoCadena(h, w, dt) {
  const cfg = h.cfg;
  const gap = cfg.feedback.damageNumber.gap; // s sin contacto que cierran un corte (D-166)
  for (const e of h.enemigos) {
    if (!e.vivo) continue;
    const dmg = chainDamageStep(w.chain, e, dt, cfg, h._contacto); // usa e.vx/vz = velocidad real
    if (dmg <= 0) {
      if (e.enCorte) {
        e.corteIdle += dt;
        if (e.corteIdle >= gap) cerrarCorte(h, e);
      }
      continue;
    }
    e.hp -= dmg;
    e.golpeT = 0;
    e.despierto = true; // cortar a un dormido lo despierta
    e.enCorte = true;
    e.corteDano += dmg;
    e.corteIdle = 0;
    if (e.hp <= 0) morir(h, e);
  }
}

/**
 * Emite el daño agrupado del corte y lo cierra.
 * @param {Horda} h
 * @param {Enemigo} e
 */
function cerrarCorte(h, e) {
  if (!e.enCorte) return;
  h.emitir("enemigo:herido", { id: e.id, dano: e.corteDano });
  e.enCorte = false;
  e.corteDano = 0;
  e.corteIdle = 0;
}

/**
 * Muerte: cancela lo que estuviera haciendo (sin marca ni golpes pendientes) y deja el cuerpo cayendo.
 * @param {Horda} h
 * @param {Enemigo} e
 */
function morir(h, e) {
  e.hp = 0;
  cerrarCorte(h, e);
  e.vivo = false;
  e.dvx = e.dvz = e.vx = e.vz = 0;
  ponerEtapa(e, "muere", h.cfg.recorrido.enemigos.comun.muerte);
  h.totales.muertes++;
  h.emitir("enemigo:muere", { id: e.id, tipoEnemigo: e.tipo, x: e.x, z: e.z });
}

/**
 * Calma la horda (umbral cruzado, caídos): corta los ataques en curso y no empieza otros.
 * @param {Horda} h
 */
export function calmarHorda(h) {
  h.pasivos = true;
  for (let i = 0; i < 2; i++) h.kb[i].x = h.kb[i].z = 0; // sin empujones pendientes
  for (const e of h.enemigos) {
    e.dvx = e.dvz = 0;
    if (e.vivo && e.etapa !== "quieto") ponerEtapa(e, "acecha", 0); // apaga la marca del ataque
  }
}

/**
 * Cuántos enemigos están en un ataque ahora (para pruebas y depuración).
 * @param {Horda} h
 * @returns {number}
 */
export function atacandoAhora(h) {
  let n = 0;
  for (const e of h.enemigos) if (e.vivo && enAtaque(e)) n++;
  return n;
}
