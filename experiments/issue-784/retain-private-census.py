"""Retain the complete diagnostic, including its failed first attempt and inputs."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

baseline = '3beea1b2d'
baseline = subprocess.check_output(['git', 'rev-parse', baseline], text=True).strip()
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-private-closure-census.json.gz')
census = json.loads(gzip.decompress((base / 'current-private-closure-census-2.json.gz').read_bytes()))
members = []


def retain(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for path in sorted(base.glob('current-private-closure-census*')):
    if path.is_file():
        retain(path, path.read_bytes())
for name in ['census-current-private-compiler-closure.mjs', 'retain-private-census.py']:
    path = Path('experiments/issue-784') / name
    retain(path, path.read_bytes())
records = census['originalSources'] + [census['sourceTool']]
assert len(records) == 338 and len({row['path'] for row in records}) == 338
process = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE,
                           stdout=subprocess.PIPE)
for row in records:
    path = Path(row['path'])
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == row['sha256']
    assert row.get('bytes', len(raw)) == len(raw)
    process.stdin.write((baseline + ':' + str(path) + '\n').encode())
    process.stdin.flush()
    header = process.stdout.readline().split()
    assert len(header) == 3 and header[1] == b'blob'
    archived = process.stdout.read(int(header[2]))
    assert process.stdout.read(1) == b'\n' and archived == raw
    retain(path, raw)
process.stdin.close()
assert process.wait() == 0
first = json.loads((base / 'current-private-closure-census.memory.json').read_bytes())
second = json.loads((base / 'current-private-closure-census-2.memory.json').read_bytes())
assert first['exitCode'] == 1 and second['exitCode'] == 0
assert not first['stopped'] and not second['stopped']
assert all(not Path('/proc/' + str(row['pid'])).exists() for row in [first, second])
record = {'schema': 'complete-current-private-static-census-v1', 'members': members,
          'originalInputCommit': baseline, 'allOriginalInputsMatchImmutableGit': True,
          'isImmutableLaunchSnapshot': False, 'firstAttempt': first, 'secondAttempt': second,
          'productionRawByteLimit': 4194304, 'productionLimitChanged': False,
          'productionPlanProduced': False, 'compilerExecuted': False,
          'semanticAuthority': False, 'productionExecutableGain': 0,
          'runtimeParity': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'allOriginalInputsMatchImmutableGit': True,
                  'wholeReadbackVerified': True, 'evidenceBytesAfter': total + len(packed)}))
