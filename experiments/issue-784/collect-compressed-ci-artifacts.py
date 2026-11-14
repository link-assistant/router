"""Retain complete immutable-head ZIP bytes without raw on-disk duplicates."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import tarfile
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
for name in ['snapshot', 'output', 'prefix', 'head', 'merge-head']:
    parser.add_argument('--' + name, required=True)
parser.add_argument('--run', type=int, required=True)
parser.add_argument('--retained-member-receipt')
args = parser.parse_args()
assert re.fullmatch(r'[0-9a-f]{40}', args.head)
assert re.fullmatch(r'[0-9a-f]{40}', args.merge_head)
assert re.fullmatch(r'[a-z0-9-]+', args.prefix)
assert '/' not in args.snapshot and '/' not in args.output
base = Path('ci-logs/issue-784-restart-2')
pages = json.loads((base / args.snapshot).read_bytes())
pages = pages if isinstance(pages, list) else [pages]
artifacts = [row for page in pages for row in page['artifacts']]
assert artifacts and len({row['id'] for row in artifacts}) == len(artifacts)
retained = None
if args.retained_member_receipt:
    assert '/' not in args.retained_member_receipt
    with gzip.open(base / args.retained_member_receipt, 'rb') as source:
        raw_receipt = source.read(4 * 1024 * 1024 + 1)
    assert len(raw_receipt) <= 4 * 1024 * 1024
    retained = json.loads(raw_receipt)
    assert retained['schema'] == 'complete-current-ci-bulk-members-v1'
    assert retained['completeOriginalMemberBytesRetained']
    assert retained['everyOriginalCrcVerified'] and retained['completeMemberReadbackVerified']


def allocation():
    return sum(path.stat().st_size for root in ['ci-logs', 'docs/case-studies/issue-784',
               'experiments/issue-784', 'js/node_modules/.node-case-deadlines']
               for path in Path(root).rglob('*') if path.is_file() and not path.is_symlink()
               and 'toolchain' not in path.parts)


records = []
for artifact in artifacts:
    assert not artifact['expired'] and artifact['size_in_bytes'] < 64 * 1024 * 1024
    assert artifact['workflow_run']['head_sha'] == args.head
    assert artifact['workflow_run']['id'] == args.run
    assert args.merge_head in artifact['name']
    if retained and retained['metadata']['artifact']['id'] == artifact['id']:
        assert retained['metadata']['artifact'] == artifact
        archive = Path(retained['archive'])
        assert archive.parent == base and archive.stat().st_size == retained['bytes']
        assert archive.stat().st_size <= 64 * 1024 * 1024
        with archive.open('rb') as source:
            assert hashlib.file_digest(source, 'sha256').hexdigest() == retained['sha256']
        expected = {row['path']: row for row in retained['members']}
        assert len(expected) == len(retained['members']) < 8192
        seen = set()
        with tarfile.open(archive, 'r|xz') as packed:
            for member in packed:
                assert member.isfile() and member.name in expected and member.name not in seen
                row = expected[member.name]
                assert member.size == row['bytes']
                assert hashlib.file_digest(packed.extractfile(member), 'sha256').hexdigest() == row['sha256']
                seen.add(member.name)
        assert seen == set(expected)
        records.append(dict(metadata=artifact, file=str(archive), sha256=retained['sha256'],
                            retainedBytes=retained['bytes'], members=retained['members'],
                            originalZipContainerBytesRetained=False,
                            completeReadbackAndCrcVerified=True))
        print(json.dumps(dict(artifact=artifact['id'], members=len(seen),
                              retainedBytes=retained['bytes'])), flush=True)
        continue
    path = base / (args.prefix + '-' + str(artifact['id']) + '.zip.gz')
    reused = path.exists()
    if not reused:
        maximum = min(64 * 1024 * 1024, 498_000_000 - allocation())
        assert maximum > 1_000_000
        with path.open('xb') as target, path.with_suffix('.stderr').open('xb') as errors:
            child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                                      + str(artifact['id']) + '/zip'],
                                     stdout=subprocess.PIPE, stderr=errors)
            length = 0
            try:
                with gzip.GzipFile(fileobj=target, mode='wb', mtime=0, compresslevel=6) as packed:
                    while block := child.stdout.read(65536):
                        length += len(block)
                        assert length <= 64 * 1024 * 1024
                        packed.write(block)
                        assert target.tell() < maximum
                assert child.wait() == 0
                assert length == artifact['size_in_bytes'] and target.tell() < maximum
            except BaseException:
                child.terminate()
                child.wait()
                raise
    # At most 64 MiB is retained in memory for ZIP random access. Each member
    # is streamed to EOF so zipfile verifies its original CRC as well as SHA.
    with gzip.open(path, 'rb') as source:
        raw = source.read(64 * 1024 * 1024 + 1)
        assert len(raw) == artifact['size_in_bytes'] and not source.read(1)
    digest = hashlib.sha256(raw).hexdigest()
    assert artifact['digest'] == 'sha256:' + digest
    members, seen = [], set()
    with zipfile.ZipFile(io.BytesIO(raw)) as packed:
        assert len(packed.infolist()) < 8192
        assert sum(row.file_size for row in packed.infolist()) < 128 * 1024 * 1024
        for member in packed.infolist():
            name = PurePosixPath(member.filename)
            assert not name.is_absolute() and '..' not in name.parts
            assert '\\' not in member.filename and member.filename not in seen
            assert not stat.S_ISLNK(member.external_attr >> 16)
            seen.add(member.filename)
            length, sha = 0, hashlib.sha256()
            with packed.open(member) as source:
                while block := source.read(65536):
                    length += len(block)
                    sha.update(block)
            assert length == member.file_size
            members.append(dict(path=member.filename, bytes=length,
                                sha256=sha.hexdigest(), crc=member.CRC))
    del raw
    assert allocation() < 500_000_000
    records.append(dict(metadata=artifact, file=str(path), sha256=digest, reused=reused,
                        retainedBytes=path.stat().st_size, members=members,
                        completeReadbackAndCrcVerified=True))
    print(json.dumps(dict(artifact=artifact['id'], members=len(members),
                          retainedBytes=path.stat().st_size)), flush=True)
with (base / args.output).open('x') as target:
    json.dump(dict(schema='complete-compressed-ci-artifacts-v1', headSha=args.head,
                   runId=args.run, records=records, completeArtifactSetCollected=True,
                   completeCycleCollected=False), target)
