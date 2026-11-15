"""Keep top-level parser names with their enclosing issuer and methods separate."""
import hashlib
import json
from pathlib import Path

path = 'tools/translation/project.mjs'
before = Path(path).read_text()
assert hashlib.sha256(before.encode()).hexdigest() == (
    'a69d95b91ba82fef58c748a7bb043fad74e29eb62efaa368b93e8cb57c4e4e55')
anchor = ('  const matchesMacroContext=(enclosingNamespace?createEnclosingMatchesMacroContext:createMatchesMacroContext)(matchesOptions);\n'
          '  let methodMatchesMacroContext=enclosingNamespace?null:matchesMacroContext;\n')
replacement = ('  // Parser configuration reissues the same enclosing name domain.\n'
               '  // Actual impl methods lazily create their independent complete context.\n'
               '  const matchesMacroContext=createEnclosingMatchesMacroContext(matchesOptions);\n'
               '  let methodMatchesMacroContext=null;\n')
assert before.count(anchor) == 1
after = before.replace(anchor, replacement)
assert after.count(replacement) == 1
assert after.replace(replacement, anchor) == before
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=sha(before), afterSha256=sha(after),
               edits=[dict(id='router.ordinary-parser-enclosing-namespace.v1',
                           before=anchor, after=replacement)],
               sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
assert len(raw) < 131072
target = Path('tools/translation/source-profiles/ordinary-parser-enclosing-namespace/source-rules.json')
target.parent.mkdir(exist_ok=True)
with target.open('xb') as output:
    output.write(raw)
print(json.dumps(dict(path=str(target), bytes=len(raw), sha256=sha(raw.decode()),
                      beforeSha256=sha(before), afterSha256=sha(after))))
