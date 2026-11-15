"""Retain full residual equations and every complete-file receiving attempt."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
paths = [Path(__file__), Path('experiments/issue-784/retire-recent-closed-raw-duplicates.py')]
paths += [Path(name) for name in [
    'tools/translation/prepare-static-result-residual-source.mjs',
    'tools/translation/prepare-source-lifetime-refusal-batches.mjs',
    'tools/translation/prepare-core-vector-sources.mjs',
    'tools/translation/extensions/source-lifetimes.mjs',
    'tools/translation/source-profiles/static-result-residuals/original.mjs.gz',
    'tools/translation/test/static-result-residual-source.test.mjs',
    'tools/translation/test/static-result-residual-source-composition.mjs',
    'tools/translation/test/source-lifetime-batch-source-data.test.mjs',
    'tools/translation/test/source-lifetime-refusal-batches.test.mjs',
    'tools/translation/test/router-core-vectors.test.mjs']]
proposal = base / 'current-residual-equation-proposal-2.json.gz'
for pattern in ['current-residual-equation-*', 'current-lifetime-residual-*',
                'current-lifetime-birth-*', 'current-residual-proposal-preflight-*',
                'current-fingerprint-trace-duplicate-retirement.*']:
    paths += [path for path in base.glob(pattern)
              if path.is_file() and path != proposal and 'retention' not in path.name]
audits = []
for path in list(paths):
    if path.suffix != '.log':
        continue
    for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
        directory = Path(name)
        assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        paths.extend(path for path in directory.iterdir() if path.is_file())
        audits.append(name)
members = []
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink(), str(path)
    raw = path.read_bytes()
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))
    if path.name.endswith('.memory.json'):
        receipt = json.loads(raw)
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists()
                   for pid in receipt['stoppedOwnedProcessIds'])
raw = gzip.decompress(proposal.read_bytes())
plan = json.loads(raw)
assert plan['schema'] == 'static-result-residual-source-v1'
assert len(plan['files']) == 1
row = plan['files'][0]
assert row['inverse'] == row['before'] == row['selection']['nativeInverse']
assert Path(row['path']).read_text() == row['current'] == row['after']
assert [stage['phase'] for stage in row['stages']] == ['language', 'repository']
external = dict(originalPath=str(proposal), retainedPath=str(destination / proposal.name),
                bytes=proposal.stat().st_size,
                sha256=hashlib.sha256(proposal.read_bytes()).hexdigest(),
                rawBytes=len(raw), rawSha256=hashlib.sha256(raw).hexdigest())
record = dict(schema='complete-static-result-residual-source-receiving-v1', members=members,
              externalMembers=[external], nodeDeadlineAudits=audits,
              sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              residualNodeWholeFilePassed=True, residualBunWholeFilePassed=True,
              batchDataNodeWholeFilePassed=True, batchDataBunWholeFilePassed=False,
              largerLifetimeNodeWholeFilePassed=False, largerLifetimeBunWholeFilePassed=False,
              repairedCoreVectorsWholeFileRun=False, originalDeadlinesUnchanged=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False,
              newlyExecutableProductionFunctions=0)
target = destination / 'current-static-result-residual-source.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes'] and hashlib.sha256(decoded).hexdigest() == member['sha256']
retained = Path(external['retainedPath'])
assert not retained.exists()
proposal.rename(retained)
assert hashlib.sha256(retained.read_bytes()).hexdigest() == external['sha256']
assert hashlib.sha256(gzip.decompress(retained.read_bytes())).hexdigest() == external['rawSha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size, members=len(members),
                     externalBytes=external['bytes'], completeReadbackVerified=True)))
