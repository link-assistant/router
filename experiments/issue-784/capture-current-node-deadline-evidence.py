"""Retain complete inactive task audits before verified duplicate retirement."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--label', required=True)
parser.add_argument('--partial-attempt', action='append', default=[])
args = parser.parse_args()
if not re.fullmatch('[a-z0-9-]{1,80}', args.label):
    parser.error('A simple unique task label is required')
if any(not re.fullmatch('complete-[A-Za-z0-9_-]+', name)
       for name in args.partial_attempt):
    parser.error('Explicit task attempt basenames are required')
base = root / 'ci-logs/issue-784-restart-2'
packets = root / 'docs/case-studies/issue-784/evidence'
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
baseline = set()
for path in packets.glob('*.json.gz'):
    with gzip.open(path, 'rt') as stream:
        receipt = json.load(stream)
    if receipt.get('allDecodedOriginalsVerified'):
        baseline.update((row['originalPath'], row['bytes'], row['sha256'])
                        for row in receipt.get('members', [])
                        if isinstance(row.get('originalPath'), str))
members, selected = [], []
for attempt in sorted((root / 'js/node_modules/.node-case-deadlines').glob('complete-*')):
    if attempt.is_symlink() or not attempt.is_dir():
        raise RuntimeError('Ordinary task attempt directory required')
    terminal = attempt / 'terminal.json'
    partial = attempt.name in args.partial_attempt
    if not terminal.exists():
        if not partial:
            continue
    else:
        value = json.loads(terminal.read_bytes())
        cleanup = value.get('groupCleanup', {})
        if not partial and not (value.get('childClosed') and cleanup.get('complete')):
            continue
        if cleanup.get('group') and Path('/proc/' + str(cleanup['group'])).exists():
            raise RuntimeError('Task audit process group is still present')
    paths = sorted(path for path in attempt.rglob('*') if path.is_file())
    if not paths or len(paths) > 64 or any(path.is_symlink() for path in attempt.rglob('*')):
        raise RuntimeError('Bounded complete ordinary task attempt required')
    selected.append(attempt.name)
    for path in paths:
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        size = path.stat().st_size
        if (str(path), size, digest) not in baseline:
            members.append({'path': path.relative_to(root).as_posix(),
                            'originalPath': str(path), 'bytes': size, 'sha256': digest})
if not set(args.partial_attempt) <= set(selected):
    raise RuntimeError('Every explicit partial attempt must be retained whole')
if not 0 < len(members) <= 8192 or sum(row['bytes'] for row in members) >= 50_000_000:
    raise RuntimeError('Finite current task evidence scope required')
manifest = base / (args.label + '-manifest.json')
with manifest.open('x') as stream:
    json.dump({'members': members}, stream)
archive = packets / (args.label + '.tar.xz')
receipt = base / (args.label + '-capture.json')
subprocess.check_call(['python3', '-B', 'tools/evidence/capture-packet.py',
    '--source-root', str(root), '--head', head, '--manifest', str(manifest),
    '--archive', str(archive), '--receipt', str(receipt), '--cap-seconds', '600'], cwd=root)
raw = receipt.read_bytes()
target = packets / (args.label + '.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw))
if gzip.decompress(target.read_bytes()) != raw:
    raise RuntimeError('Complete storage receipt readback differs')
print(json.dumps({'selected': selected, 'newCompleteMembers': len(members),
                  'newCompleteBytes': sum(row['bytes'] for row in members),
                  'archiveBytes': archive.stat().st_size,
                  'sourceHead': head, 'captureOnly': True,
                  'fullGateQualified': False, 'runtimeParity': False}))
