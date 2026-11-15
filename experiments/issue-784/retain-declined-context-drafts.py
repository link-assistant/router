"""Retain complete declined sources and original failing reports without authority."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
members = []
for stem in ['definition-operation', 'derive-context-freezing']:
    draft = base / (stem + '-draft.json.xz')
    json.loads(lzma.decompress(draft.read_bytes()))
    paths = [draft, base / (stem + '-original-standard-bun.log'),
             base / (stem + '-original-standard-bun.resources.json')]
    receipt = json.loads(paths[2].read_bytes())
    assert receipt['exitCode'] == 1 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    for path in paths:
        raw = path.read_bytes()
        members.append(dict(path=str(path), bytes=len(raw),
                            sha256=hashlib.sha256(raw).hexdigest(),
                            base64=base64.b64encode(raw).decode()))
restored = []
for name in ['derive-bang-context.mjs', 'derive-enclosing-namespace-context.mjs']:
    path = 'tools/translation/' + name
    source = Path(path).read_bytes()
    assert source == subprocess.check_output(['git', 'show', 'HEAD:' + path])
    restored.append(dict(path=path, source=source.decode(),
                         sha256=hashlib.sha256(source).hexdigest()))
record = dict(schema='complete-declined-context-drafts-v1', members=members,
              restored=restored, originalTestFilesUnchanged=True,
              deadlinesChanged=False, draftsInstalled=False,
              semanticAuthority=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
target = Path('docs/case-studies/issue-784/evidence/declined-context-drafts-20261111.json.gz')
assert len(packed) < 100000
with target.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                     sourceRestored=True, fullGatePassed=False)))
