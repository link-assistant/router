// Independent source-operation cases. SOURCE ONLY: not executed while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withBorrowedJsonToolCallerSources,borrowedJsonToolSourceScopeActive,registerBorrowedJsonToolSourceCleanup,freshlyCheckBorrowedJsonToolCaller} from '../borrowed-json-tool-20261103-requalification.mjs';
import {requireBorrowedJsonToolType,isBorrowedJsonToolType} from '../borrowed-json-tool-20261103-native-types.mjs';
import {requireBorrowedJsonToolNativeSourceABI} from '../borrowed-json-tool-20261103-native-abi.mjs';
import {withSourceInputValidation} from '../source-failure-operations.mjs';
const capture=run=>{try{return {thrown:false,value:run()};}catch(value){return {thrown:true,value};}};
test('nested JSON source operations share one lifetime and clear every cleanup on outer exit',()=>{
 const visits=[];assert.equal(borrowedJsonToolSourceScopeActive(),false);
 assert.equal(withBorrowedJsonToolCallerSources(()=>{
  assert.equal(borrowedJsonToolSourceScopeActive(),true);
  registerBorrowedJsonToolSourceCleanup(()=>visits.push('first'));
  withBorrowedJsonToolCallerSources(()=>registerBorrowedJsonToolSourceCleanup(()=>visits.push('nested')));
  assert.deepEqual(visits,[]);return 23;
 }),23);
 assert.deepEqual(visits,['first','nested']);assert.equal(borrowedJsonToolSourceScopeActive(),false);
 withBorrowedJsonToolCallerSources(()=>{});assert.deepEqual(visits,['first','nested']);
 assert.throws(()=>registerBorrowedJsonToolSourceCleanup(()=>{}));
});
test('every cleanup is attempted and exact falsy or frozen primary values survive',()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('callback primary'))]){
  const visits=[],secondary=Object.freeze(new Error('cleanup secondary'));
  const result=capture(()=>withBorrowedJsonToolCallerSources(()=>{
   registerBorrowedJsonToolSourceCleanup(()=>{visits.push(1);throw secondary;});
   registerBorrowedJsonToolSourceCleanup(()=>visits.push(2));throw primary;
  }));assert.equal(result.thrown,true);assert.equal(result.value,primary);assert.deepEqual(visits,[1,2]);assert.equal(borrowedJsonToolSourceScopeActive(),false);
 }
 const secondary=Object.freeze({closing:true});const result=capture(()=>withBorrowedJsonToolCallerSources(()=>registerBorrowedJsonToolSourceCleanup(()=>{throw secondary;})));
 assert.equal(result.thrown,true);assert.equal(result.value,secondary);assert.equal(borrowedJsonToolSourceScopeActive(),false);
});
test('caught nested source veto is sticky, ordinary application exceptions are not',()=>{
 const veto=Object.freeze(new Error('source veto'));
 assert.throws(()=>withBorrowedJsonToolCallerSources(()=>{
  assert.equal(capture(()=>withSourceInputValidation(()=>{throw veto;})).value,veto);
  withBorrowedJsonToolCallerSources(()=>null);
 }));
 assert.equal(withBorrowedJsonToolCallerSources(()=>{
  assert.equal(capture(()=>withBorrowedJsonToolCallerSources(()=>{throw veto;})).value,veto);return 7;
 }),7);assert.equal(borrowedJsonToolSourceScopeActive(),false);
});
test('invalid callbacks cannot leave an active JSON source frame',()=>{
 let getter=0;for(const callback of [null,{},async()=>{},new Proxy(()=>{},{})])assert.throws(()=>withBorrowedJsonToolCallerSources(callback));
 assert.equal(borrowedJsonToolSourceScopeActive(),false);
 const thenable={get then(){getter++;throw new Error('then accessor must not execute');}};
 assert.throws(()=>withBorrowedJsonToolCallerSources(()=>thenable));assert.equal(getter,0);assert.equal(borrowedJsonToolSourceScopeActive(),false);
});
test('public JSON kinds, source keys and ABI descriptions grant no private authority',()=>{
 const type=Object.freeze({kind:'routerBorrowedJsonTool',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'::serde_json::Value'},rustReference:{kind:'shared',pointee:{kind:'routerBorrowedJsonTool'}}});
 assert.equal(isBorrowedJsonToolType(type),false);assert.throws(()=>requireBorrowedJsonToolType(type));
 let getters=0;const parser={get cursor(){getters++;throw Error('foreign parser accessor');}};
 assert.throws(()=>requireBorrowedJsonToolNativeSourceABI({schema:'private-borrowed-json-tool-native-source-ABI-20261103-v1'},{parser}));assert.equal(getters,0);
 const candidate={k:'fn',params:[{name:'tool',type}],body:{k:'lit',type:{kind:'bool'},value:true},borrowedJsonToolSourceKey:'copied-source-locator'};
 assert.throws(()=>withBorrowedJsonToolCallerSources(()=>freshlyCheckBorrowedJsonToolCaller(candidate)));
 assert.throws(()=>withBorrowedJsonToolCallerSources(()=>freshlyCheckBorrowedJsonToolCaller(JSON.parse(JSON.stringify(candidate)))));
});
