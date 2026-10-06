#!/usr/bin/env python3
"""Identify unexercised authored Rust lines in the retained CI coverage artifact."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
artifact = root / 'target/issue-697-coverage'
summary = json.loads((artifact / 'coverage-summary.json').read_text())
print('Totals:', summary['data'][0]['totals']['lines'])
records = {}
current = None
for line in (artifact / 'lcov.info').read_text().splitlines():
    if line.startswith('SF:'):
        filename = line[3:]
        current = 'src/' + filename.split('/src/', 1)[1] if '/src/' in filename else None
        if current and not (root / current).exists(): current = None
        if current: records.setdefault(current, {})
    elif line.startswith('DA:') and current:
        fields = line[3:].split(',')
        number, count = map(int, fields[:2])
        records[current][number] = records[current].get(number, 0) + count
for filename, lines in sorted(records.items(), key=lambda item: sum(count == 0 for count in item[1].values()), reverse=True)[:35]:
    missing = [line for line, count in lines.items() if count == 0]
    print(filename, 'uncovered', len(missing), 'total', len(lines), 'lines', missing[:80])
