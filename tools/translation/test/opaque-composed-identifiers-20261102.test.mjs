// Independently authored mixed-edit expectations. All execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems} from '../rust-structure.mjs';
import {proposeOpaqueComposedIdentifierTargetData} from '../opaque-composed-identifiers-20261102-target.mjs';
import {proposeOpaqueComposedIdentifierNativeData} from '../opaque-composed-identifiers-20261102-native.mjs';
const limits={timeout:60000};
const native='pub fn oldhelper(value:u64)->u64{value}\npub fn newhelper(value:u64)->u64{value+1}\npub fn caller(input:u64)->u64{let local=oldhelper(input);local}\n';
const javascript='export function oldhelper(value){return value;}\nexport function newhelper(value){return value+1n;}\nexport function caller(input){const local=oldhelper(input);return local;}\n';
const typescript='export function oldhelper(value:bigint):bigint{return value;}\nexport function newhelper(value:bigint):bigint{return value+1n;}\nexport function caller(input:bigint):bigint{const local=oldhelper(input);return local;}\n';
const edited=source=>source.replace('const local=oldhelper(input);return local;','const renamed=newhelper(input);return renamed;');
function capture(){return {constantIndexOrigins:{functions:sourceItems(native).filter(row=>row.term==='fn').map(row=>({source:'src/lib.rs',qualifiedName:row.name,targetFunction:row.name,span:{start:row.start,end:row.end},parameters:[{name:row.name==='caller'?'input':'value'}],sourceAuthority:false,semanticAuthority:false}))},originalSources:new Map([['src/lib.rs',native]]),adoptedSources:new Map([['src/lib.rs',native]])};}
test('one full emitted caller can change its helper and local binding together in JS and TS',limits,()=>{
 for(const[language,before]of [['JavaScript',javascript],['TypeScript',typescript]]){const result=proposeOpaqueComposedIdentifierTargetData(before,edited(before),language);
  assert.deepEqual(result.changedFamilies,['binding','callee']);assert.equal(result.changedIdentifiers,3);assert.equal(result.groups.binding.length,1);assert.equal(result.groups.callee.length,1);
  assert.equal(result.groups.binding[0].before,'local');assert.equal(result.groups.binding[0].after,'renamed');assert.equal(result.groups.callee[0].before,'oldhelper');assert.equal(result.groups.callee[0].after,'newhelper');assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
 }
});
test('mixed source candidates compose original spans without requiring a literal-bearing binding owner',limits,()=>{
 const data=proposeOpaqueComposedIdentifierTargetData(javascript,edited(javascript),'JavaScript'),result=proposeOpaqueComposedIdentifierNativeData(capture(),data.groups);
 assert.equal(result.nativeEdits.length,3);assert.equal(result.rustEdits.length,1);assert.equal(result.rustEdits[0].before,native);
 assert.equal(result.rustEdits[0].after,'pub fn oldhelper(value:u64)->u64{value}\npub fn newhelper(value:u64)->u64{value+1}\npub fn caller(input:u64)->u64{let renamed=newhelper(input);renamed}\n');
 assert.deepEqual(result.changedFamilies,['binding','callee']);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
 assert.deepEqual(result.selections.map(row=>row.editFamily),['binding','callee']);
});
test('single-family source changes retain original validators and empty edits stay refused',limits,()=>{
 const binding=javascript.replaceAll('local','renamed'),callee=javascript.replace('local=oldhelper','local=newhelper');
 assert.deepEqual(proposeOpaqueComposedIdentifierTargetData(javascript,binding,'JavaScript').changedFamilies,['binding']);
 assert.deepEqual(proposeOpaqueComposedIdentifierTargetData(javascript,callee,'JavaScript').changedFamilies,['callee']);
 assert.throws(()=>proposeOpaqueComposedIdentifierTargetData(javascript,javascript,'JavaScript'));
});
test('mixed edits cannot smuggle numeric type comment argument import or property changes',limits,()=>{
 const desired=edited(javascript);
 for(const after of [desired.replace('1n','2n'),desired.replace('newhelper(input);return','newhelper(1n);return'),desired+'// different\n',desired.replace('newhelper(input);return','object.newhelper(input);return'),desired.replace('const renamed','let renamed'),desired.replace('export function caller','function caller')])assert.throws(()=>proposeOpaqueComposedIdentifierTargetData(javascript,after,'JavaScript'));
 assert.throws(()=>proposeOpaqueComposedIdentifierTargetData(typescript,edited(typescript).replaceAll(':bigint',':number'),'TypeScript'));
});
test('partial binding references and unknown helper targets cannot bypass per-family closure',limits,()=>{
 for(const after of [javascript.replace('const local','const renamed'),edited(javascript).replace('newhelper(input);return','unknown(input);return'),edited(javascript).replace('const renamed','const input')])assert.throws(()=>proposeOpaqueComposedIdentifierTargetData(javascript,after,'JavaScript'));
});
test('combined native family selections preserve source guards and bounded closed input',limits,()=>{
 const data=proposeOpaqueComposedIdentifierTargetData(javascript,edited(javascript),'JavaScript');
 for(const groups of [null,{}, {...data.groups,extra:true},{binding:[],callee:[]},{binding:new Array(257).fill(data.groups.binding[0]),callee:[]}])assert.throws(()=>proposeOpaqueComposedIdentifierNativeData(capture(),groups));
 const changed=capture();changed.originalSources.set('src/lib.rs',native.replace('let local','let different'));assert.throws(()=>proposeOpaqueComposedIdentifierNativeData(changed,data.groups));
});
