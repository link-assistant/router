"""Retain complete terminal CI and source-batch evidence without duplicate copies."""
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import stat

source = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-9b6-repair-batch')
assert not target.exists()


def digest(path, opener=open):
    with opener(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return [getattr(value, key) for key in ['st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns']]


def inactive(paths):
    names = {str(path.resolve()) for path in paths}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd).removesuffix(' (deleted)') not in names
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                row = line.split(None, 5)
                assert len(row) < 6 or row[5] not in names
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


def pages(path, field):
    text, rows, decoder = path.read_text(), [], json.JSONDecoder()
    while text.strip():
        page, end = decoder.raw_decode(text.lstrip())
        rows.extend(page[field])
        text = text.lstrip()[end:]
    return rows


jobs = pages(source / 'checkpoint-9b6-current-jobs.json', 'jobs')
assert len(jobs) == 59 and all(row['status'] == 'completed' for row in jobs)
assert {row['head_sha'] for row in jobs} == {'9b6c9192c70f1f9309eac0c516b59102ce080409'}
failed = {row['id'] for row in jobs if row['conclusion'] in ['failure', 'cancelled']}
assert len(failed) == 24
logs = {int(path.stem.rsplit('-', 1)[1]): path for path in source.glob('checkpoint-9b6-job-*.log')}
assert set(logs) == failed
metadata = pages(source / 'checkpoint-9b6-current-artifacts.json', 'artifacts')
verification = json.loads((source / 'checkpoint-9b6-artifact-verification.json').read_bytes())
small = verification['records']
big_path = source / 'checkpoint-9b6-bulk-complete-decoded.json.gz'
big = json.loads(gzip.decompress(big_path.read_bytes()))
assert len(small) == 25 and len(metadata) == 26
assert {row['metadata']['id'] for row in small} | {big['originalMetadata']['id']} == {row['id'] for row in metadata}
for row in small:
    path = Path(row['file'])
    assert row['completeReadbackAndCrcVerified'] and digest(path) == row['sha256']
    assert path.stat().st_size == row['metadata']['size_in_bytes']
assert big['everyOriginalMemberCrcAndSha256Verified'] and big['everyDecodedPayloadRetained']
assert big['completeInMemoryAndPhysicalReadbackVerified']
assert digest(Path(big['retainedArchive'])) == big['retainedSha256']

names = ['checkpoint-9b6-', 'runtime-binding-batch-', 'unit-production-']
exact = ['current-unicode-runtime-bun', 'current-unit-unicode-runtime-node',
         'current-attribute-projection-node', 'current-attribute-projection-bun',
         'current-source-proof-preservation-node', 'current-source-proof-preservation-bun']
selected = sorted(path for path in source.iterdir() if path.is_file() and
                  (any(path.name.startswith(prefix) for prefix in names) or
                   any(path.name.startswith(prefix + '.') for prefix in exact)))
inactive(selected)
target.mkdir()
records, reclaimed = [], 0
for path in selected:
    before, sha = identity(path), digest(path)
    packed = path.suffix not in ['.gz', '.xz', '.zip']
    destination = target / (path.name + ('.gz' if packed else ''))
    assert not destination.exists()
    if packed:
        with path.open('rb') as original, destination.open('xb') as output:
            with gzip.GzipFile(filename='', mode='wb', fileobj=output, compresslevel=3, mtime=0) as encoder:
                while block := original.read(65536):
                    encoder.write(block)
        assert digest(destination, gzip.open) == sha
        inactive([path])
        assert identity(path) == before and digest(path) == sha
        reclaimed += before[2] - destination.stat().st_size
        path.unlink()
    else:
        assert identity(path) == before
        path.rename(destination)
        assert digest(destination) == sha
    records.append(dict(originalPath=str(path), originalBytes=before[2], originalSha256=sha,
                        retainedPath=str(destination), retainedBytes=destination.stat().st_size,
                        retainedSha256=digest(destination), compression='gzip' if packed else 'original',
                        completeDecodedReadbackVerified=True))

receipt = dict(schema='terminal-9b6-whole-batch-custody-v1',
               publishedHead='9b6c9192c70f1f9309eac0c516b59102ce080409',
               testedMerge='f1ff442658abc26aa871d30c66d5349e488eb9c6', runId=42807280445,
               terminalJobs=len(jobs), conclusions=dict(Counter(row['conclusion'] for row in jobs)),
               everyNonpassingJobLogRetained=True, nonpassingJobIds=sorted(failed),
               artifacts=len(metadata), everyArtifactPayloadRetained=True,
               bulkOriginalZipRetained=False, bulkEveryDecodedMemberRetained=True,
               bulkDecodedMembers=len(big['members']), records=records,
               logicalBytesReclaimed=reclaimed, onlyInactiveTaskFiles=True,
               runtimeParity=False, fullGatePassed=False, currentCompilerFreshness=False)
raw = (json.dumps(receipt, separators=(',', ':')) + '\n').encode()
receipt_path = target / 'complete-custody.json.gz'
with receipt_path.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt_path.read_bytes()) == raw
print(json.dumps(dict(receipt=str(receipt_path), files=len(records), jobs=len(jobs),
                      artifacts=len(metadata), logicalBytesReclaimed=reclaimed)))
