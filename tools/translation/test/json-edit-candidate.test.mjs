import testCase from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJsonEditSlot,jsonEditSnapshot,withJsonEdit,withJsonEditReborrow,jsonEditRemoveIfObject} from '../json-edit-candidate-runtime.mjs';
import {json_macro_object,json_macro_array,json_macro_bool,json_macro_string,json_macro_u64,json_macro_null} from '../json-macro-runtime.mjs';
import {err} from '../extensions/json-values.mjs';
import {jsonEditFrontierSourceData,proposeJsonEditRemoveLeaf} from '../prepare-json-edit-leaf-candidate.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const test=(name,run)=>testCase(name,{timeout:60000},run);
const number=value=>json_macro_u64(BigInt(value)),object=entries=>json_macro_object(entries),hash=value=>createHash('sha256').update(value).digest('hex');

test('complete 49-body source DATA and actual remove proposal retain mutable signature both CST phases and whole inverse',()=>{
 const data=jsonEditFrontierSourceData();assert.equal(data.functions.length,49);assert.equal(new Set(data.functions.map(row=>row.originalIndex)).size,49);assert.equal(new Set(data.functions.map(row=>row.path)).size,30);assert.equal(data.executableGainMeasured,0);assert.equal(data.semanticAuthority,false);
 for(const row of data.functions){const source=data.completePhysicalSources.find(parent=>parent.path===row.path);assert.equal(hash(source.source),source.sha256);assert.equal(source.source.slice(row.span.start,row.span.end),row.body);assert.equal(hash(row.body),row.sha256);assert.equal(Buffer.from(source.source).subarray(row.span.byteStart,row.span.byteEnd).toString(),row.body);}
 const source=data.completePhysicalSources.find(row=>row.path==='rust/src/thinking/apply.rs').source,plan=proposeJsonEditRemoveLeaf({source});assert.equal(plan.executableAdmission,false);assert.equal(plan.facadeInstalled,false);assert.equal(plan.selection.signatureUnchanged,true);assert.equal(plan.selection.mutableReferenceErased,false);assert.equal(plan.inverse,source);assert.ok(plan.after.includes('fn remove(body: &mut Value, field: &str)'));assert.ok(plan.after.includes('crate::translation_core::json_edit_candidate::remove_if_object(body, field);'));assert.deepEqual(plan.stages.map(row=>row.phase),['language','repository']);for(const stage of plan.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}
});

test('source adoption refuses changed whole parents operations attributes spans and copied permission fields',()=>{
 const source=jsonEditFrontierSourceData().completePhysicalSources.find(row=>row.path==='rust/src/thinking/apply.rs').source;
 for(const changed of [source+'\n',source.replace('object.remove(field);','object.clear();'),source.replace('pub(super) fn remove','#[unknown_producer]\npub(super) fn remove'),source.replace('body: &mut Value, field: &str','body: &Value, field: &str')])assert.throws(()=>proposeJsonEditRemoveLeaf({source:changed,semanticAuthority:true,ownerResolved:true}),/original parent\/source join/u);
 assert.throws(()=>proposeJsonEditRemoveLeaf({source,sourcePath:'different.rs'}),/original parent\/source join/u);
});

test('paired removal preserves missing non-object empty Unicode and prototype-looking key behavior with owned results',()=>{
 for(const value of [json_macro_null(),json_macro_bool(true),json_macro_string('text'),number(2),json_macro_array([number(1)])]){const slot=createJsonEditSlot(value);assert.deepEqual(withJsonEdit(slot,loan=>jsonEditRemoveIfObject(loan,'x')),{$:'None'});assert.deepEqual(jsonEditSnapshot(slot),value);}
 const initial=object([['',number(1)],['__proto__',number(2)],['é',json_macro_array([number(3)])]]),slot=createJsonEditSlot(initial),before=jsonEditSnapshot(slot);assert.deepEqual(withJsonEdit(slot,loan=>jsonEditRemoveIfObject(loan,'missing')),{$:'None'});assert.deepEqual(withJsonEdit(slot,loan=>jsonEditRemoveIfObject(loan,'é')),{$:'Some',field0:json_macro_array([number(3)])});assert.deepEqual(jsonEditSnapshot(slot),object([['',number(1)],['__proto__',number(2)]]));assert.deepEqual(before,initial);assert.deepEqual(initial,object([['',number(1)],['__proto__',number(2)],['é',json_macro_array([number(3)])]]));
});

test('early return Err and throw preserve each completed edit and revoke every closed loan',()=>{
 for(const value of [7,false,'scalar',null,undefined,{original:'object'},function originalFunction(){}]){const slot=createJsonEditSlot(object([]));assert.equal(withJsonEdit(slot,()=>value),value);assert.deepEqual(jsonEditSnapshot(slot),object([]));}
 const slot=createJsonEditSlot(object([['a',number(1)],['b',number(2)],['c',number(3)]]));let escaped;
 assert.equal(withJsonEdit(slot,loan=>{escaped=loan;jsonEditRemoveIfObject(loan,'a');return 'early';}),'early');assert.deepEqual(jsonEditSnapshot(slot),object([['b',number(2)],['c',number(3)]]));assert.throws(()=>jsonEditRemoveIfObject(escaped,'b'),/closed, foreign or suspended/u);
 const error=err('after second edit');assert.equal(withJsonEdit(slot,loan=>{jsonEditRemoveIfObject(loan,'b');return error;}),error);assert.deepEqual(jsonEditSnapshot(slot),object([['c',number(3)]]));const marker={original:true};assert.throws(()=>withJsonEdit(slot,loan=>{escaped=loan;jsonEditRemoveIfObject(loan,'c');throw marker;}),value=>value===marker);assert.deepEqual(jsonEditSnapshot(slot),object([]));assert.throws(()=>jsonEditRemoveIfObject(escaped,'x'),/closed, foreign or suspended/u);assert.deepEqual(withJsonEdit(slot,loan=>jsonEditRemoveIfObject(loan,'x')),{$:'None'});
});

test('exclusive roots and nested reborrows reject aliases copied handles suspended parents and escaped children',()=>{
 const slot=createJsonEditSlot(object([['a',number(1)],['b',number(2)]]));let childHandle;
 assert.throws(()=>withJsonEdit({...slot},()=>{}),/unissued owned slot/u);
 withJsonEdit(slot,parent=>{assert.throws(()=>jsonEditSnapshot(slot),/exclusively borrowed/u);assert.throws(()=>withJsonEdit(slot,()=>{}),/already exclusively borrowed/u);assert.throws(()=>jsonEditRemoveIfObject({...parent},'a'),/closed, foreign or suspended/u);const marker={nested:true};assert.throws(()=>withJsonEditReborrow(parent,child=>{childHandle=child;assert.throws(()=>jsonEditRemoveIfObject(parent,'a'),/suspended loan/u);jsonEditRemoveIfObject(child,'a');throw marker;}),error=>error===marker);assert.throws(()=>jsonEditRemoveIfObject(childHandle,'b'),/closed, foreign or suspended/u);assert.deepEqual(jsonEditRemoveIfObject(parent,'b'),{$:'Some',field0:number(2)});});assert.deepEqual(jsonEditSnapshot(slot),object([]));
});

test('Promise thenable and proxy refusals preserve partial edits without invoking caller getters or traps',async()=>{
 let gets=0,traps=0;const thenable=Object.defineProperty({},'then',{get(){gets++;throw Error('must not execute');}}),proxy=new Proxy({},{get(){traps++;throw Error('must not execute');}});
 for(const result of [Promise.resolve(1),thenable,Object.create(thenable),proxy]){const slot=createJsonEditSlot(object([['a',number(1)]]));let loan;assert.throws(()=>withJsonEdit(slot,value=>{loan=value;jsonEditRemoveIfObject(value,'a');return result;}),/synchronous|thenable/u);assert.deepEqual(jsonEditSnapshot(slot),object([]));assert.throws(()=>jsonEditRemoveIfObject(loan,'a'),/closed, foreign or suspended/u);}
 const slot=createJsonEditSlot(object([]));assert.throws(()=>withJsonEdit(slot,new Proxy(()=>{traps++;},{})),/callback/u);assert.equal(gets,0);assert.equal(traps,0);let continuation;assert.throws(()=>withJsonEdit(slot,loan=>{continuation=Promise.resolve().then(()=>assert.throws(()=>jsonEditRemoveIfObject(loan,'a'),/closed, foreign or suspended/u));return continuation;}),/thenable/u);await continuation;
});

test('malformed mutable inputs and keys cannot bypass canonical JSON bounds through the new slot ABI',()=>{
 let gets=0;const accessor=Object.defineProperty({$:'String'},'field0',{enumerable:true,get(){gets++;return 'x';}});for(const value of [accessor,new Proxy({$:'Null'},{}),{$:'Array',field0:Array.from({length:4097},()=>json_macro_null())}])assert.throws(()=>createJsonEditSlot(value));assert.equal(gets,0);const slot=createJsonEditSlot(object([['x',number(1)]]));withJsonEdit(slot,loan=>{assert.throws(()=>jsonEditRemoveIfObject(loan,{}),/Unicode scalar/u);assert.throws(()=>jsonEditRemoveIfObject(loan,'\ud800'),/Unicode scalar/u);});assert.deepEqual(jsonEditSnapshot(slot),object([['x',number(1)]]));
});
