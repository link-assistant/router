"""Author a complete ordered source profile; installation uses the public producer."""
import hashlib
import json
from pathlib import Path

path = 'tools/translation/project.mjs'
before = Path(path).read_text()
assert hashlib.sha256(before.encode()).hexdigest() == 'f4614977214aa63c213330bb3aae131de55c3661410e6ba6ae76ebc7cc7cd164'
edits = [
    ('router.project-matches-analysis-import.v1',
     'import {createMatchesMacroContext,createEnclosingMatchesMacroContext,configureMatchesMacroParser,originalMatchesNamespaceBindings,OriginalMethodOwnerUnproved,originalMethodParserNamespace} from \'./matches-macro-context.mjs\';\n',
     'import {configureMatchesMacroParser,originalMatchesNamespaceBindings,OriginalMethodOwnerUnproved,originalMethodParserNamespace} from \'./matches-macro-context.mjs\';\n'
     'import {createProjectMatchesMacroContexts} from \'./project-matches-analysis-context.mjs\';\n'),
    ('router.project-matches-analysis-contexts.v1',
     '  // Parser configuration reissues the same enclosing name domain.\n'
     '  // Actual impl methods lazily create their independent complete context.\n'
     '  const matchesMacroContext=createEnclosingMatchesMacroContext(matchesOptions);\n'
     '  let methodMatchesMacroContext=null;\n',
     '  // Parser and methods share one privately captured original project input.\n'
     '  // Each still checks its independent enclosing or complete namespace.\n'
     '  const matchesAnalysis=createProjectMatchesMacroContexts(matchesOptions);\n'
     '  const matchesMacroContext=matchesAnalysis.parser;\n'
     '  let methodMatchesMacroContext=null;\n'),
    ('router.project-matches-analysis-methods.v1',
     '          methodMatchesMacroContext??=createMatchesMacroContext(matchesOptions);\n',
     '          methodMatchesMacroContext??=matchesAnalysis.methods();\n'),
]
after = before
for _, old, new in edits:
    assert after.count(old) == 1
    after = after.replace(old, new)
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=hashlib.sha256(before.encode()).hexdigest(),
               afterSha256=hashlib.sha256(after.encode()).hexdigest(),
               edits=[dict(id=name, before=old, after=new) for name, old, new in edits],
               sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
target = Path('tools/translation/source-profiles/project-matches-analysis/source-rules.json')
target.parent.mkdir(exist_ok=True)
raw = (json.dumps(profile, indent=2) + '\n').encode()
with target.open('xb') as output:
    output.write(raw)
assert target.read_bytes() == raw
print(json.dumps(dict(path=str(target), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                     beforeSha256=profile['beforeSha256'], afterSha256=profile['afterSha256'])))
