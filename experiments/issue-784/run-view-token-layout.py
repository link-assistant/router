#!/usr/bin/env python3
"""Compare a finite token layout hypothesis without modifying compiler files."""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--node', default='node')
parser.add_argument('--target', choices=['literal', 'guarded'], default='literal')
parser.add_argument('--output', type=Path,
                    default=Path('ci-logs/issue-784-restart-2/view-token-layout'))
args = parser.parse_args()
output = args.output
output.mkdir()
rows = []
for variant in ['original', args.target]:
    path = output / (variant + '.json')
    command = [args.node, '--expose-gc', '--max-old-space-size=256',
               'experiments/issue-784/probe-view-token-layout.mjs', variant]
    with path.open('xb') as log:
        subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
    rows.append(json.loads(path.read_text()))
assert rows[0]['files'] == rows[1]['files'], 'every complete original view/item digest'
assert rows[0]['tokens'] == rows[1]['tokens']
receipt = {'original': rows[0]['retainedHeapDelta'],
           args.target: rows[1]['retainedHeapDelta'],
           'tokens': rows[0]['tokens'], 'files': len(rows[0]['files']),
           'sameCompleteEvidenceDigests': True,
           'scope': rows[0]['scope']}
with (output / 'comparison.json').open('x') as log:
    json.dump(receipt, log)
    log.write('\n')
print(json.dumps(receipt))
