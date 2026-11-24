"""Retain complete bounded-layer receiving and the separate full-gate attempt."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
destination = Path('docs/case-studies/issue-784/evidence')
head = subprocess.check_output(['git', 'rev-parse', '743c338d4'], text=True).strip()
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]


def retain(target, paths, record, originals=()):
    members = []
    for path, raw, version in originals:
        members.append(dict(path=str(path), version=version, bytes=len(raw),
                            sha256=hashlib.sha256(raw).hexdigest(),
                            base64=base64.b64encode(raw).decode()))
    for path in sorted(set(paths)):
        assert path.is_file() and not path.is_symlink()
        raw = path.read_bytes()
        members.append(dict(path=str(path), version='current', bytes=len(raw),
                            sha256=hashlib.sha256(raw).hexdigest(),
                            base64=base64.b64encode(raw).decode()))
    raw = json.dumps(dict(record, members=members), separators=(',', ':')).encode()
    packed = gzip.compress(raw, mtime=0)
    before = sum(p.stat().st_size for root in roots for p in root.rglob('*')
                 if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
    assert before + len(packed) < 500_000_000
    with target.open('xb') as output:
        output.write(packed)
    decoded = gzip.decompress(target.read_bytes())
    assert decoded == raw
    for row in json.loads(decoded)['members']:
        source = base64.b64decode(row['base64'], validate=True)
        assert len(source) == row['bytes'] and hashlib.sha256(source).hexdigest() == row['sha256']
    print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                         wholeReadbackVerified=True, evidenceBytesAfter=before + len(packed))))


gate = json.loads((base / 'current-custody-integrated-gate.memory.json').read_bytes())
assert gate['exitCode'] == 143 and gate['stopped'] and gate['stopThresholdBytes'] == 2866933760
assert not Path('/proc/' + str(gate['pid'])).exists()
assert all(not Path('/proc/' + str(row['pid'])).exists() and row['exitCode'] == 0
           for row in gate['closedTrackedPageAdvice'])
gate_paths = list(base.glob('current-custody-integrated-gate*'))
gate_paths += [Path(__file__), Path('scripts/check-js-first-local.mjs'),
               Path('experiments/issue-784/run-observed-check.py'),
               Path('experiments/issue-784/release-inactive-repository-pages.py'),
               Path('experiments/issue-784/with-child-reaper.py'),
               Path('docs/case-studies/issue-784/current-custody-integrated-gate.md')]
retain(destination / 'current-custody-integrated-gate.json.gz', gate_paths,
       dict(schema='complete-canonical-custody-integrated-gate-v1', headSha=head,
            parentHeapMiB=128, childHeapMiB=512, node='20.20.2', bun='1.4.4', typescript='5.9.3',
            receipt=gate, fingerprintComplete=False, allSevenStagesUnrun=True,
            fullGatePassed=False, newlyExecutableProductionFunctions=0, rustExecuted=False))

source_paths = [Path('tools/translation/test') / name for name in [
    'complete-source-metadata-receiving.mjs', 'complete-source-metadata-receiving.test.mjs',
    'source-lifetime-refusal-batches.test.mjs', 'csv-original-source.test.mjs']]
paths = source_paths + [Path(__file__), Path('docs/case-studies/issue-784/current-layered-metadata-receiving.md')]
paths += list(base.glob('current-layered-metadata*')) + list(base.glob('current-layered-lifetime*'))
audits = []
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
            folder = Path(name)
            assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
            paths.extend(p for p in folder.iterdir() if p.is_file())
            audits.append(dict(path=name, caseDeadlineReportPresent=(folder / 'case-deadlines.json').exists()))
for path in paths:
    if path.name.endswith('.memory.json'):
        receipt = json.loads(path.read_bytes())
        assert not Path('/proc/' + str(receipt['pid'])).exists()
        assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
originals = [(p, subprocess.check_output(['git', 'show', head + ':' + str(p)]), head)
             for p in source_paths]
assert source_paths[0].read_bytes().startswith(originals[0][1])
retain(destination / 'current-layered-metadata-receiving.json.gz', paths,
       dict(schema='complete-bounded-layer-source-receiving-v1', baseline=head,
            nodeAudits=audits, receiverNodeCasesPassed=6, receiverBunCasesPassed=6,
            originalDocumentBound=256, declaredLayerBound=256,
            eachOriginalImportRetained=True, firstNodeAttemptResourceStopped=True,
            completeLifetimeNodePassed=False, completeLifetimeBunPassed=False,
            wholeCsvFileRerun=False, originalDeadlinesUnchanged=True,
            fullGatePassed=False, newlyExecutableProductionFunctions=0,
            runtimeParity=False, rustExecuted=False), originals)
