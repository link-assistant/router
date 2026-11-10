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
archive = Path('docs/case-studies/issue-784/evidence/shared-f64-receiving-20261110.tar.gz')
receipt = archive.with_suffix('.receipt.json.gz')
assert not archive.exists() and not receipt.exists()
paths = {p for p in base.iterdir() if p.is_file() and
         p.name.startswith(('shared-f64-', 'joint-reference-original-comparison'))}
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
for parent in ['tools/translation/source-profiles/shared-f64-method',
               'tools/translation/source-profiles/shared-f64-prelude',
               'tools/translation/source-profiles/shared-f64-receiver-evolution']:
    paths.update(p for p in Path(parent).iterdir() if p.is_file())
paths.update(Path(p) for p in [
    'tools/translation/extensions/host-contracts.mjs',
    'tools/translation/extensions/pattern-control.mjs',
    'tools/translation/extensions/shared-f64-method-source.mjs',
    'tools/translation/extensions/shared-f64-method-prelude.mjs',
    'tools/translation/extensions/joint-shared-reference-type.mjs',
    'tools/translation/prepare-shared-f64-method-receivers.mjs',
    'tools/translation/test/shared-f64-method-receivers.test.mjs',
    'tools/translation/test/primitive-float.test.mjs',
    'tools/translation/test/json-source-f64-borrows.test.mjs',
    'tools/translation/test/primitive-borrow-preservation.test.mjs',
    'tools/translation/test/standard-option-filter.test.mjs',
    'tools/translation/test/standard-option-move-regressions.test.mjs',
    'rust/tests/json_shared_f64_translation_test.rs',
    'experiments/issue-784/capture-f64-method-reference.py',
    'experiments/issue-784/capture-f64-prelude-source.py',
    'experiments/issue-784/capture-shared-f64-receiver-evolution.py',
    'experiments/issue-784/capture-shared-f64-source-proposal.mjs',
    'experiments/issue-784/probe-joint-reference-compatibility.py',
    str(Path(__file__).relative_to(root)),
])
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
record = dict(schema='complete-shared-f64-receiving-archive-v1',
              sourcePredecessor='e88183bb894b9ea62c9d6ae170c3fc099047685b',
              evidenceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, completeMemberReadbackVerified=True, nodeAudits=audits,
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
