import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {planTrackedModulePath,isTrackedModulePathPlan,MODULE_PATH_PROFILE} from '../module-paths.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function module(source,{file='src/lib.rs',path=[],directory='src',pathDirectory='src',compilationProfile=null}={}){
  const capture=captureSourceModuleViews({source,sourcePath:file,compilationProfile});
  return {file,path,directory,pathDirectory,source,sourceView:capture.views[0],compilationProfile};
}
const item=owner=>originalSourceModuleItems(owner).find(entry=>entry.term==='mod');
const plan=(owner,paths)=>planTrackedModulePath(owner,item(owner),[owner.file,...paths]);

test('module-file profile retains unchanged pinned Rust source and no behavior authority',()=>{
  assert.equal(MODULE_PATH_PROFILE.rust,'1.89.0');
  assert.equal(MODULE_PATH_PROFILE.source.sha256,'ffd5ab103a966ee584b99c99fb8009f52c9aa6f7fce592f86498924c513e65e5');
  assert.equal(MODULE_PATH_PROFILE.identifierSource.sha256,'35b84de01138877958228c55fcfbbff7749f7b97dd4e089fc3e4cad1733196b2');
  for(const name of ['namespaceAuthority','attributeExpansionAuthority','runtimeAuthority'])assert.equal(MODULE_PATH_PROFILE[name],false);
});

test('module names retain keyword raw-identifier and filesystem spelling restrictions',()=>{
  for(const name of ['_','fn','async','await','dyn','type','true','try','gen','abstract','yield']){
    assert.throws(()=>plan(module(`#[path="actual.rs"]mod ${name};`),['src/actual.rs']),/permitted original Rust identifier/,name);
  }
  for(const name of ['_','crate','self','Self','super'])assert.throws(()=>plan(module(`#[path="actual.rs"]mod r#${name};`),['src/actual.rs']),/permitted original Rust identifier/,name);
  for(const name of ['fn','async','type','try','gen']){
    const selected=plan(module(`#[path="actual.rs"]mod r#${name};`),['src/actual.rs']);assert.equal(selected.name,name);assert.equal(selected.rawIdentifier,true);
  }
  for(const name of ['union','macro_rules','raw','safe','_valid']){
    const selected=plan(module(`mod ${name};`),[`src/${name}.rs`]);assert.equal(selected.name,name);assert.equal(selected.rawIdentifier,false);
  }
  assert.throws(()=>plan(module('mod café;'),['src/café.rs']),/ASCII filesystem identifier/);
  assert.equal(plan(module('#[path="actual.rs"]mod café;'),['src/actual.rs']).name,'café');
  assert.equal(plan(module('mod café {}'),[]).name,'café');
  assert.throws(()=>plan(module('#[path="actual.rs"]mod cafe\u0301;'),['src/actual.rs']),/permitted original Rust identifier/);
  // The structural partitioner can classify an invalid visibility using its
  // embedded keyword; either rejection must precede any file-selection plan.
  for(const source of ['pub(in fn)mod child;','pub(in crate::fn)mod child;','pub(in crate::_)mod child;'])assert.throws(()=>plan(module(source),['src/child.rs']),/Tracked module path/);
});

test('ordinary external module candidates retain foo.rs and foo/mod.rs ownership',()=>{
  const owner=module('pub mod child;');
  const single=plan(owner,['src/child.rs']);assert.equal(single.target,'src/child.rs');assert.equal(single.directory,'src/child');assert.equal(single.pathDirectory,'src');
  const mod=plan(owner,['src/child/mod.rs']);assert.equal(mod.target,'src/child/mod.rs');assert.equal(mod.directory,'src/child');assert.equal(mod.pathDirectory,'src/child');
  assert.throws(()=>plan(owner,[]),/missing tracked/);assert.throws(()=>plan(owner,['src/child.rs','src/child/mod.rs']),/ambiguous tracked/);
});

test('explicit non-inline paths use physical parent and included-file children stay siblings',()=>{
  const owner=module('#[path="actual.rs"] mod child;',{file:'src/nested/owner.rs',path:['owner'],directory:'src/nested/owner',pathDirectory:'src/nested'});
  const selected=plan(owner,['src/nested/actual.rs','src/nested/owner/actual.rs']);
  assert.equal(selected.target,'src/nested/actual.rs');assert.equal(selected.directory,'src/nested');assert.equal(selected.pathDirectory,'src/nested');
  const child=module('mod grandchild;',{file:selected.target,path:['owner','child'],directory:selected.directory,pathDirectory:selected.pathDirectory});
  const grandchild=plan(child,['src/nested/grandchild.rs','src/nested/actual/grandchild.rs']);assert.equal(grandchild.target,'src/nested/grandchild.rs');
});

test('inline default directories and explicit overrides retain actual current-directory rules',()=>{
  const owner=module('mod inline {}',{file:'src/nested/owner.rs',directory:'src/nested/owner',pathDirectory:'src/nested'});
  const inline=plan(owner,[]);assert.equal(inline.inline,true);assert.equal(inline.target,null);assert.equal(inline.directory,'src/nested/owner/inline');assert.equal(inline.pathDirectory,inline.directory);
  const override=plan(module('#[path="thread_files"] mod thread {}',{file:'src/nested/owner.rs',directory:'src/nested/owner',pathDirectory:'src/nested'}),[]);
  assert.equal(override.directory,'src/nested/thread_files');assert.equal(override.pathDirectory,override.directory);
  const root=plan(module('mod inline {}'),[]);assert.equal(root.directory,'src/inline');
});

test('original raw names raw literals comments and normalized internal paths do not rewrite source',()=>{
  for(const source of ['#[path=r#"actual.rs"#]pub(in crate::outer)mod r#type;','#[path="folder/../actual.rs"] /* preserve */ pub(crate) mod child;','#[path="actu\\u{61}l.rs"]mod child;']){
    const owner=module(source),selected=plan(owner,['src/actual.rs']);assert.equal(selected.target,'src/actual.rs');assert.equal(selected.sourceSha256,hash(source));assert.equal(selected.declarationSha256,hash(source.slice(selected.span.start,selected.span.end)));
    assert.equal(isTrackedModulePathPlan(selected),true);assert.equal(isTrackedModulePathPlan(structuredClone(selected)),false);
    for(const name of ['namespaceAuthority','attributeExpansionAuthority','runtimeAuthority'])assert.equal(selected[name],false);
  }
});

test('malformed duplicate unsafe missing and unknown attribute paths retain obligations',()=>{
  for(const source of ['#[path=other]mod child;','#[path("actual.rs")]mod child;','#[path=concat!("actual.rs")]mod child;','#[path="actual.rs"]#[path="other.rs"]mod child;','#[replace]#[path="actual.rs"]mod child;','#[cfg_attr(test,path="actual.rs")]mod child;','#[path="/actual.rs"]mod child;','#[path="../../actual.rs"]mod child;','#[path="C:actual.rs"]mod child;','#[path="folder\\\\actual.rs"]mod child;','#[path=""]mod child;','#[path="actual.js"]mod child;','pub(in crate::)mod child;']){
    assert.throws(()=>plan(module(source),['src/actual.rs','src/actual.js']),/Tracked module path/,source);
  }
  for(const [source,compilationProfile]of [['#[cfg(test)]#[path="actual.rs"]mod child;',{flags:{test:false}}],['#[cfg(unix)]#[path="actual.rs"]mod child;',{flags:{test:false}}]])assert.throws(()=>plan(module(source,{compilationProfile}),['src/actual.rs']),/condition/);
});

test('module plans reject changed source items paths profiles and caller fragments',()=>{
  const owner=module('#[path="actual.rs"]mod child;'),original=item(owner),paths=[owner.file,'src/actual.rs'];
  for(const [candidate,declaration]of [[{...owner,source:owner.source+' '},original],[{...owner,file:'src/other.rs'},original],[{...owner,compilationProfile:{flags:{test:false}}},original],[owner,{...original,name:'invented'}],[owner,{...original,tokens:[]}],[{...owner,source:owner.source.slice(original.start,original.end),sourceView:structuredClone(owner.sourceView)},original]])assert.throws(()=>planTrackedModulePath(candidate,declaration,paths),/match|changed|unsealed|differs/);
  assert.throws(()=>planTrackedModulePath(owner,original,['src/actual.rs']),/not tracked/);
  assert.throws(()=>planTrackedModulePath(owner,original,[owner.file,'../actual.rs']),/canonical/);
});

test('all five unchanged deployment path declarations select their complete original tracked files',()=>{
  const file='src/deploy.rs',source=readFileSync(repositorySourceURL(file,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(hash(source),'0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a');
  const owner=module(source,{file,path:['deploy'],directory:'src/deploy',pathDirectory:'src'});
  const declarations=originalSourceModuleItems(owner).filter(entry=>entry.term==='mod'&&entry.tokens.some(token=>token.text==='path'));
  const names=['instance','registry','runtime','step','operations'],paths=[file,...names.map(name=>`src/deploy/${name}.rs`)];
  assert.equal(declarations.length,5);
  for(const [index,declaration]of declarations.entries()){
    const selected=planTrackedModulePath(owner,declaration,paths);assert.equal(selected.name,names[index]);assert.equal(selected.target,paths[index+1]);assert.equal(selected.directory,'src/deploy');assert.equal(selected.sourceSha256,hash(source));
    assert.equal(selected.declarationSha256,hash(source.slice(declaration.start,declaration.end)));assert.equal(isTrackedModulePathPlan(selected),true);
  }
});
