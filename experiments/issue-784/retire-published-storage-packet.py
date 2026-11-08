"""Retire one inactive local archive whose exact full stream remains published."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

choices = {
    (): ('storage-ci-complete', 'storage-ci', 33132484, 395),
    ('--token-ci',): ('token-ci-complete', 'token-ci', 21418296, 205),
    ('--resolver',): ('resolver-complete', 'resolver', 25575912, 251),
    ('--restart',): ('restart-complete', 'restart', 21592036, 361),
    ('--project-retention',): ('project-retention-complete', 'project-retention', 21279876, 429),
}
if tuple(sys.argv[1:]) not in choices:
    raise RuntimeError('Only the five reviewed inactive task archives are selectable')
stem, metadata_stem, expected_size, expected_members = choices[tuple(sys.argv[1:])]
relative = 'docs/case-studies/issue-784/evidence/' + stem + '.tar.xz'
path = Path(relative)
head = '4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2'
metadata_path = Path('ci-logs/issue-784-restart-2/current-published-' + metadata_stem + '-archive-metadata.json')
metadata = json.loads(metadata_path.read_bytes())
original = json.loads(gzip.decompress(path.with_name(stem + '.json.gz').read_bytes()))
assert metadata['path'] == relative and metadata['size'] == original['archiveBytes'] == expected_size
assert original['allDecodedOriginalsVerified'] and original['completeMembers'] == expected_members
state = path.lstat()
assert state.st_uid == os.getuid() and state.st_nlink == 1 and stat.S_ISREG(state.st_mode)
with path.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
assert digest == original['archiveSha256']
blob = subprocess.check_output(['git', 'rev-parse', head + ':' + relative], text=True).strip()
assert blob == metadata['sha']
process = subprocess.Popen(['git', 'cat-file', 'blob', blob], stdout=subprocess.PIPE)
with process.stdout as source:
    retained = hashlib.file_digest(source, 'sha256').hexdigest()
assert process.wait() == 0 and retained == digest

def inactive():
    selected = str(path.resolve())
    for entry in Path('/proc').iterdir():
        if not entry.name.isdecimal():
            continue
        try:
            for fd in (entry / 'fd').iterdir():
                try:
                    assert os.readlink(fd) != selected
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (entry / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] != selected
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass

inactive()
after = path.lstat()
assert (state.st_dev, state.st_ino, state.st_mode, state.st_uid, state.st_nlink,
        state.st_size, state.st_mtime_ns, state.st_ctime_ns) == (
        after.st_dev, after.st_ino, after.st_mode, after.st_uid, after.st_nlink,
        after.st_size, after.st_mtime_ns, after.st_ctime_ns)
record = {'schema': 'complete-published-storage-packet-local-retirement-v1',
          'path': relative, 'bytes': state.st_size, 'sha256': digest,
          'publishedCommit': head, 'gitBlob': blob, 'remoteMetadata': metadata,
          'permanentUrl': metadata['html_url'] + '?raw=true',
          'completeOriginalCompressedStreamRetained': True,
          'completePublishedGitBlobVerified': True, 'originalMembers': expected_members,
          'logicalBytesReclaimed': state.st_size,
          'allocatedBytesReclaimed': state.st_blocks * 512,
          'scope': 'One inactive task archive. Exact original compressed bytes remain in published Git history.',
          'semanticAuthority': False, 'runtimeParity': False, 'rustExecuted': False}
target = path.with_name(stem + '-local-retirement.json.gz')
raw = json.dumps(record, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
inactive()
path.unlink()
print(json.dumps(record))
