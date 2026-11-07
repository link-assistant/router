#!/usr/bin/env python3
"""Read every retained completed-run log and artifact; preserve complete errors."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--directory', required=True, type=Path)
parser.add_argument('--head', required=True)
args = parser.parse_args()
directory = args.directory
destination = directory / 'complete-cycle-inspection.json.gz'
if destination.exists() or not re.fullmatch(r'[a-f0-9]{40}', args.head):
    raise RuntimeError('Expected a fresh complete inspection and full source SHA')
runs = json.loads((directory / 'completed-head-runs.json').read_bytes())
if len(runs) != 7 or any(row['headSha'] != args.head or row['status'] != 'completed'
                        or any(job['status'] != 'completed' for job in row['jobs'])
                        for row in runs):
    raise RuntimeError('Every workflow and job must finish on the selected head')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def failed_blocks(lines):
    rows = []
    for at, line in enumerate(lines):
        if not re.match(r'^not ok \d+ - ', line):
            continue
        end = at + 1
        while end < len(lines) and lines[end] != '  ...':
            end += 1
        rows.append({'line': at + 1, 'completeBlock': lines[at:min(end + 1, len(lines))]})
    return rows


result = {'headSha': args.head, 'logs': [], 'artifacts': [],
          'scope': 'Complete terminal workflow inventory; cancelled test cohorts remain incomplete. '
                   'Expected negative fixture errors do not change a successful job conclusion. '
                   'No semantic, runtime, deadline or full-gate authority.'}
for run in runs:
    identity = run['databaseId']
    path = directory / (str(identity) + '.log.gz')
    raw = gzip.decompress(path.read_bytes())
    if len(raw) > 32 * 1024 * 1024:
        raise RuntimeError('Complete log exceeds the investigation bound')
    lines = raw.decode('utf-8').splitlines()
    errors = []
    for at, line in enumerate(lines):
        # Preserve the complete relevant neighborhood with its original lines.
        if re.search(r'##\[error\]|^.*\t.*\t.*(?:FATAL ERROR|Error: ENOENT|'
                     r'Strict native parity failed|Stale Rust source hash)', line):
            start, end = max(0, at - 8), min(len(lines), at + 24)
            errors.append({'line': at + 1, 'firstLine': start + 1,
                           'completeContext': lines[start:end]})
    jobs = [{'name': row['name'], 'status': row['status'], 'conclusion': row['conclusion']}
            for row in run['jobs']]
    result['logs'].append({'run': identity, 'bytes': len(raw), 'sha256': digest(raw),
                           'lines': len(lines), 'conclusion': run['conclusion'],
                           'jobs': jobs, 'errorContexts': errors})
    print(json.dumps({'run': identity, 'conclusion': run['conclusion'],
                      'completeLines': len(lines), 'errorContexts': len(errors)}))

for path in sorted(directory.glob('artifact-*.zip')):
    members = []
    with zipfile.ZipFile(path) as archive:
        info = archive.infolist()
        if len(info) > 512 or sum(row.file_size for row in info) > 128 * 1024 * 1024:
            raise RuntimeError('Complete artifact exceeds the investigation bound')
        for row in info:
            if row.is_dir():
                continue
            raw = archive.read(row)  # Includes complete CRC verification.
            member = {'path': row.filename, 'bytes': len(raw), 'sha256': digest(raw)}
            if row.filename.endswith('.json'):
                value = json.loads(raw)
                if row.filename.endswith('/terminal.json'):
                    member['terminal'] = value
                elif row.filename.endswith('/case-deadlines.json'):
                    member['deadlineAudit'] = value
                elif row.filename.endswith('/command.json'):
                    member['commandSummary'] = {key: value.get(key) for key in
                                                ['command', 'outerTimeoutMs', 'node', 'requestSha256']}
            elif row.filename.endswith(('.tap', '.log')):
                lines = raw.decode('utf-8').splitlines()
                member.update(lines=len(lines), failures=failed_blocks(lines))
            members.append(member)
            if 'terminal' in member:
                value = member['terminal']
                print(json.dumps({'member': row.filename, 'exit': value.get('exit'),
                                  'auditSummary': value.get('auditSummary'),
                                  'cleanup': value.get('groupCleanup')}))
            elif member.get('failures'):
                print(json.dumps({'member': row.filename, 'failedRecords': len(member['failures'])}))
    result['artifacts'].append({'path': path.name, 'members': members})
raw = json.dumps(result).encode()
with destination.open('xb') as target:
    target.write(gzip.compress(raw))
if gzip.decompress(destination.read_bytes()) != raw:
    raise RuntimeError('Complete inspection readback differs')
print(json.dumps({'inspection': str(destination), 'logicalBytes': len(raw),
                  'sha256': digest(raw), 'completeLogs': len(result['logs']),
                  'completeArtifacts': len(result['artifacts'])}))
