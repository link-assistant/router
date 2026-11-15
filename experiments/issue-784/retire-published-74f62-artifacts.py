"""Retire exact, immutable published CI ZIP working-tree copies."""
import argparse
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cycle', choices=['74f62', '3b197', '815527'], default='74f62')
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
write, cycle = args.write, args.cycle
head = {'74f62': '3b19785353c0a004efc62ab675a97b99c8a2e5a1',
        '3b197': '815527efb3db40ca7e650ba9aaae47bfa1529dab',
        '815527': '02bf28e5dd6ce7bb90f6a75cfabcb339b895b43a'}[cycle]
folder = Path('docs/case-studies/issue-784/evidence/ci-' + cycle)
tree = subprocess.check_output(['git', 'rev-parse', head + ':' + str(folder)], text=True).strip()
metadata_path = Path('ci-logs/issue-784-restart-2/current-published-' + cycle + '-artifact-tree.json.gz')
if not metadata_path.exists():
    with metadata_path.open('xb') as output:
        with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as packed:
            child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/git/trees/' + tree], stdout=subprocess.PIPE)
            while block := child.stdout.read(65536):
                packed.write(block)
            assert child.wait() == 0
metadata = json.loads(gzip.decompress(metadata_path.read_bytes()))
assert metadata['sha'] == tree and metadata['truncated'] is False
remote = {row['path']: row for row in metadata['tree']}
paths = sorted(folder.glob('current-' + cycle + '-artifact-*.zip'))
assert len(paths) == (26 if cycle == '815527' else 25)
rows, states = [], {}
for path in paths:
    row = remote[path.name]
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert row['type'] == 'blob' and state.st_size == row['size']
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    blob = subprocess.check_output(['git', 'rev-parse', head + ':' + str(path)], text=True).strip()
    assert blob == row['sha']
    child = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
    with child.stdout as source:
        published_digest = hashlib.file_digest(source, 'sha256').hexdigest()
    assert child.wait() == 0 and published_digest == digest
    states[path] = state
    rows.append(dict(path=str(path), bytes=state.st_size, sha256=digest, gitBlob=blob,
        allocatedBytes=state.st_blocks * 512,
        permanentUrl='https://github.com/link-assistant/router/blob/' + head + '/' + str(path) + '?raw=true'))
spec = importlib.util.spec_from_file_location('pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def inactive_and_unchanged():
    active, unreadable = pages.active_paths(Path.cwd().resolve())
    assert not {str(path.resolve()) for path in paths}.intersection(active)
    for path, before in states.items():
        current = path.lstat()
        for field in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
            assert getattr(current, field) == getattr(before, field)
    return unreadable


record = dict(schema='published-' + cycle + '-artifact-local-retirement-v1', publishedCommit=head,
    remoteDirectoryTree=tree, remoteMetadata=str(metadata_path),
    remoteMetadataSha256=hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
    foreignUnreadableProcesses=inactive_and_unchanged(), publishedOriginals=rows,
    completePublishedBlobsVerified=True, publishedFilesVerified=len(rows),
    logicalBytesReclaimed=sum(row['bytes'] for row in rows),
    allocatedBytesReclaimed=sum(row['allocatedBytes'] for row in rows),
    completeAvailableJobLogsRemainLocal=True, originalForwardFiveLogGapUnchanged=True,
    runtimeParity=False, fullGatePassed=False)
if write:
    target = Path('docs/case-studies/issue-784/evidence/ci-' + cycle + '-artifact-local-retirement.json.gz')
    raw = json.dumps(record, separators=(',', ':')).encode()
    with target.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    assert gzip.decompress(target.read_bytes()) == raw
    inactive_and_unchanged()
    for path in paths:
        path.unlink()
print(json.dumps(dict(write=write, verifiedPublishedFiles=len(rows),
    logicalBytesReclaimed=record['logicalBytesReclaimed'],
    allocatedBytesReclaimed=record['allocatedBytesReclaimed'])))
