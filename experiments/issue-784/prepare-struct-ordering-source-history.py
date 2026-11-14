"""Author exact source-only successors for the installed struct-ordering change."""
import difflib
import hashlib
import json
from pathlib import Path
import re

digest = lambda source: hashlib.sha256(source.encode()).hexdigest()
fixture = Path('tools/translation/test/fixtures/current-receiving-source-history.mjs').read_text()
records = json.loads(re.search(r'^const RECORDS=(.*);$', fixture, re.M)[1])
pins = {
    'builtin-derive-bang-footprints.mjs': (
        '11468b44ba45e314a7cd037b5a28b7bab1c8abf555bf800bceb461407a32cb0c',
        '6a56e031a4b6300231e29f3c794e0f6812a97e6ceba7f783190db4bdc03e8a26'),
    'builtin-ordering-ast-route.mjs': (
        '645266b263775e9d1105606c9af2a723a386cbb111d12820c9d45f972f146fbe',
        '6e421606d6ceee3ca41a4b99616a4457e85da7b90aba6571381c8a8e188261a5'),
}
directory = Path('tools/translation/source-profiles/struct-ordering-source-history')
directory.mkdir(exist_ok=True)
for name, (old_pin, new_pin) in pins.items():
    path = 'tools/translation/' + name
    selected = [row for row in records if row['path'] == path]
    assert len(selected) == 1
    before = selected[0]['provenance'].get('structOrderingSourceHistory', {}).get(
        'before', selected[0]['current'])
    after = Path(path).read_text()
    assert digest(before) == old_pin and digest(after) == new_pin
    old, new = before.splitlines(keepends=True), after.splitlines(keepends=True)
    edits = []
    for kind, a, b, c, d in difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes():
        if kind == 'equal':
            continue
        # Insertions retain the preceding complete source line as their anchor.
        if a == b:
            assert a > 0 and c > 0 and old[a - 1] == new[c - 1]
            a, c = a - 1, c - 1
        edits.append(dict(id=f'router.struct-ordering.history.{name}.{len(edits)}.v1',
                          before=''.join(old[a:b]), after=''.join(new[c:d])))
    current = before
    for edit in edits:
        assert current.count(edit['before']) == 1
        current = current.replace(edit['before'], edit['after'])
    assert current == after
    for edit in reversed(edits):
        assert current.count(edit['after']) == 1
        current = current.replace(edit['after'], edit['before'])
    assert current == before
    profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
                   phase='repository', beforeSha256=old_pin, afterSha256=new_pin,
                   edits=edits, sourceAuthority=False, semanticAuthority=False,
                   runtimeAuthority=False, productionExecutableGain=0)
    target = directory / name.replace('.mjs', '.rules.json')
    raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
    if target.exists():
        assert target.read_bytes() == raw
    else:
        with target.open('xb') as output:
            output.write(raw)
    print(json.dumps(dict(path=str(target), sha256=hashlib.sha256(raw).hexdigest(), edits=len(edits))))
