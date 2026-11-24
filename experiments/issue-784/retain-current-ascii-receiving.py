"""Retain full ASCII receiving attempts without qualifying failed deadlines."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
patterns = ['current-ascii-parent-*', 'current-named-core-ascii-*',
            'current-ascii-eager-*', 'current-ascii-receiving-controls-*',
            'current-ascii-lazy-*', 'current-ascii-final-controls-*']
paths = {path for pattern in patterns for path in base.glob(pattern) if path.is_file()}
pages = base / 'current-ascii-lazy-pages.json.gz'
external_path = Path('docs/case-studies/issue-784/evidence/current-ascii-lazy-pages.json.gz')
assert pages.is_file() and not external_path.exists()
paths.remove(pages)
external = {'path': str(external_path), 'originalPath': str(pages),
            'bytes': pages.stat().st_size,
            'sha256': hashlib.sha256(pages.read_bytes()).hexdigest()}
paths |= {Path(name) for name in [
    'tools/translation/prepare-core-ascii-sources.mjs',
    'tools/translation/prepare-named-core-ascii-producer.mjs',
    'tools/translation/source-profiles/named-core-ascii-producer/original.mjs.gz',
    'tools/translation/test/router-core-ascii.test.mjs',
    'tools/translation/test/complete-source-metadata-receiving.mjs',
    'tools/translation/test/complete-source-metadata-receiving.test.mjs',
    'tools/translation/test/named-core-ascii-producer.test.mjs',
    'tools/translation/test/current-unit-unicode-source-composition.mjs',
    'tools/translation/test/unit-matches-source-composition.mjs',
    'experiments/issue-784/trace-current-ascii-source-steps.mjs',
    'experiments/issue-784/retain-current-ascii-receiving.py',
]}
attempts = ['complete-YoqZPP', 'complete-ts86WW', 'complete-sGKfIX',
            'complete-iKRYYW', 'complete-meUlw7', 'complete-2659Q2',
            'complete-sC0zh0']
for name in attempts:
    folder = Path('js/node_modules/.node-case-deadlines') / name
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths |= {path for path in folder.rglob('*') if path.is_file()}
members = []
def append(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
for path in sorted(paths):
    assert not path.is_symlink()
    append(path, path.read_bytes())
for name in ['tools/translation/prepare-core-ascii-sources.mjs',
             'tools/translation/test/router-core-ascii.test.mjs',
             'tools/translation/test/current-unit-unicode-source-composition.mjs',
             'tools/translation/test/unit-matches-source-composition.mjs']:
    append('git:4e7093eb9:' + name,
           subprocess.check_output(['git', 'show', '4e7093eb9:' + name]))
# This exact complete pre-extension control source was executed by the Bun
# whole-file attempt before the later third control was added on disk.
control = Path('tools/translation/test/complete-source-metadata-receiving.test.mjs').read_text()
marker = "\ntest('complete receiving crosses a wire partition"
assert control.count(marker) == 1
append('qualified-bun-pre-extension:complete-source-metadata-receiving.test.mjs',
       (control.split(marker)[0] + '\n').encode())
record = {'schema': 'complete-current-ascii-receiving-attempts-v1',
          'baseHead': '4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2',
          'members': members, 'externalMembers': [external],
          'nodeVersion': '20.20.2', 'bunVersion': '1.4.4',
          'typescriptVersion': '5.9.3', 'nodeHeapMiB': 512,
          'originalAsciiWholeNodeQualified': False,
          'originalAsciiWholeBunQualified': False,
          'finalFiveControlsNodePassed': True, 'finalFiveControlsBunPassed': True,
          'allOriginalAssertionsRetained': True, 'originalDeadlinesChanged': False,
          'naiveAggregateHelperExactPreimageRetained': False,
          'eagerBoundedHelperExactPreimageRetained': True,
          'productionExecutableGain': 0, 'semanticAuthority': False,
          'runtimeParity': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if Path(parent) == Path('experiments/issue-784'):
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / path).stat().st_size for path in files
                    if not (Path(parent) / path).is_symlink())
assert size + len(packed) < 500_000_000, (size, len(packed))
target = Path('docs/case-studies/issue-784/evidence/current-ascii-receiving.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(row['base64'], validate=True)
    assert len(decoded) == row['bytes'] and hashlib.sha256(decoded).hexdigest() == row['sha256']
assert hashlib.sha256(pages.read_bytes()).hexdigest() == external['sha256']
pages.rename(external_path)
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'sha256': hashlib.sha256(packed).hexdigest(),
                  'censusAfterBytes': size + len(packed)}))
