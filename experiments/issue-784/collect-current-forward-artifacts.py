"""Stream complete current-head artifacts within the fixed task allocation."""
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import zipfile

base = Path('ci-logs/issue-784-restart-2')
pages = json.loads((base / sys.argv[1]).read_bytes())
rows = [row for page in (pages if isinstance(pages, list) else [pages])
        for row in page['artifacts']]
selected = [row for row in rows if '-translation-' in row['name']
            and '-reverse-translation-' not in row['name']]
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]


def allocation():
    return sum(path.stat().st_size for root in roots for path in root.rglob('*')
               if path.is_file() and not path.is_symlink() and 'toolchain' not in path.parts)


records = []
for artifact in selected:
    assert not artifact['expired'] and artifact['size_in_bytes'] < 16 * 1024 * 1024
    assert '15b53e31dc2436887b3d46a1576614bc037b292f' in artifact['name']
    path = base / ('receiving-batch-artifact-' + str(artifact['id']) + '.zip')
    reused = path.exists()
    assert allocation() + (0 if reused else artifact['size_in_bytes']) < 498_000_000
    if not reused:
        with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
            subprocess.run(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                            + str(artifact['id']) + '/zip'], stdout=output,
                           stderr=errors, check=True)
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + digest
    members = []
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        assert len(entries) < 8192
        assert sum(row.file_size for row in entries) < 128 * 1024 * 1024
        seen = set()
        for member in entries:
            name = PurePosixPath(member.filename)
            assert not name.is_absolute() and '..' not in name.parts
            assert '\\' not in member.filename and member.filename not in seen
            assert not stat.S_ISLNK(member.external_attr >> 16)
            seen.add(member.filename)
            length, sha = 0, hashlib.sha256()
            with archive.open(member) as source:
                while block := source.read(65536):
                    length += len(block)
                    sha.update(block)
            assert length == member.file_size
            members.append({'path': member.filename, 'bytes': length,
                            'sha256': sha.hexdigest(), 'crc': member.CRC})
    records.append({'metadata': artifact, 'file': str(path), 'sha256': digest,
                    'members': members, 'reused': reused,
                    'completeReadbackAndCrcVerified': True})
    print(json.dumps({'artifact': artifact['id'], 'members': len(members),
                      'archiveBytes': path.stat().st_size}), flush=True)
with (base / sys.argv[2]).open('x') as output:
    json.dump({'schema': 'current-forward-complete-artifact-verification-v1',
               'runId': 42443083163,
               'headSha': '28aba1b62f98608e65bb86bb550e0debe4445f16',
               'records': records, 'completeCycleCollected': False}, output)
