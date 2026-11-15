"""Preserve both complete gate attempts and bounded, unqualified diagnostics."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
assert head == '5ef26549252f406e3e03aa5aa7f3a487121ceaa1'
resource = json.loads((base / 'current-5ef265-complete-gate-2-resource.json').read_text())
assert resource['stopped'] and resource['exitCode'] == 143
assert resource['stopThresholdBytes'] == 2866933760
for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
prefixes = ('current-5ef265-', 'current-native-meta-lifetime-',
            'current-derive-path-index-reentry')
paths = {p for p in base.iterdir() if p.is_file() and p.name.startswith(prefixes)}
paths.update(p for p in (base / 'current-draft-sources').iterdir() if p.is_file())
paths.update(Path('experiments/issue-784') / name for name in [
    'archive-5ef265-gate-node-audits.py', 'archive-5ef265-gate-evidence.py',
    'current-5ef265-gate-continuation.md', 'draft-derive-path-index-reentry.py',
    'draft-native-meta-lifetime-producer.py', 'profile-owned-gate-canonical-process.mjs',
    'summarize-owned-cpu-profile.py'])
assert 1 <= len(paths) <= 64
members = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    members.append({'path': path.as_posix(), 'originalPath': str(root / path),
                    'bytes': path.stat().st_size, 'sha256': digest})
assert sum(row['bytes'] for row in members) < 8 * 1024 * 1024
manifest = base / 'complete-gate-5ef265-evidence-manifest.json'
with manifest.open('x') as output:
    json.dump({'members': members}, output)
archive = Path('docs/case-studies/issue-784/evidence/complete-gate-5ef265-20261110.tar.xz')
receipt = base / 'complete-gate-5ef265-capture.json'
subprocess.check_call(['python3', '-B', 'tools/evidence/capture-packet.py',
    '--source-root', str(root), '--head', head, '--manifest', str(manifest),
    '--archive', str(archive), '--receipt', str(receipt), '--cap-seconds', '600'])
raw = receipt.read_bytes()
target = archive.with_name('complete-gate-5ef265-20261110.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({'members': len(members), 'completeRawBytes': sum(row['bytes'] for row in members),
                  'archiveBytes': archive.stat().st_size, 'archive': str(archive),
                  'gatePassed': False, 'retiredRawFiles': 0}))
