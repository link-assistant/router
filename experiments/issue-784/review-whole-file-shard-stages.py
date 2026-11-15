"""Read every complete failed/passed receiving stream and unchanged source audit."""
import gzip
import argparse
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
base = root / 'ci-logs/issue-784-restart-2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--final', action='store_true')
args = parser.parse_args()
attempts, deadlines = [], {}
specifications = [('whole-file-shard-node', 1), ('whole-file-shard-node-retry', 0),
                  ('whole-file-shard-bun', 0)]
if args.final:
    specifications += [('whole-file-shard-node-final', 0), ('whole-file-shard-bun-final', 0)]
for name, code in specifications:
    raw = (base / (name + '.log')).read_bytes()
    memory = json.loads((base / (name + '.memory.json')).read_bytes())
    assert memory['exitCode'] == code and not memory['stopped']
    assert not Path('/proc/' + str(memory['pid'])).exists()
    row = {'name': name, 'completeBytes': len(raw),
           'completeSha256': hashlib.sha256(raw).hexdigest(), 'memory': memory}
    if 'bun' not in name:
        matches = re.findall(r'^Complete Node deadline evidence: (.+)$', raw.decode(), re.M)
        assert len(matches) == 1
        path = Path(matches[0])
        assert path.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((path / 'terminal.json').read_bytes())
        audit_raw = (path / 'case-deadlines.json').read_bytes()
        audit = json.loads(audit_raw)
        assert terminal['exitCode'] == code and terminal['childClosed']
        assert terminal['groupCleanup']['complete']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        assert audit['passed'] and audit['durationBreaches'] == 0
        assert audit['observedCompletedCases'] == len(audit['records']) == 54
        assert len(audit['sourceRecords']) == 4
        assert len(audit_raw) == terminal['audit']['bytes']
        assert hashlib.sha256(audit_raw).hexdigest() == terminal['audit']['sha256']
        for original in terminal['logs']:
            complete = (path / original['path']).read_bytes()
            assert len(complete) == original['bytes'] == original['observedBytes']
            assert hashlib.sha256(complete).hexdigest() == original['sha256'] == original['readback']['sha256']
        if code == 0:
            if not args.final or name.endswith('-final'):
                for source in audit['sourceRecords']:
                    current = Path(source['path']).read_bytes()
                    assert current.decode() == source['source']
                    assert len(current) == source['bytes']
                    assert hashlib.sha256(current).hexdigest() == source['sha256']
            for case in audit['records']:
                assert case['type'] == 'test:pass' and case['skip'] is None and case['todo'] is None
                bound = case['deadline']
                if bound['kind'] == 'finite-source-deadline':
                    assert case['durationMs'] <= bound['milliseconds']
                else:
                    assert bound == {'kind': 'default-no-source-deadline'}
                if case['name'] in deadlines:
                    assert deadlines[case['name']] == bound
                deadlines[case['name']] = bound
        else:
            assert sum(case['type'] == 'test:fail' for case in audit['records']) == 1
        row.update(terminal=terminal, audit=audit)
    else:
        text = raw.decode()
        assert re.search(r'\n\s*52 pass\n\s*0 fail\n', text)
        cases = re.findall(r'^\((pass|fail)\) (.+) \[([0-9.]+)ms\]$', text, re.M)
        assert len(cases) == 52
        for status, name, duration in cases:
            assert status == 'pass' and name in deadlines
            assert float(duration) <= deadlines[name].get('milliseconds', 5000)
        row['allBunCases'] = cases
    attempts.append(row)
result = {'schema': 'complete-whole-file-shard-receiving-v1', 'attempts': attempts,
          'wholeNodeCases': 54, 'wholeBunCases': 52, 'originalDeadlinesPreserved': True,
          'nodeDefaultDeadlineInferred': False, 'bunOriginalDefaultMilliseconds': 5000,
          'completeForwardCohortQualified': False, 'fullGatePassed': False,
          'runtimeParity': False, 'rustExecuted': False}
raw = json.dumps(result, separators=(',', ':')).encode()
target = base / ('whole-file-shard-final-receiving-review.json.gz' if args.final else
                 'whole-file-shard-receiving-review.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({key: value for key, value in result.items() if key != 'attempts'}))
