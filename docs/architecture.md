# Arquitectura del juego

- Separa las reglas y el estado del juego de la presentación, el audio y la entrada cuando lo permita el motor. Cubre las transiciones importantes con pruebas pequeñas.
- Haz reproducibles los casos que dependen de reloj, eventos, física o azar. Pasa un tiempo de simulación o semilla controlable cuando facilite la prueba.
- Reutiliza sistemas y recursos existentes. Mide antes de optimizar. Para cambios en bucles por cuadro, revisa asignaciones y costo por entidad.
- Documenta motor, versión, plataforma de la demo, punto de arranque y versión de dependencias al elegirlos. Acuerda quién edita cada escena o recurso difícil de combinar. Revisa si hace falta Git LFS antes de versionar binarios grandes.
- Las pruebas más rápidas cubren reglas puras. Un caso de integración debe cargar una escena o recorrer un camino real. Antes de publicar una versión jugable, prueba entrada, arranque y salida en la plataforma objetivo.

## Validación

El entorno usa Python estándar. El lenguaje del juego y sus herramientas se definen en [checks.toml](../checks.toml). Seis etapas son obligatorias para integrar.

| Etapa | Qué comprueba |
| --- | --- |
| `format` | Formato en modo de comprobación |
| `lint` | Reglas del lenguaje, proyecto y motor |
| `static` | Tipos u otro análisis estático que corresponda |
| `test` | Pruebas unitarias con al menos un caso real |
| `build` | Construcción o exportación con verificación de salida |
| `integration` | Ejecución sin interfaz si el motor lo permite, con un escenario representativo |

Cada valor de `[checks]` es un arreglo de comandos. Cada comando es un arreglo de argumentos. Por ejemplo, si el equipo crea un adaptador ejecutable `tools/comprobar-formato`, la entrada es `format = [["./tools/comprobar-formato"]]`. Se ejecuta desde la raíz, sin interpretación por shell. Pon operaciones de composición en adaptadores versionados. Proporciona herramientas fijadas en el CI y documenta cómo instalarlas localmente. Si el motor necesita otra plataforma, cambia el runner de `Juego` y conserva los nombres de los checks requeridos.

Las comprobaciones deben ser no interactivas. Usa el modo de solo comprobación para formato y lint, exige que el runner de pruebas falle cuando recolecte cero casos y coloca las salidas generadas en rutas ignoradas. Para tareas que necesitan una carpeta temporal bajo el sandbox usa una ruta ignorada dentro del checkout y configura la herramienta si corresponde. Haz que un fallo real se refleje en el código de salida. Mantén las comprobaciones obligatorias del PR libres de credenciales y revisa las dependencias antes de ejecutarlas.

| Comando | Resultado |
| --- | --- |
| `python3 scripts/validate.py --harness` | Suite del entorno y validez de `checks.toml` |
| `python3 scripts/validate.py` | Entorno y etapas configuradas. Informa etapas ausentes. |
| `python3 scripts/validate.py --stage test` | Solo una etapa. Admite los seis nombres de la tabla. |
| `python3 scripts/validate.py --strict` | Exige éxito del entorno y de las seis etapas. |

Salida `0` indica éxito dentro del modo elegido, `1` algún fallo y `2` etapa ausente en modo individual o estricto. Un fallo tiene prioridad si también faltan etapas. `Juego` usa el modo estricto. Si la ejecución normal sale con `0` y muestra `SIN CONFIGURAR`, el cambio sigue pendiente de validación completa.
