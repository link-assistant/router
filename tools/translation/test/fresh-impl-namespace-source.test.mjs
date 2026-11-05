// Current complete native resolver source witness cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {originalImplNamespaceSourcePlan,freshOriginalImplNamespaceSourcePlan,requireOriginalImplNamespaceSourcePlan} from '../derive-ancestor-attribute-scope.mjs';
import {withFreshImplNamespaceSource} from '../fresh-impl-namespace-source.mjs';
import {prepareFreshImplNamespaceSources} from '../prepare-fresh-impl-namespace-sources.mjs';
const limits={timeout:60000},sourceRoot=fileURLToPath(new URL('../source-profiles/derive-ancestor-scope/',import.meta.url));
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-fresh-impl-namespace-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const name of ['manifest.json','rust-build-reduced-graph.rs.gz'])copyFileSync(join(sourceRoot,name),join(directory,name));return directory;
}
test('fresh private source plans retain the complete original recipes without sharing inventories',limits,()=>{
 const old=originalImplNamespaceSourcePlan(),first=freshOriginalImplNamespaceSourcePlan(),second=freshOriginalImplNamespaceSourcePlan();
 assert.deepEqual(first,old);assert.deepEqual(second,old);assert.notStrictEqual(first,second);assert.notStrictEqual(first.selections.item,second.selections.item);
 assert.strictEqual(requireOriginalImplNamespaceSourcePlan(first),first);assert.throws(()=>requireOriginalImplNamespaceSourcePlan(structuredClone(first)));
 assert.equal(first.namespaceAuthority,false);assert.equal(first.runtimeAuthority,false);assert.equal(first.wholeCompilerExecuted,false);
 assert.deepEqual(Object.keys(first.selections).sort(),['associated','block','item']);assert.equal(first.recipes.length,4);
 assert.ok(first.selections.associated.original.includes('AssocCtxt::Trait'));assert.ok(first.selections.block.original.includes('self.parent_scope.module = orig_current_module'));
});
test('the independent DATA reader reconstructs the full pinned native Rust source',limits,t=>{
 const directory=fixture(t),frame=withFreshImplNamespaceSource(value=>value,{directory});assert.equal(frame.path,'compiler/rustc_resolve/src/build_reduced_graph.rs');assert.equal(Buffer.byteLength(frame.source),65553);assert.ok(frame.source.includes('fn build_reduced_graph_for_item'));assert.equal(frame.sourceAuthority,false);assert.equal(frame.namespaceAuthority,false);assert.equal(frame.runtimeAuthority,false);assert.ok(Object.isFrozen(frame));
});
test('changed manifests and compressed source bytes are rejected before a callback',limits,t=>{
 const directory=fixture(t);for(const name of ['manifest.json','rust-build-reduced-graph.rs.gz']){
  const path=join(directory,name),original=readFileSync(path),changed=Buffer.from(original);changed[changed.length-1]^=1;writeFileSync(path,changed);let called=false;assert.throws(()=>withFreshImplNamespaceSource(()=>{called=true;},{directory}));assert.equal(called,false);writeFileSync(path,original);
 }
});
test('source changes inside the operation fail its fresh closing fence',limits,t=>{
 for(const name of ['manifest.json','rust-build-reduced-graph.rs.gz']){
  const directory=fixture(t),path=join(directory,name),original=readFileSync(path);assert.throws(()=>withFreshImplNamespaceSource(()=>{writeFileSync(path,Buffer.concat([original,Buffer.from('changed')]));return 'unqualified';},{directory}));
 }
});
test('fresh reads reject changes between operations instead of reusing a source result',limits,t=>{
 const directory=fixture(t),path=join(directory,'rust-build-reduced-graph.rs.gz');assert.equal(withFreshImplNamespaceSource(frame=>frame.source.length,{directory}),65553);const bytes=readFileSync(path);writeFileSync(path,bytes.subarray(0,bytes.length-1));assert.throws(()=>withFreshImplNamespaceSource(frame=>frame.source.length,{directory}));
});
test('callback errors are preserved and asynchronous callbacks cannot escape the source fence',limits,t=>{
 const directory=fixture(t),sentinel=new Error('independent caller failure');assert.throws(()=>withFreshImplNamespaceSource(()=>{throw sentinel;},{directory}),error=>error===sentinel);assert.throws(()=>withFreshImplNamespaceSource(()=>Promise.resolve('later'),{directory}),/finish synchronously/u);assert.throws(()=>withFreshImplNamespaceSource(null,{directory}));assert.throws(()=>withFreshImplNamespaceSource(()=>true,{directory:17}));
});
test('fifteen complete source equations preserve CST inverses and exact phase order',limits,()=>{
 const plan=prepareFreshImplNamespaceSources();assert.equal(plan.files.length,15);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
