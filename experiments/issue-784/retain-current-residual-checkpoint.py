"""Retain complete checkpoint attempts and review streams without duplicate containers."""
import base64
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
members, external = [], []
labels = ['current-residual-full-gate', 'current-residual-preflight-full-gate']
paths = []
for label in labels:
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['stopped'] and receipt['exitCode'] == 143
    assert receipt['completedFingerprintPageAdvice']['exitCode'] == 0
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    for suffix in ['.log', '.memory.json', '.observer.log', '.memory-completed-pages.log']:
        paths.append(base / (label + suffix))
    external.append(base / (label + '.memory-completed-pages.json.gz'))
external.append(base / 'current-residual-gate-preflight-pages.json.gz')
external += [base / ('current-residual-' + name + '-complete-review.patch.gz')
             for name in ['published', 'coordinated']]
for suffix in ['gate-preflight-pages.log', 'complete-review-blobs.raw', 'complete-review.json',
               'complete-review.log', 'gh-pr-diff.stdout', 'gh-pr-diff.stderr',
               'published-pr-diff.patch.gz', 'issue.json', 'issue-comments.json',
               'pr-conversations.json', 'pr-inline.json', 'pr-reviews.json', 'main-fetch.log']:
    paths.append(base / ('current-residual-' + suffix))
paths += [Path(__file__), Path('experiments/issue-784/review-current-coordinated-batch.py')]
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
spec = importlib.util.spec_from_file_location('completed_pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
active, unreadable = pages.active_paths(Path.cwd().resolve())
records, states = [], {}
for path in external:
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert str(path.resolve()) not in active
    with path.open('rb') as source:
        packed_hash = hashlib.file_digest(source, 'sha256').hexdigest()
    with gzip.open(path, 'rb') as source:
        decoded_hash = hashlib.file_digest(source, 'sha256').hexdigest()
    states[path] = state
    records.append(dict(originalPath=str(path), retainedPath=str(destination / path.name),
                        bytes=state.st_size, sha256=packed_hash, decodedSha256=decoded_hash))
record = dict(schema='complete-current-residual-checkpoint-v1',
              sourceHead='b28c5bfe52f8cd2c1a834bf80798e062433e2f3d',
              members=members, externalMembers=records, failedCompleteGateAttempts=2,
              allSevenStagesUnrun=True, greenGateStampWritten=False,
              completeRemotePrDiffAvailable=False, completeLocalDiffsRetained=True,
              originalCaseLimitsChanged=False, foreignUnreadableProcesses=unreadable,
              currentCompleteReceivingRunPassed=False, newlyExecutableProductionFunctions=0,
              runtimeParity=False, rustExecuted=False)
target = destination / 'current-residual-checkpoint.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
for row in records:
    path, retained = Path(row['originalPath']), Path(row['retainedPath'])
    state, current = states[path], path.lstat()
    for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
        assert getattr(state, field) == getattr(current, field)
    assert not retained.exists()
    path.rename(retained)
    with retained.open('rb') as source:
        assert retained.stat().st_size == row['bytes'] and hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
    with gzip.open(retained, 'rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['decodedSha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     externalContainersMoved=len(records), completeReadbackVerified=True)))
