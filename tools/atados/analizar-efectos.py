"""Mide cada efecto renderizado (WAV de renderizar-efectos.mjs) frente a la música del combate.

Uso: python3 tools/atados/analizar-efectos.py <carpeta-wav> [mezcla ...]
Cada mezcla es una lista de pistas con su ganancia de capa, unidas por «+»:
  ruta/base.ogg:0.4+ruta/pulso.ogg:0.4   (se suman y se multiplican por master · música)
Imprime por efecto: duración audible, pico, nivel máximo en 50 ms (dBFS) ya con las ganancias de bus
del juego, centroide espectral y fracción de energía bajo 120 Hz y bajo 250 Hz.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
# Ganancias de bus del juego (CONFIG.audio.volumen): master 0,8 · efectos 0,9 · música 0,55 · pista 0,8.
GAN_EFECTOS = 0.8 * 0.9
GAN_MUSICA = 0.8 * 0.55  # master · música; la ganancia de cada capa va en la línea de comandos


def leer_wav(ruta):
    with wave.open(str(ruta)) as w:
        datos = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return datos.astype(np.float64) / 32768


def leer_ogg(ruta):
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(ruta), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def rms_ventanas(x, ventana=0.05):
    n = int(SR * ventana)
    if len(x) < n:
        return np.array([np.sqrt(np.mean(x**2))])
    cortes = len(x) // n
    return np.sqrt(np.mean(x[: cortes * n].reshape(cortes, n) ** 2, axis=1))


def db(v):
    return 20 * np.log10(max(v, 1e-9))


def espectro(x):
    ventana = np.hanning(len(x))
    mag = np.abs(np.fft.rfft(x * ventana)) ** 2
    frec = np.fft.rfftfreq(len(x), 1 / SR)
    total = mag.sum() or 1
    return {
        "centroide": float((frec * mag).sum() / total),
        "bajo120": float(mag[frec < 120].sum() / total),
        "bajo250": float(mag[frec < 250].sum() / total),
    }


def medir(x, ganancia):
    y = x * ganancia
    absy = np.abs(y)
    pico = absy.max()
    umbral = pico * 10 ** (-50 / 20)
    sobre = np.nonzero(absy > umbral)[0]
    audible = (sobre[-1] + 1) / SR if len(sobre) else 0
    return {
        "dur": round(audible, 2),
        "pico": round(float(x.max() if x.max() > -x.min() else -x.min()), 2),
        "max50": round(db(rms_ventanas(y).max()), 1),
        **{k: round(v, 3) if k != "centroide" else round(v) for k, v in espectro(y).items()},
    }


def main():
    carpeta = Path(sys.argv[1])
    for mezcla in sys.argv[2:]:
        partes = [p.rsplit(":", 1) for p in mezcla.split("+")]
        pistas = [leer_ogg(r) * float(g) for r, g in partes]
        largo = min(len(p) for p in pistas)
        x = sum(p[:largo] for p in pistas) * GAN_MUSICA
        r = rms_ventanas(x)
        nombre = " + ".join(Path(r_).parent.name + "/" + Path(r_).stem for r_, _ in partes)
        e = espectro(x[: SR * 60])
        print(
            f"MÚSICA {nombre}: 50 ms mediana {db(np.median(r)):.1f} dBFS, p90 {db(np.percentile(r, 90)):.1f}, "
            f"máx {db(r.max()):.1f}; <120 Hz {e['bajo120']:.2f}, <250 Hz {e['bajo250']:.2f}, centroide {e['centroide']:.0f} Hz"
        )
    filas = {}
    for ruta in sorted(carpeta.glob("*.wav")):
        filas[ruta.stem] = medir(leer_wav(ruta), GAN_EFECTOS)
    print(f"{'efecto':18} dur  pico  máx50dB  centroide  <120  <250")
    for k, m in filas.items():
        print(
            f"{k:18} {m['dur']:4.2f} {m['pico']:5.2f} {m['max50']:7.1f} {m['centroide']:9d} {m['bajo120']:5.2f} {m['bajo250']:5.2f}"
        )
    (carpeta / "medidas.json").write_text(json.dumps(filas, indent=1))


if __name__ == "__main__":
    main()
