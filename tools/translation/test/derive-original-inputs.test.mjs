import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencyOriginalInputs,isDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof,isJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-inputs.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex'),dependencies=loadDeriveDependencyProof({manifest,lock});
test('genuine original source accessor returns exact immutable inputs without changing existing proof metadata',()=>{
 const inputs=deriveDependencyOriginalInputs(dependencies);assert.deepEqual(inputs,{manifest,lock});assert.equal(hash(inputs.manifest),dependencies.manifestSha256);assert.equal(hash(inputs.lock),dependencies.lockSha256);assert.equal(Object.isFrozen(inputs),true);assert.equal(deriveDependencyOriginalInputs(dependencies),inputs);assert.throws(()=>{inputs.lock+=' ';},TypeError);assert.equal(isDeriveDependencyProof(dependencies),true);assert.equal(Object.hasOwn(dependencies,'manifest'),false);assert.equal(Object.hasOwn(dependencies,'lock'),false);
});
test('independent genuine issuances retain their own exact original source objects',()=>{
 const second=loadDeriveDependencyProof({manifest,lock});assert.notEqual(second,dependencies);assert.notEqual(deriveDependencyOriginalInputs(second),deriveDependencyOriginalInputs(dependencies));assert.deepEqual(deriveDependencyOriginalInputs(second),deriveDependencyOriginalInputs(dependencies));assert.equal(deriveDependencyOriginalInputs(second),deriveDependencyOriginalInputs(second));
});
test('copied refrozen forged primitive foreign getter and proxy carriers cannot select original bytes',()=>{
 let traps=0;const accessor=Object.defineProperty({},'manifest',{get(){traps++;throw Error('getter');}}),proxy=new Proxy(dependencies,{get(){traps++;throw Error('proxy');},getPrototypeOf(){traps++;throw Error('prototype');}});for(const fake of[structuredClone(dependencies),Object.freeze(structuredClone(dependencies)),{manifest,lock},accessor,proxy,null,undefined,42,'proof'])assert.throws(()=>deriveDependencyOriginalInputs(fake),/genuine private/);assert.equal(traps,0);
});
test('changed actual manifest and lock inputs still fail all existing profile validation',()=>{
 for(const inputs of[{manifest:manifest+' ',lock},{manifest,lock:lock+' '},{manifest:manifest.replace('1.2','1.3'),lock}])assert.throws(()=>loadDeriveDependencyProof(inputs),/audited source profile/);assert.deepEqual(deriveDependencyOriginalInputs(dependencies),{manifest,lock});
});
test('existing JSON issuer accepts actual retained inputs and keeps separate private archive identity',()=>{
 const inputs=deriveDependencyOriginalInputs(dependencies),json=loadJsonMacroSourceProof(inputs);assert.equal(isJsonMacroSourceProof(json),true);assert.equal(json.manifestSha256,dependencies.manifestSha256);assert.equal(json.lockSha256,dependencies.lockSha256);assert.ok(jsonMacroOriginalSource(json,'serde_json','src/macros.rs').source.includes('macro_rules! json'));assert.equal(isJsonMacroSourceProof(structuredClone(json)),false);assert.throws(()=>loadJsonMacroSourceProof({...inputs,lock:inputs.lock+' '}));assert.throws(()=>jsonMacroOriginalSource(structuredClone(json),'serde_json','src/macros.rs'),/Unsealed/);
});
