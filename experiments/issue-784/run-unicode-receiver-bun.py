"""Sequential complete Bun files, original cases and source-declared deadlines."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time

base = Path('ci-logs/issue-784-restart-2')
prefix = 'unicode-receiver-bun'
names = ['current-unicode-receiver-inputs', 'current-unicode-ascii-asset-producers',
         'router-core-ascii-assets']
expected_cases = dict(zip(names, [2, 3, 4], strict=True))
files = [Path('tools/translation/test') / (name + '.test.mjs') for name in names]
inputs = files + [Path('tools/translation') / name for name in [
    'current-unicode-asset-inputs.mjs', 'prepare-shared-f64-method-receivers.mjs',
    'prepare-core-unicode-predicates.mjs', 'prepare-current-core-ascii-assets.mjs',
    'prepare-current-core-ascii-base-assets.mjs', 'extensions/host-contracts.mjs',
]]


def identities():
    return [dict(path=str(path), bytes=path.stat().st_size,
                 sha256=hashlib.sha256(path.read_bytes()).hexdigest())
            for path in inputs]


target = base / (prefix + '.json.gz')
assert not target.exists()
before, results, start = identities(), [], time.monotonic()
for name, source in zip(names, files):
    log = base / (prefix + '-' + name + '.log')
    memory = base / (prefix + '-' + name + '.memory.json')
    observer = base / (prefix + '-' + name + '.observer.log')
    command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
               '--log', str(log), '--receipt', str(memory), '--',
               'bun', 'test', '--max-concurrency=1', str(source)]
    with observer.open('xb') as output:
        completed = subprocess.run(command, stdout=output, stderr=subprocess.STDOUT)
    resource = json.loads(memory.read_bytes()) if memory.exists() else None
    text = log.read_text()
    measured = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', text, re.M)
    expected = expected_cases[name]
    # All complete files retain their source-declared 60-second case limits.
    finite = True
    breaches = [dict(name=title, elapsedMs=float(value), deadlineMs=60000)
                for title, value in measured if finite and float(value) > 60000]
    passed = (completed.returncode == 0 and resource is not None
              and not resource['stopped'] and expected > 0
              and len(measured) == expected and not breaches)
    results.append(dict(file=str(source), command=command,
                        exitCode=completed.returncode, resource=resource,
                        log=str(log), memory=str(memory), observer=str(observer),
                        expectedCases=expected, measuredCases=measured,
                        originalExplicitDeadlineMs=60000 if finite else None,
                        deadlineBreaches=breaches, passed=passed))
    print(json.dumps(dict(file=str(source), cases=len(measured), expected=expected,
                          passed=passed, deadlineBreaches=breaches)), flush=True)
    if resource is None or resource['stopped']:
        break
after = identities()
record = dict(schema='complete-unicode-receiver-bun-v1',
              head=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              bun=subprocess.check_output(['bun', '--version'], text=True).strip(),
              node=subprocess.check_output(['node', '--version'], text=True).strip(),
              elapsedSeconds=time.monotonic() - start,
              selectedInputsBefore=before, selectedInputsAfter=after,
              selectedInputsUnchanged=before == after, results=results,
              unrun=names[len(results):],
              scope='Complete focused files; selected inputs, not a transitive closure.',
              fullGatePassed=False, rustExecuted=False, runtimeParity=False)
record['passed'] = (before == after and not record['unrun']
                    and all(row['passed'] for row in results))
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
raise SystemExit(0 if record['passed'] else 1)
