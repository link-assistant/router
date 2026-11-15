"""Retain complete positive and negative comparison checks, never a gate stamp."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = sorted(base.glob('current-struct-ordering-*'))
paths = [path for path in paths if path.is_file()]
attempts = set()
for path in paths:
    if path.suffix == '.log':
        attempts.update(re.findall(r'Complete Node deadline evidence: [^\n]*/(complete-[A-Za-z0-9]+)',
                                   path.read_text()))
for name in sorted(attempts):
    folder = Path('js/node_modules/.node-case-deadlines') / name
    assert (folder / 'terminal.json').is_file()
    paths += sorted(path for path in folder.iterdir() if path.is_file())
sources = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only', '-z']).decode().split('\0')
sources += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z']).decode().split('\0')
sources = [Path(name) for name in sources if name and name.startswith('tools/translation/')]
paths += sources
paths += [Path(__file__).resolve().relative_to(root), Path('experiments/issue-784/current-struct-ordering-history-plan.md'),
          Path('experiments/issue-784/prepare-struct-ordering-source-history.py'),
          Path('experiments/issue-784/review-struct-ordering-receiving-history.py'),
          Path('experiments/issue-784/review-struct-ordering-clone-receiving.py')]
paths = sorted(set(paths))
assert 1 <= len(paths) <= 256 and all(path.is_file() for path in paths)
assert all(not path.is_absolute() and '..' not in path.parts for path in paths)
rows = []
for path in paths:
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows.append(dict(path=str(path), originalPath=str(root / path),
                     bytes=path.stat().st_size, sha256=digest))
assert sum(row['bytes'] for row in rows) < 32 * 1024 * 1024
manifest = base / 'struct-ordering-comparison-archive-manifest-2.json'
with manifest.open('x') as output:
    json.dump(dict(members=rows), output, indent=2)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
subprocess.run(['python3', '-B', 'tools/evidence/capture-packet.py',
               '--source-root', str(root), '--head', head, '--manifest', str(manifest),
               '--archive', 'docs/case-studies/issue-784/evidence/struct-ordering-comparison-history.tar.xz',
               '--receipt', 'docs/case-studies/issue-784/evidence/struct-ordering-comparison-history.receipt.json'],
              check=True)
