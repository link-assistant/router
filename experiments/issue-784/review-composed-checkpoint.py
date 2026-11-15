"""Retain whole local review diffs when GitHub refuses its 300-file limit."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head.startswith('e15197054')
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'issue-784-1f6838f56841'
subprocess.run(['git', 'merge-base', '--is-ancestor', 'origin/main', head], check=True)
error = (base / 'current-pr-diff-refresh-14.err').read_bytes()
assert b'diff exceeded the maximum number of files (300)' in error
records = []
for name, start, end in [('published', 'origin/main', '910e8dadf'),
                         ('coordinated', '910e8dadf', head)]:
    path = destination / ('current-composed-' + name + '-review.patch.gz')
    digest, length, lines = hashlib.sha256(), 0, 0
    with path.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as encoded:
            child = subprocess.Popen(['git', 'diff', '--no-ext-diff', start, end], stdout=subprocess.PIPE)
            while block := child.stdout.read(65536):
                encoded.write(block)
                digest.update(block)
                length += len(block)
            assert child.wait() == 0
    checked = hashlib.sha256()
    with gzip.open(path, 'rb') as source:
        batch = []
        for line in source:
            checked.update(line)
            lines += 1
            batch.append(line)
            if len(batch) == 1500:
                batch.clear()
    assert checked.hexdigest() == digest.hexdigest()
    records.append(dict(path=str(path), fromCommit=subprocess.check_output(['git', 'rev-parse', start], text=True).strip(),
                        toCommit=subprocess.check_output(['git', 'rev-parse', end], text=True).strip(),
                        decodedBytes=length, decodedSha256=digest.hexdigest(), lines=lines,
                        maximumReadBatchLines=1500, completeTextReadbackVerified=True,
                        binaryContents='Standard binary markers; complete blobs and independently verified packets are retained separately.'))
paths = sorted(list(base.glob('current-*-refresh-14.*')) + [base / 'current-main-fetch-14.log'])
paths += [Path('experiments/issue-784/current-conversion-pr-body.md'),
          Path('experiments/issue-784/current-conversion-ci-repair-plan.md'), Path(__file__)]
members = []
for path in paths:
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
raw = subprocess.check_output(['git', 'diff', '--raw', '--no-abbrev', 'origin/main', head])
members.append(dict(path='complete-review-blobs.raw', bytes=len(raw),
                    sha256=hashlib.sha256(raw).hexdigest(), base64=base64.b64encode(raw).decode()))
record = dict(schema='complete-composed-checkpoint-review-v1', sourceHead=head,
              completeLocalTextDiffs=records, members=members,
              remoteDiffAvailable=False, allBinaryAndTextBlobIdentitiesRetained=True,
              semanticReview='Complete changed source/test behavior reviewed separately; stream verification grants no runtime authority.',
              newlyExecutableProductionFunctions=0, fullGatePassed=False, rustExecuted=False)
target = destination / 'current-composed-checkpoint-review.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    content = base64.b64decode(row['base64'], validate=True)
    assert len(content) == row['bytes'] and hashlib.sha256(content).hexdigest() == row['sha256']
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
size = sum(p.stat().st_size for root in roots for p in root.rglob('*')
           if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
assert size < 500_000_000
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     completeReadbackVerified=True, evidenceBytes=size,
                     completeLocalTextDiffs=records)))
