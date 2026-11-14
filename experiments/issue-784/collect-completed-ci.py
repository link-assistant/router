"""Download the entire published-head cycle only after all runs finish."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', default='84779613d2a334d131083c4bb4eff7f1680e8add')
parser.add_argument('--directory', type=Path, default=Path('ci-logs/issue-784-restart-2'))
parser.add_argument('--runs', type=Path, default=Path('ci-logs/issue-784-restart-2/new-head-runs.json'))
args = parser.parse_args()
head = args.head
if len(head) != 40 or any(char not in '0123456789abcdef' for char in head):
    raise RuntimeError('An exact published head SHA is required')
directory = (root / args.directory).resolve()
if not directory.is_relative_to(root / 'ci-logs'):
    raise RuntimeError('CI evidence must remain inside this task ci-logs directory')
directory.mkdir(parents=True, exist_ok=True)
repo = 'link-assistant/router'
originals = json.loads((root / args.runs).read_text())
selected = [row for row in originals if row['headSha'] == head]
if len(selected) != 7:
    raise RuntimeError('Expected the complete seven-workflow published cycle')

def run_json(arguments):
    return json.loads(subprocess.check_output(['gh', *arguments], cwd=root))

pages = run_json(['api', 'repos/' + repo + '/actions/runs?branch=issue-784-1f6838f56841&head_sha=' + head + '&per_page=100',
                  '--paginate', '--slurp'])
discovered = [row for page in pages for row in page['workflow_runs']]
if {row['id'] for row in discovered} != {row['databaseId'] for row in selected} or any(
        row['head_sha'] != head for row in discovered):
    raise RuntimeError('Published-head workflow inventory changed; review the entire discovered cycle')
terminal = []
for row in selected:
    current = run_json(['run', 'view', str(row['databaseId']), '--repo', repo,
                        '--json', 'databaseId,name,status,conclusion,headSha,createdAt,updatedAt,url,jobs'])
    if current['headSha'] != head or current['status'] != 'completed' or any(
            job['status'] != 'completed' for job in current['jobs']):
        raise RuntimeError('Entire cycle is not terminal: ' + str(row['databaseId']))
    terminal.append(current)
with (directory / 'completed-head-runs-api.json').open('x') as target:
    json.dump(pages, target)
    target.write('\n')
with (directory / 'completed-head-runs.json').open('x') as target:
    json.dump(terminal, target)
    target.write('\n')
for row in terminal:
    identifier = str(row['databaseId'])
    with (directory / (identifier + '.json')).open('x') as target:
        json.dump(row, target)
        target.write('\n')
    with (directory / (identifier + '.log.gz')).open('xb') as target:
        with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=6, mtime=0) as output:
            with (directory / (identifier + '.download.stderr')).open('xb') as errors:
                child = subprocess.Popen(['gh', 'run', 'view', identifier, '--repo', repo, '--log'],
                                         cwd=root, stdout=subprocess.PIPE, stderr=errors)
                size = 0
                while block := child.stdout.read(1024 * 1024):
                    size += len(block)
                    if size > 128 * 1024 * 1024:
                        child.terminate()
                        child.wait()
                        raise RuntimeError('Complete workflow log exceeds member bound')
                    output.write(block)
                child.stdout.close()
                code = child.wait()
    receipt = {'run': int(identifier), 'headSha': head, 'conclusion': row['conclusion'],
               'downloadExitCode': code, 'completeLogBytes': size,
               'jobCount': len(row['jobs']),
               'scope': 'A skipped workflow may have no job log; preserve the actual CLI error and result.'}
    with (directory / (identifier + '.download.json')).open('x') as target:
        json.dump(receipt, target)
        target.write('\n')
    print(json.dumps(receipt), flush=True)
    if code and row['jobs']:
        raise RuntimeError('Failed to download a workflow with actual job results')
main = next(row for row in terminal if row['name'] == 'CI/CD Pipeline')
with (directory / 'current-run-status.json').open('w') as target:
    json.dump(main, target)
    target.write('\n')
artifact_pages = run_json(['api', 'repos/' + repo + '/actions/runs/' + str(main['databaseId']) + '/artifacts?per_page=100',
                          '--paginate', '--slurp'])
with (directory / 'completed-artifacts.json').open('x') as target:
    json.dump(artifact_pages, target)
    target.write('\n')
artifacts = []
existing = {13568070179: 'reverse-artifact.zip', 13566827650: 'typescript-artifact.zip'}
for page in artifact_pages:
    for artifact in page['artifacts']:
        path = directory / existing.get(artifact['id'], 'artifact-' + str(artifact['id']) + '.zip')
        if artifact['id'] not in existing:
            with path.open('xb') as target:
                subprocess.run(['gh', 'api', 'repos/' + repo + '/actions/artifacts/' + str(artifact['id']) + '/zip'],
                               cwd=root, stdout=target, check=True)
        with path.open('rb') as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        if artifact.get('digest') and artifact['digest'] != 'sha256:' + digest:
            raise RuntimeError('Artifact archive digest disagrees with GitHub metadata')
        members = []
        total = 0
        with zipfile.ZipFile(path) as archive:
            for member in archive.infolist():
                total += member.file_size
                if member.file_size > 128 * 1024 * 1024 or total > 500_000_000:
                    raise RuntimeError('Complete artifact exceeds the receiving byte bound')
                digest_member = hashlib.sha256()
                with archive.open(member) as source:
                    while block := source.read(1024 * 1024):
                        digest_member.update(block)
                members.append({'path': member.filename, 'bytes': member.file_size,
                                'sha256': digest_member.hexdigest(), 'crc': member.CRC})
        artifacts.append({'metadata': artifact, 'file': path.name, 'sha256': digest,
                          'members': members, 'scope': 'Every complete ZIP member read and CRC-checked; no missing terminal audit is inferred.'})
with (directory / 'completed-artifact-verification.json').open('x') as target:
    json.dump(artifacts, target)
    target.write('\n')
print(json.dumps({'completeArtifactArchives': len(artifacts)}), flush=True)
