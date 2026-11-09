"""Retain the complete fixed-record diagnostic and receiving attempts."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
paths = {Path(name) for name in [
    'tools/translation/static-source-items.mjs',
    'tools/translation/test/static-source-items.test.mjs',
    'tools/translation/test/static-source-record-copy.test.mjs',
    'experiments/issue-784/measure-fixed-record-copy.mjs']}
for label in ['current-fixed-record-measure', 'current-fixed-record-node',
              'current-fixed-record-bun', 'current-fixed-record-focused-node',
              'current-fixed-record-focused-bun']:
    paths |= {base / (label + suffix) for suffix in ['.log', '.memory.json']}
paths |= {base / name for name in ['current-fixed-record-measure.json',
    'current-fixed-record-precheck-pages.json.gz', 'current-fixed-record-precheck-pages.log']}
for name in ['complete-AWKgJz', 'complete-g8b5gF']:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['exitCode'] == (0 if name == 'complete-g8b5gF' else 1)
    paths |= {path for path in folder.rglob('*') if path.is_file()}
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    if path.name.endswith('.memory.json'):
        report = json.loads(raw)
        assert not Path('/proc/' + str(report['pid'])).exists()
        for pid in report['stoppedOwnedProcessIds']:
            assert not Path('/proc/' + str(pid)).exists()
    members.append(dict(path=str(path), bytes=len(raw),
        sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-static-record-copy-receiving-v1',
    originalCommit='3b19785353c0a004efc62ab675a97b99c8a2e5a1', members=members,
    focusedNodePassed=True, focusedBunPassed=True, originalWholeNodePassed=False,
    originalWholeBunPassed=False, originalAssertionsAndDeadlinesRetained=True,
    nodeVersion='20.20.2', bunVersion='1.4.4', productionExecutableGain=0,
    runtimeParity=False, fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, names in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in names
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
target = Path('docs/case-studies/issue-784/evidence/current-static-record-copy.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), members=len(members), bytes=len(packed),
    evidenceTotalAfterBytes=total+len(packed), originalWholeReceivingPassed=False)))
