---
name: code-review
description: Revisa un diff o PR del videojuego para detectar defectos, regresiones, problemas de rendimiento y carencias de pruebas antes de integrarlo.
---

# Revisar un cambio

1. Identifica rama, base, SHA y alcance. Para un PR consulta base, SHA y diff en GitHub. Para cambios locales incluye commits desde la base común y cambios preparados, sin preparar y archivos nuevos según el pedido. Evita mezclar tareas ajenas.
2. Lee el código, sus llamadas y pruebas junto con las reglas aplicables de `AGENTS.md`. Comprueba criterios de aceptación, invariantes, errores, límites, estado, compatibilidad, arquitectura, duplicación y mantenibilidad. Revisa el costo en bucles críticos, validación de entradas, tratamiento de credenciales y riesgos de integración. Busca pruebas que podrían pasar aunque el comportamiento esté roto.
3. Cuando sea útil y esté disponible, encarga una revisión independiente a `reviewer` con base, SHA y alcance. Usa `tester` si aporta cobertura o comprobaciones dirigidas en un checkout acordado. Si la sesión no permite subagentes, revisa directamente. Conserva el código y el estado de Git, salvo autorización expresa para editar. No publiques comentarios ni aprobaciones sin permiso.
4. Valida los hallazgos con rutas de ejecución, llamadas o pruebas dirigidas seguras. Distingue observación de hipótesis y verifica aportes de especialistas antes de presentarlos.
5. Ordena los hallazgos por gravedad. **Crítica** para pérdida de datos, exposición grave o juego inutilizable. **Alta** para regresiones importantes o bloqueos de integración. **Media** para defectos alcanzables de impacto limitado. **Baja** para problemas menores concretos. Incluye archivo y línea, condición, impacto y corrección sugerida. Si no hay problemas significativos, dilo y comunica el alcance y la verificación pendiente.
