"""Join both complete receiving engines to unchanged sources and deadlines."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
hash_bytes = lambda raw: hashlib.sha256(raw).hexdigest()
records = []
for group, expected in [('isolated', 8), ('export', 9)]:
    node_log = (directory / ('current-' + group + '-node.log')).read_text()
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', node_log, re.M)
    if len(matches) != 1:
        raise RuntimeError('Exactly one complete Node deadline report required')
    audit_root = Path(matches[0]).resolve()
    if audit_root.parent != root / 'js/node_modules/.node-case-deadlines':
        raise RuntimeError('Original task deadline receipt required')
    terminal = json.loads((audit_root / 'terminal.json').read_bytes())
    audit = json.loads((audit_root / 'case-deadlines.json').read_bytes())
    if terminal['exitCode'] != 0 or not audit['passed'] or audit['durationBreaches'] or audit['errors']:
        raise RuntimeError('Complete passing Node source/deadline audit required')
    if audit['observedCompletedCases'] != expected or len(audit['records']) != expected:
        raise RuntimeError('Every complete original receiving case required')
    sources = audit['sourceRecords']
    if len(sources) != 1 or hash_bytes(Path(sources[0]['path']).read_bytes()) != sources[0]['sha256']:
        raise RuntimeError('Complete receiving source changed')
    bun_log = (directory / ('current-' + group + '-bun.log')).read_text()
    if not re.search(r'\n\s*' + str(expected) + r' pass\n\s*0 fail\n', bun_log):
        raise RuntimeError('Complete unfiltered passing Bun file required')
    bun_rows = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', bun_log, re.M)
    if len(bun_rows) != expected or [name for name, _ in bun_rows] != [row['name'] for row in audit['records']]:
        raise RuntimeError('Exact complete ordered Bun case census differs')
    comparisons = []
    for (name, value), row in zip(bun_rows, audit['records']):
        if row['type'] != 'test:pass' or row['skip'] or row['todo']:
            raise RuntimeError('Every original Node case must actually pass')
        duration = float(value)
        limit = row['deadline'].get('milliseconds')
        if limit is not None and duration + 0.01 > limit:
            raise RuntimeError('Printed Bun duration cannot qualify original deadline')
        comparisons.append({'name': name, 'node': row, 'bunPrintedDurationMs': duration,
                            'originalDeadlineMs': limit,
                            'bunDurationPrecisionMs': 0.01})
    receipts = [json.loads((directory / ('current-' + group + '-' + engine + '.memory.json')).read_bytes())
                for engine in ['node', 'bun']]
    if any(receipt['exitCode'] or receipt['stopped'] for receipt in receipts):
        raise RuntimeError('Complete closed successful resource observations required')
    records.append({'group': group, 'cases': comparisons, 'completeSource': sources[0],
                    'nodeAuditDirectory': str(audit_root), 'audit': audit,
                    'terminal': terminal, 'memoryReceipts': receipts})

profile = root / 'tools/translation/source-profiles/isolated-project-compiler'
registry = json.loads(gzip.decompress((profile / 'manifest.json.gz').read_bytes()))
for row in registry['sources']:
    path = root / row['path']
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    if path.stat().st_size != row['bytes'] or digest != row['sha256']:
        raise RuntimeError('Complete registered compiler changed: ' + row['path'])
history = json.loads(gzip.decompress((profile / ('history-' + 'e63974237e21c35c51e5005d2b09a2ceb5d2be91' + '.json.gz')).read_bytes()))
for row in history['files']:
    raw = base64.b64decode(row['base64'], validate=True)
    if len(raw) != row['bytes'] or hash_bytes(raw) != row['sha256']:
        raise RuntimeError('Complete historical registration changed')
    before = subprocess.check_output(['git', 'show', 'f3ba507ddc3f48391239c21423cc84ec1a2a275e:' + row['path']], cwd=root)
    if before != raw:
        raise RuntimeError('Complete historical published preimage differs')
result = {'schema': 'complete-current-isolated-receiving-review-v1',
          'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
          'records': records, 'registrySourceHead': registry['sourceHead'],
          'completeRegisteredSourcesUnchanged': True, 'fullHistoricalPublishedPreimagesVerified': True,
          'casesPerEngine': sum(len(row['cases']) for row in records),
          'wholeReceivingPassed': True, 'productionExecutableGain': 0,
          'strictParityPassed': False, 'fullGatePassed': False}
raw = json.dumps(result, separators=(',', ':')).encode()
if len(raw) > 8 * 1024 * 1024:
    raise RuntimeError('Finite complete receiving review evidence required')
target = directory / 'current-isolated-receiving-review.json.gz'
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
if gzip.decompress(target.read_bytes()) != raw:
    raise RuntimeError('Complete receiving review readback differs')
print(json.dumps({key: value for key, value in result.items() if key != 'records'}))
