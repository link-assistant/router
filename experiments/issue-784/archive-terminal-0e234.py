"""Preserve complete terminal feedback and focused current receiving checks."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = list(base.glob('checkpoint0e234-*'))
for pattern in ['current-0e234-*', 'terminal-report-artifact-*.stderr',
                'terminal-artifact-*.stderr', 'current-struct-ordering-proof-composition*',
                'current-json-comparison-ingress*']:
    paths.extend(base.glob(pattern))
paths += [base / 'current-complete-checkpoint-retirement.json',
          base / 'current-main-fetch-5edd.log']
for name in ['complete-JNsKLf', 'complete-S787cA']:
    paths.extend((Path('js/node_modules/.node-case-deadlines') / name).iterdir())
for name in ['archive-terminal-0e234.py', 'recover-terminal-cancelled-log.py',
             'retain-terminal-artifact-members.py', 'index-terminal-checkpoint-reports.py',
             'retire-complete-checkpoint-duplicates.py', 'probe-json-comparison-ingress.mjs',
             'current-terminal-ci-repair-plan.md']:
    paths.append(Path('experiments/issue-784') / name)
paths = sorted(set(path for path in paths if path.is_file()))
assert 0 < len(paths) <= 512
rows = []
for path in paths:
    assert not path.is_absolute() and '..' not in path.parts and not path.is_symlink()
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    rows.append(dict(path=str(path), originalPath=str(root / path),
                     bytes=path.stat().st_size, sha256=digest))
assert sum(row['bytes'] for row in rows) < 16 * 1024 * 1024
manifest = base / 'terminal-0e234-archive-manifest.json'
with manifest.open('x') as output:
    json.dump(dict(members=rows), output, indent=2)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
subprocess.run(['python3', '-B', 'tools/evidence/capture-packet.py',
               '--source-root', str(root), '--head', head, '--manifest', str(manifest),
               '--archive', 'docs/case-studies/issue-784/evidence/ci-0e234-terminal-20261111.tar.xz',
               '--receipt', 'docs/case-studies/issue-784/evidence/ci-0e234-terminal-20261111.receipt.json'],
              check=True)
