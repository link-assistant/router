"""Retain complete repair sources, failed attempts and whole-file checks."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/runtime-closure-repair-20261111.json.gz')
stems = [
    'runtime-closure-before', 'runtime-closure-after', 'runtime-closure-bun',
    'ascii-base-node', 'ascii-base-bun', 'paired-types-node', 'paired-types-bun',
    'ordering-history-node', 'ordering-history-bun',
    'facade-history-node', 'facade-history-bun', 'facade-history-freshness',
]
paths = {Path(value) for value in [
    __file__, 'tools/translation/macro-token-trees.mjs',
    'tools/translation/builtin-ast-builder-meta.mjs',
    'tools/translation/module-token-receiving-evolution.mjs',
    'tools/translation/struct-ordering-source-history.mjs',
    'tools/translation/source-profiles/struct-ordering-source-history/derive-output-effects.rules.json',
    'tools/translation/test/builtin-import-token-storage.test.mjs',
    'tools/translation/test/fixtures/builtin-import-token-storage-before.json.gz',
    'tools/translation/test/fixtures/builtin-import-token-storage-withdrawn.json.gz',
    'tools/translation/test/fixtures/ordering-effects-comparison-history.mjs',
    'tools/translation/test/ordering-effects-receiving-history.test.mjs',
    'tools/translation/test/derive-output-effects.test.mjs',
    'tools/translation/test/module-token-path-reentry-history.test.mjs',
    'tools/translation/test/module-token-receiving-evolution.test.mjs',
    'tools/translation/test/runtime-asset-closure.test.mjs',
    'tools/translation/test/router-core-ascii-base-assets.test.mjs',
    'tools/translation/test/facade-ast-receiving-history.test.mjs',
    'tools/translation/js-to-rust/test/owned-core-paired-types.test.mjs',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/with-child-reaper.py',
]}
for stem in stems:
    log = base / ('current-124-' + stem + '.log')
    receipt = log.with_suffix('.resources.json')
    resource = json.loads(receipt.read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    stopped = stem in ['ascii-base-bun', 'facade-history-bun']
    expected = 143 if stopped else 1 if stem == 'runtime-closure-before' else 0
    assert resource['exitCode'] == expected
    assert resource['stopped'] == stopped
    paths.update([log, receipt])
    for directory in re.findall(r'Complete Node deadline evidence: ([^\n]+)', log.read_text()):
        folder = Path(directory)
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        assert terminal['exitCode'] == expected and terminal['auditSummary']['passed']
        paths.update(path for path in folder.rglob('*') if path.is_file())
collection = base / 'current-124-collection-3.json.gz'
paths.update([collection, base / 'current-124-error-index-3.json.gz'])
for row in json.loads(gzip.decompress(collection.read_bytes()))['records']:
    assert row['validJobLog']
    paths.update([Path(row['log']), Path(row['stderr'])])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw),
        sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-runtime-closure-repair-receiving-v1',
    sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    sourceIdentityScope='Complete member bytes; a working-tree capture is not a clean-SHA gate.',
    members=members, passedNodeCases=35, passedBunCasesInCompleteFiles=24,
    passedBunCasesInInterruptedFile=4, failedBeforeCases=1, memoryStoppedBunFiles=2,
    originalAssertionsAndDeadlinesRetained=True, completeCycleCollected=False,
    productionExecutableGain=0, semanticAuthority=False, runtimeParity=False,
    fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for directory, dirs, files in os.walk(root):
        dirs[:] = [name for name in dirs if name not in ['toolchain', '__pycache__']]
        total += sum(Path(directory, name).stat().st_size for name in files)
assert total + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
    evidenceBytes=total + len(packed), wholeReadbackVerified=True,
    fullGatePassed=False, completeCycleCollected=False)))
