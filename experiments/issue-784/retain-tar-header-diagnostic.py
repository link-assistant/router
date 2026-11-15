"""Keep the complete unsuccessful speed experiment before restoring its inputs."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
evidence = Path('docs/case-studies/issue-784/evidence')
proposal = json.loads(gzip.decompress((base / 'tar-header-complete-proposal.json.gz').read_bytes()))
before = json.loads(gzip.decompress((base / 'tar-checksum-base64-before-result.json.gz').read_bytes()))
after = json.loads(gzip.decompress((base / 'tar-checksum-base64-after-result.json.gz').read_bytes()))
assert before['files'] == after['files'] and before['result'] == after['result']
assert len(before['result']['program']) == 14
assert all(Path(row['path']).read_text() == row['text'] for row in proposal['files'])
drafts = [Path(proposal['helper']['path']), Path('tools/translation/prepare-tar-header-checksum.mjs'),
          Path('tools/translation/test/tar-header-checksum.test.mjs'),
          Path('tools/translation/source-profiles/tar-header-checksum/complete-original-inputs.json.gz'),
          Path('tools/translation/source-profiles/tar-header-checksum/native-checksum.mjs.txt'),
          Path('experiments/issue-784/capture-tar-header-proposal.py'),
          Path('experiments/issue-784/receive-tar-header-checksum.mjs')]
for path in drafts:
    assert not subprocess.check_output(['git', 'ls-files', '--', str(path)])
paths = set(drafts + [Path(row['path']) for row in proposal['files']]
            + [Path('experiments/issue-784/retain-tar-header-diagnostic.py'),
               Path('experiments/issue-784/profile-current-owned-base64-source.mjs'),
               Path('experiments/issue-784/run-observed-check.py')])
for prefix in ['tar-header-', 'tar-checksum-base64-']:
    paths.update(path for path in base.glob(prefix + '*') if path.is_file())
audit = Path('js/node_modules/.node-case-deadlines/complete-gFUmSM')
paths.update(path for path in audit.iterdir() if path.is_file())
auditor = json.loads((audit / 'case-deadlines.json').read_bytes())
assert auditor['passed'] and auditor['observedCompletedCases'] == 10
assert not auditor['durationBreaches'] and not auditor['errors']
archive = evidence / 'tar-header-negative-diagnostic.tar.gz'
receipt = evidence / 'tar-header-negative-diagnostic.json.gz'
assert not archive.exists() and not receipt.exists()
rows = []
with tarfile.open(archive, 'x:gz', compresslevel=6) as target:
    for path in sorted(paths):
        data = path.read_bytes()
        rows.append(dict(path=str(path), bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
        target.add(path, arcname=str(path), recursive=False)
expected = {row['path']: row for row in rows}
seen = set()
with tarfile.open(archive, 'r:gz') as source:
    for member in source:
        row = expected[member.name]
        assert member.isfile() and member.name not in seen and member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
record = dict(schema='complete-tar-header-negative-diagnostic-v1', archive=str(archive),
    bytes=archive.stat().st_size, sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
    members=rows, allCompleteMembersReadbackVerified=True,
    completeOriginalInputsAndCstProposalRetained=True, completeResultsEqual=True,
    beforeStages=before['stages'], afterStages=after['stages'], nodeCompletedCases=10,
    bunCompletedCases=10, originalDeadlineBreaches=0, productionChangeRetained=False,
    demonstratedSpeedup=False, productionExecutableGain=0, fullGatePassed=False,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
for row in proposal['files']:
    path = Path(row['path'])
    assert path.read_text() == row['text']
    path.write_text(row['source'])
for path in drafts:
    row = expected[str(path)]
    assert path.stat().st_size == row['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    path.unlink()
Path('tools/translation/source-profiles/tar-header-checksum').rmdir()
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
