"""Retain complete inactive metadata custody without duplicating large receipts."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence')
manifest = base / 'current-retained-17c7-metadata-compression.json'
raw = manifest.read_bytes()
receipt = json.loads(raw)
rows = receipt['rows']
assert len(rows) == 50
packed = gzip.compress(raw, mtime=0)
out = target / 'current-retained-17c7-metadata-compression.json.gz'
with out.open('xb') as stream:
    stream.write(packed)
assert gzip.decompress(out.read_bytes()) == raw
source = base / 'current-ascii-parent-pages-v2.json.gz'
destination = target / source.name
with gzip.open(source, 'rb') as stream:
    original = stream.read()
digest = hashlib.sha256(source.read_bytes()).hexdigest()
source.rename(destination)
assert hashlib.sha256(destination.read_bytes()).hexdigest() == digest
assert gzip.decompress(destination.read_bytes()) == original
for name in ['current-ascii-parent-pages.log', 'current-ascii-parent-pages-v2.log']:
    source = base / name
    raw = source.read_bytes()
    out = target / (name + '.gz')
    with out.open('xb') as stream:
        stream.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(out.read_bytes()) == raw
print(json.dumps({'completeMetadataFiles': len(rows),
                  'metadataReceipt': str(manifest),
                  'completePageHintReceipt': str(destination),
                  'pageHintReceiptSha256': digest,
                  'runtimeParity': False, 'rustExecuted': False}))
