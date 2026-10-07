#!/usr/bin/env python3
"""Run every unit shard and bounded default-parallel with_command repetitions."""

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / "ci-logs"
LOGS.mkdir(exist_ok=True)
ENVIRONMENT = {
    **os.environ,
    "CARGO_BUILD_JOBS": "1",
    "CARGO_PROFILE_DEV_DEBUG": "0",
    "CARGO_PROFILE_TEST_CODEGEN_UNITS": "1024",
    "RUSTC_WRAPPER": str(ROOT / "experiments/issue-703/rustc_memory_wrapper.py"),
}
# CI has no agent-specific override; the fallback-home unit test requires its
# absence. Sanitize only test subprocesses, preserving the parent environment.
ENVIRONMENT.pop("CODEX_HOME", None)
COMMAND = ["cargo", "test", "--locked", "--lib", "--all-features"]


def run(command, log, environment=ENVIRONMENT):
    with (LOGS / log).open("wb") as output:
        subprocess.run(command, cwd=ROOT, env=environment, stdout=output,
                       stderr=output, check=True)


run(["rust-script", "experiments/issue-703/shard-unit-tests.rs"],
    "prepare-unit-shards.log")
inventory = set()
for shard in range(8):
    environment = {**ENVIRONMENT, "RUSTC_WORKSPACE_WRAPPER": str(
        ROOT / f"target/local-unit-shards/shard-{shard}.py")}
    print(f"Compile and run default-parallel unit shard {shard}", flush=True)
    run(COMMAND + ["--", "--list"], f"unit-shard-{shard}-list.log", environment)
    run(COMMAND, f"unit-shard-{shard}.log", environment)
    inventory.update(re.findall(r"^([\w:]+): test$",
                                (LOGS / f"unit-shard-{shard}-list.log").read_text(),
                                re.MULTILINE))
(LOGS / "unit-shards-test-inventory.txt").write_text("\n".join(sorted(inventory)) + "\n")
print(f"All {len(inventory)} distinct unit tests passed", flush=True)

# Work only on the AST-generated ignored copy, retaining every wrapper test in
# one compilation. Other tests' functions are disabled, never production logic.
filtered = ROOT / "target/issue-709-with-command"
if filtered.exists():
    shutil.rmtree(filtered)
shutil.copytree(ROOT / "target/local-unit-shards/src", filtered / "src")
for path in (filtered / "src").rglob("*.rs"):
    enabled = "0" if path.name.startswith("with_command") else "1"
    text = path.read_text()
    path.write_text(re.sub(r'^\s*#\[cfg\(router_local_unit_shard = "[0-7]"\)\]',
                           f'#[cfg(router_local_unit_shard = "{enabled}")]',
                           text, flags=re.MULTILINE))
for entry in ROOT.iterdir():
    if entry.name not in ("src", "target"):
        (filtered / entry.name).symlink_to(entry, target_is_directory=entry.is_dir())
wrapper = filtered / "with-command.py"
wrapper.write_text(
    "#!/usr/bin/env python3\nimport os,sys\na=sys.argv[1:]\n"
    f"if '--test' in a: a=[{str(filtered / 'src/lib.rs')!r} if x=='src/lib.rs' else x for x in a]\n"
    "a += ['--cfg', 'router_local_unit_shard=\"0\"', '--check-cfg', "
    "'cfg(router_local_unit_shard, values(\"0\",\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\"))']\n"
    "os.execv(a[0],a)\n"
)
wrapper.chmod(0o700)
environment = {**ENVIRONMENT, "RUSTC_WORKSPACE_WRAPPER": str(wrapper)}
run(COMMAND + ["--no-run", "--message-format=json"], "with-command-build.jsonl", environment)
artifacts = [json.loads(line) for line in
             (LOGS / "with-command-build.jsonl").read_text().splitlines()
             if line.startswith('{"reason":')]
binaries = [item["executable"] for item in artifacts
            if item["reason"] == "compiler-artifact" and item.get("executable")]
assert len(binaries) == 1, binaries
binary = binaries[0]
run([binary, "with_command", "--list"], "with-command-inventory.log", environment)
wrapper_tests = re.findall(r"^(with_command::[\w:]+): test$",
                          (LOGS / "with-command-inventory.log").read_text(), re.MULTILINE)
assert set(wrapper_tests) == {name for name in inventory if name.startswith("with_command::")}
print(f"Repeat all {len(wrapper_tests)} wrapper tests with default parallelism", flush=True)
with tempfile.TemporaryDirectory(prefix="issue-709-parallel-") as temporary:
    parallel_environment = {**environment, "TMPDIR": temporary, "TMP": temporary, "TEMP": temporary}
    for iteration in range(20):
        run([binary, "with_command", "--nocapture"],
            f"with-command-repeat-{iteration}.log", parallel_environment)

    def concurrent(worker):
        for iteration in range(5):
            run([binary, "with_command", "--nocapture"],
                f"with-command-concurrent-{worker}-{iteration}.log", parallel_environment)

    with ThreadPoolExecutor(max_workers=4) as workers:
        list(workers.map(concurrent, range(4)))
print("20 sequential and 20 simultaneous-process suite repetitions passed", flush=True)

# The actual native verifier runs the affected area and all its integration
# targets. The wrapper only bounds libtest compilation within this workspace.
run(["cargo", "run", "--locked", "--bin", "router", "--", "verify", "--area",
     "anthropic-mock-contracts", "--output", "ci-logs/native-verifier/result.json"],
    "native-verifier.log", environment)
print("Native anthropic-mock-contracts verifier passed", flush=True)
