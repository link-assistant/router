"""Verify the terminal 939 cycle and move complete evidence without copies."""
from collections import Counter
import gzip
import hashlib
import itertools
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/ci-939')
head = '93995ee40be4b570becbe0b788dba58f5bd0ea6f'
merge = 'b0ea6ee80521788e7cba7f47488034c40f5a85e4'
snapshot = json.loads(gzip.decompress((base / 'checkpoint939-late-collection-2.json.gz').read_bytes()))
run = snapshot['run']
assert run['head_sha'] == head and run['id'] == 42879038865
assert run['status'] == 'completed' and run['conclusion'] == 'failure'
jobs = [row for page in snapshot['jobPages'] for row in page['jobs']]
assert len(jobs) == 59 and all(row['status'] == 'completed' for row in jobs)
assert Counter(row['conclusion'] for row in jobs) == dict(failure=17, cancelled=6, success=11, skipped=25)
nonpassing = {row['id'] for row in jobs if row['conclusion'] not in ['success', 'skipped']}
assert len(nonpassing) == 23 and {row['job']['id'] for row in snapshot['records']} == nonpassing
workflows = json.loads((base / 'checkpoint-939-all-workflows-terminal.json').read_bytes())
assert workflows['total_count'] == len(workflows['workflow_runs']) == 3
assert all(row['head_sha'] == head and row['status'] == 'completed' for row in workflows['workflow_runs'])
logs = []
for row in snapshot['records']:
    assert row['validJobLog'] and row['downloadExitCode'] == 0
    digest, length, lines = hashlib.sha256(), 0, []
    with gzip.open(row['log'], 'rb') as source:
        while block := source.read(65536):
            digest.update(block)
            length += len(block)
    assert length == row['decodedBytes'] and digest.hexdigest() == row['sha256']
    # Read the complete original stream in chunks of at most 1500 lines.
    with gzip.open(row['log'], 'rt', encoding='utf8', errors='strict') as source:
        while chunk := list(itertools.islice(source, 1500)):
            lines.extend(line.rstrip('\n') for line in chunk)
    failures, contexts = [], []
    for at, line in enumerate(lines):
        if re.search(r'\bnot ok \d+ - ', line):
            end = at + 1
            while end < len(lines) and not re.search(r'Z   \.\.\.$', lines[end]):
                end += 1
            failures.append(dict(line=at + 1, completeBlock=lines[at:min(end + 1, len(lines))]))
        if any(marker in line for marker in ['##[error]', 'Strict native parity failed',
                'Observed ', 'Stale ', 'exceeds its original', 'original child deadline',
                'Command failed:', 'missing genuine', 'Missing generated']):
            contexts.append(dict(line=at + 1, firstLine=max(0, at - 5) + 1,
                                 completeContext=lines[max(0, at - 5):min(len(lines), at + 18)]))
    logs.append(dict(job=row['job'], originalPath=row['log'], decodedBytes=length,
        sha256=row['sha256'], completeLines=len(lines), completeReadbackVerified=True,
        failureBlocks=failures, errorContexts=contexts))

metadata = json.loads((base / 'checkpoint-939-artifacts-terminal.json').read_bytes())
assert metadata['total_count'] == len(metadata['artifacts']) == 26
artifact_rows = []
for artifact in metadata['artifacts']:
    receipt = base / ('checkpoint939-artifact-' + str(artifact['id']) + '.json')
    custody = json.loads(receipt.read_bytes())
    assert custody['metadata'] == artifact and custody['completeReadbackAndCrcVerified']
    assert merge in artifact['name'] and not artifact['expired']
    path = Path(custody['file'])
    with path.open('rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == custody['sha256']
    expected = {member['path']: member for member in custody['members']}
    with zipfile.ZipFile(path) as archive:
        assert len(archive.infolist()) == len(expected) and set(archive.namelist()) == set(expected)
        for member in archive.infolist():
            count, digest = 0, hashlib.sha256()
            with archive.open(member) as source:
                while block := source.read(65536):
                    count += len(block)
                    digest.update(block)
            old = expected[member.filename]
            assert count == old['bytes'] and digest.hexdigest() == old['sha256']
            assert member.CRC == old['crc']
    artifact_rows.append(dict(metadata=artifact, originalPath=str(path), sha256=custody['sha256'],
        completeMembers=len(expected), allOriginalMembersReopenedAndVerified=True))
canonical = json.loads(gzip.decompress((base / 'checkpoint939-complete-canonical-custody-review.json.gz').read_bytes()))
assert canonical['publishedHead'] == head and canonical['completeNestedMemberCount'] == 2873
assert canonical['completeCrcSha256CensusUtf8AndInventoryReadback']
assert canonical['completeBytes'] == 320408059
assert not any(canonical[key] for key in ['allCurrentOutputsEqual', 'allCurrentInputPinsEqual',
    'outputsInstalled', 'semanticAuthority', 'sourceAuthority', 'runtimeParity', 'fullGatePassed', 'rustExecuted'])
review = dict(schema='complete-terminal-ci-939-review-v1', publishedHead=head,
    testedMergeSha=merge, run=run, jobs=jobs, workflows=workflows, logs=logs,
    artifacts=artifact_rows, completeCycleCollected=True,
    canonicalNestedCustodyReview='checkpoint939-complete-canonical-custody-review.json.gz',
    canonicalInstalled=False, freshOriginalProducerPassed=False,
    originalDeadlinesPreserved=True, allRequiredChecksPassed=False,
    runtimeParity=False, rustExecuted=False)
review_path = base / 'checkpoint939-terminal-current-failure-review.json.gz'
with review_path.open('xb') as output:
    output.write(gzip.compress(json.dumps(review, separators=(',', ':')).encode(), mtime=0))
assert json.loads(gzip.decompress(review_path.read_bytes())) == review

paths = sorted({*base.glob('checkpoint939*'), *base.glob('checkpoint-939-*'),
    *base.glob('current-939-*-refresh.json')})
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
assert 100 <= len(paths) <= 512 and not target.exists()
selected = {str(path.resolve()) for path in paths}


def inactive():
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            if any(line.startswith('State:\tZ') for line in (process / 'status').read_text().splitlines()):
                continue
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in selected
            for descriptor in (process / 'fd').iterdir():
                try:
                    assert os.readlink(descriptor) not in selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except PermissionError:
            if process.stat().st_uid == os.getuid():
                raise
        except (FileNotFoundError, ProcessLookupError):
            pass


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


inactive()
members = []
for path in paths:
    state = path.lstat()
    assert str(path) not in tracked and stat.S_ISREG(state.st_mode)
    assert state.st_uid == os.getuid() and state.st_nlink == 1
    members.append(dict(originalPath=str(path), storedAs=path.name, bytes=state.st_size,
        sha256=digest(path), identity=[state.st_dev, state.st_ino, state.st_size,
                                     state.st_mtime_ns, state.st_ctime_ns]))
assert len({row['storedAs'] for row in members}) == len(members)
before = 0
for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
               'js/node_modules/.node-case-deadlines']:
    for directory, directories, files in os.walk(folder):
        directories[:] = [name for name in directories if name not in ['toolchain', '__pycache__']]
        before += sum(Path(directory, name).stat().st_size for name in files)
record = dict(schema='complete-ci-939-moved-original-custody-v1', headSha=head,
    runId=42879038865, testedMergeSha=merge, members=members,
    sourcePathMapping='Original receipts retain original paths; storedAs selects this directory.',
    nonpassingCompleteLogs=23, completeArtifacts=26,
    retentionHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    entireCycleTerminal=True, allAvailableNonpassingLogsAndArtifactsRetainedWhole=True,
    canonicalNestedCustodyReadbackPassed=True, canonicalInstalled=False,
    independentSemanticReviewPassed=False, freshOriginalProducerPassed=False,
    originalDeadlinesPreserved=True, allRequiredChecksPassed=False,
    runtimeParity=False, rustExecuted=False)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
assert before + len(packed) < 500_000_000
inactive()
target.mkdir()
for path, row in zip(paths, members, strict=True):
    state = path.lstat()
    assert row['identity'] == [state.st_dev, state.st_ino, state.st_size,
                               state.st_mtime_ns, state.st_ctime_ns]
    destination = target / row['storedAs']
    path.rename(destination)
    assert destination.stat().st_size == row['bytes'] and digest(destination) == row['sha256']
with (target / 'manifest.json.gz').open('xb') as output:
    output.write(packed)
assert gzip.decompress((target / 'manifest.json.gz').read_bytes()) == raw
print(json.dumps(dict(directory=str(target), completeMembers=len(members),
    originalBytes=sum(row['bytes'] for row in members), completeReadbackVerified=True,
    nonpassingCompleteLogs=23, completeArtifacts=26, evidenceBytesAfter=before + len(packed))))
