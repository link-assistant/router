"""Move the whole terminal 4ea CI cycle into durable, hash-checked custody."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-4ea')
head = '4ea091242db0a51a07415c8c04a23a6db0b8c04b'
prefix = 'checkpoint4eaterminal'
snapshot = json.loads(gzip.decompress((base / (prefix + '-current-snapshot.json.gz')).read_bytes()))
metadata = json.loads((base / 'checkpoint-4ea-artifacts-terminal.json').read_bytes())
inventory = json.loads((base / (prefix + '-artifact-verification.json')).read_bytes())
review = json.loads(gzip.decompress((base / (prefix + '-current-failure-review.json.gz')).read_bytes()))
assert snapshot['run']['head_sha'] == head and snapshot['completeCycleCollected']
assert snapshot['run']['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert len(snapshot['logs']) == 24 and not snapshot['pendingLogJobs']
assert {row['job']['id'] for row in snapshot['logs']} == {
    row['id'] for row in snapshot['jobs'] if row['conclusion'] not in ['success', 'skipped']}
assert all(row['completeReadbackVerified'] for row in snapshot['logs'])
assert len(metadata['artifacts']) == len(inventory['records']) == 26
assert not inventory['pendingLargeArtifacts'] and inventory['completeCycleCollected']
assert {row['metadata']['id'] for row in inventory['records']} == {
    row['id'] for row in metadata['artifacts']}
assert all(row['completeReadbackAndCrcVerified'] for row in inventory['records'])
assert review['completeCycleCollected'] and review['publishedHead'] == head
assert len(review['logs']) == 24 and len(review['artifacts']) == 26
assert all(row['allOriginalMembersReopenedAndVerified'] for row in review['artifacts'])
runs = json.loads((base / '4ea-terminal-recent-runs.json').read_bytes())
applicable = [row for row in runs if row['headSha'] == head]
assert len(applicable) == 3 and all(row['status'] == 'completed' for row in applicable)
paths = sorted({*base.glob('checkpoint4ea*'), *base.glob('checkpoint-4ea-*'),
                base / '4ea-terminal-recent-runs.json'})
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
assert 100 <= len(paths) <= 512 and not target.exists()
selected = {str(path.resolve()) for path in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            if any(line.startswith('State:\tZ') for line in (process / 'status').read_text().splitlines()):
                continue
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in selected
            for descriptor in (process / 'fd').iterdir():
                try:
                    assert os.readlink(descriptor) not in selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except PermissionError:
            if process.stat().st_uid == os.getuid():
                raise
        except (FileNotFoundError, ProcessLookupError):
            pass


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


inactive()
members = []
for path in paths:
    state = path.lstat()
    assert str(path) not in tracked and stat.S_ISREG(state.st_mode)
    assert state.st_uid == os.getuid() and state.st_nlink == 1
    members.append(dict(originalPath=str(path), storedAs=path.name, bytes=state.st_size,
        sha256=digest(path), identity=[state.st_dev, state.st_ino, state.st_size,
                                     state.st_mtime_ns, state.st_ctime_ns]))
assert len({row['storedAs'] for row in members}) == len(members)
before = 0
for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
               'js/node_modules/.node-case-deadlines']:
    for directory, directories, files in os.walk(folder):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        before += sum(Path(directory, name).stat().st_size for name in files)
record = dict(schema='complete-ci-4ea-moved-original-custody-v1', headSha=head,
    runId=42863382776, testedMergeSha='d584507d683d08b53d74f109d6f5f0ebeddb2b72',
    members=members, sourcePathMapping='Original receipts retain original paths; storedAs selects this directory.',
    jobs=snapshot['jobs'], workflows=applicable, nonpassingCompleteLogs=24, completeArtifacts=26,
    retentionHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    entireCycleTerminal=True, allAvailableJobLogsAndArtifactsRetainedWhole=True,
    canonicalNestedOutputReviewPassed=False, canonicalInstalled=False,
    independentSemanticReviewPassed=False, freshOriginalProducerPassed=False,
    originalDeadlinesPreserved=True, allRequiredChecksPassed=False,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
assert before + len(packed) < 500_000_000
inactive()
target.mkdir()
for path, row in zip(paths, members, strict=True):
    state = path.lstat()
    assert row['identity'] == [state.st_dev, state.st_ino, state.st_size,
                               state.st_mtime_ns, state.st_ctime_ns]
    destination = target / row['storedAs']
    path.rename(destination)
    assert destination.stat().st_size == row['bytes'] and digest(destination) == row['sha256']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(directory=str(target), completeMembers=len(members),
    originalBytes=sum(row['bytes'] for row in members), completeReadbackVerified=True,
    evidenceBytesAfter=before + len(packed))))
