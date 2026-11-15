"""Stream all bulk artifact payloads to bounded evidence without a ZIP duplicate."""
import gzip
import hashlib
import io
import json
import lzma
from pathlib import Path, PurePosixPath
import stat
import subprocess
import tarfile
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = json.loads((base / 'checkpoint-7e7-artifacts-terminal.json').read_bytes())
artifact = next(row for row in snapshot['artifacts'] if row['id'] == 13741729452)
assert artifact['workflow_run']['id'] == 42768550440
assert artifact['workflow_run']['head_sha'] == '7e7fb7a3c7c294092abf2e974af42dbc58fca6be'
assert '99fab06a0fca6ad6c98307c717790edaac0f831d' in artifact['name']
assert not artifact['expired'] and artifact['size_in_bytes'] < 64 * 1024 * 1024
target = base / 'checkpoint-7e7-bulk-complete-members.tar.xz'
receipt = base / 'checkpoint-7e7-bulk-complete-members.json.gz'
assert not target.exists() and not receipt.exists()


def allocation():
    return sum(p.stat().st_size for parent in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for p in Path(parent).rglob('*') if p.is_file() and not p.is_symlink()
               and 'toolchain' not in p.parts)


maximum = min(64 * 1024 * 1024, 498_000_000 - allocation())
assert maximum > 10_000_000
raw = io.BytesIO()
with (base / 'checkpoint-7e7-bulk-download-retry.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                              + str(artifact['id']) + '/zip'], stdout=subprocess.PIPE, stderr=errors)
    try:
        while block := child.stdout.read(65536):
            assert raw.tell() + len(block) <= 64 * 1024 * 1024
            raw.write(block)
        assert child.wait() == 0
    except BaseException:
        child.terminate()
        child.wait()
        raise
assert raw.tell() == artifact['size_in_bytes']
assert artifact['digest'] == 'sha256:' + hashlib.sha256(raw.getbuffer()).hexdigest()
raw.seek(0)


class BoundedOutput:
    def __init__(self, stream):
        self.stream, self.bytes = stream, 0

    def write(self, block):
        assert self.bytes + len(block) <= maximum
        result = self.stream.write(block)
        self.bytes += result
        return result

    def flush(self):
        self.stream.flush()


members = []
with zipfile.ZipFile(raw) as source:
    entries = source.infolist()
    metadata = dict(artifact=artifact, members=len(entries),
                    decodedBytes=sum(row.file_size for row in entries),
                    largestMemberBytes=max(row.file_size for row in entries),
                    originalZipDigestVerified=True)
    (base / 'checkpoint-7e7-bulk-complete-directory.json').write_text(json.dumps(metadata))
    print(json.dumps(metadata), flush=True)
    assert len(entries) < 8192 and len({row.filename for row in entries}) == len(entries)
    assert metadata['decodedBytes'] < 512 * 1024 * 1024
    assert metadata['largestMemberBytes'] < 128 * 1024 * 1024
    with target.open('xb') as output:
        with lzma.LZMAFile(BoundedOutput(output), 'wb', preset=6) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|') as packed:
                for entry in entries:
                    name = PurePosixPath(entry.filename)
                    assert not name.is_absolute() and '..' not in name.parts and '\\' not in entry.filename
                    assert not entry.is_dir() and not stat.S_ISLNK(entry.external_attr >> 16)
                    with source.open(entry) as stream:
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                    member = tarfile.TarInfo(entry.filename)
                    member.size = entry.file_size
                    with source.open(entry) as stream:
                        packed.addfile(member, stream)
                    members.append(dict(path=entry.filename, bytes=entry.file_size,
                                        sha256=digest, crc=entry.CRC))
                    print(json.dumps(dict(member=entry.filename, bytes=entry.file_size)), flush=True)
raw.close()
seen, by_path = set(), {row['path']: row for row in members}
with tarfile.open(target, 'r|xz') as packed:
    for member in packed:
        assert member.isfile() and member.name in by_path and member.name not in seen
        row = by_path[member.name]
        assert member.size == row['bytes']
        assert hashlib.file_digest(packed.extractfile(member), 'sha256').hexdigest() == row['sha256']
        seen.add(member.name)
assert seen == set(by_path)
with target.open('rb') as stream:
    digest = hashlib.file_digest(stream, 'sha256').hexdigest()
record = dict(schema='complete-current-ci-bulk-members-v1', metadata=metadata,
              archive=str(target), bytes=target.stat().st_size, sha256=digest, members=members,
              originalZipContainerBytesRetained=False, completeOriginalMemberBytesRetained=True,
              everyOriginalCrcVerified=True, completeMemberReadbackVerified=True)
data = json.dumps(record).encode()
with receipt.open('xb') as stream:
    stream.write(gzip.compress(data, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == data and allocation() < 500_000_000
print(json.dumps(dict(archive=str(target), bytes=target.stat().st_size,
                      sha256=digest, members=len(members), evidenceBytes=allocation())))
