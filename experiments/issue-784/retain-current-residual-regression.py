"""Retain complete residual regression attempts, original files and audits."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
baseline = 'c1b19fe9a'
source = Path('tools/translation/extensions/source-lifetimes.mjs')
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(source, subprocess.check_output(['git', 'show', baseline + ':' + str(source)]), baseline)
paths = [source, Path(__file__),
         Path('tools/translation/test/result-static-error-origins.test.mjs'),
         Path('tools/translation/test/source-lifetimes.test.mjs'),
         Path('tools/translation/test/option-ok-or.test.mjs'),
         *base.glob('current-residual-*.log'), *base.glob('current-residual-*.memory.json'),
         base / 'current-standard-observation-compression.json',
         Path('experiments/issue-784/compress-inactive-raw-evidence.py')]
paths = [path for path in paths if path.name != 'current-residual-retention.log']
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
record = dict(schema='complete-static-result-error-origin-regression-v1', baseline=baseline,
              members=members, nodeAudits=audits, beforePassed=False,
              intermediateConstructorAbsenceDraftPassed=False,
              focusedNodeCasesPassed=2, focusedBunCasesPassed=2,
              completeOriginalLifetimeNodeCasesPassed=9,
              completedNodeOriginalDeadlineAuditsPassed=True,
              wholeActivityPubFilePassed=False, wholeActivityPubResourceStopped=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              newlyExecutableProductionFunctions=0)
target = Path('docs/case-studies/issue-784/evidence/current-residual-regression.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
