"""Retire inactive CI duplicates only after verifying their complete packet bytes."""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import tarfile

root = Path(__file__).resolve().parents[2]
ci = root / 'ci-logs'
packets = root / 'docs/case-studies/issue-784/evidence'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--receipt', required=True)
parser.add_argument('--current-cycle', required=True)
parser.add_argument('--restart-diff', action='append', default=[],
                    help='Explicit inactive complete PR diff already retained in a verified packet')
parser.add_argument('--restart-profile', action='append', default=[],
                    choices=['native-typescript-' + label + '-' + kind + '.json.gz'
                             for label in ['baseline', 'batch-candidate', 'batch-candidate-qualified']
                             for kind in ['cpu', 'outputs']],
                    help='Explicit inactive full native profile/output already verified in a packet')
args = parser.parse_args()
if len(set(args.restart_profile)) != len(args.restart_profile):
    parser.error('each explicit complete native profile must be unique')
if (len(set(args.restart_diff)) != len(args.restart_diff)
        or any(Path(name).name != name or not name.endswith(('.diff', '.diff.gz', '.patch.gz'))
               for name in args.restart_diff)):
    parser.error('each explicit restart selection must be a unique complete diff filename')
if (Path(args.current_cycle).name != args.current_cycle
        or not args.current_cycle.startswith('issue-784-checkpoint-')
        or not (ci / args.current_cycle).is_dir()):
    parser.error('the actual complete published-head cycle directory is required')
if Path(args.receipt).name != args.receipt or not args.receipt.endswith('.json'):
    parser.error('receipt must be a new JSON filename')
receipt = ci / 'issue-784-restart-2' / args.receipt
if receipt.exists():
    raise RuntimeError('Refusing to replace earlier cleanup evidence')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


selected, manifests = {}, {}
for manifest_path in sorted(packets.glob('*.json.gz')):
    with gzip.open(manifest_path, 'rt') as stream:
        manifest = json.load(stream)
    if not manifest.get('allDecodedOriginalsVerified'):
        continue
    manifests[str(manifest_path)] = manifest
    for row in manifest.get('members', []):
        path = Path(row.get('originalPath', ''))
        if not path.is_absolute() or not path.is_relative_to(ci):
            continue
        relative = path.relative_to(ci)
        # Keep the latest completed cycle and every current producer input.
        # The restart directory selection contains only old page-advice receipts.
        if relative.parts[0] == args.current_cycle:
            continue
        if relative.parts[0] == 'issue-784-restart-2' and not (
                path.name.endswith(('-pages.json', '-cache-reclaim.json'))
                or path.name == 'phased-equations-initial-cache.json'
                or path.name in args.restart_diff
                or path.name in args.restart_profile):
            continue
        if path.is_symlink() or not path.is_file() or path.stat().st_uid != os.getuid():
            continue
        if path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
            continue
        selected[str(path)] = {'packet': str(manifest_path), **row}
if not selected or len(selected) > 2048 or sum(row['bytes'] for row in selected.values()) > 500_000_000:
    raise RuntimeError('Expected a bounded identified archived task selection')
if set(args.restart_diff) != {Path(name).name for name in selected
                            if Path(name).parent == ci / 'issue-784-restart-2'
                            and Path(name).name in args.restart_diff}:
    raise RuntimeError('Every explicit complete diff must have an exact archived copy')
if set(args.restart_profile) != {Path(name).name for name in selected
                               if Path(name).parent == ci / 'issue-784-restart-2'
                               and Path(name).name in args.restart_profile}:
    raise RuntimeError('Every explicit full native profile must have an exact archived copy')


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
            if target in selected:
                raise RuntimeError('Active evidence reference: ' + str(process))


assert_inactive()
wanted = {}
for row in selected.values():
    wanted.setdefault(row['packet'], {})[row['path']] = row
for manifest_path, rows in wanted.items():
    manifest = manifests[manifest_path]
    archive = root / manifest['archive']
    if archive.stat().st_size != manifest['archiveBytes'] or digest(archive) != manifest['archiveSha256']:
        raise RuntimeError('Preserved packet differs')
    verified, originals = set(), {}
    with tarfile.open(archive, 'r|xz') as source:
        for member in source:
            actual = None
            if member.isfile():
                with source.extractfile(member) as stream:
                    actual = (member.size, hashlib.file_digest(stream, 'sha256').hexdigest())
            elif member.islnk():
                actual = originals.get(member.linkname)
                if actual is None:
                    raise RuntimeError('Unresolved preserved hard link')
            if actual is not None:
                originals[member.name] = actual
            row = rows.get(member.name)
            if row is None:
                continue
            if member.name in verified or actual != (row['bytes'], row['sha256']):
                raise RuntimeError('Complete preserved member differs')
            verified.add(member.name)
    if verified != set(rows):
        raise RuntimeError('Complete preserved original missing')

assert_inactive()
before, allocated = shutil.disk_usage(root).free, 0
for name, row in selected.items():
    path = Path(name)
    if path.is_symlink() or path.stat().st_size != row['bytes'] or digest(path) != row['sha256']:
        raise RuntimeError('Task original changed before retirement')
    allocated += path.stat().st_blocks * 512
    path.unlink()
result = {'checkedAt': datetime.now(timezone.utc).isoformat(),
          'removed': list(selected.values()), 'activeReferences': [],
          'completeArchivedBytesVerified': sum(row['bytes'] for row in selected.values()),
          'fileAllocationBytesRemoved': allocated,
          'observedFilesystemFreeDeltaBytes': shutil.disk_usage(root).free - before,
          'allSelectedOriginalsRetainedInPackets': True, 'rustToolsExecuted': False}
with receipt.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: value for key, value in result.items() if key != 'removed'}))
