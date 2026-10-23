import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {restoreCompilerAliasLaterHistory} from './fixtures/current-receiving-source-history.mjs';
import {restoreCompilerDataAliasHistory,readCompilerAliasHistory} from './fixtures/compiler-data-alias-history.mjs';
const pins=[
 ['private-frozen-json.mjs','6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f','0205c1bcb646e4565bec6486d916e65a7739f4b5bd635623c8179345fa1d86c8'],
 ['derive-bang-context.mjs','b54098da88256590088b66bb0bf66bf3a08ec8f729cac3a88c87e2ff84277ec8','1575931b64d4b0db54b8fbd37211413d37b8b8628535074d697c6e523897eb3c'],
 ['derive-enclosing-namespace-context.mjs','65109370660c0c64885831baadfa71f6be5d03698a5a9591229be5d2910b5d9a','8aea764e18b6277b9c48754b83fbd3391849fd112dd0d1e5fd7d40ba365c5c9c'],
 ['builtin-derive-bang-footprints.mjs','a64b2c1d038ff3170af071797dcd75c095edba0c05bad330dd55071707bbb135','c9400cdea6e12c08c0cb132745f42b31886f10eac43e59e437ef15cfe97ac234'],
 ['original-json-intrinsics.mjs','8b505ecb5e5211496dc5586439e8c8c8c936df1beb29292ede36eef419621f45','9c5255ac206087959f2cf2e2c3bd9eb9ad096a2d04648ff7bbdbaefee8cda219'],
 ['private-data-freeze.mjs','2e7194268a1a136db9217834e8ce6b62d18dadf367ce2c27d4e9fe7d6ee8cbf6','6ffa5ef6aa8c8ab86d77b01c2e82376275c81a37d7c4632762c5f9571e7acb92'],
];
const hash=source=>createHash('sha256').update(source).digest('hex');
test('complete later source equations preserve every original alias parent and comparison pin',{timeout:60000},()=>{
 for(const [name,parent,original]of pins){
  const url=new URL('../'+name,import.meta.url),source=readFileSync(url,'utf8'),restored=restoreCompilerAliasLaterHistory(source,name);
  assert.equal(hash(restored),parent,name+': original alias parent');
  const historical=restoreCompilerDataAliasHistory(source,name);assert.equal(hash(historical),original,name+': complete original comparison');
  assert.equal(readCompilerAliasHistory(url,'utf8'),name==='builtin-derive-bang-footprints.mjs'?source:historical);
  assert.equal(readFileSync(url,'utf8'),source,'physical compiler remains current');
  assert.throws(()=>restoreCompilerDataAliasHistory(source+'\n// foreign extension\n',name),/source|consumer/);
 }
});
test('later source DATA restoration adds no native JSON or Hash callback',{timeout:60000},()=>{
 const inputs=pins.map(([name])=>({name,source:readFileSync(new URL('../'+name,import.meta.url),'utf8')})),json=JSON.stringify,update=Hash.prototype.update;
 let jsonCalls=0,hashCalls=0;const retained=[];
 try{
  JSON.stringify=function(...args){jsonCalls++;return Reflect.apply(json,this,args);};Hash.prototype.update=function(...args){hashCalls++;return Reflect.apply(update,this,args);};
  for(const row of inputs)restoreCompilerAliasLaterHistory(row.source,row.name,(kind,value)=>retained.push({kind,value}));
 }finally{JSON.stringify=json;Hash.prototype.update=update;}
 assert.equal(jsonCalls,0);assert.equal(hashCalls,0);assert.equal(retained.length,3);
 for(const row of retained)assert.equal(row.value.sourceAuthority,false);
});
