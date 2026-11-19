# Colaboración de cuatro personas

A decide arquitectura, versión del motor, integración y lanzamientos. B implementa, revisa y ayuda a probar. C y D trabajan por tareas pequeñas desde Codex y prueban el resultado con los pasos del PR. El autor de cada tarea conserva su rama hasta integrar. Otra persona revisa el PR.

## Ramas y propuestas

- `main` contiene las versiones jugables. `develop` recibe el trabajo diario. Cada cambio independiente sale de `develop` como `feature/<nombre>` o `fix/<nombre>` y vuelve mediante PR.
- Cada persona usa su propio clon. Para dos tareas en un mismo clon, utiliza el modo Worktree de Codex o una carpeta nueva bajo `.worktrees/` si compensa el costo. Inspecciona trabajo previo antes de cambiar de rama. Coordina los recursos que el motor guarda como archivos binarios o escenas compartidas.
- Antes de publicar, el autor autoriza el commit, el push y la creación del PR. Incluye los pasos de prueba y su resultado. Usa borrador si falta verificación. Otra persona revisa la versión que se propone integrar.
- A ejecuta `$merge-feature` para revisar localmente el SHA, CI, conflictos, aprobaciones y reglas. A autoriza un PR concreto para los SHA revisados. Avisa al equipo si la integración queda bloqueada.
- Usa squash para cambios pequeños. Para un lanzamiento, A prueba la demo y abre un PR de `develop` a `main` con merge commit para preservar historia. Después, reincorpora la ascendencia de `main` a `develop` mediante un PR de sincronización. Crea `fix/sincronizar-main` desde `develop`, incorpora `main` en esa rama y usa merge commit en el PR, con la misma revisión y checks. Mantén permitidos ambos métodos en GitHub si sigues este flujo.
- Si se autoriza retirar una rama o worktree, comprueba que está limpio y que no contiene trabajo posterior al PR. Tras squash verifica el PR y el SHA revisado en GitHub. Si Git se niega a retirar la rama, conserva la rama y consulta a su responsable.
- Prohibidos el force push, el merge automático y el bypass de protecciones. Si cambia la base de una rama ya publicada, integra la base en esa rama y vuelve a comprobarla. Evita reescribir historia compartida.

## Configuración de GitHub a cargo de A

1. Si el repositorio todavía está vacío, A prepara y publica manualmente el commit inicial del entorno en `main` y crea `develop` desde él. Haz esta inicialización fuera de la sesión de Codex antes de habilitar las protecciones e invitar a las otras tres personas.
2. En **Settings → Rules → Rulesets** o **Settings → Branches**, protege `main` y `develop`. Exige PR, al menos una aprobación de otra persona, descarte de aprobaciones obsoletas y resolución de conversaciones. Impide borrado, push forzado y bypass, incluidos administradores. Si usas reglas clásicas, activa la opción que aplica las protecciones también a administradores.
3. Tras la primera ejecución de CI, selecciona los contextos `Entorno` y `Juego` de GitHub Actions como requeridos. Exige que la rama esté actualizada con la base. Confirma los nombres tal como aparecen en la interfaz y que la regla está activa. Hasta configurar el motor, `Juego` falla deliberadamente. El PR que inicialice el motor debe incluir las seis comprobaciones reales.
4. En las opciones del repositorio deja apagados el auto-merge y el borrado automático de ramas. Usa integración inmediata por PR para este flujo. Activa protección contra secretos y push protection si el repositorio y plan lo permiten. Limita permisos de escritura y administración a quienes los necesitan.
5. Si la cuenta carece de reglas requeridas, acceso de lectura o checks exigibles, la integración queda pendiente. Revisa las reglas y diagnósticos en GitHub. [Reglas disponibles en GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

GitHub aplica estas reglas a todas las vías de escritura. Los controles de Codex ayudan durante el trabajo local. El endpoint de integración valida el SHA de origen de forma atómica. La actualización obligatoria de la rama y el CI requerido mitigan avances de la base entre consulta y solicitud. [API de integración de GitHub](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request).
