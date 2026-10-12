import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens,originalMethodMember,originalMethodLowering} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform,isOriginalMethodTokenTransform,originalMethodTransformFacts,originalMethodTransformForTokens,originalMethodTokenTransformSnapshot} from '../source-method-transforms.mjs';
function fixture(source,path=[]) {
  const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView})),context=createMatchesMacroContext({modules}),module=modules.find(module=>JSON.stringify(module.path)===JSON.stringify(path));
  const extracted=extractImplDeclarations(source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView}),method=extracted.implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...module.path,...method.typePath]);
  return {source,context,module,method,lowered};
}
test('genuine original shared member and every self/Self output token keep exact source lineage',()=>{
  const row=fixture('pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{let text="Self self";self.value}}'),proof=createOriginalMethodTokenTransform(row.context,row.method,row.lowered),state=originalMethodTransformFacts(proof);
  const external=registeredStandardHostBindings();assert.ok([...external.values()].every(table=>table.complete===false));assert.ok(external.has('std::option'));assert.equal([...external.keys()].some(path=>path.startsWith('Router')),false);
  assert.equal(isOriginalMethodTokenTransform(proof),true);assert.equal(originalMethodTransformForTokens(row.lowered.tokens),proof);assert.equal(state.method,row.method);
  assert.equal(row.source.slice(proof.originalMemberSpan.start,proof.originalMemberSpan.end),row.method.source);assert.equal(row.source.slice(proof.originalBodySpan.start,proof.originalBodySpan.end),'{let text="Self self";self.value}');
  assert.equal(proof.map.length,row.lowered.tokens.length);assert.ok(proof.operations.some(operation=>operation.kind==='shared-receiver-parameter'));assert.ok(proof.operations.some(operation=>operation.kind==='receiver-use'));
  assert.equal(row.lowered.tokens.find(token=>token.kind==='string').value,'Self self');
  for(const item of proof.map)for(const index of item.originalIndices)assert.ok(index>=0&&index<state.original.length);
  for(const flag of ['parsedSourceAssociation','copyAuthority','namespaceAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(proof[flag],false,flag);
});
test('static and inline original Self qualification uses the actual nominal owner without a body template',()=>{
  const row=fixture('mod child{pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}}}',['child']),proof=createOriginalMethodTokenTransform(row.context,row.method,row.lowered);
  assert.deepEqual(proof.owner.owner,['crate','child','Counter']);assert.equal(proof.receiver,null);assert.equal(proof.operations.filter(operation=>operation.kind==='inherent-self-type').length,2);
  for(const operation of proof.operations)assert.equal(row.source.slice(operation.originalSpan.start,operation.originalSpan.end),'Self');
});
test('copied changed token member and resealed public snapshots never issue source transformation authority',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),proof=createOriginalMethodTokenTransform(row.context,row.method,row.lowered);
  assert.equal(isOriginalMethodTokenTransform(structuredClone(proof)),false);assert.equal(isOriginalMethodTokenTransform(originalMethodTokenTransformSnapshot(proof)),false);
  assert.throws(()=>originalMethodMember(structuredClone(row.method)),/unsealed|copied/);assert.throws(()=>originalMethodLowering(structuredClone(row.lowered)),/unsealed|copied/);assert.throws(()=>createOriginalMethodTokenTransform(structuredClone(row.context),row.method,row.lowered),/private module context/);
  const changed=fixture(row.source);changed.method.source=changed.method.source.replace('self.value','0');assert.throws(()=>createOriginalMethodTokenTransform(changed.context,changed.method,changed.lowered),/changed/);
  const tokens=fixture(row.source),sealed=createOriginalMethodTokenTransform(tokens.context,tokens.method,tokens.lowered);tokens.lowered.tokens.find(token=>token.value==='value').value='other';assert.throws(()=>originalMethodTransformFacts(sealed),/changed/);
  assert.equal(originalMethodTransformForTokens(structuredClone(row.lowered.tokens)),null);
});
test('namespace-forged different views mutable and trait obligations stay refused',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),other=fixture('struct Counter{other:u8}impl Counter{fn read(&self)->u8{self.other}}');
  assert.throws(()=>createOriginalMethodTokenTransform(other.context,row.method,row.lowered),/identity differs/);
  const untracked=extractImplDeclarations(row.source,{sourcePath:'src/lib.rs'}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(untracked,['crate','Counter']);assert.throws(()=>createOriginalMethodTokenTransform(row.context,untracked,lowered),/unsealed/);
  for(const source of ['struct Counter{value:u8}impl Counter{fn write(&mut self){self.value=1;}}','struct Counter;trait Read{fn read(&self)->u8;}impl Read for Counter{fn read(&self)->u8{0}}']) {
    const views=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView:views.views[0]}).implementations[0].methods[0];assert.throws(()=>lowerSharedMethodTokens(method,['crate','Counter']),/obligations remain unresolved/);
  }
});
