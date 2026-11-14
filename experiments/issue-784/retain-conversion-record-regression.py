"""Retain the reproducer, original/current bodies and complete regression runs."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

baseline = '29cde4eaf5d4e8b26eaff65aebdadc598d39ded0'
base = Path('ci-logs/issue-784-restart-2')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for name in ['source-conversion-body.mjs', 'primitive-identity-from-source.mjs']:
    path = Path('tools/translation/extensions') / name
    retain(path, subprocess.check_output(['git', 'show', baseline + ':' + str(path)]), baseline)
    retain(path, path.read_bytes())
paths = list(base.glob('current-conversion-record-*'))
paths.extend(base.glob('current-record-field-*'))
paths.append(base / 'current-764-typed-target-failures.json.gz')
for path in list(paths):
    if path.suffix == '.log':
        for value in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(value)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
paths.extend(Path(name) for name in [
    'tools/translation/test/source-conversion-record-bindings.test.mjs',
    'experiments/issue-784/probe-record-field-emission.mjs',
    'experiments/issue-784/retain-conversion-record-regression.py'])
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-source-conversion-binding-regression-v1', baseline=baseline,
              members=members, beforeRegressionPassed=False,
              intermediateStringOnlyCohortPassed=False,
              completeNodeCasesPassed=46, completeBunCasesPassed=46,
              completeNodeOriginalDeadlineAuditPassed=True,
              applicationParentQualified=False, fullGatePassed=False,
              newlyExecutableProductionFunctions=0, runtimeParity=False)
target = Path('docs/case-studies/issue-784/evidence/current-conversion-record-regression.json.gz')
packed = gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0)
with target.open('xb') as output:
    output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     wholeReadbackVerified=True)))
