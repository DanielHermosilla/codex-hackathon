**En vivo (`pnpm dev`, puerto 5173):** `/?propuesta=colores&zona=pasillo` · `/?propuesta=colores&zona=trigal` · `/?propuesta=colores&zona=muelle` · `/?propuesta=colores&zona=tavor` (añade `&k=1` para ver el clímax o el anochecer)

# Propuesta de colores (v2)

Los tokens viven en `CONFIG.paleta` (`src/core/config.js`); el código nunca usa hex sueltos. La escena es `src/render/propuestas/escena.js`. Para regenerar las capturas: `node scripts/capturas-propuestas.mjs vN`.
Estado: **D-082 aprobado (D-142, par A)**. D-087 y D-083 siguen como propuesta.

| Captura v2 | Qué muestra |
|---|---|
| [v2-pasillo](propuestas/v2-pasillo.png) | Pasillo en hora dorada, con más luz y menos niebla marrón |
| [v2-trigal](propuestas/v2-trigal.png) | Trigal de Mirra (~4×), fase 1 |
| [v2-muelle](propuestas/v2-muelle.png) | Muelle de Ondar (~6×, sale del agua), fase 1 |
| [v2-tavor](propuestas/v2-tavor.png) | Sala de Tavor de noche, iluminada por la Brasa |
| [v2-climax-4zonas](propuestas/v2-climax-4zonas.png) | Las 4 zonas con k=1: pasillo al anochecer, hambre, tormenta y Brasa corrupta |

Versión anterior: [v1-pasillo-parA](propuestas/v1-pasillo-parA.png), [v1-pasillo-parB](propuestas/v1-pasillo-parB.png), [v1-pasillo-atardecer-parA](propuestas/v1-pasillo-atardecer-parA.png).

## 1. D-087: código de gameplay v2 (fijo en todas las zonas)
**Recomendación:** las marcas son planas, sin bordes, sin contorno y sin brillo, siguiendo D-143. Se leen por el relleno y la opacidad. Mantienen los tonos de la v1 con menos saturación, y ninguna llega al umbral del bloom.

| Token | Hex | Uso |
|---|---|---|
| `peligro` | #d9475f (72 %) | Golpe inminente |
| `aviso` | #e8a6bb (40 %) | Telegrafía cargando: el área va en rosa claro y `peligro` (62 %) la llena hasta el golpe |
| `segura` | #6ccf96 (55 %) | Zona segura |
| `electrica` | #8f86d9 | Cadena electrificada (D-047): tinte del metal y chispas |
| `congelada` | #a9d6e6 | Cadena congelada: tinte y cristales |

Por qué: el carmesí es el único rojo de la escena, así que significa solo peligro. Que aviso y peligro sean de la misma familia enseña una regla: «el rosa se llena → el rojo es ya». El verde no aparece en ninguna zona. En las capturas, las tres marcas se distinguen en las 4 zonas y en sus clímax. En el trigal, el peligro sobre el oro es la combinación más justa, pero se lee.

## 2. Corrupción (D-084): ahora tiene el tono de la Brasa
`veta` #ffb648, `esquirla` #ffd88a, `brasaPura` #fff1cc, `costra` #2a1a10. El color es ámbar y oro blanco incandescente, y su brillo sube con `k`. Así deja libre el rojo para el peligro. Además es coherente con el lore: la cadena contuvo la Brasa, por eso las runas y la corrupción son de la misma familia. Las runas están en la cadena y la corrupción en jefes y suelo.

## 3. D-049 / D-065: tensión de la cadena (sin cambios)
El metal pasa de `bronce` #8c5a2b a `oro` #c79a45 con la tensión. Las runas van de `runaFloja` #7a4418 a `runaMedia` #ffa83a y luego a `runaTensa` #fff0c4, con un brillo de 0,25 a 3,2 que alimenta el bloom.

## 4. D-082: Sael y Odo (aprobado, D-142)
Sael (J1) limón #f0e45a, Odo (J2) celeste #4fb0ff. En la v2 el anillo también es plano: una línea fina al 90 % y un relleno al 10 %, sin contorno oscuro, para que vaya a juego con las marcas de gameplay. El fajín del personaje repite el color.

## 5. D-083: paleta dinámica por zona
Cada zona tiene dos fotogramas, `base` y `climax`, con los mismos tokens: cielo (alto y horizonte), niebla (color y distancias), sol (color, intensidad, elevación y azimut), hemisferio, suelo, piedra o madera, vegetación, agua, jefe, partículas, `corrupcion` y, en Tavor, `brasaLuz`. `resolverPaleta(zona, momento)` (`src/render/paleta.js`, con test) los mezcla con un `k`:
- pasillos: `k = progreso`;
- arenas: `k = 0,35·(fase−1) + 0,3·intensidad`.

El código de gameplay, la cadena y los jugadores quedan fuera de la mezcla.

| Zona | Base | Clímax |
|---|---|---|
| Pasillo | Hora dorada: horizonte #ffd6a0, niebla #f3dcc0, sol #ffd49a a 30°, campos gris ocre #a29d86 | Anochecer: horizonte #ff9e70, sol #ffa060 a 12° |
| Trigal (Mirra) | Tarde: trigo #e0bc62, rastrojo #b49e74, sol #ffc878 | Hambre: cielo polvoriento #7a6a70, trigo marchito #a89468, niebla #b88a68 más cerca |
| Muelle (Ondar) | Ocaso en el mar: horizonte #ffb088, agua #2a6878, tablones #8e6c50 | Ira y tormenta: cielo #1e2840, agua #12303c, luz fría #a8b8e0 |
| Tavor | Noche: cielo #0c1230, niebla #1c1c3a, la Brasa #ffc070 como única luz cálida | Soberbia: horizonte #4a2440, la Brasa se vuelve #ff9440 y más intensa |

## Qué tiene que decidir Diego
1. ¿Las marcas planas v2 (peligro, aviso, segura) ya son lo que buscabas, o las quieres todavía más apagadas u opacas?
2. ¿La corrupción en tono Brasa (ámbar) te convence, o prefieres otro tono distinto de las runas?
3. ¿Las 4 paletas de zona van bien? Lo más discutible: el trigal es muy monocromo dorado y el clímax del muelle es oscuro.

Coste: entre 34 y 35 draw calls de escena (incluye las sombras) y 48–49 en total con bloom y salida, en las 4 zonas.
