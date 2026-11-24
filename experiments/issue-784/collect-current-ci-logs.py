"""Stream complete terminal job logs for one immutable published head."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--run', required=True, type=int)
parser.add_argument('--head', required=True)
parser.add_argument('--prefix', required=True)
args = parser.parse_args()
base = Path('ci-logs/issue-784-restart-2')
assert args.prefix.isalnum() and len(args.head) == 40
run = json.loads(subprocess.check_output([
    'gh', 'api', 'repos/link-assistant/router/actions/runs/' + str(args.run),
]))
assert run['head_sha'] == args.head
metadata = subprocess.check_output([
    'gh', 'api', 'repos/link-assistant/router/actions/runs/' + str(args.run) + '/jobs', '--paginate',
])
text, jobs, decoder = metadata.decode(), [], json.JSONDecoder()
while text.strip():
    page, end = decoder.raw_decode(text.lstrip())
    jobs.extend(page['jobs'])
    text = text.lstrip()[end:]
assert all(row['head_sha'] == args.head for row in jobs)
records, pending = [], []
for job in jobs:
    if job['status'] != 'completed' or job['conclusion'] not in ['failure', 'cancelled']:
        continue
    target = base / (args.prefix + '-job-' + str(job['id']) + '.log.gz')
    receipt = target.with_suffix('.json')
    if target.exists() and not receipt.exists():
        # Preserve a failed original HTTP response; it is not a complete job log.
        failed = target.with_name(target.name + '.incomplete-response')
        assert not failed.exists()
        target.rename(failed)
    if target.exists():
        assert receipt.exists()
        record = json.loads(receipt.read_bytes())
    else:
        attempt = len(list(base.glob(target.name + '.download*')))
        download = target.with_name(target.name + '.download-' + str(attempt))
        errors = target.with_name(target.name + '.download-stderr')
        assert not download.exists()
        error_output = errors.open('ab')
        child = subprocess.Popen(['gh', 'api', '--allow-escape-sequences',
                                  'repos/link-assistant/router/actions/jobs/' + str(job['id']) + '/logs'],
                                 stdout=subprocess.PIPE, stderr=error_output)
        size, digest = 0, hashlib.sha256()
        with child.stdout as source, download.open('xb') as output:
            with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=3, mtime=0) as encoder:
                while block := source.read(65536):
                    size += len(block)
                    digest.update(block)
                    encoder.write(block)
        status = child.wait()
        error_output.close()
        if status != 0:
            pending.append(dict(job=job, response=str(download), stderr=str(errors), exitCode=status))
            continue
        download.rename(target)
        record = dict(job=job, runId=args.run, publishedHead=args.head, path=str(target),
                      rawBytes=size, rawSha256=digest.hexdigest())
    count, digest = 0, hashlib.sha256()
    with gzip.open(target, 'rb') as source:
        while block := source.read(65536):
            count += len(block)
            digest.update(block)
    assert count == record['rawBytes'] and digest.hexdigest() == record['rawSha256']
    record['completeReadbackVerified'] = True
    if not receipt.exists():
        receipt.write_text(json.dumps(record, separators=(',', ':')) + '\n')
    records.append(record)
snapshot = dict(run=run, jobs=jobs, logs=records, pendingLogJobs=pending,
                completeCycleCollected=not pending and run['status'] == 'completed' and all(row['status'] == 'completed' for row in jobs))
with (base / (args.prefix + '-current-snapshot.json.gz')).open('wb') as output:
    output.write(gzip.compress((json.dumps(snapshot, separators=(',', ':')) + '\n').encode(), mtime=0))
print(json.dumps(dict(jobs=len(jobs), terminal=sum(row['status'] == 'completed' for row in jobs),
                      nonpassingLogsRetained=len(records), pendingLogs=len(pending), completeCycleCollected=snapshot['completeCycleCollected'])))
