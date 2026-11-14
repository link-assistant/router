"""Preserve complete terminal shard controls, local gate and published CI cycle."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
head = '645d5adf0419c588f4db93ce499163aa5c9c5557'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip() == head
base = root / 'ci-logs/issue-784-restart-2'
cycle = root / 'ci-logs/issue-784-checkpoint-a2539817c'
runs = json.loads((cycle / 'completed-head-runs.json').read_bytes())
assert len(runs) == 7 and all(row['status'] == 'completed' for row in runs)
paths = {path for path in cycle.rglob('*') if path.is_file()}
paths.update(path for path in base.glob('whole-file-shard-*') if path.is_file()
             and not path.name.startswith('whole-file-shard-capture'))
paths.update(base / name for name in [
    'whole-file-shard-capture.log', 'whole-file-shard-capture.memory.json',
    'whole-file-shard-capture-cache-reclaim.json.gz',
    'whole-file-shard-failed-partial.json',
])
paths.add(Path(__file__).resolve())
for attempt in (root / 'js/node_modules/.node-case-deadlines').glob('complete-*'):
    if not any(attempt.iterdir()):
        continue
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths.update(path for path in attempt.iterdir() if path.is_file())
memory = json.loads((base / 'whole-file-shard-full-gate.memory.json').read_bytes())
assert all(not Path('/proc/' + str(pid)).exists()
           for pid in [memory['pid'], *memory['stoppedOwnedProcessIds']])
for name in subprocess.check_output(['git', 'diff', '--name-only', '-z', 'fd960aae3e'], cwd=root).decode().split('\0'):
    if name and not name.startswith('docs/case-studies/issue-784/evidence/'):
        paths.add(root / name)
baseline = set()
for receipt in (root / 'docs/case-studies/issue-784/evidence').glob('*.json.gz'):
    value = json.loads(gzip.decompress(receipt.read_bytes()))
    if value.get('allDecodedOriginalsVerified'):
        baseline.update((row['originalPath'], row['bytes'], row['sha256'])
                        for row in value.get('members', []))
members = []
for path in sorted(paths):
    assert path.is_relative_to(root) and path.is_file() and not path.is_symlink()
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    size = path.stat().st_size
    assert size <= 128 * 1024 * 1024
    if (str(path), size, digest) not in baseline:
        members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                        'bytes': size, 'sha256': digest})
assert 0 < len(members) <= 8192 and sum(row['bytes'] for row in members) < 500_000_000
manifest = base / 'whole-file-shard-retry-evidence-manifest.json'
with manifest.open('x') as stream:
    json.dump({'members': members}, stream)
archive = root / 'docs/case-studies/issue-784/evidence/whole-file-shard-complete.tar.xz'
receipt = base / 'whole-file-shard-capture-retry.json'
subprocess.check_call(['python3', '-B', 'tools/evidence/capture-packet.py', '--source-root', str(root),
    '--head', head, '--manifest', str(manifest), '--archive', str(archive),
    '--receipt', str(receipt), '--cap-seconds', '600'], cwd=root)
raw = receipt.read_bytes()
target = archive.with_suffix('').with_suffix('.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({'completeOriginals': len(members), 'completeBytes': sum(row['bytes'] for row in members),
                  'archiveBytes': archive.stat().st_size, 'receipt': str(target)}))
