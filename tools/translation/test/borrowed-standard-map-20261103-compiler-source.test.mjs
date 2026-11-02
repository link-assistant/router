// Independent source/history and whole actual Router receiving cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeBorrowedStandardMapCompilerSourceSuccessors} from '../borrowed-standard-map-20261103-compiler-profile.mjs';
import {requireBorrowedStandardTextMapType,reissueBorrowedStandardMapProgram} from '../borrowed-standard-map-20261103-native-types.mjs';
import {borrowedStandardMapRuntimeAssets} from '../borrowed-standard-map-20261103-packaging.mjs';
import {borrowedStandardMapInput} from '../borrowed-standard-map-20261103-input-runtime.mjs';
import {router_borrowed_text_map_matches_literals as predicate} from '../borrowed-standard-map-20261102-runtime.mjs';
test('eleven actual compiler successors and original asset case retain complete two-phase CST and inverses',{timeout:60000},()=>{
 const result=proposeBorrowedStandardMapCompilerSourceSuccessors();assert.equal(result.files.length,12);
 for(const row of result.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].before,row.before);assert.equal(row.stages[1].after,row.after);assert.ok(row.after.split('\n').length-1<1000);}
 assert.equal(result.privateCallerQualified,false);assert.equal(result.receivingExecuted,false);
});
test('copied public types and decoded keys never grant standard-map ownership',()=>{
 for(const type of [{kind:'routerStandardTextMap'},{kind:'routerStandardTextMap',rustReference:{kind:'shared',pointee:{kind:'routerStandardTextMap'}}}])assert.throws(()=>requireBorrowedStandardTextMapType(type));
 const fn={k:'fn',fullName:'query',modulePath:[],params:[{name:'map',type:{kind:'routerStandardTextMap'}}],ret:{kind:'bool'},body:{k:'lit',value:true,type:{kind:'bool'}}};
 assert.throws(()=>reissueBorrowedStandardMapProgram({declarations:new Map([['query',fn]]),items:[fn]}));
});
test('native input guard and full target assets impose no container scan or entry cap',()=>{
 const map=new Map(Array.from({length:5000},(_,at)=>['unused'+at,'x'.repeat(32)]));map.set('unused invalid text',{});map.set('stream','1');
 Object.defineProperty(map,Symbol.iterator,{get(){throw Error('must not inspect caller iterator');}});
 assert.equal(borrowedStandardMapInput(map),true);assert.equal(predicate(map,'stream',['true','1']),true);assert.equal(predicate(map,'missing',[]),false);
 assert.throws(()=>borrowedStandardMapInput(new Proxy(map,{})));assert.throws(()=>borrowedStandardMapInput({}));
 const files=borrowedStandardMapRuntimeAssets();assert.equal(files.size,4);for(const extension of ['mjs','d.mts']){assert.ok(files.has('runtime/borrowed-standard-map-20261102-runtime.'+extension));assert.ok(files.has('runtime/borrowed-standard-map-20261103-input-runtime.'+extension));}
});
