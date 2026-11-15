"""Preserve one completed CI cycle; never cancel or qualify a running cycle."""
import json
import re
import shutil
import stat
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

repo = 'link-assistant/router'
run, label = sys.argv[1:]
if not run.isdecimal() or not re.fullmatch(r'restart-[a-z0-9-]+', label):
    raise ValueError('Explicit run ID and task evidence label required')
folder = Path('ci-logs')
prefix = folder / label

def capture(suffix, args):
    path = Path(str(prefix) + suffix)
    with path.open('wb') as output:
        subprocess.run(['gh', *args], stdout=output, check=True)
    return path

capture('-recent-runs.json', ['run', 'list', '--repo', repo, '--branch',
    'issue-784-1f6838f56841', '--limit', '5', '--json',
    'databaseId,conclusion,createdAt,headSha'])
metadata = capture('-metadata.json', ['run', 'view', run, '--repo', repo, '--json',
    'databaseId,status,conclusion,createdAt,updatedAt,headSha,jobs'])
data = json.loads(metadata.read_text())
if data['status'] != 'completed' or any(job['status'] != 'completed' for job in data['jobs']):
    raise RuntimeError('CI cycle is still active; preserve head and wait')
head_runs = capture('-head-workflows.json', ['api',
    f'repos/{repo}/actions/runs?branch=issue-784-1f6838f56841&head_sha={data["headSha"]}&per_page=100',
    '--paginate', '--slurp'])
same_head = [item for page in json.loads(head_runs.read_text())
             for item in page['workflow_runs'] if item['head_sha'] == data['headSha']]
if not same_head or any(item['status'] != 'completed' for item in same_head):
    raise RuntimeError('Another workflow for this head is still active')
capture('-workflow.log', ['run', 'view', run, '--repo', repo, '--log'])
failures = []
for job in data['jobs']:
    if job['conclusion'] not in ['failure', 'cancelled', 'timed_out', 'action_required']:
        continue
    name = re.sub(r'[^a-z0-9]+', '-', job['name'].split(' / ')[-1].lower()).strip('-')
    path = capture('-' + name + '.log', ['api', '--allow-escape-sequences',
        f'repos/{repo}/actions/jobs/{job["databaseId"]}/logs'])
    failures.append({'job': job['name'], 'id': job['databaseId'],
                     'conclusion': job['conclusion'], 'log': str(path)})
artifacts = capture('-artifacts.json', ['api', f'repos/{repo}/actions/runs/{run}/artifacts',
                                      '--paginate', '--slurp'])
for page in json.loads(artifacts.read_text()):
    for item in page['artifacts']:
        if item['expired'] or item['size_in_bytes'] > 64 * 1024 * 1024:
            raise RuntimeError('Expired or oversized complete artifact')
        archive = capture('-artifact-' + str(item['id']) + '.zip', ['api', '--allow-escape-sequences',
            f'repos/{repo}/actions/artifacts/{item["id"]}/zip'])
        target = Path(str(prefix) + '-artifact-' + str(item['id']))
        target.mkdir(exist_ok=False)
        with zipfile.ZipFile(archive) as packed:
            entries = packed.infolist()
            existing = sum(p.stat().st_size for p in folder.rglob('*') if p.is_file())
            if len(entries) > 8192 or existing + sum(row.file_size for row in entries) > 450_000_000:
                raise RuntimeError('Complete task evidence allocation would be exceeded')
            seen = set()
            for entry in entries:
                path = PurePosixPath(entry.filename)
                if path.is_absolute() or '..' in path.parts or '\\' in entry.filename or str(path) in seen:
                    raise RuntimeError('Unsafe or repeated artifact path')
                if stat.S_ISLNK(entry.external_attr >> 16) or entry.file_size > 128 * 1024 * 1024:
                    raise RuntimeError('Linked or oversized artifact member')
                seen.add(str(path))
                destination = target / path
                if entry.is_dir():
                    destination.mkdir(parents=True, exist_ok=True)
                else:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with packed.open(entry) as source, destination.open('xb') as output:
                        shutil.copyfileobj(source, output, length=65536)
summary = {'run': run, 'headSha': data['headSha'], 'conclusion': data['conclusion'],
           'failedJobs': failures, 'sameHeadWorkflows': len(same_head),
           'otherNonpassingWorkflows': [
               {'id': item['id'], 'name': item['name'], 'conclusion': item['conclusion']}
               for item in same_head if str(item['id']) != run
               and item['conclusion'] not in ['success', 'skipped']],
           'runtimeParity': False, 'rustExecutedLocally': False}
Path(str(prefix) + '-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
