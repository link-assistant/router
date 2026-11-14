"""Pin the complete unsuccessful candidate before restoring active sources."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
inputs = [path for path in base.glob('current-native-call-arity-*')
          if not path.name.startswith('current-native-call-arity-archive')]
inputs += [Path(value) for value in [
    'tools/translation/js-to-rust/native-typescript.mjs',
    'tools/translation/prepare-native-regeneration-batch.mjs',
    'tools/translation/test/runtime-import-phased-data.test.mjs',
    'tools/translation/js-to-rust/test/native-call-arity.test.mjs',
    'tools/translation/source-profiles/native-call-arity/source-rules.json',
    'experiments/issue-784/native-call-arity-candidate.patch',
    'experiments/issue-784/compare-native-call-arity.mjs',
    'experiments/issue-784/prepare-native-call-arity.py',
    'experiments/issue-784/current-native-call-arity-plan.md',
]]
for name in ['complete-nUaSSW', 'complete-KZoYf4', 'complete-voewf2']:
    directory = Path('js/node_modules/.node-case-deadlines') / name
    if not directory.is_dir():
        raise RuntimeError('Missing complete original audit: ' + str(directory))
    inputs.extend(directory.rglob('*'))
rows = []
for path in sorted(set(inputs)):
    if not path.is_file():
        continue
    raw = path.read_bytes()
    rows.append(dict(path=path.as_posix(), originalPath=str(root / path),
                     bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
assert 10 < len(rows) < 512
manifest = base / 'native-call-arity-negative-manifest.json'
manifest.write_text(json.dumps(dict(members=rows), indent=2) + '\n')
print(json.dumps(dict(manifest=str(manifest), members=len(rows),
                     bytes=sum(row['bytes'] for row in rows),
                     head=subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip())))
