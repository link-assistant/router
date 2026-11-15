"""Select explicit current asset producers in hand-written source consumers."""
from pathlib import Path

paths = [
    'prepare-core-matches-sources.mjs', 'prepare-executable-checked-source.mjs',
    'prepare-primitive-identity-boundary.mjs', 'prepare-core-vector-sources.mjs',
    'prepare-source-lifetime-refusal-batches.mjs',
    'test/router-core-vectors.test.mjs', 'test/router-core-ascii-assets.test.mjs',
    'test/router-core-ascii-base-assets.test.mjs',
]
rows = []
for name in paths:
    path = Path('tools/translation') / name
    before = path.read_text()
    after = before
    for producer in ['assets', 'base-assets']:
        old = '/prepare-core-ascii-' + producer + '.mjs'
        new = '/prepare-current-core-ascii-' + producer + '.mjs'
        after = after.replace(old, new)
    assert after != before, str(path) + ': current selection required'
    rows.append((path, before, after))
for path, before, _ in rows:
    assert path.read_text() == before, str(path) + ': source changed'
for path, _, after in rows:
    path.write_text(after)
print('Selected current asset producer imports in', len(rows), 'complete consumers')
