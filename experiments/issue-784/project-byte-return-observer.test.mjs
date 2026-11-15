import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../../tools/translation/project.mjs';
const options={entry:'src/lib.rs',paths:['src/lib.rs'],
 readSource:()=> 'pub fn value(v:u8)->u8{v}'};

test('internal project byte scopes do not add observations of inherited then fields',
 {timeout:60000},()=>{
 const expected=translateProject(options),prior=Object.getOwnPropertyDescriptor(Object.prototype,'then');
 assert.equal(prior,undefined);
 let reads=0,actual;
 try{
  Object.defineProperty(Object.prototype,'then',{configurable:true,
   get(){reads++;throw new Error('inherited then must not be invoked');}});
  actual=translateProject(options);
 }finally{
  if(prior)Object.defineProperty(Object.prototype,'then',prior);
  else delete Object.prototype.then;
 }
 assert.equal(reads,0);assert.deepEqual(actual.meta,expected.meta);
 assert.equal(actual.javascript,expected.javascript);
 assert.equal(actual.typescript,expected.typescript);
});
