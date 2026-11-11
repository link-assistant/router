"""Move complete inactive CI/manual records into permanent reviewed custody."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/manual-development-20261111')
assert not target.exists()
collection = json.loads(gzip.decompress((base / 'current-124-collection-6.json.gz').read_bytes()))
assert collection['run']['head_sha'] == '124edb33e096a2c018caf449214005ad555d8bdd'
assert collection['run']['status'] == 'completed'
jobs = [row for page in collection['jobPages'] for row in page['jobs']]
assert len(jobs) == 75 and all(row['status'] == 'completed' for row in jobs)
assert sum(row['validJobLog'] for row in collection['records']) == 46
assert sum(not row['validJobLog'] for row in collection['records']) == 1
local = json.loads((base / 'manual-development-complete-local-retry.receipt.json').read_bytes())
assert local['developmentChecksPassed'] and not local['failures']
assert all(local[key] is False for key in ['strictParity', 'fullGatePassed', 'rustAllowed'])
resources = json.loads((base / 'manual-development-complete-local-retry.resources.json').read_bytes())
assert resources['exitCode'] == 0 and not Path('/proc/' + str(resources['pid'])).exists()
pages = json.loads(gzip.decompress(Path(resources['completedFingerprintPageAdvice']['receipt']).read_bytes()))
assert pages['complete'] and pages['completedFingerprints'] == pages['expectedFingerprints'] == 2
inspection = json.loads(gzip.decompress((base / 'current-124-canonical-artifact-inspection.json.gz').read_bytes()))
assert inspection['allNestedCrcSha256AndCensusVerified'] and len(inspection['members']) == 2873
paths = {}
patterns = ['current-124-job-*', 'current-124-collection-*', 'current-124-error-index-*',
    'current-124-run-*.json', 'current-124-recent-runs-*.json', 'current-124-artifacts*.json',
    'current-124-inspected-artifacts-*', 'current-124-artifact-inspection-*',
    'current-124-terminal-*', 'current-124-canonical-artifact-inspection*',
    'manual-development-*', 'manual-ui-dependencies*',
    'current-784-review-1030.json', 'current-784-comments-1030.json',
    'current-785-review-1030.json', 'current-785-inline-1030.json', 'current-785-reviews-1030.json',
    '*manual-prepublication.json', 'current-main-before-manual-publication.json',
    'current-main-rules-before-manual-publication.json', 'manual-prepublication-gh-pr-diff*',
    'private-compiler-source-size-*']
for pattern in patterns:
    for path in base.glob(pattern):
        if path.is_file() and 'retention' not in path.name:
            paths[path] = ('local' if path.name.startswith(('manual-', 'private-')) else 'ci') + '/' + path.name
log = (base / 'manual-development-complete-local-retry.log').read_text()
for line in log.splitlines():
    if not line.startswith('Complete Node deadline evidence: '):
        continue
    folder = Path(line.removeprefix('Complete Node deadline evidence: '))
    assert folder.resolve().parent == Path('js/node_modules/.node-case-deadlines').resolve()
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    for path in folder.rglob('*'):
        if path.is_file():
            paths[path] = 'node-deadlines/' + folder.name + '/' + str(path.relative_to(folder))
assert 150 <= len(paths) <= 1024 and len(set(paths.values())) == len(paths)
selected = {str(path.resolve()) for path in paths}
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
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
members = []
for path, stored_as in sorted(paths.items()):
    info = path.lstat()
    assert str(path) not in tracked and stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_nlink == 1
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    members.append(dict(originalPath=str(path), storedAs=stored_as, bytes=info.st_size,
        sha256=digest, identity=[info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns]))
record = dict(schema='manual-development-original-custody-v1', members=members,
    captureHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    sourceReceipt=local, publishedHead=collection['headSha'], runId=collection['run']['id'],
    wholeCycleTerminal=True, completeNonpassingLogs=46, unavailableNonpassingLogs=1,
    completeArtifactsInspected=41, originalArchivesAndSourceOutputsRetained=False,
    developmentChecksPassed=True, strictParity=False, fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = sum(path.stat().st_size for folder in ['ci-logs', 'docs/case-studies/issue-784',
    'experiments/issue-784', 'js/node_modules/.node-case-deadlines'] for path in Path(folder).rglob('*')
    if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts and '__pycache__' not in path.parts)
assert total + len(packed) + 100000 < 500_000_000
for row in members:
    path = Path(row['originalPath'])
    info = path.lstat()
    assert row['identity'] == [info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns]
    destination = target / row['storedAs']
    destination.parent.mkdir(parents=True, exist_ok=True)
    path.rename(destination)
    with destination.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(target=str(target), members=len(members), bytes=sum(row['bytes'] for row in members),
    evidenceBytesAfter=total + len(packed), completeReadbackVerified=True)))
