"""Preserve whole raw bytes of terminal attempts and one older interrupted cohort."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
head = 'fd960aae3e12882fc12284db18722e6e9376cd83'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip() == head
paths = set()
memory = json.loads((base / 'owned-matrix-stage-full-gate.memory.json').read_bytes())
if any(Path('/proc/' + str(pid)).exists() for pid in [memory['pid'], *memory['stoppedOwnedProcessIds']]):
    raise RuntimeError('An interrupted owned process is still active')
for directory in (root / 'js/node_modules/.node-case-deadlines').glob('complete-*'):
    terminal = directory / 'terminal.json'
    if terminal.is_file():
        value = json.loads(terminal.read_bytes())
        if not value['childClosed'] or not value['groupCleanup']['complete']:
            raise RuntimeError('Owned Node cleanup is incomplete')
        if Path('/proc/' + str(value['groupCleanup']['group'])).exists():
            raise RuntimeError('Owned Node process group is still active')
    # This explicitly named abandoned forward cohort predates this gate. Its
    # complete raw bytes are retained without claiming a terminal audit or a
    # relationship to the current memory-guard process tree. Retirement has
    # separate live-fd checks and full archive/member readback.
    elif directory.name != 'complete-TgsbME':
        raise RuntimeError('Unknown nonterminal attempt cannot be selected')
    paths.update(path for path in directory.iterdir() if path.is_file())
paths.add(base / 'owned-matrix-stage-full-gate-inspection.json')
paths.update(base.glob('owned-matrix-stage-*.log'))
paths.update(base.glob('owned-matrix-stage-*.json'))
paths.add(Path(__file__).resolve())
paths.add(base / 'owned-stage-node-capture.log')
members = []
for path in sorted(paths):
    if path.is_symlink():
        raise RuntimeError('Complete ordinary originals required')
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    members.append({'path': path.relative_to(root).as_posix(), 'originalPath': str(path),
                    'bytes': path.stat().st_size, 'sha256': digest})
manifest = base / 'owned-stage-node-evidence-manifest.json'
with manifest.open('x') as stream:
    json.dump({'members': members}, stream)
archive = root / 'docs/case-studies/issue-784/evidence/owned-stage-node-complete.tar.xz'
receipt = base / 'owned-stage-node-capture.json'
subprocess.check_call(['python3', '-B', 'tools/evidence/capture-packet.py', '--source-root', str(root),
    '--head', head, '--manifest', str(manifest), '--archive', str(archive),
    '--receipt', str(receipt), '--cap-seconds', '600'], cwd=root)
raw = receipt.read_bytes()
target = archive.with_suffix('').with_suffix('.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw))
if gzip.decompress(target.read_bytes()) != raw:
    raise RuntimeError('Complete capture receipt readback differs')
print(json.dumps({'completeOriginals': len(members), 'completeBytes': sum(row['bytes'] for row in members),
                  'archiveBytes': archive.stat().st_size, 'receipt': str(target)}))
