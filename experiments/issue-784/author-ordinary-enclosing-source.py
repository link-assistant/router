"""Author bounded source DATA; the actual producer must check CST and inverses."""
import hashlib
import json
from pathlib import Path
import subprocess

path = 'tools/translation/project.mjs'
original = subprocess.check_output([
    'git', 'show', '7283f934747bb46ed61766cf944b1a6c41426191:' + path,
], text=True)
# Keep context around deleted imports so every reverse anchor is nonempty and
# unique. Complete original methods and their full-output issuers stay intact.
pairs = [
    ("import {resolveModuleBindings} from './module-bindings.mjs';\n"
     "import {resolveOwnedEnclosingNamespaceModuleBindings as resolveEnclosingNamespaceModuleBindings} from './owned-enclosing-module-bindings.mjs';\n",
     "import {resolveOwnedEnclosingNamespaceModuleBindings as resolveEnclosingNamespaceModuleBindings} from './owned-enclosing-module-bindings.mjs';\n"),
    ("import {createDeriveEnclosingNamespaceContext} from './derive-enclosing-namespace-context.mjs';\n"
     "import {createDeriveBangContext} from './derive-bang-context.mjs';\n",
     "import {createDeriveEnclosingNamespaceContext} from './derive-enclosing-namespace-context.mjs';\n"),
    ('  // Generated Default/Clone names share one genuine enclosing issuer. Ordinary\n'
     '  // project bindings and method parsers still require complete macro evidence.\n',
     '  // Enclosing names and generated Default/Clone inputs share one genuine\n'
     '  // issuer. Generated method bodies still require independent full proofs.\n'),
    ('  if(deriveContext&&(enclosingNamespace||hasDefaultDeclarations||hasCloneDeclarations)){\n',
     '  if(deriveContext){\n'),
    ('    if(!enclosingNamespace)deriveBangContext=deriveContext?createDeriveBangContext({deriveContext}):null;\n'
     "    namespaceProgress(enclosingNamespace?'enclosing-bindings':'complete-bindings');\n"
     '    return (enclosingNamespace?resolveEnclosingNamespaceModuleBindings:resolveModuleBindings)({modules:graph.modules,externalModules:resolvedExternal,deriveContext,deriveBangContext,toolContext,compilationProfile:graph.compilationProfile});\n',
     "    namespaceProgress(enclosingNamespace?'enclosing-bindings':'complete-bindings');\n"
     '    return resolveEnclosingNamespaceModuleBindings({modules:graph.modules,externalModules:resolvedExternal,deriveContext,deriveBangContext,toolContext,compilationProfile:graph.compilationProfile});\n'),
]
source = original
edits = []
for index, (before, after) in enumerate(pairs, 1):
    assert before and after and source.count(before) == 1, index
    source = source.replace(before, after)
    edits.append(dict(id=f'router.ordinary-enclosing-namespace.{index}.v1',
                      before=before, after=after))
inverse = source
for row in reversed(edits):
    assert inverse.count(row['after']) == 1
    inverse = inverse.replace(row['after'], row['before'])
assert inverse == original
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=sha(original),
               afterSha256=sha(source), edits=edits, sourceAuthority=False,
               semanticAuthority=False, runtimeAuthority=False,
               productionExecutableGain=0)
raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
assert len(raw) < 131072
target = Path('tools/translation/source-profiles/ordinary-enclosing-namespace/source-rules.json')
target.parent.mkdir(exist_ok=True)
if target.exists():
    assert target.read_bytes() == raw
else:
    target.write_bytes(raw)
print(json.dumps(dict(path=str(target), bytes=len(raw), rules=len(edits),
                      sha256=hashlib.sha256(raw).hexdigest(),
                      beforeSha256=sha(original), afterSha256=sha(source))))
