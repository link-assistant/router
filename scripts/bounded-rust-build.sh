#!/usr/bin/env bash
# Explicit targeted exception after the complete JavaScript gate; no Cargo by default.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
execute=0
stamp=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --execute) execute=1; shift ;;
    --gate-stamp) stamp="${2:?--gate-stamp needs a path}"; shift 2 ;;
    --) shift; break ;;
    --help) echo 'Usage: scripts/bounded-rust-build.sh [--execute --gate-stamp PATH] -- check --lib|--bin NAME|--test NAME'; echo 'Or: ... -- test --test NAME [FILTER] / test --lib FILTER'; exit 0 ;;
    *) echo "Unknown wrapper option: $1" >&2; exit 2 ;;
  esac
done
python3 - "$root" "$execute" "$stamp" "$@" <<'PY'
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
import time

root, execute, stamp, *args = sys.argv[1:]
os.chdir(root)
def fail(message):
    raise SystemExit(message)
if not args or args[0] not in ('check', 'test'):
    fail('Choose one targeted check/test. No default Cargo command is permitted.')
command, *flags = args
selectors = [i for i, flag in enumerate(flags) if flag in ('--lib', '--bin', '--test')]
if len(selectors) != 1:
    fail('Exactly one --lib, --bin NAME or --test NAME target is required.')
selector = flags[selectors[0]]
allowed = {'--locked', '--offline', '--lib', '--bin', '--test'}
for flag in flags:
    if flag.startswith('-') and flag not in allowed:
        fail(f'Unsupported Cargo option: {flag}; broad builds and resource overrides are forbidden.')
positionals = []
i = 0
while i < len(flags):
    flag = flags[i]
    if flag in ('--bin', '--test'):
        if i + 1 >= len(flags) or flags[i + 1].startswith('-'):
            fail(f'{flag} requires an explicit target name')
        i += 2
    elif flag.startswith('-'):
        i += 1
    else:
        positionals.append(flag)
        i += 1
if command == 'check' and positionals:
    fail('cargo check accepts no test filter')
if command == 'test' and selector == '--bin':
    fail('Use a named integration test or a filtered --lib test.')
if command == 'test' and selector == '--lib' and len(positionals) != 1:
    fail('cargo test --lib requires one explicit test filter, not the complete library suite.')
if len(positionals) > 1:
    fail('At most one test filter is supported')
def bound(name, default, maximum):
    raw = os.environ.get(name, str(default))
    if not raw.isdecimal() or not 1 <= int(raw) <= maximum:
        fail(f'{name} must be between 1 and {maximum}')
    return int(raw)
jobs = bound('ROUTER_RUST_JOBS', 2, 2)
rss_mib = bound('ROUTER_RUST_RSS_MIB', 2048, 2048)
wall_seconds = bound('ROUTER_RUST_WALL_SECONDS', 600, 600)
cpu_seconds = bound('ROUTER_RUST_CPU_SECONDS', 300, 300)
disk_mib = bound('ROUTER_RUST_DISK_MIB', 8192, 8192)
reserve_mib = bound('ROUTER_RUST_FREE_RESERVE_MIB', 8192, 65536)
available_memory = None
for cgroup in (Path('/sys/fs/cgroup'), Path('/sys/fs/cgroup/memory')):
    for maximum_name, current_name in (('memory.max', 'memory.current'), ('memory.limit_in_bytes', 'memory.usage_in_bytes')):
        try:
            maximum = (cgroup / maximum_name).read_text().strip()
            if maximum.isdecimal() and int(maximum) < 2**60:
                remaining = max(0, int(maximum) - int((cgroup / current_name).read_text()))
                available_memory = remaining if available_memory is None else min(remaining, available_memory)
        except (FileNotFoundError, PermissionError):
            pass
if available_memory is not None:
    rss_mib = min(rss_mib, max(1, int(available_memory * 0.75 / (1024 * 1024))))
jobs = min(jobs, max(1, os.cpu_count() or 1), max(1, rss_mib // 1024))
try:
    quota, period = Path('/sys/fs/cgroup/cpu.max').read_text().split()
    if quota.isdecimal():
        jobs = min(jobs, max(1, int(quota) // int(period)))
except (FileNotFoundError, PermissionError):
    pass
common = subprocess.check_output(['git', 'rev-parse', '--git-common-dir'], text=True).strip()
repository = str(Path(common).resolve())
target = Path(os.environ.get('ROUTER_SHARED_RUST_TARGET', str(Path(tempfile.gettempdir()) / 'router-shared-rust' / hashlib.sha256(repository.encode()).hexdigest()[:16]))).resolve()
for line in subprocess.check_output(['git', 'worktree', 'list', '--porcelain'], text=True).splitlines():
    if line.startswith('worktree '):
        worktree = Path(line[9:]).resolve()
        if target == worktree or worktree in target.parents:
            fail('The shared target directory must be outside every worktree.')
plan = {'command': ['cargo', command, '--locked', *flags], 'targetDirectory': str(target), 'jobs': jobs, 'aggregateRssMiB': rss_mib, 'wallSeconds': wall_seconds, 'perProcessCpuSeconds': cpu_seconds, 'targetDiskMiB': disk_mib, 'freeReserveMiB': reserve_mib, 'debug': 0, 'incremental': False, 'execute': execute == '1'}
print(json.dumps(plan, indent=2), flush=True)
if execute != '1':
    print('Plan only. --execute and a current complete JavaScript gate stamp are required.')
    raise SystemExit(0)
if not stamp:
    fail('--execute requires --gate-stamp PATH')
if rss_mib < 512:
    fail('Less than 512 MiB of bounded available memory remains; refusing Cargo.')
checker = Path(root) / 'scripts/check-js-first-local.mjs'
if not checker.is_file():
    fail('Complete JavaScript gate verifier is absent; refusing Cargo.')
subprocess.run(['node', str(checker), '--verify-stamp', str(Path(stamp).resolve())], check=True)
target.parent.mkdir(parents=True, exist_ok=True)
if shutil.disk_usage(target.parent).free < (disk_mib + reserve_mib) * 1024 * 1024:
    fail('Insufficient free space for target budget plus free-space reserve; refusing Cargo.')
lock = Path(str(target) + '.bounded-lock')
try:
    lock.mkdir()
except FileExistsError:
    fail(f'Another shared build holds {lock}; wait for it. Do not remove an active lock.')
process = None
try:
    target.mkdir(exist_ok=True)
    env = dict(os.environ, CARGO_TARGET_DIR=str(target), CARGO_BUILD_JOBS=str(jobs), CARGO_INCREMENTAL='0', CARGO_PROFILE_DEV_DEBUG='0', CARGO_PROFILE_TEST_DEBUG='0')
    # Refuse flags which can override the resource policy inherited by rustc.
    env.pop('RUSTFLAGS', None)
    env.pop('CARGO_ENCODED_RUSTFLAGS', None)
    def limit_cpu():
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
    def disk_bytes():
        total = 0
        for entry in target.rglob('*'):
            try:
                if entry.is_file():
                    total += entry.stat().st_size
            except FileNotFoundError:
                pass  # A concurrently completed Cargo process can replace a temporary file.
        return total
    if disk_bytes() > disk_mib * 1024 * 1024:
        fail('Shared target already exceeds its disk budget; review cache cleanup separately.')
    process = subprocess.Popen(plan['command'], env=env, start_new_session=True, preexec_fn=limit_cpu)
    started = time.monotonic()
    peak_rss = peak_disk = 0
    violation = None
    while process.poll() is None:
        rows = subprocess.check_output(['ps', '-axo', 'pid=,ppid=,rss='], text=True).splitlines()
        tree = [tuple(map(int, row.split())) for row in rows if len(row.split()) == 3]
        descendants = {process.pid}
        while True:
            expanded = descendants | {pid for pid, parent, rss in tree if parent in descendants}
            if expanded == descendants:
                break
            descendants = expanded
        peak_rss = max(peak_rss, sum(rss * 1024 for pid, parent, rss in tree if pid in descendants))
        peak_disk = max(peak_disk, disk_bytes())
        if peak_rss > rss_mib * 1024 * 1024:
            violation = 'Aggregate child process RSS budget exceeded'
        elif peak_disk > disk_mib * 1024 * 1024:
            violation = 'Shared target disk budget exceeded'
        elif time.monotonic() - started > wall_seconds:
            violation = 'Wall time budget exceeded'
        elif shutil.disk_usage(target).free < reserve_mib * 1024 * 1024:
            violation = 'Free disk space fell below the reserve'
        if violation:
            os.killpg(process.pid, signal.SIGKILL)
            break
        time.sleep(0.5)
    code = process.wait()
    print(json.dumps({'peakRssBytes': peak_rss, 'peakTargetDiskBytes': peak_disk, 'wallSeconds': time.monotonic() - started, 'samplingSeconds': 0.5, 'exitCode': code, 'budgetViolation': violation}), flush=True)
    if violation:
        fail(violation)
    raise SystemExit(code if code >= 0 else 128 - code)
finally:
    if process is not None and process.poll() is None:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
    lock.rmdir()
PY
