"""Retain terminal deadline reports, verifying every selected artifact in full.

Containers are verified in memory. Gzip members retain complete decoded payloads;
equal complete reports use TAR hard links. Source vectors and ZIP/gzip wrappers
are not retained. The original whole job logs are collected separately.
"""
import gzip
import hashlib
import io
import json
import lzma
from pathlib import Path
import subprocess
import tarfile
import zipfile

base = Path('ci-logs/issue-784-restart-2')
snapshot = base / 'checkpoint0e234-terminal-feedback-16.json.gz'
feedback = json.loads(gzip.decompress(snapshot.read_bytes()))
all_artifacts = [row for page in feedback['artifacts'] for row in page['artifacts']]
artifacts = [row for row in all_artifacts if row['name'].startswith('node-case-deadlines-')]
head = '0e2341ac9505744e993bda69587b5777c1594849'
assert len(artifacts) == len({row['id'] for row in artifacts}) == 40
target = base / 'checkpoint0e234-terminal-deadline-reports.tar.xz'
receipt = base / 'checkpoint0e234-terminal-deadline-reports.json.gz'
assert not target.exists() and not receipt.exists()
roots = ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
         'js/node_modules/.node-case-deadlines']
used = sum(p.stat().st_size for root in roots for p in Path(root).rglob('*')
           if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
maximum = 499_000_000 - used
assert maximum > 5_000_000
members, records, first = [], [], {}
with lzma.open(target, 'xb', preset=1) as compressed:
    with tarfile.open(fileobj=compressed, mode='w|') as output:
        for artifact in artifacts:
            identity = artifact['id']
            assert artifact['workflow_run']['head_sha'] == head
            assert artifact['workflow_run']['id'] == 42946760026
            assert not artifact['expired'] and artifact['size_in_bytes'] < 64_000_000
            command = ['gh', 'api', 'repos/link-assistant/router/actions/artifacts/'
                       + str(identity) + '/zip']
            with (base / ('terminal-report-artifact-' + str(identity) + '.stderr')).open('xb') as errors:
                child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors)
                raw = child.stdout.read(64_000_001)
                assert len(raw) < 64_000_001
                assert not child.stdout.read(1)
                child.stdout.close()
                assert child.wait() == 0
            digest = hashlib.sha256(raw).hexdigest()
            assert len(raw) == artifact['size_in_bytes']
            assert artifact['digest'] == 'sha256:' + digest
            record = dict(metadata=artifact, command=command, zipBytes=len(raw),
                          zipSha256=digest, originalZipContainerRetained=False,
                          completeMemberBytesRetained=False, members=[])
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                assert len(archive.infolist()) < 8192
                assert sum(row.file_size for row in archive.infolist()) < 128_000_000
                names = set()
                for member in archive.infolist():
                    assert not member.is_dir() and member.filename not in names
                    names.add(member.filename)
                    body = archive.read(member)  # Complete read also checks original CRC.
                    assert len(body) == member.file_size
                    original_sha = hashlib.sha256(body).hexdigest()
                    original_bytes = len(body)
                    if member.filename.endswith('.gz'):
                        with gzip.GzipFile(fileobj=io.BytesIO(body)) as source:
                            body = source.read(128_000_001)
                            assert len(body) < 128_000_001 and not source.read(1)
                    sha = hashlib.sha256(body).hexdigest()
                    name = str(identity) + '/' + str(len(record['members']))
                    retained = member.filename.endswith(('case-deadlines.json',
                        'resource.json', 'bun-receipt.json', 'terminal.json', 'run.json'))
                    row = dict(path=member.filename, storedAs=name if retained else None,
                               bytes=len(body), sha256=sha, crc=member.CRC,
                               originalBytes=original_bytes, originalSha256=original_sha,
                               gzipWrapperRetained=not member.filename.endswith('.gz'),
                               completePayloadRetained=retained)
                    record['members'].append(row)
                    if not retained:
                        continue
                    info = tarfile.TarInfo(name)
                    info.mode = 0o644
                    key = (len(body), sha)
                    if key in first:
                        info.type, info.linkname = tarfile.LNKTYPE, first[key]
                        output.addfile(info)
                    else:
                        first[key] = name
                        info.size = len(body)
                        output.addfile(info, io.BytesIO(body))
                    row['hardLink'] = info.linkname or None
                    members.append(row)
                    assert target.stat().st_size < maximum
            record['completeMemberReadbackAndCrcVerified'] = True
            records.append(record)
            print(json.dumps(dict(artifact=identity, members=len(record['members']),
                                  storedBytes=target.stat().st_size)), flush=True)
assert target.stat().st_size < maximum
expected = {row['storedAs']: row for row in members}
seen, originals = set(), {}
with tarfile.open(target, 'r|xz') as archive:
    for member in archive:
        assert member.name in expected and member.name not in seen
        row = expected[member.name]
        if member.islnk():
            assert member.linkname == row['hardLink']
            actual = originals[member.linkname]
        else:
            assert member.isfile() and member.size == row['bytes']
            actual = (member.size, hashlib.file_digest(
                archive.extractfile(member), 'sha256').hexdigest())
            originals[member.name] = actual
        assert actual == (row['bytes'], row['sha256'])
        seen.add(member.name)
assert seen == set(expected)
with target.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
result = dict(schema='terminal-artifact-complete-deadline-report-custody-v1',
              runId=42946760026, headSha=head, snapshot=str(snapshot),
              archive=str(target), bytes=target.stat().st_size, sha256=digest,
              records=records, completeArtifactSetCollected=False,
              excludedArtifacts=[row for row in all_artifacts if row not in artifacts],
              completeMemberReadbackAndCrcVerified=True, uniqueMembers=len(first),
              originalZipContainersRetained=False, originalGzipWrappersRetained=False,
              completeDecodedPayloadsRetained=False, completeDeadlineReportsRetained=True,
              artifactInstalled=False,
              runtimeParity=False, semanticAuthority=False, rustExecuted=False)
raw = json.dumps(result, separators=(',', ':')).encode()
with receipt.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(receipt=str(receipt), archive=str(target),
                      bytes=result['bytes'], sha256=digest,
                      members=len(members), uniqueMembers=len(first))))
