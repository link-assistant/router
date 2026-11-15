"""Retain the complete declined candidate and both diagnostic attempts."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = sorted(path for path in base.glob('current-derive-context-freezing-*')
               if path.name != 'current-derive-context-freezing-archive.log')
paths += [Path(__file__).relative_to(root),
          Path('experiments/issue-784/compare-derive-context-freezing.mjs'),
          Path('tools/translation/derive-footprints.mjs'),
          Path('tools/translation/private-data-freeze.mjs')]
assert all(path.is_file() for path in paths)
rows = []
for path in paths:
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows.append(dict(path=str(path), originalPath=str(root / path),
                     bytes=path.stat().st_size, sha256=digest))
assert sum(row['bytes'] for row in rows) < 2 * 1024 * 1024
manifest = base / 'derive-freezing-comparison-manifest.json'
with manifest.open('x') as stream:
    json.dump(dict(members=rows), stream, indent=2)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
subprocess.run(['python3', '-B', 'tools/evidence/capture-packet.py',
    '--source-root', str(root), '--head', head, '--manifest', str(manifest),
    '--archive', 'docs/case-studies/issue-784/evidence/derive-freezing-comparison.tar.xz',
    '--receipt', 'docs/case-studies/issue-784/evidence/derive-freezing-comparison.receipt.json'], check=True)
