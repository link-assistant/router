"""Read every original member of the selected completed CI artifacts."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', default='receiving-batch-early-artifacts.json')
parser.add_argument('--output', default='receiving-batch-early-artifact-verification.json')
parser.add_argument('--prefix', default='receiving-batch-artifact')
parser.add_argument('--head', default='28aba1b62f98608e65bb86bb550e0debe4445f16')
parser.add_argument('--merge-head', default='15b53e31dc2436887b3d46a1576614bc037b292f')
parser.add_argument('--run', type=int, default=42443083163)
parser.add_argument('--count', type=int, default=9)
parser.add_argument('--all-artifacts', action='store_true')
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / args.snapshot).read_bytes())
pages = snapshot if isinstance(snapshot, list) else [snapshot]
artifacts = [row for page in pages for row in page['artifacts']
             if args.all_artifacts or '-reverse-translation-' in row['name'] or '-typescript-' in row['name']]
assert len(artifacts) == args.count
assert len(args.head) == len(args.merge_head) == 40
assert all(char in '0123456789abcdef' for char in args.head + args.merge_head)
assert '/' not in args.prefix and '/' not in args.output
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]

def allocation():
    return sum(path.stat().st_size for root in roots for path in root.rglob('*')
               if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)

records = []
for artifact in artifacts:
    assert not artifact['expired'] and artifact['size_in_bytes'] < 16 * 1024 * 1024
    assert args.merge_head in artifact['name']
    path = base / (args.prefix + '-' + str(artifact['id']) + '.zip')
    reused = path.exists()
    assert allocation() + (0 if reused else artifact['size_in_bytes']) < 498_000_000
    if not reused:
        with path.open('xb') as output, path.with_name(path.name + '.stderr').open('xb') as errors:
            subprocess.run(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                            + str(artifact['id']) + '/zip'], stdout=output, stderr=errors, check=True)
    with path.open('rb') as source:
        archive_sha256 = hashlib.file_digest(source, 'sha256').hexdigest()
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + archive_sha256
    members = []
    with zipfile.ZipFile(path) as archive:
        assert sum(row.file_size for row in archive.infolist()) < 128 * 1024 * 1024
        for member in archive.infolist():
            assert member.file_size < 128 * 1024 * 1024
            length, digest = 0, hashlib.sha256()
            with archive.open(member) as source:
                while block := source.read(65536):
                    length += len(block)
                    digest.update(block)
            assert length == member.file_size
            members.append({'path': member.filename, 'bytes': length,
                            'sha256': digest.hexdigest(), 'crc': member.CRC})
    records.append({'metadata': artifact, 'file': str(path), 'sha256': archive_sha256, 'reused': reused,
                    'members': members, 'completeReadbackAndCrcVerified': True})
    print(json.dumps({'artifact': artifact['id'], 'members': len(members),
                      'archiveBytes': path.stat().st_size}), flush=True)
with (base / args.output).open('x') as output:
    json.dump({'schema': 'complete-current-artifact-verification-v1',
               'runId': args.run, 'headSha': args.head,
               'records': records, 'completeCycleCollected': False}, output)
