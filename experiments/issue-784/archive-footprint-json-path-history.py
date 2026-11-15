"""Retain complete receiver proposals, failed drafts and whole-file observations."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/footprint-json-path-history-20261110.tar.gz')
receipt = archive.with_suffix('.receipt.json.gz')
assert not archive.exists() and not receipt.exists()
paths = {p for p in base.iterdir() if p.is_file() and
         p.name.startswith(('footprint-json-path-history-', 'footprint-json-freeze-before-'))}
audits = []
folders = set()
for path in sorted(paths):
    if path.suffix != '.log':
        continue
    for name in re.findall(r'^Complete Node deadline evidence: (.+)$', path.read_text(), re.M):
        folder = Path(name).resolve()
        if folder in folders:
            continue
        assert folder.parent == root / 'js/node_modules/.node-case-deadlines'
        terminal = json.loads((folder / 'terminal.json').read_bytes())
        audit = json.loads((folder / 'case-deadlines.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        assert not terminal['allCaseLimitsUnchanged'] is False
        assert not audit['originalCaseLimitsChanged']
        assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
        folders.add(folder)
        paths.update(p.relative_to(root) for p in folder.iterdir() if p.is_file())
        audits.append(dict(directory=str(folder.relative_to(root)), passed=audit['passed'],
                           cases=audit['observedCompletedCases'], durationBreaches=audit['durationBreaches']))
for parent in ['tools/translation/source-profiles/derive-path-index-reentry']:
    paths.update(p for p in Path(parent).iterdir() if p.is_file())
paths.update(Path(p) for p in [
    'tools/translation/derive-footprints.mjs',
    'tools/translation/prepare-derive-path-index-reentry.mjs',
    'tools/translation/test/derive-footprint-json.test.mjs',
    'tools/translation/test/private-data-freeze-cohorts.test.mjs',
    'experiments/issue-784/draft-footprint-json-path-history.py',
    'experiments/issue-784/install-footprint-json-path-history.mjs',
    str(Path(__file__).relative_to(root)),
])
audit = json.loads(Path('js/node_modules/.node-case-deadlines/complete-IkoQF5/case-deadlines.json').read_bytes())
assert audit['passed'] and audit['observedCompletedCases'] == 8
text = (base / 'footprint-json-path-history-after-bun.log').read_text()
observations = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', text, re.M)
assert len(observations) == 8 and '\n 8 pass\n 0 fail\n' in text
bun = []
for name, duration in observations:
    matches = [r for r in audit['records'] if r['name'] == name and r['type'] == 'test:pass']
    assert len(matches) == 1
    limit = matches[0]['deadline']['milliseconds']
    assert float(duration) + 0.01 <= limit
    bun.append(dict(name=name, milliseconds=float(duration), precisionMs=0.01, originalDeadlineMs=limit))
paths = sorted(paths)
assert 1 <= len(paths) <= 256
assert sum(p.stat().st_size for p in paths) < 64 * 1024 * 1024

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

rows = []
for path in paths:
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest(path)))
with archive.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', compresslevel=6, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as output:
            for path in paths:
                output.add(path, arcname=str(path), recursive=False)
expected, seen = {r['path']: r for r in rows}, set()
with tarfile.open(archive, 'r|gz') as source:
    for member in source:
        assert member.isfile() and member.name in expected and member.name not in seen
        row = expected[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(expected)
assert all(digest(Path(r['path'])) == r['sha256'] for r in rows)
record = dict(schema='complete-footprint-json-path-history-archive-v1',
              sourcePredecessor='e88183bb894b9ea62c9d6ae170c3fc099047685b',
              evidenceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, completeMemberReadbackVerified=True, nodeAudits=audits, bunCases=bun,
              originalDeadlinesChanged=False, productionExecutableGain=0,
              wholeProductionReceivingQualified=False, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False,
              failedDraftsRetained=True, nativeSyntaxAndFullSourceEquationsRetained=True)
raw = (json.dumps(record, separators=(',', ':')) + '\n').encode()
with receipt.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps({k: v for k, v in record.items() if k not in ['members', 'nodeAudits']}))
print(json.dumps(dict(nodeAudits=audits)))
