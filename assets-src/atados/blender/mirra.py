# Mirra la Hambrienta (D-057, D-085, D-154): árbol-langosta ~4× los jugadores, tamaño fijo.
# Tronco-cuerpo nudoso, abdomen segmentado, cabeza de langosta con mandíbulas, brazos-rama que acaban en
# hoces, seis patas de langosta y copa de hojas secas que en la fase 2 se abre en alas (malla "alas").
# Esquirla de la Brasa clavada en el pecho y vetas de ámbar por la corteza (D-084, D-188).
# Esqueleto rígido (cada pieza pesa 1 en un hueso) y clips hechos aquí (D-090):
#   idle, camina, siega, grano, hambre, dolor, destello, muerte.
# Convención de los clips de ataque (los lee src/render/mirra-arte.js): 0–1 s telegrafía, 1–1,33 s golpe,
# después recuperación hasta el final del clip.
# Uso: ver README.md de esta carpeta (Blender en modo consola → public/atados/models/mirra.glb).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comun import *
from mathutils import Quaternion

escena_vacia(fps=30)
corteza = material("corteza", (0.37, 0.29, 0.21))
hojas = material("hojas", (0.62, 0.5, 0.3))
quitina = material("quitina", (0.45, 0.33, 0.22), rough=0.6)
veta = material("veta", (1.0, 0.71, 0.28), emision=(1.0, 0.71, 0.28))
esquirla = material("esquirla", (1.0, 0.85, 0.54), rough=0.3, emision=(1.0, 0.85, 0.54))
ojos = material("ojos", (1.0, 0.71, 0.28), emision=(1.0, 0.71, 0.28))
espiga_m = material("espiga", (1.0, 0.95, 0.8), emision=(1.0, 0.95, 0.8))

# ─── Huesos: nombre → (cabeza, cola, padre) en coordenadas de Blender (+X delante, Z arriba) ───
H = {
    "raiz": ((0, 0, 0), (0, 0, 0.5), None),
    "tronco": ((0, 0, 0.9), (0, 0, 2.6), "raiz"),
    "abdomen": ((-0.6, 0, 1.3), (-1.7, 0, 1.1), "tronco"),
    "cabeza": ((0.55, 0, 2.5), (1.25, 0, 2.6), "tronco"),
    "mandI": ((1.15, 0.24, 2.32), (1.75, 0.12, 2.2), "cabeza"),
    "mandD": ((1.15, -0.24, 2.32), (1.75, -0.12, 2.2), "cabeza"),
    "copa": ((0, 0, 2.7), (0, 0, 3.6), "tronco"),
    "alaI": ((-0.3, 0.45, 3.2), (-2.0, 1.7, 3.4), "copa"),
    "alaD": ((-0.3, -0.45, 3.2), (-2.0, -1.7, 3.4), "copa"),
    "brazoI": ((0.3, 0.7, 2.2), (0.9, 1.35, 1.75), "tronco"),
    "antebrazoI": ((0.9, 1.35, 1.75), (1.95, 1.25, 1.45), "brazoI"),
    "brazoD": ((0.3, -0.7, 2.2), (0.9, -1.35, 1.75), "tronco"),
    "antebrazoD": ((0.9, -1.35, 1.75), (1.95, -1.25, 1.45), "brazoD"),
}
PATAS = []
for i in range(6):
    a = (i / 6) * math.tau + math.pi / 6
    c, s = math.cos(a), math.sin(a)
    H[f"pata{i}"] = ((0.75 * c, 0.75 * s, 1.05), (2.0 * c, 2.0 * s, 0.05), "raiz")
    PATAS.append((i, a, c, s))

m = Malla("mirra")
# Tronco nudoso y corteza en placas.
m.cono(corteza, (0, 0, 1.75), 1.05, 0.72, 2.1, lados=7, grupo="tronco", ruido=0.07, semilla=1)
m.cono(corteza, (0, 0, 0.78), 0.8, 1.05, 0.3, lados=7, grupo="tronco", ruido=0.05, semilla=2)
for k in range(6):
    a = k * 1.05 + 0.3
    m.caja(corteza, (math.cos(a) * 0.92, math.sin(a) * 0.92, 1.3 + (k % 3) * 0.45), (0.12, 0.42, 0.6),
           rot=(0, 0, a), grupo="tronco", ruido=0.03, semilla=10 + k)
# Raíces colgando como tentáculos.
for k in range(5):
    a = k * 1.26 + 0.6
    p0 = (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.75)
    p1 = (math.cos(a) * 1.15, math.sin(a) * 1.15, 0.35)
    p2 = (math.cos(a + 0.2) * 1.3, math.sin(a + 0.2) * 1.3, 0.05)
    m.segmento(corteza, p0, p1, 0.16, 0.1, grupo="tronco")
    m.segmento(corteza, p1, p2, 0.1, 0.03, lados=4, grupo="tronco")
# Vetas de ámbar por la corteza (zigzag sobre la superficie del tronco).
for k, a0 in enumerate((0.2, -0.6, 0.9, 2.6, 3.8)):
    pts = []
    for j in range(5):
        z = 0.9 + j * 0.42
        a = a0 + math.sin(j * 1.7 + k) * 0.25
        r = 1.07 - (z - 0.7) * 0.16 + 0.01
        pts.append((math.cos(a) * r, math.sin(a) * r, z))
    for p, q in zip(pts, pts[1:]):
        m.segmento(veta, p, q, 0.04, 0.03, lados=3, grupo="tronco")
# Esquirla de la Brasa clavada en el pecho (y dos astillas menores).
m.esfera(esquirla, (1.0, 0.05, 1.85), 0.3, subdiv=0, escala=(0.6, 0.6, 1.9), rot=(0.3, 0.9, 0), grupo="tronco")
m.esfera(esquirla, (0.95, 0.35, 1.55), 0.14, subdiv=0, escala=(0.6, 0.6, 1.8), rot=(-0.5, 0.8, 0), grupo="tronco")
m.esfera(esquirla, (0.97, -0.3, 2.1), 0.12, subdiv=0, escala=(0.6, 0.6, 1.8), rot=(0.6, 1.0, 0), grupo="tronco")
m.cono(veta, (0.93, 0.05, 1.85), 0.36, 0.3, 0.06, lados=7, rot=(0, 1.5708, 0), grupo="tronco")
# Abdomen segmentado hacia atrás.
for k, (x, z, r) in enumerate(((-0.95, 1.3, 0.72), (-1.45, 1.2, 0.56), (-1.88, 1.08, 0.36))):
    m.cono(corteza if k != 1 else quitina, (x, 0, z), r, r * 0.82, 0.48, lados=7, rot=(0, -1.5708, 0), grupo="abdomen", ruido=0.03, semilla=20 + k)
m.cono(quitina, (-2.15, 0, 1.0), 0.22, 0.0, 0.35, lados=5, rot=(0, -1.5708, 0), grupo="abdomen")
# Cabeza de langosta: cráneo alargado, escudo, ojos compuestos y antenas.
m.esfera(corteza, (0.98, 0, 2.55), 0.5, subdiv=1, escala=(1.25, 0.95, 0.85), grupo="cabeza", ruido=0.02, semilla=30)
m.cono(quitina, (0.7, 0, 2.85), 0.5, 0.35, 0.25, lados=6, rot=(0, -0.35, 0), escala=(1.2, 1, 1), grupo="cabeza")
for s in (1, -1):
    m.esfera(ojos, (1.28, 0.36 * s, 2.68), 0.17, subdiv=1, escala=(1, 0.8, 1.1), grupo="cabeza")
    m.segmento(quitina, (1.3, 0.16 * s, 2.92), (1.75, 0.5 * s, 3.55), 0.03, 0.012, lados=3, grupo="cabeza")
    m.segmento(quitina, (1.75, 0.5 * s, 3.55), (2.05, 0.75 * s, 3.65), 0.012, 0.006, lados=3, grupo="cabeza")
# Mandíbulas (cada una en su hueso).
for s, g in ((1, "mandI"), (-1, "mandD")):
    m.segmento(quitina, (1.15, 0.24 * s, 2.32), (1.6, 0.2 * s, 2.24), 0.12, 0.08, lados=4, grupo=g)
    m.segmento(quitina, (1.6, 0.2 * s, 2.24), (1.82, 0.04 * s, 2.18), 0.08, 0.015, lados=4, grupo=g)
    m.cono(quitina, (1.55, 0.12 * s, 2.18), 0.035, 0.0, 0.14, lados=3, rot=(math.pi, 0, 0), grupo=g)
# Copa de hojas secas y ramas.
for k, (x, y, z, r) in enumerate(((0, 0, 3.55, 1.25), (-0.85, 0.65, 3.3, 0.9), (0.55, -0.75, 3.35, 0.95),
                                  (-0.55, -0.7, 3.95, 0.8), (0.45, 0.7, 3.9, 0.85), (-0.2, 0.05, 4.35, 0.7))):
    m.esfera(hojas, (x, y, z), r, subdiv=1, escala=(1, 1, 0.68), grupo="copa", ruido=0.1, semilla=40 + k)
    m.segmento(corteza, (0, 0, 2.75), (x * 0.8, y * 0.8, z - 0.3), 0.14, 0.06, lados=4, grupo="copa")
# Brazos-rama con hoz.
for s, b, ab in ((1, "brazoI", "antebrazoI"), (-1, "brazoD", "antebrazoD")):
    m.segmento(corteza, (0.3, 0.7 * s, 2.2), (0.9, 1.35 * s, 1.75), 0.22, 0.15, lados=5, grupo=b, ruido=0.02, semilla=50)
    m.esfera(corteza, (0.9, 1.35 * s, 1.75), 0.17, subdiv=0, grupo=b)
    m.segmento(quitina, (0.9, 1.35 * s, 1.75), (1.6, 1.3 * s, 1.55), 0.14, 0.09, lados=5, grupo=ab)
    # Hoz: tres tramos curvos con púas.
    hp = [(1.6, 1.3 * s, 1.55), (2.05, 1.15 * s, 1.75), (2.35, 0.85 * s, 1.6), (2.45, 0.5 * s, 1.3)]
    for p, q in zip(hp, hp[1:]):
        m.segmento(quitina, p, q, 0.09, 0.05, lados=4, grupo=ab)
    for p in hp[1:3]:
        m.cono(quitina, (p[0] - 0.08, p[1] - 0.05 * s, p[2] - 0.12), 0.04, 0.0, 0.2, lados=3, rot=(math.pi, 0, 0), grupo=ab)
# Patas de langosta: muslo que sube y tibia que baja hasta el suelo.
for i, a, c, s in PATAS:
    hip = (0.75 * c, 0.75 * s, 1.05)
    rod = (1.55 * c, 1.55 * s, 1.75)
    pie = (2.0 * c, 2.0 * s, 0.03)
    m.segmento(quitina, hip, rod, 0.15, 0.1, lados=5, grupo=f"pata{i}")
    m.segmento(quitina, rod, pie, 0.09, 0.03, lados=4, grupo=f"pata{i}")
    m.esfera(quitina, rod, 0.11, subdiv=0, grupo=f"pata{i}")
cuerpo_ob = m.objeto((0, 0, 0))

al = Malla("alas")
for s, g in ((1, "alaI"), (-1, "alaD")):
    ang = math.atan2(1.25 * s, -1.7)
    al.caja(hojas, (-1.15, 1.05 * s, 3.3), (2.4, 0.85, 0.05), rot=(0.12 * s, 0, ang - math.pi), grupo=g, ruido=0.03, semilla=60)
    al.caja(hojas, (-1.05, 1.25 * s, 3.22), (2.0, 0.6, 0.04), rot=(0.05 * s, 0, ang - math.pi + 0.35 * s), grupo=g)
    al.segmento(veta, (-0.3, 0.45 * s, 3.25), (-2.2, 1.85 * s, 3.4), 0.035, 0.015, lados=3, grupo=g)
alas_ob = al.objeto((0, 0, 0))

es = Malla("espiga")
es.segmento(espiga_m, (2.3, -0.7, 1.45), (2.55, -0.55, 2.05), 0.025, 0.02, lados=3, grupo="antebrazoD")
es.esfera(espiga_m, (2.6, -0.52, 2.25), 0.11, subdiv=0, escala=(0.9, 0.9, 2.2), grupo="antebrazoD")
espiga_ob = es.objeto((0, 0, 0))

# ─── Armadura ───
arm_d = bpy.data.armatures.new("mirra_esqueleto")
arm = bpy.data.objects.new("mirra_esqueleto", arm_d)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for n, (h, t, p) in H.items():
    eb = arm_d.edit_bones.new(n)
    eb.head, eb.tail = Vector(h), Vector(t)
for n, (h, t, p) in H.items():
    if p:
        arm_d.edit_bones[n].parent = arm_d.edit_bones[p]
bpy.ops.object.mode_set(mode="OBJECT")
for ob in (cuerpo_ob, alas_ob, espiga_ob):
    ob.parent = arm
    mod = ob.modifiers.new("esqueleto", "ARMATURE")
    mod.object = arm

# ─── Clips ───
# Rotaciones en ejes del MUNDO (X delante, Y izquierda, Z arriba) → cuaternión local del hueso.
REPOSO = {b.name: b.matrix_local.to_3x3() for b in arm_d.bones}


def rot_local(nombre, rx=0.0, ry=0.0, rz=0.0):
    qw = Euler((rx, ry, rz), "XYZ").to_quaternion()
    B = REPOSO[nombre]
    return (B.inverted() @ qw.to_matrix() @ B).to_quaternion()


def loc_local(nombre, x=0.0, y=0.0, z=0.0):
    return REPOSO[nombre].inverted() @ Vector((x, y, z))


def clip(nombre, poses, fin):
    """poses = {frame: {hueso: dict(r=(rx,ry,rz), l=(x,y,z), s=k)}}. Huesos no listados: reposo."""
    ad = arm.animation_data or arm.animation_data_create()
    act = bpy.data.actions.new(nombre)
    act.use_fake_user = True
    ad.action = act
    usados = set()
    for f, pose in poses.items():
        usados.update(pose.keys())
    for f in sorted(poses):
        for n in usados:
            pb = arm.pose.bones[n]
            pb.rotation_mode = "QUATERNION"
            d = poses[f].get(n, {})
            pb.rotation_quaternion = rot_local(n, *d.get("r", (0, 0, 0)))
            pb.location = loc_local(n, *d.get("l", (0, 0, 0)))
            k = d.get("s", 1.0)
            pb.scale = (k, k, k)
            pb.keyframe_insert("rotation_quaternion", frame=f)
            pb.keyframe_insert("location", frame=f)
            pb.keyframe_insert("scale", frame=f)
    ad.action = None
    tr = ad.nla_tracks.new()
    tr.name = nombre
    st = tr.strips.new(nombre, 0, act)
    st.action_frame_end = fin
    for pb in arm.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


PA = ["pata0", "pata2", "pata4"]
PB = ["pata1", "pata3", "pata5"]


def patas(grupo, rz, lift=0.0):
    out = {}
    for n in grupo:
        i = int(n[-1])
        a = (i / 6) * math.tau + math.pi / 6
        # lift: gira sobre la tangente para levantar el pie.
        out[n] = {"r": (-math.sin(a) * lift, math.cos(a) * lift * -1, rz)}
    return out


clip("idle", {
    0: {"tronco": {"r": (0.03, 0, 0), "l": (0, 0, 0)}, "copa": {"r": (0, 0, 0.05)}, "mandI": {"r": (0, 0, 0.05)}, "mandD": {"r": (0, 0, -0.05)},
        "abdomen": {"s": 1.0}, "brazoI": {"r": (0, 0, 0.05)}, "brazoD": {"r": (0, 0, -0.05)}},
    30: {"tronco": {"r": (-0.03, 0.02, 0), "l": (0, 0, 0.06)}, "copa": {"r": (0, 0, -0.05)}, "mandI": {"r": (0, 0, 0.18)}, "mandD": {"r": (0, 0, -0.18)},
         "abdomen": {"s": 1.06}, "brazoI": {"r": (0.08, 0, 0.1)}, "brazoD": {"r": (-0.08, 0, -0.1)}},
    60: {"tronco": {"r": (0.03, 0, 0), "l": (0, 0, 0)}, "copa": {"r": (0, 0, 0.05)}, "mandI": {"r": (0, 0, 0.05)}, "mandD": {"r": (0, 0, -0.05)},
         "abdomen": {"s": 1.0}, "brazoI": {"r": (0, 0, 0.05)}, "brazoD": {"r": (0, 0, -0.05)}},
}, 60)

clip("camina", {
    0: {**patas(PA, 0.28), **patas(PB, -0.28), "tronco": {"l": (0, 0, 0), "r": (0.04, 0.05, 0)}},
    8: {**patas(PA, 0.0, 0.0), **patas(PB, 0.0, 0.35), "tronco": {"l": (0, 0, 0.1), "r": (0, 0.05, 0)}},
    15: {**patas(PA, -0.28), **patas(PB, 0.28), "tronco": {"l": (0, 0, 0), "r": (-0.04, 0.05, 0)}},
    23: {**patas(PA, 0.0, 0.35), **patas(PB, 0.0, 0.0), "tronco": {"l": (0, 0, 0.1), "r": (0, 0.05, 0)}},
    30: {**patas(PA, 0.28), **patas(PB, -0.28), "tronco": {"l": (0, 0, 0), "r": (0.04, 0.05, 0)}},
}, 30)

# Siega: echa atrás los brazos-rama (telegrafía), barre hacia delante (golpe), recupera.
atras = {"tronco": {"r": (0, -0.18, 0)}, "brazoI": {"r": (0.5, 0, 1.0)}, "brazoD": {"r": (-0.5, 0, -1.0)},
         "antebrazoI": {"r": (0.3, 0, 0.6)}, "antebrazoD": {"r": (-0.3, 0, -0.6)}, "cabeza": {"r": (0, -0.15, 0)},
         "mandI": {"r": (0, 0, 0.35)}, "mandD": {"r": (0, 0, -0.35)}}
barre = {"tronco": {"r": (0, 0.28, 0), "l": (0.15, 0, -0.1)}, "brazoI": {"r": (-0.2, 0.3, -1.0)}, "brazoD": {"r": (0.2, 0.3, 1.0)},
         "antebrazoI": {"r": (0, 0, -0.5)}, "antebrazoD": {"r": (0, 0, 0.5)}, "cabeza": {"r": (0, 0.2, 0)}}
clip("siega", {0: {}, 24: atras, 30: atras, 40: barre, 46: barre, 60: {}}, 60)

# Grano: hincha el abdomen y lo levanta; escupe con la cabeza alta.
hincha = {"abdomen": {"r": (0, -0.35, 0), "s": 1.45}, "tronco": {"r": (0, -0.12, 0)}, "cabeza": {"r": (0, -0.1, 0)},
          "mandI": {"r": (0, 0, 0.15)}, "mandD": {"r": (0, 0, -0.15)}}
escupe = {"abdomen": {"r": (0, -0.1, 0), "s": 1.05}, "tronco": {"r": (0, 0.1, 0)}, "cabeza": {"r": (0, -0.45, 0)},
          "mandI": {"r": (0, 0, 0.7)}, "mandD": {"r": (0, 0, -0.7)}, "copa": {"r": (0.1, 0, 0)}}
clip("grano", {0: {}, 26: hincha, 30: {**hincha, "abdomen": {"r": (0, -0.38, 0), "s": 1.5}}, 36: escupe, 44: escupe, 60: {}}, 60)

# Hambre: se agacha con las mandíbulas abiertas y raspa (telegrafía); embiste y muerde; recupera.
agacha = {"tronco": {"r": (0, 0.38, 0), "l": (0, 0, -0.35)}, "cabeza": {"r": (0, 0.15, 0)},
          "mandI": {"r": (0, 0, 0.75)}, "mandD": {"r": (0, 0, -0.75)}, "brazoI": {"r": (0.2, 0, 0.7)}, "brazoD": {"r": (-0.2, 0, -0.7)},
          **patas(PA, 0.1), **patas(PB, -0.1)}
muerde = {"tronco": {"r": (0, 0.55, 0), "l": (0.3, 0, -0.25)}, "cabeza": {"r": (0, 0.1, 0)},
          "mandI": {"r": (0, 0, -0.12)}, "mandD": {"r": (0, 0, 0.12)}, "brazoI": {"r": (0, 0, 0.9)}, "brazoD": {"r": (0, 0, -0.9)}}
clip("hambre", {0: {}, 15: {**agacha, "mandI": {"r": (0, 0, 0.6)}, "mandD": {"r": (0, 0, -0.6)}}, 30: agacha, 40: muerde, 48: muerde, 60: {}}, 60)

# Dolor / tambaleo: sacudidas y echa el tronco atrás.
clip("dolor", {
    0: {"tronco": {"r": (0.12, -0.18, 0)}, "copa": {"r": (-0.12, 0, 0)}, "mandI": {"r": (0, 0, 0.5)}, "mandD": {"r": (0, 0, -0.5)}, "cabeza": {"r": (0.2, -0.3, 0)}},
    8: {"tronco": {"r": (-0.12, -0.14, 0)}, "copa": {"r": (0.14, 0, 0)}, "mandI": {"r": (0, 0, 0.3)}, "mandD": {"r": (0, 0, -0.3)}, "cabeza": {"r": (-0.2, -0.2, 0)}},
    15: {"tronco": {"r": (0.1, -0.2, 0)}, "copa": {"r": (-0.1, 0, 0)}, "mandI": {"r": (0, 0, 0.55)}, "mandD": {"r": (0, 0, -0.55)}, "cabeza": {"r": (0.15, -0.3, 0)}},
    22: {"tronco": {"r": (-0.1, -0.15, 0)}, "copa": {"r": (0.12, 0, 0)}, "mandI": {"r": (0, 0, 0.3)}, "mandD": {"r": (0, 0, -0.3)}, "cabeza": {"r": (-0.2, -0.2, 0)}},
    30: {"tronco": {"r": (0.12, -0.18, 0)}, "copa": {"r": (-0.12, 0, 0)}, "mandI": {"r": (0, 0, 0.5)}, "mandD": {"r": (0, 0, -0.5)}, "cabeza": {"r": (0.2, -0.3, 0)}},
}, 30)

# Destello: se arrodilla y ofrece la espiga con la mano abierta, quieta (D-156).
ofrece = {"tronco": {"l": (0, 0, -0.5), "r": (0, 0.15, 0)}, "cabeza": {"r": (0, 0.35, 0)}, "copa": {"r": (0, 0.12, 0)},
          "brazoD": {"r": (-0.1, 0.2, 0.75)}, "antebrazoD": {"r": (0, 0.3, 0.35)}, "brazoI": {"r": (0, 0.2, 0.2)},
          "mandI": {"r": (0, 0, 0.0)}, "mandD": {"r": (0, 0, 0.0)}, **patas(PA, 0.0, -0.25), **patas(PB, 0.0, -0.25)}
clip("destello", {0: {}, 14: ofrece, 45: ofrece}, 45)

# Muerte: se desploma de lado y encoge las patas.
cae = {"raiz": {"r": (1.35, 0, 0), "l": (0, 0, 0.45)}, "tronco": {"r": (0.2, 0.2, 0)}, "cabeza": {"r": (0.3, 0.3, 0)},
       "mandI": {"r": (0, 0, 0.6)}, "mandD": {"r": (0, 0, -0.6)}, "copa": {"r": (0.3, 0, 0)},
       "brazoI": {"r": (-0.6, 0, 0.3)}, "brazoD": {"r": (0.6, 0, -0.3)}, **patas(PA, 0.3, 0.6), **patas(PB, -0.3, 0.6)}
clip("muerte", {0: {}, 10: {"tronco": {"r": (-0.2, -0.3, 0)}, "cabeza": {"r": (0, -0.5, 0)}, "mandI": {"r": (0, 0, 0.8)}, "mandD": {"r": (0, 0, -0.8)}},
                30: cae, 36: {**cae, "raiz": {"r": (1.5, 0, 0), "l": (0, 0, 0.4)}}, 60: {**cae, "raiz": {"r": (1.48, 0, 0), "l": (0, 0, 0.4)}}}, 60)

exportar(salida(), animaciones=True)
