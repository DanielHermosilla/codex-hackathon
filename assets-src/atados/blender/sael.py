# Sael (J1): ladrona de gremio, ágil y orgullosa (D-057). Silueta alta y fina, capucha en punta hacia
# atrás y capa corta en dos tramos: se distingue de Odo sin color (D-052).
# Partes con pivote para la animación procedural (D-090): torso > cabeza, brazoI/D, capa1 > capa2; piernaI/D.
# Uso: ver README.md de esta carpeta (Blender en modo consola → public/atados/models/sael.glb).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comun import *

escena_vacia()
ropa = material("ropa", (0.42, 0.36, 0.44))
piel = material("piel", (0.78, 0.6, 0.47))
acento = material("acento", (0.9, 0.85, 0.3))
cuero = material("cuero", (0.25, 0.18, 0.15))
metal = material("metal", (0.6, 0.6, 0.6), rough=0.4, metal=0.8)
capa = material("capa", (0.3, 0.26, 0.34))

CAD = (0, 0, 0.72)        # cadera: pivote del torso
raiz = vacio("sael")

# Piernas: muslo, espinilla y bota en punta.
for s, n in ((1, "piernaI"), (-1, "piernaD")):
    y = 0.1 * s
    m = Malla(n)
    m.segmento(cuero, (0, y, 0.72), (0.03, y, 0.39), 0.075, 0.058)
    m.segmento(cuero, (0.03, y, 0.39), (0, y, 0.08), 0.056, 0.044)
    m.cono(cuero, (0.05, y, 0.05), 0.07, 0.05, 0.1, lados=5, rot=(0, 1.5708, 0), escala=(1, 0.8, 1))
    m.objeto((0, y, 0.72), raiz)

torso = Malla("torso")
torso.caja(ropa, (0, 0, 0.77), (0.2, 0.26, 0.14))
torso.cono(ropa, (0, 0, 0.98), 0.15, 0.2, 0.36, lados=6, escala=(0.72, 1, 1))
torso.cono(acento, (0, 0, 0.86), 0.165, 0.17, 0.07, lados=6, escala=(0.78, 1, 1))  # fajín
torso.cono(acento, (0.0, 0, 1.17), 0.15, 0.1, 0.07, lados=6)                        # pañuelo
torso.segmento(metal, (0.04, -0.17, 0.8), (0.16, -0.19, 0.6), 0.02, 0.004, lados=4)   # daga
torso.caja(cuero, (0.02, -0.16, 0.82), (0.06, 0.03, 0.07))
torso.caja(cuero, (-0.05, 0.15, 0.8), (0.1, 0.05, 0.1), rot=(0, 0, 0.3))              # bolsa de ganzúas
torso_ob = torso.objeto(CAD, raiz)

cab = Malla("cabeza")
cab.esfera(piel, (0.03, 0, 1.31), 0.12, subdiv=1, escala=(1, 0.9, 1.1))
# Capucha: cono de 5 lados con la punta tirada hacia atrás (rasgo de silueta).
cab.cono(capa, (-0.05, 0, 1.36), 0.17, 0.0, 0.34, lados=5, rot=(0, -0.75, 0))
cab.caja(capa, (-0.03, 0, 1.25), (0.2, 0.3, 0.1))
cab.objeto((0, 0, 1.18), torso_ob, CAD)

for s, n in ((1, "brazoI"), (-1, "brazoD")):
    y = 0.2 * s
    m = Malla(n)
    m.segmento(ropa, (0, y, 1.12), (0, y * 1.12, 0.92), 0.052, 0.045)
    m.segmento(cuero, (0, y * 1.12, 0.92), (0.05, y * 1.15, 0.74), 0.045, 0.038)
    m.esfera(piel, (0.06, y * 1.15, 0.7), 0.045, subdiv=0)
    m.objeto((0, y, 1.12), torso_ob, CAD)

# Capa en dos tramos (la animación los retrasa según la velocidad).
c1 = Malla("capa1")
c1.cono(capa, (-0.13, 0, 1.0), 0.25, 0.17, 0.32, lados=4, escala=(0.12, 1, 1))
c1_ob = c1.objeto((-0.11, 0, 1.16), torso_ob, CAD)
c2 = Malla("capa2")
c2.cono(capa, (-0.15, 0, 0.72), 0.29, 0.25, 0.26, lados=4, escala=(0.1, 1, 1))
c2.cono(capa, (-0.15, 0.17, 0.55), 0.06, 0.0, 0.1, lados=3, rot=(3.1416, 0, 0))
c2.cono(capa, (-0.15, -0.12, 0.54), 0.07, 0.0, 0.12, lados=3, rot=(3.1416, 0, 0))
c2.objeto((-0.14, 0, 0.85), c1_ob, (-0.11, 0, 1.16))

exportar(salida())
