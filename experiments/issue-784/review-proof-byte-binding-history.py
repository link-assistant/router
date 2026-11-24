"""Join the complete source-history receiving cohort to original case limits."""
import gzip
import hashlib
import json
from pathlib import Path
import re

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')


def node_run(prefix, expected, current=True):
    log = (base / (prefix + '-node.log')).read_text()
    names = re.findall(r'^Complete Node deadline evidence: (.+)$', log, re.M)
    assert len(names) == 1
    folder = Path(names[0]).resolve()
    assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
    audit = json.loads((folder / 'case-deadlines.json').read_bytes())
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['allCaseLimitsUnchanged'] and not audit['originalCaseLimitsChanged']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    if current:
        for source in audit['sourceRecords']:
            assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256']
    cases = [row for row in audit['records']
             if row.get('deadline', {}).get('kind') != 'file-container-no-case-deadline']
    assert len(cases) == expected and not audit['unobservedFiniteSourceDeadlines']
    return dict(directory=str(folder.relative_to(root)), terminal=terminal, audit=audit), cases


def cohort(prefix, expected):
    node, cases = node_run(prefix, expected)
    names = {case['name']: case for case in cases}
    assert len(names) == expected
    bun, resources = [], []
    for engine in ['node', 'bun']:
        resource = json.loads((base / (prefix + '-' + engine + '-resource.json')).read_bytes())
        assert not Path('/proc/' + str(resource['pid'])).exists()
        resources.append(dict(engine=engine, resource=resource))
    current_file = None
    for line in (base / (prefix + '-bun.log')).read_text().splitlines():
        if line.startswith('tools/translation/test/') and line.endswith('.mjs:'):
            current_file = str((root / line[:-1]).resolve())
        match = re.fullmatch(r'\((pass|fail|skip)\) (.+?)(?: \[([0-9.]+)(ms|s)\])?', line)
        if not match:
            continue
        status, name, duration, unit = match.groups()
        assert name in names and not any(row['name'] == name for row in bun)
        case = names[name]
        assert current_file == case['file']
        milliseconds = None if duration is None else float(duration) * (1000 if unit == 's' else 1)
        assert case['deadline']['kind'] == 'finite-source-deadline'
        limit = case['deadline']['milliseconds']
        bun.append(dict(file=current_file, name=name, status=status, milliseconds=milliseconds,
                        originalDeadline=case['deadline'], sourceSha256=case['sourceSha256'],
                        sourceCallSpan=case['sourceCallSpan'], displayPrecisionMs=0.01,
                        durationBreach=None if milliseconds is None else milliseconds + 0.01 > limit))
    assert len(bun) == expected
    failures = [row for row in bun if row['status'] != 'pass' or row['milliseconds'] is None or row['durationBreach']]
    qualified = (node['terminal']['exitCode'] == 0 and node['audit']['passed'] and not failures
                 and all(row['resource']['exitCode'] == 0 and not row['resource']['stopped'] for row in resources))
    return dict(node=node, bunCases=bun, bunFailures=failures, resources=resources, receivingQualified=qualified)


before, _ = node_run('proof-history-before', 10, current=False)
trial, _ = node_run('proof-history-after', 10, current=False)
final = cohort('proof-history-final', 22)
assert before['audit']['originalFailedCompletionEvents'] == 2
assert trial['audit']['originalFailedCompletionEvents'] == 1
assert not before['audit']['durationBreaches'] and not trial['audit']['durationBreaches']
assert final['receivingQualified']
record = dict(schema='complete-source-history-receiving-v1', before=before,
              firstAddedAssertionError=trial, final=final,
              sourceHistoryRegressionQualified=True, ownedCliFreshnessQualified=True,
              originalBoundsChanged=False, fullGatePassed=False, productionExecutableGain=0,
              runtimeParity=False, rustExecuted=False)
raw = json.dumps(record).encode()
output = base / 'proof-history-receiving-review.json.gz'
with output.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(output.read_bytes()) == raw
print(json.dumps(dict(output=str(output), nodeCases=22, bunCases=22,
                      sourceHistoryRegressionQualified=True, ownedCliFreshnessQualified=True,
                      originalBoundsChanged=False, fullGatePassed=False)))
