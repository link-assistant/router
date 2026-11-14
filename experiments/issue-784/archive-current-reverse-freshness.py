"""Retain complete regeneration checks; this is not a same-SHA gate stamp."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = [base / (prefix + suffix) for prefix in [
    'current-reverse-regeneration-0e234',
    'current-reverse-freshness-0e234',
    'current-reverse-original-translator-node-0e234',
] for suffix in ['.log', '.memory.json']]
paths += [base / 'current-reverse-artifacts-0e234.patch.gz',
          base / 'current-reverse-artifacts-0e234-review.json.gz',
          Path('tools/translation/js-to-rust/test/translator.test.mjs'),
          Path('js/src/file-lock.mjs'),
          Path('scripts/regenerate-js-first.mjs'),
          Path('experiments/issue-784/archive-current-reverse-freshness.py')]
paths += list(Path('js/node_modules/.node-case-deadlines/complete-j9jcrf').iterdir())
assert len(paths) == 18 and all(path.is_file() for path in paths)
rows = []
for path in paths:
    raw = path.read_bytes()
    rows.append(dict(path=str(path), originalPath=str(root / path),
                     bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
manifest = base / 'current-reverse-freshness-archive-manifest.json'
with manifest.open('x') as output:
    json.dump(dict(members=rows), output, indent=2)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
command = ['python3', '-B', 'tools/evidence/capture-packet.py',
           '--source-root', str(root), '--head', head, '--manifest', str(manifest),
           '--archive', 'docs/case-studies/issue-784/evidence/current-reverse-freshness.tar.xz',
           '--receipt', 'docs/case-studies/issue-784/evidence/current-reverse-freshness.receipt.json']
subprocess.run(command, check=True)
