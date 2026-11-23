# Dirección visual

> Estado: 🟡 parcial. Cada afirmación cita su `[D-NNN]`. Colores de jugador cerrados [D-142]; paleta dinámica [D-083] y código de gameplay [D-087] siguen pendientes de propuesta con captura.

## Estilo
- 3D low-poly estilizado, cámara 3/4. Se descarta el 2.5D y los billboards [D-044, D-033].
- Primera impresión: que choque por su belleza y muestre un mundo atrapante [D-007].
- Nunca con cara de pack de assets; nunca infantil [D-118].

## Referencias de sensación (no copia) [D-036]
- Tunic: cámara, transición por pasillos entre jefes, identidad visual, modelos.
- The Last Campfire: prólogo, música y visual, cámara y ángulo, el mundo.
- Journey: misticismo.
- Immortals Fenyx Rising: lo divino caricaturizado.
- Death's Door: fluidez de juego y arte.
- Hades II: citado por su 2.5D; queda desplazado por D-044 (todo en 3D).
Capturas de referencia: `../arte/referencias/`.

## Paleta
- Dinámica: cambia según jefe, fase, intensidad y momento de la historia [D-083].
- **Aprobada: v2** [D-188]: cada zona tiene paleta base y de clímax; en pasillos la mezcla sigue el avance (hora dorada → anochecer), en arenas la fase e intensidad. Gameplay, cadena y jugadores no cambian → [`../propuesta-colores.md`](../propuesta-colores.md).

## Código de colores de gameplay
- Peligro, aviso, zona segura, efectos sobre la cadena: colores fijos compatibles con la paleta dinámica [D-087].
- La v1 no se aprobó. Pauta para la v2: marcas más planas, sin bordes y menos neón [D-143].
- **Aprobado: v2** [D-188] → [`../propuesta-colores.md`](../propuesta-colores.md). Tokens en `CONFIG.paleta`: peligro `#d9475f`, aviso `#e8a6bb` (se llena de peligro), segura `#6ccf96`, electrificada `#8f86d9`, congelada `#a9d6e6`; marcas planas, sin bordes ni bloom. Corrupción en ámbar de la Brasa (`#ffb648` / `#ffd88a`). Paleta dinámica por zona, base → clímax [D-083 → D-188].

## Iluminación
- Hora dorada en los pasillos, avanzando hacia la noche [D-086].
- Tavor de noche, iluminado por la Brasa [D-086].
- Puede variar según el momento [D-086].

## Personajes
- Sael y Odo con modelos distintos [D-052]. Sael ágil, Odo corpulento: solo en forma, con stats idénticos [D-057, D-149].
- Anillo en el suelo: discreto, integrado al arte, con color propio fijo [D-051].
- Colores: **Sael limón `#f0e45a`, Odo celeste `#4fb0ff`** [D-142]. Los ítems llevan el color de su jugador [D-170].
- Animación procedural: squash & stretch, inclinación, pasos, capa [D-090].
- Vida junto al personaje o su anillo [D-063].

## La cadena
- Metal divino: bronce u oro antiguo, con runas [D-049].
- Las runas brillan más cuanto más tensa [D-049]. Más un efecto o cambio leve de color [D-065].
- Es el único indicador de tensión en pantalla [D-065].

## Jefes
- Tamaño creciente: Mirra ~4× los jugadores, Ondar ~6×, Tavor cambia de tamaño entre fases [D-085].
- Mirra tiene tamaño fijo; su gula se ve en que devora la arena [D-154].
- Tavor va de grande a pequeño: ~8× → ~4× → ~2× [D-159].
- Su esquirla en la fase final es el único punto débil y debe leerse como tal [D-160].
- Título de presentación: nombre corrupto grande, antiguo tachado debajo [D-180].
- Animación con esqueleto hecho en Blender [D-090].
- Corrupción: esquirlas de la Brasa clavadas y vetas brillantes que se extienden por el cuerpo y el suelo [D-084].
- Cambian de forma entre fases [D-025].

## Arenas [D-088]
Una por jefe, se transforma entre fases [D-025, D-088]. Solo pilares estáticos, que se quitan o mueven por fase [D-184].
- Mirra: trigal seco, espantapájaros-pilar, 4 → 2 (los devora) [D-057, D-184].
- Ondar: muelle que se hunde por fases, bolardos 6 → 4 → 2–3 [D-057, D-184]. Caer al agua daña y devuelve junto al compañero [D-158].
- Tavor: sala del juicio, columnas 6 → 4 → 3 [D-184].
(Conteos de la opción A aprobada en `propuesta-D138-D139.md`.)

## Pasillos
Campos grises, pueblos con estatuas de ceniza, murales del robo [D-057, D-126]. Calmos [D-005].

## VFX y post-proceso
- Ricos pero legibles: chispas, polvo, brasas flotando, bloom suave, niebla [D-089].
- Nunca tapan los avisos [D-089].
- Shake y flashes reducibles en ajustes [D-112].

## Riesgos de legibilidad (para las propuestas de color)
- Cadena dorada [D-049] sobre hora dorada [D-086]: puede fundirse con el fondo.
- Brasas flotando decorativas [D-089] frente a brasas de curación [D-057]: pueden confundirse.
- Sin modo daltónico [D-112]: Sael y Odo deben distinguirse por silueta además de color [D-052]. El par amarillo/azul [D-142] ayuda: se separa bien en las daltonías rojo-verde.
- Sael limón [D-142] cerca del oro de la cadena [D-049] y de la hora dorada [D-086]: riesgo de que su anillo se confunda con la cadena o el fondo.
- Odo celeste [D-142] sobre el agua del muelle de Ondar [D-088]: riesgo de que se pierda en la arena 2.
- Runas apagadas 4 s [D-161] y cadena electrificada [D-157]: necesitan un estado visual propio, distinto de «floja».
