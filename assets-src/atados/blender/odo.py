# Odo (J2): saqueador de tumbas del puerto, corpulento y supersticioso (D-057). Silueta ancha y baja,
# sombrero de ala ancha redondo y pala cruzada a la espalda: se distingue de Sael sin color (D-052).
# Partes con pivote para la animación procedural (D-090): torso > cabeza, brazoI/D, capa1; piernaI/D.
# Uso: ver README.md de esta carpeta (Blender en modo consola → public/atados/models/odo.glb).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comun import *

escena_vacia()
ropa = material("ropa", (0.43, 0.35, 0.27))
piel = material("piel", (0.78, 0.6, 0.47))
acento = material("acento", (0.3, 0.68, 1.0))
cuero = material("cuero", (0.25, 0.18, 0.15))
metal = material("metal", (0.6, 0.6, 0.6), rough=0.45, metal=0.8)
madera = material("madera", (0.45, 0.32, 0.2))
capa = material("capa", (0.33, 0.3, 0.24))

CAD = (0, 0, 0.56)
raiz = vacio("odo")

for s, n in ((1, "piernaI"), (-1, "piernaD")):
    y = 0.16 * s
    m = Malla(n)
    m.segmento(ropa, (0, y, 0.58), (0.03, y * 1.05, 0.3), 0.105, 0.088)
    m.segmento(cuero, (0.03, y * 1.05, 0.3), (0, y * 1.05, 0.08), 0.085, 0.075)
    m.caja(cuero, (0.04, y * 1.05, 0.06), (0.27, 0.16, 0.12))
    m.objeto((0, y, 0.58), raiz)

torso = Malla("torso")
torso.cono(ropa, (0, 0, 0.82), 0.3, 0.33, 0.52, lados=7, escala=(0.85, 1, 1))
torso.esfera(ropa, (0.04, 0, 0.72), 0.29, subdiv=1, escala=(1, 1.05, 0.8))          # barriga
torso.cono(acento, (0, 0, 0.64), 0.31, 0.31, 0.09, lados=7, escala=(0.95, 1.07, 1))  # faja
torso.caja(metal, (0.27, 0, 0.64), (0.05, 0.12, 0.1))                                # hebilla
torso.esfera(capa, (0, 0, 1.07), 0.35, subdiv=1, escala=(0.85, 1.25, 0.45))           # hombros
# Pala cruzada a la espalda, la hoja asoma sobre el hombro izquierdo.
torso.segmento(madera, (-0.3, -0.22, 0.45), (-0.26, 0.2, 1.42), 0.03, 0.028)
torso.cono(metal, (-0.26, 0.24, 1.5), 0.12, 0.09, 0.24, lados=4, rot=(-0.4, 0, 0.7854), escala=(0.22, 1, 1))
torso.caja(cuero, (-0.04, -0.34, 0.6), (0.18, 0.1, 0.2), rot=(0, 0, 0.15))           # zurrón
torso.cono(metal, (0.08, 0.33, 0.58), 0.05, 0.05, 0.11, lados=5)                     # farol
torso.cono(acento, (0.08, 0.33, 0.66), 0.04, 0.0, 0.05, lados=5)
torso_ob = torso.objeto(CAD, raiz)

cab = Malla("cabeza")
cab.esfera(piel, (0.05, 0, 1.22), 0.15, subdiv=1, escala=(1, 0.95, 0.95))
cab.cono(cuero, (0.12, 0, 1.13), 0.12, 0.06, 0.12, lados=5, escala=(0.8, 1.1, 1))     # barba
cab.cono(cuero, (0.02, 0, 1.33), 0.4, 0.38, 0.04, lados=8)                           # ala del sombrero
cab.cono(cuero, (0.02, 0, 1.42), 0.18, 0.15, 0.16, lados=7)                          # copa
cab.cono(acento, (0.02, 0, 1.37), 0.185, 0.18, 0.04, lados=7)                        # cinta
cab.objeto((0, 0, 1.1), torso_ob, CAD)

for s, n in ((1, "brazoI"), (-1, "brazoD")):
    y = 0.36 * s
    m = Malla(n)
    m.segmento(ropa, (0, y, 1.02), (0.02, y * 1.12, 0.76), 0.095, 0.085)
    m.segmento(cuero, (0.02, y * 1.12, 0.76), (0.09, y * 1.12, 0.53), 0.085, 0.075)
    m.esfera(piel, (0.1, y * 1.12, 0.48), 0.085, subdiv=0)
    m.objeto((0, y, 1.02), torso_ob, CAD)

# Manto corto de hombros, desflecado.
c1 = Malla("capa1")
c1.cono(capa, (-0.2, 0, 0.88), 0.38, 0.3, 0.3, lados=4, escala=(0.12, 1, 1))
for i, y in enumerate((-0.22, -0.07, 0.08, 0.23)):
    c1.cono(capa, (-0.21, y, 0.68), 0.06, 0.0, 0.12, lados=3, rot=(3.1416, 0, 0))
c1.objeto((-0.18, 0, 1.06), torso_ob, CAD)

exportar(salida())
