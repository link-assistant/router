// Source-only crypto bootstrap/identity boundaries. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {originalSourceCryptoIntrinsicsUnchanged,originalDeriveHelperCryptoUnchanged} from '../derive-footprints.mjs';
import {withFreshStandardCopyInputs} from '../fresh-standard-copy-inputs.mjs';
import {prepareSourceCryptoIdentitySources} from '../prepare-source-crypto-identity-sources.mjs';
const limits={timeout:60000},moduleURL=new URL('../derive-footprints.mjs',import.meta.url).href;
function child(t,source){
 const directory=mkdtempSync(join(tmpdir(),'router-source-crypto-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'case.mjs');writeFileSync(path,source);
 return execFileSync(process.execPath,[path],{encoding:'utf8',timeout:20000,maxBuffer:1048576});
}
test('source identity accepts its unchanged bootstrap without altering native optimization eligibility',limits,()=>{
 const eligible=originalDeriveHelperCryptoUnchanged();assert.equal(originalSourceCryptoIntrinsicsUnchanged(),true);assert.equal(originalSourceCryptoIntrinsicsUnchanged(),true);assert.equal(originalDeriveHelperCryptoUnchanged(),eligible);
});
test('fresh standard source reads retain both complete pinned sources under the independent identity guard',limits,()=>{
 const paths=withFreshStandardCopyInputs(frame=>{assert.equal(frame.sourceAuthority,false);assert.equal(frame.namespaceAuthority,false);return frame.sources.map(row=>row.path);});assert.deepEqual(paths,['library/core/src/marker.rs','library/core/src/option.rs']);assert.equal(originalSourceCryptoIntrinsicsUnchanged(),true);
});
test('a valid JavaScript method wrapper at bootstrap remains eligible for full hashing but not native optimization',limits,t=>{
 const source=[
  'import assert from "node:assert/strict";',
  'import {Hash} from "node:crypto";',
  'const field=Object.getOwnPropertyDescriptor(Hash.prototype,"update"),original=field.value;let calls=0;',
  'Object.defineProperty(Hash.prototype,"update",{...field,value:function update(...args){calls++;return Reflect.apply(original,this,args);}});',
  'try{const api=await import('+JSON.stringify(moduleURL)+');assert.equal(api.originalDeriveHelperCryptoUnchanged(),false);assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),true);const before=calls;assert.equal(new Hash("sha256").update("abc").digest("hex"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");assert.equal(calls,before+1);assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),true);}finally{Object.defineProperty(Hash.prototype,"update",field);}',
 ].join('\n');assert.equal(child(t,source),'');
});
test('changed digest/update functions and descriptors refuse without invoking accessors',limits,t=>{
 const source=[
  'import assert from "node:assert/strict";',
  'import {Hash} from "node:crypto";',
  'const api=await import('+JSON.stringify(moduleURL)+');assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),true);',
  'for(const name of ["update","digest"]){const field=Object.getOwnPropertyDescriptor(Hash.prototype,name);let reads=0;try{Object.defineProperty(Hash.prototype,name,{...field,value:function changed(){throw new Error("must not run");}});assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),false);}finally{Object.defineProperty(Hash.prototype,name,field);}try{Object.defineProperty(Hash.prototype,name,{configurable:true,enumerable:field.enumerable,get(){reads++;throw new Error("getter must not run");}});assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),false);assert.equal(reads,0);}finally{Object.defineProperty(Hash.prototype,name,field);}try{Object.defineProperty(Hash.prototype,name,{...field,enumerable:!field.enumerable});assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),false);}finally{Object.defineProperty(Hash.prototype,name,field);}assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),true);}',
 ].join('\n');assert.equal(child(t,source),'');
});
test('function-text and proxy-test descriptor mutations refuse without reading getters',limits,t=>{
 const source=[
  'import assert from "node:assert/strict";',
  'import {types} from "node:util";',
  'const api=await import('+JSON.stringify(moduleURL)+');',
  'for(const [owner,name]of [[Function.prototype,"toString"],[types,"isProxy"]]){const field=Object.getOwnPropertyDescriptor(owner,name);let reads=0;try{Object.defineProperty(owner,name,{configurable:true,enumerable:field.enumerable,get(){reads++;throw new Error("getter must not run");}});assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),false);assert.equal(reads,0);}finally{Object.defineProperty(owner,name,field);}assert.equal(api.originalSourceCryptoIntrinsicsUnchanged(),true);}',
 ].join('\n');assert.equal(child(t,source),'');
});
test('five complete source equations preserve originals, whole inverses and both substitution sequences',limits,()=>{
 const plan=prepareSourceCryptoIdentitySources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
