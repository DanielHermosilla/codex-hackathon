// Mock mínimo de AudioContext para Vitest (node): registra conexiones y valores destino de los parámetros.
// Las automatizaciones se aplican al instante (value = destino) para poder leer el resultado.

class Param {
  constructor(v = 0) {
    this.value = v;
    this.eventos = [];
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.eventos.push(["set", v, t]);
    return this;
  }
  setTargetAtTime(v, t, tau) {
    this.value = v;
    this.eventos.push(["target", v, t, tau]);
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.eventos.push(["lineal", v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    this.value = v;
    this.eventos.push(["exp", v, t]);
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class Nodo {
  constructor(ctx, tipo) {
    this.ctx = ctx;
    this.tipo = tipo;
    this.salidas = new Set();
    ctx.vivos.add(this);
  }
  connect(n) {
    this.salidas.add(n);
    return n;
  }
  disconnect() {
    this.salidas.clear();
    this.ctx.vivos.delete(this);
  }
}
class Fuente extends Nodo {
  constructor(ctx, tipo) {
    super(ctx, tipo);
    this.empezo = null;
    this.paro = null;
    this.onended = null;
  }
  start(t = 0, offset = 0) {
    this.empezo = t;
    this.offset = offset; // segundos desde el inicio de la pista
    this.ctx.fuentes.add(this);
  }
  stop(t = 0) {
    this.paro = t;
  }
  terminar() {
    this.ctx.fuentes.delete(this);
    this.onended?.();
  }
}

export class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.state = "running";
    this.vivos = new Set();
    this.fuentes = new Set();
    this.destination = new Nodo(this, "destino");
    this.cerrado = false;
  }
  createGain() {
    const n = new Nodo(this, "gain");
    n.gain = new Param(1);
    return n;
  }
  createBiquadFilter() {
    const n = new Nodo(this, "filtro");
    n.frequency = new Param(350);
    n.Q = new Param(1);
    n.type = "lowpass";
    return n;
  }
  createDelay() {
    const n = new Nodo(this, "delay");
    n.delayTime = new Param(0);
    return n;
  }
  createStereoPanner() {
    const n = new Nodo(this, "pan");
    n.pan = new Param(0);
    return n;
  }
  createOscillator() {
    const n = new Fuente(this, "osc");
    n.frequency = new Param(440);
    n.detune = new Param(0);
    n.type = "sine";
    return n;
  }
  createBufferSource() {
    const n = new Fuente(this, "buffer");
    n.playbackRate = new Param(1);
    n.buffer = null;
    n.loop = false;
    return n;
  }
  createBuffer(ch, n, sr) {
    const datos = Array.from({ length: ch }, () => new Float32Array(n));
    return {
      numberOfChannels: ch,
      length: n,
      sampleRate: sr,
      duration: n / sr,
      getChannelData: (i) => datos[i],
    };
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.cerrado = true;
    this.state = "closed";
    return Promise.resolve();
  }
  avanzar(s) {
    this.currentTime += s;
    // Fuentes de buffer sin bucle terminan cuando se acaba su buffer o su stop.
    for (const f of [...this.fuentes]) {
      if (f.tipo !== "buffer" || f.loop) {
        if (f.paro != null && this.currentTime >= f.paro) f.terminar();
        continue;
      }
      const fin =
        f.paro ??
        f.empezo + (f.buffer?.duration ?? 0) / (f.playbackRate.value || 1);
      if (this.currentTime >= fin) f.terminar();
    }
  }
}

// Síntesis falsa: un buffer del largo correcto (sin zzfx, que crea su propio AudioContext al importarse).
export const sintesisFalsa = () => (args) => {
  const [, , , ataque, sostener, soltar, , , , , , , , , , , eco, , caida] =
    args;
  const n = Math.max(
    1,
    Math.ceil((ataque + sostener + soltar + eco + caida) * 8000),
  );
  return new Float32Array(n).fill(0.1);
};

// Destino de eventos para el desbloqueo.
export function objetivoFalso() {
  const ls = new Map();
  return {
    addEventListener(t, f) {
      if (!ls.has(t)) ls.set(t, new Set());
      ls.get(t).add(f);
    },
    removeEventListener(t, f) {
      ls.get(t)?.delete(f);
    },
    disparar(t) {
      for (const f of ls.get(t) ?? []) f({ type: t });
    },
    cuantos() {
      let n = 0;
      for (const s of ls.values()) n += s.size;
      return n;
    },
  };
}
