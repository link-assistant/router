"""Retain complete original/current standard-body binding checks and failures."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

baseline = '4ec277bcf'
base = Path('ci-logs/issue-784-restart-2')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


sources = [Path('tools/translation/extensions') / name for name in [
    'standard-source-frame.mjs', 'standard-option-callback-body.mjs']]
for path in sources:
    retain(path, subprocess.check_output(['git', 'show', baseline + ':' + str(path)]), baseline)
paths = [*sources, *base.glob('current-standard-*.log'),
         *base.glob('current-standard-*.memory.json')]
paths = [path for path in paths if path.name != 'current-standard-retention.log']
for original in list(paths):
    if original.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', original.read_text()):
            directory = Path(name)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
paths.extend(Path('tools/translation/test') / name for name in [
    'standard-method-record-bindings.test.mjs', 'standard-option-filter.test.mjs',
    'standard-option-borrows.test.mjs', 'option-borrowed-str-equality.test.mjs'])
paths.append(Path(__file__))
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-standard-record-binding-regression-v1', baseline=baseline,
              members=members, beforeRegressionPassed=False,
              completeNodeCasesPassed=16, completeBunCasesPassed=16,
              successfulNodeOriginalDeadlineAuditsPassed=True,
              equalityApplicationCohortQualified=False, combinedAttemptsPassed=False,
              fullGatePassed=False, newlyExecutableProductionFunctions=0,
              runtimeParity=False, rustExecuted=False)
target = Path('docs/case-studies/issue-784/evidence/current-standard-record-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), wholeReadbackVerified=True)))
