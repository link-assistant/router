"""Retire only verified inactive raw duplicates of a complete retained packet."""
from pathlib import Path
import base64
import gzip
import hashlib
import json
import os
import subprocess
import sys

if sys.argv[1:] not in ([], ['--real-source-fixture']):
    raise RuntimeError('Only two explicit complete task packets are selectable')
receiving = sys.argv[1:] == ['--real-source-fixture']
stem = 'current-real-source-fixture-receiving' if receiving else 'current-vector-writer-withdrawal'
packet = Path('docs/case-studies/issue-784/evidence/' + stem + '.json.gz')
packed = packet.read_bytes()
document = json.loads(gzip.decompress(packed))
rows = []
for row in document['members' if receiving else 'files']:
    path = Path(row['path'])
    if not (str(path).startswith('ci-logs/issue-784-restart-2/')
            or str(path).startswith('js/node_modules/.node-case-deadlines/')):
        continue
    restored = base64.b64decode(row['contentBase64'])
    if len(restored) != row['bytes'] or hashlib.sha256(restored).hexdigest() != row['sha256']:
        raise RuntimeError('Complete packet member differs')
    if path.read_bytes() != restored:
        raise RuntimeError('Loose member differs')
    if subprocess.check_output(['git', 'ls-files', '--', str(path)]).strip():
        raise RuntimeError('Refusing tracked original')
    state = path.stat()
    rows.append({k: row[k] for k in ['path', 'bytes', 'sha256']} | {
        'device': state.st_dev, 'inode': state.st_ino,
        'allocatedBytes': state.st_blocks * 512})

identities = {(row['device'], row['inode']) for row in rows}
for pid in Path('/proc').iterdir():
    if not pid.name.isdigit():
        continue
    try:
        descriptors = list((pid / 'fd').iterdir())
    except (FileNotFoundError, PermissionError):
        continue
    for descriptor in descriptors:
        try:
            state = descriptor.stat()
        except (FileNotFoundError, PermissionError):
            continue
        if (state.st_dev, state.st_ino) in identities:
            raise RuntimeError('Refusing open member: ' + str(descriptor))

for row in rows:
    path = Path(row['path'])
    state = path.stat()
    if (state.st_dev, state.st_ino) != (row['device'], row['inode']):
        raise RuntimeError('Loose member identity changed')
    if hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
        raise RuntimeError('Loose member changed')
    path.unlink()

receipt = {
    'schema': 'complete-withdrawn-writer-duplicate-retirement-v1',
    'packet': str(packet), 'packetBytes': len(packed),
    'packetSha256': hashlib.sha256(packed).hexdigest(),
    'completeMemberReadback': True, 'noSelectedMemberOpen': True,
    'removed': rows,
    'reclaimedLogicalBytes': sum(row['bytes'] for row in rows),
    'reclaimedAllocatedBytes': sum(row['allocatedBytes'] for row in rows),
    'sourceAndVerdictsUnchanged': True,
}
target = Path('docs/case-studies/issue-784/evidence/' + ('current-real-source-fixture' if receiving else 'current-vector-writer') + '-duplicate-retirement.json.gz')
raw = (json.dumps(receipt, separators=(',', ':')) + '\n').encode()
target.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({key: value for key, value in receipt.items() if key != 'removed'}))
