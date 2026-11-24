import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {isSourceModuleView,originalSourceModuleItems,moduleScopeKey} from '../source-module-views.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const options=(sources,profile=null)=>({entry:'src/lib.rs',paths:Object.keys(sources),readSource:path=>sources[path],compilationProfile:profile});
const project=(source,profile=null)=>translateProject(options({'src/lib.rs':source},profile));

test('inline graph retains one complete original file and distinct original module identities',()=>{
  const source='pub const ROOT:u8=1;mod outer {pub const OUTER:u8=2;pub mod child {pub const CHILD:u8=3;}}';
  const graph=resolveModuleGraph(options({'src/lib.rs':source}));assert.deepEqual(graph.diagnostics,[]);
  assert.deepEqual(graph.modules.map(module=>module.path),[[],['outer'],['outer','child']]);
  assert.equal(new Set(graph.modules.map(moduleScopeKey)).size,3);assert.equal(new Set(graph.modules.map(module=>module.offset)).size,1);
  assert.deepEqual(graph.modules.map(module=>module.items.filter(item=>item.term==='const').map(item=>item.name)),[['ROOT'],['OUTER'],['CHILD']]);
  for(const module of graph.modules){assert.equal(module.source,source);assert.equal(isSourceModuleView(module.sourceView),true);for(const item of originalSourceModuleItems(module))for(const token of item.tokens)assert.equal(source.slice(token.start,token.end),token.text);}
  assert.equal(graph.edges.length,2);assert.ok(graph.edges.every(edge=>edge.kind==='original-inline-module'&&edge.from===edge.to));
});

test('sibling inline constants and calls keep separate namespaces in JavaScript and strict TypeScript',{timeout:30_000},async()=>{
  const source='mod left {pub const VALUE:u8=3;pub fn get()->u8{VALUE}}mod right {pub const VALUE:u8=9;pub fn get()->u8{VALUE}}pub fn total()->u8{left::get()+right::get()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.executable.length,5);
  await verifyTypedTargets(result,api=>{assert.equal(api['left.VALUE'],3n);assert.equal(api['right.VALUE'],9n);assert.equal(api['left.get'](),3n);assert.equal(api['right.get'](),9n);assert.equal(api.total(),12n);});
});

test('inline super reexports resolve original parent values and child external-file directories',{timeout:30_000},async()=>{
  const sources={'src/lib.rs':'pub const LIMIT:u8=7;pub mod outer {pub use super::LIMIT as LOCAL;pub mod child;pub fn own()->u8{LOCAL}}pub fn result()->u8{outer::child::value()}',
    'src/outer/child.rs':'pub fn value()->u8{super::LOCAL}'};
  const result=translateProject(options(sources));assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.moduleDiagnostics,[]);
  assert.ok(result.meta.moduleEdges.some(edge=>edge.to==='src/outer/child.rs'&&edge.module.join('.')==='outer.child'));
  await verifyTypedTargets(result,api=>{assert.equal(api['outer.LOCAL'],undefined);assert.equal(api['outer.own'](),7n);assert.equal(api['outer.child.value'](),7n);assert.equal(api.result(),7n);});
});

test('qualified module aliases and parent value reexports retain their original source owners',{timeout:30_000},async()=>{
  const source='pub const ROOT:u8=7;pub mod outer {pub use super::ROOT as LOCAL;pub mod facade {pub use super::LOCAL as EXPORTED;}pub mod child {pub fn read()->u8{super::LOCAL+super::super::ROOT}}}pub use outer as API;pub fn result()->u8{API::facade::EXPORTED+crate::outer::child::read()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api['outer.child.read'](),14n);assert.equal(api.result(),21n);});
});

test('qualified sibling access retains private and restricted source visibility',()=>{
  for(const visibility of ['', 'pub(self) ', 'pub(in crate::left) ']){
    const source=`mod left {${visibility}const SECRET:u8=7;pub fn own()->u8{SECRET}}pub fn invalid()->u8{crate::left::SECRET}`;
    const result=project(source);
    assert.equal(result.meta.executable.some(item=>item.name==='invalid'),false,visibility);
    assert.ok(result.meta.refused.some(item=>item.name==='invalid'&&item.message.includes('ml_inaccessible_source_binding')),visibility);
    assert.equal(result.meta.executable.some(item=>item.name==='left.own'),true,visibility);
  }
});

test('original inline impl extraction does not retag parent or sibling implementations',()=>{
  const source='struct Root;impl Root {pub fn root()->u8{1}}mod child {pub struct Child;impl Child {pub fn child()->u8{2}}}';
  const graph=resolveModuleGraph(options({'src/lib.rs':source}));
  for(const [index,name]of ['Root','Child'].entries()){
    const module=graph.modules[index],result=extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:module.compilationProfile});
    assert.equal(result.implementations.length,1);assert.deepEqual(result.implementations[0].typePath,[name]);assert.deepEqual(result.implementations[0].modulePath,module.path);
    const item=module.items.find(item=>item.term==='impl');assert.deepEqual(result.implementations[0].span,{start:item.start,end:item.end});
  }
});

test('inline inactive and unknown compilation conditions never acquire executable children',()=>{
  const source='#[cfg(test)] mod tests {pub const HIDDEN:u8=1;}#[cfg(unix)]mod platform {pub const UNKNOWN:u8=2;}pub fn independent()->u8{3}';
  const result=project(source,{flags:{test:false}});
  assert.equal(result.meta.executable.some(item=>item.name.includes('HIDDEN')||item.name.includes('UNKNOWN')),false);
  assert.ok(result.meta.refused.some(item=>item.term==='module'&&item.message.includes('unknown')));
  assert.equal(result.meta.executable.some(item=>item.name==='independent'),true);
});

test('unknown enclosing attributes retain the original module expansion obligation',()=>{
  const source='#[replace_module]pub mod child {pub const VALUE:u8=7;pub fn body()->u8{VALUE}}pub fn caller()->u8{child::body()}';
  const result=project(source);assert.equal(result.meta.executable.length,0);
  assert.ok(result.meta.moduleDiagnostics.some(entry=>entry.message.includes('attribute owner')));assert.ok(result.meta.refused.some(entry=>entry.name==='caller'));
});

test('inline tool prefix shadowing and nested exported-macro uncertainty stay visible',()=>{
  const shadow=project('mod rustfmt {}mod child {#[rustfmt::skip]pub fn value()->u8{3}}');
  assert.equal(shadow.meta.executable.some(entry=>entry.name==='child.value'),false);
  const expanded=project('mod child {#[unknown]pub struct Record;}pub fn independent()->u8{3}');
  assert.equal(expanded.meta.bindingEvidence.scopes.find(scope=>scope.path.length===0).unresolvedBangMacroScope,true);
  assert.equal(expanded.meta.runtimeParity,false);
});

test('whole unchanged diagnostic module translates all 18 original reason constants through semantic meta',{timeout:30_000},async()=>{
  const path='src/auth_diagnostics.rs',source=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(hash(source),'4adfdd83495f6cadeb33c3c17658134c4e6a3a7947cb1c733f92bde63dd9690a');
  const result=translateProject({entry:path,paths:[path],readSource:()=>source});
  const reason=result.meta.executable.filter(entry=>entry.name.startsWith('reason.'));
  assert.equal(reason.length,18);assert.ok(reason.every(entry=>entry.term==='const'&&entry.source===path));
  const expected={MISSING_CREDENTIAL:'missing_credential',INVALID_PREFIX:'invalid_prefix',MALFORMED:'malformed',SIGNATURE_INVALID:'signature_invalid',ISSUER_SECRET_UNSET:'issuer_secret_unset',EXPIRED:'expired',REVOKED:'revoked',MISSING_RECORD:'missing_record',BINDING_MISMATCH:'binding_mismatch',REQUEST_BUDGET:'request_budget',TOKEN_BUDGET:'token_budget',RATE_LIMIT:'rate_limit',MODEL_POLICY:'model_policy',INSUFFICIENT_SCOPE:'insufficient_scope',RUN_LEASE_UNRENEWABLE:'run_lease_unrenewable',UNSUPPORTED_LEASE_ENDPOINT:'unsupported_lease_endpoint',STORAGE:'storage',NOT_FOUND:'not_found'};
  await verifyTypedTargets(result,api=>{for(const [name,value]of Object.entries(expected))assert.equal(api['reason.'+name],value);});
  assert.ok(result.meta.refused.length);assert.equal(result.meta.runtimeParity,false);
});

test('deduplicated standard generic layouts retain both sibling original Copy owner scopes',{timeout:30_000},async()=>{
  const leaf='#[derive(Clone,Copy)]pub struct Item{pub value:Option<u8>}impl Item{pub fn get(self)->Option<u8>{self.value}}';
  const source=`mod outer {pub mod left {${leaf}}pub mod right {${leaf}}}pub fn left()->u8{outer::left::Item{value:Some(3)}.get().unwrap_or(0)}pub fn right()->u8{outer::right::Item{value:Some(9)}.get().unwrap_or(0)}`;
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  assert.deepEqual(result.meta.checkedMethods.map(method=>method.name).sort(),['outer.left.Item.get','outer.right.Item.get']);
  await verifyTypedTargets(result,api=>{assert.equal(api.left(),3n);assert.equal(api.right(),9n);});
});

test('external-file inline generic method wrappers retain their actual source owner',{timeout:30_000},async()=>{
  const sources={'src/lib.rs':'mod outer;pub fn result()->u8{outer::inner::Item{value:Some(5)}.get().unwrap_or(0)}',
    'src/outer.rs':'pub mod inner {#[derive(Clone,Copy)]pub struct Item{pub value:Option<u8>}impl Item{pub fn get(self)->Option<u8>{self.value}}}'};
  const result=translateProject(options(sources));assert.deepEqual(result.meta.refused,[]);
  assert.equal(result.meta.checkedMethods.length,1);assert.equal(result.meta.checkedMethods[0].name,'outer.inner.Item.get');assert.equal(result.meta.checkedMethods[0].source,'src/outer.rs');
  await verifyTypedTargets(result,api=>assert.equal(api.result(),5n));
});
