"""Preserve complete namespace-copy checks and negative controls as DATA."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
patterns = ['current-namespace-*', 'current-native-namespace-cloning-*',
            'current-terminal-0e234-retirement.*']
paths = sorted({path for pattern in patterns for path in base.glob(pattern) if path.is_file()})
attempts = set()
for path in paths:
    if path.suffix == '.log':
        attempts.update(re.findall(r'Complete Node deadline evidence: [^\n]*/(complete-[A-Za-z0-9]+)', path.read_text()))
for name in sorted(attempts):
    directory = Path('js/node_modules/.node-case-deadlines') / name
    assert (directory / 'terminal.json').is_file()
    paths.extend(sorted(path for path in directory.iterdir() if path.is_file()))
paths += [Path('tools/translation/source-scopes.mjs'),
          Path('tools/translation/test/namespace-clone-streaming.test.mjs')]
paths += sorted(Path('tools/translation/test/fixtures/namespace-clone-streaming').iterdir())
paths += [Path('experiments/issue-784') / name for name in [
    'archive-namespace-cloning.py', 'check-namespace-cloning-source.mjs',
    'compare-native-namespace-cloning.mjs', 'check-comparison-native-syntax.mjs',
    'run-observed-check.py', 'complete-evidence-json.mjs']]
paths = sorted(set(paths))
assert 1 <= len(paths) <= 256 and all(path.is_file() for path in paths)
rows = []
for path in paths:
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows.append(dict(path=str(path), originalPath=str(root / path), bytes=path.stat().st_size, sha256=digest))
assert sum(row['bytes'] for row in rows) < 16 * 1024 * 1024
manifest = base / 'namespace-cloning-archive-manifest.json'
with manifest.open('x') as stream:
    json.dump(dict(members=rows), stream, indent=2)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
subprocess.run(['python3', '-B', 'tools/evidence/capture-packet.py',
    '--source-root', str(root), '--head', head, '--manifest', str(manifest),
    '--archive', 'docs/case-studies/issue-784/evidence/namespace-cloning.tar.xz',
    '--receipt', 'docs/case-studies/issue-784/evidence/namespace-cloning.receipt.json'], check=True)
