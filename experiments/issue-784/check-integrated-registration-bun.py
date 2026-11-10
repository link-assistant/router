"""Run complete registered receiving files in fresh Bun processes, original limits."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', required=True)
parser.add_argument('--node-evidence', required=True)
args = parser.parse_args()
assert re.fullmatch('[a-z0-9-]{1,64}', args.prefix)
assert re.fullmatch('complete-[A-Za-z0-9]{6}', args.node_evidence)
base = Path('ci-logs/issue-784-restart-2')
folder = Path('js/node_modules/.node-case-deadlines') / args.node_evidence
audit = json.loads((folder / 'case-deadlines.json').read_bytes())
terminal = json.loads((folder / 'terminal.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['allCaseLimitsUnchanged'] and not audit['originalCaseLimitsChanged']
assert audit['passed'] and audit['originalFailedCompletionEvents'] == 0
assert audit['observedCompletedCases'] == 27
names = ['bulk-draft-custody', 'translation-progress', 'isolated-project-batch', 'portable-git-fixtures']
sources = {Path(row['path']).name: row for row in audit['sourceRecords']}
assert set(sources) == {name + '.test.mjs' for name in names}


def unchanged():
    for row in sources.values():
        raw = Path(row['path']).read_bytes()
        assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']


unchanged()
results = []
for name in names:
    path = 'tools/translation/test/' + name + '.test.mjs'
    expected = {row['name']: row for row in audit['records'] if row['file'] == str(Path(path).resolve())}
    assert expected
    prefix = args.prefix + '-' + name
    log, receipt = base / (prefix + '.log'), base / (prefix + '-resource.json')
    command = ['bun', 'test', path]
    status = subprocess.run(['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                             '--log', str(log), '--receipt', str(receipt), '--', *command]).returncode
    resource = json.loads(receipt.read_bytes())
    cases = []
    for line in log.read_text().splitlines():
        found = re.fullmatch(r'\((pass|fail|skip)\) (.+?)(?: \[([0-9.]+)(ms|s)\])?', line)
        if not found:
            continue
        state, title, duration, unit = found.groups()
        assert title in expected and title not in {row['name'] for row in cases}
        milliseconds = None if duration is None else float(duration) * (1000 if unit == 's' else 1)
        deadline = expected[title]['deadline'].get('milliseconds', 5000)
        cases.append(dict(name=title, state=state, milliseconds=milliseconds, originalDeadlineMs=deadline,
                          durationBreach=milliseconds is not None and milliseconds + 0.01 > deadline))
    passed = (status == 0 and not resource['stopped'] and len(cases) == len(expected)
              and all(row['state'] == 'pass' and not row['durationBreach'] for row in cases))
    row = dict(file=path, command=command, resource=resource, cases=cases,
               unobservedCases=sorted(set(expected) - {case['name'] for case in cases}), passed=passed)
    results.append(row)
    print(json.dumps(dict(file=path, observed=len(cases), passed=passed)), flush=True)
    unchanged()
unchanged()
with (base / (args.prefix + '-review.json')).open('x') as target:
    json.dump(dict(schema='complete-integrated-registration-bun-receiving-v1',
                   nodeEvidence=str(folder), sources=list(sources.values()), results=results,
                   passed=all(row['passed'] for row in results), originalLimitsChanged=False,
                   fullGatePassed=False, runtimeParity=False, rustExecuted=False), target)
raise SystemExit(0 if all(row['passed'] for row in results) else 1)
