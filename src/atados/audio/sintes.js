// Capas de música PLACEHOLDER generadas con WebAudio mientras no haya stems con licencia (D-061).
// Buscan leerse como mística orquestal / folk antiguo / ambient / electrónica orgánica (D-059):
// drone modal, arpa pulsada con eco, tambor de marco, cuerdas en acordes, tensión disonante y brillo alto.
// Cada sinte: { salida: GainNode, programar(hasta), dispose() }. Las notas se programan con adelanto
// sobre ctx.currentTime (reloj de audio, no de frames).

/** @typedef {import('./reglas.js').ZonaMusica} ZonaMusica */
/** @typedef {import('./reglas.js').CapaMusica} CapaMusica */
/** @typedef {{ salida: GainNode, programar: (ctx: AudioContext, hasta: number) => void, dispose: () => void }} Sinte Capa placeholder: nodo de salida y programación de notas. */
/** @typedef {{ salida: GainNode, dur: number, dispose: () => void }} TemaSinte Tema de una vez: nodo de salida y duración (s). */
/** @typedef {CapaMusica & { patron: number[], acordes: number[][] }} CapaSinte Capa con los campos que usan arpa, tambor y pad. */
/** @typedef {ReturnType<typeof base>} Base */

/** @param {number} raiz @param {number} s */
const semis = (raiz, s) => raiz * Math.pow(2, s / 12);
/** @param {ZonaMusica} Z @param {number} i */
function grado(Z, i) {
  const n = Z.escala.length;
  const oct = Math.floor(i / n);
  return Z.escala[((i % n) + n) % n] + 12 * oct;
}

// Ruido blanco estable compartido por contexto (LCG local, no es azar de gameplay).
/** @type {WeakMap<AudioContext, AudioBuffer>} */
const ruidos = new WeakMap();
/** @param {AudioContext} ctx */
function bufferRuido(ctx) {
  let b = ruidos.get(ctx);
  if (b) return b;
  b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    d[i] = (s / 4294967296) * 2 - 1;
  }
  ruidos.set(ctx, b);
  return b;
}

/** @param {AudioContext} ctx */
function base(ctx) {
  /** @type {Set<AudioNode>} */
  const nodos = new Set();
  const salida = ctx.createGain();
  nodos.add(salida);
  /** @template {AudioNode} T @param {T} n @returns {T} */
  const keep = (n) => {
    nodos.add(n);
    return n;
  };
  // Nota efímera: se desconecta sola al terminar.
  /** @param {AudioScheduledSourceNode} src @param {AudioNode[]} resto */
  const efimera = (src, ...resto) => {
    src.onended = () => {
      for (const n of [src, ...resto]) {
        try {
          n.disconnect();
        } catch {
          /* */
        }
        nodos.delete(n);
      }
    };
    nodos.add(src);
    for (const n of resto) nodos.add(n);
  };
  const dispose = () => {
    for (const n of nodos) {
      try {
        /** @type {OscillatorNode} */ (n).stop?.();
      } catch {
        /* */
      }
      try {
        n.disconnect();
      } catch {
        /* */
      }
    }
    nodos.clear();
  };
  return { salida, keep, efimera, dispose };
}

// Reloj de pasos: llama a `nota(t, k)` para cada paso de largo `paso` s entre el siguiente pendiente y `hasta`.
/**
 * @param {number} t0
 * @param {number} paso
 * @param {(t: number, k: number) => void} nota
 * @returns {(ctx: AudioContext, hasta: number) => void}
 */
function reloj(t0, paso, nota) {
  let k = 0;
  return (ctx, hasta) => {
    const ahora = ctx.currentTime;
    let t = t0 + k * paso;
    if (t < ahora - paso) {
      k = Math.ceil((ahora - t0) / paso);
      t = t0 + k * paso;
    } // se quedó atrás (pestaña oculta)
    while (t < hasta) {
      nota(t, k);
      k++;
      t = t0 + k * paso;
    }
  };
}

/** @type {Record<string, (ctx: AudioContext, Z: ZonaMusica, C: CapaSinte, t0: number) => Sinte>} */
const SINTES = {
  // Drone modal: raíz grave, quinta y octava con un filtro que respira.
  drone(ctx, Z) {
    const B = base(ctx);
    const f = B.keep(ctx.createBiquadFilter());
    f.type = "lowpass";
    f.frequency.value = 650;
    f.Q.value = 0.7;
    f.connect(B.salida);
    for (const [
      k,
      tipo,
      g,
      det,
    ] of /** @type {[number, OscillatorType, number, number][]} */ ([
      [0.25, "sine", 0.35, 0],
      [0.5, "triangle", 0.3, -4],
      [0.75, "sine", 0.18, 3],
      [1, "sine", 0.12, 6],
    ])) {
      const o = B.keep(ctx.createOscillator());
      const gn = B.keep(ctx.createGain());
      o.type = tipo;
      o.frequency.value = Z.raiz * k;
      o.detune.value = det;
      gn.gain.value = g;
      o.connect(gn);
      gn.connect(f);
      o.start();
    }
    const lfo = B.keep(ctx.createOscillator());
    const lg = B.keep(ctx.createGain());
    lfo.frequency.value = 0.06;
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(f.frequency);
    lfo.start();
    return { salida: B.salida, programar() {}, dispose: B.dispose };
  },

  // Arpa / kantele: notas pulsadas del patrón (grados de la escala) con eco suave.
  arpa(ctx, Z, C, t0) {
    const B = base(ctx);
    const beat = 60 / Z.bpm;
    const eco = B.keep(ctx.createDelay(2));
    const fb = B.keep(ctx.createGain());
    const lp = B.keep(ctx.createBiquadFilter());
    eco.delayTime.value = beat * 0.75;
    fb.gain.value = 0.32;
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const bus = B.keep(ctx.createGain());
    bus.connect(B.salida);
    bus.connect(eco);
    eco.connect(lp);
    lp.connect(fb);
    fb.connect(eco);
    lp.connect(B.salida);
    const prog = reloj(t0, beat * (C.cada ?? 1), (t, k) => {
      const f = semis(Z.raiz * 2, grado(Z, C.patron[k % C.patron.length]));
      for (const [
        mult,
        tipo,
        amp,
        dec,
      ] of /** @type {[number, OscillatorType, number, number][]} */ ([
        [1, "triangle", 0.32, 1.4],
        [2, "sine", 0.1, 0.5],
      ])) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = tipo;
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
        o.connect(g);
        g.connect(bus);
        o.start(t);
        o.stop(t + dec + 0.05);
        B.efimera(o, g);
      }
    });
    return { salida: B.salida, programar: prog, dispose: B.dispose };
  },

  // Tambor de marco: golpe grave con caída de tono + roce de parche, patrón por corcheas.
  tambor(ctx, Z, C, t0) {
    const B = base(ctx);
    const corchea = 60 / Z.bpm / 2;
    const nb = bufferRuido(ctx);
    const prog = reloj(t0, corchea, (t, k) => {
      const amp = C.patron[k % C.patron.length];
      if (!(amp > 0)) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(125, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9 * amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.38);
      o.connect(g);
      g.connect(B.salida);
      o.start(t);
      o.stop(t + 0.42);
      B.efimera(o, g);
      const n = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const gn = ctx.createGain();
      n.buffer = nb;
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 0.8;
      gn.gain.setValueAtTime(0.25 * amp, t);
      gn.gain.exponentialRampToValueAtTime(0.0008, t + 0.07);
      n.connect(bp);
      bp.connect(gn);
      gn.connect(B.salida);
      n.start(t, (k * 0.137) % 0.8);
      n.stop(t + 0.09);
      B.efimera(n, bp, gn);
    });
    return { salida: B.salida, programar: prog, dispose: B.dispose };
  },

  // Cuerdas: acordes (semitonos sobre la raíz) con sierras desafinadas y filtradas; cambia por compás.
  pad(ctx, Z, C, t0) {
    const B = base(ctx);
    const f = B.keep(ctx.createBiquadFilter());
    f.type = "lowpass";
    f.frequency.value = 1100;
    f.Q.value = 0.5;
    f.connect(B.salida);
    /** @type {{ o: OscillatorNode, i: number }[]} */
    const voces = [];
    const n = Math.max(...C.acordes.map((a) => a.length));
    for (let i = 0; i < n; i++) {
      for (const det of [-7, 7]) {
        const o = B.keep(ctx.createOscillator());
        const g = B.keep(ctx.createGain());
        o.type = "sawtooth";
        o.detune.value = det;
        o.frequency.value = semis(Z.raiz, C.acordes[0][i] ?? 0);
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(f);
        o.start();
        voces.push({ o, i });
      }
    }
    const prog = reloj(t0, (60 / Z.bpm) * 4, (t, k) => {
      const ac = C.acordes[k % C.acordes.length];
      for (const v of voces)
        v.o.frequency.setTargetAtTime(
          semis(Z.raiz, ac[v.i % ac.length]),
          t,
          0.12,
        );
    });
    return { salida: B.salida, programar: prog, dispose: B.dispose };
  },

  // Tensión (fase 2): segunda menor grave pulsando en semicorcheas.
  tension(ctx, Z) {
    const B = base(ctx);
    const f = B.keep(ctx.createBiquadFilter());
    const pulso = B.keep(ctx.createGain());
    f.type = "lowpass";
    f.frequency.value = 420;
    f.Q.value = 2;
    f.connect(pulso);
    pulso.connect(B.salida);
    pulso.gain.value = 0.5;
    for (const s of [0, 1]) {
      const o = B.keep(ctx.createOscillator());
      const g = B.keep(ctx.createGain());
      o.type = "sawtooth";
      o.frequency.value = semis(Z.raiz / 2, s);
      g.gain.value = 0.22;
      o.connect(g);
      g.connect(f);
      o.start();
    }
    const lfo = B.keep(ctx.createOscillator());
    const lg = B.keep(ctx.createGain());
    lfo.type = "square";
    lfo.frequency.value = (Z.bpm / 60) * 4;
    lg.gain.value = 0.35;
    lfo.connect(lg);
    lg.connect(pulso.gain);
    lfo.start();
    return { salida: B.salida, programar() {}, dispose: B.dispose };
  },

  // Brillo alto: armónicos agudos con trémolo (capa de intensidad).
  brillo(ctx, Z) {
    const B = base(ctx);
    const trem = B.keep(ctx.createGain());
    trem.gain.value = 0.75;
    trem.connect(B.salida);
    for (const [k, det] of [
      [4, 0],
      [6, 5],
      [8, -5],
    ]) {
      const o = B.keep(ctx.createOscillator());
      const g = B.keep(ctx.createGain());
      o.frequency.value = Z.raiz * k;
      o.detune.value = det;
      g.gain.value = 0.1;
      o.connect(g);
      g.connect(trem);
      o.start();
    }
    const lfo = B.keep(ctx.createOscillator());
    const lg = B.keep(ctx.createGain());
    lfo.frequency.value = 5.5;
    lg.gain.value = 0.25;
    lfo.connect(lg);
    lg.connect(trem.gain);
    lfo.start();
    return { salida: B.salida, programar() {}, dispose: B.dispose };
  },
};

// Temas de una sola vez (D-134): fanfarria corta de victoria y tema de derrota. Devuelven {salida, dur, dispose}.
/** @type {Record<string, (ctx: AudioContext, raiz: number, t: number) => TemaSinte>} */
const TEMAS = {
  fanfarria(ctx, raiz, t) {
    const B = base(ctx);
    const notas = [0, 4, 7, 12];
    notas.forEach((s, i) =>
      tono(ctx, B, semis(raiz * 2, s), t + i * 0.16, 0.5, 0.28, "triangle"),
    );
    for (const s of [0, 4, 7, 12, 16])
      tono(ctx, B, semis(raiz * 2, s), t + 0.66, 2.6, 0.12, "sawtooth", 1400);
    tono(ctx, B, raiz / 2, t + 0.66, 2.4, 0.4, "sine");
    return { salida: B.salida, dur: 3.4, dispose: B.dispose };
  },
  lamento(ctx, raiz, t) {
    const B = base(ctx);
    [7, 5, 3, 2, 0].forEach((s, i) =>
      tono(ctx, B, semis(raiz, s), t + i * 0.6, 1.1, 0.24, "triangle", 1200),
    );
    tono(ctx, B, raiz / 4, t, 4.2, 0.35, "sine");
    tono(ctx, B, semis(raiz / 2, 3), t + 1.2, 3, 0.1, "sawtooth", 500);
    return { salida: B.salida, dur: 4.6, dispose: B.dispose };
  },
};

/** @param {AudioContext} ctx @param {Base} B @param {number} f @param {number} t @param {number} dur @param {number} amp @param {OscillatorType} tipo @param {number} [corte] */
function tono(ctx, B, f, t, dur, amp, tipo, corte = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(amp, t + Math.min(0.08, dur * 0.2));
  g.gain.setValueAtTime(amp, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  /** @type {AudioNode} */
  let ult = o;
  /** @type {BiquadFilterNode | null} */
  let lp = null;
  if (corte) {
    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = corte;
    o.connect(lp);
    ult = lp;
  }
  ult.connect(g);
  g.connect(B.salida);
  o.start(t);
  o.stop(t + dur + 0.05);
  B.efimera(o, g, ...(lp ? [lp] : []));
}

/** @param {AudioContext} ctx @param {string} tipo @param {ZonaMusica} zona @param {CapaMusica} capa @param {number} t0 @returns {Sinte | null} */
export function crearSinte(ctx, tipo, zona, capa, t0) {
  const f = SINTES[tipo];
  return f ? f(ctx, zona, /** @type {CapaSinte} */ (capa), t0) : null;
}
/** @param {AudioContext} ctx @param {string} tipo @param {number} raiz @param {number} t @returns {TemaSinte | null} */
export function crearTemaSinte(ctx, tipo, raiz, t) {
  const f = TEMAS[tipo];
  return f ? f(ctx, raiz, t) : null;
}
export const TIPOS_SINTE = Object.keys(SINTES);
export const TIPOS_TEMA = Object.keys(TEMAS);
