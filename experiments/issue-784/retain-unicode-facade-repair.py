"""Keep complete source history, the actual CPU profile and receiving failures."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

BASELINE = '38d025f29'
BASE = Path('ci-logs/issue-784-restart-2')
TARGET = Path('docs/case-studies/issue-784/evidence/current-unicode-facade-repair.json.gz')
members = []


def retain(path, raw):
    members.append(dict(path=path, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for path in ['tools/translation/prepare-facade-ast-receiving-history.mjs',
             'tools/translation/test/current-core-text-fixture.mjs',
             'tools/translation/test/facade-ast-receiving-history.test.mjs',
             'tools/translation/test/fixtures/facade-ast-receiving-history.mjs']:
    retain('git:' + BASELINE + ':' + path, subprocess.check_output(['git', 'show', BASELINE + ':' + path]))
    retain(path, Path(path).read_bytes())
for prefix in ['current-unicode-facade-producer', 'current-unicode-facade-profile',
               'current-unicode-facade-batch-check', 'current-unicode-facade-node',
               'current-unicode-facade-bun', 'current-unicode-facade-bun-smol']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = BASE / (prefix + suffix)
        retain(str(path), path.read_bytes())
profiles = list(BASE.rglob('current-unicode-facade.cpuprofile'))
assert len(profiles) == 1
retain(str(profiles[0]), profiles[0].read_bytes())
audit = Path('js/node_modules/.node-case-deadlines/complete-0EB2jP')
for path in sorted(audit.iterdir()):
    if path.is_file():
        retain(str(path), path.read_bytes())
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['auditSummary']['passed']
retain(__file__, Path(__file__).read_bytes())
record = dict(schema='unicode-facade-repair-receiving-v1', baseline=BASELINE,
              nodeWholeFilesPassed=19, originalNodeDeadlinesPassed=True,
              bunCombinedPassed=14, bunCombinedFailed=2, bunCombinedUnrun=3,
              bunCombinedResourceStopped=True, bunSmolWholeFacadePassed=7,
              bunVersion='1.4.4', ciBunVersion='1.4.3', pairedBenchmark=False,
              preBatchProfileSourceSnapshotCaptured=False,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False, members=members)
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
with TARGET.open('xb') as output:
    output.write(packed)
assert gzip.decompress(TARGET.read_bytes()) == raw
for row in json.loads(raw)['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps(dict(packet=str(TARGET), bytes=len(packed), members=len(members), fullReadbackVerified=True)))
