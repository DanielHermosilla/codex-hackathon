// Sintetizador propio de efectos: convierte una «voz» descrita con números en muestras (Float32Array).
// Es código puro (sin WebAudio ni DOM) y determinista: la misma voz y semilla dan siempre las mismas
// muestras, así el motor puede guardar el resultado en caché y las pruebas pueden medirlo en Node.
//
// Por qué existe además de zzfx: zzfx da un oscilador simple por capa. Aquí hay timbres que zzfx no
// tiene: metal inarmónico (eslabones, campanas, cuencos), cuerda pulsada (motivos cálidos de folk),
// ruido con filtro resonante (aire, corteza, fuego, grano) y una sala corta que da cuerpo y lugar.
//
// Voces disponibles (campo `voz` de cada capa en src/atados/audio/efectos.js):
//   tono   · osciladores afinados con armónicos, coro, vibrato, trémolo y deslizamiento de tono.
//   metal  · parciales inarmónicos que decaen por separado, con golpe de ruido al inicio (sin deslizamiento).
//   cuerda · cuerda pulsada (algoritmo Karplus-Strong): arpa o laúd breve.
//   ruido  · ruido blanco o chispas por un filtro resonante que barre de `desde` a `hasta` Hz.
//   golpe  · seno cuyo tono cae rápido (bombo, tierra, cuerpo) con chasquido opcional.
// Unidades: segundos (s), hercios (Hz), semitonos (st), cents (1/100 de semitono), ganancia 0–1.

const TAU = 2 * Math.PI; // una vuelta completa en radianes
const MIN_ATAQUE = 0.002; // s: rampa mínima de entrada; menos que esto suena como un clic
const ACTUALIZAR_FILTRO = 16; // muestras entre recálculos del filtro que barre (ahorra CPU, sin escalones audibles)

// Parciales de metal: [proporción respecto de la frecuencia base, ganancia, multiplicador de caída].
// Las proporciones vienen de la física de cada objeto y por eso no suenan como una nota de piano.
/** @type {Record<string, number[][]>} */
export const PARCIALES_METAL = {
  // Barra libre (eslabón pequeño): modos 1 · 2,76 · 5,40 · 8,93 de una barra suelta por ambos extremos.
  eslabon: [
    [1, 1, 1],
    [2.76, 0.55, 0.6],
    [5.4, 0.3, 0.38],
    [8.93, 0.16, 0.25],
  ],
  // Campana: zumbido grave (0,5), fundamental, tercera menor (1,19) y quinta; encaja con re menor.
  campana: [
    [0.5, 0.32, 1.5],
    [1, 1, 1],
    [1.19, 0.5, 0.8],
    [1.5, 0.4, 0.7],
    [2, 0.42, 0.55],
    [2.51, 0.2, 0.42],
    [2.66, 0.16, 0.38],
    [3.01, 0.12, 0.3],
  ],
  // Cuenco: pocos modos muy separados y caída larga; suena místico y deja espacio a la música.
  cuenco: [
    [1, 1, 1],
    [2.71, 0.42, 0.7],
    [5.15, 0.18, 0.45],
    [8.17, 0.07, 0.3],
  ],
  // Hoja o placa: muchos modos juntos, brillo áspero que se apaga rápido (hoz, filo).
  placa: [
    [1, 0.8, 1],
    [1.59, 0.6, 0.8],
    [2.14, 0.5, 0.7],
    [2.3, 0.45, 0.6],
    [2.65, 0.35, 0.5],
    [2.92, 0.28, 0.45],
    [3.16, 0.2, 0.4],
    [3.5, 0.14, 0.32],
  ],
};

/** @typedef {Record<string, any>} Voz Capa de este sintetizador: `voz` más sus parámetros (ver arriba). */
/** @typedef {{ mezcla: number, tamano: number, brillo?: number }} Sala Reverberación: mezcla 0–1, tamaño 0–1, brillo 0–1. */
/** @typedef {{ pasoAlto?: number, pasoBajo?: number, sala?: Sala }} Post Proceso del sonido completo. */

// Valores por defecto de cada voz. Cambiarlos afecta a todos los efectos que no los fijan.
/** @type {Record<string, Record<string, number>>} */
const DEFECTOS = {
  tono: { ataque: 0.01, sostener: 0, soltar: 0.3, curva: 3, volumen: 0.5 },
  metal: { ataque: 0.001, sostener: 0, soltar: 0, curva: 0, volumen: 0.5 },
  cuerda: { ataque: 0, sostener: 0, soltar: 0.8, curva: 0, volumen: 0.5 },
  ruido: { ataque: 0.005, sostener: 0, soltar: 0.2, curva: 3, volumen: 0.5 },
  golpe: { ataque: 0.001, sostener: 0, soltar: 0.25, curva: 4, volumen: 0.5 },
};

// ─── Azar determinista ───
// Generador mulberry32: dada una semilla entera devuelve números 0–1 siempre en el mismo orden.
/** @param {number} semilla @returns {() => number} */
export function crearAzar(semilla) {
  let s = semilla >>> 0 || 1; // >>> 0 convierte a entero sin signo de 32 bits
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); // Math.imul multiplica como enteros de 32 bits
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 2^32: lleva el entero al rango 0–1
  };
}

// Semilla estable a partir de un texto (id del sonido + número de capa), hash FNV-1a.
/** @param {string} texto */
export function semillaDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Duración y ajuste a la telegrafía ───
// Completa la capa con los valores por defecto de su voz y, si tiene `ajuste`, la estira a `duracion` s:
// 'sostener' alarga la parte estable; 'ataque' alarga la entrada (crece hasta el golpe).
/** @param {Voz} capa @param {number | null} [duracion] @returns {Voz} */
export function resolverVoz(capa, duracion = null) {
  const base = DEFECTOS[capa.voz];
  if (!base) throw new Error(`voz de efecto desconocida: ${capa.voz}`);
  /** @type {Voz} */
  const v = { ...base, ...capa };
  if (v.voz === "metal" && !capa.soltar) v.soltar = colaMetal(v); // el metal dura lo que tarda en apagarse
  if (duracion != null && capa.ajuste) {
    if (capa.ajuste === "ataque")
      v.ataque = Math.max(0.01, duracion - v.sostener - v.soltar);
    else v.sostener = Math.max(0, duracion - v.ataque - v.soltar);
  }
  return v;
}

// Segundos que suena una voz ya resuelta (sin la sala).
/** @param {Voz} v */
export const duracionVoz = (v) => v.ataque + v.sostener + v.soltar;

// Tiempo hasta que el parcial más lento del metal baja unos 40 dB (×0,01): caída · multiplicador · 4,6.
/** @param {Voz} v */
function colaMetal(v) {
  const parciales = v.parciales ?? PARCIALES_METAL[v.tipo ?? "eslabon"];
  let lento = 0;
  for (const p of parciales) lento = Math.max(lento, p[2]);
  return (v.caida ?? 0.2) * lento * 4.6;
}

// ─── Envolvente ───
// Volumen 0–1 en el instante t (s): entrada suave (seno²), meseta y caída curva que llega a 0 justo al final.
// `curva` más alta = cae antes y deja una cola más fina.
/** @param {number} t @param {Voz} v */
export function envolvente(t, v) {
  if (t < 0) return 0;
  const a = Math.max(v.ataque, 0);
  if (t < a) {
    const x = Math.sin((Math.PI / 2) * (t / a));
    return x * x;
  }
  t -= a;
  if (t < v.sostener) return 1;
  t -= v.sostener;
  if (v.soltar <= 0 || t >= v.soltar) return v.soltar <= 0 ? 1 : 0; // sin caída: se mantiene (bucles)
  const x = t / v.soltar;
  return (1 - x) * Math.exp(-v.curva * x);
}

// ─── Render de una voz ───
/**
 * @param {Voz} v Voz ya resuelta con `resolverVoz`.
 * @param {number} sr Muestras por segundo del contexto de audio (44100 o 48000; 8000 en pruebas).
 * @param {number} semilla Semilla del ruido de esta capa.
 * @returns {Float32Array}
 */
export function renderizarVoz(v, sr, semilla) {
  const n = Math.max(1, Math.ceil(duracionVoz(v) * sr));
  const out = new Float32Array(n);
  const azar = crearAzar(semilla);
  if (v.voz === "tono") tono(v, sr, out);
  else if (v.voz === "metal") metal(v, sr, out, azar);
  else if (v.voz === "cuerda") cuerda(v, sr, out, azar);
  else if (v.voz === "ruido") ruido(v, sr, out, azar);
  else if (v.voz === "golpe") golpe(v, sr, out, azar);
  return out;
}

// Factor de tono por deslizamiento (st repartidos en `deslizT` s) y vibrato (cents a `hz`, desde `desde` s).
/** @param {Voz} v @param {number} t */
function factorTono(v, t) {
  let st = 0;
  if (v.desliz) {
    const T = v.deslizT ?? duracionVoz(v);
    const x = Math.min(1, t / Math.max(T, 1e-4));
    st += v.desliz * (1 - (1 - x) * (1 - x)); // curva suave: se mueve rápido al inicio y se asienta
  }
  if (v.vibrato) {
    const tv = t - (v.vibrato.desde ?? 0);
    if (tv > 0)
      st += (v.vibrato.cents / 100) * Math.sin(TAU * v.vibrato.hz * tv);
  }
  return st ? Math.pow(2, st / 12) : 1; // 12 st = el doble de frecuencia
}

// Trémolo: baja el volumen hasta `prof` (0–1) y vuelve, `hz` veces por segundo.
/** @param {Voz} v @param {number} t */
function factorTremolo(v, t) {
  if (!v.tremolo) return 1;
  return 1 - v.tremolo.prof * (0.5 - 0.5 * Math.cos(TAU * v.tremolo.hz * t));
}

// Curvas de control (tono y volumen) muestra a muestra. Se calculan cada BLOQUE muestras y se interpolan
// en línea recta entre medio: suena igual y evita miles de llamadas a exp, pow y cos.
const BLOQUE = 16;
/** @param {Voz} v @param {number} sr @param {number} n @param {boolean} conTono */
function curvas(v, sr, n, conTono) {
  const amp = new Float32Array(n);
  const tonoF = conTono ? new Float32Array(n) : null;
  let a0 = envolvente(0, v) * factorTremolo(v, 0);
  let f0 = conTono ? factorTono(v, 0) : 1;
  for (let i = 0; i < n; i += BLOQUE) {
    const j = Math.min(n, i + BLOQUE);
    const t1 = j / sr;
    const a1 = envolvente(t1, v) * factorTremolo(v, t1);
    const f1 = conTono ? factorTono(v, t1) : 1;
    for (let k = i; k < j; k++) {
      const x = (k - i) / BLOQUE; // 0–1 dentro del bloque
      amp[k] = a0 + (a1 - a0) * x;
      if (tonoF) tonoF[k] = f0 + (f1 - f0) * x;
    }
    a0 = a1;
    f0 = f1;
  }
  return { amp, tonoF };
}

// Tabla de seno: leer una tabla es mucho más rápido que llamar a Math.sin en cada muestra.
const TABLA_N = 4096; // puntos por ciclo; con interpolación lineal el error es inaudible
const TABLA = new Float32Array(TABLA_N + 1);
for (let i = 0; i <= TABLA_N; i++) TABLA[i] = Math.sin((TAU * i) / TABLA_N);
/** @param {number} fase Ciclo 0–1. */
function seno(fase) {
  const x = fase * TABLA_N;
  const i = x | 0; // | 0 trunca a entero
  return TABLA[i] + (TABLA[i + 1] - TABLA[i]) * (x - i);
}

// Tono afinado: suma de armónicos [proporción, ganancia]; `coro` (cents) duplica cada uno algo desafinado.
/** @param {Voz} v @param {number} sr @param {Float32Array} out */
function tono(v, sr, out) {
  /** @type {number[][]} */
  const armonicos = v.armonicos ?? [[1, 1]];
  const copias = v.coro ? [-v.coro / 2, v.coro / 2] : [0];
  // Proporción y ganancia de cada oscilador, calculadas una sola vez (fuera del bucle de muestras).
  const razones = [];
  const ganancias = [];
  for (const [r, g] of armonicos)
    for (const c of copias) {
      razones.push(r * Math.pow(2, c / 1200)); // 1200 cents = una octava
      ganancias.push(g);
    }
  const fases = new Float64Array(razones.length);
  let total = 0;
  for (const g of ganancias) total += g;
  const triangulo = v.forma === "triangulo";
  const limite = sr * 0.45; // por encima de ~0,45·sr el armónico se omite para no generar aliasing
  const { amp, tonoF } = curvas(v, sr, out.length, true);
  const escala = v.volumen / total;
  for (let i = 0; i < out.length; i++) {
    const f0 = v.frecuencia * /** @type {Float32Array} */ (tonoF)[i];
    let s = 0;
    for (let k = 0; k < razones.length; k++) {
      const f = f0 * razones[k];
      if (f >= limite) continue;
      let ph = fases[k] + f / sr; // la fase avanza una fracción de ciclo por muestra
      ph -= ph | 0; // se mantiene entre 0 y 1
      fases[k] = ph;
      s += ganancias[k] * (triangulo ? 4 * Math.abs(ph - 0.5) - 1 : seno(ph));
    }
    out[i] = escala * amp[i] * s;
  }
}

// Metal inarmónico: cada parcial es un resonador que gira y se apaga con su propio tiempo (dos sumas y
// cuatro productos por muestra). `batido` (Hz) suma un gemelo desafinado que late lento (campana viva);
// `golpe` añade el chasquido del impacto en `golpeHz`.
/** @param {Voz} v @param {number} sr @param {Float32Array} out @param {() => number} azar */
function metal(v, sr, out, azar) {
  /** @type {number[][]} */
  const parciales = v.parciales ?? PARCIALES_METAL[v.tipo ?? "eslabon"];
  const caida = v.caida ?? 0.2; // s: constante de caída del parcial base
  // Estado de cada resonador en arreglos planos (más rápido que objetos): parte real e imaginaria,
  // coseno y seno del giro por muestra (ya multiplicados por la pérdida) y ganancia.
  const max = parciales.length * 2;
  const RE = new Float64Array(max),
    IM = new Float64Array(max),
    C = new Float64Array(max),
    S = new Float64Array(max),
    G = new Float64Array(max),
    VIDA = new Float64Array(max); // muestra en la que el resonador ya bajó 80 dB y deja de calcularse
  let cuantos = 0;
  let total = 0;
  /** @param {number} f @param {number} g @param {number} d */
  const agregar = (f, g, d) => {
    if (f >= sr * 0.45) return; // demasiado agudo para esta frecuencia de muestreo
    const r = Math.exp(-1 / (caida * d * sr)); // cuánto queda de amplitud tras una muestra
    const w = (TAU * f) / sr; // radianes por muestra
    const fase = TAU * azar(); // fase inicial al azar: menos «pitido» sintético
    RE[cuantos] = Math.cos(fase);
    IM[cuantos] = Math.sin(fase);
    C[cuantos] = r * Math.cos(w);
    S[cuantos] = r * Math.sin(w);
    G[cuantos] = g;
    VIDA[cuantos] = caida * d * sr * 9.2; // 9,2 constantes de tiempo ≈ −80 dB
    cuantos++;
    total += g;
  };
  for (const [razon, g, d] of parciales) {
    agregar(v.frecuencia * razon, g, d);
    if (v.batido) agregar(v.frecuencia * razon + v.batido, g * 0.5, d);
  }
  if (!total) return;
  const dur = duracionVoz(v);
  const fade = Math.min(0.03, dur * 0.2); // s: el final se funde a cero para no cortar en seco
  const ruidoClic = filtroBanda(v.golpeHz ?? 4000, 1.2, sr);
  const nAtaque = Math.max(1, v.ataque * sr);
  const nFade = Math.max(1, fade * sr);
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let k = 0; k < cuantos; k++) {
      if (i > VIDA[k]) continue; // ya inaudible
      const re = RE[k] * C[k] - IM[k] * S[k]; // rotación compleja con pérdida: oscila y decae
      IM[k] = RE[k] * S[k] + IM[k] * C[k];
      RE[k] = re;
      s += G[k] * IM[k];
    }
    let e = i < nAtaque ? i / nAtaque : 1; // ataque lineal muy corto
    const resta = out.length - i;
    if (resta < nFade) e *= resta / nFade;
    let clic = 0;
    const t = i / sr;
    if (v.golpe && t < 0.012)
      clic = v.golpe * Math.exp(-t / 0.003) * ruidoClic(azar() * 2 - 1); // 12 ms de chasquido
    out[i] = v.volumen * (e * (s / total) * factorTremolo(v, t) + clic);
  }
}

// Cuerda pulsada (Karplus-Strong): un ruido corto circula por una línea de retardo del largo de un ciclo
// y se suaviza en cada vuelta. `brillo` 0–1 = cuánto agudo tiene el pulso; `soltar` = s hasta apagarse.
/** @param {Voz} v @param {number} sr @param {Float32Array} out @param {() => number} azar */
function cuerda(v, sr, out, azar) {
  const periodo = sr / Math.min(v.frecuencia, sr * 0.4); // muestras por ciclo
  let L = Math.floor(periodo - 0.5); // el promedio de dos muestras ya retrasa media muestra
  let d = periodo - 0.5 - L; // resto fraccional: lo cubre un filtro pasa-todo
  if (d < 0.1) {
    L -= 1;
    d += 1;
  }
  L = Math.max(2, L);
  const C = (1 - d) / (1 + d); // coeficiente del pasa-todo que afina la cuerda
  const perdida = Math.pow(10, -3 / (Math.max(0.05, v.soltar) * v.frecuencia)); // −60 dB en `soltar` s
  const buf = new Float64Array(L);
  const brillo = v.brillo ?? 0.5;
  let lp = 0;
  for (let i = 0; i < L; i++) {
    lp += (azar() * 2 - 1 - lp) * (0.15 + 0.85 * brillo); // pulso más o menos brillante
    buf[i] = lp;
  }
  let media = 0;
  for (const x of buf) media += x / L;
  for (let i = 0; i < L; i++) buf[i] -= media; // sin componente continua (evita un «pum» sordo)
  let p = 0,
    previo = 0,
    x1 = 0,
    y1 = 0,
    dcX = 0,
    dcY = 0;
  const fade = Math.min(0.05, v.soltar * 0.25);
  for (let i = 0; i < out.length; i++) {
    const actual = buf[p];
    const prom = 0.5 * (actual + previo); // suavizado: los agudos se apagan antes que los graves
    previo = actual;
    const ap = C * prom + x1 - C * y1; // pasa-todo fraccional
    x1 = prom;
    y1 = ap;
    buf[p] = perdida * ap;
    p = p + 1 === L ? 0 : p + 1;
    dcY = actual - dcX + 0.995 * dcY; // filtro que quita la deriva continua
    dcX = actual;
    const t = i / sr;
    let e = 1;
    if (t > v.soltar - fade) e = Math.max(0, (v.soltar - t) / fade);
    out[i] = v.volumen * e * dcY;
  }
}

// Ruido filtrado. `filtro`: 'banda' | 'bajo' | 'alto'; el corte barre de `desde` a `hasta` Hz (curva
// exponencial, suena parejo al oído) durante `barrido` s (por defecto, toda la voz); `q` = resonancia.
// `chispas` {porSeg, caida}: en vez de ruido continuo, crujidos sueltos (fuego, corteza, grano).
/** @param {Voz} v @param {number} sr @param {Float32Array} out @param {() => number} azar */
function ruido(v, sr, out, azar) {
  const desde = v.desde ?? 1000;
  const hasta = v.hasta ?? desde;
  const T = v.barrido ?? duracionVoz(v);
  const q = v.q ?? 0.8;
  const modo = v.filtro ?? "banda";
  const svf = crearSvf(sr);
  const chispas = v.chispas;
  const pChispa = chispas ? chispas.porSeg / sr : 0; // probabilidad de una chispa en cada muestra
  const caidaChispa = chispas ? Math.exp(-1 / (chispas.caida * sr)) : 0;
  let energia = 0;
  // La banda estrecha deja pasar menos energía: se compensa para que `volumen` signifique lo mismo.
  const compensa = modo === "banda" ? Math.sqrt(q) : 1;
  const { amp } = curvas(v, sr, out.length, false);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    if (i % ACTUALIZAR_FILTRO === 0) {
      const x = Math.min(1, t / Math.max(T, 1e-4));
      svf.ajustar(desde * Math.pow(hasta / desde, x), q);
    }
    let fuente = azar() * 2 - 1;
    if (chispas) {
      if (azar() < pChispa) energia = 0.35 + 0.65 * azar(); // nace una chispa de fuerza variable
      fuente *= energia;
      energia *= caidaChispa;
    }
    const y = svf.paso(fuente, modo) * compensa;
    out[i] = v.volumen * amp[i] * y;
  }
}

// Golpe con cuerpo: seno que empieza `desde` veces más agudo y cae a `frecuencia` en `caidaTono` s.
// `clic` añade 6 ms de ruido para la definición del impacto.
/** @param {Voz} v @param {number} sr @param {Float32Array} out @param {() => number} azar */
function golpe(v, sr, out, azar) {
  const desde = v.desde ?? 2;
  const caidaTono = v.caidaTono ?? 0.04;
  const filtroClic = filtroBanda(v.clicHz ?? 2500, 0.9, sr);
  const forma = { ...v, ataque: Math.max(v.ataque, MIN_ATAQUE / 2) }; // ataque mínimo: sin clic
  const { amp } = curvas(forma, sr, out.length, false);
  const caidaPorMuestra = Math.exp(-1 / (caidaTono * sr)); // el exceso de tono se reduce así en cada muestra
  let exceso = desde - 1; // cuántas veces más agudo que `frecuencia` está ahora
  let fase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const f = v.frecuencia * (1 + exceso);
    exceso *= caidaPorMuestra;
    fase += f / sr;
    fase -= fase | 0;
    let s = seno(fase) * amp[i];
    if (v.clic && t < 0.02)
      s += v.clic * Math.exp(-t / 0.006) * filtroClic(azar() * 2 - 1);
    out[i] = v.volumen * s;
  }
}

// ─── Filtros ───
// Filtro de estado variable (TPT): da paso bajo, banda y alto a la vez y es estable aunque el corte cambie.
/** @param {number} sr */
function crearSvf(sr) {
  let g = 0,
    k = 1,
    a1 = 0,
    a2 = 0,
    a3 = 0,
    ic1 = 0,
    ic2 = 0;
  return {
    /** @param {number} fc Hz de corte @param {number} q resonancia */
    ajustar(fc, q) {
      const f = Math.min(Math.max(fc, 20), sr * 0.45); // nunca por encima de ~Nyquist
      g = Math.tan((Math.PI * f) / sr);
      k = 1 / Math.max(q, 0.05);
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    },
    /** @param {number} x @param {string} modo */
    paso(x, modo) {
      const v3 = x - ic2;
      const v1 = a1 * ic1 + a2 * v3;
      const v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      if (modo === "bajo") return v2;
      if (modo === "alto") return x - k * v1 - v2;
      return k * v1; // banda con ganancia 1 en el centro
    },
  };
}

// Banda fija como función de una entrada (para los chasquidos).
/** @param {number} fc @param {number} q @param {number} sr @returns {(x: number) => number} */
function filtroBanda(fc, q, sr) {
  const svf = crearSvf(sr);
  svf.ajustar(fc, q);
  return (x) => svf.paso(x, "banda");
}

// Biquad de 2 polos (fórmulas RBJ) aplicado en el lugar: limpia graves o agudos del sonido completo.
/** @param {Float32Array} buf @param {'bajo' | 'alto'} tipo @param {number} fc @param {number} sr */
function filtrar(buf, tipo, fc, sr) {
  const f = Math.min(Math.max(fc, 10), sr * 0.45);
  const w = (TAU * f) / sr;
  const alfa = Math.sin(w) / (2 * Math.SQRT1_2); // Q = 0,707: sin resonancia
  const c = Math.cos(w);
  const b1 = tipo === "bajo" ? 1 - c : -(1 + c);
  const b0 = tipo === "bajo" ? b1 / 2 : -b1 / 2;
  const a0 = 1 + alfa;
  const [B0, B1, B2, A1, A2] = [
    b0 / a0,
    b1 / a0,
    b0 / a0,
    (-2 * c) / a0,
    (1 - alfa) / a0,
  ];
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    buf[i] = y;
  }
}

// ─── Sala ───
// Retardos (en muestras a 44,1 kHz) de 4 filtros peine y 2 pasa-todo, estilo Freeverb, en una sola pista.
const PEINES = [1116, 1188, 1277, 1356];
const PASATODOS = [556, 441];

// Realimentación de los peines según el tamaño 0–1 (más = cola más larga).
/** @param {Sala} sala */
const realimentacion = (sala) =>
  0.6 + 0.32 * Math.min(1, Math.max(0, sala.tamano));

// Segundos de cola que agrega la sala (hasta que baja 60 dB), para reservar espacio en el buffer.
/** @param {Sala | undefined} sala */
export function colaSala(sala) {
  if (!sala || !sala.mezcla) return 0;
  const vueltas = Math.log(0.001) / Math.log(realimentacion(sala)); // vueltas hasta ×0,001
  const promedio = PEINES.reduce((a, b) => a + b, 0) / PEINES.length / 44100;
  return Math.min(3, vueltas * promedio);
}

/** @param {Float32Array} buf @param {number} sr @param {Sala} sala */
function aplicarSala(buf, sr, sala) {
  const esc = sr / 44100;
  const fb = realimentacion(sala);
  const amort = 0.2 + 0.6 * (1 - (sala.brillo ?? 0.4)); // amortiguación de agudos en la cola
  const humedo = new Float32Array(buf.length);
  for (const d of PEINES) {
    const L = Math.max(1, Math.round(d * esc));
    const linea = new Float32Array(L);
    let p = 0,
      lp = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = linea[p];
      lp = y * (1 - amort) + lp * amort; // la cola se oscurece con cada vuelta
      linea[p] = buf[i] + lp * fb;
      p = p + 1 === L ? 0 : p + 1;
      humedo[i] += y / PEINES.length;
    }
  }
  for (const d of PASATODOS) {
    const L = Math.max(1, Math.round(d * esc));
    const linea = new Float32Array(L);
    let p = 0;
    for (let i = 0; i < buf.length; i++) {
      const b = linea[p];
      const x = humedo[i];
      linea[p] = x + b * 0.5;
      humedo[i] = b - x; // difunde los ecos para que no se oigan como repeticiones
      p = p + 1 === L ? 0 : p + 1;
    }
  }
  const fadeN = Math.min(buf.length, Math.round(0.08 * sr)); // últimos 80 ms: se funden a cero
  for (let i = 0; i < buf.length; i++) {
    let w = sala.mezcla * humedo[i];
    const resta = buf.length - i;
    if (resta < fadeN) w *= resta / fadeN;
    buf[i] += w;
  }
}

// Proceso del sonido completo: pasa-altos (deja los graves a la música), pasa-bajos (quita aspereza) y sala.
/** @param {Float32Array} buf @param {number} sr @param {Post | undefined} post */
export function aplicarPost(buf, sr, post) {
  if (!post) return buf;
  if (post.pasoAlto) filtrar(buf, "alto", post.pasoAlto, sr);
  if (post.pasoBajo) filtrar(buf, "bajo", post.pasoBajo, sr);
  if (post.sala?.mezcla) aplicarSala(buf, sr, post.sala);
  return buf;
}

// ─── Mezcla de un sonido completo ───
// Suma las capas de un plan (`planSonido` de reglas.js) en su instante, aplica el proceso y evita la
// saturación: si el pico pasa de 1, baja todo en proporción. `construir` genera las capas zzfx.
/**
 * @param {{ capas: { args: number[] | null, voz: Voz | null, offset: number }[], largo: number, post: Post | null }} plan
 * @param {string} id Nombre del sonido: fija la semilla del ruido de cada capa.
 * @param {number} sr Muestras por segundo.
 * @param {((args: number[]) => ArrayLike<number>) | null} construir zzfx.buildSamples, o null si no hay capas zzfx.
 * @returns {Float32Array}
 */
export function mezclarPlan(plan, id, sr, construir) {
  const n = Math.max(1, Math.ceil(plan.largo * sr) + 1);
  const mezcla = new Float32Array(n);
  for (let k = 0; k < plan.capas.length; k++) {
    const c = plan.capas[k];
    let s;
    if (c.voz) s = renderizarVoz(c.voz, sr, semillaDe(`${id}#${k}`));
    else if (construir) s = construir(/** @type {number[]} */ (c.args));
    else continue; // capa zzfx sin zzfx cargado: se omite
    const o = Math.round(c.offset * sr); // muestra donde empieza la capa
    for (let i = 0, m = Math.min(s.length, n - o); i < m; i++)
      mezcla[o + i] += s[i];
  }
  aplicarPost(mezcla, sr, plan.post ?? undefined);
  let pico = 0;
  for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(mezcla[i]));
  if (pico > 1) for (let i = 0; i < n; i++) mezcla[i] /= pico;
  return mezcla;
}
