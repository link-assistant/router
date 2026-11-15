"""Retain the corrected complete gate, including all completed deadline files."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = sorted(list(base.glob('current-final-composed-full-gate*'))
               + list(base.glob('current-final-composed-preflight-pages*')))
paths += sorted(path for path in Path('js/node_modules/.node-case-deadlines').rglob('*')
                if path.is_file())
paths += [Path(name) for name in [
    'scripts/check-js-first-local.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/completed-fingerprint-pages.py',
    'experiments/issue-784/release-inactive-repository-pages.py',
    'docs/case-studies/issue-784/current-final-composed-gate.md',
]]
assert len(paths) == len(set(paths))
receipt = json.loads((base / 'current-final-composed-full-gate.memory.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert receipt['stopThresholdBytes'] == 2866933760
assert not Path('/proc/' + str(receipt['pid'])).exists()
members = []
for path in paths:
    assert not path.is_symlink()
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-corrected-composed-gate-v1',
              headSha=subprocess.check_output(['git', 'rev-parse', 'e15197054'], text=True).strip(),
              receipt=receipt, members=members, parentHeapMiB=128,
              inheritedChildHeapMiB=512, nodeVersion='20.20.2',
              bunVersion='1.4.4', installedTypeScriptVersion='5.9.3',
              originalDeadlinesChanged=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
before = sum(p.stat().st_size for root in roots for p in root.rglob('*')
             if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert before + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-final-composed-gate.json.gz')
with target.open('xb') as output:
    output.write(packed)
decoded = gzip.decompress(target.read_bytes())
assert decoded == raw
for row in json.loads(decoded)['members']:
    content = base64.b64decode(row['base64'], validate=True)
    assert len(content) == row['bytes']
    assert hashlib.sha256(content).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     completeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))
