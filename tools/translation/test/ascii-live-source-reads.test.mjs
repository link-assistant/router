import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';

test('selected ASCII reads refuse filesystem accessors and proxies without invoking them',
 {timeout:60000},()=>{
 const original=Object.getOwnPropertyDescriptor(fs,'readFileSync');
 let getters=0,invocations=0;
 try{
  Object.defineProperty(fs,'readFileSync',{configurable:true,enumerable:original.enumerable,
   get(){getters++;return original.value;}});
  assert.throws(()=>hostCoreAsciiRuntimeAssets(),/ASCII source read host changed/);
  assert.equal(getters,0);
  Object.defineProperty(fs,'readFileSync',{...original,value:new Proxy(original.value,{
   apply(){invocations++;throw Error('read proxy invoked');},
  })});
  assert.throws(()=>hostCoreAsciiRuntimeAssets(),/ASCII source read host changed/);
  assert.equal(invocations,0);
 }finally{Object.defineProperty(fs,'readFileSync',original);}
 assert.equal(hostCoreAsciiRuntimeAssets().size,3);
});
