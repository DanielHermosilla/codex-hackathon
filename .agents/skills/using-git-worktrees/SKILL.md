---
name: using-git-worktrees
description: Crea o confirma un worktree aislado en `.worktrees/` para trabajar una tarea sin tocar el checkout actual. Úsalo cuando haya trabajo ajeno o simultáneo, o dos tareas en un mismo clon.
---

# Aislar una tarea con un worktree

Adaptada de `using-git-worktrees` de obra/superpowers (MIT, Jesse Vincent) a las reglas de este repositorio. Si algo choca con `AGENTS.md` o `docs/collaboration.md`, mandan ellos.

1. **Detecta si ya estás aislado.** Ejecuta `git rev-parse --git-dir` y `git rev-parse --git-common-dir`. Si difieren y `git rev-parse --show-superproject-working-tree` no imprime nada, ya estás en un worktree: no crees otro. Informa la ruta y la rama.
2. **Usa la herramienta nativa primero.** Si Codex ofrece el modo Worktree, úsalo y confirma la base y la rama. Usa `git worktree add` solo si no hay herramienta nativa.
3. **Inspecciona antes de crear.** Ejecuta `git status --short --branch`, `git worktree list` y revisa ramas y remotos. Conserva los cambios existentes. Comprueba que la rama no exista ya ni la use otra persona.
4. **Base y rama.** Parte de una referencia verificada de `develop`, preferentemente `origin/develop` recién consultado. La rama es `feature/<nombre>` o `fix/<nombre>`. Nunca trabajes directamente en `main` ni en `develop`.
5. **Ruta.** Usa una ruta nueva bajo `.worktrees/`. Comprueba con `git check-ignore -q .worktrees` que está ignorada; este repositorio ya la ignora en `.gitignore`. Si no lo estuviera, avisa en vez de commitear el cambio por tu cuenta.
6. **Crea.** `git worktree add .worktrees/<nombre> -b <rama> <base-verificada>`. Si el sandbox lo bloquea, usa la revisión automática configurada. Si no se puede, dilo y trabaja en el checkout actual con cuidado.
7. **Prepara y comprueba la base.** Instala dependencias con `npm ci` si hay `package.json`. Ejecuta `python3 scripts/validate.py` y anota los resultados antes de editar. Si falla algo previo, informa y pregunta si seguir.
8. **Retirar un worktree** solo con autorización: comprueba que está limpio y que no tiene trabajo posterior al PR (ver `docs/collaboration.md`).

Prohibido: force push, borrar ramas sin autorización, tocar worktrees ajenos. Commit, push y PR siguen requiriendo la aprobación específica de `AGENTS.md`.

Informe final: ruta del worktree, rama, base, resultado de `validate.py` y siguiente paso.
