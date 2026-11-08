"""Read every original member of completed reverse and TypeScript artifacts."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / 'receiving-batch-early-artifacts.json').read_bytes())
artifacts = [row for row in snapshot['artifacts']
             if '-reverse-translation-' in row['name'] or '-typescript-' in row['name']]
assert len(artifacts) == 9
records = []
for artifact in artifacts:
    assert not artifact['expired'] and artifact['size_in_bytes'] < 1024 * 1024
    assert '15b53e31dc2436887b3d46a1576614bc037b292f' in artifact['name']
    path = base / ('receiving-batch-artifact-' + str(artifact['id']) + '.zip')
    with path.open('xb') as output, path.with_name(path.name + '.stderr').open('xb') as errors:
        subprocess.run(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                        + str(artifact['id']) + '/zip'], stdout=output, stderr=errors, check=True)
    with path.open('rb') as source:
        archive_sha256 = hashlib.file_digest(source, 'sha256').hexdigest()
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + archive_sha256
    members = []
    with zipfile.ZipFile(path) as archive:
        assert sum(row.file_size for row in archive.infolist()) < 32 * 1024 * 1024
        for member in archive.infolist():
            length, digest = 0, hashlib.sha256()
            with archive.open(member) as source:
                while block := source.read(65536):
                    length += len(block)
                    digest.update(block)
            assert length == member.file_size
            members.append({'path': member.filename, 'bytes': length,
                            'sha256': digest.hexdigest(), 'crc': member.CRC})
    records.append({'metadata': artifact, 'file': str(path), 'sha256': archive_sha256,
                    'members': members, 'completeReadbackAndCrcVerified': True})
    print(json.dumps({'artifact': artifact['id'], 'members': len(members),
                      'archiveBytes': path.stat().st_size}), flush=True)
with (base / 'receiving-batch-early-artifact-verification.json').open('x') as output:
    json.dump({'schema': 'early-complete-current-artifact-verification-v1',
               'runId': 42443083163, 'headSha': '28aba1b62f98608e65bb86bb550e0debe4445f16',
               'records': records, 'completeCycleCollected': False}, output)
