import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = ROOT / ".harness"
STAGES = ("format", "lint", "static", "test", "build", "integration")


class RepositoryTest(unittest.TestCase):
    def setUp(self):
        SCRATCH.mkdir(exist_ok=True)
        sandbox = tempfile.TemporaryDirectory(prefix="repositorio con espacios ", dir=SCRATCH)
        self.addCleanup(sandbox.cleanup)
        self.repo = Path(sandbox.name)
        self.env = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1")
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.name", "Pruebas locales")
        self.git("config", "user.email", "pruebas@example.invalid")
        for path in (".codex/hooks.json", ".codex/hooks/protect_branches.py",
                     "scripts/validate.py", "scripts/feature-status.py"):
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, target)
        # El fixture decide sus etapas sin instalar las dependencias del juego.
        (self.repo / "checks.toml").write_text("[checks]\n", encoding="utf-8")
        self.nested = self.repo / "carpeta anidada"
        self.nested.mkdir()
        (self.nested / "nota.txt").write_text("base\n", encoding="utf-8")
        # Prueba pequeña del fixture, independiente de esta suite de integración.
        tests = self.repo / "tests"
        tests.mkdir()
        (tests / "test_fixture.py").write_text(
            "from pathlib import Path\n"
            "import unittest\n"
            "class Fixture(unittest.TestCase):\n"
            "    def test_base(self):\n"
            "        self.assertTrue(Path('carpeta anidada/nota.txt').is_file())\n",
            encoding="utf-8",
        )
        (self.repo / ".gitignore").write_text("__pycache__/\n", encoding="utf-8")
        self.git("add", ".")
        self.git("commit", "-qm", "Base del fixture")
        self.git("branch", "develop")

    def run_command(self, *args, cwd=None, stdin=None, check=False):
        return subprocess.run(args, cwd=cwd or self.repo, env=self.env, input=stdin,
                              text=True, capture_output=True, check=check, timeout=20)

    def git(self, *args):
        return self.run_command("git", *args, check=True).stdout.strip()

    def hook(self, command, *, workdir=None):
        settings = json.loads((self.repo / ".codex/hooks.json").read_text(encoding="utf-8"))
        group, = settings["hooks"]["PreToolUse"]
        self.assertRegex("Bash", group["matcher"])
        handler, = group["hooks"]
        self.assertEqual(handler["type"], "command")
        details = {"command": command}
        if workdir:
            details["workdir"] = str(workdir)
        payload = {"cwd": str(self.nested), "hook_event_name": "PreToolUse",
                   "tool_name": "Bash", "tool_input": details}
        result = self.run_command("bash", "-c", handler["command"], cwd=self.nested,
                                  stdin=json.dumps(payload), check=True)
        if result.stdout:
            output = json.loads(result.stdout)["hookSpecificOutput"]
            self.assertEqual(output["hookEventName"], "PreToolUse")
            self.assertEqual(output["permissionDecision"], "deny")
            return output["permissionDecisionReason"]
        return None

    def feature(self, *, commit_change=False):
        self.git("switch", "-qc", "feature/pausa", "develop")
        (self.nested / "nota.txt").write_text("pausa\n", encoding="utf-8")
        if commit_change:
            self.git("add", "carpeta anidada/nota.txt", "checks.toml")
            self.git("commit", "-qm", "Añade pausa")

    def set_checks(self, *, failed_test=False):
        commands = []
        for stage in STAGES:
            code = 7 if failed_test and stage == "test" else 0
            argv = [sys.executable, "-c", f"raise SystemExit({code})"]
            commands.append(f"{stage} = [{json.dumps(argv)}]")
        (self.repo / "checks.toml").write_text("[checks]\n" + "\n".join(commands), encoding="utf-8")

    def validate(self, *args):
        return self.run_command(sys.executable, str(self.repo / "scripts/validate.py"),
                                *args, cwd=self.nested)

    def preflight(self, *args):
        return self.run_command(sys.executable, str(self.repo / "scripts/feature-status.py"),
                                "develop", *args, cwd=self.nested)

    def test_blocks_protected_branches_from_nested_directory(self):
        for branch in ("main", "develop"):
            with self.subTest(branch=branch):
                self.git("switch", "-q", branch)
                self.assertIn("main o develop", self.hook("git commit -m pausa"))
                self.assertIsNotNone(self.hook("git merge feature/pausa"))
                self.assertIsNotNone(self.hook("git branch -m nuevo-nombre"))
                self.assertIsNone(self.hook("git status --short"))
        self.assertIsNotNone(self.hook(f"git -C {shlex.quote(str(self.repo))} commit -m prueba"))
        self.assertIsNotNone(self.hook("git commit -m prueba", workdir=self.repo))
        self.assertIsNotNone(self.hook("git branch -f main HEAD"))
        self.assertIsNotNone(self.hook("git switch -C main develop"))
        self.assertIsNotNone(self.hook("git checkout -B develop main"))
        self.assertIsNotNone(self.hook("git worktree add -B develop otro main"))

    def test_allows_feature_and_denies_risky_pushes(self):
        self.feature()
        self.assertIsNone(self.hook("git commit -m 'pausa; reanudar'"))
        self.assertIsNone(self.hook("git push -u origin feature/pausa:refs/heads/feature/pausa"))
        self.assertIsNone(self.hook("echo 'git push --force origin main'"))
        for command in (
            "git push", "git push origin HEAD", "git push origin main",
            "git push origin feature/pausa:refs/heads/develop",
            "git push --force-with-lease origin feature/pausa",
            "git push origin +feature/pausa", "git push origin :develop",
            "git status && git push --mirror origin",
            "git status\ngit push origin develop",
        ):
            with self.subTest(command=command):
                self.assertIsNotNone(self.hook(command), command)

    def test_prepares_review_without_changing_git_state(self):
        self.feature()
        before = self.git("status", "--porcelain")
        result = self.preflight()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("feature/pausa", result.stdout)
        self.assertIn("nota.txt", result.stdout)
        self.assertEqual(self.git("status", "--porcelain"), before)
        self.assertNotEqual(self.preflight("--strict").returncode, 0)

    def test_missing_test_is_reported_and_blocks_integration(self):
        self.feature(commit_change=True)
        result = self.validate("--stage", "test")
        self.assertEqual(result.returncode, 2)
        self.assertIn("SIN CONFIGURAR test", result.stdout)
        self.assertEqual(self.validate().returncode, 0)
        result = self.preflight("--strict")
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("BLOQUEADO", result.stderr)

    def test_failed_test_blocks_integration(self):
        self.set_checks(failed_test=True)
        self.feature(commit_change=True)
        result = self.preflight("--strict")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("FALLÓ test", result.stdout)
        self.assertIn("salida 7", result.stdout)
        self.assertIn("BLOQUEADO", result.stderr)

    def test_strict_local_validation_accepts_complete_clean_fixture(self):
        self.set_checks()
        self.feature(commit_change=True)
        result = self.preflight("--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Validación local completa", result.stdout)

    def test_target_advance_blocks_integration(self):
        self.set_checks()
        self.feature(commit_change=True)
        self.git("switch", "-q", "develop")
        self.git("commit", "--allow-empty", "-qm", "La base avanzó")
        self.git("switch", "-q", "feature/pausa")
        result = self.preflight("--strict")
        self.assertEqual(result.returncode, 1)
        self.assertIn("incorporar la base actual", result.stderr)

    def test_detached_worktree_accepts_only_the_reviewed_sha(self):
        self.set_checks()
        self.feature(commit_change=True)
        head = self.git("rev-parse", "HEAD")
        worktree = self.repo / "worktree de revisión"
        self.git("worktree", "add", "-q", "--detach", str(worktree), head)
        self.addCleanup(self.git, "worktree", "remove", str(worktree))
        other = self.git("rev-parse", "develop")
        for expected_head, status in ((head, 0), (other, 1)):
            result = self.run_command(sys.executable, str(worktree / "scripts/feature-status.py"),
                                      "develop", "--strict", "--detached-head", expected_head,
                                      cwd=worktree)
            self.assertEqual(result.returncode, status, result.stderr)


if __name__ == "__main__":
    unittest.main()
