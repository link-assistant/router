"""Retain genuine regeneration and both complete original translator attempts."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('ci-logs/issue-784-restart-2')
outputs = ['parity/js-first-translation.json', 'parity/js-owned-core-reverse-draft.json',
           'tools/translation/js-to-rust/generated/owned-core/inputs.json']
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
members = {}
for path in outputs:
    members['before/' + path] = subprocess.check_output(['git', 'show', head + ':' + path])
    members[path] = Path(path).read_bytes()
    assert members['before/' + path] != members[path]
paths = {Path(__file__).relative_to(Path.cwd()), Path('scripts/regenerate-js-first.mjs'),
         Path('tools/translation/js-to-rust/owned-core-corpus.mjs'),
         Path('tools/translation/js-to-rust/test/translator.test.mjs'),
         Path('scripts/run-node-tests.mjs'), Path('experiments/issue-784/run-observed-check.py')}
resources = {}
for label in ['current-reverse-regenerate-write', 'current-translator-freshness-node',
              'current-translator-freshness-bun', 'current-translator-freshness-bun-absolute']:
    for suffix in ['.log', '.memory.json']:
        paths.add(base / (label + suffix))
    row = json.loads((base / (label + '.memory.json')).read_bytes())
    assert not Path('/proc', str(row['pid'])).exists()
    resources[label] = row
assert resources['current-reverse-regenerate-write']['exitCode'] == 0
assert resources['current-translator-freshness-node']['exitCode'] == 0
assert resources['current-translator-freshness-bun-absolute']['stopped'] is True
assert resources['current-translator-freshness-bun-absolute']['exitCode'] == 143
audit = Path('js/node_modules/.node-case-deadlines/complete-o3iJY2')
paths.update(path for path in audit.rglob('*') if path.is_file())
deadline = json.loads((audit / 'case-deadlines.json').read_bytes())
assert deadline['passed'] is True
for path in paths:
    members[str(path)] = path.read_bytes()
archive = Path('docs/case-studies/issue-784/evidence/current-reverse-freshness.tar.gz')
receipt = archive.with_name('current-reverse-freshness.json.gz')
assert not archive.exists() and not receipt.exists()
assert sum(map(len, members.values())) < 16_000_000
rows = {name: dict(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        for name, raw in members.items()}
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=1, mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for name, raw in sorted(members.items()):
                entry = tarfile.TarInfo(name)
                entry.size = len(raw)
                output.addfile(entry, io.BytesIO(raw))
seen = set()
with tarfile.open(archive, 'r|gz') as source:
    for entry in source:
        assert entry.isfile() and entry.name in rows and entry.name not in seen
        row = rows[entry.name]
        assert entry.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(entry), 'sha256').hexdigest() == row['sha256']
        seen.add(entry.name)
assert seen == set(rows)
record = dict(schema='whole-original-reverse-freshness-evidence-v1', parentHead=head,
              archive=str(archive), bytes=archive.stat().st_size,
              sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
              members=rows, resources=resources, nodeWholeFilePassed=True,
              nodeCaseDeadlineAuditPassed=True, bunWholeFilePassed=False,
              bunIncompleteReason='Container memory guard interrupted the repeated full-project case.',
              fullGatePassed=False, rustExecuted=False)
raw = json.dumps(record).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['parentHead', 'archive', 'bytes', 'sha256']}))
