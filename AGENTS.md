# Cómo trabajar en este repositorio

- Comunica avances, preguntas y resultados en español. Para principiantes, describe lo que podrán ver o hacer y su siguiente paso con lenguaje sencillo.
- Escribe las skills del repo en español, con pasos breves y legibles. Deja los ejemplos largos en referencias que se puedan consultar por separado.
- Conserva las funciones y mecánicas actuales. Sigue la arquitectura y las convenciones que existan. Prefiere cambios pequeños, código mantenible y reutilización. Justifica cada dependencia nueva.
- Escribe JavaScript con nombres claros, funciones pequeñas y manejo explícito de errores. Asume que el equipo empieza desde cero. Añade comentarios en español junto a casi cada línea con lógica: explica la sintaxis nueva, qué valor cambiar, sus unidades y cómo se verá el cambio. Mantén los comentarios al día.
- Mantén la lógica del juego comprobable y, cuando sea práctico, separada del renderizado. Prefiere transiciones deterministas, controla el tiempo y el azar en las pruebas, y evita asignaciones innecesarias y regresiones de rendimiento en bucles críticos. Respeta la versión del motor acordada.
- Prueba el comportamiento nuevo y las regresiones relevantes. Usa `python3 scripts/validate.py` y distingue resultados exitosos, fallidos y sin configurar. Conserva evidencia y comunica las pruebas manuales pendientes.
- Antes de editar, inspecciona estado, rama, worktrees y base. Trabaja desde `develop` en `feature/<nombre>` o `fix/<nombre>`. `main` queda para versiones jugables. Coordina escenas, recursos y otros archivos compartidos con su responsable.
- Conserva cambios ajenos y archivos fuera de alcance. Pide autorización para operaciones destructivas y aprobación específica antes de cada commit, push o publicación de un PR. Nunca fuerces un push ni incluyas credenciales. Usa GitHub como autoridad sobre protecciones remotas.
- Antes de cada commit, incluido el mensaje de squash o merge, aplica [`$humanizer`](.agents/skills/humanizer/SKILL.md) al título y al cuerpo. Presenta el texto final con la solicitud de aprobación y usa exactamente ese texto.
- Abre PR de trabajo hacia `develop`. Un PR hacia `main` requiere una decisión de lanzamiento. Ejecuta una integración solo con aprobación explícita para el PR y SHA revisados. Prohibidos el merge automático y los atajos a las reglas.
- Usa `$new-feature`, `$code-review` y `$merge-feature` para los flujos del equipo. Usa especialistas cuando aporten evidencia adicional y mantén en el agente principal las operaciones de publicación e integración.
- Si está disponible `fm respond`, guarda las salidas extensas y sus códigos en archivos temporales y pide a `fm` extraer la evidencia necesaria. Usa directamente los resultados deterministas y consulta los originales para verificar datos o errores.

Consulta [colaboración](docs/collaboration.md) para las responsabilidades y [arquitectura](docs/architecture.md) para configurar la validación del juego.

## Code Review Rules

- En el movimiento o en otras reglas del juego, señala el acceso directo al DOM, al reloj real o al azar global cuando impida probar un resultado. Pasa el tiempo, la entrada o la semilla desde el código que coordina el cuadro.
- Si un cambio añade controles sostenidos, comprueba qué sucede al salir de la pista o cambiar de ventana. Las teclas activas deben liberarse para evitar movimiento que el jugador ya no puede detener.
