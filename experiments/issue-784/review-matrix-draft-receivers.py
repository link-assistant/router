"""Join the whole current receiving cases, original deadlines and source bytes."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
hash_bytes = lambda raw: hashlib.sha256(raw).hexdigest()
log = (base / 'matrix-draft-receivers-node-retry.log').read_text()
matches = re.findall(r'^Complete Node deadline evidence: (.+)$', log, re.M)
assert len(matches) == 1
attempt = Path(matches[0]).resolve()
assert attempt.parent == root / 'js/node_modules/.node-case-deadlines'
terminal = json.loads((attempt / 'terminal.json').read_bytes())
audit = json.loads((attempt / 'case-deadlines.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['childClosed']
assert terminal['groupCleanup']['complete']
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
assert audit['passed'] and not audit['durationBreaches'] and not audit['errors']
assert audit['observedCompletedCases'] == len(audit['records']) == 17
assert len(audit['sourceRecords']) == 2
for source in audit['sourceRecords']:
    raw = Path(source['path']).read_bytes()
    assert len(raw) == source['bytes'] and hash_bytes(raw) == source['sha256']
    assert raw.decode() == source['source']
comparisons = []
for group, filename, expected in [('export', 'export-bundle', 9),
                                   ('isolated', 'isolated-project-batch', 8)]:
    path = root / ('tools/translation/test/' + filename + '.test.mjs')
    records = [row for row in audit['records'] if row['file'] == str(path)]
    bun = (base / ('matrix-draft-' + group + '-bun.log')).read_text()
    assert re.search(r'\n\s*' + str(expected) + r' pass\n\s*0 fail\n', bun)
    rows = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', bun, re.M)
    assert len(rows) == len(records) == expected
    assert [name for name, _ in rows] == [row['name'] for row in records]
    for (name, duration), row in zip(rows, records):
        assert row['type'] == 'test:pass' and not row['skip'] and not row['todo']
        deadline = row['deadline'].get('milliseconds')
        assert deadline is None or float(duration) + 0.01 <= deadline
        comparisons.append({'node': row, 'bunPrintedDurationMs': float(duration),
                            'bunDurationPrecisionMs': 0.01})
receipts = [json.loads((base / name).read_bytes()) for name in [
    'matrix-draft-receivers-node-retry.memory.json', 'matrix-draft-export-bun.memory.json',
    'matrix-draft-isolated-bun.memory.json']]
assert all(not row['exitCode'] and not row['stopped'] and
           not Path('/proc/' + str(row['pid'])).exists() for row in receipts)
profile = root / 'tools/translation/source-profiles/isolated-project-compiler'
registry = json.loads(gzip.decompress((profile / 'manifest.json.gz').read_bytes()))
for row in registry['sources']:
    raw = (root / row['path']).read_bytes()
    assert len(raw) == row['bytes'] and hash_bytes(raw) == row['sha256']
history = json.loads(gzip.decompress((profile /
    'history-84f791d10fcad6e0d7efca1f5106a53f3e8bad5f.json.gz').read_bytes()))
assert len(history['files']) == 6
for row in history['files']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hash_bytes(raw) == row['sha256']
    assert raw == subprocess.check_output(['git', 'show',
        'ae10349b69f2303b9c799f07a40757fbd8d315cc:' + row['path']], cwd=root)
result = {'schema': 'complete-matrix-draft-receiving-review-v1',
          'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
          'terminal': terminal, 'audit': audit, 'comparisons': comparisons,
          'memoryReceipts': receipts, 'registeredSourceHead': registry['sourceHead'],
          'allRegisteredBytesUnchanged': True, 'sixCompleteHistoricalPreimagesVerified': True,
          'wholeCasesPerEngine': 17, 'productionExecutableGain': 0,
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(result, separators=(',', ':')).encode()
assert len(raw) <= 8 * 1024 * 1024
target = base / 'matrix-draft-receiving-review.json.gz'
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({key: value for key, value in result.items()
                  if key not in ['terminal', 'audit', 'comparisons', 'memoryReceipts']}))
