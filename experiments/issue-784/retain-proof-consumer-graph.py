"""Preserve both whole Node attempts and the stopped Bun attempt, without truncation."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths, checks = set(), []
for label, code in [('history-node', 1), ('bridge-node', 0), ('bridge-bun', 143)]:
    prefix = 'current-proof-consumer-' + label
    receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == code and receipt['interrupted'] is None
    assert receipt['stopped'] == (code == 143)
    for pid in [receipt['pid'], *receipt['stoppedOwnedProcessIds']]:
        assert not Path('/proc/' + str(pid)).exists()
    checks.append({'label': label, 'receipt': receipt})
    paths.update(base / (prefix + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
for folder, code in [('complete-tJdvM1', 1), ('complete-tlZgNA', 0)]:
    directory = Path('js/node_modules/.node-case-deadlines') / folder
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    assert terminal['exitCode'] == code and terminal['childClosed']
    assert terminal['groupCleanup']['complete'] and terminal['allCaseLimitsUnchanged']
    assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    paths.update(path for path in directory.iterdir() if path.is_file())
paths.add(base / 'current-proof-consumer-history-first-draft.mjs.gz')
paths.update(Path(path) for path in [
    'tools/translation/test/native-proof-json-consumer-formats.test.mjs',
    'experiments/issue-784/current-proof-consumer-plan.md',
    'experiments/issue-784/retain-proof-consumer-graph.py',
    'docs/case-studies/issue-784/current-proof-consumer-graph.md'])
references = []
for path in [
    'tools/translation/test/native-proof-json-consumer-formats.test.mjs',
    'tools/translation/test/fixtures/current-receiving-source-history.mjs',
    'tools/translation/test/fixtures/native-proof-json-format.mjs',
    'tools/translation/test/relocate-source-module.mjs',
    'tools/translation/private-native-proof-json.mjs',
    'tools/translation/operation-proof-byte-bridge.mjs',
    'tools/translation/builtin-derive-bang-footprints.mjs',
    'tools/translation/builtin-copy-output-syntax.mjs']:
    reference = '9f27bfe67:' + path
    raw = subprocess.check_output(['git', 'show', reference])
    if not path.endswith('native-proof-json-consumer-formats.test.mjs'):
        assert Path(path).read_bytes() == raw
    references.append({'path': path, 'gitReference': reference,
                       'gitBlob': subprocess.check_output(['git', 'rev-parse', reference], text=True).strip(),
                       'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                       'completeOriginalReopenedAndVerified': True})
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-proof-consumer-receiving-graph-checks-v1',
          'members': members, 'checks': checks, 'sourceReferences': references,
          'originalDeadlinesUnchanged': True, 'nodeCasesPassed': 8,
          'bunCasesPassedBeforeStop': 5, 'bunWholeFileQualified': False,
          'productionChanged': False, 'newExecutableFunctions': 0,
          'runtimeVectorsExported': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
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
target = Path('docs/case-studies/issue-784/evidence/current-proof-consumer-graph.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest(),
                  'members': len(members), 'censusAfterBytes': size + len(packed)}))
