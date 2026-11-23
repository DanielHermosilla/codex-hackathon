# Mirra la Hambrienta (D-057, D-085, D-154): árbol-langosta ~4× los jugadores, tamaño fijo.
# Tronco-cuerpo nudoso, abdomen segmentado, cabeza de langosta con mandíbulas, brazos-rama que acaban en
# hoces, seis patas de langosta y copa de hojas secas que en la fase 2 se abre en alas (malla "alas").
# Esquirla de la Brasa clavada en el pecho y vetas de ámbar por la corteza (D-084, D-188).
# Esqueleto rígido (cada pieza pesa 1 en un hueso) y clips hechos aquí (D-090):
#   idle, camina, siega, grano, hambre, dolor, destello, muerte.
# Convención de los clips de ataque (los lee src/render/mirra-arte.js): 0–1 s telegrafía, 1–1,33 s golpe,
# después recuperación hasta el final del clip.
# Uso: ver README.md de esta carpeta (Blender en modo consola → public/atados/models/mirra.glb).
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comun import *
from mathutils import Quaternion

escena_vacia(fps=30)
corteza = material("corteza", (0.37, 0.29, 0.21))
hojas = material("hojas", (0.62, 0.5, 0.3))
hoja_seca = material("hojaSeca", (0.36, 0.22, 0.14))  # núcleo oscuro de la copa (contrasta con el trigo)
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
rnd = random.Random(7)  # azar fijo: el modelo sale igual cada vez que se regenera

# ─── Tronco nudoso: dos tramos retorcidos, placas de corteza y raíces ───
m.cono(corteza, (0, 0, 1.25), 1.08, 0.9, 1.0, lados=9, rot=(0, 0, 0.0), grupo="tronco", ruido=0.08, semilla=1)
m.cono(corteza, (0, 0, 2.15), 0.92, 0.66, 0.95, lados=9, rot=(0, 0, 0.35), grupo="tronco", ruido=0.08, semilla=3)
m.cono(corteza, (0, 0, 0.7), 0.82, 1.1, 0.25, lados=9, grupo="tronco", ruido=0.05, semilla=2)
for k in range(9):
    # Placas de corteza en espiral: dan relieve al tronco visto de lado.
    a = k * 0.85 + 0.3
    z = 0.95 + (k % 4) * 0.42
    r = 1.02 - (z - 0.9) * 0.18
    m.caja(corteza, (math.cos(a) * r, math.sin(a) * r, z), (0.12, 0.38, 0.55),
           rot=(0.15, 0, a), grupo="tronco", ruido=0.04, semilla=10 + k)
for k in range(7):
    # Raíces que se clavan en el suelo como garras (tres tramos cada una).
    a = k * 0.9 + 0.4
    p0 = (math.cos(a) * 0.8, math.sin(a) * 0.8, 0.8)
    p1 = (math.cos(a) * 1.3, math.sin(a) * 1.3, 0.42)
    p2 = (math.cos(a + 0.15) * 1.6, math.sin(a + 0.15) * 1.6, 0.12)
    p3 = (math.cos(a + 0.25) * 1.75, math.sin(a + 0.25) * 1.75, -0.05)
    m.segmento(corteza, p0, p1, 0.2, 0.13, lados=5, grupo="tronco")
    m.segmento(corteza, p1, p2, 0.13, 0.07, lados=5, grupo="tronco")
    m.segmento(corteza, p2, p3, 0.07, 0.01, lados=4, grupo="tronco")
# Vetas de ámbar: grietas que suben desde la herida del pecho y se abren por la corteza.
for k, a0 in enumerate((0.15, -0.5, 0.75, 1.9, 2.7, 3.6, 4.6)):
    pts = []
    for j in range(6):
        z = 0.85 + j * 0.4
        a = a0 + math.sin(j * 1.7 + k) * 0.3
        r = 1.1 - (z - 0.7) * 0.18 + 0.02
        pts.append((math.cos(a) * r, math.sin(a) * r, z))
    for p, q in zip(pts, pts[1:]):
        m.segmento(veta, p, q, 0.05, 0.035, lados=3, grupo="tronco")
# Herida del pecho: la corteza se abre en un anillo de astillas alrededor de la esquirla de la Brasa.
for k in range(8):
    a = k / 8 * math.tau
    c = Vector((0.98, 0.0, 1.9))
    d = Vector((0, math.cos(a), math.sin(a) * 1.3))
    m.segmento(corteza, c + d * 0.32, c + d * 0.58 + Vector((0.22, 0, 0)), 0.09, 0.02, lados=4, grupo="tronco")
m.cono(veta, (0.92, 0.0, 1.9), 0.42, 0.36, 0.08, lados=8, rot=(0, 1.5708, 0), escala=(1, 1.0, 1.3), grupo="tronco")
m.esfera(esquirla, (1.12, 0.0, 1.95), 0.36, subdiv=0, escala=(0.6, 0.6, 2.1), rot=(0.2, 0.55, 0), grupo="tronco")
m.esfera(esquirla, (1.05, 0.3, 1.6), 0.16, subdiv=0, escala=(0.6, 0.6, 1.8), rot=(-0.5, 0.7, 0), grupo="tronco")
m.esfera(esquirla, (1.05, -0.28, 2.25), 0.14, subdiv=0, escala=(0.6, 0.6, 1.8), rot=(0.6, 0.8, 0), grupo="tronco")

# ─── Abdomen de langosta: segmentos anillados con púas dorsales ───
for k, (x, z, r) in enumerate(((-0.95, 1.32, 0.74), (-1.42, 1.22, 0.62), (-1.85, 1.1, 0.46), (-2.2, 0.98, 0.3))):
    m.cono(corteza, (x, 0, z), r, r * 0.86, 0.42, lados=9, rot=(0, -1.5708, 0), grupo="abdomen", ruido=0.03, semilla=20 + k)
    m.cono(quitina, (x + 0.22, 0, z), r * 1.04, r * 1.04, 0.08, lados=9, rot=(0, -1.5708, 0), grupo="abdomen")  # anillo
    m.cono(veta, (x, 0, z + r * 0.95), 0.06, 0.0, 0.3, lados=4, rot=(0, -0.3, 0), grupo="abdomen")  # púa encendida
m.cono(quitina, (-2.48, 0, 0.92), 0.2, 0.0, 0.4, lados=5, rot=(0, -1.5708, 0), grupo="abdomen")

# ─── Cabeza de langosta: cráneo con escudo en placas, ojos compuestos grandes y antenas curvas ───
m.esfera(corteza, (0.98, 0, 2.55), 0.52, subdiv=1, escala=(1.3, 0.95, 0.85), grupo="cabeza", ruido=0.02, semilla=30)
for k in range(3):
    m.cono(quitina, (0.55 + k * 0.22, 0, 2.86 - k * 0.04), 0.5 - k * 0.07, 0.42 - k * 0.07, 0.12, lados=7,
           rot=(0, -0.35, 0), escala=(1.1, 1, 1), grupo="cabeza")
m.cono(quitina, (0.45, 0, 3.0), 0.06, 0.0, 0.45, lados=4, rot=(0, -0.6, 0), grupo="cabeza")  # cuerno del escudo
for s in (1, -1):
    m.esfera(ojos, (1.25, 0.4 * s, 2.7), 0.22, subdiv=1, escala=(1, 0.8, 1.15), grupo="cabeza")
    a0 = (1.3, 0.18 * s, 2.95)
    a1 = (1.7, 0.45 * s, 3.55)
    a2 = (2.2, 0.85 * s, 3.85)
    a3 = (2.7, 1.25 * s, 3.7)
    m.segmento(quitina, a0, a1, 0.04, 0.03, lados=4, grupo="cabeza")
    m.segmento(quitina, a1, a2, 0.03, 0.018, lados=4, grupo="cabeza")
    m.segmento(quitina, a2, a3, 0.018, 0.006, lados=3, grupo="cabeza")
# Mandíbulas aserradas (cada una en su hueso).
for s, g in ((1, "mandI"), (-1, "mandD")):
    m.segmento(quitina, (1.15, 0.26 * s, 2.32), (1.62, 0.22 * s, 2.24), 0.14, 0.09, lados=5, grupo=g)
    m.segmento(quitina, (1.62, 0.22 * s, 2.24), (1.88, 0.03 * s, 2.16), 0.09, 0.015, lados=5, grupo=g)
    for t in (0.35, 0.6, 0.85):
        x = 1.15 + t * 0.6
        m.cono(quitina, (x, 0.16 * s, 2.14), 0.04, 0.0, 0.16, lados=3, rot=(math.pi, 0, 0), grupo=g)

# ─── Copa: núcleo oscuro de hoja seca, borde de hojas en punta y ramas muertas con brasas ───
nucleos = ((0, 0, 3.5, 1.15), (-0.85, 0.6, 3.3, 0.85), (0.5, -0.75, 3.35, 0.85),
           (-0.6, -0.7, 3.85, 0.75), (0.45, 0.7, 3.85, 0.8), (-0.15, 0.05, 4.2, 0.65))
for k, (x, y, z, r) in enumerate(nucleos):
    m.esfera(hoja_seca, (x, y, z), r, subdiv=1, escala=(1, 1, 0.6), grupo="copa", ruido=0.12, semilla=40 + k)
    m.segmento(corteza, (0, 0, 2.75), (x * 0.8, y * 0.8, z - 0.3), 0.16, 0.07, lados=5, grupo="copa")
# Hojas en punta repartidas por la superficie de la copa: rompen la silueta en dientes vista desde arriba.
for k in range(80):
    x, y, z, r = nucleos[k % len(nucleos)]
    a = rnd.uniform(0, math.tau)
    e = rnd.uniform(-0.25, 0.9)  # elevación: más hojas arriba y en el borde
    d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e) * 0.6))
    base = Vector((x, y, z)) + d * r * 0.85
    largo = rnd.uniform(0.35, 0.65)  # m de cada hoja: más corta = copa menos erizada
    mat = hojas if rnd.random() < 0.62 else hoja_seca  # dos tonos: borde claro sobre núcleo oscuro
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    giro = Euler((0, 0, rnd.uniform(0, math.tau))).to_matrix()
    rot = (q.to_matrix() @ giro).to_euler()
    m.cono(mat, tuple(base + d * largo * 0.5), 0.2, 0.0, largo, lados=4, rot=tuple(rot),
           escala=(1, 0.28, 1), grupo="copa")
# Grietas de ámbar sobre la copa: la corrupción se ve desde la cámara cenital.
for k in range(5):
    a = k / 5 * math.tau + 0.9
    pts = [Vector((0, 0, 4.42))]
    for j in range(1, 4):
        r = j * 0.42
        aj = a + math.sin(j * 2.1 + k) * 0.35
        pts.append(Vector((math.cos(aj) * r, math.sin(aj) * r, 4.42 - j * j * 0.13)))
    for p, q in zip(pts, pts[1:]):
        m.segmento(veta, p, q, 0.05, 0.035, lados=3, grupo="copa")
# Ramas muertas que asoman por encima de la copa, con brasas de corrupción en las puntas.
for k in range(6):
    a = k / 6 * math.tau + 0.4
    r0 = Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 3.9))
    r1 = r0 + Vector((math.cos(a) * 0.7, math.sin(a) * 0.7, 0.9))
    r2 = r1 + Vector((math.cos(a + 0.6) * 0.45, math.sin(a + 0.6) * 0.45, 0.45))
    r3 = r1 + Vector((math.cos(a - 0.5) * 0.4, math.sin(a - 0.5) * 0.4, 0.55))
    m.segmento(corteza, r0, r1, 0.09, 0.05, lados=4, grupo="copa")
    m.segmento(corteza, r1, r2, 0.05, 0.015, lados=3, grupo="copa")
    m.segmento(corteza, r1, r3, 0.045, 0.012, lados=3, grupo="copa")
    m.esfera(veta, tuple(r2), 0.07, subdiv=0, grupo="copa")
# Espigas secas colgando de la copa: recuerdan a la diosa de la cosecha.
for k in range(10):
    a = k / 10 * math.tau + 0.2
    p0 = Vector((math.cos(a) * 1.35, math.sin(a) * 1.35, 3.05))
    p1 = p0 + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, -0.55))
    m.segmento(hojas, p0, p1, 0.02, 0.015, lados=3, grupo="copa")
    m.esfera(hojas, tuple(p1 + Vector((0, 0, -0.12))), 0.08, subdiv=0, escala=(0.8, 0.8, 2.0), grupo="copa")

# ─── Brazos-rama con hoz aserrada ───
for s, b, ab in ((1, "brazoI", "antebrazoI"), (-1, "brazoD", "antebrazoD")):
    m.segmento(corteza, (0.3, 0.7 * s, 2.2), (0.9, 1.35 * s, 1.75), 0.24, 0.16, lados=6, grupo=b, ruido=0.02, semilla=50)
    m.esfera(corteza, (0.9, 1.35 * s, 1.75), 0.2, subdiv=0, grupo=b)
    m.segmento(quitina, (0.9, 1.35 * s, 1.75), (1.6, 1.3 * s, 1.55), 0.15, 0.1, lados=6, grupo=ab)
    hp = [(1.6, 1.3 * s, 1.55), (2.1, 1.15 * s, 1.8), (2.45, 0.85 * s, 1.68), (2.6, 0.45 * s, 1.35), (2.5, 0.15 * s, 1.05)]
    for i, (p, q) in enumerate(zip(hp, hp[1:])):
        m.segmento(quitina, p, q, 0.1 - i * 0.02, 0.08 - i * 0.02, lados=5, grupo=ab)
        # Filo de ámbar por dentro de la hoz: se lee como arma desde lejos.
        m.segmento(veta, (p[0] - 0.06, p[1] - 0.06 * s, p[2] - 0.05), (q[0] - 0.06, q[1] - 0.06 * s, q[2] - 0.05),
                   0.025, 0.02, lados=3, grupo=ab)
    for p in hp[1:4]:
        m.cono(quitina, (p[0] - 0.1, p[1] - 0.06 * s, p[2] - 0.14), 0.05, 0.0, 0.24, lados=3, rot=(math.pi, 0, 0), grupo=ab)

# ─── Patas de langosta: muslo grueso con cresta, tibia con púas y pie en garra ───
for i, a, c, s in PATAS:
    hip = Vector((0.75 * c, 0.75 * s, 1.05))
    rod = Vector((1.6 * c, 1.6 * s, 1.85))
    tob = Vector((2.0 * c, 2.0 * s, 0.25))
    pie = Vector((2.3 * c, 2.3 * s, 0.02))
    m.segmento(quitina, hip, rod, 0.2, 0.12, lados=6, grupo=f"pata{i}")
    m.segmento(corteza, hip + Vector((0, 0, 0.15)), rod + Vector((0, 0, 0.1)), 0.08, 0.04, lados=4, grupo=f"pata{i}")  # cresta
    m.esfera(quitina, tuple(rod), 0.14, subdiv=0, grupo=f"pata{i}")
    m.segmento(quitina, rod, tob, 0.1, 0.05, lados=5, grupo=f"pata{i}")
    for t in (0.25, 0.5, 0.75):
        pt = rod.lerp(tob, t)
        m.cono(quitina, (pt.x + 0.08 * c, pt.y + 0.08 * s, pt.z), 0.035, 0.0, 0.2, lados=3,
               rot=(0, 0.9, a), grupo=f"pata{i}")  # púa hacia fuera
    m.segmento(quitina, tob, pie, 0.05, 0.015, lados=4, grupo=f"pata{i}")
cuerpo_ob = m.objeto((0, 0, 0))

# ─── Alas (fase 2): la copa se abre en dos hojas de langosta con nervios de ámbar ───
al = Malla("alas")
for s, g in ((1, "alaI"), (-1, "alaD")):
    ang = math.atan2(1.25 * s, -1.7)
    for j, (l, w, dz) in enumerate(((2.6, 0.95, 0.0), (2.2, 0.75, -0.06), (1.7, 0.55, -0.12))):
        off = 0.32 * j * s
        al.cono(hojas if j != 1 else hoja_seca, (-1.2, (1.1 + off) * s * 0.9, 3.3 + dz), w, 0.0, l, lados=4,
                rot=(0, math.pi / 2, ang - math.pi + 0.22 * j * s), escala=(0.12, 1, 1), grupo=g)
    for t in (0.0, 0.35, -0.35):
        al.segmento(veta, (-0.3, 0.45 * s, 3.3), (-2.3, (1.85 + t) * s, 3.4 + t * 0.2), 0.035, 0.012, lados=3, grupo=g)
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
