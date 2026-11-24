"""Retain all closed lock diagnostic attempts and their complete Node audits."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-file-lock-trace-v2.tar.gz')
receipt = target.with_name('current-file-lock-trace-v2.json.gz')
assert not target.exists() and not receipt.exists()
sources = [Path(name) for name in [
    'js/src/file-lock.mjs', 'js/test/native-storage.test.mjs',
    'ts/src/file-lock.ts', 'tools/translation/js-to-rust/generated/native-typescript/manifest.json',
    'tools/translation/js-to-rust/generated/native-typescript/src/file-lock.mjs.meta.json',
    'experiments/issue-784/file-lock-trace-before-scalar.mjs',
    'experiments/issue-784/retain-file-lock-trace-evidence.py',
    'experiments/issue-784/retain-file-lock-trace-evidence-initial.py',
    'docs/case-studies/issue-784/evidence/current-file-lock-trace.tar.gz',
    'docs/case-studies/issue-784/evidence/current-file-lock-trace.json.gz',
    'ci-logs/issue-784-restart-2/current-lock-trace-retention.log',
]]
selected = set(sources)
selected.update(path for path in base.iterdir() if path.is_file()
                and not path.name.startswith('current-lock-trace-retention')
                and path.name.startswith((
                    'current-lock-trace-', 'current-bun-native-full-lock-trace',
                    'current-bun-persistence-lock-trace')))
for path in list(selected):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            directory = Path(name).resolve().relative_to(root)
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            selected.update(path for path in directory.iterdir() if path.is_file())


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def identity(path):
    state = path.stat()
    return [state.st_dev, state.st_ino, state.st_size, state.st_mtime_ns, state.st_ctime_ns]


rows = [dict(path=str(path), bytes=path.stat().st_size, sha256=digest(path), identity=identity(path))
        for path in sorted(selected)]
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
predecessor = subprocess.check_output(['git', 'show', head + ':js/src/file-lock.mjs'])
previous_name = 'baseline/' + head + '/js/src/file-lock.mjs'
with target.open('xb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w|') as archive:
            for row in rows:
                archive.add(row['path'], arcname=row['path'], recursive=False)
            member = tarfile.TarInfo(previous_name)
            member.size = len(predecessor)
            archive.addfile(member, io.BytesIO(predecessor))
expected = {row['path']: row for row in rows}
expected[previous_name] = dict(bytes=len(predecessor), sha256=hashlib.sha256(predecessor).hexdigest())
seen = set()
with tarfile.open(target, 'r|gz') as archive:
    for member in archive:
        assert member.isfile() and member.name in expected and member.name not in seen
        assert member.size == expected[member.name]['bytes']
        assert hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest() == expected[member.name]['sha256']
        seen.add(member.name)
assert seen == set(expected)
for row in rows:
    path = Path(row['path'])
    assert identity(path) == row['identity'] and digest(path) == row['sha256']
record = dict(schema='complete-file-lock-trace-evidence-v1', recordingHead=head,
              archive=str(target), bytes=target.stat().st_size, sha256=digest(target),
              members=rows, completeMemberReadbackVerified=True,
              nodeCases=17, nodeOriginalDeadlineAuditPassed=True, bunCases=17,
              scalarRegressionBeforeFailed=True, scalarRegressionAfterPassed=True,
              nativeGenerationBytes=11591744, nativeFreshnessChanged=0,
              strictTypeScriptFiles=167, typescriptVersion='5.9.3',
              nodeVersion='20.20.2', bunVersion='1.4.4',
              initialRetainerCapturedItsOpenStdout=True,
              initialPacketAndCompletedStdoutRetained=True,
              ciPersistenceTimeoutReproduced=False, fullGatePassed=False,
              runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(target), bytes=record['bytes'], sha256=record['sha256'], members=len(seen))))
