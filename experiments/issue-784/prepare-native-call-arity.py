"""Author one exact source evolution; the real producer installs its afterimage."""
import hashlib
import json
from pathlib import Path

path = 'tools/translation/js-to-rust/native-typescript.mjs'
source = Path(path).read_text()
old = '''        else if(node.arguments.length){
          const signature=checker.getResolvedSignature(node),parameters=signature?.getParameters()??[];
          const formal=signature?.declaration?.parameters;
          const rest=formal?formal.at(-1)?.dotDotDotToken:parameters.at(-1)?.declarations?.some(declaration=>declaration.dotDotDotToken);
'''
new = '''        else if(node.arguments.length){
          // Arity needs the original declaration, not inferred argument types.
          // A single native call signature keeps that declaration on every
          // instantiation. Ambiguous/signatureless calls and JSDoc classes
          // retain the full original resolver (class calls use an error sig).
          const signatures=checker.getTypeAtLocation(node.expression).getCallSignatures();
          const single=signatures.length===1?signatures[0]:null;
          const signature=single?.declaration&&!ts.getJSDocClassTag(single.declaration)
            ?single:checker.getResolvedSignature(node),parameters=signature?.getParameters()??[];
          const formal=signature?.declaration?.parameters;
          const rest=formal?formal.at(-1)?.dotDotDotToken:parameters.at(-1)?.declarations?.some(declaration=>declaration.dotDotDotToken);
'''
assert source.count(old) == 1
after = source.replace(old, new)
assert after.count(new) == 1 and after.replace(new, old) == source
assert len(after.splitlines()) < 1000
digest = lambda value: hashlib.sha256(value.encode()).hexdigest()
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=digest(source), afterSha256=digest(after),
               edits=[dict(id='router.native-build.single-call-signature-arity.v1', before=old, after=new)],
               sourceAuthority=False, semanticAuthority=False, runtimeAuthority=False,
               productionExecutableGain=0)
target = Path('tools/translation/source-profiles/native-call-arity/source-rules.json')
target.parent.mkdir(exist_ok=False)
raw = (json.dumps(profile, ensure_ascii=False, indent=2)+'\n').encode()
with target.open('xb') as stream:
    stream.write(raw)
print(json.dumps(dict(path=str(target), profileSha256=hashlib.sha256(raw).hexdigest(),
                      beforeSha256=digest(source), afterSha256=digest(after))))
