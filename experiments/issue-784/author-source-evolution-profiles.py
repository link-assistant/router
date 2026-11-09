"""Author exact ordered repository edits; runtime consumers accept pinned bytes.

Complete sources and inverses are checked independently by each real producer.
This finite diff is not a compiler, semantic proof, or executable admission.
"""
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path

rows = [
    ('project-namespace-composition', 'tools/translation/project.mjs',
     'experiments/issue-784/project-namespace-profile-before.mjs.txt',
     'tools/translation/project.mjs'),
    ('native-regeneration-memory', 'tools/translation/js-to-rust/native-typescript.mjs',
     'experiments/issue-784/native-memory-profile-before.mjs.txt',
     'experiments/issue-784/native-typescript-public-contract.mjs.txt'),
    ('native-regeneration-public-contract', 'tools/translation/js-to-rust/native-typescript.mjs',
     'experiments/issue-784/native-receiving-profile-before.mjs.txt',
     'experiments/issue-784/native-typescript-public-contract.mjs.txt'),
]
for name, source_path, original, authored in rows:
    before, after = Path(original).read_text(), Path(authored).read_text()
    assert max(len(before.encode()), len(after.encode())) < 262144
    assert max(len(before.splitlines()), len(after.splitlines())) < 1000
    a, b = before.splitlines(keepends=True), after.splitlines(keepends=True)
    groups = None
    for context in (2, 4, 8, 16, 32):
        candidate = list(SequenceMatcher(None, a, b, autojunk=False)
                         .get_grouped_opcodes(context))
        if all(before.count(''.join(a[g[0][1]:g[-1][2]])) == 1
               and after.count(''.join(b[g[0][3]:g[-1][4]])) == 1
               for g in candidate):
            groups = candidate
            break
    assert groups is not None
    edits = []
    for index, group in enumerate(groups):
        old = ''.join(a[group[0][1]:group[-1][2]])
        new = ''.join(b[group[0][3]:group[-1][4]])
        assert old and new and before.count(old) == 1
        edits.append(dict(id='router.' + name + '.' + str(index + 1) + '.v1',
                          before=old, after=new))
    actual = before
    for row in edits:
        assert actual.count(row['before']) == 1
        actual = actual.replace(row['before'], row['after'])
    assert actual == after
    for row in reversed(edits):
        assert actual.count(row['after']) == 1
        actual = actual.replace(row['after'], row['before'])
    assert actual == before
    profile = dict(schema='pinned-repository-source-evolution-v1',
                   path=source_path, phase='repository',
                   beforeSha256=hashlib.sha256(before.encode()).hexdigest(),
                   afterSha256=hashlib.sha256(after.encode()).hexdigest(),
                   edits=edits, sourceAuthority=False, semanticAuthority=False,
                   runtimeAuthority=False, productionExecutableGain=0)
    target = Path('tools/translation/source-profiles') / name / 'source-rules.json'
    target.parent.mkdir(exist_ok=True)
    raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
    assert len(raw) < 131072
    target.write_bytes(raw)
    print(json.dumps(dict(path=str(target), bytes=len(raw), rules=len(edits),
                          sha256=hashlib.sha256(raw).hexdigest())))
