"""Propose fresh primitive scope comparison without caching caller paths."""
import gzip
import hashlib
import json
from pathlib import Path

path = Path('tools/translation/derive-footprints.mjs')
before = path.read_text()
anchor = 'const key=path=>path.join(\'::\');'
helper = """// Native JSON serializes these complete own-data pairs injectively. Read every
// current path again; customized serializers, proxies and accessors keep the
// complete original find callback, including its repeated serialization order.
function requestedScopeData(value){
  if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==pathObjectPrototype)return null;
  const file=descriptor(value,'file'),path=descriptor(value,'path');
  if(!file||!hasOwn(file,'value')||typeof file.value!=='string'||!path||!hasOwn(path,'value')||!ordinaryPathArray(path.value,true))return null;
  return {file:file.value,path:path.value};
}
function requestedOriginalModule(modules,scope){
  if(originalPathMembershipIntrinsicsUnchanged()){
    const query=requestedScopeData(scope);
    if(query){
      let complete=true;
      for(let at=0;at<modules.length;at++){
        const module=modules[at],candidate=requestedScopeData(module);
        if(!candidate){complete=false;break;}
        if(candidate.file!==query.file||candidate.path.length!==query.path.length)continue;
        let equal=true;for(let part=0;part<query.path.length;part++)if(candidate.path[part]!==query.path[part]){equal=false;break;}
        if(equal)return module;
      }
      if(complete)return undefined;
    }
  }
  return modules.find(module=>moduleScopeKey(module)===moduleScopeKey(scope));
}
"""
old = 'const module=modules.find(module=>moduleScopeKey(module)===moduleScopeKey(scope));'
edits = [dict(id='requested-module-data:fresh-own-data-comparison', before=anchor,
              after=helper + anchor),
         dict(id='requested-module-data:original-closure-consumer', before=old,
              after='const module=requestedOriginalModule(modules,scope);')]
after = before
for edit in edits:
    assert after.count(edit['before']) == 1
    after = after.replace(edit['before'], edit['after'])
inverse = after
for edit in reversed(edits):
    assert inverse.count(edit['after']) == 1
    inverse = inverse.replace(edit['after'], edit['before'])
assert inverse == before and len(after.splitlines()) < 1000
digest = lambda value: hashlib.sha256(value.encode()).hexdigest()
record = dict(schema='requested-module-data-draft-v1', phases=['language', 'repository'],
              files=[dict(path=str(path), before=before, after=after,
                          beforeSha256=digest(before), afterSha256=digest(after), edits=edits)],
              installed=False, sourceAuthority=False, semanticAuthority=False,
              runtimeAuthority=False, productionExecutableGain=0, deadlineQualified=False)
raw = json.dumps(record, separators=(',', ':')).encode()
target = Path('ci-logs/issue-784-restart-2/requested-module-data-source-draft.json.gz')
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), sha256=hashlib.sha256(raw).hexdigest(),
                     before=digest(before), after=digest(after), edits=len(edits))))
