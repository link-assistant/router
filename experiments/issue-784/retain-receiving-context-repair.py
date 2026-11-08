"""Retain whole original receiving files, observations and deadline audits."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

configurations = {
    'binder-history': {
        'tests': ['private-native-proof-binder-scope.test.mjs'],
        'inputs': ['private-native-proof-json.mjs', 'prepare-invocation-local-freezer.mjs',
                   'proof-scanner-source-evolution.mjs', 'source-profiles/invocation-local-freezer/complete-originals.json.gz'],
        'cases': 8},
    'serde-child-input': {
        'tests': ['serde-function-index.test.mjs'],
        'inputs': ['derive-dependencies.mjs', 'source-profiles/derive/manifest.json'],
        'cases': 6},
    'literal-privacy-history': {
        'tests': ['literal-source-inputs.test.mjs', 'unit-privacy-source-composition.test.mjs'],
        'inputs': ['test/fixtures/unit-privacy-source-composition.mjs',
                   'test/fixtures/unit-privacy-source-rules.json'],
        'cases': 12},
    'tuple-core': {
        'tests': ['tuples.test.mjs'],
        'inputs': ['router-core-facade-source.mjs', 'router-core-source-data.mjs'],
        'newInputs': ['test/fixtures/tuple-owned-core-refusals.json'],
        'nodeLabel': 'node-2', 'cases': 8},
}
assert len(sys.argv) == 2 and sys.argv[1] in configurations
label = sys.argv[1]
configuration = configurations[label]
baseline = '567e1dd0b072a2bfd736a9025ba245a630aaff7d'
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-' + label + '.json.gz')
members = []


def retain(path, raw):
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for name in ['test/' + name for name in configuration['tests']] + configuration['inputs']:
    path = Path('tools/translation') / name
    retain('git:' + baseline + ':' + str(path),
           subprocess.check_output(['git', 'show', baseline + ':' + str(path)]))
    retain(path, path.read_bytes())
for name in configuration.get('newInputs', []):
    path = Path('tools/translation') / name
    retain(path, path.read_bytes())
if label == 'tuple-core':
    for name in ['lib.rs', 'anthropic_stream.rs', 'responses.rs', 'translation_core.rs',
                 'translation_core/primitives.rs', 'translation_core/json_collections.rs',
                 'translation_core/ranges.rs', 'translation_core/base64.rs']:
        path = Path('rust/src') / name
        retain(path, path.read_bytes())
    path = Path('experiments/issue-784/probe-tuple-core.mjs')
    retain(path, path.read_bytes())
for path in sorted(base.glob('current-' + label + '-*')):
    for selected in ([path] if path.is_file() else sorted(path.rglob('*'))):
        if selected.is_file():
            retain(selected, selected.read_bytes())
receipts = {}
for engine in ['node', 'bun']:
    engine_label = configuration.get('nodeLabel', 'node') if engine == 'node' else engine
    receipt = json.loads((base / ('current-' + label + '-' + engine_label + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == 0 and not receipt['stopped']
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    receipts[engine] = receipt
lines = (base / ('current-' + label + '-' + configuration.get('nodeLabel', 'node') + '.log')).read_text().splitlines()
audits = [line.removeprefix('Complete Node deadline evidence: ')
          for line in lines if line.startswith('Complete Node deadline evidence: ')]
assert len(audits) == 1
audit = Path(audits[0])
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
for path in sorted(audit.rglob('*')):
    if path.is_file():
        retain(path, path.read_bytes())
retain(Path(__file__), Path(__file__).read_bytes())
record = {'schema': 'complete-receiving-context-repair-v1', 'label': label,
          'baseline': baseline, 'members': members, 'receipts': receipts,
          'completeCasesPerEngine': configuration['cases'],
          'nodeVersion': '20.20.2', 'bunVersion': '1.4.4', 'ciBunVersion': '1.4.3',
          'typescriptVersion': '5.9.3', 'originalAssertionsAndDeadlinesRetained': True,
          'nodeAudit': terminal, 'productionExecutableGain': 0,
          'isImmutableLaunchSnapshot': False, 'semanticAuthority': False,
          'runtimeParity': False, 'fullGatePassed': False, 'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500_000_000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'members': len(members),
                  'wholeReadbackVerified': True, 'evidenceBytesAfter': total + len(packed)}))
