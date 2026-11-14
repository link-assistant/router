"""Retain the complete current root-context regression and resource failures."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
test = Path('tools/translation/test/try-payload-types.test.mjs')
baseline = '11253f10aaf7d191db271d2a101403ab035694c1'
paths = [Path(__file__), test, Path('rust/src/capabilities.rs'),
         Path('rust/src/lib.rs'),
         Path('experiments/issue-784/trace-current-capabilities-root.mjs'),
         base / 'current-capabilities-closed-git-pages.json',
         base / 'current-capabilities-closed-git-pages.log']
audits = []
for label in ['current-capabilities-root-projection', 'current-capabilities-root-node',
              'current-capabilities-root-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        paths.append(base / (label + suffix))
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
    assert (receipt['exitCode'] == 0 and not receipt['stopped']) if label.endswith('projection') else receipt['stopped']
    for name in re.findall(r'Complete Node deadline evidence: (.+)', (base / (label + '.log')).read_text()):
        folder = Path(name)
        assert folder.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
        paths.extend(path for path in folder.iterdir() if path.is_file())
        audits.append(dict(path=name, caseDeadlineReportPresent=(folder / 'case-deadlines.json').exists()))
paths.extend(Path('rust/src/translation_core').glob('*.rs'))
paths.append(Path('rust/src/translation_core.rs'))
members = []


def retain(path, raw, version='current'):
    members.append(dict(path=str(path), version=version, bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


retain(test, subprocess.check_output(['git', 'show', baseline + ':' + str(test)]), baseline)
for path in sorted(set(paths)):
    assert path.is_file() and not path.is_symlink()
    retain(path, path.read_bytes())
record = dict(schema='complete-current-capabilities-root-context-v1', baseline=baseline,
              members=members, nodeAudits=audits,
              originalCiFailure=dict(run=42553719103, job=128954694959,
                                     actualTestLogLine=3421, originalTestLine=85),
              completePhysicalSourceRetained=True, rootDeclarationProjection=True,
              wholeCrateQualification=False, newlyExecutableProductionFunctions=0,
              originalDeadlinesUnchanged=True, originalRuntimeCasesUnchanged=True,
              diagnosticMetadataPassed=True, completeNodeFilePassed=False,
              completeBunFilePassed=False, bothReceivingAttemptsResourceStopped=True,
              fullGatePassed=False, runtimeParity=False, rustExecuted=False)
target = Path('docs/case-studies/issue-784/evidence/current-capabilities-root.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(json.dumps(record, separators=(',', ':')).encode(), mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    raw = base64.b64decode(row['base64'], validate=True)
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=target.stat().st_size,
                     members=len(members), wholeReadbackVerified=True)))
