"""Retain complete before/after workflow controls and failed optional Bun run."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = list(base.glob('current-workflow-equation-*'))
paths += list(base.glob('current-764-lint*'))
paths += [Path(path) for path in [
    'scripts/prepare-matrix-draft-workflow.mjs',
    'scripts/test/check-js-first-workflows.test.mjs',
    '.github/workflows/javascript-first.yml',
    'experiments/issue-784/retain-workflow-equation.py',
]]
members = []


def retain(path, raw):
    members.append(dict(path=path, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for path in paths:
    retain(str(path), path.read_bytes())
for path in ['scripts/prepare-matrix-draft-workflow.mjs',
             'scripts/test/check-js-first-workflows.test.mjs']:
    retain('git:764222b6e6d4f0ce1efb0341396cfb6a87661e85:' + path,
           subprocess.check_output(['git', 'show', '764222b6e6d4f0ce1efb0341396cfb6a87661e85:' + path]))
record = dict(schema='whole-workflow-diagnostic-equation-receiving-v1', members=members,
              baselineNodePasses=36, baselineNodeFailures=1, currentNodePasses=37,
              currentBunPasses=36, currentBunFailures=1,
              optionalBunOriginalImplicitDeadlineFailure=True,
              currentCiHead='764222b6e6d4f0ce1efb0341396cfb6a87661e85',
              fullGatePassed=False, runtimeParity=False)
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
target = Path('docs/case-studies/issue-784/evidence/current-workflow-equation.json.gz')
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                      wholeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
