# UI, HUD y cámara

> Estado: ✅ sin huecos abiertos (todas las decisiones del área cerradas). Cada afirmación cita su `[D-NNN]`. Los colores de peligro y aviso [D-087] los define `03-arte.md`.

## Arranque
1. Créditos con el nombre del equipo: Geek Labs [D-008, D-071].
2. Prólogo de 60–90 s, saltable manteniendo un botón; siempre saltable en partidas siguientes [D-072, D-045].
3. Menú principal: escena 3D viva con el mundo de fondo y los dos encadenados [D-073].
4. «Jugar» los pone en marcha sin corte [D-073], hacia el pasillo tutorial [D-066].
- Muy pocos pasos: jugando en los primeros minutos [D-009].
- Solo o coop: automático, es coop si J2 pulsa algo en el menú [D-177].
- Dificultad normal/difícil en una pantalla única [D-077, D-177].
- Idioma: el del navegador, cambiable en ajustes [D-102, D-177].

## Cámara
- 3/4 dinámica: sigue el centro de los dos con zoom según la distancia [D-033].
- En jefe se abre y encuadra a los dos jugadores y al jefe [D-033, D-176].
- Debe acomodar la cadena alargada por drops [D-079] y el tamaño de Tavor (~8× en su primera fase) [D-159].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `camera.zoomByDistance` | Curva zoom ↔ distancia entre jugadores | ❓ | D-033 |
| `camera.bossFraming` | Margen para encuadrar jugadores + jefe | ❓ | D-176 |

## HUD
- Mínimo y diegético. Vida junto a cada personaje o anillo. Casi nada fijo en pantalla [D-063].
- Anillo de jugador: Sael limón `#f0e45a`, Odo celeste `#4fb0ff` [D-051, D-142].
- Tensión: solo en la cadena, llamativa (runas y cambio leve de color) [D-065, D-049].
- Jefe: título con el nombre corrupto grande y el antiguo tachado debajo; barra de vida durante el combate [D-064, D-180].
- Números de daño: uno que crece mientras dura el contacto. Desactivables [D-166, D-112].
- Tutorial: indicaciones breves en el primer pasillo (corte, ancla, dash) [D-066].
- Todos los textos en archivo de traducciones [D-102].

## Controles
Teclas por defecto en `04-jugabilidad.md` [D-151]. Remapeo en ajustes [D-112].

## Pausa y ajustes
- Cualquiera pausa con Esc o Start, en cualquier momento. Menú con ajustes y volver al menú [D-113].
- Ajustes: volúmenes (general, música, efectos, voces), remapeo de teclado y mando, reducir shake/flashes, números de daño on/off, pullas on/off, idioma [D-112, D-177].
- Sin modo daltónico en la demo [D-112].

## Resultados
- Sin pantalla de resultados por jefe: lápida física en la arena [D-098, D-100].
- Derrota: pantalla con frase del jefe y reintento muy rápido [D-111, D-173].
- Final: los dos sostienen juntos la Brasa; créditos con stats totales [D-178, D-101].
