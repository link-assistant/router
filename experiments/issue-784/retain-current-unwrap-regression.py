"""Retain whole unwrap regression files, before/after runs and deadline audits."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

baseline = '000b0547e6ccb7059028e0b05de1c335c6f0c6c7'
base = Path('ci-logs/issue-784-restart-2')
source = Path('tools/translation/extensions/standard-body-checker.mjs')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(source, subprocess.check_output(['git', 'show', baseline + ':' + str(source)]), baseline)
paths = [source, Path(__file__),
         Path('tools/translation/test/standard-method-record-bindings.test.mjs'),
         Path('tools/translation/test/standard-body-source.test.mjs'),
         *base.glob('current-unwrap-*.log'), *base.glob('current-unwrap-*.memory.json')]
paths = [path for path in paths if path.name != 'current-unwrap-retention.log']
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-original-unwrap-record-regression-v1', baseline=baseline,
              members=members, beforePassed=False, completeNodeCasesPassed=17,
              completeBunCasesPassed=17, nodeOriginalDeadlineAuditsPassed=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              newlyExecutableProductionFunctions=0)
target = Path('docs/case-studies/issue-784/evidence/current-unwrap-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
