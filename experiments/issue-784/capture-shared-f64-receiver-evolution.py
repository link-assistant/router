"""Pin complete source predecessors and the two ordered receiver rule sequences."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path('tools/translation/source-profiles/shared-f64-receiver-evolution')
root.mkdir(exist_ok=False)
hash_bytes = lambda value: hashlib.sha256(value).hexdigest()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert head == 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
paths = ['tools/translation/extensions/host-contracts.mjs', 'tools/translation/extensions/pattern-control.mjs']
rows = []
for path in paths:
    original = subprocess.check_output(['git', 'show', head + ':' + path])
    before, after = original.decode(), Path(path).read_text()
    import difflib
    # Native scope and every actual language/repository substitution are checked
    # by the receiving producer, independently of this finite text census.
    edits = []
    matcher = difflib.SequenceMatcher(None, before.splitlines(keepends=True), after.splitlines(keepends=True), autojunk=False)
    a, b = before.splitlines(keepends=True), after.splitlines(keepends=True)
    for opcode, first, last, new_first, new_last in matcher.get_opcodes():
        if opcode == 'equal':
            continue
        # Include a stable preceding complete line for zero-length insertions.
        if first == last:
            first -= 1
            new_first -= 1
        old, new = ''.join(a[first:last]), ''.join(b[new_first:new_last])
        assert old and new and before.count(old) == 1
        phase = 'repository' if old.lstrip().startswith('import ') or new.lstrip().startswith('import ') else 'language'
        edits.append(dict(phase=phase, id='shared-f64:' + Path(path).stem + ':' + str(len(edits) + 1), before=old, after=new))
    current = before
    for phase in ['language', 'repository']:
        for edit in edits:
            if edit['phase'] == phase:
                assert current.count(edit['before']) == 1
                current = current.replace(edit['before'], edit['after'])
    assert current == after
    archive = Path(path).name + '.gz'
    encoded = gzip.compress(original, mtime=0)
    (root / archive).write_bytes(encoded)
    rows.append(dict(path=path, archive=archive, bytes=len(original), sha256=hash_bytes(original),
                     archiveBytes=len(encoded), archiveSha256=hash_bytes(encoded),
                     afterSha256=hash_bytes(after.encode()), edits=edits))
helpers = []
for name in ['joint-shared-reference-type', 'shared-f64-method-source', 'shared-f64-method-prelude']:
    path = 'tools/translation/extensions/' + name + '.mjs'
    raw = Path(path).read_bytes()
    archive = name + '.mjs.gz'
    encoded = gzip.compress(raw, mtime=0)
    (root / archive).write_bytes(encoded)
    helpers.append(dict(path=path, archive=archive, bytes=len(raw), sha256=hash_bytes(raw), archiveBytes=len(encoded), archiveSha256=hash_bytes(encoded)))
manifest = dict(schema='original-shared-f64-receiver-evolution-v1', predecessorCommit=head,
                files=rows, helpers=helpers, phases=['language', 'repository'], sourceAuthority=False,
                semanticAuthority=False, runtimeAuthority=False, productionExecutableGain=0)
raw = (json.dumps(manifest, indent=2) + '\n').encode()
(root / 'manifest.json').write_bytes(raw)
print(json.dumps(dict(manifestSha256=hash_bytes(raw), bytes=len(raw), sourceFiles=len(rows), helperFiles=len(helpers))))
