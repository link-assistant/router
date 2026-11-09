"""Move complete current CI observations to permanent case-study custody."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-ec600-ci')
assert not target.exists()
paths = sorted(p for p in base.glob('current-ec600-*') if p.is_file())
assert 50 <= len(paths) <= 128
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
selected = {str(p.resolve()) for p in paths}
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        if any(s.startswith('State:\tZ') for s in (process / 'status').read_text().splitlines()):
            continue
        for fd in (process / 'fd').iterdir():
            try:
                assert os.readlink(fd) not in selected
            except (FileNotFoundError, ProcessLookupError):
                pass
    except PermissionError:
        if process.stat().st_uid == os.getuid():
            raise
    except (FileNotFoundError, ProcessLookupError):
        pass
target.mkdir()
members = []
for source in paths:
    state = source.lstat()
    assert str(source) not in tracked and stat.S_ISREG(state.st_mode)
    assert state.st_uid == os.getuid() and state.st_nlink == 1 and state.st_size <= 4000000
    raw = source.read_bytes()
    compress = source.suffix != '.gz' and len(raw) > 65536
    destination = target / (source.name + ('.gz' if compress else ''))
    assert not destination.exists()
    if compress:
        packed = gzip.compress(raw, mtime=0)
        assert len(packed) < len(raw)
        with destination.open('xb') as output:
            output.write(packed)
        assert gzip.decompress(destination.read_bytes()) == raw
        source.unlink()
    else:
        source.rename(destination)
        assert destination.read_bytes() == raw
    members.append(dict(originalPath=str(source), retainedPath=str(destination),
        bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        compressedByThisRetention=compress, retainedBytes=destination.stat().st_size,
        retainedSha256=hashlib.sha256(destination.read_bytes()).hexdigest()))
record = dict(schema='complete-current-ci-custody-v1', headSha='ec6005a8358428a560bb7c685d52a32b174a74f6',
    runId=42610701304, members=members, completeReadbackVerified=True,
    unavailableJobLog=129138077110, semanticAuthority=False, runtimeParity=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with (target / 'custody.json.gz').open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress((target / 'custody.json.gz').read_bytes()) == raw
print(json.dumps(dict(files=len(members), originalBytes=sum(r['bytes'] for r in members),
    retainedBytes=sum(r['retainedBytes'] for r in members), allOriginalBytesVerified=True)))
