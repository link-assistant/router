"""Losslessly compress explicit inactive task logs or one closed command record."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--closed-attempt')
parser.add_argument('--closed-investigations', action='store_true')
parser.add_argument('--receipt', default='reverse-shard-inactive-evidence-compression.json')
args = parser.parse_args()
assert not (args.closed_attempt and args.closed_investigations)
assert Path(args.receipt).name == args.receipt and args.receipt.endswith('.json')
paths = [root / 'ci-logs' / name for name in [
    'restart-export-published-review.diff',
    'restart-published-review.diff',
    'restart-review-published.diff',
]] + [base / 'native-regeneration-before-csv-cache-advice.json']
if args.closed_attempt:
    assert Path(args.closed_attempt).name == args.closed_attempt and args.closed_attempt.startswith('complete-')
    attempt = root / 'js/node_modules/.node-case-deadlines' / args.closed_attempt
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths = [attempt / 'command.json']
elif args.closed_investigations:
    # Complete historical task outputs only. Neither path is an input or cache.
    paths = [root / 'experiments/issue-784/local-gate-bounded.log',
             base / 'owned-allocation-analysis.json']
receipt = base / args.receipt
assert not receipt.exists()


def digest(path, compressed=False):
    result, length = hashlib.sha256(), 0
    opener = gzip.open if compressed else open
    with opener(path, 'rb') as source:
        while block := source.read(1024 * 1024):
            result.update(block)
            length += len(block)
    return length, result.hexdigest()


active = set()
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for fd in (process / 'fd').iterdir():
            try:
                active.add(os.readlink(fd))
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
assert all(str(path) not in active for path in paths)
rows = []
for path in paths:
    state = path.lstat()
    assert path.is_file() and not path.is_symlink() and state.st_uid == os.getuid()
    assert state.st_nlink == 1 and state.st_size <= 32 * 1024 * 1024
    target = path.with_name(path.name + '.gz')
    original = digest(path)
    with target.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', compresslevel=6, mtime=0) as encoded:
            with path.open('rb') as source:
                while block := source.read(1024 * 1024):
                    encoded.write(block)
    assert digest(target, compressed=True) == original == digest(path)
    after = path.stat()
    assert (after.st_ino, after.st_size, after.st_mtime_ns) == (state.st_ino, state.st_size, state.st_mtime_ns)
    rows.append({'originalPath': str(path), 'compressedPath': str(target),
                 'originalBytes': original[0], 'originalSha256': original[1],
                 'compressedBytes': target.stat().st_size,
                 'completeReadbackVerified': True,
                 'allocatedBytesReclaimed': state.st_blocks * 512 - target.stat().st_blocks * 512})
    path.unlink()
with receipt.open('x') as output:
    json.dump({'rows': rows, 'completeOriginalsPreserved': True,
               'scope': 'Explicit inactive task logs or closed command record only. Complete gzip readback retains all original bytes; no source, active output, cache or foreign path.'}, output)
print(json.dumps({'completeFiles': len(rows), 'logicalBytesReclaimed': sum(row['originalBytes'] - row['compressedBytes'] for row in rows),
                  'allocatedBytesReclaimed': sum(row['allocatedBytesReclaimed'] for row in rows)}))
