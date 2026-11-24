"""Read complete whole-file stage attempts, original audits and observer receipts."""
import gzip
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
specifications = [
    ('owned-matrix-stage-before', 1, True),
    ('owned-matrix-stage-node', 1, False),
    ('owned-matrix-stage-node-retry', 0, True),
    ('owned-matrix-stage-bun', 1, None),
    ('owned-matrix-stage-cached-node', 0, True),
    ('owned-matrix-stage-cached-bun', 0, None),
]
attempts = []
for name, exit_code, audit_passed in specifications:
    raw = (base / (name + '.log')).read_bytes()
    memory = json.loads((base / (name + '.memory.json')).read_bytes())
    assert memory['exitCode'] == exit_code and not memory['stopped']
    assert not Path('/proc/' + str(memory['pid'])).exists()
    row = {'name': name, 'completeLogBytes': len(raw),
           'completeLogSha256': hashlib.sha256(raw).hexdigest(), 'memory': memory}
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', raw.decode(), re.M)
    if audit_passed is not None:
        assert len(matches) == 1
        path = Path(matches[0])
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        audit = json.loads((path / 'case-deadlines.json').read_bytes())
        assert terminal['exitCode'] == exit_code and terminal['childClosed']
        assert terminal['groupCleanup']['complete']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert audit['passed'] is audit_passed
        for original in terminal['logs']:
            complete = (path / original['path']).read_bytes()
            assert len(complete) == original['bytes'] == original['observedBytes']
            assert hashlib.sha256(complete).hexdigest() == original['sha256'] == original['readback']['sha256']
        audit_raw = (path / terminal['audit']['path']).read_bytes()
        assert len(audit_raw) == terminal['audit']['bytes']
        assert hashlib.sha256(audit_raw).hexdigest() == terminal['audit']['sha256']
        row.update(terminal=terminal, audit=audit)
        if name == 'owned-matrix-stage-cached-node':
            assert audit['observedCompletedCases'] == len(audit['records']) == 47
            assert len(audit['sourceRecords']) == 3
            for source in audit['sourceRecords']:
                current = Path(source['path']).read_bytes()
                assert current.decode() == source['source']
                assert len(current) == source['bytes']
                assert hashlib.sha256(current).hexdigest() == source['sha256']
    else:
        row['nestedFixtureEvidencePaths'] = matches
        counts = (42, 2) if exit_code else (45, 0)
        assert re.search(r'\n\s*' + str(counts[0]) + r' pass\n\s*' + str(counts[1]) + r' fail\n', raw.decode())
        printed = re.findall(r'^\((pass|fail)\) (.+) \[([0-9.]+)ms\]$', raw.decode(), re.M)
        rows = list(dict.fromkeys(printed))
        assert len(rows) == sum(counts)
        row['allPrintedBunRecords'] = printed
        row['completeBunCases'] = rows
        if not exit_code:
            for _, case, duration in rows:
                if case.startswith(('Rust verification after JavaScript', 'every JavaScript stage and command')):
                    assert float(duration) < 5000
    attempts.append(row)
result = {'schema': 'complete-owned-matrix-stage-review-v1', 'attempts': attempts,
          'currentWholeNodeCases': 47, 'currentWholeBunCases': 45,
          'originalDeadlinesPreserved': True, 'fullGatePassed': False,
          'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(result, separators=(',', ':')).encode()
destination = base / 'owned-matrix-stages-review.json.gz'
with destination.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(destination.read_bytes()) == raw
print(json.dumps({key: value for key, value in result.items() if key != 'attempts'}))
