"""Retain the full passing Node and failed Bun receiving checks and exact sources."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
paths = set()
checks = []
for engine in ['node', 'bun']:
    prefix = 'current-receiving-fixture-paths-' + engine
    receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
    assert receipt['exitCode'] == (0 if engine == 'node' else 1)
    assert not receipt['stopped'] and not receipt['stoppedOwnedProcessIds']
    assert receipt['interrupted'] is None and not Path('/proc/' + str(receipt['pid'])).exists()
    paths.update(base / (prefix + suffix) for suffix in ['.log', '.memory.json', '.observer.log'])
    checks.append({'engine': engine, 'receipt': receipt})
audit = root / 'js/node_modules/.node-case-deadlines/complete-E4B3Rm'
terminal = json.loads((audit / 'terminal.json').read_bytes())
assert terminal['exitCode'] == 0 and terminal['childClosed'] and terminal['groupCleanup']['complete']
assert terminal['auditSummary'] == {'passed': True, 'durationBreaches': 0, 'errors': []}
assert terminal['allCaseLimitsUnchanged'] and terminal['interrupted'] is None
assert not Path('/proc/' + str(terminal['groupCleanup']['group'])).exists()
paths.update(p for p in audit.iterdir() if p.is_file())
before = []
head = '10fd7f0da82df707f90b16eb892e8e520f699654'
tests = ['tools/translation/test/private-parser-execution.test.mjs',
         'tools/translation/test/source-format-display.test.mjs']
for path in tests:
    old = subprocess.check_output(['git', 'show', head + ':' + path])
    assert old == subprocess.check_output(['git', 'show', 'f2b67cb79:' + path])
    if path.endswith('private-parser-execution.test.mjs'):
        expected = old.replace(b"const count=path==='./private-parser-execution.mjs'?4:1;",
                               b"const count=path==='./private-parser-execution.mjs'?5:1;")
    else:
        expected = old.replace(b'import {repositorySourceURL}', b'import {repositorySourcePath,repositorySourceURL}')
        for name in ['src/subscription/types.rs', 'src/refresh_recovery.rs']:
            expected = expected.replace(("'HEAD:" + name + "'").encode(),
                ("'HEAD:'+repositorySourcePath('" + name + "',root)").encode())
    assert Path(path).read_bytes() == expected and expected != old
    before.append({'path': path, 'gitReference': head + ':' + path,
                   'gitBlob': subprocess.check_output(['git', 'rev-parse', head + ':' + path], text=True).strip(),
                   'bytes': len(old), 'sha256': hashlib.sha256(old).hexdigest(),
                   'completeOriginalGitBytesReopenedAndVerified': True})
    paths.add(Path(path))
concrete = Path('tools/translation/concrete-syntax-meta.mjs')
source = concrete.read_bytes()
assert source == subprocess.check_output(['git', 'show', head + ':' + str(concrete)])
imports = [line for line in source.decode().splitlines()
           if line.startswith('import ') and line.endswith("from './private-parser-execution.mjs';")]
assert len(imports) == 5
paths.update(Path(p) for p in [
    str(concrete), 'tools/translation/test/fixtures/repository-paths.mjs',
    'experiments/issue-784/current-receiving-fixture-paths-plan.md',
    'experiments/issue-784/capture-receiving-fixture-paths-evidence.py',
    'docs/case-studies/issue-784/current-receiving-fixture-paths.md'])
members = []
for path in sorted(paths):
    raw = path.read_bytes()
    members.append({'path': str(path.relative_to(root) if path.is_absolute() else path),
                    'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
record = {'schema': 'complete-receiving-fixture-paths-checks-v1',
          'checks': checks, 'members': members, 'originalTests': before,
          'completePrivateImports': imports, 'originalLimitsUnchanged': True,
          'nodeCasesPassed': 16, 'bunCasesPassed': 12, 'bunCasesFailed': 4,
          'bunLimitMs': 5000, 'ciPinnedBunQualified': False,
          'fullGatePassed': False, 'rustExecuted': False,
          'beforeFailureContainer': 'docs/case-studies/issue-784/evidence/ci-10fd/current-10fd-job-128754637474.log.gz'}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
size = 0
for name in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784', 'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(name):
        if Path(parent) == Path('experiments/issue-784'):
            children[:] = [child for child in children if child != 'toolchain']
        size += sum((Path(parent) / p).stat().st_size for p in files if not (Path(parent) / p).is_symlink())
assert size + len(packed) < 500_000_000, (size, len(packed), size + len(packed))
target = Path('docs/case-studies/issue-784/evidence/current-receiving-fixture-paths.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest(),
                  'members': len(members), 'censusAfterBytes': size + len(packed)}))
