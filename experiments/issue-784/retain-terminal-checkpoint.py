"""Retain complete checkpoint evidence without duplicating large containers."""
import base64
import gzip
import hashlib
import json
import os
import re
import zipfile
from pathlib import Path

BASE = Path('ci-logs/issue-784-restart-2')
TARGET = Path('docs/case-studies/issue-784/evidence/current-terminal-checkpoint.json.gz')
SOURCE = '6ee1a798eba292b825cc4c61fee13c023fe65dfc'


def identity(path):
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    return {'path': str(path), 'bytes': path.stat().st_size, 'sha256': digest}


archive = BASE / 'current-4e709-workflow-logs-recovery.zip'
assert identity(archive)['sha256'] == 'b7e138bee642aa7c13448b3dfb4ac0693f9f576c88fa5bfd7bb3a51efec0d096'
archive_members = []
with zipfile.ZipFile(archive) as packed:
    assert len(packed.infolist()) == 66
    assert len(set(packed.namelist())) == 66
    for item in packed.infolist():
        digest, length = hashlib.sha256(), 0
        with packed.open(item) as stream:
            while block := stream.read(65536):
                digest.update(block)
                length += len(block)
        assert length == item.file_size
        archive_members.append({'name': item.filename, 'bytes': length,
                                'sha256': digest.hexdigest(), 'crc32': item.CRC})
logs = json.loads(gzip.decompress((BASE / 'current-4e709-ci-logs-12.json.gz').read_bytes()))
aggregates = {re.sub(r'^\d+_', '', row['name'][:-4]).replace(' _ ', ' / '): row
              for row in archive_members if '/' not in row['name'] and row['name'].endswith('.txt')}
matches = []
for row in logs['records']:
    if row['validJobLog']:
        member = aggregates[row['job']['name']]
        assert member['sha256'] == row['sha256'] and member['bytes'] == row['decodedBytes']
        matches.append({'jobId': row['job']['databaseId'], 'member': member['name']})
assert len(matches) == 24
assert 'JavaScript first (same commit) / translation (3)' not in aggregates

gate = json.loads((BASE / 'current-terminal-complete-gate.memory.json').read_bytes())
assert gate['command'] == ['node', '--max-old-space-size=512', 'scripts/check-js-first-local.mjs']
assert gate['exitCode'] == gate['childExitCode'] == 143 and gate['stopped'] is True
assert gate['peakSampledCgroupBytes'] > gate['stopThresholdBytes']
assert (BASE / 'current-terminal-complete-gate.log').stat().st_size == 0
assert len(gate['closedTrackedPageAdvice']) == 1
assert gate['closedTrackedPageAdvice'][0]['exitCode'] == 0

small = ['current-terminal-complete-gate.log', 'current-terminal-complete-gate.memory.json',
         'current-terminal-complete-gate.observer.log',
         'current-terminal-complete-gate.memory-closed-pages-1.log',
         'current-terminal-gate-preflight-pages.log', 'current-terminal-post-gate-pages.log',
         'current-terminal-main-fetch-final.log', 'current-terminal-run-list-final.json',
         'current-publication-issue.json', 'current-publication-issue-comments.json',
         'current-publication-pr.json', 'current-publication-pr-comments.json',
         'current-publication-pr-inline.json', 'current-publication-pr-reviews.json',
         'current-publication-gh-pr-diff.patch', 'current-publication-gh-pr-diff.stderr',
         'current-4e709-workflow-logs-recovery.stderr']
sources = ['scripts/check-js-first-local.mjs', 'experiments/issue-784/run-observed-check.py',
           'experiments/issue-784/release-inactive-repository-pages.py', __file__]
members = []
for path in [*(BASE / name for name in small), *(Path(name) for name in sources)]:
    raw = path.read_bytes()
    members.append({**identity(path), 'base64': base64.b64encode(raw).decode()})
external_paths = [archive, BASE / 'current-terminal-source-review.patch.gz',
                  BASE / 'current-terminal-gate-preflight-pages.json.gz',
                  BASE / 'current-terminal-post-gate-pages.json.gz',
                  BASE / 'current-terminal-complete-gate.memory-closed-pages-1.json.gz']
external = [identity(path) for path in external_paths]
record = {'schema': 'current-terminal-checkpoint-custody-v1', 'sourceCommit': SOURCE,
          'gatePassed': False, 'initialFingerprintResourceStopped': True,
          'allSevenStages': 'unrun', 'greenStampWritten': False,
          'workflowArchive': {'members': archive_members, 'crcAndWholeMemberHashesVerified': True,
                              'matchingWholeNonpassingLogs': matches,
                              'missingExactJob': 'JavaScript first (same commit) / translation (3)',
                              'completeCycleCollected': False},
          'members': members, 'externalMembers': external,
          'sourceReview': 'Complete textual git diff from 4e709 to sourceCommit; binary payloads retain their own original blobs.',
          'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
compressed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + (0 if TARGET.exists() else len(compressed)) < 500_000_000
if TARGET.exists():
    assert TARGET.read_bytes() == compressed
else:
    with TARGET.open('xb') as stream:
        stream.write(compressed)
decoded = json.loads(gzip.decompress(TARGET.read_bytes()))
for row in decoded['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
for row in decoded['externalMembers']:
    assert identity(Path(row['path'])) == row
print(json.dumps({'packet': str(TARGET), 'bytes': len(compressed), 'archiveMembers': 66,
                  'identicalWholeLogs': 24, 'missingWholeLogs': 1,
                  'gatePassed': False, 'sevenStages': 'unrun',
                  'evidenceBytes': total + (0 if TARGET.stat().st_size != len(compressed) else len(compressed))}))
