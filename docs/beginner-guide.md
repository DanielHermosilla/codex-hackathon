# Tu primera tarea con Codex

A = Daniel

Pídele a A el enlace de GitHub y abre tu propia copia del proyecto en Codex. Si usas terminal, abre la carpeta y ejecuta `codex`. Si la aplicación pregunta si confías en el proyecto, confirma que es el repositorio del equipo. A puede ayudarte a activar el control local desde `/hooks`.

1. Empieza un chat por tarea. Escribe `$new-feature` seguido de lo que quieres que pueda hacer el jugador. Codex prepara un espacio para tus cambios y te dice qué va a comprobar.
2. Lee el resumen y prueba el juego con los pasos que te indique. **PASÓ** indica que una verificación se ejecutó con éxito. **FALLÓ** indica que algo salió mal. **SIN CONFIGURAR** indica que el equipo todavía debe conectar esa comprobación.
3. Si algo falla, pega el mensaje y pide a Codex que investigue en tu tarea. Si una prueba todavía no existe, avisa a A. Para una segunda revisión escribe `$code-review Revisa mi cambio y señala los problemas que pueda encontrar un jugador`.
4. Cuando el cambio esté listo, pide a Codex que prepare un PR, la propuesta que verá el equipo. Revisa qué archivos se van a guardar, qué se va a publicar y qué comprobaciones faltan. Aprueba cada acción que quieras que se ejecute y envía a A el enlace. A decide cuándo integrarlo con `$merge-feature`.
5. Usa tu copia y una tarea por chat. Si otra persona trabaja en la misma escena, menú o archivo de audio, avísale antes de tocarlo. Si Codex detecta trabajo de otra tarea, deja que prepare otro espacio o coordina con A.

## Cinco pedidos para copiar

- `$new-feature Agrega un menú de pausa que se abra con Esc y permita reanudar. El personaje debe detenerse mientras está abierto.`
- `$new-feature Crea un enemigo que siga al jugador al entrar en su zona y deje de seguirlo al salir.`
- `$new-feature Muestra una barra de vida que se actualice al recibir daño y al curarse.`
- `$new-feature Agrega música al menú principal y respeta el volumen elegido por el jugador.`
- `$new-feature Corrige el salto doble accidental. Mantener pulsado salto debe producir un solo salto.`
