"""Stream and independently read back complete selected current CI artifacts."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', required=True, type=Path)
parser.add_argument('--merge-sha', required=True)
parser.add_argument('--prefix', required=True)
parser.add_argument('ids', nargs='+', type=int)
args = parser.parse_args()
assert len(args.merge_sha) == 40 and all(c in '0123456789abcdef' for c in args.merge_sha)
assert args.prefix.isalnum() and len(args.prefix) <= 40
assert len(set(args.ids)) == len(args.ids) <= 64
base = Path('ci-logs/issue-784-restart-2')
assert args.snapshot.parent == base
pending = args.snapshot.read_text()
decoder, artifacts = json.JSONDecoder(), []
while pending.strip():
    page, end = decoder.raw_decode(pending.lstrip())
    artifacts.extend(page['artifacts'])
    pending = pending.lstrip()[end:]
selected = [a for a in artifacts if a['id'] in args.ids]
assert {a['id'] for a in selected} == set(args.ids)
size = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        size += sum((Path(parent) / name).stat().st_size for name in files
                    if not (Path(parent) / name).is_symlink())
assert size + sum(a['size_in_bytes'] for a in selected) < 498_000_000, size
for artifact in selected:
    assert not artifact['expired'] and args.merge_sha in artifact['name']
    assert artifact['size_in_bytes'] < 16_000_000
    path = base / (args.prefix + '-artifact-' + str(artifact['id']) + '.zip')
    if not path.exists():
        with path.open('xb') as output:
            subprocess.run(['gh', 'api', '--allow-escape-sequences',
                            'repos/link-assistant/router/actions/artifacts/' + str(artifact['id']) + '/zip'],
                           stdout=output, check=True)
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert path.stat().st_size == artifact['size_in_bytes']
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + digest
    members = []
    with zipfile.ZipFile(path) as archive:
        assert sum(row.file_size for row in archive.infolist()) < 128_000_000
        for row in archive.infolist():
            length, sha = 0, hashlib.sha256()
            with archive.open(row) as source:
                while block := source.read(65536):
                    length += len(block)
                    sha.update(block)
            assert length == row.file_size
            members.append(dict(path=row.filename, bytes=length, sha256=sha.hexdigest(), crc=row.CRC))
    record = dict(metadata=artifact, file=str(path), sha256=digest, members=members,
                  completeReadbackAndCrcVerified=True, completeCycleCollected=False)
    target = path.with_suffix('.json')
    if target.exists():
        assert json.loads(target.read_text()) == record
    else:
        target.write_text(json.dumps(record, separators=(',', ':')) + '\n')
    print(json.dumps(dict(artifact=artifact['id'], bytes=path.stat().st_size,
                          members=len(members), completeReadbackAndCrcVerified=True)), flush=True)
