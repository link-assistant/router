"""Find exact complete retained bytes without modifying evidence or sources."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
originals = {}
for path in Path('ci-logs').rglob('*'):
    if path.is_file() and not path.is_symlink() and path.stat().st_size >= 100000:
        with path.open('rb') as stream:
            originals[str(path)] = dict(bytes=path.stat().st_size,
                                       sha256=hashlib.file_digest(stream, 'sha256').hexdigest())
found = {}
for receipt in Path('docs/case-studies/issue-784/evidence').glob('*.json.gz'):
    if receipt.stat().st_size > 8 * 1024 * 1024:
        continue
    try:
        with gzip.open(receipt, 'rb') as stream:
            raw = stream.read(64 * 1024 * 1024 + 1)
            if len(raw) > 64 * 1024 * 1024 or stream.read(1):
                continue
        data = json.loads(raw)
    except (ValueError, OSError):
        continue
    if not isinstance(data, dict):
        continue
    for row in data.get('members', []):
        name = row.get('path') if isinstance(row, dict) else None
        original = originals.get(name)
        if original and 'base64' in row and row.get('sha256') == original['sha256'] and row.get('bytes') == original['bytes']:
            found[name] = dict(path=name, receipt=str(receipt), archive=None, **original)
output = base / 'current-large-retained-duplicate-candidates.json'
with output.open('x') as stream:
    json.dump(list(found.values()), stream)
print(json.dumps(dict(index=str(output), files=len(found),
                      completeCandidateBytes=sum(row['bytes'] for row in found.values()))))
