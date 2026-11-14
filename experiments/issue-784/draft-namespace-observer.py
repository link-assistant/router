"""Draft exact source rules without changing an active compiler input.

This packet is unqualified source DATA. Native grammar, bindings, full CST
transport and inverses must be checked by the receiving producer before install.
"""
import gzip
import hashlib
import json
from pathlib import Path

root = Path.cwd()
out = root / 'ci-logs/issue-784-restart-2/namespace-observer-draft.json.gz'
assert not out.exists()
project = 'tools/translation/project.mjs'
cli = 'scripts/translate-router.mjs'
hash_text = lambda text: hashlib.sha256(text.encode()).hexdigest()
rules = {
    project: [
        ("import {translationProgressReporter} from './translation-progress.mjs';",
         "import {translationProgressReporter,namespaceProgressRequested} from './translation-progress.mjs';"),
        ("if(enclosingNamespace||progressInput!==undefined)",
         "if(enclosingNamespace||namespaceProgressRequested(progressInput))"),
    ],
    cli: [
        ("import { regenerate } from '../tools/translation/bulk.mjs';",
         "import { regenerate } from '../tools/translation/bulk.mjs';\n"
         "import {namespaceProgressObserver} from '../tools/translation/translation-progress.mjs';"),
        ("progress:progress?record=>process.stderr.write(",
         "progress:progress?namespaceProgressObserver(record=>process.stderr.write("),
        ("+'\\n'):undefined", "+'\\n')):undefined"),
    ],
}
files = []
for path, edits in rules.items():
    before = (root / path).read_text()
    assert len(before.encode()) < 262144
    if path == project:
        assert hash_text(before) == '2b4ffae9e075f387eb40137d0db1b20ff55c06847902940f571cc333be654412'
    after = before
    rows = []
    for at, (old, new) in enumerate(edits, 1):
        assert after.count(old) == 1, (path, at)
        after = after.replace(old, new, 1)
        rows.append(dict(id=f'router.namespace-observer.{at}.v1', before=old, after=new))
    inverse = after
    for row in reversed(rows):
        assert inverse.count(row['after']) == 1
        inverse = inverse.replace(row['after'], row['before'], 1)
    assert inverse == before
    profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
                   phase='repository', beforeSha256=hash_text(before),
                   afterSha256=hash_text(after), edits=rows,
                   sourceAuthority=False, semanticAuthority=False,
                   runtimeAuthority=False, productionExecutableGain=0)
    files.append(dict(path=path, before=before, after=after, profile=profile))
value = dict(schema='unqualified-namespace-observer-source-draft-v1', files=files,
             sourceInstalled=False, nativeChecked=False, cstChecked=False,
             receivingExecuted=False, runtimeParity=False)
raw = json.dumps(value, separators=(',', ':')).encode()
out.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(out.read_bytes()) == raw
print(json.dumps(dict(path=str(out), files=[dict(path=row['path'],
    beforeSha256=hash_text(row['before']), afterSha256=hash_text(row['after']))
    for row in files], sourceInstalled=False)))
