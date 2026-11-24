"""Correct author rules; existing source changes only through the genuine driver.

The rejected version selected a return embedded in the stage source template.
Keep that complete failed proposal and its inverse, then select the actual
generator's unique schema return. No generated receiving file is edited here.
"""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
packet = json.loads(gzip.decompress((base / 'candidate-binding-batches-v2-draft.json.gz').read_bytes()))
row = next(row for row in packet['files']
           if row['path'] == 'tools/translation/prepare-core-sequence-stream-sources.mjs')
assert Path(row['path']).read_text() == row['before']
edit = row['profile']['edits'][-1]
assert edit['id'] == 'router.candidate-binding-batch.complete.v1'
check = edit['after'].removesuffix(edit['before'])
finish = next(line for line in row['before'].splitlines()
              if line.startswith(" return {schema:'core-sequence-stream-source-v1',"))
edit.update(before=finish, after=check + finish)
after = row['before']
for item in row['profile']['edits']:
    assert after.count(item['before']) == 1
    after = after.replace(item['before'], item['after'], 1)
inverse = after
for item in reversed(row['profile']['edits']):
    assert inverse.count(item['after']) == 1
    inverse = inverse.replace(item['after'], item['before'], 1)
assert inverse == row['before']
row['after'] = after
sha = lambda raw: hashlib.sha256(raw).hexdigest()
row['profile']['afterSha256'] = sha(after.encode())
target = base / 'candidate-binding-batches-v3-draft.json.gz'
raw = json.dumps(packet, separators=(',', ':')).encode()
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
directory = Path('tools/translation/source-profiles/candidate-binding-batches')
manifest_path = directory / 'manifest.json'
old_manifest = manifest_path.read_bytes()
manifest = json.loads(old_manifest)
source = next(source for source in manifest['sources'] if source['path'] == row['path'])
rules = (json.dumps(row['profile'], indent=2) + '\n').encode()
(directory / source['rules']).write_bytes(rules)
source['rulesSha256'] = sha(rules)
new_manifest = (json.dumps(manifest, indent=2) + '\n').encode()
manifest_path.write_bytes(new_manifest)
driver = Path('tools/translation/prepare-candidate-binding-batches.mjs')
text = driver.read_text()
assert text.count(sha(old_manifest)) == 1
driver.write_text(text.replace(sha(old_manifest), sha(new_manifest), 1))
print(json.dumps(dict(manifestSha256=sha(new_manifest), path=row['path'],
                     afterSha256=row['profile']['afterSha256'], sourceInstalled=False)))
