#!/usr/bin/env python3
"""Ejecuta las comprobaciones del entorno y las etapas del juego configuradas."""

import argparse
from pathlib import Path
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parent.parent
STAGES = ("format", "lint", "static", "test", "build", "integration")
HARNESS = [sys.executable, "-B", "-m", "unittest", "discover", "-s", "tests", "-v"]


def load_checks():
    with (ROOT / "checks.toml").open("rb") as source:
        config = tomllib.load(source)
    checks = config.get("checks")
    if set(config) != {"checks"} or not isinstance(checks, dict):
        raise ValueError("checks.toml debe contener una tabla [checks].")
    for stage, commands in checks.items():
        if stage not in STAGES:
            raise ValueError(f"Etapa desconocida en checks.toml: {stage}")
        if not isinstance(commands, list) or any(
            not isinstance(argv, list) or not argv or not argv[0]
            or not all(isinstance(arg, str) and "\0" not in arg for arg in argv)
            for argv in commands
        ):
            raise ValueError(f"{stage} debe contener arreglos de argumentos válidos.")
    return checks


def run_stage(name, commands):
    for argv in commands:
        try:
            result = subprocess.run(argv, cwd=ROOT, stdin=subprocess.DEVNULL)
        except OSError as error:
            print(f"FALLÓ {name} · {error}", flush=True)
            return False
        if result.returncode:
            print(f"FALLÓ {name} · {argv[0]} (salida {result.returncode})", flush=True)
            return False
    print(f"PASÓ {name}", flush=True)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--harness", action="store_true", help="Solo pruebas del entorno.")
    modes.add_argument("--stage", choices=STAGES, help="Comprueba una etapa del juego.")
    modes.add_argument("--strict", action="store_true", help="Exige todas las etapas del juego.")
    args = parser.parse_args()

    try:
        checks = load_checks()
    except (OSError, ValueError) as error:
        print(f"FALLÓ configuración · {error}", file=sys.stderr)
        return 1

    failed = False
    if not args.stage:
        failed = not run_stage("entorno", [HARNESS])
    if args.harness:
        return int(failed)

    missing = False
    for stage in (args.stage,) if args.stage else STAGES:
        commands = checks.get(stage)
        if not commands:
            print(f"SIN CONFIGURAR {stage}", flush=True)
            missing = True
        elif not run_stage(stage, commands):
            failed = True
    if failed:
        return 1
    if missing and (args.strict or args.stage):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
