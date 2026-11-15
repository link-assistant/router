"""Retain whole Core import assertions and the resource-stopped baseline."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

test = Path('tools/translation/test/whole-owner-core-producer-candidate.test.mjs')
base = Path('ci-logs/issue-784-restart-2')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(test, subprocess.check_output(['git', 'show', '1c235248:' + str(test)]), '1c235248')
paths = [test, Path(__file__),
         Path('tools/translation/prepare-whole-owner-core-producer-candidate.mjs'),
         Path('tools/translation/schemars-enclosing-output-dispatch.mjs'),
         Path('tools/translation/derive-enclosing-namespace-context.mjs'),
         Path('tools/translation/whole-owner-enclosing-context-candidate.mjs'),
         *base.glob('current-core-import-before-*.log'),
         *base.glob('current-core-import-before-*.memory.json')]
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-core-import-route-regression-v1', members=members,
              originalCiFailure=dict(run=42536508655, job=128901874967, logLine=3927),
              originalNodeFileResourceStopped=True, afterWholeFileRun=False,
              syntaxChecked=True, originalDeadlinesUnchanged=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
target = Path('docs/case-studies/issue-784/evidence/current-core-import-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
