"""Complete receiving review, including failed and frozen-history attempts."""
import hashlib
import json
from pathlib import Path
import re

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')


def node_run(prefix):
    text = (base / (prefix + '.log')).read_text()
    names = re.findall(r'^Complete Node deadline evidence: (.+)$', text, re.M)
    assert len(names) == 1
    directory = Path(names[0]).resolve()
    assert directory.parent == root / 'js/node_modules/.node-case-deadlines'
    terminal = json.loads((directory / 'terminal.json').read_bytes())
    audit = json.loads((directory / 'case-deadlines.json').read_bytes())
    assert terminal['childClosed'] and terminal['allCaseLimitsUnchanged']
    assert terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    assert not audit['originalCaseLimitsChanged']
    for source in audit['sourceRecords']:
        assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256']
    return dict(directory=str(directory.relative_to(root)), terminal=terminal, audit=audit)


summary = json.loads((base / 'core-transport-receiving-summary.json').read_bytes())
assert len(summary['results']) == 15
nodes = {name: node_run('core-transport-receiving-node-' + name)
         for name in ['registered', 'graph']}
frozen = node_run('core-transport-frozen-node-registered')
cases = {}
for run in nodes.values():
    for case in run['audit']['records']:
        if case['deadline']['kind'] == 'file-container-no-case-deadline':
            continue
        key = (case['file'], case['name'])
        assert key not in cases
        cases[key] = case
assert len(cases) == 73
assert frozen['audit']['observedCompletedCases'] == 27
resources, buns, missing = [], [], []
for row in summary['results']:
    prefix = 'core-transport-receiving-' + row['engine'] + '-' + row['label']
    resource = json.loads((base / (prefix + '-resource.json')).read_bytes())
    assert resource['exitCode'] == row['exitCode']
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
        # Bun keeps its own original 5000 ms default when source supplies none.
        limit = source['deadline'].get('milliseconds', 5000)
        breach = None if milliseconds is None else milliseconds + 0.01 > limit
        buns.append(dict(file=path, name=name, status=status, milliseconds=milliseconds,
                         originalNodeDeadline=source['deadline'], originalBunDeadlineMs=limit,
                         durationBreach=breach, sourceSha256=source['sourceSha256'],
                         sourceCallSpan=source['sourceCallSpan'], displayPrecisionMs=0.01))
    missing.extend(dict(file=key[0], name=key[1]) for key in cases
                   if key[0] == path and key not in observed)
assert not missing and len(buns) == 73
frozen_resource = json.loads((base / 'core-transport-frozen-node-registered-resource.json').read_bytes())
assert not Path('/proc/' + str(frozen_resource['pid'])).exists()
node_failed = {name: [case for case in run['audit']['records'] if case['type'] == 'test:fail']
               for name, run in nodes.items()}
bun_failed = [row for row in buns if row['status'] != 'pass' or row['durationBreach']]
record = dict(schema='complete-Core-transport-registration-receiving-v1',
              firstNodeRuns=nodes, frozenNodeRegistered=frozen,
              frozenNodeRegisteredResource=frozen_resource,
              nodeFailed=node_failed, bunCases=buns, bunFailed=bun_failed,
              bunMissing=missing, resources=resources,
              frozenNodeRegisteredQualified=frozen['terminal']['exitCode'] == 0
              and frozen['audit']['passed'] and frozen_resource['exitCode'] == 0,
              receivingQualified=False, fullGatePassed=False, productionExecutableGain=0,
              originalDeadlinesChanged=False, runtimeParity=False, rustExecuted=False)
with (base / 'core-transport-receiving-review.json').open('x') as stream:
    json.dump(record, stream)
print(json.dumps(dict(frozenNodeRegisteredQualified=record['frozenNodeRegisteredQualified'],
                      firstNodeFailures={name: len(rows) for name, rows in node_failed.items()},
                      bunFailures=len(bun_failed), bunObserved=len(buns), receivingQualified=False)))
