"""Retain complete finite native-memory and namespace receiving attempts."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('selection', choices=['native', 'namespace'])
args = parser.parse_args()
root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
patterns = (['native-runtime-concurrency-*', 'native-current-complete-profile.*',
             'native-current-interned-profile.*', 'native-interned-profile-*']
            if args.selection == 'native' else ['namespace-shadow-data-*'])
selected = {path for pattern in patterns for path in base.glob(pattern)}
for path in sorted(selected):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: [^\n]*/(complete-[A-Za-z0-9]+)', path.read_text()):
            folder = Path('js/node_modules/.node-case-deadlines') / name
            terminal = json.loads((folder / 'terminal.json').read_bytes())
            assert terminal['childClosed'] and terminal['groupCleanup']['complete']
            assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
            selected.update(folder.iterdir())
    if path.name.endswith('.memory.json'):
        resource = json.loads(path.read_bytes())
        for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
            assert not Path('/proc/' + str(pid)).exists()
selected.add(Path(__file__))
selected.add(Path('experiments/issue-784/run-observed-check.py'))
if args.selection == 'native':
    selected.update(Path(name) for name in [
        'tools/translation/js-to-rust/test/native-typescript.test.mjs',
        'tools/translation/js-to-rust/native-typescript.mjs',
        'experiments/issue-784/profile-current-native-regeneration.mjs',
        'experiments/issue-784/analyze-current-native-regeneration.py'])
else:
    selected.update(Path(name) for name in [
        'tools/translation/source-scopes.mjs',
        'tools/translation/test/immutable-source-namespace-paths.test.mjs',
        'tools/translation/test/source-scope-templates.test.mjs',
        'tools/translation/test/namespace-clone-streaming.test.mjs',
        'experiments/issue-784/compare-namespace-shadow-data.mjs',
        'experiments/issue-784/check-namespace-shadow-data-source.mjs'])
paths = sorted(path.relative_to(root) if path.is_absolute() else path for path in selected)
assert 1 <= len(paths) <= 128
assert all(path.is_file() and not path.is_symlink() for path in paths)


def digest(stream):
    return hashlib.file_digest(stream, 'sha256').hexdigest()


rows = []
for path in paths:
    with path.open('rb') as stream:
        rows.append(dict(path=str(path), bytes=path.stat().st_size, sha256=digest(stream)))
assert sum(row['bytes'] for row in rows) < 16 * 1024 * 1024
allocation = 0
for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
               'js/node_modules/.node-case-deadlines']:
    for directory, directories, names in os.walk(folder):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        for name in names:
            path = Path(directory, name)
            if not path.is_symlink():
                allocation += path.stat().st_size
assert allocation + sum(row['bytes'] for row in rows) * 1.01 + len(rows) * 4096 + 65536 < 500_000_000
archive = Path('docs/case-studies/issue-784/evidence') / (args.selection + '-resource-repair-20261111.tar.gz')
receipt = archive.with_name(args.selection + '-resource-repair-20261111.json.gz')
assert not archive.exists() and not receipt.exists()
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=6, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
seen, expected = set(), {row['path']: row for row in rows}
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert digest(source.extractfile(member)) == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected)
with archive.open('rb') as stream:
    archive_hash = digest(stream)
record = dict(schema='complete-resource-repair-attempts-v1', selection=args.selection,
    sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    workingDraftSnapshots=True, archive=str(archive), bytes=archive.stat().st_size,
    sha256=archive_hash, members=rows, allMembersReadBack=True,
    fullGatePassed=False, runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({key: record[key] for key in ['selection', 'archive', 'bytes', 'sha256']}))
