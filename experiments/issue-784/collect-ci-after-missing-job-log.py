"""Preserve every available official log after the exact cancelled-job 404.

Missing original logs stay explicitly unavailable; no terminal audit is inferred.
"""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile
import xml.etree.ElementTree as ET

root = Path.cwd()
directory = root / 'ci-logs/issue-784-checkpoint-b63dd5a33'
head = 'b63dd5a337c4e17f9df51f9ce866cb73fdea7662'
repo = 'repos/link-assistant/router/'
runs = json.loads((directory / 'completed-head-runs.json').read_text())
assert len(runs) == 7 and all(row['headSha'] == head and row['status'] == 'completed' for row in runs)
main = next(row for row in runs if row['name'] == 'CI/CD Pipeline')
assert main['databaseId'] == 42430143951
missing = next(row for row in main['jobs'] if row['databaseId'] == 128577017080)
assert missing['status'] == 'completed' and missing['conclusion'] == 'cancelled'

def download(endpoint, path):
    with path.open('xb') as output, path.with_name(path.name + '.stderr').open('xb') as errors:
        result = subprocess.run(['gh', 'api', endpoint], stdout=output, stderr=errors)
    return result.returncode

retry = directory / 'job-128577017080-second-log-response.raw'
if not retry.exists():
    assert download(repo + 'actions/jobs/128577017080/logs', retry) == 1
raw_response = retry.read_bytes()
assert len(raw_response) < 4096
assert 'HTTP 404' in retry.with_name(retry.name + '.stderr').read_text()
response = ET.fromstring(raw_response.decode('utf-8-sig'))
assert response.tag == 'Error' and response.findtext('Code') == 'BlobNotFound'
archive = directory / 'complete-available-official-workflow-logs.zip'
if not archive.exists():
    assert download(repo + 'actions/runs/42430143951/logs', archive) == 0
assert zipfile.is_zipfile(archive) and archive.stat().st_size < 16 * 1024 * 1024
original_path = directory / '42430143951.log.gz'
partial = directory / '42430143951.first-partial-download.log.gz'
replaying = partial.exists()
if not replaying:
    original_path.rename(partial)
adapter = directory / 'available-workflow-log-adapter-replay.log.gz' if replaying else original_path
members = []
with zipfile.ZipFile(archive) as source, gzip.open(adapter, 'xb') as output:
    for member in source.infolist():
        assert not member.is_dir() and member.file_size < 32 * 1024 * 1024
        raw = source.read(member)
        members.append({'path': member.filename, 'bytes': len(raw),
                        'sha256': hashlib.sha256(raw).hexdigest(), 'crc': member.CRC})
        # The original member bytes remain complete in the official archive.
        # This is an explicitly labeled display adapter for line inspection.
        for line in raw.splitlines():
            output.write(member.filename.encode() + b'\tofficial archive member\t' + line + b'\n')
assert members
if replaying:
    assert gzip.decompress(adapter.read_bytes()) == gzip.decompress(original_path.read_bytes())
receipt = {'schema': 'exact-cancelled-job-log-404-recovery-v1', 'headSha': head,
           'officialArchive': archive.name, 'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
           'members': members, 'unavailableJob': missing,
           'unavailableLogResponse': raw_response.decode('utf-8-sig'),
           'allAvailableOfficialMembersReadAndCrcChecked': True,
           'allJobsHaveOriginalLogs': False, 'missingOriginalLogFabricated': False,
           'scope': 'Every available official workflow ZIP member; cancelled bin 7 log and artifact remain unavailable.'}
receipt_path = directory / 'missing-job-log-recovery.json'
if receipt_path.exists():
    assert json.loads(receipt_path.read_text()) == receipt
else:
    with receipt_path.open('x') as output:
        json.dump(receipt, output)
for run in runs:
    identity = str(run['databaseId'])
    if run is main:
        continue
    assert run['conclusion'] == 'skipped' and all(job['conclusion'] == 'skipped' and not job['steps'] for job in run['jobs'])
    with (directory / (identity + '.json')).open('x') as output:
        json.dump(run, output)
    log = directory / (identity + '.log.gz')
    with gzip.open(log, 'xb') as output, (directory / (identity + '.download.stderr')).open('xb') as errors:
        result = subprocess.run(['gh', 'run', 'view', identity, '--repo', 'link-assistant/router', '--log'], stdout=subprocess.PIPE, stderr=errors)
        assert len(result.stdout) < 1024 * 1024
        output.write(result.stdout)
    with (directory / (identity + '.download.json')).open('x') as output:
        json.dump({'run': int(identity), 'headSha': head, 'conclusion': 'skipped',
                   'downloadExitCode': result.returncode, 'completeLogBytes': len(result.stdout),
                   'jobCount': len(run['jobs']), 'scope': 'Every job skipped with no steps; preserve actual CLI response.'}, output)
pages = json.loads(subprocess.check_output(['gh', 'api', repo + 'actions/runs/42430143951/artifacts?per_page=100', '--paginate', '--slurp']))
with (directory / 'completed-artifacts.json').open('x') as output:
    json.dump(pages, output)
artifacts = []
for page in pages:
    for artifact in page['artifacts']:
        assert artifact['size_in_bytes'] < 8 * 1024 * 1024
        path = directory / ('artifact-' + str(artifact['id']) + '.zip')
        assert download(repo + 'actions/artifacts/' + str(artifact['id']) + '/zip', path) == 0
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert not artifact.get('digest') or artifact['digest'] == 'sha256:' + digest
        members = []
        with zipfile.ZipFile(path) as source:
            assert sum(row.file_size for row in source.infolist()) < 128 * 1024 * 1024
            for member in source.infolist():
                length, actual = 0, hashlib.sha256()
                with source.open(member) as stream:
                    while block := stream.read(1024 * 1024):
                        length += len(block)
                        actual.update(block)
                assert length == member.file_size
                members.append({'path': member.filename, 'bytes': length, 'sha256': actual.hexdigest(), 'crc': member.CRC})
        artifacts.append({'metadata': artifact, 'file': path.name, 'sha256': digest, 'members': members,
                          'scope': 'Complete actual ZIP members; missing bin 7 evidence remains unavailable.'})
        print(json.dumps({'artifact': artifact['id'], 'completeMembers': len(members), 'archiveBytes': path.stat().st_size}), flush=True)
with (directory / 'completed-artifact-verification.json').open('x') as output:
    json.dump(artifacts, output)
print(json.dumps({'completeWorkflowInventory': len(runs), 'availableArtifacts': len(artifacts),
                  'allAvailableOfficialLogsPreserved': True, 'originalBin7LogUnavailable': True}), flush=True)
