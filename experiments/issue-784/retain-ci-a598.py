"""Move complete terminal CI evidence into durable custody without duplicating it."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-a598')
head = 'a598d2b01b5a8e47bbf6bb5a8f90b317d90ce5de'
snapshot = json.loads(gzip.decompress((base / 'checkpointa598-current-snapshot.json.gz').read_bytes()))
metadata = json.loads((base / 'a598-terminal-artifacts.json').read_bytes())
inventory = json.loads((base / 'checkpointa598-artifact-verification.json').read_bytes())
assert snapshot['run']['head_sha'] == head and snapshot['completeCycleCollected']
assert snapshot['run']['status'] == 'completed' and len(snapshot['jobs']) == 59
assert all(row['status'] == 'completed' for row in snapshot['jobs'])
assert len(snapshot['logs']) == 24 and not snapshot['pendingLogJobs']
assert {row['job']['id'] for row in snapshot['logs']} == {
    row['id'] for row in snapshot['jobs'] if row['conclusion'] not in ['success', 'skipped']}
assert all(row['completeReadbackVerified'] for row in snapshot['logs'])
assert len(metadata['artifacts']) == 26 and len(inventory['records']) == 25
assert not inventory['pendingLargeArtifacts'] and inventory['completeCycleCollected']
assert {row['metadata']['id'] for row in inventory['records']} | {13784735512} == {
    row['id'] for row in metadata['artifacts']}
assert all(row['completeReadbackAndCrcVerified'] for row in inventory['records'])
for name, key in [('canonical-artifact-verification', 'completeCrcAndReadbackVerified'),
                  ('canonical-member-verification', 'completeNestedGzipCrcSha256AndCensusVerified')]:
    receipt = json.loads(gzip.decompress((base / ('checkpointa598-' + name + '.json.gz')).read_bytes()))
    assert receipt[key] and receipt['headSha'] == head
captures = [json.loads(gzip.decompress((base / ('checkpointa598-canonical-physical-inputs-' + phase + '.json.gz')).read_bytes()))
            for phase in ['before', 'after']]
assert captures[0] == captures[1]
review = json.loads(gzip.decompress((base / 'checkpointa598-canonical-output-review-v2.json.gz').read_bytes()))
install = json.loads(gzip.decompress((base / 'checkpointa598-canonical-output-installation.json.gz').read_bytes()))
assert review['completePhysicalInputVectorsEqual'] and install['allInstalledOutputBytesReadBack']
assert review['publishedHeadSha'] == head and len(install['installedChangedFiles']) == 20
runs = json.loads((base / 'a598-terminal-recent-runs.json').read_bytes())
applicable = [row for row in runs if row['headSha'] == head]
assert len(applicable) == 3 and all(row['status'] == 'completed' for row in applicable)
audit_directory = Path('js/node_modules/.node-case-deadlines/complete-i9aG3J')
audit = json.loads((audit_directory / 'case-deadlines.json').read_bytes())
terminal = json.loads((audit_directory / 'terminal.json').read_bytes())
assert audit['passed'] and audit['observedCompletedCases'] == 55 and not audit['errors']
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
paths = sorted({*base.glob('checkpointa598*'), *base.glob('a598-*'),
                *(audit_directory / name for name in ['terminal.json', 'case-deadlines.json',
                    'request.json', 'command.json', 'stderr.raw.log', 'stdout.raw.tap'])})
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
assert 180 <= len(paths) <= 256 and not target.exists()
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
    stored = path.name if path.parent == base else 'local-generated-deadlines/' + path.name
    members.append(dict(originalPath=str(path), storedAs=stored, bytes=state.st_size,
        sha256=digest(path), identity=[state.st_dev, state.st_ino, state.st_size,
                                     state.st_mtime_ns, state.st_ctime_ns]))
assert len({row['storedAs'] for row in members}) == len(members)
roots = [Path(p) for p in ['ci-logs', 'docs/case-studies/issue-784',
                          'experiments/issue-784', 'js/node_modules/.node-case-deadlines']]
before = sum(path.stat().st_size for root in roots for path in root.rglob('*')
             if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)
record = dict(schema='complete-ci-a598-moved-original-custody-v1', headSha=head,
    runId=42849964395, testedMergeSha=review['mergeSha'], members=members,
    sourcePathMapping='Original receipts retain original paths; storedAs selects this directory.',
    jobs=snapshot['jobs'], workflows=applicable, nonpassingCompleteLogs=24, completeArtifacts=26,
    retentionHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    entireCycleTerminal=True, allAvailableJobLogsAndArtifactsRetainedWhole=True,
    beforeAndAfterCompleteInputCapturesEqual=True, installedGeneratedOutputs=20,
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
    destination.parent.mkdir(parents=True, exist_ok=True)
    path.rename(destination)
    assert destination.stat().st_size == row['bytes'] and digest(destination) == row['sha256']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(directory=str(target), completeMembers=len(members),
    originalBytes=sum(row['bytes'] for row in members), completeReadbackVerified=True,
    evidenceBytesAfter=before + len(packed))))
