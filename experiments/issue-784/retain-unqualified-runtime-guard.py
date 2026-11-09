"""Preserve this task's complete unqualified source draft before reverting it."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
result = json.loads((base / 'current-runtime-common-receiving-resource.json').read_bytes())
assert result['exitCode'] == 1 and not result['stopped']
assert not Path('/proc/' + str(result['pid'])).exists()
paths = ['tools/translation/js-to-rust/owned-core-source.mjs',
         'tools/translation/prepare-owned-runtime-import-current.mjs',
         'tools/translation/prepare-runtime-import-common-guard.mjs']
rows = []
for name in paths:
    path = Path(name)
    assert path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid()
    proposed = path.read_bytes()
    assert len(proposed) < 256 * 1024
    before = (subprocess.check_output(['git', 'show', 'HEAD:' + name])
              if name != paths[-1] else None)
    rows.append(dict(path=name, before=before.decode() if before is not None else None,
                     proposed=proposed.decode(), proposedSha256=hashlib.sha256(proposed).hexdigest()))
assert hashlib.sha256(rows[0]['before'].encode()).hexdigest() == 'ebd45c97808dbe473fcbc77c1663bcd0168953dfa25e16c305878f5736e6d2d9'
document = dict(schema='unqualified-runtime-common-source-draft-v1',
                sources=rows, result=result, receivingLog=str(base / 'current-runtime-common-receiving.log'),
                caseAssertionsPassed=15, independentDeadlineErrors=2, performanceQualified=False,
                reason='Whole original receiving file exceeded two unchanged 60-second deadlines.')
raw = json.dumps(document).encode()
target = base / 'current-runtime-common-unqualified-source.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in rows:
    path = Path(row['path'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['proposedSha256']
    if row['before'] is None:
        path.unlink()
    else:
        path.write_bytes(row['before'].encode())
print(json.dumps(dict(retained=str(target), bytes=target.stat().st_size,
                      revertedCompletePaths=paths, performanceQualified=False)))
