"""Complete original registration and affected graph cohorts, original limits."""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
groups = [
    ('registered', ['bulk-draft-custody', 'translation-progress',
                    'isolated-project-batch', 'portable-git-fixtures']),
    ('graph', ['project-ingress-native-boundary', 'whole-owner-core-producer-candidate',
               'project-concrete-batch', 'project-concrete-review',
               'project-progress-source-history', 'core-adoption-progress',
               'project-namespace-progress', 'project-rule-pipeline',
               'project-enclosing-namespace']),
]
results = []
for engine in ['node', 'bun']:
    for cohort, names in groups:
        leaves = [names] if engine == 'node' else [[name] for name in names]
        for leaf in leaves:
            label = cohort if engine == 'node' else leaf[0]
            prefix = 'core-transport-receiving-' + engine + '-' + label
            files = ['tools/translation/test/' + name + '.test.mjs' for name in leaf]
            command = (['node', 'scripts/run-node-tests.mjs', '--test-concurrency=1']
                       if engine == 'node' else ['bun', 'test']) + files
            status = subprocess.run(['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                                     '--log', str(base / (prefix + '.log')),
                                     '--receipt', str(base / (prefix + '-resource.json')), '--', *command]).returncode
            row = dict(engine=engine, cohort=cohort, label=label, files=files, exitCode=status)
            results.append(row)
            print(json.dumps(row), flush=True)
with (base / 'core-transport-receiving-summary.json').open('x') as stream:
    json.dump(dict(results=results, originalLimitsChanged=False,
                   fullGatePassed=False, productionExecutableGain=0), stream)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
