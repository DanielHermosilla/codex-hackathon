"""Estima la tonalidad y el registro de pistas de música para afinar los efectos con ellas.

Uso: python3 tools/atados/tonalidad-musica.py pista.ogg [pista.ogg ...]
Calcula el croma (energía por nota, sin octava) con FFT y lo compara con los perfiles de
Krumhansl-Kessler para las 24 tonalidades mayores y menores. Imprime las 3 mejores y las notas
más presentes, y además la nota fundamental más fuerte en el grave (bajo) por tramos de 10 s.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 22050
NOTAS = ["do", "do#", "re", "mib", "mi", "fa", "fa#", "sol", "lab", "la", "sib", "si"]
MAYOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MENOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def leer(ruta):
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(ruta), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def croma(x, fmin=55, fmax=2000, n=8192, salto=4096):
    frec = np.fft.rfftfreq(n, 1 / SR)
    usar = (frec >= fmin) & (frec <= fmax)
    clase = (np.round(12 * np.log2(frec[usar] / 261.63)) % 12).astype(int)
    total = np.zeros(12)
    ventana = np.hanning(n)
    for i in range(0, len(x) - n, salto):
        mag = np.abs(np.fft.rfft(x[i : i + n] * ventana))[usar]
        np.add.at(total, clase, mag)
    return total / total.sum()


def tonalidades(c):
    res = []
    for t in range(12):
        for nombre, perfil in (("mayor", MAYOR), ("menor", MENOR)):
            res.append((np.corrcoef(c, np.roll(perfil, t))[0, 1], f"{NOTAS[t]} {nombre}"))
    return sorted(res, reverse=True)[:3]


for ruta in sys.argv[1:]:
    x = leer(ruta)
    c = croma(x)
    orden = np.argsort(c)[::-1]
    print(f"\n{Path(ruta).parent.name}/{Path(ruta).name}: {len(x) / SR:.0f} s")
    print("  tonalidad:", ", ".join(f"{n} ({r:.2f})" for r, n in tonalidades(c)))
    print("  notas:", " ".join(f"{NOTAS[i]} {c[i] * 100:.0f}%" for i in orden[:7]))
    bajos = []
    for i in range(0, len(x) - SR * 10, SR * 10):
        cb = croma(x[i : i + SR * 10], fmin=40, fmax=200)
        bajos.append(NOTAS[int(np.argmax(cb))])
    print("  bajo cada 10 s:", " ".join(bajos))
