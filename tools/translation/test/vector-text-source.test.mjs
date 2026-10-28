// Complete owned String source and Unicode boundary cases. ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareVectorTextSources} from '../prepare-vector-text-sources.mjs';
import {ownedVectorTextValue,emitOwnedVectorText} from '../js-to-rust/owned-vector-text-literal.mjs';
import {validateVectorParameters} from '../js-to-rust/owned-vector-parameter-values.mjs';
const limits={timeout:60000};
test('nine complete text compiler equations retain ordered phases originals and exact inverses',limits,()=>{const plan=prepareVectorTextSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
test('owned Unicode scalar text keeps escaping empty and non-BMP values without coercion',limits,()=>{
 for(const value of ['', 'Ω😀', '\u0000\n\t\r\"\\']){assert.equal(ownedVectorTextValue({kind:'text',value}),value);assert.equal(JSON.parse(emitOwnedVectorText({kind:'text',value},false)),value);assert.ok(emitOwnedVectorText({kind:'text',value},true).startsWith('<::std::string::String as ::std::convert::From<&::std::primitive::str>>::from('));}
 for(const value of [null,1,1n,{},'\ud800','\udfff'])assert.throws(()=>ownedVectorTextValue({kind:'text',value}));
 const item={vectorOrigin:{},params:[{name:'seed',type:'text-owned'}]};for(const value of ['', 'Ω😀'])validateVectorParameters(item,new Map([['seed',value]]));for(const value of [null,{},new String('x'),'\ud800'])assert.throws(()=>validateVectorParameters(item,new Map([['seed',value]])));
});
