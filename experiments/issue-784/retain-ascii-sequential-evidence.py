"""Retain complete source-only ASCII diagnostics, including every failed case."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-ascii-sequential.json.gz')
labels = [
    'current-ascii-baseline-node', 'current-ascii-preflight-before',
    'current-ascii-preflight-after', 'current-ascii-preflight-node',
    'current-ascii-preflight-traced-node', 'current-ascii-sequential-node',
    'current-sequential-adapters-node', 'current-sequential-adapters-bun',
    'current-ascii-generator-write', 'current-runtime-generator-write',
    'current-ascii-generated-node', 'current-ascii-generated-bun',
    'current-runtime-generated-node', 'current-runtime-generated-bun',
    'current-ascii-final-node', 'current-ascii-final-bun',
]
members = []
summaries = []
audits = set()


def retain(path, raw):
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for label in labels:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = base / (label + suffix)
        retain(path, path.read_bytes())
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['stopThresholdBytes'] == 2866933760
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    summaries.append(dict(label=label, exitCode=receipt['exitCode'],
                          elapsedSeconds=receipt['elapsedSeconds'],
                          peakSampledCgroupBytes=receipt['peakSampledCgroupBytes'],
                          stopped=receipt['stopped']))
    log = (base / (label + '.log')).read_text()
    for name in re.findall(r'^Complete Node deadline evidence: (.*)$', log, re.M):
        path = Path(name)
        terminal = json.loads((path / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        audits.add(path)

for directory in sorted(audits):
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            retain(path, path.read_bytes())

for name in ['current-ascii-preflight-pages.json.gz', 'current-ascii-preflight-pages.log',
             'current-ascii-preflight-before-sequential-sources.json.gz',
             'current-ascii-sequential-uninstalled-generated-drafts.json.gz']:
    path = base / name
    retain(path, path.read_bytes())
    if name.endswith('sources.json.gz') or name.endswith('drafts.json.gz'):
        packet = json.loads(gzip.decompress(path.read_bytes()))
        for row in packet if isinstance(packet, list) else packet['files']:
            raw = base64.b64decode(row['base64'], validate=True)
            assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']

paths = [
    'tools/translation/concrete-sequential-equations.mjs',
    'tools/translation/concrete-sequential-phases.mjs',
    'tools/translation/private-parser-sequential-phases.mjs',
    'tools/translation/concrete-phased-equations.mjs',
    'tools/translation/concrete-named-phases.mjs',
    'tools/translation/prepare-core-ascii-reverse-sources.mjs',
    'tools/translation/prepare-core-unicode-predicates.mjs',
    'tools/translation/prepare-owned-core-private-analysis-retention.mjs',
    'tools/translation/prepare-native-regeneration-batch.mjs',
    'tools/translation/prepare-unicode-ascii-asset-producers.mjs',
    'tools/translation/prepare-current-core-ascii-assets.mjs',
    'tools/translation/prepare-current-core-ascii-base-assets.mjs',
    'tools/translation/prepare-runtime-import-current-sources.mjs',
    'tools/translation/prepare-owned-runtime-import-current.mjs',
    'tools/translation/owned-runtime-node-current-source-data.mjs',
    'tools/translation/test/concrete-sequential-equations.test.mjs',
    'tools/translation/test/concrete-sequential-phases.test.mjs',
    'tools/translation/test/router-core-ascii-assets.test.mjs',
    'tools/translation/test/current-unicode-ascii-asset-producers.test.mjs',
    'tools/translation/test/runtime-import-current.test.mjs',
    'experiments/issue-784/probe-ascii-stale-predecessor.mjs',
    'experiments/issue-784/current-ascii-deadline-plan.md',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/retain-ascii-sequential-evidence.py',
]
for name in paths:
    path = Path(name)
    retain(path, path.read_bytes())
    if not name.endswith('concrete-sequential-equations.mjs') and name not in [
            'tools/translation/test/concrete-sequential-equations.test.mjs',
            'experiments/issue-784/probe-ascii-stale-predecessor.mjs',
            'experiments/issue-784/current-ascii-deadline-plan.md',
            'experiments/issue-784/retain-ascii-sequential-evidence.py']:
        retain('git:3eb70fab0:' + name,
               subprocess.check_output(['git', 'show', '3eb70fab0:' + name]))

record = dict(schema='complete-source-only-ascii-sequential-evidence-v1',
              members=members, runs=summaries, allOriginalDeadlinesUnchanged=True,
              fullGatePassed=False, runtimeParity=False, semanticAuthority=False,
              productionExecutableGain=0, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                      completeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
