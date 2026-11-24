#!/usr/bin/env python3
"""Review every complete producer output and current physical registry input."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
raw = lzma.decompress((base / 'current-runtime-binding-registry-proposal.json.xz').read_bytes())
digest = hashlib.sha256(raw).hexdigest()
assert digest == 'a1fe450ba380e878d170d0e635644c47e320c5a3f2c5ea8ec68b5752e7105dcc'
proposal = json.loads(raw)
files = {}
for row in proposal['files']:
    data = base64.b64decode(row['base64'], validate=True)
    assert row['path'] not in files and len(data) == row['bytes']
    assert hashlib.sha256(data).hexdigest() == row['sha256']
    files[row['path']] = data
assert len(files) == 7
assert gzip.decompress(files['manifest.json.gz']) == files['manifest.json']
original = Path('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz').read_bytes()
assert hashlib.sha256(original).hexdigest() == proposal['originalRegistrySha256']
before, after = json.loads(gzip.decompress(original)), json.loads(files['manifest.json'])
assert before['sourceHead'] == '93995ee40be4b570becbe0b788dba58f5bd0ea6f'
assert after['sourceHead'] == '90446cc9d12895a81e7e5fc5b7f0c9047f26d18e'
assert before['files'] == 1934 and after['files'] == 1936
previous = {row['path']: row for row in before['sources']}
changed, added, total = [], [], 0
for row in after['sources']:
    path = Path(row['path'])
    assert not path.is_symlink() and path.is_file()
    data, state = path.read_bytes(), path.stat()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
    assert ('100755' if state.st_mode & 0o111 else '100644') == row['mode']
    total += len(data)
    old = previous.pop(row['path'], None)
    if old is None:
        added.append(row)
    elif old != row:
        changed.append(dict(before=old, after=row))
assert not previous and total == after['totalBytes'] == 58765712
assert [row['after']['path'] for row in changed] == [
    'tools/translation/prepare-runtime-import-current-sources.mjs',
    'tools/translation/project.mjs']
assert [row['path'] for row in added] == [
    'tools/translation/forward-source-origin-concrete-syntax.mjs',
    'tools/translation/prepare-project-source-origin-cst.mjs']
for name, source in [('isolated-project-batch.mjs', 'parent-before.mjs'),
                     ('isolated-project-driver.mjs', 'driver-before.mjs')]:
    assert Path('tools/translation', name).read_bytes() == files[source]
record = dict(schema='complete-runtime-binding-registry-review-v1',
              proposalSha256=digest, beforeHead=before['sourceHead'], afterHead=after['sourceHead'],
              files=after['files'], totalBytes=total, changed=changed, added=added, removed=[],
              allCompleteProducerOutputsVerified=True, allCompletePhysicalInputsVerified=True,
              receivingTestsPassed=False, semanticAuthority=False, runtimeParity=False)
encoded = json.dumps(record, separators=(',', ':')).encode()
target = base / 'current-runtime-binding-registry-review.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(target.read_bytes()) == encoded
print(json.dumps(record))
