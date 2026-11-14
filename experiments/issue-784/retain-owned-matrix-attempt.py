"""Retain one closed matrix attempt and remove only its verified source copies."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess

root = Path.cwd().resolve()
base = root / 'ci-logs/issue-784-restart-2'
stage = root / '.router-isolated-matrix-xlLges'
target = root / 'docs/case-studies/issue-784/evidence/owned-matrix-attempt-20261109.json.gz'
assert stage.parent == root and not stage.is_symlink() and not target.exists()
marker_path = stage / '.router-stage-owner.json'
marker_raw = marker_path.read_bytes()
marker = json.loads(marker_raw)
resource = json.loads((base / 'current-owned-matrix-producer-resource.json').read_bytes())
assert marker['schema'] == 'router-private-matrix-staging-owner-v1'
assert marker['pid'] == 1143458 and marker['pid'] in resource['stoppedOwnedProcessIds']
assert marker['sourceRoot'] == str(root) and marker['staging'] == str(stage)
assert marker['head'] == '19593b3a21ccf172db8d654d1cb550e0fd63e0e2'
assert marker['rustExecuted'] is False and resource['exitCode'] == 143 and resource['stopped']
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == marker['head']
for pid in [resource['pid'], *resource['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
git_dir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], text=True).strip()
assert (stage / '.git').read_text() == 'gitdir: ' + git_dir + '\n'
members = []
for path in sorted(stage.rglob('*')):
    info = path.lstat()
    assert info.st_uid == os.getuid() and not path.is_symlink()
    if stat.S_ISDIR(info.st_mode):
        continue
    assert stat.S_ISREG(info.st_mode) and info.st_nlink == 1
    relative = path.relative_to(stage)
    raw = path.read_bytes()
    if relative.as_posix() not in ['.git', '.router-stage-owner.json']:
        original = root / relative
        assert original.is_file() and not original.is_symlink()
        assert raw == original.read_bytes()
    members.append(dict(path=relative.as_posix(), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        allocatedBytes=info.st_blocks * 512,
                        inode=info.st_ino, device=info.st_dev))
assert len(members) == 870 and sum(row['bytes'] for row in members) == 10200365
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        for descriptor in (process / 'fd').iterdir():
            try:
                assert not os.readlink(descriptor).removesuffix(' (deleted)').startswith(str(stage) + '/')
            except (FileNotFoundError, ProcessLookupError):
                pass
    except (FileNotFoundError, ProcessLookupError, PermissionError):
        pass
observations = []
for prefix in ['current-owned-matrix-producer', 'current-owned-definition-producer-check']:
    for suffix in ['.log', '-resource.json', '-observer.log']:
        path = base / (prefix + suffix)
        raw = path.read_bytes()
        assert len(raw) < 1024 * 1024
        observations.append(dict(path=str(path.relative_to(root)), bytes=len(raw),
                                 sha256=hashlib.sha256(raw).hexdigest(), text=raw.decode('utf-8')))
record = dict(schema='closed-owned-matrix-attempt-v1', head=marker['head'],
              markerText=marker_raw.decode(), observations=observations,
              stagingSourceCopies=members, allSourceCopiesComparedToOriginals=True,
              matrixCompleted=False, completeGatePassed=False, rustExecuted=False,
              cleanup=dict(path=str(stage.relative_to(root)),
                           logicalBytes=sum(row['bytes'] for row in members),
                           allocatedFileBytes=sum(row['allocatedBytes'] for row in members),
                           allOwnedProcessesAbsent=True, noOpenStagingDescriptorsObserved=True,
                           policy='Remove only this closed attempt after complete retained receipt readback'))
encoded = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(target.read_bytes()) == encoded
for row in members:
    path = stage / row['path']
    info = path.lstat()
    assert (info.st_ino, info.st_dev, info.st_size) == (row['inode'], row['device'], row['bytes'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
shutil.rmtree(stage)
assert not stage.exists()
print(json.dumps(dict(receipt=str(target.relative_to(root)), bytes=target.stat().st_size,
                     sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                     cleanupCompleted=True, **record['cleanup'])))
