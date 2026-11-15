"""Index complete failing TAP blocks without replacing the original CI log."""
import collections
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
lines = source.read_text().splitlines()
failures = []
for start, line in enumerate(lines):
    if not re.search(r'\bnot ok \d+ - ', line):
        continue
    end = start + 1
    while end < len(lines):
        if re.search(r'\s\.\.\.\s*$', lines[end]):
            end += 1
            break
        if '# Subtest: ' in lines[end]:
            break
        end += 1
    block = lines[start:end]
    fields = {}
    for name in ['location', 'error', 'failureType', 'exitCode', 'signal']:
        fields[name] = next((row.split(' ' + name + ': ', 1)[1].strip()
                             for row in block if ' ' + name + ': ' in row), None)
    failures.append({'line': start + 1, 'endLine': end,
                     'title': re.sub(r'^.*?not ok ', '', line),
                     **fields, 'completeFailureBlock': block})
result = {'log': str(source), 'lines': len(lines), 'failingEntries': failures,
          'completeCohortQualification': False}
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'reportedFailingEntries': len(failures),
                  'errors': collections.Counter(row['error'] for row in failures),
                  'fileFailures': [{key: row[key] for key in
                                    ['line', 'title', 'exitCode', 'signal']}
                                   for row in failures if row['signal']]}, indent=2))
