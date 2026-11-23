# Utilidades compartidas por los modelos de AtaDos (no se construye: empieza por "_").
# Convenciones (las lee src/render/modelos.js):
# - Blender: Z arriba, el personaje mira a +X (en three.js también +X; glTF convierte Y-up).
# - Sombreado plano: todas las caras con use_smooth = False (low-poly facetado, D-044).
# - Los materiales se nombran por FUNCIÓN ("ropa", "piel", "acento", "corteza"...). Sus colores aquí son
#   neutros de referencia: en el juego se reemplazan por tokens de CONFIG.paleta / CONFIG.render.materiales.
# - Partes animables = objetos con nombre (sin puntos: GLTFLoader los sanea) y origen en su pivote.
import bpy, bmesh, sys, math, random
from mathutils import Matrix, Euler, Vector


def salida():
    return sys.argv[sys.argv.index("--") + 1]


def escena_vacia(fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = fps


_MATS = {}


def material(nombre, rgb=(0.5, 0.5, 0.5), rough=0.9, metal=0.0, emision=None):
    if nombre in _MATS:
        return _MATS[nombre]
    m = bpy.data.materials.new(nombre)
    if hasattr(m, "use_nodes") and not m.use_nodes:
        try:
            m.use_nodes = True
        except Exception:
            pass
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
        if emision is not None:
            for key in ("Emission Color", "Emission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = (*emision, 1)
                    break
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 1.0
    m.diffuse_color = (*rgb, 1)
    _MATS[nombre] = m
    return m


def _mat4(centro, rot=(0, 0, 0), escala=(1, 1, 1)):
    return Matrix.Translation(Vector(centro)) @ Euler(rot, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*escala, 1))


class Malla:
    """Acumula primitivas (en coordenadas de mundo) en un bmesh. Cada primitiva lleva material y,
    opcionalmente, un grupo de vértices (para mallas con esqueleto: peso 1 a un hueso)."""

    def __init__(self, nombre):
        self.nombre = nombre
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.mats = []
        self.grupos = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _gi(self, grupo):
        if grupo not in self.grupos:
            self.grupos.append(grupo)
        return self.grupos.index(grupo)

    def _fin(self, verts, mat, grupo, ruido=0.0, semilla=0):
        mi = self._mi(mat)
        caras = set()
        rnd = random.Random(semilla)
        for v in verts:
            if ruido:
                v.co += Vector((rnd.uniform(-ruido, ruido), rnd.uniform(-ruido, ruido), rnd.uniform(-ruido, ruido)))
            if grupo is not None:
                v[self.dl][self._gi(grupo)] = 1.0
            caras.update(v.link_faces)
        for f in caras:
            f.material_index = mi
            f.smooth = False
        return verts

    def caja(self, mat, centro, tam, rot=(0, 0, 0), grupo=None, ruido=0.0, semilla=0):
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=_mat4(centro, rot, tam))
        return self._fin(r["verts"], mat, grupo, ruido, semilla)

    def cono(self, mat, centro, r1, r2, alto, lados=6, rot=(0, 0, 0), grupo=None, ruido=0.0, semilla=0, escala=(1, 1, 1)):
        """Tronco de cono a lo largo de Z local, centrado en `centro` (r1 abajo, r2 arriba)."""
        r = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=lados,
                                  radius1=r1, radius2=max(r2, 1e-4), depth=alto, matrix=_mat4(centro, rot, escala))
        return self._fin(r["verts"], mat, grupo, ruido, semilla)

    def esfera(self, mat, centro, radio, subdiv=1, escala=(1, 1, 1), rot=(0, 0, 0), grupo=None, ruido=0.0, semilla=0):
        r = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radio, matrix=_mat4(centro, rot, escala))
        return self._fin(r["verts"], mat, grupo, ruido, semilla)

    def segmento(self, mat, a, b, r1, r2=None, lados=5, grupo=None, ruido=0.0, semilla=0):
        """Cono entre dos puntos (para ramas, patas, palos)."""
        a, b = Vector(a), Vector(b)
        d = b - a
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        m = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        r = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=lados,
                                  radius1=r1, radius2=max(r2 if r2 is not None else r1, 1e-4), depth=d.length, matrix=m)
        return self._fin(r["verts"], mat, grupo, ruido, semilla)

    def objeto(self, pivote=(0, 0, 0), padre=None, pivote_padre=(0, 0, 0)):
        """Crea el objeto con el origen en `pivote` (mundo). Si hay padre, se cuelga sin rotación."""
        bmesh.ops.translate(self.bm, verts=self.bm.verts, vec=-Vector(pivote))
        me = bpy.data.meshes.new(self.nombre)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        for p in me.polygons:
            p.use_smooth = False
        ob = bpy.data.objects.new(self.nombre, me)
        bpy.context.scene.collection.objects.link(ob)
        # Pivote en coordenadas glTF (Y arriba, Z = -Y de Blender): el cuantizado de meshopt mueve los nodos,
        # así que el juego lee el pivote de aquí (userData.pivote) y no de la transformación del nodo.
        ob["pivote"] = [float(pivote[0]), float(pivote[2]), float(-pivote[1])]
        for g in self.grupos:
            ob.vertex_groups.new(name=g)
        if padre is not None:
            ob.parent = padre
            ob.location = Vector(pivote) - Vector(pivote_padre)
        else:
            ob.location = Vector(pivote)
        return ob


def vacio(nombre, pos=(0, 0, 0), padre=None, pos_padre=(0, 0, 0)):
    ob = bpy.data.objects.new(nombre, None)
    bpy.context.scene.collection.objects.link(ob)
    if padre is not None:
        ob.parent = padre
        ob.location = Vector(pos) - Vector(pos_padre)
    else:
        ob.location = Vector(pos)
    return ob


def exportar(ruta, animaciones=False):
    kw = dict(filepath=ruta, export_format="GLB", export_apply=True, export_yup=True, export_extras=True)
    if animaciones:
        kw.update(export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True,
                  export_def_bones=False, export_optimize_animation_size=False)
    else:
        kw.update(export_animations=False)
    bpy.ops.export_scene.gltf(**kw)
