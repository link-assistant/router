// Independent bookkeeping cases; no parser or translator permission asserted.
// SOURCE ONLY: none executed during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectedScopeObservationId,reconcileCollectedScopeBatch,collectedScopeEvidencePaths} from '../collected-scope-reconciliation-20261103.mjs';
const revision='a'.repeat(40),origin=(path,blob='b'.repeat(40))=>({revision,path,blob,mode:'100644',bytes:200});
const input=origin('rust/src/lib.rs'),runtime=origin('js/src/runtime.mjs'),typed=origin('ts/src/runtime.mts'),compiler=origin('tools/translation/project.mjs'),caseSource=origin('rust/tests/oracle.rs');
const observation=(changes={})=>({origin:input,kind:'parsed-function',name:'route',owner:[{kind:'module',name:'router'}],span:{unit:'utf16',start:10,end:90,byteStart:10,byteEnd:92},original:'complete original function source',condition:{module:'active',item:'active'},role:'unclassified',producerExpansion:null,unresolved:['actual-Cargo-unit-and-source-role-review'],...changes});
function assignment(row=observation()){
 return {observation:collectedScopeObservationId(row),role:'application',reviewStatus:'REVIEWED',requirements:['L02','F01','V02','T01'],implementations:[{path:compiler.path,symbol:'translateProject',span:[10,40]}],lanes:{forwardJavaScript:{status:'required',paths:[runtime.path]},strictTypeScript:{status:'required',paths:[typed.path]},reverseRust:{status:'required',paths:[input.path]},synchronization:{status:'required',paths:[]}},independentCases:[caseSource.path],unresolved:['complete-synchronization-and-receiving-still-open'],evidence:[input,runtime,typed,compiler,caseSource]};
}
const sources=[input,runtime,typed,compiler,caseSource];
test('same-spelling original/parsed/trait/impl/inline/closure/configuration observations remain distinct DATA',()=>{
 const rows=[observation(),observation({kind:'original-fn'}),observation({owner:[{kind:'trait',name:'Route'}]}),observation({owner:[{kind:'impl',name:'Route'}]}),observation({owner:[{kind:'module',name:'inline'}]}),observation({kind:'parsed-Closure',name:null}),observation({condition:{module:'unknown',item:'unknown'}})];
 assert.equal(new Set(rows.map(collectedScopeObservationId)).size,7);
 const result=reconcileCollectedScopeBatch({sources,observations:rows});assert.equal(result.observations,7);assert.equal(result.unassignedObservations,7);assert.equal(result.productionFunctionDenominator,null);assert.equal(result.translationCoverage,null);assert.equal(result.draftedRequirements,null);assert.equal(result.semanticAuthority,false);
 assert.throws(()=>reconcileCollectedScopeBatch({sources,observations:[rows[0],rows[0]]}));
});
test('every lane and independent case source participates in staleness, not only implementation files',()=>{
 for(const changed of [runtime,typed,compiler,caseSource]){
  const current=sources.map(row=>row.path===changed.path?{...row,blob:'c'.repeat(40)}:row);
  const result=reconcileCollectedScopeBatch({sources:current,observations:[observation()],assignments:[assignment()]});
  assert.equal(result.assignedObservations,1);assert.equal(result.staleObservations,1);assert.deepEqual(result.rows[0].staleEvidence,[changed.path]);
 }
 const removed=reconcileCollectedScopeBatch({sources:sources.filter(row=>row!==caseSource),observations:[observation()],assignments:[assignment()]});assert.deepEqual(removed.rows[0].staleEvidence,[caseSource.path]);
});
test('revision changes retain physical bookkeeping joins while changed source never inherits an assignment',()=>{
 const next='d'.repeat(40),current=sources.map(row=>({...row,revision:next})),row=observation({origin:{...input,revision:next}});
 assert.equal(collectedScopeObservationId(row),collectedScopeObservationId(observation()));
 const joined=reconcileCollectedScopeBatch({sources:current,observations:[row],assignments:[assignment()]});assert.equal(joined.staleObservations,0);assert.equal(joined.assignedObservations,1);
 assert.ok(joined.rows[0].unresolved.includes('actual-Cargo-unit-and-source-role-review'));
 const changed={...row,origin:{...row.origin,blob:'e'.repeat(40)}};
 const different=reconcileCollectedScopeBatch({sources:current.map(value=>value.path===input.path?changed.origin:value),observations:[changed],assignments:[assignment()]});assert.equal(different.assignedObservations,0);assert.equal(different.unassignedObservations,1);
});
test('unknown producer expansions and refused syntax cannot become completed coverage from reviewed public flags',()=>{
 const row=observation({kind:'attribute-producer',producerExpansion:'unknown',nativeScope:'REFUSED'}),mapping=assignment(row);
 const result=reconcileCollectedScopeBatch({sources,observations:[row],assignments:[mapping]});assert.equal(result.unresolvedObservations,1);assert.ok(result.rows[0].unresolved.includes('complete-original-producer-input-expansion-output-closure-unproved'));assert.equal(result.rows[0].semanticAuthority,false);assert.equal(result.verification,'UNRUN');
});
test('missing origins, duplicate/unknown assignments, bad spans and getter payloads refuse',()=>{
 const mapping=assignment();assert.deepEqual(collectedScopeEvidencePaths([mapping]),sources.map(row=>row.path).sort());
 for(const changed of [{...mapping,evidence:mapping.evidence.filter(row=>row!==caseSource)},{...mapping,requirements:['L99']},{...mapping,implementations:[{path:compiler.path,symbol:'translateProject',span:[0,201]}]},{...mapping,lanes:{}},{...mapping,implementations:[]}])assert.throws(()=>collectedScopeEvidencePaths([changed]));
 assert.throws(()=>collectedScopeEvidencePaths([mapping,mapping]));assert.throws(()=>reconcileCollectedScopeBatch({sources,observations:[observation({origin:{...input,blob:'f'.repeat(40)}})]}));
 let observed=0;const hostile={get origin(){observed++;throw Error('getter must not execute');}};assert.throws(()=>collectedScopeObservationId(hostile));assert.equal(observed,0);
});
