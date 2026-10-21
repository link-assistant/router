// Fixed native ABI qualification for an explicit whole-owner operation.
// No source, digest, owner, program or current verdict is retained here.
import * as crypto from 'node:crypto';
import {types} from 'node:util';
import process from 'node:process';
import {originalCapturedFunctionSource,originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalBatchedDataFreezeIntrinsicsUnchanged,originalPrivateParserIngressUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import * as nodeBulkCryptoFunctionSources from './attribute-owner-bulk-crypto-source.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalBatchedDataFreezeIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const get=initial?Object.getOwnPropertyDescriptor:null,keys=initial?Reflect.ownKeys:null,parent=initial?Object.getPrototypeOf:null,has=initial?Object.hasOwn:null,apply=initial?Reflect.apply:null,proxy=initial?types.isProxy:null;
const field=(owner,key)=>get(owner,key),value=descriptor=>descriptor&&has(descriptor,'value')?descriptor.value:undefined;
const same=(actual,expected)=>!!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);
const native=(fn,name)=>typeof fn==='function'&&!proxy(fn)&&originalCapturedFunctionSource(fn)==='function '+name+'() { [native code] }';
const createField=initial?field(crypto,'createHash'):null,hashField=initial?field(crypto,'Hash'):null,createHash=value(createField),Hash=value(hashField),hashPrototypeField=initial&&typeof Hash==='function'?field(Hash,'prototype'):null,hashPrototype=value(hashPrototypeField);
const wrappers=initial&&hashPrototype?['constructor','copy','_transform','_flush','update','digest'].map(key=>({key,descriptor:field(hashPrototype,key)})):[];
const chains=[];let handlePrototype=null,handleKey=null,nativeConstructor=null,nativeUpdate=null,nativeDigest=null;
const versionsField=initial?field(process,'versions'):null,versions=value(versionsField),nodeVersionField=initial&&versions&&typeof versions==='object'&&!proxy(versions)?field(versions,'node'):null;
let qualified=!!(initial&&value(nodeVersionField)==='20.19.4'&&typeof createHash==='function'&&typeof Hash==='function'&&hashPrototype&&typeof hashPrototype==='object'&&!proxy(createHash)&&!proxy(Hash)&&!proxy(hashPrototype)&&originalCapturedFunctionSource(createHash)===nodeBulkCryptoFunctionSources.createHash&&originalCapturedFunctionSource(Hash)===nodeBulkCryptoFunctionSources.Hash);
if(qualified){
 const actualKeys=keys(hashPrototype);qualified=actualKeys.length===wrappers.length&&wrappers.every((row,index)=>actualKeys[index]===row.key&&row.descriptor&&has(row.descriptor,'value')&&typeof row.descriptor.value==='function'&&!proxy(row.descriptor.value)&&originalCapturedFunctionSource(row.descriptor.value)===nodeBulkCryptoFunctionSources[row.key==='constructor'?'Hash':row.key]);
}
// The source constructor assigns two private Symbols before its stream shell.
// Reject every inherited Symbol accessor BEFORE constructing a probe. This
// prevents an unknown private-handle setter from receiving the new native ABI.
function captureChain(first){
 let depth=0;for(let owner=first;owner!==null;owner=parent(owner)){
  if(proxy(owner)||depth++>=16){qualified=false;break;}
  const names=keys(owner);if(names.length>2048){qualified=false;break;}const descriptors=[];
  for(const key of names){const descriptor=field(owner,key);if(typeof key==='symbol'&&!has(descriptor,'value')){qualified=false;break;}descriptors.push({key,descriptor});}
  if(!qualified)break;chains.push({owner,parent:parent(owner),descriptors});
 }
}
if(qualified)try{captureChain(hashPrototype);}catch{qualified=false;}
// The Hash algorithm uses the actual native instanceof operation. Its inherited
// method is also pinned before the constructor can be invoked.
const functionPrototype=initial?parent(function(){}):null,hasInstanceKey=initial?Symbol.hasInstance:null,hasInstanceField=initial?field(functionPrototype,hasInstanceKey):null;
if(qualified&&!native(value(hasInstanceField),'[Symbol.hasInstance]'))qualified=false;
let probe=null;
if(qualified)try{
 probe=apply(createHash,crypto,['sha256']);
 if(proxy(probe)||parent(probe)!==hashPrototype)qualified=false;
 const matches=[];
 if(qualified)for(const key of keys(probe)){
  const descriptor=field(probe,key),part=value(descriptor);if(typeof key!=='symbol'||!part||typeof part!=='object'||proxy(part))continue;
  const owner=parent(part);if(!owner||proxy(owner))continue;
  const constructor=field(owner,'constructor'),update=field(owner,'update'),digest=field(owner,'digest');
  if(native(value(constructor),'Hash')&&native(value(update),'update')&&native(value(digest),'digest'))matches.push({key,owner,constructor,update,digest});
 }
 if(matches.length!==1)qualified=false;
 else{const selected=matches[0];handleKey=selected.key;handlePrototype=selected.owner;nativeConstructor=selected.constructor;nativeUpdate=selected.update;nativeDigest=selected.digest;
  // This is a bootstrap ABI probe, with no source payload or issued owner.
  const update=value(wrappers.find(row=>row.key==='update').descriptor),digest=value(wrappers.find(row=>row.key==='digest').descriptor);
  if(apply(update,probe,[''])!==probe||apply(digest,probe,['hex'])!=='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')qualified=false;
  // The private C++ constructor is reachable only after the bootstrap probe.
  // Pin its complete chain as well: instanceof can otherwise acquire a new
  // own/inherited Symbol.hasInstance hook after this common bootstrap.
  if(qualified){captureChain(handlePrototype);captureChain(value(nativeConstructor));}
 }
}catch{qualified=false;}finally{probe=null;}
export function originalAttributeOwnerBulkCryptoReady(){
 if(!qualified||!originalPrivateParserIngressUnchanged()||!originalBatchedNamespaceTraversalIntrinsicsUnchanged()||!originalBatchedDataFreezeIntrinsicsUnchanged()||!originalBatchedLexingIntrinsicsUnchanged())return false;
 if(!same(field(process,'versions'),versionsField)||!same(field(versions,'node'),nodeVersionField)||!same(field(crypto,'createHash'),createField)||!same(field(crypto,'Hash'),hashField)||!same(field(Hash,'prototype'),hashPrototypeField)||!same(field(functionPrototype,hasInstanceKey),hasInstanceField))return false;
 for(const chain of chains){if(proxy(chain.owner)||parent(chain.owner)!==chain.parent)return false;const names=keys(chain.owner);if(names.length!==chain.descriptors.length)return false;
  for(let at=0;at<names.length;at++){const expected=chain.descriptors[at];if(names[at]!==expected.key)return false;const actual=field(chain.owner,names[at]);if(has(expected.descriptor,'value')){if(!same(actual,expected.descriptor))return false;}else if(!actual||has(actual,'value')||actual.get!==expected.descriptor.get||actual.set!==expected.descriptor.set||actual.enumerable!==expected.descriptor.enumerable||actual.configurable!==expected.descriptor.configurable)return false;}
 }
 return typeof handleKey==='symbol'&&!proxy(handlePrototype)&&same(field(handlePrototype,'constructor'),nativeConstructor)&&same(field(handlePrototype,'update'),nativeUpdate)&&same(field(handlePrototype,'digest'),nativeDigest);
}
