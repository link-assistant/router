"""Retain the complete reproducing and passing observer-cleanup cohort."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = set(base.glob('project-byte-observer-*'))
audits = []
for label, failures in [('before', 1), ('after', 0)]:
    log = (base / ('project-byte-observer-' + label + '-node.log')).read_text()
    names = re.findall(r'^Complete Node deadline evidence: (.+)$', log, re.M)
    assert len(names) == 1
    folder = Path(names[0]).resolve()
    assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
    audit = json.loads((folder / 'case-deadlines.json').read_bytes())
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert audit['passed'] and not audit['durationBreaches']
    assert len(audit['records']) == 2 and audit['originalFailedCompletionEvents'] == failures
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['allCaseLimitsUnchanged'] and not audit['originalCaseLimitsChanged']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths.update(path.relative_to(root) for path in folder.iterdir())
    audits.append(dict(label=label, audit=audit, terminal=terminal))
bun = (base / 'project-byte-observer-after-bun.log').read_text()
assert '2 pass\n 0 fail' in bun and 'Ran 2 tests across 1 file.' in bun
matched = re.findall(r'^\(pass\) (.+) \[([0-9.]+)(ms|s)\]$', bun, re.M)
assert len(matched) == 2
for _, duration, unit in matched:
    assert float(duration) * (1000 if unit == 's' else 1) < 60000
for path in paths:
    if path.name.endswith('-resource.json'):
        record = json.loads(path.read_bytes())
        assert not record['stopped'] and not Path('/proc/' + str(record['pid'])).exists()
source_path = 'tools/translation/test/project-proof-byte-operation.test.mjs'
paths.update([Path(source_path), Path(__file__).relative_to(root)])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
before = subprocess.check_output(['git', 'show', '339b9e0edf1f3d3923308ac299c89a3d7e9bf137:' + source_path])
record = dict(schema='complete-project-byte-observer-receiving-v1', members=members,
              beforeSource=before.decode(), beforeSourceSha256=hashlib.sha256(before).hexdigest(),
              audits=audits, nodeCasesPassed=2, bunCasesPassed=2, originalBoundsChanged=False,
              productionExecutableGain=0, fullGatePassed=False, runtimeParity=False,
              rustExecuted=False, rawWorkingCopiesRetired=False)
raw = json.dumps(record).encode()
target = Path('docs/case-studies/issue-784/evidence/project-byte-observer-20261110.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(packet=str(target), bytes=target.stat().st_size,
                      sha256=hashlib.sha256(target.read_bytes()).hexdigest(), members=len(members))))
