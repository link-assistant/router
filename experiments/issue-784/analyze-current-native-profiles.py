"""Read complete historical profiles from immutable Git, without extracting copies."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

commit = '79f375ed1d9690ab8336e06a28331c2871092eb0'
receipt = json.loads(gzip.decompress(Path(
    'docs/case-studies/issue-784/evidence/native-reuse-receiving-20261109.json.gz'
).read_bytes()))
archive = subprocess.check_output(['git', 'show', commit + ':' + receipt['archive']])
assert len(archive) == receipt['bytes']
assert hashlib.sha256(archive).hexdigest() == receipt['sha256']
expected = {row['path']: row for row in receipt['members']}
selected = {}
verified = set()
with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as packet:
    for member in packet:
        assert member.isfile() and member.name in expected and member.name not in verified
        row = expected[member.name]
        assert member.size == row['bytes']
        raw = packet.extractfile(member).read()
        assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
        verified.add(member.name)
        if any(label in member.name for label in ['allocation-profile-1-', 'packing-profile-1-']):
            if member.name.endswith(('-cpu.json.gz', '-result.json.gz')):
                with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
                    decoded = stream.read(64 * 1024 * 1024 + 1)
                    assert len(decoded) <= 64 * 1024 * 1024 and not stream.read(1)
                selected[member.name] = (json.loads(decoded), decoded)
assert verified == set(expected)
result = []
for label in ['allocation', 'packing']:
    prefix = 'ci-logs/issue-784-restart-2/current-native-ts-' + label + '-profile-1-'
    profile, raw = selected[prefix + 'cpu.json.gz']
    measurement, _ = selected[prefix + 'result.json.gz']
    assert len(raw) == measurement['cpu']['bytes']
    assert hashlib.sha256(raw).hexdigest() == measurement['cpu']['sha256']
    nodes = {row['id']: row for row in profile['nodes']}
    parents = {}
    for row in nodes.values():
        for child in row.get('children', []):
            assert child in nodes and child not in parents
            parents[child] = row['id']
    assert len(parents) == len(nodes) - 1
    samples, deltas = profile['samples'], profile['timeDeltas']
    assert len(samples) == len(deltas)
    costs = {}
    for node, micros in zip(samples, deltas):
        assert node in nodes and type(micros) is int
        cursor, visited, frames = node, set(), set()
        while cursor is not None:
            assert cursor not in visited
            visited.add(cursor)
            frame = nodes[cursor]['callFrame']
            key = tuple(frame[k] for k in ['url', 'functionName', 'lineNumber', 'columnNumber'])
            entry = costs.setdefault(key, [0, 0])
            if cursor == node:
                entry[0] += micros
            if key not in frames:
                entry[1] += micros
                frames.add(key)
            cursor = parents.get(cursor)
    frames = [dict(zip(['url', 'functionName', 'lineNumber', 'columnNumber'], key),
                   selfMicros=value[0], inclusiveMicros=value[1]) for key, value in costs.items()]
    record = dict(label=label, elapsedMs=measurement['elapsedMs'], warmup=measurement['warmup'],
                  signedSampleMicros=sum(deltas), negativeDeltas=[v for v in deltas if v < 0],
                  frames=frames, changed=measurement['result']['changed'],
                  unexpected=measurement['result']['unexpected'])
    result.append(record)
    print(json.dumps(dict(label=label, elapsedMs=record['elapsedMs'],
        topSelf=sorted(frames, key=lambda x: x['selfMicros'], reverse=True)[:20],
        topInclusive=sorted(frames, key=lambda x: x['inclusiveMicros'], reverse=True)[:20])))
output = Path('ci-logs/issue-784-restart-2/current-native-profile-analysis.json.gz')
raw = json.dumps(dict(publishedCommit=commit, packetSha256=receipt['sha256'],
    allMembersVerified=len(verified), observations=result, diagnosticOnly=True,
    deadlineQualified=False, fullGatePassed=False), separators=(',', ':')).encode()
with output.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(output.read_bytes()) == raw
print(json.dumps(dict(output=str(output), bytes=output.stat().st_size)))
