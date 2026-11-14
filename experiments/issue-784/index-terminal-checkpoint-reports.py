"""Index complete retained CI logs and original deadline reports, without verdicts."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import tarfile

base = Path('ci-logs/issue-784-restart-2')
collection = json.loads(gzip.decompress((base / 'checkpoint0e234-collection-8.json.gz').read_bytes()))
logs = []
for record in collection['records']:
    job = record['job']
    row = dict(job=job['id'], name=job['name'], conclusion=job['conclusion'],
               logAvailable=record['validJobLog'])
    if record['validJobLog']:
        raw = gzip.decompress(Path(record['log']).read_bytes())
        assert len(raw) == record['decodedBytes']
        assert hashlib.sha256(raw).hexdigest() == record['sha256']
        lines = raw.decode().splitlines()
        row.update(lines=len(lines), diagnostics=[dict(line=at + 1, text=line)
                       for at, line in enumerate(lines) if re.search(
                           r'not ok \d|\(fail\)|##\[error\]|Strict native parity failed|draft gaps|stale canonical|Regeneration differs', line)],
                   fullLogSha256=record['sha256'])
    logs.append(row)
custody = json.loads(gzip.decompress((base / 'checkpoint0e234-terminal-deadline-reports.json.gz').read_bytes()))
paths = {member['storedAs']: member for artifact in custody['records']
         for member in artifact['members'] if member.get('storedAs')}
reports = []
with tarfile.open(custody['archive'], 'r:xz') as archive:
    for member in archive:
        source = paths[member.name]
        if not source['path'].endswith('case-deadlines.json'):
            continue
        raw = archive.extractfile(member).read()
        assert len(raw) == source['bytes']
        assert hashlib.sha256(raw).hexdigest() == source['sha256']
        value = json.loads(raw)
        reports.append(dict(member=member.name, path=source['path'],
                            passed=value.get('passed'), breaches=value.get('durationBreaches'),
                            errors=value.get('errors'), failed=value.get('originalFailedCompletionEvents')))
for name, value in [('full-log-index', logs), ('deadline-index', reports)]:
    target = base / ('checkpoint0e234-terminal-' + name + '.json.gz')
    raw = json.dumps(value, separators=(',', ':')).encode()
    # A repeated index run must reproduce every previously retained byte.
    if target.exists():
        assert gzip.decompress(target.read_bytes()) == raw
    else:
        target.write_bytes(gzip.compress(raw, mtime=0))
    print(json.dumps(dict(path=str(target), entries=len(value), bytes=target.stat().st_size)))
print(json.dumps(dict(allDurationBreaches=sum(row['breaches'] or 0 for row in reports),
    expectedFixtureBreaches=sum(row['breaches'] or 0 for row in reports
        if any('node-deadline-fixture-' in error for error in row['errors'])),
    semanticAuthority=False, fullGatePassed=False, rustExecuted=False)))
