#!/usr/bin/env python3
"""Comprueba el alcance local de una rama antes de revisar o integrar."""

import argparse
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def git(*args):
    result = subprocess.run(["git", *args], cwd=ROOT, stdout=subprocess.PIPE, text=True)
    if result.returncode:
        if result.stdout:
            print(result.stdout, file=sys.stderr, end="")
        result.check_returncode()
    return result.stdout


def snapshot():
    return (
        git("branch", "--show-current").strip(),
        git("rev-parse", "--verify", "HEAD").strip(),
        git("status", "--porcelain=v1", "--untracked-files=all"),
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base", help="Referencia o SHA de la rama destino que se revisará.")
    parser.add_argument("--strict", action="store_true", help="Exige estado limpio y validación completa.")
    parser.add_argument("--detached-head", metavar="SHA",
                        help="Permite un worktree con HEAD separado en el SHA exacto del PR.")
    args = parser.parse_args()
    if args.detached_head and not args.strict:
        parser.error("--detached-head requiere --strict.")
    try:
        branch, head, dirty = snapshot()
        if args.detached_head:
            if branch or args.detached_head != head:
                raise ValueError("Se requiere HEAD separado en el SHA exacto del PR.")
        elif not branch.startswith(("feature/", "fix/")):
            raise ValueError(f"Rama de origen incorrecta: {branch or 'HEAD separado'}.")
        if args.strict and dirty:
            raise ValueError("Hay cambios locales. Se requiere un checkout limpio del SHA del PR.")
        base = git("rev-parse", "--verify", "--end-of-options", args.base + "^{commit}").strip()
        common = git("merge-base", base, head).strip()
        if args.strict and common != base:
            raise ValueError("La rama de origen necesita incorporar la base actual.")
        if args.strict and head == base:
            raise ValueError("La rama de origen no aporta commits a la base.")
        delta = common + "..." + head
        git("diff", "--check", delta)
        git("diff", "--check", "--cached", "HEAD")
        git("diff", "--check")
        print(f"Origen {branch or 'HEAD separado'} · {head}\nBase solicitada {base}\nBase común {common}",
              flush=True)
        for label, change in (
            ("Archivos en commits", git("diff", "--name-status", delta)),
            ("Cambios locales", dirty),
        ):
            print(f"{label}\n{change.rstrip() or '(vacío)'}", flush=True)
        if args.strict:
            validation = subprocess.run([sys.executable, str(ROOT / "scripts/validate.py"), "--strict"],
                                        cwd=ROOT)
            if validation.returncode or snapshot() != (branch, head, dirty):
                print("BLOQUEADO · la validación falló, está incompleta o cambió el estado local.",
                      file=sys.stderr)
                return validation.returncode or 1
            print("Validación local completa. Revisa las protecciones y el PR en GitHub.")
        return 0
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"BLOQUEADO · {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
