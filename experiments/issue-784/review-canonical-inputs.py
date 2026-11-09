"""Verify complete published custody inputs; separately report current differences."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile
import re

base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--head', default='74f62c037a21e4b3e4e3804dcf3d941d0aabfe19')
parser.add_argument('--prefix', default='current-74f62')
args = parser.parse_args()
assert re.fullmatch(r'[0-9a-f]{40}', args.head)
assert re.fullmatch(r'[a-z0-9-]+', args.prefix)
head = args.head
merge = json.loads((base / (args.prefix + '-tested-merge.json')).read_bytes())
assert merge['tree']['sha'] == subprocess.check_output(['git', 'rev-parse', head + '^{tree}'], text=True).strip()
assert [row['sha'] for row in merge['parents']] == ['eb2dad1c0a18394dc1aad46413e11401e74eb502', head]
receipt = json.loads(gzip.decompress((base / (args.prefix + '-canonical-artifact-verification.json.gz')).read_bytes()))
assert receipt['headSha'] == head and receipt['mergeSha'] == merge['sha']
with zipfile.ZipFile(receipt['file']) as archive:
    manifest = json.loads(archive.read(next(name for name in archive.namelist() if name.endswith('/manifest.json'))))
inputs = manifest['inputs']
assert inputs['head'] == merge['sha']


def tree(revision):
    result = {}
    for row in subprocess.check_output(['git', 'ls-tree', '-rz', '-r', '--full-tree', revision]).split(b'\0'):
        if row:
            header, path = row.split(b'\t', 1)
            mode, kind, identity = header.decode().split()
            result[path.decode()] = dict(mode=mode, kind=kind, gitBlob=identity)
    return result


published, current = tree(head), tree('HEAD')
assert sorted(path for path in published if path.endswith('.rs')) == inputs['tracked']
process = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
digests, changes, counts = {}, [], {}
try:
    for label, rows in [('rust', inputs['corpus']['sources']), ('cargo', inputs['corpus']['cargo']),
                        ('compiler', inputs['compiler']), ('profiles', inputs['profiles'])]:
        verified = 0
        for row in rows:
            name = row.get('path', row.get('source'))
            if row.get('available') is False:
                assert name not in published
                continue
            entry = published[name]
            assert entry['kind'] == 'blob'
            assert row.get('gitBlob', entry['gitBlob']) == entry['gitBlob']
            assert row.get('mode', entry['mode']) == entry['mode']
            identity = entry['gitBlob']
            if identity not in digests:
                process.stdin.write((identity + '\n').encode())
                process.stdin.flush()
                received, kind, size = process.stdout.readline().decode().split()
                assert received == identity and kind == 'blob' and 0 <= int(size) <= 33554432
                remaining, digest = int(size), hashlib.sha256()
                while remaining:
                    block = process.stdout.read(min(65536, remaining))
                    assert block
                    digest.update(block)
                    remaining -= len(block)
                assert process.stdout.read(1) == b'\n'
                digests[identity] = dict(bytes=int(size), sha256=digest.hexdigest())
            assert digests[identity] == dict(bytes=row['bytes'], sha256=row['sha256'])
            verified += 1
            path = Path(name)
            state = path.stat() if path.exists() else None
            current_digest = hashlib.sha256()
            if state:
                with path.open('rb') as source:
                    while block := source.read(65536):
                        current_digest.update(block)
            observed = dict(bytes=state.st_size, sha256=current_digest.hexdigest()) if state else None
            if observed != digests[identity] or current.get(name) != entry:
                changes.append(dict(group=label, path=name, published=entry,
                    publishedBytes=digests[identity], currentGit=current.get(name), currentPhysical=observed))
        counts[label] = verified
finally:
    process.stdin.close()
    assert process.wait() == 0
for row in inputs['typescript']:
    path = Path('js/node_modules/typescript') / row['path']
    digest = hashlib.sha256()
    with path.open('rb') as source:
        while block := source.read(65536):
            digest.update(block)
    assert path.stat().st_size == row['bytes'] and digest.hexdigest() == row['sha256']
counts['typescript'] = len(inputs['typescript'])
record = dict(schema='complete-canonical-published-input-review-v1', headSha=head,
    mergeSha=merge['sha'], mergeTreeEqualsPublishedHead=True, counts=counts,
    uniquePublishedBlobs=len(digests), allDeclaredPublishedGitInputsVerified=True,
    installedTypescriptInputsMatch=True,
    currentHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    changedDeclaredInputs=changes, completeCurrentCompilerCensusProved=False,
    currentWorkingTreeFreshnessProved=False, semanticAuthority=False, runtimeParity=False)
target = base / (args.prefix + '-canonical-input-review.json.gz')
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), counts=counts, uniquePublishedBlobs=len(digests),
    changedDeclaredInputs=[dict(group=row['group'], path=row['path']) for row in changes],
    currentWorkingTreeFreshnessProved=False)))
