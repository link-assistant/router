"""Retain complete cold-budget sources, observations and receiving failures."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = {Path(name) for name in [
    'tools/translation/static-source-items.mjs',
    'tools/translation/rust-structure.mjs',
    'tools/translation/rust-item-boundaries.mjs',
    'tools/translation/original-json-intrinsics.mjs',
    'tools/translation/test/static-source-items.test.mjs',
    'tools/translation/test/static-source-record-copy.test.mjs',
    'tools/translation/test/static-source-budget.test.mjs',
    'experiments/issue-784/measure-static-cold-budget.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
    'experiments/issue-784/release-inactive-repository-pages.py',
    'experiments/issue-784/advise-inactive-git-pack-pages.py',
    __file__]}
for label in ['current-static-budget-node', 'current-static-budget-bun',
              'current-static-cold-budget', 'current-static-cold-original-node',
              'current-static-cold-original-bun']:
    paths.update(base / (label + suffix) for suffix in ['.log', '.memory.json'])
paths.update(base / name for name in [
    'current-static-cold-budget.json.gz',
    'current-static-budget-preflight-pages.json.gz',
    'current-static-budget-preflight-pages.log',
    'current-static-budget-preflight-git-pages.json',
    'current-static-budget-preflight-git-pages.log'])
audits = []
for name, expected in [('complete-h9vI1T', 0), ('complete-9G4enp', 1)]:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['exitCode'] == expected
    if expected == 0:
        assert terminal['auditSummary']['passed']
        assert terminal['auditSummary']['durationBreaches'] == 0
    paths.update(path for path in folder.rglob('*') if path.is_file())
    audits.append(dict(path=str(folder), exitCode=expected,
                       auditSummary=terminal['auditSummary']))
for name in ['static-source-items.test.mjs', 'static-source-record-copy.test.mjs']:
    path = 'tools/translation/test/' + name
    assert Path(path).read_bytes() == subprocess.check_output([
        'git', 'show', '815527efb3db40ca7e650ba9aaae47bfa1529dab:' + path])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    if path.name.endswith('.memory.json'):
        receipt = json.loads(raw)
        assert receipt['stopThresholdBytes'] == 2866933760
        for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds']]:
            assert not Path('/proc/' + str(pid)).exists()
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-static-cold-budget-receiving-v1', members=members,
              predecessor='815527efb3db40ca7e650ba9aaae47bfa1529dab',
              focusedNodeCases=3, focusedBunCases=3, audits=audits,
              originalNodeCompletedCases=0, originalBunCompletedCases=6,
              originalNodeMemoryGuard=True, originalBunMemoryGuard=True,
              originalAssertionsAndDeadlinesUnchanged=True,
              fullReceivingPassed=False, fullGatePassed=False,
              executableGain=0, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for folder, children, names in os.walk(root):
        if folder == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(folder) / name).stat().st_size for name in names
                     if not (Path(folder) / name).is_symlink())
assert total + len(packed) < 500000000
target = Path('docs/case-studies/issue-784/evidence/current-static-cold-budget.json.gz')
with target.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes']
    assert hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), members=len(members), bytes=len(packed),
                     evidenceTotalAfterBytes=total + len(packed))))
