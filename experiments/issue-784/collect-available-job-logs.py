"""Preserve complete logs of terminal nonpassing jobs in an exact-head snapshot.

This permits early investigation; it never certifies a terminal workflow cycle.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', required=True)
parser.add_argument('--run', type=int, required=True)
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
assert len(args.head) == 40 and all(c in '0123456789abcdef' for c in args.head)
assert args.prefix and all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in args.prefix)
base = Path('ci-logs/issue-784-restart-2')
endpoint = 'repos/link-assistant/router/actions/'
run = json.loads(subprocess.check_output(['gh', 'api', endpoint + 'runs/' + str(args.run)]))
assert run['head_sha'] == args.head
pages = json.loads(subprocess.check_output(['gh', 'api', '--paginate', '--slurp',
    endpoint + 'runs/' + str(args.run) + '/jobs?per_page=100']))
jobs = [row for page in pages for row in page['jobs']]
assert jobs and all(row['run_id'] == args.run for row in jobs)
records = []
for job in jobs:
    if job['status'] != 'completed' or job['conclusion'] in ['success', 'skipped']:
        continue
    name = args.prefix + '-job-' + str(job['id'])
    target, errors = base / (name + '.log.gz'), base / (name + '.stderr')
    receipt = base / (name + '.json')
    if receipt.exists():
        record = json.loads(receipt.read_bytes())
        assert record['job'] == job and record['headSha'] == args.head
    else:
        length, digest = 0, hashlib.sha256()
        command = ['gh', 'api', '--allow-escape-sequences',
                   endpoint + 'jobs/' + str(job['id']) + '/logs']
        with target.open('xb') as output, errors.open('xb') as stderr:
            with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as encoded:
                child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=stderr)
                while block := child.stdout.read(65536):
                    length += len(block)
                    if length > 128 * 1024 * 1024:
                        child.terminate()
                        child.wait()
                        raise RuntimeError('Whole original job exceeds the existing receiving bound')
                    encoded.write(block)
                    digest.update(block)
                child.stdout.close()
                status = child.wait()
        record = dict(job=job, headSha=args.head, command=command,
            downloadExitCode=status, log=str(target), stderr=str(errors),
            decodedBytes=length, sha256=digest.hexdigest(),
            validJobLog=status == 0, completeCycleCollected=False)
        with receipt.open('x') as output:
            json.dump(record, output)
    actual, length = hashlib.sha256(), 0
    with gzip.open(target, 'rb') as source:
        while block := source.read(65536):
            length += len(block)
            actual.update(block)
    assert length == record['decodedBytes'] and actual.hexdigest() == record['sha256']
    records.append(record)
    print(json.dumps(dict(job=job['id'], name=job['name'],
        downloadExitCode=record['downloadExitCode'], decodedBytes=length)), flush=True)
result = dict(schema='available-terminal-job-logs-v1', headSha=args.head,
    run=run, jobPages=pages, records=records, completeCycleCollected=False,
    runtimeParity=False, rustExecuted=False)
number = 1
while (base / (args.prefix + '-collection-' + str(number) + '.json.gz')).exists():
    number += 1
path = base / (args.prefix + '-collection-' + str(number) + '.json.gz')
raw = json.dumps(result, separators=(',', ':')).encode()
with path.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(path.read_bytes()) == raw
print(json.dumps(dict(receipt=str(path), completeLogs=len(records),
                     completeCycleCollected=False)), flush=True)
