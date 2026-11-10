"""Join complete receiving reports to unchanged independently parsed deadlines.

Run after the receiving orchestrator has terminated. Preserve failures and
missing observations; an assertion pass alone never qualifies a deadline.
This review does not execute tests or issue compiler/parity authority.
"""
import hashlib
import json
from pathlib import Path
import re

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
summary_path = base / 'binding-receiving-summary.json'
summary = json.loads(summary_path.read_bytes())
assert len(summary['results']) == 12
node_log = (base / 'binding-receiving-node-complete.log').read_text()
folders = re.findall(r'^Complete Node deadline evidence: (.+)$', node_log, re.M)
assert len(folders) == 1
folder = Path(folders[0]).resolve()
assert folder.parent == (root / 'js/node_modules/.node-case-deadlines').resolve()
terminal = json.loads((folder / 'terminal.json').read_bytes())
audit = json.loads((folder / 'case-deadlines.json').read_bytes())
assert terminal['childClosed'] and terminal['allCaseLimitsUnchanged']
assert terminal['groupCleanup']['complete']
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
assert audit['originalCaseLimitsChanged'] is False

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


sources = {entry['path']: entry for entry in audit['sourceRecords']}
for path, source in sources.items():
    assert digest(Path(path)) == source['sha256']
cases = [entry for entry in audit['records']
         if entry.get('deadline', {}).get('kind') != 'file-container-no-case-deadline']
by_case = {}
for entry in cases:
    key = (str(Path(entry['file']).resolve()), entry['name'])
    assert key not in by_case
    by_case[key] = entry

# A killed file has no completion events for its original cases. The auditor
# still retains every exact source call span and its independently parsed limit.
# These fourteen original calls use plain single-quoted names without escapes;
# refuse another spelling rather than guessing or dropping the missing cases.
for entry in audit['unobservedFiniteSourceDeadlines']:
    path = str(Path(entry['file']).resolve())
    span = entry['span']
    source = sources[path]
    call = source['source'][span['start']:span['end']]
    name = re.match(r"test\('([^'\\]*)'\s*,", call)
    assert name is not None
    key = (path, name.group(1))
    assert key not in by_case
    by_case[key] = dict(file=path, name=key[1], deadline=entry['deadline'],
                       sourceSha256=source['sha256'], sourceCallSpan=span,
                       nodeCompletionObserved=False)
assert len(by_case) == 62

bun_cases, missing, failures = [], [], []
resources = []
for result in summary['results']:
    engine = result['engine']
    name = 'complete' if engine == 'node' else Path(result['files'][0]).name.removesuffix('.test.mjs')
    prefix = 'binding-receiving-' + engine + '-' + name
    resource = json.loads((base / (prefix + '-resource.json')).read_bytes())
    assert not Path('/proc/' + str(resource['pid'])).exists()
    resources.append(dict(engine=engine, files=result['files'], resource=resource))
    if engine == 'node':
        continue
    path = str((root / result['files'][0]).resolve())
    log = (base / (prefix + '.log')).read_text()
    observed = set()
    for line in log.splitlines():
        match = re.fullmatch(r'\((pass|fail|skip)\) (.+?)(?: \[([0-9.]+)(ms|s)\])?', line)
        if not match:
            continue
        status, case, duration, unit = match.groups()
        key = (path, case)
        if key not in by_case:
            failures.append(dict(engine='bun', file=path, name=case,
                                 error='case has no exact Node source/deadline join'))
            continue
        assert key not in observed
        observed.add(key)
        deadline = by_case[key].get('deadline')
        milliseconds = None if duration is None else float(duration) * (1000 if unit == 's' else 1)
        limit = deadline.get('milliseconds') if deadline else None
        breach = None if limit is None or milliseconds is None else milliseconds + 0.01 > limit
        row = dict(file=path, name=case, status=status, milliseconds=milliseconds,
                   displayPrecisionMs=0.01, originalDeadline=deadline,
                   explicitDurationBreach=breach,
                   sourceSha256=by_case[key].get('sourceSha256'))
        bun_cases.append(row)
        if status != 'pass' or milliseconds is None or breach:
            failures.append(row)
    expected = {key for key in by_case if key[0] == path}
    missing.extend(dict(file=key[0], name=key[1]) for key in sorted(expected - observed))

node_failures = [entry for entry in cases if entry['type'] != 'test:pass'
                 or (entry.get('deadline', {}).get('milliseconds') is not None
                     and entry['durationMs'] > entry['deadline']['milliseconds'])]
node_file_failures = [entry for entry in audit['records']
                      if entry['type'] == 'test:fail'
                      and entry.get('deadline', {}).get('kind')
                      == 'file-container-no-case-deadline']
record = dict(
    schema='complete-candidate-binding-receiving-review-v1',
    nodeAuditDirectory=str(folder.relative_to(root)),
    sourceFiles=len(sources), nodeCompletedCases=len(cases),
    nodeAssertionFailures=sum(entry['type'] == 'test:fail' for entry in cases),
    nodeDurationBreaches=audit['durationBreaches'], nodeFailures=node_failures,
    nodeFileFailures=node_file_failures,
    nodeAuditErrors=audit['errors'],
    nodeUnobserved=audit['unobservedFiniteSourceDeadlines'],
    bunCompletedCases=len(bun_cases), bunCases=bun_cases,
    bunFailures=failures, bunMissing=missing, resources=resources,
    allOriginalLimitsChanged=False, completeGate=False,
    sourceInstalledAtExecution=True, productionExecutableGain=0,
    runtimeParity=False, rustExecuted=False)
record['receivingQualified'] = bool(
    len(cases) == 62 and len(bun_cases) == 62 and not node_failures
    and audit['passed'] and not audit['unobservedFiniteSourceDeadlines']
    and not failures and not missing
    and all(result['exitCode'] == 0 for result in summary['results']))
output = base / 'binding-receiving-review.json'
with output.open('x') as stream:
    json.dump(record, stream, indent=2)
print(json.dumps({key: record[key] for key in [
    'sourceFiles', 'nodeCompletedCases', 'nodeAssertionFailures',
    'nodeDurationBreaches', 'bunCompletedCases', 'receivingQualified']}))
print(json.dumps(dict(review=str(output), sha256=digest(output),
                      bunFailures=len(failures), bunMissing=len(missing))))
