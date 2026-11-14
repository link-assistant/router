"""Retain the full terminal run archive and inspect its missing cancelled log."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--run', required=True, type=int)
parser.add_argument('--head', required=True)
parser.add_argument('--job', required=True, type=int)
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
assert len(args.head) == 40 and all(c in '0123456789abcdef' for c in args.head)
assert args.prefix and all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in args.prefix)
base = Path('ci-logs/issue-784-restart-2')
api = 'repos/link-assistant/router/actions/'
run = json.loads(subprocess.check_output(['gh', 'api', api + 'runs/' + str(args.run)]))
assert run['head_sha'] == args.head and run['status'] == 'completed'
job = json.loads(subprocess.check_output(['gh', 'api', api + 'jobs/' + str(args.job)]))
assert job['run_id'] == args.run and job['head_sha'] == args.head and job['status'] == 'completed'
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
maximum = 8_000_000
used = sum(p.stat().st_size for root in roots for p in root.rglob('*')
           if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert used + maximum < 500_000_000
path = base / (args.prefix + '-terminal-whole-run.zip')
command = ['gh', 'api', api + 'runs/' + str(args.run) + '/logs']
with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors)
    length, exceeded = 0, False
    while block := child.stdout.read(65536):
        length += len(block)
        output.write(block)
        if length > maximum:
            exceeded = True
            child.terminate()
            break
    code = child.wait()
record = dict(schema='terminal-cancelled-job-whole-run-recovery-v1', run=run, job=job,
              archive=str(path), command=command, bytes=length, exitCode=code,
              maximumArchiveBytes=maximum, byteLimitExceeded=exceeded,
              members=[], wholeArchiveVerified=False, missingLogRecovered=False,
              runtimeParity=False, rustExecuted=False)
with path.open('rb') as source:
    record['sha256'] = hashlib.file_digest(source, 'sha256').hexdigest()
if code == 0 and not exceeded:
    with zipfile.ZipFile(path) as archive:
        assert len(archive.infolist()) <= 2048
        assert sum(row.file_size for row in archive.infolist()) <= 128 * 1024 * 1024
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
raw = json.dumps(record, separators=(',', ':')).encode()
receipt = base / (args.prefix + '-terminal-whole-run-verification.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({k: v for k, v in record.items() if k not in ('run','job','members')}))
assert record['wholeArchiveVerified']
