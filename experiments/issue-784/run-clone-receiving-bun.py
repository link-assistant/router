"""Run complete affected files in sequential fresh Bun processes, original limits."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cohort', choices=['history', 'project', 'concrete', 'ingress'], default='history')
parser.add_argument('--prefix', default='current-clone-receiving-bun-1')
args = parser.parse_args()
assert re.fullmatch('[a-z0-9-]+', args.prefix)
names = [
    'builtin-enclosing-namespace-format', 'current-receiving-source-history',
    'default-proof-byte-adoption', 'default-proof-byte-prerequisites',
    'schemars-current-enclosing-history', 'clone-enclosing-source-history',
    'schemars-enclosing-adoption', 'builtin-clone-enclosing-namespace',
    'concrete-source-origin-phases',
]
if args.cohort in ['project', 'ingress']:
    names = ['enclosing-matches-namespace', 'project-enclosing-namespace',
             'matches-namespace-capture', 'matches-namespace-validation',
             'matches-immutable-context-cache']
finite_files = set(names if args.cohort == 'history' else names[:2])
if args.cohort == 'ingress':
    names.append('project-concrete-batch')
    finite_files.add('project-concrete-batch')
if args.cohort == 'concrete':
    names = ['project-concrete-batch', 'builtin-clone-partial-eq-payload',
             'project', 'module-paths', 'schemars-with-output']
    finite_files = {'project-concrete-batch', 'builtin-clone-partial-eq-payload',
                    'schemars-with-output'}
base = Path('ci-logs/issue-784-restart-2')
prefix = args.prefix
inputs = [Path('tools/translation/test') / (name + '.test.mjs') for name in names]
inputs += [Path('tools/translation') / name for name in [
    'builtin-clone-ast-route.mjs', 'builtin-derive-bang-footprints.mjs',
    'derive-enclosing-namespace-context.mjs',
    'prepare-clone-enclosing-source-history.mjs',
    'prepare-default-proof-byte-adoption.mjs',
    'prepare-current-receiving-source-history.mjs',
    'prepare-schemars-enclosing-adoption.mjs',
    'prepare-schemars-with-output.mjs', 'schemars-current-enclosing-history.mjs',
    'source-profiles/clone-enclosing/source-rules.json',
    'test/fixtures/current-receiving-source-history.mjs',
    'test/fixtures/native-proof-json-format.mjs',
    'project.mjs', 'matches-macro-context.mjs',
    'forward-concrete-syntax.mjs',
]]


def identities():
    result = []
    for path in inputs:
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        result.append(dict(path=str(path), bytes=path.stat().st_size, sha256=digest))
    return result


target = base / (prefix + '.json.gz')
assert not target.exists()
before, results = identities(), []
for name in names:
    log = base / (prefix + '-' + name + '.log')
    receipt = base / (prefix + '-' + name + '-resource.json')
    assert not log.exists() and not receipt.exists()
    command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
               '--log', str(log), '--receipt', str(receipt), '--',
               'bun', 'test', '--max-concurrency=1',
               'tools/translation/test/' + name + '.test.mjs']
    completed = subprocess.run(command, check=False)
    observation = json.loads(receipt.read_bytes()) if receipt.exists() else None
    text = log.read_text()
    durations = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', text, re.M)
    expected = len(re.findall(r'^test\(', Path(command[-1]).read_text(), re.M))
    breaches = [dict(name=title, elapsedMs=float(value), deadlineMs=60000)
                for title, value in durations
                if name in finite_files and float(value) > 60000]
    passed = (completed.returncode == 0 and observation is not None
              and not observation['stopped'] and expected > 0
              and len(durations) == expected and not breaches)
    results.append(dict(name=name, command=command, exitCode=completed.returncode,
                        log=str(log), receipt=str(receipt), observation=observation,
                        expectedWholeFileCases=expected, measuredCases=durations,
                        deadlineBreaches=breaches, passed=passed))
    print(json.dumps(dict(completed=name, exitCode=completed.returncode,
                          measuredCases=len(durations), expectedCases=expected,
                          deadlineBreaches=breaches, passed=passed)), flush=True)
    if observation is None or observation['stopped']:
        break
after, unrun = identities(), names[len(results):]
passed = before == after and not unrun and all(row['passed'] for row in results)
record = dict(schema='complete-clone-receiving-bun-observation-v1',
              engine=subprocess.check_output(['bun', '--version']).decode().strip(),
              head=subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
              selectedPhysicalInputsBefore=before, selectedPhysicalInputsAfter=after,
              selectedInputsUnchanged=before == after, results=results, unrun=unrun,
              passed=passed,
              originalCaseDeadlinesMs={name: 60000 if name in finite_files else None
                                       for name in names},
              defaultDeadlinesInferred=False,
              scope='Whole targeted files; selected inputs, not a transitive closure.',
              runtimeParity=False, rustExecuted=False, fullGatePassed=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
raise SystemExit(0 if passed else 1)
