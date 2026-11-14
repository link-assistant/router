"""Collect and completely verify the selected terminal workflow log archive."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', required=True)
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
assert re.fullmatch(r'[a-z0-9-]+', args.prefix)
assert '/' not in args.snapshot
base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / args.snapshot).read_bytes())
assert snapshot['status'] == 'completed'
assert all(job['status'] == 'completed' for job in snapshot['jobs'])
path = base / (args.prefix + '-terminal-whole-run.zip')
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
total = sum(p.stat().st_size for root in roots for p in root.rglob('*')
            if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
limit = 12_000_000
assert total + limit < 500_000_000
with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/runs/'
                              + str(snapshot['databaseId']) + '/logs'],
                             stdout=subprocess.PIPE, stderr=errors)
    length, exceeded = 0, False
    while block := child.stdout.read(65536):
        length += len(block)
        output.write(block)
        if length > limit:
            exceeded = True
            child.terminate()
            break
    code = child.wait()
record = dict(schema='complete-terminal-workflow-log-archive-v1',
              headSha=snapshot['headSha'], runId=snapshot['databaseId'],
              bytes=length, exitCode=code, maximumArchiveBytes=limit,
              byteLimitExceeded=exceeded, members=[], wholeArchiveVerified=False)
with path.open('rb') as source:
    record['sha256'] = hashlib.file_digest(source, 'sha256').hexdigest()
if code == 0 and not exceeded:
    with zipfile.ZipFile(path) as archive:
        assert sum(row.file_size for row in archive.infolist()) < 128 * 1024 * 1024
        for row in archive.infolist():
            count, digest = 0, hashlib.sha256()
            with archive.open(row) as source:
                while block := source.read(65536):
                    count += len(block)
                    digest.update(block)
            assert count == row.file_size
            record['members'].append(dict(path=row.filename, bytes=count,
                                          sha256=digest.hexdigest(), crc=row.CRC))
    record['wholeArchiveVerified'] = True
with (base / (args.prefix + '-terminal-whole-run-verification.json')).open('x') as output:
    json.dump(record, output)
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
assert record['wholeArchiveVerified']
