"""PreToolUse para invocaciones Git directas reconocibles."""

import json
from pathlib import Path
import re
import shlex
import subprocess
import sys

PROTECTED = {"main", "refs/heads/main"}
RECREATE_FLAGS = {"switch": {"-C", "--force-create"}, "checkout": {"-B"}, "worktree": {"-B"}}
ROOT = Path(__file__).resolve().parents[2]


def shell_segments(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|\n")
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    segment = []
    for token in lexer:
        if token and all(char in ";&|\n" for char in token):
            if segment:
                yield segment
            segment = []
        else:
            segment.append(token)
    if segment:
        yield segment


def git_call(tokens, cwd):
    if not tokens or Path(tokens[0]).name != "git":
        return None
    index = 1
    while index < len(tokens):
        flag = tokens[index]
        if flag == "-C" and index + 1 < len(tokens):
            cwd = cwd / tokens[index + 1]
            index += 2
        elif flag == "-c" and index + 1 < len(tokens):
            index += 2
        elif flag in {"--no-pager", "--paginate", "-p", "-P"}:
            index += 1
        else:
            break
    if index < len(tokens):
        return cwd, tokens[index], tokens[index + 1:]
    return None


def push_risk(args):
    # Solo se acepta un remoto literal y refspecs explícitos, sin opciones ambiguas.
    supported = {"-u", "--set-upstream", "--dry-run", "--porcelain"}
    positional = [arg for arg in args if arg not in supported]
    if len(positional) < 2 or any(arg.startswith("-") for arg in positional):
        return "Usa un remoto y refs explícitos para publicar una rama de trabajo."
    if any(ref.startswith("+") or "*" in ref or ref.startswith(":")
           for ref in positional[1:]):
        return "Publicación forzada, masiva o de borrado bloqueada."
    if any(ref.rsplit(":", 1)[-1] in PROTECTED for ref in positional[1:]):
        return "Publica los cambios de main mediante un PR en GitHub."
    if any(not ref.rsplit(":", 1)[-1].removeprefix("refs/heads/").startswith(("feature/", "fix/"))
           or (":" in ref and not ref.split(":", 1)[1].startswith("refs/heads/"))
           for ref in positional[1:]):
        return "Publica solo ramas feature/ o fix/. Usa refs/heads/ para un destino explícito."
    return None


def denial(cwd, operation, args):
    if not cwd.resolve().is_relative_to(ROOT):
        return None
    if operation == "push":
        return push_risk(args)
    if any(flag in RECREATE_FLAGS.get(operation, ()) and target in PROTECTED
           for flag, target in zip(args, args[1:])):
        return "No se puede recrear una rama protegida desde Codex."
    changes_current_name = False
    if operation == "branch":
        flags = [arg for arg in args if arg.startswith("-")]
        if PROTECTED.intersection(args) and any(
            flag in {"--delete", "--force", "--move", "--copy"}
            or re.fullmatch(r"-[dDfmMcC]+", flag)
            for flag in flags
        ):
            return "Operación directa sobre una rama protegida bloqueada."
        changes_current_name = sum(not arg.startswith("-") for arg in args) == 1 and any(
            flag == "--move" or (re.fullmatch(r"-[mMf]+", flag) and {"m", "M"}.intersection(flag))
            for flag in flags
        )
    if operation == "update-ref" and (PROTECTED.intersection(args) or "--stdin" in args):
        return "Actualización directa o masiva de referencias protegidas bloqueada."
    if not changes_current_name and operation not in {
        "commit", "merge", "rebase", "cherry-pick", "revert", "reset", "am", "pull"
    }:
        return None
    if operation == "merge" and args[:1] == ["--abort"]:
        return None
    result = subprocess.run(
        ["git", "symbolic-ref", "--quiet", "HEAD"], cwd=cwd,
        capture_output=True, text=True, timeout=2,
    )
    if result.returncode != 0:
        return "No se pudo confirmar una rama activa. Abre una rama de trabajo antes de continuar."
    if result.stdout.strip() in PROTECTED:
        return "Operación bloqueada en main. Para trabajar, usa feature/ o fix/."
    return None


def respond(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }}))


def main():
    try:
        payload = json.load(sys.stdin)
        if payload["hook_event_name"] != "PreToolUse" or payload["tool_name"] != "Bash":
            return
        details = payload["tool_input"]
        cwd = Path(payload["cwd"])
        if details.get("workdir"):
            cwd = cwd / details["workdir"]
        command = details["command"]
        try:
            segments = list(shell_segments(command))
        except ValueError:
            # Una construcción de shell fuera del analizador queda a cargo de Codex y GitHub.
            return
        for tokens in segments:
            # Reconoce un cambio literal de directorio dentro del mismo comando.
            if len(tokens) == 2 and tokens[0] == "cd":
                cwd = cwd / tokens[1]
            call = git_call(tokens, cwd)
            reason = denial(*call) if call else None
            if reason:
                respond(reason)
                return
    except (AttributeError, KeyError, TypeError, ValueError, OSError, subprocess.SubprocessError):
        respond("No se pudo verificar la operación. Revisa la ruta, Git y el estado del repositorio.")


if __name__ == "__main__":
    main()
