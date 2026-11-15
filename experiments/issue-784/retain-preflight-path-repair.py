"""Retain complete source edits and whole-file receiving results, including stops."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

BASELINE = '52b98e0e4116565a263d4bc43c73f0075c386ce8'
BASE = Path('ci-logs/issue-784-restart-2')
TARGET = Path('docs/case-studies/issue-784/evidence/current-preflight-path-repair.json.gz')
members = []


def retain(path, raw):
    members.append(dict(path=path, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for path in ['tools/translation/prepare-static-json-preflight.mjs',
             'tools/translation/test/canonical-json-projection.test.mjs',
             'tools/translation/test/option-unwrapping-types.test.mjs',
             'tools/translation/test/original-rust-census.test.mjs']:
    retain('git:' + BASELINE + ':' + path, subprocess.check_output(['git', 'show', BASELINE + ':' + path]))
    retain(path, Path(path).read_bytes())
for prefix in ['current-preflight-path-node', 'current-preflight-path-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = BASE / (prefix + suffix)
        retain(str(path), path.read_bytes())
for suffix in ['.json.gz', '.log']:
    path = BASE / ('current-preflight-path-bun-pages' + suffix)
    retain(str(path), path.read_bytes())
audit = Path('js/node_modules/.node-case-deadlines/complete-ddWeZj')
for path in sorted(audit.iterdir()):
    if path.is_file():
        retain(str(path), path.read_bytes())
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['auditSummary']['passed']
retain(__file__, Path(__file__).read_bytes())
record = dict(schema='preflight-path-repair-receiving-v1', baseline=BASELINE,
              nodeWholeFilesPassed=13, originalNodeDeadlinesPassed=True,
              bunPassed=8, bunWholeFilesQualified=False, bunResourceStopped=True,
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
