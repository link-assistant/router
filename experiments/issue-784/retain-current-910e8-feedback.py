"""Transfer complete terminal feedback without duplicating original containers."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat

base = Path('ci-logs/issue-784-restart-2')
folder = Path('docs/case-studies/issue-784/evidence/ci-910e8dad')
head = '910e8dadfbf3f92490f2db19ed47c39d98af7077'
snapshot = json.loads((base / 'current-910e8-ci-run-12.json').read_bytes())
logs = json.loads((base / 'current-910e8-completed-log-snapshot-12.json').read_bytes())
artifacts = json.loads((base / 'current-910e8-terminal-artifact-verification.json').read_bytes())
archive = json.loads((base / 'current-910e8-terminal-whole-run-verification.json').read_bytes())
workflows = [row for page in json.loads((base / 'current-910e8-all-runs-12.json').read_bytes()) for row in page['workflow_runs']]
assert snapshot['headSha'] == head and snapshot['status'] == 'completed'
assert len(snapshot['jobs']) == 59 and len(workflows) == 7
assert all(row['status'] == 'completed' and row['head_sha'] == head for row in workflows)
assert len(logs['records']) == 22 and sum(row['validJobLog'] for row in logs['records']) == 21
assert [row['job']['databaseId'] for row in logs['records'] if not row['validJobLog']] == [128924361849]
assert len(artifacts['records']) == 24 and all(row['completeReadbackAndCrcVerified'] for row in artifacts['records'])
assert archive['wholeArchiveVerified'] and len(archive['members']) == 186
assert not any(' _ translation (4)' in row['path'] for row in archive['members'])
merge = json.loads((base / 'current-910e8-tested-merge-final.json').read_bytes())
published = json.loads((base / 'current-published-910e8-git-commit.json').read_bytes())
assert merge['tree']['sha'] == published['tree']['sha']
paths = sorted(path for path in base.glob('current-910e8-*')
               if path.name != 'current-910e8-feedback-retention.log')
assert 100 <= len(paths) <= 240 and not folder.exists()
states, originals = {}, []
for path in paths:
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    states[path] = state
    originals.append(dict(originalPath=str(path), retainedPath=str(folder / path.name),
                          bytes=state.st_size, sha256=digest))
by_path = {row['originalPath']: row for row in originals}
for row in artifacts['records']:
    assert by_path[row['file']]['sha256'] == row['sha256']
for row in logs['records']:
    with gzip.open(row['log'], 'rb') as source:
        assert hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
spec = importlib.util.spec_from_file_location('completed_pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
active, unreadable = pages.active_paths(Path.cwd().resolve())
assert not {str(path.resolve()) for path in paths}.intersection(active)
folder.mkdir()
for row in originals:
    path, target = Path(row['originalPath']), Path(row['retainedPath'])
    state, current = states[path], path.lstat()
    for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
        assert getattr(state, field) == getattr(current, field)
    path.rename(target)
    with target.open('rb') as source:
        assert target.stat().st_size == row['bytes'] and hashlib.file_digest(source, 'sha256').hexdigest() == row['sha256']
record = dict(schema='complete-current-terminal-feedback-custody-v1', publishedHead=head,
              testedMerge=merge['sha'], testedTreeEqualsPublishedTree=True, publishedCommit=published, testedCommit=merge,
              originalWorkflows=7, originalJobs=59, nonpassingJobResponses=22,
              completeNonpassingJobLogs=21, completeArtifacts=24, completeWholeArchiveMembers=186,
              originalDeadlineAuditMembers=21, originals=originals,
              missingWholeJobLog=128924361849, completeLogCollection=False,
              secondJobEndpointAttemptFailed=True, wholeArchiveAlsoMissingExactJob=True,
              foreignUnreadableProcesses=unreadable, allOriginalBytesVerified=True,
              runtimeParity=False, rustExecuted=False)
target = folder / 'manifest.json'
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(raw)
assert target.read_bytes() == raw
print(json.dumps({key: value for key, value in record.items() if key != 'originals'}))
