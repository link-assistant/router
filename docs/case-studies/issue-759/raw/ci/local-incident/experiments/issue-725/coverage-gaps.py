#!/usr/bin/env python3
"""Show uncovered source lines in an LCOV report from a known CI commit."""
import argparse
from collections import defaultdict
from pathlib import Path

arguments = argparse.ArgumentParser(description=__doc__)
arguments.add_argument('report', type=Path)
arguments.add_argument('sources', nargs='*')
options = arguments.parse_args()
root = Path(__file__).resolve().parents[2]
sources = options.sources or [str(path.relative_to(root))
                             for path in sorted((root / 'src/thinking').glob('*.rs'))]
hits = defaultdict(lambda: defaultdict(int))
source = None
for line in options.report.read_text().splitlines():
    if line.startswith('SF:'):
        path = line[3:]
        source = 'src/' + path.split('/src/', 1)[1] if '/src/' in path else None
    elif source and line.startswith('DA:'):
        number, count, *_ = line[3:].split(',')
        hits[source][int(number)] += int(count)
for source in sources:
    lines = (root / source).read_text().splitlines()
    missed = [number for number, count in sorted(hits[source].items()) if not count]
    print(f'{source}: {len(missed)} / {len(hits[source])} uncovered lines')
    for number in missed:
        print(f'{number:4}: {lines[number - 1]}')
