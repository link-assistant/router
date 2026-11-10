"""Regenerate only the changed stage and its two complete dependent closures.

The earlier twelve-stage run and every failure remain separate. This is source
regeneration, not a selected receiving test or a complete JavaScript gate.
"""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
results = []
for stage in ['core-sequence-stream-sources', 'whole-owner-core-corpus-candidate',
              'proof-byte-core-stream-candidate']:
    prefix = 'corrected-native-batch-' + stage
    command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
               '--log', str(base / (prefix + '.log')),
               '--receipt', str(base / (prefix + '-resource.json')), '--',
               'node', 'tools/translation/prepare-' + stage + '.mjs', '--write']
    result = subprocess.run(command)
    results.append(dict(stage=stage, exitCode=result.returncode))
    print(json.dumps(results[-1]), flush=True)
with (base / 'corrected-native-batch-summary.json').open('x') as stream:
    json.dump(dict(stages=results, completePipeline=False,
                   wholeReceivingCasesPassed=False, performanceQualified=False), stream)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
