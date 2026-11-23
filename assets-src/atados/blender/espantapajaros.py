# Espantapájaros-pilar del trigal de Mirra (D-048, D-088, D-184). El poste (radio de colisión 0,75 m en
# CONFIG.jefes.mirra.arena.pilares) es un haz de paja atado alrededor de un palo, para que la cadena se
# vea enredándose en algo grueso. Altura ~3,9 m. Estático: un solo nodo "espantapajaros".
# Uso: ver README.md de esta carpeta (Blender en modo consola → public/atados/models/espantapajaros.glb).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comun import *

escena_vacia()
madera = material("madera", (0.45, 0.32, 0.2))
paja = material("paja", (0.85, 0.72, 0.4))
tela = material("tela", (0.45, 0.4, 0.38))
cuerda = material("cuerda", (0.3, 0.22, 0.15))

m = Malla("espantapajaros")
R = 0.75
# Haz de paja (el «pilar»): prisma irregular con ataduras.
m.cono(paja, (0, 0, 0.8), R * 1.02, R * 0.86, 1.6, lados=8, ruido=0.04, semilla=1)
m.cono(paja, (0, 0, 0.06), R * 1.12, R * 1.02, 0.14, lados=8, ruido=0.03, semilla=2)
for z in (0.45, 1.25):
    m.cono(cuerda, (0, 0, z), R * 1.0 + 0.02, R * 0.98 + 0.02, 0.08, lados=8)
# Palo y travesaño.
m.segmento(madera, (0, 0, 1.5), (0.02, 0, 3.2), 0.1, 0.08, lados=5)
m.caja(madera, (0, 0, 2.55), (0.16, 2.5, 0.16), rot=(0.06, 0, 0))
# Túnica rota colgando del travesaño (cono abierto hacia abajo) con jirones.
m.cono(tela, (0, 0, 2.15), 0.55, 0.3, 0.75, lados=6, ruido=0.03, semilla=3, escala=(0.7, 1, 1))
for i in range(5):
    a = i / 5 * math.tau
    m.cono(tela, (math.cos(a) * 0.32, math.sin(a) * 0.46, 1.68), 0.09, 0.0, 0.26, lados=3, rot=(math.pi, 0, a))
# Manos de paja en las puntas.
for s in (1, -1):
    m.cono(paja, (0, s * 1.35, 2.42), 0.12, 0.0, 0.42, lados=4, rot=(s * -1.9, 0, 0))
    m.cono(tela, (0, s * 1.05, 2.55), 0.13, 0.12, 0.34, lados=5, rot=(1.5708, 0, 0))
# Cabeza de saco y sombrero de paja caído.
m.esfera(tela, (0.02, 0, 3.3), 0.36, subdiv=1, escala=(0.9, 1, 1.05), ruido=0.02, semilla=4)
m.cono(cuerda, (0.02, 0, 3.0), 0.16, 0.2, 0.1, lados=6)
m.cono(paja, (0.0, 0, 3.6), 0.62, 0.6, 0.05, lados=9, rot=(0.12, -0.1, 0), ruido=0.02, semilla=5)
m.cono(paja, (-0.02, 0, 3.78), 0.3, 0.12, 0.34, lados=7, rot=(0.12, -0.1, 0))
m.objeto((0, 0, 0))

exportar(salida())
