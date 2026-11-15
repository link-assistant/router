"""Archive complete closed registration observations and older task audits."""
import argparse
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path
import re
import stat
import subprocess
import tarfile

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', default='f05961a5c0426b27327f2d362d6f17f850368f44')
parser.add_argument('--archive-stem', default='isolated-refresh-20261110')
parser.add_argument('--prefix', action='append')
parser.add_argument('--node-log')
parser.add_argument('--bun-log', action='append')
parser.add_argument('--registered-bun-review')
args = parser.parse_args()
assert re.fullmatch('[a-f0-9]{40}', args.baseline)
assert re.fullmatch('[-a-z0-9]{1,80}', args.archive_stem)
prefixes = args.prefix or ['current-f059-']
assert all(re.fullmatch('[-a-z0-9]{1,80}', value) for value in prefixes)
archive = Path('docs/case-studies/issue-784/evidence') / (args.archive_stem + '.tar.xz')
receipt = archive.with_name(args.archive_stem + '.json.gz')
baseline = args.baseline
assert subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip() == baseline
assert not archive.exists() and not receipt.exists()
retire = {p for p in base.iterdir() if p.is_file() and p.name.startswith(tuple(prefixes))}
attempts = sorted(Path('js/node_modules/.node-case-deadlines').glob('complete-*'))
assert 1 <= len(attempts) <= 64
for attempt in attempts:
    terminal = json.loads((attempt / 'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
    retire.update(p for p in attempt.iterdir() if p.is_file())
if args.node_log:
    node_log = (base / args.node_log).read_text()
    matches = re.findall(r'^Complete Node deadline evidence: (.+)$', node_log, re.M)
    assert len(matches) == 1
    audit_root = Path(matches[0]).resolve()
    assert audit_root in [p.resolve() for p in attempts]
else:
    audit_root = Path('js/node_modules/.node-case-deadlines/complete-MYF8Op')
terminal = json.loads((audit_root / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0
audit = json.loads((audit_root / 'case-deadlines.json').read_bytes())
expected_cases = 27 if args.registered_bun_review else 16
assert audit['passed'] and audit['observedCompletedCases'] == expected_cases
assert audit['originalFailedCompletionEvents'] == 0
assert not audit['errors'] and not audit['durationBreaches']
for row in audit['sourceRecords']:
    assert hashlib.sha256(Path(row['path']).read_bytes()).hexdigest() == row['sha256']
bun = []
if args.registered_bun_review:
    assert '/' not in args.registered_bun_review and not args.bun_log
    review = json.loads((base / args.registered_bun_review).read_bytes())
    assert review['schema'] == 'complete-integrated-registration-bun-receiving-v1'
    assert not review['originalLimitsChanged']
    assert Path(review['nodeEvidence']).resolve() == audit_root
    assert len(review['results']) == 4
    assert {row['file'] for row in review['results']} == {
        'tools/translation/test/' + name + '.test.mjs' for name in
        ['bulk-draft-custody', 'translation-progress', 'isolated-project-batch', 'portable-git-fixtures']}
    assert all(not row['unobservedCases'] and not row['resource']['stopped'] for row in review['results'])
    bun = [case for row in review['results'] for case in row['cases']]
    assert len(bun) == expected_cases
    bun_logs = []
else:
    bun_logs = args.bun_log or ['current-f059-' + name + '-bun-1.log' for name in ['isolated', 'portable']]
assert args.registered_bun_review or len(bun_logs) in [1, 2]
for name in bun_logs:
    text = (base / name).read_text()
    rows = re.findall(r'^\(pass\) (.+) \[([0-9.]+)ms\]$', text, re.M)
    expected = 16 // len(bun_logs)
    assert len(rows) == expected and re.search(r'\n ' + str(expected) + r' pass\n 0 fail\n', text)
    for name, duration in rows:
        original = [row for row in audit['records'] if row['name'] == name]
        assert len(original) == 1
        assert float(duration) + 0.01 <= original[0]['deadline']['milliseconds']
        bun.append(dict(name=name, milliseconds=float(duration), precisionMs=0.01,
                        originalDeadlineMs=original[0]['deadline']['milliseconds']))
sources = set()
for command in [['git', 'diff', '--name-only', baseline],
                ['git', 'ls-files', '--others', '--exclude-standard']]:
    sources.update(Path(p) for p in subprocess.check_output(command).decode().splitlines()
                   if p.startswith(('tools/translation/', 'experiments/issue-784/')))
paths = sorted(retire | sources)
assert 1 <= len(paths) <= 512
assert sum(p.stat().st_size for p in paths) <= 64 * 1024 * 1024


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = path.lstat()
    assert stat.S_ISREG(value.st_mode) and value.st_uid == os.getuid() and value.st_nlink == 1
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size,
            value.st_mtime_ns, value.st_ctime_ns)


rows = [dict(path=str(p), bytes=p.stat().st_size, sha256=digest(p),
             identity=identity(p), retire=p in retire) for p in paths]
selected = {str((root / p).resolve()) for p in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                assert os.readlink(descriptor).removesuffix(' (deleted)') not in selected
            except (FileNotFoundError, ProcessLookupError, PermissionError):
                pass
    for p, row in zip(paths, rows):
        assert identity(p) == row['identity'] and digest(p) == row['sha256']


def allocation():
    roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
             Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
    return sum(p.stat().st_size for folder in roots for p in folder.rglob('*')
               if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)


inactive()
before = allocation()
maximum = min(6 * 1024 * 1024, 499_000_000 - before)
assert maximum > 1_000_000


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, value):
        assert self.bytes + len(value) <= maximum
        count = self.stream.write(value)
        self.bytes += count
        return count

    def flush(self):
        self.stream.flush()


with archive.open('xb') as target:
    with lzma.LZMAFile(BoundedOutput(target), mode='wb', preset=3) as packed:
        with tarfile.open(fileobj=packed, mode='w|') as output:
            for p in paths:
                output.add(p, arcname=str(p), recursive=False)
            for p in sorted(sources):
                exists = subprocess.run(['git', 'cat-file', '-e', baseline + ':' + str(p)],
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if exists.returncode:
                    continue
                raw = subprocess.check_output(['git', 'show', baseline + ':' + str(p)])
                name = 'git-sources/' + baseline + '/' + str(p)
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                output.addfile(member, io.BytesIO(raw))
                rows.append(dict(path=name, bytes=len(raw),
                                 sha256=hashlib.sha256(raw).hexdigest(), retire=False))
by_path, seen = {row['path']: row for row in rows}, set()
with tarfile.open(archive, 'r|xz') as source:
    for member in source:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(source.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
bun_passed = (sum(row['state'] == 'pass' and not row['durationBreach'] for row in bun)
              if args.registered_bun_review else 16)
record = dict(schema='complete-isolated-refresh-receiving-v1', baseline=baseline,
              archive=str(archive), bytes=archive.stat().st_size, sha256=digest(archive),
              members=rows, originalLimitsChanged=False, nodeCasesPassed=expected_cases,
              bunCasesPassed=bun_passed, bunCases=bun, sourceHead=baseline,
              receivingQualified=bun_passed == expected_cases,
              retiredAuditAttempts=len(attempts), olderFailuresRetained=True,
              fullGatePassed=False, productionExecutableGain=0,
              runtimeParity=False, rustExecuted=False, evidenceBytesBefore=before)
raw = json.dumps(record).encode()
with receipt.open('xb') as target:
    with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
        packed.write(raw)
assert gzip.decompress(receipt.read_bytes()) == raw
assert allocation() < 500_000_000
inactive()
for p in retire:
    p.unlink()
for attempt in attempts:
    attempt.rmdir()
print(json.dumps(dict(archive=str(archive), bytes=archive.stat().st_size,
                      sha256=digest(archive), members=len(rows),
                      evidenceBytesAfter=allocation(), fullGatePassed=False)))
