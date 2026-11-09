"""Finite full-scan comparison against the complete published controller."""
import argparse
import base64
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import types

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', default='current-allocation-path-measure')
parser.add_argument('--candidate', type=Path, default=Path('scripts/propose-core-adoption.py'))
args = parser.parse_args()
assert args.prefix and all(c.isalnum() or c in '-_' for c in args.prefix)
base = Path('ci-logs/issue-784-restart-2')
path = 'scripts/propose-core-adoption.py'
old = subprocess.check_output(['git', 'show', '3b19785353c0a004efc62ab675a97b99c8a2e5a1:' + path])
new = args.candidate.read_bytes()
source_rows = [('original', path, old)]
if args.candidate != Path(path):
    source_rows.append(('current', path, Path(path).read_bytes()))
source_rows.append(('candidate', str(args.candidate), new))
modules = []
for name, source_path, raw in source_rows:
    module = types.ModuleType(name)
    exec(compile(raw, path, 'exec'), module.__dict__)
    modules.append(module)
spec = importlib.util.spec_from_file_location('independent_controls', 'scripts/test/fixtures/core-adoption-allocation.py')
controls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(controls)
results, rounds = [], []
with tempfile.TemporaryDirectory(prefix='allocation-paths-', dir='experiments/issue-784') as directory:
    root = Path(directory).resolve()
    for index, module in enumerate(modules):
        parent = root / str(index)
        parent.mkdir()
        results.append(controls.check(module, parent))
    fixture = root / 'complete'
    fixture.mkdir()
    for at in range(16):
        folder = fixture / str(at)
        folder.mkdir()
        for offset in range(32):
            (folder / str(offset)).write_bytes(b'complete accounting input\n')
    expected = controls.expected(fixture)
    for round_number in range(4):
        order = list(range(len(modules)))
        if round_number % 2:
            order.reverse()
        for index in order:
            started = time.monotonic_ns()
            for iteration in range(24):
                assert modules[index].allocation(fixture) == expected
            rounds.append(dict(round=round_number, source=source_rows[index][0],
                completeScans=24, nanoseconds=time.monotonic_ns() - started, observations=expected))
record = dict(schema='complete-allocation-path-comparison-v1',
    sources=[dict(path=source_path, version=version, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        base64=base64.b64encode(raw).decode()) for version, source_path, raw in source_rows],
    controlsSource=dict(path=str(Path(spec.origin)), base64=base64.b64encode(Path(spec.origin).read_bytes()).decode()),
    independentControls=results, alternatingRounds=rounds,
    originalWorkflowDeadlineQualified=False, fullGatePassed=False, runtimeParity=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = base / (args.prefix + '.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), rounds=rounds, completeBytesRetained=True,
    originalWorkflowDeadlineQualified=False)))
