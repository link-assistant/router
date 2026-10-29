// Complete fresh multi-source conditional/enum namespace witness cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {freshOriginalConditionalAncestorSourcePlan,originalConditionalAncestorSourcePlan,requireOriginalConditionalAncestorSourcePlan,freshOriginalEnumNamespaceSourcePlan,originalEnumNamespaceSourcePlan,requireOriginalEnumNamespaceSourcePlan} from '../derive-ancestor-attribute-scope.mjs';
import {withFreshAncestorNamespaceSources} from '../fresh-ancestor-namespace-source.mjs';
import {withFreshImplNamespaceSource} from '../fresh-impl-namespace-source.mjs';
import {originalEnumNamespaceSourcePlan as publicHeaderPlan} from '../enum-namespace-header.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveEnclosingNamespaceModuleBindings,resolveModuleBindings} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareFreshAncestorNamespaceSources} from '../prepare-fresh-ancestor-namespace-sources.mjs';
const limits={timeout:60000},sourceRoot=fileURLToPath(new URL('../source-profiles/derive-ancestor-scope/',import.meta.url)),manifest=JSON.parse(readFileSync(join(sourceRoot,'manifest.json'),'utf8')),graph='compiler/rustc_resolve/src/build_reduced_graph.rs',conditional=manifest.sources.filter(row=>row.path.endsWith('.rs')&&row.path!=='compiler/rustc_feature/src/builtin_attrs.rs').map(row=>row.path);
function fixture(t){
 const parent=mkdtempSync(join(tmpdir(),'router-fresh-ancestor-')),directory=join(parent,'source-profiles','derive-ancestor-scope');mkdirSync(directory,{recursive:true});t.after(()=>rmSync(parent,{recursive:true,force:true}));copyFileSync(join(sourceRoot,'manifest.json'),join(directory,'manifest.json'));
 for(const pin of manifest.sources){const target=resolve(directory,pin.archive);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(sourceRoot,pin.archive),target);}return directory;
}
test('fresh enum and conditional plans keep every complete original recipe and private identity',limits,()=>{
 for(const [fresh,old,requirePlan]of [[freshOriginalConditionalAncestorSourcePlan,originalConditionalAncestorSourcePlan,requireOriginalConditionalAncestorSourcePlan],[freshOriginalEnumNamespaceSourcePlan,originalEnumNamespaceSourcePlan,requireOriginalEnumNamespaceSourcePlan]]){
  const first=fresh(),second=fresh();assert.deepEqual(first,old());assert.deepEqual(second,first);assert.notStrictEqual(first,second);assert.strictEqual(requirePlan(first),first);assert.throws(()=>requirePlan(structuredClone(first)));assert.equal(first.namespaceAuthority,false);assert.equal(first.runtimeAuthority,false);assert.equal(first.wholeCompilerExecuted,false);
 }
 assert.strictEqual(publicHeaderPlan,originalEnumNamespaceSourcePlan);
});
test('the conditional witness retains every original global macro and unresolved branch obligation',limits,()=>{
 const plan=freshOriginalConditionalAncestorSourcePlan();assert.equal(plan.recipes.length,16);assert.equal(Object.keys(plan.selections).length,12);assert.deepEqual(plan.cfgBranches,['absent','unchanged original present module']);assert.ok(plan.retainedUncompiledBranches.includes('unknown global bang exports'));assert.ok(plan.retainedUncompiledBranches.includes('compile_macro builtin replacement'));assert.ok(plan.retainedUncompiledBranches.includes('conditional availability'));assert.ok(plan.selections.defineMacro.original.includes('self.r.graph_root'));
});
test('the multi-source DATA reader reconstructs all seven complete conditional sources',limits,t=>{
 const directory=fixture(t),frame=withFreshAncestorNamespaceSources(conditional,value=>value,{directory});assert.equal(frame.sources.length,7);assert.deepEqual(frame.sources.map(row=>row.path),conditional);assert.equal(frame.sourceAuthority,false);assert.equal(frame.namespaceAuthority,false);assert.ok(Object.isFrozen(frame.sources));for(const row of frame.sources){const pin=manifest.sources.find(pin=>pin.path===row.path);assert.equal(Buffer.byteLength(row.source),pin.bytes);assert.ok(Object.isFrozen(row));}
 assert.equal(withFreshImplNamespaceSource(frame=>frame.source.length,{directory}),65553);
});
test('any selected archive changed before entry or inside the operation is refused',limits,t=>{
 for(const phase of ['before','during']){
  const directory=fixture(t),pin=manifest.sources.find(row=>row.path==='compiler/rustc_expand/src/config.rs'),path=resolve(directory,pin.archive),bytes=readFileSync(path),changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  if(phase==='before')writeFileSync(path,changed);
  assert.throws(()=>withFreshAncestorNamespaceSources(conditional,()=>{if(phase==='during')writeFileSync(path,changed);return 'not-qualified';},{directory}));
 }
});
test('a selected source cannot reuse a prior operation after a current archive change',limits,t=>{
 const directory=fixture(t);assert.equal(withFreshAncestorNamespaceSources([graph],frame=>frame.sources.length,{directory}),1);const pin=manifest.sources.find(row=>row.path===graph),path=resolve(directory,pin.archive),bytes=readFileSync(path);writeFileSync(path,bytes.subarray(0,bytes.length-1));assert.throws(()=>withFreshAncestorNamespaceSources([graph],frame=>frame.sources.length,{directory}));
});
test('unknown repeated license and asynchronous source requests remain refused',limits,t=>{
 const directory=fixture(t);for(const paths of [[],[graph,graph],['missing.rs'],['LICENSE-MIT'],Array(9).fill(graph)])assert.throws(()=>withFreshAncestorNamespaceSources(paths,()=>true,{directory}));assert.throws(()=>withFreshAncestorNamespaceSources([graph],()=>Promise.resolve('later'),{directory}),/finish synchronously/u);
});
test('actual enum namespace resolution preserves independent generic and constructor boundaries',limits,()=>{
 const source='pub enum Carrier<T>{Value(T),Empty,Record{value:T}} use crate::Carrier::{Value as Present,Empty,Record};',capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),input={modules:capture.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),compilationProfile:PRODUCTION_PROFILE},result=resolveEnclosingNamespaceModuleBindings(input),scope=result.scopes.find(row=>row.path.length===0);
 for(const name of ['Present','Empty'])for(const namespace of ['type','value'])assert.equal(scope.bindings.find(row=>row.name===name&&row.namespace===namespace)?.status,'resolved');assert.equal(scope.bindings.some(row=>row.name==='Record'&&row.namespace==='value'),false);assert.ok(resolveModuleBindings(input).scopes.some(row=>row.unresolvedTypeScope));
});
test('seven complete ancestor equations retain source inverses and the two fixed phases',limits,()=>{
 const plan=prepareFreshAncestorNamespaceSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
