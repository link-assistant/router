// One finite pre-bootstrap refusal per fresh engine process.
import assert from 'node:assert/strict';
import {Hash} from 'node:crypto';
const kind=process.argv[2];assert.equal(process.argv.length,3);
assert.ok(['unknown-version','observed-update','inherited-symbol-accessor'].includes(kind));
const key=kind==='unknown-version'?'node':kind==='observed-update'?'update':Symbol('unknown inherited handle accessor');
const owner=kind==='unknown-version'?process.versions:Hash.prototype,before=Object.getOwnPropertyDescriptor(owner,key);
let observations=0,result;
try{
 if(kind==='unknown-version')Object.defineProperty(owner,key,{...before,value:'20.20.3'});
 else if(kind==='observed-update')Object.defineProperty(owner,key,{...before,value:function(...args){observations++;return Reflect.apply(before.value,this,args);}});
 else Object.defineProperty(owner,key,{configurable:true,get(){observations++;throw Error('unknown Symbol accessor must not run');},set(){observations++;throw Error('unknown Symbol setter must not run');}});
 const module=await import('../../attribute-owner-bulk-crypto.mjs');
 assert.equal(module.originalAttributeOwnerBulkCryptoReady(),false);assert.equal(observations,0);result=module;
}finally{if(before)Object.defineProperty(owner,key,before);else delete owner[key];}
process.stdout.write(JSON.stringify({kind,ready:false,observations,restoredReady:result.originalAttributeOwnerBulkCryptoReady()}));
