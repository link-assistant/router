"""Retain complete production/gate attempts and exact PR review streams."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
generation = json.loads((base / 'current-conversion-generation.json').read_bytes())
head = '358849070837f236b15540ff123ad4e20527bdd0'
assert generation['headAtStart'] == generation['headAtEnd'] == head
assert len(generation['records']) == 4 and not generation['allCommandsPassed']
assert all(row['resource']['stopped'] for row in generation['records'])
gate = json.loads((base / 'current-conversion-full-gate.memory.json').read_bytes())
assert gate['stopped'] and gate['stopThresholdBytes'] == 2866933760
assert gate['completedFingerprintPageAdvice']['exitCode'] == 1
assert 'JavaScript stage:' not in (base / 'current-conversion-full-gate.log').read_text()
for row in [gate, *(row['resource'] for row in generation['records'])]:
    assert not Path('/proc/' + str(row['pid'])).exists()
assert not Path('/proc/' + str(gate['completedFingerprintPageAdvice']['pid'])).exists()
paths = set(base.glob('current-conversion-generate-*'))
paths |= set(base.glob('current-conversion-full-gate*'))
paths |= set(base.glob('current-conversion-gh-pr-diff*'))
paths |= set(base.glob('current-conversion-local-pr-diff*'))
paths |= {base / ('current-conversion-' + name) for name in [
    'generation.json', 'generation-observer.log', 'fetch-main.log']}
paths |= {Path(name) for name in ['scripts/check-js-first-local.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/completed-fingerprint-pages.py',
    'experiments/issue-784/run-current-production-generation.py',
    'experiments/issue-784/retain-conversion-checkpoint.py']}
members, external = [], []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    raw = path.read_bytes()
    row = dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
    if path.name == 'current-conversion-local-pr-diff.patch.gz':
        row['retainedPath'] = str(destination / path.name)
        external.append(row)
    else:
        members.append(dict(row, base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-conversion-checkpoint-attempts-v1', sourceHead=head,
              members=members, externalMembers=external,
              allFourProductionFamiliesPassed=False, allSevenGateStagesUnrun=True,
              gatePageAdviserPassed=False, githubPrDiffAvailable=False,
              completeLocalPrDiffRetained=True, fullGatePassed=False,
              originalCommandsAndDeadlinesUnchanged=True,
              productionExecutableGain=0, runtimeParity=False, rustExecuted=False)
packed = gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
target = destination / 'current-conversion-checkpoint.json.gz'
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
for row in external:
    source, retained = Path(row['path']), Path(row['retainedPath'])
    assert not retained.exists()
    source.rename(retained)
    assert retained.stat().st_size == row['bytes'] and hashlib.sha256(retained.read_bytes()).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     wholeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
