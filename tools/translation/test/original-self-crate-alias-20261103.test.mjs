// Genuine source graph/binding grammar and source ancestry cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {requireOriginalSelfCrateAlias} from '../original-self-crate-alias-20261103.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readSourceProfileFileSync} from '../ordered-text-map-callers-20261102-source-storage.mjs';
function input(source){
 const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});
 const module=graph.modules[0],scope=bindings.scopes.find(scope=>scope.file===module.file&&scope.path.length===0),item=originalSourceModuleItems(module).find(item=>item.term==='extern');
 return {modules:graph.modules,sourceScopes:bindings.scopes,compilationProfile:PRODUCTION_PROFILE,module,scope,item};
}
test('actual self crate declaration rejoins its genuine own-root binding',{timeout:60000},()=>{
 for(const source of ['extern crate self as link_assistant_router;','pub(crate) extern crate self as router;']){
  const value=input(source),result=requireOriginalSelfCrateAlias(value);assert.equal(result.target,'crate');assert.equal(result.externalDependencyIdentity,false);assert.equal(result.invokedCompilerIdentity,false);assert.equal(result.semanticAuthority,false);
  assert.throws(()=>requireOriginalSelfCrateAlias({...value,sourceScopes:JSON.parse(JSON.stringify(value.sourceScopes))}));
  assert.throws(()=>requireOriginalSelfCrateAlias({...value,item:{...value.item}}));
 }
});
test('external crates builtin shadow malformed declarations and unknown producers remain refused',{timeout:60000},()=>{
 for(const source of ['extern crate alloc as allocator;','extern crate self as std;','extern crate self as String;','extern crate self as router; unknown!();'])assert.throws(()=>requireOriginalSelfCrateAlias(input(source)));
 assert.throws(()=>requireOriginalSelfCrateAlias({modules:[],sourceScopes:[],scope:{},module:{},item:{}}));
});
test('both complete native context successors retain serialized CST and inverse',{timeout:60000},()=>{
 const value=JSON.parse(gunzipSync(readSourceProfileFileSync(new URL('../source-profiles/original-self-crate-alias-20261103/complete-source.json.gz',import.meta.url)),{maxOutputLength:1048576}).toString('utf8'));assert.equal(value.rows.length,2);
 for(const row of value.rows){const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];assert.equal(history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,row.after);assert.deepEqual(row.sequences.map(sequence=>sequence.phase),['language','repository']);}
});
