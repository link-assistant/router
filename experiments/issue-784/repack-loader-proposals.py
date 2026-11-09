"""Stream closed source proposals to XZ, verify all bytes, then retire gzip copies."""
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import sys

base = Path('ci-logs/issue-784-restart-2')
assert sys.argv[1:] in ([], ['--history'])
history = sys.argv[1:] == ['--history']
labels = (['current-loader-history-before-reclaimed', 'current-loader-history-after'] if history
          else ['current-loader-batch-proposal', 'current-loader-batch-complete-proposal'])
summaries = [base / (name + '-summary.json') for name in labels]
receipt = base / ('current-loader-history-repacking.json' if history
                  else 'current-loader-proposals-repacking.json')
assert not receipt.exists()
rows = []


def allocation():
    total = 0
    for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                 'js/node_modules/.node-case-deadlines']:
        for parent, dirs, files in os.walk(root):
            dirs[:] = [name for name in dirs if name != 'toolchain']
            for name in files:
                path = Path(parent) / name
                if not path.is_symlink():
                    total += path.stat().st_size
    return total


def inactive(path):
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) != str(path.resolve())
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


def stable_identity(state):
    # Reading the original gzip can update atime; it cannot change these fields.
    return (state.st_dev, state.st_ino, state.st_mode, state.st_nlink, state.st_uid,
            state.st_gid, state.st_size, state.st_mtime_ns, state.st_ctime_ns)


before = allocation()
for summary in summaries:
    for entry in json.loads(summary.read_bytes())['rows']:
        source = Path(entry['output'])
        target = source.with_suffix('.xz')
        if not source.exists():
            # An earlier interrupted pass retired two verified inputs before
            # an atime-only identity assertion stopped it. Reverify all DATA.
            assert target.is_file() and not target.is_symlink()
            assert target.stat().st_nlink == 1 and target.stat().st_uid == os.getuid()
            inactive(target)
            digest, size = hashlib.sha256(), 0
            with lzma.open(target, 'rb') as retained:
                while block := retained.read(65536):
                    size += len(block)
                    assert size <= 64 * 1024 * 1024
                    digest.update(block)
            assert size == entry['bytes'] and digest.hexdigest() == entry['sha256']
            rows.append({'source': str(source), 'retained': str(target),
                         'sourceBytes': None, 'retainedBytes': target.stat().st_size,
                         'decodedBytes': size, 'decodedSha256': digest.hexdigest(),
                         'recoveredAlreadyRetiredInput': True})
            continue
        state = source.lstat()
        assert source.is_file() and not source.is_symlink()
        assert state.st_uid == os.getuid() and state.st_nlink == 1
        inactive(source)
        recovered = target.exists()
        if recovered:
            assert target.is_file() and not target.is_symlink()
            assert target.stat().st_nlink == 1 and target.stat().st_uid == os.getuid()
            inactive(target)
        remaining = 499_000_000 - allocation()
        digest, size = hashlib.sha256(), 0
        with gzip.open(source, 'rb') as original:
            compressor = lzma.LZMACompressor(preset=1)
            output = None if recovered else target.open('xb')
            try:
                while block := original.read(65536):
                    size += len(block)
                    assert size <= 64 * 1024 * 1024
                    digest.update(block)
                    if output is not None:
                        packed = compressor.compress(block)
                        assert output.tell() + len(packed) < remaining
                        output.write(packed)
                if output is not None:
                    packed = compressor.flush()
                    assert output.tell() + len(packed) < remaining
                    output.write(packed)
            finally:
                if output is not None:
                    output.close()
        assert size == entry['bytes'] and digest.hexdigest() == entry['sha256']
        with lzma.open(target, 'rb') as check:
            retained_digest = hashlib.file_digest(check, 'sha256').hexdigest()
        assert retained_digest == digest.hexdigest()
        inactive(source)
        assert stable_identity(source.lstat()) == stable_identity(state)
        rows.append({'source': str(source), 'retained': str(target),
                     'sourceBytes': state.st_size, 'retainedBytes': target.stat().st_size,
                     'decodedBytes': size, 'decodedSha256': retained_digest,
                     'recoveredVerifiedTarget': recovered})
        source.unlink()
result = {'beforeBytes': before, 'afterBytes': allocation(), 'members': rows,
          'allOriginalDecodedBytesVerified': True, 'ciLogsRemoved': False}
receipt.write_text(json.dumps(result, indent=2))
print(json.dumps({key: value for key, value in result.items() if key != 'members'}))
