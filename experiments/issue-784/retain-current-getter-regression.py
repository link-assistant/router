"""Retain complete original/current getter regressions and original deadlines."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
test = Path('tools/translation/test/shared-method-receivers.test.mjs')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(test, subprocess.check_output(['git', 'show', '8f4205079:' + str(test)]), '8f4205079')
paths = [test, Path('rust/src/lefine.rs'), Path(__file__),
         *test.parent.joinpath('fixtures').glob('lefine-shared-receiver-original.*'),
         *base.glob('current-getter-*.log'), *base.glob('current-getter-*.memory.json'),
         base / 'current-getter-pages.json.gz']
paths = [path for path in paths if path.name != 'current-getter-retention.log']
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name)
            assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(sorted(directory.iterdir()))
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-historical-and-current-getter-regression-v1',
              members=members, beforePassed=False, completeNodeCasesPassed=9,
              completeBunCasesPassed=9, nodeOriginalDeadlineAuditPassed=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              newlyExecutableProductionFunctions=0)
target = Path('docs/case-studies/issue-784/evidence/current-getter-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
