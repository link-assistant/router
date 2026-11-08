"""Observe the actual whole owned plan once, with compressed complete output."""
import json
from pathlib import Path
import resource
import subprocess

resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head.startswith('68c598bc2')
source = 'tools/translation/source-module-views.mjs'
assert subprocess.check_output(['git', 'hash-object', source]).strip() == subprocess.check_output(['git', 'rev-parse', 'HEAD:' + source]).strip()
base = Path('ci-logs/issue-784-restart-2')
command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
           '--log', str(base / 'current-owned-freeze-whole-plan.capture.log'),
           '--receipt', str(base / 'current-owned-freeze-whole-plan.memory.json'), '--',
           'python3', '-B', 'experiments/issue-784/capture-compressed-check.py',
           str(base / 'current-owned-freeze-whole-plan.log.gz'), '--',
           'experiments/issue-784/toolchain/node20/bin/node', '--max-old-space-size=768',
           'experiments/issue-784/profile-owned-generation-child.mjs']
record = {'head': head, 'command': command,
          'wholeActualPlan': True, 'sampling': False, 'appliesOutputs': False,
          'fullGateQualification': False, 'resourceStopThresholdBytes': 2866933760}
with (base / 'current-owned-freeze-whole-plan-command.json').open('x') as output:
    json.dump(record, output)
raise SystemExit(subprocess.call(command))
