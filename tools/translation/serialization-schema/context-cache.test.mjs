import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {captureSerializationContext,extractSerializationSchema} from './extract.mjs';
import {serializeSerializationMeta,parseSerializationMeta} from './meta.mjs';
import {HostChecker} from '../extensions/host-contracts.mjs';
import {projectSerializationDescriptor} from './descriptor.mjs';
const repository=fileURLToPath(new URL('../../../',import.meta.url));
const source='use serde::{Serialize,Deserialize};#[derive(Serialize,Deserialize)]struct First{value:u8}#[derive(Serialize,Deserialize)]struct Second{flag:bool}';
function fixture(run){const root=mkdtempSync(join(tmpdir(),'router-serialization-private-cache-'));try{mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),source);for(const path of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,path),readFileSync(join(repository,path)));const capture=profile=>captureSerializationContext({root,paths:['src/lib.rs'],compilationProfile:profile??{flags:{test:false,unix:true,windows:false}}});return run({root,capture});}finally{rmSync(root,{recursive:true,force:true});}}
const options={roots:['crate::First']};
test('private source metadata reuse returns fresh frozen unbranded values and never promotes prior extraction',()=>fixture(({capture})=>{
  const context=capture(),first=extractSerializationSchema(context,options),second=extractSerializationSchema(context,options);
  assert.deepEqual(first,second);assert.notStrictEqual(first,second);assert.notStrictEqual(first.types,second.types);assert.notStrictEqual(first.types[0].fields,second.types[0].fields);
  assert.ok(Object.isFrozen(second.types[0].fields[0].type));assert.throws(()=>second.types[0].fields[0].name='changed',TypeError);
  const text=serializeSerializationMeta(context,options),parsed=parseSerializationMeta(text,context);assert.equal(projectSerializationDescriptor(parsed).First.fields[0].type,'u8');
  for(const unissued of [first,second,extractSerializationSchema(context,options),structuredClone(parsed)])assert.throws(()=>projectSerializationDescriptor(unissued),/privately checked/);
}));
test('exact roots order direction and changed caller arrays receive independent snapshots',()=>fixture(({capture})=>{
  const context=capture(),roots=['crate::First','crate::Second'];const first=extractSerializationSchema(context,{roots});roots.reverse();const second=extractSerializationSchema(context,{roots});
  assert.deepEqual(first.roots,['crate::First','crate::Second']);assert.deepEqual(second.roots,['crate::Second','crate::First']);assert.deepEqual(first.types,second.types);
  roots[0]='crate::First';const duplicate=extractSerializationSchema(context,{roots});assert.deepEqual(duplicate.roots,['crate::First']);assert.equal(first.types.length,2);
  const only=extractSerializationSchema(context,{...options,direction:'serialize'});assert.equal(only.direction,'serialize');assert.equal(extractSerializationSchema(context,options).direction,undefined);
  assert.throws(()=>extractSerializationSchema(context,{...options,direction:'invented'}),/direction/);
}));
test('roots proxies accessors custom iteration inherited arrays holes and incidental fields refuse before effects or cache lookup',()=>fixture(({capture})=>{
  const context=capture();extractSerializationSchema(context,options);let effects=0;
  const getter=['crate::First'];Object.defineProperty(getter,0,{get(){effects++;throw new Error('must not execute');},enumerable:true});
  const iterator=['crate::First'];iterator[Symbol.iterator]=()=>{effects++;throw new Error('must not execute');};
  const proxy=new Proxy(['crate::First'],{get(){effects++;throw new Error('must not execute');},getPrototypeOf(){effects++;throw new Error('must not execute');},ownKeys(){effects++;throw new Error('must not execute');}});
  const inherited=['crate::First'];Object.setPrototypeOf(inherited,Object.create(Array.prototype));const incidental=['crate::First'];incidental.extra='field';
  for(const roots of [getter,iterator,proxy,inherited,incidental,new Array(1),['crate::First',null]])assert.throws(()=>extractSerializationSchema(context,{roots}),/Roots/);
  assert.equal(effects,0);assert.equal(extractSerializationSchema(context,options).types[0].name,'First');
}));
test('copies proxies source changes and new private capture cannot reuse another source or checked identity',()=>fixture(({root,capture})=>{
  const context=capture(),text=serializeSerializationMeta(context,options);parseSerializationMeta(text,context);
  for(const foreign of [{...context},structuredClone(context),new Proxy(context,{})])assert.throws(()=>extractSerializationSchema(foreign,options),/Unsealed/);
  writeFileSync(join(root,'src/lib.rs'),source.replace('value:u8','value:u16'));const changed=capture();assert.throws(()=>parseSerializationMeta(text,changed),/differs/);
  assert.equal(extractSerializationSchema(changed,options).types[0].fields[0].type.name,'u16');assert.equal(extractSerializationSchema(context,options).types[0].fields[0].type.name,'u8');
  assert.notEqual(context.sourceSetSha256,changed.sourceSetSha256);assert.notStrictEqual(extractSerializationSchema(context,options),extractSerializationSchema(changed,options));
}));
test('proof-bearing primitive defaults continue live Host parser/checker guards after prior extraction',()=>fixture(({root,capture})=>{
  writeFileSync(join(root,'src/lib.rs'),source.replace('value:u8','#[serde(default)]value:u8'));
  const context=capture(),meta=extractSerializationSchema(context,options);assert.equal(meta.types[0].fields[0].defaultProof.schema,'original-primitive-field-default-v1');
  const original=Object.getOwnPropertyDescriptor(HostChecker.prototype,'expr');
  try {Object.defineProperty(HostChecker.prototype,'expr',{configurable:true,writable:true,value(){throw new Error('prototype mutation exercised');}});assert.throws(()=>extractSerializationSchema(context,options),/Original primitive Default body is unproved:/);}
  finally {if(original)Object.defineProperty(HostChecker.prototype,'expr',original);else delete HostChecker.prototype.expr;}
  assert.deepEqual(extractSerializationSchema(context,options),meta);
}));
test('bounded metadata eviction preserves exact source values and fresh unparsed identities',()=>fixture(({capture})=>{
  const context=capture(),first=extractSerializationSchema(context,options);
  for(let length=2;length<132;length++)assert.deepEqual(extractSerializationSchema(context,{roots:new Array(length).fill('crate::First')}),first);
  const after=extractSerializationSchema(context,options);assert.deepEqual(after,first);assert.notStrictEqual(after,first);assert.throws(()=>projectSerializationDescriptor(after),/privately checked/);
}));
test('a newly issued profile or source namespace cannot reuse a previous source projection',()=>fixture(({root,capture})=>{
  const original=capture(),text=serializeSerializationMeta(original,options),other=capture({flags:{test:false,unix:false,windows:true}});
  assert.throws(()=>parseSerializationMeta(text,other),/differs/);
  writeFileSync(join(root,'src/lib.rs'),source+'type u8=u16;');const shadow=capture();assert.throws(()=>extractSerializationSchema(shadow,options),/shadowed|unresolved/);
  assert.equal(extractSerializationSchema(original,options).types[0].fields[0].type.name,'u8');
}));
