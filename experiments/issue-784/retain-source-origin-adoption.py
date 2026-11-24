"""Retain whole owning-producer sources, histories and complete receiving attempts."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

baseline = '9e828f51a'
base = Path('ci-logs/issue-784-restart-2')
source_paths = subprocess.check_output(
    ['git', 'diff', '--name-only', baseline, '--', 'tools/translation'], text=True
).splitlines()
assert len(source_paths) == 16
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for name in source_paths:
    path = Path(name)
    retain(path, subprocess.check_output(['git', 'show', baseline + ':' + name]), baseline)
    retain(path, path.read_bytes())
paths = sorted(base.glob('current-source-origin-*'))
for path in list(paths):
    if path.suffix == '.log':
        for value in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(value)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
paths.extend(Path('experiments/issue-784') / name for name in [
    'retain-source-origin-adoption.py', 'current-source-origin-adoption-plan.md'])
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='whole-source-origin-producer-adoption-v1', baseline=baseline,
              members=members, nodeWholeReceivingCasesPassed=13,
              nodeOriginalAsciiCasesPassed=4, nodeOriginalAsciiDeadlineAuditPassed=True,
              originalDeadlineMs=60000, originalAsciiDurationMs=49748.538431,
              bunOriginalAsciiQualified=False, bunReceivingReportedPasses=12,
              bunWholeReceivingCohortQualified=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, runtimeParity=False)
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
target = Path('docs/case-studies/issue-784/evidence/current-source-origin-adoption.json.gz')
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     wholeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
