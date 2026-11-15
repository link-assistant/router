"""Move this completed cycle's verified evidence into its case study, without copies."""
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import stat
import sys

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-37147a')
if sys.argv[1:] == ['--verify-existing']:
    receipt = target / 'relocation.json'
    document = json.loads(receipt.read_bytes())
    assert document['schema'] == 'completed-ci-cycle-evidence-relocation-v1'
    assert document['head'] == '37147a95ce5fb1efeced23b2ba49dcd036a53a8a'
    for row in document['members']:
        original, retained = Path(row['originalPath']), Path(row['retainedPath'])
        assert original.parent == base and retained == target / original.name
        assert not original.exists() and not retained.is_symlink()
        with retained.open('rb') as source:
            assert retained.stat().st_size == row['bytes']
            assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
    print(json.dumps(dict(schema='completed-ci-relocation-independent-readback-v1',
                         members=len(document['members']), allByteHashesVerified=True,
                         originalAttemptExitCode=1,
                         initialFailure='Final Python tuple/list equality after all relocations; byte checks passed.')))
    sys.exit(0)
assert not sys.argv[1:]
assert not target.exists()
head = '37147a95ce5fb1efeced23b2ba49dcd036a53a8a'
snapshot = json.loads((base / 'current-37147a-completed-logs-15.json').read_bytes())
assert snapshot['completeCycleCollected'] and snapshot['snapshot']['headSha'] == head
runs = json.loads((base / 'current-37147a-all-runs-final.json').read_bytes())['workflow_runs']
assert len(runs) == 7 and all(row['head_sha'] == head and row['status'] == 'completed' for row in runs)
paths = [Path(row['log']) for row in snapshot['records']]
assert len(paths) == 24 and len(set(paths)) == 24
for path, row in zip(paths, snapshot['records']):
    digest, length = hashlib.sha256(), 0
    with gzip.open(path, 'rb') as source:
        while block := source.read(65536):
            digest.update(block)
            length += len(block)
    assert row['validJobLog'] and length == row['decodedBytes'] and digest.hexdigest() == row['sha256']
paths += [base / name for name in [
    'current-37147a-completed-logs-15.json', 'current-37147a-job-snapshot-15.json',
    'current-37147a-all-runs-final.json', 'current-37147a-latest-runs-14.json',
    'current-37147a-artifacts-15-pages.json',
    'current-37147a-deadline-inspection-4.json.xz',
    'current-37147a-deadline-inspection-12.json.gz',
    'current-37147a-deadline-inspection-15.json.gz',
    'current-37147a-reverse-bun4-raw.json.gz',
    'current-custody-reviewed-whole-pr-retired.json',
    'current-issue-refresh-15.json', 'current-issue-comments-refresh-15.json',
    'current-pr-refresh-15.json', 'current-pr-conversation-refresh-15.json',
    'current-pr-inline-refresh-15.json', 'current-pr-reviews-refresh-15.json',
]]
paths += sorted(base.glob('current-ascii-eight-profile*'))
paths += sorted(base.glob('current-ascii-one-profile*'))
assert len(paths) == len(set(paths)) and all(path.parent == base for path in paths)
def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()
def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return [getattr(value, field) for field in
            ['st_dev', 'st_ino', 'st_mode', 'st_size', 'st_mtime_ns', 'st_ctime_ns']]
rows = [dict(originalPath=str(path), retainedPath=str(target / path.name),
             bytes=path.stat().st_size, sha256=digest(path), identity=identity(path)) for path in paths]
selected = {str(path.resolve()) for path in paths}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        links = list((process / 'fd').iterdir())
    except OSError:
        continue
    for link in links:
        try:
            active = os.readlink(link).removesuffix(' (deleted)')
        except OSError:
            continue
        assert active not in selected, 'Active original task evidence'
# Complete decompression readback includes the earlier large JSON receipt.
for path in paths:
    opener = gzip.open if path.suffix == '.gz' else lzma.open if path.suffix == '.xz' else None
    if opener:
        with opener(path, 'rb') as source:
            while source.read(65536):
                pass
target.mkdir()
for path, row in zip(paths, rows):
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
    destination = target / path.name
    assert not destination.exists()
    path.rename(destination)
    assert destination.stat().st_size == row['bytes'] and digest(destination) == row['sha256']
record = dict(schema='completed-ci-cycle-evidence-relocation-v1', head=head, members=rows,
              originalPathsAreHistorical=True, byteIdenticalRelocation=True,
              allFailedAndCancelledJobLogsRetained=True, discardedZipCustodyClaimed=False,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
receipt = target / 'relocation.json'
receipt.write_text(json.dumps(record) + '\n')
assert json.loads(receipt.read_bytes()) == record
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
