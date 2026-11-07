#!/usr/bin/env python3
"""Inventory every failed case from the complete retained forward CI artifact."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

directory = Path('ci-logs/issue-784-restart-2')
archive = directory / 'artifact-13567849550.zip'
destination = directory / 'completed-forward-failures.json'
with zipfile.ZipFile(archive) as packed:
    member, = [row for row in packed.infolist() if row.filename.endswith('/stdout.raw.tap')]
    raw = packed.read(member)
lines = raw.decode('utf-8').splitlines()
failures = []
for at, line in enumerate(lines):
    if not re.match(r'^not ok \d+ - ', line):
        continue
    end = at + 1
    while end < len(lines) and lines[end] != '  ...':
        end += 1
    block = lines[at:min(end + 1, len(lines))]
    failures.append({'line': at + 1, 'case': line,
                     'error': next((row.strip() for row in block if row.startswith('  error:')), None),
                     'location': next((row.strip() for row in block if row.startswith('  location:')), None),
                     'completeBlock': block})
result = {'archive': str(archive), 'member': member.filename,
          'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
          'lines': len(lines), 'failedRecords': len(failures), 'failures': failures,
          'scope': 'Incomplete cancelled cohort; all reported failures, no terminal or deadline qualification.'}
with destination.open('x') as target:
    json.dump(result, target, indent=2)
    target.write('\n')
print(json.dumps({key: value for key, value in result.items() if key != 'failures'}))
for row in failures:
    print(json.dumps({key: value for key, value in row.items() if key != 'completeBlock'}))
