"""Review every generated record and retain the complete source diff."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
path = 'tools/translation/test/fixtures/current-receiving-source-history.mjs'
before = subprocess.check_output(['git', 'show', 'HEAD:' + path]).decode()
after = Path(path).read_text()
digest = lambda text: hashlib.sha256(text.encode()).hexdigest()


def constant(source, name):
    matches = re.findall(r'^const ' + name + r'=(.*);$', source, re.M)
    assert len(matches) == 1
    return json.loads(matches[0])


old, new = constant(before, 'RECORDS'), constant(after, 'RECORDS')
assert len(old) == len(new) == 8
assert constant(before, 'GUARDED') == constant(after, 'GUARDED')
changes = []
for original, current in zip(old, new):
    assert (original['path'], original['lane']) == (current['path'], current['lane'])
    if original == current:
        continue
    name = Path(original['path']).name.replace('.mjs', '.rules.json')
    profile = Path('tools/translation/source-profiles/struct-ordering-source-history') / name
    raw = profile.read_bytes()
    data = json.loads(raw)
    assert digest(original['current']) == data['beforeSha256']
    actual = Path(original['path']).read_text()
    assert digest(actual) == data['afterSha256']
    expected = copy.deepcopy(original)
    expected['current'] = actual
    expected['provenance']['afterSha256'] = data['afterSha256']
    expected['provenance']['structOrderingSourceHistory'] = dict(
        before=original['current'], beforeSha256=data['beforeSha256'],
        afterSha256=data['afterSha256'], profileSha256=hashlib.sha256(raw).hexdigest(),
        rules=data['edits'], inverse=original['current'], sourceAuthority=False)
    assert current == expected
    changes.append(dict(path=current['path'], before=original, after=current))
assert len(changes) == 2
patch = subprocess.check_output(['git', 'diff', '--', path])
with (base / 'current-struct-ordering-history-full.patch.gz').open('xb') as output:
    output.write(gzip.compress(patch, mtime=0))
assert gzip.decompress((base / 'current-struct-ordering-history-full.patch.gz').read_bytes()) == patch
report = dict(schema='complete-struct-ordering-receiving-history-review-v1',
              path=path, beforeSha256=digest(before), afterSha256=digest(after),
              records=len(new), changedRecords=changes, unchangedGuardedRecords=True,
              productionExecutableGain=0, semanticAuthority=False)
raw = json.dumps(report, separators=(',', ':')).encode()
with (base / 'current-struct-ordering-history-review.json.gz').open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress((base / 'current-struct-ordering-history-review.json.gz').read_bytes()) == raw
print(json.dumps(dict(records=len(new), changedRecords=len(changes),
                     completePatchBytes=len(patch), sourceBytes=len(after.encode()))))
