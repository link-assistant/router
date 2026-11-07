"""Remove only inactive task attempts whose complete bytes remain in packets."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import tarfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[2]
attempts = root / 'js/node_modules/.node-case-deadlines'
packets = root / 'docs/case-studies/issue-784/evidence'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--receipt', default='archived-node-retirement.json')
args = parser.parse_args()
if Path(args.receipt).name != args.receipt or not args.receipt.endswith('.json'):
    parser.error('receipt must be a JSON filename in the task evidence directory')
receipt = root / 'ci-logs/issue-784-restart-2' / args.receipt
if receipt.exists():
    raise RuntimeError('Refusing to overwrite cleanup evidence')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


available, manifests = {}, {}
for path in sorted(packets.glob('*.json.gz')):
    with gzip.open(path, 'rt') as stream:
        manifest = json.load(stream)
    if not manifest.get('allDecodedOriginalsVerified'):
        continue
    manifests[str(path)] = manifest
    for row in manifest.get('members', []):
        available.setdefault(row.get('originalPath'), []).append((str(path), row))

selected = []
for attempt in sorted(attempts.glob('complete-*')):
    if attempt.is_symlink() or not attempt.is_dir() or not (attempt / 'terminal.json').is_file():
        continue
    files = sorted(path for path in attempt.rglob('*') if path.is_file())
    if not files or len(files) > 64 or any(path.is_symlink() for path in attempt.rglob('*')):
        continue
    retained = []
    for path in files:
        options = available.get(str(path), [])
        match = next(((packet, row) for packet, row in options
                      if row['bytes'] == path.stat().st_size and row['sha256'] == digest(path)), None)
        if match is None:
            break
        retained.append({'path': str(path), 'packet': match[0], **match[1]})
    else:
        selected.append({'path': str(attempt), 'files': retained})
if not selected or len(selected) > 128:
    raise RuntimeError('Expected a bounded identified task selection')
selected_roots = [row['path'] for row in selected]


def assert_inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdigit():
            continue
        links = [process / 'cwd', process / 'exe']
        try:
            links.extend((process / 'fd').iterdir())
        except OSError:
            pass
        for link in links:
            try:
                target = os.readlink(link).removesuffix(' (deleted)')
            except OSError:
                continue
            if any(target == path or target.startswith(path + '/') for path in selected_roots):
                raise RuntimeError('Active task evidence reference: ' + str(process))


assert_inactive()
wanted = {}
for attempt in selected:
    for row in attempt['files']:
        wanted.setdefault(row['packet'], {})[row['path']] = row
for packet, rows in wanted.items():
    manifest = manifests[packet]
    archive = root / manifest['archive']
    if archive.stat().st_size != manifest['archiveBytes'] or digest(archive) != manifest['archiveSha256']:
        raise RuntimeError('Preserved complete packet changed')
    verified, member_bytes = set(), {}
    with tarfile.open(archive, 'r|xz') as source:
        for member in source:
            actual = None
            if member.isfile():
                with source.extractfile(member) as stream:
                    actual = (member.size, hashlib.file_digest(stream, 'sha256').hexdigest())
            elif member.islnk():
                actual = member_bytes.get(member.linkname)
                if actual is None:
                    raise RuntimeError('Unresolved archived regular-file hard link')
            if actual is not None:
                member_bytes[member.name] = actual
            row = rows.get(member.name)
            if row is None:
                continue
            if actual != (row['bytes'], row['sha256']) or member.name in verified:
                raise RuntimeError('Unexpected preserved complete member: ' + json.dumps({
                    'packet': packet, 'member': member.name, 'bytes': member.size,
                    'expectedBytes': row['bytes'], 'type': str(member.type),
                    'duplicate': member.name in verified}))
            verified.add(member.name)
    if verified != set(rows):
        raise RuntimeError('Missing complete archived original')

assert_inactive()
before = shutil.disk_usage(root).free
allocated = 0
for attempt in selected:
    for row in attempt['files']:
        path = root / row['path']
        if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
            raise RuntimeError('Original changed before cleanup')
        allocated += path.stat().st_blocks * 512
    shutil.rmtree(attempt['path'])
result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'removed': selected,
          'completeArchivedBytesVerified': sum(row['bytes'] for item in selected for row in item['files']),
          'fileAllocationBytesRemoved': allocated,
          'observedFilesystemFreeDeltaBytes': shutil.disk_usage(root).free - before,
          'activeReferences': [], 'allSelectedOriginalsRetainedInPackets': True,
          'rustToolsExecuted': False}
with receipt.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: value for key, value in result.items() if key != 'removed'}))
