// Sonido continuo de la cadena [D-062]: zumbido armónico «divino» que sube de tono, brillo y pulso con la
// tensión (es el hilo sonoro del juego y avisa del daño), y el roce del cadáver arrastrado [D-020, D-070].
// Nodos creados una vez; `actualizar` solo mueve parámetros (nada se crea por frame).
import { tonoCadena } from "./reglas.js";

/**
 * @param {import('./motor.js').Motor} motor
 * @param {import('./reglas.js').Cfg} cfg
 */
export function crearSonidoCadena(motor, cfg) {
  const ctx = motor.ctx;
  const Z = cfg.audio.cadena.zumbido;
  const R = cfg.audio.cadena.arrastre;
  /** @type {AudioNode[]} */
  const nodos = [];
  /** @type {{ o: OscillatorNode, k: number }[]} */
  const osc = [];
  /** @template {AudioNode} T @param {T} n @returns {T} */
  const keep = (n) => {
    nodos.push(n);
    return n;
  };

  // Zumbido: por armónico, dos osciladores desafinados (coro) → suma → pasabajos → trémolo → ganancia.
  const suma = keep(ctx.createGain());
  const filtro = keep(ctx.createBiquadFilter());
  filtro.type = "lowpass";
  filtro.Q.value = 0.6;
  const trem = keep(ctx.createGain());
  const salida = keep(ctx.createGain());
  salida.gain.value = 0;
  suma.connect(filtro);
  filtro.connect(trem);
  trem.connect(salida);
  salida.connect(motor.bus.cadena);
  const t0 = tonoCadena(cfg, 0);
  Z.armonicos.forEach((k, i) => {
    const g = keep(ctx.createGain());
    g.gain.value = (Z.pesos[i] ?? 0.2) / (2 * Z.armonicos.length);
    g.connect(suma);
    for (const s of [-1, 1]) {
      const o = keep(ctx.createOscillator());
      o.type = i === 0 ? "triangle" : "sine";
      o.frequency.value = t0.frecuencia * k;
      o.detune.value = s * Z.desafinadoCents;
      o.connect(g);
      o.start();
      osc.push({ o, k });
    }
  });
  const lfo = keep(ctx.createOscillator());
  const lfoG = keep(ctx.createGain());
  lfo.frequency.value = t0.tremoloHz;
  lfoG.gain.value = t0.tremoloProf / 2;
  trem.gain.value = 1 - t0.tremoloProf / 2;
  lfo.connect(lfoG);
  lfoG.connect(trem.gain);
  lfo.start();

  // Roce del cadáver: ruido en bucle → pasabanda → ganancia (a 0 salvo arrastre).
  const sr = ctx.sampleRate;
  const nb = ctx.createBuffer(1, sr * 2, sr);
  const d = nb.getChannelData(0);
  let s = 22222; // LCG local: ruido estable (no es azar de gameplay)
  for (let i = 0; i < d.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    d[i] = (s / 4294967296) * 2 - 1;
  }
  const ruido = keep(ctx.createBufferSource());
  ruido.buffer = nb;
  ruido.loop = true;
  const bp = keep(ctx.createBiquadFilter());
  bp.type = "bandpass";
  bp.frequency.value = R.filtroHz;
  bp.Q.value = R.q;
  const roce = keep(ctx.createGain());
  roce.gain.value = 0;
  ruido.connect(bp);
  bp.connect(roce);
  roce.connect(motor.bus.efectos);
  ruido.start();

  let ultimo = -1;
  return {
    // tension 0..1 (máximo de los tramos); arrastre 0..1 (velocidad del cadáver arrastrado / velRef).
    /** @param {number} tension @param {number} [arrastre] @param {boolean} [activo] */
    actualizar(tension, arrastre = 0, activo = true) {
      const tau = Z.suavizadoS;
      const p = tonoCadena(cfg, tension);
      if (Math.abs(tension - ultimo) > 1e-3) {
        ultimo = tension;
        for (const { o, k } of osc)
          motor.rampa(o.frequency, p.frecuencia * k, tau);
        motor.rampa(filtro.frequency, p.brillo, tau);
        motor.rampa(lfo.frequency, p.tremoloHz, tau);
        motor.rampa(lfoG.gain, p.tremoloProf / 2, tau);
        motor.rampa(trem.gain, 1 - p.tremoloProf / 2, tau);
      }
      motor.rampa(salida.gain, activo ? p.ganancia : 0, tau * 3);
      motor.rampa(
        roce.gain,
        R.ganancia * Math.max(0, Math.min(1, arrastre)),
        0.06,
      );
      return p;
    },
    dispose() {
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
      nodos.length = 0;
      osc.length = 0;
    },
  };
}
