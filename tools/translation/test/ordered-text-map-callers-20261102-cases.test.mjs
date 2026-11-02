// Independent case source, UNRUN. These cases make no receiving/coverage claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {router_text_map_new as empty,router_text_map_insert as insert,router_text_map_get as get,router_text_map_contains as contains,router_text_map_remove as remove,router_text_map_copy as copy,router_text_map_len as len} from '../ordered-text-map-20261102-runtime.mjs';
import {parseOrderedTextMapOpaqueType,requireOrderedTextMapOpaqueType} from '../ordered-text-map-callers-20261102-native-types.mjs';
import {orderedTextMapReverseRustCall as reverse,orderedTextMapReverseOperation} from '../ordered-text-map-callers-20261102-reverse.mjs';
import {orderedTextMapCallerRuntimeAssets} from '../ordered-text-map-callers-20261102-packaging.mjs';

test('borrowed lookup caller preserves missing and empty request values',()=>{
 const original=empty(),a=insert(original,'stream',''),b=insert(a,'stream','true');
 const requested=map=>{const value=get(map,'stream');return value.$==='Some'&&(value.field0==='true'||value.field0==='1');};
 assert.equal(requested(original),false);assert.equal(requested(a),false);assert.equal(requested(b),true);assert.equal(requested(insert(a,'stream','1')),true);
 for(const value of ['TRUE','True','false','0',' true','true\0'])assert.equal(requested(insert(a,'stream',value)),false);
 assert.equal(contains(a,'stream'),true);assert.equal(get(a,'stream').field0,'');
});
test('consuming native update reverse ABI copies reusable JavaScript inputs',()=>{
 const first=insert(empty(),'x','before'),second=insert(copy(first),'x','after'),third=remove(second,'x');
 assert.equal(get(first,'x').field0,'before');assert.equal(get(second,'x').field0,'after');assert.equal(get(third,'x').$, 'None');assert.equal(len(third),0n);
 assert.equal(reverse('router_text_map_insert',['__ro_arg_0','__ro_arg_1','__ro_arg_2']),'{ assert!(__ro_arg_1.len() <= 1048576, "ordered text map input byte bound"); assert!(__ro_arg_2.len() <= 1048576, "ordered text map input byte bound"); crate::translation_ordered_text_map_core::text_map_insert(crate::translation_ordered_text_map_core::text_map_copy(__ro_arg_0), __ro_arg_1.to_owned(), __ro_arg_2.to_owned()) }');
 assert.deepEqual(orderedTextMapReverseOperation('router_text_map_insert').parameters,['text-map-input','str','str']);
 assert.equal(orderedTextMapReverseOperation('router_text_map_get').loanRoot,0);
});
test('source fragment operands cannot inject arbitrary Rust',()=>{
 assert.throws(()=>reverse('router_text_map_insert',['__ro_arg_0','x); panic!(); (x','__ro_arg_2']));
 assert.throws(()=>reverse('router_text_map_new',['__ro_arg_0']));assert.throws(()=>reverse('router_text_map_unknown',[]));
});
test('written public shape and fake parser frame cannot issue opaque ownership',()=>{
 for(const type of [{kind:'routerOrderedTextMap'},{kind:'data',name:'OrderedTextMap'},{kind:'array',element:{kind:'string'}},{kind:'routerOrderedTextMap',rustSourceType:true,rustOwnership:{kind:'owned',source:'crate::translation_ordered_text_map_core::OrderedTextMap'}}])assert.throws(()=>requireOrderedTextMapOpaqueType(type));
 const words=['crate','::','translation_ordered_text_map_core','::','OrderedTextMap'];
 const parser={cursor:{index:0,is:(value,at=0)=>words[at]===value,peek:(at=0)=>({value:words[at],kind:'identifier',start:at,end:at+1})}};
 assert.throws(()=>parseOrderedTextMapOpaqueType(parser));assert.equal(parser.cursor.index,0);
});
test('packaging retains executable runtime and complete strict declarations together',()=>{
 const files=orderedTextMapCallerRuntimeAssets();assert.equal(files.size,2);assert.ok(files.get('runtime/ordered-text-map-20261102-runtime.mjs').includes('router_text_map_get'));assert.ok(files.get('runtime/ordered-text-map-20261102-runtime.d.mts').includes('unique symbol'));
});

test('source successors retain complete ordered phases and full CST inverses', {timeout:60000},async()=>{
 const {proposeOrderedTextMapCallerSourceSuccessors}=await import('../ordered-text-map-callers-20261102-profile.mjs');
 const proposal=proposeOrderedTextMapCallerSourceSuccessors();assert.ok(proposal.files.length>=11);
 for(const file of proposal.files){assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);assert.equal(file.stages[0].before,file.before);assert.equal(file.stages[1].after,file.after);assert.ok(file.after.split('\n').length-1<1000);}
 assert.equal(proposal.receivingExecuted,false);assert.equal(proposal.privateCallerBindingQualified,false);
});

test('shared source closing protocol retains falsy primary errors and every closer',async()=>{
 const {withCompleteSourceClosingFence}=await import('../complete-source-closing-fence.mjs');
 for(const primary of [false,0,'',null,undefined]){const seen=[];let threw=false,caught;try{withCompleteSourceClosingFence(()=>{throw primary;},[()=>{seen.push(1);throw Error('closing error');},()=>{seen.push(2);}]);}catch(error){threw=true;caught=error;}assert.equal(threw,true);assert.equal(caught,primary);assert.deepEqual(seen,[1,2]);}
});
