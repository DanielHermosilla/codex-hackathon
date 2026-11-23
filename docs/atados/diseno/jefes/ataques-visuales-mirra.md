# Ataques visuales de Mirra

Ficha de las señales físicas de cada ataque y rito de Mirra. Complementa [la ficha del jefe](mirra.md). Las áreas planas, sus colores y los tiempos de daño los fija el gameplay (`CONFIG.jefes.mirra`, `gameplay/bloques.js`, `gameplay/arena-mirra.js`, `gameplay/ritos.js`) y los pinta `render/telegrafias.js`. Estas señales explican **qué** golpea y **cuándo**, sin cambiar el área ni el daño.

## Reglas comunes

- **Solo lectura:** cada efecto se calcula con la acción, la etapa, `t`/`T`, las zonas y los proyectiles del combate. Si el gameplay cambia un tiempo, la señal lo sigue sola.
- **Dentro del área:** nada se dibuja fuera de la zona de daño real. La estela de la siega nunca pasa del borde de salida y los dientes del banquete quedan dentro del borde de la mordida.
- **Sin tapar el código de color:** las marcas del suelo son oscuras (`corrupcion.costra`) o doradas y finas. Nunca usan `peligro`/`aviso`.
- **Cámara alta (55°):** cada señal tiene una parte en el suelo (forma) y otra con altura (cuerpo). Así se lee con la cámara lejos (16–46 m).
- **Movimiento reducido** (`?reducir`, `prefers-reduced-motion` o `feel.reducirMovimiento`): se quitan aleteos, latidos, espirales y oscilaciones, y bajan las cantidades. La información se mantiene: rampas de brillo, posiciones y tiempos.
- **Rendimiento:** todo se crea al iniciar la vista (pools e `InstancedMesh`). No se crean objetos por cuadro. Hay ocho mallas instanciadas, cuatro piezas sueltas (garfios y caballones) y unos 25 sprites.
- **Silueta de dos tonos:** espinas, semillas y garfios usan `bicolor` (base `OSCURO`, punta `CLARO`). Así contrastan con el trigal dorado y con el rojo del aviso.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/atados/render/ataques-mirra.js` | Siega, Siega doble, Grano, Hambre, Enjambre y Banquete. Ajustes en `AJUSTE_ATAQUES`. |
| `src/atados/render/ritos-mirra.js` | Lado de Mirra en el orbe del vacío y la luz divina; coberturas que revientan. |
| `src/atados/render/ritos.js` | Latido de la cuenta y grietas del pisotón; final de cada descarga de los braseros. |
| `src/atados/render/slice.js` | Crea los dos módulos (no con el muñeco) y los sincroniza después de `mirra.sync`. |

## Ataques (carga → lanzamiento → impacto / ventana)

| Ataque | Carga | Lanzamiento / impacto | Ventana de castigo |
|---|---|---|---|
| **Siega** | Un filo dorado aparece en el borde por donde empezará la hoja y se enciende con la telegrafía. Un destello lo recorre hacia fuera (afilado). | El filo barre el arco en `activo` (0,2 s) en el mismo ángulo que daña; una estela dorada se apaga en 0,3 s. Suelta paja por quintos del arco. | Dos surcos oscuros donde quedan clavados los brazos, durante toda la recuperación. |
| **Siega doble** | Igual, con **dos filos** paralelos y dos pasadas del destello. Entre barridos el filo se recarga en el borde nuevo. El clip sigue los tiempos de `bloque.sub` y `subT` para tensar de nuevo ambos brazos. | Mirra tajea con ambos brazos durante los 0,2 s de cada barrido. El filo y su estela muestran la dirección real de ida y vuelta. | Igual que la Siega (1,5 s). El modelo conserva la orientación del jefe. |
| **Grano** | El abdomen se llena con un brillo que solo crece. Con flashes y sin movimiento reducido respira despacio (0,7 Hz, ±8 %) y se dibuja encima del cuerpo. Cinco semillas de dos tonos (cáscara oscura, punta clara) asoman en abanico en la boca real (entre `mandI` y `mandD`). 0,45 s antes del vuelo, puntos claros dibujan el arco desde la boca hasta cada círculo. | Las semillas recorren ese arco con la punta hacia delante y una sombra que crece. Llegan al círculo cuando el gameplay las da por caídas. Al caer brotan 9 espinas de hasta 2,4 m (base oscura, punta clara) sobre un cráter oscuro. | Las espinas se hunden en 0,25 s. La boca gotea grano durante la recuperación. |
| **Hambre** | Dos garfios de quitina (base oscura, punta clara, 2,6 m) salen de la boca, se abren y bajan hasta rozar el suelo. Debajo, dos zarpazos anchos marcan la línea. Los ojos se encienden. | En la embestida los garfios se cierran hacia delante. La huella oscura de 2,2 m sale de debajo del cuerpo, desde la salida hasta Mirra, con dos caballones claros a los lados que dan sombra. Salta tierra por ambos lados. Solo aparece en una carga real. | La huella se borra en 1,8 s. Si tropieza contra la cadena, los garfios cuelgan, suelta paja y cinco cascarillas giran sobre su cabeza. |
| **Enjambre** | La copa se sacude (hueso `copa`). Las langostas salen de ella y forman la nube sobre el círculo mientras dura el aviso. | La nube sigue a la zona con aleteo; cada langosta orbita dentro del radio. | Al terminar se dispersa hacia arriba y fuera en 0,7 s. |
| **Banquete** | Mientras dura el tirón, briznas de trigal fluyen en espiral hacia la boca, que brilla más con la aspiración. En el aviso de la mordida, dientes de quitina salen del borde, abiertos hacia fuera. | Los dientes se cierran hacia dentro en 0,08 s y levantan polvo en el borde. Si el ataque se cancela antes, no muerden. | Letargo: el abdomen queda hinchado y respira despacio; motas de grano suben de la cabeza. |

## Ritos

| Rito | Señal |
|---|---|
| **Orbe del vacío** | Un hilo de motas violetas va de la esquirla del pecho a la bola mientras la carga. 0,6 s antes de caer, una columna une la bola con el suelo y se acorta con la caída. Al abrirse el hueco saltan escombros oscuros. |
| **Pilar explosivo** | Cada cobertura destruida revienta en paja y polvo; el pilar del vacío, en esquirlas oscuras. También al devorar pilares en la transición. |
| **Luz divina** | La esquirla del pecho se enciende y suelta motas hacia el sol. Junto a la pareja, del lado del sol, tres cuñas doradas de 1,8 m apuntan hacia donde viaja la luz y avanzan despacio (quietas con movimiento reducido). Se dibujan encima del hueco del vacío y se leen aunque el sol quede fuera del encuadre. En el impacto, la esquirla destella (menos sin flashes). |
| **Pisotón** | La cuenta se aviva en cada segundo entero (3, 2, 1). Al caer, seis grietas salen de Mirra con la onda. |
| **Braseros** | Al terminar cada descarga: se expande si golpea, se encoge si el escudo del color correcto la absorbe y suelta un soplo corto si una cobertura la corta antes. |

## Repetir las capturas

Desde la raíz del juego:

```sh
npm run build
npm run test:browser -- tests/browser/mirra-visual.spec.js
```

La prueba coloca a la pareja en la misma posición, fija la semilla y guarda un PNG del aviso y otro del golpe para cada ataque en `test-results/`. Siega doble se captura en la segunda pasada. Para los cuatro ritos, ejecuta `npm run test:browser -- tests/browser/atados.spec.js -g "cuatro avisos"`.

## Guía de iteración para Codex y Claude

1. **Cambiar el aspecto:** edita `AJUSTE_ATAQUES` en `ataques-mirra.js`. Cada valor tiene unidades y efecto comentados. Ejemplos: `siega.anchoFilo` (grosor del filo), `banquete.dientes` (cantidad en el borde) y `enjambre.langostas`. Si el Grano aún no se distingue a 960 × 720, sube primero `grano.semilla`, `grano.alturaPua` y `grano.puntos`. Para el Hambre, sube `hambre.garfioLargo` y `hambre.surcoAncho`; este último debe seguir por debajo de `anchoL × L − 1 m`.
2. **Cambiar un tiempo de juego:** no se cambia aquí. Edita `CONFIG.jefes.mirra.ataques.<id>` y la señal lo sigue. Los ritos del orbe y la luz copian `4.5` y `2.5` s de `gameplay/arena-mirra.js` (`FIN_AVISO_ORBE` e `IMPACTO_LUZ` en `ritos-mirra.js`). Si cambian allí, cámbialos también aquí.
3. **Añadir un ataque:** crea `sync<Nombre>` en `ataques-mirra.js` con la misma forma: detecta `at.id`, usa `at.etapa`/`at.t`/`at.T` o la zona (`zonaDe`) y deja estado propio para los desvanecimientos. Llámalo desde `sync` y añade su fila a esta ficha.
4. **Huesos:** usa `punto(huesos, nombre, …)`, que ya incluye un respaldo si el GLB no cargó. Para mover un hueso usa `retocar`, que no acumula entre cuadros. Huesos: `tronco`, `abdomen`, `cabeza`, `mandI/D`, `copa`, `alaI/D`, `brazoI/D`, `antebrazoI/D`, `pata0–5`.
5. **Comprobar:** `python3 scripts/validate.py`. Luego, en el navegador, fuerza cada ataque desde `window.__game` (normal y difícil) y repítelo con `?reducir`. Captura la carga, el golpe y la ventana. Confirma que nada sale del área y que el color de aviso sigue legible.
6. **No hacer:** crear objetos en `sync`, usar `Math.random` (usa `hash`), leer el DOM o el reloj real, ni escribir en el estado del combate.

## Revisión en pantalla

Con Chromium a 960 × 720 se compararon los avisos y golpes de ambas fases. El filo dorado se distingue sobre el sector rojo, las púas bicolores sobresalen del trigo y los bordes claros hacen visible la huella de Hambre junto a la sombra del jefe. En Luz divina, tres cuñas junto a la pareja indican la dirección de los rayos aunque su origen quede fuera de cámara.

## Pendiente para el playtest
- Medir en escritorio y portátil el coste de las sombras de púas y dientes. Si hace falta, desactiva `castShadow` en `instancias(…, true)`.
- Sonido sincronizado con el destello del afilado y el cierre de dientes (audio aparte).
