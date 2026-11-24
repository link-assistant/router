"""Retain complete source registration and unchanged receiving qualifications."""
import base64
import gzip
import hashlib
import json
import lzma
from pathlib import Path
import re
import tarfile

base = Path('ci-logs/issue-784-restart-2')
paths = {Path(__file__),
         Path('experiments/issue-784/probe-current-isolated-registry.mjs'),
         Path('experiments/issue-784/refresh-current-isolated-registration.mjs')}
resources = []
for label in ['current-runtime-binding-registry-probe', 'current-runtime-binding-registration-install',
              'current-runtime-binding-registration-node', 'current-runtime-binding-registration-bun']:
    paths |= {base / (label + suffix)
              for suffix in ['.log', '.memory.json']}
    row = json.loads((base / (label + '.memory.json')).read_bytes())
    assert row['exitCode'] == 0 and not row['stopped']
    assert not Path('/proc/' + str(row['pid'])).exists()
    resources.append(row)
paths |= {Path('experiments/issue-784/review-runtime-binding-registration.py'),
          base / 'current-runtime-binding-registry-review.json.gz',
          base / 'current-runtime-binding-registry-review.log',
          base / 'current-runtime-binding-registry-proposal.json.xz',
          base / 'current-runtime-binding-registration-refresh.json.xz'}
for name in ['current-runtime-binding-registry-proposal', 'current-runtime-binding-registration-refresh']:
    raw = lzma.decompress((base / (name + '.json.xz')).read_bytes())
    assert len(raw) < 32 * 1024**2
    record = json.loads(raw)
    for row in record['files'] if isinstance(record.get('files'), list) else record['installed']:
        data = base64.b64decode(row['base64'], validate=True)
        assert len(data) == row['bytes']
        assert hashlib.sha256(data).hexdigest() == row['sha256']
node_log = (base / 'current-runtime-binding-registration-node.log').read_text()
matches = re.findall(r'Complete Node deadline evidence: (.+)', node_log)
assert len(matches) == 1
folder = Path(matches[0])
assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
terminal = json.loads((folder / 'terminal.json').read_bytes())
audit = json.loads((folder / 'case-deadlines.json').read_bytes())
assert terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary']['passed'] and terminal['exitCode'] == 0
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
assert audit['passed'] and not audit['errors'] and audit['durationBreaches'] == 0
assert audit['observedCompletedCases'] == audit['observedFiniteDeadlineCases'] == 16
assert audit['originalFailedCompletionEvents'] == 0 and not audit['originalCaseLimitsChanged']
assert audit['typescript']['version'] == '5.9.3'
assert all(row['type'] == 'test:pass' and row['durationMs'] <= row['deadline']['milliseconds']
           for row in audit['records'])
paths |= {path for path in folder.iterdir() if path.is_file()}
for row in audit['sourceRecords']:
    path = Path(row['path'])
    if path.is_absolute():
        path = path.relative_to(Path('.').resolve())
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
    paths.add(path)
bun_log = (base / 'current-runtime-binding-registration-bun.log').read_text()
durations = [float(value) for value in re.findall(r'\(pass\).*\[([0-9.]+)ms\]', bun_log)]
assert '16 pass' in bun_log and '0 fail' in bun_log
assert len(durations) == 16 and all(value < 60000 for value in durations)
members = []
paths = {path.relative_to(Path('.').resolve()) if path.is_absolute() else path for path in paths}
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    data = path.read_bytes()
    assert len(data) < 32 * 1024**2
    members.append(dict(path=str(path), bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
target = Path('docs/case-studies/issue-784/evidence/current-runtime-binding-registration-checks.tar.gz')
assert not target.exists()
total = sum(path.stat().st_size for root in ['ci-logs', 'docs/case-studies/issue-784',
    'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
    for path in Path(root).rglob('*') if path.is_file() and not path.is_symlink()
    and 'toolchain' not in path.parts and '__pycache__' not in path.parts)
assert total + sum(row['bytes'] for row in members) + 1048576 < 500_000_000
with tarfile.open(target, 'x:gz') as output:
    for row in members:
        output.add(row['path'], arcname=row['path'], recursive=False)
expected = {row['path']: row for row in members}
seen = set()
with tarfile.open(target, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
record = dict(schema='complete-runtime-binding-registration-receiving-v1',
    sourceHead='90446cc9d12895a81e7e5fc5b7f0c9047f26d18e',
    archive=str(target), bytes=target.stat().st_size,
    sha256=hashlib.sha256(target.read_bytes()).hexdigest(), members=members,
    resources=resources, nodeVersion='20.20.2', bunVersion='1.4.4', typescriptVersion='5.9.3',
    originalAssertionsAndDeadlinesRetained=True, wholeReceivingPassedBothEngines=True,
    nodeDeadlineAuditPassed=True, productionExecutableGain=0, fullGatePassed=False,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
receipt = target.with_name('current-runtime-binding-registration-checks.json.gz')
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], sha256=record['sha256'],
    members=len(seen), wholeReceivingPassedBothEngines=True, fullGatePassed=False)))
