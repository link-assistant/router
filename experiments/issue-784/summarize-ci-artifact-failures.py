"""Read preserved full Bun artifact logs and number every failed case's context.

Job-level Bun logs contain only a whole-file exit summary. This joins the
already inspected artifact receipt's complete stderr, without another download.
"""
import gzip
import hashlib
import json
from pathlib import Path
import re
import tarfile

packet = Path('docs/case-studies/issue-784/evidence/current-1c82-terminal-ci.tar.gz')
with packet.open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == (
        '16e021db43e563dd9f57ccc662d4adaf15a7e07bb7c3ccdf8ae29737f45e7c36')
records = []
with tarfile.open(packet, mode='r|gz') as source:
    for member in source:
        if not re.search(r'current-1c82-deadline-inspection-[12]\.json\.gz$', member.name):
            continue
        receipt = json.loads(gzip.decompress(source.extractfile(member).read()))
        for row in receipt['records']:
            if 'reverse-bun' not in row['metadata']['name']:
                continue
            assert row['allZipMembersReadAndCrcVerified']
            logs, failures = [], []
            for log in row['completeSelectedRawLogs']:
                lines = log['text'].splitlines()
                assert len(lines) <= 100000
                for first in range(0, len(lines), 1500):
                    for at in range(first, min(first + 1500, len(lines))):
                        text = re.sub(r'\x1b\[[0-9;]*m', '', lines[at])
                        if not text.startswith('(fail) '):
                            continue
                        failures.append(dict(path=log['path'], line=at + 1,
                            text=text, context=[dict(line=index + 1, text=lines[index])
                                for index in range(max(0, at - 24), min(len(lines), at + 13))]))
                logs.append(dict(path=log['path'], lines=len(lines),
                    bytes=len(log['text'].encode()),
                    sha256=hashlib.sha256(log['text'].encode()).hexdigest(),
                    everyDecodedLineInspected=True))
            reports = [r for r in row['completeOriginalJsonReports']
                       if r['path'].endswith('/progress.json')]
            records.append(dict(artifact=row['metadata'], logs=logs,
                                progress=reports, failedCases=failures))
assert len(records) == 8
value = dict(schema='complete-terminal-bun-failure-context-v1',
    headSha='1c82cbd9355724439a953ddaa7642193d03878ca', runId=42697950690,
    sourcePacket=str(packet), records=records, fullGatePassed=False,
    scope='Full retained Bun stderr read in chunks of at most 1500 lines. '
          'Cancelled or incomplete files remain unfinished.')
target = Path('ci-logs/issue-784-restart-2/current-1c82-bun-failure-context.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(value).encode(), mtime=0))
assert json.loads(gzip.decompress(target.read_bytes())) == value
for row in records:
    print(row['artifact']['name'])
    for failure in row['failedCases']:
        print(f"  {failure['path']}:{failure['line']}: {failure['text']}")
print(json.dumps(dict(artifacts=len(records),
    failedCases=sum(len(row['failedCases']) for row in records), receipt=str(target))))
