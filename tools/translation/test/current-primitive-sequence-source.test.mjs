// Current-operation paired source joins. ALL UNRUN; no executable caller claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePrimitiveSequenceRootSource} from '../primitive-sequence-root-source.mjs';
import {observePrimitiveSequenceCoreSources} from '../primitive-sequence-source-bindings.mjs';
import {withOriginalPrimitiveSequenceSourceOperation as scope,observeCurrentPrimitiveSequenceCoreSources as observe,requireCurrentPrimitiveSequenceOperationSource as operation} from '../current-primitive-sequence-source.mjs';
import {prepareCurrentPrimitiveSequenceSources} from '../prepare-current-primitive-sequence-sources.mjs';
const limits={timeout:60000},domains=['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'];
function input(){const proposal=proposePrimitiveSequenceRootSource('pub mod translation_core;\n');return new Map(proposal.files.map(row=>[row.path,row.after??row.source]));}
test('all thirty-three actual JavaScript export wrappers join their complete native signatures and bodies without using a public catalog receipt',limits,()=>{
 const files=input();scope(()=>{for(const domain of domains)for(const kind of ['len','is_empty','get']){
  const name='router_slice_'+domain+'_'+kind,row=operation(files,{runtimeRoot:'runtime'},name);assert.equal(row.domain,domain);assert.equal(row.operation,kind);assert.equal(row.javascriptName,name);assert.equal(row.rustName,'slice_'+domain+'_'+kind);assert.equal(row.rustPath,'crate::translation_primitive_sequences_core::slice_'+domain+'_'+kind);assert.deepEqual(row.parameters,[domain+'-list-ref',...(kind==='get'?['u64']:[])]);assert.equal(row.returns,kind==='len'?'u64':kind==='is_empty'?'bool':domain+'-option');assert.equal(row.nativeAbiSourceMatched,true);assert.equal(row.runtimeWrapperSourceMatched,true);assert.equal(row.receiverMode,'shared');assert.equal(row.returnedLoan,false);assert.equal(row.copiesElement,kind==='get');assert.deepEqual(row.evaluationOrder,kind==='get'?['receiver','index']:['receiver']);assert.ok(row.nativeOriginal.includes('fn '+row.rustName+'('));assert.ok(row.runtimeOriginal.includes('export function '+name+'('));for(const key of ['callerTypesQualified','privateCallerBindingQualified','sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','receivingExecuted','crossInvocationCache'])assert.equal(row[key],false,key);const nativeName=operation(files,{runtimeRoot:'runtime'},row.rustName);assert.equal(nativeName.nativeOriginal,row.nativeOriginal);assert.notStrictEqual(nativeName,row);
 }});
});
test('source sharing retains original complete observer records while independent calls receive fresh observations',limits,()=>{
 const files=input(),old=observePrimitiveSequenceCoreSources(files,{runtimeRoot:'runtime'});scope(()=>{const first=observe(files,{runtimeRoot:'runtime'}),nested=scope(()=>observe(files,{runtimeRoot:'runtime'}));assert.deepEqual(first.records,old.records);assert.deepEqual(first.publicFunctions,old.publicFunctions);assert.deepEqual(nested.records,first.records);assert.notStrictEqual(first,nested);assert.equal(first.privateCallerBindingQualified,false);});const next=observe(files,{runtimeRoot:'runtime'});assert.deepEqual(next.records,old.records);assert.equal(next.crossInvocationCache,false);
});
test('every actual receiving source is rejoined even when its operation source was already selected in this scope',limits,()=>{
 const files=input();scope(()=>{operation(files,{runtimeRoot:'runtime'},'router_slice_u8_get');for(const [path,source]of files){const changed=new Map(files);if(path==='src/lib.rs')changed.set(path,'pub mod translation_core;\n');else changed.set(path,source+'\n// changed actual source\n');assert.throws(()=>operation(changed,{runtimeRoot:'runtime'},'router_slice_u8_get'));}assert.equal(operation(files,{runtimeRoot:'runtime'},'router_slice_u8_get').domain,'u8');});
});
test('pointer-sized foreign suffixed or metadata-forged operation requests never select a paired source',limits,()=>{
 const files=input();scope(()=>{for(const name of ['router_slice_usize_len','router_slice_f64_get','router_slice_u8_get\n','foreign::slice_u8_get','router_slice_u8_unknown'])assert.throws(()=>operation(files,{runtimeRoot:'runtime'},name));let coerced=0;assert.throws(()=>operation(files,{runtimeRoot:'runtime'},{domain:'u8',operation:'get',sourceAuthority:true,toString(){coerced++;return 'router_slice_u8_get';}}));assert.equal(coerced,0);});
});
test('all private source maps and parsed program scratch close on exact primary throws and async/getter/proxy refusals',limits,()=>{
 const files=input();for(const primary of [null,undefined,new Error('independent stop')]){let thrown=false;try{scope(()=>{operation(files,{runtimeRoot:'runtime'},'router_slice_bool_get');throw primary;});}catch(value){thrown=true;assert.strictEqual(value,primary);}assert.equal(thrown,true);assert.equal(operation(files,{runtimeRoot:'runtime'},'router_slice_bool_get').returns,'bool-option');}
 let applied=0,gets=0;assert.throws(()=>scope(async()=>{applied++;}));assert.throws(()=>scope(new Proxy(()=>true,{apply(){applied++;return true;}})));assert.equal(applied,0);assert.throws(()=>scope(()=>({get then(){gets++;return ()=>null;}})));assert.equal(gets,0);
});
test('three complete source equations preserve whole original owners current text exact inverses and both declared phases',limits,()=>{
 const plan=prepareCurrentPrimitiveSequenceSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
