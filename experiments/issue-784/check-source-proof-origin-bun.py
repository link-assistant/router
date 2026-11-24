"""Check whole proof/unit/Unicode receivers in fresh sequential Bun processes."""
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
names = ['source-proof-preservation', 'router-core-unit-matches',
         'router-core-unicode-predicates', 'source-proof-origin']
target = base / 'current-source-proof-unit-origin-bun-files.json'
assert not target.exists()
records = []
for index, name in enumerate(names):
    stem = 'current-source-proof-unit-origin-bun-' + str(index + 1)
    log, receipt = base / (stem + '.log'), base / (stem + '.memory.json')
    status = subprocess.run(['python3', '-B', 'experiments/issue-784/run-observed-check.py',
        '--log', str(log), '--receipt', str(receipt), '--', 'bun', '--smol', 'test',
        'tools/translation/test/' + name + '.test.mjs'], env=os.environ).returncode
    records.append(dict(file=name, exitCode=status, log=str(log), receipt=str(receipt)))
    print(json.dumps(records[-1]), flush=True)
with target.open('x') as output:
    json.dump(dict(wholeFiles=records, completeOriginalFiles=True,
                   originalDeadlinesChanged=False, fullGatePassed=False), output)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in records) else 1)
