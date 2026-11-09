"""Retain complete historical/current source comparisons and all draft attempts."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = [Path(__file__), Path('experiments/issue-784/repair-static-consumer-cohorts.py'),
         Path('tools/translation/test/static-source-items.test.mjs'),
         Path('tools/translation/test/fixtures/static-source-consumer-pairs.mjs'),
         Path('tools/translation/extensions/external-trait-sources.mjs'),
         Path('tools/translation/extensions/primitive-trait-closure.mjs'),
         Path('tools/translation/static-source-items.mjs'),
         Path('tools/translation/original-json-intrinsics.mjs')]
paths.extend(Path('tools/translation/test/fixtures/static-source-items').rglob('*'))
paths.extend(p for p in base.glob('current-static-consumer-*')
             if p.is_file() and 'retention' not in p.name)
audits = []
for path in list(paths):
    if path.suffix != '.log':
        continue
    for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
        directory = Path(name)
        assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        paths.extend(directory.iterdir())
        audits.append(name)
members = []


def retain(path, raw, version):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


test = Path('tools/translation/test/static-source-items.test.mjs')
retain(test, subprocess.check_output(['git', 'show', '910e8dadf:' + str(test)]), '910e8dadf')
for path in sorted(set(paths)):
    if path.is_dir():
        continue
    assert path.is_file() and not path.is_symlink(), str(path)
    retain(path, path.read_bytes(), 'current')
record = dict(schema='complete-static-consumer-generations-v1', members=members,
              nodeDeadlineAudits=audits, historicalFixtureBytesUnchanged=True,
              historicalAndCurrentCohortsSeparate=True, completeCallbackTapesCompared=True,
              wholeIssuerBootstrapEquivalence=False, beforeWholeFilePassed=False,
              firstDraftArgumentSizePassed=False, stdinNodeWholeFilePassed=True,
              stdinBunWholeFilePassed=False, finalNodeWholeFilePassed=True,
              finalBunWholeFilePassed=True, finalCasesPerRuntime=10,
              allOriginalDeadlinesUnchanged=True, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False, newlyExecutableProductionFunctions=0)
target = Path('docs/case-studies/issue-784/evidence/current-static-consumer-cohorts.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), completeReadbackVerified=True)))
