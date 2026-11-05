// Independent native observation/proposal cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedRustPrimitiveSequenceCall as call,ownedRustPrimitiveSequencePresence as present,ownedRustPrimitiveSequenceOptionalWitness as witness} from '../owned-rust-primitive-sequence-projection.mjs';
import {preparePrimitiveSequenceRustInverseSources} from '../../prepare-primitive-sequence-rust-inverse-sources.mjs';
const limits={timeout:60000};
test('all canonical native call paths and optional witnesses are finite source proposals only',limits,()=>{
 for(const domain of ['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'])for(const operation of ['len','is_empty','get']){const node={kind:'call',path:'crate::translation_primitive_sequences_core::slice_'+domain+'_'+operation,args:operation==='get'?[{kind:'name',name:'values'},{kind:'integer',value:'0',type:'u64'}]:[{kind:'name',name:'values'}]},row=call(node);assert.equal(row.javascriptName,'router_slice_'+domain+'_'+operation);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(present([{body:{statements:[{kind:'return',value:node}]}}]),true);assert.equal(witness('::std::option::Option<'+domain+'>'),'router_slice_'+domain+'_get');assert.equal(witness('::std::option::Option<::core::primitive::'+domain+'>'),'router_slice_'+domain+'_get');}
 assert.equal(present([{body:{statements:[]}}]),false);for(const text of ['Option<u8>','::std::option::Option<usize>','::std::option::Option<&u8>','::std::option::Option<u8>\n'])assert.equal(witness(text),null);
});
test('wrong native namespaces, names and arities cannot select a canonical sequence rule',limits,()=>{
 for(const path of ['slice_u8_get','crate::other::slice_u8_get'])assert.equal(call({kind:'call',path,args:[]}),null);for(const path of ['slice_usize_get','slice_u8_get\n','slice_u8_get::shadow'])assert.throws(()=>call({kind:'call',path:'crate::translation_primitive_sequences_core::'+path,args:[]}));assert.throws(()=>call({kind:'call',path:'crate::translation_primitive_sequences_core::slice_u8_get',args:[{}]}));let nested={};for(let index=0;index<170;index++)nested={body:nested};assert.throws(()=>present([nested]),/budget/u);
});
test('nine full canonical inverse source equations retain original sources, both phases and no receiving claim',limits,()=>{const plan=preparePrimitiveSequenceRustInverseSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
