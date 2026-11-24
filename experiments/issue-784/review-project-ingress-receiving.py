"""Retain complete original failures and qualify only observed whole-file runs."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
summary = json.loads((base / 'project-ingress-after-summary.json').read_bytes())
assert len(summary['results']) == 10


def node_run(prefix, required):
    log = base / (prefix + '.log')
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', log.read_text(), re.M)
    assert len(matches) == 1
    folder = Path(matches[0]).resolve()
    assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['allCaseLimitsUnchanged']
    assert terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    audit = None
    if (folder / 'case-deadlines.json').exists():
        audit = json.loads((folder / 'case-deadlines.json').read_bytes())
        assert audit['originalCaseLimitsChanged'] is False
        for row in audit['sourceRecords']:
            assert hashlib.sha256(Path(row['path']).read_bytes()).hexdigest() == row['sha256']
    else:
        assert not required and terminal['audit'] is None and terminal['auditError']
    resource = json.loads((base / (prefix + '-resource.json')).read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    return dict(directory=str(folder.relative_to(root)), terminal=terminal,
                audit=audit, resource=resource,
                diagnosticTapPasses=len(re.findall(r'^ok \d+ - ', log.read_text(), re.M)))


before = node_run('project-ingress-before-node', True)
assert before['audit']['observedCompletedCases'] == 3
assert before['audit']['originalFailedCompletionEvents'] == 2
assert before['audit']['durationBreaches'] == 0
original = node_run('project-ingress-after-node-complete', False)
retry = node_run('project-ingress-focused-node', False)
regression = node_run('project-ingress-regression-node', True)
history = node_run('project-ingress-history-node', True)
assert original['resource']['stopped'] and original['audit'] is None
assert retry['resource']['stopped'] and retry['audit'] is None
assert regression['audit']['observedCompletedCases'] == 3
assert history['audit']['observedCompletedCases'] == 37

# The preceding FAILED cohort supplies only unchanged Core source/deadline
# joins. Its old outcomes never qualify the current implementation.
receipt = json.loads(gzip.decompress(Path(
    'docs/case-studies/issue-784/evidence/candidate-binding-receiving-20261110.tar.receipt.json.gz'
).read_bytes()))
member = next(row for row in receipt['members'] if row['path'].endswith('/case-deadlines.json'))
with tarfile.open(receipt['archive'], 'r:gz') as archive:
    raw = archive.extractfile(member['path']).read()
assert len(raw) == member['bytes']
assert hashlib.sha256(raw).hexdigest() == member['sha256']
old = json.loads(raw)
core_path = root / 'tools/translation/test/whole-owner-core-producer-candidate.test.mjs'
core_source = next(row for row in old['sourceRecords'] if row['path'] == str(core_path))
assert hashlib.sha256(core_path.read_bytes()).hexdigest() == core_source['sha256']

cases = [row for run in [regression, history] for row in run['audit']['records']
         if row.get('deadline', {}).get('kind') != 'file-container-no-case-deadline']
current_cases = list(cases)
cases.extend(row for row in old['records'] if row.get('file') == str(core_path)
             and row.get('deadline', {}).get('kind') == 'finite-source-deadline')
by_case = {(str(Path(row['file']).resolve()), row['name']): row for row in cases}
assert len(by_case) == len(cases) == 46
bun, missing, resources = [], [], []
for result in summary['results']:
    if result['engine'] == 'node':
        continue
    path = str((root / result['files'][0]).resolve())
    label = Path(path).name.removesuffix('.test.mjs')
    prefix = 'project-ingress-after-bun-' + label
    resource = json.loads((base / (prefix + '-resource.json')).read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    resources.append(dict(files=result['files'], resource=resource))
    observed = set()
    for line in (base / (prefix + '.log')).read_text().splitlines():
        match = re.fullmatch(r'\((pass|fail|skip)\) (.+?)(?: \[([0-9.]+)(ms|s)\])?', line)
        if not match:
            continue
        status, name, duration, unit = match.groups()
        key = (path, name)
        assert key in by_case and key not in observed
        observed.add(key)
        source = by_case[key]
        deadline = source['deadline']
        milliseconds = None if duration is None else float(duration) * (1000 if unit == 's' else 1)
        limit = deadline.get('milliseconds')
        breach = None if limit is None or milliseconds is None else milliseconds + 0.01 > limit
        bun.append(dict(file=path, name=name, status=status, milliseconds=milliseconds,
                        originalDeadline=deadline, durationBreach=breach,
                        displayPrecisionMs=0.01, sourceSha256=source['sourceSha256'],
                        sourceCallSpan=source['sourceCallSpan'],
                        deadlineJoin='preceding-failed-audit-source-only' if path == str(core_path)
                        else 'current-complete-node-audit'))
    missing.extend(dict(file=key[0], name=key[1]) for key in by_case
                   if key[0] == path and key not in observed)
failures = [row for row in bun if row['status'] != 'pass'
            or row['milliseconds'] is None or row['durationBreach']]
assert len(bun) == 45 and len(missing) == 1 and not failures
before_bun = (base / 'project-ingress-before-bun.log').read_text()
assert len(re.findall(r'^\(fail\) ', before_bun, re.M)) == 2
assert len(re.findall(r'^\(pass\) ', before_bun, re.M)) == 1
record = dict(schema='project-ingress-complete-receiving-review-v2',
              before=before, originalNode=original, focusedCoreRetry=retry,
              regressionNode=regression, historyNode=history,
              beforeNodeFailures=2, beforeBunFailures=2,
              currentAuditedNodeCases=current_cases, bunCases=bun, bunFailures=failures,
              bunMissing=missing, bunResources=resources,
              originalLimitsChanged=False, completeGate=False,
              productionExecutableGain=0, runtimeParity=False, rustExecuted=False,
              receivingQualified=False,
              newRegressionQualified=bool(regression['audit']['passed']
                  and regression['terminal']['exitCode'] == 0
                  and len([row for row in bun if row['file'].endswith(
                      '/project-ingress-native-boundary.test.mjs')]) == 3))
output = base / 'project-ingress-receiving-review.json'
with output.open('x') as stream:
    json.dump(record, stream, indent=2)
print(json.dumps(dict(currentNodeAudited=len(current_cases),
                      bunCompleted=len(bun), bunFailures=len(failures),
                      bunMissing=len(missing), receivingQualified=False,
                      newRegressionQualified=record['newRegressionQualified'],
                      review=str(output))))
