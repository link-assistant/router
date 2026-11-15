#!/usr/bin/env python3
"""Locate the stale historical reader comparison without executing a compiler."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = 'tools/translation/js-to-rust/owned-core-source.mjs'
test = root / 'tools/translation/test/host-named-data-declarations.test.mjs'
text = test.read_text()
equations = []
for name in ['READER_SOURCE_EVOLUTION', 'READER_SOURCE_FINAL_EVOLUTION']:
    line = next(row for row in text.splitlines() if row.startswith('const ' + name + '='))
    equations.extend(json.loads(line.split('=', 1)[1].removesuffix(';')))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def undo_named_import(value):
    before = "import {hostRuntimeAssetsNamedDataAliases as hostRuntimeAssets} from '../host-assets.mjs';"
    after = "import {hostRuntimeAssets} from '../host-assets.mjs';"
    assert value.count(before) == 1
    return value.replace(before, after)


def rewind(value):
    for index, row in reversed(list(enumerate(equations))):
        count = value.count(row['after'])
        if count != 1:
            return {'firstMissingEquation': index, 'occurrences': count,
                    'expectedCompleteFragment': row['after']}
        value = value.replace(row['after'], row['before'])
    return {'rewoundBytes': len(value.encode()), 'rewoundSha256': digest(value)}


current = (root / target).read_text()
archive = root / 'tools/translation/source-profiles/core-ascii/reverse-originals.json.gz'
data = json.loads(gzip.decompress(archive.read_bytes()))
rows = data['files'] if isinstance(data, dict) else data
original = next(row for row in rows if row['path'] == target)
assert digest(original['source']) == original['sha256']
fixture = json.loads(gzip.decompress((test.parent / 'fixtures/portable-named-host/objects.json.gz').read_bytes()))
pin = next(row for row in fixture['files'] if row['path'] == target)
historical = rewind(undo_named_import(original['source']))
assert historical == {'rewoundBytes': pin['bytes'], 'rewoundSha256': pin['sha256']}
print(json.dumps({
    'currentPath': target, 'currentBytes': len(current.encode()),
    'currentSha256': digest(current), 'testSha256': digest(text),
    'currentRewind': rewind(undo_named_import(current)),
    'originalAsciiReaderArchive': archive.relative_to(root).as_posix(),
    'originalAsciiReaderSha256': original['sha256'], 'historicalRewind': historical,
    'scope': 'Static complete-byte diagnosis only; actual native producers, CST inverses and whole receiving files remain required.',
}, indent=2))
