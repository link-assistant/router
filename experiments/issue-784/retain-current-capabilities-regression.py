"""Retain whole historical/current capabilities tests and incomplete attempts."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
test = Path('tools/translation/test/try-payload-types.test.mjs')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(test, subprocess.check_output(['git', 'show', '1c235248:' + str(test)]), '1c235248')
paths = [test, Path('rust/src/capabilities.rs'), Path(__file__),
         *test.parent.joinpath('fixtures').glob('capabilities-try-original.*'),
         *base.glob('current-capabilities-*.log'),
         *base.glob('current-capabilities-*.memory.json')]
paths = [path for path in paths if path.name != 'current-capabilities-retention.log']
audits = []
for path in list(paths):
    if path.suffix != '.log':
        continue
    for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
        directory = Path(name)
        assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        paths.extend(sorted(directory.iterdir()))
        audits.append(dict(path=name, caseDeadlineReportPresent=(directory / 'case-deadlines.json').exists()))
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-historical-and-current-capabilities-regression-v1',
              members=members, nodeAudits=audits,
              originalCiFailure=dict(run=42536508655, job=128901874967, logLine=3885,
                                     expectedWholeSourceSha256='7a8bb8a76288590bbc9d556b77d4415cd513837a45d88edb278dc5c6b7b6b222',
                                     actualWholeSourceSha256='f51ba943b456a099a7cae5ae2073cd8d5d912bf23c117fc76ec1016cd50ebbd4'),
              completeNodeFilePassed=False, completeBunFilePassed=False,
              bothAttemptsResourceStopped=True, originalDeadlinesUnchanged=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              newlyExecutableProductionFunctions=0)
target = Path('docs/case-studies/issue-784/evidence/current-capabilities-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
