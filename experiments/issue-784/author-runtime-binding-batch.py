"""Author an ordered complete-source proposal; never edit the generated output."""
import hashlib
import json
from pathlib import Path

path = 'tools/translation/prepare-owned-runtime-import-current.mjs'
before = Path(path).read_text()
assert hashlib.sha256(before.encode()).hexdigest() == '0be476c1b2853f037d7a27dc8e7a2649914f30e8b4bac79e7e8082273d7e30c6'
after, edits = before, []

def edit(label, old, new):
    global after
    assert after.count(old) == 1, label
    after = after.replace(old, new)
    edits.append(dict(id='runtime-binding-batch:'+label, before=old, after=new))


edit('native-module-checker',
     "import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';",
     "import {verifyNativeCopiedSourceBindings,verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';")
edit('private-equation-queue',
     'function equation(ts,root,path,before,language,after,nativeSelections){',
     'function equation(ts,root,path,before,language,after,nativeSelections,bindings=null){')
old = next(line for line in after.splitlines() if "if(after.split('\\n').length>=1000)" in line)
new = old.replace('return {path,', 'const row={path,').replace(
    'nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after)',
    'nativeBindings:{}')
new += "\n if(bindings)bindings.push(row);else Object.assign(row.nativeBindings,verifyNativeCopiedSourceBindings(ts,resolve(root,path),after));return row;"
edit('defer-complete-module-scopes', old, new)
edit('fresh-queue-per-operation',
     ' root=resolve(root);const {ts,compilerPath,compilerBytes,compilerSource,lazy,native,parentTail}=freshRuntimeCompilerSourceData(root);',
     ' root=resolve(root);const bindings=[];const {ts,compilerPath,compilerBytes,compilerSource,lazy,native,parentTail}=freshRuntimeCompilerSourceData(root);')
for name, call in [
    ('owned', 'ownedRow={...equation(ts,root,OWNED,before,language,after,edits)'),
    ('build', 'equation(ts,root,BUILD,buildBefore,buildLanguage,buildAfter,buildEdits)'),
    ('loader', 'equation(ts,root,LOADER,loaderBefore,loaderLanguage,loaderAfter,loaderEdits)'),
    ('native', 'equation(ts,root,NATIVE,nativeBefore,nativeLanguage,nativeAfter,nativeEdits)'),
]:
    edit('queue-'+name, call, call[:-1]+',bindings)')
edit('join-native-queue',
     'composeCurrentNativeRegenerationRow(ts,root,equation(ts,root,NATIVE,nativeBefore,nativeLanguage,nativeAfter,nativeEdits,bindings))',
     'composeCurrentNativeRegenerationRow(ts,root,equation(ts,root,NATIVE,nativeBefore,nativeLanguage,nativeAfter,nativeEdits,bindings),bindings)')
edit('join-loader-queue',
     'publicCallbackCannotIssueNativeIdentity:true});',
     'publicCallbackCannotIssueNativeIdentity:true},bindings);')
for name in ['NativeRegeneration', 'LoaderComparison']:
    old = next('function composeCurrent'+name+'Row'+part for part in
               after.split('function composeCurrent'+name+'Row')[1:])
    old = old[:old.index('\n}')+2]
    new = old.replace('(ts,root,original)', '(ts,root,original,bindings)')
    new = new.replace('batch.after,original.nativeSelections)', 'batch.after,original.nativeSelections,bindings)')
    edit('propagate-'+name, old, new)
anchor = ' for(const row of files)if(row.current!==row.before&&row.current!==row.after)'
edit('complete-all-scopes-before-return', anchor,
     ' completeRuntimeBindingBatch(ts,root,bindings);\n'+anchor)
addition = '''
// Fresh programs share library parsing only within distinct external modules.
// Repeated versions of one path enter separate programs, preserving filenames.
function completeRuntimeBindingBatch(ts,root,rows){
 const groups=[];
 for(const row of rows){
  let group=groups.find(value=>!value.paths.has(row.path));
  if(!group){group={paths:new Set(),rows:[]};groups.push(group);}
  group.paths.add(row.path);group.rows.push(row);
 }
 for(const group of groups){
  const checked=verifyNativeCopiedModuleBindings(ts,group.rows.map(row=>({path:resolve(root,row.path),source:row.after})));
  for(let at=0;at<group.rows.length;at++)Object.assign(group.rows[at].nativeBindings,checked[at]);
 }
}
'''
edit('private-batch-completion', after[-120:], after[-120:]+addition)
inverse = after
for row in reversed(edits):
    assert inverse.count(row['after']) == 1, row['id']
    inverse = inverse.replace(row['after'], row['before'])
assert inverse == before and len(after.splitlines()) < 1000
sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
record = dict(schema='pinned-repository-source-evolution-v1', path=path,
              phase='repository', beforeSha256=sha(before), afterSha256=sha(after),
              edits=edits, sourceAuthority=False, semanticAuthority=False,
              runtimeAuthority=False, productionExecutableGain=0)
target = Path('tools/translation/source-profiles/runtime-import-binding-batch/source-rules.json')
target.parent.mkdir(exist_ok=True)
raw = (json.dumps(record, indent=2)+'\n').encode()
assert len(raw) < 131072
with target.open('xb') as output:
    output.write(raw)
print(json.dumps(dict(profile=str(target), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                      beforeSha256=sha(before), afterSha256=sha(after))))
