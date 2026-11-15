"""Join complete reproducing/receiving files and retain every observation."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
prefix = 'derive-effects-history-'
paths = set(base.glob(prefix + '*'))
assert all(path.is_file() for path in paths)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def node(label, expected):
    text = (base / (prefix + label + '-node.log')).read_text()
    folders = re.findall(r'^Complete Node deadline evidence: (.+)$', text, re.M)
    assert len(folders) == 1
    folder = Path(folders[0]).resolve()
    assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
    paths.update(folder.iterdir())
    audit = json.loads((folder / 'case-deadlines.json').read_bytes())
    terminal = json.loads((folder / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert terminal['allCaseLimitsUnchanged'] and not audit['originalCaseLimitsChanged']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    cases = audit['records']
    assert len(cases) == expected and not audit['unobservedFiniteSourceDeadlines']
    assert audit['passed'] and not audit['durationBreaches']
    return dict(directory=str(folder.relative_to(root)), audit=audit, terminal=terminal)


before, after = node('before', 10), node('after', 17)
assert before['audit']['originalFailedCompletionEvents'] == 1
assert after['audit']['originalFailedCompletionEvents'] == 2
assert all(row['type'] == 'test:pass' for row in after['audit']['records'][:10])
for row in after['audit']['sourceRecords']:
    assert digest(Path(row['path'])) == row['sha256']
bun = (base / (prefix + 'after-bun.log')).read_text()
assert '10 pass\n 0 fail' in bun and 'Ran 10 tests across 1 file.' in bun
bun_cases = []
by_name = {row['name']: row for row in after['audit']['records'][:10]}
for line in bun.splitlines():
    match = re.fullmatch(r'\(pass\) (.+) \[([0-9.]+)(ms|s)\]', line)
    if match:
        name, duration, unit = match.groups()
        assert name in by_name and name not in bun_cases
        limit = by_name[name]['deadline']['milliseconds']
        assert float(duration) * (1000 if unit == 's' else 1) + 0.01 <= limit
        bun_cases.append(name)
assert len(bun_cases) == 10
for label in ['before-node', 'author', 'after-node', 'after-bun']:
    resource = json.loads((base / (prefix + label + '-resource.json')).read_bytes())
    assert not resource['stopped'] and not Path('/proc/' + str(resource['pid'])).exists()
review = dict(schema='complete-derive-effects-history-receiving-v1', before=before, after=after,
              deriveEffectsNodeCasesPassed=10, deriveEffectsBunCasesPassed=10,
              relatedRetentionCasesPassed=5, relatedRetentionCasesFailed=2,
              originalBoundsChanged=False, productionExecutableGain=0,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
review_path = base / (prefix + 'receiving-review.json.gz')
raw = json.dumps(review).encode()
with review_path.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(review_path.read_bytes()) == raw
paths.add(review_path)
paths.update(Path('experiments/issue-784') / name for name in [
    'draft-derive-effects-history.py', 'install-derive-effects-history.mjs',
    'retain-derive-effects-history.py'])
paths.add(Path('tools/translation/test/derive-output-effects.test.mjs'))
rows = [dict(path=str(path.relative_to(root) if path.is_absolute() else path),
             bytes=path.stat().st_size, sha256=digest(path)) for path in sorted(paths)]
target = Path('docs/case-studies/issue-784/evidence/derive-effects-history-20261110.tar.gz')
assert not target.exists()
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as archive:
            for row in rows:
                archive.add(row['path'], arcname=row['path'], recursive=False)
seen = set()
by_path = {row['path']: row for row in rows}
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
receipt = dict(schema='complete-derive-effects-history-custody-v1', archive=str(target),
               bytes=target.stat().st_size, sha256=digest(target), members=rows,
               allCompleteMembersReadbackVerified=True, receiving=review,
               rawWorkingCopiesRetired=False)
raw = json.dumps(receipt).encode()
with target.with_suffix('.receipt.json.gz').open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
print(json.dumps({key: receipt[key] for key in ['archive', 'bytes', 'sha256']}))
