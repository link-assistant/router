"""Retain and stream-verify every artifact in one immutable current CI snapshot."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
text = (base / 'checkpoint-9b6-current-artifacts.json').read_text()
decoder, artifacts = json.JSONDecoder(), []
while text.strip():
    page, end = decoder.raw_decode(text.lstrip())
    artifacts.extend(page['artifacts'])
    text = text.lstrip()[end:]
records, pending = [], []
for artifact in artifacts:
    assert not artifact['expired']
    assert 'f1ff442658abc26aa871d30c66d5349e488eb9c6' in artifact['name']
    if artifact['size_in_bytes'] >= 16_000_000:
        pending.append(artifact)
        print(json.dumps(dict(pendingLargeArtifact=artifact['id'], bytes=artifact['size_in_bytes'],
                              reason='Needs separate bounded, decoded whole-member custody')), flush=True)
        continue
    path = base / ('checkpoint-9b6-artifact-' + str(artifact['id']) + '.zip')
    if not path.exists():
        size = 0
        for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                     'js/node_modules/.node-case-deadlines']:
            for parent, directories, files in os.walk(root):
                directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
                size += sum((Path(parent) / name).stat().st_size for name in files
                            if not (Path(parent) / name).is_symlink())
        assert size + artifact['size_in_bytes'] < 498_000_000, size
        with path.open('xb') as output:
            subprocess.run(['gh', 'api', '--allow-escape-sequences',
                            'repos/link-assistant/router/actions/artifacts/' + str(artifact['id']) + '/zip'],
                           stdout=output, check=True)
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert path.stat().st_size == artifact['size_in_bytes']
    assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + digest
    members, audits = [], []
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
            if row.filename.endswith('/case-deadlines.json'):
                audit = json.loads(archive.read(row))
                audits.append({key: audit.get(key) for key in [
                    'passed', 'observedCompletedCases', 'observedFiniteDeadlineCases',
                    'durationBreaches', 'errors', 'unobservedFiniteSourceDeadlines',
                    'originalFailedCompletionEvents',
                ]})
    record = dict(metadata=artifact, file=str(path), sha256=digest, members=members,
                  audits=audits, completeReadbackAndCrcVerified=True)
    target = path.with_suffix('.json')
    if not target.exists():
        target.write_text(json.dumps(record, separators=(',', ':')) + '\n')
    records.append(record)
    print(json.dumps(dict(artifact=artifact['id'], bytes=path.stat().st_size,
                          members=len(members), audits=audits)), flush=True)
target = base / 'checkpoint-9b6-artifact-verification.json'
target.write_text(json.dumps(dict(schema='9b6-current-artifacts-v1', records=records,
                                 pendingLargeArtifacts=pending, completeCycleCollected=False), separators=(',', ':')) + '\n')
