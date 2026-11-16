// Automatic native candidate census and whole-module inverse cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeNativeOwnedTextVectorDiscovery as discover} from '../native-owned-text-vector-discovery.mjs';
import {prepareOwnedTextVectorNativeDiscoverySources} from '../prepare-owned-text-vector-native-discovery-sources.mjs';
const limits={timeout:60000},row=(source,path='rust/src/caller.rs')=>({path,source});
test('automatically discovers two independent constructors and composes complete preceding source',limits,()=>{
 const source='fn collect(input: String)->Vec<String>{let mut first=Vec::new();first.push(input);let values=vec![];values}',result=discover([row(source)]);assert.equal(result.lexicalCandidates,2);assert.equal(result.sourceProposals,2);assert.equal(result.steps[1].files[0].before,result.steps[0].files[0].after);assert.equal(result.observations[0].local,'first');assert.equal(result.observations[1].local,'values');assert.equal(result.observations[0].coordinates,'original-supplied-module');assert.equal(result.observations[1].currentCoordinates,'complete-step-input-module');assert.equal(result.files[0].history.inverse,source);assert.equal(result.files[0].inverse,source);assert.equal(result.changedFiles,1);assert.equal(result.semanticReissueQualified,false);assert.equal(result.requiresOriginalDomainCheck,true);assert.equal(result.namespaceAuthority,false);
});
test('preserves unrelated and unsupported complete modules and reports structural refusals',limits,()=>{
 const branch='fn collect(input: String){let mut values=Vec::new();if flag(){values.push(input);}}',empty='fn untouched(){}',good='fn one(input: String)->Vec<String>{let values=::std::vec![input];values}',result=discover([row(branch),row(empty,'rust/src/empty.rs'),row(good,'rust/src/good.rs')]);assert.equal(result.lexicalCandidates,2);assert.equal(result.unsupportedCandidates,1);assert.equal(result.sourceProposals,1);assert.equal(result.observations[0].status,'unsupported-source');assert.match(result.observations[0].message,/straight-line/u);assert.equal(result.files[0].after,branch);assert.equal(result.files[1].after,empty);assert.equal(result.files[2].inverse,good);for(let index=0;index<3;index++)assert.equal(result.files[index].history.inverse,[branch,empty,good][index]);
});
test('type and standard path hints cannot authorize element ownership or original namespace',limits,()=>{
 const source='fn one(){let values=vec![true];values}',result=discover([row(source)]);assert.equal(result.sourceProposals,1);assert.equal(result.observations[0].domainHint,'text-owned');assert.equal(result.requiresOriginalDomainCheck,true);assert.equal(result.requiresOriginalNamespaceCheck,true);assert.equal(result.runtimeParity,false);assert.equal(result.receivingQualified,false);assert.equal(result.runtimeExecuted,false);assert.equal(result.sourceInstalled,false);
});
test('comments and string contents cannot manufacture discovered constructors',limits,()=>{
 const source='// let fake=vec![];\nfn one(){let message="let fake=Vec::new();";}',result=discover([row(source)]);assert.equal(result.lexicalCandidates,0);assert.equal(result.changedFiles,0);assert.equal(result.files[0].inverse,source);
});
test('capacity and syntax-host failures stay fatal while unsupported repeat remains explicit',limits,()=>{
 const repeat='fn one(){let values=vec![make(); 2];values}',result=discover([row(repeat)]);assert.equal(result.unsupportedCandidates,1);assert.equal(result.changedFiles,0);assert.throws(()=>discover([row('fn one(){let values=vec!['+Array.from({length:65},()=> 'make()').join(',')+'];values}')]));assert.throws(()=>discover([row('fn one(){let values=vec!["unterminated];values}')]));assert.throws(()=>discover([row('fn one(){}\n'+'\n'.repeat(1000))]));
});
test('bounded complete source rows forbid duplicates, holes, accessors and proxy metadata',limits,()=>{
 assert.throws(()=>discover(new Array(1)));assert.throws(()=>discover([row('fn one(){}'),row('fn two(){}')]));assert.throws(()=>discover([row('fn one(){}','../escape.rs')]));assert.throws(()=>discover(new Proxy([row('fn one(){}')],{})));let invoked=false;const input={path:'rust/src/caller.rs'};Object.defineProperty(input,'source',{enumerable:true,get(){invoked=true;return 'fn one(){}';}});assert.throws(()=>discover([input]));assert.equal(invoked,false);assert.throws(()=>discover(Array.from({length:33},(_,index)=>row('fn one(){}','rust/src/c'+index+'.rs'))));
});
test('complete discovery source profile is additive and supplies no receiving evidence',limits,()=>{const plan=prepareOwnedTextVectorNativeDiscoverySources();assert.ok(plan.files.some(row=>row.path==='tools/translation/native-owned-text-vector-discovery.mjs'));assert.equal(plan.receivingExecuted,false);});
