"""Read every complete terminal-run ZIP member without extracting it."""
import hashlib
import json
from pathlib import Path
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / 'current-910e8-ci-run-12.json').read_bytes())
assert snapshot['status'] == 'completed'
assert snapshot['headSha'] == '910e8dadfbf3f92490f2db19ed47c39d98af7077'
assert snapshot['databaseId'] == 42543805504
path = base / 'current-910e8-terminal-whole-run.zip'
assert path.stat().st_size < 12_000_000
with path.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
members = []
with zipfile.ZipFile(path) as archive:
    assert len(archive.infolist()) == 186
    assert sum(row.file_size for row in archive.infolist()) < 128 * 1024 * 1024
    for row in archive.infolist():
        size, member_digest = 0, hashlib.sha256()
        with archive.open(row) as source:
            while block := source.read(65536):
                size += len(block)
                member_digest.update(block)
        assert size == row.file_size
        members.append(dict(path=row.filename, bytes=size,
                            sha256=member_digest.hexdigest(), crc=row.CRC))
assert not any(' _ translation (4)' in row['path'] for row in members)
with path.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == digest
record = dict(schema='terminal-whole-run-log-recovery-v1',
              headSha=snapshot['headSha'], runId=snapshot['databaseId'],
              file=str(path), bytes=path.stat().st_size, sha256=digest,
              members=members, wholeArchiveVerified=True,
              unavailableWholeJobLog=128924361849,
              exactForwardShardFourAbsent=True, reverseShardFourDistinct=True)
target = base / 'current-910e8-terminal-whole-run-verification.json'
with target.open('x') as output:
    json.dump(record, output)
assert json.loads(target.read_bytes()) == record
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
