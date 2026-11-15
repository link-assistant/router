"""Join complete Node audits, Bun reports and their original source deadlines."""
import hashlib
import json
from pathlib import Path
import re

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')


def node_run(prefix, current):
    log = (base / (prefix + '.log')).read_text()
    names = re.findall(r'^Complete Node deadline evidence: (.+)$', log, re.M)
    assert len(names) == 1
    folder = Path(names[0]).resolve()
    assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    audit = json.loads((folder / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['allCaseLimitsUnchanged']
    assert terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    assert audit['originalCaseLimitsChanged'] is False
    if current:
        for source in audit['sourceRecords']:
            assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256']
    return dict(directory=str(folder.relative_to(root)), terminal=terminal, audit=audit)


def cohort(label, expected):
    summary = json.loads((base / (label + '-summary.json')).read_bytes())
    nodes, cases = [], {}
    for row in summary['results']:
        if row['engine'] != 'node':
            continue
        prefix = label.removesuffix('-after') + '-node-' + row['label'] if label == 'core-hook-dag' else label + '-node-' + row['label']
        run = node_run(prefix, label != 'core-hook-dag')
        nodes.append(run)
        for case in run['audit']['records']:
            if case.get('deadline', {}).get('kind') == 'file-container-no-case-deadline':
                continue
            key = (case['file'], case['name'])
            assert key not in cases
            cases[key] = case
    assert len(cases) == expected
    buns, missing, resources = [], [], []
    for row in summary['results']:
        prefix = (label + '-' + row['engine'] + '-' + row['label'])
        resource = json.loads((base / (prefix + '-resource.json')).read_bytes())
        assert not Path('/proc/' + str(resource['pid'])).exists()
        resources.append(dict(files=row['files'], resource=resource))
        if row['engine'] != 'bun':
            continue
        path = str((root / row['files'][0]).resolve())
        observed = set()
        for line in (base / (prefix + '.log')).read_text().splitlines():
            match = re.fullmatch(r'\((pass|fail|skip)\) (.+?)(?: \[([0-9.]+)(ms|s)\])?', line)
            if not match:
                continue
            status, name, duration, unit = match.groups()
            key = (path, name)
            assert key in cases and key not in observed
            observed.add(key)
            source = cases[key]
            milliseconds = None if duration is None else float(duration) * (1000 if unit == 's' else 1)
            limit = source['deadline'].get('milliseconds')
            breach = None if limit is None or milliseconds is None else milliseconds + 0.01 > limit
            buns.append(dict(file=path, name=name, status=status, milliseconds=milliseconds,
                             originalDeadline=source['deadline'], durationBreach=breach,
                             sourceSha256=source['sourceSha256'], sourceCallSpan=source['sourceCallSpan'],
                             deadlineJoin='same-cohort-complete-node-audit', displayPrecisionMs=0.01))
        missing.extend(dict(file=key[0], name=key[1]) for key in cases if key[0] == path and key not in observed)
    failures = [row for row in buns if row['status'] != 'pass' or row['milliseconds'] is None or row['durationBreach']]
    qualified = (all(row['terminal']['exitCode'] == 0 and row['audit']['passed'] for row in nodes)
                 and not failures and not missing and len(buns) == expected
                 and all(row['resource']['exitCode'] == 0 and not row['resource']['stopped'] for row in resources))
    return dict(nodeRuns=nodes, bunCases=buns, bunFailures=failures, bunMissing=missing,
                resources=resources, receivingQualified=qualified)


before = cohort('core-hook-dag', 18)
after = cohort('native-buffer-json-dag-after', 21)
assert not before['receivingQualified']
assert len(before['bunFailures']) == 1 and not before['bunMissing']
record = dict(schema='complete-Core-hook-transport-receiving-v1', before=before, after=after,
              newApiBeforeNode=node_run('native-buffer-json-dag-before-node', False),
              originalDeadlinesChanged=False, originalChildDeadlineMs=12500,
              fullGatePassed=False, productionExecutableGain=0, runtimeParity=False,
              rustExecuted=False, receivingQualified=after['receivingQualified'])
output = base / 'native-buffer-json-dag-receiving-review.json'
with output.open('x') as stream:
    json.dump(record, stream)
print(json.dumps(dict(output=str(output), receivingQualified=record['receivingQualified'],
                      nodeCases=sum(row['audit']['observedCompletedCases'] for row in after['nodeRuns']),
                      bunCases=len(after['bunCases']), bunFailures=len(after['bunFailures']),
                      bunMissing=len(after['bunMissing']))))
