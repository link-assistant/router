// Private type-boundary refusal cases SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBorrowedStandardTextMapType,requireBorrowedStandardTextMapType,isBorrowedStandardTextMapType,borrowedStandardTextMapTypeKey,resolveBorrowedStandardTextMapType,withBorrowedStandardMapSourceTypeCapture} from '../borrowed-standard-map-20261103-native-types.mjs';
test('a public generic type or copied native marker cannot issue a standard-map input',()=>{
 const fake={kind:'routerStandardTextMap',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'::std::collections::BTreeMap<::std::string::String,::std::string::String>'},rustReference:{kind:'shared',pointee:{kind:'routerStandardTextMap'}}};
 for(const value of [null,{},fake,Object.freeze({...fake})]){
  assert.throws(()=>requireBorrowedStandardTextMapType(value),/copied or unissued/u);assert.equal(isBorrowedStandardTextMapType(value),false);
 }
 assert.throws(()=>borrowedStandardTextMapTypeKey(fake),/copied or unissued/u);
 assert.equal(borrowedStandardTextMapTypeKey({kind:'routerOrderedTextMap'}),null);
});
test('a fake parser is rejected before its cursor accessor or source lookup can run',()=>{
 let calls=0;const parser={resolveSourceNamespace(){calls++;return ['std','collections','BTreeMap'];}};
 Object.defineProperty(parser,'cursor',{get(){calls++;throw Error('must never read');}});
 assert.throws(()=>parseBorrowedStandardTextMapType(parser));assert.equal(calls,0);
});
test('source-shaped checker and declaration fields cannot bypass original type origin custody',()=>{
 const fake={kind:'routerStandardTextMap',rustSourceType:true};
 assert.throws(()=>resolveBorrowedStandardTextMapType({},fake));
 let called=false;assert.throws(()=>withBorrowedStandardMapSourceTypeCapture({},{items:[]},()=>{called=true;}));assert.equal(called,false);
});
