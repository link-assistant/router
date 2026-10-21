import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareClosedJsonDagObservers} from '../prepare-closed-json-dag-observers.mjs';
import {transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url);

test('four complete observer copies preserve original bodies deadlines native import aliases and full CST inverses',{timeout:60000},()=>{
 const plan=prepareClosedJsonDagObservers();assert.equal(plan.files.length,4);assert.equal(plan.originalWorkloadsChanged,false);assert.equal(plan.originalLimitsChanged,false);assert.equal(plan.observationDataOnly,true);assert.equal(plan.runtimeQualified,false);assert.equal(plan.sourceAuthority,false);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.selection.wholeBodiesAndDeadlinesUnchanged,true);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(value=>value.phase),['language','repository']);
  const restored=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(row.afterMeta).document,row.inverseSequence);assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source,row.before);
  let value=row.before,last=0;for(const edit of [...row.selection.edits].sort((a,b)=>a.span[0]-b.span[0])){assert.ok(edit.span[0]>=last);assert.equal(value.slice(...edit.span),edit.expected);last=edit.span[1];}
  for(const binding of row.selection.bindings){assert.match(binding.before,/CompleteJsonProjectionHookWire/u);assert.match(binding.after,/CompleteClosedJsonDagHookWire/u);assert.match(binding.local,/CompleteIndexedHookWire/u);}
 }
});

test('fresh source plans retain every original byte and refuse undeclared changes in a complete receiving file',{timeout:60000},t=>{
 const first=prepareClosedJsonDagObservers(),second=prepareClosedJsonDagObservers();assert.deepEqual(second,first);for(const input of first.inputs)assert.equal(readFileSync(new URL(input.path,root),'utf8'),input.source);
 const directory=mkdtempSync(join(tmpdir(),'router-closed-json-dag-observer-adapters-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const row of [...first.inputs,...first.files.map(value=>({path:value.path,source:value.after}))]){const path=join(directory,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}
 assert.deepEqual(prepareClosedJsonDagObservers({root:directory}).files.map(row=>row.after),first.files.map(row=>row.after));const target=join(directory,first.files[0].path);writeFileSync(target,first.files[0].after+'\n// undeclared body change\n');assert.throws(()=>prepareClosedJsonDagObservers({root:directory}),/current whole receiving source differs/u);
 for(const row of first.files)assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.after);
});
