"""Keep complete PR review fallback and the complete coordinated source diff."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'issue-784-1f6838f56841'
assert head.startswith('b28c5bfe5')
result = subprocess.run(['gh', 'pr', 'diff', '785', '--repo', 'link-assistant/router'],
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
(base / 'current-residual-gh-pr-diff.stdout').write_bytes(result.stdout)
(base / 'current-residual-gh-pr-diff.stderr').write_bytes(result.stderr)
assert result.returncode != 0 and b'diff exceeded the maximum number of files (300)' in result.stderr
records = []
for name, start, end in [('published', 'origin/main', '1c235248'), ('coordinated', '1c235248', head)]:
    path = base / ('current-residual-' + name + '-complete-review.patch.gz')
    digest, length, lines, batches = hashlib.sha256(), 0, 0, 0
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
                batches += 1
                batch.clear()
        if batch:
            batches += 1
    assert checked.hexdigest() == digest.hexdigest()
    records.append(dict(path=str(path), fromCommit=subprocess.check_output(['git','rev-parse',start],text=True).strip(),
                        toCommit=subprocess.check_output(['git','rev-parse',end],text=True).strip(),
                        decodedBytes=length, decodedSha256=digest.hexdigest(), lines=lines,
                        maximumReadBatchLines=1500, readBatches=batches,
                        completeTextReadbackVerified=True,
                        binaryContents='Original complete Git blobs; diff keeps the standard binary markers.'))
    print(json.dumps(records[-1]), flush=True)
raw = subprocess.check_output(['git', 'diff', '--raw', '--no-abbrev', 'origin/main', head])
(base / 'current-residual-complete-review-blobs.raw').write_bytes(raw)
record = dict(schema='complete-current-pr-review-fallback-v1', reviewedSourceHead=head,
              ghPrDiffExitCode=result.returncode, remoteDiffAvailable=False,
              remoteFailure='GitHub refuses a diff exceeding 300 files.',
              completeLocalTextDiffs=records, allBinaryAndTextBlobIdentitiesRetained=True,
              semanticReview='Changed compiler/test behavior reviewed separately; streaming readback alone grants no semantic qualification.',
              runtimeParity=False, rustExecuted=False)
with (base / 'current-residual-complete-review.json').open('x') as output:
    json.dump(record, output)
