// Independently expected policy JSON semantics. SOURCE ONLY / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {router_state_json_rewrite_model_alias as rewrite} from '../json-state-runtime.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_u64 as unsigned,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {JSON_STATE_CONTRACTS,emitJsonStateDeclarations} from '../json-state-contracts.mjs';
import fs from 'node:fs';
const profile=(model,other=text('native'))=>object([['model',model],['modelVersion',model],['message',object([['model',model],['text',other]])],['response',object([['model',model],['modelVersion',model]])],['unrelated',object([['model',other]])]]);
test('all five actual response policy pointers rewrite exact upstream IDs and preserve unrelated text',()=>{
 const original=profile(text('native')),expected=profile(text('friendly 🦀'));assert.deepEqual(rewrite(original,'native','friendly 🦀'),expected);assert.deepEqual(original,profile(text('native')));assert.deepEqual(rewrite(expected,'native','friendly 🦀'),expected);
});
test('one models prefix is optional but case, whitespace and a second prefix remain meaningful',()=>{
 assert.deepEqual(rewrite(profile(text('native')),'models/native','visible'),profile(text('visible')));assert.deepEqual(rewrite(profile(text('models/native')),'models/native','visible'),profile(text('visible')));assert.deepEqual(rewrite(profile(text('models/native')),'models/models/native','visible'),profile(text('visible')));
 for(const value of [' native','native ','Native','models/native','native/suffix'])assert.deepEqual(rewrite(profile(text(value)),'native','visible'),profile(text(value)));
 assert.deepEqual(rewrite(profile(text('')),'models/',''),profile(text('')));
});
test('non-string slots, absent fields and non-object intermediate nodes stay unchanged',()=>{
 for(const value of [nil(),bool(false),unsigned(7n),array([text('native')]),object([['nested',text('native')]])])assert.deepEqual(rewrite(profile(value),'native','visible'),profile(value));
 for(const value of [nil(),bool(true),array([object([['model',text('native')]])]),text('native'),object([])])assert.deepEqual(rewrite(value,'native','visible'),value);
 const value=object([['message',array([object([['model',text('native')]])])],['response',text('native')],['some/model',text('native')]]);assert.deepEqual(rewrite(value,'native','visible'),value);
});
test('UTF-8 scalar values, empty visible IDs and copied storage retain the existing JSON ABI',()=>{
 const value=profile(text('é😀\u0000文'));assert.deepEqual(rewrite(value,'é😀\u0000文',''),profile(text('')));const result=rewrite(value,'not-matching','visible');assert.notEqual(result,value);assert.deepEqual(value,profile(text('é😀\u0000文')));
});
test('invalid ABI values and strings refuse without coercion or getter execution',()=>{
 let touched=0;const proxy=new Proxy({}, {get(){touched++;throw Error('must not read');}}),accessor={$:'Object',field0:{$:'Map',entries:[]}};Object.defineProperty(accessor,'field0',{get(){touched++;throw Error('must not read');},enumerable:true});
 for(const value of [proxy,accessor,{model:'native'},undefined])assert.throws(()=>rewrite(value,'native','visible'),TypeError);for(const value of [undefined,null,7,proxy,'\ud800'])assert.throws(()=>rewrite(nil(),value,'visible'),TypeError);for(const value of [undefined,null,7,proxy,'\udfff'])assert.throws(()=>rewrite(nil(),'native',value),TypeError);assert.equal(touched,0);
});
test('shared operation description retains owned JSON and two borrowed scalar strings plus exact declarations',()=>{
 const rows=JSON_STATE_CONTRACTS.filter(row=>row.rustName==='json_rewrite_model_alias');assert.equal(rows.length,1);assert.deepEqual(rows[0].parameters,['owned-json','str','str']);assert.equal(rows[0].returns,'owned-json');assert.equal(rows[0].semanticAuthority,false);assert.equal(fs.readFileSync(new URL('../json-state-runtime.d.mts',import.meta.url),'utf8'),emitJsonStateDeclarations());
});
